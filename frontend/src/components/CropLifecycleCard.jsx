import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function CropLifecycleCard({ cropData, cropStageData }) {
  const { currentLang } = useLanguage();

  const cropName = cropData?.crop_name || 'Chilli';
  const cropAge = cropStageData?.crop_age_days ?? cropData?.crop_age_days;
  const currentStage = cropStageData?.current_stage || cropData?.current_stage || 'Stage estimate unavailable';
  const localizedStage = currentLang === 'te' && cropStageData?.current_stage_te
    ? cropStageData.current_stage_te
    : currentStage;

  const nextStage = cropStageData?.next_stage;
  const daysToNext = cropStageData?.days_to_next_stage;
  const harvestWindow = cropStageData?.approx_harvest_window;
  const careActivities = cropStageData?.stage_care_activities || [];

  // Stage progression indicator (5 universal phases)
  const stages = [
    { key: 'SOWING', label: currentLang === 'te' ? 'విత్తనం' : 'Sowing' },
    { key: 'VEGETATIVE', label: currentLang === 'te' ? 'ఎదుగుదల' : 'Vegetative' },
    { key: 'FLOWERING', label: currentLang === 'te' ? 'పూత' : 'Flowering' },
    { key: 'FRUIT_DEV', label: currentLang === 'te' ? 'కాయ' : 'Fruit' },
    { key: 'HARVEST', label: currentLang === 'te' ? 'కోత' : 'Harvest' },
  ];

  const getStageIndex = () => {
    const s = (currentStage || '').toLowerCase();
    if (s.includes('sow') || s.includes('nursery') || s.includes('germinat')) return 0;
    if (s.includes('vegetative') || s.includes('tillering') || s.includes('establishment')) return 1;
    if (s.includes('flower') || s.includes('heading') || s.includes('panicle')) return 2;
    if (s.includes('fruit') || s.includes('boll') || s.includes('grain') || s.includes('pod')) return 3;
    if (s.includes('matur') || s.includes('harvest') || s.includes('picking')) return 4;
    return 1; // default to vegetative
  };

  const currentIdx = getStageIndex();

  const getCropIcon = (name) => {
    const n = (name || '').toLowerCase();
    if (n.includes('chilli') || n.includes('mirchi')) return '🌶️';
    if (n.includes('paddy') || n.includes('rice')) return '🌾';
    if (n.includes('cotton') || n.includes('patti')) return '🌿';
    if (n.includes('tomato')) return '🍅';
    if (n.includes('maize') || n.includes('corn')) return '🌽';
    if (n.includes('groundnut') || n.includes('peanut')) return '🥜';
    return '🌱';
  };

  return (
    <div
      className="card crop-lifecycle-card"
      data-testid="crop-lifecycle-card"
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        padding: '22px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
            }}
          >
            {getCropIcon(cropName)}
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: '#0f172a' }}>
              {cropName}
            </h3>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
              {cropData?.crop_variety ? `Variety: ${cropData.crop_variety} • ` : ''}
              {cropData?.area ? `${cropData.area} Acres • ` : ''}
              {cropData?.irrigation_method ? `${cropData.irrigation_method.toUpperCase()}` : ''}
            </div>
          </div>
        </div>

        {cropAge !== null && cropAge !== undefined && (
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              padding: '6px 14px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#16a34a', lineHeight: 1 }}>
              {cropAge}
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#15803d', textTransform: 'uppercase' }}>
              {currentLang === 'te' ? 'రోజులు' : 'Days'}
            </div>
          </div>
        )}
      </div>

      {/* Stage Stepper */}
      <div style={{ margin: '20px 0 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: '8px' }}>
          {/* Connecting Progress Line */}
          <div
            style={{
              position: 'absolute',
              top: '14px',
              left: '10%',
              right: '10%',
              height: '4px',
              backgroundColor: '#e2e8f0',
              zIndex: 0,
            }}
          >
            <div
              style={{
                width: `${(currentIdx / (stages.length - 1)) * 100}%`,
                height: '100%',
                backgroundColor: '#16a34a',
                transition: 'width 0.4s ease',
              }}
            />
          </div>

          {stages.map((stg, index) => {
            const isCompleted = index < currentIdx;
            const isCurrent = index === currentIdx;

            return (
              <div
                key={stg.key}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  zIndex: 1,
                  width: '60px',
                }}
              >
                <div
                  style={{
                    width: isCurrent ? '30px' : '24px',
                    height: isCurrent ? '30px' : '24px',
                    borderRadius: '50%',
                    backgroundColor: isCurrent ? '#16a34a' : isCompleted ? '#22c55e' : '#f8fafc',
                    border: isCurrent
                      ? '3px solid #bbf7d0'
                      : isCompleted
                      ? '2px solid #16a34a'
                      : '2px solid #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isCompleted || isCurrent ? '#ffffff' : '#94a3b8',
                    fontSize: '0.75rem',
                    fontWeight: '800',
                    boxShadow: isCurrent ? '0 0 10px rgba(22, 163, 74, 0.4)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: isCurrent ? '800' : '600',
                    color: isCurrent ? '#15803d' : '#64748b',
                    marginTop: '6px',
                    textAlign: 'center',
                  }}
                >
                  {stg.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Stage Badge & Insights */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          borderRadius: '14px',
          padding: '14px 16px',
          border: '1px solid #e2e8f0',
          marginTop: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
              {currentLang === 'te' ? 'ప్రస్తుత దశ' : 'Current Stage'}:
            </span>
            <div style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
              {localizedStage}
            </div>
          </div>

          {nextStage && (
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
                {currentLang === 'te' ? 'తదుపరి దశ' : 'Next Stage'}:
              </span>
              <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#0369a1' }}>
                {nextStage} {daysToNext ? `(in ~${daysToNext}d)` : ''}
              </div>
            </div>
          )}
        </div>

        {harvestWindow && (
          <div style={{ marginTop: '10px', fontSize: '0.825rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📅</span>
            <span>
              <strong>{currentLang === 'te' ? 'అంచనా కోత సమయం:' : 'Harvest Window:'}</strong> {harvestWindow}
            </span>
          </div>
        )}

        {/* Stage Care Activities */}
        {careActivities.length > 0 && (
          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#166534', marginBottom: '6px' }}>
              🛡️ {currentLang === 'te' ? 'ఈ దశలో కీలక జాగ్రత్తలు:' : 'Key Care for this Stage:'}
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.825rem', color: '#334155', lineHeight: 1.5 }}>
              {careActivities.map((act, i) => (
                <li key={i}>{act}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
