import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getYieldEstimate, getHarvestPlan, getMarketPrices, createHarvestRecord } from '../services/api';

export default function YieldHarvestPlannerCard({
  farmerPhone = '9876543210',
  cropCycleId,
  fieldId,
}) {
  const { currentLang } = useLanguage();
  const [yieldData, setYieldData] = useState(null);
  const [harvestPlan, setHarvestPlan] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Harvest record form modal state
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [actualYieldKg, setActualYieldKg] = useState('');
  const [soldPrice, setSoldPrice] = useState('');
  const [recordSaved, setRecordSaved] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [yRes, hRes, mRes] = await Promise.all([
        getYieldEstimate({ farmerPhone, cropCycleId, fieldId }),
        getHarvestPlan({ farmerPhone, cropCycleId, fieldId }),
        getMarketPrices({ commodity: 'Chilli' })
      ]);
      setYieldData(yRes);
      setHarvestPlan(hRes);
      setMarketData(mRes);
    } catch (err) {
      console.warn('[YieldHarvestPlanner] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [farmerPhone, cropCycleId, fieldId]);

  const handleSaveHarvest = async () => {
    if (!actualYieldKg) return;
    try {
      const res = await createHarvestRecord({
        cropCycleId: cropCycleId || 'demo-cycle-1',
        farmerPhone,
        actualYieldKg: parseFloat(actualYieldKg),
        unit: 'kg',
        qualityGrade: 'Grade A',
        marketSoldPricePerUnit: soldPrice ? parseFloat(soldPrice) : null,
        notes: 'Harvest logged by farmer',
      });
      if (res.id || res.success !== false) {
        setRecordSaved(true);
        setShowRecordModal(false);
      }
    } catch (e) {
      console.error('Save harvest error:', e);
    }
  };

  return (
    <div
      className="card yield-harvest-card"
      data-testid="yield-harvest-card"
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        padding: '22px',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
        marginBottom: '20px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.4rem' }}>🌾</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
              {currentLang === 'te' ? 'దిగుబడి అంచనా & కోత ప్రణాళిక' : 'Yield Estimation & Harvest Planning'}
            </h3>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {currentLang === 'te' ? 'AI-సహాయక అంచనా & మార్కెట్ సమాచారం' : 'AI-Assisted Range & Weather-Aware Window'}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowRecordModal(true)}
          data-testid="open-record-harvest-btn"
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            color: '#166534',
            borderRadius: '10px',
            padding: '6px 12px',
            fontSize: '0.8rem',
            fontWeight: '700',
            cursor: 'pointer',
          }}
        >
          {currentLang === 'te' ? '+ వాస్తవ దిగుబడి నమోదు' : '+ Record Harvest'}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
          {currentLang === 'te' ? 'దిగుబడి అంచనా లెక్కిస్తున్నాము...' : 'Calculating yield estimate...'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* AI Yield Range Display */}
          {yieldData && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>
                  {currentLang === 'te' ? 'అంచనా దిగుబడి పరిధి (2 ఎకరాలు)' : 'Estimated Yield Range (2 Acres)'}
                </span>
                <span
                  style={{
                    backgroundColor: '#e0f2fe',
                    color: '#0369a1',
                    padding: '2px 8px',
                    borderRadius: '8px',
                    fontSize: '0.7rem',
                    fontWeight: '800',
                  }}
                >
                  AI-ASSISTED ESTIMATE
                </span>
              </div>

              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#065f46', marginBottom: '4px' }}>
                {yieldData.estimated_min_kg?.toLocaleString()} - {yieldData.estimated_max_kg?.toLocaleString()} {yieldData.estimated_unit || 'kg'}
              </div>

              <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', marginBottom: '12px' }}>
                ℹ️ {yieldData.disclaimer}
              </div>

              {/* Factors */}
              {yieldData.factors && yieldData.factors.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {yieldData.factors.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#334155' }}>
                      <span style={{ color: f.impact === 'POSITIVE' ? '#16a34a' : f.impact === 'NEGATIVE' ? '#dc2626' : '#64748b', fontWeight: '800' }}>
                        {f.impact === 'POSITIVE' ? '✓' : f.impact === 'NEGATIVE' ? '⚠' : '•'}
                      </span>
                      <span><strong>{f.name}:</strong> {f.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Harvest Window & Weather */}
          {harvestPlan && (
            <div
              style={{
                backgroundColor: '#fefce8',
                border: '1px solid #fef08a',
                borderRadius: '16px',
                padding: '16px',
              }}
            >
              <div style={{ fontWeight: '800', fontSize: '0.95rem', color: '#854d0e', marginBottom: '6px' }}>
                🌾 {currentLang === 'te' ? 'అంచనా కోత సమయం & వాతావరణం' : 'Harvest Window & Preparation'}
              </div>

              <div style={{ fontSize: '0.85rem', color: '#713f12', marginBottom: '6px' }}>
                <strong>{currentLang === 'te' ? 'అంచనా గడువు:' : 'Expected Window:'}</strong> {harvestPlan.expected_window_start} to {harvestPlan.expected_window_end} ({harvestPlan.days_to_harvest_window} days away)
              </div>

              <div style={{ fontSize: '0.8rem', color: '#713f12', marginBottom: '8px' }}>
                🌦️ <strong>{currentLang === 'te' ? 'వాతావరణ పరిశీలన:' : 'Weather Consideration:'}</strong> {harvestPlan.weather_consideration}
              </div>

              {harvestPlan.market_hint && (
                <div style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: '600' }}>
                  💰 <strong>Mandi:</strong> {harvestPlan.market_hint}
                </div>
              )}
            </div>
          )}

          {recordSaved && (
            <div style={{ backgroundColor: '#dcfce7', border: '1px solid #86efac', color: '#15803d', padding: '10px 14px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '700' }}>
              ✅ {currentLang === 'te' ? 'వాస్తవ దిగుబడి రికార్డు విజయవంతంగా భద్రపరచబడింది.' : 'Actual harvest record saved successfully in Farm Memory.'}
            </div>
          )}
        </div>
      )}

      {/* Record Harvest Modal */}
      {showRecordModal && (
        <div
          data-testid="record-harvest-modal"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '440px',
              width: '100%',
            }}
          >
            <h3 style={{ margin: '0 0 14px 0', fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
              {currentLang === 'te' ? 'వాస్తవ కోత దిగుబడి నమోదు' : 'Record Actual Measured Harvest'}
            </h3>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                {currentLang === 'te' ? 'మొత్తం దిగుబడి (kg)' : 'Actual Yield (kg)'}
              </label>
              <input
                type="number"
                data-testid="actual-yield-input"
                value={actualYieldKg}
                onChange={(e) => setActualYieldKg(e.target.value)}
                placeholder="e.g. 1650"
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                {currentLang === 'te' ? 'అమ్మిన ధర (రూ/క్వింటాల్ - ఐచ్ఛికం)' : 'Market Sold Price (₹/Quintal - Optional)'}
              </label>
              <input
                type="number"
                value={soldPrice}
                onChange={(e) => setSoldPrice(e.target.value)}
                placeholder="e.g. 16800"
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleSaveHarvest}
                data-testid="submit-harvest-btn"
                style={{
                  flex: 1,
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                }}
              >
                {currentLang === 'te' ? 'భద్రపరచండి' : 'Save Record'}
              </button>
              <button
                type="button"
                onClick={() => setShowRecordModal(false)}
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#64748b',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                {currentLang === 'te' ? 'రద్దు' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
