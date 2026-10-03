import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function SoilProfileCard({ soilData }) {
  const { currentLang } = useLanguage();

  const soilType = soilData?.soil_type || 'Red soil';
  const isVerified = Boolean(soilData?.is_verified);
  const source = soilData?.source || 'farmer_statement';
  const ph = soilData?.ph;
  const n = soilData?.n;
  const p = soilData?.p;
  const k = soilData?.k;

  return (
    <div
      className="card soil-profile-card"
      data-testid="soil-profile-card"
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        padding: '20px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.4rem' }}>🧪</span>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
              {currentLang === 'te' ? 'నేల సమాచారం (Soil Profile)' : 'Soil Profile'}
            </h4>
            <div style={{ fontSize: '0.825rem', color: '#64748b' }}>
              {currentLang === 'te' ? 'రకం:' : 'Type:'} <strong>{soilType}</strong>
            </div>
          </div>
        </div>

        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: '700',
            padding: '3px 8px',
            borderRadius: '6px',
            backgroundColor: isVerified ? '#ecfdf5' : '#fef3c7',
            color: isVerified ? '#047857' : '#b45309',
            border: isVerified ? '1px solid #a7f3d0' : '1px solid #fde68a',
          }}
        >
          {isVerified ? '🛡️ AEO Verified' : '📝 Farmer Stated'}
        </span>
      </div>

      {/* Soil Parameter Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          margin: '12px 0',
        }}
      >
        <div style={{ backgroundColor: '#f8fafc', padding: '8px', borderRadius: '10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>pH</div>
          <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#334155' }}>
            {ph !== null && ph !== undefined ? ph : '--'}
          </div>
        </div>

        <div style={{ backgroundColor: '#f8fafc', padding: '8px', borderRadius: '10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>N (kg/ha)</div>
          <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#334155' }}>
            {n !== null && n !== undefined ? n : '--'}
          </div>
        </div>

        <div style={{ backgroundColor: '#f8fafc', padding: '8px', borderRadius: '10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>P (kg/ha)</div>
          <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#334155' }}>
            {p !== null && p !== undefined ? p : '--'}
          </div>
        </div>

        <div style={{ backgroundColor: '#f8fafc', padding: '8px', borderRadius: '10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>K (kg/ha)</div>
          <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#334155' }}>
            {k !== null && k !== undefined ? k : '--'}
          </div>
        </div>
      </div>

      {/* Honest Scientific Notice */}
      <div
        style={{
          fontSize: '0.78rem',
          color: '#64748b',
          backgroundColor: '#f1f5f9',
          padding: '8px 12px',
          borderRadius: '8px',
          lineHeight: 1.4,
        }}
      >
        ℹ️ {currentLang === 'te'
          ? 'ఖచ్చితమైన pH & N-P-K విలువలు ల్యాబ్ పరీక్ష నివేదిక ద్వారా మాత్రమే తెలుస్తాయి. సాధారణ ఫోటో ఆధారంగా రసాయన పరిమాణాలను ఊహించలేము.'
          : 'Exact pH & NPK nutrient quantities require a laboratory soil test report. Standard photos do not fabricate chemical measurements.'}
      </div>
    </div>
  );
}
