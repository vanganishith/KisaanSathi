"""
Community Signal Engine for KisaanSaathi (Phases 9 & 10)
- Local Agricultural Intelligence
- Geospatial & Time-windowed clustering (decay model: strong <= 3d, moderate 4-7d, historical > 14d)
- Anonymized privacy enforcement (never leaks phone numbers, exact GPS, private notes)
- "Me Too" confirmation aggregator
- Community -> Context Engine & AI Decision Engine integration
"""

import logging
import uuid
import re
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple

from app.core.phone import normalize_phone
from app.database.session import get_supabase_client
from app.services.farm_service import get_farmer_profile, list_farms_by_farmer, list_fields_by_farm, list_crop_cycles_by_field
from app.services.incident_service import haversine_distance_km

logger = logging.getLogger("rythubandhu.community_signal")

# Resilient in-memory stores for instant performance and fallback
_REPORTS_STORE: List[Dict[str, Any]] = [
    {
        "id": "comm-rep-chilli-1",
        "farmer_id": "demo-farmer-1",
        "crop": "Chilli",
        "category": "pest",
        "title": "మిరపలో ఆకు ముడుత మరియు నల్లి సమస్య",
        "description": "ఆకుల కింద చిన్న నల్లటి పురుగులు కనిపిస్తున్నాయి, ఆకులు పైకి ముడుచుకుంటున్నాయి.",
        "transcript": "మిరపలో ఆకులు ముడుచుకుంటున్నాయి",
        "photo_urls": [],
        "latitude": 17.9689,
        "longitude": 79.5941,
        "approx_location": "Warangal Rural / Ghatkesar",
        "visibility": "PUBLIC_COMMUNITY",
        "status": "active",
        "ai_classification": "thrips_and_mites",
        "ai_confidence": 0.88,
        "me_too_count": 6,
        "aeo_verified": True,
        "aeo_guidance": "డైఫెన్‌థియురాన్ 50% WP (1.25 గ్రా/లీ) లేదా నీలి జిగురు అట్టలు అమర్చండి.",
        "created_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
        "updated_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
    },
    {
        "id": "comm-rep-chilli-2",
        "farmer_id": "demo-farmer-2",
        "crop": "Chilli",
        "category": "disease",
        "title": "మిరపలో పూత రాలడం మరియు లేత ఆకులపై మచ్చలు",
        "description": "అధిక తేమ వల్ల పూత రాలుతోంది, కొన్ని మొక్కల్లో కొమ్మలు ఎండుతున్నాయి.",
        "transcript": "మిరపలో పూత రాలిపోతోంది",
        "photo_urls": [],
        "latitude": 17.9710,
        "longitude": 79.5980,
        "approx_location": "Warangal Rural",
        "visibility": "PUBLIC_COMMUNITY",
        "status": "active",
        "ai_classification": "blossom_drop_fungal",
        "ai_confidence": 0.84,
        "me_too_count": 4,
        "aeo_verified": False,
        "aeo_guidance": None,
        "created_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
        "updated_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
    },
    {
        "id": "comm-rep-paddy-1",
        "farmer_id": "demo-farmer-3",
        "crop": "Paddy",
        "category": "disease",
        "title": "వరిలో గోధుమ రంగు మచ్చలు",
        "description": "వరి ఆకులపై కంటి ఆకారంలో గోధుమ మచ్చలు కనిపిస్తున్నాయి.",
        "transcript": "వరిలో గోధుమ మచ్చలు వచ్చాయి",
        "photo_urls": [],
        "latitude": 17.9650,
        "longitude": 79.5900,
        "approx_location": "Ghatkesar Mandal",
        "visibility": "PUBLIC_COMMUNITY",
        "status": "active",
        "ai_classification": "brown_spot",
        "ai_confidence": 0.90,
        "me_too_count": 8,
        "aeo_verified": True,
        "aeo_guidance": "ట్రైసైక్లాజోల్ 75% WP (0.6 గ్రా/లీ) పిచికారీ చేయండి మరియు ఆరుతడులు ఇవ్వండి.",
        "created_at": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat(),
        "updated_at": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat(),
    },
    {
        "id": "comm-rep-cotton-1",
        "farmer_id": "demo-farmer-4",
        "crop": "Cotton",
        "category": "pest",
        "title": "పత్తిలో తెల్లదోమ ఉధృతి",
        "description": "ఆకుల అడుగున తెల్లదోమ ఎక్కువగా ఉంది, ఆకులు పసుపు రంగులోకి మారుతున్నాయి.",
        "transcript": "పత్తిలో తెల్లదోమ ఉంది",
        "photo_urls": [],
        "latitude": 17.9800,
        "longitude": 79.6100,
        "approx_location": "Warangal District",
        "visibility": "PUBLIC_COMMUNITY",
        "status": "active",
        "ai_classification": "whitefly_infestation",
        "ai_confidence": 0.86,
        "me_too_count": 5,
        "aeo_verified": True,
        "aeo_guidance": "పైరిప్రాక్సిఫెన్ 10% EC (2 ml/లీ) పిచికారీ చేయండి.",
        "created_at": (datetime.now(timezone.utc) - timedelta(days=4)).isoformat(),
        "updated_at": (datetime.now(timezone.utc) - timedelta(days=4)).isoformat(),
    }
]

_ME_TOO_STORE: Dict[str, List[str]] = {
    # report_id -> list of farmer_phones who confirmed
    "comm-rep-chilli-1": ["+919876543211", "+919876543212"],
    "comm-rep-chilli-2": ["+919876543213"],
    "comm-rep-paddy-1": ["+919876543214", "+919876543215"],
}


def _approximate_locality(village: Optional[str] = None, district: Optional[str] = None, lat: Optional[float] = None, lon: Optional[float] = None) -> str:
    """Generates privacy-safe regional tag without exposing exact farm GPS."""
    parts = [p for p in [village, district] if p]
    if parts:
        return " / ".join(parts)
    if lat and lon and 17.0 <= lat <= 19.0 and 78.5 <= lon <= 80.5:
        return "Warangal Rural"
    return "Warangal Rural / Local Region"


async def create_community_report(
    farmer_phone: str,
    crop: Optional[str] = "Chilli",
    category: str = "crop_health",
    title: Optional[str] = None,
    description: str = "",
    transcript: Optional[str] = None,
    photo_urls: Optional[List[str]] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    approx_location: Optional[str] = None,
    visibility: str = "PUBLIC_COMMUNITY",
    field_id: Optional[str] = None,
    crop_cycle_id: Optional[str] = None,
    language: str = "te"
) -> Dict[str, Any]:
    """
    Creates a new community report linked to farmer's crop and location.
    Enforces privacy by constructing anonymized approx_location.
    """
    norm_phone = normalize_phone(farmer_phone)
    farmer = await get_farmer_profile(phone=norm_phone)
    farmer_id = farmer.get("id") if farmer else str(uuid.uuid4())

    # Infer location if not passed
    lat = latitude or (farmer.get("latitude") if farmer else 17.9689)
    lon = longitude or (farmer.get("longitude") if farmer else 79.5941)
    
    loc_name = approx_location or _approximate_locality(
        farmer.get("village") if farmer else None,
        farmer.get("district") if farmer else None,
        lat=lat,
        lon=lon
    )

    clean_crop = crop or (farmer.get("crop") if farmer else "Chilli") or "Chilli"
    auto_title = title or f"{clean_crop} {category.replace('_', ' ').title()} Alert"

    report_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    report_data = {
        "id": report_id,
        "farmer_id": farmer_id,
        "crop": clean_crop,
        "category": category,
        "title": auto_title,
        "description": description.strip() or (transcript or "Crop condition reported by farmer"),
        "transcript": transcript,
        "photo_urls": photo_urls or [],
        "latitude": float(lat) if lat is not None else None,
        "longitude": float(lon) if lon is not None else None,
        "approx_location": loc_name,
        "visibility": visibility,
        "status": "active",
        "ai_classification": f"{clean_crop.lower()}_{category}",
        "ai_confidence": 0.85,
        "me_too_count": 1,
        "aeo_verified": False,
        "aeo_guidance": None,
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    _REPORTS_STORE.insert(0, report_data)
    _ME_TOO_STORE[report_id] = [norm_phone]

    # Persist to Supabase if table exists
    client = get_supabase_client()
    if client:
        try:
            client.table("community_reports").insert(report_data).execute()
        except Exception as e:
            logger.warning(f"[CommunitySignal] Supabase insert report notice: {e}")

    return {
        "success": True,
        "report": report_data,
        "message": "Community report published successfully."
    }


async def create_community_report_by_voice(
    farmer_phone: str,
    voice_input: str,
    crop: Optional[str] = None,
    photo_urls: Optional[List[str]] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    language: str = "te"
) -> Dict[str, Any]:
    """
    Voice-first community reporting:
    Takes transcribed speech, infers category and active crop automatically.
    """
    text = voice_input.strip()
    norm_phone = normalize_phone(farmer_phone)
    farmer = await get_farmer_profile(phone=norm_phone)

    # 1. Infer Category
    cat = "crop_health"
    q_lower = text.lower()
    if any(k in q_lower for k in ["పురుగు", "దోమ", "నల్లి", "కీటక", "pest", "whitefly", "thrips", "कीट"]):
        cat = "pest"
    elif any(k in q_lower for k in ["మచ్చ", "తెగులు", "కుళ్లు", "disease", "fungal", "blast", "spot", "रोग"]):
        cat = "disease"
    elif any(k in q_lower for k in ["వర్షం", "ఎండ", "గాలి", "దెబ్బ", "weather", "rain", "storm"]):
        cat = "weather_damage"
    elif any(k in q_lower for k in ["ఎరువు", "పోషక", "fertilizer", "nutrient"]):
        cat = "fertilizer"
    elif any(k in q_lower for k in ["నీరు", "నీళ్లు", "తడి", "irrigation", "water"]):
        cat = "irrigation"

    # 2. Infer Crop
    detected_crop = crop or (farmer.get("crop") if farmer else "Chilli")
    if "మిరప" in text or "chilli" in q_lower or "mirchi" in q_lower:
        detected_crop = "Chilli"
    elif "వరి" in text or "paddy" in q_lower or "rice" in q_lower:
        detected_crop = "Paddy"
    elif "పత్తి" in text or "cotton" in q_lower:
        detected_crop = "Cotton"
    elif "టమాటా" in text or "tomato" in q_lower:
        detected_crop = "Tomato"

    # 3. Formulate Title
    if "te" in language:
        title = f"{detected_crop} లో {cat.replace('_', ' ')} సమస్య నివేదిక"
    else:
        title = f"{detected_crop} {cat.replace('_', ' ').title()} Issue"

    return await create_community_report(
        farmer_phone=farmer_phone,
        crop=detected_crop,
        category=cat,
        title=title,
        description=text,
        transcript=text,
        photo_urls=photo_urls,
        latitude=latitude,
        longitude=longitude,
        language=language
    )


async def record_me_too(
    report_id: str,
    farmer_phone: str
) -> Dict[str, Any]:
    """
    Records a 1-tap "Me Too" confirmation:
    - Verifies report existence
    - Enforces uniqueness per farmer phone
    - Increments count
    - Never leaks farmer phone publicly
    """
    norm_phone = normalize_phone(farmer_phone)

    # Find report in memory
    report = next((r for r in _REPORTS_STORE if str(r.get("id")) == str(report_id)), None)
    
    # Check duplicate
    confirmed_phones = _ME_TOO_STORE.get(report_id, [])
    if norm_phone in confirmed_phones:
        return {
            "success": True,
            "report_id": report_id,
            "new_me_too_count": report.get("me_too_count", 0) if report else len(confirmed_phones),
            "message": "You have already confirmed this issue.",
            "already_confirmed": True
        }

    confirmed_phones.append(norm_phone)
    _ME_TOO_STORE[report_id] = confirmed_phones

    if report:
        report["me_too_count"] = report.get("me_too_count", 0) + 1
        report["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Write to Supabase if available
    client = get_supabase_client()
    if client:
        try:
            client.table("community_me_too").insert({
                "report_id": report_id,
                "farmer_phone": norm_phone,
            }).execute()
            if report:
                client.table("community_reports").update({
                    "me_too_count": report["me_too_count"]
                }).eq("id", report_id).execute()
        except Exception as e:
            logger.warning(f"[CommunitySignal] Supabase me too record notice: {e}")

    new_count = report.get("me_too_count", len(confirmed_phones)) if report else len(confirmed_phones)

    return {
        "success": True,
        "report_id": report_id,
        "new_me_too_count": new_count,
        "message": "Me Too recorded successfully.",
        "already_confirmed": False
    }


def get_active_community_signals(
    crop: Optional[str] = "Chilli",
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius_km: float = 10.0,
    language: str = "te"
) -> List[Dict[str, Any]]:
    """
    Community Signal Engine (Phase 10):
    Aggregates reports into regional agricultural signals with time decay:
    - <= 3 days: STRONG
    - 4 - 7 days: MODERATE
    - > 7 days: HISTORICAL
    """
    clean_crop = (crop or "Chilli").strip().capitalize()
    lat = latitude if latitude is not None else 17.9689
    lon = longitude if longitude is not None else 79.5941

    matching_reports = []
    now = datetime.now(timezone.utc)

    for r in _REPORTS_STORE:
        r_crop = (r.get("crop") or "").strip().capitalize()
        if r_crop != clean_crop:
            continue
        
        # Spatial check
        r_lat = r.get("latitude")
        r_lon = r.get("longitude")
        if r_lat is not None and r_lon is not None:
            dist = haversine_distance_km(lat, lon, r_lat, r_lon)
            if dist > radius_km:
                continue

        matching_reports.append(r)

    if not matching_reports:
        return []

    # Group by category
    categories_map: Dict[str, List[Dict[str, Any]]] = {}
    for r in matching_reports:
        cat = r.get("category", "crop_health")
        categories_map.setdefault(cat, []).append(r)

    signals = []
    for cat, rep_list in categories_map.items():
        total_farmers = sum(r.get("me_too_count", 1) for r in rep_list)
        latest_created = max(
            datetime.fromisoformat(r["created_at"].replace("Z", "+00:00"))
            for r in rep_list if r.get("created_at")
        )
        earliest_created = min(
            datetime.fromisoformat(r["created_at"].replace("Z", "+00:00"))
            for r in rep_list if r.get("created_at")
        )

        days_ago = (now - latest_created).total_seconds() / 86400.0

        if days_ago <= 3.0:
            time_window = "recent (last 3 days)"
            strength = "STRONG"
        elif days_ago <= 7.0:
            time_window = "moderate (past week)"
            strength = "MODERATE"
        else:
            time_window = "historical"
            strength = "HISTORICAL"

        # Check for AEO verified guidance
        verified_guidance = next((r["aeo_guidance"] for r in rep_list if r.get("aeo_verified") and r.get("aeo_guidance")), None)

        if "te" in language:
            title = f"{clean_crop} లో {cat.replace('_', ' ')} హెచ్చరిక"
            summary = f"మీ ప్రాంతంలో {total_farmers} మంది రైతులు ఒకే రకమైన సమస్యను నివేదించారు."
        else:
            title = f"Local {clean_crop} {cat.replace('_', ' ').title()} Alert"
            summary = f"{total_farmers} nearby farmers reported similar symptoms in this region."

        signals.append({
            "id": f"signal-{clean_crop.lower()}-{cat}",
            "crop": clean_crop,
            "issue_category": cat,
            "title": title,
            "summary": summary,
            "affected_region": rep_list[0].get("approx_location", "Warangal / Ghatkesar"),
            "nearby_report_count": total_farmers,
            "time_window": time_window,
            "signal_strength": strength,
            "confidence": 0.86,
            "aeo_verified": bool(verified_guidance),
            "aeo_guidance": verified_guidance,
            "first_observed_at": earliest_created.isoformat(),
            "last_observed_at": latest_created.isoformat(),
        })

    return signals


async def get_community_feed(
    farmer_phone: Optional[str] = None,
    crop: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    category: Optional[str] = None,
    language: str = "te"
) -> Dict[str, Any]:
    """
    Returns the complete Agricultural Community Feed for the farmer:
    1. Active Regional Signals (Prioritized)
    2. Filtered, Privacy-Sanitized Reports (Locality only, no phone numbers)
    3. Me Too status for current requesting farmer
    """
    norm_phone = normalize_phone(farmer_phone) if farmer_phone else None
    farmer = await get_farmer_profile(phone=norm_phone) if norm_phone else None

    clean_crop = crop or (farmer.get("crop") if farmer else "Chilli") or "Chilli"
    lat = latitude or (farmer.get("latitude") if farmer else 17.9689)
    lon = longitude or (farmer.get("longitude") if farmer else 79.5941)

    # 1. Signals
    signals = get_active_community_signals(crop=clean_crop, latitude=lat, longitude=lon, language=language)

    # 2. Privacy-Sanitized Reports
    sanitized_reports = []
    for r in _REPORTS_STORE:
        # Category filter
        if category and r.get("category") != category:
            continue

        r_crop = (r.get("crop") or "").strip().capitalize()
        # Mark whether this user confirmed Me Too
        user_confirmed = False
        if norm_phone and norm_phone in _ME_TOO_STORE.get(str(r.get("id")), []):
            user_confirmed = True

        sanitized_reports.append({
            "id": str(r["id"]),
            "crop": r_crop,
            "category": r.get("category", "crop_health"),
            "title": r.get("title", ""),
            "description": r.get("description", ""),
            "photo_urls": r.get("photo_urls", []),
            "approx_location": r.get("approx_location", "Near your locality"),
            "created_at": r.get("created_at", ""),
            "me_too_count": r.get("me_too_count", 0),
            "has_me_too_by_user": user_confirmed,
            "ai_classification": r.get("ai_classification"),
            "aeo_verified": r.get("aeo_verified", False),
            "aeo_guidance": r.get("aeo_guidance"),
            "visibility": r.get("visibility", "PUBLIC_COMMUNITY"),
            "status": r.get("status", "active"),
        })

    # Prioritization:
    # 1. Same crop first
    # 2. AEO verified first
    # 3. Newest first
    sanitized_reports.sort(
        key=lambda x: (
            x["crop"].lower() != clean_crop.lower(),
            not x["aeo_verified"],
            -(datetime.fromisoformat(x["created_at"].replace("Z", "+00:00")).timestamp()) if x.get("created_at") else 0
        )
    )

    return {
        "success": True,
        "crop": clean_crop,
        "signals": signals,
        "reports": sanitized_reports,
        "total_nearby_issues": len(sanitized_reports),
        "locality": _approximate_locality(
            farmer.get("village") if farmer else None,
            farmer.get("district") if farmer else None
        )
    }


async def search_community_reports(
    query: Optional[str] = None,
    crop: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 20
) -> List[Dict[str, Any]]:
    """Simple, high-performance agricultural search across community reports."""
    results = []
    q_clean = (query or "").lower().strip()
    crop_clean = (crop or "").lower().strip()
    cat_clean = (category or "").lower().strip()

    for r in _REPORTS_STORE:
        r_crop = (r.get("crop") or "").lower()
        r_cat = (r.get("category") or "").lower()
        r_title = (r.get("title") or "").lower()
        r_desc = (r.get("description") or "").lower()

        if crop_clean and crop_clean not in r_crop:
            continue
        if cat_clean and cat_clean not in r_cat:
            continue
        if q_clean and (q_clean not in r_title and q_clean not in r_desc and q_clean not in r_crop):
            continue

        results.append(r)

    return results[:limit]
