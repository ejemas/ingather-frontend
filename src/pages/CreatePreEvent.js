import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { createPreEvent } from '../api/preEventService';
import { getDashboardBootstrap, getPrograms } from '../api/programService';
import IgDashShell, { DashIcon, DashDialog } from '../components/IgDashShell';
import IgQuestionModal from '../components/IgQuestionModal';
import { useToast } from '../components/Toast';
import { useEventTemplate } from '../context/EventTemplateContext';
import RsvpPage from './RsvpPage';
import { compressFlyerImage, fileToDataUrl, formatFileSize } from '../utils/flyerCompression';
import { MAX_CUSTOM_FIELDS } from '../utils/customFields';
import { COMMUNITY_PLATFORMS, createCommunityLink, isValidCommunityUrl } from '../utils/communityLinks';
import { localToday } from '../utils/dashboardFormat';

const MAX_COMMUNITY_LINKS = 3;
// RSVPs always stop this long after the event starts; an earlier closing time is optional.
const RSVP_GRACE_MS = 12 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Fields guests can be asked for. Email is always on.
const FIELD_TILES = [
  ['fullName', 'Full Name', "Each guest's name."],
  ['phoneNumber', 'Phone Number', 'For reminders and the door.'],
  ['school', 'School', 'For campus and youth events.'],
  ['link', 'Link', 'GitHub, portfolio or social link.'],
  ['textarea', 'Longer question', 'A question with a paragraph answer.'],
  ['organization', 'Organization', 'Company, ministry or team.'],
  ['ticketType', 'Ticket Type', 'Which access category they have.'],
  ['address', 'Address', 'Where they are coming from.'],
  ['firstTimer', 'First-Timer', 'Spot new guests before the day.'],
  ['department', 'Department', 'Department or unit.'],
  ['fellowship', 'Group', 'Group, fellowship or community.'],
  ['age', 'Age', 'For age-based events.'],
  ['sex', 'Gender', 'For your gender breakdown.']
];

const INITIAL_FIELDS = FIELD_TILES.reduce((acc, [key]) => ({ ...acc, [key]: key === 'fullName' }), { emailAddress: true });

const Icon = {
  back: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 4L6 8l4 4" /></svg>,
  pencil: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z" /></svg>,
  upload: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 14v5h14v-5" /></svg>,
  image: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-9 9" /></svg>,
  alert: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
};

const pad = (n) => String(n).padStart(2, '0');
// Value for <input type="datetime-local"> in the organizer's own time.
const toLocalInput = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

const programLabel = (program) => {
  const day = program.date ? `${Number(String(program.date).slice(8, 10))} ${MONTHS[Number(String(program.date).slice(5, 7)) - 1] || ''}` : '';
  return day ? `${program.title}, ${day}` : program.title;
};

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

function Step({ n, title, sub, action, children, labelledBy }) {
  return (
    <section className="ig-db-card ig-cp-step" aria-labelledby={labelledBy}>
      <div className="ig-cp-step-head">
        <span className="ig-cp-step-num" aria-hidden="true">{n}</span>
        <span className="ig-cp-step-title">
          <strong id={labelledBy}>{title}</strong>
          <span>{sub}</span>
        </span>
        {action}
      </div>
      {children}
    </section>
  );
}

/*
 * Live preview: the real RSVP page rendered into a phone-sized iframe, so the
 * page's own mobile layout applies. The iframe borrows this page's stylesheets.
 */
function PhonePreview({ event }) {
  const frameRef = useRef(null);
  const [mountNode, setMountNode] = useState(null);

  const attach = useCallback(() => {
    const doc = frameRef.current?.contentDocument;
    if (!doc || !doc.body) return undefined;
    const copyStyles = () => {
      doc.head.querySelectorAll('[data-ig-copied]').forEach((node) => node.remove());
      document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
        const clone = node.cloneNode(true);
        clone.setAttribute('data-ig-copied', '');
        doc.head.appendChild(clone);
      });
    };
    copyStyles();
    // Styles for lazily loaded pages arrive later; keep the preview in step.
    const observer = new MutationObserver(copyStyles);
    observer.observe(document.head, { childList: true });
    setMountNode(doc.getElementById('ig-preview-root'));
    return () => observer.disconnect();
  }, []);

  const cleanupRef = useRef(null);
  useEffect(() => () => cleanupRef.current?.(), []);
  const onLoad = () => {
    cleanupRef.current?.();
    cleanupRef.current = attach();
  };

  const srcDoc = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0"><div id="ig-preview-root"></div></body></html>';

  return (
    <div className="ig-cp-phone">
      <div className="ig-cp-phone-screen">
        <iframe ref={frameRef} title="RSVP page preview" srcDoc={srcDoc} onLoad={onLoad} tabIndex={-1} />
      </div>
      {mountNode && createPortal(<RsvpPage previewEvent={event} />, mountNode)}
    </div>
  );
}

function CreatePreEvent() {
  const toast = useToast();
  const navigate = useNavigate();
  const { template, setTemplateKey } = useEventTemplate();
  const setTemplateRef = useRef(setTemplateKey);
  setTemplateRef.current = setTemplateKey;
  const today = useMemo(() => localToday(), []);
  const minDate = useMemo(() => toLocalInput(new Date()), []);

  const [boot, setBoot] = useState(null);
  const [programOptions, setProgramOptions] = useState([]);
  const [form, setForm] = useState({
    title: '',
    eventDate: '',
    programId: '',
    venueName: '',
    city: '',
    description: '',
    isRsvpActive: true,
    discoverEnabled: false,
    closeEarly: false,
    rsvpClosesAt: '',
    virtualAttendanceEnabled: false,
    rsvpFields: INITIAL_FIELDS,
    textareaLabel: '',
    customFormSchema: [],
    communityLinks: []
  });
  const [banner, setBanner] = useState({ file: null, previewUrl: '', name: '', originalSize: 0, size: 0, processing: false, error: '' });
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [questionModal, setQuestionModal] = useState(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const bannerInputRef = useRef(null);
  const bannerUrlRef = useRef('');
  const leavingRef = useRef(false);

  useEffect(() => {
    if (!localStorage.getItem('token')) navigate('/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    let alive = true;
    getPrograms()
      .then((response) => { if (alive) setProgramOptions((response.programs || []).filter((program) => program.trackingMode === 'collect-data')); })
      .catch(() => { if (alive) setProgramOptions([]); });
    getDashboardBootstrap(today, today, today)
      .then((res) => {
        if (!alive || !res) return;
        setBoot(res);
        if (res.church?.organizationType) setTemplateRef.current(res.church.organizationType);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [today]);

  // Free the banner preview when leaving the page.
  useEffect(() => () => { if (bannerUrlRef.current) URL.revokeObjectURL(bannerUrlRef.current); }, []);

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

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
    setServerError('');
    setDirty(true);
  };

  const toggleField = (key) => {
    setForm((prev) => ({ ...prev, rsvpFields: { ...prev.rsvpFields, emailAddress: true, [key]: !prev.rsvpFields[key] } }));
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

  /* ---------- Community links ---------- */
  const addLink = () => {
    if (form.communityLinks.length >= MAX_COMMUNITY_LINKS) return;
    update('communityLinks', [...form.communityLinks, createCommunityLink()]);
  };
  const updateLink = (index, key, value) => {
    update('communityLinks', form.communityLinks.map((link, i) => (i === index ? { ...link, [key]: value } : link)));
    setErrors((prev) => (prev[`link${index}`] ? { ...prev, [`link${index}`]: '' } : prev));
  };
  const removeLink = (index) => {
    update('communityLinks', form.communityLinks.filter((_, i) => i !== index));
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).filter((key) => key.startsWith('link')).forEach((key) => { delete next[key]; });
      return next;
    });
  };

  /* ---------- Banner ---------- */
  const chooseBanner = async (file) => {
    if (!file) return;
    setBanner((prev) => ({ ...prev, processing: true, error: '' }));
    try {
      const compressed = await compressFlyerImage(file);
      if (bannerUrlRef.current) URL.revokeObjectURL(bannerUrlRef.current);
      const previewUrl = URL.createObjectURL(compressed);
      bannerUrlRef.current = previewUrl;
      setBanner({ file: compressed, previewUrl, name: file.name, originalSize: file.size, size: compressed.size, processing: false, error: '' });
      setErrors((prev) => ({ ...prev, banner: '' }));
      setDirty(true);
    } catch (error) {
      setBanner((prev) => ({ ...prev, processing: false, error: error.message || 'We could not use that image. Try a JPEG, PNG or WebP.' }));
    } finally {
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };
  const removeBanner = () => {
    if (bannerUrlRef.current) URL.revokeObjectURL(bannerUrlRef.current);
    bannerUrlRef.current = '';
    setBanner({ file: null, previewUrl: '', name: '', originalSize: 0, size: 0, processing: false, error: '' });
    setDirty(true);
  };

  /* ---------- Submit ---------- */
  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = 'Give your event a name.';
    if (!form.eventDate) next.eventDate = 'Pick the date and time it starts.';
    else if (Number.isNaN(new Date(form.eventDate).getTime())) next.eventDate = 'Pick a valid date and time.';
    else if (new Date(form.eventDate).getTime() < Date.now()) next.eventDate = 'This time has already passed. Pick a time in the future.';
    if (form.discoverEnabled && !form.city.trim()) next.city = 'Add a city to show this page on Discover.';
    if (form.closeEarly) {
      const closes = new Date(form.rsvpClosesAt);
      const starts = new Date(form.eventDate);
      if (!form.rsvpClosesAt || Number.isNaN(closes.getTime())) next.rsvpClosesAt = 'Pick when RSVPs should close.';
      else if (closes.getTime() <= Date.now()) next.rsvpClosesAt = 'This time has already passed. Pick a time in the future.';
      else if (!Number.isNaN(starts.getTime()) && closes.getTime() > starts.getTime() + RSVP_GRACE_MS) {
        next.rsvpClosesAt = 'RSVPs can close no later than 12 hours after the event starts.';
      }
    }
    form.communityLinks.forEach((link, index) => {
      if (!String(link.url || '').trim()) next[`link${index}`] = 'Paste the link, or remove this row.';
      else if (!isValidCommunityUrl(link.url)) next[`link${index}`] = 'Use a full link starting with https://';
    });
    if (form.rsvpFields.textarea && form.textareaLabel.trim().length > 120) next.textareaLabel = 'Keep the question under 120 characters.';
    return next;
  };

  const focusFirstError = (errs) => {
    const order = ['title', 'eventDate', 'city', 'banner', 'textareaLabel', 'link0', 'link1', 'link2', 'rsvpClosesAt'];
    const first = order.find((key) => errs[key]);
    if (!first) return;
    window.setTimeout(() => {
      const el = document.getElementById(`ig-cp-${first}`);
      if (el) {
        if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus({ preventScroll: true });
      }
    }, 0);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (submitting || banner.processing) return;
    setServerError('');
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      focusFirstError(errs);
      return;
    }
    setSubmitting(true);
    try {
      const bannerPayload = banner.file ? { dataUrl: await fileToDataUrl(banner.file), originalName: banner.name } : null;
      const response = await createPreEvent({
        title: form.title.trim(),
        programId: form.programId || null,
        eventDate: new Date(form.eventDate).toISOString(),
        venueName: form.venueName.trim(),
        city: form.city.trim(),
        description: form.description.trim(),
        discoverEnabled: form.discoverEnabled,
        virtualAttendanceEnabled: form.virtualAttendanceEnabled,
        isRsvpActive: form.isRsvpActive,
        rsvpClosesAt: form.closeEarly && form.rsvpClosesAt ? new Date(form.rsvpClosesAt).toISOString() : null,
        rsvpFields: form.rsvpFields,
        rsvpFieldConfig: { textareaLabel: form.textareaLabel.trim() || 'Additional Response', requiredFields: {} },
        customFormSchema: form.customFormSchema,
        communityLinks: form.communityLinks.map((link) => ({ platform: link.platform, url: link.url.trim() })),
        banner: bannerPayload
      });
      leavingRef.current = true;
      setDirty(false);
      toast.success('Your RSVP page is live.');
      navigate(`/pre-events/${response.preEvent.id}`);
    } catch (error) {
      const data = error.response?.data || {};
      const message = data.error || 'We could not create the page. Check your connection and try again.';
      const linkMatch = data.field === 'communityLinks' ? /Community link (\d+)/i.exec(message) : null;
      const fieldKey = linkMatch
        ? `link${Number(linkMatch[1]) - 1}`
        : { title: 'title', eventDate: 'eventDate', city: 'city', banner: 'banner', rsvpClosesAt: 'rsvpClosesAt' }[data.field];
      if (fieldKey) {
        const errs = { [fieldKey]: message };
        setErrors(errs);
        focusFirstError(errs);
      } else {
        setServerError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = () => {
    if (dirty) setLeaveOpen(true);
    else navigate('/pre-events');
  };
  const discard = () => {
    leavingRef.current = true;
    setDirty(false);
    setLeaveOpen(false);
    navigate('/pre-events');
  };

  /* ---------- Preview data ---------- */
  const previewEvent = useMemo(() => {
    const date = form.eventDate ? new Date(form.eventDate) : null;
    const closes = form.closeEarly && form.rsvpClosesAt ? new Date(form.rsvpClosesAt) : null;
    const validCloses = closes && !Number.isNaN(closes.getTime()) ? closes.toISOString() : null;
    return {
      title: form.title.trim() || 'Your event name',
      eventDate: date && !Number.isNaN(date.getTime()) ? date.toISOString() : null,
      venueName: form.venueName.trim(),
      city: form.city.trim(),
      description: form.description,
      bannerUrl: banner.previewUrl || null,
      isRsvpActive: form.isRsvpActive,
      rsvpClosesAt: validCloses,
      rsvpEndsAt: validCloses,
      virtualAttendanceEnabled: form.virtualAttendanceEnabled,
      rsvpFields: form.rsvpFields,
      rsvpFieldConfig: { textareaLabel: form.textareaLabel.trim() || 'Additional Response', requiredFields: {} },
      customFormSchema: form.customFormSchema,
      communityLinks: form.communityLinks,
      churchName: boot?.church?.churchName || '',
      hostLogoUrl: boot?.church?.logoUrl || null,
      rsvpCount: 0
    };
  }, [form, banner.previewUrl, boot]);

  const shellProps = {
    active: 'pre-events',
    crumb: 'New Pre-Event',
    church: boot?.church ? { name: boot.church.churchName, email: boot.church.email, logoUrl: boot.church.logoUrl } : null,
    counts: { preEvents: boot?.stats?.preEventCount || 0, events: boot?.stats?.totalProgramsAllTime || 0 },
    unreadCount: boot?.unreadCount || 0,
    live: boot?.stats?.live || null,
    template
  };

  const linkCount = form.communityLinks.length;
  const startMs = form.eventDate ? new Date(form.eventDate).getTime() : NaN;
  const closeMax = Number.isNaN(startMs) ? '' : toLocalInput(new Date(startMs + RSVP_GRACE_MS));

  return (
    <IgDashShell {...shellProps}>
      <div className="ig-db-page ig-cp">
        <header className="ig-cp-head">
          <Link to="/pre-events" className="ig-pd-back" onClick={(event) => { if (dirty) { event.preventDefault(); setLeaveOpen(true); } }}>{Icon.back}Pre-Events</Link>
          <h1>Create an RSVP <span className="ig-db-title-mark">page</span></h1>
          <p>Collect RSVPs before the doors open. Every guest gets a QR pass by email. Email is always required.</p>
        </header>

        <div className="ig-cp-layout">
          <form className="ig-cp-form" onSubmit={submit} noValidate>
            {/* 1. Event details */}
            <Step n={1} title="Event details" sub="What guests see at the top of your RSVP page" labelledBy="ig-cp-s1">
              <div className={`ig-st-field${errors.title ? ' has-error' : ''}`}>
                <label htmlFor="ig-cp-title">Event name</label>
                <input id="ig-cp-title" value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. Lagos Builders Summit" maxLength={255} aria-invalid={Boolean(errors.title) || undefined} aria-describedby={errors.title ? 'ig-cp-title-err' : undefined} />
                <FieldError id="ig-cp-title-err">{errors.title}</FieldError>
              </div>
              <div className="ig-st-row ig-cp-row">
                <div className={`ig-st-field${errors.eventDate ? ' has-error' : ''}`}>
                  <label htmlFor="ig-cp-eventDate">Date and time</label>
                  <input id="ig-cp-eventDate" type="datetime-local" min={minDate} value={form.eventDate} onChange={(e) => update('eventDate', e.target.value)} aria-invalid={Boolean(errors.eventDate) || undefined} aria-describedby={errors.eventDate ? 'ig-cp-date-err' : undefined} />
                  <FieldError id="ig-cp-date-err">{errors.eventDate}</FieldError>
                </div>
                <div className="ig-st-field">
                  <label htmlFor="ig-cp-program">Link to live event</label>
                  <select id="ig-cp-program" className="ig-pd-select" value={form.programId} onChange={(e) => update('programId', e.target.value)}>
                    <option value="">Link later</option>
                    {programOptions.map((program) => <option key={program.id} value={program.id}>{programLabel(program)}</option>)}
                  </select>
                  {programOptions.length === 0 && <span className="ig-pd-hint ig-cp-hint">You can link it after you create the event.</span>}
                </div>
              </div>
              <div className="ig-st-row ig-cp-row">
                <div className="ig-st-field">
                  <label htmlFor="ig-cp-venue">Venue name</label>
                  <input id="ig-cp-venue" value={form.venueName} onChange={(e) => update('venueName', e.target.value)} placeholder="e.g. Landmark Centre" maxLength={255} />
                </div>
                <div className={`ig-st-field${errors.city ? ' has-error' : ''}`}>
                  <label htmlFor="ig-cp-city">City{form.discoverEnabled && <em> (needed for Discover)</em>}</label>
                  <input id="ig-cp-city" value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="e.g. Lagos" maxLength={120} aria-invalid={Boolean(errors.city) || undefined} aria-describedby={errors.city ? 'ig-cp-city-err' : undefined} />
                  <FieldError id="ig-cp-city-err">{errors.city}</FieldError>
                </div>
              </div>
              <div className="ig-st-field">
                <label htmlFor="ig-cp-desc">Description</label>
                <textarea id="ig-cp-desc" className="ig-pd-textarea ig-cp-textarea" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Tell guests what to expect and who it's for." rows={4} maxLength={5000} />
              </div>
            </Step>

            {/* 2. Banner */}
            <Step n={2} title="Banner" sub="A wide image works best. We compress it before upload." labelledBy="ig-cp-s2">
              <input ref={bannerInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="ig-cp-file" tabIndex={-1} aria-hidden="true" onChange={(e) => chooseBanner(e.target.files?.[0])} />
              {banner.previewUrl ? (
                <div className={`ig-cp-banner${banner.processing ? ' is-busy' : ''}`}>
                  <img src={banner.previewUrl} alt="Chosen banner preview" />
                  <div className="ig-cp-banner-actions">
                    <button type="button" id="ig-cp-banner" className="ig-cp-banner-btn" onClick={() => bannerInputRef.current?.click()} disabled={banner.processing}>{Icon.upload}Change banner</button>
                    <button type="button" className="ig-cp-banner-btn is-icon" aria-label="Remove banner" onClick={removeBanner} disabled={banner.processing}>{DashIcon.trash}</button>
                  </div>
                  {banner.processing && <span className="ig-cp-banner-busy" role="status"><span className="ig-st-spinner is-inline" aria-hidden="true" />Compressing…</span>}
                </div>
              ) : (
                <button type="button" id="ig-cp-banner" className={`ig-cp-drop${banner.processing ? ' is-busy' : ''}`} onClick={() => bannerInputRef.current?.click()} disabled={banner.processing}>
                  {banner.processing
                    ? <><span className="ig-st-spinner is-inline ig-cp-dark-spin" aria-hidden="true" /><strong>Compressing your image…</strong></>
                    : <><span className="ig-cp-drop-icon">{Icon.image}</span><strong>Add a banner</strong><span>Optional. Without one, guests see your event name on a colour block.</span></>}
                </button>
              )}
              {banner.error || errors.banner
                ? <FieldError id="ig-cp-banner-err">{banner.error || errors.banner}</FieldError>
                : <span className="ig-pd-hint ig-cp-hint">{banner.file
                    ? `${banner.name} · ${formatFileSize(banner.size)}${banner.size < banner.originalSize ? ` (compressed from ${formatFileSize(banner.originalSize)})` : ''}`
                    : 'JPEG, PNG or WebP.'}</span>}
            </Step>

            {/* 3. What guests fill in */}
            <Step n={3} title="What guests fill in" sub="Tap a field to add it to your RSVP form. Added fields are required." labelledBy="ig-cp-s3">
              <div className="ig-cp-tiles">
                <div className="ig-cp-tile is-locked">
                  <span className="ig-cp-tile-top"><strong>Email Address</strong><em>Always on</em></span>
                  <span>Needed to send each guest their QR pass.</span>
                </div>
                {FIELD_TILES.map(([key, label, sub]) => {
                  const on = Boolean(form.rsvpFields[key]);
                  return (
                    <button key={key} type="button" className={`ig-cp-tile${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => toggleField(key)}>
                      <span className="ig-cp-tile-top"><strong>{label}</strong><em>{on ? 'Added' : 'Add'}</em></span>
                      <span>{key === 'firstTimer' && on ? 'A tick box guests can leave empty.' : sub}</span>
                    </button>
                  );
                })}
              </div>

              {form.rsvpFields.textarea && (
                <div className={`ig-st-field${errors.textareaLabel ? ' has-error' : ''}`}>
                  <label htmlFor="ig-cp-textareaLabel">Your longer question</label>
                  <input id="ig-cp-textareaLabel" value={form.textareaLabel} onChange={(e) => update('textareaLabel', e.target.value)} placeholder="e.g. What do you hope to get from this event?" maxLength={120} />
                  <FieldError>{errors.textareaLabel}</FieldError>
                </div>
              )}

              <Switch id="ig-cp-virtual" checked={form.virtualAttendanceEnabled} onChange={(v) => update('virtualAttendanceEnabled', v)} title="Track virtual attendance" description="Ask guests if they will join in person or online." />

              <div className="ig-pd-q-head ig-cp-q-head">
                <span className="ig-db-card-title"><strong>Your own questions</strong><span>Up to {MAX_CUSTOM_FIELDS}, on top of the fields above</span></span>
                <button type="button" className="ig-st-pill ig-pd-pill" onClick={() => openQuestion()} disabled={form.customFormSchema.length >= MAX_CUSTOM_FIELDS}>{DashIcon.plus}Add Question</button>
              </div>
              {form.customFormSchema.length > 0 && (
                <ul className="ig-pd-questions">
                  {form.customFormSchema.map((field) => (
                    <li key={field.id}>
                      <span className="ig-pd-q-text">
                        <strong>{field.label}</strong>
                        <span>
                          {field.type === 'text' ? 'Short text' : field.type === 'radio' ? 'Pick one' : 'Pick many'}
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
            </Step>

            {/* 4. Community links */}
            <Step
              n={4}
              title="Community links"
              sub="Optional. Shown to guests after they RSVP."
              labelledBy="ig-cp-s4"
              action={linkCount < MAX_COMMUNITY_LINKS ? <button type="button" className="ig-pd-text-btn ig-cp-addlink" onClick={addLink}>{DashIcon.plus}Add link</button> : null}
            >
              {linkCount === 0 ? (
                <p className="ig-pd-muted ig-cp-muted">No links yet. Add a WhatsApp group, Discord or any community page, up to {MAX_COMMUNITY_LINKS}.</p>
              ) : (
                <>
                  <ul className="ig-cp-links">
                    {form.communityLinks.map((link, index) => {
                      const err = errors[`link${index}`];
                      return (
                        <li key={index} className={err ? 'has-error' : ''}>
                          <div className="ig-st-field">
                            <label htmlFor={`ig-cp-platform${index}`}>Platform</label>
                            <select id={`ig-cp-platform${index}`} className="ig-pd-select" value={link.platform} onChange={(e) => updateLink(index, 'platform', e.target.value)}>
                              {COMMUNITY_PLATFORMS.map((platform) => <option key={platform.value} value={platform.value}>{platform.label}</option>)}
                            </select>
                          </div>
                          <div className={`ig-st-field${err ? ' has-error' : ''}`}>
                            <label htmlFor={`ig-cp-link${index}`}>Link</label>
                            <input id={`ig-cp-link${index}`} type="url" inputMode="url" value={link.url} onChange={(e) => updateLink(index, 'url', e.target.value)} placeholder="https://chat.whatsapp.com/…" maxLength={2048} aria-invalid={Boolean(err) || undefined} aria-describedby={err ? `ig-cp-link${index}-err` : undefined} />
                          </div>
                          <button type="button" className="ig-cp-link-remove" aria-label={`Remove link ${index + 1}`} onClick={() => removeLink(index)}>{DashIcon.close}</button>
                          {err && <FieldError id={`ig-cp-link${index}-err`}>{err}</FieldError>}
                        </li>
                      );
                    })}
                  </ul>
                  <span className="ig-pd-hint ig-cp-hint">{linkCount} of {MAX_COMMUNITY_LINKS} links added.</span>
                </>
              )}
            </Step>

            {/* 5. Publish settings */}
            <Step n={5} title="Publish settings" sub="You can change these any time from the dashboard" labelledBy="ig-cp-s5">
              <Switch id="ig-cp-open" checked={form.isRsvpActive} onChange={(v) => update('isRsvpActive', v)} title="RSVP page open" description={form.isRsvpActive ? 'Guests can RSVP as soon as you create the page.' : 'The page shows "RSVP closed" until you open it.'} />
              <Switch id="ig-cp-discover" checked={form.discoverEnabled} onChange={(v) => update('discoverEnabled', v)} title="Show on Discover Events" description="List this page publicly. Private links still work when this is off." />
              <Switch
                id="ig-cp-closeEarly"
                checked={form.closeEarly}
                onChange={(v) => { update('closeEarly', v); setErrors((prev) => ({ ...prev, rsvpClosesAt: '' })); }}
                title="Close RSVPs at a set time"
                description={form.closeEarly ? 'RSVPs stop at the time you pick below.' : 'Off: RSVPs close automatically 12 hours after the event starts.'}
              />
              {form.closeEarly && (
                <div className={`ig-st-field ig-cp-closes${errors.rsvpClosesAt ? ' has-error' : ''}`}>
                  <label htmlFor="ig-cp-rsvpClosesAt">RSVPs close on</label>
                  <input
                    id="ig-cp-rsvpClosesAt"
                    type="datetime-local"
                    min={minDate}
                    max={closeMax || undefined}
                    value={form.rsvpClosesAt}
                    onChange={(e) => update('rsvpClosesAt', e.target.value)}
                    aria-invalid={Boolean(errors.rsvpClosesAt) || undefined}
                    aria-describedby={errors.rsvpClosesAt ? 'ig-cp-closes-err' : 'ig-cp-closes-hint'}
                  />
                  {errors.rsvpClosesAt
                    ? <FieldError id="ig-cp-closes-err">{errors.rsvpClosesAt}</FieldError>
                    : <span className="ig-pd-hint ig-cp-hint" id="ig-cp-closes-hint">Any time up to 12 hours after the event starts. Guests see this on the RSVP page.</span>}
                </div>
              )}
            </Step>

            {serverError && <div className="ig-cp-alert" role="alert">{Icon.alert}<span>{serverError}</span></div>}

            <div className="ig-cp-actions">
              <button type="button" className="ig-db-btn-ghost" onClick={cancel} disabled={submitting}>Cancel</button>
              <button type="submit" className="ig-db-btn-primary" disabled={submitting || banner.processing}>
                {submitting ? <><span className="ig-st-spinner is-inline" aria-hidden="true" />Creating…</> : 'Create RSVP page'}
              </button>
            </div>
          </form>

          <aside className="ig-cp-aside" aria-label="Live preview">
            <span className="ig-cp-aside-head"><strong>Live preview</strong><span>What guests see</span></span>
            <PhonePreview event={previewEvent} />
            <span className="ig-cp-aside-note">Scroll inside the phone to see the full RSVP page.</span>
          </aside>
        </div>
      </div>

      {questionModal && (
        <IgQuestionModal field={questionModal.id ? questionModal : null} onClose={() => setQuestionModal(null)} onSave={saveQuestion} note="Added when you create the page." />
      )}

      {leaveOpen && (
        <DashDialog
          icon={DashIcon.trash}
          tone="danger"
          title="Discard this RSVP page?"
          cancelLabel="Keep editing"
          confirmLabel="Discard"
          onCancel={() => setLeaveOpen(false)}
          onConfirm={discard}
        >
          Nothing has been created yet. What you've filled in will be lost.
        </DashDialog>
      )}
    </IgDashShell>
  );
}

export default CreatePreEvent;
