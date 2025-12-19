import React, { useState, useEffect } from 'react';
import './App.css';
import VoiceAIAgent from './components/VoiceAIAgent';
import PsychSupport from './components/PsychSupport';

function App() {
  const [showAI, setShowAI] = useState(false);
  const [selectedMode, setSelectedMode] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showPsychSupport, setShowPsychSupport] = useState(false);

  useEffect(() => {
    // Trigger entrance animations
    setIsLoaded(true);
    
    // Fix for mobile keyboard pushing content
    const handleResize = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Navigate directly to a specific mode
  const navigateToMode = (mode) => {
    if (mode === 'psych') {
      setShowPsychSupport(true);
    } else {
      setSelectedMode(mode);
      setShowAI(true);
    }
  };

  // Return to landing page
  const handleBackToHome = () => {
    setShowAI(false);
    setShowPsychSupport(false);
    setSelectedMode(null);
  };

  // Show PsychSupport component
  if (showPsychSupport) {
    return <PsychSupport onBack={handleBackToHome} />;
  }

  if (showAI) {
    return <VoiceAIAgent initialMode={selectedMode} onBack={handleBackToHome} />;
  }

  return (
    <div className="landing-container">
      {/* Fixed Header */}
      <header className="landing-header">
        <div className="header-logo">
          <span className="logo-icon">⚕</span>
          <span className="logo-text">MedAssist AI</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="landing-main">
        <div className={`hero-content ${isLoaded ? 'loaded' : ''}`}>
          {/* Medical Cross Icon */}
          <div className="hero-icon">
            <svg viewBox="0 0 100 100" className="medical-icon">
              <rect x="40" y="10" width="20" height="80" rx="4" fill="currentColor"/>
              <rect x="10" y="40" width="80" height="20" rx="4" fill="currentColor"/>
            </svg>
          </div>

          <h1 className="hero-title">Medical AI Assistant</h1>
          <p className="hero-subtitle">
            Intelligent healthcare support powered by advanced AI
          </p>

          {/* Features - Clickable Navigation */}
          <div className="features-grid">
            <button className="feature-item" onClick={() => navigateToMode('voiceai')}>
              <span className="feature-icon">🗣️</span>
              <span className="feature-text">Voice Consultation</span>
              <span className="feature-arrow">→</span>
            </button>
            <button className="feature-item" onClick={() => navigateToMode('mri')}>
              <span className="feature-icon">🔍</span>
              <span className="feature-text">MRI Analysis</span>
              <span className="feature-arrow">→</span>
            </button>
            <button className="feature-item" onClick={() => navigateToMode('med')}>
              <span className="feature-icon">💊</span>
              <span className="feature-text">Medication Info</span>
              <span className="feature-arrow">→</span>
            </button>
            <button className="feature-item" onClick={() => navigateToMode('acc')}>
              <span className="feature-icon">🚨</span>
              <span className="feature-text">Emergency Aid</span>
              <span className="feature-arrow">→</span>
            </button>
            <button className="feature-item psych-feature" onClick={() => navigateToMode('psych')}>
              <span className="feature-icon">💚</span>
              <span className="feature-text">Mental Health Support</span>
              <span className="feature-arrow">→</span>
            </button>
          </div>

          {/* CTA Button */}
          <button className="cta-button" onClick={() => setShowAI(true)}>
            <span className="cta-text">Start Consultation</span>
            <span className="cta-arrow">→</span>
          </button>

          <p className="disclaimer">
            For informational purposes only. Always consult a healthcare professional.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© 2025 MedAssist AI • Professional Healthcare Assistant</p>
      </footer>
    </div>
  );
}

export default App;
