import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getProgramById, getAttendees, getAttendanceData, getProgramDetailBootstrap, getSponsorAnalytics, getDashboardBootstrap, stopProgram as stopProgramAPI, deleteProgram, markWinnerGifted, addManualAttendee, getRsvpScannerLink, updateStrictDeviceFingerprinting } from '../api/programService';
import IgDashShell, { DashIcon, DashDialog, InfoTip as InfoButton } from '../components/IgDashShell';
import { useToast } from '../components/Toast';
import { useEventTemplate } from '../context/EventTemplateContext';
import { formatCustomAnswer } from '../utils/customFields';
import { formatNumber, formatTime, formatTimeRange, fullDate, initialsOf, localToday, parseDateOnly, weekdayShortDate } from '../utils/dashboardFormat';

const QRCodeCanvas = React.lazy(() => (
  import('qrcode.react').then(module => ({ default: module.QRCodeCanvas }))
));

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

const getCustomFieldErrorKey = (fieldId) => `customResponses.${fieldId}`;

const validateCustomFieldResponses = (fields = [], responses = {}) => {
  const errors = {};

  fields.forEach(field => {
    const value = responses[field.id];
    const errorKey = getCustomFieldErrorKey(field.id);

    if (field.required) {
      if (field.type === 'checkbox') {
        if (!Array.isArray(value) || value.length === 0) {
          errors[errorKey] = `${field.label} is required`;
        }
      } else if (!String(value || '').trim()) {
        errors[errorKey] = `${field.label} is required`;
      }
    }

    if (field.type === 'radio' && value && !field.options?.includes(value)) {
      errors[errorKey] = `Select a valid option for ${field.label}`;
    }

    if (field.type === 'checkbox' && Array.isArray(value)) {
      const invalid = value.some(option => !field.options?.includes(option));
      if (invalid) errors[errorKey] = `Select valid options for ${field.label}`;
    }
  });

  return errors;
};

const Icon = {
  back: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>,
  more: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>,
  pencil: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z" /></svg>,
  copy: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 012-2h10" /></svg>,
  download: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v12M7 11l5 5 5-5M5 20h14" /></svg>,
  upload: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20V8M7 13l5-5 5 5M5 4h14" /></svg>,
  print: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 9V3h10v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M7 14h10v7H7z" /></svg>,
  stop: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><rect x="9" y="9" width="6" height="6" rx="1" /></svg>,
  people: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0113 0" /><path d="M16 4.6a3.5 3.5 0 010 6.8M18.5 20a6.5 6.5 0 00-3-5.5" /></svg>,
  form: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></svg>,
  firstTimer: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="10" cy="8" r="4" /><path d="M3 20a7 7 0 0114 0M19 8v6M16 11h6" /></svg>,
  person: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0114 0" /></svg>,
  male: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="10" cy="14" r="6" /><path d="M14.5 9.5L20 4M15 4h5v5" /></svg>,
  female: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="9" r="6" /><path d="M12 15v7M9 19h6" /></svg>,
  gift: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M5 12v9h14v-9M7.5 8a2.5 2.5 0 010-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 010 5" /></svg>,
  phone: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M11 18h2" /></svg>,
  screen: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>,
  up: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" /></svg>,
  trend: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8M15 7h6v6" /></svg>,
  award: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="9" r="6" /><path d="M8.5 14L7 22l5-3 5 3-1.5-8" /></svg>,
  clock: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  scan: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M7 12h10" /></svg>,
  search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>,
  warn: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l9.5 17h-19z" /><path d="M12 10v4M12 17.5v.01" /></svg>
};

const ATTENDEE_SOURCES = [['all', 'All'], ['rsvp', 'Pre-Registered'], ['walk_in', 'Walk-In'], ['manual', 'Manual'], ['proxy', 'Proxy']];
const SOURCE_LABEL = { rsvp: 'Pre-Registered', walk_in: 'Walk-In', manual: 'Manual', proxy: 'Proxy' };

const registrationTypeOf = (attendee) => (
  attendee.registrationType
    || (attendee.proxyHostFingerprint ? 'proxy' : attendee.deviceFingerprint?.startsWith?.('manual-') ? 'manual' : 'walk_in')
);
const getAttendeeSourceLabel = (attendee) => SOURCE_LABEL[registrationTypeOf(attendee)] || 'Walk-In';
const formatAttendanceMode = (mode) => {
  if (mode === 'virtual') return 'Virtual';
  if (mode === 'physical') return 'Physical';
  return '-';
};

const percentOf = (part, whole) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '0%');
const plural = (n, one, many) => `${formatNumber(n)} ${n === 1 ? one : many}`;

// When the event starts, in the organizer's own time zone.
const eventStart = (program) => {
  const day = parseDateOnly(program?.date);
  const time = /^(\d{1,2}):(\d{2})/.exec(String(program?.startTime || ''));
  if (!day) return null;
  return new Date(day.year, day.month, day.day, time ? Number(time[1]) : 0, time ? Number(time[2]) : 0);
};

// Events end on their own 12 hours after their end time (the server does this too).
// An end time earlier than the start time means the event runs past midnight.
const AUTO_END_HOURS = 12;
const autoEndAt = (program) => {
  const day = parseDateOnly(program?.date);
  const start = /^(\d{1,2}):(\d{2})/.exec(String(program?.startTime || ''));
  const end = /^(\d{1,2}):(\d{2})/.exec(String(program?.endTime || ''));
  if (!day || !end) return null;
  const at = new Date(day.year, day.month, day.day, Number(end[1]), Number(end[2]));
  if (start && Number(end[1]) * 60 + Number(end[2]) <= Number(start[1]) * 60 + Number(start[2])) at.setDate(at.getDate() + 1);
  at.setHours(at.getHours() + AUTO_END_HOURS);
  return at;
};
const autoEndLabel = (at) => `${at.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, ${formatTime(`${at.getHours()}:${String(at.getMinutes()).padStart(2, '0')}`)}`;

const eventPhase = (program, now) => {
  if (!program?.isActive) return 'ended';
  const closes = autoEndAt(program);
  if (closes && now >= closes.getTime()) return 'ended';
  const start = eventStart(program);
  return start && now < start.getTime() ? 'upcoming' : 'live';
};

const startsLabel = (program, now) => {
  const start = eventStart(program);
  const time = formatTime(program.startTime);
  if (!start) return `Starts at ${time}`;
  const today = new Date(now);
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (sameDay(start, today)) return `Starts today at ${time}`;
  if (sameDay(start, tomorrow)) return `Starts tomorrow at ${time}`;
  return `Starts ${weekdayShortDate(program.date)} at ${time}`;
};

const countdownParts = (ms) => {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return { days, hours, minutes };
};

const countdownWords = ({ days, hours, minutes }) => {
  if (days > 0) return [plural(days, 'day', 'days'), hours > 0 ? plural(hours, 'hour', 'hours') : ''].filter(Boolean).join(' ');
  if (hours > 0) return [plural(hours, 'hour', 'hours'), minutes > 0 ? plural(minutes, 'minute', 'minutes') : ''].filter(Boolean).join(' ');
  return minutes <= 1 ? 'a minute' : plural(minutes, 'minute', 'minutes');
};

const shortTime = (value) => {
  const t = /^(\d{1,2}):(\d{2})/.exec(String(value || ''));
  if (!t) return value;
  return `${Number(t[1]) % 12 || 12}:${t[2]}`;
};

const addHalfHour = (value) => {
  const t = /^(\d{1,2}):(\d{2})/.exec(String(value || ''));
  if (!t) return value;
  const total = Number(t[1]) * 60 + Number(t[2]) + 30;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const clockTime = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const niceMax = (value) => {
  if (value <= 4) return 4;
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000];
  const step = steps.find((s) => s * 4 >= value) || Math.ceil(value / 4);
  return step * 4;
};

const shortLink = (url) => String(url || '').replace(/^https?:\/\//, '');

const useCompact = () => {
  const query = '(max-width: 640px)';
  const [compact, setCompact] = useState(() => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false));
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const list = window.matchMedia(query);
    const onChange = () => setCompact(list.matches);
    if (list.addEventListener) list.addEventListener('change', onChange);
    else list.addListener(onChange);
    return () => {
      if (list.removeEventListener) list.removeEventListener('change', onChange);
      else list.removeListener(onChange);
    };
  }, []);
  return compact;
};

function generateChartSkeleton(startTime, endTime) {
  const slots = [];
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  // Floor start to nearest 30-min boundary
  let current = sh * 60 + (sm < 30 ? 0 : 30);
  // Ceil end to nearest 30-min boundary
  const end = eh * 60 + (em <= 0 ? 0 : em <= 30 ? 30 : 60);
  while (current <= end) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    slots.push({
      time: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
      scans: 0
    });
    current += 30;
  }
  return slots;
}

function mergeChartData(buckets, startTime, endTime, scanRangeStart, scanRangeEnd) {
  // Widen the skeleton to include actual scan times (handles scans outside the program window)
  let effectiveStart = startTime;
  let effectiveEnd = endTime;
  if (scanRangeStart && scanRangeStart < effectiveStart) effectiveStart = scanRangeStart;
  if (scanRangeEnd && scanRangeEnd > effectiveEnd) effectiveEnd = scanRangeEnd;
  const skeleton = generateChartSkeleton(effectiveStart, effectiveEnd);
  const bucketMap = {};
  buckets.forEach(b => { bucketMap[b.time] = b.scans; });
  return skeleton.map(slot => ({
    ...slot,
    scans: bucketMap[slot.time] || 0
  }));
}

function StatCard({ icon, tone, label, value, sub, info }) {
  return (
    <div className="ig-ed-stat">
      <div className="ig-ed-stat-head">
        <span className={`ig-ed-stat-icon is-${tone}`}>{icon}</span>
        <span className="ig-ed-stat-label">{label}</span>
        {info}
      </div>
      <div className="ig-ed-stat-num"><strong>{formatNumber(value)}</strong>{sub && <span>{sub}</span>}</div>
    </div>
  );
}

function Sparkline({ data }) {
  let running = 0;
  const points = data.map((slot) => { running += slot.scans || 0; return running; });
  if (points.length < 2 || running === 0) return null;
  const w = 300;
  const h = 40;
  const path = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${((i / (points.length - 1)) * w).toFixed(1)} ${(h - 2 - (v / running) * (h - 6)).toFixed(1)}`).join(' ');
  return (
    <svg className="ig-ed-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={path} fill="none" stroke="#E8590C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function AttendanceChart({ data, phase, compact }) {
  const perPage = compact ? 5 : 8;
  const pages = Math.max(1, Math.ceil(data.length / perPage));
  const total = data.reduce((sum, slot) => sum + (slot.scans || 0), 0);
  const peak = data.reduce((best, slot) => ((slot.scans || 0) > (best?.scans || 0) ? slot : best), null);
  const peakIndex = peak ? data.indexOf(peak) : 0;
  const [page, setPage] = useState(() => Math.floor(peakIndex / perPage));
  const [hovered, setHovered] = useState(null);
  const [pinned, setPinned] = useState(null);
  const active = hovered || pinned;
  useEffect(() => {
    setPage((p) => Math.min(p, pages - 1));
  }, [pages]);
  useEffect(() => { setPinned(null); setHovered(null); }, [page]);

  const from = Math.max(0, Math.min(page * perPage, data.length - perPage));
  const shown = data.slice(from, from + perPage);
  const top = niceMax(Math.max(...shown.map((slot) => slot.scans || 0), 0));
  const ticks = [0, 1, 2, 3, 4].map((i) => (top / 4) * i);
  const empty = total === 0;

  return (
    <section className="ig-db-card ig-ed-chart" aria-label="Attendance over time">
      <div className="ig-ed-card-head">
        <span className="ig-db-card-title"><strong>Attendance Over Time</strong><span>Check-ins every 30 minutes</span></span>
        {!empty && peak && (
          <span className="ig-ed-peak">
            <span className="ig-ed-peak-icon">{Icon.trend}</span>
            <span><span>Busiest 30 minutes</span><strong>{formatTimeRange(peak.time, addHalfHour(peak.time))} · {formatNumber(peak.scans)} in</strong></span>
          </span>
        )}
      </div>
      <div className="ig-ed-plot">
        <div className="ig-ed-yaxis" aria-hidden="true">
          {ticks.map((t) => <span key={t} style={{ bottom: `${(t / top) * 100}%` }}>{formatNumber(t)}</span>)}
        </div>
        <div className="ig-ed-grid" role="img" aria-label={empty ? 'No check-ins yet' : `Check-ins per 30 minutes, highest ${formatNumber(peak?.scans || 0)}`}>
          {ticks.slice(1).map((t) => <span key={t} className="ig-ed-gridline" style={{ bottom: `${(t / top) * 100}%` }} />)}
          {empty && (
            <span className="ig-ed-wait"><span className={`ig-ed-wait-dot${phase === 'upcoming' ? ' is-blue' : ''}`} />{phase === 'upcoming' ? 'Check-ins show here as guests arrive' : phase === 'ended' ? 'No one checked in at this event' : 'Check-ins show here as guests scan in'}</span>
          )}
          <div className="ig-ed-bars" onMouseLeave={() => setHovered(null)}>
            {shown.map((slot, i) => {
              const scans = slot.scans || 0;
              const h = empty ? 100 : Math.round((scans / top) * 1000) / 10;
              const barH = empty ? 100 : Math.max(scans > 0 ? 2 : 0, h);
              const isPeak = !empty && peak && slot.time === peak.time;
              const on = active === slot.time;
              const range = formatTimeRange(slot.time, addHalfHour(slot.time));
              const edge = i === 0 ? ' is-first' : i === shown.length - 1 ? ' is-last' : '';
              return (
                <div className={`ig-ed-bar-col${on ? ' is-on' : ''}`} key={slot.time}>
                  {!empty && <span className={`ig-ed-bar-val${isPeak && !active ? ' is-shown' : ''}`} style={{ bottom: `calc(${h}% + 4px)` }} aria-hidden="true">{formatNumber(scans)}</span>}
                  {empty ? (
                    <span className="ig-ed-bar is-empty" style={{ height: '100%' }} />
                  ) : (
                    <button
                      type="button"
                      className={`ig-ed-bar${isPeak ? ' is-peak' : ''}`}
                      style={{ height: `${barH}%` }}
                      aria-label={`${range}: ${plural(scans, 'check-in', 'check-ins')}${isPeak ? ', the busiest 30 minutes' : ''}`}
                      aria-pressed={pinned === slot.time}
                      onMouseEnter={() => setHovered(slot.time)}
                      onFocus={() => setHovered(slot.time)}
                      onBlur={() => setHovered(null)}
                      onClick={() => setPinned((current) => (current === slot.time ? null : slot.time))}
                    />
                  )}
                  {on && !empty && (
                    <span className={`ig-db-tip ig-ed-tip${edge}`} role="status" style={{ bottom: `calc(${barH}% + 10px)` }}>
                      <strong>{formatNumber(scans)}</strong>
                      <span>{range} — {scans === 1 ? 'Check-in' : 'Check-ins'}</span>
                      <em>{isPeak ? 'Busiest 30 minutes' : total > 0 ? `${percentOf(scans, total)} of all check-ins` : ''}</em>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="ig-ed-xaxis" aria-hidden="true">
        <span />
        <div>{shown.map((slot) => <span key={slot.time}>{shortTime(slot.time)}</span>)}</div>
      </div>
      {!empty && pages > 1 && (
        <div className="ig-ed-pager">
          <button type="button" className="ig-st-pill" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} aria-label="Show earlier times">{DashIcon.chevronLeft}Earlier</button>
          <span><strong>{formatTimeRange(shown[0].time, shown[shown.length - 1].time)}</strong><span>{page + 1} of {pages}</span></span>
          <button type="button" className="ig-st-pill" onClick={() => setPage(Math.min(pages - 1, page + 1))} disabled={page >= pages - 1} aria-label="Show later times">Later{DashIcon.chevronRight}</button>
        </div>
      )}
    </section>
  );
}

function SponsorCard({ analytics, phase }) {
  const sponsors = analytics?.sponsors || [];
  const topClicks = Math.max(...sponsors.map((s) => s.clickCount || 0), 0);
  const total = analytics?.totalClicks || 0;
  const today = analytics?.todayClicks || 0;
  return (
    <section className="ig-db-card ig-ed-sponsors" aria-label="Sponsor engagement">
      <div className="ig-ed-card-head">
        <span className="ig-ed-sp-title">
          <span className="ig-ed-sp-icon">{Icon.award}</span>
          <span className="ig-db-card-title"><strong>Sponsor Engagement</strong><span>Clicks from the screen guests see after check-in</span></span>
        </span>
        <span className="ig-ed-sp-count">{sponsors.length} active</span>
      </div>
      <div className="ig-ed-sp-total">
        <strong>{formatNumber(total)}</strong>
        <span>{total === 1 ? 'sponsor link click' : 'sponsor link clicks'}{phase === 'live' && today > 0 && today !== total ? `, ${formatNumber(today)} today` : ''}</span>
      </div>
      <div className="ig-ed-sp-list">
        {sponsors.map((sponsor, i) => {
          const isTop = i === 0 && (sponsor.clickCount || 0) > 0;
          return (
            <div className={`ig-ed-sp${isTop ? ' is-top' : ''}`} key={sponsor.id}>
              <span className="ig-ed-sp-name">
                <span className="ig-ed-sp-badge" aria-hidden="true">{(String(sponsor.sponsorName || 'S').replace(/[^A-Za-z0-9]/g, '').charAt(0) || 'S').toUpperCase()}</span>
                <strong title={sponsor.sponsorName}>{sponsor.sponsorName}</strong>
                <span className="ig-ed-sp-rank">#{i + 1}</span>
              </span>
              <span className="ig-ed-sp-clicks">
                <strong>{formatNumber(sponsor.clickCount || 0)}</strong><span>{sponsor.clickCount === 1 ? 'click' : 'clicks'}</span>
                {isTop && <em>Top sponsor</em>}
              </span>
              <span className="ig-ed-sp-track"><span style={{ width: `${topClicks > 0 ? Math.round(((sponsor.clickCount || 0) / topClicks) * 100) : 0}%` }} /></span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- Guest answers, shared by the panel and the CSV ---------------- */

const FIELD_ORDER = ['fullName', 'emailAddress', 'phoneNumber', 'fellowship', 'sex', 'firstTimer', 'age', 'school', 'department', 'address', 'link', 'textarea'];
const FIELD_LABELS = {
  fullName: 'Full name', emailAddress: 'Email address', phoneNumber: 'Phone number', fellowship: 'Group', sex: 'Gender',
  firstTimer: 'First-timer', age: 'Age', school: 'School', department: 'Department', address: 'Address', link: 'Link', textarea: 'Additional Response'
};
const FIELD_PLACEHOLDERS = {
  fullName: 'Their full name', emailAddress: 'name@example.com', phoneNumber: '0803 000 0000', fellowship: 'Their group or community',
  age: 'e.g. 24', school: 'Their school', department: 'Their department or unit', address: 'Where they are coming from', link: 'https://', textarea: 'Their answer'
};
// Matches what the server asks for when someone is added by hand.
const OPTIONAL_MANUAL_FIELDS = ['fellowship', 'age'];

const fieldLabel = (program, field) => (field === 'textarea' ? program?.dataFieldConfig?.textareaLabel || FIELD_LABELS.textarea : FIELD_LABELS[field]);
const askedFields = (program) => FIELD_ORDER.filter((field) => program?.dataFields?.[field]);
const fieldValue = (attendee, field) => {
  if (field === 'firstTimer') return attendee.firstTimer ? 'Yes' : 'No';
  if (field === 'link') return attendee.linkUrl || '';
  if (field === 'textarea') return attendee.textareaResponse || '';
  if (field === 'age') return attendee.age ? String(attendee.age) : '';
  return attendee[field] ? String(attendee[field]) : '';
};

const howCheckedIn = (attendee) => {
  const type = registrationTypeOf(attendee);
  if (type === 'proxy') return 'Checked in by a friend';
  if (type === 'manual') return 'Added by you';
  if (type === 'rsvp') return 'RSVP pass';
  return 'Own phone';
};

const fullDateTime = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
};

/* ---------------- Guest details panel ---------------- */

function GuestPanel({ attendee, program, onClose, onMarkGifted }) {
  const panelRef = useRef(null);
  useEffect(() => {
    const opener = document.activeElement;
    panelRef.current?.focus();
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
      if (opener && typeof opener.focus === 'function') opener.focus();
    };
  }, [onClose]);

  const type = registrationTypeOf(attendee);
  const answers = askedFields(program).map((field) => [fieldLabel(program, field), fieldValue(attendee, field), field]);
  const custom = (program.customFormSchema || []).map((field) => [field.label, formatCustomAnswer(attendee.customResponses?.[field.id])]);
  const facts = [
    ['How', SOURCE_LABEL[type] || 'Walk-In'],
    ['Attending', attendee.attendanceMode === 'virtual' ? 'Online' : 'In person'],
    ['Time', clockTime(attendee.checkedInAt || attendee.scanTime)],
    ['Phone', howCheckedIn(attendee)]
  ];

  return (
    <div className="ig-ed-panel-wrap">
      <button type="button" className="ig-ed-panel-scrim" aria-label="Close guest details" tabIndex={-1} onClick={onClose} />
      <aside className="ig-ed-panel" ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="ig-ed-guest-name">
        <div className="ig-ed-panel-top">
          <span>Guest details</span>
          <button type="button" className="ig-db-round-btn is-sm" aria-label="Close" onClick={onClose}>{DashIcon.close}</button>
        </div>
        <div className="ig-ed-panel-body">
          <div className="ig-ed-panel-who">
            <span className="ig-ed-panel-avatar" aria-hidden="true">{initialsOf(attendee.fullName || attendee.emailAddress || '?')}</span>
            <span>
              <h2 id="ig-ed-guest-name">{attendee.fullName || attendee.emailAddress || 'No name given'}</h2>
              <span className="ig-ed-panel-tags">
                <span className={`ig-ed-src is-${type}`}>{SOURCE_LABEL[type] || 'Walk-In'}</span>
                <span>Checked in {clockTime(attendee.checkedInAt || attendee.scanTime)}</span>
              </span>
            </span>
          </div>

          {answers.length > 0 && (
            <section className="ig-ed-panel-sec">
              <div className="ig-ed-panel-sec-head"><strong>Their answers</strong><span>Only what this event asks</span></div>
              <dl className="ig-ed-answers">
                {answers.map(([label, value, field]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{field === 'link' && /^https?:\/\//i.test(value) ? <a href={value} target="_blank" rel="noreferrer">{shortLink(value)}</a> : value || <span className="ig-ed-cell-muted">Not given</span>}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {custom.length > 0 && (
            <section className="ig-ed-panel-sec">
              <div className="ig-ed-panel-sec-head"><strong>Your own questions</strong></div>
              <dl className="ig-ed-answers">
                {custom.map(([label, value]) => (
                  <div key={label}><dt>{label}</dt><dd>{value && value !== '-' ? value : <span className="ig-ed-cell-muted">Not answered</span>}</dd></div>
                ))}
              </dl>
            </section>
          )}

          <section className="ig-ed-panel-sec">
            <div className="ig-ed-panel-sec-head"><strong>Check-in</strong></div>
            <div className="ig-ed-facts">
              {facts.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
            </div>
          </section>

          {program.giftingEnabled && attendee.isWinner && (
            <div className={`ig-ed-winner${attendee.isGifted ? ' is-done' : ''}`}>
              <span>
                <strong>Gift winner</strong>
                <span>{attendee.isGifted ? 'Gift handed out.' : 'Picked at random. Hand over the gift, then mark it.'}</span>
              </span>
              {attendee.isGifted
                ? <span className="ig-ed-winner-done">Gifted</span>
                : <button type="button" className="ig-db-btn-ink" onClick={() => onMarkGifted(attendee)}>Mark gifted</button>}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ---------------- Add someone by hand ---------------- */

function ManualModal({ program, template, formData, errors, submitting, onField, onCustom, onClose, onSubmit }) {
  const firstRef = useRef(null);
  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (event) => { if (event.key === 'Escape' && !submitting) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  const formRef = useRef(null);
  const errorCount = Object.values(errors).filter(Boolean).length;
  useEffect(() => {
    if (errorCount === 0) return;
    const first = formRef.current?.querySelector('.has-error input, .has-error textarea, .ig-st-error');
    const target = first?.matches?.('.ig-st-error') ? first.closest('fieldset')?.querySelector('button, input') : first;
    target?.focus?.();
  }, [errorCount]);

  const fields = askedFields(program);
  const errorFor = (key) => (errors[key] ? <span className="ig-st-error" role="alert">{errors[key]}</span> : null);
  const optional = (field) => (OPTIONAL_MANUAL_FIELDS.includes(field) ? <em> (optional)</em> : null);
  let firstInputUsed = false;
  const firstInputRef = () => {
    if (firstInputUsed) return undefined;
    firstInputUsed = true;
    return firstRef;
  };

  return (
    <div className="ig-db-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose(); }}>
      <form ref={formRef} className="ig-db-dialog ig-pd-modal ig-ed-manual" role="dialog" aria-modal="true" aria-labelledby="ig-ed-manual-title" onSubmit={onSubmit} noValidate>
        <div className="ig-pd-modal-head">
          <span>
            <h2 id="ig-ed-manual-title">Add {template.attendee.singular.toLowerCase()} manually</h2>
            <p>For someone checking in without a smartphone.</p>
          </span>
          <button type="button" className="ig-db-round-btn is-sm" aria-label="Close" onClick={onClose} disabled={submitting}>{DashIcon.close}</button>
        </div>

        {fields.length === 0 && (program.customFormSchema || []).length === 0 && (
          <p className="ig-pd-modal-note is-left">This {template.event.singular.toLowerCase()} doesn't ask for any details, so they are added with no name.</p>
        )}

        {fields.map((field) => {
          const id = `ig-ed-manual-${field}`;
          if (field === 'firstTimer') {
            return (
              <label className="ig-pd-check ig-ed-manual-check" key={field}>
                <span>First timer</span>
                <input type="checkbox" checked={Boolean(formData.firstTimer)} onChange={(event) => onField('firstTimer', event.target.checked)} disabled={submitting} />
              </label>
            );
          }
          if (field === 'sex') {
            return (
              <fieldset className="ig-pd-fieldset" key={field}>
                <legend>Gender</legend>
                <div className="ig-pd-types is-two" role="radiogroup" aria-label="Gender">
                  {['Male', 'Female'].map((option) => (
                    <button key={option} type="button" role="radio" aria-checked={formData.sex === option} className={formData.sex === option ? 'is-on' : ''} onClick={() => onField('sex', option)} disabled={submitting}>
                      <strong>{option}</strong>
                    </button>
                  ))}
                </div>
                {errorFor('sex')}
              </fieldset>
            );
          }
          if (field === 'textarea') {
            return (
              <div className={`ig-st-field${errors.textareaResponse ? ' has-error' : ''}`} key={field}>
                <label htmlFor={id}>{fieldLabel(program, field)}</label>
                <textarea id={id} ref={firstInputRef()} className="ig-pd-textarea" value={formData.textareaResponse || ''} onChange={(event) => onField('textareaResponse', event.target.value)} placeholder={FIELD_PLACEHOLDERS.textarea} disabled={submitting} rows={3} maxLength={5000} />
                {errorFor('textareaResponse')}
              </div>
            );
          }
          const valueKey = field === 'link' ? 'linkUrl' : field;
          return (
            <div className={`ig-st-field${errors[valueKey] ? ' has-error' : ''}`} key={field}>
              <label htmlFor={id}>{fieldLabel(program, field)}{optional(field)}</label>
              <input
                id={id}
                ref={firstInputRef()}
                type={field === 'emailAddress' ? 'email' : field === 'age' ? 'number' : field === 'link' ? 'url' : field === 'phoneNumber' ? 'tel' : 'text'}
                inputMode={field === 'age' ? 'numeric' : undefined}
                value={formData[valueKey] || ''}
                onChange={(event) => onField(valueKey, event.target.value)}
                placeholder={FIELD_PLACEHOLDERS[field]}
                disabled={submitting}
                maxLength={field === 'emailAddress' ? 255 : 500}
                aria-invalid={Boolean(errors[valueKey]) || undefined}
              />
              {errorFor(valueKey)}
            </div>
          );
        })}

        {(program.customFormSchema || []).map((field) => {
          const value = formData.customResponses?.[field.id];
          const key = getCustomFieldErrorKey(field.id);
          const label = <>{field.label}{!field.required && <em> (optional)</em>}</>;
          if (field.type === 'radio' || field.type === 'checkbox') {
            const selected = field.type === 'checkbox' ? (Array.isArray(value) ? value : []) : value;
            return (
              <fieldset className="ig-pd-fieldset" key={field.id}>
                <legend>{label}</legend>
                <div className="ig-pd-checks">
                  {(field.options || []).map((option) => (
                    <label className="ig-pd-check" key={option}>
                      <input
                        type={field.type}
                        name={`ig-ed-q-${field.id}`}
                        checked={field.type === 'checkbox' ? selected.includes(option) : selected === option}
                        onChange={(event) => onCustom(field.id, field.type === 'checkbox'
                          ? (event.target.checked ? [...selected, option] : selected.filter((item) => item !== option))
                          : option)}
                        disabled={submitting}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
                {errorFor(key)}
              </fieldset>
            );
          }
          return (
            <div className={`ig-st-field${errors[key] ? ' has-error' : ''}`} key={field.id}>
              <label htmlFor={`ig-ed-q-${field.id}`}>{label}</label>
              <input id={`ig-ed-q-${field.id}`} value={value || ''} onChange={(event) => onCustom(field.id, event.target.value)} placeholder="Their answer" disabled={submitting} maxLength={500} />
              {errorFor(key)}
            </div>
          );
        })}

        <p className="ig-pd-modal-note is-left ig-ed-manual-note">Fields match this {template.event.singular.toLowerCase()}'s check-in form. The entry is marked "Manual" in your data.</p>

        <div className="ig-db-dialog-actions">
          <button type="button" className="ig-db-btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="ig-db-btn-primary" disabled={submitting}>{submitting ? 'Checking in…' : 'Check them in'}</button>
        </div>
      </form>
    </div>
  );
}

/* ---------------- Export ---------------- */

const csvCell = (value) => {
  let text = value === null || value === undefined ? '' : String(value);
  // Stops a spreadsheet from treating a guest's answer as a formula.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const safeFileName = (value) => String(value || 'event').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'event';

const buildAttendeeCsv = (program, list) => {
  const fields = askedFields(program);
  const custom = program.customFormSchema || [];
  const showMode = list.some((a) => Boolean(a.attendanceMode));
  const header = [
    ...fields.map((field) => fieldLabel(program, field)),
    ...custom.map((field) => field.label),
    'How they checked in',
    ...(showMode ? ['Attendance mode'] : []),
    ...(program.giftingEnabled ? ['Gift winner', 'Gift handed out'] : []),
    'Checked in'
  ];
  const rows = list.map((attendee) => [
    ...fields.map((field) => fieldValue(attendee, field)),
    ...custom.map((field) => {
      const answer = formatCustomAnswer(attendee.customResponses?.[field.id]);
      return answer === '-' ? '' : answer;
    }),
    SOURCE_LABEL[registrationTypeOf(attendee)] || 'Walk-In',
    ...(showMode ? [attendee.attendanceMode === 'virtual' ? 'Online' : 'In person'] : []),
    ...(program.giftingEnabled ? [attendee.isWinner ? 'Yes' : 'No', attendee.isWinner ? (attendee.isGifted ? 'Yes' : 'Not yet') : ''] : []),
    fullDateTime(attendee.checkedInAt || attendee.scanTime)
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
};

const downloadText = (text, fileName, type) => {
  // The leading mark helps Excel read names with accents correctly.
  const blob = new Blob([`﻿${text}`], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

function ExportModal({ program, template, allCount, filteredCount, filterLabel, busy, onClose, onDownload }) {
  const [format, setFormat] = useState('csv');
  const [scope, setScope] = useState('all');
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, busy]);
  const guests = template.attendee.plural.toLowerCase();
  const hasFilter = filteredCount !== allCount;
  const includes = [
    ...askedFields(program).map((field) => fieldLabel(program, field).toLowerCase()),
    ...((program.customFormSchema || []).length ? ['your own questions'] : []),
    'check-in source',
    ...(program.giftingEnabled ? ['gift status'] : []),
    'check-in time'
  ];
  const includesText = includes.length > 1 ? `${includes.slice(0, -1).join(', ')} and ${includes[includes.length - 1]}` : includes[0];

  return (
    <div className="ig-db-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div className="ig-db-dialog ig-pd-modal ig-ed-export-modal" role="dialog" aria-modal="true" aria-labelledby="ig-ed-export-title">
        <div className="ig-pd-modal-head">
          <span>
            <h2 id="ig-ed-export-title">Export {template.attendee.singular.toLowerCase()} data</h2>
            <p>{program.title}, saved to your device.</p>
          </span>
          <button type="button" className="ig-db-round-btn is-sm" aria-label="Close" onClick={onClose} disabled={busy}>{DashIcon.close}</button>
        </div>

        <fieldset className="ig-pd-fieldset">
          <legend>Format</legend>
          <div className="ig-ed-formats" role="radiogroup" aria-label="Format">
            {[['csv', 'CSV', 'CSV file', 'Opens in Excel, Sheets or Numbers'], ['pdf', 'PDF', 'PDF report', 'Charts and totals to share']].map(([key, chip, name, note]) => (
              <button key={key} type="button" role="radio" aria-checked={format === key} className={format === key ? 'is-on' : ''} onClick={() => setFormat(key)} disabled={busy}>
                <span className={`ig-ed-format-chip is-${key}`} aria-hidden="true">{chip}</span>
                <span><strong>{name}</strong><span>{note}</span></span>
              </button>
            ))}
          </div>
        </fieldset>

        {format === 'csv' ? (
          <>
            <fieldset className="ig-pd-fieldset">
              <legend>{template.attendee.plural}</legend>
              <div className="ig-ed-scopes" role="radiogroup" aria-label={template.attendee.plural}>
                {[['all', `All ${guests}`, allCount], ...(hasFilter ? [['filter', `Current filter: ${filterLabel}`, filteredCount]] : [])].map(([key, label, count]) => (
                  <button key={key} type="button" role="radio" aria-checked={scope === key} className={scope === key ? 'is-on' : ''} onClick={() => setScope(key)} disabled={busy}>
                    <span className="ig-ed-scope-dot" aria-hidden="true" />
                    <span>{label}</span>
                    <em>{formatNumber(count)}</em>
                  </button>
                ))}
              </div>
            </fieldset>
            <p className="ig-ed-export-note">Includes {includesText}.</p>
          </>
        ) : (
          <p className="ig-ed-export-note">A report of the whole {template.event.singular.toLowerCase()}: attendance, the busiest times, first-timers, sponsors and the {guests} list.</p>
        )}

        <div className="ig-db-dialog-actions">
          <button type="button" className="ig-db-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="ig-db-btn-ink" onClick={() => onDownload(format, scope)} disabled={busy || (format === 'csv' && allCount === 0)}>
            {Icon.download}{busy ? 'Preparing…' : format === 'csv' ? 'Download CSV' : 'Download PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProgramDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const compact = useCompact();
  const [program, setProgram] = useState(null);
  const [totalScans, setTotalScans] = useState(0);
  const [attendanceData, setAttendanceData] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [countOnlyStats, setCountOnlyStats] = useState({ maleCount: 0, femaleCount: 0, firstTimerCount: 0 });
  const [collectDataStats, setCollectDataStats] = useState({ maleCount: 0, femaleCount: 0, firstTimerCount: 0 });
  const [formsSubmitted, setFormsSubmitted] = useState(0);
  const [countOnlyScans, setCountOnlyScans] = useState([]);
  const [sponsorAnalytics, setSponsorAnalytics] = useState({ sponsorCount: 0, totalClicks: 0, todayClicks: 0, topSponsor: null, sponsors: [] });
  const [sharedDeviceCheckins, setSharedDeviceCheckins] = useState(0);
  const [churchData, setChurchData] = useState({ name: '', branch: '', email: '', logo: null });
  const [, setUnreadCount] = useState(0);
  const [boot, setBoot] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [attendeeFilter, setAttendeeFilter] = useState('all');
  const [attendanceModeFilter, setAttendanceModeFilter] = useState('all');
  const [winnersGifted, setWinnersGifted] = useState(0);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualFormData, setManualFormData] = useState({
    fullName: '',
    emailAddress: '',
    school: '',
    linkUrl: '',
    textareaResponse: '',
    phoneNumber: '',
    address: '',
    department: '',
    fellowship: '',
    age: '',
    sex: '',
    firstTimer: false,
    customResponses: {}
  });
  const [manualErrors, setManualErrors] = useState({});
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [rsvpScannerLinkLoading, setRsvpScannerLinkLoading] = useState(false);
  const [showFingerprintWarning, setShowFingerprintWarning] = useState(false);
  const [fingerprintSaving, setFingerprintSaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [moreOpen, setMoreOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [giftTarget, setGiftTarget] = useState(null);
  const [guestId, setGuestId] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const moreRef = useRef(null);
  const toast = useToast();
  const { template, setTemplateKey } = useEventTemplate();
  const setTemplateRef = useRef(setTemplateKey);
  setTemplateRef.current = setTemplateKey;

  // Keeps the "starts in" countdown and the live / not started label current.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Sidebar counts and the live event callout.
  useEffect(() => {
    let alive = true;
    const today = localToday();
    getDashboardBootstrap(today, today, today)
      .then((res) => { if (alive && res) setBoot(res); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!moreOpen) return undefined;
    const onDown = (event) => { if (moreRef.current && !moreRef.current.contains(event.target)) setMoreOpen(false); };
    const onKey = (event) => { if (event.key === 'Escape') setMoreOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [moreOpen]);

  useEffect(() => {
    if (!showManualModal) return undefined;
    const handleEscape = (e) => { if (e.key === 'Escape') setShowManualModal(false); };
    const previousOverflow = document.body.style.overflow;
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [showManualModal]);

  // Socket.io real-time
  useEffect(() => {
    let socket;
    let isMounted = true;

    fetchProgramData();
    import('socket.io-client').then(({ default: io }) => {
      if (!isMounted) return;

      socket = io(process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000');
    socket.emit('join-program', id);
    socket.on(`program-${id}-update`, (data) => {
      if (data.isActive === false) {
        setProgram((prev) => (prev ? { ...prev, isActive: false, status: 'completed' } : prev));
      }
      if (data.totalScans !== undefined) {
        setTotalScans(data.totalScans);
        // Re-fetch chart data and merge into skeleton
        getAttendanceData(id).then(d => {
          if (d.buckets && d.startTime && d.endTime) {
            setAttendanceData(mergeChartData(d.buckets, d.startTime, d.endTime, d.scanRangeStart, d.scanRangeEnd));
          } else {
            console.warn('📊 Chart: unexpected response shape', d);
          }
        }).catch(err => console.error('📊 Chart refresh error:', err));
      }
      if (data.maleCount !== undefined) {
        setCountOnlyStats({ maleCount: data.maleCount, femaleCount: data.femaleCount, firstTimerCount: data.firstTimerCount });
      }
      if (data.attendeeMaleCount !== undefined) {
        setCollectDataStats({ maleCount: data.attendeeMaleCount, femaleCount: data.attendeeFemaleCount, firstTimerCount: data.attendeeFirstTimerCount });
        if (data.attendeeTotal !== undefined) setFormsSubmitted(data.attendeeTotal);
        if (data.sharedDeviceCheckins !== undefined) setSharedDeviceCheckins(data.sharedDeviceCheckins);
        getAttendees(id).then(d => setAttendees(d.attendees)).catch(() => {});
      }
      if (data.winnersGifted !== undefined) {
        setWinnersGifted(data.winnersGifted);
        if (data.giftedAttendeeId) setAttendees(prev => prev.map(a => a.id === data.giftedAttendeeId ? { ...a, isGifted: true } : a));
      }
    });
    }).catch(err => console.error('Socket connection error:', err));

    return () => {
      isMounted = false;
      if (socket) socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchProgramData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { window.location.href = '/login'; return; }

      try {
        const bootstrap = await getProgramDetailBootstrap(id);
        const church = bootstrap.church;
        setChurchData({
          name: church.churchName,
          branch: church.branchName,
          email: church.email || '',
          logo: church.logoUrl
        });
        setTemplateKey(church.organizationType || 'general');
        setUnreadCount(bootstrap.unreadCount || 0);

        const programData = bootstrap.program;
        setProgram({ ...programData, status: programData.isActive ? 'active' : 'completed' });
        setTotalScans(programData.totalScans);
        setWinnersGifted(programData.winnersGifted || 0);
        setSharedDeviceCheckins(programData.sharedDeviceCheckins || 0);
        getSponsorAnalytics(id)
          .then(data => setSponsorAnalytics(data))
          .catch(error => console.error('Error fetching sponsor analytics:', error));

        const attendeesData = { attendees: bootstrap.attendees || [] };
        setAttendees(attendeesData.attendees);

        const chartResponse = bootstrap.attendanceData;
        if (chartResponse?.buckets && chartResponse.startTime && chartResponse.endTime) {
          setAttendanceData(mergeChartData(chartResponse.buckets, chartResponse.startTime, chartResponse.endTime, chartResponse.scanRangeStart, chartResponse.scanRangeEnd));
        } else {
          console.warn('Chart: unexpected response shape', chartResponse);
        }

        if (programData.trackingMode === 'count-only') {
          setCountOnlyStats(bootstrap.countOnlyStats || { maleCount: 0, femaleCount: 0, firstTimerCount: 0 });
          setCountOnlyScans(bootstrap.countOnlyScans || []);
        } else {
          const maleCount = attendeesData.attendees.filter(a => a.sex === 'Male').length;
          const femaleCount = attendeesData.attendees.filter(a => a.sex === 'Female').length;
          const firstTimerCount = attendeesData.attendees.filter(a => a.firstTimer).length;
          setCollectDataStats({ maleCount, femaleCount, firstTimerCount });
          setFormsSubmitted(attendeesData.attendees.length);
        }

        setLoading(false);
        return;
      } catch (bootstrapError) {
        console.error('Error fetching program bootstrap:', bootstrapError);
        if (bootstrapError.response?.status === 401) throw bootstrapError;
      }

      const { getCurrentChurch } = await import('../api/authService');
      const church = await getCurrentChurch();
      setChurchData({ name: church.churchName, branch: church.branchName, email: church.email || '', logo: church.logoUrl });
      setTemplateKey(church.organizationType || 'general');
      // Fetch unread notification count
      try {
        const axios = (await import('axios')).default;
        const countRes = await axios.get(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/notifications/unread-count`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        setUnreadCount(countRes.data.unreadCount || 0);
      } catch (err) {
        console.error('Error fetching unread count:', err);
      }
      const programData = await getProgramById(id);
      setProgram({ ...programData, status: programData.isActive ? 'active' : 'completed' });
      setTotalScans(programData.totalScans);
      setWinnersGifted(programData.winnersGifted || 0);
      setSharedDeviceCheckins(programData.sharedDeviceCheckins || 0);
      getSponsorAnalytics(id)
        .then(data => setSponsorAnalytics(data))
        .catch(error => console.error('Error fetching sponsor analytics:', error));
      const attendeesData = await getAttendees(id);
      setAttendees(attendeesData.attendees);
      // Fetch chart data, then merge into skeleton
      try {
        const chartResponse = await getAttendanceData(id);
        console.log('📊 Chart response:', chartResponse);
        if (chartResponse.buckets && chartResponse.startTime && chartResponse.endTime) {
          setAttendanceData(mergeChartData(chartResponse.buckets, chartResponse.startTime, chartResponse.endTime, chartResponse.scanRangeStart, chartResponse.scanRangeEnd));
        } else {
          console.warn('📊 Chart: unexpected response shape', chartResponse);
        }
      } catch (chartErr) {
        console.error('📊 Chart data fetch error:', chartErr);
      }
      if (programData.trackingMode === 'count-only') {
        try {
          const axios = (await import('axios')).default;
          const statsResponse = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/programs/${id}/count-stats`, { headers: { 'Authorization': `Bearer ${token}` } });
          setCountOnlyStats(statsResponse.data.stats);
          const scansResponse = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/scan/program/${id}/scans`, { headers: { 'Authorization': `Bearer ${token}` } });
          setCountOnlyScans(scansResponse.data.scans || []);
        } catch (error) { console.error('Error fetching count-only stats:', error); }
      } else {
        const maleCount = attendeesData.attendees.filter(a => a.sex === 'Male').length;
        const femaleCount = attendeesData.attendees.filter(a => a.sex === 'Female').length;
        const firstTimerCount = attendeesData.attendees.filter(a => a.firstTimer).length;
        setCollectDataStats({ maleCount, femaleCount, firstTimerCount });
        setFormsSubmitted(attendeesData.attendees.length);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching program:', error);
      if (error.response?.status === 401) { localStorage.removeItem('token'); window.location.href = '/login'; }
      setLoading(false);
    }
  };

  const handleDownloadQR = () => {
    const canvas = document.getElementById('qr-code-canvas');
    if (!canvas) {
      toast.info('QR code is still loading. Please try again in a moment.');
      return;
    }
    const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = `${program.title}-QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintQR = () => {
    const canvas = document.getElementById('qr-code-canvas');
    if (!canvas) {
      toast.info('QR code is still loading. Please try again in a moment.');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=560,height=760');
    if (!printWindow) {
      toast.info('Please allow popups for this site so the QR code can be printed.');
      return;
    }

    const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[character]));

    const qrImageUrl = canvas.toDataURL('image/png');
    const programTitle = escapeHtml(program.title);
    const statusText = program.isActive ? 'QR Code is Active - Accepting Scans' : 'QR Code is Disabled';
    const statusClass = program.isActive ? 'active' : 'inactive';

    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${programTitle} QR Code</title>
          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #ffffff;
              color: #070b1a;
              font-family: Inter, Arial, sans-serif;
              padding: 28px;
            }

            .qr-print-card {
              width: min(100%, 420px);
              border: 1px solid #e5e7eb;
              border-radius: 18px;
              padding: 30px 28px;
              text-align: center;
              background: #ffffff;
            }

            h1 {
              margin: 0 0 8px;
              font-size: 22px;
              line-height: 1.2;
              font-weight: 800;
            }

            .helper {
              margin: 0 auto 26px;
              max-width: 310px;
              color: #7b8192;
              font-size: 14px;
              line-height: 1.55;
            }

            .qr-image {
              width: 270px;
              height: 270px;
              object-fit: contain;
              display: block;
              margin: 0 auto 24px;
            }

            .program-title {
              margin: 0 0 6px;
              font-size: 20px;
              line-height: 1.25;
              font-weight: 850;
            }

            .scan-text {
              margin: 0 0 24px;
              color: #8a90a0;
              font-size: 14px;
            }

            .status {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              border-radius: 999px;
              padding: 12px 18px;
              font-size: 13px;
              font-weight: 800;
            }

            .status::before {
              content: "";
              width: 8px;
              height: 8px;
              border-radius: 999px;
              background: currentColor;
            }

            .status.active {
              background: #dcfce7;
              color: #079448;
            }

            .status.inactive {
              background: #fee2e2;
              color: #b91c1c;
            }

            @page {
              margin: 14mm;
            }

            @media print {
              body {
                min-height: auto;
                padding: 0;
              }

              .qr-print-card {
                border-color: #d9dde7;
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          <main class="qr-print-card">
            <h1>QR Code</h1>
            <p class="helper">Deploy this QR code at your event entrance or check-in desk</p>
            <img class="qr-image" src="${qrImageUrl}" alt="QR code for ${programTitle}" />
            <h2 class="program-title">${programTitle}</h2>
            <p class="scan-text">Scan to check in</p>
            <div class="status ${statusClass}">${statusText}</div>
          </main>
          <script>
            window.addEventListener('load', function () {
              setTimeout(function () {
                window.focus();
                window.print();
              }, 150);
            });
            window.addEventListener('afterprint', function () {
              window.close();
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const copyCheckinLink = async () => {
    setMoreOpen(false);
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(program.qrCodeUrl);
      else {
        const input = document.createElement('input');
        input.value = program.qrCodeUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      toast.success('Check-in link copied');
    } catch (error) {
      toast.error('Could not copy the link. Press and hold it to copy instead.');
    }
  };

  const endEvent = async () => {
    setDialogBusy(true);
    try {
      await stopProgramAPI(id);
      setProgram((prev) => (prev ? { ...prev, isActive: false, status: 'completed' } : prev));
      setDialog(null);
      toast.success(`${template.event.singular} ended. The check-in QR code no longer works.`);
    } catch (error) {
      toast.error(error.response?.data?.error || `Could not end this ${template.event.singular.toLowerCase()}. Try again.`);
    } finally {
      setDialogBusy(false);
    }
  };

  const removeEvent = async () => {
    setDialogBusy(true);
    try {
      await deleteProgram(id);
      toast.success(`${template.event.singular} deleted.`);
      navigate('/programs', { replace: true });
    } catch (error) {
      setDialogBusy(false);
      toast.error(error.response?.data?.error || `Could not delete this ${template.event.singular.toLowerCase()}. Try again.`);
    }
  };

  const confirmGifted = async () => {
    const attendee = giftTarget;
    if (!attendee) return;
    setDialogBusy(true);
    try {
      await markWinnerGifted(id, attendee.id);
      setAttendees((prev) => prev.map((a) => (a.id === attendee.id ? { ...a, isGifted: true } : a)));
      setWinnersGifted((prev) => prev + 1);
      setGiftTarget(null);
      toast.success(`${attendee.fullName || 'Winner'} marked as gifted.`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not mark this gift. Try again.');
    } finally {
      setDialogBusy(false);
    }
  };

  const resetManualForm = () => {
    setManualFormData({
      fullName: '',
      emailAddress: '',
      school: '',
      linkUrl: '',
      textareaResponse: '',
      phoneNumber: '',
      address: '',
      department: '',
      fellowship: '',
      age: '',
      sex: '',
      firstTimer: false,
      customResponses: {}
    });
    setManualErrors({});
  };

  const openManualModal = () => {
    if (!program?.isActive) {
      toast.info(`This ${template.event.singular.toLowerCase()} has ended, so manual check-ins are disabled.`);
      return;
    }
    resetManualForm();
    setShowManualModal(true);
  };

  const closeManualModal = () => {
    if (manualSubmitting) return;
    setShowManualModal(false);
    setManualErrors({});
  };

  const getShareableRsvpScannerUrl = async () => {
    const response = await getRsvpScannerLink(id);
    if (!response.scannerUrl) throw new Error('Scanner link was not returned.');
    return response.scannerUrl;
  };

  const copyRsvpScannerLink = async () => {
    if (rsvpScannerLinkLoading) return;
    setRsvpScannerLinkLoading(true);
    try {
      const scannerUrl = await getShareableRsvpScannerUrl();
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(scannerUrl);
      } else {
        const input = document.createElement('input');
        input.value = scannerUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      toast.success('RSVP scanner link copied. Share it with your ushers.');
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'Unable to create RSVP scanner link.');
    } finally {
      setRsvpScannerLinkLoading(false);
    }
  };

  const openRsvpScannerLink = async () => {
    if (rsvpScannerLinkLoading) return;
    setRsvpScannerLinkLoading(true);
    try {
      const scannerUrl = await getShareableRsvpScannerUrl();
      window.open(scannerUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'Unable to open RSVP scanner link.');
    } finally {
      setRsvpScannerLinkLoading(false);
    }
  };

  const handleManualCustomChange = (fieldId, value) => {
    setManualFormData(prev => ({
      ...prev,
      customResponses: {
        ...(prev.customResponses || {}),
        [fieldId]: value
      }
    }));

    const errorKey = getCustomFieldErrorKey(fieldId);
    if (manualErrors[errorKey]) {
      setManualErrors(prev => ({ ...prev, [errorKey]: '' }));
    }
  };

  const validateManualForm = () => {
    const dataFields = program?.dataFields || {};
    const errors = {
      ...validateCustomFieldResponses(program?.customFormSchema || [], manualFormData.customResponses || {})
    };

    if (dataFields.fullName && !manualFormData.fullName.trim()) errors.fullName = 'Full name is required';
    if (dataFields.emailAddress) {
      if (!manualFormData.emailAddress.trim()) errors.emailAddress = 'Email address is required';
      else if (!isValidCollectedEmail(manualFormData.emailAddress)) errors.emailAddress = 'Enter a valid email address';
    }
    if (dataFields.school && !manualFormData.school.trim()) errors.school = 'School is required';
    if (dataFields.link) {
      if (!manualFormData.linkUrl.trim()) errors.linkUrl = 'Link is required';
      else if (!isValidHttpUrl(manualFormData.linkUrl)) errors.linkUrl = 'Enter a valid link starting with http:// or https://';
    }
    if (dataFields.textarea && !manualFormData.textareaResponse.trim()) errors.textareaResponse = 'Response is required';
    if (dataFields.phoneNumber && !manualFormData.phoneNumber.trim()) errors.phoneNumber = 'Phone number is required';
    if (dataFields.address && !manualFormData.address.trim()) errors.address = 'Address is required';
    if (dataFields.department && !manualFormData.department.trim()) errors.department = 'Department is required';
    if (dataFields.sex && !manualFormData.sex) errors.sex = 'Please select gender';

    if (dataFields.age && manualFormData.age !== '') {
      const age = Number(manualFormData.age);
      if (!Number.isInteger(age) || age < 0 || age > 130) errors.age = 'Age must be a valid number';
    }

    return errors;
  };

  const refreshAttendanceChart = useCallback(async () => {
    const chartResponse = await getAttendanceData(id);
    if (chartResponse.buckets && chartResponse.startTime && chartResponse.endTime) {
      setAttendanceData(mergeChartData(chartResponse.buckets, chartResponse.startTime, chartResponse.endTime, chartResponse.scanRangeStart, chartResponse.scanRangeEnd));
    }
  }, [id]);

  const handleManualSubmit = async (event) => {
    event.preventDefault();

    const errors = validateManualForm();
    if (Object.keys(errors).length > 0) {
      setManualErrors(errors);
      return;
    }

    setManualSubmitting(true);
    try {
      const response = await addManualAttendee(id, manualFormData);

      if (response.attendee) {
        setAttendees(prev => [response.attendee, ...prev.filter(attendee => attendee.id !== response.attendee.id)]);
      }
      if (response.totalScans !== undefined) setTotalScans(response.totalScans);
      if (response.attendeeMaleCount !== undefined) {
        setCollectDataStats({
          maleCount: response.attendeeMaleCount,
          femaleCount: response.attendeeFemaleCount,
          firstTimerCount: response.attendeeFirstTimerCount
        });
      }
      if (response.attendeeTotal !== undefined) setFormsSubmitted(response.attendeeTotal);

      await refreshAttendanceChart();
      setShowManualModal(false);
      resetManualForm();
      toast.success(`${template.attendee.singular} added manually.`);
    } catch (error) {
      const serverErrors = error.response?.data?.errors;
      if (serverErrors) {
        setManualErrors(serverErrors);
      }
      toast.error(error.response?.data?.error || `Failed to add ${template.attendee.singular.toLowerCase()}.`);
    } finally {
      setManualSubmitting(false);
    }
  };

  const saveStrictFingerprinting = async (enabled) => {
    if (!program || fingerprintSaving) return;

    setFingerprintSaving(true);
    try {
      const response = await updateStrictDeviceFingerprinting(id, enabled);
      setProgram(prev => prev ? {
        ...prev,
        strictDeviceFingerprinting: response.strictDeviceFingerprinting
      } : prev);
      setShowFingerprintWarning(false);
      toast.success(response.strictDeviceFingerprinting
        ? 'One check-in per phone is on.'
        : 'Guests can now check in more than once from the same phone.');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not change this setting. Try again.');
    } finally {
      setFingerprintSaving(false);
    }
  };

  const setManualField = (name, value) => {
    setManualFormData((prev) => ({ ...prev, [name]: value }));
    if (manualErrors[name]) setManualErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleStrictFingerprintingToggle = () => {
    if (fingerprintSaving) return;
    if (!program?.strictDeviceFingerprinting) {
      saveStrictFingerprinting(true);
      return;
    }
    setShowFingerprintWarning(true);
  };

  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTableModule = await import('jspdf-autotable');
      const { getCurrentChurch } = await import('../api/authService');
      const autoTable = autoTableModule.default || autoTableModule.autoTable;

      if (typeof autoTable !== 'function') {
        throw new Error('PDF table renderer is unavailable');
      }

      const church = await getCurrentChurch();
      const latestSponsorAnalytics = await getSponsorAnalytics(id).catch(() => sponsorAnalytics);
      const doc = new jsPDF('p', 'mm', 'a4');

      const orange = [232, 89, 12];
      const orangeSoft = [255, 244, 237];
      const dark = [7, 11, 26];
      const muted = [106, 113, 128];
      const border = [226, 229, 235];
      const generatedAt = new Date();
      const reportStats = program.trackingMode === 'count-only' ? countOnlyStats : collectDataStats;
      const dataFields = program.dataFields || {};
      const hasProxyGuests = attendees.some(attendee => Boolean(attendee.proxyHostFingerprint));
      const hasAttendanceModeData = attendees.some(attendee => Boolean(attendee.attendanceMode));
      const virtualCheckins = attendees.filter(attendee => attendee.attendanceMode === 'virtual').length;
      const winnersSelected = attendees.filter(attendee => attendee.isWinner).length;
      const sponsorCount = latestSponsorAnalytics?.sponsorCount || 0;
      const totalSponsorClicks = latestSponsorAnalytics?.totalClicks || 0;
      const topSponsor = latestSponsorAnalytics?.topSponsor;
      const hasSharedDeviceMetric = program.trackingMode === 'collect-data' && (program.strictDeviceFingerprinting === false || sharedDeviceCheckins > 0);

      const safeText = (value, fallback = '-') => {
        if (value === null || value === undefined || value === '') return fallback;
        return String(value);
      };

      const formatReportDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return safeText(dateString);
        return date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
      };

      const formatReportDateTime = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return safeText(dateString);
        return date.toLocaleString();
      };

      const sanitizeFileName = (value) => safeText(value, 'Ingather')
        .replace(/[\\/:*?"<>|]+/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 80);

      const pageWidth = () => doc.internal.pageSize.getWidth();
      const pageHeight = () => doc.internal.pageSize.getHeight();

      const setFont = (style = 'normal', size = 10, color = dark) => {
        doc.setFont('helvetica', style);
        doc.setFontSize(size);
        doc.setTextColor(...color);
      };

      const drawMetricCard = (x, y, width, height, label, value, helper, accent = orange) => {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...border);
        doc.setLineWidth(0.35);
        doc.roundedRect(x, y, width, height, 3, 3, 'FD');
        doc.setFillColor(...accent);
        doc.roundedRect(x + 4, y + 5, 3, height - 10, 1.5, 1.5, 'F');
        setFont('bold', 7.5, muted);
        doc.text(label.toUpperCase(), x + 10, y + 9);
        setFont('bold', 17, dark);
        doc.text(safeText(value), x + 10, y + 18);
        if (helper) {
          setFont('normal', 7.5, muted);
          doc.text(safeText(helper), x + 10, y + 25, { maxWidth: width - 14 });
        }
      };

      const drawSectionTitle = (title, subtitle, y) => {
        setFont('bold', 13, dark);
        doc.text(title, 14, y);
        if (subtitle) {
          setFont('normal', 8.5, muted);
          doc.text(subtitle, 14, y + 5);
        }
      };

      const metricCards = [
        { label: 'Total Attendance', value: totalScans.toLocaleString(), helper: program.isActive ? 'Live scans recorded' : 'Total scans recorded' }
      ];

      if (program.trackingMode === 'collect-data') {
        metricCards.push({ label: 'Forms Submitted', value: formsSubmitted.toLocaleString(), helper: `${template.attendee.plural} with form data` });
      }
      if (program.trackingMode === 'collect-data' && dataFields.firstTimer) {
        metricCards.push({ label: 'First Timers', value: reportStats.firstTimerCount.toLocaleString(), helper: 'New attendees identified', accent: [124, 58, 237] });
      }
      if (program.trackingMode === 'collect-data' && dataFields.sex) {
        metricCards.push({ label: 'Male Attendance', value: reportStats.maleCount.toLocaleString(), helper: 'Gender breakdown', accent: [37, 99, 235] });
        metricCards.push({ label: 'Female Attendance', value: reportStats.femaleCount.toLocaleString(), helper: 'Gender breakdown', accent: [219, 39, 119] });
      }
      if (program.giftingEnabled) {
        metricCards.push({ label: 'Winners Selected', value: `${winnersSelected}/${attendees.length}`, helper: 'Gifting allocation', accent: [245, 158, 11] });
        metricCards.push({ label: 'Winners Gifted', value: `${winnersGifted}/${winnersSelected || 0}`, helper: 'Gifts marked complete', accent: [22, 163, 74] });
      }
      if (sponsorCount > 0) {
        metricCards.push({ label: 'Sponsor Clicks', value: totalSponsorClicks.toLocaleString(), helper: topSponsor ? `Top: ${topSponsor.sponsorName}` : 'Tracked sponsor ROI', accent: orange });
      }
      if (hasSharedDeviceMetric) {
        metricCards.push({ label: 'Shared Devices', value: sharedDeviceCheckins.toLocaleString(), helper: 'Duplicate-device check-ins', accent: [14, 165, 233] });
      }
      if (hasAttendanceModeData && virtualCheckins > 0) {
        metricCards.push({ label: 'Virtual Check-ins', value: virtualCheckins.toLocaleString(), helper: 'Attendees checked in virtually', accent: [99, 102, 241] });
      }

      doc.setFillColor(...dark);
      doc.rect(0, 0, pageWidth(), 58, 'F');
      doc.setFillColor(...orange);
      doc.rect(0, 0, pageWidth(), 5, 'F');
      setFont('bold', 9, orange);
      doc.text('INGATHER EVENT INTELLIGENCE', 14, 17);
      setFont('bold', 24, [255, 255, 255]);
      doc.text('Post-Event Intelligence Report', 14, 29);
      setFont('normal', 9, [209, 213, 219]);
      doc.text(`Generated ${generatedAt.toLocaleString()}`, 14, 38);
      setFont('bold', 15, [255, 255, 255]);
      doc.text(safeText(program.title, template.event.singular), pageWidth() - 14, 24, { align: 'right', maxWidth: 72 });
      setFont('normal', 8.5, [209, 213, 219]);
      doc.text(`${formatReportDate(program.date)} | ${safeText(program.startTime)} - ${safeText(program.endTime)}`, pageWidth() - 14, 36, { align: 'right' });

      let yPos = 68;
      doc.setFillColor(249, 250, 251);
      doc.setDrawColor(...border);
      doc.roundedRect(14, yPos, pageWidth() - 28, 34, 4, 4, 'FD');
      setFont('bold', 8, orange);
      doc.text('WORKSPACE', 20, yPos + 9);
      setFont('bold', 12, dark);
      doc.text(safeText(church.churchName, churchData.name || template.organization.nameLabel), 20, yPos + 17, { maxWidth: 72 });
      setFont('normal', 8, muted);
      doc.text(`${template.organization.branchLabel}: ${safeText(church.branchName, churchData.branch)}`, 20, yPos + 24, { maxWidth: 76 });
      doc.text(`Email: ${safeText(church.email, churchData.email)}`, 108, yPos + 12, { maxWidth: 82 });
      doc.text(`Location: ${safeText(church.location)}`, 108, yPos + 20, { maxWidth: 82 });
      doc.text(`${template.event.titleLabel}: ${safeText(program.title)}`, 108, yPos + 28, { maxWidth: 82 });

      yPos += 48;
      drawSectionTitle('Executive Summary', 'Feature-aware metrics from this event.', yPos);
      yPos += 11;

      const cardGap = 5;
      const cardWidth = (pageWidth() - 28 - (cardGap * 2)) / 3;
      const cardHeight = 31;
      metricCards.forEach((card, index) => {
        const column = index % 3;
        const row = Math.floor(index / 3);
        drawMetricCard(
          14 + column * (cardWidth + cardGap),
          yPos + row * (cardHeight + 6),
          cardWidth,
          cardHeight,
          card.label,
          card.value,
          card.helper,
          card.accent || orange
        );
      });
      yPos += Math.ceil(metricCards.length / 3) * (cardHeight + 6) + 6;

      if (sponsorCount > 0) {
        drawSectionTitle('Sponsor ROI Snapshot', `Your sponsor links were clicked ${totalSponsorClicks.toLocaleString()} times.`, yPos);
        yPos += 10;
        doc.setFillColor(...orangeSoft);
        doc.setDrawColor(255, 210, 185);
        doc.roundedRect(14, yPos, pageWidth() - 28, 25, 4, 4, 'FD');
        setFont('bold', 10, dark);
        doc.text(topSponsor?.sponsorName ? `Top sponsor: ${topSponsor.sponsorName}` : 'Sponsor engagement tracked', 20, yPos + 10, { maxWidth: 92 });
        setFont('normal', 8.5, muted);
        doc.text(`${sponsorCount} active sponsor${sponsorCount === 1 ? '' : 's'} | ${safeText(latestSponsorAnalytics?.todayClicks || 0)} clicks today`, 20, yPos + 18);
        setFont('bold', 18, orange);
        doc.text(totalSponsorClicks.toLocaleString(), pageWidth() - 20, yPos + 14, { align: 'right' });
        setFont('normal', 8, muted);
        doc.text('total clicks', pageWidth() - 20, yPos + 21, { align: 'right' });
      }

      doc.addPage('a4', 'landscape');
      const tablePageWidth = pageWidth();
      let tableY = 18;
      setFont('bold', 16, dark);
      doc.text(`${template.attendee.singular} Data`, 14, tableY);
      setFont('normal', 8.5, muted);
      doc.text('Raw attendee records with dynamic columns based on enabled collection fields.', 14, tableY + 6);
      tableY += 14;

      const tableColumns = [];
      if (dataFields.fullName) tableColumns.push({ header: 'Name', value: attendee => safeText(attendee.fullName) });
      if (dataFields.emailAddress) tableColumns.push({ header: 'Email', value: attendee => safeText(attendee.emailAddress) });
      if (dataFields.school) tableColumns.push({ header: 'School', value: attendee => safeText(attendee.school) });
      if (dataFields.link) tableColumns.push({ header: 'Link', value: attendee => safeText(attendee.linkUrl) });
      if (dataFields.textarea) tableColumns.push({ header: program.dataFieldConfig?.textareaLabel || 'Additional Response', value: attendee => safeText(attendee.textareaResponse) });
      if (dataFields.phoneNumber) tableColumns.push({ header: 'Phone', value: attendee => safeText(attendee.phoneNumber) });
      if (dataFields.address) tableColumns.push({ header: 'Address', value: attendee => safeText(attendee.address) });
      if (dataFields.department) tableColumns.push({ header: 'Department', value: attendee => safeText(attendee.department) });
      if (dataFields.fellowship) tableColumns.push({ header: 'Group', value: attendee => safeText(attendee.fellowship) });
      if (dataFields.age) tableColumns.push({ header: 'Age', value: attendee => attendee.age ? `${attendee.age} Years` : '-' });
      if (dataFields.sex) tableColumns.push({ header: 'Gender', value: attendee => safeText(attendee.sex) });
      if (dataFields.firstTimer) tableColumns.push({ header: 'First Timer', value: attendee => attendee.firstTimer ? 'Yes' : 'No' });
      (program.customFormSchema || []).forEach(field => {
        tableColumns.push({
          header: field.label,
          value: attendee => safeText(formatCustomAnswer(attendee.customResponses?.[field.id]))
        });
      });
      if (program.giftingEnabled) {
        tableColumns.push({ header: 'Winner', value: attendee => attendee.isWinner ? 'Selected' : '-' });
        tableColumns.push({ header: 'Gifted', value: attendee => attendee.isWinner ? (attendee.isGifted ? 'Gifted' : 'Pending') : '-' });
      }
      if (hasProxyGuests) {
        tableColumns.push({ header: 'Entry Type', value: attendee => attendee.proxyHostFingerprint ? 'Proxy Guest' : 'Direct' });
      }
      if (hasAttendanceModeData) {
        tableColumns.push({ header: 'Attendance Mode', value: attendee => formatAttendanceMode(attendee.attendanceMode) });
      }
      tableColumns.push({ header: 'Registration Type', value: attendee => getAttendeeSourceLabel(attendee) });
      tableColumns.push({ header: 'Checked In At', value: attendee => formatReportDateTime(attendee.checkedInAt || attendee.scanTime) });

      const tableBody = attendees.length > 0
        ? attendees.map(attendee => tableColumns.map(column => column.value(attendee)))
        : [[`No ${template.attendee.plural.toLowerCase()} recorded yet.`].concat(Array(Math.max(tableColumns.length - 1, 0)).fill(''))];

      autoTable(doc, {
        startY: tableY,
        head: [tableColumns.map(column => column.header)],
        body: tableBody,
        margin: { left: 14, right: 14, bottom: 18 },
        theme: 'grid',
        tableWidth: tablePageWidth - 28,
        styles: {
          font: 'helvetica',
          fontSize: tableColumns.length > 9 ? 6.4 : 7.2,
          cellPadding: 2.2,
          overflow: 'linebreak',
          valign: 'middle',
          lineColor: border,
          lineWidth: 0.15,
          textColor: dark
        },
        headStyles: {
          fillColor: dark,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'left'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        bodyStyles: {
          fillColor: [255, 255, 255]
        },
        didParseCell: (data) => {
          if (data.section !== 'body') return;
          const raw = String(data.cell.raw || '');
          if (['Yes', 'Selected', 'Gifted'].includes(raw)) {
            data.cell.styles.textColor = [21, 128, 61];
            data.cell.styles.fontStyle = 'bold';
          } else if (raw === 'Pending') {
            data.cell.styles.textColor = orange;
            data.cell.styles.fontStyle = 'bold';
          } else if (raw === 'Proxy Guest') {
            data.cell.styles.textColor = [14, 116, 144];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });

      const totalPages = doc.internal.getNumberOfPages();
      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
        doc.setPage(pageNumber);
        const footerY = pageHeight() - 9;
        doc.setDrawColor(...border);
        doc.line(14, footerY - 6, pageWidth() - 14, footerY - 6);
        setFont('normal', 7.5, muted);
        doc.text('Ingather Post-Event Intelligence Report', 14, footerY);
        doc.text(`Generated ${generatedAt.toLocaleString()}`, pageWidth() / 2, footerY, { align: 'center' });
        doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth() - 14, footerY, { align: 'right' });
      }

      const fileName = `${sanitizeFileName(church.churchName || churchData.name)}-${sanitizeFileName(program.title)}-Intelligence-Report.pdf`;
      doc.save(fileName);
      toast.success('Post-event intelligence report exported successfully!');
    } catch (error) { toast.error('Failed to export PDF: ' + error.message); }
  };

  const shellProps = {
    active: 'events',
    crumb: program?.title || template.event.singular,
    church: boot?.church
      ? { name: boot.church.churchName, email: boot.church.email, logoUrl: boot.church.logoUrl }
      : churchData.name ? { name: churchData.name, email: churchData.email, logoUrl: churchData.logo } : null,
    counts: { preEvents: boot?.stats?.preEventCount || 0, events: boot?.stats?.totalProgramsAllTime || 0 },
    unreadCount: boot?.unreadCount || 0,
    live: boot?.stats?.live && String(boot.stats.live.id) !== String(id) ? boot.stats.live : null,
    template
  };

  if (loading || !program) {
    return (
      <IgDashShell {...shellProps}>
        <div className="ig-db-page ig-ed">
          {loading ? (
            <div aria-busy="true" aria-label={`Loading ${template.event.singular.toLowerCase()}`} className="ig-ed-loading">
              <div className="ig-db-skel is-head" />
              <div className="ig-ed-row3">{[0, 1, 2].map((i) => <div key={i} className="ig-db-skel is-stat" />)}</div>
              <div className="ig-ed-skel-row"><div className="ig-db-skel is-chart" /><div className="ig-db-skel is-chart is-narrow" /></div>
            </div>
          ) : (
            <div className="ig-db-card ig-db-error" role="alert">
              <strong>We couldn't find this {template.event.singular.toLowerCase()}</strong>
              <span>It may have been deleted, or the link is wrong. Go back to see your other {template.event.plural?.toLowerCase?.() || 'events'}.</span>
              <Link to="/programs" className="ig-db-btn-ghost">Back to {template.event.all}</Link>
            </div>
          )}
        </div>
      </IgDashShell>
    );
  }

  /* ---------- Derived values ---------- */
  const phase = eventPhase(program, now);
  const live = phase === 'live';
  const ended = phase === 'ended';
  const upcoming = phase === 'upcoming';
  const isCollect = program.trackingMode !== 'count-only';
  const stats = isCollect ? collectDataStats : countOnlyStats;
  const hasCheckins = totalScans > 0;
  const eventWord = template.event.singular;
  const eventWordLower = eventWord.toLowerCase();
  const guestsWord = template.attendee.plural.toLowerCase();

  const getAttendeeRegistrationType = registrationTypeOf;
  const attendeeSourceCounts = attendees.reduce((counts, attendee) => {
    const type = getAttendeeRegistrationType(attendee);
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {});
  const attendanceModeCounts = attendees.reduce((counts, attendee) => {
    const mode = attendee.attendanceMode || 'physical';
    counts[mode] = (counts[mode] || 0) + 1;
    return counts;
  }, {});
  const hasAttendanceModeData = attendees.some((attendee) => Boolean(attendee.attendanceMode));
  const inPersonCount = attendanceModeCounts.physical || 0;
  const onlineCount = attendanceModeCounts.virtual || 0;
  const winnersCount = attendees.filter((a) => a.isWinner).length;
  const filteredAttendees = attendees.filter((attendee) => {
    const matchesFilter = attendeeFilter === 'all' || getAttendeeRegistrationType(attendee) === attendeeFilter;
    const matchesAttendanceMode = attendanceModeFilter === 'all' || (attendee.attendanceMode || 'physical') === attendanceModeFilter;
    const customSearchValues = Object.values(attendee.customResponses || {}).flatMap((value) => (Array.isArray(value) ? value : [value]));
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query
      || [attendee.fullName, attendee.emailAddress, attendee.phoneNumber, attendee.fellowship, attendee.school, attendee.department, attendee.linkUrl, attendee.textareaResponse, SOURCE_LABEL[getAttendeeRegistrationType(attendee)], ...customSearchValues]
        .some((value) => String(value || '').toLowerCase().includes(query));
    return matchesFilter && matchesAttendanceMode && matchesSearch;
  });

  const openGuest = guestId !== null ? attendees.find((a) => a.id === guestId) || null : null;
  const closeGuest = () => setGuestId(null);
  const downloadExport = async (format, scope) => {
    if (format === 'pdf') {
      setExportBusy(true);
      try { await handleExportPDF(); } finally { setExportBusy(false); }
      setExportOpen(false);
      return;
    }
    const list = scope === 'filter' ? filteredAttendees : attendees;
    try {
      downloadText(buildAttendeeCsv(program, list), `${safeFileName(program.title)}-${safeFileName(template.attendee.plural).toLowerCase()}.csv`, 'text/csv;charset=utf-8');
      setExportOpen(false);
      toast.success(`${plural(list.length, template.attendee.singular.toLowerCase(), template.attendee.plural.toLowerCase())} exported.`);
    } catch (error) {
      toast.error('Could not create the file. Try again.');
    }
  };

  const start = eventStart(program);
  const countdown = upcoming && start ? countdownParts(start.getTime() - now) : null;
  const statusText = upcoming
    ? startsLabel(program, now)
    : live ? (hasCheckins ? 'Live, accepting check-ins' : 'Live, waiting for first check-in') : 'Ended';
  const liveTagText = upcoming ? 'Not started' : live ? 'Live' : 'Final';
  const hasSponsors = (sponsorAnalytics?.sponsorCount || 0) > 0;
  const showLinkedScanner = isCollect && program.linkedPreEventCount > 0;

  const totalCard = (
    <div className="ig-ed-total">
      <div className="ig-ed-stat-head">
        <span className="ig-ed-stat-icon is-orange-solid">{Icon.people}</span>
        <span className="ig-ed-stat-label">Total Attendance</span>
        <span className={`ig-ed-live-tag is-${phase}`}><span aria-hidden="true" />{liveTagText}</span>
      </div>
      <div className="ig-ed-stat-num"><strong>{formatNumber(totalScans)}</strong><span>{live ? 'live scans' : 'total scans'}</span></div>
      {hasCheckins
        ? <Sparkline data={attendanceData} />
        : <span className="ig-ed-total-wait">{upcoming ? 'Early arrivals count here' : live ? 'Waiting for the first scan' : 'No one checked in'}</span>}
    </div>
  );

  const infoProps = { openId: infoOpen, setOpenId: setInfoOpen };
  const featureCards = [];
  if (isCollect && program.dataFields?.sex) {
    const genderTotal = stats.maleCount + stats.femaleCount;
    featureCards.push(
      <div className="ig-ed-feature" key="gender">
        <div className="ig-ed-stat-head"><span className="ig-ed-stat-icon is-pink">{Icon.person}</span><span className="ig-ed-stat-label">Gender</span></div>
        <div className="ig-ed-pair">
          <div className="is-male"><span>{Icon.male}Male</span><span><strong>{formatNumber(stats.maleCount)}</strong><span>{percentOf(stats.maleCount, genderTotal)}</span></span></div>
          <div className="is-female"><span>{Icon.female}Female</span><span><strong>{formatNumber(stats.femaleCount)}</strong><span>{percentOf(stats.femaleCount, genderTotal)}</span></span></div>
        </div>
      </div>
    );
  }
  if (isCollect && program.giftingEnabled) {
    featureCards.push(
      <div className="ig-ed-feature" key="gifting">
        <div className="ig-ed-stat-head"><span className="ig-ed-stat-icon is-gold">{Icon.gift}</span><span className="ig-ed-stat-label">Gifting</span></div>
        <div className="ig-ed-pair">
          <div><span>Winners</span><span><strong>{formatNumber(winnersCount)}</strong><span>{winnersCount > 0 || formsSubmitted > 0 ? `of ${formatNumber(formsSubmitted)}` : 'picked from forms'}</span></span></div>
          <div><span>Gifted</span><span><strong>{formatNumber(winnersGifted)}</strong><span>{winnersCount > 0 ? `of ${formatNumber(winnersCount)}` : 'handed out'}</span></span></div>
        </div>
      </div>
    );
  }
  if (isCollect) {
    featureCards.push(
      <div className="ig-ed-feature" key="shared">
        <div className="ig-ed-stat-head"><span className="ig-ed-stat-icon is-red">{Icon.phone}</span><span className="ig-ed-stat-label">Shared phones</span></div>
        <div className="ig-ed-pair is-one">
          <div><span>Phone used twice</span><span><strong>{formatNumber(sharedDeviceCheckins)}</strong><span>{sharedDeviceCheckins === 1 ? 'guest' : 'guests'}</span></span></div>
        </div>
      </div>
    );
  }
  if (isCollect && hasAttendanceModeData) {
    featureCards.push(
      <div className="ig-ed-feature" key="mode">
        <div className="ig-ed-stat-head"><span className="ig-ed-stat-icon is-teal">{Icon.screen}</span><span className="ig-ed-stat-label">Attendance mode</span></div>
        <div className="ig-ed-pair">
          <div><span>In person</span><span><strong>{formatNumber(inPersonCount)}</strong><span className={inPersonCount >= onlineCount && inPersonCount > 0 ? 'is-up' : ''}>{inPersonCount >= onlineCount && inPersonCount > 0 && Icon.up}{percentOf(inPersonCount, attendees.length)}</span></span></div>
          <div><span>Online</span><span><strong>{formatNumber(onlineCount)}</strong><span>{percentOf(onlineCount, attendees.length)}</span></span></div>
        </div>
      </div>
    );
  }

  const qrCard = (
    <section className={`ig-db-card ig-ed-qr${ended ? ' is-ended' : ''}`} aria-label="Check-in QR code">
      <span className="ig-db-card-title"><strong>Check-in QR Code</strong><span>Put this at your entrance or check-in desk</span></span>
      <div className="ig-ed-qr-frame">
        <div className="ig-ed-qr-code">
          <React.Suspense fallback={<div className="ig-ed-qr-wait" aria-hidden="true" />}>
            <QRCodeCanvas id="qr-code-canvas" value={program.qrCodeUrl} size={200} level="H" includeMargin={false} />
          </React.Suspense>
        </div>
        {ended && <span className="ig-ed-qr-closed">Scanning closed</span>}
      </div>
      <div className="ig-ed-qr-name"><strong>{program.title}</strong><span>Scan to check in</span></div>
      <div className="ig-ed-qr-link">
        <span title={program.qrCodeUrl}>{shortLink(program.qrCodeUrl)}</span>
        <button type="button" className="ig-db-round-btn is-xs is-line" aria-label="Copy check-in link" onClick={copyCheckinLink}>{Icon.copy}</button>
      </div>
      <div className="ig-ed-qr-actions">
        <button type="button" className="ig-db-btn-ink" onClick={handleDownloadQR}>{Icon.download}Download</button>
        <button type="button" className="ig-db-btn-ghost" onClick={handlePrintQR}>{Icon.print}Print</button>
      </div>
      <span className={`ig-ed-qr-status is-${phase}`}><span aria-hidden="true" />{upcoming ? 'QR code ready, guests can check in now' : live ? 'QR code active, accepting scans' : 'QR code disabled'}</span>
    </section>
  );

  const menu = (
    <span className="ig-ed-more" ref={moreRef}>
      <button type="button" className={`ig-ed-more-btn${moreOpen ? ' is-open' : ''}`} aria-label="More actions" aria-haspopup="menu" aria-expanded={moreOpen} onClick={() => setMoreOpen((v) => !v)}>{Icon.more}</button>
      {moreOpen && (
        <div className="ig-ed-menu" role="menu" aria-label={`${eventWord} actions`}>
          <Link role="menuitem" to={`/program/${program.id}/edit`} onClick={() => setMoreOpen(false)}>{Icon.pencil}Edit {eventWordLower}</Link>
          <button type="button" role="menuitem" onClick={copyCheckinLink}>{Icon.copy}Copy check-in link</button>
          <button type="button" role="menuitem" onClick={() => { setMoreOpen(false); handleDownloadQR(); }}>{Icon.download}Download QR code</button>
          {!ended && (compact || upcoming) && (
            <>
              <span className="ig-ed-menu-rule" />
              <button type="button" role="menuitem" onClick={() => { setMoreOpen(false); setDialog('end'); }}>{Icon.stop}End {eventWordLower}</button>
            </>
          )}
          <span className="ig-ed-menu-rule" />
          <button type="button" role="menuitem" className="is-danger" onClick={() => { setMoreOpen(false); setDialog('delete'); }}>{DashIcon.trash}Delete {eventWordLower}</button>
        </div>
      )}
    </span>
  );

  const sourceTag = (attendee) => {
    const type = getAttendeeRegistrationType(attendee);
    return <span className={`ig-ed-src is-${type}`}>{SOURCE_LABEL[type] || 'Walk-In'}</span>;
  };

  const giftCell = (attendee) => {
    if (!attendee.isWinner) return <span className="ig-ed-gift-no">No</span>;
    if (attendee.isGifted) return <span className="ig-ed-gift is-done">Gifted</span>;
    return <button type="button" className="ig-ed-gift" onClick={() => setGiftTarget(attendee)}>Mark gifted</button>;
  };

  const emptyTable = (
    <div className="ig-ed-empty">
      <span className="ig-ed-empty-icon">{Icon.scan}</span>
      <strong>{upcoming ? 'No one has checked in yet' : ended ? `No one checked in at this ${eventWordLower}` : 'No check-ins yet'}</strong>
      <span>
        {upcoming
          ? `Guests can check in as soon as they arrive, even before ${formatTime(program.startTime)}.${isCollect ? ' You can also add someone manually.' : ''}`
          : ended ? 'The QR code is closed now.' : 'The QR code is live. The first guest to scan will show up here straight away.'}
      </span>
      {!ended && isCollect && (
        <span className="ig-ed-empty-actions">
          {showLinkedScanner && <button type="button" className="ig-db-btn-ink" onClick={openRsvpScannerLink} disabled={rsvpScannerLinkLoading}>Open Scanner</button>}
          <button type="button" className="ig-db-btn-ghost" onClick={openManualModal}>Add Manually</button>
        </span>
      )}
    </div>
  );

  const showMode = hasAttendanceModeData;
  const showGift = Boolean(program.giftingEnabled);
  const showEmail = Boolean(program.dataFields?.emailAddress);
  const showGroup = Boolean(program.dataFields?.fellowship);

  return (
    <IgDashShell {...shellProps}>
      <div className="ig-db-page ig-ed">
        {/* ---------- Header ---------- */}
        <div className="ig-ed-head">
          <div className="ig-ed-head-text">
            <div className="ig-ed-back-row">
              <Link to="/programs" className="ig-pd-back">{Icon.back}{template.event.all}</Link>
              {compact && menu}
            </div>
            <div className="ig-ed-title-row">
              <h1>{program.title}</h1>
              <span className={`ig-ed-status is-${phase}`}><span aria-hidden="true" />{statusText}</span>
            </div>
            <div className="ig-ed-chips">
              <span>{DashIcon.calendar}{fullDate(program.date) ? `${weekdayShortDate(program.date).split(',')[0]}, ${fullDate(program.date)}` : ''}</span>
              <span>{DashIcon.clock}{formatTimeRange(program.startTime, program.endTime)}</span>
              <span>{isCollect ? 'Collects guest details' : 'Count only'}</span>
              {!ended && autoEndAt(program) && (
                <span title={`Check-in closes and the link stops working ${AUTO_END_HOURS} hours after the end time.`}>Closes automatically {autoEndLabel(autoEndAt(program))}</span>
              )}
            </div>
          </div>
          <div className="ig-ed-head-actions">
            {live && !compact && <button type="button" className="ig-ed-end" onClick={() => setDialog('end')}>End {eventWord}</button>}
            {ended && <button type="button" className="ig-db-btn-primary ig-ed-report" onClick={handleExportPDF}>{Icon.upload}Export Report (PDF)</button>}
            {!compact && menu}
          </div>
        </div>

        {upcoming && countdown && (
          <section className="ig-ed-soon" aria-label={`Before the ${eventWordLower}`}>
            <span className="ig-ed-soon-icon">{Icon.clock}</span>
            <span className="ig-ed-soon-text">
              <strong>Starts at {formatTime(program.startTime)}, in {countdownWords(countdown)}</strong>
              <span>Your QR code already works, so early arrivals can check in before the start time. Print it or put it on a screen at the entrance{showLinkedScanner ? ', and share the scanner link with your ushers' : ''}.</span>
            </span>
            <span className="ig-ed-soon-count" aria-hidden="true">
              {countdown.days > 0 ? (
                <>
                  <span><strong>{String(countdown.days).padStart(2, '0')}</strong><span>{countdown.days === 1 ? 'day' : 'days'}</span></span>
                  <span><strong>{String(countdown.hours).padStart(2, '0')}</strong><span>hours</span></span>
                </>
              ) : (
                <>
                  <span><strong>{String(countdown.hours).padStart(2, '0')}</strong><span>hours</span></span>
                  <span><strong>{String(countdown.minutes).padStart(2, '0')}</strong><span>minutes</span></span>
                </>
              )}
            </span>
          </section>
        )}

        {/* ---------- Numbers ---------- */}
        {isCollect ? (
          <>
            <div className={`ig-ed-row3${program.dataFields?.firstTimer ? '' : ' is-two'}`}>
              {totalCard}
              <StatCard
                icon={Icon.form}
                tone="blue"
                label="Form Submitted"
                value={formsSubmitted}
                sub={formsSubmitted > 0 ? `${percentOf(formsSubmitted, totalScans)} of check-ins` : 'none yet'}
                info={<InfoButton id="form" title="Form Submitted" text={`${template.attendee.plural} who filled in your check-in form, plus anyone you added manually or scanned in from an RSVP pass.`} {...infoProps} />}
              />
              {program.dataFields?.firstTimer && (
                <StatCard
                  icon={Icon.firstTimer}
                  tone="peach"
                  label="First Timer"
                  value={stats.firstTimerCount}
                  sub={stats.firstTimerCount > 0 ? `${percentOf(stats.firstTimerCount, formsSubmitted)} of forms` : 'none yet'}
                  info={<InfoButton id="first" title="First Timer" text={`${template.attendee.plural} who ticked "first-timer" on the check-in form. A good list for a welcome message after the ${eventWordLower}.`} {...infoProps} />}
                />
              )}
            </div>
            {featureCards.length > 0 && <div className={`ig-ed-features is-${featureCards.length}`}>{featureCards}</div>}
          </>
        ) : (
          <div className="ig-ed-row4">
            {totalCard}
            <StatCard icon={Icon.male} tone="ink" label="Male" value={stats.maleCount} sub={percentOf(stats.maleCount, totalScans)}
              info={<InfoButton id="male" title="Male" text={`${template.attendee.plural} who chose Male on the quick check-in. Anyone who skipped the question is left out.`} {...infoProps} />} />
            <StatCard icon={Icon.female} tone="peach" label="Female" value={stats.femaleCount} sub={percentOf(stats.femaleCount, totalScans)}
              info={<InfoButton id="female" title="Female" text={`${template.attendee.plural} who chose Female on the quick check-in. Anyone who skipped the question is left out.`} {...infoProps} />} />
            <StatCard icon={Icon.firstTimer} tone="peach" label="First Timer" value={stats.firstTimerCount} sub={percentOf(stats.firstTimerCount, totalScans)}
              info={<InfoButton id="first" title="First Timer" text={`${template.attendee.plural} who said this is their first time. A good number to watch from one ${eventWordLower} to the next.`} {...infoProps} />} />
          </div>
        )}

        {/* ---------- Chart, sponsors, QR ---------- */}
        <div className="ig-ed-middle">
          <div className="ig-ed-middle-main">
            <AttendanceChart data={attendanceData} phase={phase} compact={compact} key={compact ? 'c' : 'w'} />
            {hasSponsors && <SponsorCard analytics={sponsorAnalytics} phase={phase} />}
          </div>
          {qrCard}
        </div>

        {/* ---------- One check-in per phone ---------- */}
        {isCollect && (
          <section className="ig-db-card ig-ed-rule" aria-label={`Live ${eventWordLower} settings`}>
            <span className="ig-ed-rule-text">
              <strong>One check-in per phone</strong>
              <span>Stops the same phone from checking in twice for this {eventWordLower}. Turn it off if families share one phone at the door.</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(program.strictDeviceFingerprinting)}
              aria-label="One check-in per phone"
              className="ig-ed-rule-switch"
              onClick={handleStrictFingerprintingToggle}
              disabled={fingerprintSaving || ended}
            >
              {program.strictDeviceFingerprinting ? 'On' : 'Off'}
              <span className={`ig-db-switch${program.strictDeviceFingerprinting ? ' is-on' : ''}`}><span /></span>
            </button>
          </section>
        )}

        {/* ---------- Attendees ---------- */}
        <section className="ig-db-card ig-ed-people" aria-label={`${template.attendee.singular} data`}>
          <div className="ig-ed-people-head">
            <span className="ig-db-card-title">
              <strong>{template.attendee.singular} Data</strong>
              <span>{isCollect ? 'People who submitted the check-in form' : 'People who completed the quick check-in'}</span>
            </span>
            {isCollect && (
              <span className="ig-ed-people-actions">
                {showLinkedScanner && (
                  <>
                    <button type="button" className="ig-st-pill" onClick={copyRsvpScannerLink} disabled={ended || rsvpScannerLinkLoading}>{Icon.copy}{rsvpScannerLinkLoading ? 'Preparing…' : 'RSVP Scanner Link'}</button>
                    <button type="button" className="ig-st-pill" onClick={openRsvpScannerLink} disabled={ended || rsvpScannerLinkLoading}>{Icon.scan}Open Scanner</button>
                  </>
                )}
                <button type="button" className="ig-st-pill" onClick={openManualModal} disabled={ended}>{DashIcon.plus}Add Manually</button>
                <button type="button" className="ig-db-btn-ink ig-ed-export" onClick={() => setExportOpen(true)}>{Icon.upload}Export Data</button>
              </span>
            )}
          </div>

          {isCollect ? (
            <>
              <div className="ig-ed-tools">
                <label className="ig-ed-search">
                  {Icon.search}
                  <input type="search" placeholder={`Search ${guestsWord}`} aria-label={`Search ${guestsWord}`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </label>
                <div className="ig-ed-seg" role="group" aria-label="Filter by how they checked in">
                  {ATTENDEE_SOURCES.map(([key, label]) => (
                    <button key={key} type="button" aria-pressed={attendeeFilter === key} className={attendeeFilter === key ? 'is-on' : ''} onClick={() => setAttendeeFilter(key)}>
                      {label}<span>{formatNumber(key === 'all' ? attendees.length : attendeeSourceCounts[key] || 0)}</span>
                    </button>
                  ))}
                </div>
                {hasAttendanceModeData && (
                  <div className="ig-ed-seg" role="group" aria-label="Filter by attendance mode">
                    {[['all', 'All modes'], ['physical', 'In person'], ['virtual', 'Online']].map(([key, label]) => (
                      <button key={key} type="button" aria-pressed={attendanceModeFilter === key} className={attendanceModeFilter === key ? 'is-on' : ''} onClick={() => setAttendanceModeFilter(key)}>
                        {label}<span>{formatNumber(key === 'all' ? attendees.length : attendanceModeCounts[key] || 0)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {attendees.length === 0 ? emptyTable : filteredAttendees.length === 0 ? (
                <div className="ig-ed-empty is-small">
                  <strong>No {guestsWord} match</strong>
                  <span>Try another name or clear the filter.</span>
                </div>
              ) : (
                <div className="ig-ed-table-wrap">
                  <table className="ig-ed-table">
                    <thead>
                      <tr>
                        <th scope="col">Name</th>
                        {showEmail && <th scope="col">Email</th>}
                        {showGroup && <th scope="col">Group</th>}
                        {showMode && <th scope="col">Mode</th>}
                        {showGift && <th scope="col">Gift</th>}
                        <th scope="col">Checked in</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAttendees.map((attendee) => (
                        <tr key={attendee.id} className={`ig-ed-row${guestId === attendee.id ? ' is-open' : ''}`} onClick={(event) => { if (!event.target.closest('button, a')) setGuestId(attendee.id); }}>
                          <td>
                            <button type="button" className="ig-ed-person" onClick={() => setGuestId(attendee.id)} aria-label={`See details for ${attendee.fullName || attendee.emailAddress || 'this guest'}`}>
                              <span className="ig-ed-avatar" aria-hidden="true">{initialsOf(attendee.fullName || attendee.emailAddress || '?')}</span>
                              <span className="ig-ed-person-text"><strong>{attendee.fullName || 'No name given'}</strong>{sourceTag(attendee)}</span>
                            </button>
                          </td>
                          {showEmail && <td className="ig-ed-cell-muted ig-ed-hide-sm" data-label="Email">{attendee.emailAddress || '-'}</td>}
                          {showGroup && <td className="ig-ed-hide-sm" data-label="Group">{attendee.fellowship || '-'}</td>}
                          {showMode && <td className="ig-ed-hide-sm" data-label="Mode"><span className={`ig-ed-mode${attendee.attendanceMode === 'virtual' ? ' is-online' : ''}`}>{attendee.attendanceMode === 'virtual' ? 'Online' : 'In person'}</span></td>}
                          {showGift && <td data-label="Gift">{giftCell(attendee)}</td>}
                          <td className="ig-ed-cell-muted" data-label="Checked in">{clockTime(attendee.checkedInAt || attendee.scanTime)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : countOnlyScans.length === 0 ? emptyTable : (
            <div className="ig-ed-table-wrap">
              <table className="ig-ed-table is-count">
                <thead><tr><th scope="col">Gender</th><th scope="col">First timer</th><th scope="col">Checked in</th></tr></thead>
                <tbody>
                  {countOnlyScans.map((scan) => (
                    <tr key={scan.id}>
                      <td><strong>{scan.gender ? scan.gender.charAt(0).toUpperCase() + scan.gender.slice(1) : '-'}</strong></td>
                      <td data-label="First timer">{scan.firstTimer ? <span className="ig-ed-yes">Yes</span> : <span className="ig-ed-cell-muted">No</span>}</td>
                      <td className="ig-ed-cell-muted" data-label="Checked in">{clockTime(scan.scanTime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {showManualModal && isCollect && (
        <ManualModal
          program={program}
          template={template}
          formData={manualFormData}
          errors={manualErrors}
          submitting={manualSubmitting}
          onField={setManualField}
          onCustom={handleManualCustomChange}
          onClose={closeManualModal}
          onSubmit={handleManualSubmit}
        />
      )}

      {openGuest && (
        <GuestPanel attendee={openGuest} program={program} onClose={closeGuest} onMarkGifted={setGiftTarget} />
      )}

      {exportOpen && (
        <ExportModal
          program={program}
          template={template}
          allCount={attendees.length}
          filteredCount={filteredAttendees.length}
          filterLabel={[
            attendeeFilter !== 'all' ? SOURCE_LABEL[attendeeFilter] : '',
            attendanceModeFilter !== 'all' ? (attendanceModeFilter === 'virtual' ? 'Online' : 'In person') : '',
            searchQuery.trim() ? `"${searchQuery.trim()}"` : ''
          ].filter(Boolean).join(', ') || 'All'}
          busy={exportBusy}
          onClose={() => { if (!exportBusy) setExportOpen(false); }}
          onDownload={downloadExport}
        />
      )}

      {showFingerprintWarning && (
        <DashDialog
          icon={Icon.phone}
          title="Turn off one check-in per phone?"
          cancelLabel="Cancel"
          confirmLabel="Turn it off"
          busy={fingerprintSaving}
          onCancel={() => { if (!fingerprintSaving) setShowFingerprintWarning(false); }}
          onConfirm={() => saveStrictFingerprinting(false)}
        >
          Allowing multiple scans from the same device can help attendees with poor network connections, but it risks skewing your total attendance metrics with duplicate entries.
        </DashDialog>
      )}

      {dialog === 'end' && (
        <DashDialog
          icon={Icon.stop}
          tone="danger"
          title={`End ${program.title}?`}
          cancelLabel="Keep it running"
          confirmLabel={`End ${eventWordLower}`}
          busy={dialogBusy}
          onCancel={() => { if (!dialogBusy) setDialog(null); }}
          onConfirm={endEvent}
        >
          The check-in QR code stops working and no one else can check in. Your {plural(totalScans, 'check-in', 'check-ins')} and the report stay saved.
        </DashDialog>
      )}

      {dialog === 'delete' && (
        <DashDialog
          icon={DashIcon.trash}
          tone="danger"
          title={`Delete ${program.title}?`}
          cancelLabel={`Keep ${eventWordLower}`}
          confirmLabel={`Delete ${eventWordLower}`}
          busy={dialogBusy}
          onCancel={() => { if (!dialogBusy) setDialog(null); }}
          onConfirm={removeEvent}
        >
          {hasCheckins
            ? `This removes the ${eventWordLower}, its QR code and all ${plural(totalScans, 'check-in', 'check-ins')}. Export your data first if you need it. This can't be undone.`
            : `This removes the ${eventWordLower} and its QR code. This can't be undone.`}
          {!ended && (
            <span className="ig-ed-dialog-warn">{Icon.warn}{upcoming ? `Anyone who already has the QR code won't be able to check in.` : `This ${eventWordLower} is live. Guests scanning the QR code right now won't be able to check in.`}</span>
          )}
        </DashDialog>
      )}

      {giftTarget && (
        <DashDialog
          icon={Icon.gift}
          tone="primary"
          title={`Mark ${giftTarget.fullName || 'this winner'} as gifted?`}
          cancelLabel="Not yet"
          confirmLabel="Mark gifted"
          busy={dialogBusy}
          onCancel={() => { if (!dialogBusy) setGiftTarget(null); }}
          onConfirm={confirmGifted}
        >
          Do this once you have handed over the gift. It can't be changed later.
        </DashDialog>
      )}
    </IgDashShell>
  );
}

export default ProgramDetail;
