import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getFarmTimeline } from '../services/api';

export default function FarmMemoryView({
  farmerPhone = '9876543210',
  fieldId,
  cropCycleId,
}) {
  const { currentLang } = useLanguage();
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const res = await getFarmTimeline({
        farmerPhone,
        fieldId,
        cropCycleId,
        limit: 50,
      });
      if (res.timeline) {
        setTimeline(res.timeline);
      }
    } catch (err) {
      console.warn('[FarmMemoryView] Error loading timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [farmerPhone, fieldId, cropCycleId]);

  const getSourceBadge = (source) => {
    switch (source) {
      case 'AEO':
        return { bg: '#dcfce7', text: '#15803d', label: '👨‍🌾 AEO Verified' };
      case 'AI':
        return { bg: '#e0f2fe', text: '#0369a1', label: '🤖 Farm AI' };
      case 'WEATHER':
        return { bg: '#fef3c7', text: '#92400e', label: '🌧️ Weather System' };
      case 'COMMUNITY':
        return { bg: '#f3e8ff', text: '#7e22ce', label: '👥 Community' };
      default:
        return { bg: '#f1f5f9', text: '#475569', label: '👨‍🌾 Farmer Recorded' };
    }
  };

  return (
    <div
      className="card farm-memory-view"
      data-testid="farm-memory-timeline"
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        padding: '22px',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.4rem' }}>📖</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
              {currentLang === 'te' ? 'వ్యవసాయ డైరీ & చరిత్ర (Farm Memory)' : 'Automatic Farm Memory & Diary'}
            </h3>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {currentLang === 'te' ? 'విత్తనం నుండి కోత వరకు స్వయంచాలక రికార్డు' : 'Chronological lifecycle event log with verified sources'}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchTimeline}
          style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#64748b' }}
          title="Refresh timeline"
        >
          🔄
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b', fontSize: '0.9rem' }}>
          {currentLang === 'te' ? 'వ్యవసాయ చరిత్రను లోడ్ చేస్తున్నాము...' : 'Loading farm memory...'}
        </div>
      ) : timeline.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}>
          {timeline.map((event, idx) => {
            const badge = getSourceBadge(event.source);
            const dateStr = event.event_date ? new Date(event.event_date).toLocaleDateString() : 'Recent';
            return (
              <div
                key={event.id || idx}
                data-testid={`timeline-event-${event.id || idx}`}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                  paddingBottom: '12px',
                  borderBottom: idx === timeline.length - 1 ? 'none' : '1px solid #f1f5f9',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    flexShrink: 0,
                  }}
                >
                  {event.icon || '🌱'}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ fontWeight: '800', fontSize: '0.925rem', color: '#0f172a' }}>
                      {event.title}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{dateStr}</span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.4, marginBottom: '6px' }}>
                    {event.description}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      data-testid={`source-badge-${event.id}`}
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        backgroundColor: badge.bg,
                        color: badge.text,
                      }}
                    >
                      {badge.label}
                    </span>

                    {event.outcome && event.outcome !== 'UNKNOWN' && (
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          backgroundColor: event.outcome === 'RESOLVED' ? '#dcfce7' : '#fef3c7',
                          color: event.outcome === 'RESOLVED' ? '#15803d' : '#92400e',
                        }}
                      >
                        ✓ {event.outcome}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
          {currentLang === 'te'
            ? 'ఇంకా ఎటువంటి వ్యవసాయ కార్యకలాపాలు నమోదు కాలేదు.'
            : 'No farm activities recorded yet. Voice updates and checks will appear here.'}
        </div>
      )}
    </div>
  );
}
