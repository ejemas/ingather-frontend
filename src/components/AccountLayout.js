import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/IgWaitlist.css';
import '../styles/IgLogin.css';
import '../styles/IgAccount.css';

/* Shared pieces for the account screens: create account, verify email,
   forgot password and reset password (redesign, Nov 2026). */

const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

export function AccountLayout({
  pillTag,
  pillText,
  titleStart,
  titleBox,
  lead,
  photo,
  photoAlt,
  chip,
  panelTitle,
  panelText,
  navLabel = 'Log in',
  navTo = '/login',
  tall = false,
  children
}) {
  return (
    <div className="ig-wl ig-login ig-acct">
      <div className="ig-wl-frame">
        <div className="ig-wl-col">
          <div className="ig-wl-navwrap">
            <nav className="ig-wl-nav" aria-label="Main">
              <Link to="/" className="ig-wl-brand" aria-label="Ingather home">
                <img src="/ingather-logo.png" alt="Ingather" />
              </Link>
              <div className="ig-wl-navlinks">
                <Link to="/">Home</Link>
                <Link to="/#features">Features</Link>
                <Link to="/discover">Discover</Link>
                <Link to="/#faq">FAQs</Link>
              </div>
              <Link to={navTo} className="ig-wl-login">{navLabel}</Link>
            </nav>
          </div>

          <main className="ig-wl-main">
            <div className="ig-wl-photo-top ig-acct-photo-top">
              <img src={photo} alt={photoAlt} />
              <div className="ig-wl-shade ig-acct-shade" aria-hidden="true" />
              <span>{chip}</span>
            </div>

            <div className="ig-wl-left ig-login-left">
              <span className="ig-wl-pill"><span>{pillTag}</span>{pillText}</span>
              <h1>{titleStart} <span className="ig-wl-mark">{titleBox}</span></h1>
              <p className="ig-wl-lead">{lead}</p>
              {children}
            </div>

            <div className={`ig-wl-photo ig-acct-photo ${tall ? 'is-tall' : ''}`}>
              <img src={photo} alt={photoAlt} />
              <div className="ig-wl-shade" aria-hidden="true" />
              <div className="ig-login-photo-fade" aria-hidden="true" />
              <span className="ig-acct-chip">
                <span className="ig-acct-chip-icon"><LockIcon /></span>
                {chip}
              </span>
              <div className="ig-login-photo-copy">
                <span className="ig-login-photo-title">{panelTitle}</span>
                <span className="ig-login-photo-text">{panelText}</span>
              </div>
            </div>
          </main>

          <footer className="ig-wl-foot">
            <span>&copy; 2026 Ingather. All rights reserved.</span>
            <span>Made in Nigeria</span>
          </footer>
        </div>
      </div>
    </div>
  );
}

const EyeIcon = ({ visible }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {visible ? (
      <>
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6a2 2 0 002.8 2.8" />
        <path d="M9.9 5.1A10.9 10.9 0 0112 5c5 0 8.5 4 10 7a13.4 13.4 0 01-3 4.1" />
        <path d="M6.6 6.6A13.8 13.8 0 002 12c1.5 3 5 7 10 7 1.5 0 2.9-.4 4.1-1" />
      </>
    ) : (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
);

export function PasswordInput({ id, name, value, onChange, placeholder, autoComplete, invalid }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={`ig-login-pw ${invalid ? 'is-invalid' : ''}`}>
      <input
        type={visible ? 'text' : 'password'}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
      >
        <EyeIcon visible={visible} />
      </button>
    </div>
  );
}

/* ---------- Password strength ----------
   Same rules as backend/utils/passwordPolicy.js. Keep the two lists in step. */

const COMMON_PASSWORDS = new Set([
  'password', 'passw0rd', 'password1', 'qwerty', 'qwertyuiop', 'qwerty123', 'asdfghjkl', 'zxcvbnm',
  '1q2w3e4r', '1q2w3e4r5t', 'zaq12wsx', 'iloveyou', 'admin', 'administrator', 'welcome', 'letmein',
  'abc123', 'abcd1234', 'football', 'baseball', 'monkey', 'dragon', 'sunshine', 'princess', 'master',
  'hello', 'freedom', 'whatever', 'trustno1', 'starwars', 'login', 'changeme', 'secret', 'superman',
  'batman', 'michael', 'shadow', 'nigeria', 'naija', 'lagos', 'abuja', 'jesus', 'jesuschrist',
  'godisgood', 'blessed', 'blessing', 'favour', 'favor', 'grace', 'ingather', 'church', 'event',
  'events', 'summer', 'winter', 'computer', 'internet', 'samsung', 'iphone', 'google'
]);

const NUMERIC_RUNS = ['0123456789', '1234567890', '9876543210', '0987654321'];

const isCommonPassword = (password) => {
  const lower = String(password || '').toLowerCase();
  if (!lower) return false;
  if (/^(.)\1+$/.test(lower)) return true;
  if (/^\d+$/.test(lower) && NUMERIC_RUNS.some((run) => run.includes(lower) || lower.includes(run.slice(0, 6)))) return true;
  if (COMMON_PASSWORDS.has(lower)) return true;
  const stripped = lower.replace(/[^a-z]+$/g, '').replace(/^[^a-z]+/g, '');
  return Boolean(stripped) && COMMON_PASSWORDS.has(stripped);
};

export const evaluatePassword = (password) => {
  const value = String(password || '');
  const lengthOk = value.length >= 8 && value.length <= 64;
  const mixOk = /[A-Za-z]/.test(value) && /\d/.test(value);
  const symbolOk = /[^A-Za-z0-9]/.test(value);
  const common = value.length > 0 && isCommonPassword(value);

  let level = 0;
  let label = '';
  let tone = 'muted';
  if (value) {
    if (common) { level = 1; label = 'Too common'; tone = 'bad'; }
    else if (!lengthOk) { level = 1; label = value.length > 64 ? 'Too long' : 'Too short'; tone = 'warn'; }
    else if (!mixOk) { level = 2; label = 'Weak'; tone = 'warn'; }
    else if (!symbolOk) { level = 3; label = 'Good'; tone = 'good'; }
    else { level = 4; label = 'Strong'; tone = 'strong'; }
  }

  return {
    level,
    label,
    tone,
    acceptable: lengthOk && mixOk && !common,
    rules: [
      { key: 'length', text: '8 to 64 characters', state: value ? (lengthOk ? 'ok' : 'todo') : 'todo' },
      { key: 'mix', text: 'Letters and numbers', state: mixOk ? 'ok' : 'todo' },
      { key: 'symbol', text: 'A symbol like ! or # (recommended)', state: symbolOk ? 'ok' : 'todo' },
      {
        key: 'common',
        text: common ? 'This password is too common. Pick another.' : 'Not a common password',
        state: common ? 'bad' : value && lengthOk ? 'ok' : 'todo'
      }
    ]
  };
};

export const passwordProblem = (password) => {
  const value = String(password || '');
  const result = evaluatePassword(value);
  if (!value) return 'Password is required';
  if (result.rules[3].state === 'bad') return 'This password is too common. Pick another.';
  if (value.length < 8) return 'Use at least 8 characters';
  if (value.length > 64) return 'Use 64 characters or fewer';
  if (result.rules[1].state !== 'ok') return 'Use both letters and numbers';
  return '';
};

export function PasswordStrength({ password }) {
  const result = evaluatePassword(password);
  return (
    <div className={`ig-acct-strength tone-${result.tone}`} aria-live="polite">
      <div className="ig-acct-strength-top">
        <span className="ig-acct-meter" aria-hidden="true">
          {[0, 1, 2, 3].map((index) => (
            <span key={index} className={index < result.level ? 'is-on' : ''} />
          ))}
        </span>
        <span className="ig-acct-strength-label">{result.label}</span>
      </div>
      {result.rules.map((rule) => (
        <span key={rule.key} className={`ig-acct-rule is-${rule.state}`}>
          <span className="ig-acct-rule-dot" aria-hidden="true">{rule.state === 'ok' ? '✓' : rule.state === 'bad' ? '!' : ''}</span>
          {rule.text}
        </span>
      ))}
    </div>
  );
}

/* ---------- 6-digit code boxes ---------- */

export function CodeInput({ digits, onChange, invalid = false, disabled = false, autoFocus = true, label = 'Verification code' }) {
  const refs = useRef([]);
  const length = digits.length;

  const setDigit = (index, value) => {
    if (value && !/^\d$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    onChange(next);
    if (value && index < length - 1) refs.current[index + 1]?.focus();
  };

  const handleChange = (index, raw) => {
    const value = String(raw || '').replace(/\D/g, '');
    if (value.length > 1) {
      // Some phones fill the whole code into one box
      const next = Array(length).fill('');
      value.slice(0, length).split('').forEach((digit, i) => { next[i] = digit; });
      onChange(next);
      refs.current[Math.min(value.length, length - 1)]?.focus();
      return;
    }
    setDigit(index, value);
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus();
    if (event.key === 'ArrowRight' && index < length - 1) refs.current[index + 1]?.focus();
  };

  const handlePaste = (event) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    event.preventDefault();
    const next = Array(length).fill('');
    pasted.split('').forEach((digit, i) => { next[i] = digit; });
    onChange(next);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <fieldset className="ig-acct-code" disabled={disabled}>
      <legend>{label}</legend>
      <div className={`ig-acct-code-boxes ${invalid ? 'is-invalid' : ''}`}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => { refs.current[index] = element; }}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={length}
            value={digit}
            className={digit ? 'is-filled' : ''}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            onFocus={(event) => event.target.select()}
            autoFocus={autoFocus && index === 0}
            aria-label={`Digit ${index + 1}`}
          />
        ))}
      </div>
    </fieldset>
  );
}

export function Notice({ tone = 'info', children }) {
  return <div className={`ig-acct-notice tone-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>;
}

export const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 8l9 6 9-6" />
  </svg>
);

export const CheckIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export { LockIcon };
