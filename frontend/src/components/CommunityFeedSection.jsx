import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getCommunityFeed, recordMeToo } from '../services/api';
import VoiceReportModal from './VoiceReportModal';

export default function CommunityFeedSection({
  farmerPhone,
  activeCrop = 'Chilli',
  onIssueReported,
}) {
  const { currentLang } = useLanguage();
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [meTooLoading, setMeTooLoading] = useState({});
  const [speakingId, setSpeakingId] = useState(null);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const res = await getCommunityFeed({
        farmer_phone: farmerPhone,
        crop: activeCrop,
        category: selectedCategory,
        language: currentLang || 'te',
      });
      if (res.success) {
        setFeed(res);
      }
    } catch (err) {
      console.warn('[CommunityFeed] fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [farmerPhone, activeCrop, selectedCategory, currentLang]);

  const handleMeTooClick = async (reportId) => {
    setMeTooLoading((prev) => ({ ...prev, [reportId]: true }));
    try {
      const res = await recordMeToo({
        reportId,
        farmerPhone: farmerPhone || '9876543210',
      });
      if (res.success) {
        setFeed((prev) => {
          if (!prev) return prev;
          const updatedReports = prev.reports.map((r) => {
            if (r.id === reportId) {
              return {
                ...r,
                me_too_count: res.new_me_too_count,
                has_me_too_by_user: true,
              };
            }
            return r;
          });
          return { ...prev, reports: updatedReports };
        });
      }
    } catch (err) {
      console.error('[CommunityFeed] Me Too error:', err);
    } finally {
      setMeTooLoading((prev) => ({ ...prev, [reportId]: false }));
    }
  };

  const handleSpeakText = (id, text) => {
    if ('speechSynthesis' in window) {
      if (speakingId === id) {
        window.speechSynthesis.cancel();
        setSpeakingId(null);
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = currentLang === 'te' ? 'te-IN' : currentLang === 'hi' ? 'hi-IN' : 'en-IN';
      utterance.rate = 0.95;
      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);
      setSpeakingId(id);
      window.speechSynthesis.speak(utterance);
    }
  };

  const categories = [
    { id: null, label: currentLang === 'te' ? 'అన్నీ' : 'All' },
    { id: 'pest', label: currentLang === 'te' ? '🐛 పురుగులు' : '🐛 Pests' },
    { id: 'disease', label: currentLang === 'te' ? '🍄 తెగుళ్లు' : '🍄 Diseases' },
    { id: 'weather_damage', label: currentLang === 'te' ? '🌦️ వాతావరణం' : '🌦️ Weather' },
    { id: 'crop_health', label: currentLang === 'te' ? '🌱 పంట లక్షణాలు' : '🌱 Health' },
  ];

  return (
    <div className="community-feed-section" data-testid="community-feed-section">
      {/* Top Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>
            {currentLang === 'te' ? '👥 స్థానిక వ్యవసాయ సమాచారం (Community Intelligence)' : '👥 Local Agricultural Intelligence'}
          </h3>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            📍 {feed?.locality || 'Near your locality'} &bull; {currentLang === 'te' ? 'సమీప రైతుల అనుభవాలు & AEO అధికారిక సలహాలు' : 'Nearby farmer signals & verified guidance'}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          data-testid="open-voice-report-modal"
          style={{
            backgroundColor: '#0284c7',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '8px 16px',
            fontWeight: '800',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
          }}
        >
          <span>📢</span>
          <span>{currentLang === 'te' ? '+ నివేదికను పంచుకోండి' : '+ Share with Farmers'}</span>
        </button>
      </div>

      {/* Regional Signals Alert Banner */}
      {feed?.signals && feed.signals.length > 0 && (
        <div data-testid="community-signals-banner" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
          {feed.signals.map((sig, idx) => (
            <div
              key={idx}
              data-testid="community-signal-banner"
              style={{
                backgroundColor: '#fffbeb',
                border: '1.5px solid #fde047',
                borderRadius: '16px',
                padding: '14px 18px',
                boxShadow: '0 4px 12px rgba(234, 179, 8, 0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                  <span style={{ fontWeight: '800', fontSize: '0.95rem', color: '#92400e' }}>
                    {sig.title || `${sig.crop || 'Crop'} Alert (${sig.report_count || sig.nearby_report_count} nearby)`}
                  </span>
                </div>
                <span
                  style={{
                    backgroundColor: '#fef08a',
                    color: '#854d0e',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.7rem',
                    fontWeight: '800',
                  }}
                >
                  {sig.nearby_report_count || sig.report_count} FARMERS NEARBY
                </span>
              </div>

              <div style={{ fontSize: '0.85rem', color: '#713f12', marginBottom: '8px', lineHeight: 1.4 }}>
                {sig.summary || sig.symptom_summary || `${sig.report_count || sig.nearby_report_count} farmers nearby reported similar symptoms.`}
              </div>

              {(sig.aeo_guidance || sig.guidance) && (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #fef08a',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    color: '#15803d',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>👨‍🌾 <strong>{currentLang === 'te' ? 'AEO అధికారిక సలహా:' : 'AEO Guidance:'}</strong></span>
                  <span>{sig.aeo_guidance || sig.guidance}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Category Chips Bar */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '14px' }}>
        {categories.map((c, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSelectedCategory(c.id)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: selectedCategory === c.id ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
              backgroundColor: selectedCategory === c.id ? '#e0f2fe' : '#ffffff',
              color: selectedCategory === c.id ? '#0369a1' : '#475569',
              fontSize: '0.8rem',
              fontWeight: '700',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Community Reports Feed */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b', fontSize: '0.9rem' }}>
          {currentLang === 'te' ? 'సమీప నివేదికలను సేకరిస్తున్నాము...' : 'Loading community signals...'}
        </div>
      ) : feed?.reports && feed.reports.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {feed.reports.map((report) => (
            <div
              key={report.id}
              className="community-post-card"
              data-testid="community-report-card"
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '18px',
                padding: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '8px',
                      backgroundColor: '#f1f5f9',
                      fontSize: '0.75rem',
                      fontWeight: '800',
                      color: '#0f172a',
                    }}
                  >
                    {report.crop || report.crop_name}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    📍 {report.approx_location}
                  </span>
                </div>

                {(report.aeo_verified || report.aeo_verification) && (
                  <span
                    style={{
                      backgroundColor: '#dcfce7',
                      color: '#15803d',
                      padding: '2px 8px',
                      borderRadius: '8px',
                      fontSize: '0.7rem',
                      fontWeight: '800',
                    }}
                  >
                    ✓ AEO REVIEWED
                  </span>
                )}
              </div>

              <div style={{ fontSize: '0.925rem', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
                {report.title}
              </div>

              <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.4, marginBottom: '10px' }}>
                {report.description}
              </div>

              {/* AEO Official Response Card */}
              {(report.aeo_guidance || report.aeo_verification) && (
                <div
                  style={{
                    backgroundColor: '#f0fdf4',
                    borderLeft: '3px solid #22c55e',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    color: '#166534',
                    marginBottom: '10px',
                  }}
                >
                  <strong>👨‍🌾 {report.aeo_verification?.officer_name ? `${report.aeo_verification.officer_name}: ` : (currentLang === 'te' ? 'అధికారిక నివారణ: ' : 'Officer Advice: ')}</strong>
                  {report.aeo_guidance || report.aeo_verification?.guidance}
                </div>
              )}

              {/* Bottom Actions: Me Too & Listen */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => handleMeTooClick(report.id)}
                  disabled={meTooLoading[report.id]}
                  data-testid={`me-too-btn-${report.id}`}
                  style={{
                    backgroundColor: (report.has_me_too_by_user || report.has_me_too) ? '#dcfce7' : '#f8fafc',
                    border: `1px solid ${(report.has_me_too_by_user || report.has_me_too) ? '#86efac' : '#cbd5e1'}`,
                    color: (report.has_me_too_by_user || report.has_me_too) ? '#15803d' : '#334155',
                    borderRadius: '12px',
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>🙋</span>
                  <span>
                    {currentLang === 'te' ? `నాకూ ఇదే సమస్య (${report.me_too_count})` : `Me Too (${report.me_too_count})`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSpeakText(report.id, `${report.title}. ${report.description}. ${report.aeo_guidance || report.aeo_verification?.guidance || ''}`)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: speakingId === report.id ? '#0284c7' : '#64748b',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>{speakingId === report.id ? '⏹️' : '🔊'}</span>
                  <span>{speakingId === report.id ? (currentLang === 'te' ? 'ఆపు' : 'Stop') : (currentLang === 'te' ? 'వినండి' : 'Listen')}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '24px', backgroundColor: '#f8fafc', borderRadius: '14px', color: '#64748b' }}>
          {currentLang === 'te'
            ? 'ఈ వర్గంలో ప్రస్తుతం ఎటువంటి సమస్యలు లేవు.'
            : 'No community issues reported in this category.'}
        </div>
      )}

      {/* Voice / Photo Report Modal */}
      <VoiceReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        farmerPhone={farmerPhone}
        activeCrop={activeCrop}
        onReportCreated={() => {
          fetchFeed();
          if (onIssueReported) onIssueReported();
        }}
      />
    </div>
  );
}
