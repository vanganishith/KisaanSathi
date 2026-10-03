import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function WeatherContextCard({ weatherData }) {
  const { currentLang } = useLanguage();

  if (!weatherData || !weatherData.available) {
    return (
      <div
        className="card weather-card"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '18px',
          padding: '18px',
          border: '1px solid #e2e8f0',
          marginBottom: '20px',
        }}
      >
        <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
          ⏳ {currentLang === 'te' ? 'వాతావరణ వివరాలు అందుబాటులో లేవు' : 'Weather information loading...'}
        </div>
      </div>
    );
  }

  const temp = weatherData.temperature_c ?? 31.0;
  const humidity = weatherData.relative_humidity_pct ?? 58.0;
  const precipProb = weatherData.precipitation_probability_pct ?? 10;
  const condition = weatherData.weather_condition || 'Partly cloudy';
  const windKmh = weatherData.wind_speed_kmh ?? 12.0;
  const hints = weatherData.agricultural_hints || [];

  const getWeatherIcon = (cond) => {
    const c = (cond || '').toLowerCase();
    if (c.includes('rain') || c.includes('drizzle')) return '🌧️';
    if (c.includes('thunder')) return '⛈️';
    if (c.includes('clear') || c.includes('sunny')) return '☀️';
    if (c.includes('cloud') || c.includes('overcast')) return '⛅';
    if (c.includes('fog')) return '🌫️';
    return '⛅';
  };

  return (
    <div
      className="card weather-context-card"
      data-testid="weather-context-card"
      style={{
        background: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)',
        borderRadius: '20px',
        padding: '20px',
        border: '1px solid #bae6fd',
        boxShadow: '0 4px 16px rgba(186, 230, 253, 0.3)',
        marginBottom: '20px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.25rem' }}>🌤️</span>
          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0369a1' }}>
            {currentLang === 'te' ? 'పొలం వాతావరణం & సలహా' : 'Farm Weather & Agronomic Advisory'}
          </h4>
        </div>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: '700',
            color: '#0284c7',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            padding: '2px 8px',
            borderRadius: '6px',
            border: '1px solid rgba(2, 132, 199, 0.2)',
          }}
        >
          {weatherData.source || 'Open-Meteo'}
        </span>
      </div>

      {/* Main Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
          gap: '10px',
          marginBottom: '14px',
        }}
      >
        {/* Temp */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '10px 8px',
            textAlign: 'center',
            border: '1px solid #e0f2fe',
          }}
        >
          <div style={{ fontSize: '1.4rem' }}>{getWeatherIcon(condition)}</div>
          <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
            {temp}°C
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>
            {condition}
          </div>
        </div>

        {/* Humidity */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '10px 8px',
            textAlign: 'center',
            border: '1px solid #e0f2fe',
          }}
        >
          <div style={{ fontSize: '1.4rem' }}>💧</div>
          <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
            {humidity}%
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>
            {currentLang === 'te' ? 'తేమ' : 'Humidity'}
          </div>
        </div>

        {/* Rain Probability */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '10px 8px',
            textAlign: 'center',
            border: '1px solid #e0f2fe',
          }}
        >
          <div style={{ fontSize: '1.4rem' }}>🌧️</div>
          <div style={{ fontSize: '1.15rem', fontWeight: '800', color: precipProb > 50 ? '#dc2626' : '#0f172a' }}>
            {precipProb}%
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>
            {currentLang === 'te' ? 'వర్ష సంభావ్యత' : 'Rain Prob'}
          </div>
        </div>

        {/* Wind */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '10px 8px',
            textAlign: 'center',
            border: '1px solid #e0f2fe',
          }}
        >
          <div style={{ fontSize: '1.4rem' }}>💨</div>
          <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
            {windKmh}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>
            km/h
          </div>
        </div>
      </div>

      {/* Actionable Agricultural Hints */}
      {hints.length > 0 && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '12px 14px',
            border: '1px solid #bae6fd',
          }}
        >
          <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#0284c7', marginBottom: '4px', textTransform: 'uppercase' }}>
            🚜 {currentLang === 'te' ? 'ఈ రోజు వ్యవసాయ కార్యాచరణ:' : 'Today Agronomic Context:'}
          </div>
          {hints.map((hint, i) => (
            <div key={i} style={{ fontSize: '0.85rem', color: '#334155', marginTop: '3px', lineHeight: 1.4 }}>
              • {hint}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
