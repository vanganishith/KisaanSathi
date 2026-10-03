"""
Farm Memory / Automatic Diary Service
Accumulates all important farm events, activities, health checks,
recommendation outcomes, and AEO interventions into an automated chronological timeline.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import uuid
import logging
from app.services.farm_service import (
    record_farm_activity,
    list_activities_by_field,
    list_farms_by_farmer,
    list_fields_by_farm,
    get_farmer_profile
)

logger = logging.getLogger("FarmMemoryService")

_IN_MEMORY_RECOMMENDATION_RECORDS: Dict[str, Dict[str, Any]] = {}


class FarmMemoryService:
    """
    Manages Farm Memory, automatic activity logging with sources,
    and recommendation outcome tracking.
    """

    async def log_automatic_event(
        self,
        farmer_phone: str,
        field_id: str,
        crop_cycle_id: Optional[str],
        activity_type: str,
        title: str,
        description: str,
        source: str = "SYSTEM",
        outcome: str = "UNKNOWN",
        outcome_notes: Optional[str] = None,
        evidence_urls: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Automatically logs a farm event with designated source (FARMER, AI, AEO, WEATHER, SYSTEM, COMMUNITY).
        """
        meta = metadata or {}
        meta["source"] = source
        meta["outcome"] = outcome
        if outcome_notes:
            meta["outcome_notes"] = outcome_notes
        if evidence_urls:
            meta["evidence_urls"] = evidence_urls

        res = await record_farm_activity(
            field_id=field_id,
            crop_cycle_id=crop_cycle_id,
            activity_type=activity_type,
            title=title,
            description=description,
            event_date=datetime.now(timezone.utc).isoformat(),
            metadata=meta
        )
        return res

    async def get_farm_timeline(
        self,
        farmer_phone: str,
        field_id: Optional[str] = None,
        crop_cycle_id: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Returns chronological timeline of all events across sowing, irrigation,
        fertilizers, crop health checks, AEO advice, and weather impacts.
        """
        # Ensure default field if not provided
        if not field_id:
            farmer = await get_farmer_profile(phone=farmer_phone)
            if farmer:
                farms = await list_farms_by_farmer(farmer["id"])
                if farms:
                    fields = await list_fields_by_farm(farms[0]["id"])
                    if fields:
                        field_id = fields[0]["id"]
            if not field_id:
                field_id = "demo-field-1"

        activities = await list_activities_by_field(field_id=field_id, limit=limit)
        
        # Format and enrich each activity for the timeline
        formatted_timeline = []
        for act in activities:
            meta = act.get("metadata") or {}
            source = meta.get("source") or act.get("source", "FARMER")
            outcome = meta.get("outcome") or act.get("outcome", "UNKNOWN")
            
            icon = "📋"
            atype = act.get("activity_type", "").lower()
            if "irrigation" in atype:
                icon = "💧"
            elif "fertilizer" in atype:
                icon = "🧪"
            elif "health" in atype or "crop_health" in atype:
                icon = "📸"
            elif "aeo" in atype:
                icon = "👨‍🌾"
            elif "weather" in atype:
                icon = "🌧️"
            elif "sowing" in atype or "planting" in atype:
                icon = "🌱"
            elif "harvest" in atype:
                icon = "🌾"

            formatted_timeline.append({
                "id": act.get("id"),
                "icon": icon,
                "title": act.get("title"),
                "description": act.get("description"),
                "activity_type": act.get("activity_type"),
                "event_date": act.get("event_date") or act.get("created_at"),
                "source": source,
                "outcome": outcome,
                "outcome_notes": meta.get("outcome_notes"),
                "evidence_urls": meta.get("evidence_urls", []),
                "is_verified": source == "AEO" or meta.get("is_verified", False)
            })

        formatted_timeline.sort(key=lambda x: x.get("event_date", ""), reverse=True)
        return formatted_timeline

    async def get_crop_history(
        self,
        farmer_phone: str,
        crop_cycle_id: str
    ) -> Dict[str, Any]:
        """
        Summarizes complete lifecycle history for a single crop cycle.
        """
        timeline = await self.get_farm_timeline(farmer_phone=farmer_phone, crop_cycle_id=crop_cycle_id)
        
        irrigations = [t for t in timeline if "irrigation" in t.get("activity_type", "").lower()]
        fertilizers = [t for t in timeline if "fertilizer" in t.get("activity_type", "").lower()]
        health_checks = [t for t in timeline if "health" in t.get("activity_type", "").lower()]
        aeo_actions = [t for t in timeline if "aeo" in t.get("activity_type", "").lower() or t.get("source") == "AEO"]

        return {
            "crop_cycle_id": crop_cycle_id,
            "total_events": len(timeline),
            "irrigation_events_count": len(irrigations),
            "fertilizer_events_count": len(fertilizers),
            "health_checks_count": len(health_checks),
            "aeo_interventions_count": len(aeo_actions),
            "timeline": timeline
        }

    async def record_recommendation_history(
        self,
        farmer_phone: str,
        field_id: str,
        crop_cycle_id: Optional[str],
        recommendation: Dict[str, Any]
    ) -> str:
        """
        Saves a generated recommendation into memory history.
        """
        rec_id = str(uuid.uuid4())
        rec_data = {
            "id": rec_id,
            "farmer_phone": farmer_phone,
            "field_id": field_id,
            "crop_cycle_id": crop_cycle_id,
            "title": recommendation.get("title", ""),
            "summary": recommendation.get("summary", ""),
            "intent": recommendation.get("intent", "GENERAL_CROP_ADVICE"),
            "priority": recommendation.get("priority", "MEDIUM"),
            "confidence": recommendation.get("confidence", 0.85),
            "status": "PENDING",
            "action_taken": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        _IN_MEMORY_RECOMMENDATION_RECORDS[rec_id] = rec_data
        return rec_id

    async def update_recommendation_outcome(
        self,
        rec_id: str,
        status: str,  # ACTIONED, DISMISSED, SUPERSEDED
        action_notes: Optional[str] = None
    ) -> bool:
        """
        Records the real-world outcome of an advisory recommendation.
        """
        if rec_id in _IN_MEMORY_RECOMMENDATION_RECORDS:
            _IN_MEMORY_RECOMMENDATION_RECORDS[rec_id]["status"] = status
            _IN_MEMORY_RECOMMENDATION_RECORDS[rec_id]["action_taken"] = action_notes
            _IN_MEMORY_RECOMMENDATION_RECORDS[rec_id]["updated_at"] = datetime.now(timezone.utc).isoformat()
            return True
        return False


farm_memory_service = FarmMemoryService()
