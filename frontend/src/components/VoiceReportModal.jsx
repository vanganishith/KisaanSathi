import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { createVoiceCommunityReport, createCommunityReport } from '../services/api';

export default function VoiceReportModal({
  isOpen,
  onClose,
  farmerPhone,
  activeCrop = 'Chilli',
  onReportCreated,
}) {
  const { currentLang } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const [speechText, setSpeechText] = useState('');
  const [category, setCategory] = useState('crop_health');
  const [crop, setCrop] = useState(activeCrop);
  const [photoUrls, setPhotoUrls] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const recognitionRef = useRef(null);

  const getRecognitionLang = () => {
    if (currentLang === 'te') return 'te-IN';
    if (currentLang === 'hi') return 'hi-IN';
    return 'en-IN';
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = getRecognitionLang();

      recognition.onstart = () => {
        setIsListening(true);
        setStatusMsg(currentLang === 'te' ? 'వినబడుతోంది... మాట్లాడండి' : 'Listening... Speak now');
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setSpeechText(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
        setStatusMsg(currentLang === 'te' ? 'మళ్లీ ప్రయత్నించండి' : 'Try speaking again');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [currentLang]);

  if (!isOpen) return null;

  const toggleMic = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setSpeechText('');
      if (recognitionRef.current) {
        try {
          recognitionRef.current.lang = getRecognitionLang();
          recognitionRef.current.start();
        } catch {}
      }
    }
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (upEvt) => {
        setPhotoUrls((prev) => [...prev, upEvt.target.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async () => {
    if (!speechText.trim() && photoUrls.length === 0) return;
    setSubmitting(true);
    setStatusMsg(currentLang === 'te' ? 'ప్రచురిస్తున్నాము...' : 'Publishing...');
    try {
      const res = await createCommunityReport({
        farmer_phone: farmerPhone || '9876543210',
        crop: crop || 'Chilli',
        category: category,
        description: speechText.trim() || 'Photo issue report',
        transcript: speechText.trim(),
        photo_urls: photoUrls,
        language: currentLang || 'te',
      });
      if (onReportCreated) onReportCreated(res);
      onClose();
    } catch (err) {
      console.error('[VoiceReportModal] error:', err);
      setStatusMsg(currentLang === 'te' ? 'సమస్య వచ్చింది. మళ్లీ ప్రయత్నించండి.' : 'Error publishing report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="voice-report-modal"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          padding: '24px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.4rem' }}>📢</span>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
              {currentLang === 'te' ? 'కమ్యూనిటీ నివేదిక ప్రచురించండి' : 'Share with Local Farmers'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
          >
            ✕
          </button>
        </div>

        {/* Big Mic Button */}
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <button
            type="button"
            onClick={toggleMic}
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: isListening ? '#ef4444' : '#0284c7',
              color: '#ffffff',
              border: 'none',
              fontSize: '1.8rem',
              cursor: 'pointer',
              boxShadow: isListening ? '0 0 20px rgba(239,68,68,0.5)' : '0 6px 18px rgba(2,132,199,0.3)',
            }}
          >
            {isListening ? '⏹️' : '🎤'}
          </button>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '8px', fontWeight: '600' }}>
            {isListening
              ? (currentLang === 'te' ? 'వినబడుతోంది... మాట్లాడండి' : 'Listening...')
              : (currentLang === 'te' ? 'మాట్లాడటానికి మైక్రోఫోన్ నొక్కండి' : 'Tap mic to speak your problem')}
          </div>
        </div>

        {/* Text Input */}
        <textarea
          rows={3}
          value={speechText}
          onChange={(e) => setSpeechText(e.target.value)}
          placeholder={
            currentLang === 'te'
              ? 'మీ పంట సమస్యను చెప్పండి లేదా రాయండి (ఉదా: ఆకులు ముడుచుకుంటున్నాయి...)'
              : 'Describe what you see on your crop...'
          }
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            fontSize: '0.9rem',
            boxSizing: 'border-box',
            marginBottom: '12px',
          }}
        />

        {/* Crop & Category Chips */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>
              {currentLang === 'te' ? 'పంట' : 'Crop'}
            </label>
            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="Chilli">🌶️ Chilli (మిరప)</option>
              <option value="Paddy">🌾 Paddy (వరి)</option>
              <option value="Cotton">🌿 Cotton (పత్తి)</option>
              <option value="Tomato">🍅 Tomato (టమాటా)</option>
              <option value="Groundnut">🥜 Groundnut (వేరుశనగ)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>
              {currentLang === 'te' ? 'సమస్య రకం' : 'Category'}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="crop_health">🌱 Health / Symptoms</option>
              <option value="pest">🐛 Pest (పురుగు)</option>
              <option value="disease">🍄 Disease (తెగులు)</option>
              <option value="weather_damage">🌦️ Weather Damage</option>
              <option value="fertilizer">🧪 Fertilizer / Nutrient</option>
            </select>
          </div>
        </div>

        {/* Photos list */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
          {photoUrls.map((p, idx) => (
            <img key={idx} src={p} alt="Upload preview" style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} />
          ))}
          {photoUrls.length < 2 && (
            <label
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '8px',
                border: '1.5px dashed #94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '1.2rem',
                backgroundColor: '#f8fafc',
              }}
            >
              📷
              <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
            </label>
          )}
        </div>

        {statusMsg && (
          <div style={{ fontSize: '0.8rem', color: '#0284c7', marginBottom: '10px', textAlign: 'center', fontWeight: '600' }}>
            {statusMsg}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            data-testid="submit-voice-report-btn"
            style={{
              flex: 1,
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '12px',
              fontWeight: '800',
              fontSize: '0.95rem',
              cursor: 'pointer',
            }}
          >
            {submitting ? (currentLang === 'te' ? 'ప్రచురిస్తున్నాము...' : 'Publishing...') : (currentLang === 'te' ? '📢 ప్రచురించండి' : '📢 Publish Alert')}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: '#f1f5f9',
              color: '#64748b',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 16px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            {currentLang === 'te' ? 'రద్దు' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
