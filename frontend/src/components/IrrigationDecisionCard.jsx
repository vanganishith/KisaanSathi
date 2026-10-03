import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getIrrigationRecommendation, logIrrigationEvent } from '../services/api';

export default function IrrigationDecisionCard({
  fieldId,
  cropCycleId,
  farmerPhone,
  onActivityLogged
}) {
  const { currentLang } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLogging, setIsLogging] = useState(false);
  const [loggedAck, setLoggedAck] = useState(false);

  const fetchDecision = async () => {
    setLoading(true);
    try {
      const res = await getIrrigationRecommendation({
        field_id: fieldId,
        crop_cycle_id: cropCycleId,
        farmer_phone: farmerPhone,
        language: currentLang || 'te',
      });
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.warn('[IrrigationDecisionCard] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecision();
  }, [fieldId, cropCycleId, farmerPhone, currentLang]);

  const handleLogIrrigation = async () => {
    if (!fieldId && !farmerPhone) return;
    setIsLogging(true);
    try {
      await logIrrigationEvent({
        field_id: fieldId || 'field-main',
        crop_cycle_id: cropCycleId,
        farmer_phone: farmerPhone,
        method: 'drip',
        notes: currentLang === 'te' ? 'రైతు డ్రిప్ ద్వారా నీటి తడి ఇచ్చారు.' : 'Farmer applied irrigation via drip.',
      });
      setLoggedAck(true);
      if (onActivityLogged) onActivityLogged();
      setTimeout(() => {
        setLoggedAck(false);
        fetchDecision();
      }, 2000);
    } catch (err) {
      console.error('[IrrigationCard] Log failed:', err);
    } finally {
      setIsLogging(false);
    }
  };

  const isDefer = data?.decision === 'DEFER' || data?.decision === 'MONITOR_RAIN';

  return (
    <div
      className="card irrigation-decision-card"
      data-testid="irrigation-decision-card"
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        padding: '20px',
        border: `1.5px solid ${isDefer ? '#fde047' : '#93c5fd'}`,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.6rem' }}>💧</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
              {currentLang === 'te' ? 'నీటి పారుదల సలహా (Irrigation)' : 'Irrigation Intelligence'}
            </h3>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {data?.soil_summary || 'Red soil'} &bull; {data?.weather_summary || 'Weather sync'}
            </div>
          </div>
        </div>

        <span
          className={`badge ${isDefer ? 'badge-warning' : 'badge-primary'}`}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: '800',
            backgroundColor: isDefer ? '#fef08a' : '#dbeafe',
            color: isDefer ? '#854d0e' : '#1d4ed8',
          }}
        >
          {isDefer
            ? currentLang === 'te' ? '⏳ వాయిదా వేయండి' : '⏳ DEFER'
            : currentLang === 'te' ? '💧 తడి ఇవ్వండి' : '💧 IRRIGATE'}
        </span>
      </div>

      {loading ? (
        <div style={{ padding: '16px 0', color: '#64748b', fontSize: '0.9rem' }}>
          {currentLang === 'te' ? 'వాతావరణం & నేల తేమను విశ్లేషిస్తున్నాము...' : 'Analyzing weather & soil moisture...'}
        </div>
      ) : (
        <>
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: isDefer ? '#fffbeb' : '#eff6ff',
              borderRadius: '12px',
              marginBottom: '14px',
              borderLeft: `4px solid ${isDefer ? '#eab308' : '#3b82f6'}`,
            }}
          >
            <div style={{ fontWeight: '800', fontSize: '0.95rem', color: isDefer ? '#92400e' : '#1e40af', marginBottom: '4px' }}>
              {data?.title}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.4 }}>
              {data?.farmer_response || data?.summary}
            </div>
          </div>

          {/* Factors */}
          {data?.factors && data.factors.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>
                {currentLang === 'te' ? 'గమనించిన అంశాలు:' : 'Key Context Factors:'}
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', color: '#475569' }}>
                {data.factors.map((f, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 1-Tap Logging Action */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {data?.days_since_last_irrigation !== null && data?.days_since_last_irrigation !== undefined
                ? (currentLang === 'te' ? `చివరి తడి: ${data.days_since_last_irrigation} రోజుల క్రితం` : `Last watered: ${data.days_since_last_irrigation}d ago`)
                : (currentLang === 'te' ? 'తడి వివరాలు నమోదు చేయండి' : 'Log your watering')}
            </div>

            <button
              type="button"
              className="btn btn-sm"
              onClick={handleLogIrrigation}
              disabled={isLogging}
              data-testid="log-irrigation-btn"
              style={{
                backgroundColor: loggedAck ? '#16a34a' : '#0284c7',
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
                : (currentLang === 'te' ? '💧 ఈరోజు నీరు పెట్టాను' : '💧 I Irrigated Today')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
