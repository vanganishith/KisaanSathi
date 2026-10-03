import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyIssues } from '../services/api';

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

  const isLoggedIn = Boolean(profile?.farmer_id || profile?.phone);

  return (
    <main className="community-page my-issues-page" style={{ maxWidth: '980px', margin: '0 auto', padding: '24px 16px 60px' }}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '600' }}>
              Showing {issues.length} reported issue{issues.length === 1 ? '' : 's'} for <strong>{profile?.name || profile?.phone}</strong>
            </span>
          </div>

          {issues.map((issue) => (
            <article
              className="my-issue-card"
              key={issue.id}
              onClick={() => navigate(`/community/problems/${issue.id}`)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') navigate(`/community/problems/${issue.id}`);
              }}
              role="button"
              tabIndex={0}
              data-testid={`my-issue-card-${issue.id}`}
              style={{ cursor: 'pointer' }}
            >
              <div>
                <div className="community-post-tags">
                  {issue.crop && <span className="community-crop-tag">🌱 {issue.crop}</span>}
                  <span className={`issue-status issue-status-${String(issue.status || '').toLowerCase()}`}>
                    {issue.status || 'NEW'}
                  </span>
                </div>
                <h2>{issue.description}</h2>
                <p style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', color: '#16a34a', flexWrap: 'wrap' }}>
                  <span>Reported {issue.created_at ? new Date(issue.created_at).toLocaleDateString() : 'recently'}</span>
                  <span>&bull;</span>
                  <span>Open journey and AEO advice →</span>
                </p>
              </div>
              {(issue.photo_url || issue.photos?.[0]) && (
                <img src={issue.photo_url || issue.photos[0]} alt="Your reported crop problem" loading="lazy" />
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}