import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  addManualPreEventRsvp,
  getPreEvent,
  importPreEventRsvps,
  resendRsvpQrEmail,
  sendImportedRsvpQrBatch,
  updatePreEvent
} from '../api/preEventService';
import { getDashboardBootstrap, getPrograms } from '../api/programService';
import IgDashShell, { DashIcon, DashDialog } from '../components/IgDashShell';
import IgQuestionModal from '../components/IgQuestionModal';
import IgImportModal from '../components/IgImportModal';
import { useToast } from '../components/Toast';
import { useEventTemplate } from '../context/EventTemplateContext';
import { MAX_CUSTOM_FIELDS, formatCustomAnswer } from '../utils/customFields';
import { COMMUNITY_PLATFORMS, createCommunityLink, isValidCommunityUrl } from '../utils/communityLinks';
import { formatNumber, initialsOf, isSafeImageUrl, localToday } from '../utils/dashboardFormat';
import { compressFlyerImage, fileToDataUrl } from '../utils/flyerCompression';

/* ---------------- Constants and helpers ---------------- */

const FIELD_LABELS = {
  emailAddress: 'Email Address',
  fullName: 'Full Name',
  phoneNumber: 'Phone Number',
  school: 'School',
  link: 'Link',
  textarea: 'Additional Response',
  organization: 'Organization',
  ticketType: 'Ticket Type',
  address: 'Address',
  firstTimer: 'First-Timer',
  department: 'Department',
  fellowship: 'Group',
  age: 'Age',
  sex: 'Gender'
};

const OPTIONAL_FIELDS = ['fullName', 'phoneNumber', 'school', 'link', 'textarea', 'organization', 'ticketType', 'address', 'firstTimer', 'department', 'fellowship', 'age', 'sex'];
// Shown as their own columns in the guest table; everything else gets an extra column only when used.
const CORE_COLUMNS = ['fullName', 'emailAddress', 'phoneNumber'];
const PAGE_SIZE = 10;
const QR_EMAIL_BATCH_LIMIT = 50;
const DEFAULT_QR_EMAIL_QUOTA = { limit: 500, used: 0, remaining: 500, timezone: 'Africa/Lagos', resetsAt: null };

const FIELD_PLACEHOLDERS = {
  emailAddress: 'name@example.com',
  fullName: 'Their full name',
  phoneNumber: '+234 800 000 0000',
  school: 'School',
  link: 'https://…',
  textarea: 'Write their response',
  organization: 'Organization, company, or group',
  ticketType: 'General, VIP, Student…',
  address: 'Address',
  department: 'Department',
  fellowship: 'Group',
  age: 'Age'
};

const SOURCE_LABELS = { public: 'RSVP page', import: 'Uploaded', manual: 'Added by hand' };

const usesQrEmailQuota = (rsvp) => rsvp?.registrationSource !== 'public';

// Enabled fields are required unless the host marked them optional; email is always required.
const isRsvpFieldRequired = (rsvpFields, rsvpFieldConfig, field) => {
  if (field === 'emailAddress') return true;
  if (field === 'firstTimer') return false;
  return Boolean(rsvpFields?.[field]) && rsvpFieldConfig?.requiredFields?.[field] !== false;
};

const hasRsvpFieldValue = (rsvp, field) => {
  if (field === 'firstTimer') return rsvp.firstTimer === true;
  if (field === 'link') return Boolean(rsvp.linkUrl);
  if (field === 'textarea') return Boolean(rsvp.textareaResponse);
  if (field === 'age') return rsvp.age !== null && rsvp.age !== undefined && rsvp.age !== '';
  return Boolean(rsvp[field]);
};

const isValidEmail = (value) => {
  const email = String(value || '').trim();
  return email.length > 0 && email.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.indexOf('@') === email.lastIndexOf('@');
};

const isValidHttpUrl = (value) => {
  try {
    const url = new URL(String(value || '').trim());
    return ['http:', 'https:'].includes(url.protocol);
  } catch (error) {
    return false;
  }
};

const isFutureDiscoverDate = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return false;
  return date.getTime() >= Date.now() - (12 * 60 * 60 * 1000);
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const clock = (d) => `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;

// "Sat, 14 Nov 2026, 9:00 AM"
// RSVPs always stop 12 hours after the start; organizers may choose an earlier time.
const RSVP_GRACE_MS = 12 * 60 * 60 * 1000;
const pad2 = (n) => String(n).padStart(2, '0');
const toLocalInput = (value) => {
  const d = value instanceof Date ? value : new Date(value);
  if (!value || Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

const formatEventWhen = (value) => {
  const d = new Date(value);
  if (!value || Number.isNaN(d.getTime())) return 'Date not set';
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${clock(d)}`;
};

const formatShort = (value) => {
  const d = new Date(value);
  if (!value || Number.isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${clock(d)}`;
};

const formatCheckedIn = (value, eventDay) => {
  const d = new Date(value);
  if (!value || Number.isNaN(d.getTime())) return '-';
  return eventDay ? clock(d) : formatShort(value);
};

const sameLocalDay = (value, todayKey) => {
  const d = new Date(value);
  if (!value || Number.isNaN(d.getTime())) return false;
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return key === todayKey;
};

const shortLink = (url) => String(url || '').replace(/^https?:\/\//i, '').replace(/\/$/, '');

const dayLabel = (dateKey) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ''));
  if (!m) return '';
  return String(Number(m[3]));
};
const bestDayLabel = (dateKey) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ''));
  if (!m) return '';
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};

const niceMax = (value) => {
  if (value <= 0) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const s of [1, 2, 2.5, 4, 5, 8, 10]) if (s * magnitude >= value) return s * magnitude;
  return 10 * magnitude;
};

const plural = (n, one, many) => `${formatNumber(n)} ${n === 1 ? one : many}`;

/* ---------------- Small pieces ---------------- */

const Icon = {
  back: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 4L6 8l4 4" /></svg>,
  calendar: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>,
  pin: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-12a7 7 0 0114 0c0 5.8-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></svg>,
  copy: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 012-2h10" /></svg>,
  external: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" /></svg>,
  pause: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>,
  lock: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>,
  pencil: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z" /></svg>,
  upload: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 14v5h14v-5" /></svg>,
  mail: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 8l9 6 9-6" /></svg>,
  search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>,
  ticket: <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9a2 2 0 002-2V6a1 1 0 011-1h12a1 1 0 011 1v1a2 2 0 000 4v1a2 2 0 000 4v1a1 1 0 01-1 1H6a1 1 0 01-1-1v-1a2 2 0 00-2-2" /><path d="M10 5v14" strokeDasharray="2 2" /></svg>
};

function Switch({ id, checked, onChange, title, description }) {
  return (
    <button type="button" role="switch" id={id} aria-checked={checked} className={`ig-pd-toggle${checked ? ' is-on' : ''}`} onClick={() => onChange(!checked)}>
      <span><strong>{title}</strong><span>{description}</span></span>
      <span className={`ig-db-switch${checked ? ' is-on' : ''}`}><span /></span>
    </button>
  );
}

function VelocityChart({ velocity, compact }) {
  const perPage = compact ? 7 : 14;
  const pages = Math.max(1, Math.ceil(velocity.length / perPage));
  const [page, setPage] = useState(pages - 1);
  const [active, setActive] = useState(null);
  useEffect(() => { setPage(Math.max(0, Math.ceil(velocity.length / perPage) - 1)); }, [velocity.length, perPage]);

  const end = velocity.length - (pages - 1 - page) * perPage;
  const shown = velocity.slice(Math.max(0, end - perPage), end);
  const best = velocity.reduce((b, d) => (d.registrations > (b?.registrations || 0) ? d : b), null);
  const lastDate = velocity[velocity.length - 1]?.date;
  const top = niceMax(Math.max(...shown.map((d) => d.registrations), 1));
  const total = velocity.reduce((s, d) => s + d.registrations, 0);

  return (
    <div className="ig-pd-chart" data-testid="velocity-chart" data-chart={JSON.stringify(velocity)}>
      <div className="ig-pd-chart-head">
        <span className="ig-db-card-title"><strong>Daily Registrations</strong><span>RSVPs over the last {velocity.length || 14} days</span></span>
        {best && best.registrations > 0 && <span className="ig-pd-best">Best day: {bestDayLabel(best.date)}</span>}
      </div>
      {total === 0 ? (
        <div className="ig-db-empty-chart is-short">
          <strong>No RSVPs yet</strong>
          <span>Share your RSVP link. New registrations show up here each day.</span>
        </div>
      ) : (
        <>
          <div className="ig-pd-bars" onMouseLeave={() => setActive(null)}>
            {shown.map((d, i) => {
              const isToday = d.date === lastDate;
              const isBest = !isToday && best && d.date === best.date && d.registrations > 0;
              const h = Math.max(d.registrations > 0 ? 4 : 0, Math.round((d.registrations / top) * 100));
              const isOn = active === d.date;
              const edge = i === 0 ? ' is-first' : i === shown.length - 1 ? ' is-last' : '';
              return (
                <div className={`ig-pd-bar-col${isOn ? ' is-on' : ''}`} key={d.date}>
                  <span className={`ig-db-bar-val${!active && (isBest || (isToday && d.registrations > 0)) ? ' is-shown' : ''}`} aria-hidden="true">{d.registrations}</span>
                  <button
                    type="button"
                    className={`ig-pd-bar${isBest ? ' is-best' : ''}${isToday ? ' is-today' : ''}`}
                    style={{ height: `${h}%` }}
                    aria-label={`${bestDayLabel(d.date)}: ${plural(d.registrations, 'RSVP', 'RSVPs')}${isToday ? ', today so far' : ''}`}
                    onMouseEnter={() => setActive(d.date)}
                    onFocus={() => setActive(d.date)}
                    onBlur={() => setActive(null)}
                    onClick={() => setActive((a) => (a === d.date ? null : d.date))}
                  />
                  {isOn && (
                    <span className={`ig-db-tip${edge}`} role="status" style={{ bottom: `calc(${h}% + 10px)` }}>
                      <strong>{formatNumber(d.registrations)}</strong>
                      <span>{bestDayLabel(d.date)} — {isToday ? 'Today so far' : 'RSVPs'}</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="ig-pd-bar-labels" aria-hidden="true">
            {shown.map((d) => <span key={d.date} className={active === d.date ? 'is-on' : ''}>{dayLabel(d.date)}</span>)}
          </div>
          {pages > 1 && (
            <div className="ig-pd-chart-pager">
              <button type="button" className="ig-st-pill" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>{DashIcon.chevronLeft}Earlier</button>
              <span>{shown.length > 0 ? `${dayLabel(shown[0].date)} ${MONTHS[Number(shown[0].date.slice(5, 7)) - 1]} to ${dayLabel(shown[shown.length - 1].date)} ${MONTHS[Number(shown[shown.length - 1].date.slice(5, 7)) - 1]}` : ''}</span>
              <button type="button" className="ig-st-pill" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}>Later{DashIcon.chevronRight}</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- Add RSVP manually ---------------- */

function ManualRsvpModal({ preEvent, customFormSchema, qrEmailQuota, submitting, onClose, onSubmit }) {
  const [formData, setFormData] = useState({ emailAddress: '', attendanceMode: '', customResponses: {} });
  const [sendQrEmail, setSendQrEmail] = useState(qrEmailQuota.remaining > 0);
  const [errors, setErrors] = useState({});
  const firstRef = useRef(null);

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (event) => { if (event.key === 'Escape' && !submitting) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  const selectedFields = useMemo(() => {
    const fields = ['emailAddress'];
    OPTIONAL_FIELDS.forEach((field) => { if (preEvent?.rsvpFields?.[field]) fields.push(field); });
    const order = ['fullName', 'emailAddress', 'phoneNumber'];
    return [...order.filter((f) => fields.includes(f)), ...fields.filter((f) => !order.includes(f))];
  }, [preEvent]);

  const isFieldRequired = (field) => isRsvpFieldRequired(preEvent?.rsvpFields, preEvent?.rsvpFieldConfig, field);
  const labelFor = (field) => (field === 'textarea' ? preEvent.rsvpFieldConfig?.textareaLabel || FIELD_LABELS.textarea : FIELD_LABELS[field]);
  const optional = (field) => (isFieldRequired(field) ? null : <em> (optional)</em>);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };
  const updateCustomField = (fieldId, value) => {
    setFormData((prev) => ({ ...prev, customResponses: { ...(prev.customResponses || {}), [fieldId]: value } }));
    setErrors((prev) => ({ ...prev, [fieldId]: '' }));
  };

  const validate = () => {
    const next = {};
    if (!isValidEmail(formData.emailAddress)) next.emailAddress = 'Enter a valid email address.';
    if (preEvent?.virtualAttendanceEnabled && !['physical', 'virtual'].includes(formData.attendanceMode)) {
      next.attendanceMode = 'Choose how this guest will attend.';
    }
    selectedFields.forEach((field) => {
      if (field === 'emailAddress' || field === 'firstTimer') return;
      const required = isFieldRequired(field);
      if (field === 'link') {
        if (!String(formData.linkUrl || '').trim()) { if (required) next.linkUrl = 'Link is required.'; }
        else if (!isValidHttpUrl(formData.linkUrl)) next.linkUrl = 'Enter a link starting with http:// or https://.';
        return;
      }
      if (field === 'textarea') {
        if (required && !String(formData.textareaResponse || '').trim()) next.textareaResponse = 'Response is required.';
        return;
      }
      if (field === 'age') {
        const age = Number(formData.age);
        if (!String(formData.age || '').trim()) { if (required) next.age = 'Age is required.'; }
        else if (!Number.isInteger(age) || age < 1 || age > 120) next.age = 'Enter an age between 1 and 120.';
        return;
      }
      if (required && !String(formData[field] || '').trim()) next[field] = `${FIELD_LABELS[field]} is required.`;
    });
    (customFormSchema || []).forEach((field) => {
      const value = formData.customResponses?.[field.id];
      if (field.type === 'checkbox') {
        if (field.required && (!Array.isArray(value) || value.length === 0)) next[field.id] = `${field.label} is required.`;
        return;
      }
      if (field.required && !String(value || '').trim()) next[field.id] = `${field.label} is required.`;
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (event) => {
    event.preventDefault();
    if (!validate()) return;
    onSubmit(formData, sendQrEmail);
  };

  const errorFor = (key) => (errors[key] ? <span className="ig-st-error">{errors[key]}</span> : null);

  return (
    <div className="ig-db-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose(); }}>
      <form className="ig-db-dialog ig-pd-modal" role="dialog" aria-modal="true" aria-labelledby="ig-manual-title" onSubmit={submit} noValidate>
        <div className="ig-pd-modal-head">
          <span>
            <h2 id="ig-manual-title">Add RSVP manually</h2>
            <p>For a guest who registered by phone or in person.</p>
          </span>
          <button type="button" className="ig-db-round-btn is-sm" aria-label="Close" onClick={onClose} disabled={submitting}>{DashIcon.close}</button>
        </div>

        {preEvent?.virtualAttendanceEnabled && (
          <fieldset className="ig-pd-fieldset">
            <legend>How will they attend?</legend>
            <div className="ig-pd-types is-two" role="radiogroup" aria-label="How will they attend?">
              {[['physical', 'In person'], ['virtual', 'Online']].map(([key, label]) => (
                <button key={key} type="button" role="radio" aria-checked={formData.attendanceMode === key} className={formData.attendanceMode === key ? 'is-on' : ''} onClick={() => updateField('attendanceMode', key)} disabled={submitting}>
                  <strong>{label}</strong>
                </button>
              ))}
            </div>
            {errorFor('attendanceMode')}
          </fieldset>
        )}

        {selectedFields.map((field, index) => {
          const id = `ig-manual-${field}`;
          if (field === 'firstTimer') {
            return (
              <label className="ig-pd-check" key={field}>
                <input type="checkbox" checked={Boolean(formData.firstTimer)} onChange={(event) => updateField('firstTimer', event.target.checked)} disabled={submitting} />
                <span>This is their first time attending</span>
              </label>
            );
          }
          if (field === 'sex') {
            return (
              <div className={`ig-st-field${errors.sex ? ' has-error' : ''}`} key={field}>
                <label htmlFor={id}>{labelFor(field)}{optional(field)}</label>
                <select id={id} className="ig-pd-select" value={formData.sex || ''} onChange={(event) => updateField('sex', event.target.value)} disabled={submitting}>
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                {errorFor('sex')}
              </div>
            );
          }
          if (field === 'textarea') {
            return (
              <div className={`ig-st-field${errors.textareaResponse ? ' has-error' : ''}`} key={field}>
                <label htmlFor={id}>{labelFor(field)}{optional(field)}</label>
                <textarea id={id} className="ig-pd-textarea" value={formData.textareaResponse || ''} onChange={(event) => updateField('textareaResponse', event.target.value)} placeholder={FIELD_PLACEHOLDERS.textarea} disabled={submitting} rows={3} maxLength={5000} />
                {errorFor('textareaResponse')}
              </div>
            );
          }
          const valueKey = field === 'link' ? 'linkUrl' : field;
          return (
            <div className={`ig-st-field${errors[valueKey] ? ' has-error' : ''}`} key={field}>
              <label htmlFor={id}>{labelFor(field)}{optional(field)}</label>
              <input
                id={id}
                ref={index === 0 ? firstRef : undefined}
                type={field === 'emailAddress' ? 'email' : field === 'age' ? 'number' : field === 'link' ? 'url' : field === 'phoneNumber' ? 'tel' : 'text'}
                value={formData[valueKey] || ''}
                onChange={(event) => updateField(valueKey, event.target.value)}
                placeholder={FIELD_PLACEHOLDERS[field]}
                disabled={submitting}
                maxLength={field === 'emailAddress' ? 255 : 500}
                min={field === 'age' ? 1 : undefined}
                max={field === 'age' ? 120 : undefined}
              />
              {errorFor(valueKey)}
            </div>
          );
        })}

        {(customFormSchema || []).map((field) => {
          const value = formData.customResponses?.[field.id];
          const label = <>{field.label}{!field.required && <em> (optional)</em>}</>;
          if (field.type === 'radio') {
            return (
              <div className={`ig-st-field${errors[field.id] ? ' has-error' : ''}`} key={field.id}>
                <label htmlFor={`ig-manual-${field.id}`}>{label}</label>
                <select id={`ig-manual-${field.id}`} className="ig-pd-select" value={value || ''} onChange={(event) => updateCustomField(field.id, event.target.value)} disabled={submitting}>
                  <option value="">Choose one</option>
                  {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                {errorFor(field.id)}
              </div>
            );
          }
          if (field.type === 'checkbox') {
            const selected = Array.isArray(value) ? value : [];
            return (
              <fieldset className="ig-pd-fieldset" key={field.id}>
                <legend>{label}</legend>
                <div className="ig-pd-checks">
                  {field.options.map((option) => (
                    <label className="ig-pd-check" key={option}>
                      <input
                        type="checkbox"
                        checked={selected.includes(option)}
                        onChange={(event) => updateCustomField(field.id, event.target.checked ? [...selected, option] : selected.filter((item) => item !== option))}
                        disabled={submitting}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
                {errorFor(field.id)}
              </fieldset>
            );
          }
          return (
            <div className={`ig-st-field${errors[field.id] ? ' has-error' : ''}`} key={field.id}>
              <label htmlFor={`ig-manual-${field.id}`}>{label}</label>
              <input id={`ig-manual-${field.id}`} value={value || ''} onChange={(event) => updateCustomField(field.id, event.target.value)} placeholder="Their answer" disabled={submitting} maxLength={500} />
              {errorFor(field.id)}
            </div>
          );
        })}

        <label className={`ig-pd-mailbox${sendQrEmail ? ' is-on' : ''}`}>
          <span><strong>Email their QR pass now</strong></span>
          <input type="checkbox" checked={sendQrEmail} onChange={(event) => setSendQrEmail(event.target.checked)} disabled={submitting || qrEmailQuota.remaining <= 0} />
        </label>
        <p className="ig-pd-modal-note is-left">
          {qrEmailQuota.remaining > 0
            ? `Uses 1 of today's ${formatNumber(qrEmailQuota.remaining)} QR emails.`
            : 'Daily QR email limit reached. You can send their pass after midnight.'}
        </p>

        <div className="ig-db-dialog-actions">
          <button type="button" className="ig-db-btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="ig-db-btn-primary" disabled={submitting}>{submitting ? 'Adding…' : 'Add RSVP'}</button>
        </div>
      </form>
    </div>
  );
}

/* ---------------- Guest details ---------------- */

function GuestDetails({ rsvp, preEvent, customFormSchema, onClose }) {
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const rows = [];
  OPTIONAL_FIELDS.concat(['emailAddress']).forEach((field) => {
    if (field === 'fullName' || (field !== 'emailAddress' && !hasRsvpFieldValue(rsvp, field))) return;
    const label = field === 'textarea' ? preEvent.rsvpFieldConfig?.textareaLabel || FIELD_LABELS.textarea : FIELD_LABELS[field];
    const value = field === 'firstTimer' ? 'Yes' : field === 'link' ? rsvp.linkUrl : field === 'textarea' ? rsvp.textareaResponse : rsvp[field];
    rows.push([label, value]);
  });
  if (rsvp.attendanceMode) rows.push(['Attending', rsvp.attendanceMode === 'virtual' ? 'Online' : 'In person']);
  (customFormSchema || []).forEach((field) => rows.push([field.label, formatCustomAnswer(rsvp.customAnswers?.[field.id])]));
  rows.push(['Registered', formatShort(rsvp.createdAt)]);
  rows.push(['Came from', SOURCE_LABELS[rsvp.registrationSource] || 'RSVP page']);
  if (rsvp.checkedInAt) rows.push(['Checked in', formatShort(rsvp.checkedInAt)]);

  return (
    <div className="ig-db-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="ig-db-dialog ig-pd-modal" role="dialog" aria-modal="true" aria-labelledby="ig-guest-title">
        <div className="ig-pd-modal-head">
          <span className="ig-pd-guest-head">
            <span className="ig-pd-avatar">{initialsOf(rsvp.fullName || rsvp.emailAddress)}</span>
            <span><h2 id="ig-guest-title">{rsvp.fullName || rsvp.emailAddress}</h2><p>{rsvp.emailAddress}</p></span>
          </span>
          <button type="button" className="ig-db-round-btn is-sm" aria-label="Close" onClick={onClose}>{DashIcon.close}</button>
        </div>
        <dl className="ig-pd-details">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{label === 'Link' && value ? <a href={value} target="_blank" rel="noreferrer">{value}</a> : value || '-'}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/* ---------------- Page ---------------- */

function PreEventDetail() {
  const { id } = useParams();
  const toast = useToast();
  // Stable handle so the data loader never re-runs just because the toast helper changed.
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const { template, setTemplateKey } = useEventTemplate();
  const setTemplateRef = useRef(setTemplateKey);
  setTemplateRef.current = setTemplateKey;
  const today = useMemo(() => localToday(), []);
  const compact = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(max-width: 760px)').matches : false;

  const [boot, setBoot] = useState(null);
  const [preEvent, setPreEvent] = useState(null);
  const [rsvps, setRsvps] = useState([]);
  const [analytics, setAnalytics] = useState({ totalRsvps: 0, todayRsvps: 0, velocity: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [programOptions, setProgramOptions] = useState([]);
  const [linkedProgramId, setLinkedProgramId] = useState('');
  const [eventMeta, setEventMeta] = useState({ venueName: '', city: '', discoverEnabled: false, virtualAttendanceEnabled: false, communityLinks: [], closeEarly: false, rsvpClosesAt: '' });
  const [customFormSchema, setCustomFormSchema] = useState([]);
  const [rsvpFields, setRsvpFields] = useState({});
  const [rsvpFieldConfig, setRsvpFieldConfig] = useState({ textareaLabel: FIELD_LABELS.textarea, requiredFields: {} });
  const [dirty, setDirty] = useState(false);
  const [questionModal, setQuestionModal] = useState(null);
  const [savingLink, setSavingLink] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [resendingRsvpId, setResendingRsvpId] = useState(null);
  const [manualRsvpOpen, setManualRsvpOpen] = useState(false);
  const [manualRsvpSubmitting, setManualRsvpSubmitting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [qrEmailQuota, setQrEmailQuota] = useState(DEFAULT_QR_EMAIL_QUOTA);
  const [bulkQrConfirmOpen, setBulkQrConfirmOpen] = useState(false);
  const [bulkQrSending, setBulkQrSending] = useState(false);
  const [bulkQrSendingCount, setBulkQrSendingCount] = useState(0);
  const [guest, setGuest] = useState(null);
  const [addDetail, setAddDetail] = useState('');
  const [copied, setCopied] = useState(false);
  // Banner change: a local preview shows straight away while the new image uploads.
  const [bannerUpload, setBannerUpload] = useState({ busy: false, previewUrl: '', label: '' });
  const bannerInputRef = useRef(null);
  const addMenuRef = useRef(null);

  const applyEvent = useCallback((event) => {
    setPreEvent(event);
    setLinkedProgramId(event?.programId ? String(event.programId) : '');
    setEventMeta({
      venueName: event?.venueName || '',
      city: event?.city || '',
      discoverEnabled: event?.discoverEnabled === true,
      virtualAttendanceEnabled: event?.virtualAttendanceEnabled === true,
      communityLinks: event?.communityLinks || [],
      closeEarly: Boolean(event?.rsvpClosesAt),
      rsvpClosesAt: toLocalInput(event?.rsvpClosesAt)
    });
    setCustomFormSchema(event?.customFormSchema || []);
    setRsvpFields(event?.rsvpFields || {});
    setRsvpFieldConfig({
      textareaLabel: event?.rsvpFieldConfig?.textareaLabel || FIELD_LABELS.textarea,
      requiredFields: event?.rsvpFieldConfig?.requiredFields || {}
    });
    setDirty(false);
  }, []);

  const loadDetail = useCallback(async (showLoader = true, { showError = true } = {}) => {
    try {
      if (showLoader) setLoading(true);
      const response = await getPreEvent(id);
      applyEvent(response.preEvent);
      setRsvps(response.rsvps || []);
      setAnalytics(response.analytics || { totalRsvps: 0, todayRsvps: 0, velocity: [] });
      setQrEmailQuota(response.qrEmailQuota || DEFAULT_QR_EMAIL_QUOTA);
      setLoadError('');
      return true;
    } catch (error) {
      if (showLoader) setLoadError(error.response?.status === 404 ? 'notfound' : error.response?.data?.error || 'We could not load this pre-event.');
      else if (showError) toastRef.current.error(error.response?.data?.error || 'Unable to load pre-event dashboard');
      return false;
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [id, applyEvent]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  useEffect(() => {
    let alive = true;
    getPrograms()
      .then((response) => { if (alive) setProgramOptions((response.programs || []).filter((program) => program.trackingMode === 'collect-data')); })
      .catch(() => { if (alive) setProgramOptions([]); });
    Promise.resolve(typeof getDashboardBootstrap === 'function' ? getDashboardBootstrap(today, today, today) : null)
      .then((res) => {
        if (!alive || !res) return;
        setBoot(res);
        if (res.church?.organizationType) setTemplateRef.current(res.church.organizationType);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [today]);

  useEffect(() => { setPage(0); }, [search]);

  useEffect(() => {
    if (!addMenuOpen) return undefined;
    const onDown = (event) => { if (addMenuRef.current && !addMenuRef.current.contains(event.target)) setAddMenuOpen(false); };
    const onKey = (event) => { if (event.key === 'Escape') setAddMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [addMenuOpen]);

  // Warn before leaving with unsaved settings.
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const markDirty = () => setDirty(true);
  const updateMeta = (key, value) => { setEventMeta((prev) => ({ ...prev, [key]: value })); markDirty(); };

  /* ---------- Derived ---------- */
  const extraColumns = useMemo(() => {
    if (!preEvent) return [];
    const cols = [];
    OPTIONAL_FIELDS.forEach((field) => {
      if (CORE_COLUMNS.includes(field)) return;
      // Keep a column for a field the host turned off if guests already answered it.
      if (preEvent.rsvpFields?.[field] || rsvps.some((rsvp) => hasRsvpFieldValue(rsvp, field))) cols.push(field);
    });
    (preEvent.customFormSchema || []).forEach((field) => cols.push(`custom:${field.id}`));
    return cols;
  }, [preEvent, rsvps]);

  const filteredRsvps = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rsvps;
    return rsvps.filter((rsvp) => (
      [rsvp.emailAddress, rsvp.fullName, rsvp.phoneNumber, rsvp.school, rsvp.organization, rsvp.ticketType,
        rsvp.linkUrl, rsvp.textareaResponse, rsvp.address, rsvp.department, rsvp.fellowship, rsvp.age, rsvp.sex, rsvp.attendanceMode,
        rsvp.firstTimer ? 'first timer yes' : 'first timer no']
        .concat(Object.values(rsvp.customAnswers || {}).flat())
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    ));
  }, [rsvps, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRsvps.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visibleRsvps = filteredRsvps.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const physicalRsvpCount = rsvps.filter((rsvp) => rsvp.attendanceMode === 'physical').length;
  const virtualRsvpCount = rsvps.filter((rsvp) => rsvp.attendanceMode === 'virtual').length;
  const checkedInCount = rsvps.filter((rsvp) => rsvp.status === 'checked_in').length;
  const showAttendanceModeStats = preEvent?.virtualAttendanceEnabled || physicalRsvpCount > 0 || virtualRsvpCount > 0;
  const unsentImportedRsvpCount = rsvps.filter((rsvp) => (
    rsvp.registrationSource === 'import' && rsvp.status !== 'checked_in' && !rsvp.checkinQrSentAt && !rsvp.checkinQrLastSentAt
  )).length;
  const waitingCount = rsvps.filter((rsvp) => usesQrEmailQuota(rsvp) && rsvp.status !== 'checked_in' && !rsvp.checkinQrSentAt && !rsvp.checkinQrLastSentAt).length;
  const bulkQrSendCount = Math.min(QR_EMAIL_BATCH_LIMIT, Math.max(0, Number(qrEmailQuota.remaining) || 0), unsentImportedRsvpCount);
  const isEventDay = preEvent ? sameLocalDay(preEvent.eventDate, today) : false;
  const isPast = preEvent ? new Date(preEvent.eventDate).getTime() < Date.now() && !isEventDay : false;
  const rsvpEndsMs = preEvent?.rsvpEndsAt ? new Date(preEvent.rsvpEndsAt).getTime() : NaN;
  const rsvpEnded = Boolean(preEvent) && (preEvent.rsvpEnded === true || (!Number.isNaN(rsvpEndsMs) && Date.now() >= rsvpEndsMs));
  const autoCloseMs = preEvent ? new Date(preEvent.eventDate).getTime() + RSVP_GRACE_MS : NaN;
  // A page closed by the organizer's own earlier time can reopen by moving that time; the 12-hour limit can't be moved.
  const canReopenByTime = rsvpEnded && Boolean(preEvent?.rsvpClosesAt) && Date.now() < autoCloseMs;
  const quotaPct = qrEmailQuota.limit > 0 ? Math.max(0, Math.min(100, Math.round((qrEmailQuota.remaining / qrEmailQuota.limit) * 100))) : 0;

  /* ---------- Actions ---------- */
  const copyLink = async () => {
    if (!preEvent?.publicUrl) return;
    try {
      await navigator.clipboard.writeText(preEvent.publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast.success('RSVP link copied');
    } catch (error) {
      toast.error('Unable to copy RSVP link');
    }
  };

  const savedPayload = (event, overrides = {}) => ({
    title: event.title,
    eventDate: event.eventDate,
    description: event.description,
    venueName: event.venueName || '',
    city: event.city || '',
    discoverEnabled: event.discoverEnabled === true,
    virtualAttendanceEnabled: event.virtualAttendanceEnabled === true,
    rsvpFields: event.rsvpFields || {},
    rsvpFieldConfig: event.rsvpFieldConfig || {},
    customFormSchema: event.customFormSchema || [],
    communityLinks: event.communityLinks || [],
    isRsvpActive: event.isRsvpActive,
    rsvpClosesAt: event.rsvpClosesAt || null,
    programId: event.programId || null,
    ...overrides
  });

  // Swaps the banner on the live page. Like pausing, it saves only the banner with the last saved
  // settings, so unsaved edits elsewhere on the page are not sent.
  const changeBanner = async (file) => {
    if (bannerInputRef.current) bannerInputRef.current.value = '';
    if (!file || !preEvent || bannerUpload.busy) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Choose a JPEG, PNG or WebP image for the banner.');
      return;
    }
    let previewUrl = '';
    try {
      setBannerUpload({ busy: true, previewUrl: '', label: 'Compressing…' });
      const compressed = await compressFlyerImage(file);
      previewUrl = URL.createObjectURL(compressed);
      setBannerUpload({ busy: true, previewUrl, label: 'Uploading…' });
      const dataUrl = await fileToDataUrl(compressed);
      const response = await updatePreEvent(preEvent.id, savedPayload(preEvent, { banner: { dataUrl, originalName: file.name } }));
      setPreEvent((prev) => ({ ...prev, bannerUrl: response.preEvent?.bannerUrl || prev.bannerUrl, bannerOriginalName: response.preEvent?.bannerOriginalName || file.name }));
      toast.success('Banner updated. Guests see the new image now.');
    } catch (error) {
      // Messages from the shared image helper say "flyer"; on this page it's the banner.
      const local = error.response ? '' : String(error.message || '').replace(/flyer/gi, 'banner');
      toast.error(error.response?.data?.error || local || 'Could not change the banner. Try again.');
    } finally {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setBannerUpload({ busy: false, previewUrl: '', label: '' });
    }
  };

  // Pausing saves only the RSVP switch, using the last saved settings, so unsaved edits are not sent.
  const togglePause = async () => {
    if (!preEvent) return;
    const nextActive = !preEvent.isRsvpActive;
    try {
      setPausing(true);
      const response = await updatePreEvent(preEvent.id, savedPayload(preEvent, { isRsvpActive: nextActive }));
      setPreEvent((prev) => ({ ...prev, ...response.preEvent, isRsvpActive: response.preEvent?.isRsvpActive ?? nextActive }));
      toast.success(nextActive ? 'RSVPs reopened. Guests can register again.' : 'RSVPs paused. The page now shows RSVP closed.');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not change the RSVP status. Try again.');
    } finally {
      setPausing(false);
    }
  };

  const saveSettings = async () => {
    if (!preEvent) return;
    if (eventMeta.discoverEnabled && !eventMeta.city.trim()) {
      toast.error('Add a city to show this page on Discover.');
      document.getElementById('ig-pd-city')?.focus();
      return;
    }
    if (eventMeta.communityLinks.some((link) => !isValidCommunityUrl(link.url))) {
      toast.error('Each community link must be a full web address starting with https://.');
      return;
    }
    let rsvpClosesAt = null;
    if (eventMeta.closeEarly) {
      const closes = new Date(eventMeta.rsvpClosesAt);
      const startsMs = new Date(preEvent.eventDate).getTime();
      const unchanged = preEvent.rsvpClosesAt && new Date(preEvent.rsvpClosesAt).getTime() === closes.getTime();
      let problem = '';
      if (!eventMeta.rsvpClosesAt || Number.isNaN(closes.getTime())) problem = 'Pick when RSVPs should close, or turn off "Close RSVPs at a set time".';
      else if (closes.getTime() > startsMs + RSVP_GRACE_MS) problem = 'RSVPs can close no later than 12 hours after the event starts.';
      else if (!unchanged && closes.getTime() <= Date.now()) problem = 'That closing time has already passed. Pick a time in the future.';
      if (problem) {
        toast.error(problem);
        document.getElementById('ig-pd-closes')?.focus();
        return;
      }
      rsvpClosesAt = unchanged ? preEvent.rsvpClosesAt : closes.toISOString();
    }
    try {
      setSavingLink(true);
      const response = await updatePreEvent(preEvent.id, {
        title: preEvent.title,
        eventDate: preEvent.eventDate,
        description: preEvent.description,
        venueName: eventMeta.venueName,
        city: eventMeta.city,
        discoverEnabled: eventMeta.discoverEnabled,
        virtualAttendanceEnabled: eventMeta.virtualAttendanceEnabled,
        rsvpFields,
        rsvpFieldConfig,
        customFormSchema,
        communityLinks: eventMeta.communityLinks,
        isRsvpActive: preEvent.isRsvpActive,
        rsvpClosesAt,
        programId: linkedProgramId || null
      });
      applyEvent({ ...preEvent, ...response.preEvent });
      const canAppearOnDiscover = response.preEvent?.discoverEnabled === true && response.preEvent?.isRsvpActive
        && !response.preEvent?.rsvpEnded && isFutureDiscoverDate(response.preEvent?.eventDate);
      toast.success(response.preEvent?.discoverEnabled && !canAppearOnDiscover
        ? 'Settings saved. It shows on Discover only while RSVPs are open and the event is upcoming.'
        : 'Settings saved');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not save your settings. Try again.');
    } finally {
      setSavingLink(false);
    }
  };

  const addCommunityLink = () => {
    if (eventMeta.communityLinks.length >= 3) return;
    updateMeta('communityLinks', [...eventMeta.communityLinks, createCommunityLink()]);
  };
  const updateCommunityLink = (index, key, value) => updateMeta('communityLinks', eventMeta.communityLinks.map((link, i) => (i === index ? { ...link, [key]: value } : link)));
  const removeCommunityLink = (index) => updateMeta('communityLinks', eventMeta.communityLinks.filter((_, i) => i !== index));

  const openQuestion = (field = null) => {
    if (!field && customFormSchema.length >= MAX_CUSTOM_FIELDS) {
      toast.error(`You can add up to ${MAX_CUSTOM_FIELDS} questions.`);
      return;
    }
    setQuestionModal(field || {});
  };
  const saveQuestion = (field) => {
    setCustomFormSchema((prev) => (prev.some((item) => item.id === field.id) ? prev.map((item) => (item.id === field.id ? field : item)) : [...prev, field]));
    setQuestionModal(null);
    markDirty();
  };
  const removeQuestion = (fieldId) => { setCustomFormSchema((prev) => prev.filter((field) => field.id !== fieldId)); markDirty(); };

  const toggleRsvpField = (field) => { setRsvpFields((prev) => ({ ...prev, emailAddress: true, [field]: !prev[field] })); markDirty(); };
  const toggleRsvpFieldRequired = (field) => {
    setRsvpFieldConfig((prev) => ({ ...prev, requiredFields: { ...(prev.requiredFields || {}), [field]: !isRsvpFieldRequired(rsvpFields, prev, field) } }));
    markDirty();
  };

  const resendQr = async (rsvp) => {
    const wasPreviouslySent = Boolean(rsvp.checkinQrLastSentAt || rsvp.checkinQrSentAt);
    try {
      setResendingRsvpId(rsvp.id);
      const response = await resendRsvpQrEmail(preEvent.id, rsvp.id);
      if (response.rsvp) setRsvps((prev) => prev.map((item) => (item.id === response.rsvp.id ? response.rsvp : item)));
      if (response.quota) setQrEmailQuota(response.quota);
      toast.success(wasPreviouslySent ? 'QR pass resent' : 'QR pass sent');
    } catch (error) {
      if (error.response?.data?.quota) setQrEmailQuota(error.response.data.quota);
      toast.error(error.response?.data?.error || 'Unable to send RSVP QR email');
    } finally {
      setResendingRsvpId(null);
    }
  };

  const addManualRsvp = async (formData, sendQrEmail) => {
    try {
      setManualRsvpSubmitting(true);
      const response = await addManualPreEventRsvp(preEvent.id, formData, sendQrEmail);
      if (response.qrEmailQuota) setQrEmailQuota(response.qrEmailQuota);
      await loadDetail(false);
      setManualRsvpOpen(false);
      if (response.emailWarning) toast.warning(response.message || response.emailWarning);
      else if (sendQrEmail && response.qrEmailSent) toast.success('RSVP added and QR pass sent.');
      else toast.success(response.message || 'RSVP added.');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to add RSVP manually');
    } finally {
      setManualRsvpSubmitting(false);
    }
  };

  const importGuests = async (rows) => {
    const response = await importPreEventRsvps(preEvent.id, rows);
    const dashboardRefreshed = await loadDetail(false, { showError: false });
    setPage(0);
    const importedCount = response.summary?.imported || 0;
    const guestLabel = importedCount === 1 ? 'guest' : 'guests';
    if (!dashboardRefreshed) {
      const dashboardRefreshWarning = `${importedCount} ${guestLabel} ${importedCount === 1 ? 'was' : 'were'} imported, but the dashboard could not refresh. Refresh the page to see the latest totals.`;
      toast.warning(dashboardRefreshWarning);
      return { ...response, dashboardRefreshWarning };
    }
    toast.success(`${importedCount} ${guestLabel} imported.`);
    return response;
  };

  const sendImportedQrEmails = async () => {
    const requestedCount = bulkQrSendCount;
    if (!preEvent || requestedCount <= 0 || bulkQrSending) return;
    setBulkQrConfirmOpen(false);
    setBulkQrSending(true);
    setBulkQrSendingCount(requestedCount);
    try {
      const response = await sendImportedRsvpQrBatch(preEvent.id);
      if (response.quota) setQrEmailQuota(response.quota);
      const refreshed = await loadDetail(false, { showError: false });
      const sent = response.summary?.sent || 0;
      const failed = response.summary?.failed || 0;
      const remainingUnsent = response.summary?.remainingUnsent || 0;
      const remainingToday = response.quota?.remaining ?? qrEmailQuota.remaining;
      const emailLabel = sent === 1 ? 'email' : 'emails';
      if (!refreshed && sent > 0) toast.warning(`${sent} QR ${emailLabel} sent, but the dashboard could not refresh. Refresh the page to see the latest statuses.`);
      else if (failed > 0) toast.warning(`${sent} QR ${emailLabel} sent. ${failed} failed, and ${remainingUnsent} uploaded guests still need QR emails. ${remainingToday} remaining today.`);
      else if (sent > 0) toast.success(`${sent} QR ${emailLabel} sent. ${remainingToday} remaining today.`);
      else toast.warning('No QR emails were sent. The eligible uploaded guests remain available to retry.');
    } catch (error) {
      if (error.response?.data?.quota) setQrEmailQuota(error.response.data.quota);
      toast.error(error.response?.data?.error || 'Unable to send imported guest QR emails');
    } finally {
      setBulkQrSending(false);
      setBulkQrSendingCount(0);
    }
  };

  /* ---------- Render ---------- */
  const shellProps = {
    active: 'pre-events',
    crumb: preEvent?.title || 'Pre-Event',
    church: boot?.church ? { name: boot.church.churchName, email: boot.church.email, logoUrl: boot.church.logoUrl } : null,
    counts: { preEvents: boot?.stats?.preEventCount || 0, events: boot?.stats?.totalProgramsAllTime || 0 },
    unreadCount: boot?.unreadCount || 0,
    live: boot?.stats?.live || null,
    template
  };

  if (loading || !preEvent) {
    return (
      <IgDashShell {...shellProps}>
        <div className="ig-db-page">
          {loading ? (
            <div aria-busy="true" aria-label="Loading pre-event" className="ig-pd-loading">
              <div className="ig-db-skel ig-pd-skel-hero" />
              <div className="ig-db-stats">{[0, 1, 2, 3].map((i) => <div key={i} className="ig-db-skel is-stat" />)}</div>
              <div className="ig-db-skel ig-pd-skel-body" />
            </div>
          ) : (
            <div className="ig-db-card ig-db-error" role="alert">
              <strong>{loadError === 'notfound' ? 'This pre-event no longer exists' : "This pre-event didn't load"}</strong>
              <span>{loadError === 'notfound' ? 'It may have been deleted. Go back to see your other RSVP pages.' : loadError}</span>
              <span className="ig-pd-row-gap">
                {loadError !== 'notfound' && <button type="button" className="ig-db-btn-ink" onClick={() => loadDetail()}>Try again</button>}
                <Link to="/pre-events" className="ig-db-btn-ghost">Back to Pre-Events</Link>
              </span>
            </div>
          )}
        </div>
      </IgDashShell>
    );
  }

  const banner = isSafeImageUrl(preEvent.bannerUrl) ? preEvent.bannerUrl : null;
  const venueLine = [preEvent.venueName, preEvent.city].filter(Boolean).join(', ');
  const enabledFields = OPTIONAL_FIELDS.filter((field) => rsvpFields[field]);
  const disabledFields = OPTIONAL_FIELDS.filter((field) => !rsvpFields[field]);
  const fieldLabel = (field) => (field === 'textarea' ? rsvpFieldConfig.textareaLabel || FIELD_LABELS.textarea : FIELD_LABELS[field]);
  const linkedProgram = programOptions.find((p) => String(p.id) === String(linkedProgramId));
  const qrState = (rsvp) => (rsvp.status === 'checked_in' ? 'in' : rsvp.checkinQrLastSentAt || rsvp.checkinQrSentAt ? 'sent' : 'not');
  const qrLabel = { in: 'Checked in', sent: 'QR sent', not: 'Not sent' };
  const extraLabel = (column) => {
    if (column.startsWith('custom:')) return customFormSchema.find((f) => f.id === column.slice(7))?.label || (preEvent.customFormSchema || []).find((f) => f.id === column.slice(7))?.label || 'Question';
    return fieldLabel(column);
  };
  const extraValue = (rsvp, column) => {
    if (column.startsWith('custom:')) return formatCustomAnswer(rsvp.customAnswers?.[column.slice(7)]);
    if (column === 'firstTimer') return rsvp.firstTimer ? 'Yes' : 'No';
    if (column === 'link') return rsvp.linkUrl ? <a className="ig-pd-table-link" href={rsvp.linkUrl} target="_blank" rel="noreferrer">Open link</a> : '-';
    if (column === 'textarea') return rsvp.textareaResponse || '-';
    return rsvp[column] || '-';
  };

  const qrButton = (rsvp) => {
    const state = qrState(rsvp);
    const blocked = rsvp.status === 'checked_in'
      || resendingRsvpId === rsvp.id
      || (bulkQrSending && usesQrEmailQuota(rsvp))
      || (usesQrEmailQuota(rsvp) && qrEmailQuota.remaining <= 0);
    return (
      <button
        type="button"
        className={state === 'not' ? 'ig-pd-qr-btn is-dark' : 'ig-pd-qr-btn'}
        onClick={() => resendQr(rsvp)}
        disabled={blocked}
        title={usesQrEmailQuota(rsvp) && qrEmailQuota.remaining <= 0 ? 'Daily limit reached. You can send more after midnight.' : undefined}
      >
        {resendingRsvpId === rsvp.id ? 'Sending…' : state === 'not' ? 'Send QR' : 'Resend QR'}
      </button>
    );
  };

  return (
    <IgDashShell {...shellProps}>
      <div className="ig-db-page ig-pd">
        {/* ---------- Top card ---------- */}
        <section className="ig-pd-hero">
          <div className="ig-pd-hero-text">
            <Link to="/pre-events" className="ig-pd-back">{Icon.back}Pre-Events</Link>
            <span className="ig-pd-meta">
              <span>{Icon.calendar}{formatEventWhen(preEvent.eventDate)}</span>
              {venueLine && <><i aria-hidden="true" /><span>{Icon.pin}{venueLine}</span></>}
            </span>
            <h1>
              {preEvent.title}{' '}
              <span className={`ig-pd-state${preEvent.isRsvpActive && !rsvpEnded ? '' : ' is-paused'}`}>
                <span aria-hidden="true" />
                {rsvpEnded
                  ? (isPast ? 'Event ended, RSVPs closed' : 'RSVPs closed')
                  : preEvent.isRsvpActive ? 'RSVP open' : 'Paused, not taking RSVPs'}
              </span>
            </h1>
            <div className="ig-pd-linkbox">
              <span title={preEvent.publicUrl}>{shortLink(preEvent.publicUrl)}</span>
              <button type="button" onClick={copyLink}>{Icon.copy}{copied ? 'Copied' : 'Copy RSVP Link'}</button>
            </div>
            <div className="ig-pd-hero-actions">
              <a href={`/rsvp/${preEvent.slug}`} target="_blank" rel="noreferrer" className="ig-st-pill ig-pd-pill">{Icon.external}Open Public Page</a>
              {!rsvpEnded && (
                <button type="button" className="ig-st-pill ig-pd-pill" onClick={togglePause} disabled={pausing}>
                  {pausing ? 'Saving…' : preEvent.isRsvpActive ? 'Pause RSVPs' : 'Reopen RSVPs'}
                </button>
              )}
            </div>
          </div>
          <div className={`ig-pd-banner${banner || bannerUpload.previewUrl ? '' : ' is-empty'}${bannerUpload.busy ? ' is-busy' : ''}`}>
            {bannerUpload.previewUrl || banner
              ? <img src={bannerUpload.previewUrl || banner} alt="" />
              : <span className="ig-pe-media-icon" aria-hidden="true">{Icon.ticket}</span>}
            <span className="ig-pd-banner-tag">Shown on your RSVP page</span>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="ig-pd-banner-file"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => changeBanner(event.target.files?.[0])}
            />
            <button type="button" className="ig-pd-banner-change" onClick={() => bannerInputRef.current?.click()} disabled={bannerUpload.busy}>
              {Icon.upload}{banner ? 'Change banner' : 'Add banner'}
            </button>
            {bannerUpload.busy && (
              <span className="ig-pd-banner-busy" role="status"><span className="ig-st-spinner is-inline" aria-hidden="true" />{bannerUpload.label}</span>
            )}
          </div>
        </section>

        {rsvpEnded && (
          <div className="ig-pd-paused" role="status">
            <span className="ig-pd-paused-icon">{Icon.lock}</span>
            <span className="ig-pd-paused-text">
              <strong>RSVPs have closed</strong>
              <span>
                {preEvent.rsvpClosesAt && !Number.isNaN(rsvpEndsMs) && rsvpEndsMs < autoCloseMs
                  ? `They closed at the time you set, ${formatEventWhen(preEvent.rsvpEndsAt)}.`
                  : 'They closed automatically 12 hours after the event started.'}
                {' '}Guests see "RSVPs are closed". Everyone who already RSVP'd keeps their QR pass, and you can still add guests yourself.
                {canReopenByTime && ' To reopen, move the closing time in Visibility settings.'}
              </span>
            </span>
          </div>
        )}

        {!preEvent.isRsvpActive && !rsvpEnded && (
          <div className="ig-pd-paused" role="status">
            <span className="ig-pd-paused-icon">{Icon.pause}</span>
            <span className="ig-pd-paused-text">
              <strong>RSVPs are paused</strong>
              <span>Your link still opens, but guests see "RSVP closed" and can't register. Everyone who already RSVP'd keeps their QR pass.</span>
            </span>
            <button type="button" className="ig-pd-paused-btn" onClick={togglePause} disabled={pausing}>{pausing ? 'Saving…' : 'Reopen RSVPs'}</button>
          </div>
        )}

        {/* ---------- Stats ---------- */}
        <div className={`ig-pd-stats${showAttendanceModeStats ? '' : ' is-three'}`}>
          <article className="ig-db-stat is-dark">
            <div className="ig-db-stat-head"><span>Total RSVPs</span></div>
            <strong>{formatNumber(analytics.totalRsvps)}</strong>
            <span className="ig-db-stat-sub">Secured a spot before check-in</span>
          </article>
          <article className="ig-db-stat">
            <div className="ig-db-stat-head"><span>Today</span></div>
            <strong>{analytics.todayRsvps > 0 ? '+' : ''}{formatNumber(analytics.todayRsvps)}</strong>
            <span className="ig-db-stat-sub">New RSVPs since midnight</span>
          </article>
          <article className="ig-db-stat">
            <div className="ig-db-stat-head"><span>Checked in</span></div>
            <strong>{formatNumber(checkedInCount)}</strong>
            <span className="ig-db-stat-sub">
              {checkedInCount > 0 && analytics.totalRsvps > 0
                ? `${Math.round((checkedInCount / analytics.totalRsvps) * 100)}% of RSVPs so far`
                : linkedProgramId ? 'Opens on event day' : 'Link a live event to check guests in'}
            </span>
          </article>
          {showAttendanceModeStats && (
            <>
              <article className="ig-db-stat">
                <div className="ig-db-stat-head"><span>Physical</span></div>
                <strong>{formatNumber(physicalRsvpCount)}</strong>
                <span className="ig-db-stat-sub">Joining in person</span>
              </article>
              <article className="ig-db-stat">
                <div className="ig-db-stat-head"><span>Virtual</span></div>
                <strong>{formatNumber(virtualRsvpCount)}</strong>
                <span className="ig-db-stat-sub">Joining online</span>
              </article>
            </>
          )}
        </div>

        {/* ---------- Chart + questions | settings ---------- */}
        <div className="ig-pd-grid">
          <section className="ig-db-card ig-pd-left" aria-label="Registrations and questions">
            <VelocityChart velocity={analytics.velocity || []} compact={compact} />

            <div className="ig-pd-divider" aria-hidden="true" />

            <div className="ig-pd-q-head">
              <span className="ig-db-card-title"><strong>RSVP Questions</strong><span>Extra questions guests answer on your RSVP page</span></span>
              <button type="button" className="ig-st-pill ig-pd-pill" onClick={() => openQuestion()}>{DashIcon.plus}Add Question</button>
            </div>
            {customFormSchema.length === 0 ? (
              <p className="ig-pd-muted">No extra questions yet. Guests only fill in the details below.</p>
            ) : (
              <ul className="ig-pd-questions">
                {customFormSchema.map((field) => (
                  <li key={field.id}>
                    <span className="ig-pd-q-text">
                      <strong>{field.label}</strong>
                      <span>
                        {field.type === 'text' ? 'Short text' : field.type === 'radio' ? 'Pick one' : 'Checkboxes'}
                        {field.required ? ' · Required' : ' · Optional'}
                        {field.options?.length ? ` · ${field.options.join(', ')}` : ''}
                      </span>
                    </span>
                    <button type="button" className="ig-db-round-btn is-xs is-line" aria-label={`Edit ${field.label}`} onClick={() => openQuestion(field)}>{Icon.pencil}</button>
                    <button type="button" className="ig-db-round-btn is-xs is-line ig-pd-danger" aria-label={`Delete ${field.label}`} onClick={() => removeQuestion(field.id)}>{DashIcon.trash}</button>
                  </li>
                ))}
              </ul>
            )}

            <div className="ig-pd-details-head">
              <span className="ig-db-card-title"><strong>Details guests fill in</strong><span>Email is always asked. Answers already collected are kept if you remove a detail.</span></span>
            </div>
            <ul className="ig-pd-fields">
              <li className="is-locked">
                <span><strong>{FIELD_LABELS.emailAddress}</strong><span>Always required</span></span>
              </li>
              {enabledFields.map((field) => (
                <li key={field}>
                  <span><strong>{fieldLabel(field)}</strong><span>{field === 'firstTimer' ? 'Optional tick box' : isRsvpFieldRequired(rsvpFields, rsvpFieldConfig, field) ? 'Required' : 'Optional'}</span></span>
                  {field !== 'firstTimer' && (
                    <label className="ig-pd-req">
                      <input type="checkbox" checked={isRsvpFieldRequired(rsvpFields, rsvpFieldConfig, field)} onChange={() => toggleRsvpFieldRequired(field)} aria-label={`Make ${FIELD_LABELS[field]} required`} />
                      <span>Required</span>
                    </label>
                  )}
                  <button type="button" className="ig-db-round-btn is-xs is-line" aria-label={`Remove ${fieldLabel(field)} from the form`} onClick={() => toggleRsvpField(field)}>{DashIcon.close}</button>
                </li>
              ))}
            </ul>
            {rsvpFields.textarea && (
              <div className="ig-st-field">
                <label htmlFor="ig-pd-textarea-label">Long answer question</label>
                <input id="ig-pd-textarea-label" value={rsvpFieldConfig.textareaLabel} onChange={(event) => { setRsvpFieldConfig((prev) => ({ ...prev, textareaLabel: event.target.value })); markDirty(); }} placeholder="What do you expect from this event?" maxLength={120} />
              </div>
            )}
            {disabledFields.length > 0 && (
              <div className="ig-pd-add-detail">
                <select aria-label="Add a detail to the form" className="ig-pd-select" value={addDetail} onChange={(event) => setAddDetail(event.target.value)}>
                  <option value="">Add a detail…</option>
                  {disabledFields.map((field) => <option key={field} value={field}>{fieldLabel(field)}</option>)}
                </select>
                <button type="button" className="ig-st-pill" disabled={!addDetail} onClick={() => { toggleRsvpField(addDetail); setAddDetail(''); }}>Add to form</button>
              </div>
            )}
          </section>

          <section className="ig-db-card ig-pd-settings" aria-labelledby="ig-pd-settings-title">
            <span className="ig-db-card-title"><strong id="ig-pd-settings-title">Visibility and Live Link</strong><span>Who can find this page, and which event it checks guests into</span></span>
            <Switch id="ig-pd-discover" checked={eventMeta.discoverEnabled} onChange={(v) => updateMeta('discoverEnabled', v)} title="Show on Discover Events" description="List this page publicly on the Discover section." />
            <div className="ig-st-row">
              <div className="ig-st-field">
                <label htmlFor="ig-pd-venue">Venue name</label>
                <input id="ig-pd-venue" value={eventMeta.venueName} onChange={(event) => updateMeta('venueName', event.target.value)} placeholder="Civic Centre" maxLength={255} />
              </div>
              <div className="ig-st-field">
                <label htmlFor="ig-pd-city">City{eventMeta.discoverEnabled && <em> (needed for Discover)</em>}</label>
                <input id="ig-pd-city" value={eventMeta.city} onChange={(event) => updateMeta('city', event.target.value)} placeholder="Lagos" maxLength={120} />
              </div>
            </div>
            <div className="ig-st-field">
              <label htmlFor="ig-pd-live">Live event</label>
              <select id="ig-pd-live" className="ig-pd-select" value={linkedProgramId} onChange={(event) => { setLinkedProgramId(event.target.value); markDirty(); }}>
                <option value="">Not linked yet</option>
                {programOptions.map((program) => (
                  <option key={program.id} value={program.id}>{program.title}, {program.date ? `${Number(String(program.date).slice(8, 10))} ${MONTHS[Number(String(program.date).slice(5, 7)) - 1]}` : ''}</option>
                ))}
              </select>
              <span className="ig-pd-hint">
                {linkedProgram || linkedProgramId
                  ? 'Linked: guests with a QR pass check in to this event in one tap.'
                  : programOptions.length === 0
                    ? 'Create an event that collects data, then link it here so QR passes work at the door.'
                    : 'Pick the event guests will check in to. Their QR pass works there.'}
              </span>
            </div>
            <Switch id="ig-pd-virtual" checked={eventMeta.virtualAttendanceEnabled} onChange={(v) => updateMeta('virtualAttendanceEnabled', v)} title="Track virtual attendance" description="Ask guests if they will join in person or online." />

            <Switch
              id="ig-pd-closeEarly"
              checked={eventMeta.closeEarly}
              onChange={(v) => updateMeta('closeEarly', v)}
              title="Close RSVPs at a set time"
              description={eventMeta.closeEarly
                ? 'RSVPs stop at the time below.'
                : `Off: RSVPs close automatically on ${Number.isNaN(autoCloseMs) ? 'the event day' : formatEventWhen(new Date(autoCloseMs))}, 12 hours after the start.`}
            />
            {eventMeta.closeEarly && (
              <div className="ig-st-field">
                <label htmlFor="ig-pd-closes">RSVPs close on</label>
                <input
                  id="ig-pd-closes"
                  type="datetime-local"
                  max={Number.isNaN(autoCloseMs) ? undefined : toLocalInput(new Date(autoCloseMs))}
                  value={eventMeta.rsvpClosesAt}
                  onChange={(event) => updateMeta('rsvpClosesAt', event.target.value)}
                />
                <span className="ig-pd-hint">Any time up to 12 hours after the event starts. Guests see it on the RSVP page. Saved with Save Settings.</span>
              </div>
            )}

            <div className="ig-pd-links-head">
              <span>Community links <em>({eventMeta.communityLinks.length} of 3)</em></span>
              {eventMeta.communityLinks.length < 3 && <button type="button" className="ig-pd-text-btn" onClick={addCommunityLink}>Add link</button>}
            </div>
            {eventMeta.communityLinks.length > 0 && (
              <ul className="ig-pd-links">
                {eventMeta.communityLinks.map((link, index) => (
                  <li key={`${index}-${link.platform}`} className={link.url && !isValidCommunityUrl(link.url) ? 'is-invalid' : ''}>
                    <select aria-label={`Community link ${index + 1} platform`} value={link.platform} onChange={(event) => updateCommunityLink(index, 'platform', event.target.value)}>
                      {COMMUNITY_PLATFORMS.map((platform) => <option key={platform.value} value={platform.value}>{platform.label}</option>)}
                    </select>
                    <input aria-label={`Community link ${index + 1} address`} type="url" value={link.url} onChange={(event) => updateCommunityLink(index, 'url', event.target.value)} placeholder="https://chat.whatsapp.com/…" maxLength={2048} />
                    <button type="button" aria-label={`Remove community link ${index + 1}`} onClick={() => removeCommunityLink(index)}>{DashIcon.close}</button>
                  </li>
                ))}
              </ul>
            )}
            <span className="ig-pd-hint">Shown to guests after they RSVP.</span>

            <div className="ig-pd-save">
              {dirty && <span className="ig-pd-dirty" role="status"><i aria-hidden="true" />You have unsaved changes</span>}
              <button type="button" className="ig-db-btn-primary ig-pd-save-btn" onClick={saveSettings} disabled={savingLink}>
                {savingLink ? <><span className="ig-st-spinner is-inline" aria-hidden="true" />Saving…</> : 'Save Settings'}
              </button>
            </div>
          </section>
        </div>

        {/* ---------- Attendees ---------- */}
        <section className="ig-db-card ig-pd-people" aria-labelledby="ig-pd-people-title">
          <div className="ig-pd-people-head">
            <span className="ig-db-card-title">
              <strong id="ig-pd-people-title">RSVP Attendees</strong>
              <span>{rsvps.length === 0 ? 'No guests yet' : `${plural(rsvps.length, 'person', 'people')}${checkedInCount > 0 ? ` · ${formatNumber(checkedInCount)} checked in` : ''}`}</span>
            </span>
            <div className="ig-pd-people-tools">
              <label className="ig-ae-search">
                {Icon.search}
                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search RSVPs" aria-label="Search RSVPs" />
              </label>
              <button type="button" className="ig-st-pill ig-pd-pill ig-pd-wide-only" onClick={() => setImportOpen(true)}>{Icon.upload}Upload Data</button>
              <button type="button" className="ig-db-btn-ink ig-pd-wide-only" onClick={() => setManualRsvpOpen(true)}>{DashIcon.plus}Add Manually</button>
              <span className="ig-pd-add-menu ig-pd-narrow-only" ref={addMenuRef}>
                <button type="button" className="ig-pd-add-round" aria-label="Add guests" aria-haspopup="menu" aria-expanded={addMenuOpen} onClick={() => setAddMenuOpen((v) => !v)}>{DashIcon.plus}</button>
                {addMenuOpen && (
                  <div className="ig-db-acct-menu ig-pd-menu" role="menu" aria-label="Add guests">
                    <button type="button" role="menuitem" onClick={() => { setAddMenuOpen(false); setManualRsvpOpen(true); }}>{DashIcon.plus}Add manually</button>
                    <button type="button" role="menuitem" onClick={() => { setAddMenuOpen(false); setImportOpen(true); }}>{Icon.upload}Upload a spreadsheet</button>
                  </div>
                )}
              </span>
            </div>
          </div>

          <div className="ig-pd-quota" aria-live="polite">
            <div className="ig-pd-quota-top">
              <span className="ig-pd-quota-icon" aria-hidden="true">{Icon.mail}</span>
              <span className="ig-pd-quota-text">
                <strong>QR email allowance</strong>
                <span>{formatNumber(qrEmailQuota.limit)} a day for uploaded and hand-added guests, sent {QR_EMAIL_BATCH_LIMIT} at a time. Page RSVPs get theirs automatically.</span>
              </span>
            </div>
            <div className="ig-pd-quota-meter">
              <span className="ig-pd-quota-count"><strong>{formatNumber(qrEmailQuota.remaining)}</strong> of {formatNumber(qrEmailQuota.limit)} left today</span>
              <span className="ig-pd-quota-reset">Resets at midnight</span>
              <span className="ig-pd-quota-bar" aria-hidden="true"><span style={{ width: `${quotaPct}%` }} /></span>
            </div>
            <div className="ig-pd-quota-foot">
              <span className={qrEmailQuota.remaining <= 0 && waitingCount > 0 ? 'is-warn' : ''}>
                {qrEmailQuota.remaining <= 0 && waitingCount > 0
                  ? 'Daily limit reached. You can send more after midnight.'
                  : waitingCount > 0
                    ? unsentImportedRsvpCount > 0
                      ? `${plural(unsentImportedRsvpCount, 'uploaded guest is', 'uploaded guests are')} waiting for their QR pass.${waitingCount > unsentImportedRsvpCount ? ` ${plural(waitingCount - unsentImportedRsvpCount, 'hand-added guest needs', 'hand-added guests need')} Send QR below.` : ''}`
                      : `${plural(waitingCount, 'hand-added guest needs', 'hand-added guests need')} their QR pass. Use Send QR below.`
                    : rsvps.length > 0 ? 'Every guest has their QR pass.' : 'Guests you add here appear below.'}
              </span>
              <button
                type="button"
                className="ig-db-btn-primary ig-pd-bulk-btn"
                onClick={() => setBulkQrConfirmOpen(true)}
                disabled={bulkQrSendCount <= 0 || bulkQrSending || resendingRsvpId !== null}
                title={qrEmailQuota.remaining <= 0 ? 'Daily limit reached. You can send more after midnight.' : unsentImportedRsvpCount <= 0 ? 'No uploaded guests are waiting for a QR email.' : undefined}
              >
                {bulkQrSending && <span className="ig-st-spinner is-inline" aria-hidden="true" />}
                {!bulkQrSending && Icon.mail}
                {bulkQrSending
                  ? `Sending ${bulkQrSendingCount}...`
                  : bulkQrSendCount > 0
                    ? `Send ${bulkQrSendCount} QR ${bulkQrSendCount === 1 ? 'email' : 'emails'}`
                    : 'Send QR emails'}
              </button>
            </div>
          </div>

          {rsvps.length === 0 ? (
            <div className="ig-pd-empty">
              <strong>No RSVPs yet</strong>
              <span>Share your RSVP link, upload a guest list or add someone by hand.</span>
              <span className="ig-pd-row-gap">
                <button type="button" className="ig-db-btn-ink" onClick={copyLink}>{Icon.copy}Copy RSVP Link</button>
                <button type="button" className="ig-db-btn-ghost" onClick={() => setImportOpen(true)}>{Icon.upload}Upload Data</button>
              </span>
            </div>
          ) : visibleRsvps.length === 0 ? (
            <div className="ig-pd-empty"><strong>No guests match "{search}"</strong><span>Try a name, email or phone number.</span></div>
          ) : (
            <>
              <div className="ig-pd-table-scroll">
                <table className="ig-pd-table">
                  <thead>
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Email</th>
                      <th scope="col">Phone</th>
                      {(eventMeta.virtualAttendanceEnabled || physicalRsvpCount + virtualRsvpCount > 0) && <th scope="col">Mode</th>}
                      <th scope="col">QR email</th>
                      <th scope="col">Checked in</th>
                      {extraColumns.map((column) => <th scope="col" key={column}>{extraLabel(column)}</th>)}
                      <th scope="col" className="is-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRsvps.map((rsvp) => {
                      const state = qrState(rsvp);
                      return (
                        <tr key={rsvp.id}>
                          <td>
                            <button type="button" className="ig-pd-person" onClick={() => setGuest(rsvp)}>
                              <span className="ig-pd-avatar">{initialsOf(rsvp.fullName || rsvp.emailAddress)}</span>
                              <span><strong>{rsvp.fullName || '-'}</strong><span>{SOURCE_LABELS[rsvp.registrationSource] || 'RSVP page'}</span></span>
                            </button>
                          </td>
                          <td>{rsvp.emailAddress}</td>
                          <td>{rsvp.phoneNumber || '-'}</td>
                          {(eventMeta.virtualAttendanceEnabled || physicalRsvpCount + virtualRsvpCount > 0) && (
                            <td>{rsvp.attendanceMode ? <span className={`ig-pd-mode is-${rsvp.attendanceMode}`}>{rsvp.attendanceMode === 'virtual' ? 'Virtual' : 'Physical'}</span> : '-'}</td>
                          )}
                          <td><span className={`ig-pd-qr is-${state}`}><span aria-hidden="true" />{qrLabel[state]}</span></td>
                          <td>{rsvp.checkedInAt ? formatCheckedIn(rsvp.checkedInAt, isEventDay) : '-'}</td>
                          {extraColumns.map((column) => <td key={column} className="ig-pd-extra">{extraValue(rsvp, column)}</td>)}
                          <td className="is-right">{qrButton(rsvp)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="ig-pd-cards">
                {visibleRsvps.map((rsvp) => {
                  const state = qrState(rsvp);
                  return (
                    <li key={rsvp.id} className="ig-pd-card">
                      <div className="ig-pd-card-top">
                        <button type="button" className="ig-pd-person" onClick={() => setGuest(rsvp)}>
                          <span className="ig-pd-avatar">{initialsOf(rsvp.fullName || rsvp.emailAddress)}</span>
                          <span><strong>{rsvp.fullName || rsvp.emailAddress}</strong><span>{rsvp.emailAddress}</span></span>
                        </button>
                        {rsvp.attendanceMode && <span className={`ig-pd-mode is-${rsvp.attendanceMode}`}>{rsvp.attendanceMode === 'virtual' ? 'Virtual' : 'Physical'}</span>}
                      </div>
                      <div className="ig-pd-card-foot">
                        <span className={`ig-pd-qr is-${state}`}><span aria-hidden="true" />{qrLabel[state]}</span>
                        <span className="ig-pd-card-source">{state === 'in' && rsvp.checkedInAt ? formatCheckedIn(rsvp.checkedInAt, isEventDay) : SOURCE_LABELS[rsvp.registrationSource] || 'RSVP page'}</span>
                        {qrButton(rsvp)}
                      </div>
                    </li>
                  );
                })}
              </ul>

              <nav className="ig-ae-pager" aria-label="Pages">
                <span>Showing <strong>{safePage * PAGE_SIZE + 1} to {Math.min(filteredRsvps.length, (safePage + 1) * PAGE_SIZE)}</strong> of {formatNumber(filteredRsvps.length)}</span>
                <span className="ig-ae-pager-btns">
                  <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0} aria-label="Previous page">{DashIcon.chevronLeft}<span>Previous</span></button>
                  <strong aria-live="polite">Page {safePage + 1} of {totalPages}</strong>
                  <button type="button" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1} aria-label="Next page"><span>Next</span>{DashIcon.chevronRight}</button>
                </span>
              </nav>
            </>
          )}
        </section>
      </div>

      {questionModal && <IgQuestionModal field={questionModal.id ? questionModal : null} onClose={() => setQuestionModal(null)} onSave={saveQuestion} />}
      {manualRsvpOpen && (
        <ManualRsvpModal
          preEvent={{ ...preEvent, rsvpFields, rsvpFieldConfig, virtualAttendanceEnabled: eventMeta.virtualAttendanceEnabled }}
          customFormSchema={preEvent.customFormSchema || []}
          qrEmailQuota={qrEmailQuota}
          submitting={manualRsvpSubmitting}
          onClose={() => { if (!manualRsvpSubmitting) setManualRsvpOpen(false); }}
          onSubmit={addManualRsvp}
        />
      )}
      {importOpen && (
        <IgImportModal
          eventTitle={preEvent.title}
          onClose={() => setImportOpen(false)}
          onImport={importGuests}
          onSendQr={() => setBulkQrConfirmOpen(true)}
        />
      )}
      {bulkQrConfirmOpen && (
        <DashDialog
          tone="primary"
          icon={Icon.mail}
          title={`Send ${bulkQrSendCount} QR ${bulkQrSendCount === 1 ? 'email' : 'emails'}?`}
          cancelLabel="Cancel"
          confirmLabel={`Send ${bulkQrSendCount} QR ${bulkQrSendCount === 1 ? 'email' : 'emails'}`}
          onCancel={() => setBulkQrConfirmOpen(false)}
          onConfirm={sendImportedQrEmails}
        >
          {bulkQrSendCount > 0
            ? <>Each uploaded guest who hasn't had a pass yet gets their QR pass by email. <span className="ig-pd-summary-line">Expected remaining today: <strong>{formatNumber(Math.max(0, qrEmailQuota.remaining - bulkQrSendCount))}</strong> of {formatNumber(qrEmailQuota.limit)}</span></>
            : 'There are no uploaded guests waiting for a QR pass right now.'}
        </DashDialog>
      )}
      {guest && <GuestDetails rsvp={guest} preEvent={preEvent} customFormSchema={preEvent.customFormSchema || []} onClose={() => setGuest(null)} />}
    </IgDashShell>
  );
}

export default PreEventDetail;
