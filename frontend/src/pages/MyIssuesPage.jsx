import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyIssues } from '../services/api';
import './MyIssuesPage.css';

const getStoredProfile = () => {
  try {
    return JSON.parse(localStorage.getItem('kisaansathi_farmer_profile') || 'null');
  } catch {
    return null;
  }
};

const getCacheKey = (profile) => {
  if (!profile) return null;
  const id = profile.phone || profile.farmer_id;
  return id ? `kisaansathi_my_issues_cache_${id}` : 'kisaansathi_my_issues_cache';
};

const getCropIcon = (crop = '') => {
  const c = String(crop || '').toLowerCase();
  if (c.includes('cotton') || c.includes('పత్తి') || c.includes('कपास')) return '☁️';
  if (c.includes('chilli') || c.includes('mirchi') || c.includes('మిరప') || c.includes('मिर्च')) return '🌶️';
  if (c.includes('paddy') || c.includes('rice') || c.includes('వరి') || c.includes('धान')) return '🌾';
  if (c.includes('tomato') || c.includes('టమాటా') || c.includes('टमाटर')) return '🍅';
  if (c.includes('maize') || c.includes('corn') || c.includes('మొక్కజొన్న')) return '🌽';
  if (c.includes('groundnut') || c.includes('వేరుశనగ')) return '🥜';
  if (c.includes('wheat') || c.includes('గోధుమ')) return '🌾';
  return '🌱';
};

const getStatusDetails = (status = '') => {
  const s = String(status || '').toUpperCase();
  if (s.includes('INVESTIGAT')) {
    return { className: 'status-investigating', label: '🔬 Under Investigation' };
  }
  if (s.includes('AI') || s.includes('ANALYZ')) {
    return { className: 'status-ai_analyzed', label: '🤖 AI Analyzed' };
  }
  if (s.includes('ADVIS') || s.includes('AEO')) {
    return { className: 'status-aeo_advised', label: '🛡️ AEO Advised' };
  }
  if (s.includes('RESOLV') || s.includes('CLOSE')) {
    return { className: 'status-resolved', label: '✅ Resolved' };
  }
  return { className: 'status-default', label: s || '📋 Reported' };
};

const getIssueDisplayTitle = (issue) => {
  if (issue.title && issue.title.trim()) return issue.title.trim();

  // Check structured diagnosis
  const diag = issue.ai_analysis?.preliminary_disease ||
    (Array.isArray(issue.ai_analysis) && issue.ai_analysis[0]?.preliminary_disease) ||
    issue.preliminary_disease;
  if (diag && diag.trim()) {
    return `${issue.crop ? `${issue.crop} - ` : ''}${diag.trim()}`;
  }

  const structuredProblem =
    issue.ai_analysis?.structured_data?.complaint?.suspected_problem ||
    (Array.isArray(issue.ai_analysis) && issue.ai_analysis[0]?.structured_data?.complaint?.suspected_problem);
  if (structuredProblem && structuredProblem.trim()) {
    return `${issue.crop ? `${issue.crop} - ` : ''}${structuredProblem.trim()}`;
  }

  // Use description smartly
  if (issue.description) {
    const desc = issue.description.trim();
    if (desc.length <= 60) return desc;
    const match = desc.match(/^[^.!?,\n]+/);
    if (match && match[0].length >= 10 && match[0].length <= 70) {
      return match[0].trim();
    }
    return `${desc.slice(0, 55).trim()}...`;
  }

  return `${issue.crop || 'Crop'} Issue Report`;
};

const getIssueSnippet = (issue) => {
  if (!issue.description) return '';
  const desc = issue.description.trim();
  const title = getIssueDisplayTitle(issue);
  if (title === desc) return '';
  if (desc.length <= 60) return desc;
  return `${desc.slice(0, 60).trim()}...`;
};

export default function MyIssuesPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => getStoredProfile());
  const [issues, setIssues] = useState(() => {
    const p = getStoredProfile();
    if (!p?.farmer_id && !p?.phone) return [];
    try {
      const key = getCacheKey(p);
      const cached = key ? localStorage.getItem(key) : null;
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [expandedIssueId, setExpandedIssueId] = useState(null);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(() => {
    const p = getStoredProfile();
    return Boolean((p?.farmer_id || p?.phone) && issues.length === 0);
  });

  const loadIssues = (farmerPhone = null, silent = false) => {
    if (!silent && issues.length === 0) setLoading(true);
    setError('');

    const promise = getMyIssues(30, farmerPhone);
    if (!promise || typeof promise.then !== 'function') return;

    promise
      .then((data) => {
        const list = data?.incidents || [];
        setIssues(list);

        // Store in user-scoped cache
        const currentProfile = getStoredProfile();
        const key = getCacheKey(currentProfile) || (farmerPhone ? `kisaansathi_my_issues_cache_${farmerPhone}` : 'kisaansathi_my_issues_cache');
        try {
          localStorage.setItem(key, JSON.stringify(list));
        } catch {}

        if (data?.farmer?.id && farmerPhone) {
          const newProfile = {
            farmer_id: data.farmer.id,
            name: data.farmer.name || 'Farmer',
            phone: farmerPhone,
            latitude: data.farmer.latitude,
            longitude: data.farmer.longitude,
          };
          localStorage.setItem('kisaansathi_farmer_profile', JSON.stringify(newProfile));
          setProfile(newProfile);
          if (currentProfile?.phone !== farmerPhone) {
            window.dispatchEvent(new Event('kisaansathi_auth_changed'));
          }
        }
      })
      .catch((err) => {
        if (issues.length === 0) setError(err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const p = getStoredProfile();
    setProfile(p);
    if (p?.farmer_id || p?.phone) {
      loadIssues(p.phone || null, issues.length > 0);
    } else {
      setIssues([]);
      setLoading(false);
    }

    const handleAuthChange = () => {
      const updatedProfile = getStoredProfile();
      setProfile((prev) => {
        if (prev?.phone === updatedProfile?.phone && prev?.farmer_id === updatedProfile?.farmer_id) {
          return prev;
        }
        if (updatedProfile?.farmer_id || updatedProfile?.phone) {
          loadIssues(updatedProfile.phone || null, false);
        } else {
          setIssues([]);
          setLoading(false);
        }
        return updatedProfile;
      });
    };

    window.addEventListener('kisaansathi_auth_changed', handleAuthChange);
    return () => window.removeEventListener('kisaansathi_auth_changed', handleAuthChange);
  }, []);

  const lookupFarmer = (event) => {
    event.preventDefault();
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    const formattedPhone = cleanPhone.length === 10 ? `+91${cleanPhone}` : `+${cleanPhone}`;
    loadIssues(formattedPhone);
  };

  const handleOpenLoginModal = () => {
    window.dispatchEvent(new Event('kisaansathi_open_auth_modal'));
  };

  const toggleExpand = (issueId, e) => {
    if (e) e.stopPropagation();
    setExpandedIssueId((prev) => (prev === issueId ? null : issueId));
  };

  const isLoggedIn = Boolean(profile?.farmer_id || profile?.phone);

  return (
    <main className="community-page my-issues-page">
      <header className="community-hero">
        <div>
          <span className="community-kicker">Your farmer profile</span>
          <h1>📋 My Issues</h1>
          <p>Problems you have reported to your Agricultural Extension Officer.</p>
        </div>
        <Link to="/report" className="btn btn-primary">Report a problem</Link>
      </header>

      <nav className="community-page-tabs" aria-label="Farmer pages">
        <Link className="active" to="/my-issues">📋 My Issues</Link>
        <Link to="/community">👥 Farmer Community</Link>
      </nav>

      {/* If farmer is NOT logged in: Show clear authentication prompt */}
      {!isLoggedIn && (
        <section
          className="card farmer-login-prompt"
          data-testid="farmer-login-prompt"
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: '16px',
            border: '1.5px solid #cbd5e1',
            padding: '32px 28px',
            margin: '24px 0',
            textAlign: 'center',
            boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔒</div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0' }}>
            Farmer Login Required to View Your Issues
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.925rem', maxWidth: '580px', margin: '0 auto 20px auto', lineHeight: 1.5 }}>
            To protect your privacy and show your personal complaints and official officer advisories, please log in with your mobile number.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenLoginModal}
              data-testid="open-auth-modal-btn"
              style={{ borderRadius: '24px', padding: '10px 24px', fontWeight: '700', fontSize: '0.9rem' }}
            >
              🔑 Login with Mobile Number
            </button>
          </div>

          <div style={{ position: 'relative', margin: '20px auto', maxWidth: '420px', textAlign: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '100%', borderTop: '1px solid #e2e8f0' }} />
            </div>
            <div style={{ position: 'relative', display: 'inline-block', backgroundColor: '#f8fafc', padding: '0 12px', fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>
              OR QUICK LOOKUP BY PHONE
            </div>
          </div>

          <form onSubmit={lookupFarmer} style={{ maxWidth: '420px', margin: '0 auto' }}>
            <div className="community-comment-form" style={{ display: 'flex', gap: '8px' }}>
              <input
                aria-label="Mobile number"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="10-digit mobile number"
                maxLength={14}
                style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
              <button type="submit" className="btn btn-primary" style={{ borderRadius: '8px', padding: '10px 18px', fontWeight: '700' }}>
                Find My Issues
              </button>
            </div>
            {error && <div style={{ color: '#dc2626', fontSize: '0.825rem', marginTop: '8px', textAlign: 'left' }}>{error}</div>}
          </form>
        </section>
      )}

      {/* If farmer IS logged in: Render loading state or their issue list */}
      {isLoggedIn && loading && !issues.length && (
        <div className="community-state" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
          Loading your reported issues...
        </div>
      )}

      {isLoggedIn && !loading && error && (
        <div className="community-state community-error" style={{ color: '#dc2626', padding: '24px' }}>
          {error}
        </div>
      )}

      {isLoggedIn && !loading && !error && !issues.length && (
        <div className="community-state" style={{ padding: '40px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1', margin: '20px 0' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🌾</div>
          <h3 style={{ color: '#0f172a', margin: '0 0 6px 0' }}>No Issues Reported Yet</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 16px 0' }}>
            You haven't reported any crop problems under this mobile number yet.
          </p>
          <Link to="/report" className="btn btn-primary" style={{ borderRadius: '20px' }}>
            Report a Problem Now
          </Link>
        </div>
      )}

      {isLoggedIn && issues.length > 0 && (
        <div className="my-issues-list">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '600' }}>
              Showing {issues.length} reported issue{issues.length === 1 ? '' : 's'} for <strong>{profile?.name || profile?.phone}</strong>
            </span>
          </div>

          {issues.map((issue) => {
            const isExpanded = expandedIssueId === issue.id;
            const title = getIssueDisplayTitle(issue);
            const snippet = getIssueSnippet(issue);
            const cropIcon = getCropIcon(issue.crop);
            const statusInfo = getStatusDetails(issue.status);
            const photoSrc = issue.photo_url || (Array.isArray(issue.photos) && issue.photos[0]) || null;
            const hasAudio = Boolean(issue.audio_url);

            return (
              <article
                className={`my-issue-card-minimal ${isExpanded ? 'is-expanded' : ''}`}
                key={issue.id}
                data-testid={`my-issue-card-${issue.id}`}
              >
                {/* Minimal Summary Row */}
                <div
                  className="my-issue-summary-row"
                  onClick={() => toggleExpand(issue.id)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleExpand(issue.id);
                    }
                  }}
                >
                  <div className="my-issue-content">
                    <div className="my-issue-tags-row">
                      {issue.crop && (
                        <span className="my-issue-crop-pill">
                          {cropIcon} {issue.crop}
                        </span>
                      )}
                      <span className={`my-issue-status-pill ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                      <span className="my-issue-date-tag">
                        📅 {issue.created_at ? new Date(issue.created_at).toLocaleDateString() : 'Recently'}
                      </span>
                    </div>

                    <h2 className="my-issue-title" title={title}>
                      {title}
                    </h2>

                    {snippet && (
                      <p className="my-issue-snippet">
                        {snippet}
                      </p>
                    )}

                    <div className="my-issue-action-row">
                      <span className="my-issue-expand-hint">
                        {isExpanded ? '▴ Hide details' : '▾ Click to view full details'}
                      </span>
                      {hasAudio && (
                        <span className="my-issue-voice-chip">
                          🎙️ Voice Recorded
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Thumbnail / Image Container */}
                  <div className="my-issue-thumbnail-box">
                    {photoSrc ? (
                      <img
                        src={photoSrc}
                        alt={`Reported ${issue.crop || 'crop'} issue`}
                        className="my-issue-thumb-img"
                        loading="lazy"
                      />
                    ) : (
                      <div className="my-issue-thumb-placeholder">
                        <span>{cropIcon}</span>
                        <small>{issue.crop || 'Crop'}</small>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Details Tray: Revealed on Click */}
                {isExpanded && (
                  <div className="my-issue-expanded-tray" data-testid={`expanded-tray-${issue.id}`}>
                    {/* Full Spoken Voice Transcript / Description */}
                    <div className="my-issue-quote-box">
                      <div className="my-issue-quote-header">
                        <span className="my-issue-quote-label">
                          🎙️ Complete Farmer Speech / Description:
                        </span>
                      </div>
                      <p className="my-issue-full-transcript">
                        {issue.description || 'No additional transcript recorded.'}
                      </p>

                      {/* Embedded Audio Player if recorded */}
                      {issue.audio_url && (
                        <div className="my-issue-audio-wrapper">
                          <audio controls src={issue.audio_url} style={{ width: '100%', height: '36px' }}>
                            Your browser does not support audio playback.
                          </audio>
                        </div>
                      )}
                    </div>

                    {/* Metadata & Analysis Details */}
                    <div className="my-issue-details-grid">
                      <div className="my-issue-detail-card">
                        <h4>🌾 Crop & Field</h4>
                        <p>{issue.crop || 'General Crop'}</p>
                      </div>
                      <div className="my-issue-detail-card">
                        <h4>🛡️ Officer Status</h4>
                        <p>{statusInfo.label}</p>
                      </div>
                    </div>

                    {/* Photo Gallery if multiple photos */}
                    {Array.isArray(issue.photos) && issue.photos.length > 1 && (
                      <div className="my-issue-photos-row">
                        {issue.photos.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`Photo evidence ${idx + 1}`}
                            className="my-issue-photo-item"
                          />
                        ))}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="my-issue-expanded-actions">
                      <button
                        type="button"
                        className="btn-open-journey"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/community/problems/${issue.id}`);
                        }}
                      >
                        🚀 Open Full Complaint Journey & Advisory →
                      </button>
                      <button
                        type="button"
                        className="btn-collapse-issue"
                        onClick={(e) => toggleExpand(issue.id, e)}
                      >
                        ⌃ Collapse
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}