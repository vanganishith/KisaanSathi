import logging
from typing import Dict, Any, Optional, List
from app.services.farm_service import (
    get_farmer_profile,
    list_farms_by_farmer,
    get_farm_by_id,
    list_fields_by_farm,
    get_field_by_id,
    list_crop_cycles_by_field,
    get_crop_cycle_by_id,
    get_soil_record_by_field,
    list_activities_by_field
)
from app.services.crop_lifecycle_service import calculate_crop_age, determine_crop_stage
from app.services.weather_service import get_weather_context
from app.database.session import get_supabase_client

logger = logging.getLogger("rythubandhu.context_engine")


async def get_farm_context(
    farmer_id: Optional[str] = None,
    field_id: Optional[str] = None,
    crop_cycle_id: Optional[str] = None,
    farmer_phone: Optional[str] = None
) -> Dict[str, Any]:
    """
    Unified Context Engine:
    Assembles complete, structured multi-layer farm context:
    - Farmer profile
    - Farm
    - Field
    - Crop
    - Crop Age & Stage
    - Soil
    - Real-time Weather Context (Open-Meteo)
    - Recent Activities
    - Historical Incidents / Cases
    """
    # 1. Resolve Farmer
    farmer = await get_farmer_profile(farmer_id=farmer_id, phone=farmer_phone)
    if not farmer:
        # Return graceful baseline context
        weather = await get_weather_context(17.9689, 79.5941)
        from app.services.community_signal_service import get_active_community_signals
        comm_signals = get_active_community_signals(crop="Chilli", latitude=17.9689, longitude=79.5941)
        return {
            "success": True,
            "farmer": None,
            "farm": None,
            "field": None,
            "crop": None,
            "cropStage": {
                "crop_age_days": None,
                "current_stage": "Stage estimate unavailable",
                "next_stage": None,
                "days_to_next_stage": None,
                "approx_harvest_window": None,
                "stage_care_activities": [],
            },
            "soil": None,
            "weather": weather,
            "recentActivities": [],
            "history": [],
            "communitySignals": comm_signals
        }

    resolved_farmer_id = farmer["id"]

    # 2. Resolve Farm
    farms = await list_farms_by_farmer(resolved_farmer_id)
    active_farm = farms[0] if farms else None

    # 3. Resolve Field
    active_field = None
    if field_id:
        active_field = await get_field_by_id(field_id)
    elif active_farm:
        fields = await list_fields_by_farm(active_farm["id"])
        if fields:
            active_field = fields[0]

    # 4. Resolve Crop Cycle
    active_cycle = None
    if crop_cycle_id:
        active_cycle = await get_crop_cycle_by_id(crop_cycle_id)
    elif active_field:
        cycles = await list_crop_cycles_by_field(active_field["id"])
        active_list = [c for c in cycles if c.get("status") == "active"]
        active_cycle = active_list[0] if active_list else (cycles[0] if cycles else None)

    # 5. Crop Stage & Age Analysis
    crop_stage_data = {
        "crop_age_days": None,
        "current_stage": "Stage estimate unavailable",
        "stage_source": "unavailable",
        "next_stage": None,
        "days_to_next_stage": None,
        "approx_harvest_window": None,
        "stage_care_activities": [],
    }

    if active_cycle:
        age, source = calculate_crop_age(
            sowing_date=active_cycle.get("sowing_date"),
            planting_date=active_cycle.get("planting_date"),
            stated_age_days=active_cycle.get("crop_age_days")
        )
        stage_info = determine_crop_stage(
            crop_name=active_cycle.get("crop_name"),
            crop_age_days=age,
            stated_stage=active_cycle.get("current_stage")
        )
        crop_stage_data = {
            "crop_age_days": age,
            "current_stage": stage_info.get("current_stage") or "Stage estimate unavailable",
            "current_stage_te": stage_info.get("current_stage_te"),
            "stage_source": source if source != "unavailable" else stage_info.get("stage_source"),
            "next_stage": stage_info.get("next_stage"),
            "days_to_next_stage": stage_info.get("days_to_next_stage"),
            "approx_harvest_window": stage_info.get("approx_harvest_window"),
            "stage_care_activities": stage_info.get("stage_care_activities", []),
        }

    # 6. Resolve Soil
    soil_data = None
    if active_field:
        soil_record = await get_soil_record_by_field(active_field["id"])
        if soil_record:
            soil_data = soil_record
        elif active_farm and active_farm.get("default_soil_type"):
            soil_data = {
                "soil_type": active_farm.get("default_soil_type"),
                "source": "farmer_statement",
                "is_verified": False,
                "ph": None,
                "n": None,
                "p": None,
                "k": None
            }

    # 7. Resolve Weather Context
    lat = None
    lon = None
    if active_field and active_field.get("latitude") and active_field.get("longitude"):
        lat = active_field["latitude"]
        lon = active_field["longitude"]
    elif active_farm and active_farm.get("latitude") and active_farm.get("longitude"):
        lat = active_farm["latitude"]
        lon = active_farm["longitude"]
    elif farmer.get("latitude") and farmer.get("longitude"):
        lat = farmer["latitude"]
        lon = farmer["longitude"]

    weather = await get_weather_context(lat, lon)

    # 8. Recent Activities
    recent_activities = []
    if active_field:
        recent_activities = await list_activities_by_field(active_field["id"], limit=15)

    # 9. Historical Incidents
    history = []
    client = get_supabase_client()
    if client:
        try:
            inc_res = client.table("incidents").select("id, crop, description, status, priority, reported_at, risk_score").eq("farmer_id", resolved_farmer_id).order("reported_at", desc=True).limit(10).execute()
            if inc_res.data:
                history = inc_res.data
        except Exception as e:
            logger.warning(f"[ContextEngine] Error loading historical incidents: {e}")

    # 10. Community Signals (Phase 10: Community -> Context Engine Integration)
    crop_name_for_signal = (active_cycle.get("crop_name") if active_cycle else farmer.get("crop")) or "Chilli"
    community_signals = []
    try:
        from app.services.community_signal_service import get_active_community_signals
        community_signals = get_active_community_signals(
            crop=crop_name_for_signal,
            latitude=lat,
            longitude=lon
        )
    except Exception as e:
        logger.warning(f"[ContextEngine] Error gathering community signals: {e}")

    # 11. Multi-Field List
    all_fields = []
    if active_farm:
        all_fields = await list_fields_by_farm(active_farm["id"])

    # 12. Matched AEO Suggestions
    matched_aeo_suggestions = []
    try:
        from app.services.aeo_suggestion_matcher import aeo_suggestion_matcher
        matched_aeo_suggestions = await aeo_suggestion_matcher.get_matching_suggestions_for_farmer(
            farmer_phone=farmer_phone or farmer.get("phone"),
            field_id=active_field.get("id") if active_field else None
        )
    except Exception as e:
        logger.warning(f"[ContextEngine] Error gathering AEO suggestions: {e}")

    # Build Unified Context
    return {
        "success": True,
        "farmer": {
            "id": farmer.get("id"),
            "name": farmer.get("name"),
            "phone": farmer.get("phone"),
            "preferred_language": farmer.get("preferred_language"),
            "village": farmer.get("village"),
            "district": farmer.get("district"),
            "state": farmer.get("state"),
        },
        "farm": active_farm,
        "field": active_field,
        "fields": all_fields,
        "crop": active_cycle,
        "cropStage": crop_stage_data,
        "soil": soil_data,
        "weather": weather,
        "recentActivities": recent_activities,
        "history": history,
        "communitySignals": community_signals,
        "aeo_suggestions": matched_aeo_suggestions
    }


class ContextEngineService:
    """Class wrapper for unified context engine service."""
    get_farm_context = staticmethod(get_farm_context)
    get_unified_context = staticmethod(get_farm_context)


context_engine_service = ContextEngineService()

