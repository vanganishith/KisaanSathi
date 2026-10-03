import logging
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Query, Path, Body, status, File, UploadFile, Form

from app.models.farm_platform_models import (
    FarmerProfileResponse,
    FarmerProfileUpdateRequest,
    FarmCreateRequest,
    FarmUpdateRequest,
    FarmResponse,
    FieldCreateRequest,
    FieldUpdateRequest,
    FieldResponse,
    CropCycleCreateRequest,
    CropCycleUpdateRequest,
    CropCycleResponse,
    SoilRecordCreateRequest,
    SoilRecordUpdateRequest,
    SoilRecordResponse,
    FarmActivityCreateRequest,
    FarmActivityResponse,
    WeatherContextResponse,
    UnifiedFarmContextResponse,
    VoiceFarmUpdateRequest,
    VoiceFarmUpdateResponse,
    RecommendationRequest,
    RecommendationResponse,
    IrrigationRecommendationResponse,
    FertilizerRecommendationResponse,
    CropHealthAssessmentRequest,
    CropHealthAssessmentResponse,
    TodayPlanResponse,
    CommunityReportCreateRequest,
    CommunityReportVoiceRequest,
    CommunityReportResponse,
    CommunitySignalResponse,
    CommunityMeTooRequest,
    CommunityMeTooResponse,
    CommunityFeedResponse,
    VoiceConversationRequest,
    VoiceConversationResponse,
    AlertsListResponse,
    FarmAlertResponse,
    FarmAlertCreateRequest,
    YieldEstimateResponse,
    HarvestPlanResponse,
    HarvestRecordCreateRequest,
    HarvestRecordResponse,
    MarketPriceResponse,
    FarmAnalyticsResponse,
    AeoCasePrioritizationItem,
    AeoAdvisoryCreateRequest,
    AeoAdvisoryResponse,
    AeoCaseOutcomeUpdateRequest
)
from app.services.farm_service import (
    get_or_create_farmer,
    get_farmer_profile,
    update_farmer_profile,
    create_farm,
    list_farms_by_farmer,
    get_farm_by_id,
    update_farm,
    create_field,
    list_fields_by_farm,
    get_field_by_id,
    update_field,
    create_crop_cycle,
    list_crop_cycles_by_field,
    get_crop_cycle_by_id,
    update_crop_cycle,
    create_soil_record,
    get_soil_record_by_field,
    update_soil_record,
    record_farm_activity,
    list_activities_by_field
)
from app.services.crop_lifecycle_service import calculate_crop_age, determine_crop_stage
from app.services.weather_service import get_weather_context
from app.services.context_engine_service import get_farm_context
from app.services.voice_farm_extraction_service import process_voice_farm_update

logger = logging.getLogger("rythubandhu.farm_platform_api")

router = APIRouter(tags=["Farm Decision Support Platform Foundation"])


# ==============================================================================
# FARMER PROFILE ENDPOINTS
# ==============================================================================

@router.get("/farmer/profile", summary="Get Farmer Profile with Progressive Attributes")
async def get_profile(
    farmer_id: Optional[str] = Query(None, description="UUID of farmer"),
    phone: Optional[str] = Query(None, description="Mobile number of farmer")
):
    if not farmer_id and not phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either farmer_id or phone parameter is required."
        )

    profile = await get_farmer_profile(farmer_id=farmer_id, phone=phone)
    if not profile and phone:
        # Auto-create lightweight profile on first lookup
        profile = await get_or_create_farmer(phone=phone)

    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farmer profile not found.")

    return {"success": True, "farmer": profile}


@router.patch("/farmer/profile", summary="Update Farmer Profile (Progressive Profiling)")
async def update_profile(
    payload: FarmerProfileUpdateRequest,
    farmer_id: Optional[str] = Query(None),
    phone: Optional[str] = Query(None)
):
    target_farmer = await get_farmer_profile(farmer_id=farmer_id, phone=phone)
    if not target_farmer and phone:
        target_farmer = await get_or_create_farmer(phone=phone)

    if not target_farmer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farmer not found.")

    updated = await update_farmer_profile(target_farmer["id"], payload.model_dump(exclude_unset=True))
    return {"success": True, "farmer": updated}


# ==============================================================================
# FARM ENDPOINTS
# ==============================================================================

@router.get("/farms", summary="List Farms for a Farmer")
async def list_farms(
    farmer_id: Optional[str] = Query(None),
    phone: Optional[str] = Query(None)
):
    if not farmer_id and not phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="farmer_id or phone required.")

    farmer = await get_farmer_profile(farmer_id=farmer_id, phone=phone)
    if not farmer and phone:
        farmer = await get_or_create_farmer(phone=phone)

    if not farmer:
        return {"success": True, "farms": []}

    farms = await list_farms_by_farmer(farmer["id"])
    return {"success": True, "farms": farms}


@router.post("/farms", status_code=status.HTTP_201_CREATED, summary="Create a Farm")
async def create_new_farm(payload: FarmCreateRequest):
    farmer = None
    if payload.farmer_id:
        farmer = await get_farmer_profile(farmer_id=payload.farmer_id)
    elif payload.farmer_phone:
        farmer = await get_or_create_farmer(phone=payload.farmer_phone)

    if not farmer:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Valid farmer_id or farmer_phone required.")

    farm = await create_farm(farmer["id"], payload.model_dump())
    return {"success": True, "farm": farm}


@router.get("/farms/{farm_id}", summary="Get Farm Details")
async def get_farm(farm_id: str = Path(...)):
    farm = await get_farm_by_id(farm_id)
    if not farm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm not found.")
    fields = await list_fields_by_farm(farm_id)
    result = dict(farm)
    result["fields"] = fields
    return {"success": True, "farm": result}


@router.patch("/farms/{farm_id}", summary="Update Farm Details")
async def update_farm_details(farm_id: str, payload: FarmUpdateRequest):
    updated = await update_farm(farm_id, payload.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm not found.")
    return {"success": True, "farm": updated}


# ==============================================================================
# FIELD ENDPOINTS
# ==============================================================================

@router.get("/farms/{farm_id}/fields", summary="List Fields in a Farm")
async def get_farm_fields(farm_id: str = Path(...)):
    fields = await list_fields_by_farm(farm_id)
    return {"success": True, "fields": fields}


@router.post("/farms/{farm_id}/fields", status_code=status.HTTP_201_CREATED, summary="Create a Field")
async def create_new_field(farm_id: str, payload: FieldCreateRequest):
    field = await create_field(farm_id, payload.model_dump())
    return {"success": True, "field": field}


@router.get("/fields/{field_id}", summary="Get Field Details")
async def get_field(field_id: str = Path(...)):
    field = await get_field_by_id(field_id)
    if not field:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Field not found.")
    
    crops = await list_crop_cycles_by_field(field_id)
    soil = await get_soil_record_by_field(field_id)
    activities = await list_activities_by_field(field_id, limit=10)

    result = dict(field)
    result["crop_cycles"] = crops
    result["soil_record"] = soil
    result["recent_activities"] = activities
    return {"success": True, "field": result}


@router.patch("/fields/{field_id}", summary="Update Field Details")
async def update_field_details(field_id: str, payload: FieldUpdateRequest):
    updated = await update_field(field_id, payload.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Field not found.")
    return {"success": True, "field": updated}


# ==============================================================================
# CROP CYCLE ENDPOINTS
# ==============================================================================

@router.get("/fields/{field_id}/crops", summary="List Crop Cycles for a Field")
async def get_field_crops(field_id: str = Path(...)):
    cycles = await list_crop_cycles_by_field(field_id)
    return {"success": True, "crop_cycles": cycles}


@router.post("/fields/{field_id}/crops", status_code=status.HTTP_201_CREATED, summary="Create a Crop Cycle")
async def create_new_crop_cycle(field_id: str, payload: CropCycleCreateRequest):
    data = payload.model_dump()
    data["field_id"] = field_id
    cycle = await create_crop_cycle(field_id, data)
    return {"success": True, "crop_cycle": cycle}


@router.get("/crop-cycles/{cycle_id}", summary="Get Crop Cycle with Lifecycle Analysis")
async def get_crop_cycle(cycle_id: str = Path(...)):
    cycle = await get_crop_cycle_by_id(cycle_id)
    if not cycle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Crop cycle not found.")
    return {"success": True, "crop_cycle": cycle}


@router.patch("/crop-cycles/{cycle_id}", summary="Update Crop Cycle")
async def update_crop_cycle_details(cycle_id: str, payload: CropCycleUpdateRequest):
    updated = await update_crop_cycle(cycle_id, payload.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Crop cycle not found.")
    return {"success": True, "crop_cycle": updated}


# ==============================================================================
# SOIL RECORD ENDPOINTS
# ==============================================================================

@router.get("/fields/{field_id}/soil", summary="Get Soil Record for a Field")
async def get_field_soil(field_id: str = Path(...)):
    soil = await get_soil_record_by_field(field_id)
    return {"success": True, "soil_record": soil}


@router.post("/fields/{field_id}/soil", status_code=status.HTTP_201_CREATED, summary="Record Soil Data")
async def record_soil_data(field_id: str, payload: SoilRecordCreateRequest):
    data = payload.model_dump()
    data["field_id"] = field_id
    soil = await create_soil_record(field_id, data)
    return {"success": True, "soil_record": soil}


@router.patch("/fields/{field_id}/soil", summary="Update Soil Record for a Field")
async def update_field_soil(field_id: str, payload: SoilRecordUpdateRequest):
    existing = await get_soil_record_by_field(field_id)
    if not existing:
        # Create if not yet existing
        create_data = payload.model_dump(exclude_unset=True)
        create_data["field_id"] = field_id
        new_soil = await create_soil_record(field_id, create_data)
        return {"success": True, "soil_record": new_soil}

    updated = await update_soil_record(existing["id"], payload.model_dump(exclude_unset=True))
    return {"success": True, "soil_record": updated}


# ==============================================================================
# FARM ACTIVITY ENDPOINTS
# ==============================================================================

@router.get("/fields/{field_id}/activities", summary="List Farm Activities / Timeline")
async def get_field_activities(
    field_id: str = Path(...),
    limit: int = Query(30, ge=1, le=100)
):
    activities = await list_activities_by_field(field_id, limit=limit)
    return {"success": True, "activities": activities}


@router.post("/fields/{field_id}/activities", status_code=status.HTTP_201_CREATED, summary="Log a Farm Activity")
async def log_farm_activity(field_id: str, payload: FarmActivityCreateRequest):
    act = await record_farm_activity(
        field_id=field_id,
        activity_type=payload.activity_type,
        title=payload.title,
        description=payload.description,
        crop_cycle_id=payload.crop_cycle_id,
        metadata=payload.metadata,
        event_date=payload.event_date
    )
    return {"success": True, "activity": act}


# ==============================================================================
# WEATHER CONTEXT ENDPOINT
# ==============================================================================

@router.get("/weather/context", response_model=WeatherContextResponse, summary="Get Open-Meteo Weather Context")
async def get_weather(
    latitude: Optional[float] = Query(None, description="Latitude (default: 17.9689)"),
    longitude: Optional[float] = Query(None, description="Longitude (default: 79.5941)")
):
    ctx = await get_weather_context(latitude, longitude)
    return ctx


# ==============================================================================
# CONTEXT ENGINE ENDPOINTS
# ==============================================================================

@router.get("/fields/{field_id}/context", summary="Get Complete Farm Context for a Field")
async def get_context_for_field(field_id: str = Path(...)):
    field = await get_field_by_id(field_id)
    if not field:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Field not found.")

    farm = await get_farm_by_id(field["farm_id"])
    farmer_id = farm.get("farmer_id") if farm else None

    ctx = await get_farm_context(farmer_id=farmer_id, field_id=field_id)
    return ctx


@router.get("/farmer/context", summary="Get Unified Farm Context for a Farmer")
async def get_context_for_farmer(
    farmer_id: Optional[str] = Query(None),
    phone: Optional[str] = Query(None)
):
    if not farmer_id and not phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="farmer_id or phone required.")

    ctx = await get_farm_context(farmer_id=farmer_id, farmer_phone=phone)
    return ctx


# ==============================================================================
# VOICE-FIRST FARM UPDATE ENDPOINT (Progressive Profiling)
# ==============================================================================

@router.post(
    "/farmer/voice-update",
    response_model=VoiceFarmUpdateResponse,
    summary="Natural Language Voice / Text Farm Memory Update",
    description="Extracts structured farm entities (crop, area, age, irrigation, soil) from speech or text, updates farm memory, and asks for only missing info."
)
async def voice_update_farm(payload: VoiceFarmUpdateRequest):
    if not payload.text_input or not payload.text_input.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="text_input (transcribed speech or user text) is required."
        )

    try:
        result = await process_voice_farm_update(
            farmer_phone=payload.farmer_phone,
            text_input=payload.text_input.strip(),
            language=payload.language or "te",
            farm_id=payload.farm_id,
            field_id=payload.field_id
        )
        return result
    except Exception as e:
        logger.error(f"[VoiceFarmUpdate API] Error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": f"Failed to process voice update: {str(e)}"}
        )


# ==============================================================================
# CORE INTELLIGENCE LAYER ENDPOINTS (PHASES 5 - 8)
# ==============================================================================

@router.post(
    "/ai/recommend",
    response_model=RecommendationResponse,
    summary="AI Decision Engine Recommendation",
    description="Evaluates unified context, soil, weather, stage, and intent to answer 'What should this farmer do now?'"
)
async def get_ai_recommendation(payload: RecommendationRequest):
    from app.services.ai_decision_engine_service import generate_farm_recommendation
    try:
        rec = await generate_farm_recommendation(
            farmer_id=payload.farmer_id,
            farm_id=payload.farm_id,
            field_id=payload.field_id,
            crop_cycle_id=payload.crop_cycle_id,
            farmer_phone=payload.farmer_phone,
            intent=payload.intent,
            user_question=payload.user_question,
            language=payload.language or "te"
        )
        return rec
    except Exception as e:
        logger.error(f"[AI Recommendation API] Error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate farm recommendation: {str(e)}"
        )


@router.get(
    "/ai/irrigation/recommendation",
    response_model=IrrigationRecommendationResponse,
    summary="Dedicated Irrigation Intelligence Decision",
    description="Determines whether to DEFER, IRRIGATE_NOW, or MONITOR_RAIN using weather forecasts, soil retention, and stage sensitivity."
)
async def get_irrigation_advisory(
    field_id: Optional[str] = Query(None),
    crop_cycle_id: Optional[str] = Query(None),
    farmer_phone: Optional[str] = Query(None),
    language: Optional[str] = Query("te")
):
    from app.services.irrigation_service import get_irrigation_recommendation
    try:
        return await get_irrigation_recommendation(
            field_id=field_id,
            crop_cycle_id=crop_cycle_id,
            farmer_phone=farmer_phone,
            language=language or "te"
        )
    except Exception as e:
        logger.error(f"[Irrigation API] Error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compute irrigation recommendation: {str(e)}"
        )


@router.post(
    "/ai/irrigation/log",
    summary="Log an Irrigation Event",
    description="Records a confirmed irrigation event into farm memory."
)
async def log_irrigation_event(
    field_id: str = Query(...),
    crop_cycle_id: Optional[str] = Query(None),
    farmer_phone: Optional[str] = Query(None),
    method: str = Query("drip"),
    notes: Optional[str] = Query(None)
):
    from app.services.irrigation_service import log_irrigation_activity
    try:
        return await log_irrigation_activity(
            field_id=field_id,
            crop_cycle_id=crop_cycle_id,
            farmer_phone=farmer_phone,
            method=method,
            notes=notes
        )
    except Exception as e:
        logger.error(f"[Log Irrigation API] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get(
    "/ai/fertilizer/recommendation",
    response_model=FertilizerRecommendationResponse,
    summary="Fertilizer & Nutrient Advisory",
    description="Generates stage-specific nutrient recommendations without fabricating unverified NPK values."
)
async def get_fertilizer_advisory(
    field_id: Optional[str] = Query(None),
    crop_cycle_id: Optional[str] = Query(None),
    farmer_phone: Optional[str] = Query(None),
    language: Optional[str] = Query("te")
):
    from app.services.fertilizer_service import get_fertilizer_recommendation
    try:
        return await get_fertilizer_recommendation(
            field_id=field_id,
            crop_cycle_id=crop_cycle_id,
            farmer_phone=farmer_phone,
            language=language or "te"
        )
    except Exception as e:
        logger.error(f"[Fertilizer API] Error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compute fertilizer recommendation: {str(e)}"
        )


@router.post(
    "/ai/fertilizer/log",
    summary="Log a Fertilizer Application",
    description="Records a fertilizer application event into farm memory."
)
async def log_fertilizer_event(
    field_id: str = Query(...),
    crop_cycle_id: Optional[str] = Query(None),
    product_name: str = Query("Urea"),
    quantity: Optional[float] = Query(None),
    unit: str = Query("kg"),
    notes: Optional[str] = Query(None)
):
    from app.services.fertilizer_service import log_fertilizer_activity
    try:
        return await log_fertilizer_activity(
            field_id=field_id,
            crop_cycle_id=crop_cycle_id,
            product_name=product_name,
            quantity=quantity,
            unit=unit,
            notes=notes
        )
    except Exception as e:
        logger.error(f"[Log Fertilizer API] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post(
    "/ai/crop-health",
    response_model=CropHealthAssessmentResponse,
    summary="Multimodal Crop Health & Disease Assessment",
    description="Evaluates crop photo quality, detects symptoms, cross-references crop stage, and escalates to AEO when necessary."
)
async def evaluate_crop_health(payload: CropHealthAssessmentRequest):
    from app.services.crop_health_service import assess_crop_health
    try:
        return await assess_crop_health(
            field_id=payload.field_id,
            crop_cycle_id=payload.crop_cycle_id,
            images=payload.images,
            transcript=payload.transcript,
            farmer_phone=payload.farmer_phone,
            case_id=payload.case_id,
            language=payload.language or "te"
        )
    except Exception as e:
        logger.error(f"[CropHealth API] Error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assess crop health: {str(e)}"
        )


@router.get(
    "/ai/plan/today",
    response_model=TodayPlanResponse,
    summary="Today's Priorities for PLAN Dashboard",
    description="Assembles Today's 4 core priorities: Irrigation, Nutrition, Weather Warning, and Crop Health Scouting."
)
async def get_plan_today(
    farmer_phone: Optional[str] = Query(None),
    field_id: Optional[str] = Query(None),
    crop_cycle_id: Optional[str] = Query(None),
    language: Optional[str] = Query("te")
):
    from app.services.ai_decision_engine_service import get_today_plan
    try:
        return await get_today_plan(
            farmer_phone=farmer_phone,
            field_id=field_id,
            crop_cycle_id=crop_cycle_id,
            language=language or "te"
        )
    except Exception as e:
        logger.error(f"[Today Plan API] Error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate today plan: {str(e)}"
        )


@router.get(
    "/ai/recommendations/history",
    summary="Get Recent Recommendation History",
    description="Fetches recent recommendations generated by the Decision Engine."
)
async def get_recommendation_history(limit: int = Query(20, ge=1, le=100)):
    from app.services.ai_decision_engine_service import list_recommendation_history
    return {
        "success": True,
        "recommendations": list_recommendation_history(limit=limit)
    }


# ==============================================================================
# COMMUNITY ENGINE & SIGNAL INTELLIGENCE (Phases 9 & 10)
# ==============================================================================

@router.post(
    "/community/reports",
    response_model=CommunityReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a Community Report",
    description="Publishes a privacy-safe community report linked to the farmer's crop and location."
)
async def create_report(payload: CommunityReportCreateRequest):
    from app.services.community_signal_service import create_community_report
    try:
        res = await create_community_report(
            farmer_phone=payload.farmer_phone,
            crop=payload.crop,
            category=payload.category,
            title=payload.title,
            description=payload.description,
            transcript=payload.transcript,
            photo_urls=payload.photo_urls,
            latitude=payload.latitude,
            longitude=payload.longitude,
            approx_location=payload.approx_location,
            visibility=payload.visibility,
            field_id=payload.field_id,
            crop_cycle_id=payload.crop_cycle_id,
            language=payload.language or "te"
        )
        return res["report"]
    except Exception as e:
        logger.error(f"[Create Community Report] Error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create community report: {str(e)}"
        )


@router.post(
    "/community/reports/voice",
    response_model=CommunityReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Community Report from Voice",
    description="Voice-first community report creation: extracts category and active crop automatically."
)
async def create_voice_report(payload: CommunityReportVoiceRequest):
    from app.services.community_signal_service import create_community_report_by_voice
    try:
        res = await create_community_report_by_voice(
            farmer_phone=payload.farmer_phone,
            voice_input=payload.voice_input,
            crop=payload.crop,
            photo_urls=payload.photo_urls,
            latitude=payload.latitude,
            longitude=payload.longitude,
            language=payload.language or "te"
        )
        return res["report"]
    except Exception as e:
        logger.error(f"[Create Voice Report] Error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create voice report: {str(e)}"
        )


@router.get(
    "/community/feed",
    response_model=CommunityFeedResponse,
    summary="Get Privacy-Safe Community Feed & Signals",
    description="Returns active regional signals and privacy-sanitized nearby reports for the farmer."
)
async def get_feed(
    farmer_phone: Optional[str] = Query(None),
    crop: Optional[str] = Query(None),
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    category: Optional[str] = Query(None),
    language: Optional[str] = Query("te")
):
    from app.services.community_signal_service import get_community_feed
    try:
        return await get_community_feed(
            farmer_phone=farmer_phone,
            crop=crop,
            latitude=latitude,
            longitude=longitude,
            category=category,
            language=language or "te"
        )
    except Exception as e:
        logger.error(f"[Community Feed API] Error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch community feed: {str(e)}"
        )


@router.post(
    "/community/reports/{report_id}/me-too",
    response_model=CommunityMeTooResponse,
    summary="1-Tap Me Too Confirmation",
    description="Registers a Me Too confirmation from the farmer without leaking phone number or exact GPS."
)
async def post_me_too(report_id: str, payload: CommunityMeTooRequest):
    from app.services.community_signal_service import record_me_too
    try:
        return await record_me_too(
            report_id=report_id,
            farmer_phone=payload.farmer_phone
        )
    except Exception as e:
        logger.error(f"[Me Too API] Error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record Me Too: {str(e)}"
        )


@router.get(
    "/community/signals",
    response_model=List[CommunitySignalResponse],
    summary="Get Active Community Regional Signals",
    description="Retrieves time-windowed regional crop signals."
)
async def get_signals(
    crop: Optional[str] = Query("Chilli"),
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    language: Optional[str] = Query("te")
):
    from app.services.community_signal_service import get_active_community_signals
    return get_active_community_signals(
        crop=crop,
        latitude=latitude,
        longitude=longitude,
        language=language or "te"
    )


@router.get(
    "/community/search",
    summary="Search Community Reports",
    description="Filters community reports by query, crop, and category."
)
async def search_reports(
    q: Optional[str] = Query(None),
    crop: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=50)
):
    from app.services.community_signal_service import search_community_reports
    results = await search_community_reports(
        query=q,
        crop=crop,
        category=category,
        limit=limit
    )
    return {"success": True, "results": results}


# ==============================================================================
# VOICE-FIRST CONVERSATION & TTS (Phase 12)
# ==============================================================================

@router.post(
    "/ai/voice-conversation",
    response_model=VoiceConversationResponse,
    summary="Voice Conversation Assistant with Follow-up Memory",
    description="Handles natural language queries, follow-up explanations ('Why?'), and clarifies missing context."
)
async def handle_voice_chat(payload: VoiceConversationRequest):
    from app.services.ai_decision_engine_service import generate_farm_recommendation, classify_intent_from_query, _CONVERSATION_SESSIONS
    from app.services.farm_service import get_farmer_profile
    
    phone = payload.farmer_phone
    query = payload.query.strip()
    lang = payload.language or "te"

    farmer = await get_farmer_profile(phone=phone)
    crop_name = farmer.get("crop") if farmer else None

    # Check for missing essential context if query is a crop-specific question but crop is unknown
    is_crop_specific = any(k in query.lower() for k in ["నీళ్లు", "నీరు", "ఎరువు", "పురుగు", "ఆకులు", "irrigate", "fertilizer", "spray", "leaves"])
    if is_crop_specific and not crop_name:
        clarification = (
            "మీరు ఏ పంటకు సంబంధించి అడుగుతున్నారు? (ఉదా: మిరప, వరి, పత్తి)"
            if "te" in lang else
            "Which crop are you asking about? (e.g. Chilli, Paddy, Cotton)"
        )
        return {
            "success": True,
            "intent": "CLARIFICATION_NEEDED",
            "farmer_response": clarification,
            "recommendation": None,
            "clarification_question": clarification,
            "needs_clarification": True,
            "context_id": phone
        }

    # Dispatch to Decision Engine
    rec_res = await generate_farm_recommendation(
        farmer_phone=phone,
        user_question=query,
        language=lang
    )

    intent = classify_intent_from_query(query)
    farmer_resp = rec_res.get("farmer_response") or rec_res.get("recommendation", {}).get("farmer_response", "")

    return {
        "success": True,
        "intent": intent,
        "farmer_response": farmer_resp,
        "recommendation": rec_res.get("recommendation"),
        "clarification_question": None,
        "needs_clarification": False,
        "context_id": phone
    }


@router.post(
    "/ai/voice-question",
    summary="Direct Voice-First Agricultural Q&A (No Storage)",
    description="Transcribes live audio recording, validates agricultural relevance with Fireworks AI, and generates crop+day tailored spoken answer without permanent storage."
)
async def ask_voice_question(
    audio: Optional[UploadFile] = File(None),
    query: Optional[str] = Form(None),
    farmer_phone: Optional[str] = Form("9876543210"),
    crop_name: Optional[str] = Form(None),
    crop_age_days: Optional[int] = Form(None),
    language: Optional[str] = Form("te"),
):
    from app.services.ai_decision_engine_service import answer_farm_voice_question
    from app.services.stt_service import transcribe_audio

    spoken_text = (query or "").strip()

    if audio:
        try:
            audio_bytes = await audio.read()
            if len(audio_bytes) > 200:
                lang_param = "Telugu" if "te" in (language or "te").lower() else ("Hindi" if "hi" in (language or "").lower() else "English")
                transcript, _ = await transcribe_audio(
                    audio_bytes=audio_bytes,
                    content_type=audio.content_type or "audio/webm",
                    language=lang_param
                )
                if transcript and transcript.strip():
                    spoken_text = transcript.strip()
        except Exception as e:
            logger.warning(f"[VoiceAPI] Audio transcription exception: {e}")

    if not spoken_text:
        spoken_text = (query or "").strip()

    res = await answer_farm_voice_question(
        query=spoken_text,
        farmer_phone=farmer_phone or "9876543210",
        crop_name=crop_name,
        crop_age_days=crop_age_days,
        language=language or "te"
    )

    return {
        "success": True,
        "transcript": spoken_text,
        "is_relevant": res.get("is_relevant", True),
        "farmer_response": res.get("farmer_response"),
        "short_summary": res.get("short_summary"),
        "recommended_action": res.get("recommended_action"),
        "crop_name": res.get("crop_name"),
        "crop_age_days": res.get("crop_age_days"),
        "crop_stage": res.get("crop_stage")
    }


@router.post(
    "/ai/tts",
    summary="Text-to-Speech Synthesis",
    description="Synthesizes localized audio advice for farmer playback."
)
async def synthesize_speech(
    text: str = Query(...),
    language: str = Query("te")
):
    from app.services.tts_service import TTSService
    return await TTSService.synthesize_speech(text=text, language=language)


# ==============================================================================
# PHASE 13 — ALERTS & PROACTIVE NOTIFICATIONS
# ==============================================================================

@router.get(
    "/alerts",
    response_model=AlertsListResponse,
    summary="Get Farmer Alerts & Notifications",
    description="Evaluates farm context and returns proactive, prioritized, non-expired alerts."
)
async def get_alerts(
    farmer_phone: str = Query(...),
    field_id: Optional[str] = Query(None),
    crop_cycle_id: Optional[str] = Query(None),
    language: Optional[str] = Query("te")
):
    from app.services.alert_engine_service import alert_engine_service
    try:
        alerts = await alert_engine_service.evaluate_farmer_alerts(
            farmer_phone=farmer_phone,
            field_id=field_id,
            crop_cycle_id=crop_cycle_id,
            language=language or "te"
        )
        unread = sum(1 for a in alerts if a.get("status") == "UNREAD")
        high_p = sum(1 for a in alerts if a.get("priority") in ["HIGH", "URGENT"])
        return {
            "success": True,
            "alerts": alerts,
            "unread_count": unread,
            "high_priority_count": high_p
        }
    except Exception as e:
        logger.error(f"[Get Alerts API] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.patch(
    "/alerts/{alert_id}/read",
    summary="Mark Alert as Read"
)
async def mark_alert_read(
    alert_id: str,
    farmer_phone: str = Query(...)
):
    from app.services.alert_engine_service import alert_engine_service
    success = await alert_engine_service.mark_alert_read(alert_id=alert_id, farmer_phone=farmer_phone)
    return {"success": success, "alert_id": alert_id, "status": "READ"}


@router.patch(
    "/alerts/{alert_id}/dismiss",
    summary="Dismiss Alert"
)
async def dismiss_alert(
    alert_id: str,
    farmer_phone: str = Query(...)
):
    from app.services.alert_engine_service import alert_engine_service
    success = await alert_engine_service.dismiss_alert(alert_id=alert_id, farmer_phone=farmer_phone)
    return {"success": success, "alert_id": alert_id, "status": "DISMISSED"}


@router.post(
    "/alerts/{alert_id}/action",
    summary="Action Alert"
)
async def action_alert(
    alert_id: str,
    farmer_phone: str = Query(...)
):
    from app.services.alert_engine_service import alert_engine_service
    success = await alert_engine_service.action_alert(alert_id=alert_id, farmer_phone=farmer_phone)
    return {"success": success, "alert_id": alert_id, "status": "ACTIONED"}


# ==============================================================================
# PHASE 14 — FARM MEMORY & AUTOMATIC TIMELINE
# ==============================================================================

@router.get(
    "/farm-memory/timeline",
    summary="Get Farm Memory Chronological Timeline",
    description="Returns automatically accumulated chronological farm diary events."
)
async def get_timeline(
    farmer_phone: str = Query(...),
    field_id: Optional[str] = Query(None),
    crop_cycle_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200)
):
    from app.services.farm_memory_service import farm_memory_service
    try:
        timeline = await farm_memory_service.get_farm_timeline(
            farmer_phone=farmer_phone,
            field_id=field_id,
            crop_cycle_id=crop_cycle_id,
            limit=limit
        )
        return {"success": True, "timeline": timeline, "total_events": len(timeline)}
    except Exception as e:
        logger.error(f"[Farm Memory API] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get(
    "/crop-cycles/{crop_cycle_id}/history",
    summary="Get Crop Cycle Historical Summary"
)
async def get_cycle_history(
    crop_cycle_id: str,
    farmer_phone: str = Query(...)
):
    from app.services.farm_memory_service import farm_memory_service
    try:
        res = await farm_memory_service.get_crop_history(
            farmer_phone=farmer_phone,
            crop_cycle_id=crop_cycle_id
        )
        return {"success": True, **res}
    except Exception as e:
        logger.error(f"[Crop Cycle History API] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ==============================================================================
# PHASE 15 — YIELD ESTIMATION & HARVEST PLANNING
# ==============================================================================

@router.get(
    "/yield/estimate",
    response_model=YieldEstimateResponse,
    summary="AI-Assisted Yield Estimation",
    description="Estimates yield range with transparent positive/negative factors and no false precision."
)
async def get_yield_estimate(
    farmer_phone: str = Query(...),
    crop_cycle_id: Optional[str] = Query(None),
    field_id: Optional[str] = Query(None)
):
    from app.services.yield_harvest_service import yield_harvest_service
    try:
        return await yield_harvest_service.estimate_crop_yield(
            farmer_phone=farmer_phone,
            crop_cycle_id=crop_cycle_id,
            field_id=field_id
        )
    except Exception as e:
        logger.error(f"[Yield Estimate API] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get(
    "/harvest/plan",
    response_model=HarvestPlanResponse,
    summary="Harvest Planning & Weather Window",
    description="Provides expected harvest maturity window, weather considerations, and preparation points."
)
async def get_harvest_plan(
    farmer_phone: str = Query(...),
    crop_cycle_id: Optional[str] = Query(None),
    field_id: Optional[str] = Query(None)
):
    from app.services.yield_harvest_service import yield_harvest_service
    try:
        return await yield_harvest_service.get_harvest_plan(
            farmer_phone=farmer_phone,
            crop_cycle_id=crop_cycle_id,
            field_id=field_id
        )
    except Exception as e:
        logger.error(f"[Harvest Plan API] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post(
    "/harvest/records",
    response_model=HarvestRecordResponse,
    summary="Record Actual Measured Harvest Output"
)
async def create_harvest_record(payload: HarvestRecordCreateRequest):
    from app.services.yield_harvest_service import yield_harvest_service
    try:
        return await yield_harvest_service.record_actual_harvest(
            farmer_phone=payload.farmer_phone,
            crop_cycle_id=payload.crop_cycle_id,
            actual_yield_kg=payload.actual_yield_kg,
            unit=payload.unit or "kg",
            quality_grade=payload.quality_grade or "standard",
            market_sold_price_per_unit=payload.market_sold_price_per_unit,
            notes=payload.notes
        )
    except Exception as e:
        logger.error(f"[Record Harvest API] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get(
    "/market/prices",
    response_model=MarketPriceResponse,
    summary="Get Mandi Commodity Prices"
)
async def get_market_prices(
    commodity: str = Query("Chilli"),
    state: str = Query("Telangana")
):
    from app.services.market_price_service import market_price_service
    try:
        return await market_price_service.get_market_prices(commodity=commodity, state=state)
    except Exception as e:
        logger.error(f"[Market Price API] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ==============================================================================
# PHASE 16 — FARM ANALYTICS
# ==============================================================================

@router.get(
    "/analytics/farm",
    response_model=FarmAnalyticsResponse,
    summary="Get Simple Structured Farm Analytics",
    description="Aggregates farm metrics, crop lifecycle stats, and issue resolutions from database."
)
async def get_farm_analytics(farmer_phone: str = Query(...)):
    from app.services.analytics_service import analytics_service
    try:
        return await analytics_service.get_farm_analytics(farmer_phone=farmer_phone)
    except Exception as e:
        logger.error(f"[Farm Analytics API] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ==============================================================================
# PHASE 17 — AEO INTELLIGENCE & ADVISORIES
# ==============================================================================

@router.get(
    "/aeo/prioritized-cases",
    response_model=List[AeoCasePrioritizationItem],
    summary="Get Prioritized AEO Cases with Reasoning"
)
async def get_aeo_prioritized_cases(officer_phone: Optional[str] = Query(None)):
    from app.services.aeo_intelligence_service import aeo_intelligence_service
    try:
        return await aeo_intelligence_service.get_prioritized_cases(officer_phone=officer_phone)
    except Exception as e:
        logger.error(f"[AEO Prioritized Cases API] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post(
    "/aeo/advisories",
    response_model=AeoAdvisoryResponse,
    summary="Broadcast Official Verified AEO Guidance"
)
async def create_aeo_advisory(payload: AeoAdvisoryCreateRequest):
    from app.services.aeo_intelligence_service import aeo_intelligence_service
    try:
        return await aeo_intelligence_service.broadcast_official_advisory(
            officer_phone=payload.officer_phone,
            officer_name=payload.officer_name,
            region=payload.region,
            crop=payload.crop or "All",
            issue_category=payload.issue_category or "general",
            title=payload.title,
            advisory_text=payload.advisory_text
        )
    except Exception as e:
        logger.error(f"[AEO Advisory API] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.patch(
    "/aeo/cases/{case_id}/outcome",
    summary="Update AEO Case Health Outcome"
)
async def update_case_outcome(
    case_id: str,
    payload: AeoCaseOutcomeUpdateRequest,
    farmer_phone: str = Query("9876543210")
):
    from app.services.aeo_intelligence_service import aeo_intelligence_service
    try:
        return await aeo_intelligence_service.update_case_outcome(
            case_id=case_id,
            outcome=payload.outcome,
            officer_notes=payload.officer_notes,
            treatment_applied=payload.treatment_applied,
            evidence_urls=payload.evidence_urls,
            farmer_phone=farmer_phone
        )
    except Exception as e:
        logger.error(f"[Update Case Outcome API] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ==============================================================================
# TARGETED AEO SUGGESTIONS & PROACTIVE ADVISORIES
# ==============================================================================

class AeoBroadcastSuggestionRequest(BaseModel):
    officer_name: str = Field("Dr. V. Rao (AEO)", description="AEO officer name")
    officer_phone: Optional[str] = Field("+919876500001", description="AEO phone")
    crop: str = Field(..., description="Target crop e.g. Cotton, Chilli, or ALL")
    jurisdiction: str = Field(..., description="Target mandal, district, village, or ALL")
    title: str = Field(..., description="Advisory title")
    advisory_text: str = Field(..., description="Official advice text")
    priority: str = Field("ADVISORY", description="INFO, ADVISORY, WARNING, URGENT")
    target_stage: str = Field("ALL", description="Flowering, Vegetative, or ALL")
    valid_days: int = Field(7, description="Number of days advisory is active")


@router.get(
    "/aeo/suggestions",
    summary="Get Targeted AEO Suggestions for Farmer",
    description="Returns only AEO advisories that match the farmer's active crops, jurisdiction, and validity date.",
)
async def get_farmer_aeo_suggestions(
    farmer_phone: str = Query(..., description="Farmer phone number"),
    field_id: Optional[str] = Query(None, description="Optional field ID filter")
):
    from app.services.aeo_suggestion_matcher import aeo_suggestion_matcher
    try:
        matched = await aeo_suggestion_matcher.get_matching_suggestions_for_farmer(
            farmer_phone=farmer_phone,
            field_id=field_id
        )
        return {"success": True, "suggestions": matched, "count": len(matched)}
    except Exception as e:
        logger.error(f"[AEO Suggestions API] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post(
    "/aeo/suggestions",
    summary="Broadcast Targeted AEO Advisory",
    description="Publishes a new AEO advisory targeted by crop, jurisdiction, and stage.",
)
async def broadcast_aeo_suggestion(payload: AeoBroadcastSuggestionRequest):
    from app.services.aeo_suggestion_matcher import aeo_suggestion_matcher
    try:
        result = await aeo_suggestion_matcher.broadcast_suggestion(
            officer_name=payload.officer_name,
            officer_phone=payload.officer_phone,
            crop=payload.crop,
            jurisdiction=payload.jurisdiction,
            title=payload.title,
            advisory_text=payload.advisory_text,
            priority=payload.priority,
            target_stage=payload.target_stage,
            valid_days=payload.valid_days
        )
        return {"success": True, "suggestion": result, "message": "Advisory broadcasted successfully."}
    except Exception as e:
        logger.error(f"[AEO Broadcast API] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post(
    "/plan/select-crop",
    summary="Select Crop & Start Farm Lifecycle",
    description="Persists crop selection from Plan My Crop into farmer's real farm, field, and crop cycle.",
)
async def select_crop_alias(payload: Dict[str, Any] = Body(...)):
    from app.services.farm_service import select_crop_for_farm
    try:
        return await select_crop_for_farm(
            farmer_phone=payload["farmer_phone"],
            crop_name=payload["crop_name"],
            area_acres=float(payload["area_acres"]),
            soil_type=payload.get("soil_type", "BLACK"),
            farmer_name=payload.get("farmer_name", "Farmer"),
            location_name=payload.get("location_name"),
            latitude=payload.get("latitude"),
            longitude=payload.get("longitude"),
            planted_today=payload.get("planted_today", True),
            planting_date=payload.get("planting_date"),
            crop_age_days=payload.get("crop_age_days"),
            irrigation_method=payload.get("irrigation_method", "drip"),
            field_id=payload.get("field_id"),
            farm_id=payload.get("farm_id"),
        )
    except Exception as e:
        logger.error(f"[Plan Select Crop API] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))




