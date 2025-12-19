import React, { useState, useRef } from 'react';

/**
 * AudioRecorder Component - Mobile Optimized
 * Handles audio recording from user's microphone
 * Records WAV format and passes blob to parent component
 */
function AudioRecorder({ onAudioReady, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const startRecording = async () => {
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
        onAudioReady(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
        
        setRecordingTime(0);
        clearInterval(timerRef.current);
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="audio-recorder">
      <div className="recorder-controls">
        {!isRecording ? (
          <button 
            onClick={startRecording}
            disabled={disabled}
            className="record-button start"
          >
            🎙️ Record
          </button>
        ) : (
          <>
            <button 
              onClick={stopRecording}
              className="record-button stop"
            >
              ⏹️ Stop
            </button>
            <span className="recording-time">
              {formatTime(recordingTime)}
            </span>
            <div className="recording-indicator">
              <span className="pulse"></span>
              Recording...
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AudioRecorder;

