import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import {
  performIndicAsr,
  analyzeConfirmedTranscript,
  submitIncident,
  getSimilarIssues,
  confirmSimilarIssues,
  validateCropPhoto,
} from '../services/api';
import { createPostInCommunity, createCommunityPost } from '../services/communityDataStore';

/**
 * Helper to speak text in the farmer's selected language using browser SpeechSynthesis
 */
function speakFarmerText(text, langKey) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const langMap = {
      te: 'te-IN',
      hi: 'hi-IN',
      ta: 'ta-IN',
      kn: 'kn-IN',
      mr: 'mr-IN',
      en: 'en-IN',
    };
    utterance.lang = langMap[langKey] || 'te-IN';
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Speech synthesis unavailable:', e);
  }
}

export const POPULAR_CROPS = [
  { id: 'Paddy', te: 'వరి', hi: 'धान', ta: 'நெல்', kn: 'ಭತ್ತ', mr: 'भात', en: 'Paddy', emoji: '🌾' },
  { id: 'Cotton', te: 'పత్తి', hi: 'कपास', ta: 'பருத்தி', kn: 'ಹತ್ತಿ', mr: 'कापूस', en: 'Cotton', emoji: '🌿' },
  { id: 'Chilli', te: 'మిరప', hi: 'मिर्च', ta: 'மிளகாய்', kn: 'ಮೆಣಸಿನಕಾಯಿ', mr: 'मिरची', en: 'Chilli', emoji: '🌶️' },
  { id: 'Tomato', te: 'టమోటా', hi: 'टमाटर', ta: 'தக்காளி', kn: 'ಟೊಮೆಟೊ', mr: 'टोमॅटो', en: 'Tomato', emoji: '🍅' },
  { id: 'Maize', te: 'మొక్కజొన్న', hi: 'मक्का', ta: 'மக்காச்சோளம்', kn: 'ಮೆಕ್ಕೆಜೋಳ', mr: 'मका', en: 'Maize', emoji: '🌽' },
  { id: 'Groundnut', te: 'వేరుశనగ', hi: 'मूंगफली', ta: 'நிலக்கடலை', kn: 'ಕಡಲೆಕಾಯಿ', mr: 'भुईमूग', en: 'Groundnut', emoji: '🥜' },
];

export default function FarmerAiAssistant({ farmer, onSwitchFarmer }) {
  const { t, currentLang: currentLanguage, currentLanguageName } = useLanguage();
  const strings = t.aiAssistant || {};

  // =========================================================================
  // WORKFLOW STAGES
  // 'SCREEN_1_WELCOME' | 'SCREEN_2_CONVERSATION' | 'SCREEN_3_SUCCESS'
  // =========================================================================
  const [stage, setStage] = useState('SCREEN_1_WELCOME');

  // Sub-stages in Screen 2:
  // 'AWAITING_VOICE' | 'VOICE_REVIEW' | 'PHOTO_GUIDANCE'
  const [subStage, setSubStage] = useState('AWAITING_VOICE');

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedAudioFile, setRecordedAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recorderError, setRecorderError] = useState('');
  const [livePreviewText, setLivePreviewText] = useState('');
  const [customCropInput, setCustomCropInput] = useState('');

  // Processing states
  const [isProcessingAsr, setIsProcessingAsr] = useState(false);
  const [isAnalyzingIntent, setIsAnalyzingIntent] = useState(false);

  // Analysis result from Fireworks AI (GLM-5.3-Flash)
  const [transcript, setTranscript] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [clarificationActive, setClarificationActive] = useState(false);

  // Photos state (1 to 4 photos)
  const [photos, setPhotos] = useState([]); // [{ file: File, preview: string }]
  const [photoRetryNotice, setPhotoRetryNotice] = useState('');
  const [isValidatingPhoto, setIsValidatingPhoto] = useState(false);
  const [photoValidationFeedback, setPhotoValidationFeedback] = useState(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [submissionSuccess, setSubmissionSuccess] = useState(null);
  const [sharedToCommunityPost, setSharedToCommunityPost] = useState(null);
  const [isSharingToCommunity, setIsSharingToCommunity] = useState(false);
  const navigate = useNavigate();

  // Similar Issues Check state
  const [similarIssues, setSimilarIssues] = useState([]);
  const [selectedSimilarIds, setSelectedSimilarIds] = useState([]);
  const [isConfirmingSimilar, setIsConfirmingSimilar] = useState(false);

  // Background GPS Coordinates
  const [coords, setCoords] = useState({
    latitude: farmer?.latitude || 17.4576,
    longitude: farmer?.longitude || 78.6676,
  });

  // TTS audio enabled state
  const [ttsEnabled, setTtsEnabled] = useState(true);

  // Refs
  const mediaRecorderRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const timerRef = useRef(null);
  const audioChunksRef = useRef([]);
  const livePreviewRef = useRef('');
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Acquire high-accuracy GPS in background without blocking farmer
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        (err) => {
          console.warn('Background geolocation fallback active:', err.message);
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    }
  }, []);

  // Cleanup timers and audio URLs on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.abort();
        } catch (e) {}
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [audioUrl]);

  // Handle TTS trigger
  const handleSpeak = (text) => {
    if (ttsEnabled) {
      speakFarmerText(text, currentLanguage);
    }
  };

  // =========================================================================
  // TRANSITION TO SCREEN 2
  // =========================================================================
  const handleStartComplaint = () => {
    setStage('SCREEN_2_CONVERSATION');
    setSubStage('AWAITING_VOICE');
    const greeting = strings.greeting || 'Tell me about your farming problem.';
    handleSpeak(greeting);
  };

  // =========================================================================
  // VOICE RECORDING LOGIC
  // =========================================================================
  const startRecording = async () => {
    setRecorderError('');
    setLivePreviewText('');
    livePreviewRef.current = '';
    setTranscript('');
    setAnalysisResult(null);
    setClarificationActive(false);
    audioChunksRef.current = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setRecorderError(t.voiceUnsupported || 'Voice recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

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

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const chunks = audioChunksRef.current.length > 0 ? audioChunksRef.current : [new Blob(['audio'], { type: mimeType })];
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        const audioFile = new File(
          [blob],
          `farmer_voice_${Date.now()}.${mimeType.includes('ogg') ? 'ogg' : 'webm'}`,
          { type: mimeType }
        );

        setRecordedAudioFile(audioFile);
        await processVoiceInput(audioFile);
      };

      // Optional Browser Speech Recognition for live interim text preview
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          const speechLangMap = {
            te: 'te-IN',
            en: 'en-IN',
            hi: 'hi-IN',
            ta: 'ta-IN',
            kn: 'kn-IN',
            mr: 'mr-IN',
          };
          recognition.lang = speechLangMap[currentLanguage] || 'te-IN';

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
              livePreviewRef.current = currentLive;
              setLivePreviewText(currentLive);
            }
          };

          recognition.onerror = () => {};
          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch (e) {
          // Live preview is optional enhancement
        }
      }

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access error:', err);
      setRecorderError(t.micPermissionDenied || 'Please allow microphone access to speak your problem.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
    }
  };

  // =========================================================================
  // ASR & FIREWORKS AI (GLM-5.3-FLASH) UNDERSTANDING
  // =========================================================================
  const processVoiceInput = async (audioFile) => {
    setIsProcessingAsr(true);
    setRecorderError('');
    let finalTranscript = (livePreviewRef.current || livePreviewText || '').trim();

    try {
      const asrResult = await performIndicAsr(audioFile, currentLanguageName);
      if (asrResult?.transcript?.trim()) {
        finalTranscript = asrResult.transcript.trim();
      }
    } catch (asrErr) {
      console.warn('ASR service notice:', asrErr.message);
      if (!finalTranscript) {
        setRecorderError(
          currentLanguage === 'te'
            ? 'మీ మాటలను గుర్తించలేకపోయాము. దయచేసి మళ్లీ మాట్లాడండి.'
            : currentLanguage === 'hi'
            ? 'आपकी आवाज स्पष्ट नहीं थी। कृपया दोबारा बोलें।'
            : 'Could not transcribe speech. Please tap Record Again and speak clearly.'
        );
        setIsProcessingAsr(false);
        return;
      }
    } finally {
      setIsProcessingAsr(false);
    }

    setTranscript(finalTranscript);

    // Analyze with Fireworks AI (GLM-5.3-Flash)
    setIsAnalyzingIntent(true);
    try {
      const analysis = await analyzeConfirmedTranscript(finalTranscript, currentLanguageName);
      setAnalysisResult(analysis);
      setSubStage('VOICE_REVIEW');

      // AI voice response in farmer's language (clarification if details missing, or standard acknowledgement)
      const reply = analysis.clarification_prompt || analysis.conversational_response || analysis.reason || '';
      if (reply) {
        handleSpeak(reply);
      }

      if (analysis.intent_classification === 'UNCLEAR') {
        setClarificationActive(true);
      }
    } catch (err) {
      console.error('AI Intent Analysis error:', err);
      // Fallback intent if offline
      const fallbackAnalysis = {
        agriculture_related: true,
        intent_classification: 'AGRICULTURE_RELATED',
        is_complete: false,
        missing_fields: ['crop'],
        clarification_prompt:
          currentLanguage === 'te'
            ? 'మీరు ఏ పంట గురించి చెబుతున్నారో దయచేసి ఎంచుకోండి (ఉదా: వరి, పత్తి, మిరప, టమోటా, మొక్కజొన్న).'
            : currentLanguage === 'hi'
            ? 'कृपया बताएं कि यह किस फसल की समस्या है (जैसे: धान, कपास, मिर्च, टमाटर आदि)।'
            : 'Please select or specify which crop is affected (e.g. Paddy, Cotton, Chilli, Tomato, Maize).',
        conversational_response:
          currentLanguage === 'te'
            ? 'మీ వ్యవసాయ సమస్య వివరాలను నమోదు చేసుకున్నాము. దయచేసి పంటను ఎంచుకోండి.'
            : currentLanguage === 'hi'
            ? 'हमने आपकी फसल समस्या को समझ लिया है। कृपया फसल चुनें।'
            : 'We noted your farming problem. Please select your crop.',
        photo_instructions_prompt: strings.defaultPhotoPrompt,
        complaint_summary_localized: {
          crop_label: strings.labelCrop || 'Crop',
          crop_value: null,
          problem_label: strings.labelProblem || 'Problem',
          problem_value: finalTranscript,
          duration_label: strings.labelDuration || 'Duration',
          duration_value: currentLanguage === 'te' ? 'కొన్ని రోజులు' : 'Few days',
          progression_label: strings.labelProgress || 'Progress',
          progression_value: currentLanguage === 'te' ? 'గమనించబడింది' : 'Observed',
        },
        photo_guidance: [],
      };
      setAnalysisResult(fallbackAnalysis);
      setSubStage('VOICE_REVIEW');
      handleSpeak(fallbackAnalysis.clarification_prompt || fallbackAnalysis.conversational_response);
    } finally {
      setIsAnalyzingIntent(false);
    }
  };

  // Select crop from 1-tap quick chips to complete missing basic details
  const handleSelectCrop = (cropObj) => {
    const cropStandard = cropObj.id;
    const cropLocalized = cropObj[currentLanguage] || cropObj.en;

    setAnalysisResult((prev) => {
      if (!prev) return prev;
      const updatedComplaint = {
        ...(prev.complaint || {}),
        crop: cropStandard,
      };
      const updatedSummary = {
        ...(prev.complaint_summary_localized || {}),
        crop_value: cropLocalized,
      };
      return {
        ...prev,
        crop_detected: cropStandard,
        complaint: updatedComplaint,
        complaint_summary_localized: updatedSummary,
        is_complete: true,
        missing_fields: (prev.missing_fields || []).filter((f) => f !== 'crop'),
        photo_instructions_prompt:
          currentLanguage === 'te'
            ? `దయచేసి మీ ${cropLocalized} సమస్యను స్పష్టంగా చూపే ఫోటోలను తీయండి.`
            : currentLanguage === 'hi'
            ? `कृपया अपनी ${cropLocalized} की समस्या दिखाने वाली साफ फोटो लें।`
            : `Please take clear photos of your ${cropStandard} plant problem.`,
        photo_guidance: [
          currentLanguage === 'te'
            ? `దెబ్బతిన్న ${cropLocalized} ఆకులు లేదా భాగాలను దగ్గరగా ఫోటో తీయండి`
            : `Take a close-up photo of the affected ${cropStandard} parts`,
          currentLanguage === 'te'
            ? `మొత్తం ${cropLocalized} మొక్క లేదా చేను కనిపించేలా ఒక ఫోటో తీయండి`
            : `Take an overview photo of the ${cropStandard} plant`,
        ],
      };
    });

    const confirmMsg =
      currentLanguage === 'te'
        ? `${cropLocalized} పంట ఎంపిక చేయబడింది. ఇప్పుడు మీరు ఫోటోలు తీయడానికి కొనసాగవచ్చు.`
        : currentLanguage === 'hi'
        ? `${cropLocalized} फसल चुनी गई। अब आप फोटो ले सकते हैं।`
        : `${cropStandard} selected. You can now proceed to take photos.`;
    handleSpeak(confirmMsg);
  };

  // Submit custom entered crop name
  const handleCustomCropSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!customCropInput.trim()) return;
    const cleanCrop = customCropInput.trim();
    setAnalysisResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        crop_detected: cleanCrop,
        complaint: { ...(prev.complaint || {}), crop: cleanCrop },
        complaint_summary_localized: {
          ...(prev.complaint_summary_localized || {}),
          crop_value: cleanCrop,
        },
        is_complete: true,
        missing_fields: (prev.missing_fields || []).filter((f) => f !== 'crop'),
        photo_instructions_prompt:
          currentLanguage === 'te'
            ? `దయచేసి మీ ${cleanCrop} సమస్యను స్పష్టంగా చూపే ఫోటోలను తీయండి.`
            : `Please take clear photos of your ${cleanCrop} plant problem.`,
        photo_guidance: [
          currentLanguage === 'te'
            ? `దెబ్బతిన్న ${cleanCrop} భాగాలను దగ్గరగా ఫోటో తీయండి`
            : `Take a close-up photo of the affected ${cleanCrop} parts`,
          currentLanguage === 'te'
            ? `మొత్తం ${cleanCrop} మొక్క కనిపించేలా ఒక ఫోటో తీయండి`
            : `Take an overview photo of the ${cleanCrop} plant`,
        ],
      };
    });
    setCustomCropInput('');
    const confirmMsg =
      currentLanguage === 'te'
        ? `${cleanCrop} పంట నమోదు చేయబడింది. ఇప్పుడు మీరు ఫోటోలు తీయవచ్చు.`
        : `${cleanCrop} crop recorded. You can now proceed to take photos.`;
    handleSpeak(confirmMsg);
  };

  // Re-record action for non-agricultural or unclear complaints
  const handleRecordAgain = () => {
    setTranscript('');
    setAnalysisResult(null);
    setRecordedAudioFile(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setSubStage('AWAITING_VOICE');
    setClarificationActive(false);
    setPhotoRetryNotice('');
  };

  // Farmer confirms the summary card: move to Photo Guidance ONLY if crop details are complete
  const handleConfirmSummary = () => {
    const rawCrop = analysisResult?.crop_detected || analysisResult?.complaint?.crop;
    const hasValidCrop = Boolean(
      rawCrop &&
      typeof rawCrop === 'string' &&
      rawCrop.trim() &&
      !['null', 'none', 'unknown', 'crop', 'plant', 'పంట', 'ఫసల', 'తెలియజేయలేదు', 'not specified', 'unspecified'].includes(rawCrop.trim().toLowerCase())
    );

    if (!hasValidCrop || analysisResult?.is_complete === false) {
      const clarify =
        analysisResult?.clarification_prompt ||
        (currentLanguage === 'te'
          ? 'దయచేసి ఫోటోలు తీయడానికి ముందు మీ పంటను ఎంచుకోండి.'
          : 'Please select or specify your crop before proceeding to photos.');
      handleSpeak(clarify);
      return;
    }

    setSubStage('PHOTO_GUIDANCE');
    const prompt = analysisResult?.photo_instructions_prompt || strings.defaultPhotoPrompt;
    handleSpeak(prompt);
  };

  // =========================================================================
  // PHOTO CAPTURE & SELECTION (1 to 4 photos)
  // =========================================================================
  const handlePhotoFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setPhotoRetryNotice('');
    setPhotoValidationFeedback(null);
    setIsValidatingPhoto(true);

    const effectiveCrop =
      analysisResult?.complaint?.crop ||
      analysisResult?.crop_detected ||
      farmer?.crop ||
      (currentLanguage === 'te' ? 'మిరప' : 'Chilli');

    const voiceContext = {
      crop: effectiveCrop,
      complaint: analysisResult?.complaint || {
        crop: effectiveCrop,
        symptoms: analysisResult?.symptoms || [],
        farmer_concern: transcript || '',
      },
      transcript: transcript || '',
      language: currentLanguageName || 'Telugu',
    };

    const filesToProcess = Array.from(fileList).slice(0, 4 - photos.length);
    const acceptedItems = [];
    let lastError = '';

    for (const file of filesToProcess) {
      try {
        const verifyRes = await validateCropPhoto(file, voiceContext);
        const canProceed =
          verifyRes?.can_proceed ??
          verifyRes?.is_valid ??
          (verifyRes?.agriculture_relevance?.accepted ?? true);

        if (!canProceed) {
          lastError =
            verifyRes?.farmer_message ||
            verifyRes?.cross_check_with_voice ||
            (currentLanguage === 'te'
              ? 'ఈ ఫోటో మీ పంట సమస్యతో సరిపోలడం లేదు లేదా పంట ఫోటో కాదు. దయచేసి స్పష్టమైన పంట ఆకుల ఫోటో తీయండి.'
              : currentLanguage === 'hi'
              ? 'यह फोटो आपकी फसल की समस्या से मेल नहीं खाती। कृपया प्रभावित पौधे की स्पष्ट फोटो लें।'
              : 'This photo does not match your crop complaint. Please upload a clear photo of the affected plant.');
        } else {
          acceptedItems.push({
            file,
            preview: URL.createObjectURL(file),
            verified: true,
            status: verifyRes?.status || 'RELEVANT',
            visualAnalysis: verifyRes?.visual_analysis,
            crossCheck: verifyRes?.cross_check_with_voice,
            whatAiSaw: verifyRes?.what_ai_saw || [],
            farmerMessage: verifyRes?.farmer_message,
            detections: verifyRes?.detections || [],
          });
        }
      } catch (err) {
        console.warn('Photo verification network notice:', err);
        // Fallback: if network fails completely, allow photo
        acceptedItems.push({
          file,
          preview: URL.createObjectURL(file),
          verified: false,
        });
      }
    }

    setIsValidatingPhoto(false);

    if (acceptedItems.length > 0) {
      setPhotos((prev) => [...prev, ...acceptedItems].slice(0, 4));
      setPhotoRetryNotice('');
      const firstApproved = acceptedItems[0];
      setPhotoValidationFeedback({
        type: 'success',
        message:
          firstApproved?.farmerMessage ||
          (currentLanguage === 'te'
            ? `✓ AI (GLM) మీ ${effectiveCrop} పంట సమస్యతో ఫోటోను ధృవీకరించింది. మీరు కొనసాగవచ్చు.`
            : `✓ AI verified your photo against your voice complaint. You can proceed.`),
        whatAiSaw: firstApproved?.whatAiSaw || [],
      });
    }

    if (lastError && acceptedItems.length === 0) {
      setPhotoRetryNotice(lastError);
      speakFarmerText(lastError, currentLanguage);
    } else if (lastError) {
      setPhotoRetryNotice(lastError);
    }
  };

  const handleRemovePhoto = (indexToRemove) => {
    setPhotos((prev) => {
      const target = prev[indexToRemove];
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  };

  // =========================================================================
  // INCIDENT SUBMISSION
  // =========================================================================
  const handleSubmitComplaint = async () => {
    if (photos.length === 0) {
      setSubmissionError(
        currentLanguage === 'te'
          ? 'దయచేసి కనీసం 1 మొక్క ఫోటోను జతచేయండి.'
          : currentLanguage === 'hi'
          ? 'कृपया कम से कम 1 पौधे की फोटो जोड़ें।'
          : 'Please add at least 1 photo showing the crop issue.'
      );
      return;
    }

    setIsSubmitting(true);
    setSubmissionError('');

    try {
      const photoFiles = photos.map((p) => p.file).filter(Boolean);
      const effectiveCrop =
        analysisResult?.crop_detected ||
        analysisResult?.complaint?.crop ||
        farmer?.crop ||
        (currentLanguage === 'te' ? 'వరి' : 'Paddy');

      const response = await submitIncident({
        farmer_name: farmer?.name || 'Farmer',
        farmer_phone: farmer?.phone || '',
        description: transcript || 'Farmer Voice Complaint',
        crop: effectiveCrop,
        language: currentLanguageName,
        latitude: coords.latitude,
        longitude: coords.longitude,
        photo_file: photoFiles[0] || null,
        photo_files: photoFiles,
        audio_file: recordedAudioFile,
      });

      // Save to localStorage
      try {
        localStorage.setItem(
          'kisaansathi_farmer_profile',
          JSON.stringify({
            farmer_id: response.farmer_id || farmer?.id,
            name: farmer?.name,
            phone: farmer?.phone,
            crop: effectiveCrop,
            latitude: coords.latitude,
            longitude: coords.longitude,
          })
        );
      } catch (e) {}

      setSubmissionSuccess(response);
      const incId = response.incident_id || response.id;

      // SIMILAR ISSUES CHECK:
      // Fetch 3-4 real historical similar cases with 3.5s timeout so complaint acceptance is never blocked
      try {
        const simPromise = getSimilarIssues(incId, currentLanguageName);
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 3500));
        const simRes = await Promise.race([simPromise, timeoutPromise]);

        if (simRes && simRes.success && Array.isArray(simRes.similar_issues) && simRes.similar_issues.length > 0) {
          setSimilarIssues(simRes.similar_issues);
          setSelectedSimilarIds([]);
          setStage('SCREEN_SIMILAR_ISSUES');
          handleSpeak(strings.similarIssuesTitle || 'Similar Issues Check');
          return;
        }
      } catch (simErr) {
        console.warn('Similar issues check bypassed or timed out:', simErr);
      }

      setStage('SCREEN_3_SUCCESS');
      handleSpeak(strings.successHeading || 'Complaint Submitted Successfully!');
    } catch (err) {
      if (err.photo_retry_required) {
        // Photos failed relevance check: preserve voice complaint and request clearer photo
        let retryMsg = err.detail?.message_localized || err.message;
        const reasonType = err.detail?.reason_type || '';

        // Guarantee localized message in farmer's selected language
        if (currentLanguage !== 'en') {
          // If backend returned an English message or missing, use localized dictionary
          const isEnglishMsg = !retryMsg || /^[A-Za-z0-9\s.,!?'"()\-–—:;]+$/.test(retryMsg);
          if (isEnglishMsg) {
            if (reasonType === 'WRONG_CROP') {
              retryMsg = strings.photoWrongCropPrompt || strings.photoRetryPrompt;
            } else if (reasonType === 'HEALTHY_CROP') {
              retryMsg = strings.photoHealthyCropPrompt || strings.photoRetryPrompt;
            } else {
              retryMsg = strings.photoRetryPrompt;
            }
          }
        } else if (!retryMsg) {
          retryMsg = strings.photoRetryPrompt;
        }

        setPhotoRetryNotice(retryMsg);
        setPhotos([]); // Clear rejected photos for clean retry
        handleSpeak(retryMsg);
      } else {
        setSubmissionError(err.message || 'Submission failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleSimilarSelection = (candidateId) => {
    setSelectedSimilarIds((prev) =>
      prev.includes(candidateId) ? prev.filter((id) => id !== candidateId) : [...prev, candidateId]
    );
  };

  const handleConfirmSimilarIssues = async () => {
    const incId = submissionSuccess?.incident_id || submissionSuccess?.id;
    if (!incId || selectedSimilarIds.length === 0) {
      setStage('SCREEN_3_SUCCESS');
      handleSpeak(strings.successHeading || 'Complaint Submitted Successfully!');
      return;
    }

    setIsConfirmingSimilar(true);
    try {
      await confirmSimilarIssues(incId, selectedSimilarIds, farmer?.phone, farmer?.name);
    } catch (err) {
      console.warn('Failed to record similar issue confirmation:', err);
    } finally {
      setIsConfirmingSimilar(false);
      setStage('SCREEN_3_SUCCESS');
      handleSpeak(strings.successHeading || 'Complaint Submitted Successfully!');
    }
  };

  const handleSkipSimilarIssues = () => {
    setStage('SCREEN_3_SUCCESS');
    handleSpeak(strings.successHeading || 'Complaint Submitted Successfully!');
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleResetAll = () => {
    setStage('SCREEN_1_WELCOME');
    setSubStage('AWAITING_VOICE');
    setTranscript('');
    setAnalysisResult(null);
    setPhotos([]);
    setRecordedAudioFile(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setPhotoRetryNotice('');
    setSubmissionError('');
    setSubmissionSuccess(null);
    setSimilarIssues([]);
    setSelectedSimilarIds([]);
    setIsConfirmingSimilar(false);
  };

  // =========================================================================
  // RENDER SCREEN 1: WELCOME / START A COMPLAINT
  // =========================================================================
  if (stage === 'SCREEN_1_WELCOME') {
    return (
      <div className="farmer-assistant-container" data-testid="farmer-assistant-screen-1">
        <div className="farmer-welcome-hero-card card">
          <div className="assistant-avatar-halo">
            <span className="assistant-avatar-emoji">🌾</span>
          </div>

          <div className="farmer-profile-pill-strip">
            <span className="farmer-profile-pill">
              👤 <strong>{farmer?.name}</strong> (+91 {farmer?.phone})
            </span>
            {onSwitchFarmer && (
              <button
                type="button"
                className="btn-switch-account-inline"
                onClick={onSwitchFarmer}
                title="Change mobile number"
              >
                🔄
              </button>
            )}
          </div>

          <h1 className="farmer-hero-title">
            {strings.screen1Title || 'Start a Complaint'}
          </h1>

          <p className="farmer-hero-description">
            {strings.screen1Subtitle ||
              'Talk directly with your agricultural AI assistant in one simple voice message. We will understand your problem and alert your local Agricultural Extension Officer (AEO).'}
          </p>

          <div className="farmer-action-start-wrap">
            <button
              type="button"
              className="btn btn-start-assistant-primary"
              onClick={handleStartComplaint}
              data-testid="start-complaint-btn"
            >
              {strings.btnStartComplaint || 'Start Complaint →'}
            </button>
          </div>

          <div className="farmer-hero-trust-badges">
            <span className="trust-badge">🎙️ Speak in your native language</span>
            <span className="trust-badge">⚡ Instant AI analysis</span>
            <span className="trust-badge">🛡️ Reviewed by government AEO</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER SCREEN: SIMILAR ISSUES CHECK (Secondary Verification Signal)
  // =========================================================================
  if (stage === 'SCREEN_SIMILAR_ISSUES' && submissionSuccess) {
    return (
      <div className="farmer-assistant-container" data-testid="farmer-assistant-similar-issues">
        <div className="similar-issues-card card">
          <div className="similar-header-area">
            <span className="similar-chip">🔍 {strings.similarIssuesTitle || 'Similar Issues Check'}</span>
            <h1 className="similar-title">{strings.similarIssuesTitle || 'Similar Issues Check'}</h1>
            <p className="similar-description">
              {strings.similarIssuesIntro ||
                'While routing your complaint to your local Agricultural Officer (AEO), check if any of these previous cases match your crop problem:'}
            </p>
          </div>

          <div className="similar-cases-list" data-testid="similar-cases-list">
            {similarIssues.map((issue, idx) => {
              const isSelected = selectedSimilarIds.includes(issue.incident_id);
              return (
                <div
                  key={issue.incident_id || idx}
                  className={`similar-case-card ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => handleToggleSimilarSelection(issue.incident_id)}
                  data-testid={`similar-case-card-${idx}`}
                >
                  <div className="similar-case-top">
                    <div className="similar-case-badges">
                      <span className="badge badge-crop">🌾 {issue.crop}</span>
                      <span className="badge badge-location">📍 {issue.location_label}</span>
                      {issue.verification_status === 'AEO_VERIFIED' && (
                        <span className="badge badge-verified">✓ {strings.aeoVerifiedBadge || 'Verified by AEO'}</span>
                      )}
                    </div>
                  </div>

                  <div className="similar-case-content">
                    <h3 className="similar-case-problem">{issue.problem}</h3>

                    {issue.why_similar && (
                      <div className="similar-why-box">
                        <span className="why-icon">💡</span>
                        <p className="why-text">{issue.why_similar}</p>
                      </div>
                    )}

                    {issue.outcome && (
                      <div className="similar-outcome-box">
                        <strong className="outcome-label">{strings.previousOutcomeLabel || 'Previous Case Outcome'}:</strong>
                        <p className="outcome-text">{issue.outcome}</p>
                      </div>
                    )}

                    {issue.image_url && (
                      <div className="similar-case-photo">
                        <img src={issue.image_url} alt={issue.crop} loading="lazy" />
                      </div>
                    )}
                  </div>

                  <div className="similar-case-footer">
                    <button
                      type="button"
                      className={`btn btn-sm ${isSelected ? 'btn-selected-match' : 'btn-outline-match'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSimilarSelection(issue.incident_id);
                      }}
                      data-testid={`toggle-match-btn-${idx}`}
                    >
                      {isSelected
                        ? `✓ ${strings.btnLooksLikeMyProblem || 'Looks Like My Problem'}`
                        : strings.btnLooksLikeMyProblem || 'Looks Like My Problem'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="similar-actions-panel">
            <button
              type="button"
              className="btn btn-primary btn-confirm-similar-action"
              onClick={handleConfirmSimilarIssues}
              disabled={isConfirmingSimilar || selectedSimilarIds.length === 0}
              data-testid="confirm-similar-issue-btn"
            >
              {isConfirmingSimilar ? (
                <span>⏳ {strings.btnContinuing || 'Continuing...'}</span>
              ) : (
                <span>
                  {strings.btnConfirmIssue || '✓ Confirm Issue'}
                  {selectedSimilarIds.length > 0 ? ` (${selectedSimilarIds.length})` : ''}
                </span>
              )}
            </button>

            <button
              type="button"
              className="btn btn-outline btn-skip-similar-action"
              onClick={handleSkipSimilarIssues}
              disabled={isConfirmingSimilar}
              data-testid="none-match-btn"
            >
              {strings.btnNoneOfTheseMatch || 'None of These Match →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER SCREEN 3: SUCCESS CONFIRMATION
  // =========================================================================
  if (stage === 'SCREEN_3_SUCCESS' && submissionSuccess) {
    const referenceId =
      submissionSuccess.reference_id ||
      `RB-${(submissionSuccess.incident_id || '').substring(0, 8).toUpperCase()}`;

    const handleShareToCommunity = async () => {
      if (isSharingToCommunity || sharedToCommunityPost) return;
      setIsSharingToCommunity(true);

      const complaintText =
        (transcript && transcript.trim()) ||
        (submissionSuccess?.description && submissionSuccess.description.trim()) ||
        (submissionSuccess?.problem_summary && submissionSuccess.problem_summary.trim()) ||
        (analysisResult?.complaint_summary_localized?.[currentLang] || analysisResult?.complaint_summary_localized?.te || '') ||
        'Field problem reported';

      const reportedCrop =
        submissionSuccess?.crop ||
        farmer?.crop ||
        effectiveCrop ||
        'Cotton';

      const resolvedPhotoUrl =
        submissionSuccess?.photo_url ||
        (Array.isArray(submissionSuccess?.photos) && submissionSuccess.photos[0]) ||
        photos?.[0]?.preview ||
        (typeof photos?.[0] === 'string' ? photos[0] : null) ||
        null;

      let storedProfile = null;
      try {
        storedProfile = JSON.parse(localStorage.getItem('kisaansathi_farmer_profile') || 'null');
      } catch {}

      const authorName =
        farmer?.name ||
        submissionSuccess?.farmer_name ||
        storedProfile?.name ||
        'Farmer';

      const authorPhone =
        farmer?.phone ||
        submissionSuccess?.farmer_phone ||
        storedProfile?.phone ||
        null;

      const authorVillage =
        farmer?.village ||
        storedProfile?.village ||
        'Padamati Sai Guda';

      const authorDistrict =
        farmer?.district ||
        storedProfile?.district ||
        'Medchal–Malkajgiri';

      const approxLocality =
        submissionSuccess?.locality ||
        (farmer?.village ? `${farmer.village}, ${farmer.district || 'Medchal–Malkajgiri'}` : `${authorVillage}, ${authorDistrict}`);

      const realIncidentId =
        submissionSuccess?.incident_id ||
        submissionSuccess?.id ||
        null;

      const postPayload = {
        crop: reportedCrop,
        title: `${reportedCrop} Field Problem: ${complaintText.length > 50 ? complaintText.slice(0, 48) + '...' : complaintText}`,
        content: complaintText,
        contentTe: complaintText,
        contentHi: complaintText,
        contentEn: complaintText,
        originalLanguage: currentLanguage === 'hi' ? 'hi' : currentLanguage === 'en' ? 'en' : 'te',
        location: approxLocality,
        severity: 'High',
        photoUrl: resolvedPhotoUrl,
        hasVoice: Boolean(recordedAudioFile),
        voiceDuration: '0:22',
        isSubmittedProblem: true,
        incidentId: realIncidentId,
        relatedIncidentRef: referenceId,
        farmer_phone: authorPhone,
        farmer_name: authorName,
        farmer_id: submissionSuccess?.farmer_id || farmer?.id || storedProfile?.farmer_id,
        author: {
          id: submissionSuccess?.farmer_id || farmer?.id || storedProfile?.farmer_id,
          name: authorName,
          village: authorVillage,
          district: authorDistrict,
          phone: authorPhone,
        },
      };

      try {
        const created = await createPostInCommunity(postPayload);
        setSharedToCommunityPost(created || postPayload);
        navigate('/community');
      } catch (err) {
        console.warn('Share to community persistence notice:', err);
        const local = createCommunityPost(postPayload);
        setSharedToCommunityPost(local);
        navigate('/community');
      } finally {
        setIsSharingToCommunity(false);
      }
    };

    return (
      <div className="farmer-assistant-container" data-testid="farmer-assistant-screen-3">
        <div className="farmer-success-card card">
          <div className="success-icon-badge">✓</div>

          <h1 className="success-card-title">
            {strings.successHeading || 'Complaint Submitted Successfully!'}
          </h1>
          <p className="success-card-subtitle">
            {strings.successSubheading || 'Your local Agricultural Extension Officer (AEO) has been notified.'}
          </p>

          <div className="reference-id-box">
            <span className="reference-id-label">{strings.trackingRefLabel || 'Tracking Reference ID'}</span>
            <strong className="reference-id-code font-mono">{referenceId}</strong>
          </div>

          {/* Localized summary of what was registered */}
          <div className="submitted-summary-card">
            <div className="summary-row">
              <span className="summary-label">{strings.labelCrop || 'Crop'}:</span>
              <strong>{submissionSuccess.crop || farmer?.crop || 'Agriculture Crop'}</strong>
            </div>
            {transcript && (
              <div className="summary-row">
                <span className="summary-label">{strings.labelProblem || 'Problem'}:</span>
                <span className="summary-text">{transcript}</span>
              </div>
            )}
            <div className="summary-row">
              <span className="summary-label">Photos:</span>
              <span>{photos.length} photo(s) submitted</span>
            </div>
          </div>

          {submissionSuccess.farmer_notice && (
            <div className="alert alert-warning" style={{ margin: '16px 0', textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>{submissionSuccess.farmer_notice}</p>
            </div>
          )}

          {/* Section 3.2: Share Submitted Problem to Community Card */}
          <div className="share-to-community-panel" data-testid="share-to-community-panel">
            <div className="share-community-text">
              <span className="community-share-icon">👥</span>
              <div>
                <strong>Share this problem with Farmer Community?</strong>
                <p>
                  Help fellow farmers in your area identify this issue early and discover solutions that worked.
                </p>
              </div>
            </div>

            {!sharedToCommunityPost ? (
              <button
                type="button"
                className="btn btn-secondary btn-share-community-action"
                onClick={handleShareToCommunity}
                disabled={isSharingToCommunity}
                data-testid="share-to-community-btn"
                style={{
                  background: '#15803d',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  fontWeight: '600',
                  cursor: isSharingToCommunity ? 'not-allowed' : 'pointer',
                  opacity: isSharingToCommunity ? 0.7 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>{isSharingToCommunity ? '⏳ Sharing to Community...' : '🗳️ Share to Community'}</span>
              </button>
            ) : (
              <div className="shared-community-feedback" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
                <span className="badge-shared-success" style={{ background: '#dcfce7', color: '#166534', padding: '6px 14px', borderRadius: '20px', fontWeight: '600', fontSize: '0.9rem' }}>
                  ✓ Shared to Community Feed!
                </span>
                <Link to="/community" className="btn btn-sm btn-outline-view-post" style={{ background: '#15803d', color: '#fff', padding: '6px 14px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' }}>
                  View in Community →
                </Link>
              </div>
            )}
          </div>

          <div className="success-action-buttons">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleResetAll}
              data-testid="report-another-btn"
            >
              {strings.btnReportAnother || 'Report Another Problem'}
            </button>
            <Link to="/my-issues" className="btn btn-secondary">
              {strings.btnViewMyIssues || '📋 My Issues'}
            </Link>
            <Link to="/" className="btn btn-outline">
              {t.btnBackHome || 'Return to Home'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER SCREEN 2: CONVERSATIONAL ASSISTANT
  // =========================================================================
  const summaryData = analysisResult?.complaint_summary_localized;
  const isAgriRelated = analysisResult?.intent_classification === 'AGRICULTURE_RELATED';
  const isNotAgriRelated = analysisResult?.intent_classification === 'NOT_AGRICULTURE_RELATED';
  const isUnclear = analysisResult?.intent_classification === 'UNCLEAR';

  const rawCrop =
    analysisResult?.crop_detected ||
    analysisResult?.complaint?.crop;

  const hasValidCrop = Boolean(
    rawCrop &&
    typeof rawCrop === 'string' &&
    rawCrop.trim() &&
    !['null', 'none', 'unknown', 'crop', 'plant', 'పంట', 'ఫసల', 'తెలియజేయలేదు', 'not specified', 'unspecified'].includes(rawCrop.trim().toLowerCase())
  );

  const isDetailsComplete = Boolean(
    analysisResult &&
    isAgriRelated &&
    analysisResult.is_complete !== false &&
    hasValidCrop
  );

  return (
    <div className="farmer-assistant-container" data-testid="farmer-assistant-screen-2">
      {/* Top Header Bar */}
      <div className="assistant-top-bar">
        <div className="assistant-identity">
          <div className="assistant-avatar-sm">🌾</div>
          <div>
            <h2 className="assistant-heading">{strings.screen1Title || 'Crop Issue Assistant'}</h2>
            <span className="assistant-lang-badge">
              🗣️ {currentLanguageName}
            </span>
          </div>
        </div>

        <div className="assistant-top-actions">
          <button
            type="button"
            className={`btn-tts-toggle ${ttsEnabled ? 'active' : ''}`}
            onClick={() => setTtsEnabled(!ttsEnabled)}
            title={ttsEnabled ? 'Voice output ON' : 'Voice output OFF'}
          >
            {ttsEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="conversation-thread" data-testid="conversation-thread">
        {/* 1. Initial AI Bubble: Greeting */}
        <div className="chat-bubble-row ai-row" data-testid="ai-bubble-greeting">
          <div className="bubble-avatar">🌾</div>
          <div className="bubble ai-bubble">
            <div className="bubble-content-row">
              <p className="bubble-text">
                {strings.greeting || 'Tell me about your farming problem.'}
              </p>
              <button
                type="button"
                className="btn-replay-speech"
                onClick={() => handleSpeak(strings.greeting)}
                title="Listen to this message"
              >
                🔊
              </button>
            </div>
          </div>
        </div>

        {/* 2. Recording In-Progress Banner */}
        {isRecording && (
          <div className="chat-bubble-row farmer-row recording-active" data-testid="recording-active-bubble">
            <div className="bubble farmer-bubble recording-bubble">
              <div className="recording-wave-bar">
                <span className="pulsing-recording-dot"></span>
                <span className="recording-timer font-mono">{formatTimer(recordingDuration)}</span>
                <span className="recording-wave-visualizer">
                  <span></span><span></span><span></span><span></span><span></span>
                </span>
              </div>
              <p className="recording-caption">
                {strings.listeningNotice || 'Listening... Describe your problem naturally in one voice message'}
              </p>
              {livePreviewText && (
                <div className="live-speech-preview">
                  <span className="preview-label">Live:</span> "{livePreviewText}"
                </div>
              )}
            </div>
            <div className="bubble-avatar farmer-avatar">👤</div>
          </div>
        )}

        {/* 3. Processing Indicators */}
        {(isProcessingAsr || isAnalyzingIntent) && (
          <div className="chat-bubble-row ai-row processing-row" data-testid="ai-processing-bubble">
            <div className="bubble-avatar">🌾</div>
            <div className="bubble ai-bubble processing-bubble">
              <div className="processing-spinner-row">
                <span className="inline-spinner"></span>
                <span>
                  {isProcessingAsr
                    ? (currentLanguage === 'te' ? 'మీ మాటలను రికార్డ్ చేస్తున్నాము...' : 'Processing your voice...')
                    : (strings.processingVoice || 'Understanding your voice complaint...')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 4. Farmer's Transcribed Message (Shown after recording finished) */}
        {transcript && !isRecording && (
          <div className="chat-bubble-row farmer-row" data-testid="farmer-transcript-bubble">
            <div className="bubble farmer-bubble">
              <p className="bubble-text">{transcript}</p>
            </div>
            <div className="bubble-avatar farmer-avatar">👤</div>
          </div>
        )}

        {/* 5. AI Response Bubble */}
        {analysisResult && (
          <div className="chat-bubble-row ai-row" data-testid="ai-response-bubble">
            <div className="bubble-avatar">🌾</div>
            <div className="bubble ai-bubble">
              <div className="bubble-content-row">
                <p className="bubble-text">
                  {analysisResult.conversational_response || analysisResult.reason}
                </p>
                <button
                  type="button"
                  className="btn-replay-speech"
                  onClick={() => handleSpeak(analysisResult.conversational_response)}
                  title="Listen"
                >
                  🔊
                </button>
              </div>

              {/* Case A: NOT_AGRICULTURE_RELATED */}
              {isNotAgriRelated && (
                <div className="ai-notice-card non-agri-card" data-testid="non-agri-notice">
                  <p className="notice-instruction">
                    {currentLanguage === 'te'
                      ? 'దయచేసి మీ పంట, మొక్క లేదా పురుగుల సమస్య గురించి మాత్రమే మాట్లాడండి.'
                      : currentLanguage === 'hi'
                      ? 'कृपया अपनी फसल, पौधे या कीट समस्या के बारे में बोलें।'
                      : 'Please speak about a crop, plant disease, or farming problem.'}
                  </p>
                  <button
                    type="button"
                    className="btn btn-record-again-prominent"
                    onClick={handleRecordAgain}
                    data-testid="record-again-btn"
                  >
                    {strings.btnRecordAgain || '🔄 Record Again'}
                  </button>
                </div>
              )}

              {/* Case B: UNCLEAR */}
              {isUnclear && (
                <div className="ai-notice-card unclear-card" data-testid="unclear-notice">
                  <p className="notice-instruction">
                    {analysisResult.clarification_question ||
                      (currentLanguage === 'te'
                        ? 'ఏ పంట దెబ్బతింది, మీరు ఎలాంటి సమస్యను చూస్తున్నారు?'
                        : 'Which crop is affected and what problem are you seeing?')}
                  </p>
                  <button
                    type="button"
                    className="btn btn-record-again-prominent"
                    onClick={handleRecordAgain}
                    data-testid="record-again-btn"
                  >
                    {strings.btnRecordAgain || '🔄 Record Again'}
                  </button>
                </div>
              )}

              {/* Case C: AGRICULTURE_RELATED -> Simple Summary Card */}
              {isAgriRelated && summaryData && (
                <div className="farmer-summary-card" data-testid="farmer-summary-card">
                  <div className="summary-card-header">
                    <span className="summary-card-title">
                      📋 {strings.summaryHeading || 'Your Complaint Details'}
                    </span>
                  </div>

                  <div className="summary-card-grid">
                    <div className="summary-item">
                      <span className="summary-item-label">{summaryData.crop_label || strings.labelCrop || 'Crop'}</span>
                      <strong className={`summary-item-val ${!hasValidCrop ? 'is-missing-crop text-warning font-semibold' : ''}`}>
                        {hasValidCrop
                          ? (summaryData.crop_value || rawCrop)
                          : (currentLanguage === 'te' ? '⚠️ పేర్కొనలేదు (ఎంచుకోండి)' : currentLanguage === 'hi' ? '⚠️ उल्लेख नहीं (चुनें)' : '⚠️ Not specified (Please select)')}
                      </strong>
                    </div>

                    <div className="summary-item">
                      <span className="summary-item-label">{summaryData.problem_label || strings.labelProblem || 'Problem'}</span>
                      <strong className="summary-item-val">{summaryData.problem_value || transcript}</strong>
                    </div>

                    <div className="summary-item">
                      <span className="summary-item-label">{summaryData.duration_label || strings.labelDuration || 'Duration'}</span>
                      <strong className="summary-item-val">{summaryData.duration_value || 'Few days'}</strong>
                    </div>

                    <div className="summary-item">
                      <span className="summary-item-label">{summaryData.progression_label || strings.labelProgress || 'Progress'}</span>
                      <strong className="summary-item-val">{summaryData.progression_value || 'Observed'}</strong>
                    </div>
                  </div>

                  {/* Missing Crop / Details Alert Box & Quick Crop Chips */}
                  {!isDetailsComplete && subStage === 'VOICE_REVIEW' && (
                    <div className="missing-details-alert-card" data-testid="missing-details-notice">
                      <div className="missing-header">
                        <span className="missing-icon">⚠️</span>
                        <div>
                          <strong className="missing-title">
                            {currentLanguage === 'te' ? 'పంట వివరాలు అవసరం' : currentLanguage === 'hi' ? 'फसल की जानकारी आवश्यक है' : 'Crop Details Required'}
                          </strong>
                          <p className="missing-subtitle">
                            {analysisResult?.clarification_prompt ||
                              (currentLanguage === 'te'
                                ? 'ఫోటోలు సరిగ్గా ధృవీకరించడానికి దయచేసి మీ పంటను ఎంచుకోండి:'
                                : currentLanguage === 'hi'
                                ? 'फोटो सत्यापन के लिए कृपया अपनी फसल चुनें:'
                                : 'To verify photos accurately, please select or specify your crop:')}
                          </p>
                        </div>
                      </div>

                      <div className="quick-crop-chips-grid" data-testid="quick-crop-chips">
                        <div className="crop-chips-list">
                          {POPULAR_CROPS.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              className="btn-crop-chip"
                              onClick={() => handleSelectCrop(c)}
                              data-testid={`crop-chip-${c.id.toLowerCase()}`}
                            >
                              <span className="chip-emoji">{c.emoji}</span>
                              <span className="chip-text">{c[currentLanguage] || c.en}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <form onSubmit={handleCustomCropSubmit} className="custom-crop-form">
                        <input
                          type="text"
                          className="form-control form-control-sm custom-crop-input"
                          placeholder={currentLanguage === 'te' ? 'ఇతర పంట పేరు టైప్ చేయండి...' : 'Or type another crop name...'}
                          value={customCropInput}
                          onChange={(e) => setCustomCropInput(e.target.value)}
                          data-testid="custom-crop-input"
                        />
                        <button
                          type="submit"
                          className="btn btn-sm btn-primary btn-save-crop"
                          disabled={!customCropInput.trim()}
                          data-testid="save-custom-crop-btn"
                        >
                          {currentLanguage === 'te' ? 'సరే' : 'Add'}
                        </button>
                      </form>
                    </div>
                  )}

                  {subStage === 'VOICE_REVIEW' && (
                    <div className="summary-card-actions">
                      {!isDetailsComplete ? (
                        <div className="incomplete-gate-box" data-testid="incomplete-gate-notice">
                          <p className="incomplete-gate-instruction">
                            ⚠️ {currentLanguage === 'te'
                              ? 'ఫోటోలు తీయడానికి ముందు దయచేసి పైన ఉన్న పంటను ఎంచుకోండి.'
                              : currentLanguage === 'hi'
                              ? 'फोटो लेने से पहले कृपया ऊपर फसल का नाम चुनें।'
                              : 'Please select a crop above before proceeding to photos.'}
                          </p>
                          <div className="action-buttons-pair">
                            <button
                              type="button"
                              className="btn btn-confirm-summary btn-disabled-gated"
                              disabled
                              data-testid="confirm-summary-disabled-btn"
                              title="Select crop first"
                            >
                              {strings.btnConfirmSummary || '✓ Yes, Continue'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-edit-summary"
                              onClick={handleRecordAgain}
                              data-testid="edit-summary-btn"
                            >
                              {strings.btnEditSummary || '✏️ Edit / Record Again'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="summary-check-prompt">
                            {strings.summaryCheckPrompt || 'Does this correctly describe your problem?'}
                          </p>
                          <div className="action-buttons-pair">
                            <button
                              type="button"
                              className="btn btn-confirm-summary"
                              onClick={handleConfirmSummary}
                              data-testid="confirm-summary-btn"
                            >
                              {strings.btnConfirmSummary || '✓ Yes, Continue'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-edit-summary"
                              onClick={handleRecordAgain}
                              data-testid="edit-summary-btn"
                            >
                              {strings.btnEditSummary || '✏️ Edit / Record Again'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. Photo Guidance (Revealed ONLY after farmer clicks [Yes, Continue]) */}
        {subStage === 'PHOTO_GUIDANCE' && isAgriRelated && (
          <div className="chat-bubble-row ai-row" data-testid="ai-photo-guidance-bubble">
            <div className="bubble-avatar">🌾</div>
            <div className="bubble ai-bubble photo-guidance-bubble">
              <div className="bubble-content-row">
                <p className="bubble-text">
                  {analysisResult?.photo_instructions_prompt ||
                    strings.defaultPhotoPrompt ||
                    'Please take clear photos of the affected parts so I can understand the problem better.'}
                </p>
                <button
                  type="button"
                  className="btn-replay-speech"
                  onClick={() =>
                    handleSpeak(
                      analysisResult?.photo_instructions_prompt || strings.defaultPhotoPrompt
                    )
                  }
                  title="Listen"
                >
                  🔊
                </button>
              </div>

              {/* 1 to 3 dynamic complaint tips */}
              {analysisResult?.photo_guidance && analysisResult.photo_guidance.length > 0 && (
                <div className="dynamic-tips-card">
                  <strong className="tips-title">💡 Tips for helpful photos:</strong>
                  <ul className="tips-list">
                    {analysisResult.photo_guidance.map((tip, idx) => (
                      <li key={idx} className="tip-item">{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Photo Retry Warning Banner (if previous photos failed relevance verification) */}
              {photoRetryNotice && (
                <div className="alert alert-warning photo-retry-box" data-testid="photo-retry-banner">
                  <div className="retry-content">
                    <span className="retry-icon">📷</span>
                    <div>
                      <strong className="retry-title">
                        {strings.photoRetryTitle || (currentLanguage === 'te' ? 'మరొక ఫోటో అవసరం' : 'Clearer Photo Required')}
                      </strong>
                      <p className="retry-text">{photoRetryNotice}</p>
                      <small className="retry-voice-safe">
                        {strings.voicePreservedNote ||
                          '✓ Your voice complaint is safe and does not need to be re-recorded.'}
                      </small>
                    </div>
                  </div>
                </div>
              )}

              {/* Photo Upload Actions & Previews */}
              <div className="photo-upload-section">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={cameraInputRef}
                  style={{ display: 'none' }}
                  onChange={(e) => handlePhotoFiles(e.target.files)}
                  data-testid="camera-input"
                />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  ref={galleryInputRef}
                  style={{ display: 'none' }}
                  onChange={(e) => handlePhotoFiles(e.target.files)}
                  data-testid="gallery-input"
                />

                {photos.length < 4 && (
                  <div className="photo-picker-buttons">
                    <button
                      type="button"
                      className="btn btn-photo-action btn-camera"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={isValidatingPhoto}
                      data-testid="take-photo-btn"
                    >
                      {isValidatingPhoto ? '⏳ Verifying...' : (strings.btnTakePhoto || '📷 Take Photo')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-photo-action btn-gallery"
                      onClick={() => galleryInputRef.current?.click()}
                      disabled={isValidatingPhoto}
                      data-testid="choose-photo-btn"
                    >
                      {isValidatingPhoto ? '⏳ Verifying...' : (strings.btnChooseGallery || '🖼️ Choose Photo')}
                    </button>
                  </div>
                )}

                {isValidatingPhoto && (
                  <div className="photo-validating-status" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 14px', margin: '10px 0', color: '#1d4ed8', fontSize: '0.9rem', fontWeight: '500' }}>
                    <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid #bfdbfe', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>
                    <span>
                      {currentLanguage === 'te'
                        ? '🤖 AI (GLM) మీ వాయిస్ కంప్లైంట్ తో ఫోటోను విశ్లేషిస్తోంది...'
                        : currentLanguage === 'hi'
                        ? '🤖 AI (GLM) आपकी आवाज की शिकायत के साथ फोटो का विश्लेषण कर रहा है...'
                        : '🤖 AI (GLM) is analyzing this photo against your voice complaint...'}
                    </span>
                  </div>
                )}

                {photoValidationFeedback && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', margin: '10px 0' }}>
                    <p style={{ color: '#15803d', fontSize: '0.9rem', margin: 0, fontWeight: '600' }}>
                      {photoValidationFeedback.message}
                    </p>
                    {Array.isArray(photoValidationFeedback.whatAiSaw) && photoValidationFeedback.whatAiSaw.length > 0 && (
                      <ul style={{ margin: '6px 0 0 18px', padding: 0, color: '#166534', fontSize: '0.82rem' }}>
                        {photoValidationFeedback.whatAiSaw.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <p className="photo-count-hint">
                  {photos.length > 0
                    ? `${photos.length}/4 photos attached`
                    : (strings.photoCountNotice || '1 to 4 photos (at least 1 good photo is sufficient)')}
                </p>

                {/* Thumbnails */}
                {photos.length > 0 && (
                  <div className="photo-thumbnails-grid" data-testid="photo-thumbnails-grid">
                    {photos.map((p, idx) => (
                      <div key={idx} className="thumbnail-card" style={{ position: 'relative' }} data-testid={`photo-thumb-${idx}`}>
                        <img src={p.preview} alt={`Crop photo ${idx + 1}`} className="thumbnail-img" />
                        {p.verified && (
                          <span style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(22, 163, 74, 0.9)', color: '#fff', fontSize: '0.68rem', padding: '2px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                            ✓ AI Verified
                          </span>
                        )}
                        <button
                          type="button"
                          className="btn-remove-thumb"
                          onClick={() => handleRemovePhoto(idx)}
                          title="Remove photo"
                          data-testid={`remove-photo-${idx}`}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Submission Error Banner */}
                {submissionError && (
                  <div className="alert alert-error" style={{ marginTop: '12px' }}>
                    <span>⚠️ {submissionError}</span>
                  </div>
                )}

                {/* Submit Complaint Button */}
                <div className="submit-complaint-bar">
                  <button
                    type="button"
                    className="btn btn-submit-complaint"
                    disabled={isSubmitting || photos.length === 0}
                    onClick={handleSubmitComplaint}
                    data-testid="submit-complaint-btn"
                  >
                    {isSubmitting ? (
                      <span>⏳ {strings.submittingText || 'Submitting complaint & inspecting photos...'}</span>
                    ) : (
                      <span>{strings.btnSubmitComplaint || '🚀 Submit to Agricultural Officer'}</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recorder Controls Footer (Sticky at bottom for Screen 2 when awaiting voice) */}
      {subStage === 'AWAITING_VOICE' && (
        <div className="assistant-recorder-footer" data-testid="assistant-recorder-footer">
          {recorderError && (
            <div className="alert alert-error alert-sm" style={{ marginBottom: '10px' }}>
              <span>⚠️ {recorderError}</span>
            </div>
          )}

          {!isRecording ? (
            <div className="record-btn-wrapper">
              <button
                type="button"
                className="btn btn-main-record"
                onClick={startRecording}
                disabled={isProcessingAsr || isAnalyzingIntent}
                data-testid="record-voice-btn"
              >
                <span className="record-mic-icon">🎙️</span>
                <span className="record-text">
                  {strings.btnRecordVoice || 'Record Voice Problem'}
                </span>
              </button>
              <small className="record-footer-hint">
                {currentLanguage === 'te'
                  ? 'ఒక్కసారి మాట్లాడి మీ సమస్యను వివరించండి'
                  : currentLanguage === 'hi'
                  ? 'एक आवाज संदेश में अपनी समस्या बताएं'
                  : 'Tap and speak your problem naturally'}
              </small>
            </div>
          ) : (
            <div className="record-btn-wrapper">
              <button
                type="button"
                className="btn btn-stop-record"
                onClick={stopRecording}
                data-testid="stop-voice-btn"
              >
                <span className="record-stop-icon">⏹️</span>
                <span className="record-text">
                  {strings.btnStopRecording || 'Done Speaking'}
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
