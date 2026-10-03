import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getCropPlanningRecommendations, selectCropForFarm, getUnifiedFarmContext } from '../services/api';
import './PlanMyCropPage.css';

export default function PlanMyCropPage() {
  const { currentLang } = useLanguage();
  const navigate = useNavigate();

  // Form State
  const [acres, setAcres] = useState(2);
  const [soilType, setSoilType] = useState('BLACK'); // 'BLACK' | 'RED'
  const [location, setLocation] = useState(null); // { latitude, longitude, label }
  const [locLoading, setLocLoading] = useState(true);
  const [locError, setLocError] = useState(null);
  const [existingFields, setExistingFields] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState(null);

  // Submission State
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [expandedIndex, setExpandedIndex] = useState(0);

  // Confirmation Step State
  const [selectedCropConfirm, setSelectedCropConfirm] = useState(null);
  const [plantedToday, setPlantedToday] = useState(true);
  const [cropAgeDays, setCropAgeDays] = useState(1);
  const [submittingCrop, setSubmittingCrop] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Farmer Context Pre-load
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kisaansathi_farmer_profile');
      if (saved) {
        const p = JSON.parse(saved);
        if (p.phone) {
          getUnifiedFarmContext({ phone: p.phone }).then((ctx) => {
            if (ctx?.success) {
              if (ctx.farm?.default_soil_type) setSoilType(ctx.farm.default_soil_type);
              if (ctx.farm?.total_area) setAcres(Number(ctx.farm.total_area));
              if (ctx.fields && ctx.fields.length > 0) {
                setExistingFields(ctx.fields);
                setSelectedFieldId(ctx.fields[0].id);
              }
            }
          }).catch(() => { });
        }
      }
    } catch { }
  }, []);

  // Translations dictionary for Plan My Crop
  const texts = {
    en: {
      pageTitle: 'Plan My Crop',
      pageSubtitle: 'Find the most profitable and suitable crops tailored to your land, soil, and season.',
      howMuchLand: 'How much land do you have?',
      acresLabel: 'Acres',
      soilTypeHeading: 'Select Soil Type',
      blackSoilTitle: 'Black Soil',
      blackSoilSubtitle: 'High moisture retention, clayey, ideal for cotton & pulses',
      redSoilTitle: 'Red Soil',
      redSoilSubtitle: 'Well-drained, loamy/chalka, ideal for groundnut & vegetables',
      locationHeading: 'Your Location',
      locatingText: 'Detecting your farm location...',
      locationDetected: 'Location automatically detected',
      locationDenied: 'Location access was not granted. Using regional agro-climatic defaults.',
      retryLocation: 'Retry GPS Detection',
      btnGetSuggestions: '🌱 Get Crop Suggestions',
      btnLoading: 'Analyzing Soil & Season with AI...',
      resultsHeading: 'Recommended Crops for Your Land',
      contextLocation: 'Location',
      contextSeason: 'Season',
      contextSoil: 'Soil',
      contextLand: 'Land Area',
      whySuitable: 'Why this suits your land:',
      investmentHeading: 'Estimated Investment',
      returnHeading: 'Estimated Return',
      perAcre: 'Per Acre',
      forYourLand: 'For your',
      estimatedTag: 'Estimated',
      durationLabel: 'Duration to Harvest:',
      keyRiskLabel: 'Key Care / Risk:',
      govSupportTitle: 'Government Support & Schemes',
      whatSupports: 'What it supports:',
      howToApply: 'Where/how to apply:',
      sourceLabel: 'Verified Source:',
      govNotice: 'Government support information is provided for guidance. Final eligibility and subsidies are subject to official verification by the Agriculture Department.',
      planAnother: '← Plan Another Plot',
      continueWithCrop: 'Continue with',
      confirmTitle: "You're starting with",
      confirmSubtitle: 'Your crop plan will now be added to My Farm as an active crop cycle.',
      didYouPlantToday: 'Did you plant this crop today?',
      yesStartedToday: '🌱 Yes, started today (Day 1)',
      noPlantedEarlier: '⏳ No, I planted it earlier',
      whenPlanted: 'How many days ago did you plant?',
      daysAgo: 'days ago',
      confirmAddBtn: '✓ Confirm & Add to My Farm',
      changeCropBtn: '← Change Crop',
      submittingText: 'Adding to your farm...',
      existingFieldContext: 'Planning for:',
    },
    te: {
      pageTitle: 'పంట ప్రణాళిక (Plan My Crop)',
      pageSubtitle: 'మీ నేల రకం, భూమి విస్తీర్ణం మరియు ప్రస్తుత కాలానికి సరిపోయే లాభదాయకమైన పంటల సలహాలు.',
      howMuchLand: 'మీకు ఎంత భూమి ఉంది?',
      acresLabel: 'ఎకరాలు',
      soilTypeHeading: 'నేల రకాన్ని ఎంచుకోండి',
      blackSoilTitle: 'నల్లరేగడి నేల (Black Soil)',
      blackSoilSubtitle: 'తేమ నిల్వ సామర్థ్యం ఎక్కువ, పత్తి మరియు పప్పుధాన్యాలకు అనుకూలం',
      redSoilTitle: 'ఎర్ర నేల (Red Soil)',
      redSoilSubtitle: 'తేలికపాటి గరప నేల, వేరుశనగ మరియు కూరగాయలకు శ్రేష్టం',
      locationHeading: 'మీ స్థానం (Location)',
      locatingText: 'మీ పొలం స్థానాన్ని గుర్తిస్తున్నాము...',
      locationDetected: 'స్థానం స్వయంచాలకంగా గుర్తించబడింది',
      locationDenied: 'లొకేషన్ అనుమతి లభించలేదు. ప్రాంతీయ సాధారణ సమాచారం ఉపయోగించబడుతుంది.',
      retryLocation: 'మళ్లీ గుర్తించు',
      btnGetSuggestions: '🌱 పంటల సిఫార్సులు పొందండి',
      btnLoading: 'నేల మరియు కాలాన్ని విశ్లేషిస్తున్నాము...',
      resultsHeading: 'మీ భూమికి సిఫార్సు చేయబడిన పంటలు',
      contextLocation: 'ప్రాంతం',
      contextSeason: 'కాలం',
      contextSoil: 'నేల రకం',
      contextLand: 'భూమి విస్తీర్ణం',
      whySuitable: 'ఈ పంట ఎందుకు అనుకూలం:',
      investmentHeading: 'అంచనా పెట్టుబడి',
      returnHeading: 'అంచనా రాబడి',
      perAcre: 'ఎకరానికి',
      forYourLand: 'మీ',
      estimatedTag: 'అంచనా',
      durationLabel: 'పంట కాల పరిమితి:',
      keyRiskLabel: 'జాగ్రత్తలు / చీడపీడల నియంత్రణ:',
      govSupportTitle: 'ప్రభుత్వ సహాయం & పథకాలు',
      whatSupports: 'పథకం ప్రయోజనం:',
      howToApply: 'ఎలా దరఖాస్తు చేసుకోవాలి:',
      sourceLabel: 'ధృవీకరించిన మూలం:',
      govNotice: 'ప్రభుత్వ పథకాల సమాచారం అవగాహన కొరకు మాత్రమే. తుది అర్హత మరియు రాయితీలను వ్యవసాయ శాఖ అధికారులు ధృవీకరిస్తారు.',
      planAnother: '← మరొక పొలానికి ప్రణాళిక చేయండి',
      continueWithCrop: 'ఈ పంటతో కొనసాగించండి',
      confirmTitle: 'మీరు ఎంచుకున్న పంట:',
      confirmSubtitle: 'ఈ పంట ప్రణాళిక మీ "నా పొలం" లో చేర్చబడుతుంది.',
      didYouPlantToday: 'మీరు ఈ పంటను ఈరోజే వేశారా?',
      yesStartedToday: '🌱 అవును, ఈరోజే వేశాను (1వ రోజు)',
      noPlantedEarlier: '⏳ లేదు, ముందే వేశాను',
      whenPlanted: 'ఎన్ని రోజుల క్రితం వేశారు?',
      daysAgo: 'రోజుల క్రితం',
      confirmAddBtn: '✓ నిర్ధారించి నా పొలంలో చేర్చండి',
      changeCropBtn: '← వేరే పంట ఎంచుకోండి',
      submittingText: 'మీ పొలంలో చేరుస్తున్నాము...',
      existingFieldContext: 'ఎంచుకున్న పొలం:',
    },
    hi: {
      pageTitle: 'फसल योजना (Plan My Crop)',
      pageSubtitle: 'अपनी जमीन, मिट्टी और मौसम के अनुसार सबसे उपयुक्त और लाभदायक फसलों की जानकारी पाएं।',
      howMuchLand: 'आपके पास कितनी जमीन है?',
      acresLabel: 'एकड़',
      soilTypeHeading: 'मिट्टी का प्रकार चुनें',
      blackSoilTitle: 'काली मिट्टी (Black Soil)',
      blackSoilSubtitle: 'नमी सोखने वाली गहरी मिट्टी, कपास और दलहन के लिए उत्तम',
      redSoilTitle: 'लाल मिट्टी (Red Soil)',
      redSoilSubtitle: 'भुरभुरी, जल निकासी वाली मिट्टी, मूंगफली और सब्जियों के लिए सही',
      locationHeading: 'आपका स्थान (Location)',
      locatingText: 'आपके खेत का स्थान खोजा जा रहा है...',
      locationDetected: 'स्थान स्वतः पहचाना गया',
      locationDenied: 'स्थान अनुमति नहीं मिली। क्षेत्रीय मानक उपयोग किए जा रहे हैं।',
      retryLocation: 'पुनः प्रयास करें',
      btnGetSuggestions: '🌱 उपयुक्त फसल सुझाव देखें',
      btnLoading: 'मिट्टी और मौसम का विश्लेषण जारी है...',
      resultsHeading: 'आपकी भूमि के लिए अनुशंसित फसलें',
      contextLocation: 'स्थान',
      contextSeason: 'मौसम',
      contextSoil: 'मिट्टी',
      contextLand: 'जमीन का रकबा',
      whySuitable: 'यह फसल क्यों उपयुक्त है:',
      investmentHeading: 'अनुमानित लागत / निवेश',
      returnHeading: 'अनुमानित आय / मुनाफा',
      perAcre: 'प्रति एकड़',
      forYourLand: 'आपके',
      estimatedTag: 'अनुमानित',
      durationLabel: 'फसल अवधि:',
      keyRiskLabel: 'मुख्य सावधानी / कीट नियंत्रण:',
      govSupportTitle: 'सरकारी योजनाएं और सहायता',
      whatSupports: 'योजना से लाभ:',
      howToApply: 'आवेदन प्रक्रिया:',
      sourceLabel: 'सत्यापित स्रोत:',
      govNotice: 'सरकारी सहायता की जानकारी मार्गदर्शन हेतु है। अंतिम पात्रता कृषि विभाग द्वारा सत्यापित की जाती है।',
      planAnother: '← दूसरे खेत के लिए योजना बनाएं',
      continueWithCrop: 'इस फसल के साथ आगे बढ़ें',
      confirmTitle: 'आपकी चुनी हुई फसल:',
      confirmSubtitle: 'यह फसल योजना आपके "मेरा खेत" में जोड़ दी जाएगी।',
      didYouPlantToday: 'क्या आपने यह फसल आज बोई है?',
      yesStartedToday: '🌱 हाँ, आज ही बोई (दिन 1)',
      noPlantedEarlier: '⏳ नहीं, पहले बोई थी',
      whenPlanted: 'कितने दिन पहले बोई थी?',
      daysAgo: 'दिन पहले',
      confirmAddBtn: '✓ पुष्टि करें और मेरे खेत में जोड़ें',
      changeCropBtn: '← दूसरी फसल चुनें',
      submittingText: 'खेत में जोड़ा जा रहा है...',
      existingFieldContext: 'खेत:',
    },
  };

  const t = texts[currentLang] || texts.en;

  // 1. Fetch Geolocation automatically on mount
  const detectLocation = () => {
    setLocLoading(true);
    setLocError(null);

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocation({
            latitude: lat,
            longitude: lng,
            label: `${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E`,
          });
          setLocLoading(false);
        },
        (err) => {
          console.warn('[CropPlanning] Geolocation error:', err.message);
          setLocError(t.locationDenied);
          // Graceful fallback coordinate (Telangana/Andhra central coordinates)
          setLocation({
            latitude: 17.448,
            longitude: 78.672,
            label: 'Hyderabad Region, Telangana (Default)',
          });
          setLocLoading(false);
        },
        { enableHighAccuracy: false, timeout: 8000 }
      );
    } else {
      setLocError(t.locationDenied);
      setLocation({
        latitude: 17.448,
        longitude: 78.672,
        label: 'Hyderabad Region, Telangana (Default)',
      });
      setLocLoading(false);
    }
  };

  useEffect(() => {
    detectLocation();
  }, []);

  // Handle + / - Acre Stepper
  const handleAcreChange = (delta) => {
    setAcres((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (next > 50) return 50;
      return next;
    });
  };

  // Submit to API
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const res = await getCropPlanningRecommendations({
        landAreaAcres: acres,
        soilType,
        latitude: location?.latitude,
        longitude: location?.longitude,
        language: currentLang || 'en',
      });

      if (res && res.success) {
        setResult(res);
      } else {
        setError('Could not generate crop recommendations. Please try again.');
      }
    } catch (err) {
      console.error('Failed to get crop recommendations:', err);
      setError(err.message || 'Error communicating with agricultural planning engine.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  // Handler to initiate crop selection confirmation
  const handleSelectCrop = (rec) => {
    setSelectedCropConfirm(rec);
    setPlantedToday(true);
    setCropAgeDays(1);
    setModalError(null);
  };

  // Handler to confirm and persist crop selection
  const handleConfirmCropSelection = async () => {
    if (!selectedCropConfirm) return;
    try {
      setSubmittingCrop(true);
      setModalError(null);
      setError(null);

      // Get farmer profile from localStorage or create sensible defaults
      let farmerPhone = '9876543210';
      let farmerName = 'Ramesh';
      try {
        const saved = localStorage.getItem('kisaansathi_farmer_profile');
        if (saved) {
          const p = JSON.parse(saved);
          if (p.phone) farmerPhone = p.phone;
          if (p.name) farmerName = p.name;
        }
      } catch { }

      const cropChosenName = selectedCropConfirm.crop_name || selectedCropConfirm.title || selectedCropConfirm.crop_name_en || 'Groundnut';

      const payload = {
        farmerPhone,
        farmerName,
        farmName: `${farmerName}'s Farm`,
        fieldName: selectedFieldId ? (existingFields.find(f => f.id === selectedFieldId)?.name || 'Main Field') : 'Main Field',
        fieldId: selectedFieldId || null,
        cropName: cropChosenName,
        areaAcres: Number(acres) || 2,
        landAreaAcres: Number(acres) || 2,
        soilType: soilType || 'BLACK',
        latitude: location?.latitude,
        longitude: location?.longitude,
        locationName: location?.label || 'Farm Location',
        plantedToday: Boolean(plantedToday),
        cropAgeDays: plantedToday ? 1 : (Number(cropAgeDays) || 1),
      };

      const res = await selectCropForFarm(payload);

      if (res && res.success) {
        // Update local farmer profile with active crop & farm context
        try {
          const updatedProfile = {
            phone: farmerPhone,
            name: farmerName,
            farm_id: res.farm?.id,
            field_id: res.field?.id,
            active_crop: cropChosenName,
            acres: Number(acres) || 2,
            soil_type: soilType,
            start_date: res.crop_cycle?.sowing_date || res.crop_cycle?.start_date,
            day_number: res.day_number || (plantedToday ? 1 : Number(cropAgeDays)),
          };
          localStorage.setItem('kisaansathi_farmer_profile', JSON.stringify(updatedProfile));
        } catch { }

        // Navigate to My Farm with success toast state
        navigate('/farm', {
          state: {
            cropAdded: true,
            cropName: cropChosenName,
            dayNumber: res.day_number || (plantedToday ? 1 : Number(cropAgeDays)),
            acres: Number(acres) || 2,
          }
        });
      } else {
        const msg = res?.detail?.message || res?.detail || res?.message || 'Failed to save crop cycle. Please try again.';
        setModalError(msg);
        setError(msg);
      }
    } catch (err) {
      console.error('Error selecting crop for farm:', err);
      const msg = err.message || 'Failed to connect to farm platform.';
      setModalError(msg);
      setError(msg);
    } finally {
      setSubmittingCrop(false);
    }
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* HEADER */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#ecfdf5', color: '#065f46', padding: '6px 16px', borderRadius: '20px', fontWeight: '700', fontSize: '0.875rem', marginBottom: '10px' }}>
          <span>🌾</span> Agricultural Decision Assistant
        </div>
        <h1 style={{ margin: '0 0 8px', fontSize: '2rem', fontWeight: '800', color: '#0f172a' }}>
          {t.pageTitle}
        </h1>
        <p style={{ margin: 0, fontSize: '1rem', color: '#475569', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
          {t.pageSubtitle}
        </p>
      </div>

      {/* MULTI-FIELD CONTEXT IF PRESENT */}
      {existingFields && existingFields.length > 0 && !result && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.25rem' }}>🏡</span>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: '#166534' }}>
                {t.existingFieldContext}
              </div>
              <div style={{ fontSize: '0.9375rem', fontWeight: '700', color: '#0f172a' }}>
                {existingFields.find(f => f.id === selectedFieldId)?.name || 'Existing Farm Field'} ({acres} Acres, {soilType} Soil)
              </div>
            </div>
          </div>
          {existingFields.length > 1 && (
            <select
              value={selectedFieldId || ''}
              onChange={(e) => {
                const fId = e.target.value;
                setSelectedFieldId(fId);
                const match = existingFields.find(f => f.id === fId);
                if (match) {
                  if (match.area_acres) setAcres(Number(match.area_acres));
                  if (match.soil_type) setSoilType(match.soil_type);
                }
              }}
              style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #86efac', backgroundColor: '#ffffff', fontWeight: '700', fontSize: '0.875rem', color: '#14532d' }}
            >
              {existingFields.map((f, idx) => (
                <option key={f.id || idx} value={f.id}>
                  {f.name || `Field ${idx + 1}`} ({f.area_acres || 2} acres)
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '14px 18px', borderRadius: '10px', marginBottom: '20px', fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>⚠️</span> {error}
        </div>
      )}

      {/* INPUT FORM (Visible when no result is displayed) */}
      {!result ? (
        <form onSubmit={handleSubmit} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '28px 24px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
          {/* 1. LAND AREA SELECTOR */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <label style={{ display: 'block', fontSize: '1.0625rem', fontWeight: '700', color: '#1e293b', marginBottom: '16px' }}>
              {t.howMuchLand}
            </label>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '20px', backgroundColor: '#f8fafc', padding: '12px 24px', borderRadius: '16px', border: '2px solid #e2e8f0' }}>
              <button
                type="button"
                data-testid="decrease-acres-btn"
                onClick={() => handleAcreChange(-1)}
                disabled={acres <= 1}
                aria-label="Decrease acres"
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  border: '2px solid #cbd5e1',
                  backgroundColor: acres <= 1 ? '#f1f5f9' : '#ffffff',
                  color: acres <= 1 ? '#94a3b8' : '#0f172a',
                  fontSize: '1.75rem',
                  fontWeight: '700',
                  cursor: acres <= 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                −
              </button>

              <div style={{ minWidth: '100px', textAlign: 'center' }}>
                <span data-testid="acres-count" style={{ display: 'block', fontSize: '3rem', fontWeight: '900', color: '#15803d', lineHeight: 1 }}>
                  {acres}
                </span>
                <span style={{ fontSize: '0.9375rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {acres === 1 ? 'Acre' : t.acresLabel}
                </span>
              </div>

              <button
                type="button"
                data-testid="increase-acres-btn"
                onClick={() => handleAcreChange(1)}
                disabled={acres >= 50}
                aria-label="Increase acres"
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  border: '2px solid #cbd5e1',
                  backgroundColor: acres >= 50 ? '#f1f5f9' : '#ffffff',
                  color: acres >= 50 ? '#94a3b8' : '#0f172a',
                  fontSize: '1.75rem',
                  fontWeight: '700',
                  cursor: acres >= 50 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* 2. SOIL TYPE SELECTION CARDS */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontSize: '1.0625rem', fontWeight: '700', color: '#1e293b', marginBottom: '14px', textAlign: 'center' }}>
              {t.soilTypeHeading}
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              {/* BLACK SOIL CARD */}
              <div
                role="button"
                data-testid="soil-black-btn"
                tabIndex={0}
                onClick={() => setSoilType('BLACK')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSoilType('BLACK'); }}
                style={{
                  border: soilType === 'BLACK' ? '3px solid #047857' : '2px solid #e2e8f0',
                  backgroundColor: soilType === 'BLACK' ? '#f0fdf4' : '#ffffff',
                  borderRadius: '16px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  boxShadow: soilType === 'BLACK' ? '0 8px 16px -4px rgba(4, 120, 87, 0.15)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.5rem' }}>🟤</span>
                  {soilType === 'BLACK' && (
                    <span style={{ backgroundColor: '#047857', color: '#ffffff', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8125rem', fontWeight: '800' }}>
                      ✓
                    </span>
                  )}
                </div>
                <div style={{ fontWeight: '800', fontSize: '1.1875rem', color: '#1e293b', marginBottom: '4px' }}>
                  {t.blackSoilTitle}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: 1.4 }}>
                  {t.blackSoilSubtitle}
                </div>
              </div>

              {/* RED SOIL CARD */}
              <div
                role="button"
                data-testid="soil-red-btn"
                tabIndex={0}
                onClick={() => setSoilType('RED')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSoilType('RED'); }}
                style={{
                  border: soilType === 'RED' ? '3px solid #b91c1c' : '2px solid #e2e8f0',
                  backgroundColor: soilType === 'RED' ? '#fef2f2' : '#ffffff',
                  borderRadius: '16px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  boxShadow: soilType === 'RED' ? '0 8px 16px -4px rgba(185, 28, 28, 0.15)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.5rem' }}>🔴</span>
                  {soilType === 'RED' && (
                    <span style={{ backgroundColor: '#b91c1c', color: '#ffffff', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8125rem', fontWeight: '800' }}>
                      ✓
                    </span>
                  )}
                </div>
                <div style={{ fontWeight: '800', fontSize: '1.1875rem', color: '#1e293b', marginBottom: '4px' }}>
                  {t.redSoilTitle}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: 1.4 }}>
                  {t.redSoilSubtitle}
                </div>
              </div>
            </div>
          </div>

          {/* 3. LOCATION INFORMATION */}
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px', marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1.5rem' }}>📍</span>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>
                  {t.locationHeading}
                </div>
                <div style={{ fontSize: '0.9375rem', fontWeight: '700', color: '#0f172a' }}>
                  {locLoading ? t.locatingText : (location?.label || t.locationDetected)}
                </div>
                {locError && (
                  <div style={{ fontSize: '0.75rem', color: '#ea580c', marginTop: '2px' }}>
                    {locError}
                  </div>
                )}
              </div>
            </div>

            {locError && (
              <button
                type="button"
                onClick={detectLocation}
                style={{ fontSize: '0.75rem', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer', fontWeight: '600' }}
              >
                🔄 {t.retryLocation}
              </button>
            )}
          </div>

          {/* 4. SUBMIT BUTTON */}
          <button
            type="submit"
            data-testid="submit-crop-planning"
            disabled={loading || locLoading}
            style={{
              width: '100%',
              padding: '16px 24px',
              backgroundColor: '#15803d',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1.125rem',
              fontWeight: '800',
              cursor: (loading || locLoading) ? 'not-allowed' : 'pointer',
              opacity: (loading || locLoading) ? 0.7 : 1,
              boxShadow: '0 4px 14px rgba(21, 128, 61, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'background-color 0.15s ease',
            }}
          >
            {loading ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
                {t.btnLoading}
              </>
            ) : (
              t.btnGetSuggestions
            )}
          </button>
        </form>
      ) : (
        /* RESULTS VIEW */
        <div>
          {/* CONTEXT SUMMARY CARD */}
          <div className="plan-results-summary-card">
            <div className="plan-summary-pills-row">
              <div className="plan-summary-pill">
                <span className="plan-summary-pill-label">📍 {t.contextLocation}</span>
                <span className="plan-summary-pill-value">
                  {result.summary?.location_label || result.input?.location}
                </span>
              </div>

              <div className="plan-summary-pill">
                <span className="plan-summary-pill-label">🌱 {t.contextSeason}</span>
                <span className="plan-summary-pill-value" style={{ color: '#047857' }}>
                  {result.summary?.season_label}
                </span>
              </div>

              <div className="plan-summary-pill">
                <span className="plan-summary-pill-label">🌾 {t.contextSoil}</span>
                <span className="plan-summary-pill-value">
                  {result.summary?.soil_label}
                </span>
              </div>

              <div className="plan-summary-pill">
                <span className="plan-summary-pill-label">📐 {t.contextLand}</span>
                <span className="plan-summary-pill-value" style={{ color: '#15803d' }}>
                  {result.summary?.land_label}
                </span>
              </div>
            </div>

            <p className="plan-summary-intro">
              {result.summary?.intro_text}
            </p>
          </div>

          {/* RECOMMENDED CROPS HEADING */}
          <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🌱</span> {t.resultsHeading}
          </h2>

          {/* RECOMMENDED CROPS - MINIMAL & EXPANDABLE LIST */}
          <div className="plan-recommendations-list">
            {result.recommendations?.map((rec, index) => {
              const isExpanded = expandedIndex === index;

              return (
                <div
                  key={index}
                  className={`plan-crop-card-minimal ${isExpanded ? 'is-expanded' : ''}`}
                >
                  {/* Minimal Summary Row */}
                  <div
                    className="plan-crop-summary-row"
                    onClick={() => setExpandedIndex(isExpanded ? null : index)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpandedIndex(isExpanded ? null : index);
                      }
                    }}
                  >
                    <div className="plan-crop-summary-content">
                      <div className="plan-crop-header-row">
                        <span className="plan-crop-rank-badge">
                          {index + 1}
                        </span>
                        <h3 className="plan-crop-name">
                          {rec.crop_name}
                        </h3>
                        <span className="plan-crop-duration-badge">
                          ⏳ {rec.estimated_duration}
                        </span>
                        {rec.estimated_return_per_acre_min && (
                          <span className="plan-crop-return-chip">
                            📈 Est. ₹{rec.estimated_return_per_acre_min?.toLocaleString('en-IN')} – ₹{rec.estimated_return_per_acre_max?.toLocaleString('en-IN')} / acre
                          </span>
                        )}
                      </div>

                      <p className="plan-crop-teaser">
                        <strong style={{ color: '#0f172a' }}>{t.whySuitable} </strong>
                        {rec.reason}
                      </p>

                      <div className="plan-crop-action-footer">
                        <span className="plan-crop-expand-toggle">
                          {isExpanded ? '▴ Hide details' : '▾ Click to view full breakdown & care tips'}
                        </span>
                        <button
                          type="button"
                          className="btn-select-crop-inline"
                          data-testid={`continue-crop-${index}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectCrop(rec);
                          }}
                        >
                          🌱 {t.continueWithCrop}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detail Tray */}
                  {isExpanded && (
                    <div className="plan-crop-expanded-tray">
                      {/* Detailed Reason Box */}
                      <div className="plan-crop-reason-box">
                        <strong style={{ display: 'block', marginBottom: '4px', color: '#1e40af' }}>
                          💡 {t.whySuitable}
                        </strong>
                        {rec.reason}
                      </div>

                      {/* Financial Breakdown Grid */}
                      <div className="plan-finance-grid">
                        {/* Investment Box */}
                        <div className="plan-finance-box investment">
                          <div className="plan-finance-box-header">
                            <span className="plan-finance-box-title">
                              💰 {t.investmentHeading}
                            </span>
                            <span style={{ fontSize: '0.6875rem', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#ffedd5', color: '#c2410c' }}>
                              {t.estimatedTag}
                            </span>
                          </div>

                          <div className="plan-finance-rate" style={{ color: '#431407' }}>
                            {t.perAcre}: <strong>₹{rec.estimated_investment_per_acre?.toLocaleString('en-IN')}</strong>
                          </div>

                          <div className="plan-finance-total">
                            {t.forYourLand} {acres} {t.acresLabel}: ₹{rec.estimated_total_investment?.toLocaleString('en-IN')}
                          </div>
                        </div>

                        {/* Return Box */}
                        <div className="plan-finance-box revenue">
                          <div className="plan-finance-box-header">
                            <span className="plan-finance-box-title">
                              📈 {t.returnHeading}
                            </span>
                            <span style={{ fontSize: '0.6875rem', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#15803d' }}>
                              {t.estimatedTag}
                            </span>
                          </div>

                          <div className="plan-finance-rate" style={{ color: '#14532d' }}>
                            {t.perAcre}: <strong>₹{rec.estimated_return_per_acre_min?.toLocaleString('en-IN')} – ₹{rec.estimated_return_per_acre_max?.toLocaleString('en-IN')}</strong>
                          </div>

                          <div className="plan-finance-total">
                            {t.forYourLand} {acres} {t.acresLabel}: ₹{rec.estimated_total_return_min?.toLocaleString('en-IN')} – ₹{rec.estimated_total_return_max?.toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>

                      {/* Key Risk / Precaution */}
                      {rec.risk_note && (
                        <div className="plan-risk-box">
                          <strong style={{ color: '#b45309' }}>⚠️ {t.keyRiskLabel} </strong>
                          {rec.risk_note}
                        </div>
                      )}

                      {/* Expanded CTA Bar */}
                      <div className="plan-expanded-cta-bar">
                        <button
                          type="button"
                          className="btn-proceed-crop-large"
                          onClick={() => handleSelectCrop(rec)}
                        >
                          <span>🌱</span> {t.continueWithCrop} {rec.crop_name}
                        </button>
                        <button
                          type="button"
                          className="btn-collapse-crop-tray"
                          onClick={() => setExpandedIndex(null)}
                        >
                          ⌃ Collapse
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* GOVERNMENT SCHEMES & SUPPORT SECTION */}
          <div className="plan-schemes-card">
            <h3 style={{ margin: '0 0 8px', fontSize: '1.1875rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🏛️</span> {t.govSupportTitle}
            </h3>

            {result.has_government_support && result.government_support?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                {result.government_support.map((sch, i) => (
                  <div key={i} className="plan-scheme-item">
                    <div style={{ fontWeight: '800', fontSize: '0.98rem', color: '#1e40af', marginBottom: '6px' }}>
                      📋 {sch.name}
                    </div>
                    <div style={{ fontSize: '0.825rem', color: '#334155', marginBottom: '4px' }}>
                      <strong>{t.whatSupports}</strong> {sch.what_it_supports}
                    </div>
                    <div style={{ fontSize: '0.825rem', color: '#0369a1', marginBottom: '4px', fontWeight: '600' }}>
                      💡 {sch.relevance}
                    </div>
                    <div style={{ fontSize: '0.825rem', color: '#475569', marginBottom: '4px' }}>
                      <strong>{t.howToApply}</strong> {sch.how_to_apply}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      <strong>{t.sourceLabel}</strong> {sch.source}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', color: '#64748b', fontSize: '0.875rem', marginTop: '10px' }}>
                ℹ️ {result.government_support_unavailable_message || 'Government support information is currently unavailable for this recommendation.'}
              </div>
            )}

            <div style={{ marginTop: '14px', fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
              {t.govNotice}
            </div>
          </div>

          {/* DISCLAIMER BOX */}
          <div style={{ backgroundColor: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '14px 18px', marginBottom: '28px', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
            <strong>📌 Disclaimer:</strong> {result.disclaimer}
          </div>

          {/* RESET BUTTON */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <button
              type="button"
              data-testid="plan-another-btn"
              onClick={handleReset}
              style={{
                padding: '12px 28px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontWeight: '700',
                fontSize: '0.925rem',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                transition: 'all 0.15s ease',
              }}
            >
              {t.planAnother}
            </button>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL / BOTTOM SHEET */}
      {selectedCropConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            maxWidth: '520px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            animation: 'fadeIn 0.2s ease',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', margin: '0 auto 12px' }}>
                🌱
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.375rem', fontWeight: '900', color: '#0f172a' }}>
                {t.confirmTitle} {selectedCropConfirm.crop_name}
              </h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                {t.confirmSubtitle}
              </p>
            </div>

            {/* Farm Context Snapshot */}
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'block' }}>
                  📐 {t.contextLand}
                </span>
                <strong style={{ fontSize: '0.9375rem', color: '#0f172a' }}>{acres} {t.acresLabel}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'block' }}>
                  🌾 {t.contextSoil}
                </span>
                <strong style={{ fontSize: '0.9375rem', color: '#0f172a' }}>{soilType === 'BLACK' ? t.blackSoilTitle : t.redSoilTitle}</strong>
              </div>
            </div>

            {/* DID YOU PLANT TODAY? */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.9375rem', fontWeight: '800', color: '#1e293b', marginBottom: '10px' }}>
                {t.didYouPlantToday}
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <button
                  type="button"
                  data-testid="planted-today-yes"
                  onClick={() => setPlantedToday(true)}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: plantedToday ? '2px solid #15803d' : '1px solid #cbd5e1',
                    backgroundColor: plantedToday ? '#f0fdf4' : '#ffffff',
                    color: plantedToday ? '#15803d' : '#475569',
                    fontWeight: '800',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {t.yesStartedToday}
                </button>

                <button
                  type="button"
                  data-testid="planted-today-no"
                  onClick={() => setPlantedToday(false)}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: !plantedToday ? '2px solid #ea580c' : '1px solid #cbd5e1',
                    backgroundColor: !plantedToday ? '#fff7ed' : '#ffffff',
                    color: !plantedToday ? '#ea580c' : '#475569',
                    fontWeight: '800',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {t.noPlantedEarlier}
                </button>
              </div>

              {/* SOWING AGE STEPPER IF PLANTED EARLIER */}
              {!plantedToday && (
                <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '12px', padding: '14px', marginTop: '10px' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '700', color: '#9a3412', marginBottom: '8px' }}>
                    {t.whenPlanted}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setCropAgeDays(prev => Math.max(1, prev - 5))}
                      style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #fdba74', backgroundColor: '#ffffff', fontWeight: '800', cursor: 'pointer' }}
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() => setCropAgeDays(prev => Math.max(1, prev - 1))}
                      style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #fdba74', backgroundColor: '#ffffff', fontWeight: '800', cursor: 'pointer' }}
                    >
                      -1
                    </button>
                    <div style={{ flex: 1, textAlign: 'center', fontWeight: '900', fontSize: '1.25rem', color: '#c2410c' }}>
                      {cropAgeDays} {t.daysAgo}
                    </div>
                    <button
                      type="button"
                      onClick={() => setCropAgeDays(prev => Math.min(180, prev + 1))}
                      style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #fdba74', backgroundColor: '#ffffff', fontWeight: '800', cursor: 'pointer' }}
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => setCropAgeDays(prev => Math.min(180, prev + 5))}
                      style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #fdba74', backgroundColor: '#ffffff', fontWeight: '800', cursor: 'pointer' }}
                    >
                      +5
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ERROR ALERT IN MODAL IF ANY */}
            {modalError && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠️</span> {modalError}
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                data-testid="confirm-add-crop-btn"
                onClick={handleConfirmCropSelection}
                disabled={submittingCrop}
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: '#15803d',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '1rem',
                  cursor: submittingCrop ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(21, 128, 61, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {submittingCrop ? t.submittingText : t.confirmAddBtn}
              </button>

              <button
                type="button"
                onClick={() => setSelectedCropConfirm(null)}
                disabled={submittingCrop}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'transparent',
                  color: '#64748b',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                {t.changeCropBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
