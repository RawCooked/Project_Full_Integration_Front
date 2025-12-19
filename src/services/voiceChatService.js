/**
 * Voice Chat WebSocket Service
 * Provides real-time voice chat with psychiatric support AI
 */

// Dynamically get API URL - use current host for mobile support
const getApiBase = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  // Use current hostname so it works from phones on same network
  const protocol = window.location.protocol;
  const host = window.location.hostname;
  return `${protocol}//${host}:8000`;
};

const API_BASE = getApiBase();
// Convert http(s) to ws(s)
const WS_BASE = process.env.REACT_APP_WS_URL || API_BASE.replace(/^http/, 'ws');

// ============================================
// WebSocket Manager Class
// ============================================
export class VoiceChatWebSocket {
  constructor(path = '/ws/voice-chat/') {
    this.url = `${WS_BASE}${path}`;
    console.log('🔌 WebSocket URL:', this.url);
    this.ws = null;
    this.listeners = {};
    this.sessionId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.intentionalClose = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.intentionalClose = false;
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('🔌 Voice Chat WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onerror = (event) => {
          const errorMsg = event.message || 'WebSocket connection failed';
          console.error('WebSocket error:', errorMsg);
          reject(new Error(errorMsg));
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.emit('disconnected', { code: event.code, reason: event.reason });
          
          // Auto-reconnect only if not intentionally closed
          if (!this.intentionalClose && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
          }
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'connected') {
              this.sessionId = data.session_id;
              this.emit('connected', data);
            }
            
            this.emit(data.type, data);
            this.emit('message', data);
          } catch (e) {
            console.error('Failed to parse message:', e);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect() {
    this.intentionalClose = true;
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  send(type, data = {}) {
    if (!this.isConnected()) {
      throw new Error('WebSocket not connected');
    }
    this.ws.send(JSON.stringify({ type, ...data }));
  }

  // Send audio for transcription
  transcribe(audioBase64, sampleRate = 16000) {
    this.send('transcribe', { audio: audioBase64, sample_rate: sampleRate });
  }

  // Send chat message (non-streaming)
  chat(message) {
    this.send('chat', { message });
  }

  // Send chat message with streaming response
  chatStream(message) {
    this.send('chat_stream', { message });
  }

  // Request TTS
  tts(text, voice = 'en-US-JennyNeural') {
    this.send('tts', { text, voice });
  }

  // Full voice turn: audio -> transcribe -> chat -> tts
  fullTurn(audioBase64, sampleRate = 16000, voice = 'en-US-JennyNeural') {
    this.send('full_turn', { audio: audioBase64, sample_rate: sampleRate, voice });
  }

  // Clear chat history
  clear() {
    this.send('clear');
  }

  // Event handling
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  removeAllListeners() {
    this.listeners = {};
  }
}

// ============================================
// Audio Recording Class
// ============================================
export class AudioRecorder {
  constructor(sampleRate = 16000) {
    this.sampleRate = sampleRate;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.audioContext = null;
    this.analyser = null;
  }

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      // Setup analyzer for volume detection
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ 
        sampleRate: this.sampleRate 
      });
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      source.connect(this.analyser);

      // Use supported mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100); // Collect data every 100ms
      return true;
    } catch (error) {
      console.error('Error starting audio recording:', error);
      throw error;
    }
  }

  getVolume() {
    if (!this.analyser) return 0;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    const sum = dataArray.reduce((a, b) => a + b, 0);
    return Math.min(1, sum / dataArray.length / 128);
  }

  async stop() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(this.audioChunks, { 
            type: this.mediaRecorder.mimeType || 'audio/webm' 
          });

          // Convert to PCM for Whisper
          const pcmBlob = await this.convertToPCM(audioBlob);

          // Cleanup
          this.cleanup();

          resolve(pcmBlob);
        } catch (error) {
          console.error('Error processing audio:', error);
          this.cleanup();
          resolve(null);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
  }

  async convertToPCM(blob) {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({ 
        sampleRate: this.sampleRate 
      });
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Get PCM data
      const pcmData = audioBuffer.getChannelData(0);

      // Convert to 16-bit PCM
      const pcm16 = new Int16Array(pcmData.length);
      for (let i = 0; i < pcmData.length; i++) {
        pcm16[i] = Math.max(-32768, Math.min(32767, pcmData[i] * 32768));
      }

      audioContext.close();
      return new Blob([pcm16.buffer], { type: 'audio/pcm' });
    } catch (error) {
      console.error('Error converting to PCM:', error);
      return blob; // Return original blob if conversion fails
    }
  }

  // Convert blob to base64
  static async blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Handle both data URL and raw base64
        const result = reader.result;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

// ============================================
// Audio Player Class
// ============================================
export class AudioPlayer {
  constructor() {
    this.audio = new Audio();
    this.isPlaying = false;
  }

  async play(audioBlob) {
    return new Promise((resolve, reject) => {
      try {
        const url = URL.createObjectURL(audioBlob);
        this.audio.src = url;
        this.isPlaying = true;

        this.audio.onended = () => {
          this.isPlaying = false;
          URL.revokeObjectURL(url);
          resolve();
        };

        this.audio.onerror = (error) => {
          this.isPlaying = false;
          URL.revokeObjectURL(url);
          reject(error);
        };

        this.audio.play().catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  async playBase64(base64Audio, format = 'mp3') {
    try {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: `audio/${format}` });
      return this.play(blob);
    } catch (error) {
      console.error('Error playing base64 audio:', error);
      throw error;
    }
  }

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.isPlaying = false;
  }

  setVolume(volume) {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }
}

// ============================================
// REST API Functions (Fallback)
// ============================================
export async function checkVoiceChatStatus() {
  const response = await fetch(`${API_BASE}/api/voice-chat/api/status/`);
  return response.json();
}

export async function transcribeAudioREST(audioBlob, sampleRate = 16000) {
  const base64 = await AudioRecorder.blobToBase64(audioBlob);

  const response = await fetch(`${API_BASE}/api/voice-chat/api/transcribe/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio: base64, sample_rate: sampleRate }),
  });

  return response.json();
}

export async function sendChatMessageREST(message, sessionId = 'default') {
  const response = await fetch(`${API_BASE}/api/voice-chat/api/chat/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId }),
  });

  return response.json();
}

export async function textToSpeechREST(text, voice = 'en-US-JennyNeural') {
  const response = await fetch(`${API_BASE}/api/voice-chat/api/tts/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
  });

  const data = await response.json();

  if (data.success && data.audio) {
    const binaryString = atob(data.audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type: 'audio/mp3' });
  }

  throw new Error(data.error || 'TTS failed');
}

export async function clearChatREST(sessionId = 'default') {
  const response = await fetch(`${API_BASE}/api/voice-chat/api/clear/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  });

  return response.json();
}

// Export singleton instance for global use
let globalWsInstance = null;

export function getGlobalWebSocket() {
  if (!globalWsInstance) {
    globalWsInstance = new VoiceChatWebSocket();
  }
  return globalWsInstance;
}

export default {
  VoiceChatWebSocket,
  AudioRecorder,
  AudioPlayer,
  checkVoiceChatStatus,
  transcribeAudioREST,
  sendChatMessageREST,
  textToSpeechREST,
  clearChatREST,
  getGlobalWebSocket,
};
