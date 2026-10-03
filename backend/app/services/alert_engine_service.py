"""
Alert Engine & Proactive Advisory Service
Evaluates unified farm context, weather, community signals, and crop lifecycle
to generate prioritized, actionable, non-spam alerts with deduplication and expiration.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone
import uuid
import logging
from app.services.context_engine_service import get_farm_context
from app.services.community_signal_service import get_active_community_signals

logger = logging.getLogger("AlertEngineService")

# In-memory storage fallback for alerts when Supabase is caching/offline
_IN_MEMORY_ALERTS: Dict[str, Dict[str, Any]] = {}


class AlertEngineService:
    """
    Proactive Alert Generation and Lifecycle Management Engine.
    """

    def __init__(self):
        self.default_dedup_hours = 24

    async def evaluate_farmer_alerts(
        self,
        farmer_phone: str,
        field_id: Optional[str] = None,
        crop_cycle_id: Optional[str] = None,
        language: str = "te"
    ) -> List[Dict[str, Any]]:
        """
        Proactively evaluates farm context, weather conditions, community signals,
        and crop stages to generate meaningful, non-hallucinated alerts.
        """
        # 1. Retrieve Unified Farm Context
        context_res = await get_farm_context(farmer_phone=farmer_phone, field_id=field_id)
        if not context_res.get("success"):
            return await self.get_farmer_alerts(farmer_phone)

        crop = context_res.get("crop") or {}
        crop_stage = context_res.get("cropStage") or {}
        weather = context_res.get("weather") or {}
        community_signals = context_res.get("communitySignals") or []
        farmer = context_res.get("farmer") or {}
        crop_name = (crop.get("crop_name") or farmer.get("crop") or "Chilli") if isinstance(crop, dict) else "Chilli"
        crop_age_days = crop_stage.get("crop_age_days") or 48
        current_stage = crop_stage.get("current_stage") or "Vegetative"

        generated_alerts: List[Dict[str, Any]] = []

        # ----------------------------------------------------------------------
        # EVENT 1: WEATHER RISK ALERT
        # ----------------------------------------------------------------------
        precip_prob = weather.get("precipitation_probability_pct") or 0
        precip_mm = weather.get("precipitation_mm") or weather.get("rain_mm") or 0.0

        if precip_prob >= 70 or precip_mm >= 15.0:
            title_te = "⚠️ భారీ వర్ష సూచన (Heavy Rain Expected)"
            title_en = "⚠️ Heavy Rain Forecast Alert"
            summary_te = f"రేపు లేదా రాబోయే 24 గంటల్లో భారీ వర్షం ({precip_prob}% అవకాశం) సూచించబడింది. చేనులో నీరు నిలవకుండా డ్రైనేజీ చూసుకోండి."
            summary_en = f"Heavy rainfall forecast ({precip_prob}% probability, {precip_mm}mm). Avoid irrigation and clear drainage channels."
            
            w_alert = await self._create_or_dedup_alert(
                farmer_phone=farmer_phone,
                alert_type="WEATHER",
                title=title_te if language == "te" else title_en,
                summary=summary_te if language == "te" else summary_en,
                detailed_reasoning=f"Open-Meteo precipitation forecast probability is {precip_prob}%. Relevant to {crop_name} field drainage.",
                severity="HIGH",
                priority="HIGH",
                source="WEATHER_SERVICE",
                action_type="VIEW_PLAN",
                field_id=field_id or crop.get("field_id"),
                crop_cycle_id=crop_cycle_id or crop.get("id"),
                expires_in_hours=36,
                metadata={"precipitation_probability_pct": precip_prob, "precip_mm": precip_mm}
            )
            if w_alert:
                generated_alerts.append(w_alert)

        # ----------------------------------------------------------------------
        # EVENT 2: COMMUNITY RISK ALERT
        # ----------------------------------------------------------------------
        for sig in community_signals:
            if sig.get("crop", "").lower() == crop_name.lower():
                report_count = sig.get("nearbyReportCount") or sig.get("report_count") or 5
                time_win = sig.get("timeWindow", "recent")
                
                title_te = f"⚠️ స్థానిక {crop_name} వ్యాధి హెచ్చరిక ({report_count} మంది రైతులు)"
                title_en = f"⚠️ Local {crop_name} Alert ({report_count} Nearby Farmers)"
                summary_te = f"మీ ప్రాంతంలో {report_count} మంది రైతులు {crop_name} పంటలో సమానమైన లక్షణాలను నివేదించారు. మీ పంటను పరిశీలించండి."
                summary_en = f"{report_count} nearby farmers reported similar {crop_name} symptoms. Please inspect your field."
                
                c_alert = await self._create_or_dedup_alert(
                    farmer_phone=farmer_phone,
                    alert_type="COMMUNITY_RISK",
                    title=title_te if language == "te" else title_en,
                    summary=summary_te if language == "te" else summary_en,
                    detailed_reasoning=f"Aggregated regional signal detected with {report_count} reports in {time_win} window.",
                    severity="HIGH",
                    priority="HIGH",
                    source="COMMUNITY_ENGINE",
                    action_type="CHECK_CROP",
                    field_id=field_id or crop.get("field_id"),
                    crop_cycle_id=crop_cycle_id or crop.get("id"),
                    expires_in_hours=72,
                    metadata={"nearby_report_count": report_count, "crop": crop_name}
                )
                if c_alert:
                    generated_alerts.append(c_alert)

        # ----------------------------------------------------------------------
        # EVENT 3: CROP STAGE ALERT (e.g. Flowering or Harvest approach)
        # ----------------------------------------------------------------------
        if "flowering" in current_stage.lower() or (crop_name.lower() == "chilli" and 40 <= crop_age_days <= 55):
            title_te = "🌱 పూత దశ నవీకరణ (Flowering Stage Care)"
            title_en = "🌱 Crop Stage Update: Flowering Window"
            summary_te = f"{crop_name} పంట పూత దశలోకి ప్రవేశించింది ({crop_age_days} రోజులు). నీటి ఎద్దడి లేకుండా సమతుల్య పోషకాలు అందించండి."
            summary_en = f"{crop_name} crop is in flowering stage ({crop_age_days} days). Ensure stable moisture and micronutrients for flower retention."
            
            s_alert = await self._create_or_dedup_alert(
                farmer_phone=farmer_phone,
                alert_type="CROP_STAGE",
                title=title_te if language == "te" else title_en,
                summary=summary_te if language == "te" else summary_en,
                detailed_reasoning=f"Crop age ({crop_age_days}d) corresponds to active flowering stage.",
                severity="MEDIUM",
                priority="MEDIUM",
                source="CROP_STAGE",
                action_type="VIEW_CROP",
                field_id=field_id or crop.get("field_id"),
                crop_cycle_id=crop_cycle_id or crop.get("id"),
                expires_in_hours=120,
                metadata={"crop_age_days": crop_age_days, "stage": current_stage}
            )
            if s_alert:
                generated_alerts.append(s_alert)

        # ----------------------------------------------------------------------
        # EVENT 4: HARVEST APPROACHING ALERT
        # ----------------------------------------------------------------------
        days_to_harvest = crop_stage.get("days_to_harvest") or (120 - crop_age_days if crop_age_days else 60)
        if 0 < days_to_harvest <= 15:
            title_te = "🌾 పంట కోత ప్రణాళిక సమయం (Harvest Approaching)"
            title_en = "🌾 Harvest Window Approaching"
            summary_te = f"మీ {crop_name} పంట కోత సమయం రాబోయే 1-2 వారాల్లో ప్రారంభమవుతుంది. కోత సన్నాహాలు మరియు మార్కెట్ ధరలను సమీక్షించండి."
            summary_en = f"Estimated harvest window for {crop_name} approaches in {days_to_harvest} days. Check weather and market rates."
            
            h_alert = await self._create_or_dedup_alert(
                farmer_phone=farmer_phone,
                alert_type="HARVEST",
                title=title_te if language == "te" else title_en,
                summary=summary_te if language == "te" else summary_en,
                detailed_reasoning=f"Estimated maturity window in {days_to_harvest} days.",
                severity="MEDIUM",
                priority="MEDIUM",
                source="HARVEST_PLANNER",
                action_type="VIEW_HARVEST_PLAN",
                field_id=field_id or crop.get("field_id"),
                crop_cycle_id=crop_cycle_id or crop.get("id"),
                expires_in_hours=168,
                metadata={"days_to_harvest": days_to_harvest}
            )
            if h_alert:
                generated_alerts.append(h_alert)

        return await self.get_farmer_alerts(farmer_phone)

    async def _create_or_dedup_alert(
        self,
        farmer_phone: str,
        alert_type: str,
        title: str,
        summary: str,
        detailed_reasoning: Optional[str] = None,
        severity: str = "MEDIUM",
        priority: str = "MEDIUM",
        source: str = "DECISION_ENGINE",
        action_type: str = "VIEW_PLAN",
        field_id: Optional[str] = None,
        crop_cycle_id: Optional[str] = None,
        expires_in_hours: int = 48,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Deduplicates alerts by checking recent active alerts for the same farmer,
        alert_type, and field. Only creates if no unexpired alert of same type exists.
        """
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(hours=self.default_dedup_hours)

        # Check existing alerts in memory
        for a in _IN_MEMORY_ALERTS.values():
            if (
                a.get("farmer_phone") == farmer_phone
                and a.get("alert_type") == alert_type
                and a.get("status") in ["UNREAD", "READ"]
            ):
                created_dt = datetime.fromisoformat(a["created_at"].replace("Z", "+00:00"))
                if created_dt > cutoff:
                    # Duplicate found within dedup window; skip creation
                    return None

        # Create new alert
        alert_id = str(uuid.uuid4())
        expires_at = (now + timedelta(hours=expires_in_hours)).isoformat()

        alert_record = {
            "id": alert_id,
            "farmer_phone": farmer_phone,
            "alert_type": alert_type,
            "title": title,
            "summary": summary,
            "detailed_reasoning": detailed_reasoning or "",
            "severity": severity,
            "priority": priority,
            "source": source,
            "status": "UNREAD",
            "action_type": action_type,
            "action_data": {},
            "created_at": now.isoformat(),
            "expires_at": expires_at,
            "read_at": None,
            "action_taken_at": None,
            "field_id": field_id,
            "crop_cycle_id": crop_cycle_id,
            "metadata": metadata or {}
        }

        _IN_MEMORY_ALERTS[alert_id] = alert_record

        # Best-effort persist to Supabase
        try:
            from app.services.farm_service import farm_service
            sb = farm_service._get_supabase()
            if sb:
                sb.table("farm_alerts").insert(alert_record).execute()
        except Exception as e:
            logger.debug(f"[AlertEngine] Supabase insert note: {e}")

        return alert_record

    async def get_farmer_alerts(self, farmer_phone: str) -> List[Dict[str, Any]]:
        """
        Returns all non-expired, active alerts for the farmer, sorted by priority and recency.
        """
        now = datetime.now(timezone.utc)
        alerts_list = []

        # Load from Supabase or fallback
        try:
            from app.services.farm_service import farm_service
            sb = farm_service._get_supabase()
            if sb:
                res = sb.table("farm_alerts").select("*").eq("farmer_phone", farmer_phone).neq("status", "DISMISSED").order("created_at", desc=True).execute()
                if res.data:
                    for row in res.data:
                        _IN_MEMORY_ALERTS[row["id"]] = row
        except Exception:
            pass

        for a in _IN_MEMORY_ALERTS.values():
            if a.get("farmer_phone") == farmer_phone and a.get("status") != "DISMISSED":
                # Check expiration
                if a.get("expires_at"):
                    try:
                        exp_dt = datetime.fromisoformat(a["expires_at"].replace("Z", "+00:00"))
                        if exp_dt < now:
                            a["status"] = "EXPIRED"
                            continue
                    except Exception:
                        pass
                alerts_list.append(a)

        # Priority weight mapping
        p_weights = {"URGENT": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}
        alerts_list.sort(key=lambda x: (p_weights.get(x.get("priority", "MEDIUM"), 1), x.get("created_at", "")), reverse=True)
        return alerts_list

    async def mark_alert_read(self, alert_id: str, farmer_phone: str) -> bool:
        now = datetime.now(timezone.utc).isoformat()
        if alert_id in _IN_MEMORY_ALERTS:
            _IN_MEMORY_ALERTS[alert_id]["status"] = "READ"
            _IN_MEMORY_ALERTS[alert_id]["read_at"] = now
            return True
        return False

    async def dismiss_alert(self, alert_id: str, farmer_phone: str) -> bool:
        if alert_id in _IN_MEMORY_ALERTS:
            _IN_MEMORY_ALERTS[alert_id]["status"] = "DISMISSED"
            return True
        return False

    async def action_alert(self, alert_id: str, farmer_phone: str) -> bool:
        now = datetime.now(timezone.utc).isoformat()
        if alert_id in _IN_MEMORY_ALERTS:
            _IN_MEMORY_ALERTS[alert_id]["status"] = "ACTIONED"
            _IN_MEMORY_ALERTS[alert_id]["action_taken_at"] = now
            return True
        return False


alert_engine_service = AlertEngineService()
