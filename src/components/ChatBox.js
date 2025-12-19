import React, { useState, useRef, useEffect } from 'react';


// Dynamic API URL for HTTP/HTTPS and LAN/mobile support
const getApiUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  const protocol = window.location.protocol;
  const host = window.location.hostname;
  return `${protocol}//${host}:8000`;
};

/**
 * ChatBox Component - Minimalist Medical Interface
 * Clean text-based chat with image, voice, and live talk options
 */
function ChatBox({ 
  messages, 
  onSendMessage, 
  onLiveTalk, 
  onToggleImageTypeSelector, 
  onUploadImage,
  onAccidentReport,
  loading, 
  imageType,
  isLiveTalking,
  onLiveTalkStateChange,
  modeConfig,
  mode,
  onDownloadReport,
  isSpeaking,
  onStopSpeaking,
  continuousListening,
  onToggleContinuousMode,
  isSpeechDetected
}) {
  const [inputValue, setInputValue] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState(null);
  // Voice recording state (for ACC and VoiceAI modes)
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceAudioBlob, setVoiceAudioBlob] = useState(null);
  const [voiceExpanded, setVoiceExpanded] = useState(true); // Default expanded for voiceai
  // ACC mode specific state (keep for backward compatibility)
  const [accRecording, setAccRecording] = useState(false);
  const [accAudioBlob, setAccAudioBlob] = useState(null);
  const [accVoiceExpanded, setAccVoiceExpanded] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 90) + 'px';
    }
  }, [inputValue]);

  const handleSend = () => {
    if (loading) return;

    if (selectedImageFile) {
      // send image with prompt (single combined send)
      onUploadImage(selectedImageFile, inputValue);
      setSelectedImageFile(null);
      setSelectedImagePreview(null);
      setInputValue('');
      setShowOptions(false);
      return;
    }

    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !loading) {
      e.preventDefault();
      handleSend();
    }
  };

  const startLiveTalk = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        onLiveTalk(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
        setRecordingTime(0);
        clearInterval(timerRef.current);
        onLiveTalkStateChange(false);
      };

      mediaRecorder.start();
      onLiveTalkStateChange(true);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const stopLiveTalk = () => {
    if (mediaRecorderRef.current && isLiveTalking) {
      mediaRecorderRef.current.stop();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileSelect = (file) => {
    if (!file) return false;

    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024;

    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image (PNG, JPG, GIF, or WebP)');
      return false;
    }

    if (file.size > maxSize) {
      alert('Image size must be less than 10MB');
      return false;
    }

    return true;
  };

  const handleVoiceMessage = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        onLiveTalk(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
        setRecordingTime(0);
        clearInterval(timerRef.current);
      };

      mediaRecorder.start();
      onLiveTalkStateChange(true);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const stopVoiceMessage = () => {
    if (mediaRecorderRef.current && isLiveTalking) {
      mediaRecorderRef.current.stop();
      onLiveTalkStateChange(false);
    }
  };

  // VoiceAI Mode: Start recording voice
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        // For VoiceAI mode, send immediately
        if (onLiveTalk) {
          onLiveTalk(audioBlob);
        }
        stream.getTracks().forEach(track => track.stop());
        setRecordingTime(0);
        clearInterval(timerRef.current);
        setVoiceRecording(false);
      };

      mediaRecorder.start();
      setVoiceRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  // VoiceAI Mode: Stop recording voice
  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && voiceRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  // ACC Mode: Start recording voice for accident report
  const startAccRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAccAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
        setRecordingTime(0);
        clearInterval(timerRef.current);
      };

      mediaRecorder.start();
      setAccRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  // ACC Mode: Stop recording voice
  const stopAccRecording = () => {
    if (mediaRecorderRef.current && accRecording) {
      mediaRecorderRef.current.stop();
      setAccRecording(false);
    }
  };

  // ACC Mode: Clear recorded audio
  const clearAccAudio = () => {
    setAccAudioBlob(null);
  };

  // ACC Mode: Submit accident report (voice + image + text)
  const handleAccidentSubmit = () => {
    if (!accAudioBlob && !selectedImageFile && !inputValue.trim()) {
      alert('Please provide at least a voice recording, image, or text description.');
      return;
    }
    
    onAccidentReport && onAccidentReport({
      audio: accAudioBlob,
      image: selectedImageFile,
      text: inputValue.trim()
    });

    // Clear inputs
    setAccAudioBlob(null);
    setSelectedImageFile(null);
    setSelectedImagePreview(null);
    setInputValue('');
    setShowOptions(false);
  };

  // Render accident report card for ACC mode
  const renderAccidentReport = (accData) => {
    if (!accData) return null;

    const getDangerClass = (level) => {
      const classes = {
        'safe': 'danger-safe',
        'caution': 'danger-caution',
        'dangerous': 'danger-dangerous',
        'critical': 'danger-critical'
      };
      return classes[level] || 'danger-caution';
    };

    const getDangerIcon = (level) => {
      const icons = {
        'safe': '✅',
        'caution': '⚠️',
        'dangerous': '🔶',
        'critical': '🚨'
      };
      return icons[level] || '⚠️';
    };

    return (
      <div className="accident-card">
        <div className={`accident-header ${getDangerClass(accData.danger_level)}`}>
          <span className="danger-icon">{getDangerIcon(accData.danger_level)}</span>
          <div className="danger-info">
            <span className="danger-label">DANGER LEVEL</span>
            <span className="danger-level">{(accData.danger_level || 'UNKNOWN').toUpperCase()}</span>
          </div>
        </div>

        {accData.transcript && (
          <div className="accident-section">
            <div className="section-header">🎤 Voice Report</div>
            <div className="section-content transcript">{accData.transcript}</div>
          </div>
        )}

        {accData.image_analysis && (
          <div className="accident-section">
            <div className="section-header">📷 Scene Analysis</div>
            <div className="section-content">{accData.image_analysis}</div>
          </div>
        )}

        {accData.recommendations && accData.recommendations.length > 0 && (
          <div className="accident-section recommendations">
            <div className="section-header">🚨 Immediate Actions</div>
            <div className="recommendations-list">
              {accData.recommendations.map((rec, idx) => (
                <div key={idx} className="recommendation-item">
                  {rec}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="accident-report-full">
          <details>
            <summary>📋 View Full Report</summary>
            <div className="full-report-content">
              {accData.report}
            </div>
          </details>
        </div>

        <div className="accident-emergency">
          <div className="emergency-header">📞 Urgences Tunisie</div>
          <div className="emergency-numbers">
            <a href="tel:190" className="emergency-btn samu">🚑 SAMU: 190</a>
            <a href="tel:197" className="emergency-btn police">🚔 Police: 197</a>
            <a href="tel:198" className="emergency-btn fire">🚒 Pompiers: 198</a>
            <a href="tel:1899" className="emergency-btn guard">🏥 Garde: 1899</a>
          </div>
        </div>
      </div>
    );
  };

  // Render medication card for MED mode responses
  const renderMedicationCard = (medData) => {
    if (!medData) return null;
    
    const getStockClass = (status) => {
      const statusMap = {
        'critical': 'stock-critical',
        'warning': 'stock-warning', 
        'moderate': 'stock-moderate',
        'good': 'stock-good'
      };
      return statusMap[status] || 'stock-moderate';
    };

    return (
      <div className="med-card">
        <div className="med-card-header">
          <span className="med-icon">💊</span>
          <h3 className="med-name">{medData.name}</h3>
        </div>
        
        <div className="med-card-body">
          <div className="med-info-row">
            <span className="med-label">🧪 Active Ingredient</span>
            <span className="med-value">{medData.dci}</span>
          </div>
          <div className="med-info-row">
            <span className="med-label">📦 Code</span>
            <span className="med-value">{medData.code}</span>
          </div>
          <div className="med-info-row">
            <span className="med-label">🏷️ Category</span>
            <span className="med-value">{medData.category}</span>
          </div>
        </div>

        <div className="med-price-section">
          <div className="med-price-main">
            <span className="price-label">💰 Price</span>
            <span className="price-value">{medData.price} TND</span>
          </div>
          <div className="med-price-ref">
            Ref: {medData.reference_price} TND
          </div>
        </div>

        {medData.stock && (
          <div className={`med-stock-section ${getStockClass(medData.stock.status)}`}>
            <div className="stock-header">
              <span className="stock-emoji">{medData.stock.status_emoji}</span>
              <span className="stock-status">{medData.stock.status_text}</span>
            </div>
            <div className="stock-details">
              <div className="stock-item">
                <span>📦 Stock</span>
                <span>~{medData.stock.current_stock} units</span>
              </div>
              <div className="stock-item">
                <span>📈 Daily Demand</span>
                <span>~{medData.stock.daily_demand}/day</span>
              </div>
              <div className="stock-item highlight">
                <span>⏱️ Runs out in</span>
                <span className="days-left">{medData.stock.days_until_empty} days</span>
              </div>
            </div>
          </div>
        )}

        {medData.replacements && medData.replacements.length > 0 && (
          <div className="med-replacements">
            <div className="replacements-header">
              ⚠️ Recommended Alternatives
            </div>
            <div className="replacements-list">
              {medData.replacements.map((alt, idx) => (
                <div key={idx} className="replacement-item">
                  <span className="alt-name">{alt.name}</span>
                  <div className="alt-details">
                    <span className="alt-price">{alt.price} TND</span>
                    <span className={`alt-stock ${getStockClass(alt.stock?.status)}`}>
                      {alt.stock?.status_emoji}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="med-disclaimer">
          ⚕️ Consult a pharmacist for interactions & side effects
        </div>
      </div>
    );
  };

  // Render medication list for search results
  const renderMedicationList = (medList) => {
    if (!medList || medList.length === 0) return null;

    return (
      <div className="med-list">
        <div className="med-list-header">🏥 Medication Results</div>
        {medList.map((med, idx) => (
          <div key={idx} className="med-list-item">
            <div className="med-list-item-header">
              <span className="med-list-name">{med.name}</span>
              <span className={`med-list-stock ${med.stock?.status === 'critical' ? 'stock-critical' : ''}`}>
                {med.stock?.status_emoji}
              </span>
            </div>
            <div className="med-list-details">
              <span>🧪 {med.dci}</span>
              <span className="med-list-price">💰 {med.price} TND</span>
            </div>
            <div className="med-list-stock-info">
              ⏱️ ~{med.stock?.days_until_empty} days supply
            </div>
          </div>
        ))}
        <div className="med-disclaimer">
          ⚕️ Ask about a specific medication for details
        </div>
      </div>
    );
  };

  return (
    <div className="chatbox">
      <div className="messages-container">
        {messages.map((message) => (
          <div key={message.id} className={`message message-${message.type} ${message.isReport ? 'report' : ''} ${message.medication ? 'has-med' : ''} ${message.accidentData ? 'has-accident' : ''}`}>
            {/* Severity indicator for MRI reports */}
            {message.isReport && message.severity && (
              <div className={`severity-indicator severity-${message.severity}`}>
                {message.severity === 'critical' && '🔴 '}
                {message.severity === 'high' && '🟠 '}
                {message.severity === 'moderate' && '🟡 '}
                {message.severity === 'low' && '🟢 '}
                {message.severity.toUpperCase()} SEVERITY
              </div>
            )}

            {/* Accident report card for ACC mode */}
            {message.accidentData && renderAccidentReport(message.accidentData)}
            
            {/* Medication card for single medication */}
            {message.medication && !message.medicationList && renderMedicationCard(message.medication)}
            
            {/* Medication list for search results */}
            {message.medicationList && renderMedicationList(message.medicationList)}
            
            {/* Regular text content (hide if we have special cards) */}
            {!message.medication && !message.medicationList && !message.accidentData && (
              <div className="message-content">{message.content}</div>
            )}
            
            {/* Download button for MRI reports */}
            {message.isReport && message.downloadUrl && (
              <button 
                className="download-report-btn"
                onClick={() => onDownloadReport && onDownloadReport(message.downloadUrl, message.reportFilename)}
              >
                📥 Download Report (PDF)
              </button>
            )}
            
            {/* Prescription Card */}
            {message.prescription && (
              <div className="prescription-card">
                <div className="prescription-header">
                  <span className="prescription-icon">℞</span>
                  <div className="prescription-header-text">
                    <span className="prescription-title">Medical Prescription</span>
                    <span className="prescription-subtitle">AI Healthcare Assistant</span>
                  </div>
                </div>
                <div className="prescription-info">
                  <div className="prescription-detail">
                    <span className="label">👤 Patient</span>
                    <span className="value">{message.prescription.patient_name}</span>
                  </div>
                  <div className="prescription-detail">
                    <span className="label">💊 Medications</span>
                    <span className="value">{message.prescription.medication_count} prescribed</span>
                  </div>
                  <div className="prescription-detail">
                    <span className="label">📅 Date</span>
                    <span className="value">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
                <button 
                  className="download-prescription-btn"
                  onClick={() => {
                    const link = document.createElement('a');
                    // Handle both relative and absolute URLs
                    const url = message.prescription.url.startsWith('http') 
                      ? message.prescription.url 
                      : `${getApiUrl()}${message.prescription.url}`;
                    link.href = url;
                    link.download = message.prescription.filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  📥 Download Prescription
                </button>
              </div>
            )}
            
            {/* Medicine Schedule Card */}
            {message.schedule && (
              <div className="schedule-card">
                <div className="schedule-header">
                  <span className="schedule-icon">📋</span>
                  <div className="schedule-header-text">
                    <span className="schedule-title">Medicine Schedule</span>
                    <span className="schedule-subtitle">Daily Planner & Tracker</span>
                  </div>
                </div>
                <div className="schedule-info">
                  <div className="schedule-detail">
                    <span className="label">👤 Patient</span>
                    <span className="value">{message.schedule.patient_name}</span>
                  </div>
                  <div className="schedule-detail">
                    <span className="label">💊 Medications</span>
                    <span className="value">{message.schedule.medication_count} scheduled</span>
                  </div>
                  <div className="schedule-detail">
                    <span className="label">⏰ Includes</span>
                    <span className="value">Time slots & Tracker</span>
                  </div>
                </div>
                <button 
                  className="download-schedule-btn"
                  onClick={() => {
                    const link = document.createElement('a');
                    // Handle both relative and absolute URLs
                    const url = message.schedule.url.startsWith('http') 
                      ? message.schedule.url 
                      : `${getApiUrl()}${message.schedule.url}`;
                    link.href = url;
                    link.download = message.schedule.filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  📥 Download Schedule
                </button>
              </div>
            )}
            
            {message.image && (
              <div className="message-image">
                <img src={message.image} alt="Medical scan" />
              </div>
            )}
            {message.audioUrl && (
              <div className="message-audio">
                <audio controls>
                  <source src={message.audioUrl} type="audio/wav" />
                  Your browser does not support audio.
                </audio>
              </div>
            )}
            <div className="message-time">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-section">
        {/* VoiceAI Mode: Live Talk UI */}
        {mode === 'voiceai' && (
          <div className={`voiceai-section ${voiceExpanded ? 'expanded' : 'collapsed'}`}>
            {/* Toggle button */}
            <button 
              className="voiceai-toggle"
              onClick={() => setVoiceExpanded(!voiceExpanded)}
            >
              <span className="toggle-icon">{voiceExpanded ? '▼' : '▶'}</span>
              <span className="toggle-label">
                {continuousListening || isLiveTalking ? '🔴 Live Conversation' : '🎤 Live Talk'}
              </span>
              {isSpeaking && <span className="speaking-badge">🔊 AI Speaking</span>}
              {(continuousListening || isLiveTalking) && !isSpeaking && isSpeechDetected && <span className="listening-badge speech-detected">🎙️ Hearing you...</span>}
              {(continuousListening || isLiveTalking) && !isSpeaking && !isSpeechDetected && <span className="listening-badge">👂 Listening</span>}
            </button>
            
            {/* Expandable content - always rendered for smooth animation */}
            <div className={`voiceai-content ${voiceExpanded ? 'expanded' : 'collapsed'}`}>
              <div className="voiceai-orb-container">
                  <button 
                    className={`voiceai-orb ${isSpeaking ? 'speaking' : ''} ${continuousListening || isLiveTalking ? 'active-listening' : ''} ${isSpeechDetected ? 'speech-detected' : ''}`}
                    onClick={onToggleContinuousMode}
                    disabled={loading}
                  >
                    <div className={`orb-inner ${continuousListening || isLiveTalking ? 'listening' : ''} ${isSpeechDetected ? 'detecting' : ''}`}>
                      <span className="orb-icon">
                        {isSpeaking ? '🔊' : (isSpeechDetected ? '🎙️' : (continuousListening || isLiveTalking ? '👂' : '🎤'))}
                      </span>
                    </div>
                    <div className={`orb-rings ${continuousListening || isLiveTalking ? 'active' : ''} ${isSpeechDetected ? 'speech-active' : ''}`}>
                      <div className="ring ring-1"></div>
                      <div className="ring ring-2"></div>
                      <div className="ring ring-3"></div>
                    </div>
                  </button>
                </div>
                
                <div className="voiceai-status">
                  {loading && (
                    <span className="status-processing">Processing...</span>
                  )}
                  {isSpeaking && (
                    <button className="stop-speaking-btn" onClick={onStopSpeaking}>
                      ⏹️ Stop Speaking
                    </button>
                  )}
                  {(continuousListening || isLiveTalking) && !isSpeaking && !loading && (
                    <span className="status-listening">
                      <span className="listening-pulse"></span>
                      Listening for your voice...
                    </span>
                  )}
                  {!continuousListening && !isLiveTalking && !isSpeaking && !loading && (
                    <span className="status-hint">Tap to start continuous conversation</span>
                  )}
                </div>

                {/* Mode indicator */}
                <div className="voiceai-mode-indicator">
                  <span className={`mode-dot ${continuousListening || isLiveTalking ? 'active' : ''}`}></span>
                  <span className="mode-text">
                    {continuousListening || isLiveTalking 
                      ? 'Auto-listen mode: I will detect when you stop speaking' 
                      : 'Click the button to start a hands-free conversation'}
                  </span>
                </div>
              </div>
          </div>
        )}

        {/* ACC Mode: Voice Recording UI (Retractable) */}
        {mode === 'acc' && (
          <div className={`acc-voice-section ${accVoiceExpanded ? 'expanded' : 'collapsed'}`}>
            {/* Toggle button */}
            <button 
              className="acc-voice-toggle"
              onClick={() => setAccVoiceExpanded(!accVoiceExpanded)}
            >
              <span className="toggle-icon">{accVoiceExpanded ? '▼' : '▶'}</span>
              <span className="toggle-label">
                {accAudioBlob ? '🎙️ Voice recorded' : '🎤 Voice Report'}
              </span>
              {accRecording && <span className="recording-badge">● REC</span>}
            </button>
            
            {/* Expandable content - always rendered for smooth animation */}
            <div className={`acc-voice-content ${accVoiceExpanded ? 'expanded' : 'collapsed'}`}>
              <div className="acc-voice-controls">
                  {!accRecording && !accAudioBlob && (
                    <button 
                      className="acc-record-btn"
                      onClick={startAccRecording}
                      disabled={loading}
                    >
                      <span className="mic-icon">🎤</span>
                      <span>Tap to Record</span>
                    </button>
                  )}
                  
                  {accRecording && (
                    <div className="acc-recording-active">
                      <div className="recording-pulse"></div>
                      <span className="recording-time">{formatTime(recordingTime)}</span>
                      <button 
                        className="acc-stop-btn"
                        onClick={stopAccRecording}
                      >
                        ⏹️ Stop
                      </button>
                    </div>
                  )}
                  
                  {accAudioBlob && !accRecording && (
                    <div className="acc-audio-ready">
                      <span className="audio-icon">✅</span>
                      <span className="audio-status">Ready to send</span>
                      <button 
                        className="acc-clear-btn"
                        onClick={clearAccAudio}
                        title="Remove recording"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            
            {/* ACC: Show attached items */}
            {(selectedImagePreview || accAudioBlob) && (
              <div className="acc-attachments">
                {accAudioBlob && !accVoiceExpanded && (
                  <div className="acc-attachment-badge">🎙️</div>
                )}
                {selectedImagePreview && (
                  <div className="acc-attachment-item">
                    <img src={selectedImagePreview} alt="Scene" className="acc-thumb" />
                    <button 
                      className="acc-remove-btn"
                      onClick={() => { setSelectedImageFile(null); setSelectedImagePreview(null); }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="input-wrapper">
          {/* Options button (left) */}
          <button
            className={`options-btn ${showOptions ? 'open' : ''}`}
            title="Options"
            onClick={() => setShowOptions((s) => !s)}
            disabled={loading}
          >
            +
          </button>

          {/* Options panel (mode-specific) */}
          {showOptions && (
            <div className="options-panel">
              {modeConfig[mode].allowImages && (
                <>
                  <button
                    className="option-item"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    📷 Take Photo
                  </button>
                  <button
                    className="option-item"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    🖼️ Upload Image
                  </button>
                </>
              )}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={loading}
            rows="1"
          />

          {selectedImagePreview && (
            <div className="attached-thumb" title="Attached image">
              <img src={selectedImagePreview} alt="attached" />
              <button className="remove-thumb" onClick={() => { setSelectedImageFile(null); setSelectedImagePreview(null); }}>✕</button>
            </div>
          )}

          {isLiveTalking && (
            <div className="live-indicator">
              <span className="live-dot"></span>
              {formatTime(recordingTime)}
            </div>
          )}

          {/* Normal send button for non-ACC modes */}
          {mode !== 'acc' && (
            <button 
              onClick={handleSend} 
              disabled={loading || (!inputValue.trim() && !selectedImageFile)}
              className="send-btn-icon"
              title="Send message"
            >
              ➤
            </button>
          )}
          
          {/* ACC mode: Submit report button */}
          {mode === 'acc' && (
            <button 
              onClick={handleAccidentSubmit} 
              disabled={loading || (!inputValue.trim() && !selectedImageFile && !accAudioBlob)}
              className="send-btn-icon acc-submit"
              title="Submit accident report"
            >
              🚨
            </button>
          )}
        </div>

        {/* Hidden file input for gallery upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (!handleFileSelect(file)) return;
            const reader = new FileReader();
            reader.onload = (ev) => setSelectedImagePreview(ev.target.result);
            reader.readAsDataURL(file);
            setSelectedImageFile(file);
            setShowOptions(false);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}
          style={{ display: 'none' }}
        />

        {/* Hidden camera input for taking photos */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (!handleFileSelect(file)) return;
            const reader = new FileReader();
            reader.onload = (ev) => setSelectedImagePreview(ev.target.result);
            reader.readAsDataURL(file);
            setSelectedImageFile(file);
            setShowOptions(false);
            if (cameraInputRef.current) {
              cameraInputRef.current.value = '';
            }
          }}
          style={{ display: 'none' }}
        />

        {/* Live Talk moved into options; no separate row */}
      </div>
    </div>
  );
}

export default ChatBox;
