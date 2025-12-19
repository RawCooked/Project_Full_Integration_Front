import React, { useState, useRef, useEffect, useCallback } from 'react';
import '../styles/VoiceAIAgent.css';
import ChatBox from './ChatBox';
import PharmacyMap, { medicineList } from './PharmacyMap';


// Dynamic API URL for HTTP/HTTPS and LAN/mobile support
const getApiUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  const protocol = window.location.protocol;
  const host = window.location.hostname;
  return `${protocol}//${host}:8000`;
};


// Function to detect medicine name in text
const detectMedicine = (text) => {
  const lowerText = text.toLowerCase();
  for (const medicine of medicineList) {
    if (lowerText.includes(medicine.toLowerCase())) {
      // Return the medicine with first letter capitalized
      return medicine.charAt(0).toUpperCase() + medicine.slice(1);
    }
  }
  return null;
};


// Helper function for mode-specific greetings
function getModeGreeting(mode) {
  const greetings = {
    voiceai: 'Voice AI mode active. Speak or type your medical question.',
    mri: 'MRI Analysis mode active. Upload an MRI scan for analysis.',
    med: 'Medication mode active. Ask about any medication or drug information.',
    acc: 'Emergency Aid mode active. Describe the accident or emergency situation.',
  };
  return greetings[mode] || 'Hello. How can I assist you?';
}

/**
 * VoiceAIAgent Component - Professional Medical AI Interface
 * Multi-mode medical assistant: VoiceAI, MRI Analysis, Medication, Accident Response
 */
function VoiceAIAgent({ initialMode = null, onBack = null }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: initialMode ? `${getModeGreeting(initialMode)}` : 'Hello. Select a mode to begin.',
      timestamp: new Date(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [mode, setMode] = useState(initialMode || 'voiceai'); // voiceai, mri, med, acc
  const [showModeSelector, setShowModeSelector] = useState(!initialMode);
  const [isLiveTalking, setIsLiveTalking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [continuousListening, setContinuousListening] = useState(false);
  const [isSpeechDetected, setIsSpeechDetected] = useState(false); // New: track when speech is being detected
  const speechSynthRef = useRef(null);
  const containerRef = useRef(null);
  const continuousRecorderRef = useRef(null);
  const silenceTimeoutRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const speechDebounceRef = useRef(null);
  const lastSpeechStateRef = useRef(false);

  // MRI Questionnaire state
  const [showMriModal, setShowMriModal] = useState(false);
  const [pendingMriImage, setPendingMriImage] = useState(null);
  const [mriAnswers, setMriAnswers] = useState({});
  const [mriQuestions, setMriQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Pharmacy map state
  const [showPharmacyMap, setShowPharmacyMap] = useState(false);
  const [detectedMedicine, setDetectedMedicine] = useState(null);

  // Check if message contains a medicine name
  const checkForMedicine = (text) => {
    const medicine = detectMedicine(text);
    if (medicine) {
      setDetectedMedicine(medicine);
      setShowPharmacyMap(true);
      return true;
    }
    return false;
  };

  // Mode configuration
  const modeConfig = {
    voiceai: {
      label: 'Voice AI Assistant',
      description: 'Live conversation with voice & image support',
      allowAudio: true,
      allowImages: true,
      icon: '🗣️'
    },
    mri: {
      label: 'MRI Analysis',
      description: 'MRI scan analysis and interpretation',
      allowAudio: false,
      allowImages: true,
      icon: '🔍'
    },
    med: {
      label: 'Medication Expert',
      description: 'Medication information and pharmaceutical guidance',
      allowAudio: false,
      allowImages: true,
      icon: '💊'
    },
    acc: {
      label: 'Emergency Response',
      description: 'Accident and trauma assessment (voice + images)',
      allowAudio: true,
      allowImages: true,
      icon: '🚨'
    }
  };

  // Handle viewport changes for mobile
  useEffect(() => {
    const handleResize = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Initialize session
  useEffect(() => {
    initializeSession();
    // Initialize speech synthesis
    speechSynthRef.current = window.speechSynthesis;
    return () => {
      // Cleanup speech synthesis on unmount
      if (speechSynthRef.current) {
        speechSynthRef.current.cancel();
      }
      // Cleanup continuous listening
      if (continuousRecorderRef.current) {
        continuousRecorderRef.current.stop();
      }
    };
  }, []);

  // Text-to-Speech function using Web Speech API
  const speakText = (text, shouldContinueListening = false) => {
    if (!ttsEnabled || !speechSynthRef.current) {
      if (shouldContinueListening) {
        setTimeout(() => setContinuousListening(true), 500);
      }
      return;
    }
    
    // Cancel any ongoing speech
    speechSynthRef.current.cancel();
    
    // Clean the text for speech (remove emojis, markdown, etc.)
    const cleanText = text
      .replace(/[*_#`]/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/[^\w\s.,!?;:'-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (!cleanText) {
      if (shouldContinueListening) {
        setTimeout(() => setContinuousListening(true), 500);
      }
      return;
    }

    // Set speaking state IMMEDIATELY to stop recording before TTS starts
    setIsSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Try to get a good voice (prefer Microsoft voices)
    const voices = speechSynthRef.current.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.includes('Microsoft') && v.lang.startsWith('en')
    ) || voices.find(v => 
      v.lang.startsWith('en') && v.name.includes('Natural')
    ) || voices.find(v => 
      v.lang.startsWith('en')
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => {
      console.log('🔊 AI started speaking');
    };
    utterance.onend = () => {
      console.log('🔊 AI finished speaking');
      setIsSpeaking(false);
      // Resume listening after AI finishes speaking (with delay to avoid echo)
      if (shouldContinueListening) {
        setTimeout(() => {
          console.log('🎤 Resuming continuous listening...');
          setContinuousListening(true);
        }, 800); // Longer delay to ensure no echo pickup
      }
    };
    utterance.onerror = (e) => {
      console.log('🔊 TTS error:', e);
      setIsSpeaking(false);
      if (shouldContinueListening) {
        setTimeout(() => setContinuousListening(true), 500);
      }
    };
    
    // Small delay before starting TTS to ensure recording is fully stopped
    setTimeout(() => {
      speechSynthRef.current.speak(utterance);
    }, 100);
  };

  // Stop speaking
  const stopSpeaking = () => {
    if (speechSynthRef.current) {
      speechSynthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  // Toggle TTS
  const toggleTts = () => {
    if (isSpeaking) {
      stopSpeaking();
    }
    setTtsEnabled(!ttsEnabled);
  };

  // ========== CONTINUOUS LISTENING WITH SILENCE DETECTION ==========
  const startContinuousListening = useCallback(async () => {
    if (continuousRecorderRef.current) return;
    if (!sessionId) {
      console.warn('Session not ready, delaying continuous listening');
      setTimeout(() => setContinuousListening(true), 500);
      return;
    }
    
    try {
      // Check if we're on HTTPS or localhost (required for microphone)
      const isSecure = window.location.protocol === 'https:' || 
                       window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
      
      if (!isSecure) {
        console.warn('⚠️ Microphone requires HTTPS on non-localhost. Current:', window.location.protocol);
        alert('Microphone access requires HTTPS. Please use https:// or access from localhost.\n\nTo fix: Run the app with HTTPS enabled.');
        setContinuousListening(false);
        return;
      }

      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Your browser does not support microphone access. Please use a modern browser like Chrome or Firefox.');
        setContinuousListening(false);
        return;
      }

      // Request microphone permission explicitly
      const permissionStatus = await navigator.permissions?.query({ name: 'microphone' }).catch(() => null);
      console.log('🎤 Microphone permission status:', permissionStatus?.state);

      // Clean up any existing audio context
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (e) {}
        audioContextRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000,
        }
      });

      // Set up audio analysis for silence detection
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.3;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      continuousRecorderRef.current = mediaRecorder;
      const audioChunks = [];
      let lastSoundTime = Date.now();
      let hasSpoken = false;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Clean up audio context
        if (audioContextRef.current) {
          try {
            audioContextRef.current.close();
          } catch (e) {}
          audioContextRef.current = null;
        }
        
        stream.getTracks().forEach(track => track.stop());
        
        if (hasSpoken && audioChunks.length > 0) {
          const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
          console.log('🎤 Sending audio blob, size:', audioBlob.size);
          handleAudioUpload(audioBlob, true); // true = continue listening after
        } else {
          console.log('🎤 No speech detected, restarting listener...');
          // No speech detected, restart listening
          setTimeout(() => setContinuousListening(true), 100);
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsLiveTalking(true);

      // Monitor audio levels for silence detection using time domain data
      const bufferLength = analyserRef.current.fftSize;
      const dataArray = new Uint8Array(bufferLength);
      const SILENCE_THRESHOLD = 10; // RMS threshold (0-128 range)
      const SILENCE_DURATION = 1800; // ms of silence before sending
      const MIN_SPEECH_DURATION = 400; // Minimum ms of speech to consider valid
      let speechStartTime = null;
      let checkCount = 0;
      
      const checkSilence = () => {
        if (!continuousRecorderRef.current || continuousRecorderRef.current.state !== 'recording') {
          return;
        }
        
        if (!analyserRef.current) {
          return;
        }
        
        // Use time domain data for more accurate volume detection
        analyserRef.current.getByteTimeDomainData(dataArray);
        
        // Calculate RMS (Root Mean Square) for better volume detection
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          const value = (dataArray[i] - 128) / 128; // Normalize to -1 to 1
          sum += value * value;
        }
        const rms = Math.sqrt(sum / bufferLength) * 100; // Scale to 0-100
        
        // Debug logging every 30 frames (~500ms)
        checkCount++;
        if (checkCount % 30 === 0) {
          console.log(`🎤 Audio level: ${rms.toFixed(1)}, hasSpoken: ${hasSpoken}, speechStart: ${speechStartTime ? 'yes' : 'no'}`);
        }
        
        if (rms > SILENCE_THRESHOLD) {
          // Sound detected - use debouncing to prevent flickering
          if (!lastSpeechStateRef.current) {
            lastSpeechStateRef.current = true;
            setIsSpeechDetected(true);
          }
          // Clear any pending "silence" debounce
          if (speechDebounceRef.current) {
            clearTimeout(speechDebounceRef.current);
            speechDebounceRef.current = null;
          }
          if (!speechStartTime) {
            speechStartTime = Date.now();
            console.log('🎤 Speech started!');
          }
          lastSoundTime = Date.now();
          if (Date.now() - speechStartTime > MIN_SPEECH_DURATION) {
            if (!hasSpoken) {
              console.log('🎤 Valid speech detected!');
            }
            hasSpoken = true;
          }
        } else {
          // Silence - debounce the state change to prevent flickering
          if (lastSpeechStateRef.current && !speechDebounceRef.current) {
            speechDebounceRef.current = setTimeout(() => {
              lastSpeechStateRef.current = false;
              setIsSpeechDetected(false);
              speechDebounceRef.current = null;
            }, 200); // 200ms debounce for silence detection
          }
          const silenceDuration = Date.now() - lastSoundTime;
          if (hasSpoken && silenceDuration > SILENCE_DURATION) {
            console.log('🎤 Silence detected, stopping recording...');
            // Stop recording and send
            if (continuousRecorderRef.current && continuousRecorderRef.current.state === 'recording') {
              continuousRecorderRef.current.stop();
              continuousRecorderRef.current = null;
              setIsLiveTalking(false);
            }
            return;
          }
        }
        
        silenceTimeoutRef.current = requestAnimationFrame(checkSilence);
      };
      
      console.log('🎤 Continuous listening started, waiting for speech...');
      checkSilence();
      
    } catch (error) {
      console.error('Error starting continuous listening:', error);
      setContinuousListening(false);
    }
  }, [sessionId]);

  const stopContinuousListening = useCallback(() => {
    setContinuousListening(false);
    setIsLiveTalking(false);
    setIsSpeechDetected(false);
    lastSpeechStateRef.current = false;
    
    if (speechDebounceRef.current) {
      clearTimeout(speechDebounceRef.current);
      speechDebounceRef.current = null;
    }
    
    if (silenceTimeoutRef.current) {
      cancelAnimationFrame(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    
    if (continuousRecorderRef.current) {
      if (continuousRecorderRef.current.state === 'recording') {
        continuousRecorderRef.current.stop();
      }
      continuousRecorderRef.current = null;
    }
    
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
  }, []);

  // Pause recording without disabling continuous mode (used when AI speaks)
  const pauseRecording = useCallback(() => {
    console.log('🎤 Pausing recording (AI speaking)...');
    setIsLiveTalking(false);
    setIsSpeechDetected(false);
    lastSpeechStateRef.current = false;
    
    if (speechDebounceRef.current) {
      clearTimeout(speechDebounceRef.current);
      speechDebounceRef.current = null;
    }
    
    if (silenceTimeoutRef.current) {
      cancelAnimationFrame(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    
    if (continuousRecorderRef.current) {
      if (continuousRecorderRef.current.state === 'recording') {
        // Stop without processing - we don't want partial audio
        continuousRecorderRef.current.ondataavailable = null;
        continuousRecorderRef.current.onstop = () => {
          console.log('🎤 Recording paused (discarded)');
        };
        continuousRecorderRef.current.stop();
      }
      continuousRecorderRef.current = null;
    }
    
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
  }, []);

  // Effect to pause recording when AI starts speaking
  useEffect(() => {
    if (isSpeaking && (isLiveTalking || continuousRecorderRef.current)) {
      pauseRecording();
    }
  }, [isSpeaking, isLiveTalking, pauseRecording]);

  // Effect to handle continuous listening state changes
  useEffect(() => {
    if (continuousListening && !loading && !isSpeaking) {
      startContinuousListening();
    }
  }, [continuousListening, loading, isSpeaking, startContinuousListening]);

  // Toggle continuous conversation mode
  const toggleContinuousMode = () => {
    if (continuousListening || isLiveTalking) {
      stopContinuousListening();
    } else {
      setContinuousListening(true);
    }
  };

  const initializeSession = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/initialize-chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'user_' + Math.random().toString(36).substr(2, 9),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSessionId(data.session_id);
      }
    } catch (error) {
      console.error('Error initializing session:', error);
    }
  };

  const handleModeSelect = (selectedMode) => {
    setMode(selectedMode);
    setShowModeSelector(false);
    setMessages([
      {
        id: 1,
        type: 'ai',
        content: `Mode active: ${modeConfig[selectedMode].label}.`,
        timestamp: new Date(),
      },
    ]);
  };

  const handleModeChange = () => {
    setShowModeSelector(true);
  };

  const handleImageUpload = async (file, userText = '', retryCount = 0) => {
    const MAX_RETRIES = 5;
    
    if (!sessionId) {
      if (retryCount >= MAX_RETRIES) {
        console.error('Session initialization failed after max retries');
        alert('Could not connect to server. Please check if the backend is running and refresh the page.');
        return;
      }
      console.warn(`Session not ready, waiting... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      // Retry after session initializes
      setTimeout(() => handleImageUpload(file, userText, retryCount + 1), 500);
      return;
    }

    if (!modeConfig[mode].allowImages) {
      alert(`Image upload is not available in ${modeConfig[mode].label} mode.`);
      return;
    }

    // For MRI mode, analyze image first then show dynamic questionnaire
    if (mode === 'mri') {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = { file, base64: e.target.result, userText };
        setPendingMriImage(imageData);
        setShowMriModal(true);
        setLoadingQuestions(true);
        setMriQuestions([]);
        setMriAnswers({});

        // Fetch dynamic questions based on image analysis
        try {
          const formData = new FormData();
          formData.append('image', file);
          const resp = await fetch(`${getApiUrl()}/api/analyze-mri-for-questions/`, {
            method: 'POST',
            body: formData,
          });
          if (resp.ok) {
            const data = await resp.json();
            setMriQuestions(data.questions || []);
            // Initialize answers object
            const initialAnswers = {};
            (data.questions || []).forEach(q => { initialAnswers[q.key] = null; });
            setMriAnswers(initialAnswers);
          } else {
            console.error('Failed to get dynamic questions');
            // Fallback questions
            const fallbackQuestions = [
              { key: 'q1', text: 'Are you experiencing any symptoms related to this scan area?' },
              { key: 'q2', text: 'Have you had previous medical conditions in this region?' },
              { key: 'q3', text: 'Are you currently taking any medications?' },
            ];
            setMriQuestions(fallbackQuestions);
            setMriAnswers({ q1: null, q2: null, q3: null });
          }
        } catch (error) {
          console.error('Error fetching questions:', error);
        } finally {
          setLoadingQuestions(false);
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    // For other modes (MED, ACC), proceed as normal
    await processImageNormal(file, userText);
  };

  // Process image without questionnaire (for MED/ACC modes)
  const processImageNormal = async (file, userText = '') => {
    // Display image in chat immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageMessage = {
        id: messages.length + 1,
        type: 'user',
        content: userText && userText.trim() ? userText.trim() : 'Image uploaded',
        image: e.target.result,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, imageMessage]);
    };
    reader.readAsDataURL(file);

    // Send to backend for analysis (MED/MRI)
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('mode', mode);
      formData.append('session_id', sessionId); // Include session for history tracking
      const defaultPrompt =
        mode === 'med'
          ? 'Extract the medicine name or packaging details and provide relevant info.'
          : 'Provide a concise medical analysis of the image.';
      const prompt = userText && userText.trim() ? userText.trim() : defaultPrompt;
      formData.append('prompt', prompt);

      const resp = await fetch(`${getApiUrl()}/api/process-image/`, {
        method: 'POST',
        body: formData,
      });

      if (resp.ok) {
        const data = await resp.json();
        // Build message with medication data for mobile-friendly rendering
        const aiMessage = {
          id: messages.length + 2,
          type: 'ai',
          content: data.med_summary || data.analysis || 'Image analyzed.',
          // Include structured medication data for mobile-friendly card
          medication: data.medication || data.medication_frontend || null,
          medicationList: data.medication_list || null,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        const err = await resp.json().catch(() => ({}));
        const aiMessage = {
          id: messages.length + 2,
          type: 'ai',
          content: 'Unable to analyze image at this time.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
        console.error('Image analysis error:', err);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      const aiMessage = {
        id: messages.length + 2,
        type: 'ai',
        content: 'Image upload failed.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Handle MRI questionnaire answer
  const handleMriAnswer = (questionKey, answer) => {
    setMriAnswers(prev => ({ ...prev, [questionKey]: answer }));
  };

  // Submit MRI questionnaire and get report
  const handleMriSubmit = async () => {
    if (!pendingMriImage) return;

    // Check all questions answered
    const unanswered = Object.values(mriAnswers).some(a => a === null);
    if (unanswered) {
      alert('Please answer all questions before submitting.');
      return;
    }

    setShowMriModal(false);

    // Display image in chat
    const imageMessage = {
      id: messages.length + 1,
      type: 'user',
      content: pendingMriImage.userText || 'MRI scan uploaded for analysis',
      image: pendingMriImage.base64,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, imageMessage]);

    // Send to backend with questionnaire answers
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', pendingMriImage.file);
      formData.append('mode', 'mri');
      formData.append('session_id', sessionId);
      formData.append('questionnaire', JSON.stringify(mriAnswers));
      formData.append('prompt', pendingMriImage.userText || 'Analyze this MRI scan');

      const resp = await fetch(`${getApiUrl()}/api/generate-mri-report/`, {
        method: 'POST',
        body: formData,
      });

      if (resp.ok) {
        const data = await resp.json();
        const aiMessage = {
          id: messages.length + 2,
          type: 'ai',
          content: data.report || 'MRI analysis complete.',
          isReport: true,
          severity: data.severity,
          downloadUrl: data.download_url,
          reportFilename: data.filename,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);

        if (data.email_sent) {
          const emailMsg = {
            id: messages.length + 3,
            type: 'ai',
            content: '📧 Report has been sent to your email.',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, emailMsg]);
        }
      } else {
        const err = await resp.json().catch(() => ({}));
        const aiMessage = {
          id: messages.length + 2,
          type: 'ai',
          content: 'Unable to generate MRI report at this time.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
        console.error('MRI report error:', err);
      }
    } catch (error) {
      console.error('Error generating MRI report:', error);
      const aiMessage = {
        id: messages.length + 2,
        type: 'ai',
        content: 'Failed to generate MRI report.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } finally {
      setLoading(false);
      setPendingMriImage(null);
    }
  };

  // Cancel MRI questionnaire
  const handleMriCancel = () => {
    setShowMriModal(false);
    setPendingMriImage(null);
    setMriAnswers({});
    setMriQuestions([]);
  };

  // Download MRI report
  const handleDownloadReport = (downloadUrl, filename) => {
    const link = document.createElement('a');
    // Handle both relative and absolute URLs
    const url = downloadUrl.startsWith('http') 
      ? downloadUrl 
      : `${getApiUrl()}${downloadUrl}`;
    link.href = url;
    link.download = filename || 'MRI_Report.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAudioUpload = async (audioBlob, continueListening = false) => {
    if (!sessionId) {
      console.warn('Session not initialized yet, retrying...');
      // Retry after a short delay instead of showing alert
      setTimeout(() => {
        if (continueListening) {
          setContinuousListening(true);
        }
      }, 500);
      return;
    }

    if (!modeConfig[mode].allowAudio) {
      alert(`Audio is not available in ${modeConfig[mode].label} mode.`);
      return;
    }

    // Determine filename based on audio type
    const audioType = audioBlob.type || 'audio/wav';
    let filename = 'recording.wav';
    if (audioType.includes('webm')) {
      filename = 'recording.webm';
    } else if (audioType.includes('mp4') || audioType.includes('m4a')) {
      filename = 'recording.mp4';
    } else if (audioType.includes('ogg')) {
      filename = 'recording.ogg';
    }

    const formData = new FormData();
    formData.append('audio', audioBlob, filename);
    formData.append('session_id', sessionId);
    formData.append('mode', mode);

    setLoading(true);
    try {
      // Use transcribe-voice endpoint for simple STT
      const resp = await fetch(`${getApiUrl()}/api/transcribe-voice/`, {
        method: 'POST',
        body: formData,
      });
      
      if (resp.ok) {
        const data = await resp.json();
        if (data.transcript && data.transcript.trim()) {
          // Send transcribed text as a message (with flag to skip adding user message since we add it here)
          handleSendMessage(data.transcript, true, continueListening);
        } else {
          // No transcript detected
          if (continueListening) {
            // Continue listening silently
            setContinuousListening(true);
          }
          setLoading(false);
        }
      } else {
        setLoading(false);
        if (continueListening) {
          setContinuousListening(true);
        }
      }
    } catch (error) {
      console.error('Error uploading audio:', error);
      setLoading(false);
      if (!continueListening) {
        alert('Failed to process audio.');
      }
    }
  };

  // Handle ACC mode: Submit accident report with voice + image + text
  const handleAccidentReport = async ({ audio, image, text }) => {
    if (!sessionId) {
      console.warn('Session not ready, waiting...');
      setTimeout(() => handleAccidentReport({ audio, image, text }), 500);
      return;
    }

    // Show user submission in chat
    const userMsgParts = [];
    if (audio) userMsgParts.push('🎤 Voice report');
    if (image) userMsgParts.push('📷 Scene image');
    if (text) userMsgParts.push(text);
    
    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      content: userMsgParts.join(' • ') || 'Accident report submitted',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('session_id', sessionId);
      
      if (audio) {
        formData.append('audio', audio, 'voice_report.wav');
      }
      if (image) {
        formData.append('image', image);
      }
      if (text) {
        formData.append('text', text);
      }

      const resp = await fetch(`${getApiUrl()}/api/process-accident/`, {
        method: 'POST',
        body: formData,
      });

      if (resp.ok) {
        const data = await resp.json();
        
        const aiMessage = {
          id: messages.length + 2,
          type: 'ai',
          content: data.report || 'Accident assessment complete.',
          accidentData: {
            danger_level: data.danger_level,
            transcript: data.transcript,
            image_analysis: data.image_analysis,
            recommendations: data.recommendations,
            report: data.report,
          },
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        const err = await resp.json().catch(() => ({}));
        const aiMessage = {
          id: messages.length + 2,
          type: 'ai',
          content: 'Unable to process accident report at this time. If this is an emergency, please call 190 immediately.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
        console.error('Accident report error:', err);
      }
    } catch (error) {
      console.error('Error processing accident report:', error);
      const aiMessage = {
        id: messages.length + 2,
        type: 'ai',
        content: '⚠️ Connection error. For emergencies, call 190 (SAMU) or 197 (Police).',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (text, isVoiceMessage = false, continueListening = false) => {
    if (!text.trim() || !sessionId) return;

    // Check if user mentioned a specific medicine
    checkForMedicine(text);

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: isVoiceMessage ? `🎤 "${text}"` : text,
      isVoice: isVoiceMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    setLoading(true);
    try {
      const response = await fetch(`${getApiUrl()}/api/send-message/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message: text,
          mode: mode,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: data.response,
          // Include medication data for mobile-friendly rendering
          medication: data.medication || null,
          medicationList: data.medication_list || null,
          prescription: data.prescription || null,
          schedule: data.schedule || null,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
        
        // Check if AI response mentions a medicine (for pharmacy map)
        if (!showPharmacyMap) {
          // Check medication field first
          if (data.medication) {
            checkForMedicine(data.medication);
          } else if (data.medication_list && data.medication_list.length > 0) {
            checkForMedicine(data.medication_list[0]);
          } else {
            // Check in response text
            checkForMedicine(data.response);
          }
        }
        
        // Speak the response if TTS is enabled (especially for voiceai mode)
        if (mode === 'voiceai' && ttsEnabled) {
          speakText(data.response, continueListening);
        } else if (continueListening) {
          // If TTS is disabled but continuous mode, restart listening after a short delay
          setTimeout(() => setContinuousListening(true), 500);
        }
      } else {
        const errorData = await response.json();
        console.error('Error from server:', errorData);
        
        const errorMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        if (continueListening) {
          setTimeout(() => setContinuousListening(true), 1000);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: 'Sorry, I could not connect to the server. Please check if the backend is running.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      if (continueListening) {
        setTimeout(() => setContinuousListening(true), 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="voice-ai-container" ref={containerRef}>
      <div className="ai-header">
        <div className="header-content">
          <div className="header-brand">
            {onBack && (
              <button 
                className="back-btn"
                onClick={onBack}
                title="Back to home"
              >
                ←
              </button>
            )}
            <span className="brand-icon">⚕</span>
            <div className="brand-text">
              <span className="brand-name">MedAssist</span>
              {!showModeSelector && (
                <span className="brand-mode">{modeConfig[mode].label}</span>
              )}
            </div>
          </div>
          <div className="header-actions">
            {/* Pharmacy Map Button */}
            {!showModeSelector && (
              <button 
                className="pharmacy-map-btn"
                onClick={() => setShowPharmacyMap(true)}
                title="Trouver une pharmacie"
              >
                💊
              </button>
            )}
            {/* TTS toggle for VoiceAI mode */}
            {!showModeSelector && mode === 'voiceai' && (
              <button 
                className={`tts-toggle-btn ${ttsEnabled ? 'active' : ''} ${isSpeaking ? 'speaking' : ''}`}
                onClick={isSpeaking ? stopSpeaking : toggleTts}
                title={isSpeaking ? 'Stop speaking' : (ttsEnabled ? 'Disable voice' : 'Enable voice')}
              >
                {isSpeaking ? '🔊' : (ttsEnabled ? '🔈' : '🔇')}
              </button>
            )}
            {!showModeSelector && (
              <button 
                className="mode-icon-btn"
                onClick={handleModeChange}
                title="Change mode"
              >
                {modeConfig[mode].icon}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="ai-content">
        {showModeSelector ? (
          <div className="mode-selector-overlay">
            <div className="mode-selector-panel">
              <h2>Select Operating Mode</h2>
              <p className="mode-selector-subtitle">Choose the appropriate mode for your needs</p>
              
              <div className="mode-grid">
                {Object.entries(modeConfig).map(([key, config]) => (
                  <button
                    key={key}
                    className={`mode-card ${mode === key ? 'active' : ''}`}
                    onClick={() => handleModeSelect(key)}
                  >
                    <div className="mode-card-icon">{config.icon}</div>
                    <h3>{config.label}</h3>
                    <p>{config.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="ai-chat">
            <ChatBox 
              messages={messages} 
              onSendMessage={handleSendMessage}
              onLiveTalk={modeConfig[mode].allowAudio ? handleAudioUpload : null}
              onUploadImage={modeConfig[mode].allowImages ? handleImageUpload : null}
              onAccidentReport={mode === 'acc' ? handleAccidentReport : null}
              loading={loading}
              mode={mode}
              isLiveTalking={isLiveTalking}
              onLiveTalkStateChange={setIsLiveTalking}
              modeConfig={modeConfig}
              onDownloadReport={handleDownloadReport}
              isSpeaking={isSpeaking}
              onStopSpeaking={stopSpeaking}
              continuousListening={continuousListening}
              onToggleContinuousMode={toggleContinuousMode}
              isSpeechDetected={isSpeechDetected}
            />
          </div>
        )}
      </div>

      {/* MRI Questionnaire Modal */}
      {showMriModal && (
        <div className="mri-modal-overlay">
          <div className="mri-modal">
            <div className="mri-modal-header">
              <h2>🔍 MRI Analysis Questionnaire</h2>
              <p>Please answer these questions to help us provide a more accurate analysis.</p>
            </div>
            
            <div className="mri-modal-body">
              {pendingMriImage && (
                <div className="mri-preview">
                  <img src={pendingMriImage.base64} alt="MRI Preview" />
                </div>
              )}
              
              {loadingQuestions ? (
                <div className="mri-loading">
                  <div className="spinner-small"></div>
                  <p>Analyzing image and generating relevant questions...</p>
                </div>
              ) : (
                <div className="mri-questions">
                  {mriQuestions.map((q, index) => (
                    <div key={q.key} className="mri-question">
                      <span className="question-number">{index + 1}</span>
                      <p className="question-text">{q.text}</p>
                      <div className="question-buttons">
                        <button
                          className={`yn-btn ${mriAnswers[q.key] === true ? 'selected yes' : ''}`}
                          onClick={() => handleMriAnswer(q.key, true)}
                        >
                          Yes
                        </button>
                        <button
                          className={`yn-btn ${mriAnswers[q.key] === false ? 'selected no' : ''}`}
                          onClick={() => handleMriAnswer(q.key, false)}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mri-modal-footer">
              <button className="mri-cancel-btn" onClick={handleMriCancel}>
                Cancel
              </button>
              <button 
                className="mri-submit-btn"
                onClick={handleMriSubmit}
                disabled={loadingQuestions || mriQuestions.length === 0 || Object.values(mriAnswers).some(a => a === null)}
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pharmacy Map Modal */}
      {showPharmacyMap && (
        <PharmacyMap 
          onClose={() => {
            setShowPharmacyMap(false);
            setDetectedMedicine(null);
          }} 
          medicineName={detectedMedicine}
        />
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Processing...</p>
        </div>
      )}
    </div>
  );
}

export default VoiceAIAgent;
