from typing import Optional, List, Dict, Any, Union
from datetime import datetime, date
from pydantic import BaseModel, Field


# ==============================================================================
# FARMER PROFILE MODELS
# ==============================================================================

class FarmerProfileResponse(BaseModel):
    id: str
    phone: str
    name: str
    preferred_language: Optional[str] = "Telugu"
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = "Telangana"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        extra = "allow"


class FarmerProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    preferred_language: Optional[str] = None
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        extra = "allow"


# ==============================================================================
# FARM MODELS
# ==============================================================================

class FarmCreateRequest(BaseModel):
    farmer_id: Optional[str] = None
    farmer_phone: Optional[str] = None
    name: str = "Main Farm"
    total_area: Optional[float] = Field(None, ge=0.1, le=1000.0)
    area_unit: str = "acres"
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    irrigation_type: Optional[str] = None
    default_soil_type: Optional[str] = None

    class Config:
        extra = "allow"


class FarmUpdateRequest(BaseModel):
    name: Optional[str] = None
    total_area: Optional[float] = None
    area_unit: Optional[str] = None
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    irrigation_type: Optional[str] = None
    default_soil_type: Optional[str] = None

    class Config:
        extra = "allow"


class FarmResponse(BaseModel):
    id: str
    farmer_id: str
    name: str
    total_area: Optional[float] = None
    area_unit: str = "acres"
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    irrigation_type: Optional[str] = None
    default_soil_type: Optional[str] = None
    fields_count: Optional[int] = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        extra = "allow"


# ==============================================================================
# FIELD MODELS
# ==============================================================================

class FieldCreateRequest(BaseModel):
    farm_id: str
    name: str = "Field A"
    area: Optional[float] = Field(None, ge=0.05, le=500.0)
    area_unit: str = "acres"
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    boundary: Optional[Dict[str, Any]] = None
    soil_reference: Optional[str] = None
    irrigation_method: Optional[str] = None
    current_crop_name: Optional[str] = None

    class Config:
        extra = "allow"


class FieldUpdateRequest(BaseModel):
    name: Optional[str] = None
    area: Optional[float] = None
    area_unit: Optional[str] = None
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    boundary: Optional[Dict[str, Any]] = None
    soil_reference: Optional[str] = None
    irrigation_method: Optional[str] = None
    current_crop_cycle_id: Optional[str] = None

    class Config:
        extra = "allow"


class FieldResponse(BaseModel):
    id: str
    farm_id: str
    name: str
    area: Optional[float] = None
    area_unit: str = "acres"
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    boundary: Optional[Dict[str, Any]] = None
    soil_reference: Optional[str] = None
    irrigation_method: Optional[str] = None
    current_crop_cycle_id: Optional[str] = None
    active_crop: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        extra = "allow"


# ==============================================================================
# CROP CYCLE MODELS
# ==============================================================================

class CropCycleCreateRequest(BaseModel):
    field_id: str
    crop_name: str
    crop_variety: Optional[str] = None
    sowing_date: Optional[Union[date, str]] = None
    planting_date: Optional[Union[date, str]] = None
    area: Optional[float] = None
    crop_age_days: Optional[int] = None
    current_stage: Optional[str] = None
    stage_source: Optional[str] = "calculated_from_sowing"
    expected_harvest_date: Optional[Union[date, str]] = None
    irrigation_method: Optional[str] = None
    status: str = "active"
    metadata: Optional[Dict[str, Any]] = {}

    class Config:
        extra = "allow"


class CropCycleUpdateRequest(BaseModel):
    crop_name: Optional[str] = None
    crop_variety: Optional[str] = None
    sowing_date: Optional[Union[date, str]] = None
    planting_date: Optional[Union[date, str]] = None
    area: Optional[float] = None
    crop_age_days: Optional[int] = None
    current_stage: Optional[str] = None
    stage_source: Optional[str] = None
    expected_harvest_date: Optional[Union[date, str]] = None
    irrigation_method: Optional[str] = None
    status: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        extra = "allow"


class CropCycleResponse(BaseModel):
    id: str
    field_id: str
    crop_name: str
    crop_variety: Optional[str] = None
    sowing_date: Optional[str] = None
    planting_date: Optional[str] = None
    area: Optional[float] = None
    crop_age_days: Optional[int] = None
    current_stage: Optional[str] = None
    stage_source: Optional[str] = None
    next_stage: Optional[str] = None
    days_to_next_stage: Optional[int] = None
    expected_harvest_date: Optional[str] = None
    irrigation_method: Optional[str] = None
    status: str = "active"
    metadata: Optional[Dict[str, Any]] = {}
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        extra = "allow"


# ==============================================================================
# SOIL RECORD MODELS
# ==============================================================================

class SoilRecordCreateRequest(BaseModel):
    field_id: str
    soil_type: Optional[str] = None
    ph: Optional[float] = Field(None, ge=3.0, le=11.0)
    n: Optional[float] = None
    p: Optional[float] = None
    k: Optional[float] = None
    organic_matter: Optional[float] = None
    moisture: Optional[float] = None
    ec: Optional[float] = None
    source: str = "farmer_statement"  # farmer_statement | soil_test_report | aeo_verified | sensor
    is_verified: bool = False
    report_url: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        extra = "allow"


class SoilRecordUpdateRequest(BaseModel):
    soil_type: Optional[str] = None
    ph: Optional[float] = None
    n: Optional[float] = None
    p: Optional[float] = None
    k: Optional[float] = None
    organic_matter: Optional[float] = None
    moisture: Optional[float] = None
    ec: Optional[float] = None
    source: Optional[str] = None
    is_verified: Optional[bool] = None
    report_url: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        extra = "allow"


class SoilRecordResponse(BaseModel):
    id: str
    field_id: str
    soil_type: Optional[str] = None
    ph: Optional[float] = None
    n: Optional[float] = None
    p: Optional[float] = None
    k: Optional[float] = None
    organic_matter: Optional[float] = None
    moisture: Optional[float] = None
    ec: Optional[float] = None
    source: str
    is_verified: bool
    report_url: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        extra = "allow"


# ==============================================================================
# FARM ACTIVITY MODELS
# ==============================================================================

class FarmActivityCreateRequest(BaseModel):
    field_id: str
    crop_cycle_id: Optional[str] = None
    activity_type: str = "general"
    title: str
    description: Optional[str] = None
    event_date: Optional[Union[datetime, str]] = None
    metadata: Optional[Dict[str, Any]] = {}

    class Config:
        extra = "allow"


class FarmActivityResponse(BaseModel):
    id: str
    field_id: str
    crop_cycle_id: Optional[str] = None
    activity_type: str
    title: str
    description: Optional[str] = None
    event_date: datetime
    metadata: Optional[Dict[str, Any]] = {}
    created_at: datetime

    class Config:
        extra = "allow"


# ==============================================================================
# WEATHER & CONTEXT MODELS
# ==============================================================================

class WeatherContextResponse(BaseModel):
    available: bool
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    temperature_c: Optional[float] = None
    relative_humidity_pct: Optional[float] = None
    precipitation_mm: Optional[float] = None
    rain_mm: Optional[float] = None
    wind_speed_kmh: Optional[float] = None
    precipitation_probability_pct: Optional[int] = None
    weather_condition: Optional[str] = None
    hourly_forecast: Optional[List[Dict[str, Any]]] = []
    daily_forecast: Optional[List[Dict[str, Any]]] = []
    agricultural_hints: Optional[List[str]] = []
    source: str = "Open-Meteo"

    class Config:
        extra = "allow"


class UnifiedFarmContextResponse(BaseModel):
    success: bool
    farmer: Optional[Dict[str, Any]] = None
    farm: Optional[Dict[str, Any]] = None
    field: Optional[Dict[str, Any]] = None
    crop: Optional[Dict[str, Any]] = None
    cropStage: Optional[Dict[str, Any]] = None
    soil: Optional[Dict[str, Any]] = None
    weather: Optional[Dict[str, Any]] = None
    recentActivities: List[Dict[str, Any]] = []
    history: List[Dict[str, Any]] = []

    class Config:
        extra = "allow"


# ==============================================================================
# VOICE FARM UPDATE MODELS
# ==============================================================================

class VoiceFarmUpdateRequest(BaseModel):
    farmer_phone: str
    text_input: Optional[str] = None
    language: Optional[str] = "te"
    field_id: Optional[str] = None
    farm_id: Optional[str] = None

    class Config:
        extra = "allow"


class VoiceFarmUpdateResponse(BaseModel):
    success: bool
    extracted_entities: Dict[str, Any]
    updated_records: Dict[str, Any]
    progressive_prompt: Optional[str] = None
    conversational_ack: str
    current_context: Optional[Dict[str, Any]] = None

    class Config:
        extra = "allow"


# ==============================================================================
# CORE INTELLIGENCE LAYER MODELS (PHASE 5-8)
# ==============================================================================

class RecommendationIntent(str):
    IRRIGATION = "IRRIGATION"
    FERTILIZER = "FERTILIZER"
    CROP_HEALTH = "CROP_HEALTH"
    GENERAL_CROP_ADVICE = "GENERAL_CROP_ADVICE"
    WEATHER_RISK = "WEATHER_RISK"
    CROP_PLANNING = "CROP_PLANNING"
    HARVEST_PLANNING = "HARVEST_PLANNING"
    YIELD_ESTIMATION = "YIELD_ESTIMATION"


class RecommendationPriority(str):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class IrrigationDecision(str):
    DEFER = "DEFER"
    IRRIGATE_NOW = "IRRIGATE_NOW"
    IRRIGATE_SOON = "IRRIGATE_SOON"
    MONITOR_RAIN = "MONITOR_RAIN"


class ActionItem(BaseModel):
    title: str
    description: str
    priority: Optional[str] = "MEDIUM"
    timeframe: Optional[str] = "Today"
    icon: Optional[str] = "🌱"


class RecommendationRequest(BaseModel):
    farmer_id: Optional[str] = None
    farmer_phone: Optional[str] = None
    farm_id: Optional[str] = None
    field_id: Optional[str] = None
    crop_cycle_id: Optional[str] = None
    intent: Optional[str] = "GENERAL_CROP_ADVICE"
    user_question: Optional[str] = None
    language: Optional[str] = "te"


class StructuredRecommendation(BaseModel):
    title: str
    summary: str
    farmer_response: str
    reasoning: Optional[str] = None
    priority: str = "MEDIUM"
    confidence: float = 0.85
    factors: List[str] = []
    actions: List[ActionItem] = []
    warnings: List[str] = []
    requires_aeo: bool = False
    intent: str = "GENERAL_CROP_ADVICE"
    language: str = "te"


class RecommendationResponse(BaseModel):
    success: bool
    recommendation: StructuredRecommendation
    farmer_response: str
    context_used: Dict[str, Any]
    created_at: Optional[datetime] = None


class IrrigationRecommendationResponse(BaseModel):
    success: bool
    decision: str  # DEFER, IRRIGATE_NOW, IRRIGATE_SOON, MONITOR_RAIN
    title: str
    summary: str
    farmer_response: str
    reasoning: str
    factors: List[str] = []
    confidence: float = 0.85
    next_action: Optional[str] = None
    requires_aeo: bool = False
    weather_summary: Optional[str] = None
    soil_summary: Optional[str] = None
    last_irrigation_date: Optional[str] = None
    days_since_last_irrigation: Optional[int] = None


class FertilizerRecommendationResponse(BaseModel):
    success: bool
    title: str
    summary: str
    farmer_response: str
    stage_advisory: str
    timing: str
    reasoning: str
    confidence: float = 0.85
    recommended_inputs: List[Dict[str, Any]] = []
    warnings: List[str] = []
    soil_test_available: bool = False
    requires_soil_test: bool = False
    requires_aeo: bool = False


class PossibleIssue(BaseModel):
    name: str
    name_local: Optional[str] = None
    category: str = "disease"  # disease, pest, nutrient_deficiency, water_stress, healthy
    confidence: float = 0.80
    description: Optional[str] = None
    treatment: Optional[str] = None


class CropHealthAssessmentRequest(BaseModel):
    field_id: Optional[str] = None
    crop_cycle_id: Optional[str] = None
    farmer_phone: Optional[str] = None
    case_id: Optional[str] = None
    transcript: Optional[str] = None
    images: Optional[List[str]] = []  # base64 data URLs or uploaded URLs
    language: Optional[str] = "te"


class CropHealthAssessmentResponse(BaseModel):
    success: bool
    image_status: str  # VALID, IMAGE_INSUFFICIENT, NO_VEGETATION, BLURRY
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    confidence: float = 0.80
    possible_issues: List[PossibleIssue] = []
    observations: List[str] = []
    evidence: List[str] = []
    recommended_actions: List[str] = []
    requires_aeo: bool = True
    farmer_summary: str
    incident_id: Optional[str] = None
    assessment_id: Optional[str] = None


class TodayPlanPriorityItem(BaseModel):
    type: str  # IRRIGATION, FERTILIZER, CROP_HEALTH, WEATHER_RISK, GENERAL
    priority: str  # LOW, MEDIUM, HIGH, URGENT
    title: str
    summary: str
    farmer_response: str
    reasoning: Optional[str] = None
    actions: List[str] = []
    icon: str = "🌱"


class TodayPlanResponse(BaseModel):
    success: bool
    date: str
    crop_name: Optional[str] = None
    crop_stage: Optional[str] = None
    crop_age_days: Optional[int] = None
    priorities: List[TodayPlanPriorityItem] = []
    weather_summary: Optional[Dict[str, Any]] = None


# ==============================================================================
# COMMUNITY ENGINE & SIGNAL MODELS (Phases 9 & 10)
# ==============================================================================

class CommunityReportCreateRequest(BaseModel):
    farmer_phone: str
    crop: Optional[str] = "Chilli"
    category: str = "crop_health"  # pest, disease, crop_health, weather_damage, irrigation, soil, fertilizer, crop_planning, other
    title: Optional[str] = None
    description: str
    transcript: Optional[str] = None
    photo_urls: Optional[List[str]] = []
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    approx_location: Optional[str] = None
    visibility: str = "PUBLIC_COMMUNITY"  # PUBLIC_COMMUNITY, ANONYMIZED_REGIONAL, PRIVATE, AEO_ONLY
    field_id: Optional[str] = None
    crop_cycle_id: Optional[str] = None
    language: Optional[str] = "te"

    class Config:
        extra = "allow"


class CommunityReportVoiceRequest(BaseModel):
    farmer_phone: str
    voice_input: str  # transcribed audio text
    crop: Optional[str] = None
    photo_urls: Optional[List[str]] = []
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    language: Optional[str] = "te"


class CommunityReportResponse(BaseModel):
    id: str
    crop: str
    category: str
    title: str
    description: str
    photo_urls: List[str] = []
    approx_location: str
    created_at: str
    me_too_count: int = 0
    has_me_too_by_user: bool = False
    ai_classification: Optional[str] = None
    aeo_verified: bool = False
    aeo_guidance: Optional[str] = None
    visibility: str = "PUBLIC_COMMUNITY"
    status: str = "active"


class CommunitySignalResponse(BaseModel):
    id: str
    crop: str
    issue_category: str
    title: str
    summary: str
    affected_region: str
    nearby_report_count: int
    time_window: str  # recent, moderate, historical
    signal_strength: str  # STRONG, MODERATE, HISTORICAL
    confidence: float
    aeo_verified: bool = False
    aeo_guidance: Optional[str] = None
    first_observed_at: Optional[str] = None
    last_observed_at: Optional[str] = None


class CommunityMeTooRequest(BaseModel):
    farmer_phone: str
    report_id: str


class CommunityMeTooResponse(BaseModel):
    success: bool
    report_id: str
    new_me_too_count: int
    message: str
    already_confirmed: bool = False


class CommunityFeedResponse(BaseModel):
    success: bool
    signals: List[CommunitySignalResponse] = []
    reports: List[CommunityReportResponse] = []
    total_nearby_issues: int = 0
    locality: str = "Near your locality"


class VoiceConversationRequest(BaseModel):
    farmer_phone: str
    query: str
    previous_context_id: Optional[str] = None
    language: Optional[str] = "te"


class VoiceConversationResponse(BaseModel):
    success: bool
    intent: str
    farmer_response: str
    recommendation: Optional[Dict[str, Any]] = None
    clarification_question: Optional[str] = None
    needs_clarification: bool = False
    context_id: str


# ==============================================================================
# PHASE 13 — ALERTS + PROACTIVE ADVISORY MODELS
# ==============================================================================

class AlertType(str):
    WEATHER = "WEATHER"
    IRRIGATION = "IRRIGATION"
    FERTILIZER = "FERTILIZER"
    CROP_STAGE = "CROP_STAGE"
    CROP_HEALTH = "CROP_HEALTH"
    DISEASE_RISK = "DISEASE_RISK"
    COMMUNITY_RISK = "COMMUNITY_RISK"
    HARVEST = "HARVEST"
    GENERAL_FARM = "GENERAL_FARM"
    AEO_ADVISORY = "AEO_ADVISORY"


class AlertStatus(str):
    UNREAD = "UNREAD"
    READ = "READ"
    DISMISSED = "DISMISSED"
    ACTIONED = "ACTIONED"
    EXPIRED = "EXPIRED"


class FarmAlertCreateRequest(BaseModel):
    farmer_phone: str
    alert_type: str = AlertType.WEATHER
    title: str
    summary: str
    detailed_reasoning: Optional[str] = None
    severity: str = "MEDIUM"  # LOW, MEDIUM, HIGH, CRITICAL
    priority: str = "MEDIUM"  # LOW, MEDIUM, HIGH, URGENT
    source: str = "DECISION_ENGINE"
    action_type: Optional[str] = "VIEW_PLAN"  # VIEW_PLAN, CHECK_CROP, VIEW_CROP, ASK_AEO, VIEW_RECOMMENDATION, VIEW_HARVEST_PLAN
    action_data: Optional[Dict[str, Any]] = {}
    field_id: Optional[str] = None
    crop_cycle_id: Optional[str] = None
    expires_in_hours: Optional[int] = 48
    metadata: Optional[Dict[str, Any]] = {}


class FarmAlertResponse(BaseModel):
    id: str
    farmer_phone: str
    alert_type: str
    title: str
    summary: str
    detailed_reasoning: Optional[str] = None
    severity: str
    priority: str
    source: str
    status: str
    action_type: Optional[str] = None
    action_data: Optional[Dict[str, Any]] = {}
    created_at: str
    expires_at: Optional[str] = None
    read_at: Optional[str] = None
    action_taken_at: Optional[str] = None
    field_id: Optional[str] = None
    crop_cycle_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = {}


class AlertsListResponse(BaseModel):
    success: bool
    alerts: List[FarmAlertResponse] = []
    unread_count: int = 0
    high_priority_count: int = 0


# ==============================================================================
# PHASE 15 — YIELD ESTIMATION & HARVEST PLANNING MODELS
# ==============================================================================

class YieldFactor(BaseModel):
    name: str
    impact: str  # POSITIVE (+), NEGATIVE (-), NEUTRAL
    description: str


class YieldEstimateResponse(BaseModel):
    success: bool
    crop_name: str
    area_acres: float
    estimated_min_kg: float
    estimated_max_kg: float
    estimated_unit: str = "kg"
    confidence: float = 0.80
    factors: List[YieldFactor] = []
    is_ai_assisted: bool = True
    disclaimer: str = "AI-assisted estimate based on crop stage, soil, and weather. Not a guaranteed yield."
    has_sufficient_data: bool = True
    created_at: Optional[str] = None


class YieldEstimateCreateRequest(BaseModel):
    crop_cycle_id: str
    farmer_phone: str
    estimated_min_kg: float
    estimated_max_kg: float
    confidence: Optional[float] = 0.80
    factors: Optional[List[Dict[str, Any]]] = []


class HarvestPlanResponse(BaseModel):
    success: bool
    crop_name: str
    crop_age_days: int
    current_stage: str
    expected_window_start: str
    expected_window_end: str
    days_to_harvest_window: int
    weather_consideration: str
    monitoring_points: List[str] = []
    market_hint: Optional[str] = None


class HarvestRecordCreateRequest(BaseModel):
    crop_cycle_id: str
    farmer_phone: str
    harvest_date: Optional[str] = None
    actual_yield_kg: float
    unit: str = "kg"
    quality_grade: Optional[str] = "standard"
    market_sold_price_per_unit: Optional[float] = None
    notes: Optional[str] = None


class HarvestRecordResponse(BaseModel):
    id: str
    crop_cycle_id: str
    farmer_phone: str
    harvest_date: str
    actual_yield_kg: float
    unit: str
    quality_grade: str
    market_sold_price_per_unit: Optional[float] = None
    notes: Optional[str] = None
    created_at: str


# ==============================================================================
# PHASE 15 & 16 — MARKET PRICES & FARM ANALYTICS MODELS
# ==============================================================================

class MarketPriceItem(BaseModel):
    market_name: str
    district: str
    commodity: str
    modal_price_per_quintal: float
    min_price: float
    max_price: float
    price_date: str
    trend: str = "STABLE"  # UP, DOWN, STABLE


class MarketPriceResponse(BaseModel):
    success: bool
    commodity: str
    state: str = "Telangana"
    prices: List[MarketPriceItem] = []
    disclaimer: str = "Market rates are indicative. Check local APMC mandi for daily arrivals."
    available: bool = True


class CropAnalyticsSummary(BaseModel):
    crop_cycle_id: str
    crop_name: str
    area_acres: float
    crop_age_days: int
    current_stage: str
    irrigation_count: int = 0
    fertilizer_count: int = 0
    health_check_count: int = 0
    active_issues_count: int = 0
    resolved_issues_count: int = 0
    estimated_yield_kg: Optional[Dict[str, Any]] = None
    actual_yield_kg: Optional[float] = None


class FarmAnalyticsResponse(BaseModel):
    success: bool
    farmer_name: str
    total_farm_area_acres: float
    active_crops_count: int
    total_irrigations: int
    total_fertilizers: int
    total_health_checks: int
    total_issues: int
    resolved_issues: int
    aeo_interactions_count: int
    crops: List[CropAnalyticsSummary] = []


# ==============================================================================
# PHASE 17 — AEO INTELLIGENCE & ADVISORIES MODELS
# ==============================================================================

class AeoCasePrioritizationItem(BaseModel):
    case_id: str
    farmer_name: str
    farmer_phone: str
    crop: str
    crop_stage: str
    category: str
    severity: str
    ai_confidence: float
    priority_level: str  # URGENT, HIGH, MEDIUM, LOW
    prioritization_reasons: List[str] = []
    nearby_reports_count: int = 0
    weather_risk_factor: Optional[str] = None
    created_at: str
    status: str
    thumbnail_url: Optional[str] = None


class AeoAdvisoryCreateRequest(BaseModel):
    officer_phone: str
    officer_name: str
    region: str
    crop: Optional[str] = "All"
    issue_category: Optional[str] = "general"
    title: str
    advisory_text: str


class AeoAdvisoryResponse(BaseModel):
    id: str
    officer_name: str
    region: str
    crop: str
    title: str
    advisory_text: str
    created_at: str


class AeoCaseOutcomeUpdateRequest(BaseModel):
    outcome: str  # RESOLVED, IMPROVING, NO_CHANGE, WORSENING, UNKNOWN
    officer_notes: Optional[str] = None
    treatment_applied: Optional[str] = None
    evidence_urls: Optional[List[str]] = []



