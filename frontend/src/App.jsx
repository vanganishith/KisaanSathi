import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import FarmerPage from './pages/FarmerPage';
import OfficerLoginPage from './pages/OfficerLoginPage';
import AeoDashboard from './pages/AeoDashboard';
import CommunityPage from './pages/CommunityPage';
import MyIssuesPage from './pages/MyIssuesPage';
import ComplaintJourneyPage from './pages/ComplaintJourneyPage';
import PlanMyCropPage from './pages/PlanMyCropPage';
import FarmerPillarHome from './pages/FarmerPillarHome';
import LanguageSelector from './components/LanguageSelector';
import AuthModal from './components/AuthModal';
import FarmerNotificationDrawer from './components/FarmerNotificationDrawer';
import { getUnreadNotificationsCount } from './services/communityDataStore';
import { LanguageProvider, useLanguage } from './context/LanguageContext';

function MainLayout() {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const isAeoRoute = location.pathname.startsWith('/aeo') || location.pathname.startsWith('/dashboard');

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(() => getUnreadNotificationsCount());
  const [authSession, setAuthSession] = useState(() => {
    try {
      const farmer = JSON.parse(localStorage.getItem('kisaansathi_farmer_profile') || 'null');
      const officer = JSON.parse(localStorage.getItem('aeo_officer_session') || 'null');
      return { farmer, officer };
    } catch {
      return { farmer: null, officer: null };
    }
  });

  const syncAuth = () => {
    try {
      const farmer = JSON.parse(localStorage.getItem('kisaansathi_farmer_profile') || 'null');
      const officer = JSON.parse(localStorage.getItem('aeo_officer_session') || 'null');
      setAuthSession({ farmer, officer });
    } catch {
      setAuthSession({ farmer: null, officer: null });
    }
  };

  useEffect(() => {
    window.addEventListener('storage', syncAuth);
    window.addEventListener('kisaansathi_auth_changed', syncAuth);
    const handleOpenAuth = () => setIsAuthModalOpen(true);
    window.addEventListener('kisaansathi_open_auth_modal', handleOpenAuth);
    const syncNotifs = () => setUnreadCount(getUnreadNotificationsCount());
    window.addEventListener('krishi_community_storage_updated', syncNotifs);
    return () => {
      window.removeEventListener('storage', syncAuth);
      window.removeEventListener('kisaansathi_auth_changed', syncAuth);
      window.removeEventListener('kisaansathi_open_auth_modal', handleOpenAuth);
      window.removeEventListener('krishi_community_storage_updated', syncNotifs);
    };
  }, []);

  const handleFarmerLogout = () => {
    localStorage.removeItem('kisaansathi_farmer_profile');
    try {
      localStorage.removeItem('kisaansathi_my_issues_cache');
      // Clear any phone-scoped issue caches
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('kisaansathi_my_issues_cache')) {
          localStorage.removeItem(key);
        }
      });
    } catch {}
    window.dispatchEvent(new Event('kisaansathi_auth_changed'));
    syncAuth();
  };

  const handleOfficerLogout = () => {
    localStorage.removeItem('aeo_officer_session');
    window.dispatchEvent(new Event('kisaansathi_auth_changed'));
    syncAuth();
    navigate('/officer-login');
  };

  return (
    <div className="app-container">
      {/* Universal Login Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* Global Farmer Notifications Drawer */}
      <FarmerNotificationDrawer
        isOpen={isNotifDrawerOpen}
        onClose={() => {
          setIsNotifDrawerOpen(false);
          setUnreadCount(getUnreadNotificationsCount());
        }}
      />

      {/* Navigation Bar: If on AEO Workspace, show ONLY dedicated AEO header with Logout */}
      {isAeoRoute ? (
        <header
          className="navbar aeo-navbar"
          style={{
            backgroundColor: '#0f172a',
            color: '#ffffff',
            padding: '14px 28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #1e293b',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '1.5rem' }}>🏛️</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontWeight: '800', fontSize: '1.05rem', color: '#ffffff', letterSpacing: '-0.01em' }}>
                  KisaanSaathi
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    color: '#86efac',
                    backgroundColor: 'rgba(22, 163, 74, 0.2)',
                    border: '1px solid rgba(134, 239, 172, 0.3)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  AEO Workspace
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                Officer: {authSession.officer?.name || 'Srinivas Rao'} ({authSession.officer?.officer_id || 'AEO001'}) &bull; Department of Agriculture
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-sm btn-navbar-logout"
              onClick={handleOfficerLogout}
              data-testid="navbar-logout-btn"
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 20px',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.35)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#b91c1c')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#dc2626')}
            >
              <span>🚪</span> Logout
            </button>
          </div>
        </header>
      ) : (
        /* Regular Farmer Navigation Bar */
        <header className="navbar">
          <div className="navbar-left">
            <Link to="/" className="navbar-brand">
              <span className="brand-logo">🌱</span>
              <span className="brand-name">{t.appName || 'KisaanSathi'}</span>
            </Link>

            <nav className="nav-links">
              <NavLink
                to="/farm"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                style={{ fontWeight: '800', color: '#16a34a' }}
              >
                🌾 {t.navMyFarm || 'My Farm'}
              </NavLink>
              <NavLink
                to="/my-issues"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                📋 My Issues
              </NavLink>
              <NavLink
                to="/community"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                👥 Community
              </NavLink>
              <NavLink
                to="/plan-my-crop"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                🌱 Plan My Crop
              </NavLink>
              <Link
                to="/report"
                className="nav-link nav-link-highlight"
              >
                Report a Problem
              </Link>
            </nav>
          </div>

          <div className="navbar-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* 1. Notifications: Symbol only with badge, uncluttered */}
            <button
              type="button"
              className="btn-navbar-bell-circle"
              onClick={() => setIsNotifDrawerOpen(true)}
              title="Notifications & Advisories"
              data-testid="navbar-notifications-btn"
              style={{
                position: 'relative',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.15rem',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
            >
              <span>🔔</span>
              {unreadCount > 0 && (
                <span
                  className="notif-unread-badge"
                  data-testid="navbar-notif-badge"
                  style={{
                    position: 'absolute',
                    top: '-3px',
                    right: '-3px',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    fontSize: '0.675rem',
                    fontWeight: '800',
                    minWidth: '17px',
                    height: '17px',
                    borderRadius: '9px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    boxShadow: '0 2px 5px rgba(220, 38, 38, 0.4)',
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {/* 2. Multi-language Selector */}
            <LanguageSelector />

            {/* 3. User Avatar Profile (Single letter only, click reveals dropdown with logout) */}
            {authSession.farmer?.name ? (
              <div className="navbar-user-dropdown-wrap" style={{ position: 'relative' }} data-testid="navbar-farmer-group">
                <button
                  type="button"
                  className="navbar-avatar-only-btn"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  title={`Signed in as ${authSession.farmer.name} (Click for options)`}
                  data-testid="navbar-avatar-btn"
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: '#15803d',
                    color: '#ffffff',
                    border: '2px solid #86efac',
                    fontWeight: '800',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(21, 128, 61, 0.25)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  {(authSession.farmer.name || 'F').charAt(0).toUpperCase()}
                </button>

                {isProfileMenuOpen && (
                  <>
                    <div
                      className="dropdown-transparent-overlay"
                      onClick={() => setIsProfileMenuOpen(false)}
                      style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                    />
                    <div
                      className="navbar-profile-popover"
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 'calc(100% + 8px)',
                        width: '210px',
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.14), 0 2px 6px rgba(0, 0, 0, 0.06)',
                        border: '1px solid #e2e8f0',
                        zIndex: 100,
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                        <div
                          style={{
                            fontSize: '0.9rem',
                            fontWeight: '800',
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {authSession.farmer.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                          🌾 Registered Farmer
                        </div>
                      </div>

                      <Link
                        to="/my-issues"
                        onClick={() => setIsProfileMenuOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          color: '#334155',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <span>📋</span> My Issues
                      </Link>

                      <button
                        type="button"
                        className="btn btn-sm btn-navbar-logout"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          handleFarmerLogout();
                        }}
                        title="Logout from farmer account"
                        data-testid="navbar-logout-btn"
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '8px 12px',
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          borderRadius: '8px',
                          fontWeight: '700',
                          fontSize: '0.825rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          marginTop: '4px',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fee2e2')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                      >
                        <span>🚪</span> Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : authSession.officer?.officer_id ? (
              <div className="navbar-user-dropdown-wrap" style={{ position: 'relative' }} data-testid="navbar-officer-group">
                <button
                  type="button"
                  className="navbar-avatar-only-btn"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  title={`Officer ${authSession.officer.officer_id}`}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: '#1e293b',
                    color: '#ffffff',
                    border: '2px solid #94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                  }}
                >
                  🏛️
                </button>

                {isProfileMenuOpen && (
                  <>
                    <div
                      className="dropdown-transparent-overlay"
                      onClick={() => setIsProfileMenuOpen(false)}
                      style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                    />
                    <div
                      className="navbar-profile-popover"
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 'calc(100% + 8px)',
                        width: '210px',
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.14)',
                        border: '1px solid #e2e8f0',
                        zIndex: 100,
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>
                          Officer: {authSession.officer.officer_id}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Department of Agriculture
                        </div>
                      </div>

                      <Link
                        to="/aeo"
                        onClick={() => setIsProfileMenuOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          color: '#334155',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          textDecoration: 'none',
                        }}
                      >
                        <span>🏛️</span> AEO Workspace
                      </Link>

                      <button
                        type="button"
                        className="btn btn-sm btn-navbar-logout"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          handleOfficerLogout();
                        }}
                        title="Logout from officer session"
                        data-testid="navbar-logout-btn"
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '8px 12px',
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          borderRadius: '8px',
                          fontWeight: '700',
                          fontSize: '0.825rem',
                          cursor: 'pointer',
                        }}
                      >
                        <span>🚪</span> Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-navbar-login"
                onClick={() => setIsAuthModalOpen(true)}
                data-testid="navbar-login-btn"
              >
                Login
              </button>
            )}
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/farm" element={<FarmerPillarHome />} />
          <Route path="/pillars" element={<FarmerPillarHome />} />
          <Route path="/report" element={<FarmerPage />} />
          <Route path="/farmer" element={<FarmerPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/my-issues" element={<MyIssuesPage />} />
          <Route path="/community/problems/:problemId" element={<ComplaintJourneyPage />} />
          <Route path="/issues/:problemId" element={<ComplaintJourneyPage />} />
          <Route path="/plan-my-crop" element={<PlanMyCropPage />} />
          <Route path="/officer-login" element={<OfficerLoginPage />} />
          <Route path="/aeo" element={<AeoDashboard />} />
          <Route path="/dashboard" element={<AeoDashboard />} />
        </Routes>
      </main>

      {/* Footer (hidden on AEO workspace) */}
      {!isAeoRoute && (
        <footer className="footer">
          <div className="footer-content">
            <div className="footer-brand">
              <span className="brand-logo">🌱</span>
              <strong>{t.appName || 'KisaanSathi'}</strong>
              <span className="footer-tagline">&mdash; {t.footerTitle}</span>
            </div>
            <p className="footer-subtext">
              {t.footerSubtext}
            </p>
            <div className="footer-links">
              <Link to="/">{t.navHome}</Link>
              <Link to="/report">{t.navReport}</Link>
              <Link to="/officer-login">{t.navOfficerLogin}</Link>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <MainLayout />
    </LanguageProvider>
  );
}
