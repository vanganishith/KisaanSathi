import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { assessCropHealth } from '../services/api';

export default function CropHealthCheckCard({
  fieldId,
  cropCycleId,
  farmerPhone,
  onCaseCreated,
}) {
  const { currentLang } = useLanguage();
  const [selectedImages, setSelectedImages] = useState([]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setSelectedImages((prev) => [...prev, uploadEvent.target.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleRunAssessment = async () => {
    if (selectedImages.length === 0 && !description.trim()) {
      setError(
        currentLang === 'te'
          ? 'దయచేసి పంట ఫోటో లేదా సమస్య వివరణను నమోదు చేయండి.'
          : 'Please select a crop photo or describe the symptom.'
      );
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await assessCropHealth({
        field_id: fieldId,
        crop_cycle_id: cropCycleId,
        farmer_phone: farmerPhone,
        transcript: description,
        image_base64_list: selectedImages,
        language: currentLang || 'te',
      });

      if (res.success) {
        setResult(res);
        if (res.case_id && onCaseCreated) {
          onCaseCreated(res.case_id);
        }
      } else {
        setError(res.detail || 'Assessment could not be completed.');
      }
    } catch (err) {
      console.error('[CropHealthCheckCard] Assessment failed:', err);
      setError(
        currentLang === 'te'
          ? 'సర్వర్ కనెక్షన్‌లో లోపం ఏర్పడింది. దయచేసి మళ్లీ ప్రయత్నించండి.'
          : 'Unable to reach health engine. Please check your network and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadgeColor = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' };
      case 'HIGH':
        return { bg: '#ffedd5', text: '#9a3412', border: '#f97316' };
      case 'MEDIUM':
        return { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' };
      default:
        return { bg: '#ecfdf5', text: '#065f46', border: '#10b981' };
    }
  };

  return (
    <div
      className="card crop-health-check-card"
      data-testid="crop-health-check-card"
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        padding: '20px',
        border: '1.5px solid #cbd5e1',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.6rem' }}>🔍</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
              {currentLang === 'te' ? 'పంట ఆరోగ్య నిర్ధారణ (Crop Health Check)' : 'Crop Health Diagnosis'}
            </h3>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {currentLang === 'te' ? 'లక్షణాలు / ఫోటో విశ్లేషణ + AEO సమీక్ష' : 'Multimodal Vision + Context Engine'}
            </div>
          </div>
        </div>
      </div>

      {/* Multi-photo upload area */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {selectedImages.map((img, idx) => (
            <div
              key={idx}
              style={{
                position: 'relative',
                width: '72px',
                height: '72px',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '2px solid #3b82f6',
              }}
            >
              <img src={img} alt={`Crop upload ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  fontSize: '12px',
                  lineHeight: '18px',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                ✕
              </button>
            </div>
          ))}

          {selectedImages.length < 3 && (
            <label
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '12px',
                border: '2px dashed #94a3b8',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                backgroundColor: '#f8fafc',
                color: '#64748b',
                fontSize: '0.75rem',
                fontWeight: '600',
              }}
            >
              <span style={{ fontSize: '1.2rem', marginBottom: '2px' }}>📷</span>
              <span>{selectedImages.length === 0 ? (currentLang === 'te' ? 'ఫోటో' : 'Photo') : '+ ఫోటో'}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
            </label>
          )}
        </div>

        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={
            currentLang === 'te'
              ? 'ఆకులపై మచ్చలు, రంగు మారడం వంటి వివరాలు తెలపండి...'
              : 'Describe leaf spots, curling, or symptoms (or speak above)...'
          }
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid #cbd5e1',
            fontSize: '0.875rem',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {error && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#fef2f2',
            color: '#b91c1c',
            borderRadius: '10px',
            fontSize: '0.85rem',
            marginBottom: '12px',
          }}
        >
          {error}
        </div>
      )}

      {/* Action Button */}
      <button
        type="button"
        onClick={handleRunAssessment}
        disabled={loading}
        data-testid="run-crop-health-btn"
        style={{
          width: '100%',
          backgroundColor: '#059669',
          color: '#ffffff',
          border: 'none',
          borderRadius: '12px',
          padding: '12px 16px',
          fontWeight: '800',
          fontSize: '0.95rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
        }}
      >
        {loading ? (
          <>
            <span className="spinner" style={{ width: '16px', height: '16px' }}></span>
            <span>{currentLang === 'te' ? 'విశ్లేషిస్తున్నాము...' : 'Analyzing crop health...'}</span>
          </>
        ) : (
          <>
            <span>🌱</span>
            <span>{currentLang === 'te' ? 'పంట ఆరోగ్యాన్ని తనిఖీ చేయండి' : 'Diagnose Crop Health'}</span>
          </>
        )}
      </button>

      {/* Assessment Results Section */}
      {result && (
        <div
          data-testid="crop-health-result"
          style={{
            marginTop: '16px',
            padding: '16px',
            backgroundColor: '#f8fafc',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
          }}
        >
          {result.image_insufficient ? (
            <div
              style={{
                backgroundColor: '#fffbeb',
                borderLeft: '4px solid #f59e0b',
                padding: '12px',
                borderRadius: '8px',
                color: '#92400e',
                fontSize: '0.9rem',
              }}
            >
              <div style={{ fontWeight: '800', marginBottom: '4px' }}>
                📷 {currentLang === 'te' ? 'చిత్రం అస్పష్టంగా ఉంది' : 'Photo Quality Insufficient'}
              </div>
              <div>
                {result.farmer_response ||
                  (currentLang === 'te'
                    ? 'స్పష్టమైన వ్యాధి నిర్ధారణ కోసం దయచేసి ఆకు దగ్గరగా ఉండే స్పష్టమైన ఫోటోను అప్‌లోడ్ చేయండి.'
                    : 'Image quality is insufficient for reliable diagnosis. Please upload a clear, well-lit photo of the affected leaf.')}
              </div>
            </div>
          ) : (
            <>
              {/* Header Badges */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {result.severity && (
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '800',
                        backgroundColor: getSeverityBadgeColor(result.severity).bg,
                        color: getSeverityBadgeColor(result.severity).text,
                        border: `1px solid ${getSeverityBadgeColor(result.severity).border}`,
                      }}
                    >
                      {result.severity} SEVERITY
                    </span>
                  )}
                  {result.confidence !== undefined && (
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        backgroundColor: '#e0f2fe',
                        color: '#0369a1',
                      }}
                    >
                      {Math.round(result.confidence * 100)}% Match
                    </span>
                  )}
                </div>

                {result.requires_aeo && (
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '800',
                      backgroundColor: '#fef3c7',
                      color: '#b45309',
                      border: '1px solid #fde68a',
                    }}
                  >
                    {currentLang === 'te' ? '👨‍🌾 AEO సమీక్షకు పంపబడింది' : '👨‍🌾 Sent for AEO Review'}
                  </span>
                )}
              </div>

              {/* Farmer Response */}
              <div
                style={{
                  fontSize: '0.95rem',
                  fontWeight: '700',
                  color: '#0f172a',
                  marginBottom: '10px',
                  lineHeight: 1.4,
                }}
              >
                {result.farmer_response}
              </div>

              {/* Possible Issues Identified */}
              {result.possible_issues && result.possible_issues.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>
                    {currentLang === 'te' ? 'గుర్తించబడిన సంభావ్య సమస్యలు:' : 'Identified Candidates:'}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {result.possible_issues.map((iss, i) => (
                      <span
                        key={i}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '4px 10px',
                          fontSize: '0.8rem',
                          color: '#334155',
                          fontWeight: '600',
                        }}
                      >
                        {iss.name} ({Math.round(iss.confidence * 100)}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Actions */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div style={{ backgroundColor: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
                    {currentLang === 'te' ? 'తదుపరి సిఫార్సులు:' : 'Recommended Actions:'}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', color: '#475569' }}>
                    {result.recommendations.map((rec, i) => (
                      <li key={i} style={{ marginBottom: '3px' }}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.case_id && (
                <div style={{ marginTop: '10px', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'right' }}>
                  Case ID: #{result.case_id}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
