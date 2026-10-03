from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class IncidentSubmissionRequest(BaseModel):
    farmer_name: str
    farmer_phone: str
    description: str = Field(..., min_length=1)
    crop: Optional[str] = None
    language: Optional[str] = "Telugu"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    photo_url: Optional[str] = None
    photos: Optional[List[str]] = None

    class Config:
        extra = "allow"


class IncidentSubmissionResponse(BaseModel):
    success: bool
    incident_id: str
    farmer_id: str
    reference_id: str
    photos: Optional[List[str]] = []
    photo_url: Optional[str] = None
    message: str
    incident: Optional[Dict[str, Any]] = None

    class Config:
        extra = "allow"


class MapOverviewResponse(BaseModel):
    success: bool
    incidents: List[Dict[str, Any]] = []
    clusters: List[Dict[str, Any]] = []
    summary: Dict[str, Any] = {}

    class Config:
        extra = "allow"


class CommunityConfirmationRequest(BaseModel):
    farmer_phone: str
    response: str
    farmer_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        extra = "allow"


class CommunityConfirmationResponse(BaseModel):
    success: bool
    incident_id: str
    farmer_phone: str
    response: str
    stats: Dict[str, Any]
    message: str

    class Config:
        extra = "allow"


class NearbyIncidentsResponse(BaseModel):
    success: bool
    count: int
    radius_km: float
    items: List[Dict[str, Any]] = []
    message: Optional[str] = None

    class Config:
        extra = "allow"


class CommunityPostRequest(BaseModel):
    farmer_id: Optional[str] = None
    farmer_phone: Optional[str] = None
    farmer_name: Optional[str] = None
    content: str = Field(..., min_length=1, max_length=2000)
    crop: Optional[str] = None
    incident_id: Optional[str] = None
    photo_url: Optional[str] = None

    class Config:
        extra = "allow"


class CommunityCommentRequest(BaseModel):
    farmer_id: Optional[str] = None
    farmer_phone: Optional[str] = None
    farmer_name: Optional[str] = None
    content: str = Field(..., min_length=1, max_length=1000)

    class Config:
        extra = "allow"


class AdvisorySubmissionRequest(BaseModel):
    advisory_text: str
    target_language: Optional[str] = "Telugu"
    officer_id: Optional[str] = "AEO001"

    class Config:
        extra = "allow"


class AdvisoryResponse(BaseModel):
    success: bool
    incident_id: str
    advisory: Optional[Dict[str, Any]] = None
    message: Optional[str] = None

    class Config:
        extra = "allow"
