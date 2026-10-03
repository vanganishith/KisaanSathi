import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { logFieldActivity } from '../services/api';

export default function FarmMemoryTimeline({ fieldId, cropCycleId, activities = [], onActivityAdded }) {
  const { currentLang } = useLanguage();
  const [loggingAction, setLoggingAction] = useState(false);
  const [activeModal, setActiveModal] = useState(false);
  const [customTitle, setCustomTitle] = useState('');

  const getActivityIcon = (type) => {
    switch (type) {
      case 'sowing':
      case 'planting':
        return '🌱';
      case 'irrigation':
        return '💧';
      case 'fertilizer':
        return '🧪';
      case 'pesticide':
        return '🧴';
      case 'pest_report':
        return '🐛';
      case 'disease_report':
        return '🍂';
      case 'weather_event':
        return '🌧️';
      case 'aeo_intervention':
        return '🛡️';
      case 'harvest':
        return '🧺';
      default:
        return '📋';
    }
  };

  const handleQuickLog = async (type, defaultTitle) => {
    if (!fieldId) return;
    setLoggingAction(true);
    try {
      const res = await logFieldActivity(fieldId, {
        field_id: fieldId,
        crop_cycle_id: cropCycleId,
        activity_type: type,
        title: defaultTitle,
        description: `Logged via 1-tap farmer memory: ${defaultTitle}`,
      });
      if (res.success && onActivityAdded) {
        onActivityAdded(res.activity);
      }
    } catch (err) {
      console.error('[QuickLog Error]', err);
    } finally {
      setLoggingAction(false);
      setActiveModal(false);
      setCustomTitle('');
    }
  };

  // Mock initial events if none yet
  const displayActivities = activities.length > 0 ? activities : [
    {
      id: 'demo-1',
      activity_type: 'planting',
      title: currentLang === 'te' ? 'మిరప నాటు వేశారు' : 'Chilli Planted',
      event_date: '2026-08-10T09:00:00Z',
    },
    {
      id: 'demo-2',
      activity_type: 'irrigation',
      title: currentLang === 'te' ? 'డ్రిప్ ద్వారా నీటి పారుదల' : 'Drip Irrigation Applied',
      event_date: '2026-08-18T07:30:00Z',
    },
    {
      id: 'demo-3',
      activity_type: 'weather_event',
      title: currentLang === 'te' ? 'భారీ వర్షపాతం (35 mm)' : 'Heavy Rainfall Recorded',
      event_date: '2026-08-25T16:00:00Z',
    }
  ];

  return (
    <div
      className="card farm-memory-card"
      data-testid="farm-memory-timeline"
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        padding: '20px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.3rem' }}>📖</span>
          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
            {currentLang === 'te' ? 'పొలం డైరీ & హిస్టరీ' : 'Farm Memory & Activity Diary'}
          </h4>
        </div>
        <button
          type="button"
          onClick={() => setActiveModal(true)}
          style={{
            backgroundColor: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            padding: '5px 12px',
            fontSize: '0.78rem',
            fontWeight: '700',
            color: '#334155',
            cursor: 'pointer',
          }}
        >
          ＋ {currentLang === 'te' ? 'నమోదు చేయండి' : 'Log Action'}
        </button>
      </div>

      {/* 1-Tap Quick Action Row */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '12px' }}>
        <button
          type="button"
          disabled={loggingAction}
          onClick={() => handleQuickLog('irrigation', currentLang === 'te' ? 'నీటి పారుదల పూర్తి' : 'Irrigation Done')}
          style={{
            flex: '0 0 auto',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1d4ed8',
            borderRadius: '20px',
            padding: '6px 14px',
            fontSize: '0.8rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>💧</span> {currentLang === 'te' ? 'నీరు పెట్టాను' : 'Watered'}
        </button>

        <button
          type="button"
          disabled={loggingAction}
          onClick={() => handleQuickLog('fertilizer', currentLang === 'te' ? 'ఎరువు వేశారు' : 'Fertilizer Applied')}
          style={{
            flex: '0 0 auto',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            borderRadius: '20px',
            padding: '6px 14px',
            fontSize: '0.8rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>🧪</span> {currentLang === 'te' ? 'ఎరువు వేశాను' : 'Fertilized'}
        </button>

        <button
          type="button"
          disabled={loggingAction}
          onClick={() => handleQuickLog('pesticide', currentLang === 'te' ? 'మందు పిచికారీ' : 'Pesticide Sprayed')}
          style={{
            flex: '0 0 auto',
            backgroundColor: '#fef3c7',
            border: '1px solid #fde68a',
            color: '#b45309',
            borderRadius: '20px',
            padding: '6px 14px',
            fontSize: '0.8rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>🧴</span> {currentLang === 'te' ? 'స్ప్రే చేశాను' : 'Sprayed'}
        </button>
      </div>

      {/* Activity Timeline List */}
      <div style={{ position: 'relative', paddingLeft: '16px', borderLeft: '2px solid #e2e8f0' }}>
        {displayActivities.slice(0, 5).map((act) => {
          const dateStr = act.event_date ? new Date(act.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recent';

          return (
            <div
              key={act.id}
              style={{
                position: 'relative',
                marginBottom: '12px',
                paddingLeft: '14px',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '-24px',
                  top: '2px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  border: '2px solid #16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.65rem',
                }}
              >
                {getActivityIcon(act.activity_type)}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#1e293b' }}>
                  {act.title}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '600' }}>
                  {dateStr}
                </div>
              </div>
              {act.description && (
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '1px' }}>
                  {act.description}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal for manual logging */}
      {activeModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '380px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <h4 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: '800' }}>
              {currentLang === 'te' ? 'పొలం పని నమోదు చేయండి' : 'Log Farm Activity'}
            </h4>
            <input
              type="text"
              placeholder={currentLang === 'te' ? 'ఉదా: నీరు పెట్టాను, యూరియా వేశాను' : 'e.g. Weed clearing, 1st watering'}
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                marginBottom: '16px',
                fontSize: '0.9rem',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setActiveModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                {currentLang === 'te' ? 'రద్దు' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => handleQuickLog('general', customTitle || 'Farm activity recorded')}
                style={{
                  padding: '8px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                {currentLang === 'te' ? 'భద్రపరచు' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
