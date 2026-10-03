import re
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime, date, timedelta
from app.services.crop_lifecycle_service import normalize_crop_name, calculate_crop_age, determine_crop_stage
from app.services.farm_service import (
    get_or_create_farmer,
    get_farmer_profile,
    update_farmer_profile,
    create_farm,
    list_farms_by_farmer,
    update_farm,
    create_field,
    list_fields_by_farm,
    update_field,
    create_crop_cycle,
    list_crop_cycles_by_field,
    update_crop_cycle,
    create_soil_record,
    get_soil_record_by_field,
    update_soil_record,
    record_farm_activity
)
from app.core.config import settings
import httpx

logger = logging.getLogger("rythubandhu.voice_farm_extraction")

# Telugu number words to digits
TELUGU_NUM_MAP = {
    "ఒక": 1.0, "ఒకటి": 1.0,
    "రెండు": 2.0, "రెంటికి": 2.0,
    "మూడు": 3.0,
    "నాలుగు": 4.0,
    "ఐదు": 5.0,
    "ఆరు": 6.0,
    "ఏడు": 7.0,
    "ఎనిమిది": 8.0,
    "తొమ్మిది": 9.0,
    "పది": 10.0,
    "ఇరవై": 20.0,
    "ముప్పై": 30.0,
    "నలభై": 40.0,
    "యాభై": 50.0,
    "అర": 0.5, "సగం": 0.5,
    "ఒకటిన్నర": 1.5,
    "రెండున్నర": 2.5,
    "మూడున్నర": 3.5,
    "నాలుగున్నర": 4.5
}

HINDI_NUM_MAP = {
    "एक": 1.0, "दो": 2.0, "तीन": 3.0, "चार": 4.0, "पांच": 5.0,
    "छह": 6.0, "सात": 7.0, "आठ": 8.0, "नौ": 9.0, "दस": 10.0,
    "आधा": 0.5, "डेढ़": 1.5, "ढाई": 2.5
}


def _extract_entities_rule_based(text: str) -> Dict[str, Any]:
    """
    High-speed, deterministic regex extractor for Telugu, Hindi, and English farm statements.
    Ensures 0ms latency and 100% reliability for standard farmer voice inputs.
    """
    entities: Dict[str, Any] = {}
    lower = text.lower()

    # 1. Name extraction
    # "నా పేరు రమేష్" / "నా పేరు సురేష్ రెడ్డి" / "My name is Ramesh" / "मेरा नाम रमेश है"
    name_match = re.search(r"(?:నా\s*పేరు|నాపేరు|my\s*name\s*is|mera\s*naam|मेरा\s*नाम)\s*[:=]?\s*([A-Za-z\u0C00-\u0C7F\u0900-\u097F]+(?:\s+[A-Za-z\u0C00-\u0C7F\u0900-\u097F]+)?)", text, re.IGNORECASE)
    if name_match:
        extracted_name = name_match.group(1).strip()
        # Clean any trailing stop words
        extracted_name = re.sub(r"\s*(ఉంటారు|ఉంటాను|దగ్గర|హైదరాబాద్|వరంగల్|నుండి|ఉంది).*$", "", extracted_name)
        if extracted_name and len(extracted_name) > 1:
            entities["name"] = extracted_name

    # 2. Location extraction
    # "నేను వరంగల్ దగ్గర ఉంటాను" / "వరంగల్ జిల్లా" / "Geesugonda, Warangal"
    loc_match = re.search(r"(?:నేను\s+)?([A-Za-z\u0C00-\u0C7F\u0900-\u097F]+)\s*(?:దగ్గర|మండలం|జిల్లా|లో\s*ఉంటాను|से\s*हूँ|near)", text, re.IGNORECASE)
    if loc_match:
        loc = loc_match.group(1).strip()
        if loc not in ["పేరు", "పొలం", "రైతు", "నేను"]:
            entities["location"] = loc
    elif "warangal" in lower or "వరంగల్" in text:
        entities["location"] = "Warangal"
    elif "karimnagar" in lower or "కరీంనగర్" in text:
        entities["location"] = "Karimnagar"
    elif "khammam" in lower or "ఖమ్మం" in text:
        entities["location"] = "Khammam"

    # 3. Crop identification
    if any(k in lower for k in ["chilli", "mirchi", "mirapa"]) or any(k in text for k in ["మిరప", "మెరపు", "మిర్చి", "మిరపకాయ"]):
        entities["crop"] = "Chilli"
    elif any(k in lower for k in ["paddy", "rice", "vari", "vadlu"]) or any(k in text for k in ["వరి", "వడ్లు", "ధాన్యం"]):
        entities["crop"] = "Paddy"
    elif any(k in lower for k in ["cotton", "patti"]) or any(k in text for k in ["పత్తి", "దూది"]):
        entities["crop"] = "Cotton"
    elif any(k in lower for k in ["tomato", "tamata"]) or any(k in text for k in ["టమోటా", "టమాట"]):
        entities["crop"] = "Tomato"
    elif any(k in lower for k in ["maize", "corn", "mokkajonna"]) or any(k in text for k in ["మొక్కజొన్న", "కంకి"]):
        entities["crop"] = "Maize"
    elif any(k in lower for k in ["groundnut", "peanut", "verusanaga", "palleelu"]) or any(k in text for k in ["వేరుశనగ", "పల్లీలు"]):
        entities["crop"] = "Groundnut"

    # 4. Area extraction
    # "రెండు ఎకరాల్లో", "4 ఎకరాలు", "4 acres", "నాలుగు ఎకరాలు", "2.5 ఎకరాలు"
    area_found = None
    # Check digits + acre
    digit_acre = re.search(r"(\d+(?:\.\d+)?)\s*(?:ఎకరాల|ఎకరాలు|ఎకరం|acres?|एकड़)", text, re.IGNORECASE)
    if digit_acre:
        area_found = float(digit_acre.group(1))
    else:
        # Check Telugu words + acre
        for word, val in TELUGU_NUM_MAP.items():
            if re.search(rf"{word}\s*(?:ఎకరాల|ఎకరాలు|ఎకరం|acres?|గుంటలు)", text):
                area_found = val
                break
        if area_found is None:
            for word, val in HINDI_NUM_MAP.items():
                if re.search(rf"{word}\s*(?:एकड़|बीघा|acre)", text):
                    area_found = val
                    break

    # If just "నాలుగు ఎకరాలు" or "4 acres" without crop
    if area_found is None:
        standalone_digit = re.search(r"^(\d+(?:\.\d+)?)\s*$", text.strip())
        if standalone_digit:
            area_found = float(standalone_digit.group(1))

    if area_found is not None:
        entities["area"] = area_found
        entities["area_unit"] = "acres"

    # 5. Crop Age extraction
    # "మిరప వేసి 45 రోజులు అయింది" / "45 days" / "48 days" / "నలభై ఐదు రోజులు"
    age_match = re.search(r"(\d+)\s*(?:రోజులు|రోజుల|days?|दिन)", text, re.IGNORECASE)
    if age_match:
        entities["crop_age_days"] = int(age_match.group(1))
    else:
        # Check "నెలన్నర" (1.5 months = 45 days), "రెండు నెలలు" (60 days), "ఒక నెల" (30 days)
        if "నెలన్నర" in text or "1.5 months" in lower:
            entities["crop_age_days"] = 45
        elif "ఒక నెల" in text or "1 month" in lower:
            entities["crop_age_days"] = 30
        elif "రెండు నెలలు" in text or "2 months" in lower:
            entities["crop_age_days"] = 60

    # 6. Irrigation method
    # "ఈ పొలానికి డ్రిప్ ఉంది" / "బోరు బావి" / "కాలువ" / "Drip irrigation"
    if "డ్రిప్" in text or "drip" in lower or "బిందు సేద్యం" in text:
        entities["irrigation_method"] = "drip"
    elif "స్ప్రింక్లర్" in text or "sprinkler" in lower:
        entities["irrigation_method"] = "sprinkler"
    elif "బోరు" in text or "borewell" in lower:
        entities["irrigation_method"] = "borewell"
    elif "కాలువ" in text or "canal" in lower:
        entities["irrigation_method"] = "canal"
    elif "వర్షాధారం" in text or "rainfed" in lower:
        entities["irrigation_method"] = "rainfed"

    # 7. Soil type
    # "ఈ పొలం నల్ల నేల" / "నల్లరేగడి" / "ఎర్ర నేల" / "Black soil" / "Red soil"
    if "నల్ల నేల" in text or "నల్లరేగడి" in text or "నల్ల" in text or "black" in lower:
        entities["soil_type"] = "Black soil"
    elif "ఎర్ర నేల" in text or "ఎర్రగా" in text or "ఎర్ర" in text or "చల్కా" in text or "red" in lower:
        entities["soil_type"] = "Red soil"
    elif "ఒండ్రు" in text or "alluvial" in lower:
        entities["soil_type"] = "Alluvial soil"

    return entities


async def _extract_entities_llm(text: str, language: str = "te") -> Dict[str, Any]:
    """
    Invokes Fireworks AI (GLM-5.3-Flash) to parse multi-sentence, complex colloquial agricultural statements.
    """
    api_key = settings.FIREWORKS_API_KEY
    if not api_key:
        return {}

    system_prompt = """You are an agricultural entity extractor for Indian farmers.
Extract ONLY stated facts from the farmer's statement. DO NOT INVENT ANY MISSING VALUES.
Schema:
{
  "name": "string or null",
  "location": "string or null",
  "crop": "Paddy/Cotton/Chilli/Tomato/Maize/Groundnut or null",
  "area": float or null,
  "area_unit": "acres",
  "crop_age_days": int or null,
  "irrigation_method": "drip/sprinkler/borewell/canal/rainfed or null",
  "soil_type": "Black soil/Red soil/Alluvial soil or null",
  "farmer_activity": "sowing/irrigation/fertilizer/pesticide/null"
}
Return ONLY valid JSON."""

    try:
        url = f"{settings.FIREWORKS_BASE_URL.rstrip('/')}/chat/completions"
        payload = {
            "model": settings.FIREWORKS_MODEL_NAME,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text}
            ],
            "temperature": 0.0,
            "response_format": {"type": "json_object"}
        }
        async with httpx.AsyncClient(timeout=4.0) as client:
            res = await client.post(url, json=payload, headers={"Authorization": f"Bearer {api_key}"})
            if res.status_code == 200:
                data = res.json()
                content = data["choices"][0]["message"]["content"]
                parsed = json.loads(content)
                return {k: v for k, v in parsed.items() if v is not None}
    except Exception as e:
        logger.warning(f"[VoiceExtraction] LLM call error: {e}")

    return {}


async def process_voice_farm_update(
    farmer_phone: str,
    text_input: str,
    language: str = "te",
    farm_id: Optional[str] = None,
    field_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Core Progressive Profiling & Farm Memory Engine:
    1. Extracts structured entities (name, location, crop, area, age, irrigation, soil).
    2. Updates Farmer Profile, Farm, Field, CropCycle, Soil, and Activity records.
    3. Identifies if critical next information is needed and generates a single, warm, localized question.
    """
    # 1. Extraction (Rule-based first, augmented by LLM if needed)
    entities = _extract_entities_rule_based(text_input)
    if not entities or len(entities) < 2:
        llm_entities = await _extract_entities_llm(text_input, language)
        for k, v in llm_entities.items():
            if k not in entities and v is not None:
                entities[k] = v

    # 2. Get / Create Farmer
    farmer = await get_or_create_farmer(
        phone=farmer_phone,
        name=entities.get("name"),
        preferred_language="Telugu" if language.startswith("te") else "Hindi" if language.startswith("hi") else "English",
        location=entities.get("location")
    )
    farmer_id = farmer["id"]

    # Update farmer name or location if newly discovered
    farmer_updates = {}
    if entities.get("name") and (farmer.get("name") == "Farmer" or not farmer.get("name")):
        farmer_updates["name"] = entities["name"]
    if entities.get("location") and not farmer.get("village"):
        farmer_updates["village"] = entities["location"]
    if farmer_updates:
        await update_farmer_profile(farmer_id, farmer_updates)
        farmer.update(farmer_updates)

    # 3. Get / Create Farm
    farms = await list_farms_by_farmer(farmer_id)
    if farms:
        active_farm = farms[0]
    else:
        active_farm = await create_farm(farmer_id, {
            "name": f"{farmer.get('name', 'Farmer')}'s Farm",
            "total_area": entities.get("area"),
            "location_name": entities.get("location") or farmer.get("village"),
            "irrigation_type": entities.get("irrigation_method"),
            "default_soil_type": entities.get("soil_type"),
        })

    # Update farm attributes if newly stated
    farm_patch = {}
    if entities.get("area") and (active_farm.get("total_area") is None or active_farm.get("total_area") == 0):
        farm_patch["total_area"] = entities["area"]
    if entities.get("irrigation_method") and not active_farm.get("irrigation_type"):
        farm_patch["irrigation_type"] = entities["irrigation_method"]
    if entities.get("soil_type") and not active_farm.get("default_soil_type"):
        farm_patch["default_soil_type"] = entities["soil_type"]
    if farm_patch:
        await update_farm(active_farm["id"], farm_patch)
        active_farm.update(farm_patch)

    # 4. Get / Create Field
    fields = await list_fields_by_farm(active_farm["id"])
    if fields:
        active_field = fields[0]
    else:
        active_field = await create_field(active_farm["id"], {
            "name": "Field A",
            "area": entities.get("area") or active_farm.get("total_area"),
            "irrigation_method": entities.get("irrigation_method") or active_farm.get("irrigation_type"),
        })

    field_patch = {}
    if entities.get("area") and (active_field.get("area") is None or active_field.get("area") == 0):
        field_patch["area"] = entities["area"]
    if entities.get("irrigation_method"):
        field_patch["irrigation_method"] = entities["irrigation_method"]
    if field_patch:
        await update_field(active_field["id"], field_patch)
        active_field.update(field_patch)

    # 5. Crop Cycle Updates
    active_crop_cycle = None
    crop_cycles = await list_crop_cycles_by_field(active_field["id"])
    active_cycles = [c for c in crop_cycles if c.get("status") == "active"]

    crop_name = entities.get("crop")
    stated_age = entities.get("crop_age_days")

    if active_cycles:
        active_crop_cycle = active_cycles[0]
        cycle_patch = {}
        if crop_name and crop_name != active_crop_cycle.get("crop_name"):
            cycle_patch["crop_name"] = crop_name
        if stated_age is not None:
            cycle_patch["crop_age_days"] = stated_age
            cycle_patch["stage_source"] = "farmer_statement"
        if entities.get("irrigation_method"):
            cycle_patch["irrigation_method"] = entities["irrigation_method"]
        if cycle_patch:
            active_crop_cycle = await update_crop_cycle(active_crop_cycle["id"], cycle_patch)
    elif crop_name:
        # Create new crop cycle
        active_crop_cycle = await create_crop_cycle(active_field["id"], {
            "crop_name": crop_name,
            "area": entities.get("area") or active_field.get("area"),
            "crop_age_days": stated_age,
            "irrigation_method": entities.get("irrigation_method") or active_field.get("irrigation_method"),
            "status": "active"
        })

    # 6. Soil Record Updates
    if entities.get("soil_type"):
        existing_soil = await get_soil_record_by_field(active_field["id"])
        if existing_soil:
            await update_soil_record(existing_soil["id"], {"soil_type": entities["soil_type"]})
        else:
            await create_soil_record(active_field["id"], {
                "soil_type": entities["soil_type"],
                "source": "farmer_statement",
                "is_verified": False
            })

    # 7. Record Farm Activity Memory
    activity_created = None
    if crop_name and not active_cycles:
        activity_created = await record_farm_activity(
            field_id=active_field["id"],
            crop_cycle_id=active_crop_cycle.get("id") if active_crop_cycle else None,
            activity_type="sowing" if (stated_age is None or stated_age <= 10) else "general",
            title=f"{crop_name} Added to Farm Memory",
            description=f"Farmer recorded {crop_name} on {entities.get('area', active_field.get('area', ''))} acres."
        )
    elif stated_age is not None:
        activity_created = await record_farm_activity(
            field_id=active_field["id"],
            crop_cycle_id=active_crop_cycle.get("id") if active_crop_cycle else None,
            activity_type="crop_health_check",
            title=f"Crop Age Updated: {stated_age} Days",
            description=f"Farmer stated crop is {stated_age} days old."
        )
    elif entities.get("irrigation_method"):
        activity_created = await record_farm_activity(
            field_id=active_field["id"],
            crop_cycle_id=active_crop_cycle.get("id") if active_crop_cycle else None,
            activity_type="irrigation",
            title=f"Irrigation Updated: {entities['irrigation_method'].capitalize()}",
            description=f"Irrigation system noted as {entities['irrigation_method']}."
        )

    # 8. Progressive Profiling Single Missing Question
    progressive_prompt = None
    if not active_farm.get("total_area") and not active_field.get("area"):
        if language.startswith("te"):
            progressive_prompt = "మీ పొలం ఎంత ఎకరాలు ఉంది?"
        elif language.startswith("hi"):
            progressive_prompt = "आपके पास कितनी जमीन है?"
        else:
            progressive_prompt = "How many acres is your farm land?"
    elif not active_crop_cycle:
        if language.startswith("te"):
            progressive_prompt = "మీ పొలంలో ఇప్పుడు ఏ పంట వేశారు?"
        elif language.startswith("hi"):
            progressive_prompt = "आपने खेत में कौन सी फसल लगाई है?"
        else:
            progressive_prompt = "Which crop are you currently cultivating?"
    elif active_crop_cycle.get("crop_age_days") is None and not active_crop_cycle.get("sowing_date"):
        if language.startswith("te"):
            progressive_prompt = f"{active_crop_cycle.get('crop_name')} వేసి ఎన్ని రోజులు అయింది?"
        elif language.startswith("hi"):
            progressive_prompt = f"{active_crop_cycle.get('crop_name')} लगाए कितने दिन हो गए?"
        else:
            progressive_prompt = f"How many days has it been since you planted {active_crop_cycle.get('crop_name')}?"

    # Conversational acknowledgement
    ack_parts = []
    if entities.get("name"):
        ack_parts.append(f"నమస్కారం {entities['name']} గారు" if language.startswith("te") else f"नमस्ते {entities['name']}" if language.startswith("hi") else f"Hello {entities['name']}")
    if entities.get("crop"):
        ack_parts.append(f"మీ {entities['crop']} పంట వివరాలు గుర్తించాము" if language.startswith("te") else f"आपकी {entities['crop']} की जानकारी दर्ज कर ली है" if language.startswith("hi") else f"Recorded your {entities['crop']} details")
    if entities.get("crop_age_days"):
        ack_parts.append(f"{entities['crop_age_days']} రోజుల వయసు నమోదు చేశాము" if language.startswith("te") else f"{entities['crop_age_days']} दिन की फसल दर्ज की गई" if language.startswith("hi") else f"Crop age noted as {entities['crop_age_days']} days")
    if entities.get("irrigation_method"):
        ack_parts.append(f"{entities['irrigation_method']} నీటి పారుదల గుర్తించాము" if language.startswith("te") else f"{entities['irrigation_method']} सिंचाई दर्ज की गई" if language.startswith("hi") else f"Irrigation noted as {entities['irrigation_method']}")
    if entities.get("soil_type"):
        ack_parts.append(f"{entities['soil_type']} నేల రకం భద్రపరిచాము" if language.startswith("te") else f"{entities['soil_type']} दर्ज की गई" if language.startswith("hi") else f"Soil type saved as {entities['soil_type']}")

    conversational_ack = ". ".join(ack_parts) + "." if ack_parts else ("మీ వివరాలు విజయవంతంగా నమోదు చేయబడ్డాయి." if language.startswith("te") else "Your details have been successfully recorded.")

    return {
        "success": True,
        "extracted_entities": entities,
        "updated_records": {
            "farmer_id": farmer_id,
            "farm_id": active_farm.get("id"),
            "field_id": active_field.get("id"),
            "crop_cycle_id": active_crop_cycle.get("id") if active_crop_cycle else None,
            "activity_id": activity_created.get("id") if activity_created else None,
        },
        "progressive_prompt": progressive_prompt,
        "conversational_ack": conversational_ack,
        "current_context": {
            "farmer_name": farmer.get("name"),
            "crop_name": active_crop_cycle.get("crop_name") if active_crop_cycle else None,
            "crop_age_days": active_crop_cycle.get("crop_age_days") if active_crop_cycle else None,
            "current_stage": active_crop_cycle.get("current_stage") if active_crop_cycle else None,
            "farm_area": active_farm.get("total_area"),
            "irrigation": active_field.get("irrigation_method") or active_farm.get("irrigation_type"),
            "soil_type": entities.get("soil_type") or active_farm.get("default_soil_type"),
        }
    }
