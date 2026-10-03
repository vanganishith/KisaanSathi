import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

/**
 * Clean & Simple AEO Officer Login
 * Only 2 user roles exist in KisaanSaathi:
 * 1. Farmer (Public reporting & advisory)
 * 2. AEO (Agriculture Extension Officer - field authority)
 */
export const PRESET_AEOS = [
  {
    officer_id: 'AEO001',
    name: 'Srinivas Rao',
    role: 'AEO',
    designation: 'Agriculture Extension Officer',
    assigned_area: 'Medchal–Malkajgiri & Warangal Division',
    phone: '9876543210',
    email: 'srinivas.aeo@telangana.gov.in',
    password: 'password123',
  },
  {
    officer_id: 'AEO002',
    name: 'Ramesh Kumar',
    role: 'AEO',
    designation: 'Agriculture Extension Officer',
    assigned_area: 'Ghatkesar Agricultural Circle',
    phone: '9876543211',
    email: 'ramesh.aeo@telangana.gov.in',
    password: 'password123',
  },
];

export default function OfficerLoginPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLoginWithOfficer = (officerData) => {
    const sessionData = {
      ...officerData,
      authenticated_at: new Date().toISOString(),
    };
    localStorage.setItem('aeo_officer_session', JSON.stringify(sessionData));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('kisaansathi_auth_changed'));
    }
    navigate('/aeo');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    const cleanCred = credential.trim();
    const cleanPass = password.trim();

    if (!cleanCred) {
      setErrorMessage('Please enter your AEO Officer ID or Phone Number.');
      setIsSubmitting(false);
      return;
    }

    if (!cleanPass) {
      setErrorMessage('Please enter your password.');
      setIsSubmitting(false);
      return;
    }

    // Check against preset AEOs
    const matchedOfficer = PRESET_AEOS.find(
      (a) =>
        a.officer_id.toLowerCase() === cleanCred.toLowerCase() ||
        a.phone === cleanCred ||
        a.email.toLowerCase() === cleanCred.toLowerCase()
    );

    if (matchedOfficer) {
      if (cleanPass === matchedOfficer.password || cleanPass === '123456' || cleanPass === 'password123') {
        handleLoginWithOfficer(matchedOfficer);
      } else {
        setErrorMessage('Invalid Officer ID or password. Please check your credentials.');
      }
      setIsSubmitting(false);
      return;
    }

    setErrorMessage('Invalid Officer ID or password. Please use Officer ID: AEO001 or AEO002.');
    setIsSubmitting(false);
  };

  return (
    <div className="officer-page" data-testid="officer-login-page" style={{ padding: '48px 16px', minHeight: '82vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        className="card officer-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 35px -10px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ backgroundColor: '#ffffff', padding: '32px 24px 20px', textAlign: 'center' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              margin: '0 auto 14px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
            }}
          >
            🏛️
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
            AEO Officer Workspace
          </h1>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>
            Department of Agriculture &bull; Official Officer Portal
          </p>
        </div>

        <div style={{ padding: '0 28px 28px' }}>
          {errorMessage && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '0.8125rem',
                fontWeight: '600',
              }}
              data-testid="login-error-message"
            >
              ⚠️ {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} data-testid="officer-login-form">
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.8125rem', color: '#334155' }}>
                AEO Officer ID
              </label>
              <input
                data-testid="officer-id-input"
                type="text"
                placeholder="e.g. AEO001"
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '11px 13px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  fontSize: '0.9375rem',
                  fontWeight: '600',
                  color: '#0f172a',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#16a34a';
                  e.target.style.backgroundColor = '#ffffff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#cbd5e1';
                  e.target.style.backgroundColor = '#f8fafc';
                }}
              />
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.8125rem', color: '#334155' }}>
                Password
              </label>
              <input
                data-testid="officer-password-input"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '11px 13px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  fontSize: '0.9375rem',
                  fontWeight: '600',
                  color: '#0f172a',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#16a34a';
                  e.target.style.backgroundColor = '#ffffff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#cbd5e1';
                  e.target.style.backgroundColor = '#f8fafc';
                }}
              />
            </div>

            <button
              data-testid="officer-login-submit-btn"
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '13px',
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '0.95rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.28)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) e.currentTarget.style.backgroundColor = '#15803d';
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) e.currentTarget.style.backgroundColor = '#16a34a';
              }}
            >
              {isSubmitting ? 'Verifying Credentials...' : 'Sign In →'}
            </button>
          </form>

          <div style={{ marginTop: '22px', textAlign: 'center' }}>
            <Link to="/" style={{ fontSize: '0.8125rem', color: '#64748b', textDecoration: 'none', fontWeight: '500' }}>
              ← Return to Farmer Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
