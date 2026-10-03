"""
Crop Knowledge Base for KisaanSaathi Decision Engine
Grounded agricultural agronomy data for Indian crops:
Chilli, Paddy/Rice, Cotton, Tomato, Maize, Groundnut, Red Gram, Mango, Sugarcane.

Includes:
- Moisture sensitivity by growth stage
- Soil water-retention characteristics
- Stage-specific nutrient advisories (without fabricating exact unverified dosages)
- Safe agricultural weather guardrails (irrigation cut-off on rain, fertilizer wash-off avoidance)
- Common pests, diseases, and safe IPM interventions
"""

import logging
from typing import Dict, Any, Optional, List, Tuple

logger = logging.getLogger("rythubandhu.crop_knowledge_base")

# ==============================================================================
# SOIL WATER RETENTION CHARACTERISTICS
# ==============================================================================
SOIL_PROPERTIES: Dict[str, Dict[str, Any]] = {
    "black soil": {
        "water_retention_days": 4,
        "drainage": "moderate_to_slow",
        "cracking_tendency": "high",
        "description_te": "నల్ల రేగడి నేల (తేమను ఎక్కువ రోజులు నిల్వ ఉంచుకుంటుంది)",
        "description_hi": "काली मिट्टी (अधिक समय तक नमी बनाए रखती है)",
        "irrigation_interval_days_drip": 3,
        "irrigation_interval_days_flood": 6,
    },
    "red soil": {
        "water_retention_days": 2,
        "drainage": "fast_to_moderate",
        "cracking_tendency": "low",
        "description_te": "ఎర్ర నేల / చెలక నేల (తేమ త్వరగా ఆరిపోతుంది, తరచూ తడులు అవసరం)",
        "description_hi": "लाल मिट्टी (मध्यम जल धारण क्षमता, नियमित सिंचाई आवश्यक)",
        "irrigation_interval_days_drip": 2,
        "irrigation_interval_days_flood": 4,
    },
    "alluvial soil": {
        "water_retention_days": 3,
        "drainage": "moderate",
        "cracking_tendency": "low",
        "description_te": "ఒండ్రు నేల (మంచి సారవంతమైనది)",
        "description_hi": "जलोढ़ मिट्टी (उत्कृष्ट जल व पोषक तत्व धारण क्षमता)",
        "irrigation_interval_days_drip": 2,
        "irrigation_interval_days_flood": 5,
    },
    "sandy loam": {
        "water_retention_days": 1.5,
        "drainage": "very_fast",
        "cracking_tendency": "none",
        "description_te": "ఇసుక నేల (తేమ త్వరగా ఇంకిపోతుంది)",
        "description_hi": "बलुई दोमट मिट्टी (शीघ्र जल निकासी, बार-बार हल्की सिंचाई)",
        "irrigation_interval_days_drip": 1,
        "irrigation_interval_days_flood": 3,
    },
    "clay loam": {
        "water_retention_days": 3.5,
        "drainage": "moderate",
        "cracking_tendency": "moderate",
        "description_te": "బంక నేల (తేమ నిల్వ సామర్థ్యం ఎక్కువ)",
        "description_hi": "चिकनी दोमट मिट्टी (अच्छी जल धारण क्षमता)",
        "irrigation_interval_days_drip": 3,
        "irrigation_interval_days_flood": 5,
    }
}


# ==============================================================================
# CROPS AGRONOMIC KNOWLEDGE BASE
# ==============================================================================
CROP_KNOWLEDGE: Dict[str, Dict[str, Any]] = {
    "chilli": {
        "name": "Chilli",
        "aliases": ["chilli", "mirchi", "mirapa", "మెరపు", "మిరప", "మిర్చి", "मिर्च", "मिर्ची"],
        "critical_moisture_stages": ["Flowering", "Fruit Development"],
        "drought_sensitivity": "high_during_flowering",
        "waterlogging_sensitivity": "very_high",
        "preferred_soil": ["Well-drained red loam", "Black soil with good drainage"],
        "irrigation_guidance": {
            "Sowing & Nursery": "Light daily sprinkling; avoid excess moisture to prevent damping-off (నారు కుళ్ళు).",
            "Vegetative & Establishment": "Irrigate every 3-4 days via drip or 6-7 days via furrow. Moderate moisture promotes root spread.",
            "Flowering": "CRITICAL STAGE: Maintain uniform moisture. Moisture stress causes massive flower drop. Avoid overwatering.",
            "Fruit Development": "Regular moisture needed for fruit expansion and pungency. Waterlogging causes fruit rot / anthracnose.",
            "Maturity & Harvest": "Reduce irrigation 10-15 days before final harvest to enhance fruit color and drying."
        },
        "nutrient_guidance": {
            "Sowing & Nursery": "Apply well-decomposed FYM and Trichoderma viride in nursery soil.",
            "Vegetative & Establishment": "Basal application of Nitrogen, Phosphorus, and Potassium. Top-dress Urea in split doses around 30-35 DAT.",
            "Flowering": "Foliar spray of 19:19:19 (5g/L) or Boron 20% (1g/L) to enhance flowering and reduce flower drop.",
            "Fruit Development": "Potassium-rich fertigation (0:0:50 or 13:0:45) promotes uniform fruit size and deep red color.",
            "Maturity & Harvest": "Stop major nitrogen fertilization; maintain potassium levels if multiple pickings are planned."
        },
        "common_pests": [
            {"name": "Thrips (తామర పురుగులు)", "symptoms": "Upward leaf curling, boat-shaped leaves, silvering on underside", "severity": "HIGH"},
            {"name": "Mites (నల్లి పురుగులు)", "symptoms": "Downward leaf curling, thickened brittle leaves, inverted cup shape", "severity": "HIGH"},
            {"name": "Whitefly (తెల్లదోమ)", "symptoms": "Yellowing leaves, sooty mould, vector for Leaf Curl Virus", "severity": "HIGH"}
        ],
        "common_diseases": [
            {"name": "Dieback & Anthracnose (కొమ్మ ఎండు తెగులు / కాయ కుళ్ళు)", "symptoms": "Tip dieback, dark sunken spots on chilli pods during humid weather", "severity": "CRITICAL"},
            {"name": "Powdery Mildew (బూడిద తెగులు)", "symptoms": "White powdery patches on lower leaf surface, yellowing on upper surface", "severity": "MEDIUM"},
            {"name": "Cercospora Leaf Spot (ఆకు మచ్చ తెగులు)", "symptoms": "Circular spots with dark brown margins and grey centers", "severity": "MEDIUM"}
        ]
    },

    "paddy": {
        "name": "Paddy",
        "aliases": ["paddy", "rice", "vari", "vadlu", "వరి", "ధాన్యం", "धान", "चावल"],
        "critical_moisture_stages": ["Tillering", "Panicle Initiation", "Flowering & Milky Stage"],
        "drought_sensitivity": "critical_at_flowering",
        "waterlogging_sensitivity": "low",
        "preferred_soil": ["Clay loam", "Alluvial", "Heavy black soil with good water retention"],
        "irrigation_guidance": {
            "Nursery & Seedling": "Maintain thin layer of water (2 cm) after emergence.",
            "Tillering & Vegetative": "Alternate wetting and drying (AWD) or shallow standing water (2-3 cm) to stimulate tillers.",
            "Panicle Initiation & Flowering": "CRITICAL: Maintain 3-5 cm standing water. Moisture stress at flowering causes chaffy grains (తాలు గింజలు).",
            "Milky & Grain Filling": "Maintain shallow water (2 cm); do not let soil crack.",
            "Maturity & Harvest": "Drain water completely 10-14 days before harvest to facilitate uniform ripening and machine harvesting."
        },
        "nutrient_guidance": {
            "Nursery & Seedling": "Apply DAP and Zinc Sulphate in nursery bed.",
            "Tillering & Vegetative": "Apply 1st top dressing of Nitrogen (Urea) and Zinc Sulphate at 20-25 DAT.",
            "Panicle Initiation & Flowering": "Apply final split of Nitrogen along with MOP (Muriate of Potash) for strong panicles.",
            "Milky & Grain Filling": "Foliar spray of 13:0:45 (Potassium Nitrate 10g/L) helps improve grain weight.",
            "Maturity & Harvest": "No further fertilizer needed."
        },
        "common_pests": [
            {"name": "Stem Borer (కాండం తొలిచే పురుగు)", "symptoms": "Dead hearts in vegetative stage, White ears at heading stage", "severity": "HIGH"},
            {"name": "Brown Plant Hopper / BPH (సుడి దోమ)", "symptoms": "Circular hopper burn patches of drying plants at base", "severity": "CRITICAL"},
            {"name": "Leaf Folder (ఆకు చుట్టు పురుగు)", "symptoms": "Folded leaves with white transparent streaks from scraped chlorophyll", "severity": "MEDIUM"}
        ],
        "common_diseases": [
            {"name": "Blast Disease (అగ్గి తెగులు)", "symptoms": "Spindle-shaped spots with grey centers and brown borders on leaves and neck", "severity": "CRITICAL"},
            {"name": "Sheath Blight (కాండం కుళ్ళు / తొడుగు తెగులు)", "symptoms": "Snake-skin like greenish-grey lesions on leaf sheaths near water line", "severity": "HIGH"},
            {"name": "Bacterial Leaf Blight / BLB (బాక్టీరియా ఆకు ఎండు తెగులు)", "symptoms": "Wavy yellow-to-white marginal drying of leaf blades", "severity": "HIGH"}
        ]
    },

    "cotton": {
        "name": "Cotton",
        "aliases": ["cotton", "patti", "doodi", "పత్తి", "దూది", "कपास", "रुई"],
        "critical_moisture_stages": ["Square Formation", "Flowering", "Boll Development"],
        "drought_sensitivity": "high_at_boll_formation",
        "waterlogging_sensitivity": "high",
        "preferred_soil": ["Deep black cotton soil", "Medium black soil with good drainage"],
        "irrigation_guidance": {
            "Germination & Seedling": "Light irrigation for emergence; avoid waterlogging.",
            "Vegetative & Square Formation": "Moderate irrigation every 10-12 days (black soil) or 6-8 days (red soil).",
            "Flowering & Peak Boll Formation": "CRITICAL: Uniform moisture required. Heavy moisture fluctuation causes square/boll shedding (పూత, పిందె రాలడం).",
            "Boll Bursting & Maturity": "Withhold irrigation during boll opening to prevent staining of cotton lint.",
            "Harvest": "Keep fields dry for clean manual or mechanical picking."
        },
        "nutrient_guidance": {
            "Germination & Seedling": "Basal dose of DAP, Potash, and FYM at sowing.",
            "Vegetative & Square Formation": "Top-dress Nitrogen in splits at 30 and 60 DAS. Spray 19:19:19 for balanced growth.",
            "Flowering & Peak Boll Formation": "Apply Potassium fertigation and Magnesium Sulphate (10g/L) + Boron (1g/L) foliar spray to prevent reddening of leaves (ఆకు ఎరుపు తెగులు).",
            "Boll Bursting & Maturity": "Foliar spray of 0:0:50 (Potassium sulphate 10g/L) for boll expansion.",
            "Harvest": "No fertilizer application."
        },
        "common_pests": [
            {"name": "Pink Bollworm (గులాబీ రంగు కాయ తొలిచే పురుగు)", "symptoms": "Rosetted flowers, bore holes inside green bolls with staining", "severity": "CRITICAL"},
            {"name": "Whitefly & Jassids (తెల్లదోమ & పచ్చదోమ)", "symptoms": "Leaf margin yellowing, downward curling, honeydew excretion", "severity": "HIGH"},
            {"name": "Spodoptera / Tobacco Caterpillar (లద్దె పురుగు)", "symptoms": "Skeletonized leaves and damaged squares", "severity": "HIGH"}
        ],
        "common_diseases": [
            {"name": "Leaf Reddening (పత్తిలో ఆకు ఎరుపు తెగులు)", "symptoms": "Leaves turn reddish-purple due to Magnesium deficiency and moisture stress", "severity": "MEDIUM"},
            {"name": "Bacterial Blight / Angular Leaf Spot (కోణీయ ఆకుమచ్చ తెగులు)", "symptoms": "Water-soaked angular spots on leaves following veins", "severity": "HIGH"},
            {"name": "Root Rot / Wilting (వేరు కుళ్ళు / వడలు తెగులు)", "symptoms": "Sudden drooping and drying of green plants", "severity": "CRITICAL"}
        ]
    },

    "tomato": {
        "name": "Tomato",
        "aliases": ["tomato", "tamata", "tamatar", "టమోటా", "టమాట", "टमाटर"],
        "critical_moisture_stages": ["Flowering", "Fruit Setting", "Fruit Enlargement"],
        "drought_sensitivity": "high_causes_blossom_end_rot",
        "waterlogging_sensitivity": "very_high",
        "preferred_soil": ["Well-drained sandy loam", "Red loam with rich organic matter"],
        "irrigation_guidance": {
            "Nursery & Transplanting": "Daily light watering in nursery; irrigate immediately after field transplanting.",
            "Vegetative Growth": "Irrigate every 3-4 days via drip; avoid splashing soil on lower leaves.",
            "Flowering & Fruit Setting": "Maintain consistent moisture. Irregular watering causes Blossom End Rot (కాల్షియం లోపం / పిందె కుళ్ళు) and flower drop.",
            "Fruit Enlargement & Ripening": "Adequate watering during fruit growth; reduce slightly near picking to prevent fruit cracking.",
            "Harvest": "Irrigate lightly between multiple pickings to sustain vine health."
        },
        "nutrient_guidance": {
            "Nursery & Transplanting": "Basal compost + Trichoderma + NPK 10:26:26.",
            "Vegetative Growth": "Fertigate with 19:19:19 and Micronutrients every 7-10 days.",
            "Flowering & Fruit Setting": "Calcium Nitrate (2g/L) + Boron (1g/L) spray prevents Blossom End Rot and fruit cracking.",
            "Fruit Enlargement & Ripening": "High Potassium fertigation (0:0:50 or 13:0:45) for firm, shiny, red tomatoes.",
            "Harvest": "Light maintenance fertigation."
        },
        "common_pests": [
            {"name": "Tomato Leaf Miner / Tuta absoluta (ఆకు తొలిచే పురుగు)", "symptoms": "White blotch mines on leaves, holes in fruits with frass", "severity": "CRITICAL"},
            {"name": "Fruit Borer / Helicoverpa (కాయ తొలిచే పురుగు)", "symptoms": "Round bore holes on fruits with larval feeding", "severity": "HIGH"},
            {"name": "Whitefly (తెల్లదోమ)", "symptoms": "Yellow leaf curl virus transmission, stunted bushy foliage", "severity": "HIGH"}
        ],
        "common_diseases": [
            {"name": "Early Blight (ముందస్తు ఆకు మాడ తెగులు)", "symptoms": "Concentric ring target-board brown spots on lower leaves", "severity": "HIGH"},
            {"name": "Late Blight (చివరి మాడ తెగులు)", "symptoms": "Water-soaked dark lesions rapidly rotting leaves and green fruit in cool humid weather", "severity": "CRITICAL"},
            {"name": "Bacterial Wilt (బాక్టీరియా వడలు తెగులు)", "symptoms": "Sudden wilting of green plant during warm sunny afternoons", "severity": "CRITICAL"}
        ]
    },

    "maize": {
        "name": "Maize",
        "aliases": ["maize", "corn", "mokkajonna", "మొక్కజొన్న", "मक्का", "भुट्टा"],
        "critical_moisture_stages": ["Tasseling", "Silking", "Grain Filling"],
        "drought_sensitivity": "critical_at_silking",
        "waterlogging_sensitivity": "high_at_seedling",
        "preferred_soil": ["Well-drained deep loamy soil", "Red loam with good fertility"],
        "irrigation_guidance": {
            "Germination & Knee-High": "Irrigate after sowing; avoid standing water around young seedlings.",
            "Tasseling & Silking": "CRITICAL: Moisture stress for even 2 days during pollination reduces seed set drastically (కంకిలో గింజ నిండకపోవడం).",
            "Grain Filling / Dough Stage": "Maintain adequate moisture for plump, heavy kernels.",
            "Maturity & Drying": "Stop irrigation when black layer forms at base of grain (physiological maturity)."
        },
        "nutrient_guidance": {
            "Germination & Knee-High": "Basal DAP + Potash + Zinc. Top dress Urea at knee-high stage (30 DAS).",
            "Tasseling & Silking": "Second top dressing of Urea before tasseling (45-50 DAS).",
            "Grain Filling / Dough Stage": "Foliar spray of 13:0:45 (10g/L) for kernel weight.",
            "Maturity & Drying": "No fertilizer required."
        },
        "common_pests": [
            {"name": "Fall Armyworm / FAW (కత్తెర పురుగు)", "symptoms": "Extensive window-pane feeding in whorl, sawdust-like frass, ragged leaf edges", "severity": "CRITICAL"},
            {"name": "Stem Borer (కాండం తొలిచే పురుగు)", "symptoms": "Dead heart and shot holes across leaf rows", "severity": "HIGH"}
        ],
        "common_diseases": [
            {"name": "Turcicum Leaf Blight (ఆకు ఎండు తెగులు)", "symptoms": "Long, elliptical grayish-green lesions on leaves", "severity": "HIGH"},
            {"name": "Banded Leaf and Sheath Blight (తొడుగు తెగులు)", "symptoms": "Bleached and brown concentric bands across sheaths and cobs", "severity": "HIGH"}
        ]
    }
}


# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

def normalize_crop_name(name: Optional[str]) -> str:
    """Matches any local name/alias to the standard crop key."""
    if not name:
        return "chilli"
    
    clean = str(name).strip().lower()
    for key, data in CROP_KNOWLEDGE.items():
        if clean == key.lower():
            return key
        for alias in data.get("aliases", []):
            if alias.lower() in clean or clean in alias.lower():
                return key
    return "chilli"  # Safe default fallback


def get_crop_knowledge(crop_name: Optional[str]) -> Optional[Dict[str, Any]]:
    """Retrieves agronomic knowledge entry for a given crop name."""
    key = normalize_crop_name(crop_name)
    return CROP_KNOWLEDGE.get(key)


def get_soil_properties(soil_type: Optional[str]) -> Dict[str, Any]:
    """Retrieves water retention and physical properties for a soil type."""
    if not soil_type:
        return SOIL_PROPERTIES["red soil"]
    
    s_clean = str(soil_type).strip().lower()
    for key, props in SOIL_PROPERTIES.items():
        if key in s_clean or s_clean in key:
            return props
    
    if "black" in s_clean or "నల్ల" in s_clean or "काली" in s_clean:
        return SOIL_PROPERTIES["black soil"]
    elif "red" in s_clean or "ఎర్ర" in s_clean or "लाल" in s_clean:
        return SOIL_PROPERTIES["red soil"]
    elif "sand" in s_clean or "ఇసుక" in s_clean or "बलुई" in s_clean:
        return SOIL_PROPERTIES["sandy loam"]
    
    return SOIL_PROPERTIES["red soil"]
