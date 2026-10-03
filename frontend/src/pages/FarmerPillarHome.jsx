import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getUnifiedFarmContext, getFarmerProfile } from '../services/api';
import VoiceAssistantHero from '../components/VoiceAssistantHero';
import CropLifecycleCard from '../components/CropLifecycleCard';
import WeatherContextCard from '../components/WeatherContextCard';
import SoilProfileCard from '../components/SoilProfileCard';
import FarmMemoryTimeline from '../components/FarmMemoryTimeline';
import FarmMemoryView from '../components/FarmMemoryView';
import YieldHarvestPlannerCard from '../components/YieldHarvestPlannerCard';
import FarmAnalyticsCard from '../components/FarmAnalyticsCard';
import AlertNotificationBanner from '../components/AlertNotificationBanner';
import IrrigationDecisionCard from '../components/IrrigationDecisionCard';
import FertilizerAdvisoryCard from '../components/FertilizerAdvisoryCard';
import CropHealthCheckCard from '../components/CropHealthCheckCard';
import TodayPlanCard from '../components/TodayPlanCard';
import CommunityFeedSection from '../components/CommunityFeedSection';

export default function FarmerPillarHome() {
  const { currentLang, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // Active Tab: 'CROP' | 'PLAN' | 'COMMUNITY'
  const [activePillar, setActivePillar] = useState('CROP');

  // Success Banner State from Plan My Crop
  const [showSuccessBanner, setShowSuccessBanner] = useState(Boolean(location.state?.cropAdded));
  const newCropInfo = location.state || {};

  // Farmer & Farm Context State
  const [farmer, setFarmer] = useState(() => {
    try {
      const saved = localStorage.getItem('kisaansathi_farmer_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [farmContext, setFarmContext] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync auth events from navbar or other pages
  useEffect(() => {
    const handleAuth = () => {
      try {
        const saved = localStorage.getItem('kisaansathi_farmer_profile');
        if (saved) setFarmer(JSON.parse(saved));
      } catch {}
    };
    window.addEventListener('kisaansathi_auth_changed', handleAuth);
    return () => window.removeEventListener('kisaansathi_auth_changed', handleAuth);
  }, []);

  // Fetch Unified Farm Context
  const loadContext = async (phone) => {
    setLoading(true);
    try {
      const p = phone || farmer?.phone || '9876543210';
      const ctx = await getUnifiedFarmContext({ phone: p });
      if (ctx.success) {
        setFarmContext(ctx);
        if (ctx.farmer && (!farmer?.name || farmer?.name === 'Farmer')) {
          const updated = { ...farmer, ...ctx.farmer };
          setFarmer(updated);
          localStorage.setItem('kisaansathi_farmer_profile', JSON.stringify(updated));
        }
      }
    } catch (err) {
      console.warn('[FarmerPillarHome] Context load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContext(farmer?.phone);
  }, [farmer?.phone]);

  // Handle updates triggered by voice or 1-tap chips
  const handleContextUpdated = (updateResult) => {
    if (updateResult?.current_context || updateResult?.success) {
      loadContext(farmer?.phone);
    }
  };

  const activeCropName = farmContext?.crop?.crop_name || farmer?.active_crop || farmer?.crop || (farmContext?.crop_cycles?.[0]?.crop_name) || 'Cotton';
  const cropAge = farmContext?.cropStage?.crop_age_days ?? farmContext?.crop?.crop_age_days ?? 1;
  const fieldId = farmContext?.field?.id || 'demo-field-1';
  const cropCycleId = farmContext?.crop?.id || 'demo-crop-1';
  const hasActiveCrop = Boolean(farmContext?.crop || farmer?.active_crop || farmContext?.crop_cycles?.length > 0);

  return (
    <div className="farmer-pillar-container" style={{ maxWidth: '720px', margin: '0 auto', padding: '16px 16px 80px' }}>
      {/* SUCCESS TOAST / BANNER FROM PLAN MY CROP */}
      {showSuccessBanner && (
        <div
          data-testid="crop-added-banner"
          style={{
            backgroundColor: '#dcfce7',
            border: '2px solid #86efac',
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(22, 163, 74, 0.15)',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.75rem' }}>🌱</span>
            <div>
              <div style={{ fontWeight: '900', fontSize: '1.0625rem', color: '#14532d' }}>
                {currentLang === 'te' ? 'పంట విజయవంతంగా జోడించబడింది!' : 'Crop Plan Added to My Farm!'}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#166534', marginTop: '2px' }}>
                {currentLang === 'te'
                  ? `${newCropInfo.cropName || activeCropName} పంట ప్రణాళిక ప్రారంభమైంది. ఈరోజు 1వ రోజు.`
                  : `Your ${newCropInfo.cropName || activeCropName} crop is now active. Day ${newCropInfo.dayNumber || 1} begins today.`}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowSuccessBanner(false)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              color: '#15803d',
              cursor: 'pointer',
              fontWeight: '800',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* MULTI-FIELD SWITCHER BAR IF MULTIPLE FIELDS EXIST */}
      {farmContext?.fields && farmContext.fields.length > 1 && (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: '700', color: '#334155' }}>
            <span>🏡</span>
            <span>{currentLang === 'te' ? 'పొలం ఎంపిక:' : 'Active Field:'}</span>
            <span style={{ color: '#15803d' }}>{farmContext.field?.name || 'Field 1'} ({farmContext.field?.area_acres || 2} acres)</span>
          </div>
          <Link
            to="/plan-my-crop"
            style={{ fontSize: '0.8125rem', fontWeight: '700', color: '#15803d', textDecoration: 'none' }}
          >
            + {currentLang === 'te' ? 'వేరే పంట ప్రణాళిక' : 'Plan Next Crop'}
          </Link>
        </div>
      )}

      {/* Voice-First Assistant Hero */}
      <VoiceAssistantHero
        farmer={farmContext?.farmer || farmer || { name: 'రమేష్', phone: '9876543210', village: 'మేడ్చల్' }}
        activeCrop={activeCropName}
        cropAge={cropAge}
        farmContext={farmContext}
        onContextUpdated={handleContextUpdated}
      />

      {/* Proactive Farmer Alert Notification Banner */}
      <AlertNotificationBanner
        farmerPhone={farmer?.phone || '9876543210'}
        fieldId={fieldId}
        cropCycleId={cropCycleId}
        onActionClick={(action) => {
          if (action === 'VIEW_PLAN') setActivePillar('PLAN');
          else if (action === 'CHECK_CROP' || action === 'VIEW_CROP' || action === 'VIEW_RECOMMENDATION' || action === 'VIEW_HARVEST') {
            setActivePillar('CROP');
            if (action === 'CHECK_CROP') {
              setTimeout(() => {
                const el = document.getElementById('crop-health-check-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }, 150);
            }
          } else if (action === 'ASK_AEO' || action === 'VIEW_COMMUNITY') {
            setActivePillar('COMMUNITY');
          }
        }}
      />

      {/* THREE-PILLAR NAVIGATION TABS */}
      <div
        className="pillar-tabs-bar"
        data-testid="pillar-navigation-tabs"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '8px',
          backgroundColor: '#f1f5f9',
          padding: '6px',
          borderRadius: '16px',
          marginBottom: '20px',
        }}
      >
        <button
          type="button"
          onClick={() => setActivePillar('PLAN')}
          data-testid="pillar-tab-plan"
          style={{
            padding: '12px 8px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: activePillar === 'PLAN' ? '#ffffff' : 'transparent',
            color: activePillar === 'PLAN' ? '#0f172a' : '#64748b',
            fontWeight: '800',
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: activePillar === 'PLAN' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <span>📅</span> {currentLang === 'te' ? 'ప్రణాళిక' : 'PLAN'}
        </button>

        <button
          type="button"
          onClick={() => setActivePillar('CROP')}
          data-testid="pillar-tab-crop"
          style={{
            padding: '12px 8px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: activePillar === 'CROP' ? '#ffffff' : 'transparent',
            color: activePillar === 'CROP' ? '#16a34a' : '#64748b',
            fontWeight: '800',
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: activePillar === 'CROP' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <span>🌱</span> {currentLang === 'te' ? 'పంట' : 'CROP'}
        </button>

        <button
          type="button"
          onClick={() => setActivePillar('COMMUNITY')}
          data-testid="pillar-tab-community"
          style={{
            padding: '12px 8px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: activePillar === 'COMMUNITY' ? '#ffffff' : 'transparent',
            color: activePillar === 'COMMUNITY' ? '#0284c7' : '#64748b',
            fontWeight: '800',
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: activePillar === 'COMMUNITY' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <span>👥</span> {currentLang === 'te' ? 'కమ్యూనిటీ' : 'COMMUNITY'}
        </button>
      </div>

      {/* PILLAR 1: PLAN (📅) */}
      {activePillar === 'PLAN' && (
        <div className="pillar-content-plan" data-testid="pillar-content-plan">
          {/* Farm Analytics Overview */}
          <FarmAnalyticsCard
            farmId={farmContext?.farm?.id || 'demo-farm-1'}
            farmerPhone={farmer?.phone || '9876543210'}
          />

          {/* Today's Prioritized Farm Action Plan */}
          <TodayPlanCard
            fieldId={fieldId}
            cropCycleId={cropCycleId}
            farmerPhone={farmer?.phone || '9876543210'}
            onNavigateToTab={(tab) => setActivePillar(tab)}
          />

          {/* AI-Assisted Yield & Harvest Planning */}
          <YieldHarvestPlannerCard
            cropCycleId={cropCycleId}
            cropName={activeCropName}
            areaAcres={farmContext?.crop?.area || 2.0}
            farmerPhone={farmer?.phone || '9876543210'}
            onHarvestRecorded={() => loadContext(farmer?.phone)}
          />

          <div
            className="card"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '22px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ fontSize: '1.5rem' }}>🗓️</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>
                  {currentLang === 'te' ? 'రాబోయే కాలానికి పంట ప్రణాళిక' : 'Crop & Season Planning'}
                </h3>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {currentLang === 'te' ? 'మీ నేల రకం & విస్తీర్ణానికి అనుకూలమైన లాభదాయక పంటలు' : 'Optimal crops tailored to your soil & farm area'}
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.5, marginBottom: '18px' }}>
              {currentLang === 'te'
                ? 'మీ భూమి విస్తీర్ణం మరియు నేల ఆధారంగా అంచనా పెట్టుబడి, రాబడి మరియు ప్రభుత్వ సబ్సిడీలతో కూడిన 3-5 ఉత్తమ పంటల సిఫార్సులను పొందండి.'
                : 'Get top 3-5 tailored crop recommendations with whole-farm investment, estimated returns, and verified government schemes.'}
            </p>

            <Link
              to="/plan-my-crop"
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                fontSize: '0.95rem',
                fontWeight: '800',
                borderRadius: '12px',
                textDecoration: 'none',
                backgroundColor: '#16a34a',
                color: '#ffffff',
              }}
            >
              <span>🌱</span> {currentLang === 'te' ? 'పంట సిఫార్సులు చూడండి →' : 'Open Crop Planner →'}
            </Link>
          </div>

          {/* Seasonal Advisory Card */}
          <div
            style={{
              backgroundColor: '#fefce8',
              border: '1px solid #fef08a',
              borderRadius: '18px',
              padding: '18px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>🌾</span>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#854d0e' }}>
                {currentLang === 'te' ? 'ప్రస్తుత సీజన్ సలహా (Kharif / Rabi)' : 'Current Agro-Climatic Window'}
              </h4>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#713f12', lineHeight: 1.5 }}>
              {currentLang === 'te'
                ? 'తెలంగాణ ప్రాంతంలో ప్రస్తుత తేమ మరియు ఉష్ణోగ్రత పరిస్థితులకు మిరప, పత్తి, వేరుశనగ మరియు కూరగాయలు అనుకూలమైనవి. నీటి పారుదల ఆధారంగా పంటను ఎంచుకోండి.'
                : 'Optimal season for Chilli, Cotton, Groundnut and select vegetables. Choose drip-irrigated crops to maximize yield efficiency.'}
            </p>
          </div>
        </div>
      )}

      {/* PILLAR 2: CROP (🌱) */}
      {activePillar === 'CROP' && (
        <div className="pillar-content-crop" data-testid="pillar-content-crop">
          {/* Quick Check Crop Action Button */}
          <div style={{ marginBottom: '16px', display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('crop-health-check-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                flex: 1,
                padding: '14px 20px',
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '16px',
                fontSize: '1rem',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
              }}
            >
              <span>📸</span>
              <span>{currentLang === 'te' ? 'పంట ఆరోగ్యం తనిఖీ చేయండి (Check Crop)' : '📸 Check Crop Health'}</span>
            </button>
          </div>

          {/* 💧 Real-time Irrigation Intelligence Card */}
          <IrrigationDecisionCard
            fieldId={fieldId}
            cropCycleId={cropCycleId}
            farmerPhone={farmer?.phone || '9876543210'}
            onActivityLogged={() => loadContext(farmer?.phone)}
          />

          {/* 🧪 Fertilizer & Nutrient Advisory Card */}
          <FertilizerAdvisoryCard
            fieldId={fieldId}
            cropCycleId={cropCycleId}
            farmerPhone={farmer?.phone || '9876543210'}
            onActivityLogged={() => loadContext(farmer?.phone)}
          />

          {/* 🔍 Multimodal Crop Health Check */}
          <div id="crop-health-check-section">
            <CropHealthCheckCard
              fieldId={fieldId}
              cropCycleId={cropCycleId}
              farmerPhone={farmer?.phone || '9876543210'}
              onCaseCreated={() => loadContext(farmer?.phone)}
            />
          </div>

          {/* 🌾 AI Yield & Harvest Window Card */}
          <YieldHarvestPlannerCard
            cropCycleId={cropCycleId}
            cropName={activeCropName}
            areaAcres={farmContext?.crop?.area || 2.0}
            farmerPhone={farmer?.phone || '9876543210'}
            onHarvestRecorded={() => loadContext(farmer?.phone)}
          />

          {/* Crop Lifecycle Progress Stepper */}
          <CropLifecycleCard
            cropData={farmContext?.crop || { crop_name: activeCropName, area: 2.0, irrigation_method: 'drip' }}
            cropStageData={farmContext?.cropStage || { crop_age_days: cropAge, current_stage: 'Vegetative & Establishment', next_stage: 'Flowering', days_to_next_stage: 8, approx_harvest_window: 'Approx 90-110 days away' }}
          />

          {/* Real-time Weather Context Card */}
          <WeatherContextCard
            weatherData={farmContext?.weather || { available: true, temperature_c: 31.0, relative_humidity_pct: 58.0, precipitation_probability_pct: 10, weather_condition: 'Partly cloudy', wind_speed_kmh: 12.0, agricultural_hints: ['Favorable weather window for field operations and planned crop care.'] }}
          />

          {/* Soil Foundation Profile */}
          <SoilProfileCard
            soilData={farmContext?.soil || { soil_type: 'Red soil', is_verified: false, source: 'farmer_statement' }}
          />

          {/* Comprehensive Farm Memory / Automatic Diary */}
          <FarmMemoryView
            fieldId={fieldId}
            cropCycleId={cropCycleId}
            farmerPhone={farmer?.phone || '9876543210'}
          />
        </div>
      )}

      {/* PILLAR 3: COMMUNITY (👥) */}
      {activePillar === 'COMMUNITY' && (
        <div className="pillar-content-community" data-testid="pillar-content-community">
          <CommunityFeedSection
            farmerPhone={farmer?.phone || '9876543210'}
            cropName={activeCropName}
          />
        </div>
      )}
    </div>
  );
}
