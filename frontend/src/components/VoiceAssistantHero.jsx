import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { askVoiceQuestion, synthesizeSpeech } from '../services/api';

export default function VoiceAssistantHero({
  farmer,
  onContextUpdated,
  activeCrop,
  cropAge,
  farmContext,
}) {
  const { currentLang } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [speechText, setSpeechText] = useState('');
  const speechTextRef = useRef('');
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceResult, setVoiceResult] = useState(null); // { is_relevant, farmer_response, short_summary, recommended_action, transcript }
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const updateSpeechText = (text) => {
    speechTextRef.current = text;
    setSpeechText(text);
  };

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  // Dynamic values derived from farmContext
  const weather = farmContext?.weather || {};
  const temp = weather.temperature_c ? `${Math.round(weather.temperature_c)}°C` : '31°C';
  const weatherCondition = weather.weather_condition || (currentLang === 'te' ? 'ఎండగా ఉంది' : 'Partly Cloudy');
  const cropStageName = farmContext?.cropStage?.current_stage || (currentLang === 'te' ? 'మొలక దశ' : 'Seedling Stage');
  const daysText = cropAge !== null && cropAge !== undefined ? (currentLang === 'te' ? `${cropAge}వ రోజు` : `Day ${cropAge}`) : (currentLang === 'te' ? '1వ రోజు' : 'Day 1');
  const resolvedCrop = activeCrop || farmContext?.crop?.crop_name || farmContext?.crop_cycles?.[0]?.crop_name || 'Groundnut';
  const latestAeo = farmContext?.aeo_advisory || farmContext?.aeoAdvisories?.[0] || farmContext?.latest_aeo;

  // Determine speech recognition language tag
  const getRecognitionLang = () => {
    if (currentLang === 'te') return 'te-IN';
    if (currentLang === 'hi') return 'hi-IN';
    if (currentLang === 'ta') return 'ta-IN';
    if (currentLang === 'kn') return 'kn-IN';
    return 'en-IN';
  };

  // Clean up media tracks and timers on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, []);

  const playVoiceAudio = async (text) => {
    if (!text) return;
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = getRecognitionLang();
        utterance.rate = 0.92;
        utterance.onstart = () => setIsPlayingAudio(true);
        utterance.onend = () => setIsPlayingAudio(false);
        utterance.onerror = () => setIsPlayingAudio(false);
        window.speechSynthesis.speak(utterance);
        return;
      } catch {}
    }
    try {
      setIsPlayingAudio(true);
      const res = await synthesizeSpeech({ text, language: currentLang || 'te' });
      if (res.audio_data) {
        const audio = new Audio(`data:${res.audio_mime || 'audio/wav'};base64,${res.audio_data}`);
        audio.onended = () => setIsPlayingAudio(false);
        audio.play();
      } else {
        setIsPlayingAudio(false);
      }
    } catch {
      setIsPlayingAudio(false);
    }
  };

  // Process voice query (either audio file or text)
  const handleProcessVoice = async ({ audioFile = null, textQuery = null }) => {
    setLoading(true);
    setVoiceResult(null);
    setStatusMessage(
      currentLang === 'te' ? 'AI విశ్లేషిస్తోంది...' :
      currentLang === 'hi' ? 'AI समीक्षा कर रहा है...' :
      'Analyzing with AI...'
    );

    try {
      const liveText = (textQuery || speechTextRef.current || speechText || '').trim();
      const res = await askVoiceQuestion({
        audioFile,
        query: liveText || undefined,
        farmerPhone: farmer?.phone || '9876543210',
        cropName: resolvedCrop,
        cropAgeDays: cropAge ?? 1,
        language: currentLang || 'te',
      });

      if (res && res.success) {
        setVoiceResult(res);
        if (res.transcript) updateSpeechText(res.transcript);
        setStatusMessage('');

        const speechToSay = res.farmer_response || res.short_summary;
        if (speechToSay) {
          playVoiceAudio(speechToSay);
        }

        if (onContextUpdated) onContextUpdated(res);
      } else {
        setStatusMessage(
          currentLang === 'te' ? 'సమాధానం పొందడంలో సమస్య వచ్చింది.' : 'Could not generate answer.'
        );
      }
    } catch (err) {
      console.error('[VoiceAssistantHero Error]', err);
      setStatusMessage(
        currentLang === 'te' ? 'మైక్రోఫోన్ లేదా నెట్‌వర్క్ సమస్య. మళ్ళీ ప్రయత్నించండి.' :
        'Network or voice processing error. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Start MediaRecorder audio capture
  const startRecording = async () => {
    updateSpeechText('');
    setVoiceResult(null);
    setStatusMessage(
      currentLang === 'te' ? 'వినబడుతోంది... మాట్లాడండి' :
      currentLang === 'hi' ? 'सुन रहा हूँ... बोलिए' :
      'Listening... Speak now'
    );
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRecordingSeconds(s => s + 1);
    }, 1000);

    // 1. Live WebSpeech for instant transcript display in real-time
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = getRecognitionLang();
        recognition.onresult = (event) => {
          let interimStr = '';
          let finalStr = '';
          for (let i = 0; i < event.results.length; i++) {
            const res = event.results[i];
            if (res.isFinal) finalStr += res[0].transcript + ' ';
            else interimStr += res[0].transcript;
          }
          const currentLive = (finalStr + interimStr).trim();
          if (currentLive) {
            updateSpeechText(currentLive);
          }
        };
        recognition.onerror = (e) => {
          console.warn('[WebSpeech Interim Error]', e);
        };
        recognition.start();
        recognitionRef.current = recognition;
      } catch (e) {
        console.warn('[WebSpeech Init Error]', e);
      }
    }

    // 2. Authoritative MediaRecorder audio capture
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices not supported');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      let mimeType = 'audio/webm';
      const MediaRecorderClass = typeof window !== 'undefined' && window.MediaRecorder ? window.MediaRecorder : (typeof MediaRecorder !== 'undefined' ? MediaRecorder : null);
      if (MediaRecorderClass && typeof MediaRecorderClass.isTypeSupported === 'function') {
        if (MediaRecorderClass.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorderClass.isTypeSupported('audio/ogg;codecs=opus')) {
          mimeType = 'audio/ogg;codecs=opus';
        } else if (MediaRecorderClass.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }

      const mediaRecorder = new MediaRecorderClass(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        if (timerRef.current) clearInterval(timerRef.current);

        const chunks = audioChunksRef.current.length > 0 ? audioChunksRef.current : [new Blob(['audio'], { type: mimeType })];
        const blob = new Blob(chunks, { type: mimeType });
        const audioFile = new File(
          [blob],
          `voice_query_${Date.now()}.${mimeType.includes('ogg') ? 'ogg' : 'webm'}`,
          { type: mimeType }
        );
        const liveQuery = speechTextRef.current.trim();
        await handleProcessVoice({ audioFile, textQuery: liveQuery || null });
      };

      mediaRecorder.start(250);
      setIsListening(true);
    } catch (err) {
      console.warn('[Microphone Access Error]', err);
      setIsListening(false);
      if (timerRef.current) clearInterval(timerRef.current);

      // Fallback: prompt text input
      const manual = window.prompt(
        currentLang === 'te' ? 'మీ వ్యవసాయ ప్రశ్నను టైప్ చేయండి:' : 'Type your farm question:'
      );
      if (manual && manual.trim()) {
        setSpeechText(manual.trim());
        handleProcessVoice({ textQuery: manual.trim() });
      }
    }
  };

  // Stop MediaRecorder audio capture
  const stopRecording = () => {
    setIsListening(false);
    if (timerRef.current) clearInterval(timerRef.current);

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping mediaRecorder:', e);
      }
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div
      className="voice-hero-card"
      data-testid="voice-assistant-hero"
      style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 60%, #047857 100%)',
        color: '#ffffff',
        borderRadius: '24px',
        padding: '24px 20px',
        boxShadow: '0 10px 30px rgba(6, 78, 59, 0.25)',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: '24px',
      }}
    >
      {/* Background Decorative Rings */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.05)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.4rem' }}>👨‍🌾</span>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>
              {farmer?.name || 'రైతు'} {farmer?.village ? `• 📍 ${farmer.village}` : ''}
            </h2>
            <div style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '2px' }}>
              {farmer?.phone ? `+91 ${farmer.phone.slice(-10)}` : 'ధృవీకరించబడిన ఖాతా'}
            </div>
          </div>
        </div>

        {activeCrop ? (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.18)',
              backdropFilter: 'blur(8px)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid rgba(255, 255, 255, 0.25)',
            }}
          >
            <span>{activeCrop === 'Chilli' ? '🌶️' : activeCrop === 'Paddy' ? '🌾' : activeCrop === 'Cotton' ? '🌿' : activeCrop === 'Tomato' ? '🍅' : '🌱'}</span>
            <span>{activeCrop}</span>
            {cropAge !== null && cropAge !== undefined && (
              <span style={{ opacity: 0.9 }}>• {daysText}</span>
            )}
          </div>
        ) : (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: '700',
            }}
          >
            🌱 {currentLang === 'te' ? 'పంట ప్రారంభించండి' : 'No Active Crop'}
          </div>
        )}
      </div>

      {/* Main Voice Button Section */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px 0',
          textAlign: 'center',
        }}
      >
        <div style={{ position: 'relative', marginBottom: '14px' }}>
          {isListening && (
            <div
              style={{
                position: 'absolute',
                top: '-14px',
                left: '-14px',
                right: '-14px',
                bottom: '-14px',
                borderRadius: '50%',
                border: '3px solid rgba(239, 68, 68, 0.85)',
                animation: 'pulse 1.2s infinite ease-out',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />
          )}
          <button
            type="button"
            onClick={toggleListening}
            data-testid="voice-hero-mic-btn"
            style={{
              width: '88px',
              height: '88px',
              borderRadius: '50%',
              backgroundColor: isListening ? '#ef4444' : '#ffffff',
              color: isListening ? '#ffffff' : '#065f46',
              border: isListening ? '4px solid #ffffff' : 'none',
              fontSize: '2.4rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isListening
                ? '0 0 30px rgba(239, 68, 68, 0.8)'
                : '0 8px 24px rgba(0, 0, 0, 0.25)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              zIndex: 10,
            }}
          >
            <span>{isListening ? '⏹️' : '🎤'}</span>
          </button>
        </div>

        <div style={{ fontWeight: '800', fontSize: '1.2rem', letterSpacing: '-0.01em', marginBottom: '4px' }}>
          {isListening
            ? (currentLang === 'te' ? `మాట్లాడండి... (${recordingSeconds}s)` : `Listening... (${recordingSeconds}s)`)
            : (currentLang === 'te' ? 'కిసాన్‌సాథి తో మాట్లాడండి' : 'ASK KISAANSAATHI')}
        </div>
        <div style={{ fontSize: '0.85rem', opacity: 0.85, maxWidth: '340px', lineHeight: 1.4 }}>
          {isListening
            ? (currentLang === 'te' ? 'పూర్తయిన తర్వాత ఎరుపు బటన్ లేదా క్రింది బటన్ నొక్కండి.' : 'Tap stop when you finish speaking.')
            : (currentLang === 'te' ? 'పంట, నీటి తడి, ఎరువులు లేదా సమస్యను మీ సొంత గొంతుతో అడగండి.' : 'Ask about your crop, irrigation, fertilizer, or issue naturally.')}
        </div>

        {/* Dedicated prominent Stop Button when recording */}
        {isListening && (
          <button
            type="button"
            onClick={stopRecording}
            data-testid="voice-stop-recording-btn"
            style={{
              marginTop: '14px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: '2px solid #fca5a5',
              borderRadius: '24px',
              padding: '10px 24px',
              fontSize: '0.95rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
              zIndex: 15,
            }}
          >
            <span>⏹️</span>
            <span>{currentLang === 'te' ? 'పూర్తయింది - సమాధానం ఇవ్వండి' : 'Finish & Get Answer'}</span>
          </button>
        )}

        {/* Live speech feedback */}
        {(speechText || isListening) && (
          <div
            style={{
              marginTop: '14px',
              background: 'rgba(0, 0, 0, 0.35)',
              border: isListening ? '1.5px solid #86efac' : '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '14px',
              padding: '10px 18px',
              fontSize: '0.95rem',
              fontWeight: '600',
              maxWidth: '92%',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              lineHeight: 1.4,
            }}
          >
            {isListening && (
              <span
                style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#ef4444',
                }}
              />
            )}
            <span>
              {speechText
                ? `“${speechText}”`
                : (currentLang === 'te' ? 'మీరు మాట్లాడుతున్న మాటలు ఇక్కడ కనిపిస్తాయి...' : 'Your spoken words will appear here in real-time...')}
            </span>
          </div>
        )}

        {/* Status message / loader */}
        {(statusMessage || loading) && (
          <div
            style={{
              marginTop: '10px',
              fontSize: '0.85rem',
              color: '#86efac',
              fontWeight: '700',
            }}
          >
            {loading ? '⏳ ' : '🎙️ '} {statusMessage}
          </div>
        )}

        {/* Voice Result: Agricultural Advice or Relevance Deflection */}
        {voiceResult && !isListening && (
          <div
            style={{
              marginTop: '14px',
              backgroundColor: voiceResult.is_relevant === false ? 'rgba(254, 242, 242, 0.98)' : 'rgba(255, 255, 255, 0.98)',
              color: '#0f172a',
              border: voiceResult.is_relevant === false ? '2px solid #ef4444' : '2px solid #86efac',
              borderRadius: '16px',
              padding: '16px 18px',
              fontSize: '0.925rem',
              textAlign: 'left',
              width: '100%',
              maxWidth: '540px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              animation: 'fadeIn 0.25s ease-out',
            }}
          >
            {/* Header / Relevance Badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div
                style={{
                  fontWeight: '800',
                  fontSize: '1rem',
                  color: voiceResult.is_relevant === false ? '#b91c1c' : '#065f46',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{voiceResult.is_relevant === false ? '⚠️' : '🌱'}</span>
                <span>
                  {voiceResult.is_relevant === false
                    ? (currentLang === 'te' ? 'వ్యవసాయానికి సంబంధించిన ప్రశ్న కాదు' : 'Off-Topic Question')
                    : (voiceResult.title || (currentLang === 'te' ? `${resolvedCrop} పంట సలహా` : `${resolvedCrop} Crop Advice`))}
                </span>
              </div>

              {/* Spoken Audio Re-play Button */}
              <button
                type="button"
                onClick={() => {
                  const speech = voiceResult.farmer_response || voiceResult.short_summary;
                  if (isPlayingAudio) {
                    window.speechSynthesis?.cancel();
                    setIsPlayingAudio(false);
                  } else {
                    playVoiceAudio(speech);
                  }
                }}
                style={{
                  background: isPlayingAudio ? '#ef4444' : '#15803d',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>{isPlayingAudio ? '⏹️' : '🔊'}</span>
                <span>{isPlayingAudio ? (currentLang === 'te' ? 'ఆపండి' : 'Stop') : (currentLang === 'te' ? 'మళ్ళీ వినండి' : 'Replay')}</span>
              </button>
            </div>

            {/* Answer Text */}
            <div
              style={{
                fontSize: '0.95rem',
                fontWeight: '700',
                color: voiceResult.is_relevant === false ? '#991b1b' : '#1e293b',
                lineHeight: 1.5,
                marginBottom: voiceResult.recommended_action ? '8px' : '0px',
              }}
            >
              {voiceResult.farmer_response || voiceResult.short_summary}
            </div>

            {/* Recommended Action / Steps */}
            {voiceResult.recommended_action && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  color: '#166534',
                  fontWeight: '600',
                }}
              >
                💡 <strong>{currentLang === 'te' ? 'చేయాల్సిన పని:' : 'Action:'}</strong> {voiceResult.recommended_action}
              </div>
            )}
          </div>
        )}
      </div>

      {/* TODAY'S DYNAMIC FARM BRIEFING CARD */}
      <div
        className="today-briefing-card"
        style={{
          marginTop: '16px',
          backgroundColor: '#ffffff',
          color: '#0f172a',
          borderRadius: '18px',
          padding: '16px',
          boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.3rem' }}>📅</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
                {currentLang === 'te' ? 'ఈరోజు మీరు తెలుసుకోవలసిన విషయాలు' : "Today's Farm Briefing"}
              </h3>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {currentLang === 'te' ? 'వాతావరణం, నీటి తడి, పంట ఆరోగ్యం & సలహాలు' : 'Live weather, irrigation balance & crop stage'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const summaryText = currentLang === 'te'
                ? `ఈరోజు వాతావరణం ${temp}, ${weatherCondition}. మీ ${activeCrop || 'పంట'} ${daysText} లో ఉంది. దశ: ${cropStageName}.`
                : `Today temperature is ${temp}, ${weatherCondition}. Your ${activeCrop || 'crop'} is on ${daysText}. Stage: ${cropStageName}.`;
              playVoiceAudio(summaryText);
            }}
            style={{
              backgroundColor: isPlayingAudio ? '#ef4444' : '#15803d',
              color: '#ffffff',
              border: 'none',
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            }}
          >
            <span>{isPlayingAudio ? '⏹️' : '🔊'}</span>
            <span>{isPlayingAudio ? (currentLang === 'te' ? 'ఆపండి' : 'Stop') : (currentLang === 'te' ? 'వినండి' : "Listen to Today's Advice")}</span>
          </button>
        </div>

        {/* 4 Points Grid with Real Dynamic Values */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          <div style={{ backgroundColor: '#f0fdf4', padding: '10px 12px', borderRadius: '12px', borderLeft: '4px solid #16a34a' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#166534' }}>☀️ {currentLang === 'te' ? 'వాతావరణం' : 'Weather'}</div>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>{temp} • {weatherCondition}</div>
          </div>

          <div style={{ backgroundColor: '#eff6ff', padding: '10px 12px', borderRadius: '12px', borderLeft: '4px solid #0284c7' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#0369a1' }}>💧 {currentLang === 'te' ? 'నీటి తడి సలహా' : 'Irrigation Advice'}</div>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
              {farmContext?.field?.irrigation_method ? `${farmContext.field.irrigation_method.toUpperCase()} • ` : ''}
              {currentLang === 'te' ? 'మట్టి తేమను బట్టి నీరు అందించండి' : 'Normal scheduled cycle'}
            </div>
          </div>

          <div style={{ backgroundColor: '#fefce8', padding: '10px 12px', borderRadius: '12px', borderLeft: '4px solid #ca8a04' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#854d0e' }}>🌿 {currentLang === 'te' ? 'పంట దశ' : 'Crop Stage'}</div>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
              {cropStageName} ({daysText})
            </div>
          </div>

          {latestAeo ? (
            <div style={{ backgroundColor: '#fdf2f8', padding: '10px 12px', borderRadius: '12px', borderLeft: '4px solid #db2777' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#9d174d' }}>🔔 {currentLang === 'te' ? 'AEO సలహా' : 'AEO Advisory'}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                {latestAeo.title || latestAeo.message}
              </div>
            </div>
          ) : (
            <div style={{ backgroundColor: '#fdf2f8', padding: '10px 12px', borderRadius: '12px', borderLeft: '4px solid #db2777' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#9d174d' }}>📢 {currentLang === 'te' ? 'కమ్యూనిటీ సిగ్నల్' : 'Community'}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                {currentLang === 'te' ? 'పరిసర పొలాల్లో సాధారణ పరిస్థితి' : 'No active pest outbreaks nearby'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 1-Tap Quick Suggestion Chips */}
      <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.15)', paddingTop: '12px' }}>
        <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '8px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {currentLang === 'te' ? 'తక్షణ ప్రశ్నలు & నమూనా మాటలు:' : 'Quick Farm Questions & Actions:'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {[
            {
              label: currentLang === 'te' ? '💧 ఈరోజు నీళ్లు పెట్టాలా?' : '💧 Should I irrigate today?',
              text: 'నా పంటకు ఈరోజు నీళ్లు పెట్టాలా?'
            },
            {
              label: currentLang === 'te' ? '🧪 ఇప్పుడు ఎరువు వేయాలా?' : '🧪 Should I apply fertilizer?',
              text: 'ఇప్పుడు ఎరువు వేయాలా?'
            },
            {
              label: currentLang === 'te' ? '📋 ఈరోజు ఏం చేయాలి?' : '📋 What should I do today?',
              text: 'ఇప్పుడు నా పంటకు ఏం చేయాలి?'
            },
            {
              label: resolvedCrop ? `🌱 ${resolvedCrop}` : (currentLang === 'te' ? '🌱 పత్తి 2 ఎకరాలు' : '🌱 2 acres Cotton'),
              text: `నా ${resolvedCrop} పంట వివరాలు మరియు ఈ దశలో జాగ్రత్తలు`
            }
          ].map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleProcessVoice({ textQuery: chip.text })}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                borderRadius: '16px',
                padding: '8px 14px',
                fontSize: '0.825rem',
                fontWeight: '700',
                cursor: 'pointer',
                minHeight: '44px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.22)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)')}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

