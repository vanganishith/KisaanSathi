import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getFarmerAlerts, markAlertRead, dismissAlert, actionAlert, synthesizeSpeech } from '../services/api';

export default function AlertNotificationBanner({
  farmerPhone = '9876543210',
  fieldId,
  cropCycleId,
  onActionTriggered
}) {
  const { currentLang } = useLanguage();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);

  const fetchAlerts = async () => {
    try {
      const res = await getFarmerAlerts({
        farmerPhone,
        fieldId,
        cropCycleId,
        language: currentLang || 'te'
      });
      if (res.alerts) {
        setAlerts(res.alerts);
        setUnreadCount(res.unread_count || 0);
      }
    } catch (err) {
      console.warn('[AlertNotificationBanner] Error loading alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [farmerPhone, fieldId, cropCycleId, currentLang]);

  const handleRead = async (alertId) => {
    await markAlertRead({ alertId, farmerPhone });
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: 'READ' } : a))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleDismiss = async (alertId) => {
    await dismissAlert({ alertId, farmerPhone });
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleAction = async (alert) => {
    await actionAlert({ alertId: alert.id, farmerPhone });
    if (onActionTriggered) onActionTriggered(alert.action_type || alert.suggested_action || 'VIEW_PLAN');
  };

  const handleListen = async (alert) => {
    const textToSpeak = `${alert.title}. ${alert.summary}`;
    if ('speechSynthesis' in window) {
      if (speakingId === alert.id) {
        window.speechSynthesis.cancel();
        setSpeakingId(null);
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = currentLang === 'te' ? 'te-IN' : currentLang === 'hi' ? 'hi-IN' : 'en-IN';
      utterance.rate = 0.95;
      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);
      setSpeakingId(alert.id);
      window.speechSynthesis.speak(utterance);
      return;
    }

    try {
      setSpeakingId(alert.id);
      const res = await synthesizeSpeech({ text: textToSpeak, language: currentLang || 'te' });
      if (res.audio_data) {
        const audio = new Audio(`data:${res.audio_mime || 'audio/wav'};base64,${res.audio_data}`);
        audio.onended = () => setSpeakingId(null);
        audio.play();
      } else {
        setSpeakingId(null);
      }
    } catch {
      setSpeakingId(null);
    }
  };

  const activeAlerts = alerts.filter((a) => a.status !== 'DISMISSED');

  if (activeAlerts.length === 0) return null;

  return (
    <div
      className="alert-notification-banner"
      data-testid="alert-notification-banner"
      style={{
        marginBottom: '20px',
      }}
    >
      {/* Alert Header Toggle Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#fef2f2',
          border: '1.5px solid #fecaca',
          borderRadius: '16px',
          padding: '12px 18px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(220, 38, 38, 0.08)',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="toggle-alerts-btn"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.4rem' }}>🔔</span>
          <div>
            <div style={{ fontWeight: '800', fontSize: '0.95rem', color: '#991b1b' }}>
              {currentLang === 'te'
                ? `రైతు హెచ్చరికలు (${activeAlerts.length})`
                : `Proactive Farm Alerts (${activeAlerts.length})`}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#b91c1c' }}>
              {activeAlerts[0]?.title}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {unreadCount > 0 && (
            <span
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '0.75rem',
                fontWeight: '800',
              }}
            >
              {unreadCount} NEW
            </span>
          )}
          <span style={{ fontSize: '1.1rem', color: '#991b1b' }}>
            {isExpanded ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* Expanded Alert List */}
      {isExpanded && (
        <div
          data-testid="alerts-list-expanded"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginTop: '10px',
          }}
        >
          {activeAlerts.map((alert) => {
            const isHigh = alert.priority === 'HIGH' || alert.priority === 'URGENT';
            return (
              <div
                key={alert.id}
                data-testid={`alert-card-${alert.id}`}
                style={{
                  backgroundColor: isHigh ? '#fffbeb' : '#ffffff',
                  border: `1.5px solid ${isHigh ? '#fde047' : '#e2e8f0'}`,
                  borderRadius: '16px',
                  padding: '14px 18px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '1.2rem' }}>
                      {alert.alert_type === 'WEATHER' ? '🌧️' : alert.alert_type === 'COMMUNITY_RISK' ? '⚠️' : alert.alert_type === 'HARVEST' ? '🌾' : '🌱'}
                    </span>
                    <span style={{ fontWeight: '800', fontSize: '0.95rem', color: '#0f172a' }}>
                      {alert.title}
                    </span>
                  </div>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '8px',
                      fontSize: '0.7rem',
                      fontWeight: '800',
                      backgroundColor: isHigh ? '#fee2e2' : '#f1f5f9',
                      color: isHigh ? '#b91c1c' : '#475569',
                    }}
                  >
                    {alert.priority}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.4, marginBottom: '10px' }}>
                  {alert.summary}
                </div>

                {alert.detailed_reasoning && (
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', marginBottom: '10px' }}>
                    💡 {alert.detailed_reasoning}
                  </div>
                )}

                {/* Actions & Controls */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleAction(alert)}
                      data-testid={`alert-action-btn-${alert.id}`}
                      style={{
                        backgroundColor: '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '6px 14px',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      {alert.action_type === 'CHECK_CROP'
                        ? (currentLang === 'te' ? '📸 పంటను తనిఖీ చేయండి' : '📸 Check Crop')
                        : alert.action_type === 'VIEW_HARVEST_PLAN'
                        ? (currentLang === 'te' ? '🌾 కోత ప్రణాళిక' : '🌾 Harvest Plan')
                        : (currentLang === 'te' ? '📅 కార్యాచరణ చూడండి' : '📅 View Plan')}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleListen(alert)}
                      data-testid={`alert-listen-btn-${alert.id}`}
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: speakingId === alert.id ? '#0284c7' : '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      {speakingId === alert.id ? '⏹️ Stop' : '🔊 Listen'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {alert.status === 'UNREAD' && (
                      <button
                        type="button"
                        onClick={() => handleRead(alert.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '0.75rem',
                          color: '#64748b',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                      >
                        {currentLang === 'te' ? 'చదివినట్లు గుర్తు' : 'Mark Read'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDismiss(alert.id)}
                      data-testid={`alert-dismiss-btn-${alert.id}`}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '0.75rem',
                        color: '#94a3b8',
                        cursor: 'pointer',
                      }}
                    >
                      ✕ {currentLang === 'te' ? 'తొలగించు' : 'Dismiss'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
