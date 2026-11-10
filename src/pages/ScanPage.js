// CHANGE THIS LINE:
import React, { useState, useEffect, useRef } from 'react';
// import { getProgramInfo, submitScan } from '../api/scanService';
import { useParams } from 'react-router-dom';
import { getProgramInfo, submitScan, submitFormData, submitFastTrackRsvp, submitProxyAttendee, updateScanData, trackSponsorClick } from '../api/scanService';
import { useToast } from '../components/Toast';
import { useEventTemplate } from '../context/EventTemplateContext';
import { playSuccessSound, playErrorSound } from '../utils/scanSounds';
import { formatTimeRange, weekdayShortDate } from '../utils/dashboardFormat';
import '../styles/IgGuest.css';

const INGATHER_PUBLIC_ORIGIN = 'https://ingather.app';

const getEventDetailsUrl = (programId) => `${INGATHER_PUBLIC_ORIGIN}/scan/${programId}?details=1`;

const fallbackFingerprint = () => {
  return `${navigator.userAgent}-${navigator.language}-${window.screen.width}x${window.screen.height}`;
};

const FINGERPRINT_CACHE_KEY = 'ingather_device_fingerprint_v1';

const getCachedFingerprint = () => {
  try {
    return window.localStorage.getItem(FINGERPRINT_CACHE_KEY);
  } catch (error) {
    return null;
  }
};

const setCachedFingerprint = (fingerprint) => {
  try {
    window.localStorage.setItem(FINGERPRINT_CACHE_KEY, fingerprint);
  } catch (error) {
    // Private browsing or storage restrictions should not block scanning.
  }
};

const getDeviceFingerprint = async () => {
  const cachedFingerprint = getCachedFingerprint();
  if (cachedFingerprint) return cachedFingerprint;

  try {
    const { default: FingerprintJS } = await import('@fingerprintjs/fingerprintjs');
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    setCachedFingerprint(result.visitorId);
    return result.visitorId;
  } catch (error) {
    const fallback = fallbackFingerprint();
    setCachedFingerprint(fallback);
    return fallback;
  }
};

const isValidCollectedEmail = (value) => {
  const email = String(value || '').trim();
  return email.length <= 255
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    && email.indexOf('@') === email.lastIndexOf('@');
};

const isValidHttpUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return false;
  try {
    const url = new URL(raw);
    return ['http:', 'https:'].includes(url.protocol);
  } catch (error) {
    return false;
  }
};

const getPersonalizedMessageTemplates = (config = {}) => {
  const fromArray = Array.isArray(config.templates)
    ? config.templates.map(message => String(message || '').trim()).filter(Boolean)
    : [];

  if (fromArray.length > 0) return fromArray;

  return String(config.template || '')
    .split(/\r?\n/)
    .map(message => message.trim())
    .filter(Boolean);
};

const pickPersonalizedTemplate = (config = {}) => {
  const templates = getPersonalizedMessageTemplates(config);
  if (templates.length === 0) return '[FirstName], you are welcome and deeply valued.';
  return templates[Math.floor(Math.random() * templates.length)];
};

const isPersonalizedFlyer = (programData) => (
  programData?.flyerType === 'personalized'
    && getPersonalizedMessageTemplates(programData?.personalizedFlyerConfig).length > 0
);

const getFirstName = (fullName) => {
  const firstName = String(fullName || '').trim().split(/\s+/)[0];
  return firstName || 'Friend';
};

const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const personalizeTemplate = (template, firstName) => (
  String(template || '[FirstName], you are welcome and deeply valued.')
    .replace(/\[FirstName\]/gi, firstName)
);

const loadCanvasImage = (src) => new Promise((resolve, reject) => {
  if (!src) return resolve(null);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

const wrapWordsToCanvasLines = (ctx, words, maxWidth) => {
  const lines = [];
  let line = '';

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  });

  if (line) lines.push(line);
  return lines;
};

const canvasToPngBlob = (canvas) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) {
      resolve(blob);
    } else {
      reject(new Error('Unable to create flyer image.'));
    }
  }, 'image/png');
});

const sanitizeDownloadPart = (value, fallback = 'ingather') => {
  const cleaned = String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return cleaned || fallback;
};

const createPersonalizedFlyerFileName = (firstName, eventTitle) => (
  `${sanitizeDownloadPart(firstName, 'friend')}-${sanitizeDownloadPart(eventTitle, 'event')}-ingather-flyer.png`
);

/* ---------------- Guest check-in screens (redesign, Nov 2026) ---------------- */

const guestInitials = (name) => String(name || 'Host').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'IG';
const isSafeGuestImage = (value) => /^(https:\/\/|\/(?!\/)|data:image\/(png|jpe?g|webp|gif);base64,)/i.test(String(value || ''));

const guestWhen = (programData) => {
  const day = weekdayShortDate(programData?.date);
  const time = formatTimeRange(programData?.startTime, programData?.endTime);
  return [day, time].filter(Boolean).join(', ');
};

const GuestIcon = {
  gift: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M5 12v9h14v-9M7.5 8a2.5 2.5 0 010-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 010 5" /></svg>,
  qr: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3M21 14v.01M14 21h3M21 17v4" /></svg>,
  check: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>,
  alert: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5v.01" /></svg>,
  closed: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4M10 13.5l4 4M14 13.5l-4 4" /></svg>,
  wifi: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 8.8a15 15 0 0120 0M5 12.6a10 10 0 0114 0M8.5 16.4a5 5 0 017 0M12 20h.01" /><path d="M3 3l18 18" /></svg>,
  male: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="10" cy="14" r="5" /><path d="M14 10l6-6M15 4h5v5" /></svg>,
  female: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="9" r="5" /><path d="M12 14v8M9 19h6" /></svg>
};

function GuestHostChip({ name, logo }) {
  const [failed, setFailed] = useState(false);
  const showLogo = isSafeGuestImage(logo) && !failed;
  return (
    <span className="ig-gs-host">
      {showLogo ? <img src={logo} alt="" onError={() => setFailed(true)} /> : <span aria-hidden="true">{guestInitials(name)}</span>}
      <span className="ig-gs-host-name">{name || 'Event host'}</span>
    </span>
  );
}

function GuestHero({ programData }) {
  const [flyerFailed, setFlyerFailed] = useState(false);
  const flyer = isSafeGuestImage(programData?.flyerUrl) && !flyerFailed ? programData.flyerUrl : null;
  const when = guestWhen(programData);
  return (
    <header className="ig-gs-hero">
      {flyer && <img className="ig-gs-hero-img" src={flyer} alt="" onError={() => setFlyerFailed(true)} />}
      <span className="ig-gs-hero-shade" aria-hidden="true" />
      <GuestHostChip name={programData?.churchName} logo={programData?.churchLogo} />
      <span className="ig-gs-hero-text">
        <h1>{programData?.title || 'Check-in'}</h1>
        {when && <span>{when}</span>}
      </span>
    </header>
  );
}

function GuestPowered() {
  return <footer className="ig-gs-powered">Powered by <img src="/ingather-logo.png" alt="Ingather" /></footer>;
}

function GuestShell({ programData, children, center = false }) {
  return (
    <div className="ig-gs">
      <div className={`ig-gs-wrap${center ? ' is-center' : ''}`}>
        {programData && <GuestHero programData={programData} />}
        <main className="ig-gs-main">{children}</main>
        <GuestPowered />
      </div>
    </div>
  );
}

function GuestIntro({ tag, tagText, title, highlight, lead }) {
  return (
    <div className="ig-gs-intro">
      <span className="ig-gs-tag"><em>{tag}</em>{tagText}</span>
      <h2>{title} <span>{highlight}</span></h2>
      {lead && <p>{lead}</p>}
    </div>
  );
}

function GuestFinePrint({ host }) {
  return (
    <p className="ig-gs-fine">
      Your details are shared with {host || 'the organizer'}, the event host. See Ingather's <a href="/terms" target="_blank" rel="noopener noreferrer">Terms</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
    </p>
  );
}

function GuestError({ id, text }) {
  if (!text) return null;
  return <span className="ig-gs-error" id={id} role="alert">{GuestIcon.alert}{text}</span>;
}

function GuestInput({ id, label, optional, error, ...inputProps }) {
  const errorId = `${id}-error`;
  return (
    <div className={`ig-gs-field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}{optional && <em> (optional)</em>}</label>
      <input id={id} className="ig-gs-input" aria-invalid={Boolean(error) || undefined} aria-describedby={error ? errorId : undefined} {...inputProps} />
      <GuestError id={errorId} text={error} />
    </div>
  );
}

function GuestTextarea({ id, label, error, ...props }) {
  const errorId = `${id}-error`;
  return (
    <div className={`ig-gs-field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <textarea id={id} className="ig-gs-input ig-gs-textarea" aria-invalid={Boolean(error) || undefined} aria-describedby={error ? errorId : undefined} {...props} />
      <GuestError id={errorId} text={error} />
    </div>
  );
}

function GuestGender({ id, value, onChange, error, options, big = false, label = 'Gender' }) {
  const errorId = `${id}-error`;
  return (
    <fieldset className={`ig-gs-field${error ? ' has-error' : ''}`} id={id} aria-describedby={error ? errorId : undefined}>
      <legend>{label}</legend>
      <div className={`ig-gs-pair${big ? ' is-big' : ''}`} role="radiogroup" aria-label={label}>
        {options.map(([optionValue, optionLabel, icon]) => {
          const on = value === optionValue;
          return (
            <button key={optionValue} type="button" role="radio" aria-checked={on} className={on ? 'is-on' : ''} onClick={() => onChange(optionValue)}>
              {big && <span className="ig-gs-pair-icon">{icon}</span>}
              <span className="ig-gs-pair-label"><span className="ig-gs-radio" aria-hidden="true" />{optionLabel}</span>
            </button>
          );
        })}
      </div>
      <GuestError id={errorId} text={error} />
    </fieldset>
  );
}

function GuestCheckRow({ id, title, sub, checked, onChange }) {
  return (
    <label className={`ig-gs-checkrow${checked ? ' is-on' : ''}`} htmlFor={id}>
      <span><strong>{title}</strong>{sub && <span>{sub}</span>}</span>
      <input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="ig-gs-box" aria-hidden="true">{GuestIcon.check}</span>
    </label>
  );
}

function GuestQuestions({ fields = [], values = {}, errors = {}, onChange, idPrefix = 'q' }) {
  return fields.map((field) => {
    const value = values[field.id];
    const id = `${idPrefix}-${field.id}`;
    const errorId = `${id}-error`;
    const label = <>{field.label}{!field.required && <em> (optional)</em>}</>;
    if (field.type === 'radio' || field.type === 'checkbox') {
      const many = field.type === 'checkbox';
      const selected = many ? (Array.isArray(value) ? value : []) : value;
      return (
        <fieldset className={`ig-gs-field${errors[field.id] ? ' has-error' : ''}`} key={field.id} id={id} aria-describedby={errors[field.id] ? errorId : undefined}>
          <legend>{label}{many && <span className="ig-gs-hint"> Pick any that apply</span>}</legend>
          <div className="ig-gs-options">
            {(field.options || []).map((option) => {
              const on = many ? selected.includes(option) : selected === option;
              return (
                <label key={option} className={`ig-gs-option${on ? ' is-on' : ''}`}>
                  <input
                    type={many ? 'checkbox' : 'radio'}
                    name={id}
                    value={option}
                    checked={on}
                    onChange={(event) => onChange(field.id, many
                      ? (event.target.checked ? [...selected, option] : selected.filter((item) => item !== option))
                      : option)}
                  />
                  <span className={many ? 'ig-gs-box is-small' : 'ig-gs-radio'} aria-hidden="true">{many && GuestIcon.check}</span>
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
          <GuestError id={errorId} text={errors[field.id]} />
        </fieldset>
      );
    }
    return (
      <GuestInput
        key={field.id}
        id={id}
        label={field.label}
        optional={!field.required}
        type="text"
        value={value || ''}
        onChange={(event) => onChange(field.id, event.target.value)}
        placeholder="Your answer"
        maxLength={500}
        error={errors[field.id]}
      />
    );
  });
}

function GuestStatus({ icon, tone = 'peach', title, text, callout, children }) {
  return (
    <section className="ig-gs-card ig-gs-status" aria-live="polite">
      <span className={`ig-gs-status-icon is-${tone}`}>{icon}</span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {callout && <div className="ig-gs-callout">{GuestIcon.alert}<span>{callout}</span></div>}
      {children}
    </section>
  );
}

// Moves the guest to the first answer that needs fixing.
const focusFirstGuestError = (root) => {
  if (!root) return;
  const target = root.querySelector('[aria-invalid="true"], .has-error button, .has-error input');
  if (!target) return;
  if (typeof target.scrollIntoView === 'function') target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  if (typeof target.focus === 'function') target.focus({ preventScroll: true });
};

/* ---------------- After check-in (redesign, Nov 2026) ---------------- */

const clockLabel = (date) => (date instanceof Date && !Number.isNaN(date.getTime())
  ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  : '');

const downloadBlobFile = (blob, fileName) => {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = fileName;
  link.href = objectUrl;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

// Shares a picture where the phone allows it, then falls back to sharing or copying the link.
const shareWithFallback = async ({ file, title, text, url, toast }) => {
  if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title, text, files: [file] });
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`.trim());
    toast?.success('Link copied. Paste it in your status or chat.');
  } catch (error) {
    toast?.info('Save the picture, then post it from your gallery.');
  }
};

const copyLinkWithToast = async (url, toast) => {
  try {
    await navigator.clipboard.writeText(url);
    toast?.success('Event link copied.');
  } catch (error) {
    toast?.info(url);
  }
};

const roundedRectPath = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const drawCoverImage = (ctx, img, x, y, w, h) => {
  const ratio = Math.max(w / img.width, h / img.height);
  const dw = img.width * ratio;
  const dh = img.height * ratio;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
};

const fitFont = (ctx, text, maxWidth, weight, size, minSize) => {
  let fontSize = size;
  ctx.font = `${weight} ${fontSize}px Inter, Arial, sans-serif`;
  while (ctx.measureText(text).width > maxWidth && fontSize > minSize) {
    fontSize -= 2;
    ctx.font = `${weight} ${fontSize}px Inter, Arial, sans-serif`;
  }
  return fontSize;
};

const getPersonalFlyerParts = (programData, attendeeName, personalizedMessage, fallbackTemplate) => {
  const config = programData?.personalizedFlyerConfig || {};
  const firstName = getFirstName(attendeeName);
  const message = personalizeTemplate(personalizedMessage || fallbackTemplate, firstName);
  const rest = message.replace(new RegExp(`^${escapeRegExp(firstName)}[,\\s-]*`, 'i'), '').trim() || message;
  const textColor = /^#?[0-9a-f]{6}$/i.test(String(config.textColor || '')) ? config.textColor : '#FFFFFF';
  return {
    firstName,
    message,
    rest,
    brand: /^#?[0-9a-f]{6}$/i.test(String(config.brandColor || '')) ? config.brandColor : '#E8590C',
    buttonText: textColor,
    background: programData?.personalizedBackgroundUrl || '',
    logo: config.logoUrl || programData?.personalizedLogoUrl || programData?.churchLogo || '',
    host: programData?.churchName || 'Ingather',
    title: programData?.title || 'our event',
    date: weekdayShortDate(programData?.date)
  };
};

// Draws the guest's welcome flyer as a 1080 x 1350 picture (a good size for WhatsApp status).
const drawPersonalFlyer = async (parts) => {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  try { if (document.fonts?.ready) await document.fonts.ready; } catch (error) { /* fonts are optional */ }

  const [background, logo, ingatherLogo] = await Promise.all([
    loadCanvasImage(parts.background).catch(() => null),
    loadCanvasImage(parts.logo).catch(() => null),
    loadCanvasImage('/ingather-logo.png').catch(() => null)
  ]);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  // Top: the organizer's picture, or their brand colour.
  const topH = 560;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, topH);
  ctx.clip();
  ctx.fillStyle = parts.brand;
  ctx.fillRect(0, 0, W, topH);
  if (background) {
    drawCoverImage(ctx, background, 0, 0, W, topH);
    const shade = ctx.createLinearGradient(0, 0, 0, topH);
    shade.addColorStop(0, 'rgba(0, 0, 0, 0.28)');
    shade.addColorStop(0.45, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, W, topH);
  }
  ctx.restore();

  // Host chip.
  ctx.font = '600 32px Inter, Arial, sans-serif';
  const hostText = parts.host.length > 34 ? `${parts.host.slice(0, 33)}…` : parts.host;
  const chipW = Math.min(W - 96, 58 + 22 + ctx.measureText(hostText).width + 30);
  roundedRectPath(ctx, 48, 48, chipW, 72, 36);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(48 + 36, 84, 26, 0, Math.PI * 2);
  ctx.fillStyle = '#111111';
  ctx.fill();
  if (logo) {
    ctx.clip();
    drawCoverImage(ctx, logo, 48 + 10, 58, 52, 52);
  } else {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 20px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(guestInitials(parts.host), 48 + 36, 85);
  }
  ctx.restore();
  ctx.fillStyle = '#111111';
  ctx.font = '600 32px Inter, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(hostText, 48 + 80, 85);

  // Ticket tear line.
  ctx.strokeStyle = parts.brand;
  ctx.lineWidth = 6;
  ctx.setLineDash([22, 14]);
  ctx.beginPath();
  ctx.moveTo(0, topH + 3);
  ctx.lineTo(W, topH + 3);
  ctx.stroke();
  ctx.setLineDash([]);

  const left = 80;
  const maxW = W - left * 2;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  ctx.fillStyle = parts.brand;
  fitFont(ctx, `Welcome to ${parts.title}`, maxW, '600', 38, 26);
  ctx.fillText(`Welcome to ${parts.title}`, left, topH + 104);

  ctx.fillStyle = '#111111';
  fitFont(ctx, `${parts.firstName},`, maxW, '800', 120, 72);
  ctx.fillText(`${parts.firstName},`, left, topH + 238);

  ctx.fillStyle = '#3F3F3F';
  let messageSize = 56;
  let lines = [];
  do {
    ctx.font = `600 ${messageSize}px Inter, Arial, sans-serif`;
    lines = wrapWordsToCanvasLines(ctx, parts.rest.split(/\s+/).filter(Boolean), maxW);
    if (lines.length <= 4) break;
    messageSize -= 4;
  } while (messageSize > 36);
  lines.slice(0, 5).forEach((line, index) => {
    ctx.fillText(line, left, topH + 330 + index * Math.round(messageSize * 1.24));
  });

  // Footer: date and "Powered by Ingather".
  ctx.fillStyle = '#ECECEA';
  ctx.fillRect(left, H - 140, maxW, 3);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#6B6B6B';
  ctx.font = '500 32px Inter, Arial, sans-serif';
  ctx.fillText(parts.date || parts.title, left, H - 72);
  const logoH = 40;
  const logoW = ingatherLogo ? (ingatherLogo.width / ingatherLogo.height) * logoH : 0;
  const right = W - left;
  if (ingatherLogo) ctx.drawImage(ingatherLogo, right - logoW, H - 72 - logoH / 2, logoW, logoH);
  ctx.textAlign = 'right';
  ctx.fillText(ingatherLogo ? 'Powered by' : 'Powered by Ingather', right - logoW - (ingatherLogo ? 14 : 0), H - 72);

  // Brand frame.
  ctx.strokeStyle = parts.brand;
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, W - 12, H - 12);

  return canvas;
};

function usePersonalFlyer(programData, attendeeName, personalizedMessage, enabled) {
  const fallbackRef = useRef('');
  if (!fallbackRef.current) {
    const config = programData?.personalizedFlyerConfig || {};
    fallbackRef.current = pickPersonalizedTemplate({ template: config.template, templates: config.templates });
  }
  const parts = enabled ? getPersonalFlyerParts(programData, attendeeName, personalizedMessage, fallbackRef.current) : null;
  const key = parts ? JSON.stringify(parts) : '';
  const [state, setState] = useState({ key: '', url: '', blob: null, failed: false });

  useEffect(() => {
    if (!key) return undefined;
    let alive = true;
    const flyerParts = JSON.parse(key);
    drawPersonalFlyer(flyerParts)
      .then((canvas) => canvasToPngBlob(canvas))
      .then((blob) => {
        if (!alive) return;
        setState((prev) => {
          if (prev.url) URL.revokeObjectURL(prev.url);
          return { key, url: URL.createObjectURL(blob), blob, failed: false };
        });
      })
      .catch(() => { if (alive) setState({ key, url: '', blob: null, failed: true }); });
    return () => { alive = false; };
  }, [key]);

  return { parts, ...state, ready: state.key === key && Boolean(state.blob) };
}

function PersonalFlyerPreview({ parts }) {
  // Shown while the picture is being drawn, and if a phone can't draw it.
  return (
    <div className="ig-gs-pflyer" style={{ borderColor: parts.brand }}>
      <div className="ig-gs-pflyer-top" style={{ background: parts.background && isSafeGuestImage(parts.background) ? `center / cover no-repeat url("${parts.background}")` : parts.brand }}>
        <GuestHostChip name={parts.host} logo={parts.logo} />
      </div>
      <div className="ig-gs-pflyer-body" style={{ borderTopColor: parts.brand }}>
        <span className="ig-gs-pflyer-kicker" style={{ color: parts.brand }}>Welcome to {parts.title}</span>
        <strong>{parts.firstName},</strong>
        <span className="ig-gs-pflyer-msg">{parts.rest}</span>
        <span className="ig-gs-pflyer-foot"><span>{parts.date}</span><span className="ig-gs-pflyer-brand">Powered by <img src="/ingather-logo.png" alt="Ingather" /></span></span>
      </div>
    </div>
  );
}

function FullScreenViewer({ title, subtitle, onClose, children }) {
  const closeRef = useRef(null);
  useEffect(() => {
    const opener = document.activeElement;
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
      if (opener && typeof opener.focus === 'function') opener.focus();
    };
  }, [onClose]);
  return (
    <div className="ig-gs-viewer" role="dialog" aria-modal="true" aria-label={title}>
      <div className="ig-gs-viewer-inner">
        <div className="ig-gs-viewer-head">
          <span><strong>{title}</strong>{subtitle && <span>{subtitle}</span>}</span>
          <button type="button" ref={closeRef} className="ig-gs-viewer-close" aria-label="Close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const ViewerIcon = {
  download: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>,
  share: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>,
  link: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" /></svg>,
  whatsapp: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.7 11.8 11.8 0 004.5 4c1.7.7 2.3.8 3.2.6a2.6 2.6 0 001.7-1.2 2.1 2.1 0 00.1-1.2c0-.1-.2-.2-.4-.3z" /></svg>
};

function ShareWithFriend({ shareUrl, title, toast }) {
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${title ? `${title}: ` : ''}${shareUrl}`)}`;
  return (
    <div className="ig-gs-viewer-share">
      <span>Share this event with a friend</span>
      <div>
        <a href={whatsapp} target="_blank" rel="noopener noreferrer">{ViewerIcon.whatsapp}WhatsApp</a>
        <button type="button" onClick={() => copyLinkWithToast(shareUrl, toast)}>{ViewerIcon.link}Copy link</button>
      </div>
    </div>
  );
}

function PersonalFlyerSection({ programData, programId, attendeeName, personalizedMessage, toast, standalone = false }) {
  const flyer = usePersonalFlyer(programData, attendeeName, personalizedMessage, true);
  const [open, setOpen] = useState(false);
  const { parts } = flyer;
  const shareUrl = getEventDetailsUrl(programId || programData.id);
  const fileName = createPersonalizedFlyerFileName(parts.firstName, parts.title);

  const save = () => {
    if (flyer.blob) downloadBlobFile(flyer.blob, fileName);
    else toast?.error('Your flyer is still being made. Try again in a moment.');
  };
  const share = () => shareWithFallback({
    file: flyer.blob ? new File([flyer.blob], fileName, { type: 'image/png' }) : null,
    title: 'My welcome flyer',
    text: `${parts.message} - ${parts.title}`,
    url: shareUrl,
    toast
  });

  const picture = flyer.url
    ? <img className="ig-gs-pflyer-img" src={flyer.url} alt={`Welcome flyer for ${parts.firstName}`} />
    : <PersonalFlyerPreview parts={parts} />;

  return (
    <section className="ig-gs-after" aria-label="Your welcome flyer">
      <div className="ig-gs-section-head"><strong>Made for you</strong><span>{standalone ? 'Welcome flyer' : 'Personal welcome flyer'}</span></div>
      <button type="button" className="ig-gs-pflyer-open" onClick={() => setOpen(true)} aria-label="Open your welcome flyer">{picture}</button>
      <div className="ig-gs-row">
        <button type="button" className="ig-gs-btn" style={{ background: parts.brand, color: parts.buttonText }} onClick={save} disabled={!flyer.blob}>{ViewerIcon.download}{flyer.blob ? 'Save my flyer' : 'Making your flyer…'}</button>
        <button type="button" className="ig-gs-btn is-ghost" onClick={share}>{ViewerIcon.share}Post to status</button>
      </div>
      {open && (
        <FullScreenViewer title="Your welcome flyer" subtitle={`Made for you by ${parts.host}`} onClose={() => setOpen(false)}>
          <div className="ig-gs-viewer-figure">{picture}</div>
          <div className="ig-gs-row">
            <button type="button" className="ig-gs-btn" onClick={save} disabled={!flyer.blob}>{ViewerIcon.download}Save image</button>
            <button type="button" className="ig-gs-btn is-light" onClick={share}>{ViewerIcon.share}Share</button>
          </div>
          <ShareWithFriend shareUrl={shareUrl} title={parts.title} toast={toast} />
        </FullScreenViewer>
      )}
    </section>
  );
}

function EventFlyerSection({ programData, programId, toast, heading = true }) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!programData?.flyerUrl || failed) return null;
  const shareUrl = getEventDetailsUrl(programId || programData.id);
  const fileName = `${sanitizeDownloadPart(programData.title, 'event')}-flyer.${/\.png(\?|$)/i.test(programData.flyerUrl) ? 'png' : 'jpg'}`;

  const save = async () => {
    try {
      const response = await fetch(programData.flyerUrl, { mode: 'cors' });
      if (!response.ok) throw new Error('download failed');
      downloadBlobFile(await response.blob(), fileName);
    } catch (error) {
      window.open(programData.flyerUrl, '_blank', 'noopener,noreferrer');
    }
  };
  const share = () => shareWithFallback({
    title: programData.title || 'Event',
    text: `Join me at ${programData.title || 'this event'}`,
    url: shareUrl,
    toast
  });

  return (
    <section className="ig-gs-after" aria-label="Event flyer">
      {heading && <div className="ig-gs-section-head"><strong>Event flyer</strong><span>From {programData.churchName || 'the host'}</span></div>}
      <button type="button" className="ig-gs-flyer-open" onClick={() => setOpen(true)} aria-label="Open the event flyer">
        <img src={programData.flyerUrl} alt={`${programData.title || 'Event'} flyer`} onError={() => setFailed(true)} />
      </button>
      <div className="ig-gs-row">
        <button type="button" className="ig-gs-btn" onClick={save}>{ViewerIcon.download}Save flyer</button>
        <button type="button" className="ig-gs-btn is-ghost" onClick={share}>{ViewerIcon.share}Share</button>
      </div>
      {open && (
        <FullScreenViewer title={programData.title || 'Event flyer'} subtitle={guestWhen(programData)} onClose={() => setOpen(false)}>
          <div className="ig-gs-viewer-figure is-flyer"><img src={programData.flyerUrl} alt={`${programData.title || 'Event'} flyer`} /></div>
          <div className="ig-gs-row">
            <button type="button" className="ig-gs-btn" onClick={save}>{ViewerIcon.download}Save image</button>
            <button type="button" className="ig-gs-btn is-light" onClick={share}>{ViewerIcon.share}Share</button>
          </div>
          <ShareWithFriend shareUrl={shareUrl} title={programData.title} toast={toast} />
        </FullScreenViewer>
      )}
    </section>
  );
}

const getOrderedSponsors = (sponsors = []) => [...sponsors].sort((first, second) => {
  const a = /headline/i.test(first?.tier || '');
  const b = /headline/i.test(second?.tier || '');
  if (a === b) return 0;
  return a ? -1 : 1;
});

function SponsorCard({ sponsor, onSponsorClick, single = false }) {
  const [imageFailed, setImageFailed] = useState(false);
  const flyerUrl = sponsor?.flyerUrl || sponsor?.flyer_url || '';
  const open = () => onSponsorClick(sponsor);
  const hasLink = Boolean(sponsor?.ctaLink);
  return (
    <article className={`ig-gs-sponsor${single ? ' is-single' : ''}`}>
      <button type="button" className="ig-gs-sponsor-img" onClick={open} disabled={!hasLink} aria-label={hasLink ? `Open ${sponsor.sponsorName}` : sponsor.sponsorName}>
        {flyerUrl && !imageFailed
          ? <img src={flyerUrl} alt="" onError={() => setImageFailed(true)} loading="lazy" />
          : <span>{sponsor.sponsorName}</span>}
        {sponsor.boothText && <em>{sponsor.boothText}</em>}
      </button>
      <span className="ig-gs-sponsor-name">
        <span aria-hidden="true">{guestInitials(sponsor.sponsorName)}</span>
        <span><strong>{sponsor.sponsorName}</strong>{sponsor.tier && <span>{sponsor.tier}</span>}</span>
      </span>
      {hasLink && <button type="button" className="ig-gs-btn is-ink" onClick={open}>{sponsor.ctaText || 'Learn more'}</button>}
    </article>
  );
}

function SponsorsSection({ placement, onSponsorClick }) {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);
  const sponsors = placement?.mode === 'distribution'
    ? (placement.sponsor ? [placement.sponsor] : [])
    : getOrderedSponsors(placement?.sponsors || []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || sponsors.length < 2) return undefined;
    const onScroll = () => {
      const cards = Array.from(track.children);
      const center = track.scrollLeft + track.clientWidth / 2;
      let best = 0;
      let bestDistance = Infinity;
      cards.forEach((card, index) => {
        const distance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center);
        if (distance < bestDistance) { bestDistance = distance; best = index; }
      });
      setActive(best);
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => track.removeEventListener('scroll', onScroll);
  }, [sponsors.length]);

  if (sponsors.length === 0) return null;
  const single = sponsors.length === 1;
  const scrollTo = (index) => {
    const card = trackRef.current?.children?.[index];
    if (card && trackRef.current) trackRef.current.scrollTo({ left: card.offsetLeft - trackRef.current.offsetLeft, behavior: 'smooth' });
    setActive(index);
  };

  return (
    <section className="ig-gs-after" aria-label={single ? 'Event sponsor' : 'Event sponsors'}>
      <div className="ig-gs-section-head"><strong>{single ? 'From our sponsor' : "Today's sponsors"}</strong>{!single && <span>Swipe for more</span>}</div>
      <div className={`ig-gs-sponsors${single ? ' is-single' : ''}`} ref={trackRef}>
        {sponsors.map((sponsor) => <SponsorCard key={sponsor.id} sponsor={sponsor} onSponsorClick={onSponsorClick} single={single} />)}
      </div>
      {!single && (
        <div className="ig-gs-dots">
          {sponsors.map((sponsor, index) => (
            <button key={sponsor.id} type="button" className={index === active ? 'is-on' : ''} aria-label={`Show sponsor ${index + 1}`} aria-current={index === active ? 'true' : undefined} onClick={() => scrollTo(index)} />
          ))}
        </div>
      )}
    </section>
  );
}

function GuestMiniHead({ programData }) {
  const [failed, setFailed] = useState(false);
  const flyer = isSafeGuestImage(programData?.flyerUrl) && !failed ? programData.flyerUrl : null;
  return (
    <header className="ig-gs-mini">
      {flyer ? <img src={flyer} alt="" onError={() => setFailed(true)} /> : <span className="ig-gs-mini-thumb" aria-hidden="true">{guestInitials(programData?.title)}</span>}
      <span><strong>{programData?.title}</strong><span>{programData?.churchName}</span></span>
    </header>
  );
}

function AfterShell({ programData, children }) {
  return (
    <div className="ig-gs">
      <div className="ig-gs-wrap">
        {programData && <GuestMiniHead programData={programData} />}
        <main className="ig-gs-main">{children}</main>
        <GuestPowered />
      </div>
    </div>
  );
}

function ScanPage() {
  const { programId } = useParams();
  const toast = useToast();
  const { template } = useEventTemplate();
  const detailsOnly = new URLSearchParams(window.location.search).get('details') === '1';


  // ADD THESE NEW ONES:
  const [showGenderForm, setShowGenderForm] = useState(false);
  const [gender, setGender] = useState('');
  const [isFirstTimer, setIsFirstTimer] = useState(false);
  const [submittingGender, setSubmittingGender] = useState(false);

  const hasScannedRef = useRef(false);
  const deviceFingerprintRef = useRef('');
  const scanSessionIdRef = useRef('');
  const scanSessionTokenRef = useRef('');
  // Stops a second tap sending the same check-in twice while the first is still on its way.
  const sendingRef = useRef(false);
  // Set once this visit's guest is saved, so a late or repeated reply can't change the screen.
  const checkedInRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [alreadyScanned, setAlreadyScanned] = useState(false);
  const [programData, setProgramData] = useState(null);
  const [showFastTrackLookup, setShowFastTrackLookup] = useState(false);
  const [fastTrackEmail, setFastTrackEmail] = useState('');
  const [fastTrackError, setFastTrackError] = useState('');
  const [submittingFastTrack, setSubmittingFastTrack] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [personalizedMessage, setPersonalizedMessage] = useState('');
  const [sponsorPlacement, setSponsorPlacement] = useState(null);
  const [showProxyPrompt, setShowProxyPrompt] = useState(false);
  const [showProxyForm, setShowProxyForm] = useState(false);
  const [proxyCount, setProxyCount] = useState(0);
  const [pendingResult, setPendingResult] = useState(null);
  const [proxyFormData, setProxyFormData] = useState({
    fullName: '',
    emailAddress: '',
    school: '',
    linkUrl: '',
    textareaResponse: '',
    address: '',
    firstTimer: false,
    phoneNumber: '',
    department: '',
    fellowship: '',
    age: '',
    sex: '',
    customResponses: {}
  });
  const [proxyFormErrors, setProxyFormErrors] = useState({});
  const [submittingProxy, setSubmittingProxy] = useState(false);


  // Form data
  const [formData, setFormData] = useState({
    fullName: '',
    emailAddress: '',
    school: '',
    linkUrl: '',
    textareaResponse: '',
    address: '',
    firstTimer: false,
    phoneNumber: '',
    department: '',
    fellowship: '',
    age: '',
    sex: ''
  });

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  // 'notfound' when the link is wrong, 'network' when the page couldn't reach Ingather.
  const [loadError, setLoadError] = useState(null);
  const [checkedInAt, setCheckedInAt] = useState(null);
  const formRef = useRef(null);
  const proxyFormRef = useRef(null);
  const formErrorCount = Object.values(formErrors).filter(Boolean).length;
  const proxyErrorCount = Object.values(proxyFormErrors).filter(Boolean).length;

  useEffect(() => {
    if (formErrorCount > 0) focusFirstGuestError(formRef.current);
  }, [formErrorCount]);

  useEffect(() => {
    if (proxyErrorCount > 0) focusFirstGuestError(proxyFormRef.current);
  }, [proxyErrorCount]);

  // Each new screen after check-in starts at the top.
  useEffect(() => {
    if (typeof window.scrollTo === 'function') window.scrollTo(0, 0);
  }, [result, showProxyPrompt, showProxyForm]);

  // A page restored by the Back button still holds the old visit's scan. Reload so every visit gets its own.
  useEffect(() => {
    const onPageShow = (event) => { if (event.persisted) window.location.reload(); };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  // Initialize on component mount
  // REPLACE YOUR useEffect WITH THIS:
  useEffect(() => {
    // If we already scanned, stop immediately
    if (hasScannedRef.current) return;

    // Mark as scanned so it doesn't run again
    hasScannedRef.current = true;

    console.log('Initializing scan page for program:', programId);
    if (detailsOnly) {
      loadProgramDetailsOnly();
    } else {
      initializeScan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, detailsOnly]);
  //   useEffect(() => {
  // console.log('Initializing scan page for program:', programId);
  // initializeScan();
  //   }, [programId]);



  //   const initializeScan = () => {
  // try {
  // Create simple device fingerprint
  // We added 'window.' before 'screen' to satisfy the computer
  // const fingerprint = `${navigator.userAgent}-${navigator.language}-${window.screen.width}x${window.screen.height}`;
  //   console.log('Device fingerprint:', fingerprint);

  const initializeScan = async () => {
    setLoadError(null);
    scanSessionIdRef.current = '';
    scanSessionTokenRef.current = '';
    checkedInRef.current = false;
    try {
      setPersonalizedMessage('');
      const [fingerprint, programData] = await Promise.all([
        getDeviceFingerprint(),
        getProgramInfo(programId)
      ]);

      deviceFingerprintRef.current = fingerprint;
      console.log('Device fingerprint:', fingerprint);
      console.log('Program data loaded:', programData);

      if (!programData.isActive) {
        setProgramData(programData);
        setLoading(false);
        return;
      }

      setProgramData(programData);

      // Submit scan to backend
      try {
        const scanResult = await submitScan(programId, fingerprint, null);
        scanSessionIdRef.current = scanResult.scanSessionId || '';
        scanSessionTokenRef.current = scanResult.scanSessionToken || '';
        setSponsorPlacement(scanResult.sponsorPlacement || null);
        console.log('Scan recorded successfully:', scanResult);

        // Scan successful - decide what to show based on tracking mode
        if (programData.trackingMode === 'count-only') {
          // Count only - show gender selection form
          setShowGenderForm(true);
          setLoading(false);
        } else if (programData.trackingMode === 'collect-data') {
          if (programData.fastTrackRsvpEnabled) {
            setShowFastTrackLookup(true);
          } else {
            // Collect data - show the form
            setShowForm(true);
          }
          setLoading(false);
        }
      } catch (scanError) {
        console.error('Scan error:', scanError);

        // Check if it's because device already scanned
        if (scanError.response?.status === 400 &&
          (scanError.response?.data?.alreadyScanned ||
            scanError.response?.data?.error?.includes('already scanned'))) {
          // Device has already scanned this program
          setAlreadyScanned(true);
          playErrorSound();
        } else if (/no longer active/i.test(scanError.response?.data?.error || '')) {
          // The organizer ended the event between loading the page and scanning.
          setProgramData((prev) => (prev ? { ...prev, isActive: false } : prev));
        } else {
          setLoadError('network');
        }
        setLoading(false); // Turn off loading on error
      }

    } catch (error) {
      console.error('Error in initializeScan:', error);
      setLoadError(error.response?.status === 404 ? 'notfound' : 'network');
      setLoading(false);
    }
  };

  const retryCheckIn = () => {
    setLoadError(null);
    setLoading(true);
    initializeScan();
  };

  const loadProgramDetailsOnly = async () => {
    try {
      const data = await getProgramInfo(programId);
      setProgramData(data);
    } catch (error) {
      console.error('Error loading event details:', error);
      toast.error('Unable to load event details.');
    } finally {
      setLoading(false);
    }
  };


  const handleGenderSubmit = async () => {
    if (!gender) {
      toast.warning('Please select your gender');
      return;
    }

    if (sendingRef.current) return;
    sendingRef.current = true;
    setSubmittingGender(true);

    try {
      const fingerprint = deviceFingerprintRef.current || await getDeviceFingerprint();
      deviceFingerprintRef.current = fingerprint;
      await updateScanData(programId, fingerprint, gender, isFirstTimer, scanSessionTokenRef.current, scanSessionIdRef.current);
      console.log('Gender data updated successfully');

      setSubmittingGender(false);
      setShowGenderForm(false);
      setCheckedInAt(new Date());

      if (isFirstTimer) {
        setResult('first-timer-message');
      } else {
        setResult('count-only-success');
      }
      playSuccessSound();
    } catch (error) {
      console.error('Gender submit error:', error);
      toast.error(error.response ? (error.response.data?.error || 'We could not check you in. Please try again.') : 'No internet connection. Check your data or Wi-Fi, then try again.');
      setSubmittingGender(false);
    } finally {
      sendingRef.current = false;
      playErrorSound();
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });

    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };

  const handleCustomResponseChange = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      customResponses: {
        ...(prev.customResponses || {}),
        [fieldId]: value
      }
    }));
    if (formErrors[fieldId]) {
      setFormErrors(prev => ({ ...prev, [fieldId]: '' }));
    }
  };

  const handleProxyCustomResponseChange = (fieldId, value) => {
    setProxyFormData(prev => ({
      ...prev,
      customResponses: {
        ...(prev.customResponses || {}),
        [fieldId]: value
      }
    }));
    if (proxyFormErrors[fieldId]) {
      setProxyFormErrors(prev => ({ ...prev, [fieldId]: '' }));
    }
  };

  const validateCustomResponses = (values = {}) => {
    const errors = {};
    (programData?.customFormSchema || []).forEach((field) => {
      const value = values[field.id];
      if (field.type === 'checkbox') {
        if (field.required && (!Array.isArray(value) || value.length === 0)) {
          errors[field.id] = `${field.label} is required`;
        }
        return;
      }
      if (field.required && !String(value || '').trim()) {
        errors[field.id] = `${field.label} is required`;
      }
    });
    return errors;
  };

  const validateForm = () => {
    const errors = {};

    if (programData.dataFields.fullName && !formData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }

    if (programData.dataFields.emailAddress) {
      if (!formData.emailAddress.trim()) {
        errors.emailAddress = 'Email address is required';
      } else if (!isValidCollectedEmail(formData.emailAddress)) {
        errors.emailAddress = 'Enter a valid email address';
      }
    }

    if (programData.dataFields.school && !formData.school.trim()) {
      errors.school = 'School is required';
    }

    if (programData.dataFields.link) {
      if (!formData.linkUrl.trim()) {
        errors.linkUrl = 'Link is required';
      } else if (!isValidHttpUrl(formData.linkUrl)) {
        errors.linkUrl = 'Enter a valid link starting with http:// or https://';
      }
    }

    if (programData.dataFields.textarea && !formData.textareaResponse.trim()) {
      errors.textareaResponse = 'Response is required';
    }

    if (programData.dataFields.phoneNumber && !formData.phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required';
    }

    if (programData.dataFields.address && !formData.address.trim()) {
      errors.address = 'Address is required';
    }

    if (programData.dataFields.department && !formData.department.trim()) {
      errors.department = 'Department is required';
    }

    if (programData.dataFields.sex && !formData.sex) {
      errors.sex = 'Please select your gender';
    }

    Object.assign(errors, validateCustomResponses(formData.customResponses || {}));

    return errors;
  };

  const getNextResult = (submittedFormData, response) => {
    if (submittedFormData.firstTimer && response.isWinner) return 'first-timer-winner';
    if (submittedFormData.firstTimer) return 'first-timer-message';
    if (response.giftingEnabled) return response.isWinner ? 'winner' : 'no-win';
    return 'no-gifting';
  };

  const continueAfterMainCheckIn = (submittedFormData, response) => {
    const nextResult = getNextResult(submittedFormData, response);
    setCheckedInAt(new Date());

    if (programData?.proxyCheckinEnabled) {
      setPendingResult(nextResult);
      setProxyCount(0);
      setShowProxyPrompt(true);
    } else {
      setResult(nextResult);
    }
  };

  const revealWalkInForm = () => {
    setShowFastTrackLookup(false);
    setShowForm(true);
    setFastTrackError('');
    setFormData(prev => ({
      ...prev,
      emailAddress: fastTrackEmail.trim().toLowerCase()
    }));
  };

  const handleFastTrackSubmit = async (event) => {
    event.preventDefault();
    const email = fastTrackEmail.trim().toLowerCase();

    if (!email) {
      setFastTrackError('Email address is required');
      return;
    }

    if (!isValidCollectedEmail(email)) {
      setFastTrackError('Enter a valid email address');
      return;
    }

    if (sendingRef.current || checkedInRef.current) return;
    sendingRef.current = true;
    setSubmittingFastTrack(true);
    setFastTrackError('');

    try {
      const fingerprint = deviceFingerprintRef.current || await getDeviceFingerprint();
      deviceFingerprintRef.current = fingerprint;
      const response = await submitFastTrackRsvp(programId, fingerprint, email, scanSessionTokenRef.current, scanSessionIdRef.current);
      const attendee = response.attendee || {};
      const attendeeFormData = {
        fullName: attendee.fullName || '',
        emailAddress: attendee.emailAddress || email,
        school: attendee.school || '',
        address: attendee.address || '',
        firstTimer: Boolean(attendee.firstTimer),
        phoneNumber: attendee.phoneNumber || '',
        department: attendee.department || '',
        fellowship: attendee.fellowship || '',
        age: attendee.age || '',
        sex: attendee.sex || '',
        customResponses: attendee.customResponses || {}
      };

      setFormData(attendeeFormData);
      setSponsorPlacement(response.sponsorPlacement || sponsorPlacement);
      setPersonalizedMessage(response.personalizedMessage || '');
      checkedInRef.current = true;
      setShowFastTrackLookup(false);
      continueAfterMainCheckIn(attendeeFormData, response);
    } catch (error) {
      const payload = error.response?.data || {};
      if (payload.fastTrackNotFound) {
        toast.info('No RSVP found for that email. Please complete the quick check-in form.');
        revealWalkInForm();
      } else {
        setFastTrackError(payload.error || 'Unable to complete fast-track check-in');
      }
    } finally {
      sendingRef.current = false;
      setSubmittingFastTrack(false);
    }
  };

  const emptyProxyFormData = () => ({
    fullName: '',
    emailAddress: '',
    school: '',
    linkUrl: '',
    textareaResponse: '',
    address: '',
    firstTimer: false,
    phoneNumber: '',
    department: '',
    fellowship: '',
    age: '',
    sex: '',
    customResponses: {}
  });

  const handleProxyChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProxyFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (proxyFormErrors[name]) {
      setProxyFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateProxyForm = () => {
    const errors = {};
    const dataFields = programData?.dataFields || {};

    if (dataFields.fullName && !proxyFormData.fullName.trim()) errors.fullName = 'Full name is required';
    if (dataFields.emailAddress) {
      if (!proxyFormData.emailAddress.trim()) errors.emailAddress = 'Email address is required';
      else if (!isValidCollectedEmail(proxyFormData.emailAddress)) errors.emailAddress = 'Enter a valid email address';
    }
    if (dataFields.school && !proxyFormData.school.trim()) errors.school = 'School is required';
    if (dataFields.link) {
      if (!proxyFormData.linkUrl.trim()) errors.linkUrl = 'Link is required';
      else if (!isValidHttpUrl(proxyFormData.linkUrl)) errors.linkUrl = 'Enter a valid link starting with http:// or https://';
    }
    if (dataFields.textarea && !proxyFormData.textareaResponse.trim()) errors.textareaResponse = 'Response is required';
    if (dataFields.phoneNumber && !proxyFormData.phoneNumber.trim()) errors.phoneNumber = 'Phone number is required';
    if (dataFields.address && !proxyFormData.address.trim()) errors.address = 'Address is required';
    if (dataFields.department && !proxyFormData.department.trim()) errors.department = 'Department is required';
    if (dataFields.sex && !proxyFormData.sex) errors.sex = 'Please select gender';

    Object.assign(errors, validateCustomResponses(proxyFormData.customResponses || {}));

    return errors;
  };

  const continueToPendingResult = () => {
    setShowProxyPrompt(false);
    setShowProxyForm(false);
    setResult(pendingResult || 'no-gifting');
    setPendingResult(null);
  };

  const startProxyForm = () => {
    setProxyFormData(emptyProxyFormData());
    setProxyFormErrors({});
    setShowProxyPrompt(false);
    setShowProxyForm(true);
  };

  const handleProxySubmit = async (e) => {
    e.preventDefault();

    const errors = validateProxyForm();
    if (Object.keys(errors).length > 0) {
      setProxyFormErrors(errors);
      return;
    }

    setSubmittingProxy(true);

    try {
      const fingerprint = deviceFingerprintRef.current || await getDeviceFingerprint();
      deviceFingerprintRef.current = fingerprint;

      const response = await submitProxyAttendee(programId, fingerprint, proxyFormData);
      const nextCount = response.proxyCount || proxyCount + 1;
      const addedName = proxyFormData.fullName ? getFirstName(proxyFormData.fullName) : 'Your guest';
      toast.success(`${addedName} is checked in.`);
      setProxyCount(nextCount);
      setProxyFormData(emptyProxyFormData());
      setProxyFormErrors({});
      setSubmittingProxy(false);
      setShowProxyForm(false);

      if (nextCount >= 3) {
        continueToPendingResult();
      } else {
        setShowProxyPrompt(true);
      }
    } catch (error) {
      const serverErrors = error.response?.data?.errors;
      if (serverErrors) setProxyFormErrors(serverErrors);
      toast.error(error.response?.data?.error || 'Failed to add attendee. Please try again.');
      setSubmittingProxy(false);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateForm();

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (sendingRef.current || checkedInRef.current) return;
    sendingRef.current = true;
    setSubmitting(true);

    try {
      const fingerprint = deviceFingerprintRef.current || await getDeviceFingerprint();
      deviceFingerprintRef.current = fingerprint;

      // Submit only the form data (scan was already recorded)
      const response = await submitFormData(programId, fingerprint, formData, scanSessionTokenRef.current, scanSessionIdRef.current);
      setSponsorPlacement(response.sponsorPlacement || sponsorPlacement);
      setPersonalizedMessage(response.personalizedMessage || '');
      console.log('Form submitted successfully:', response);

      checkedInRef.current = true;
      continueAfterMainCheckIn(formData, response);

      setSubmitting(false);
      setShowForm(false);
    } catch (error) {
      console.error('Submit error:', error);
      const payload = error.response?.data || {};
      setSubmitting(false);
      if (checkedInRef.current) return;
      // The server already has this visit's guest saved, so they are checked in. Show their success screen.
      if (/already submitted/i.test(payload.error || '')) {
        checkedInRef.current = true;
        setShowForm(false);
        continueAfterMainCheckIn(formData, {});
        return;
      }
      if (payload.errors && Object.keys(payload.errors).length > 0) {
        setFormErrors(payload.errors);
        return;
      }
      toast.error(error.response ? (payload.error || 'We could not check you in. Please try again.') : 'No internet connection. Check your data or Wi-Fi, then tap Complete check-in again.');
    } finally {
      sendingRef.current = false;
    }
  };

  const handleSponsorClick = async (sponsor) => {
    if (!sponsor?.ctaLink) return;

    try {
      const fingerprint = deviceFingerprintRef.current || await getDeviceFingerprint();
      deviceFingerprintRef.current = fingerprint;
      await trackSponsorClick(sponsor.id, fingerprint);
    } catch (error) {
      console.error('Sponsor click tracking failed:', error);
    } finally {
      window.open(sponsor.ctaLink, '_blank', 'noopener,noreferrer');
    }
  };

  const eventWord = (template?.event?.singular || 'Event').toLowerCase();
  const eventWordPlural = (template?.event?.plural || 'Events').toLowerCase();

  // LOADING
  if (loading) {
    return (
      <div className="ig-gs">
        <div className="ig-gs-wrap is-center">
          <main className="ig-gs-main ig-gs-loading" aria-busy="true">
            <span className="ig-gs-spinner" aria-hidden="true" />
            <strong>{detailsOnly ? `Loading ${eventWord} details…` : 'Checking you in…'}</strong>
            {!detailsOnly && <span>This takes a second or two.</span>}
          </main>
          <GuestPowered />
        </div>
      </div>
    );
  }

  if (loadError === 'notfound') {
    return (
      <div className="ig-gs">
        <div className="ig-gs-wrap is-center">
          <main className="ig-gs-main">
            <div className="ig-gs-qrart" aria-hidden="true"><span>QR</span></div>
            <GuestIntro tag="Check-in" tagText="This check-in link is not active" title="This check-in link isn't" highlight="working" lead="Scan the QR code at the entrance again, or ask an usher to check you in." />
            <div className="ig-gs-row">
              <a className="ig-gs-btn" href="/discover">Find other {eventWordPlural}</a>
              <a className="ig-gs-btn is-ghost" href="/">Back to home</a>
            </div>
          </main>
          <GuestPowered />
        </div>
      </div>
    );
  }

  if (loadError === 'network' && !alreadyScanned) {
    return (
      <GuestShell programData={programData} center>
        <GuestStatus
          icon={GuestIcon.wifi}
          tone="grey"
          title="We couldn't reach Ingather"
          text="Check your mobile data or Wi-Fi, then try again. If it keeps happening, ask an usher to check you in."
        >
          <button type="button" className="ig-gs-btn" onClick={retryCheckIn}>Try again</button>
        </GuestStatus>
      </GuestShell>
    );
  }

  if (detailsOnly) {
    if (!programData) {
      return (
        <GuestShell center>
          <GuestStatus icon={GuestIcon.wifi} tone="grey" title={`We couldn't load this ${eventWord}`} text="Check your internet connection and open the link again." />
        </GuestShell>
      );
    }
    const shareUrl = getEventDetailsUrl(programId);
    return (
      <GuestShell programData={programData}>
        {programData.flyerUrl ? (
          <EventFlyerSection programData={programData} programId={programId} toast={toast} heading={false} />
        ) : (
          <GuestStatus icon={GuestIcon.closed} tone="grey" title={programData.title} text={[guestWhen(programData), programData.churchName ? `Hosted by ${programData.churchName}` : ''].filter(Boolean).join('. ')} />
        )}
        <div className="ig-gs-share-card"><ShareWithFriend shareUrl={shareUrl} title={programData.title} toast={toast} /></div>
      </GuestShell>
    );
  }

  // ALREADY SCANNED
  if (alreadyScanned) {
    const canShowDetails = Boolean(programData?.flyerUrl);
    return (
      <GuestShell programData={programData} center>
        <GuestStatus
          icon={GuestIcon.check}
          title="You're already checked in"
          text={`This phone has already been used to check in for this ${eventWord}. Each phone checks in once.`}
          callout="Checking in for someone else, or think this is a mistake? Speak to an usher at the entrance."
        >
        </GuestStatus>
        {canShowDetails && <EventFlyerSection programData={programData} programId={programId} toast={toast} />}
      </GuestShell>
    );
  }

  // GENDER SELECTION FORM (Count-Only Mode)
  if (showGenderForm && programData) {
    return (
      <GuestShell programData={programData}>
        <GuestIntro tag="Check-in" tagText="Two taps and you're in" title="Quick" highlight="check-in" lead="Your scan is recorded. Two quick details help the organizer plan." />
        <section className="ig-gs-card">
          <GuestGender
            id="ig-gs-count-gender"
            big
            value={gender}
            onChange={setGender}
            options={[['male', 'Male', GuestIcon.male], ['female', 'Female', GuestIcon.female]]}
          />
          <GuestCheckRow id="ig-gs-count-first" title="I'm a first-timer" checked={isFirstTimer} onChange={setIsFirstTimer} />
          <button type="button" className="ig-gs-btn" onClick={handleGenderSubmit} disabled={submittingGender || !gender}>
            {submittingGender ? 'Checking you in…' : 'Complete check-in'}
          </button>
          {!gender && <p className="ig-gs-hint-line">Choose Male or Female to continue.</p>}
          <GuestFinePrint host={programData.churchName} />
        </section>
      </GuestShell>
    );
  }

  if (showFastTrackLookup && programData && !result) {
    return (
      <GuestShell programData={programData}>
        <GuestIntro tag="Fast-track" tagText="For guests who RSVP'd" title="Already" highlight="registered?" lead="Enter the email you used to RSVP and you're checked in instantly. No form to fill." />
        <form className="ig-gs-card" onSubmit={handleFastTrackSubmit} noValidate>
          <GuestInput
            id="fastTrackEmail"
            label="Email address"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            value={fastTrackEmail}
            onChange={(event) => {
              setFastTrackEmail(event.target.value);
              if (fastTrackError) setFastTrackError('');
            }}
            placeholder="name@example.com"
            error={fastTrackError}
          />
          <button type="submit" className="ig-gs-btn" disabled={submittingFastTrack}>
            {submittingFastTrack ? 'Finding your RSVP…' : 'Check in fast'}
          </button>
          <button type="button" className="ig-gs-btn is-ghost" onClick={revealWalkInForm} disabled={submittingFastTrack}>I didn't RSVP</button>
          <GuestFinePrint host={programData.churchName} />
        </form>
        <div className="ig-gs-note">{GuestIcon.qr}<span>Have your QR pass from the RSVP email? Show it to an usher at the door instead.</span></div>
      </GuestShell>
    );
  }

  // SHOW FORM
  if (showForm && programData && !result) {
    const fields = programData.dataFields || {};
    const text = (name, label, extra = {}) => (
      <GuestInput
        id={name}
        name={name}
        label={label}
        value={formData[name] || ''}
        onChange={handleChange}
        error={formErrors[name]}
        {...extra}
      />
    );
    return (
      <GuestShell programData={programData}>
        <GuestIntro tag="Check-in" tagText="Takes about a minute" title="Welcome! Tell us" highlight="who you are" />
        {programData.giftingEnabled && (
          <div className="ig-gs-gift"><span>{GuestIcon.gift}</span>{template.scan.giftHelper}</div>
        )}
        <form className="ig-gs-card" onSubmit={handleSubmit} noValidate ref={formRef}>
          {fields.fullName && text('fullName', 'Full name', { type: 'text', autoComplete: 'name', placeholder: 'John Doe', maxLength: 255 })}
          {fields.emailAddress && text('emailAddress', 'Email address', { type: 'email', inputMode: 'email', autoComplete: 'email', autoCapitalize: 'none', placeholder: 'name@example.com', maxLength: 255 })}
          {fields.phoneNumber && text('phoneNumber', 'Phone number', { type: 'tel', inputMode: 'tel', autoComplete: 'tel', placeholder: '+234 800 000 0000', maxLength: 40 })}
          {fields.sex && (
            <GuestGender
              id="sex"
              value={formData.sex}
              onChange={(value) => handleChange({ target: { name: 'sex', value, type: 'radio' } })}
              error={formErrors.sex}
              options={[['Male', 'Male'], ['Female', 'Female']]}
            />
          )}
          {fields.school && text('school', 'School', { type: 'text', placeholder: 'Your school', maxLength: 255 })}
          {fields.department && text('department', 'Department', { type: 'text', placeholder: 'Your department or unit', maxLength: 255 })}
          {fields.address && text('address', 'Address', { type: 'text', autoComplete: 'street-address', placeholder: 'Where you are coming from', maxLength: 500 })}
          {fields.link && text('linkUrl', 'Link', { type: 'url', inputMode: 'url', autoCapitalize: 'none', placeholder: 'https://', maxLength: 500 })}
          {fields.textarea && (
            <GuestTextarea
              id="textareaResponse"
              name="textareaResponse"
              label={programData.dataFieldConfig?.textareaLabel || 'Additional Response'}
              value={formData.textareaResponse}
              onChange={handleChange}
              placeholder="Type your answer"
              rows={3}
              maxLength={5000}
              error={formErrors.textareaResponse}
            />
          )}
          <GuestQuestions
            fields={programData.customFormSchema || []}
            values={formData.customResponses || {}}
            errors={formErrors}
            onChange={handleCustomResponseChange}
          />
          {fields.fellowship && text('fellowship', 'Group', { type: 'text', placeholder: 'Your group or community', maxLength: 255, optional: true })}
          {fields.age && text('age', 'Age', { type: 'number', inputMode: 'numeric', placeholder: 'e.g. 24', min: 1, max: 120, optional: true })}
          {fields.firstTimer && (
            <GuestCheckRow
              id="firstTimer"
              title="I'm a first-timer"
              sub={`First time at one of our ${eventWordPlural}`}
              checked={Boolean(formData.firstTimer)}
              onChange={(checked) => handleChange({ target: { name: 'firstTimer', type: 'checkbox', checked } })}
            />
          )}
          {formErrorCount > 0 && (
            <p className="ig-gs-summary" role="alert">{formErrorCount === 1 ? 'One answer needs a look before you can check in.' : `${formErrorCount} answers need a look before you can check in.`}</p>
          )}
          <button type="submit" className="ig-gs-btn" disabled={submitting}>
            {submitting ? 'Checking you in…' : 'Complete check-in'}
          </button>
          <GuestFinePrint host={programData.churchName} />
        </form>
      </GuestShell>
    );
  }

  if (showProxyPrompt && programData && !result) {
    const remaining = Math.max(0, 3 - proxyCount);
    const hostName = getFirstName(formData.fullName);
    return (
      <AfterShell programData={programData}>
        <section className="ig-gs-card ig-gs-status ig-gs-proxy">
          <span className="ig-gs-proxy-avatars" aria-hidden="true"><span>{guestInitials(formData.fullName || 'You').slice(0, 1)}</span><span>+</span></span>
          <span className="ig-gs-proxy-kicker">{proxyCount > 0 ? `${proxyCount === 1 ? 'Guest' : 'Guests'} checked in` : "You're checked in"}</span>
          <h2>{proxyCount > 0 ? 'Anyone else with you?' : 'Checking in someone with you?'}</h2>
          <p>Family or friends without a phone can check in from yours. You can add up to <strong>{remaining} more</strong>.</p>
          <span className="ig-gs-proxy-steps" aria-hidden="true">{[0, 1, 2].map((i) => <span key={i} className={i < proxyCount ? 'is-on' : ''} />)}</span>
          <span className="ig-gs-proxy-count">{proxyCount} of 3 guests added</span>
          <button type="button" className="ig-gs-btn" onClick={startProxyForm}>{proxyCount > 0 ? 'Add another guest' : 'Yes, add a guest'}</button>
          <button type="button" className="ig-gs-btn is-ghost" onClick={continueToPendingResult}>{proxyCount > 0 ? "No, I'm done" : 'No, continue'}</button>
          {hostName && proxyCount === 0 && <span className="ig-gs-proxy-note">Checked in as {formData.fullName}</span>}
        </section>
      </AfterShell>
    );
  }

  if (showProxyForm && programData && !result) {
    const fields = programData.dataFields || {};
    const hostFirst = formData.fullName ? getFirstName(formData.fullName) : '';
    const text = (name, label, extra = {}) => (
      <GuestInput
        id={`proxy-${name}`}
        name={name}
        label={label}
        value={proxyFormData[name] || ''}
        onChange={handleProxyChange}
        error={proxyFormErrors[name]}
        {...extra}
      />
    );
    return (
      <AfterShell programData={programData}>
        <GuestIntro tag={`Guest ${proxyCount + 1} of 3`} tagText={hostFirst ? `Added by ${hostFirst}` : 'Added from your phone'} title="Add your" highlight="guest" lead="Same form you just filled. Enter their details, not yours." />
        {programData.giftingEnabled && (
          <div className="ig-gs-gift"><span>{GuestIcon.gift}</span>Your guest gets their own chance to win the organizer's gift.</div>
        )}
        <form className="ig-gs-card" onSubmit={handleProxySubmit} noValidate ref={proxyFormRef}>
          {fields.fullName && text('fullName', "Guest's full name", { type: 'text', placeholder: 'Their full name', maxLength: 255, autoComplete: 'off' })}
          {fields.emailAddress && text('emailAddress', "Guest's email address", { type: 'email', inputMode: 'email', autoCapitalize: 'none', autoComplete: 'off', placeholder: 'name@example.com', maxLength: 255 })}
          {fields.phoneNumber && text('phoneNumber', "Guest's phone number", { type: 'tel', inputMode: 'tel', autoComplete: 'off', placeholder: '+234 800 000 0000', maxLength: 40 })}
          {fields.sex && (
            <GuestGender
              id="proxy-sex"
              value={proxyFormData.sex}
              onChange={(value) => handleProxyChange({ target: { name: 'sex', value, type: 'radio' } })}
              error={proxyFormErrors.sex}
              options={[['Male', 'Male'], ['Female', 'Female']]}
            />
          )}
          {fields.school && text('school', 'School', { type: 'text', placeholder: 'Their school', maxLength: 255 })}
          {fields.department && text('department', 'Department', { type: 'text', placeholder: 'Their department or unit', maxLength: 255 })}
          {fields.address && text('address', 'Address', { type: 'text', placeholder: 'Where they are coming from', maxLength: 500 })}
          {fields.link && text('linkUrl', 'Link', { type: 'url', inputMode: 'url', autoCapitalize: 'none', placeholder: 'https://', maxLength: 500 })}
          {fields.textarea && (
            <GuestTextarea
              id="proxy-textareaResponse"
              name="textareaResponse"
              label={programData.dataFieldConfig?.textareaLabel || 'Additional Response'}
              value={proxyFormData.textareaResponse}
              onChange={handleProxyChange}
              placeholder="Their answer"
              rows={3}
              maxLength={5000}
              error={proxyFormErrors.textareaResponse}
            />
          )}
          <GuestQuestions
            idPrefix="proxy-q"
            fields={programData.customFormSchema || []}
            values={proxyFormData.customResponses || {}}
            errors={proxyFormErrors}
            onChange={handleProxyCustomResponseChange}
          />
          {fields.fellowship && text('fellowship', 'Group', { type: 'text', placeholder: 'Their group or community', maxLength: 255, optional: true })}
          {fields.age && text('age', 'Age', { type: 'number', inputMode: 'numeric', placeholder: 'e.g. 24', min: 1, max: 120, optional: true })}
          {fields.firstTimer && (
            <GuestCheckRow
              id="proxy-firstTimer"
              title="They're a first-timer"
              sub={`First time at one of our ${eventWordPlural}`}
              checked={Boolean(proxyFormData.firstTimer)}
              onChange={(checked) => handleProxyChange({ target: { name: 'firstTimer', type: 'checkbox', checked } })}
            />
          )}
          {proxyErrorCount > 0 && (
            <p className="ig-gs-summary" role="alert">{proxyErrorCount === 1 ? 'One answer needs a look.' : `${proxyErrorCount} answers need a look.`}</p>
          )}
          <button type="submit" className="ig-gs-btn" disabled={submittingProxy}>{submittingProxy ? 'Checking them in…' : 'Check in guest'}</button>
          <button type="button" className="ig-gs-btn is-text" onClick={() => { setShowProxyForm(false); setProxyFormErrors({}); setShowProxyPrompt(true); }} disabled={submittingProxy}>Cancel</button>
          <p className="ig-gs-fine">Only add someone who has agreed to share these details. They go to {programData.churchName || 'the organizer'}, the event host.</p>
        </form>
      </AfterShell>
    );
  }

  // RESULT SCREENS
  if (result && programData) {
    const firstName = formData.fullName ? getFirstName(formData.fullName) : '';
    const isWinner = result === 'winner' || result === 'first-timer-winner';
    const isFirstTimer = result === 'first-timer-winner' || result === 'first-timer-message';
    const personal = isPersonalizedFlyer(programData);
    const timeText = clockLabel(checkedInAt);

    return (
      <AfterShell programData={programData}>
        {isWinner ? (
          <>
            <section className="ig-gs-winner" aria-live="polite">
              <span className="ig-gs-winner-tag">You're checked in</span>
              <span className="ig-gs-winner-icon" aria-hidden="true">{GuestIcon.gift}</span>
              <h2>{firstName ? `You won a gift, ${firstName}!` : 'You won a gift!'}</h2>
              <p>You were picked at random to receive a gift from the organizer.</p>
            </section>
            <section className="ig-gs-card ig-gs-collect">
              <strong>How to collect it</strong>
              <ol>
                <li><span>1</span>{isFirstTimer ? 'Stay after the event, then go to the ushering stand.' : 'Go to the ushering stand.'}</li>
                <li><span>2</span>Show this screen. Keep it open.</li>
              </ol>
              <div className="ig-gs-collect-row"><span>Checked in</span><strong>{[formData.fullName, timeText].filter(Boolean).join(', ')}</strong></div>
              {isFirstTimer && <span className="ig-gs-pill">First-timer</span>}
            </section>
          </>
        ) : (
          <section className="ig-gs-done" aria-live="polite">
            <span className="ig-gs-done-icon" aria-hidden="true">{GuestIcon.check}</span>
            <span className="ig-gs-done-text">
              <h2>{firstName ? <>You're in,<br />{firstName}</> : "You're checked in"}</h2>
              {timeText && <span>Checked in at {timeText}</span>}
            </span>
            {isFirstTimer && <span className="ig-gs-pill">First-timer</span>}
          </section>
        )}

        {result === 'no-win' && <p className="ig-gs-soft-note">{template.scan.noWin}</p>}
        {result === 'first-timer-message' && <p className="ig-gs-soft-note">Welcome! We're glad you came. Please stay after the {eventWord} so the team can say hello.</p>}

        {personal && (
          <PersonalFlyerSection programData={programData} programId={programId} attendeeName={formData.fullName} personalizedMessage={personalizedMessage} toast={toast} />
        )}
        {!personal && <EventFlyerSection programData={programData} programId={programId} toast={toast} />}
        <SponsorsSection placement={sponsorPlacement} onSponsorClick={handleSponsorClick} />
      </AfterShell>
    );
  }

  // CHECK-IN CLOSED
  return (
    <GuestShell programData={programData} center>
      <GuestStatus
        icon={GuestIcon.closed}
        tone="grey"
        title="Check-in has closed"
        text={`This ${eventWord} may have ended, or the organizer has stopped taking check-ins.`}
      >
        <a className="ig-gs-btn" href="/discover">Find other {eventWordPlural}</a>
      </GuestStatus>
    </GuestShell>
  );
}

export default ScanPage;
