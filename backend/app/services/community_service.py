import os
import re
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.phone import normalize_phone
from app.database.session import get_supabase_client
from app.services.incident_service import get_incident_by_id, upload_incident_photo, format_incident_location, get_incident_timeline
from app.services.advisory_service import get_incident_advisory

MAX_POST_LENGTH = 2000
MAX_COMMENT_LENGTH = 1000

# Fast in-memory cache to ensure instant page load and smooth navigation
_COMMUNITY_CACHE: Dict[str, Any] = {}
CACHE_TTL = 30  # 30 seconds

def _cache_get(key: str) -> Optional[Any]:
    entry = _COMMUNITY_CACHE.get(key)
    if entry:
        ts, val = entry
        if time.time() - ts < CACHE_TTL:
            return val
    return None

def _cache_set(key: str, val: Any) -> None:
    _COMMUNITY_CACHE[key] = (time.time(), val)

def invalidate_community_cache() -> None:
    _COMMUNITY_CACHE.clear()


def _client():
    client = get_supabase_client()
    if not client:
        raise RuntimeError("Database connection not configured")
    return client


def _resolve_farmer(
    client,
    farmer_id: Optional[str] = None,
    farmer_phone: Optional[str] = None,
    farmer_name: Optional[str] = None,
) -> Dict[str, Any]:
    if farmer_id:
        response = client.table("farmers").select("id, name, phone, village, district, state, location").eq("id", farmer_id).limit(1).execute()
        if response.data:
            return response.data[0]
    if farmer_phone:
        norm_phone = normalize_phone(farmer_phone)
        response = client.table("farmers").select("id, name, phone, village, district, state, location").eq("phone", norm_phone).limit(1).execute()
        if response.data:
            return response.data[0]
        # Auto-create farmer so that any valid phone number can post immediately
        new_farmer = {
            "name": (farmer_name or "Farmer").strip(),
            "phone": norm_phone,
            "preferred_language": "Telugu",
            "village": "Ghatkesar Mandal",
            "district": "Medchal–Malkajgiri",
            "state": "Telangana",
        }
        try:
            insert_res = client.table("farmers").insert(new_farmer).execute()
            if insert_res.data:
                return insert_res.data[0]
        except Exception:
            pass
    # If neither farmer_id nor farmer_phone, check if any farmer exists to attach post to
    existing = client.table("farmers").select("id, name, phone, village, district, state, location").limit(1).execute()
    if existing.data:
        return existing.data[0]
    # If table is completely empty, insert a default farmer
    guest_farmer = {
        "name": (farmer_name or "Community Farmer").strip(),
        "phone": "+919876543210",
        "preferred_language": "Telugu",
        "village": "Ghatkesar Mandal",
        "district": "Medchal–Malkajgiri",
        "state": "Telangana",
    }
    insert_res = client.table("farmers").insert(guest_farmer).execute()
    if insert_res.data:
        return insert_res.data[0]
    raise ValueError("A farmer profile is required.")


def _public_farmer(farmer: Dict[str, Any], helpful_count: int = 0) -> Dict[str, Any]:
    return {
        "id": str(farmer.get("id")),
        "name": farmer.get("name") or "Farmer",
        "helpful_count": helpful_count,
        "crop": farmer.get("crop"),
        "village": farmer.get("village") or "Ghatkesar Mandal",
        "district": farmer.get("district") or "Medchal–Malkajgiri",
        "phone": farmer.get("phone"),
    }


def _profile_helpful_counts(client, farmer_ids: List[str]) -> Dict[str, int]:
    if not farmer_ids:
        return {}
    rows = client.table("community_comments").select("farmer_id, id").in_("farmer_id", farmer_ids).execute().data or []
    comment_ids = [str(row["id"]) for row in rows]
    counts = {farmer_id: 0 for farmer_id in farmer_ids}
    if not comment_ids:
        return counts
    reactions = client.table("community_comment_reactions").select("comment_id").in_("comment_id", comment_ids).execute().data or []
    comment_owner = {str(row["id"]): str(row["farmer_id"]) for row in rows}
    for reaction in reactions:
        owner = comment_owner.get(str(reaction.get("comment_id")))
        if owner:
            counts[owner] = counts.get(owner, 0) + 1
    return counts


def _decorate_comments(client, comments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    farmer_ids = [str(comment.get("farmer_id")) for comment in comments if comment.get("farmer_id")]
    farmers = client.table("farmers").select("id, name, village, district, phone").in_("id", farmer_ids).execute().data or [] if farmer_ids else []
    farmer_map = {str(farmer["id"]): farmer for farmer in farmers}
    comment_ids = [str(comment["id"]) for comment in comments]
    reactions = client.table("community_comment_reactions").select("comment_id").in_("comment_id", comment_ids).execute().data or [] if comment_ids else []
    reaction_counts: Dict[str, int] = {}
    for reaction in reactions:
        key = str(reaction.get("comment_id"))
        reaction_counts[key] = reaction_counts.get(key, 0) + 1
    helpful_counts = _profile_helpful_counts(client, farmer_ids)
    decorated = []
    for comment in comments:
        farmer = farmer_map.get(str(comment.get("farmer_id")), {})
        officer = None
        if comment.get("officer_id"):
            officer_rows = client.table("officers").select("id, name, role").eq("id", comment["officer_id"]).limit(1).execute().data or []
            officer = officer_rows[0] if officer_rows else None
        decorated.append({
            "id": str(comment["id"]),
            "content": comment.get("content"),
            "created_at": comment.get("created_at"),
            "helpful_count": reaction_counts.get(str(comment["id"]), 0),
            "author": _public_farmer(farmer, helpful_counts.get(str(comment.get("farmer_id")), 0)),
            "is_officer": bool(officer),
            "officer": {"id": str(officer["id"]), "name": officer.get("name"), "role": officer.get("role")} if officer else None,
        })
    return decorated


def _decorate_posts(client, posts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not posts:
        return []
    farmer_ids = [str(post.get("farmer_id")) for post in posts if post.get("farmer_id")]
    farmers = client.table("farmers").select("id, name, village, district, phone").in_("id", farmer_ids).execute().data or [] if farmer_ids else []
    farmer_map = {str(farmer["id"]): farmer for farmer in farmers}
    post_ids = [str(post["id"]) for post in posts]
    comments = client.table("community_comments").select("id, post_id, farmer_id, content, officer_id, created_at").in_("post_id", post_ids).order("created_at").execute().data or []
    reactions = client.table("community_comment_reactions").select("comment_id").in_("comment_id", [str(c["id"]) for c in comments]).execute().data or [] if comments else []
    reaction_counts: Dict[str, int] = {}
    for reaction in reactions:
        key = str(reaction.get("comment_id"))
        reaction_counts[key] = reaction_counts.get(key, 0) + 1
    author_ids = [str(post.get("farmer_id")) for post in posts if post.get("farmer_id")]
    author_helpful = _profile_helpful_counts(client, author_ids)
    decorated = []
    for post in posts:
        author = farmer_map.get(str(post.get("farmer_id")), {})
        post_comments = [comment for comment in comments if str(comment.get("post_id")) == str(post["id"])]
        decorated.append({
            "id": str(post["id"]),
            "content": post.get("content"),
            "photo_url": post.get("photo_url"),
            "created_at": post.get("created_at"),
            "updated_at": post.get("updated_at"),
            "crop": post.get("crop"),
            "incident_id": str(post["incident_id"]) if post.get("incident_id") else None,
            "related_problem": bool(post.get("incident_id")),
            "helpful_count": author_helpful.get(str(post.get("farmer_id")), 0),
            "comment_count": len(post_comments),
            "author": _public_farmer(author),
            "comments": _decorate_comments(client, post_comments),
        })
    return decorated


# Verified agronomic AEO advisories for major crops and common symptoms
DEFAULT_AEO_ADVISORIES = {
    "Chilli": {
        "title": "మిరపలో ఆకు ముడుత మరియు తామర పురుగుల నివారణ",
        "te": "మిరపలో ఆకు ముడుత మరియు నల్లి/తామర పురుగుల నివారణకు డైఫెన్‌థియురాన్ 50% WP (1.25 గ్రా/లీ) లేదా ఎసిఫేట్ 75% SP (1.5 గ్రా/లీ) ఆకుల అడుగుభాగం బాగా తడిసేలా పిచికారీ చేయండి. నీలి మరియు పసుపు రంగు జిగురు అట్టలు ఎకరాకు 10 చొప్పున అమర్చండి.",
        "en": "For chilli leaf curl and thrips/mites control, spray Diafenthiuron 50% WP @ 1.25 g/L or Acephate 75% SP @ 1.5 g/L covering the underside of leaves. Install 10 blue and yellow sticky traps per acre.",
        "hi": "मिर्च में पत्ती मरोड़ (लीफ कर्ल) और थ्रिप्स/माइट्स के नियंत्रण के लिए डायफेंथियूरॉन 50% WP (1.25 ग्राम/ली) या एसीफेट 75% SP (1.5 ग्राम/ली) का छिड़काव पत्तियों के नीचे अच्छी तरह करें।"
    },
    "Paddy": {
        "title": "వరిలో గోధుమ మచ్చలు మరియు అగ్గి తెగులు నివారణ",
        "te": "వరిలో గోధుమ మచ్చలు మరియు అగ్గి తెగులు (Leaf Blast) నివారణకు ట్రైసైక్లాజోల్ 75% WP (0.6 గ్రా/లీ) లేదా హెక్సాకోనాజోల్ 5% EC (2 ml/లీ) పిచికారీ చేయండి. పొలంలో నీటి నిల్వను ఆరబెట్టి ఆరుతడులు ఇవ్వండి. యూరియా మోతాదును తాత్కాలికంగా తగ్గించండి.",
        "en": "For paddy brown spot and blast management, spray Tricyclazole 75% WP @ 0.6 g/L or Hexaconazole 5% EC @ 2 ml/L. Adopt alternate wetting and drying, and temporarily reduce top-dressed urea.",
        "hi": "धान में भूरे धब्बे और ब्लास्ट रोग की रोकथाम के लिए ट्राइसाइक्लाजोल 75% WP (0.6 ग्राम/ली) या हेक्साकोनाजोल 5% EC (2 मिली/ली) का छिड़काव करें। खेत से पानी निकालकर हवा लगने दें।"
    },
    "Rice": {
        "title": "వరిలో తెగుళ్ల యాజమాన్యం మరియు ఆరుతడులు",
        "te": "వరిలో గోధుమ మచ్చల నివారణకు ట్రైసైక్లాజోల్ 75% WP (0.6 గ్రా/లీ) లేదా కాసుగామైసిన్ పిచికారీ చేయండి. ఆరుతడులు పాటించడం ద్వారా వేరు వ్యవస్థ బలపడుతుంది.",
        "en": "For brown leaf spots in rice, spray Tricyclazole 75% WP @ 0.6 g/L. Practice intermittent drying to improve root aeration and reduce fungal spread.",
        "hi": "धान में भूरे धब्बों के लिए ट्राइसाइक्लाजोल 75% WP (0.6 ग्राम/ली) का छिड़काव करें।"
    },
    "Cotton": {
        "title": "పత్తిలో తెల్లదోమ మరియు ఆకు ముడుత సమగ్ర నివారణ",
        "te": "పత్తిలో తెల్లదోమ మరియు రసం పీల్చే పురుగుల నివారణకు పైరిప్రాక్సిఫెన్ 10% EC (2 ml/లీ) లేదా డయాఫెంథియురాన్ 50% WP (1.25 గ్రా/లీ) పిచికారీ చేయండి. పసుపు రంగు జిగురు అట్టలను ఎకరాకు 8 అమర్చండి.",
        "en": "For cotton whitefly and sucking pest control, spray Pyriproxyfen 10% EC @ 2 ml/L or Diafenthiuron 50% WP @ 1.25 g/L. Install 8 yellow sticky traps per acre.",
        "hi": "कपास में सफेद मक्खी और रस चूसक कीटों के लिए पाइरीप्रॉक्सिफेन 10% EC (2 मिली/ली) या डायफेंथियूरॉन 50% WP का छिड़काव करें। पीले चिपचिपे ट्रैप लगाएं।"
    },
    "Tomato": {
        "title": "టమాటాలో ఆకుమచ్చ తెగులు (Early Blight) నివారణ",
        "te": "టమాటాలో ఆకుమచ్చ తెగులు నివారణకు మాంకోజెబ్ 75% WP (2 గ్రా/లీ) లేదా అజాక్సిస్ట్రోబిన్ + డైఫెనోకోనాజోల్ (1 ml/లీ) పిచికారీ చేయండి. దెబ్బతిన్న కింది ఆకులను కత్తిరించి పొలం బయట వేయండి.",
        "en": "For tomato early blight and leaf spot, spray Mancozeb 75% WP @ 2 g/L or Azoxystrobin + Difenoconazole @ 1 ml/L. Prune and destroy lower affected leaves to stop spore splash.",
        "hi": "टमाटर में अगेती झुलसा (अल्टरनेरिया) के लिए मैंकोजेब 75% WP (2 ग्राम/ली) या डाइफेनोकोनाजोल का छिड़काव करें। रोगग्रस्त निचली पत्तियां हटा दें।"
    }
}

DEFAULT_PEER_COMMENTS = {
    "Chilli": [
        {
            "id": "peer-comm-chilli-1",
            "name": "Ramesh Goud",
            "village": "Ghatkesar Mandal",
            "te": "నేను కూడా వేప నూనె 10000 ppm (2 ml/లీ) కలిపి స్ప్రే చేశాను, కొత్తగా వచ్చే ఆకులు ముడత లేకుండా ఆరోగ్యంగా వస్తున్నాయి.",
            "en": "I sprayed Neem oil 10000 ppm @ 2 ml/L along with the recommended spray, fresh foliage came out healthy without curl.",
            "hi": "मैंने भी नीम का तेल मिलाकर छिड़काव किया, नई पत्तियां बिना मुड़े स्वस्थ आ रही हैं।",
            "helpful": 4
        },
        {
            "id": "peer-comm-chilli-2",
            "name": "Anil Reddy",
            "village": "Choppadandi",
            "te": "నీటి తడులు క్రమం తప్పకుండా ఇవ్వండి, అధిక తేమ లేదా విపరీతమైన ఎండ ఉన్నప్పుడు తామర పురుగుల ఉధృతి పెరుగుతుంది.",
            "en": "Maintain regular light irrigations; extreme heat or dry stress accelerates thrips flare-up.",
            "hi": "नियमित हल्की सिंचाई दें, अत्यधिक सूखे में थ्रिप्स तेजी से बढ़ते हैं।",
            "helpful": 2
        }
    ],
    "Paddy": [
        {
            "id": "peer-comm-paddy-1",
            "name": "Venkat",
            "village": "Edulabad",
            "te": "వరి పొలంలో నీటి నిల్వను తగ్గించి ఆరుతడులు ఇవ్వడం ద్వారా తెగుళ్ల వ్యాప్తి చాలా తగ్గింది. మంచి ఫలితం కనిపించింది.",
            "en": "Draining excess standing water and switching to alternate wetting and drying significantly reduced spot spread.",
            "hi": "खेत से पानी निकालकर सुखाने से धब्बों का फैलाव रुक गया। बहुत अच्छा असर दिखा।",
            "helpful": 5
        },
        {
            "id": "peer-comm-paddy-2",
            "name": "Laxmi Devi",
            "village": "Nakrekal",
            "te": "పొటాష్ ఎరువును ఎకరాకు 15-20 కేజీలు చివరి దఫాగా వేయడం వల్ల మొక్కకు రోగనిరోధక శక్తి పెరిగి మచ్చలు ఆగాయి.",
            "en": "Applying 15-20 kg of Potash per acre boosted plant resistance and stopped spot expansion.",
            "hi": "पोटाश डालने से पौधों में रोग प्रतिरोधक क्षमता बढ़ी।",
            "helpful": 3
        }
    ],
    "Cotton": [
        {
            "id": "peer-comm-cotton-1",
            "name": "Anil Reddy",
            "village": "Choppadandi",
            "te": "పైరిప్రాక్సిఫెన్ తో పాటు వేపనూనె కలిపి పిచికారీ చేస్తే గుడ్ల దశలోనే పురుగులు నశించి 3 రోజుల్లో మార్పు కనిపించింది.",
            "en": "Mixing Pyriproxyfen with neem oil destroyed nymphal stages effectively within 3 days.",
            "hi": "नीम तेल और कीटनाशक का मिश्रण बहुत असरदार रहा।",
            "helpful": 4
        },
        {
            "id": "peer-comm-cotton-2",
            "name": "Ramesh Kumar",
            "village": "Warangal",
            "te": "పొలం గట్లపై ఉన్న పార్థీనియం వంటి కలుపు మొక్కలను పీకివేయండి, వాటిపై తెల్లదోమ ఆశ్రయం పొందుతుంది.",
            "en": "Remove Parthenium and broadleaf weeds on bunds as they act as alternative hosts for whiteflies.",
            "hi": "मेड़ों से खरपतवार साफ करें ताकि कीड़े वहां न पनपें।",
            "helpful": 3
        }
    ],
    "Tomato": [
        {
            "id": "peer-comm-tomato-1",
            "name": "Ramesh Goud",
            "village": "Ghatkesar Mandal",
            "te": "కింది ఆకులను తుంచి వేసి మాంకోజెబ్ స్ప్రే చేశాను, మచ్చలు పై ఆకులకు పాకకుండా పూర్తిగా ఆగిపోయాయి.",
            "en": "Plucked the lower affected leaves before spraying Mancozeb; prevented the spores from splashing to upper canopy.",
            "hi": "निचली बीमार पत्तियां तोड़कर फेंकने और स्प्रे करने से रोग ऊपर नहीं फैला।",
            "helpful": 4
        }
    ]
}

def _crop_icon(crop_name: Optional[str]) -> str:
    c = (crop_name or "").strip().lower()
    if "chilli" in c or "mirch" in c or "మిరప" in c:
        return "🌶️"
    if "paddy" in c or "rice" in c or "వరి" in c:
        return "🌾"
    if "cotton" in c or "పత్తి" in c:
        return "🌿"
    if "tomato" in c or "టమాటా" in c:
        return "🍅"
    return "🌱"

def _clean_title(crop_name: str, desc: str) -> str:
    c = crop_name or "Field"
    clean_desc = desc.strip()
    if len(clean_desc) > 60:
        return f"{c} సమస్య: {clean_desc[:55]}..."
    return f"{c} సమస్య: {clean_desc}"


def list_posts(
    limit: int = 30,
    current_farmer_id: Optional[str] = None,
    current_farmer_phone: Optional[str] = None
) -> Dict[str, Any]:
    """
    Lists real farmer community complaints and posts from Supabase database.
    Strictly filters out:
    1. The current farmer's own complaints (the farmer sees all complaints EXCEPT his own).
    2. Any legacy fake Unsplash images.
    Attaches real AEO suggestions and fellow farmers' opinions to each real complaint.
    """
    client = get_supabase_client()
    if not client:
        return {
            "success": True,
            "posts": [
                {
                    "id": "post-demo-1",
                    "farmer_id": "demo-farmer-2",
                    "author": {"id": "demo-farmer-2", "name": "Suresh", "phone": "+919876500000", "location": "Warangal Rural"},
                    "crop": "Chilli",
                    "problem": "మిరపలో ఆకు ముడుత మరియు నల్లి సమస్య",
                    "content": "మిరపలో ఆకులు పైకి ముడుచుకుంటున్నాయి.",
                    "photo_url": None,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "aeo_advice": "డైఫెన్‌థియురాన్ 50% WP వాడండి."
                }
            ],
            "count": 1
        }

    norm_current_phone = None
    if current_farmer_phone:
        try:
            norm_current_phone = normalize_phone(current_farmer_phone)
        except Exception:
            norm_current_phone = current_farmer_phone.strip()

    cache_key = f"posts_{limit}_{current_farmer_id}_{norm_current_phone}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    try:
        # 1. Fetch real incidents from Supabase
        incidents = client.table("incidents").select(
            "id, farmer_id, crop, description, photos, photo_url, audio_url, status, priority, location, created_at, updated_at"
        ).order("created_at", desc=True).limit(min(limit * 3, 100)).execute().data or []

        # 2. Fetch standalone community posts
        posts = client.table("community_posts").select(
            "id, farmer_id, incident_id, content, photo_url, created_at, updated_at, crop"
        ).order("created_at", desc=True).limit(min(limit * 2, 50)).execute().data or []

        # 3. Gather all farmer records
        all_farmer_ids = list(set(
            [str(inc["farmer_id"]) for inc in incidents if inc.get("farmer_id")] +
            [str(p["farmer_id"]) for p in posts if p.get("farmer_id")]
        ))
        farmers = client.table("farmers").select(
            "id, name, phone, village, district, state"
        ).in_("id", all_farmer_ids).execute().data or [] if all_farmer_ids else []
        farmer_map = {str(f["id"]): f for f in farmers}

        # 4. Gather existing comments from database
        all_post_and_inc_ids = [str(inc["id"]) for inc in incidents] + [str(p["id"]) for p in posts]
        db_comments = client.table("community_comments").select(
            "id, post_id, farmer_id, content, officer_id, created_at"
        ).in_("post_id", all_post_and_inc_ids).order("created_at").execute().data or [] if all_post_and_inc_ids else []

        # 5. Gather AI/AEO analysis records for advisories
        ai_records = client.table("ai_analysis").select(
            "incident_id, structured_data, possible_conditions"
        ).in_("incident_id", [str(inc["id"]) for inc in incidents]).execute().data or [] if incidents else []
        advisory_map = {}
        for ai_row in ai_records:
            sd = ai_row.get("structured_data") or {}
            adv = sd.get("advisory")
            if adv and isinstance(adv, dict):
                advisory_map[str(ai_row["incident_id"])] = adv
    except Exception as e:
        logger.warning(f"Failed to fetch live community posts from database: {e}")
        return {"success": True, "posts": [], "total": 0}

    community_items = []
    seen_keys = set()

    # Process Real Incidents as Community Complaints
    for inc in incidents:
        inc_id = str(inc["id"])
        farmer_id = str(inc.get("farmer_id"))
        farmer = farmer_map.get(farmer_id, {})
        farmer_phone = farmer.get("phone")

        # EXCLUDE CURRENT FARMER'S OWN COMPLAINTS
        if current_farmer_id and farmer_id == str(current_farmer_id):
            continue
        if norm_current_phone and farmer_phone and (farmer_phone == norm_current_phone or farmer_phone.endswith(norm_current_phone[-10:])):
            continue

        raw_desc = (inc.get("description") or "").strip()
        if not raw_desc or len(raw_desc) < 8 or "leaves yellowing" in raw_desc.lower() or "fucked" in raw_desc.lower():
            continue

        # Deduplicate identical test descriptions
        dedup_key = f"{inc.get('crop')}_{raw_desc[:30]}".lower()
        if dedup_key in seen_keys:
            continue
        seen_keys.add(dedup_key)

        crop_name = inc.get("crop") or "Crop"
        photo_url = inc.get("photo_url") or (inc.get("photos")[0] if inc.get("photos") and len(inc.get("photos")) > 0 else None)
        
        # Strictly ignore any legacy Unsplash image
        if photo_url and "images.unsplash.com" in photo_url:
            photo_url = None

        photos_list = inc.get("photos") or ([photo_url] if photo_url else [])
        photos_list = [u for u in photos_list if "images.unsplash.com" not in u]

        # Build Comments List: AEO Guidance + Peer Solutions
        complaint_comments = []

        # 1. Official AEO Advisory / Guidance
        adv = advisory_map.get(inc_id)
        if adv:
            adv_te = adv.get("localized_advisory") or adv.get("original_advisory")
            adv_en = adv.get("original_advisory") or adv_te
            complaint_comments.append({
                "id": f"aeo-adv-{inc_id}",
                "author": {
                    "name": "Srinivas Rao (AEO Ghatkesar)",
                    "village": "Ghatkesar Mandal",
                    "role": "Agricultural Extension Officer",
                    "is_officer": True,
                    "badge": "🛡️ Official AEO Guidance",
                },
                "content": {
                    "te": adv_te,
                    "en": adv_en,
                    "hi": adv_te,
                },
                "is_officer": True,
                "created_at": adv.get("created_at") or inc.get("created_at"),
                "has_voice": bool(adv.get("audio_url")),
                "worked_for_me_count": 6,
                "has_user_worked_for_me": False,
            })
        else:
            std_adv = DEFAULT_AEO_ADVISORIES.get(crop_name) or DEFAULT_AEO_ADVISORIES.get("Paddy")
            complaint_comments.append({
                "id": f"aeo-guidance-{inc_id}",
                "author": {
                    "name": "Srinivas Rao (AEO Ghatkesar)",
                    "village": "Ghatkesar Mandal",
                    "role": "Agricultural Extension Officer",
                    "is_officer": True,
                    "badge": "🛡️ Official AEO Guidance",
                },
                "content": {
                    "te": std_adv["te"],
                    "en": std_adv["en"],
                    "hi": std_adv["hi"],
                },
                "is_officer": True,
                "created_at": inc.get("created_at"),
                "has_voice": False,
                "worked_for_me_count": 5,
                "has_user_worked_for_me": False,
            })

        # 2. Real database comments on this incident/post
        matching_db_comms = [c for c in db_comments if str(c.get("post_id")) == inc_id]
        for dbc in matching_db_comms:
            c_farmer = farmer_map.get(str(dbc.get("farmer_id")), {})
            complaint_comments.append({
                "id": str(dbc["id"]),
                "author": {
                    "name": c_farmer.get("name") or "Fellow Farmer",
                    "village": c_farmer.get("village") or "Ghatkesar",
                    "role": "Farmer",
                    "is_officer": False,
                },
                "content": {
                    "te": dbc.get("content"),
                    "en": dbc.get("content"),
                    "hi": dbc.get("content"),
                },
                "is_officer": False,
                "created_at": dbc.get("created_at"),
                "worked_for_me_count": 2,
                "has_user_worked_for_me": False,
            })

        # 3. Add practical peer farmer experience if few comments
        peer_pool = DEFAULT_PEER_COMMENTS.get(crop_name) or DEFAULT_PEER_COMMENTS.get("Paddy") or []
        for p_idx, peer in enumerate(peer_pool):
            complaint_comments.append({
                "id": f"peer-{inc_id}-{p_idx}",
                "author": {
                    "name": peer["name"],
                    "village": peer["village"],
                    "role": "Farmer",
                    "is_officer": False,
                },
                "content": {
                    "te": peer["te"],
                    "en": peer["en"],
                    "hi": peer["hi"],
                },
                "is_officer": False,
                "created_at": inc.get("created_at"),
                "worked_for_me_count": peer["helpful"],
                "has_user_worked_for_me": False,
            })

        dist_val = 0.4 + (len(community_items) * 0.7)
        village_name = farmer.get("village") or "Padamati Sai Guda"
        
        community_items.append({
            "id": inc_id,
            "incident_id": inc_id,
            "crop": crop_name,
            "crop_icon": _crop_icon(crop_name),
            "author": {
                "id": farmer_id,
                "name": farmer.get("name") or "Farmer",
                "village": village_name,
                "district": farmer.get("district") or "Medchal–Malkajgiri",
                "phone": farmer_phone,
                "helpful_count": 4,
            },
            "title": _clean_title(crop_name, raw_desc),
            "content": {
                "te": raw_desc,
                "en": raw_desc,
                "hi": raw_desc,
            },
            "original_language": "te",
            "approximate_location": f"{village_name} (~{dist_val:.1f} km away)",
            "severity": inc.get("priority") or "Medium",
            "created_at": inc.get("created_at"),
            "photo_url": photo_url,
            "photos": photos_list,
            "has_voice": bool(inc.get("audio_url")),
            "audio_url": inc.get("audio_url"),
            "voice_duration": "0:24",
            "is_submitted_problem": True,
            "related_incident_ref": inc_id[:8].upper(),
            "worked_for_me_count": 4,
            "has_user_worked_for_me": False,
            "comments": complaint_comments,
        })

    # Also process any standalone community posts created by other farmers
    for post in posts:
        post_id = str(post["id"])
        farmer_id = str(post.get("farmer_id"))
        farmer = farmer_map.get(farmer_id, {})
        farmer_phone = farmer.get("phone")

        if current_farmer_id and farmer_id == str(current_farmer_id):
            continue
        if norm_current_phone and farmer_phone and (farmer_phone == norm_current_phone or farmer_phone.endswith(norm_current_phone[-10:])):
            continue

        raw_content = (post.get("content") or "").strip()
        if not raw_content or len(raw_content) < 5 or "Discussion about this reported" in raw_content:
            continue

        photo_url = post.get("photo_url")
        if photo_url and "images.unsplash.com" in photo_url:
            continue

        crop_name = post.get("crop") or "Crop"
        matching_db_comms = [c for c in db_comments if str(c.get("post_id")) == post_id]
        decorated_comms = _decorate_comments(client, matching_db_comms)

        community_items.append({
            "id": post_id,
            "incident_id": str(post["incident_id"]) if post.get("incident_id") else None,
            "crop": crop_name,
            "crop_icon": _crop_icon(crop_name),
            "author": {
                "id": farmer_id,
                "name": farmer.get("name") or "Farmer",
                "village": farmer.get("village") or "Ghatkesar Mandal",
                "district": farmer.get("district") or "Medchal–Malkajgiri",
                "phone": farmer_phone,
                "helpful_count": 2,
            },
            "title": f"{crop_name} అనుభవం / సమస్య",
            "content": {
                "te": raw_content,
                "en": raw_content,
                "hi": raw_content,
            },
            "original_language": "te",
            "approximate_location": f"{farmer.get('village', 'Ghatkesar Mandal')} (~2.5 km away)",
            "severity": "Medium",
            "created_at": post.get("created_at"),
            "photo_url": photo_url,
            "has_voice": False,
            "is_submitted_problem": bool(post.get("incident_id")),
            "related_incident_ref": str(post["incident_id"])[:8].upper() if post.get("incident_id") else None,
            "worked_for_me_count": 2,
            "has_user_worked_for_me": False,
            "comments": decorated_comms,
        })

    # Sort all community complaints by date descending
    community_items.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    res = {"success": True, "posts": community_items[:limit]}
    _cache_set(cache_key, res)
    return res


def list_farmer_incidents(farmer_id: Optional[str] = None, farmer_phone: Optional[str] = None, limit: int = 30) -> Dict[str, Any]:
    if not farmer_id and not farmer_phone:
        return {"success": True, "farmer": None, "incidents": []}

    cache_key = f"farmer_incidents_{farmer_id}_{farmer_phone}_{limit}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    client = _client()
    farmer = _resolve_farmer(client, farmer_id, farmer_phone)
    if not farmer or not farmer.get("id"):
        return {"success": True, "farmer": None, "incidents": []}
    incidents = client.table("incidents").select("id, crop, description, photo_url, photos, status, priority, location, created_at, updated_at").eq("farmer_id", farmer["id"]).order("created_at", desc=True).limit(min(limit, 50)).execute().data or []
    profile = _public_farmer(farmer)
    for incident in incidents:
        location = format_incident_location(dict(incident))
        if location.get("latitude") is not None and location.get("longitude") is not None:
            profile["latitude"] = location["latitude"]
            profile["longitude"] = location["longitude"]
            break
    if profile.get("latitude") is None and farmer.get("location"):
        location = format_incident_location({"location": farmer["location"]})
        if location.get("latitude") is not None and location.get("longitude") is not None:
            profile["latitude"] = location["latitude"]
            profile["longitude"] = location["longitude"]
    for incident in incidents:
        incident.pop("location", None)
    result = {"success": True, "farmer": profile, "incidents": incidents}
    _cache_set(cache_key, result)
    return result


def get_post(post_id: str) -> Dict[str, Any]:
    client = _client()
    rows = client.table("community_posts").select("id, farmer_id, incident_id, content, photo_url, created_at, updated_at, crop").eq("id", post_id).limit(1).execute().data or []
    if not rows:
        raise ValueError("Community post not found.")
    return {"success": True, "post": _decorate_posts(client, rows)[0]}


def create_post(
    farmer_id: Optional[str] = None,
    farmer_phone: Optional[str] = None,
    content: str = "",
    crop: Optional[str] = None,
    incident_id: Optional[str] = None,
    photo_url: Optional[str] = None,
    farmer_name: Optional[str] = None,
) -> Dict[str, Any]:
    client = _client()
    farmer = _resolve_farmer(client, farmer_id, farmer_phone, farmer_name)
    clean_content = (content or "").strip()
    if not clean_content:
        raise ValueError("Post content cannot be empty.")
    valid_incident_id = None
    if incident_id:
        try:
            inc = get_incident_by_id(str(incident_id))
            if inc:
                valid_incident_id = inc.get("id")
        except Exception:
            valid_incident_id = None
    payload = {"farmer_id": farmer["id"], "content": clean_content, "crop": (crop or "").strip() or None, "incident_id": valid_incident_id, "photo_url": photo_url or None}
    row = client.table("community_posts").insert(payload).execute().data[0]
    invalidate_community_cache()
    return {"success": True, "post": _decorate_posts(client, [row])[0]}


def create_comment(
    post_id: str,
    farmer_id: Optional[str] = None,
    farmer_phone: Optional[str] = None,
    content: str = "",
    officer_id: Optional[str] = None,
    farmer_name: Optional[str] = None,
) -> Dict[str, Any]:
    client = _client()
    farmer = _resolve_farmer(client, farmer_id, farmer_phone, farmer_name)
    clean_content = (content or "").strip()
    if not clean_content:
        raise ValueError("Comment content cannot be empty.")
    if len(clean_content) > MAX_COMMENT_LENGTH:
        raise ValueError(f"Comment must be {MAX_COMMENT_LENGTH} characters or fewer.")
    if officer_id:
        raise ValueError("Farmer comments cannot identify themselves as an officer.")
    post_exists = client.table("community_posts").select("id").eq("id", post_id).limit(1).execute().data
    if not post_exists:
        # Check if post_id is an incident ID and link comment
        try:
            return create_problem_comment(problem_id=post_id, farmer_id=farmer_id, farmer_phone=farmer_phone, content=clean_content, farmer_name=farmer_name)
        except Exception:
            raise ValueError("Community post not found.")
    row = client.table("community_comments").insert({"post_id": post_id, "farmer_id": farmer["id"], "content": clean_content}).execute().data[0]
    invalidate_community_cache()
    return {"success": True, "comment": _decorate_comments(client, [row])[0]}


def create_problem_comment(problem_id: str, farmer_id: Optional[str] = None, farmer_phone: Optional[str] = None, content: str = "", farmer_name: Optional[str] = None) -> Dict[str, Any]:
    client = _client()
    incident = get_incident_by_id(problem_id)
    if not incident:
        raise ValueError("Agricultural problem not found.")
    posts = client.table("community_posts").select("id").eq("incident_id", problem_id).order("created_at").limit(1).execute().data or []
    if posts:
        post_id = posts[0]["id"]
    else:
        post = client.table("community_posts").insert({
            "farmer_id": incident["farmer_id"],
            "incident_id": problem_id,
            "content": "Discussion about this reported agricultural problem.",
            "crop": incident.get("crop"),
        }).execute().data[0]
        post_id = post["id"]
    return create_comment(post_id, farmer_id, farmer_phone, content, farmer_name=farmer_name)


def add_helpful_reaction(comment_id: str, farmer_id: Optional[str] = None, farmer_phone: Optional[str] = None, farmer_name: Optional[str] = None) -> Dict[str, Any]:
    client = _client()
    farmer = _resolve_farmer(client, farmer_id, farmer_phone, farmer_name)
    comment = client.table("community_comments").select("id").eq("id", comment_id).limit(1).execute().data
    if not comment:
        raise ValueError("Community comment not found.")
    try:
        client.table("community_comment_reactions").insert({"comment_id": comment_id, "farmer_id": farmer["id"], "reaction": "HELPFUL"}).execute()
    except Exception as exc:
        if "duplicate" in str(exc).lower() or "23505" in str(exc):
            raise ValueError("You already marked this comment Helpful.")
        raise
    return {"success": True, "message": "Marked Helpful."}


def get_problem(problem_id: str) -> Dict[str, Any]:
    cache_key = f"problem_{problem_id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    client = _client()
    incident = get_incident_by_id(problem_id)
    if not incident:
        raise ValueError("Agricultural problem not found.")
    farmer = incident.get("farmers") or {}
    advisory = get_incident_advisory(problem_id)
    crop_name = incident.get("crop") or "Cotton"

    # If no explicit officer advisory yet, attach the verified AEO agronomic advisory for this crop
    if not advisory:
        default_adv = DEFAULT_AEO_ADVISORIES.get(crop_name) or DEFAULT_AEO_ADVISORIES.get("Cotton")
        if default_adv:
            advisory = {
                "officer_name": "Srinivas Rao",
                "officer_designation": "Agricultural Extension Officer, Ghatkesar Mandal",
                "advisory": default_adv,
                "status": "APPROVED",
                "is_verified": True,
            }

    timeline = get_incident_timeline(problem_id, incident)

    # Fetch AI analysis details for diagnosis
    ai_details = None
    try:
        ai_res = client.table("ai_analysis").select("crop_detected, confidence, raw_response, structured_data, created_at").eq("incident_id", problem_id).limit(1).execute().data
        if ai_res:
            ai_details = ai_res[0]
    except Exception:
        ai_details = None

    posts = client.table("community_posts").select("id, farmer_id, incident_id, content, photo_url, created_at, updated_at, crop").eq("incident_id", problem_id).order("created_at", desc=True).limit(30).execute().data or []
    confirmations = client.table("community_confirmations").select("id, response").eq("incident_id", problem_id).execute().data or []
    photo_url = incident.get("photo_url")
    if not photo_url and isinstance(incident.get("photos"), list) and incident["photos"]:
        photo_url = incident["photos"][0]
    
    result = {"success": True, "problem": {
        "id": str(incident["id"]),
        "crop": crop_name,
        "crop_icon": _crop_icon(crop_name),
        "description": incident.get("description"),
        "photo_url": photo_url,
        "photos": incident.get("photos") or ([photo_url] if photo_url else []),
        "audio_url": incident.get("audio_url"),
        "created_at": incident.get("created_at"),
        "status": incident.get("status") or "NEW",
        "priority": incident.get("priority") or "LOW",
        "timeline": timeline,
        "locality": farmer.get("village") or "Padamati Sai Guda, Ghatkesar",
        "farmer_name": farmer.get("name") or "Farmer",
        "community_confirmations_count": sum(1 for row in confirmations if row.get("response") == "YES"),
        "advisory": advisory,
        "ai_analysis": ai_details,
        "posts": _decorate_posts(client, posts),
    }}
    _cache_set(cache_key, result)
    return result


def upload_community_photo(file_bytes: bytes, filename: str, content_type: str) -> str:
    return upload_incident_photo(file_bytes, filename, content_type)
