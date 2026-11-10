import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createProgram, getDashboardBootstrap, getProgramForEdit, updateProgram } from '../api/programService';
import IgDashShell, { DashIcon, DashDialog } from '../components/IgDashShell';
import IgQuestionModal from '../components/IgQuestionModal';
import IgCheckinPreview from '../components/IgCheckinPreview';
import { useToast } from '../components/Toast';
import { useEventTemplate } from '../context/EventTemplateContext';
import { compressFlyerImage, fileToDataUrl, formatFileSize } from '../utils/flyerCompression';
import { MAX_CUSTOM_FIELDS } from '../utils/customFields';
import { localToday } from '../utils/dashboardFormat';

const MAX_SPONSORS = 12;
const MAX_WINNERS = 1000;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const SPONSOR_TIERS = ['Headline', 'Gold', 'Partner'];

// Fields guests can be asked for at check-in.
const FIELD_TILES = [
  ['fullName', 'Full Name', "Each guest's name."],
  ['emailAddress', 'Email Address', 'To send the event report and follow-ups.'],
  ['phoneNumber', 'Phone Number', 'Also used to spot first-timers.'],
  ['fellowship', 'Group', 'Group, fellowship or community.'],
  ['sex', 'Gender', 'For your gender breakdown.'],
  ['firstTimer', 'First-Timer', 'Asks if this is their first time.'],
  ['age', 'Age', 'For age-based events.'],
  ['school', 'School', 'For campus and youth events.'],
  ['department', 'Department', 'Department or unit.'],
  ['address', 'Address', 'Where they are coming from.'],
  ['link', 'Link', 'GitHub, portfolio or social link.'],
  ['textarea', 'Longer question', 'A question with a paragraph answer.']
];
const NO_FIELDS = FIELD_TILES.reduce((acc, [key]) => ({ ...acc, [key]: false }), {});

const AFTER_OPTIONS = [
  ['eventFlyer', 'Event flyer', 'One image for everyone, like your event poster.'],
  ['personalFlyer', 'Personalized flyer', "A card with each guest's first name they can save."],
  ['sponsors', 'Sponsors', 'Sponsor cards with a button guests can tap. You see the clicks.']
];

const TIME_OPTIONS = (() => {
  const out = [];
  for (let h = 0; h < 24; h += 1) {
    for (let m = 0; m < 60; m += 30) {
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const label = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
      out.push([value, label]);
    }
  }
  return out;
})();

// A saved time like 18:15 isn't on the half-hour list, so it's added rather than lost.
const timeOptionsWith = (value) => {
  if (!value || TIME_OPTIONS.some(([v]) => v === value)) return TIME_OPTIONS;
  const [h, m] = value.split(':').map(Number);
  const label = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  return [...TIME_OPTIONS, [value, label]].sort((a, b) => a[0].localeCompare(b[0]));
};

const EMPTY_IMAGE = { file: null, previewUrl: '', name: '', originalSize: 0, size: 0, processing: false, error: '', existing: false };
// An image already saved on the event: shown from its URL, only re-uploaded if replaced.
const savedImage = (url, name, fallback) => (url ? { ...EMPTY_IMAGE, previewUrl: url, name: name || fallback, existing: true } : EMPTY_IMAGE);
const DEFAULT_MESSAGE = '[FirstName], you are deeply loved and created for purpose.';

const Icon = {
  back: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 4L6 8l4 4" /></svg>,
  pencil: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z" /></svg>,
  upload: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 14v5h14v-5" /></svg>,
  image: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-9 9" /></svg>,
  alert: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>,
  lock: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>,
  group: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M16 5.2a3 3 0 0 1 0 5.6M18 19a5 5 0 0 0-3-4.6" /></svg>,
  phone: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></svg>
};

const parseMessages = (value) => String(value || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
const isHttpUrl = (value) => /^https?:\/\/[^\s.]+\.[^\s]+/i.test(String(value || '').trim());
const questionTypeLabel = (type) => (type === 'text' ? 'Short text' : type === 'radio' ? 'Pick one' : 'Pick many');

function FieldError({ id, children }) {
  if (!children) return null;
  return <span className="ig-st-error" id={id}>{Icon.alert}{children}</span>;
}

function Switch({ id, checked, onChange, title, description }) {
  return (
    <button type="button" role="switch" id={id} aria-checked={checked} className={`ig-pd-toggle${checked ? ' is-on' : ''}`} onClick={() => onChange(!checked)}>
      <span><strong>{title}</strong><span>{description}</span></span>
      <span className={`ig-db-switch${checked ? ' is-on' : ''}`}><span /></span>
    </button>
  );
}

function Step({ n, title, sub, children, labelledBy, locked = false }) {
  return (
    <section className={`ig-db-card ig-cp-step${locked ? ' is-locked' : ''}`} aria-labelledby={labelledBy}>
      <div className="ig-cp-step-head">
        <span className="ig-cp-step-num" aria-hidden="true">{n}</span>
        <span className="ig-cp-step-title">
          <strong id={labelledBy}>{title}</strong>
          <span>{sub}</span>
        </span>
        {locked && <span className="ig-ce-locked">{Icon.lock}Locked</span>}
      </div>
      {children}
    </section>
  );
}

// An optional image (background, logo): a dashed box until chosen, then a small row.
function SmallUpload({ id, title, hint, image, onPick, onRemove }) {
  const inputRef = useRef(null);
  return (
    <div className={`ig-ce-upload${image.file || image.existing ? ' has-file' : ''}`}>
      <input ref={inputRef} type="file" accept={IMAGE_TYPES.join(',')} className="ig-cp-file" tabIndex={-1} aria-hidden="true" onChange={(e) => { onPick(e.target.files?.[0]); e.target.value = ''; }} />
      {image.previewUrl
        ? <img src={image.previewUrl} alt="" className="ig-ce-upload-thumb" />
        : <span className="ig-ce-upload-icon" aria-hidden="true">{image.processing ? <span className="ig-st-spinner is-inline ig-cp-dark-spin" /> : Icon.upload}</span>}
      <span className="ig-ce-upload-text">
        <strong>{title}</strong>
        <span>{image.processing ? 'Compressing…' : image.file ? `${image.name} · ${formatFileSize(image.size)}` : image.existing ? image.name : hint}</span>
        {image.error && <span className="ig-ce-upload-err">{image.error}</span>}
      </span>
      <span className="ig-ce-upload-actions">
        <button type="button" id={id} className="ig-st-pill ig-ce-pill-sm" onClick={() => inputRef.current?.click()} disabled={image.processing}>{image.file || image.existing ? 'Change' : 'Choose'}</button>
        {(image.file || image.existing) && <button type="button" className="ig-db-round-btn is-xs is-line ig-pd-danger" aria-label={`Remove ${title.toLowerCase()}`} onClick={onRemove}>{DashIcon.trash}</button>}
      </span>
    </div>
  );
}

/* ---------------- Sponsor popup ---------------- */
function SponsorModal({ sponsor, split, onClose, onSave }) {
  const [draft, setDraft] = useState(() => ({
    clientId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    sponsorName: '',
    ctaText: 'Learn More',
    ctaLink: '',
    boothText: '',
    campaignTag: '',
    tier: '',
    distributionPercentage: '',
    image: EMPTY_IMAGE,
    ...(sponsor || {})
  }));
  const [errors, setErrors] = useState({});
  const nameRef = useRef(null);
  const fileRef = useRef(null);
  const createdUrlRef = useRef('');
  const savedRef = useRef(false);

  useEffect(() => {
    nameRef.current?.focus();
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // A preview made here but never saved is released when the popup closes.
  useEffect(() => () => {
    if (!savedRef.current && createdUrlRef.current) URL.revokeObjectURL(createdUrlRef.current);
  }, []);

  const update = (key, value) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const pickImage = async (file) => {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      setErrors((e) => ({ ...e, image: 'Choose a JPEG, PNG or WebP image.' }));
      return;
    }
    setDraft((d) => ({ ...d, image: { ...d.image, processing: true, error: '' } }));
    setErrors((e) => ({ ...e, image: '' }));
    try {
      const compressed = await compressFlyerImage(file);
      if (createdUrlRef.current) URL.revokeObjectURL(createdUrlRef.current);
      const previewUrl = URL.createObjectURL(compressed);
      createdUrlRef.current = previewUrl;
      setDraft((d) => ({ ...d, image: { file: compressed, previewUrl, name: file.name, originalSize: file.size, size: compressed.size, processing: false, error: '' } }));
    } catch (error) {
      setDraft((d) => ({ ...d, image: { ...d.image, processing: false } }));
      setErrors((e) => ({ ...e, image: String(error.message || 'We could not use that image.').replace(/flyer/gi, 'image') }));
    }
  };

  const submit = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (draft.image.processing) return;
    const next = {};
    if (!draft.sponsorName.trim()) next.sponsorName = 'Add the sponsor name.';
    if (!draft.image.file && !draft.image.existing) next.image = 'Add the sponsor flyer guests will see.';
    if (!draft.ctaText.trim()) next.ctaText = 'Add the button text.';
    if (!isHttpUrl(draft.ctaLink)) next.ctaLink = 'Add a button link that starts with https://';
    if (split) {
      const pct = Number(draft.distributionPercentage);
      if (!Number.isInteger(pct) || pct < 1 || pct > 100) next.distributionPercentage = 'Enter a whole number from 1 to 100.';
    }
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    savedRef.current = true;
    onSave({
      ...draft,
      sponsorName: draft.sponsorName.trim(),
      ctaText: draft.ctaText.trim(),
      ctaLink: draft.ctaLink.trim(),
      boothText: draft.boothText.trim(),
      campaignTag: draft.campaignTag.trim()
    });
  };

  return (
    <div className="ig-db-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="ig-db-dialog ig-pd-modal ig-ce-sponsor-modal" role="dialog" aria-modal="true" aria-labelledby="ig-sp-title" onSubmit={submit} noValidate>
        <div className="ig-pd-modal-head">
          <span>
            <h2 id="ig-sp-title">{sponsor ? 'Edit sponsor' : 'Add a sponsor'}</h2>
            <p>Guests see this card after they check in.</p>
          </span>
          <button type="button" className="ig-db-round-btn is-sm" aria-label="Close" onClick={onClose}>{DashIcon.close}</button>
        </div>

        <div className={`ig-st-field${errors.sponsorName ? ' has-error' : ''}`}>
          <label htmlFor="ig-sp-name">Sponsor name</label>
          <input id="ig-sp-name" ref={nameRef} value={draft.sponsorName} onChange={(e) => update('sponsorName', e.target.value)} maxLength={120} placeholder="e.g. Paystack" aria-invalid={Boolean(errors.sponsorName) || undefined} />
          <FieldError>{errors.sponsorName}</FieldError>
        </div>

        <div className="ig-st-field">
          <span className="ig-ce-label">Sponsor flyer</span>
          <input ref={fileRef} type="file" accept={IMAGE_TYPES.join(',')} className="ig-cp-file" tabIndex={-1} aria-hidden="true" onChange={(e) => { pickImage(e.target.files?.[0]); e.target.value = ''; }} />
          <div className={`ig-ce-upload${draft.image.file || draft.image.existing ? ' has-file' : ''}${errors.image ? ' has-error' : ''}`}>
            {draft.image.previewUrl
              ? <img src={draft.image.previewUrl} alt="" className="ig-ce-upload-thumb" />
              : <span className="ig-ce-upload-icon" aria-hidden="true">{draft.image.processing ? <span className="ig-st-spinner is-inline ig-cp-dark-spin" /> : Icon.upload}</span>}
            <span className="ig-ce-upload-text">
              <strong>{draft.image.processing ? 'Compressing…' : draft.image.file || draft.image.existing ? draft.image.name : 'Choose an image'}</strong>
              <span>{draft.image.file ? formatFileSize(draft.image.size) : draft.image.existing ? 'Saved flyer. Choose another to replace it.' : 'JPEG, PNG or WebP. We compress it to about 200 KB.'}</span>
            </span>
            <span className="ig-ce-upload-actions">
              <button type="button" className="ig-st-pill ig-ce-pill-sm" onClick={() => fileRef.current?.click()} disabled={draft.image.processing}>{draft.image.file || draft.image.existing ? 'Change' : 'Choose'}</button>
            </span>
          </div>
          <FieldError>{errors.image}</FieldError>
          {sponsor?.clickCount > 0 && <span className="ig-pd-hint ig-cp-hint">{sponsor.clickCount} {sponsor.clickCount === 1 ? 'click' : 'clicks'} so far. Editing keeps them.</span>}
        </div>

        <div className="ig-st-row ig-ce-modal-row">
          <div className={`ig-st-field${errors.ctaText ? ' has-error' : ''}`}>
            <label htmlFor="ig-sp-cta">Button text</label>
            <input id="ig-sp-cta" value={draft.ctaText} onChange={(e) => update('ctaText', e.target.value)} maxLength={80} placeholder="Learn More" />
            <FieldError>{errors.ctaText}</FieldError>
          </div>
          <div className={`ig-st-field${errors.ctaLink ? ' has-error' : ''}`}>
            <label htmlFor="ig-sp-link">Button link</label>
            <input id="ig-sp-link" type="url" inputMode="url" value={draft.ctaLink} onChange={(e) => update('ctaLink', e.target.value)} maxLength={1000} placeholder="https://" aria-invalid={Boolean(errors.ctaLink) || undefined} />
            <FieldError>{errors.ctaLink}</FieldError>
          </div>
        </div>

        <div className="ig-st-row ig-ce-modal-row">
          <div className="ig-st-field">
            <label htmlFor="ig-sp-booth">Booth or location <em>(optional)</em></label>
            <input id="ig-sp-booth" value={draft.boothText} onChange={(e) => update('boothText', e.target.value)} maxLength={160} placeholder="e.g. Booth A12" />
          </div>
          {split ? (
            <div className={`ig-st-field${errors.distributionPercentage ? ' has-error' : ''}`}>
              <label htmlFor="ig-sp-pct">Share of guests (%)</label>
              <input id="ig-sp-pct" type="number" inputMode="numeric" min="1" max="100" value={draft.distributionPercentage} onChange={(e) => update('distributionPercentage', e.target.value)} placeholder="e.g. 50" />
              {errors.distributionPercentage
                ? <FieldError>{errors.distributionPercentage}</FieldError>
                : <span className="ig-pd-hint ig-cp-hint">Percent of guests who see this card.</span>}
            </div>
          ) : (
            <div className="ig-st-field">
              <label htmlFor="ig-sp-tier">Tier <em>(optional)</em></label>
              <select id="ig-sp-tier" className="ig-pd-select" value={draft.tier} onChange={(e) => update('tier', e.target.value)}>
                <option value="">No tier</option>
                {SPONSOR_TIERS.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
                {draft.tier && !SPONSOR_TIERS.includes(draft.tier) && <option value={draft.tier}>{draft.tier}</option>}
              </select>
              <span className="ig-pd-hint ig-cp-hint">Headline sponsors show first.</span>
            </div>
          )}
        </div>

        <div className="ig-db-dialog-actions">
          <button type="button" className="ig-db-btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="ig-db-btn-primary" disabled={draft.image.processing}>{sponsor ? 'Save sponsor' : 'Add sponsor'}</button>
        </div>
      </form>
    </div>
  );
}

/* ---------------- Page ---------------- */
function CreateProgram() {
  const toast = useToast();
  const navigate = useNavigate();
  // /program/:id/edit opens this page in edit mode with the event's saved settings.
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);
  const { template, setTemplateKey } = useEventTemplate();
  const setTemplateRef = useRef(setTemplateKey);
  setTemplateRef.current = setTemplateKey;
  const today = useMemo(() => localToday(), []);
  const eventWord = (template?.event?.singular || 'Event').toLowerCase();

  const [boot, setBoot] = useState(null);
  const [editData, setEditData] = useState(null);
  const [loadState, setLoadState] = useState(isEdit ? 'loading' : 'ready');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [form, setForm] = useState({
    programTitle: '',
    date: '',
    startTime: '',
    endTime: '',
    trackingMode: 'count-only',
    dataFields: NO_FIELDS,
    textareaLabel: '',
    customFormSchema: [],
    strictDeviceFingerprinting: true,
    proxyCheckinEnabled: false,
    after: 'eventFlyer',
    messages: DEFAULT_MESSAGE,
    brandColor: '#E8590C',
    textColor: '#FFFFFF',
    accentColor: '#FFB86B',
    sponsorMode: 'carousel',
    sponsorExpectedAttendees: '',
    enableGifting: false,
    numberOfWinners: 1
  });
  const [flyer, setFlyer] = useState(EMPTY_IMAGE);
  const [background, setBackground] = useState(EMPTY_IMAGE);
  const [logo, setLogo] = useState(EMPTY_IMAGE);
  const [sponsors, setSponsors] = useState([]);
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [questionModal, setQuestionModal] = useState(null);
  const [sponsorModal, setSponsorModal] = useState(null);
  const [phoneRuleOpen, setPhoneRuleOpen] = useState(false);
  // Live preview: which guest screen it shows, and the full-screen sheet on smaller screens.
  const [previewTab, setPreviewTab] = useState('form');
  const [previewOpen, setPreviewOpen] = useState(false);
  // 'on' or 'off' while the "check in others" popup is open.
  const [proxyConfirm, setProxyConfirm] = useState(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const flyerInputRef = useRef(null);
  const leavingRef = useRef(false);
  const urlsRef = useRef(new Set());

  const collect = form.trackingMode === 'collect-data';
  const personal = collect && form.after === 'personalFlyer';
  const split = form.sponsorMode === 'distribution';
  // Editing after guests have checked in: date, start time, check-in method and the form stay as they are.
  const locked = isEdit && editData?.locked === true;
  const checkinsCount = editData?.checkinsCount || 0;
  const winnersFloor = isEdit ? Math.max(1, editData?.winnersSelected || 0) : 1;
  const personalBlocked = locked && !editData?.dataFields?.fullName;

  useEffect(() => {
    if (!localStorage.getItem('token')) navigate('/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    let alive = true;
    getDashboardBootstrap(today, today, today)
      .then((res) => {
        if (!alive || !res) return;
        setBoot(res);
        if (res.church?.organizationType) setTemplateRef.current(res.church.organizationType);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [today]);

  useEffect(() => {
    if (!isEdit) return undefined;
    let alive = true;
    setLoadState('loading');
    getProgramForEdit(editId)
      .then(({ program }) => {
        if (!alive) return;
        const config = program.personalizedFlyerConfig || {};
        const messages = Array.isArray(config.templates) && config.templates.length ? config.templates : (config.template ? [config.template] : []);
        const textareaLabel = program.dataFieldConfig?.textareaLabel;
        setEditData(program);
        setForm({
          programTitle: program.title || '',
          date: program.date || '',
          startTime: program.startTime || '',
          endTime: program.endTime || '',
          trackingMode: program.trackingMode === 'collect-data' ? 'collect-data' : 'count-only',
          dataFields: { ...NO_FIELDS, ...(program.dataFields || {}) },
          textareaLabel: textareaLabel && textareaLabel !== 'Additional Response' ? textareaLabel : '',
          customFormSchema: program.customFormSchema || [],
          strictDeviceFingerprinting: program.strictDeviceFingerprinting !== false,
          proxyCheckinEnabled: program.proxyCheckinEnabled === true,
          after: program.flyerType === 'personalized' ? 'personalFlyer' : ((program.sponsors || []).length && !program.flyerUrl ? 'sponsors' : 'eventFlyer'),
          messages: messages.length ? messages.join('\n') : DEFAULT_MESSAGE,
          brandColor: (config.brandColor || '#E8590C').toUpperCase(),
          textColor: (config.textColor || '#FFFFFF').toUpperCase(),
          accentColor: (config.accentColor || '#FFB86B').toUpperCase(),
          sponsorMode: program.sponsorDisplayMode === 'distribution' ? 'distribution' : 'carousel',
          sponsorExpectedAttendees: program.sponsorExpectedAttendees ? String(program.sponsorExpectedAttendees) : '',
          enableGifting: program.giftingEnabled === true,
          numberOfWinners: Math.max(1, program.totalWinners || 1, program.winnersSelected || 0)
        });
        setFlyer(savedImage(program.flyerUrl, program.flyerOriginalName, 'Current flyer'));
        setBackground(savedImage(program.personalizedBackgroundUrl, program.personalizedBackgroundOriginalName, 'Current background'));
        setLogo(savedImage(program.personalizedLogoUrl, program.personalizedLogoOriginalName, 'Current logo'));
        setSponsors((program.sponsors || []).map((sponsor) => ({
          clientId: sponsor.id,
          id: sponsor.id,
          sponsorName: sponsor.sponsorName,
          ctaText: sponsor.ctaText || 'Learn More',
          ctaLink: sponsor.ctaLink,
          boothText: sponsor.boothText || '',
          campaignTag: sponsor.campaignTag || '',
          tier: sponsor.tier || '',
          distributionPercentage: sponsor.distributionPercentage ? String(sponsor.distributionPercentage) : '',
          clickCount: sponsor.clickCount || 0,
          image: savedImage(sponsor.flyerUrl, sponsor.flyerOriginalName, 'Current flyer')
        })));
        setDirty(false);
        setLoadState('ready');
      })
      .catch((error) => {
        if (!alive) return;
        setLoadState(error.response?.status === 404 ? 'notfound' : 'error');
      });
    return () => { alive = false; };
  }, [isEdit, editId, loadAttempt]);

  // Free every image preview when leaving the page.
  useEffect(() => {
    const urls = urlsRef.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event) => {
      if (leavingRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const clearError = (...keys) => setErrors((prev) => {
    if (!keys.some((key) => prev[key])) return prev;
    const next = { ...prev };
    keys.forEach((key) => { delete next[key]; });
    return next;
  });

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    clearError(key);
    setServerError('');
    setDirty(true);
  };

  /* ---------- Check-in mode ---------- */
  const setMode = (mode) => {
    if (locked) return;
    setForm((prev) => ({
      ...prev,
      trackingMode: mode,
      // Count only keeps no names, so the name-based flyer can't apply.
      after: mode === 'count-only' && prev.after === 'personalFlyer' ? 'eventFlyer' : prev.after,
      dataFields: mode === 'collect-data' && !Object.values(prev.dataFields).some(Boolean)
        ? { ...prev.dataFields, fullName: true, phoneNumber: true }
        : prev.dataFields
    }));
    clearError('dataFields');
    setDirty(true);
  };

  const toggleField = (key) => {
    if (locked) return;
    if (personal && key === 'fullName') {
      toast.info('Full Name stays on while you use the personalized flyer.');
      return;
    }
    setForm((prev) => ({ ...prev, dataFields: { ...prev.dataFields, [key]: !prev.dataFields[key] } }));
    clearError('dataFields');
    setDirty(true);
  };

  const setAfter = (key) => {
    if (key === 'personalFlyer' && personalBlocked) return;
    setPreviewTab('after');
    setForm((prev) => ({
      ...prev,
      after: key,
      dataFields: key === 'personalFlyer' ? { ...prev.dataFields, fullName: true } : prev.dataFields
    }));
    setDirty(true);
  };

  /* ---------- Questions ---------- */
  const openQuestion = (field = null) => {
    if (!field && form.customFormSchema.length >= MAX_CUSTOM_FIELDS) {
      toast.error(`You can add up to ${MAX_CUSTOM_FIELDS} questions.`);
      return;
    }
    setQuestionModal(field || {});
  };
  const saveQuestion = (field) => {
    setForm((prev) => ({
      ...prev,
      customFormSchema: prev.customFormSchema.some((item) => item.id === field.id)
        ? prev.customFormSchema.map((item) => (item.id === field.id ? field : item))
        : [...prev.customFormSchema, field]
    }));
    setQuestionModal(null);
    setDirty(true);
  };
  const removeQuestion = (id) => {
    setForm((prev) => ({ ...prev, customFormSchema: prev.customFormSchema.filter((field) => field.id !== id) }));
    setDirty(true);
  };

  /* ---------- Images ---------- */
  const pickImage = async (file, current, setImage, errorKey) => {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      setImage((prev) => ({ ...prev, error: 'Choose a JPEG, PNG or WebP image.' }));
      return;
    }
    setImage((prev) => ({ ...prev, processing: true, error: '' }));
    try {
      const compressed = await compressFlyerImage(file);
      if (current.previewUrl) { URL.revokeObjectURL(current.previewUrl); urlsRef.current.delete(current.previewUrl); }
      const previewUrl = URL.createObjectURL(compressed);
      urlsRef.current.add(previewUrl);
      setImage({ file: compressed, previewUrl, name: file.name, originalSize: file.size, size: compressed.size, processing: false, error: '' });
      if (errorKey) clearError(errorKey);
      setDirty(true);
    } catch (error) {
      setImage((prev) => ({ ...prev, processing: false, error: String(error.message || 'We could not use that image. Try a JPEG, PNG or WebP.').replace(/flyer/gi, 'image') }));
    }
  };
  const removeImage = (current, setImage) => {
    if (current.previewUrl) { URL.revokeObjectURL(current.previewUrl); urlsRef.current.delete(current.previewUrl); }
    setImage(EMPTY_IMAGE);
    setDirty(true);
  };

  /* ---------- Sponsors ---------- */
  const openSponsor = (sponsor = null) => {
    if (!sponsor && sponsors.length >= MAX_SPONSORS) {
      toast.error(`You can add up to ${MAX_SPONSORS} sponsors.`);
      return;
    }
    setSponsorModal(sponsor || {});
  };
  const saveSponsor = (sponsor) => {
    if (sponsor.image.previewUrl) urlsRef.current.add(sponsor.image.previewUrl);
    setSponsors((prev) => (prev.some((item) => item.clientId === sponsor.clientId)
      ? prev.map((item) => (item.clientId === sponsor.clientId ? sponsor : item))
      : [...prev, sponsor]));
    setSponsorModal(null);
    clearError('sponsors', `sponsor-${sponsor.clientId}`);
    setDirty(true);
  };
  const removeSponsor = (clientId) => {
    setSponsors((prev) => prev.filter((item) => item.clientId !== clientId));
    clearError('sponsors', `sponsor-${clientId}`);
    setDirty(true);
  };
  const splitTotal = sponsors.reduce((sum, sponsor) => sum + (Number(sponsor.distributionPercentage) || 0), 0);

  /* ---------- Validate + submit ---------- */
  const validate = () => {
    const next = {};
    if (!form.programTitle.trim()) next.programTitle = `Give your ${eventWord} a name`;
    if (!form.date) next.date = 'Pick the date';
    if (!form.startTime) next.startTime = 'Pick a start time';
    if (!form.endTime) next.endTime = 'Pick an end time';
    else if (form.startTime && form.startTime >= form.endTime) next.endTime = 'Must be after the start time';
    if (!locked && collect && !Object.values(form.dataFields).some(Boolean) && form.customFormSchema.length === 0) {
      next.dataFields = 'Add at least one field, or switch to Count only';
    }
    if (personal && parseMessages(form.messages).length === 0) next.messages = 'Add at least one message for the personalized flyer';
    if (collect && form.enableGifting && !(Number(form.numberOfWinners) >= 1)) next.numberOfWinners = 'Choose at least 1 winner';
    else if (collect && form.enableGifting && Number(form.numberOfWinners) < winnersFloor) {
      next.numberOfWinners = `${winnersFloor} ${winnersFloor === 1 ? 'winner has' : 'winners have'} already been drawn, so choose at least ${winnersFloor}`;
    }
    if (sponsors.length > 0) {
      sponsors.forEach((sponsor) => {
        const label = sponsor.sponsorName || 'A sponsor';
        if (!isHttpUrl(sponsor.ctaLink)) next[`sponsor-${sponsor.clientId}`] = `${label} needs a button link`;
        else if (!sponsor.image.file && !sponsor.image.existing) next[`sponsor-${sponsor.clientId}`] = `${label} needs a flyer image`;
        else if (split && !(Number.isInteger(Number(sponsor.distributionPercentage)) && Number(sponsor.distributionPercentage) >= 1 && Number(sponsor.distributionPercentage) <= 100)) {
          next[`sponsor-${sponsor.clientId}`] = `${label} needs a share of guests from 1 to 100`;
        }
      });
      if (split) {
        const expected = Number(form.sponsorExpectedAttendees);
        if (!Number.isInteger(expected) || expected < 1) next.sponsorExpectedAttendees = 'Enter how many guests you expect';
        if (splitTotal !== 100 && !Object.keys(next).some((key) => key.startsWith('sponsor-'))) {
          next.sponsors = `Sponsor shares must add up to 100%. They add up to ${splitTotal}% now`;
        }
      }
    }
    return next;
  };

  // Where each problem lives on the page, in reading order.
  const errorTarget = (key) => {
    if (key.startsWith('sponsor-')) return `ig-ce-${key}`;
    return {
      programTitle: 'ig-ce-title', date: 'ig-ce-date', startTime: 'ig-ce-start', endTime: 'ig-ce-end', dataFields: 'ig-ce-fields',
      messages: 'ig-ce-messages', sponsorExpectedAttendees: 'ig-ce-expected', sponsors: 'ig-ce-sponsors', numberOfWinners: 'ig-ce-winners',
      flyer: 'ig-ce-flyer'
    }[key];
  };
  const ERROR_ORDER = ['programTitle', 'date', 'startTime', 'endTime', 'dataFields', 'flyer', 'messages', 'sponsorExpectedAttendees', 'sponsors', 'numberOfWinners'];
  const errorList = [
    ...ERROR_ORDER.filter((key) => errors[key]),
    ...Object.keys(errors).filter((key) => key.startsWith('sponsor-') && errors[key])
  ].sort((a, b) => {
    const rank = (key) => (key.startsWith('sponsor-') ? ERROR_ORDER.indexOf('sponsors') - 0.5 : ERROR_ORDER.indexOf(key));
    return rank(a) - rank(b);
  });

  const goToError = (key) => {
    // Sponsor problems live in the Sponsors tab.
    if (key === 'sponsors' || key === 'sponsorExpectedAttendees' || key.startsWith('sponsor-')) setForm((prev) => ({ ...prev, after: 'sponsors' }));
    if (key === 'messages') setForm((prev) => ({ ...prev, after: 'personalFlyer' }));
    window.setTimeout(() => {
      const el = document.getElementById(errorTarget(key));
      if (!el) return;
      if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus({ preventScroll: true });
    }, 30);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setServerError('');
    if (flyer.processing || background.processing || logo.processing) {
      toast.info('One moment, an image is still compressing.');
      return;
    }
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) {
      window.setTimeout(() => {
        const box = document.getElementById('ig-ce-errors');
        if (box) {
          if (typeof box.scrollIntoView === 'function') box.scrollIntoView({ behavior: 'smooth', block: 'center' });
          box.focus({ preventScroll: true });
        }
      }, 0);
      return;
    }

    setSubmitting(true);
    try {
      const asPayload = async (image) => (image.file ? { dataUrl: await fileToDataUrl(image.file), originalName: image.name, size: image.size } : null);
      const messages = parseMessages(form.messages);
      const sponsorPayloads = await Promise.all(sponsors.map(async (sponsor) => ({
        ...(sponsor.id ? { id: sponsor.id } : {}),
        sponsorName: sponsor.sponsorName,
        ctaText: sponsor.ctaText,
        ctaLink: sponsor.ctaLink,
        boothText: sponsor.boothText,
        campaignTag: sponsor.campaignTag,
        tier: split ? '' : sponsor.tier,
        distributionPercentage: split ? Number(sponsor.distributionPercentage) : null,
        flyer: await asPayload(sponsor.image)
      })));

      const payload = {
        programTitle: form.programTitle.trim(),
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        trackingMode: form.trackingMode,
        dataFields: collect ? form.dataFields : NO_FIELDS,
        dataFieldConfig: { textareaLabel: form.textareaLabel.trim() || 'Additional Response' },
        customFormSchema: collect ? form.customFormSchema : [],
        proxyCheckinEnabled: collect && form.proxyCheckinEnabled,
        strictDeviceFingerprinting: collect ? form.strictDeviceFingerprinting : true,
        enableGifting: collect && form.enableGifting,
        numberOfWinners: collect && form.enableGifting ? Number(form.numberOfWinners) : 0,
        flyerType: personal ? 'personalized' : 'standard',
        eventFlyer: personal ? null : await asPayload(flyer),
        personalizedFlyerConfig: {
          template: messages[0] || '',
          templates: messages,
          brandColor: form.brandColor,
          textColor: form.textColor,
          accentColor: form.accentColor
        },
        personalizedBackground: personal ? await asPayload(background) : null,
        personalizedLogo: personal ? await asPayload(logo) : null,
        sponsorDisplayMode: form.sponsorMode,
        sponsorExpectedAttendees: split && sponsors.length > 0 ? Number(form.sponsorExpectedAttendees) : null,
        sponsors: sponsorPayloads
      };
      if (isEdit) {
        // Saved images not shown any more are removed from the event.
        payload.removeEventFlyer = Boolean(editData?.flyerUrl) && !flyer.previewUrl;
        payload.removePersonalizedBackground = Boolean(editData?.personalizedBackgroundUrl) && !background.previewUrl;
        payload.removePersonalizedLogo = Boolean(editData?.personalizedLogoUrl) && !logo.previewUrl;
        await updateProgram(editId, payload);
        leavingRef.current = true;
        setDirty(false);
        toast.success('Changes saved. Guests see them on their next scan.');
        navigate(`/program/${editId}`);
        return;
      }
      const response = await createProgram(payload);
      leavingRef.current = true;
      setDirty(false);
      toast.success(`Your ${eventWord} is ready. Print or share the QR code.`);
      navigate(`/program/${response.program.id}`);
    } catch (error) {
      const data = error.response?.data || {};
      const message = data.error || (isEdit
        ? 'We could not save your changes. Check your connection and try again.'
        : `We could not create the ${eventWord}. Check your connection and try again.`);
      if (data.field && errorTarget(data.field)) {
        setErrors({ [data.field]: message });
        goToError(data.field);
      } else {
        setServerError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const backTo = isEdit ? `/program/${editId}` : '/programs';
  const cancel = () => {
    if (dirty) setLeaveOpen(true);
    else navigate(backTo);
  };
  const discard = () => {
    leavingRef.current = true;
    setDirty(false);
    setLeaveOpen(false);
    navigate(backTo);
  };

  const shellProps = {
    active: 'events',
    crumb: `${isEdit ? 'Edit' : 'New'} ${template?.event?.singular || 'Event'}`,
    church: boot?.church ? { name: boot.church.churchName, email: boot.church.email, logoUrl: boot.church.logoUrl } : null,
    counts: { preEvents: boot?.stats?.preEventCount || 0, events: boot?.stats?.totalProgramsAllTime || 0 },
    unreadCount: boot?.unreadCount || 0,
    live: boot?.stats?.live || null,
    template
  };

  useEffect(() => {
    if (!previewOpen) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') setPreviewOpen(false); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [previewOpen]);

  const previewProps = {
    event: {
      title: form.programTitle.trim(),
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      flyerUrl: flyer.previewUrl || '',
      hostName: boot?.church?.churchName || '',
      hostLogoUrl: boot?.church?.logoUrl || ''
    },
    collect,
    dataFields: form.dataFields,
    textareaLabel: form.textareaLabel.trim(),
    questions: form.customFormSchema,
    gifting: collect && form.enableGifting,
    after: form.after,
    messages: parseMessages(form.messages),
    colors: { brand: form.brandColor, text: form.textColor, accent: form.accentColor },
    backgroundUrl: background.previewUrl,
    logoUrl: logo.previewUrl,
    sponsors,
    sponsorMode: form.sponsorMode,
    proxy: form.proxyCheckinEnabled
  };
  const previewTabs = (
    <div className="ig-ce-pvtabs" role="tablist" aria-label="Preview screen">
      {[['form', 'Check-in'], ['after', 'After check-in']].map(([key, label]) => (
        <button key={key} type="button" role="tab" aria-selected={previewTab === key} className={previewTab === key ? 'is-on' : ''} onClick={() => setPreviewTab(key)}>{label}</button>
      ))}
    </div>
  );

  // Count only has no form, so its steps are renumbered.
  const afterStep = collect ? 5 : 3;
  const afterBadge = { eventFlyer: flyer.file || flyer.existing ? 'Added' : '', personalFlyer: '', sponsors: sponsors.length ? `${sponsors.length} added` : '' };

  if (isEdit && loadState !== 'ready') {
    return (
      <IgDashShell {...shellProps}>
        <div className="ig-db-page ig-cp ig-ce">
          {loadState === 'loading' ? (
            <div className="ig-ce-loading" role="status"><span className="ig-st-spinner is-inline ig-cp-dark-spin" aria-hidden="true" />Loading your {eventWord}…</div>
          ) : (
            <div className="ig-db-card ig-ce-loadfail">
              <strong>{loadState === 'notfound' ? `This ${eventWord} doesn't exist` : `We couldn't load this ${eventWord}`}</strong>
              <span>{loadState === 'notfound' ? 'It may have been deleted, or it belongs to another workspace.' : 'Check your connection and try again.'}</span>
              <span className="ig-ce-loadfail-actions">
                {loadState === 'error' && <button type="button" className="ig-db-btn-primary" onClick={() => setLoadAttempt((n) => n + 1)}>Try again</button>}
                <Link to="/programs" className="ig-db-btn-ghost">{template?.event?.all || 'All Events'}</Link>
              </span>
            </div>
          )}
        </div>
      </IgDashShell>
    );
  }

  return (
    <IgDashShell {...shellProps}>
      <div className="ig-db-page ig-cp ig-ce">
        <header className="ig-cp-head">
          <Link to={backTo} className="ig-pd-back" onClick={(event) => { if (dirty) { event.preventDefault(); setLeaveOpen(true); } }}>
            {Icon.back}{isEdit ? (editData?.title || template?.event?.singular || 'Event') : (template?.event?.all || 'All Events')}
          </Link>
          {isEdit
            ? <h1>Edit <span className="ig-db-title-mark">{eventWord}</span></h1>
            : <h1>Create {/^[aeiou]/i.test(eventWord) ? 'an' : 'a'} <span className="ig-db-title-mark">{eventWord}</span></h1>}
          <p>{isEdit
            ? 'Your QR code and check-in links stay the same, so nothing you printed needs replacing.'
            : 'Set up check-in for the day. You get a QR code for the entrance as soon as you create it.'}</p>
        </header>

        {isEdit && (
          <div className={`ig-ce-state${locked ? ' is-live' : ''}`} role="status">
            <em>{locked ? (editData?.isActive === false ? 'Ended' : 'Live') : 'Not started'}</em>
            <span>
              {locked
                ? `${editData?.isActive === false ? 'This ' + eventWord + ' has ended and' : 'This ' + eventWord + ' is running and'} ${checkinsCount} ${checkinsCount === 1 ? 'guest has' : 'guests have'} checked in. Changes show up for the next guest who scans. A few settings are locked to protect your data.`
                : 'Everything can still change. Once the first guest checks in, the check-in method and form lock.'}
            </span>
          </div>
        )}

        <div className="ig-cp-layout ig-ce-layout">
        <form className="ig-cp-form ig-ce-form" onSubmit={submit} noValidate>
          {errorList.length > 0 && (
            <div className="ig-ce-errors" id="ig-ce-errors" role="alert" tabIndex={-1}>
              <span className="ig-ce-errors-icon" aria-hidden="true">!</span>
              <span className="ig-ce-errors-body">
                <strong>Fix {errorList.length} {errorList.length === 1 ? 'thing' : 'things'} to create this {eventWord}</strong>
                {errorList.map((key) => (
                  <button type="button" key={key} onClick={() => goToError(key)}>{errors[key]}</button>
                ))}
              </span>
            </div>
          )}

          {/* 1. Event details */}
          <Step n={1} title={`${template?.event?.singular || 'Event'} details`} sub="Shown on the check-in page and your dashboard" labelledBy="ig-ce-s1">
            <div className={`ig-st-field${errors.programTitle ? ' has-error' : ''}`}>
              <label htmlFor="ig-ce-title">{template?.event?.titleLabel || 'Event Title'}</label>
              <input id="ig-ce-title" value={form.programTitle} onChange={(e) => update('programTitle', e.target.value)} placeholder={template?.event?.titlePlaceholder || 'e.g., Product Demo Night'} maxLength={255} aria-invalid={Boolean(errors.programTitle) || undefined} aria-describedby={errors.programTitle ? 'ig-ce-title-err' : undefined} />
              <FieldError id="ig-ce-title-err">{errors.programTitle}</FieldError>
            </div>
            <div className="ig-ce-when">
              <div className={`ig-st-field${errors.date ? ' has-error' : ''}`}>
                <label htmlFor="ig-ce-date">Date</label>
                <input id="ig-ce-date" type="date" value={form.date} onChange={(e) => update('date', e.target.value)} disabled={locked} aria-invalid={Boolean(errors.date) || undefined} />
                <FieldError>{errors.date}</FieldError>
              </div>
              <div className={`ig-st-field${errors.startTime ? ' has-error' : ''}`}>
                <label htmlFor="ig-ce-start">Start time</label>
                <select id="ig-ce-start" className="ig-pd-select" value={form.startTime} onChange={(e) => { update('startTime', e.target.value); clearError('endTime'); }} disabled={locked} aria-invalid={Boolean(errors.startTime) || undefined}>
                  <option value="">Select</option>
                  {timeOptionsWith(form.startTime).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <FieldError>{errors.startTime}</FieldError>
              </div>
              <div className={`ig-st-field${errors.endTime ? ' has-error' : ''}`}>
                <label htmlFor="ig-ce-end">End time</label>
                <select id="ig-ce-end" className="ig-pd-select" value={form.endTime} onChange={(e) => update('endTime', e.target.value)} aria-invalid={Boolean(errors.endTime) || undefined}>
                  <option value="">Select</option>
                  {timeOptionsWith(form.endTime).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <FieldError>{errors.endTime}</FieldError>
              </div>
            </div>
            {locked && <div className="ig-ce-locknote">Date and start time are locked because check-in has started. You can still move the end time.</div>}
          </Step>

          {/* 2. How guests check in */}
          <Step n={2} title="How guests check in" sub="This locks once the first guest checks in" labelledBy="ig-ce-s2" locked={locked}>
            {locked && <div className="ig-ce-locknote">{checkinsCount} {checkinsCount === 1 ? 'guest has' : 'guests have'} already checked in with this method, so it can't change now.</div>}
            <div className="ig-ce-modes" role="radiogroup" aria-labelledby="ig-ce-s2">
              {[
                ['count-only', 'Fastest', 'Count only', 'Guests scan and they are counted. No form, no names.', 'Best for large crowds and services'],
                ['collect-data', 'Most popular', 'Collect details', 'Guests scan and fill in a short form. You get names, first-timers and more.', 'Unlocks gifting, personalized flyers and exports']
              ].map(([value, tag, name, body, note]) => {
                const on = form.trackingMode === value;
                return (
                  <button key={value} type="button" role="radio" aria-checked={on} className={`ig-ce-mode${on ? ' is-on' : ''}`} onClick={() => setMode(value)} disabled={locked}>
                    <span className="ig-ce-mode-top"><em>{tag}</em><span className="ig-ce-radio" aria-hidden="true" /></span>
                    <strong>{name}</strong>
                    <span>{body}</span>
                    <small>{note}</small>
                  </button>
                );
              })}
            </div>
          </Step>

          {collect && (
            <>
              {/* 3. What guests fill in */}
              <Step n={3} title="What guests fill in" sub="Tap a field to add it to the check-in form. Added fields are required." labelledBy="ig-ce-s3" locked={locked}>
                {locked && <div className="ig-ce-locknote">Guests have already filled in this form. To keep your data consistent, fields and questions can't change mid-{eventWord}.</div>}
                <div className={`ig-cp-tiles${errors.dataFields ? ' has-error' : ''}`} id="ig-ce-fields" tabIndex={-1}>
                  {FIELD_TILES.map(([key, label, sub]) => {
                    const on = Boolean(form.dataFields[key]);
                    const neededForFlyer = personal && key === 'fullName';
                    return (
                      <button key={key} type="button" className={`ig-cp-tile${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => toggleField(key)} disabled={locked}>
                        <span className="ig-cp-tile-top"><strong>{label}</strong><em>{neededForFlyer ? 'Needed' : on ? 'Added' : 'Add'}</em></span>
                        <span>{neededForFlyer ? 'Used on the personalized flyer.' : sub}</span>
                      </button>
                    );
                  })}
                </div>
                <FieldError>{errors.dataFields}</FieldError>

                {form.dataFields.textarea && (
                  <div className="ig-st-field">
                    <label htmlFor="ig-ce-textareaLabel">Your longer question</label>
                    <input id="ig-ce-textareaLabel" value={form.textareaLabel} onChange={(e) => update('textareaLabel', e.target.value)} placeholder="e.g. What do you hope to get from today?" maxLength={120} disabled={locked} />
                  </div>
                )}

                <div className="ig-pd-q-head ig-cp-q-head">
                  <span className="ig-db-card-title"><strong>Your own questions</strong><span>{form.customFormSchema.length} of {MAX_CUSTOM_FIELDS} questions. Short answer, pick one or pick many.</span></span>
                  {!locked && <button type="button" className="ig-st-pill ig-pd-pill" onClick={() => openQuestion()} disabled={form.customFormSchema.length >= MAX_CUSTOM_FIELDS}>{DashIcon.plus}Add Question</button>}
                </div>
                {form.customFormSchema.length > 0 && (
                  <ul className="ig-pd-questions">
                    {form.customFormSchema.map((field) => (
                      <li key={field.id}>
                        <span className="ig-pd-q-text">
                          <strong>{field.label}</strong>
                          <span>
                            {questionTypeLabel(field.type)}
                            {field.required ? ' · Required' : ' · Optional'}
                            {field.options?.length ? ` · ${field.options.join(', ')}` : ''}
                          </span>
                        </span>
                        {!locked && <button type="button" className="ig-db-round-btn is-xs is-line" aria-label={`Edit ${field.label}`} onClick={() => openQuestion(field)}>{Icon.pencil}</button>}
                        {!locked && <button type="button" className="ig-db-round-btn is-xs is-line ig-pd-danger" aria-label={`Delete ${field.label}`} onClick={() => removeQuestion(field.id)}>{DashIcon.trash}</button>}
                      </li>
                    ))}
                  </ul>
                )}
              </Step>

              {/* 4. Check-in rules */}
              <Step n={4} title="Check-in rules" sub="How strict the door is" labelledBy="ig-ce-s4">
                <Switch
                  id="ig-ce-onephone"
                  checked={form.strictDeviceFingerprinting}
                  onChange={(v) => { if (v) update('strictDeviceFingerprinting', true); else setPhoneRuleOpen(true); }}
                  title="One check-in per phone"
                  description="Stops the same phone from checking in twice. Turn it off if families share one phone."
                />
                <Switch
                  id="ig-ce-proxy"
                  checked={form.proxyCheckinEnabled}
                  onChange={(v) => setProxyConfirm(v ? 'on' : 'off')}
                  title="Let guests check in others"
                  description="One guest can check in up to 3 people from their phone."
                />
              </Step>
            </>
          )}

          {/* After check-in */}
          <Step n={afterStep} title="After check-in" sub="What guests see right after they check in" labelledBy="ig-ce-s5">
            <div className="ig-ce-after" role="tablist" aria-labelledby="ig-ce-s5">
              {AFTER_OPTIONS.map(([key, name, body]) => {
                const on = form.after === key;
                const disabled = key === 'personalFlyer' && (!collect || personalBlocked);
                return (
                  <button key={key} type="button" role="tab" aria-selected={on} disabled={disabled} className={`ig-ce-opt${on ? ' is-on' : ''}`} onClick={() => setAfter(key)}>
                    <span className="ig-ce-mode-top"><strong>{name}</strong><span className="ig-ce-radio" aria-hidden="true" /></span>
                    <span>{disabled ? (personalBlocked && collect ? "Needs Full Name on the form, which can't change now." : 'Needs Collect details, since it uses names.') : body}</span>
                    {afterBadge[key] && <em>{afterBadge[key]}</em>}
                  </button>
                );
              })}
            </div>

            {form.after === 'eventFlyer' && (
              <>
                <input ref={flyerInputRef} type="file" accept={IMAGE_TYPES.join(',')} className="ig-cp-file" tabIndex={-1} aria-hidden="true" onChange={(e) => { pickImage(e.target.files?.[0], flyer, setFlyer, 'flyer'); e.target.value = ''; }} />
                {flyer.file || flyer.existing ? (
                  <div className="ig-ce-flyer">
                    <img src={flyer.previewUrl} alt="Chosen event flyer" />
                    <span className="ig-ce-flyer-text">
                      <strong>{flyer.name}</strong>
                      <span>{flyer.processing ? 'Compressing…' : flyer.existing ? 'Saved flyer. Guests see this now.' : flyer.size < flyer.originalSize ? `${formatFileSize(flyer.originalSize)}, compressed to ${formatFileSize(flyer.size)}` : formatFileSize(flyer.size)}</span>
                    </span>
                    <button type="button" id="ig-ce-flyer" className="ig-st-pill ig-ce-pill-sm" onClick={() => flyerInputRef.current?.click()} disabled={flyer.processing}>Change</button>
                    <button type="button" className="ig-db-round-btn is-xs is-line ig-pd-danger" aria-label="Remove flyer" onClick={() => removeImage(flyer, setFlyer)} disabled={flyer.processing}>{DashIcon.trash}</button>
                  </div>
                ) : (
                  <button type="button" id="ig-ce-flyer" className={`ig-cp-drop${flyer.processing ? ' is-busy' : ''}`} onClick={() => flyerInputRef.current?.click()} disabled={flyer.processing}>
                    {flyer.processing
                      ? <><span className="ig-st-spinner is-inline ig-cp-dark-spin" aria-hidden="true" /><strong>Compressing your flyer…</strong></>
                      : <><span className="ig-cp-drop-icon">{Icon.image}</span><strong>Add your event flyer</strong><span>Optional. JPEG, PNG or WebP. We compress it before upload.</span></>}
                  </button>
                )}
                <FieldError>{flyer.error || errors.flyer}</FieldError>
                {personal === false && sponsors.length > 0 && (flyer.file || flyer.existing) && (
                  <span className="ig-pd-hint ig-cp-hint">Guests see this flyer along with your sponsor cards.</span>
                )}
              </>
            )}

            {form.after === 'personalFlyer' && collect && (
              <>
                <div className="ig-ce-note">{Icon.alert}<span>Each card uses the guest's first name, so Full Name is now required on your form.</span></div>
                <div className={`ig-st-field${errors.messages ? ' has-error' : ''}`}>
                  <label htmlFor="ig-ce-messages">Messages</label>
                  <textarea id="ig-ce-messages" className="ig-pd-textarea ig-cp-textarea" rows={4} value={form.messages} onChange={(e) => update('messages', e.target.value)} placeholder="[FirstName], your presence makes this room brighter." maxLength={2000} />
                  {errors.messages
                    ? <FieldError>{errors.messages}</FieldError>
                    : <span className="ig-pd-hint ig-cp-hint">One message per line. We pick one at random for each guest. Use [FirstName] where their name goes.</span>}
                </div>
                <div className="ig-ce-colors">
                  {[['brandColor', 'Brand'], ['textColor', 'Text'], ['accentColor', 'Accent']].map(([key, label]) => (
                    <label key={key} className="ig-ce-color">
                      <input type="color" value={form[key]} onChange={(e) => update(key, e.target.value.toUpperCase())} aria-label={`${label} colour`} />
                      <span><strong>{label}</strong><span>{form[key]}</span></span>
                    </label>
                  ))}
                </div>
                <div className="ig-ce-uploads">
                  <SmallUpload id="ig-ce-bg" title="Background image" hint="Optional. Without one, we use your colours." image={background} onPick={(file) => pickImage(file, background, setBackground)} onRemove={() => removeImage(background, setBackground)} />
                  <SmallUpload id="ig-ce-logo" title="Your logo" hint="Optional. Shown on the card guests download." image={logo} onPick={(file) => pickImage(file, logo, setLogo)} onRemove={() => removeImage(logo, setLogo)} />
                </div>
              </>
            )}

            {form.after === 'sponsors' && (
              <>
                <div className="ig-ce-seg" role="group" aria-label="How sponsors are shown">
                  {[['carousel', 'Carousel and tiers'], ['distribution', 'Percentage split']].map(([value, label]) => (
                    <button key={value} type="button" aria-pressed={form.sponsorMode === value} className={form.sponsorMode === value ? 'is-on' : ''} onClick={() => { update('sponsorMode', value); clearError('sponsors', 'sponsorExpectedAttendees'); }}>{label}</button>
                  ))}
                </div>
                <span className="ig-pd-hint ig-cp-hint">
                  {split ? 'Each guest sees one sponsor. You choose what share of guests each sponsor gets.' : 'Guests swipe through every sponsor. Headline sponsors come first.'}
                </span>

                {split && (
                  <div className={`ig-st-field ig-ce-expected${errors.sponsorExpectedAttendees ? ' has-error' : ''}`}>
                    <label htmlFor="ig-ce-expected">Guests you expect</label>
                    <input id="ig-ce-expected" type="number" inputMode="numeric" min="1" value={form.sponsorExpectedAttendees} onChange={(e) => update('sponsorExpectedAttendees', e.target.value)} placeholder="e.g. 300" />
                    {errors.sponsorExpectedAttendees
                      ? <FieldError>{errors.sponsorExpectedAttendees}</FieldError>
                      : <span className="ig-pd-hint ig-cp-hint">Used to share sponsor cards fairly across your guests.</span>}
                  </div>
                )}

                <div id="ig-ce-sponsors" tabIndex={-1} className="ig-ce-sponsors">
                  {sponsors.map((sponsor) => {
                    const err = errors[`sponsor-${sponsor.clientId}`];
                    let host = '';
                    try { host = new URL(sponsor.ctaLink).hostname.replace(/^www\./, ''); } catch (e) { host = ''; }
                    return (
                      <div key={sponsor.clientId} className={`ig-ce-sponsor${err ? ' has-error' : ''}`} id={`ig-ce-sponsor-${sponsor.clientId}`} tabIndex={-1}>
                        {sponsor.image.previewUrl
                          ? <img src={sponsor.image.previewUrl} alt="" className="ig-ce-sponsor-thumb" />
                          : <span className="ig-ce-sponsor-thumb" aria-hidden="true">{(sponsor.sponsorName || 'S').charAt(0).toUpperCase()}</span>}
                        <span className="ig-ce-sponsor-text">
                          <strong>{sponsor.sponsorName}</strong>
                          <span>{[sponsor.ctaText, sponsor.boothText || host].filter(Boolean).join(' · ')}</span>
                          {err && <span className="ig-ce-upload-err">{err}</span>}
                        </span>
                        {split
                          ? <em>{sponsor.distributionPercentage ? `${sponsor.distributionPercentage}%` : 'No share'}</em>
                          : sponsor.tier && <em>{sponsor.tier}</em>}
                        <button type="button" className="ig-db-round-btn is-xs is-line" aria-label={`Edit ${sponsor.sponsorName}`} onClick={() => openSponsor(sponsor)}>{Icon.pencil}</button>
                        <button type="button" className="ig-db-round-btn is-xs is-line ig-pd-danger" aria-label={`Remove ${sponsor.sponsorName}`} onClick={() => removeSponsor(sponsor.clientId)}>{DashIcon.trash}</button>
                      </div>
                    );
                  })}
                </div>
                {split && sponsors.length > 0 && (
                  <span className={`ig-ce-total${splitTotal === 100 ? ' is-ok' : ''}`}>Shares add up to {splitTotal}%{splitTotal === 100 ? '.' : '. They need to reach exactly 100%.'}</span>
                )}
                <FieldError>{errors.sponsors}</FieldError>
                <button type="button" className="ig-st-pill ig-pd-pill ig-ce-add" onClick={() => openSponsor()} disabled={sponsors.length >= MAX_SPONSORS}>{DashIcon.plus}Add sponsor</button>
                {sponsors.length === 0 && <span className="ig-pd-hint ig-cp-hint">Optional. Add up to {MAX_SPONSORS} sponsors.</span>}
              </>
            )}
          </Step>

          {/* Gifting */}
          {collect && (
            <Step n={6} title="Gifting" sub="A lucky draw to thank guests for filling in the form" labelledBy="ig-ce-s6">
              <Switch
                id="ig-ce-gifting"
                checked={form.enableGifting}
                onChange={(v) => { update('enableGifting', v); clearError('numberOfWinners'); }}
                title="Pick gift winners"
                description="Winners are drawn at random from guests who submit the form."
              />
              {form.enableGifting && (
                <div className={`ig-ce-winners${errors.numberOfWinners ? ' has-error' : ''}`}>
                  <span>
                    <strong>Number of winners</strong>
                    <span>
                      {isEdit && (editData?.winnersSelected || 0) > 0
                        ? `${editData.winnersSelected} already drawn. You can add more, but not fewer.`
                        : 'Winners see a gift screen. You mark gifts handed out on the dashboard.'}
                    </span>
                  </span>
                  <span className="ig-ce-stepper">
                    <button type="button" aria-label="Fewer winners" onClick={() => update('numberOfWinners', Math.max(winnersFloor, (Number(form.numberOfWinners) || 1) - 1))} disabled={Number(form.numberOfWinners) <= winnersFloor}>−</button>
                    <input
                      id="ig-ce-winners"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max={MAX_WINNERS}
                      value={form.numberOfWinners}
                      onChange={(e) => update('numberOfWinners', e.target.value === '' ? '' : Math.min(MAX_WINNERS, Math.max(0, Math.floor(Number(e.target.value) || 0))))}
                      aria-label="Number of winners"
                    />
                    <button type="button" aria-label="More winners" onClick={() => update('numberOfWinners', Math.min(MAX_WINNERS, (Number(form.numberOfWinners) || 0) + 1))}>+</button>
                  </span>
                </div>
              )}
              <FieldError>{errors.numberOfWinners}</FieldError>
            </Step>
          )}

          {serverError && <div className="ig-cp-alert" role="alert">{Icon.alert}<span>{serverError}</span></div>}

          {isEdit && dirty && <span className="ig-ce-unsaved" role="status"><span aria-hidden="true" />You have unsaved changes</span>}
          <div className="ig-cp-actions">
            <button type="button" className="ig-db-btn-ghost" onClick={cancel} disabled={submitting}>Cancel</button>
            <button type="submit" className="ig-db-btn-primary" disabled={submitting || (isEdit && !dirty)}>
              {submitting
                ? <><span className="ig-st-spinner is-inline" aria-hidden="true" />{isEdit ? 'Saving…' : 'Creating…'}</>
                : (isEdit ? 'Save changes' : `Create ${eventWord}`)}
            </button>
          </div>
        </form>

        <aside className="ig-cp-aside ig-ce-aside" aria-label="Live preview">
          <span className="ig-cp-aside-head"><strong>Live preview</strong><span>What guests see</span></span>
          {previewTabs}
          <div className="ig-cp-phone">
            <div className="ig-cp-phone-screen">
              <div className="ig-ce-phone-scroll" key={previewTab}>
                <IgCheckinPreview tab={previewTab} {...previewProps} />
              </div>
            </div>
          </div>
          <span className="ig-cp-aside-note">Scroll inside the phone to see the whole screen.</span>
        </aside>
        </div>

        <button type="button" className="ig-ce-pvbtn" onClick={() => setPreviewOpen(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></svg>
          Preview
        </button>
      </div>

      {previewOpen && (
        <div className="ig-ce-pvsheet" role="dialog" aria-modal="true" aria-label="Preview what guests see">
          <div className="ig-ce-pvsheet-head">
            <span><strong>Preview</strong><span>What guests see on their phone</span></span>
            <button type="button" className="ig-db-btn-ink" onClick={() => setPreviewOpen(false)}>Done</button>
          </div>
          {previewTabs}
          <div className="ig-ce-pvsheet-body" key={previewTab}>
            <IgCheckinPreview tab={previewTab} {...previewProps} />
          </div>
        </div>
      )}

      {questionModal && (
        <IgQuestionModal
          field={questionModal.id ? questionModal : null}
          onClose={() => setQuestionModal(null)}
          onSave={saveQuestion}
          subtitle="Guests answer this when they check in."
          note={`Added when you create the ${eventWord}.`}
        />
      )}

      {sponsorModal && (
        <SponsorModal sponsor={sponsorModal.clientId ? sponsorModal : null} split={split} onClose={() => setSponsorModal(null)} onSave={saveSponsor} />
      )}

      {phoneRuleOpen && (
        <DashDialog
          icon={Icon.phone}
          tone="primary"
          title="Turn off one check-in per phone?"
          cancelLabel="Cancel"
          confirmLabel="Turn it off"
          onCancel={() => setPhoneRuleOpen(false)}
          onConfirm={() => { update('strictDeviceFingerprinting', false); setPhoneRuleOpen(false); }}
        >
          Allowing multiple scans from the same device can help attendees with poor network connections, but it risks skewing your total attendance metrics with duplicate entries.
        </DashDialog>
      )}

      {proxyConfirm && (
        <DashDialog
          icon={Icon.group}
          tone="primary"
          title={proxyConfirm === 'on' ? 'Let guests check in others?' : 'Stop guests checking in others?'}
          cancelLabel="Cancel"
          confirmLabel={proxyConfirm === 'on' ? 'Turn it on' : 'Turn it off'}
          onCancel={() => setProxyConfirm(null)}
          onConfirm={() => { update('proxyCheckinEnabled', proxyConfirm === 'on'); setProxyConfirm(null); }}
        >
          {proxyConfirm === 'on'
            ? 'This allows one guest to help check in the people who came with them, up to 3 people from their phone. It helps when guests arrive in a group, or someone in the group has no phone or data.'
            : 'Each guest will need to check in on their own phone. Someone arriving with family or friends will no longer be able to check them in.'}
        </DashDialog>
      )}

      {leaveOpen && (
        <DashDialog
          icon={DashIcon.trash}
          tone="danger"
          title={isEdit ? 'Discard your changes?' : `Discard this ${eventWord}?`}
          cancelLabel="Keep editing"
          confirmLabel="Discard"
          onCancel={() => setLeaveOpen(false)}
          onConfirm={discard}
        >
          {isEdit ? `Your ${eventWord} stays exactly as it was before you started editing.` : "Nothing has been created yet. What you've filled in will be lost."}
        </DashDialog>
      )}
    </IgDashShell>
  );
}

export default CreateProgram;
