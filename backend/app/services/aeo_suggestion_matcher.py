"""
AEO Suggestion Matcher Service for KisaanSaathi
Matches official Agricultural Extension Officer (AEO) advisories and suggestions
against specific farmer context (Crop, Crop Stage, Jurisdiction/Location, and Validity Window).
Ensures zero spam and contextual accuracy.
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import uuid

from app.database.session import get_supabase_client
from app.services.farm_service import get_farmer_profile, list_farms_by_farmer, list_fields_by_farm, list_crop_cycles_by_field
from app.services.crop_lifecycle_service import determine_crop_stage

logger = logging.getLogger("AeoSuggestionMatcher")

# In-memory storage for AEO suggestions & advisories
_IN_MEMORY_AEO_SUGGESTIONS: List[Dict[str, Any]] = [
    {
        "id": "aeo-sug-chilli-warangal-1",
        "officer_name": "Dr. V. Rao (AEO)",
        "officer_phone": "+919876500001",
        "crop": "Chilli",
        "jurisdiction": "Warangal",
        "target_stage": "Flowering",
        "category": "pest",
        "priority": "ADVISORY",
        "title": "Chilli Flowering Stage Mite Inspection",
        "title_te": "మిరప పూత దశలో నల్లి పురుగుల నివారణ",
        "advisory_text": "Farmers growing chilli in this region should inspect leaf undersides for mite activity during flowering stage. Spray Diafenthiuron 50% WP (1.25g/L) if curling appears.",
        "advisory_text_te": "ఈ ప్రాంతంలోని మిరప రైతులు పూత దశలో ఆకుల అడుగున నల్లి పురుగులను గమనించండి. అవసరమైతే డైఫెన్‌థియురాన్ 50% WP వాడండి.",
        "valid_from": (datetime.now(timezone.utc)).date().isoformat(),
        "valid_until": "2030-12-31",
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "aeo-sug-cotton-medchal-2",
        "officer_name": "S. Sharma (AEO)",
        "officer_phone": "+919876500002",
        "crop": "Cotton",
        "jurisdiction": "Medchal",
        "target_stage": "ALL",
        "category": "crop_care",
        "priority": "ADVISORY",
        "title": "Cotton Field Soil Moisture Management",
        "title_te": "పత్తి చేనులో తేమ నిర్వహణ మరియు సూచనలు",
        "advisory_text": "Medchal cotton farmers should ensure clean ridge drainage before weekend showers. Apply light nitrogen top-dressing after rains settle.",
        "advisory_text_te": "మేడ్చల్ పత్తి రైతులు వర్షాలకు ముందు చేనులో నీరు నిలవకుండా డ్రైనేజీ కాలువలను శుభ్రం చేసుకోండి.",
        "valid_from": (datetime.now(timezone.utc)).date().isoformat(),
        "valid_until": "2030-12-31",
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "aeo-sug-paddy-karimnagar-3",
        "officer_name": "K. Srinivas (AEO)",
        "officer_phone": "+919876500003",
        "crop": "Paddy",
        "jurisdiction": "Karimnagar",
        "target_stage": "Tillering",
        "category": "pest",
        "priority": "WARNING",
        "title": "Paddy Stem Borer Early Vigilance",
        "title_te": "వరిలో కాండం తొలుచు పురుగు నివారణ",
        "advisory_text": "Karimnagar paddy farmers should monitor for dead hearts in tillering stage.",
        "advisory_text_te": "కరీంనగర్ వరి రైతులు పిలకల దశలో కాండం తొలుచు పురుగు కోసం గమనించండి.",
        "valid_from": (datetime.now(timezone.utc)).date().isoformat(),
        "valid_until": "2030-12-31",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
]


class AeoSuggestionMatcher:
    """
    Context-aware matcher for Agricultural Extension Officer (AEO) suggestions.
    """

    @classmethod
    async def match_suggestion(
        cls,
        suggestion: Dict[str, Any],
        farmer_context: Optional[Dict[str, Any]] = None,
        farmer_phone: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Evaluates whether an AEO suggestion is relevant to a specific farmer context.
        Criteria:
        1. Crop match (Strict: suggestion.crop must match one of farmer's active crops or be 'ALL')
        2. Geographic / Jurisdiction match (Strict: suggestion.jurisdiction must match farmer's location/district/village or be 'ALL')
        3. Time validity (valid_from <= today <= valid_until)
        4. Crop stage match (optional: if suggestion specifies a stage other than 'ALL')
        """
        if not farmer_context and farmer_phone:
            # Build lightweight context without recursive get_farm_context
            farmer = await get_farmer_profile(phone=farmer_phone)
            active_crops = []
            if farmer:
                farms = await list_farms_by_farmer(farmer.get("id"))
                for fm in farms:
                    fields = await list_fields_by_farm(fm["id"])
                    for f in fields:
                        cycles = await list_crop_cycles_by_field(f["id"])
                        for c in cycles:
                            if c.get("crop_name"):
                                active_crops.append(c["crop_name"])
            farmer_context = {
                "farmer": farmer or {},
                "crop": [{"crop_name": c} for c in active_crops] if active_crops else None
            }

        farmer_context = farmer_context or {}
        reasons = []

        # 1. Resolve Farmer's Active Crops
        active_crops: List[str] = []
        farmer_crops = farmer_context.get("crop")
        if isinstance(farmer_crops, dict) and farmer_crops.get("crop_name"):
            active_crops.append(farmer_crops["crop_name"])
        elif isinstance(farmer_crops, list):
            for c in farmer_crops:
                if isinstance(c, dict) and c.get("crop_name"):
                    active_crops.append(c["crop_name"])
                elif isinstance(c, str):
                    active_crops.append(c)

        if not active_crops:
            farmer_profile = farmer_context.get("farmer") or {}
            if farmer_profile.get("crop"):
                active_crops.append(farmer_profile["crop"])
            if farmer_profile.get("active_crop"):
                active_crops.append(farmer_profile["active_crop"])

        # Normalize crop names
        active_crops_clean = [c.strip().lower() for c in active_crops if c]

        # Check Crop Match
        sug_crop = (suggestion.get("crop") or suggestion.get("crop_name") or "ALL").strip().lower()
        if sug_crop != "all":
            if not any(sug_crop in ac or ac in sug_crop for ac in active_crops_clean):
                return {
                    "matched": False,
                    "reason": f"Crop mismatch: Suggestion is for {suggestion.get('crop') or suggestion.get('crop_name')}, farmer grows {active_crops_clean or 'None'}."
                }
            reasons.append(f"Crop matched: {suggestion.get('crop') or suggestion.get('crop_name')}")
        else:
            reasons.append("Crop matches general advisory ('ALL')")

        # 2. Resolve Farmer Location / Jurisdiction
        farmer_data = farmer_context.get("farmer") or {}
        location_parts = [
            farmer_data.get("village") or "",
            farmer_data.get("mandal") or "",
            farmer_data.get("district") or "",
            farmer_data.get("location") or "",
            farmer_data.get("location_name") or "",
            farmer_data.get("state") or "",
        ]
        full_farmer_loc = " ".join([p for p in location_parts if p]).strip().lower()

        sug_region = (suggestion.get("jurisdiction") or suggestion.get("region") or "ALL").strip().lower()
        if sug_region != "all":
            # Exact token or substring match
            loc_tokens = set([t.strip().lower() for t in full_farmer_loc.replace(',', ' ').split() if len(t.strip()) > 2])
            sug_tokens = set([t.strip().lower() for t in sug_region.replace(',', ' ').split() if len(t.strip()) > 2])
            if not loc_tokens.intersection(sug_tokens) and sug_region not in full_farmer_loc and full_farmer_loc not in sug_region:
                return {
                    "matched": False,
                    "reason": f"Jurisdiction mismatch: Suggestion is for {suggestion.get('jurisdiction')}, farmer is in {full_farmer_loc or 'Unknown region'}."
                }
            reasons.append(f"Location matched jurisdiction: {suggestion.get('jurisdiction')}")
        else:
            reasons.append("Location matches general jurisdiction ('ALL')")

        # 3. Check Date Validity
        now_date = datetime.now(timezone.utc).date()
        valid_from_str = suggestion.get("valid_from")
        valid_until_str = suggestion.get("valid_until")

        if valid_from_str:
            try:
                v_from = datetime.fromisoformat(str(valid_from_str).replace("Z", "")).date()
                if now_date < v_from:
                    return {"matched": False, "reason": "Suggestion is not yet active."}
            except Exception:
                pass

        if valid_until_str:
            try:
                v_until = datetime.fromisoformat(str(valid_until_str).replace("Z", "")).date()
                if now_date > v_until:
                    return {"matched": False, "reason": "Suggestion has expired."}
            except Exception:
                pass

        reasons.append("Suggestion is currently active and within valid date window.")

        # 4. Check Target Stage (Optional)
        target_stage = (suggestion.get("target_stage") or "ALL").strip().lower()
        current_stage = (farmer_context.get("cropStage", {}).get("current_stage") or "").lower()

        if target_stage != "all" and current_stage:
            if target_stage in current_stage or current_stage in target_stage:
                reasons.append(f"Crop stage matched: {suggestion.get('target_stage')}")
            else:
                reasons.append(f"Stage advisory note (Current: {current_stage})")

        return {
            "matched": True,
            "reasons": reasons,
            "suggestion": suggestion
        }

    @classmethod
    async def get_matching_suggestions_for_farmer(
        cls,
        farmer_phone: str,
        field_id: Optional[str] = None,
        farmer_context: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetches all active AEO suggestions from database / in-memory store
        and returns only those matching the farmer's real crop and jurisdiction.
        """
        if not farmer_context:
            farmer = await get_farmer_profile(phone=farmer_phone)
            active_crops = []
            if farmer:
                farms = await list_farms_by_farmer(farmer.get("id"))
                for fm in farms:
                    fields = await list_fields_by_farm(fm["id"])
                    for f in fields:
                        cycles = await list_crop_cycles_by_field(f["id"])
                        for c in cycles:
                            if c.get("crop_name"):
                                active_crops.append(c["crop_name"])
            farmer_context = {
                "farmer": farmer or {},
                "crop": [{"crop_name": c} for c in active_crops] if active_crops else None
            }

        all_suggestions = list(_IN_MEMORY_AEO_SUGGESTIONS)

        # Also pull from database if connected
        client = get_supabase_client()
        if client:
            try:
                res = client.table("aeo_advisories").select("*").execute()
                if res.data:
                    for row in res.data:
                        if not any(s["id"] == row["id"] for s in all_suggestions):
                            all_suggestions.append({
                                "id": row["id"],
                                "officer_name": row.get("officer_name", "AEO Officer"),
                                "officer_phone": row.get("officer_phone", ""),
                                "crop": row.get("crop", "ALL"),
                                "jurisdiction": row.get("region", "ALL"),
                                "target_stage": row.get("target_stage", "ALL"),
                                "category": row.get("category", "advisory"),
                                "priority": row.get("priority", "ADVISORY"),
                                "title": row.get("title", "Agricultural Advisory"),
                                "advisory_text": row.get("advisory_text", ""),
                                "valid_from": row.get("valid_from"),
                                "valid_until": row.get("valid_until"),
                                "created_at": row.get("created_at")
                            })
            except Exception as e:
                logger.warning(f"[AeoSuggestionMatcher] DB query error: {e}")

        matched_list = []
        for sug in all_suggestions:
            match_res = await cls.match_suggestion(sug, farmer_context=farmer_context)
            if match_res["matched"]:
                item = dict(sug)
                item["match_reasons"] = match_res["reasons"]
                matched_list.append(item)

        return matched_list

    @classmethod
    async def broadcast_suggestion(
        cls,
        suggestion_or_officer: Any = None,
        crop: Optional[str] = None,
        jurisdiction: Optional[str] = None,
        title: Optional[str] = None,
        advisory_text: Optional[str] = None,
        priority: str = "ADVISORY",
        target_stage: str = "ALL",
        valid_days: int = 7,
        officer_phone: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Broadcasts a new targeted AEO suggestion for matching farmers.
        """
        if isinstance(suggestion_or_officer, dict):
            s = suggestion_or_officer
            sug_id = s.get("id") or str(uuid.uuid4())
            officer_name = s.get("officer_name") or "Agricultural Extension Officer"
            officer_phone = s.get("officer_phone") or "+919876500001"
            crop = s.get("crop") or s.get("crop_name") or "ALL"
            jurisdiction = s.get("jurisdiction") or s.get("region") or "ALL"
            target_stage = s.get("target_stage") or "ALL"
            priority = s.get("priority") or "ADVISORY"
            title = s.get("title") or "Agricultural Advisory"
            advisory_text = s.get("message") or s.get("advisory_text") or ""
            valid_from = s.get("valid_from") or datetime.now(timezone.utc).date().isoformat()
            valid_until = s.get("valid_until")
        else:
            sug_id = str(uuid.uuid4())
            officer_name = str(suggestion_or_officer or "Agricultural Extension Officer")
            crop = crop or "ALL"
            jurisdiction = jurisdiction or "ALL"
            title = title or "Agricultural Advisory"
            advisory_text = advisory_text or ""
            valid_from = datetime.now(timezone.utc).date().isoformat()
            valid_until = kwargs.get("valid_until")

        now_dt = datetime.now(timezone.utc)
        record = {
            "id": sug_id,
            "officer_name": officer_name,
            "officer_phone": officer_phone or "+919876500001",
            "crop": crop.strip(),
            "jurisdiction": jurisdiction.strip(),
            "target_stage": target_stage,
            "category": "advisory",
            "priority": priority.upper(),
            "title": title.strip(),
            "advisory_text": advisory_text.strip(),
            "valid_from": valid_from,
            "valid_until": valid_until,
            "created_at": now_dt.isoformat()
        }

        # Check for duplicate
        existing = [s for s in _IN_MEMORY_AEO_SUGGESTIONS if s["id"] == sug_id]
        if not existing:
            _IN_MEMORY_AEO_SUGGESTIONS.insert(0, record)
            notifications_created = 1
        else:
            notifications_created = 0

        client = get_supabase_client()
        if client:
            try:
                client.table("aeo_advisories").insert({
                    "id": sug_id,
                    "officer_name": officer_name,
                    "officer_phone": officer_phone or "+919876500001",
                    "crop": crop.strip(),
                    "region": jurisdiction.strip(),
                    "title": title.strip(),
                    "advisory_text": advisory_text.strip(),
                }).execute()
            except Exception as e:
                logger.warning(f"[AeoSuggestionMatcher] DB broadcast insert warning: {e}")

        return {
            "success": True,
            "suggestion": record,
            "notifications_created": notifications_created
        }


aeo_suggestion_matcher = AeoSuggestionMatcher()

