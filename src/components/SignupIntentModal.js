import React, { useEffect, useRef, useState } from 'react';
import '../styles/IgSignupIntent.css';

export const SIGNUP_INTENT_STORAGE_KEY = 'ingather-signup-intent';

const icons = {
  church: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2v5M9.5 4.5h5M5 21V12l7-5 7 5v9M3 21h18M10 21v-4a2 2 0 014 0v4" />
    </svg>
  ),
  general: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16a1 1 0 011 1v2.5a1.5 1.5 0 000 3V16a1 1 0 01-1 1H4a1 1 0 01-1-1v-2.5a1.5 1.5 0 000-3V8a1 1 0 011-1zM14 7v10" />
    </svg>
  )
};

const options = [
  {
    id: 'church',
    eyebrow: 'Church workspace',
    title: 'Register as a church',
    description: 'For services, programs, ministry gatherings, first-timer follow-up and church attendance.',
    highlights: ['Programs', 'Service check-ins', 'Visitors'],
    continueLabel: 'Continue as a church'
  },
  {
    id: 'general',
    eyebrow: 'Event workspace',
    title: 'Other events',
    description: 'For conferences, meetups, seminars, bootcamps, company sessions and communities.',
    highlights: ['Conferences', 'Meetups', 'Seminars'],
    continueLabel: 'Continue as an event organizer'
  }
];

function SignupIntentModal({ onClose, onSelect }) {
  const [isClosing, setIsClosing] = useState(false);
  const [pick, setPick] = useState('general');
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishClose = (callback) => {
    setIsClosing(true);
    window.setTimeout(callback, 160);
  };

  const handleClose = () => {
    finishClose(onClose);
  };

  const handleContinue = () => {
    try {
      localStorage.setItem(SIGNUP_INTENT_STORAGE_KEY, pick);
    } catch (error) {
      // Storage blocked; the choice still travels in the link.
    }
    finishClose(() => onSelect(pick));
  };

  const current = options.find((option) => option.id === pick) || options[1];

  return (
    <div
      className={`ig-si-overlay ${isClosing ? 'is-closing' : ''}`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <section
        className="ig-si-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-intent-title"
        aria-describedby="signup-intent-description"
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="ig-si-close"
          onClick={handleClose}
          aria-label="Close signup options"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>

        <div className="ig-si-head">
          <span className="ig-si-chip">Before you start</span>
          <h2 id="signup-intent-title">How will you use Ingather?</h2>
          <p id="signup-intent-description">Pick the setup that fits your team. You can change it later in Settings.</p>
        </div>

        <div className="ig-si-grid" role="radiogroup" aria-label="Workspace type">
          {options.map((option) => {
            const selected = option.id === pick;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`ig-si-card ${selected ? 'is-on' : ''}`}
                onClick={() => setPick(option.id)}
              >
                <span className="ig-si-card-top">
                  <span className="ig-si-icon">{icons[option.id]}</span>
                  <span className="ig-si-radio" aria-hidden="true"><span /></span>
                </span>
                <span className="ig-si-copy">
                  <span className="ig-si-eyebrow">{option.eyebrow}</span>
                  <strong>{option.title}</strong>
                  <span className="ig-si-desc">{option.description}</span>
                </span>
                <span className="ig-si-tags">
                  {option.highlights.map((highlight) => (
                    <span key={highlight}>{highlight}</span>
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        <button type="button" className="ig-si-continue" onClick={handleContinue}>
          {current.continueLabel}
        </button>
      </section>
    </div>
  );
}

export default SignupIntentModal;
