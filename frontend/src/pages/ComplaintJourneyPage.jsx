import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCommunityProblem } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { speakText, stopSpeaking } from '../services/communityDataStore';

// In-memory quick cache for instant navigation back and forth
const JOURNEY_CACHE = new Map();

export default function ComplaintJourneyPage() {
  const { problemId } = useParams();
  const navigate = useNavigate();
  const { currentLang } = useLanguage();

  const [problem, setProblem] = useState(() => {
    if (!problemId) return null;
    return JOURNEY_CACHE.get(problemId) || null;
  });
  const [loading, setLoading] = useState(() => !problem);
  const [error, setError] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isPhotoLightboxOpen, setIsPhotoLightboxOpen] = useState(false);

  const langKey = currentLang === 'hi' ? 'hi' : currentLang === 'en' ? 'en' : 'te';

  useEffect(() => {
    if (!problemId) return;

    let mounted = true;
    const cached = JOURNEY_CACHE.get(problemId);
    if (cached) {
      setProblem(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    getCommunityProblem(problemId)
      .then((data) => {
        if (!mounted) return;
        if (data?.problem) {
          JOURNEY_CACHE.set(problemId, data.problem);
          setProblem(data.problem);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        if (!cached) setError(err.message || 'Failed to load complaint details.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      stopSpeaking();
    };
  }, [problemId]);

  if (loading && !problem) {
    return (
      <main className="community-page complaint-journey-page" style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('/my-issues')}
            style={{ borderRadius: '20px', padding: '6px 14px', fontSize: '0.85rem' }}
          >
            ← Back to My Issues
          </button>
        </div>
        <div className="card" style={{ padding: '40px', textAlign: 'center', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🌱</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>Loading Complaint Journey...</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Retrieving your field problem history and verified AEO updates.</p>
        </div>
      </main>
    );
  }

  if (error && !problem) {
    return (
      <main className="community-page complaint-journey-page" style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ marginBottom: '20px' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('/my-issues')}
            style={{ borderRadius: '20px', padding: '6px 14px', fontSize: '0.85rem' }}
          >
            ← Back to My Issues
          </button>
        </div>
        <div className="card" style={{ padding: '32px', textAlign: 'center', background: '#fff', borderRadius: '16px', border: '1px solid #fecaca' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⚠️</div>
          <h3 style={{ color: '#dc2626', margin: '0 0 8px 0' }}>Could Not Load Issue Journey</h3>
          <p style={{ color: '#64748b', margin: '0 0 16px 0' }}>{error}</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/my-issues')}>
            Return to My Issues
          </button>
        </div>
      </main>
    );
  }

  const status = (problem?.status || 'NEW').toUpperCase();
  const timeline = problem?.timeline || [];
  const crop = problem?.crop || 'Crop';
  const cropIcon = problem?.crop_icon || '🌱';
  const photo = problem?.photo_url || problem?.photos?.[0];
  const advisory = problem?.advisory;

  // Compute status step index (0 to 4)
  const getStepIndex = (st) => {
    switch (st) {
      case 'NEW':
        return 0;
      case 'AI_ANALYZED':
        return 1;
      case 'ACKNOWLEDGED':
        return 2;
      case 'INVESTIGATING':
        return 3;
      case 'ACTION_TAKEN':
      case 'RESOLVED':
        return 4;
      default:
        return 1;
    }
  };

  const activeStepIdx = getStepIndex(status);

  // Milestone Stepper definition
  const MILESTONES = [
    {
      step: 1,
      title: 'Complaint Registered',
      titleTe: 'ఫిర్యాదు నమోదు',
      subtitle: 'Recorded in system with field photos',
      icon: '📝',
    },
    {
      step: 2,
      title: 'AI Diagnostics',
      titleTe: 'AI రోగ నిర్ధారణ',
      subtitle: 'Multimodal pest & disease triaged',
      icon: '🤖',
    },
    {
      step: 3,
      title: 'Mandal Verification',
      titleTe: 'ప్రాంతీయ పరిశీలన',
      subtitle: 'Cluster analysis & AEO assigned',
      icon: '🏛️',
    },
    {
      step: 4,
      title: 'Field Investigation',
      titleTe: 'క్షేత్ర స్థాయి తనిఖీ',
      subtitle: 'Officer inspection & verification',
      icon: '🔍',
    },
    {
      step: 5,
      title: 'AEO Guidance & Solution',
      titleTe: 'AEO సలహా & పరిష్కారం',
      subtitle: 'Official treatment prescription issued',
      icon: '🛡️',
    },
  ];

  // Helper for status badge styling
  const getStatusBadge = (st) => {
    switch (st) {
      case 'RESOLVED':
        return { label: 'Resolved (పరిష్కరించబడింది)', bg: '#dcfce7', color: '#15803d', border: '#86efac' };
      case 'ACTION_TAKEN':
        return { label: 'Action Taken (చర్యలు చేపట్టబడ్డాయి)', bg: '#e0f2fe', color: '#0369a1', border: '#7dd3fc' };
      case 'INVESTIGATING':
        return { label: 'Under Investigation (పరిశీలనలో ఉంది)', bg: '#fef3c7', color: '#b45309', border: '#fcd34d' };
      case 'ACKNOWLEDGED':
        return { label: 'Acknowledged by AEO (అధికారి ఆమోదించారు)', bg: '#f3e8ff', color: '#7e22ce', border: '#d8b4fe' };
      case 'AI_ANALYZED':
        return { label: 'AI Triaged (AI నిర్ధారించింది)', bg: '#ede9fe', color: '#6d28d9', border: '#c4b5fd' };
      default:
        return { label: 'Complaint Registered (నమోదైంది)', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
    }
  };

  const statusBadge = getStatusBadge(status);

  // Audio Hear Advisory Handler
  const handleHearAdvisory = () => {
    if (isPlayingAudio) {
      stopSpeaking();
      setIsPlayingAudio(false);
      return;
    }
    const textToSpeak = typeof advisory?.advisory === 'object'
      ? (advisory.advisory[langKey] || advisory.advisory.te || advisory.advisory.en || '')
      : (advisory?.advisory || problem?.description || '');

    if (!textToSpeak) return;

    setIsPlayingAudio(true);
    speakText(textToSpeak, langKey, () => {
      setIsPlayingAudio(false);
    });
  };

  return (
    <main
      className="community-page complaint-journey-page"
      data-testid="complaint-journey-page"
      style={{ maxWidth: '980px', margin: '0 auto', padding: '24px 16px 60px' }}
    >
      {/* 1. TOP NAV & ACTIONS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => navigate('/my-issues')}
          data-testid="back-to-my-issues-btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '8px 18px',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#1e293b',
            border: '1.5px solid #cbd5e1',
            cursor: 'pointer',
          }}
        >
          <span>←</span> Back to My Issues
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link
            to="/community"
            className="btn btn-outline"
            style={{
              borderRadius: '24px',
              padding: '8px 16px',
              fontSize: '0.85rem',
              fontWeight: '600',
              textDecoration: 'none',
              color: '#15803d',
              borderColor: '#86efac',
              backgroundColor: '#f0fdf4',
            }}
          >
            👥 View Community Feed
          </Link>
          <span
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.825rem',
              fontWeight: '700',
              backgroundColor: statusBadge.bg,
              color: statusBadge.color,
              border: `1.5px solid ${statusBadge.border}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: statusBadge.color, display: 'inline-block' }} />
            {statusBadge.label}
          </span>
        </div>
      </div>

      {/* 2. COMPLAINT HERO SUMMARY BANNER */}
      <section
        className="card"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '18px',
          border: '1.5px solid #e2e8f0',
          padding: '24px 28px',
          marginBottom: '24px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  color: '#166534',
                  backgroundColor: '#dcfce7',
                  padding: '3px 10px',
                  borderRadius: '12px',
                }}
              >
                {cropIcon} {crop}
              </span>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>
                Ref #{String(problem?.id || '').slice(0, 8).toUpperCase()}
              </span>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>&bull;</span>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Reported on {new Date(problem?.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: '800', color: '#0f172a', margin: '0 0 10px 0', lineHeight: 1.35 }}>
              {problem?.description || `${crop} Field Problem Report`}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#475569', fontSize: '0.85rem' }}>
              <span>📍 {problem?.locality || 'Padamati Sai Guda, Ghatkesar Mandal'}</span>
              <span>👨‍🌾 {problem?.farmer_name || 'Farmer'}</span>
              {problem?.priority && (
                <span style={{ fontWeight: '600', color: problem.priority === 'HIGH' ? '#dc2626' : '#2563eb' }}>
                  ⚡ {problem.priority} Priority
                </span>
              )}
            </div>
          </div>

          {photo && (
            <div
              style={{ position: 'relative', cursor: 'pointer' }}
              onClick={() => setIsPhotoLightboxOpen(true)}
              title="Click to zoom crop evidence photo"
            >
              <img
                src={photo}
                alt="Reported problem"
                style={{
                  width: '110px',
                  height: '110px',
                  borderRadius: '12px',
                  objectFit: 'cover',
                  border: '2px solid #e2e8f0',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: '6px',
                  right: '6px',
                  backgroundColor: 'rgba(0,0,0,0.65)',
                  color: '#fff',
                  borderRadius: '6px',
                  padding: '2px 6px',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                }}
              >
                🔍 Zoom
              </span>
            </div>
          )}
        </div>
      </section>

      {/* 3. VISUAL STATUS JOURNEY / PROGRESS STEPPER */}
      <section
        className="card"
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          border: '1.5px solid #e2e8f0',
          padding: '26px 28px',
          marginBottom: '24px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ marginBottom: '22px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
            📈 Complaint Resolution Journey (ఫిర్యాదు పురోగతి ప్రయాణం)
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
            Live status of actions taken from complaint registration to verified officer resolution.
          </p>
        </div>

        {/* Stepper Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '12px',
            position: 'relative',
          }}
        >
          {MILESTONES.map((m, idx) => {
            const isCompleted = idx <= activeStepIdx;
            const isCurrent = idx === activeStepIdx;
            return (
              <div
                key={m.step}
                style={{
                  padding: '16px 14px',
                  borderRadius: '14px',
                  background: isCurrent ? '#f0fdf4' : isCompleted ? '#f8fafc' : '#ffffff',
                  border: isCurrent ? '2px solid #16a34a' : isCompleted ? '1.5px solid #bbf7d0' : '1.5px dashed #cbd5e1',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.35rem' }}>{m.icon}</span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      backgroundColor: isCurrent ? '#16a34a' : isCompleted ? '#dcfce7' : '#f1f5f9',
                      color: isCurrent ? '#ffffff' : isCompleted ? '#166534' : '#94a3b8',
                    }}
                  >
                    {isCurrent ? 'ACTIVE' : isCompleted ? 'DONE ✓' : `STEP ${m.step}`}
                  </span>
                </div>
                <div style={{ fontWeight: '700', fontSize: '0.88rem', color: isCompleted ? '#0f172a' : '#64748b', marginBottom: '2px' }}>
                  {m.title}
                </div>
                <div style={{ fontSize: '0.77rem', color: '#16a34a', fontWeight: '600', marginBottom: '4px' }}>
                  {m.titleTe}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.3 }}>
                  {m.subtitle}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. OFFICIAL AEO VERIFIED ADVISORY */}
      {advisory && (
        <section
          className="card"
          data-testid="official-aeo-advisory-section"
          style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            borderRadius: '18px',
            border: '2px solid #86efac',
            padding: '26px 28px',
            marginBottom: '24px',
            boxShadow: '0 4px 16px rgba(22, 163, 74, 0.12)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '2rem' }}>🛡️</span>
              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: '800',
                    color: '#166534',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Verified Government Guidance
                </span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#14532d', margin: '2px 0 0 0' }}>
                  Official AEO Advisory & Prescription
                </h2>
                <div style={{ fontSize: '0.825rem', color: '#166534', fontWeight: '600', marginTop: '2px' }}>
                  {advisory.officer_name || 'Srinivas Rao'} &bull; {advisory.officer_designation || 'Agricultural Extension Officer, Ghatkesar Mandal'}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-sm"
              onClick={handleHearAdvisory}
              data-testid="hear-aeo-advisory-btn"
              style={{
                borderRadius: '20px',
                padding: '8px 16px',
                fontWeight: '700',
                fontSize: '0.825rem',
                backgroundColor: isPlayingAudio ? '#dc2626' : '#15803d',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{isPlayingAudio ? '⏹️' : '🔊'}</span>
              <span>{isPlayingAudio ? 'Stop Listening' : `Hear Advisory in ${langKey.toUpperCase()}`}</span>
            </button>
          </div>

          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '18px 20px',
              border: '1px solid #bbf7d0',
              color: '#1f2937',
              fontSize: '0.95rem',
              lineHeight: 1.6,
              whiteSpace: 'pre-line',
            }}
          >
            {advisory.advisory?.title && (
              <div style={{ fontWeight: '800', color: '#166534', fontSize: '1.05rem', marginBottom: '8px' }}>
                📋 {advisory.advisory.title}
              </div>
            )}
            {typeof advisory.advisory === 'object'
              ? (advisory.advisory[langKey] || advisory.advisory.te || advisory.advisory.en || JSON.stringify(advisory.advisory))
              : advisory.advisory}
          </div>
        </section>
      )}

      {/* Voice Audio Note Player (If farmer recorded audio in report) */}
      {problem?.audio_url && (
        <section
          className="card"
          style={{
            background: '#ffffff',
            borderRadius: '18px',
            border: '1.5px solid #e2e8f0',
            padding: '18px 24px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '1.75rem' }}>🎙️</span>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: '0.925rem', color: '#0f172a', display: 'block' }}>
                Original Farmer Voice Audio
              </strong>
              <small style={{ color: '#64748b' }}>Recorded during field complaint submission</small>
              <audio controls src={problem.audio_url} style={{ width: '100%', marginTop: '8px', height: '36px' }} />
            </div>
          </div>
        </section>
      )}

      {/* 5. AUDIT TIMELINE LOG */}
      {timeline.length > 0 && (
        <section
          className="card"
          style={{
            background: '#ffffff',
            borderRadius: '18px',
            border: '1.5px solid #e2e8f0',
            padding: '24px 28px',
            marginBottom: '24px',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: '0 0 16px 0' }}>
            📅 Case Timeline & Action History (చర్యల పూర్తి వివరాలు)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {timeline.map((event, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start',
                  paddingBottom: i === timeline.length - 1 ? 0 : '14px',
                  borderBottom: i === timeline.length - 1 ? 'none' : '1px solid #f1f5f9',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '0.8rem',
                    flexShrink: 0,
                  }}
                >
                  ✓
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    <strong style={{ fontSize: '0.925rem', color: '#0f172a' }}>
                      {event.label || event.status?.replace('_', ' ')}
                    </strong>
                    {event.timestamp && (
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {new Date(event.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  {event.note && (
                    <p style={{ margin: '4px 0 0 0', color: '#475569', fontSize: '0.85rem', lineHeight: 1.45 }}>
                      {event.note}
                    </p>
                  )}
                  {event.actor && (
                    <span style={{ display: 'inline-block', marginTop: '4px', fontSize: '0.75rem', color: '#166534', fontWeight: '600' }}>
                      Action by: {event.actor}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. PHOTO LIGHTBOX MODAL */}
      {isPhotoLightboxOpen && photo && (
        <div
          className="image-lightbox-backdrop"
          onClick={() => setIsPhotoLightboxOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            className="image-lightbox-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '800px', width: '100%', textAlign: 'center', position: 'relative' }}
          >
            <img
              src={photo}
              alt="Crop problem evidence"
              style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '14px', objectFit: 'contain' }}
            />
            <button
              type="button"
              className="btn btn-sm btn-lightbox-close"
              onClick={() => setIsPhotoLightboxOpen(false)}
              style={{
                marginTop: '12px',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                borderRadius: '20px',
                padding: '8px 20px',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              ✕ Close Image View
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
