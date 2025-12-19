/**
 * PsychSupport Component
 * Voice-only psychiatric support with automatic voice interruption
 * + Relaxation exercises
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/PsychSupport.css';
import { VoiceChatWebSocket, AudioRecorder, AudioPlayer } from '../services/voiceChatService';

const VOICE = 'en-US-JennyNeural';
const SILENCE_THRESHOLD = 0.02;
const SILENCE_DURATION = 1500;
const INTERRUPT_THRESHOLD = 0.08;

// Dynamic API URL for mobile support
const getApiUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  const protocol = window.location.protocol;
  const host = window.location.hostname;
  return `${protocol}//${host}:8000`;
};

// Relaxation exercises
const EXERCISES = {
  breathing: {
    name: '🌬️ Breathing',
    description: '4-4-4-4 Box Breathing',
    loop: true, // Breathing repeats until stopped
    phases: [
      { text: 'Breathe In', voice: 'Breathe in slowly', duration: 4000, action: 'expand' },
      { text: 'Hold', voice: 'Hold your breath', duration: 4000, action: 'hold' },
      { text: 'Breathe Out', voice: 'Breathe out slowly', duration: 4000, action: 'contract' },
      { text: 'Hold', voice: 'Hold', duration: 4000, action: 'hold' },
    ]
  },
  grounding: {
    name: '🌍 Grounding',
    description: '5-4-3-2-1 Senses',
    loop: false,
    phases: [
      { text: 'Notice 5 things you can SEE 👀', voice: 'Look around. Notice 5 things you can see.', duration: 10000, action: 'expand' },
      { text: 'Notice 4 things you can TOUCH 🤚', voice: 'Now feel 4 things you can touch around you.', duration: 10000, action: 'hold' },
      { text: 'Notice 3 things you can HEAR 👂', voice: 'Listen carefully. What 3 sounds can you hear?', duration: 10000, action: 'contract' },
      { text: 'Notice 2 things you can SMELL 👃', voice: 'Take a breath. Notice 2 things you can smell.', duration: 8000, action: 'expand' },
      { text: 'Notice 1 thing you can TASTE 👅', voice: 'What is one thing you can taste right now?', duration: 8000, action: 'hold' },
      { text: 'You are here. You are safe. 💚', voice: 'You are here, in this moment. You are safe.', duration: 6000, action: 'contract' },
    ]
  },
  bodyscan: {
    name: '🧘 Body Scan',
    description: 'Release tension',
    loop: false,
    phases: [
      { text: 'Relax your forehead', voice: 'Close your eyes. Relax your forehead. Let go of any tension.', duration: 6000, action: 'expand' },
      { text: 'Relax your jaw', voice: 'Now relax your jaw. Unclench your teeth. Let your mouth soften.', duration: 6000, action: 'hold' },
      { text: 'Drop your shoulders', voice: 'Drop your shoulders away from your ears. Let them fall.', duration: 6000, action: 'contract' },
      { text: 'Relax your hands', voice: 'Relax your hands. Soften your fists. Let your fingers be loose.', duration: 6000, action: 'expand' },
      { text: 'Breathe into your belly', voice: 'Breathe deeply into your belly. Feel it rise and fall.', duration: 6000, action: 'hold' },
      { text: 'Feel your feet grounded', voice: 'Feel your feet on the ground. You are supported.', duration: 6000, action: 'contract' },
      { text: 'Your body is relaxed 💚', voice: 'Your whole body is now relaxed. You are calm.', duration: 6000, action: 'expand' },
    ]
  },
  affirmations: {
    name: '💜 Affirmations',
    description: 'Positive thoughts',
    loop: false,
    phases: [
      { text: 'I am worthy of love', voice: 'Repeat after me. I am worthy of love and care.', duration: 6000, action: 'expand' },
      { text: 'This moment will pass', voice: 'This moment will pass. Nothing lasts forever.', duration: 6000, action: 'hold' },
      { text: 'I am doing my best', voice: 'I am doing my best, and that is enough.', duration: 6000, action: 'contract' },
      { text: "It's okay to feel this way", voice: "It's okay to feel this way. My feelings are valid.", duration: 6000, action: 'expand' },
      { text: 'I am stronger than I think', voice: 'I am stronger than I think. I have overcome before.', duration: 6000, action: 'hold' },
      { text: 'I deserve peace', voice: 'I deserve peace and happiness.', duration: 6000, action: 'contract' },
      { text: 'I am enough 💚', voice: 'I am enough, just as I am. I am enough.', duration: 7000, action: 'expand' },
    ]
  }
};

function PsychSupport({ onBack = null }) {
  const [status, setStatus] = useState('connecting');
  const [connected, setConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState(null);
  const [currentText, setCurrentText] = useState("I'm here to listen. Tap to start talking.");
  
  // Exercise state
  const [showExercises, setShowExercises] = useState(false);
  const [activeExercise, setActiveExercise] = useState(null);
  const [exercisePhase, setExercisePhase] = useState(0);
  const [phaseText, setPhaseText] = useState('');
  const [phaseAction, setPhaseAction] = useState('');
  const [exerciseLoopCount, setExerciseLoopCount] = useState(0);
  const exerciseTimerRef = useRef(null);
  const exercisePlayerRef = useRef(new AudioPlayer());

  const wsRef = useRef(null);
  const recorderRef = useRef(null);
  const playerRef = useRef(new AudioPlayer());
  const volumeIntervalRef = useRef(null);
  const silenceStartRef = useRef(null);
  const recordingStartRef = useRef(null);
  const interruptListenerRef = useRef(null);
  const interruptStreamRef = useRef(null);

  // Initialize WebSocket
  useEffect(() => {
    let isMounted = true;
    const ws = new VoiceChatWebSocket('/ws/voice-chat/');
    wsRef.current = ws;

    ws.on('connected', () => {
      if (!isMounted) return;
      setConnected(true);
      setStatus('ready');
    });

    ws.on('disconnected', () => {
      if (!isMounted) return;
      setConnected(false);
      setStatus('disconnected');
    });

    ws.on('transcription', (data) => {
      if (!isMounted) return;
      if (data.text?.trim()) {
        setCurrentText(`You: "${data.text}"`);
      }
      setStatus('thinking');
    });

    ws.on('chat_response', (data) => {
      if (!isMounted) return;
      setCurrentText(data.response);
      setStatus('speaking');
    });

    ws.on('chat_chunk', (data) => {
      if (!isMounted) return;
      setCurrentText(prev => {
        if (prev.startsWith('You:') || prev.startsWith("I'm here")) {
          return data.chunk;
        }
        return prev + data.chunk;
      });
    });

    ws.on('chat_complete', () => {
      if (!isMounted) return;
      setStatus('speaking');
    });

    ws.on('tts_audio', async (data) => {
      if (!isMounted) return;
      try {
        setIsSpeaking(true);
        // Start listening for interrupts while playing
        startInterruptListener();
        await playerRef.current.playBase64(data.audio, data.format || 'mp3');
        if (!isMounted) return;
        stopInterruptListener();
        setIsSpeaking(false);
        setStatus('ready');
        setIsProcessing(false);
      } catch (err) {
        stopInterruptListener();
        setIsSpeaking(false);
        setStatus('ready');
        setIsProcessing(false);
      }
    });

    ws.on('error', (data) => {
      if (!isMounted) return;
      const errorMsg = typeof data === 'string' ? data : (data?.error || data?.message || 'Connection error');
      setError(errorMsg);
      setIsProcessing(false);
    });

    setTimeout(() => {
      if (!isMounted) return;
      ws.connect().catch(() => {
        if (!isMounted) return;
        setError('Could not connect');
        setConnected(false);
      });
    }, 100);

    return () => {
      isMounted = false;
      stopInterruptListener();
      ws.removeAllListeners();
      ws.disconnect();
    };
  }, []);

  // Exercise runner with TTS
  useEffect(() => {
    if (!activeExercise) return;
    
    const exercise = EXERCISES[activeExercise];
    const phases = exercise.phases;
    
    const speakPhase = async (text) => {
      try {
        const response = await fetch(`${getApiUrl()}/api/voice-chat/api/tts/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice: VOICE }),
        });
        const data = await response.json();
        if (data.success && data.audio) {
          await exercisePlayerRef.current.playBase64(data.audio, data.format || 'mp3');
        }
      } catch (err) {
        console.log('TTS not available for exercise');
      }
    };
    
    const runPhase = async (index) => {
      if (index >= phases.length) {
        // Check if should loop
        if (exercise.loop) {
          setExerciseLoopCount(prev => prev + 1);
          runPhase(0); // Restart from beginning
          return;
        }
        // Exercise complete
        setActiveExercise(null);
        setPhaseText('');
        setPhaseAction('');
        setExerciseLoopCount(0);
        return;
      }
      
      const phase = phases[index];
      setExercisePhase(index);
      setPhaseText(phase.text);
      setPhaseAction(phase.action);
      
      // Speak the voice text
      if (phase.voice) {
        speakPhase(phase.voice);
      }
      
      exerciseTimerRef.current = setTimeout(() => {
        runPhase(index + 1);
      }, phase.duration);
    };
    
    runPhase(0);
    
    return () => {
      if (exerciseTimerRef.current) {
        clearTimeout(exerciseTimerRef.current);
      }
      exercisePlayerRef.current.stop();
    };
  }, [activeExercise]);

  const startExercise = (exerciseKey) => {
    setShowExercises(false);
    setActiveExercise(exerciseKey);
  };

  const stopExercise = () => {
    if (exerciseTimerRef.current) {
      clearTimeout(exerciseTimerRef.current);
    }
    setActiveExercise(null);
    setPhaseText('');
    setPhaseAction('');
  };

  // Start listening for voice interrupts while AI is speaking
  const startInterruptListener = useCallback(async () => {
    try {
      interruptStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      });

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(interruptStreamRef.current);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      interruptListenerRef.current = setInterval(() => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 128;
        
        // If user voice detected, interrupt
        if (avg > INTERRUPT_THRESHOLD) {
          handleVoiceInterrupt();
        }
      }, 100);
    } catch (err) {
      console.error('Could not start interrupt listener:', err);
    }
  }, []);

  const stopInterruptListener = useCallback(() => {
    if (interruptListenerRef.current) {
      clearInterval(interruptListenerRef.current);
      interruptListenerRef.current = null;
    }
    if (interruptStreamRef.current) {
      interruptStreamRef.current.getTracks().forEach(t => t.stop());
      interruptStreamRef.current = null;
    }
  }, []);

  // Voice interrupt - stop AI and start recording
  const handleVoiceInterrupt = useCallback(() => {
    stopInterruptListener();
    playerRef.current.stop();
    setIsSpeaking(false);
    setIsProcessing(false);
    setCurrentText("Listening...");
    
    // Start recording immediately
    setTimeout(() => startRecording(), 50);
  }, []);

  // Start recording
  const startRecording = async () => {
    if (isRecording || isProcessing) return;
    
    // Stop any playing audio
    if (isSpeaking) {
      stopInterruptListener();
      playerRef.current.stop();
      setIsSpeaking(false);
    }

    try {
      setError(null);
      recorderRef.current = new AudioRecorder(16000);
      await recorderRef.current.start();
      setIsRecording(true);
      setStatus('listening');
      setCurrentText("Listening...");
      recordingStartRef.current = Date.now();
      silenceStartRef.current = null;

      volumeIntervalRef.current = setInterval(() => {
        if (!recorderRef.current) return;
        const vol = recorderRef.current.getVolume();
        setVolume(vol);

        const elapsed = Date.now() - recordingStartRef.current;
        if (elapsed > 500) {
          if (vol < SILENCE_THRESHOLD) {
            if (!silenceStartRef.current) silenceStartRef.current = Date.now();
            if (Date.now() - silenceStartRef.current >= SILENCE_DURATION) {
              stopRecording();
            }
          } else {
            silenceStartRef.current = null;
          }
        }
      }, 100);
    } catch (err) {
      setError('Microphone access denied');
    }
  };

  // Stop recording and process
  const stopRecording = async () => {
    if (!recorderRef.current) return;
    clearInterval(volumeIntervalRef.current);
    setIsRecording(false);
    setIsProcessing(true);
    setStatus('processing');
    setVolume(0);
    setCurrentText("Processing...");

    try {
      const audioBlob = await recorderRef.current.stop();
      if (audioBlob?.size > 0) {
        const audioBase64 = await AudioRecorder.blobToBase64(audioBlob);
        if (wsRef.current?.isConnected()) {
          wsRef.current.fullTurn(audioBase64, 16000, VOICE);
        }
      } else {
        setIsProcessing(false);
        setStatus('ready');
        setCurrentText("I didn't catch that. Tap to try again.");
      }
    } catch (err) {
      setError('Processing failed');
      setIsProcessing(false);
      setStatus('ready');
    }
  };

  // Toggle recording
  const handleMainButton = () => {
    if (isSpeaking) {
      // Manual interrupt
      handleVoiceInterrupt();
    } else if (isRecording) {
      stopRecording();
    } else if (!isProcessing) {
      startRecording();
    }
  };

  const getStatusColor = () => {
    if (isSpeaking) return 'speaking';
    if (isRecording) return 'listening';
    if (isProcessing) return 'processing';
    return 'ready';
  };

  const getButtonText = () => {
    if (isSpeaking) return 'Tap or speak to interrupt';
    if (isRecording) return 'Listening...';
    if (isProcessing) return 'Thinking...';
    return 'Tap to talk';
  };

  const getButtonIcon = () => {
    if (isSpeaking) return '🔊';
    if (isRecording) return '👂';
    if (isProcessing) return '💭';
    return '🎤';
  };

  return (
    <div className="psych-container">
      {/* Header */}
      <div className="psych-header-simple">
        {onBack && (
          <button className="back-btn" onClick={onBack}>←</button>
        )}
        <div className="header-title">
          <span className="header-icon">💚</span>
          <span>Mental Health Support</span>
        </div>
        <button 
          className={`exercises-btn ${showExercises ? 'active' : ''}`}
          onClick={() => setShowExercises(!showExercises)}
        >
          🧘
        </button>
      </div>

      {/* Exercise picker */}
      {showExercises && !activeExercise && (
        <div className="exercises-panel">
          <h3>Relaxation Exercises</h3>
          <div className="exercises-grid">
            {Object.entries(EXERCISES).map(([key, ex]) => (
              <button 
                key={key}
                className="exercise-card"
                onClick={() => startExercise(key)}
              >
                <span className="exercise-name">{ex.name}</span>
                <span className="exercise-desc">{ex.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active exercise overlay */}
      {activeExercise && (
        <div className="exercise-overlay">
          <div className="exercise-content">
            <div className={`exercise-circle ${phaseAction}`}>
              <span className="exercise-text">{phaseText}</span>
            </div>
            <div className="exercise-progress">
              {EXERCISES[activeExercise].phases.map((_, i) => (
                <div 
                  key={i} 
                  className={`progress-dot ${i <= exercisePhase ? 'active' : ''}`}
                />
              ))}
            </div>
            <button className="stop-exercise-btn" onClick={stopExercise}>
              Done
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="psych-main">
        {/* Current text display */}
        <div className="text-display">
          <p>{currentText}</p>
        </div>

        {/* Volume visualization */}
        <div className="volume-ring-container">
          <div 
            className={`volume-ring ${getStatusColor()}`}
            style={{ transform: `scale(${1 + volume * 0.5})` }}
          />
          <button 
            className={`main-button ${getStatusColor()}`}
            onClick={handleMainButton}
            disabled={!connected}
          >
            <span className="button-icon">{getButtonIcon()}</span>
          </button>
        </div>

        <p className="button-hint">{getButtonText()}</p>

        {/* Error */}
        {error && (
          <div className="error-toast" onClick={() => setError(null)}>
            {error}
          </div>
        )}
      </div>

      {/* Simple footer */}
      <div className="psych-footer-simple">
        <p>💚 You're not alone. It's okay to not be okay.</p>
      </div>
    </div>
  );
}

export default PsychSupport;
