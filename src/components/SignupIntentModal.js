import React, { useEffect, useRef, useState } from 'react';
import '../styles/SignupIntentModal.css';

export const SIGNUP_INTENT_STORAGE_KEY = 'ingather-signup-intent';

const signupIntentIcons = {
  church: (
    <svg viewBox="0 0 48 48" focusable="false" aria-hidden="true">
      <path className="signup-intent-icon-base" d="M10 40h28" />
      <path className="signup-intent-icon-base" d="M15 40V23.5L24 17l9 6.5V40" />
      <path className="signup-intent-icon-base" d="M12.5 26.5L24 18l11.5 8.5" />
      <path className="signup-intent-icon-accent" d="M24 8v10" />
      <path className="signup-intent-icon-accent" d="M20.5 12h7" />
      <path className="signup-intent-icon-base" d="M20.5 40v-9.5a3.5 3.5 0 0 1 7 0V40" />
      <path className="signup-intent-icon-accent" d="M18.5 27.5h3.5" />
      <path className="signup-intent-icon-accent" d="M26 27.5h3.5" />
    </svg>
  ),
  general: (
    <svg viewBox="0 0 48 48" focusable="false" aria-hidden="true">
      <path
        className="signup-intent-icon-base"
        d="M11 17.5h26a3 3 0 0 1 3 3V26a4 4 0 0 0 0 8v5.5a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3V34a4 4 0 0 0 0-8v-5.5a3 3 0 0 1 3-3Z"
      />
      <path className="signup-intent-icon-accent" d="M18 18v24" />
      <path className="signup-intent-icon-base" d="M23 26h10" />
      <path className="signup-intent-icon-base" d="M23 33h7" />
      <path className="signup-intent-icon-accent" d="M31.5 17.5v-4" />
      <path className="signup-intent-icon-accent" d="M25 17.5v-4" />
      <path className="signup-intent-icon-accent" d="M28.25 13.5h6.5" />
    </svg>
  )
};

const options = [
  {
    id: 'church',
    eyebrow: 'Church workspace',
    title: 'Register as a Church',
    description: 'For services, programs, ministry gatherings, first-timer follow-up, and church attendance.',
    highlights: ['Programs', 'Church dashboard', 'Service check-ins'],
    icon: signupIntentIcons.church
  },
  {
    id: 'general',
    eyebrow: 'Event workspace',
    title: 'Other Events',
    description: 'For conferences, tech meetups, seminars, bootcamps, corporate sessions, and communities.',
    highlights: ['Conferences', 'Meetups', 'Seminars'],
    icon: signupIntentIcons.general
  }
];

function SignupIntentModal({ onClose, onSelect }) {
  const [isClosing, setIsClosing] = useState(false);
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

  const handleSelect = (intent) => {
    localStorage.setItem(SIGNUP_INTENT_STORAGE_KEY, intent);
    finishClose(() => onSelect(intent));
  };

  return (
    <div
      className={`signup-intent-overlay ${isClosing ? 'is-closing' : ''}`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <section
        className="signup-intent-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-intent-title"
        aria-describedby="signup-intent-description"
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="signup-intent-close"
          onClick={handleClose}
          aria-label="Close signup options"
        >
          &times;
        </button>

        <div className="signup-intent-header">
          <span className="signup-intent-kicker">Choose your workspace</span>
          <h2 id="signup-intent-title">How will you use Ingather?</h2>
          <p id="signup-intent-description">
            Pick the setup that fits your team. You can still adjust your workspace template later.
          </p>
        </div>

        <div className="signup-intent-grid">
          {options.map(option => (
            <button
              key={option.id}
              type="button"
              className={`signup-intent-card signup-intent-card-${option.id}`}
              onClick={() => handleSelect(option.id)}
            >
              <span className="signup-intent-card-mark" aria-hidden="true">
                {option.icon}
              </span>
              <span className="signup-intent-card-eyebrow">{option.eyebrow}</span>
              <strong>{option.title}</strong>
              <span className="signup-intent-card-description">{option.description}</span>
              <span className="signup-intent-card-tags" aria-label={`${option.title} examples`}>
                {option.highlights.map(highlight => (
                  <span key={highlight}>{highlight}</span>
                ))}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default SignupIntentModal;
