import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getFertilizerRecommendation, logFertilizerEvent } from '../services/api';

export default function FertilizerAdvisoryCard({
  fieldId,
  cropCycleId,
  farmerPhone,
  onActivityLogged,
}) {
  const { currentLang } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLogging, setIsLogging] = useState(false);
  const [loggedAck, setLoggedAck] = useState(false);
  const [showLogInput, setShowLogInput] = useState(false);
  const [productName, setProductName] = useState('Urea / NPK');

  const fetchAdvisory = async () => {
    setLoading(true);
    try {
      const res = await getFertilizerRecommendation({
        field_id: fieldId,
        crop_cycle_id: cropCycleId,
        farmer_phone: farmerPhone,
        language: currentLang || 'te',
      });
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.warn('[FertilizerAdvisoryCard] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvisory();
  }, [fieldId, cropCycleId, farmerPhone, currentLang]);

  const handleLogFertilizer = async () => {
    if (!fieldId && !farmerPhone) return;
    setIsLogging(true);
    try {
      await logFertilizerEvent({
        field_id: fieldId || 'field-main',
        crop_cycle_id: cropCycleId,
        farmer_phone: farmerPhone,
        product_name: productName || 'Stage Fertilizer',
        notes: currentLang === 'te' ? 'రైతు ఎరువు వేశారు.' : 'Farmer applied fertilizer.',
      });
      setLoggedAck(true);
      setShowLogInput(false);
      if (onActivityLogged) onActivityLogged();
      setTimeout(() => {
        setLoggedAck(false);
        fetchAdvisory();
      }, 2000);
    } catch (err) {
      console.error('[FertilizerAdvisoryCard] Log failed:', err);
    } finally {
      setIsLogging(false);
    }
  };

  const hasWashoffRisk = data?.washoff_risk;
  const isSoilVerified = data?.soil_test_available;

  return (
    <div
      className="card fertilizer-advisory-card"
      data-testid="fertilizer-advisory-card"
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        padding: '20px',
        border: `1.5px solid ${hasWashoffRisk ? '#fca5a5' : '#86efac'}`,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.6rem' }}>🧪</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
              {currentLang === 'te' ? 'ఎరువుల సలహా (Fertilizer)' : 'Nutrient & Fertilizer Advisory'}
            </h3>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {data?.stage ? `${data.stage.toUpperCase()} Stage` : 'Active Stage'} &bull;{' '}
              {isSoilVerified
                ? (currentLang === 'te' ? 'నేల పరీక్ష ధృవీకరించబడింది' : 'Soil Test Verified')
                : (currentLang === 'te' ? 'సాధారణ దశ సలహా' : 'Stage Baseline')}
            </div>
          </div>
        </div>

        <span
          className="badge"
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: '800',
            backgroundColor: hasWashoffRisk ? '#fee2e2' : '#dcfce7',
            color: hasWashoffRisk ? '#b91c1c' : '#15803d',
          }}
        >
          {hasWashoffRisk
            ? currentLang === 'te' ? '⚠️ వర్షపు నష్టం ప్రమాదం' : '⚠️ Wash-off Risk'
            : currentLang === 'te' ? '🌱 పోషక అవసరం' : '🌱 Stage Nutrient'}
        </span>
      </div>

      {loading ? (
        <div style={{ padding: '16px 0', color: '#64748b', fontSize: '0.9rem' }}>
          {currentLang === 'te' ? 'పంట దశ & పోషక సమతుల్యతను తనిఖీ చేస్తున్నాము...' : 'Checking crop stage & nutrient balance...'}
        </div>
      ) : (
        <>
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: hasWashoffRisk ? '#fef2f2' : '#f0fdf4',
              borderRadius: '12px',
              marginBottom: '14px',
              borderLeft: `4px solid ${hasWashoffRisk ? '#ef4444' : '#22c55e'}`,
            }}
          >
            <div style={{ fontWeight: '800', fontSize: '0.95rem', color: hasWashoffRisk ? '#991b1b' : '#166534', marginBottom: '4px' }}>
              {data?.title}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.4 }}>
              {data?.farmer_response || data?.summary}
            </div>
          </div>

          {/* Timing & Safe Guidance */}
          {data?.timing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '0.85rem', color: '#475569' }}>
              <span style={{ fontWeight: '700', color: '#0f172a' }}>
                {currentLang === 'te' ? 'సమయం / పద్ధతి:' : 'Timing:'}
              </span>
              <span>{data.timing}</span>
            </div>
          )}

          {/* Warnings list */}
          {data?.warnings && data.warnings.length > 0 && (
            <div style={{ marginBottom: '14px', backgroundColor: '#fffbeb', padding: '10px 14px', borderRadius: '10px', border: '1px solid #fef08a' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#854d0e', marginBottom: '4px' }}>
                {currentLang === 'te' ? 'ముఖ్య హెచ్చరిక:' : 'Important Safety Guardrails:'}
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', color: '#713f12' }}>
                {data.warnings.map((w, idx) => (
                  <li key={idx} style={{ marginBottom: '3px' }}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 1-Tap Log Fertilizer */}
          <div style={{ paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
            {showLogInput ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder={currentLang === 'te' ? 'ఎరువు పేరు (ఉదా: యూరియా, డీఏపీ)' : 'Product (e.g., Urea, NPK)'}
                  style={{
                    flex: '1',
                    minWidth: '150px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                  }}
                />
                <button
                  type="button"
                  onClick={handleLogFertilizer}
                  disabled={isLogging}
                  style={{
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  {isLogging ? '...' : currentLang === 'te' ? 'నమోదు చేయి' : 'Confirm'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogInput(false)}
                  style={{
                    backgroundColor: '#f1f5f9',
                    color: '#64748b',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  {currentLang === 'te' ? 'రద్దు' : 'Cancel'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {data?.days_since_last_fertilizer !== null && data?.days_since_last_fertilizer !== undefined
                    ? (currentLang === 'te' ? `గత ఎరువు వేసి: ${data.days_since_last_fertilizer} రోజులు` : `Last applied: ${data.days_since_last_fertilizer}d ago`)
                    : (currentLang === 'te' ? 'ఎరువు వేసిన వివరాలు నమోదు చేయండి' : 'Track your applications')}
                </div>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setShowLogInput(true)}
                  disabled={loggedAck}
                  data-testid="log-fertilizer-btn"
                  style={{
                    backgroundColor: loggedAck ? '#16a34a' : '#059669',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '8px 16px',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {loggedAck
                    ? (currentLang === 'te' ? '✓ నమోదైంది' : '✓ Logged')
                    : (currentLang === 'te' ? '🧪 ఎరువు వేశాను' : '🧪 I Applied Fertilizer')}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
