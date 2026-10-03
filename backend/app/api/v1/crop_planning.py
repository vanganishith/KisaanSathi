import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.services.crop_planning_service import generate_crop_planning_recommendations

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Crop Planning"])


class CropPlanningRequest(BaseModel):
    land_area_acres: float = Field(
        ...,
        ge=0.5,
        le=100.0,
        description="Land area in acres (minimum 0.5, maximum 100)"
    )
    soil_type: str = Field(
        ...,
        pattern="^(BLACK|RED)$",
        description="Soil type: 'BLACK' or 'RED'"
    )
    latitude: Optional[float] = Field(
        None,
        description="GPS latitude of the farm land"
    )
    longitude: Optional[float] = Field(
        None,
        description="GPS longitude of the farm land"
    )
    language: Optional[str] = Field(
        "en",
        description="Preferred language code ('te', 'hi', 'en', 'ta', 'kn')"
    )


@router.post(
    "/crop-planning/recommend",
    summary="Get AI-Assisted Crop Planning Recommendations",
    description="Generates top 3-5 tailored crop recommendations with whole-farm investment/return calculations and verified government schemes based on land area, soil, location, and season.",
)
async def recommend_crops(payload: CropPlanningRequest):
    try:
        result = await generate_crop_planning_recommendations(
            land_area_acres=payload.land_area_acres,
            soil_type=payload.soil_type,
            latitude=payload.latitude,
            longitude=payload.longitude,
            language=payload.language or "en"
        )
        return result
    except ValueError as ve:
        logger.warning(f"[CropPlanning API] Validation error: {ve}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "message": str(ve)}
        )
class CropSelectionRequest(BaseModel):
    farmer_phone: str = Field(..., description="Farmer's 10-digit mobile number")
    crop_name: str = Field(..., description="Selected crop name, e.g., Cotton, Chilli, Maize")
    area_acres: float = Field(..., ge=0.1, le=500.0, description="Field area in acres")
    soil_type: str = Field("BLACK", description="Soil type: BLACK or RED")
    farmer_name: Optional[str] = Field("Farmer", description="Farmer name")
    location_name: Optional[str] = Field(None, description="Village or mandal name")
    latitude: Optional[float] = Field(None, description="Farm GPS latitude")
    longitude: Optional[float] = Field(None, description="Farm GPS longitude")
    planted_today: bool = Field(True, description="True if planting starts today (Day 1)")
    planting_date: Optional[str] = Field(None, description="Explicit planting date YYYY-MM-DD if planted earlier")
    crop_age_days: Optional[int] = Field(None, description="Approximate days since planting if already planted")
    irrigation_method: Optional[str] = Field("drip", description="Irrigation method: drip, flood, rainfed, sprinkler")
    field_id: Optional[str] = Field(None, description="Existing field ID for multi-field farms")
    farm_id: Optional[str] = Field(None, description="Existing farm ID")


@router.post(
    "/crop-planning/select-crop",
    summary="Select Crop & Start Farm Lifecycle",
    description="Persists selected crop into farmer's real farm, field, and crop cycle. Starts Day 1 or records existing planting date.",
)
async def select_crop(payload: CropSelectionRequest):
    try:
        from app.services.farm_service import select_crop_for_farm
        result = await select_crop_for_farm(
            farmer_phone=payload.farmer_phone,
            crop_name=payload.crop_name,
            area_acres=payload.area_acres,
            soil_type=payload.soil_type,
            farmer_name=payload.farmer_name,
            location_name=payload.location_name,
            latitude=payload.latitude,
            longitude=payload.longitude,
            planted_today=payload.planted_today,
            planting_date=payload.planting_date,
            crop_age_days=payload.crop_age_days,
            irrigation_method=payload.irrigation_method or "drip",
            field_id=payload.field_id,
            farm_id=payload.farm_id,
        )
        return result
    except ValueError as ve:
        logger.warning(f"[CropPlanning Select API] Validation error: {ve}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "message": str(ve)}
        )
    except Exception as e:
        logger.error(f"[CropPlanning Select API] Error persisting crop: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": f"Failed to persist crop selection: {str(e)}"}
        )

