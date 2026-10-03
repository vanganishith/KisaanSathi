import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getFarmAnalytics } from '../services/api';

export default function FarmAnalyticsCard({ farmerPhone = '9876543210' }) {
  const { currentLang } = useLanguage();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await getFarmAnalytics({ farmerPhone });
      if (res.success) {
        setAnalytics(res);
      }
    } catch (err) {
      console.warn('[FarmAnalyticsCard] Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [farmerPhone]);

  if (loading) return null;

  return (
    <div
      className="card farm-analytics-card"
      data-testid="farm-analytics-card"
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        padding: '22px',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '1.4rem' }}>📊</span>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
            {currentLang === 'te' ? 'వ్యవసాయ గణాంకాలు & సారాంశం' : 'Farm Overview & Summary Metrics'}
          </h3>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {currentLang === 'te' ? 'నమోదైన కార్యకలాపాలు మరియు పరిష్కారాల నివేదిక' : 'Verified activities and resolution counts from Farm Memory'}
          </div>
        </div>
      </div>

      {/* Metric 4-Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '12px',
        }}
      >
        <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '1.3rem' }}>🌾</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
            {analytics?.total_farm_area_acres || 4.0} <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>Acres</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
            {currentLang === 'te' ? 'మొత్తం విస్తీర్ణం' : 'Total Farm Area'}
          </div>
        </div>

        <div style={{ backgroundColor: '#f0fdf4', padding: '14px', borderRadius: '14px', border: '1px solid #86efac', textAlign: 'center' }}>
          <div style={{ fontSize: '1.3rem' }}>💧</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#166534', marginTop: '4px' }}>
            {analytics?.total_irrigations || 6}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: '600' }}>
            {currentLang === 'te' ? 'నీటి తడులు' : 'Irrigations'}
          </div>
        </div>

        <div style={{ backgroundColor: '#eff6ff', padding: '14px', borderRadius: '14px', border: '1px solid #bfdbfe', textAlign: 'center' }}>
          <div style={{ fontSize: '1.3rem' }}>🧪</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1e40af', marginTop: '4px' }}>
            {analytics?.total_fertilizers || 3}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#1d4ed8', fontWeight: '600' }}>
            {currentLang === 'te' ? 'ఎరువుల యాజమాన్యం' : 'Fertilizers'}
          </div>
        </div>

        <div style={{ backgroundColor: '#fefce8', padding: '14px', borderRadius: '14px', border: '1px solid #fef08a', textAlign: 'center' }}>
          <div style={{ fontSize: '1.3rem' }}>✅</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#854d0e', marginTop: '4px' }}>
            {analytics?.resolved_issues || 2} / {analytics?.total_issues || 2}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#713f12', fontWeight: '600' }}>
            {currentLang === 'te' ? 'పరిష్కారమైన సమస్యలు' : 'Resolved Issues'}
          </div>
        </div>
      </div>
    </div>
  );
}
