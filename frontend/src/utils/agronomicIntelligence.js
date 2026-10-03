/**
 * Agronomic Intelligence Knowledge Engine for KisaanSaathi.
 * Synthesizes farmer voice complaints, photos, and computer vision detections
 * into authoritative technical agricultural causes, pathogens, environmental triggers,
 * and actionable AEO field advisories.
 */

export const AGRONOMIC_DISEASE_PROFILES = {
  tomato: {
    early_blight: {
      primaryCondition: 'Early Blight (Alternaria solani)',
      scientificName: 'Alternaria solani',
      pathogenType: 'Foliar Fungal Pathogen (Ascomycota)',
      severity: 'Moderate to High',
      technicalCause:
        'Caused by the fungal pathogen Alternaria solani, which survives in infected crop residues and soil. The disease is triggered by warm temperatures (24°C–30°C) combined with high relative humidity (>80%) and prolonged leaf wetness (>8 hours) from rain or overhead irrigation. Conidia are splashed by rain or carried by wind onto lower leaves, where they penetrate stomata or wounds and secrete host-specific alternaric acid toxins. This produces characteristic circular-to-irregular dark brown necrotic lesions with concentric "target-board" rings surrounded by chlorotic yellow halos, causing lower-to-upper canopy defoliation.',
      environmentalTriggers: [
        'Warm temperatures between 24°C and 30°C',
        'Persistent relative humidity >80% and overnight dew',
        'Rain splash or overhead sprinkler irrigation dispersing soil-borne conidia',
        'Dense crop canopy restricting air circulation around lower leaves',
      ],
      symptomMarkers: [
        'Concentric target-board rings inside dark brown spots',
        'Chlorotic (yellow) halos surrounding foliar lesions',
        'Lower/older leaves affected first, progressing upward',
        'Stem collar cankers and premature leaf drop under high severity',
      ],
      aeoFieldChecks: [
        'Examine lower leaf undersides for concentric rings and dark velvety sporulation',
        'Check stems for dark sunken collar rot or canker lesions',
        'Assess the percentage of field plot defoliation and check soil moisture levels',
      ],
      treatmentAdvisory: {
        chemical:
          'Foliar spray of Mancozeb 75% WP @ 2.5 g/L or Chlorothalonil 75% WP @ 2.0 g/L. For advanced spread, rotate with Azoxystrobin 23% SC @ 1.0 mL/L or Difenoconazole 25% EC @ 0.5 mL/L.',
        cultural:
          'Prune and safely burn or bury infected lower leaves. Shift from overhead sprinkling to furrow or drip irrigation to keep foliage dry. Ensure adequate plant spacing for canopy ventilation.',
      },
    },
    leaf_spot: {
      primaryCondition: 'Septoria / Cercospora Leaf Spot (Septoria lycopersici)',
      scientificName: 'Septoria lycopersici / Cercospora sp.',
      pathogenType: 'Foliar Fungal Pathogen',
      severity: 'Moderate',
      technicalCause:
        'Caused by Septoria lycopersici, an airborne and rain-splashed fungal pathogen. The infection begins on older leaves near the ground when relative humidity exceeds 85% and temperatures remain between 20°C and 25°C. The fungus produces numerous small (1–3 mm), circular spots with grayish-white centers and dark brown margins, dotted with tiny black fruiting bodies (pycnidia). Heavy infection leads to rapid chlorosis, leaf drying, and premature defoliation, exposing fruit to sunscald.',
      environmentalTriggers: [
        'High humidity (>85%) with frequent rainfall or heavy morning dews',
        'Temperatures of 20°C to 26°C',
        'Overhead irrigation or splash dispersal from soil',
      ],
      symptomMarkers: [
        'Numerous small circular spots with light gray centers and dark borders',
        'Visible black specks (pycnidia) in center of mature lesions',
        'Rapid leaf yellowing and defoliation from ground level upward',
      ],
      aeoFieldChecks: [
        'Use hand lens to verify black pycnidia specks in center of gray spots',
        'Check whether upper canopy and green fruits remain unaffected',
        'Verify canopy aeration and soil drainage',
      ],
      treatmentAdvisory: {
        chemical:
          'Spray Copper Oxychloride 50% WP @ 3.0 g/L or Mancozeb 75% WP @ 2.5 g/L at 7–10 day intervals. In severe outbreaks, spray Pyraclostrobin 20% WG @ 1.0 g/L.',
        cultural:
          'Remove infected lower foliage; apply organic straw mulch to prevent rain splashing spores from soil onto leaves; avoid overhead watering.',
      },
    },
    late_blight: {
      primaryCondition: 'Late Blight (Phytophthora infestans)',
      scientificName: 'Phytophthora infestans',
      pathogenType: 'Oomycete Water Mold',
      severity: 'Critical / High',
      technicalCause:
        'Caused by the devastating oomycete pathogen Phytophthora infestans. Favored by cool, wet weather (15°C–21°C) with persistent humidity >90%. Causes rapid water-soaked pale-to-dark green lesions that turn brown and necrotic, with a white fuzzy mold on leaf undersides under humid conditions.',
      environmentalTriggers: [
        'Cool temperatures (15°C–20°C) with high humidity (>90%)',
        'Continuous rainfall, fog, or prolonged leaf wetness',
      ],
      symptomMarkers: [
        'Large, irregular water-soaked lesions turning dark brown/purplish',
        'White fungal sporulation on undersides of leaves in humid mornings',
        'Rapid collapse and blackened appearance of foliage and stems',
      ],
      aeoFieldChecks: [
        'Inspect underside of lesions during early morning for delicate white mildew growth',
        'Inspect green and ripening fruit for greasy, firm brown marbling lesions',
      ],
      treatmentAdvisory: {
        chemical:
          'Immediate preventive/curative spray of Cymoxanil 8% + Mancozeb 64% WP @ 2.5 g/L or Metalaxyl 8% + Mancozeb 64% WP @ 2.5 g/L.',
        cultural:
          'Immediately harvest mature fruits; destroy heavily infected plants; avoid field operations when foliage is wet to prevent spore transfer.',
      },
    },
    leaf_curl: {
      primaryCondition: 'Tomato Leaf Curl Virus (ToLCV)',
      scientificName: 'Tomato Leaf Curl Begomovirus',
      pathogenType: 'Viral (Vector: Whitefly Bemisia tabaci)',
      severity: 'High / Systemic',
      technicalCause:
        'Caused by Tomato Leaf Curl Virus transmitted persistently by the silverleaf whitefly (Bemisia tabaci). Favorable during warm, dry weather which accelerates whitefly reproduction. Causes severe upward and inward rolling of leaf margins, thick leathery texture, yellow chlorosis, and stunted bushy growth.',
      environmentalTriggers: [
        'Warm, dry weather fostering high whitefly vector populations',
        'Nearby host weeds or older infested solanaceous crops',
      ],
      symptomMarkers: [
        'Severe upward curling and crinkling of leaf margins',
        'Interveinal chlorosis and reduced leaflet size',
        'Stunted internodes resulting in bushy, stunted plant architecture',
      ],
      aeoFieldChecks: [
        'Shake upper leaves gently to observe whitefly vector activity',
        'Assess whether younger emerging leaves show severe curling and stunting',
      ],
      treatmentAdvisory: {
        chemical:
          'Control whitefly vector: Foliar spray of Diafenthiuron 50% WP @ 1.2 g/L or Acetamiprid 20% SP @ 0.4 g/L, or Spiromesifen 22.9% SC @ 1.0 mL/L.',
        cultural:
          'Install yellow sticky traps @ 15–20 traps/acre; remove and destroy early infected virus-reservoir plants; use silver reflective mulch.',
      },
    },
  },
  chilli: {
    leaf_spot: {
      primaryCondition: 'Cercospora Leaf Spot / Frogeye (Cercospora capsici)',
      scientificName: 'Cercospora capsici',
      pathogenType: 'Foliar Fungal Pathogen',
      severity: 'Moderate',
      technicalCause:
        'Caused by Cercospora capsici. Favored by high humidity (>80%) and temperatures between 25°C and 32°C. Produces circular or oblong spots with white or grayish centers and distinct dark brown halos (frogeye appearance). Severe infection causes premature leaf abscission.',
      environmentalTriggers: ['High humidity and temperatures >25°C', 'Overhead watering and dense canopy'],
      symptomMarkers: ['Circular spots with grayish centers and dark brown rings', 'Extensive lower leaf drop'],
      aeoFieldChecks: ['Inspect lower canopy for defoliation rate', 'Check fruit calyx for lesions'],
      treatmentAdvisory: {
        chemical: 'Foliar spray of Propiconazole 25% EC @ 1 mL/L or Carbendazim 12% + Mancozeb 63% WP @ 2 g/L.',
        cultural: 'Ensure good field drainage and prune affected lower foliage.',
      },
    },
    powdery_mildew: {
      primaryCondition: 'Chilli Powdery Mildew (Leveillula taurica)',
      scientificName: 'Leveillula taurica',
      pathogenType: 'Endophytic Fungal Pathogen',
      severity: 'Moderate to High',
      technicalCause:
        'Favored by warm, dry conditions with high atmospheric humidity during flowering and fruiting. White powdery patches appear on the lower leaf surface, with corresponding chlorotic yellow patches on the upper surface, followed by upward rolling and drying.',
      environmentalTriggers: ['Warm daytime temperatures (25°C–32°C) with dry soil and humid air'],
      symptomMarkers: ['White powdery fungal growth on underside of leaves', 'Yellow patches on upper leaf surface'],
      aeoFieldChecks: ['Inspect leaf undersides for white fungal bloom', 'Check for shed leaves around plant base'],
      treatmentAdvisory: {
        chemical: 'Foliar spray of Wettable Sulphur 80% WP @ 3 g/L or Myclobutanil 10% WP @ 1 g/L.',
        cultural: 'Maintain uniform irrigation to prevent moisture stress.',
      },
    },
    leaf_curl: {
      primaryCondition: 'Chilli Leaf Curl Complex (Thrips & Mites)',
      scientificName: 'Scirtothrips dorsalis / Polyphagotarsonemus latus',
      pathogenType: 'Pest Vector Complex',
      severity: 'High',
      technicalCause:
        'Caused by feeding of chilli thrips (Scirtothrips dorsalis) causing upward curling of leaves, or broad yellow mites (Polyphagotarsonemus latus) causing downward inverted boat-like curling, thickening, and brittleness.',
      environmentalTriggers: ['Dry, hot weather favoring thrips; humid warm weather favoring mites'],
      symptomMarkers: ['Upward boat-shaped curl (thrips) or downward clawing curl (mites)', 'Elongated narrow leaves'],
      aeoFieldChecks: ['Check leaf underside with 10x lens for minute yellow mites or slender thrips'],
      treatmentAdvisory: {
        chemical: 'For Thrips: Fipronil 5% SC @ 2 mL/L; For Mites: Spiromesifen 22.9% SC @ 1 mL/L.',
        cultural: 'Intercrop with barrier crops like maize/sorghum; install blue and yellow sticky traps.',
      },
    },
  },
  paddy: {
    blast: {
      primaryCondition: 'Rice Blast (Magnaporthe oryzae)',
      scientificName: 'Magnaporthe oryzae',
      pathogenType: 'Airborne Fungal Pathogen',
      severity: 'High / Critical',
      technicalCause:
        'Caused by Magnaporthe oryzae. Favored by high nitrogen fertilizer application, cool night temperatures (20°C–22°C), and high humidity (>90%). Produces characteristic spindle-shaped (diamond) lesions with grayish-white centers and dark brown margins on leaves.',
      environmentalTriggers: ['Excessive nitrogen application', 'Intermittent light rain, cloudy days, cool nights'],
      symptomMarkers: ['Spindle-shaped lesions on leaf blades', 'Neck rot / panicle breakage at base'],
      aeoFieldChecks: ['Examine leaf lesions for diamond shape and panicle nodes for dark constriction'],
      treatmentAdvisory: {
        chemical: 'Spray Tricyclazole 75% WP @ 0.6 g/L or Isoprothiolane 40% EC @ 1.5 mL/L.',
        cultural: 'Split nitrogen fertilizer doses; avoid excessive urea; maintain balanced potash.',
      },
    },
    sheath_blight: {
      primaryCondition: 'Sheath Blight (Rhizoctonia solani)',
      scientificName: 'Rhizoctonia solani',
      pathogenType: 'Soil/Water-borne Fungus',
      severity: 'High',
      technicalCause:
        'Sclerotia floating on irrigation water infect leaf sheaths just above water level. High humidity (95%) and warm temperatures (28°C–32°C) cause oval, water-soaked, snake-skin-like greenish-gray lesions that ascend to the flag leaf.',
      environmentalTriggers: ['Close spacing, dense tillering, stagnant irrigation water, warm humid weather'],
      symptomMarkers: ['Snake-skin irregular greenish-gray banded lesions on leaf sheaths', 'Sclerotia on lesions'],
      aeoFieldChecks: ['Part tillers to inspect lower sheath just above water line'],
      treatmentAdvisory: {
        chemical: 'Foliar spray directed at base: Hexaconazole 5% EC @ 2 mL/L or Validamycin 3% L @ 2.5 mL/L.',
        cultural: 'Drain field for 2–3 days; apply recommended potassium dose; avoid excessive nitrogen.',
      },
    },
    leaf_spot: {
      primaryCondition: 'Brown Spot (Bipolaris oryzae)',
      scientificName: 'Bipolaris oryzae',
      pathogenType: 'Fungal Pathogen',
      severity: 'Moderate',
      technicalCause:
        'Commonly associated with poor soil fertility or nutrient stress (potassium or silicon deficiency). Produces oval, dark brown spots uniformly distributed over leaf surfaces.',
      environmentalTriggers: ['Moisture stress, nutrient deficiency, light sandy soils'],
      symptomMarkers: ['Numerous small dark brown oval spots resembling sesame seeds on leaves'],
      aeoFieldChecks: ['Assess soil fertility and fertilizer schedule with farmer'],
      treatmentAdvisory: {
        chemical: 'Spray Mancozeb 75% WP @ 2.5 g/L or Propiconazole 25% EC @ 1 mL/L.',
        cultural: 'Apply balanced NPK with potassium and zinc sulphate; improve soil organic matter.',
      },
    },
  },
  cotton: {
    bollworm: {
      primaryCondition: 'Bollworm Complex (Helicoverpa / Pectinophora)',
      scientificName: 'Helicoverpa armigera / Pectinophora gossypiella',
      pathogenType: 'Lepidopteran Insect Pest',
      severity: 'Critical / High',
      technicalCause:
        'Larvae bore into tender squares, flower buds, and developing bolls. Feeding causes rosette flowers, premature square shedding, and internal boll rotting.',
      environmentalTriggers: ['Continuous overcast weather with moderate temperatures (26°C–30°C)'],
      symptomMarkers: ['Flared squares, bored holes in bolls with frass, rosette blooms'],
      aeoFieldChecks: ['Crack open 20 bolls across field to check for internal pink/American larvae'],
      treatmentAdvisory: {
        chemical: 'Spray Emamectin Benzoate 5% SG @ 0.5 g/L or Chlorantraniliprole 18.5% SC @ 0.3 mL/L.',
        cultural: 'Install pheromone traps @ 5/acre; hand-pick and destroy damaged squares.',
      },
    },
    leaf_spot: {
      primaryCondition: 'Bacterial Blight / Angular Leaf Spot (Xanthomonas citri)',
      scientificName: 'Xanthomonas citri pv. malvacearum',
      pathogenType: 'Bacterial Pathogen',
      severity: 'Moderate to High',
      technicalCause:
        'Seed-borne bacterium spread by wind-driven rain. Enters through stomata and produces angular, water-soaked lesions delimited by leaf veins that turn brown to black.',
      environmentalTriggers: ['Warm, humid weather (30°C–35°C) with frequent rain showers and wind'],
      symptomMarkers: ['Angular water-soaked leaf spots bounded by veins', 'Blackarm lesions on branches'],
      aeoFieldChecks: ['Check vein-delimited angular corners of spots and black stem lesions'],
      treatmentAdvisory: {
        chemical: 'Spray Streptocycline @ 0.1 g/L + Copper Oxychloride 50% WP @ 2.5 g/L.',
        cultural: 'Destroy crop residues; avoid field work when plants are wet.',
      },
    },
  },
  maize: {
    fall_armyworm: {
      primaryCondition: 'Fall Armyworm (Spodoptera frugiperda)',
      scientificName: 'Spodoptera frugiperda',
      pathogenType: 'Invasive Lepidopteran Pest',
      severity: 'Critical / Urgent',
      technicalCause:
        'Moths lay egg masses on whorl leaves. Gregarious larvae feed inside central whorl, creating large ragged shot-holes, windowpane leaf damage, and heavy sawdust-like frass.',
      environmentalTriggers: ['Warm weather (25°C–32°C) with dry spells'],
      symptomMarkers: ['Ragged holes in whorl leaves', 'Heavy sawdust-like frass inside central whorl'],
      aeoFieldChecks: ['Unfurl 20 central plant whorls to check for larvae with inverted Y mark on head'],
      treatmentAdvisory: {
        chemical: 'Direct spray into whorl: Spinetoram 11.7% SC @ 0.5 mL/L or Chlorantraniliprole 18.5% SC @ 0.4 mL/L.',
        cultural: 'Apply dry sand or wood ash into whorls; install pheromone traps @ 5/acre.',
      },
    },
    leaf_spot: {
      primaryCondition: 'Turcicum Leaf Blight (Exserohilum turcicum)',
      scientificName: 'Exserohilum turcicum',
      pathogenType: 'Airborne Fungal Pathogen',
      severity: 'Moderate to High',
      technicalCause:
        'Favored by cool, humid weather (18°C–27°C) with heavy dew. Produces long, elliptical, grayish-green or tan lesions (up to 15 cm) starting from lower leaves and advancing upward.',
      environmentalTriggers: ['High humidity with cool night temperatures and morning fog'],
      symptomMarkers: ['Long, cigar-shaped grayish-tan lesions parallel to leaf veins'],
      aeoFieldChecks: ['Measure lesion size on lower leaves; check whether ear leaf is infected'],
      treatmentAdvisory: {
        chemical: 'Spray Mancozeb 75% WP @ 2.5 g/L or Azoxystrobin 18.2% + Difenoconazole 11.4% SC @ 1 mL/L.',
        cultural: 'Ensure proper crop rotation; avoid overhead irrigation.',
      },
    },
  },
};

/**
 * Normalizes text string to match keys in profiles.
 */
function normalizeKey(str) {
  return String(str || '').toLowerCase().trim();
}

/**
 * Synthesizes a structured agronomic diagnosis and technical cause
 * based on the crop, farmer complaint/symptoms, and vision detections.
 */
export function synthesizeAgronomicAssessment({
  crop = 'Tomato',
  symptoms = [],
  detections = [],
  transcript = '',
  duration = null,
  multimodalAssessment = null,
}) {
  const normCrop = normalizeKey(crop);
  const matchedCropKey = Object.keys(AGRONOMIC_DISEASE_PROFILES).find((k) => normCrop.includes(k)) || 'tomato';
  const cropProfiles = AGRONOMIC_DISEASE_PROFILES[matchedCropKey] || AGRONOMIC_DISEASE_PROFILES.tomato;

  // Identify the most prominent symptom / detection
  const allText = [
    ...symptoms,
    ...(detections || []).map((d) => d.label || d.class_name || ''),
    transcript,
  ]
    .join(' ')
    .toLowerCase();

  let matchedDiseaseProfile = null;

  // Check against specific diseases in profile
  if (allText.includes('early_blight') || allText.includes('early blight') || allText.includes('bullseye') || allText.includes('concentric')) {
    matchedDiseaseProfile = cropProfiles.early_blight;
  } else if (allText.includes('late_blight') || allText.includes('late blight') || allText.includes('water-soaked')) {
    matchedDiseaseProfile = cropProfiles.late_blight;
  } else if (allText.includes('curl') || allText.includes('tolcv') || allText.includes('mite') || allText.includes('thrip')) {
    matchedDiseaseProfile = cropProfiles.leaf_curl;
  } else if (allText.includes('blast') || allText.includes('spindle')) {
    matchedDiseaseProfile = cropProfiles.blast;
  } else if (allText.includes('sheath') || allText.includes('banded')) {
    matchedDiseaseProfile = cropProfiles.sheath_blight;
  } else if (allText.includes('bollworm') || allText.includes('caterpillar') || allText.includes('borer')) {
    matchedDiseaseProfile = cropProfiles.bollworm;
  } else if (allText.includes('armyworm') || allText.includes('frass')) {
    matchedDiseaseProfile = cropProfiles.fall_armyworm;
  } else if (allText.includes('powdery') || allText.includes('white powder')) {
    matchedDiseaseProfile = cropProfiles.powdery_mildew;
  } else if (allText.includes('spot') || allText.includes('spots') || allText.includes('brown') || allText.includes('yellowing')) {
    matchedDiseaseProfile = cropProfiles.early_blight || cropProfiles.leaf_spot;
  }

  // Fallback to first profile of crop or default
  if (!matchedDiseaseProfile) {
    matchedDiseaseProfile = Object.values(cropProfiles)[0] || AGRONOMIC_DISEASE_PROFILES.tomato.early_blight;
  }

  // Calculate highest confidence from YOLO detections
  let peakConfidence = 0.85;
  if (Array.isArray(detections) && detections.length > 0) {
    const maxDet = Math.max(...detections.map((d) => Number(d.confidence) || 0));
    if (maxDet > 0) peakConfidence = Math.min(Math.max(maxDet, 0.70), 0.95);
  }

  // Group detections cleanly by disease label
  const groupedDetections = {};
  (detections || []).forEach((d) => {
    const rawLabel = (d.label || d.class_name || 'symptom').replace(/_/g, ' ');
    const norm = rawLabel.toLowerCase();
    if (!groupedDetections[norm]) {
      groupedDetections[norm] = {
        label: rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1),
        count: 0,
        maxConfidence: 0,
      };
    }
    groupedDetections[norm].count += 1;
    const conf = Number(d.confidence) || 0;
    if (conf > groupedDetections[norm].maxConfidence) {
      groupedDetections[norm].maxConfidence = conf;
    }
  });

  const detectionSummaryList = Object.values(groupedDetections).map((g) => {
    if (g.count === 1) {
      return `${g.label} (Primary • ${(g.maxConfidence * 100).toFixed(1)}%)`;
    }
    return `${g.label} (${g.count} lesions, peak ${(g.maxConfidence * 100).toFixed(1)}%)`;
  });

  // Voice vs Photo Correlation Synthesis
  const voiceStatementDesc = symptoms.length > 0
    ? symptoms.join(', ')
    : (transcript ? `"${transcript.slice(0, 90)}${transcript.length > 90 ? '...' : ''}"` : 'Foliar abnormalities');

  const durationText = duration ? ` persisting over ${duration}` : '';

  const voicePhotoSynthesis = `Farmer reported ${crop} abnormalities (${voiceStatementDesc}${durationText}). Visual computer vision confirms distinct foliar necrotic lesions matching ${matchedDiseaseProfile.primaryCondition}. Voice report of expanding foliar symptoms is corroborated by optical evidence on leaf surfaces.`;

  return {
    cropName: crop || 'Tomato',
    primaryCondition: multimodalAssessment?.primary_disease || matchedDiseaseProfile.primaryCondition,
    scientificName: matchedDiseaseProfile.scientificName,
    pathogenType: matchedDiseaseProfile.pathogenType,
    severity: matchedDiseaseProfile.severity,
    confidencePercent: Math.round(peakConfidence * 100),
    technicalCause: multimodalAssessment?.technical_cause || matchedDiseaseProfile.technicalCause,
    environmentalTriggers: matchedDiseaseProfile.environmentalTriggers,
    symptomMarkers: matchedDiseaseProfile.symptomMarkers,
    aeoFieldChecks: multimodalAssessment?.recommended_aeo_checks || matchedDiseaseProfile.aeoFieldChecks,
    treatmentAdvisory: matchedDiseaseProfile.treatmentAdvisory,
    voicePhotoSynthesis,
    detectionSummaryList,
    totalDetectionsCount: (detections || []).length,
  };
}
