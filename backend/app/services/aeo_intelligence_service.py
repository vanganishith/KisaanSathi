"""
AEO Intelligence & Regional Advisory Service
Enables Agricultural Extension Officers (AEOs) to prioritize field cases with transparent reasons,
inspect regional outbreak clusters, broadcast verified advisories, and track case follow-ups & outcomes.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import uuid
import logging
from app.services.community_signal_service import get_active_community_signals
from app.services.farm_memory_service import farm_memory_service

logger = logging.getLogger("AeoIntelligenceService")

_IN_MEMORY_AEO_ADVISORIES: Dict[str, Dict[str, Any]] = {}
_IN_MEMORY_CASE_OUTCOMES: Dict[str, Dict[str, Any]] = {}


class AeoIntelligenceService:
    """
    AEO Officer Intelligence & Decision Support Service.
    """

    async def get_prioritized_cases(self, officer_phone: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Returns active farmer cases prioritized with transparent explanation of factors.
        """
        # Example prioritized cases enriched with local signals and weather factors
        cases = [
            {
                "case_id": "case-ramesh-1",
                "farmer_name": "రమేష్ (Ramesh)",
                "farmer_phone": "9876543210",
                "crop": "Chilli",
                "crop_stage": "Flowering (48 days)",
                "category": "pest",
                "severity": "HIGH",
                "ai_confidence": 0.88,
                "priority_level": "URGENT",
                "prioritization_reasons": [
                    "High symptom severity in critical flowering stage",
                    "7 nearby chilli farmers reported similar symptoms in past 3 days",
                    "Heavy rain expected in 24 hours (potential drainage / spray washoff risk)",
                    "Awaiting officer intervention"
                ],
                "nearby_reports_count": 7,
                "weather_risk_factor": "Precipitation expected tomorrow (75% prob)",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "status": "pending_officer_review",
                "thumbnail_url": "https://images.unsplash.com/photo-1592417817098-8f3d6eb2250b?w=400"
            },
            {
                "case_id": "case-venkat-2",
                "farmer_name": "వెంకట్ (Venkat)",
                "farmer_phone": "9876543211",
                "crop": "Cotton",
                "crop_stage": "Boll Formation (75 days)",
                "category": "weather_damage",
                "severity": "MEDIUM",
                "ai_confidence": 0.82,
                "priority_level": "HIGH",
                "prioritization_reasons": [
                    "Boll formation stage vulnerability",
                    "Excess water lodging reported in lower plot",
                    "Moderate regional signal (4 reports)"
                ],
                "nearby_reports_count": 4,
                "weather_risk_factor": "Cloudy with moderate rain",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "status": "pending_officer_review",
                "thumbnail_url": "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=400"
            }
        ]
        return cases

    async def broadcast_official_advisory(
        self,
        officer_phone: str,
        officer_name: str,
        region: str,
        crop: str,
        issue_category: str,
        title: str,
        advisory_text: str
    ) -> Dict[str, Any]:
        """
        Creates an official verified AEO guidance broadcast and records it in Farm Memory for regional farmers.
        """
        advisory_id = str(uuid.uuid4())
        adv_record = {
            "id": advisory_id,
            "officer_phone": officer_phone,
            "officer_name": officer_name,
            "region": region,
            "crop": crop,
            "issue_category": issue_category,
            "title": title,
            "advisory_text": advisory_text,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        _IN_MEMORY_AEO_ADVISORIES[advisory_id] = adv_record

        # Auto-log into Farm Memory for active farmers
        await farm_memory_service.log_automatic_event(
            farmer_phone="9876543210",
            field_id="field-1",
            crop_cycle_id="demo-cycle-1",
            activity_type="aeo_intervention",
            title=f"👨‍🌾 AEO Official Guidance: {title}",
            description=f"{officer_name} ({region}): {advisory_text}",
            source="AEO",
            outcome="IMPROVING"
        )

        return adv_record

    async def update_case_outcome(
        self,
        case_id: str,
        outcome: str,  # RESOLVED, IMPROVING, NO_CHANGE, WORSENING, UNKNOWN
        officer_notes: Optional[str] = None,
        treatment_applied: Optional[str] = None,
        evidence_urls: Optional[List[str]] = None,
        farmer_phone: str = "9876543210"
    ) -> Dict[str, Any]:
        """
        Records the verified health outcome of a case and logs it in the farmer's automatic diary.
        """
        outcome_id = str(uuid.uuid4())
        record = {
            "id": outcome_id,
            "case_id": case_id,
            "outcome": outcome,
            "officer_notes": officer_notes or "",
            "treatment_applied": treatment_applied or "",
            "evidence_urls": evidence_urls or [],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        _IN_MEMORY_CASE_OUTCOMES[case_id] = record

        # Log into Farm Memory
        await farm_memory_service.log_automatic_event(
            farmer_phone=farmer_phone,
            field_id="field-1",
            crop_cycle_id="demo-cycle-1",
            activity_type="crop_health_followup",
            title=f"✅ Case Outcome Updated: {outcome}",
            description=f"Status: {outcome}. Officer Notes: {officer_notes or 'Standard care applied.'}",
            source="AEO",
            outcome=outcome,
            outcome_notes=officer_notes,
            evidence_urls=evidence_urls
        )

        return record


aeo_intelligence_service = AeoIntelligenceService()
