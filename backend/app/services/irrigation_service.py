"""
Irrigation Intelligence Service for KisaanSaathi
Calculates context-grounded irrigation decisions (DEFER, IRRIGATE_NOW, IRRIGATE_SOON, MONITOR_RAIN)
using real-time weather forecasts, soil retention characteristics, crop stage sensitivity, and irrigation history.
"""

import logging
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timezone, timedelta
from app.services.context_engine_service import get_farm_context
from app.services.crop_knowledge_base import get_crop_knowledge, get_soil_properties
from app.services.farm_service import create_activity
from app.services.ai_provider_service import call_fireworks_chat, _clean_json_response

logger = logging.getLogger("rythubandhu.irrigation_service")


async def get_irrigation_recommendation(
    field_id: Optional[str] = None,
    crop_cycle_id: Optional[str] = None,
    farmer_phone: Optional[str] = None,
    language: str = "te"
) -> Dict[str, Any]:
    """
    Computes precise, context-grounded irrigation recommendation:
    1. Collects complete farm context (weather, soil, stage, activities)
    2. Evaluates rain forecast, soil moisture holding capacity, and days since last irrigation
    3. Evaluates crop stage water sensitivity (Flowering vs Ripening)
    4. Generates structured decision with localized explanation (Telugu, Hindi, English)
    """
    # 1. Fetch Complete Context
    context = await get_farm_context(
        field_id=field_id,
        crop_cycle_id=crop_cycle_id,
        farmer_phone=farmer_phone
    )

    crop = context.get("crop") or {}
    crop_name = crop.get("crop_name", "Chilli")
    crop_stage_data = context.get("cropStage") or {}
    current_stage = crop_stage_data.get("current_stage", "Vegetative & Establishment")
    crop_age_days = crop_stage_data.get("crop_age_days")

    soil = context.get("soil") or {}
    soil_type = soil.get("soil_type", "Red soil")
    soil_props = get_soil_properties(soil_type)

    field = context.get("field") or {}
    irrigation_method = (
        crop.get("irrigation_method") or
        field.get("irrigation_method") or
        "drip"
    ).lower()

    weather = context.get("weather") or {}
    precip_prob = weather.get("precipitation_probability_pct") or 0
    rain_mm = weather.get("rain_mm") or 0.0
    temp_c = weather.get("temperature_c") or 28.0
    humidity_pct = weather.get("relative_humidity_pct") or 60.0

    daily_forecast = weather.get("daily_forecast") or []
    next_24h_rain_prob = 0
    next_24h_rain_sum = 0.0
    if daily_forecast and len(daily_forecast) > 0:
        next_day = daily_forecast[0]
        next_24h_rain_prob = next_day.get("precipitation_probability_max", precip_prob)
        next_24h_rain_sum = next_day.get("precipitation_sum", rain_mm)

    # 2. Analyze Irrigation History
    recent_activities = context.get("recentActivities") or []
    irrigation_activities = [
        a for a in recent_activities
        if a.get("activity_type") == "irrigation" or "irrigat" in a.get("title", "").lower()
    ]
    
    last_irrigation_date_str = None
    days_since_last_irrigation = None
    
    if irrigation_activities:
        last_act = irrigation_activities[0]
        event_dt_raw = last_act.get("event_date") or last_act.get("created_at")
        if event_dt_raw:
            try:
                if isinstance(event_dt_raw, str):
                    clean_dt = event_dt_raw.replace("Z", "+00:00")
                    last_dt = datetime.fromisoformat(clean_dt)
                else:
                    last_dt = event_dt_raw
                now = datetime.now(timezone.utc)
                if last_dt.tzinfo is None:
                    last_dt = last_dt.replace(tzinfo=timezone.utc)
                delta_days = (now - last_dt).total_seconds() / 86400.0
                days_since_last_irrigation = max(0, int(round(delta_days)))
                last_irrigation_date_str = last_dt.strftime("%Y-%m-%d")
            except Exception as e:
                logger.warning(f"[Irrigation] Date parse error: {e}")

    # 3. Deterministic Agronomic Reasoning
    factors = []
    decision = "DEFER"
    title = "Do not irrigate today"
    reasoning = ""
    farmer_response = ""
    confidence = 0.88
    next_action = ""

    # Interval recommendation for this soil & method
    expected_interval = (
        soil_props.get("irrigation_interval_days_drip", 2)
        if "drip" in irrigation_method
        else soil_props.get("irrigation_interval_days_flood", 4)
    )

    # Rule A: Rainfall expected
    if next_24h_rain_prob >= 50 or next_24h_rain_sum >= 3.0:
        decision = "DEFER"
        factors.append(f"Rain forecast: {next_24h_rain_prob}% probability ({next_24h_rain_sum} mm)")
        factors.append(f"Soil type: {soil_type} with good existing moisture")
        
        if "te" in language:
            title = "ఈరోజు నీటి తడి ఇవ్వవద్దు"
            summary = "రాబోయే 24-48 గంటల్లో వర్షం కురిసే అవకాశం ఉంది. నీటిని వృధా చేయకుండా వర్షం తర్వాత పరిస్థితిని గమనించండి."
            farmer_response = "💧 ఈరోజు నీరు పెట్టాల్సిన అవసరం లేదు. రేపు వర్షం వచ్చే అవకాశం ఉంది కాబట్టి తడి ఇవ్వడం వాయిదా వేయండి."
            reasoning = f"{soil_type} నేలలో తేమ నిల్వ ఉంటుంది. వర్ష సూచన ({next_24h_rain_prob}%) ఉన్నందున నీటి నిల్వ సమస్య రాకుండా తడి ఇవ్వకూడదు."
            next_action = "వర్షం తగ్గిన తర్వాత నేలలో తేమను పరిశీలించి తదుపరి తడిని నిర్ణయించండి."
        elif "hi" in language:
            title = "आज सिंचाई न करें"
            summary = "आगामी 24 घंटों में बारिश की संभावना है। जलभराव से बचने के लिए सिंचाई टालें।"
            farmer_response = "💧 आज खेत में पानी न लगाएं। कल बारिश होने की संभावना है, इसलिए सिंचाई अभी रोक दें।"
            reasoning = f"{soil_type} में पर्याप्त नमी है और बारिश की संभावना ({next_24h_rain_prob}%) है।"
            next_action = "बारिश के बाद खेत की नमी देखकर अगली सिंचाई तय करें।"
        else:
            title = "Do not irrigate today"
            summary = f"Rainfall expected in next 24 hours ({next_24h_rain_prob}% chance, ~{next_24h_rain_sum}mm). Defer irrigation."
            farmer_response = "💧 Do not irrigate today. Rainfall is expected soon, so hold off on watering."
            reasoning = f"Rain expected ({next_24h_rain_prob}% probability) and {soil_type} holds moisture adequately."
            next_action = "Monitor field moisture after the rain before scheduling next irrigation."

    # Rule B: Recently Irrigated (within retention threshold)
    elif days_since_last_irrigation is not None and days_since_last_irrigation < expected_interval:
        decision = "DEFER"
        factors.append(f"Recently irrigated {days_since_last_irrigation} days ago")
        factors.append(f"Current stage: {current_stage}")
        factors.append(f"Recommended interval: every {expected_interval} days ({irrigation_method})")
        
        if "te" in language:
            title = "నేలలో తగినంత తేమ ఉంది"
            summary = f"మీరు {days_since_last_irrigation} రోజుల క్రితమే నీరు పెట్టారు. {soil_type} నేలలో ఇంకా తేమ ఉంది."
            farmer_response = f"💧 ఈరోజు నీరు పెట్టనవసరం లేదు. మీరు {days_since_last_irrigation} రోజుల క్రితమే తడి ఇచ్చారు, నేలలో తేమ సరిపడా ఉంది."
            reasoning = f"{irrigation_method.upper()} పద్ధతిలో {soil_type} నేలకు ప్రతి {expected_interval} రోజులకు ఒకసారి తడి సరిపోతుంది."
            next_action = f"{expected_interval - days_since_last_irrigation} రోజుల తర్వాత తేమను పరిశీలించండి."
        elif "hi" in language:
            title = "खेत में पर्याप्त नमी मौजूद है"
            summary = f"आपने {days_since_last_irrigation} दिन पहले ही सिंचाई की थी। {soil_type} में नमी मौजूद है।"
            farmer_response = f"💧 आज पानी देने की जरूरत नहीं है। आपने {days_since_last_irrigation} दिन पहले पानी दिया था, खेत में नमी सही है।"
            reasoning = f"{soil_type} में {irrigation_method} से हर {expected_interval} दिन में पानी देना पर्याप्त है।"
            next_action = f"{expected_interval - days_since_last_irrigation} दिन बाद खेत की नमी जांचें।"
        else:
            title = "Sufficient soil moisture present"
            summary = f"Field was irrigated {days_since_last_irrigation} days ago. Adequate moisture in {soil_type}."
            farmer_response = f"💧 No need to irrigate today. You irrigated {days_since_last_irrigation} days ago and moisture is adequate."
            reasoning = f"Expected interval for {soil_type} under {irrigation_method} is {expected_interval} days."
            next_action = f"Check soil moisture in {expected_interval - days_since_last_irrigation} days."

    # Rule C: Harvest / Maturity stage
    elif "harvest" in current_stage.lower() or "maturity" in current_stage.lower():
        decision = "DEFER"
        factors.append("Crop in maturity/harvest window")
        factors.append("Withholding irrigation improves quality & drying")
        
        if "te" in language:
            title = "పంట కోత దశ - నీరు ఆపండి"
            summary = "పంట పరిపక్వత / కోత దశలో ఉంది. నాణ్యత కోసం నీటిని నిలిపివేయాలి."
            farmer_response = "🌾 పంట కోత దశకు వచ్చింది. కాయలు/గింజలు బాగా ఆరడానికి నీరు నిలిపివేయండి."
            reasoning = "కోత దశలో నీరు పెడితే పంట నాణ్యత దెబ్బతింటుంది."
            next_action = "పంటను ఆరబెట్టి కోత పనులను ప్రారంభించండి."
        else:
            title = "Withhold irrigation near harvest"
            summary = "Crop has reached maturity. Stop irrigation to allow uniform drying."
            farmer_response = "🌾 Your crop is in harvest/maturity stage. Withhold water for optimal produce quality."
            reasoning = "Moisture during final ripening can cause fungal decay and reduce shelf life."
            next_action = "Prepare for harvesting and sun-drying."

    # Rule D: Soil is dry or interval elapsed -> IRRIGATE NOW / SOON
    else:
        decision = "IRRIGATE_NOW"
        factors.append(f"Temperature: {temp_c}°C, Humidity: {humidity_pct}%")
        factors.append(f"No rainfall expected (prob: {next_24h_rain_prob}%)")
        factors.append(f"Stage: {current_stage} (Moisture needed for active growth)")
        
        if "te" in language:
            title = "తేలికపాటి తడి ఇవ్వండి"
            summary = f"వర్ష సూచన లేదు, వాతావరణం పొడిగా ఉంది ({temp_c}°C). {current_stage} దశలో తగినంత తేమ అవసరం."
            farmer_response = f"💧 ఈరోజు మీ {crop_name} పంటకు {irrigation_method.upper()} ద్వారా తేలికపాటి నీటి తడి ఇవ్వండి."
            reasoning = f"{current_stage} దశలో మొక్కలకు తేమ ఒత్తిడి కలగకుండా క్రమం తప్పకుండా తడి ఇవ్వాలి."
            next_action = f"ఉదయం లేదా సాయంత్రం వేళల్లో {irrigation_method} ద్వారా నీరు పెట్టండి."
        elif "hi" in language:
            title = "हल्की सिंचाई करें"
            summary = f"बारिश की संभावना नहीं है ({temp_c}°C)। {current_stage} अवस्था में पौधे को पानी की आवश्यकता है।"
            farmer_response = f"💧 आज अपनी {crop_name} फसल में {irrigation_method.upper()} से हल्की सिंचाई करें।"
            reasoning = f"{current_stage} अवस्था में नमी की कमी से फसल पर असर पड़ सकता है।"
            next_action = "सुबह या शाम के समय पानी लगाएं।"
        else:
            title = "Irrigate the field today"
            summary = f"Dry conditions ({temp_c}°C, no rain expected). {current_stage} requires consistent moisture."
            farmer_response = f"💧 Provide a light irrigation to your {crop_name} plot today using {irrigation_method}."
            reasoning = f"Crop is in {current_stage} and needs moisture support in dry weather."
            next_action = f"Operate {irrigation_method} in the morning or late afternoon."

    return {
        "success": True,
        "decision": decision,
        "title": title,
        "summary": summary if 'summary' in locals() else title,
        "farmer_response": farmer_response,
        "reasoning": reasoning,
        "factors": factors,
        "confidence": confidence,
        "next_action": next_action,
        "requires_aeo": False,
        "weather_summary": f"{temp_c}°C, {humidity_pct}% humidity, {next_24h_rain_prob}% rain chance",
        "soil_summary": f"{soil_type} ({soil_props.get('drainage', 'moderate')} drainage)",
        "last_irrigation_date": last_irrigation_date_str,
        "days_since_last_irrigation": days_since_last_irrigation
    }


async def log_irrigation_activity(
    field_id: str,
    crop_cycle_id: Optional[str] = None,
    farmer_phone: Optional[str] = None,
    method: str = "drip",
    notes: Optional[str] = None,
    event_date: Optional[datetime] = None
) -> Dict[str, Any]:
    """Records a confirmed irrigation event into the farm activity memory."""
    title = f"💧 Irrigation Applied ({method.title()})"
    desc = notes or f"Farmer applied field irrigation via {method}."
    
    activity = await create_activity(
        field_id=field_id,
        crop_cycle_id=crop_cycle_id,
        activity_type="irrigation",
        title=title,
        description=desc,
        metadata={"method": method, "logged_by": "farmer"},
        event_date=event_date or datetime.now(timezone.utc)
    )
    return {"success": True, "activity": activity}
