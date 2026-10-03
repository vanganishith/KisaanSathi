import logging
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, date, timedelta

logger = logging.getLogger("rythubandhu.crop_lifecycle_service")

# ==============================================================================
# CONFIGURABLE CROP LIFECYCLE DEFINITIONS
# ==============================================================================

CROP_LIFECYCLES: Dict[str, Dict[str, Any]] = {
    "chilli": {
        "standard_name": "Chilli",
        "aliases": ["chilli", "chilli pepper", "mirchi", "mirapa", "మెరపు", "మిరప", "మిర్చి", "मिर्च", "मिर्ची"],
        "total_days_min": 140,
        "total_days_max": 180,
        "stages": [
            {
                "stage": "Sowing & Nursery",
                "stage_te": "విత్తనం & నర్సరీ దశ",
                "stage_hi": "बुवाई एवं नर्सरी",
                "start_day": 0,
                "end_day": 30,
                "care_activities": [
                    "Prepare raised nursery beds with well-decomposed FYM.",
                    "Treat seeds with Trichoderma viride (10g/kg) to prevent damping-off.",
                    "Provide 50% shade net protection and light daily misting."
                ]
            },
            {
                "stage": "Vegetative & Establishment",
                "stage_te": "శాఖీయ పెరుగుదల దశ",
                "stage_hi": "वानस्पतिक वृद्धि",
                "start_day": 31,
                "end_day": 55,
                "care_activities": [
                    "Transplant healthy 30-35 day seedlings in paired rows.",
                    "Apply basal dose of Nitrogen, Phosphorus, and Potassium.",
                    "Maintain drip irrigation every 2-3 days; scout for thrips under leaves."
                ]
            },
            {
                "stage": "Flowering",
                "stage_te": "పూత దశ",
                "stage_hi": "फूल आने की अवस्था",
                "start_day": 56,
                "end_day": 80,
                "care_activities": [
                    "Avoid moisture stress during blooming to prevent flower drop.",
                    "Foliar spray of Planofix (0.25 ml/L) or Boron 20% (1 g/L) if flower drop observed.",
                    "Erect yellow and blue sticky traps (15 per acre) for thrips and whitefly."
                ]
            },
            {
                "stage": "Fruit Development",
                "stage_te": "కాయ ఏర్పడే దశ",
                "stage_hi": "फल विकास अवस्था",
                "start_day": 81,
                "end_day": 120,
                "care_activities": [
                    "Apply Potassium-rich fertigation (0-0-50) for fruit sizing and pungent shine.",
                    "Monitor for fruit rot / anthracnose (die-back) spots during humid spells.",
                    "Ensure adequate drainage; avoid waterlogging."
                ]
            },
            {
                "stage": "Maturity & Harvest",
                "stage_te": "పంట కోత దశ",
                "stage_hi": "परिपक्वता एवं तुड़ाई",
                "start_day": 121,
                "end_day": 180,
                "care_activities": [
                    "Harvest firm, fully red ripe chillies on dry days.",
                    "Sun-dry on clean tarpaulins until moisture reaches 10-11%.",
                    "Grade before bagging to fetch premium market price."
                ]
            }
        ]
    },
    "paddy": {
        "standard_name": "Paddy",
        "aliases": ["paddy", "rice", "vari", "vadlu", "వరి", "ధాన్యం", "धान", "चावल"],
        "total_days_min": 120,
        "total_days_max": 145,
        "stages": [
            {
                "stage": "Nursery & Seedling",
                "stage_te": "నర్సరీ & మొలక దశ",
                "stage_hi": "नर्सरी एवं अंकुरण",
                "start_day": 0,
                "end_day": 25,
                "care_activities": [
                    "Salt water soak test for healthy seed selection.",
                    "Maintain shallow standing water (2 cm) in the nursery."
                ]
            },
            {
                "stage": "Tillering & Vegetative",
                "stage_te": "పిలకల దశ",
                "stage_hi": "कल्ले निकलने की अवस्था",
                "start_day": 26,
                "end_day": 55,
                "care_activities": [
                    "Transplant 2-3 seedlings per hill at 20x15 cm spacing.",
                    "First top dressing of Urea + Zinc Sulfate if deficiency detected.",
                    "Weed control via cono-weeder or recommended pre-emergence herbicide."
                ]
            },
            {
                "stage": "Panicle Initiation & Booting",
                "stage_te": "చిరుపొట్ట దశ",
                "stage_hi": "गाभा / बाली बनने की अवस्था",
                "start_day": 56,
                "end_day": 80,
                "care_activities": [
                    "Apply second top-dressing of Nitrogen and Potash.",
                    "Maintain 3-5 cm standing water continuously.",
                    "Scout for stem borer dead hearts and leaf folder symptoms."
                ]
            },
            {
                "stage": "Flowering & Heading",
                "stage_te": "ఈనెల దశ / పూత దశ",
                "stage_hi": "फूल आना एवं परागण",
                "start_day": 81,
                "end_day": 95,
                "care_activities": [
                    "Strictly prevent any water stress; pollen sterility occurs under drought.",
                    "Avoid spraying chemicals during peak anthesis (9 AM - 12 PM)."
                ]
            },
            {
                "stage": "Grain Filling & Maturity",
                "stage_te": "గింజ పాలుపోసుకునే & కోత దశ",
                "stage_hi": "दाना भराव एवं कटाई",
                "start_day": 96,
                "end_day": 140,
                "care_activities": [
                    "Drain field completely 10-12 days prior to scheduled harvest.",
                    "Harvest when 85% of grains in the panicle turn golden yellow."
                ]
            }
        ]
    },
    "cotton": {
        "standard_name": "Cotton",
        "aliases": ["cotton", "patti", "doodi", "పత్తి", "దూది", "कपास", "रुई"],
        "total_days_min": 150,
        "total_days_max": 180,
        "stages": [
            {
                "stage": "Germination & Seedling",
                "stage_te": "మొలక & ప్రారంభ దశ",
                "stage_hi": "अंकुरण एवं प्रारंभिक अवस्था",
                "start_day": 0,
                "end_day": 25,
                "care_activities": [
                    "Ensure adequate soil moisture before sowing delinted hybrid seeds.",
                    "Gap filling within 10 days of emergence."
                ]
            },
            {
                "stage": "Vegetative Growth",
                "stage_te": "శాఖీయ పెరుగుదల",
                "stage_hi": "वानस्पतिक अवस्था",
                "start_day": 26,
                "end_day": 45,
                "care_activities": [
                    "Thinning to one vigorous plant per hill.",
                    "Inter-cultivation for aeration and weed control.",
                    "Basal application of NPK (Split dose)."
                ]
            },
            {
                "stage": "Square Formation (Budding)",
                "stage_te": "మొగ్గ దశ (స్క్వేర్ దశ)",
                "stage_hi": "कली बनने की अवस्था",
                "start_day": 46,
                "end_day": 65,
                "care_activities": [
                    "Scout for sucking pests: aphids, jassids, and thrips.",
                    "Install pheromone traps for pink bollworm monitoring (4/acre)."
                ]
            },
            {
                "stage": "Flowering & Boll Development",
                "stage_te": "పూత & కాయ (బొల్) ఏర్పడే దశ",
                "stage_hi": "फूल एवं टिंडे बनने की अवस्था",
                "start_day": 66,
                "end_day": 115,
                "care_activities": [
                    "Critical irrigation window: prevent water stress during boll expansion.",
                    "Foliar spray of 1% Magnesium Sulphate + 1% Urea to prevent leaf reddening."
                ]
            },
            {
                "stage": "Boll Bursting & Picking",
                "stage_te": "దూది పగిలే దశ & కోత",
                "stage_hi": "टिंडे खिलना एवं चुगाई",
                "start_day": 116,
                "end_day": 180,
                "care_activities": [
                    "Pick clean, dry cotton after morning dew evaporates.",
                    "Store in dry godowns away from moisture to avoid staining."
                ]
            }
        ]
    },
    "tomato": {
        "standard_name": "Tomato",
        "aliases": ["tomato", "tamata", "టమోటా", "టమాట", "टमाटर"],
        "total_days_min": 100,
        "total_days_max": 135,
        "stages": [
            {
                "stage": "Nursery & Establishment",
                "stage_te": "నర్సరీ & నాటు దశ",
                "stage_hi": "नर्सरी एवं रोपाई",
                "start_day": 0,
                "end_day": 28,
                "care_activities": [
                    "Raise seedlings in pro-trays with sterilized coco peat.",
                    "Transplant on raised beds with silver-black mulch."
                ]
            },
            {
                "stage": "Vegetative & Staking",
                "stage_te": "ఎదుగుదల & కర్రల ఆసరా దశ",
                "stage_hi": "बढ़वार एवं सहारा (स्टेकिंग)",
                "start_day": 29,
                "end_day": 48,
                "care_activities": [
                    "Provide trellis or wooden stake support for indeterminate varieties.",
                    "Prune lower suckers to encourage central stem vigor."
                ]
            },
            {
                "stage": "Flowering & Fruit Setting",
                "stage_te": "పూత & పిందె దశ",
                "stage_hi": "फूल एवं फल बनना",
                "start_day": 49,
                "end_day": 75,
                "care_activities": [
                    "Maintain steady soil moisture to prevent Blossom End Rot (Calcium deficiency).",
                    "Foliar application of micronutrient mixture."
                ]
            },
            {
                "stage": "Fruit Enlargement & Harvesting",
                "stage_te": "కాయ ముదురు & కోత దశ",
                "stage_hi": "फल विकास एवं तुड़ाई",
                "start_day": 76,
                "end_day": 135,
                "care_activities": [
                    "Harvest at breaker stage for distant transport or pink stage for local market.",
                    "Regular multi-picking every 3-4 days."
                ]
            }
        ]
    },
    "maize": {
        "standard_name": "Maize",
        "aliases": ["maize", "corn", "mokkajonna", "మొక్కజొన్న", "मक्का"],
        "total_days_min": 95,
        "total_days_max": 120,
        "stages": [
            {
                "stage": "Emergence & Early Vegetative",
                "stage_te": "మొలక & ప్రారంభ పెరుగుదల",
                "stage_hi": "अंकुरण एवं प्रारंभिक अवस्था",
                "start_day": 0,
                "end_day": 25,
                "care_activities": [
                    "Scout for Fall Armyworm (FAW) whorl feeding from day 10 onwards.",
                    "Inter-cultivation and earthing up."
                ]
            },
            {
                "stage": "Knee-High to Tasseling",
                "stage_te": "మోకాలి ఎత్తు నుండి పూత దశ",
                "stage_hi": "घुटने तक बढ़वार एवं मंजर",
                "start_day": 26,
                "end_day": 55,
                "care_activities": [
                    "Apply second split dose of Nitrogen.",
                    "Critical irrigation at tasseling."
                ]
            },
            {
                "stage": "Silking & Grain Filling",
                "stage_te": "కంకి పాలుపోసుకునే దశ",
                "stage_hi": "सिल्क निकलना एवं दाना भराव",
                "start_day": 56,
                "end_day": 85,
                "care_activities": [
                    "Ensure adequate soil moisture; moisture stress directly reduces cob filling.",
                    "Protect cobs against bird and borer damage."
                ]
            },
            {
                "stage": "Maturity & Harvest",
                "stage_te": "కంకి ముదిరి కోత దశ",
                "stage_hi": "परिपक्वता एवं कटाई",
                "start_day": 86,
                "end_day": 120,
                "care_activities": [
                    "Harvest when outer husks turn dry paper-white and black layer forms at grain base.",
                    "Dry cobs to 12% moisture before mechanical shelling."
                ]
            }
        ]
    },
    "groundnut": {
        "standard_name": "Groundnut",
        "aliases": ["groundnut", "peanut", "verusanaga", "palleelu", "వేరుశనగ", "పల్లీలు", "मूंगफली"],
        "total_days_min": 105,
        "total_days_max": 125,
        "stages": [
            {
                "stage": "Germination & Vegetative",
                "stage_te": "మొలక & శాఖీయ దశ",
                "stage_hi": "अंकुरण एवं बढ़वार",
                "start_day": 0,
                "end_day": 30,
                "care_activities": [
                    "Seed treatment with Rhizobium and Trichoderma.",
                    "Keep soil loose and well aerated."
                ]
            },
            {
                "stage": "Flowering & Pegging",
                "stage_te": "పూత & ఊడలు దిగే దశ",
                "stage_hi": "फूल एवं खूंटे (पेगिंग)",
                "start_day": 31,
                "end_day": 55,
                "care_activities": [
                    "Apply Gypsum (200 kg/acre) around the root zone at flowering.",
                    "Do NOT disturb soil or inter-cultivate once pegs begin penetrating ground."
                ]
            },
            {
                "stage": "Pod Development & Maturity",
                "stage_te": "కాయ ఏర్పడి గింజ ఊరే దశ",
                "stage_hi": "फली विकास एवं परिपक्वता",
                "start_day": 56,
                "end_day": 125,
                "care_activities": [
                    "Maintain light moisture for pod enlargement.",
                    "Harvest when inner shell wall shows blackish-brown tint."
                ]
            }
        ]
    }
}


def normalize_crop_name(name: Optional[str]) -> Optional[str]:
    """
    Matches colloquial, regional, or compound crop names to canonical registry keys.
    Handles composite strings like "వేరుశనగ (Groundnut (Verusanaga))".
    """
    if not name:
        return None
    cleaned = name.strip().lower()
    # 1. Exact match
    for key, spec in CROP_LIFECYCLES.items():
        if cleaned == key or cleaned in [a.lower() for a in spec.get("aliases", [])]:
            return key
    # 2. Substring / Token match for compound localized strings
    for key, spec in CROP_LIFECYCLES.items():
        if key in cleaned:
            return key
        for alias in spec.get("aliases", []):
            if alias.lower() in cleaned:
                return key
    return None


def calculate_crop_age(
    sowing_date: Optional[Union[date, str]] = None,
    planting_date: Optional[Union[date, str]] = None,
    stated_age_days: Optional[int] = None,
    reference_date: Optional[date] = None
) -> Tuple[Optional[int], str]:
    """
    Computes crop age in days.
    Order of precedence:
    1. Calculated from sowing_date or planting_date
    2. Stated age from farmer/AEO without fabricating dates
    Returns: (age_in_days, source_tag)
    """
    ref = reference_date or date.today()

    calc_date = None
    if sowing_date:
        if isinstance(sowing_date, str):
            try:
                calc_date = datetime.strptime(sowing_date[:10], "%Y-%m-%d").date()
            except Exception:
                calc_date = None
        else:
            calc_date = sowing_date

    if not calc_date and planting_date:
        if isinstance(planting_date, str):
            try:
                calc_date = datetime.strptime(planting_date[:10], "%Y-%m-%d").date()
            except Exception:
                calc_date = None
        else:
            calc_date = planting_date

    if calc_date:
        diff_days = (ref - calc_date).days
        if diff_days >= 0:
            return max(1, diff_days), "calculated_from_sowing"

    if stated_age_days is not None and stated_age_days >= 0:
        return max(1, stated_age_days), "farmer_statement"

    return None, "unavailable"


def determine_crop_stage(
    crop_name: Optional[str],
    crop_age_days: Optional[int],
    stated_stage: Optional[str] = None
) -> Dict[str, Any]:
    """
    Determines current lifecycle stage, next stage, and estimated harvest window.
    Crucial guardrail: Returns 'Stage estimate unavailable' rather than hallucinating
    if the crop or age is missing or outside plausible ranges.
    """
    canonical_key = normalize_crop_name(crop_name)
    
    if not canonical_key or crop_age_days is None or crop_age_days < 0:
        return {
            "current_stage": stated_stage or "Stage estimate unavailable",
            "current_stage_localized": stated_stage or "దశ వివరాలు అందుబాటులో లేవు",
            "stage_source": "farmer_statement" if stated_stage else "unavailable",
            "next_stage": None,
            "days_to_next_stage": None,
            "approx_harvest_window": None,
            "stage_care_activities": [],
            "lifecycle_supported": bool(canonical_key),
        }

    spec = CROP_LIFECYCLES[canonical_key]
    stages = spec["stages"]

    matched_stage = None
    next_stage = None
    days_to_next = None

    for i, stg in enumerate(stages):
        if stg["start_day"] <= crop_age_days <= stg["end_day"]:
            matched_stage = stg
            if i + 1 < len(stages):
                next_stage = stages[i + 1]
                days_to_next = max(1, next_stage["start_day"] - crop_age_days)
            break

    # If beyond max day
    if not matched_stage and crop_age_days > spec["total_days_max"]:
        matched_stage = stages[-1]

    if not matched_stage:
        return {
            "current_stage": stated_stage or "Stage estimate unavailable",
            "current_stage_localized": stated_stage or "దశ వివరాలు అందుబాటులో లేవు",
            "stage_source": "farmer_statement" if stated_stage else "unavailable",
            "next_stage": None,
            "days_to_next_stage": None,
            "approx_harvest_window": None,
            "stage_care_activities": [],
            "lifecycle_supported": True,
        }

    # Calculate approximate harvest window
    total_max = spec["total_days_max"]
    days_to_harvest = max(0, total_max - crop_age_days)
    if days_to_harvest == 0:
        harvest_window = "Harvest ready / In harvest window"
    elif days_to_harvest <= 20:
        harvest_window = f"Approx {days_to_harvest} days away"
    else:
        harvest_window = f"Approx {days_to_harvest - 15} to {days_to_harvest + 10} days away"

    return {
        "current_stage": matched_stage["stage"],
        "current_stage_te": matched_stage.get("stage_te"),
        "current_stage_hi": matched_stage.get("stage_hi"),
        "current_stage_localized": matched_stage.get("stage_te") or matched_stage["stage"],
        "stage_source": "crop_lifecycle_engine",
        "next_stage": next_stage["stage"] if next_stage else None,
        "next_stage_te": next_stage.get("stage_te") if next_stage else None,
        "days_to_next_stage": days_to_next,
        "approx_harvest_window": harvest_window,
        "stage_care_activities": matched_stage.get("care_activities", []),
        "lifecycle_supported": True,
    }
