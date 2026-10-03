import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getTodayPlan, synthesizeSpeech } from '../services/api';

export default function TodayPlanCard({
  fieldId,
  cropCycleId,
  farmerPhone,
  onNavigateToTab,
}) {
  const { currentLang } = useLanguage();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const fetchPlan = async () => {
    setLoading(true);
    try {
      const res = await getTodayPlan({
        field_id: fieldId,
        crop_cycle_id: cropCycleId,
        farmer_phone: farmerPhone,
        language: currentLang || 'te',
      });
      if (res.success) {
        setPlan(res);
      }
    } catch (err) {
      console.warn('[TodayPlanCard] Failed to load plan:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleListenAdvice = async () => {
    if (!plan?.priorities || plan.priorities.length === 0) return;
    
    // Construct voice summary
    const adviceText = plan.priorities
      .map((p) => `${p.title}. ${p.summary}`)
      .join(' ');

    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(adviceText);
        utterance.lang = currentLang === 'te' ? 'te-IN' : currentLang === 'hi' ? 'hi-IN' : 'en-IN';
        utterance.rate = 0.95;
        utterance.onstart = () => setIsPlayingAudio(true);
        utterance.onend = () => setIsPlayingAudio(false);
        utterance.onerror = () => setIsPlayingAudio(false);
        window.speechSynthesis.speak(utterance);
        return;
      } catch {}
    }

    try {
      setIsPlayingAudio(true);
      const res = await synthesizeSpeech({
        text: adviceText,
        language: currentLang || 'te',
      });
      if (res.audio_data) {
        const audio = new Audio(`data:${res.audio_mime || 'audio/wav'};base64,${res.audio_data}`);
        audio.onended = () => setIsPlayingAudio(false);
        audio.play();
      } else {
        setIsPlayingAudio(false);
      }
    } catch {
      setIsPlayingAudio(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, [fieldId, cropCycleId, farmerPhone, currentLang]);

  const getPriorityColor = (p) => {
    switch (p) {
      case 'URGENT':
      case 'HIGH':
        return { bg: '#fee2e2', text: '#b91c1c', border: '#f87171' };
      case 'MEDIUM':
        return { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' };
      default:
        return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'IRRIGATION':
        return '💧';
      case 'FERTILIZER':
        return '🧪';
      case 'WEATHER_RISK':
        return '🌦️';
      case 'COMMUNITY_RISK':
        return '⚠️';
      case 'CROP_HEALTH':
        return '🌱';
      default:
        return '📋';
    }
  };

  return (
    <div
      className="card today-plan-card"
      data-testid="today-plan-card"
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        padding: '20px',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
            {currentLang === 'te' ? '📅 ఈరోజు చేయవలసిన పనులు (Today’s Plan)' : "📅 Today's Farm Plan"}
          </h3>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
            {plan?.date || new Date().toLocaleDateString()} &bull;{' '}
            {currentLang === 'te' ? 'పంట ప్రాధాన్యతలు' : 'Prioritized by Farm AI'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleListenAdvice}
            disabled={!plan?.priorities || plan.priorities.length === 0}
            data-testid="listen-today-advice-btn"
            style={{
              backgroundColor: isPlayingAudio ? '#16a34a' : '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '12px',
              padding: '6px 12px',
              fontSize: '0.85rem',
              fontWeight: '700',
              color: isPlayingAudio ? '#ffffff' : '#166534',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Listen to today's advice"
          >
            <span>{isPlayingAudio ? '🔊' : '🔈'}</span>
            <span>{isPlayingAudio ? (currentLang === 'te' ? 'వింటున్నారు...' : 'Playing...') : (currentLang === 'te' ? 'వినండి' : 'Listen')}</span>
          </button>
          <button
            type="button"
            onClick={fetchPlan}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.1rem',
              cursor: 'pointer',
              padding: '4px',
              color: '#64748b',
            }}
            title="Refresh plan"
          >
            🔄
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
          {currentLang === 'te' ? 'ఈరోజు కార్యాచరణను సిద్ధం చేస్తున్నాము...' : 'Generating customized farm plan...'}
        </div>
      ) : plan?.priorities && plan.priorities.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {plan.priorities.map((item, idx) => {
            const pStyle = getPriorityColor(item.priority);
            return (
              <div
                key={idx}
                style={{
                  padding: '14px',
                  borderRadius: '14px',
                  backgroundColor: item.type === 'COMMUNITY_RISK' ? '#fffbeb' : '#f8fafc',
                  border: `1.5px solid ${pStyle.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.3rem' }}>{getIcon(item.type)}</span>
                    <span style={{ fontWeight: '800', fontSize: '0.95rem', color: '#0f172a' }}>
                      {item.title}
                    </span>
                  </div>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '0.7rem',
                      fontWeight: '800',
                      backgroundColor: pStyle.bg,
                      color: pStyle.text,
                    }}
                  >
                    {item.priority}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.4 }}>
                  {item.summary}
                </div>

                {item.reasoning && (
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                    💡 {item.reasoning}
                  </div>
                )}

                {item.actions && item.actions.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {item.actions.map((act, aIdx) => (
                      <span
                        key={aIdx}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '0.75rem',
                          color: '#1e293b',
                          fontWeight: '600',
                        }}
                      >
                        ✓ {act}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: '16px', backgroundColor: '#f1f5f9', borderRadius: '12px', textAlign: 'center', color: '#64748b' }}>
          {currentLang === 'te'
            ? 'ఈరోజు అత్యవసర చర్యలు లేవు. పంట ఆరోగ్యంగా ఉంది.'
            : 'No urgent actions required today. Field conditions are stable.'}
        </div>
      )}
    </div>
  );
}
