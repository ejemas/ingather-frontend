import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getDashboardBootstrap } from '../api/programService';
import { updateOrganizationType } from '../api/authService';
import {
  changePassword,
  getNotifications,
  markNotificationsRead,
  removeWorkspaceLogo,
  updateWorkspace,
  uploadWorkspaceLogo
} from '../api/settingsService';
import IgDashShell, { DashIcon, DashDialog, WorkspaceMark } from '../components/IgDashShell';
import { evaluatePassword, passwordProblem } from '../components/AccountLayout';
import { useEventTemplate } from '../context/EventTemplateContext';
import { getEventTemplate } from '../config/eventTemplates';
import { localToday } from '../utils/dashboardFormat';

const TABS = [['workspace', 'Workspace'], ['password', 'Password'], ['notifications', 'Notifications']];

const TYPES = [
  ['general', 'General event'],
  ['techMeetup', 'Tech meetup'],
  ['conference', 'Conference'],
  ['seminar', 'Seminar'],
  ['bootcamp', 'Bootcamp'],
  ['corporateEvent', 'Corporate event'],
  ['communityGathering', 'Community gathering'],
  ['church', 'Church']
];

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const LOGO_SIZE = 400;

const typeWords = (key) => {
  const t = getEventTemplate(key);
  const people = key === 'seminar' ? 'Facilitator' : key === 'bootcamp' ? 'Instructor' : key === 'church' ? 'Visitors' : 'Guests';
  return `${t.event.plural} · ${people}`;
};

const timeAgo = (value) => {
  const then = new Date(value).getTime();
  if (!then) return '';
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Square crop + resize in the browser so only a small image is uploaded.
const prepareLogo = (file) => new Promise((resolve, reject) => {
  if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
    reject(new Error('Use a PNG, JPG or WebP image.'));
    return;
  }
  if (file.size > MAX_LOGO_BYTES) {
    reject(new Error('That file is too big. Use an image under 5 MB.'));
    return;
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const size = Math.min(LOGO_SIZE, side);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    URL.revokeObjectURL(url);
    const keepAlpha = /png|webp/i.test(file.type);
    resolve(canvas.toDataURL(keepAlpha ? 'image/png' : 'image/jpeg', 0.9));
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('We could not read that image. Try a PNG or JPG.'));
  };
  img.src = url;
});

const EyeIcon = ({ open }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
    {!open && <path d="M4 4l16 16" />}
  </svg>
);
const ErrorIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.5" /></svg>
);
const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
);
const PencilIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z" /></svg>
);

function Field({ id, label, error, children }) {
  return (
    <div className={`ig-st-field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error && <span className="ig-st-error" id={`${id}-error`}><ErrorIcon />{error}</span>}
    </div>
  );
}

function SecretInput({ id, value, onChange, placeholder, autoComplete, invalid, describedBy }) {
  const [shown, setShown] = useState(false);
  return (
    <span className={`ig-st-secret${invalid ? ' is-invalid' : ''}`}>
      <input
        id={id}
        type={shown ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        maxLength={128}
      />
      <button type="button" onClick={() => setShown((v) => !v)} aria-label={shown ? 'Hide password' : 'Show password'} aria-pressed={shown}>
        <EyeIcon open={!shown} />
      </button>
    </span>
  );
}

function StrengthPanel({ password, error }) {
  const result = evaluatePassword(password);
  const toneClass = error ? 'tone-bad' : `tone-${result.tone}`;
  return (
    <div className={`ig-st-strength ${toneClass}`} aria-live="polite">
      <div className="ig-st-strength-top">
        <span className="ig-st-meter" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => <span key={i} className={i < result.level ? 'is-on' : ''} />)}
        </span>
        <span className="ig-st-strength-label">{result.label}</span>
      </div>
      {result.rules.map((rule) => (
        <span key={rule.key} className={`ig-st-rule is-${rule.state}`}>
          <span aria-hidden="true">{rule.state === 'ok' ? <CheckIcon /> : rule.state === 'bad' ? '!' : ''}</span>
          {rule.key === 'common' && rule.state !== 'bad' ? 'Not a common or leaked password' : rule.text}
        </span>
      ))}
    </div>
  );
}

function Settings() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { templateKey, setTemplateKey } = useEventTemplate();
  // Stable handle: changing the wording must not trigger another data load.
  const setTemplateRef = useRef(setTemplateKey);
  setTemplateRef.current = setTemplateKey;
  const today = useMemo(() => localToday(), []);
  const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'workspace';

  const [boot, setBoot] = useState(null);
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);

  // Workspace form
  const [form, setForm] = useState({ churchName: '', branchName: '', location: '' });
  const [formErrors, setFormErrors] = useState({});
  const [formMessage, setFormMessage] = useState('');
  const [savingWork, setSavingWork] = useState(false);
  const [logoState, setLogoState] = useState('idle');
  const [logoError, setLogoError] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const fileRef = useRef(null);

  // Organisation type
  const [pendingType, setPendingType] = useState(null);
  const [savingType, setSavingType] = useState(false);

  // Password
  const [pw, setPw] = useState({ current: '', next: '', repeat: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [savingPw, setSavingPw] = useState(false);

  // Notifications
  const [notes, setNotes] = useState(null);
  const [notesError, setNotesError] = useState('');
  const [marking, setMarking] = useState(false);
  const [unread, setUnread] = useState(0);

  const showToast = useCallback((text) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3200);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const applyChurch = (c) => {
    setChurch(c);
    setForm({ churchName: c.churchName || '', branchName: c.branchName || '', location: c.location || '' });
    try {
      const stored = JSON.parse(localStorage.getItem('church') || '{}');
      localStorage.setItem('church', JSON.stringify({ ...stored, churchName: c.churchName, branchName: c.branchName, location: c.location, logoUrl: c.logoUrl, organizationType: c.organizationType }));
    } catch (error) { /* storage blocked */ }
  };

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login', { replace: true });
      return undefined;
    }
    let alive = true;
    (async () => {
      setLoadError('');
      try {
        const res = await getDashboardBootstrap(today, today, today);
        if (!alive) return;
        setBoot(res);
        applyChurch(res.church);
        setUnread(res.unreadCount || 0);
        if (res.church?.organizationType) setTemplateRef.current(res.church.organizationType);
      } catch (error) {
        if (!alive) return;
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login', { replace: true });
          return;
        }
        setLoadError(error.response?.data?.error || 'We could not load your settings. Check your connection and try again.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [today, reloadKey, navigate]);

  const loadNotes = useCallback(async () => {
    setNotesError('');
    try {
      const res = await getNotifications();
      setNotes(res.notifications || []);
      setUnread((res.notifications || []).filter((n) => !n.isRead).length);
    } catch (error) {
      setNotesError(error.response?.data?.error || 'We could not load notifications.');
    }
  }, []);

  useEffect(() => {
    if (tab === 'notifications' && notes === null && !loading) loadNotes();
  }, [tab, notes, loading, loadNotes]);

  const selectTab = (key) => {
    const next = new URLSearchParams(params);
    if (key === 'workspace') next.delete('tab'); else next.set('tab', key);
    setParams(next, { replace: true });
  };

  const template = getEventTemplate(templateKey);
  const shellChurch = church ? { name: church.churchName, email: church.email, logoUrl: logoPreview || church.logoUrl } : null;
  const stats = boot?.stats;

  /* ---------- Workspace ---------- */
  const updateForm = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFormErrors((e) => ({ ...e, [key]: '' }));
    setFormMessage('');
  };

  const saveWorkspace = async (event) => {
    event.preventDefault();
    const errs = {};
    if (!form.churchName.trim()) errs.churchName = 'Add your organisation name';
    if (!form.branchName.trim()) errs.branchName = 'Add a branch or location';
    setFormErrors(errs);
    const count = Object.keys(errs).length;
    if (count) {
      setFormMessage(`Fill in the ${count === 1 ? 'field' : `${count} fields`} marked in red to save.`);
      document.getElementById(errs.churchName ? 'st-name' : 'st-branch')?.focus();
      return;
    }
    setSavingWork(true);
    setFormMessage('');
    try {
      const res = await updateWorkspace(form);
      applyChurch(res.church);
      showToast('Workspace saved');
    } catch (error) {
      if (error.response?.data?.fieldErrors) {
        const fe = error.response.data.fieldErrors;
        setFormErrors({ churchName: fe.churchName || '', branchName: fe.branchName || '' });
      }
      setFormMessage(error.response?.data?.error || 'We could not save your workspace. Try again.');
    } finally {
      setSavingWork(false);
    }
  };

  const onLogoFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setLogoError('');
    let dataUrl;
    try {
      dataUrl = await prepareLogo(file);
    } catch (error) {
      setLogoState('error');
      setLogoError(error.message);
      return;
    }
    setLogoPreview(dataUrl);
    setLogoState('uploading');
    try {
      const res = await uploadWorkspaceLogo(dataUrl);
      applyChurch(res.church);
      setLogoPreview('');
      setLogoState('idle');
      showToast('Logo updated');
    } catch (error) {
      setLogoPreview('');
      setLogoState('error');
      setLogoError(error.response?.data?.error || 'We could not upload that logo. Try again.');
    }
  };

  const removeLogo = async () => {
    setLogoState('uploading');
    setLogoError('');
    try {
      const res = await removeWorkspaceLogo();
      applyChurch(res.church);
      setLogoState('idle');
      showToast('Logo removed');
    } catch (error) {
      setLogoState('error');
      setLogoError(error.response?.data?.error || 'We could not remove the logo. Try again.');
    }
  };

  const confirmType = async () => {
    if (!pendingType) return;
    setSavingType(true);
    try {
      const res = await updateOrganizationType(pendingType);
      const saved = res.church?.organizationType || pendingType;
      setTemplateKey(saved);
      setChurch((c) => ({ ...c, organizationType: saved }));
      try {
        const stored = JSON.parse(localStorage.getItem('church') || '{}');
        localStorage.setItem('church', JSON.stringify({ ...stored, organizationType: saved }));
      } catch (error) { /* storage blocked */ }
      setPendingType(null);
      showToast('Wording updated across your dashboard');
    } catch (error) {
      setPendingType(null);
      showToast(error.response?.data?.error || 'We could not change the wording. Try again.');
    } finally {
      setSavingType(false);
    }
  };

  /* ---------- Password ---------- */
  const updatePw = (key, value) => {
    setPw((p) => ({ ...p, [key]: value }));
    setPwErrors((e) => ({ ...e, [key]: '', form: '' }));
  };
  const resetPw = () => { setPw({ current: '', next: '', repeat: '' }); setPwErrors({}); };

  const savePassword = async (event) => {
    event.preventDefault();
    const errs = {};
    if (!pw.current) errs.current = 'Enter your current password.';
    const problem = passwordProblem(pw.next);
    if (problem) errs.next = problem.endsWith('.') ? problem : `${problem}.`;
    if (!errs.next && pw.next === pw.current) errs.next = 'Pick a new password that is different from your current one.';
    if (!errs.next && pw.repeat !== pw.next) errs.repeat = 'The two new passwords do not match.';
    setPwErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(errs.current ? 'st-pw-current' : errs.next ? 'st-pw-new' : 'st-pw-repeat')?.focus();
      return;
    }
    setSavingPw(true);
    try {
      const result = await changePassword(pw.current, pw.next);
      // Other devices are now signed out. Keep this one signed in with its fresh sign-in.
      if (result?.token) {
        try { localStorage.setItem('token', result.token); } catch (storageError) { /* storage blocked */ }
      }
      resetPw();
      showToast(result?.otherDevicesSignedOut ? 'Password changed. Other devices were signed out.' : 'Password changed');
    } catch (error) {
      const data = error.response?.data || {};
      if (data.code === 'WRONG_CURRENT_PASSWORD') {
        setPwErrors({ current: data.error });
        document.getElementById('st-pw-current')?.focus();
      } else if (data.code === 'SAME_PASSWORD') {
        setPwErrors({ next: data.error });
      } else if (error.response?.status === 429) {
        setPwErrors({ form: 'Too many tries. Wait a few minutes and try again.' });
      } else {
        setPwErrors({ form: data.error || 'We could not change your password. Try again.' });
      }
    } finally {
      setSavingPw(false);
    }
  };

  /* ---------- Notifications ---------- */
  const markAll = async () => {
    setMarking(true);
    try {
      await markNotificationsRead();
      setNotes((list) => (list || []).map((n) => ({ ...n, isRead: true })));
      setUnread(0);
    } catch (error) {
      showToast(error.response?.data?.error || 'We could not mark notifications as read.');
    } finally {
      setMarking(false);
    }
  };

  /* ---------- Render ---------- */
  const tabBadge = (key) => (key === 'notifications' && unread > 0 ? <span className="ig-st-tab-badge">{unread > 99 ? '99+' : unread}</span> : null);
  const logoUrl = logoPreview || church?.logoUrl || '';
  const hasLogo = Boolean(logoUrl);

  const workspacePanel = church && (
    <>
      <form className="ig-db-card ig-st-card" onSubmit={saveWorkspace} noValidate>
        <div className="ig-st-head">
          <h2>Your workspace</h2>
          <p>Shown on your check-in pages, flyers and emails.</p>
        </div>
        <div className="ig-st-logo">
          <button type="button" className={`ig-st-logo-mark${logoState === 'uploading' ? ' is-busy' : ''}`} onClick={() => fileRef.current?.click()} aria-label={hasLogo ? 'Change logo' : 'Upload logo'} disabled={logoState === 'uploading'}>
            <WorkspaceMark church={{ name: church.churchName, logoUrl }} size="xl" />
            {logoState === 'uploading' && <span className="ig-st-spinner" aria-hidden="true" />}
            <span className="ig-st-logo-pen" aria-hidden="true"><PencilIcon /></span>
          </button>
          <div className="ig-st-logo-text">
            <strong>Logo</strong>
            {logoState === 'error'
              ? <span className="ig-st-logo-error" role="alert">{logoError}</span>
              : <span>{logoState === 'uploading' ? 'Uploading and resizing…' : 'Square image works best. Under 5 MB.'}</span>}
            <span className="ig-st-logo-actions">
              <button type="button" className="ig-st-pill" onClick={() => fileRef.current?.click()} disabled={logoState === 'uploading'}>{hasLogo ? 'Change logo' : 'Upload logo'}</button>
              {hasLogo && logoState !== 'uploading' && <button type="button" className="ig-st-text-danger" onClick={removeLogo}>Remove</button>}
            </span>
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="ig-st-file" onChange={onLogoFile} tabIndex={-1} aria-hidden="true" />
        </div>

        <Field id="st-name" label={template.organization?.nameLabel || 'Organization name'} error={formErrors.churchName}>
          <input id="st-name" value={form.churchName} onChange={(e) => updateForm('churchName', e.target.value)} placeholder="Enter your name" maxLength={120} autoComplete="organization" aria-invalid={Boolean(formErrors.churchName) || undefined} aria-describedby={formErrors.churchName ? 'st-name-error' : undefined} />
        </Field>
        <div className="ig-st-row">
          <Field id="st-branch" label={template.organization?.branchLabel || 'Team, branch, or location'} error={formErrors.branchName}>
            <input id="st-branch" value={form.branchName} onChange={(e) => updateForm('branchName', e.target.value)} placeholder="Enter team, branch, or location" maxLength={120} aria-invalid={Boolean(formErrors.branchName) || undefined} aria-describedby={formErrors.branchName ? 'st-branch-error' : undefined} />
          </Field>
          <Field id="st-location" label="Location or address">
            <input id="st-location" value={form.location} onChange={(e) => updateForm('location', e.target.value)} placeholder="Street, area, city" maxLength={200} autoComplete="street-address" />
          </Field>
        </div>
        <div className="ig-st-actions">
          {formMessage && <span className="ig-st-form-error" role="alert">{formMessage}</span>}
          <button type="submit" className="ig-db-btn-primary ig-st-save" disabled={savingWork}>
            {savingWork ? <><span className="ig-st-spinner is-inline" aria-hidden="true" />Saving…</> : 'Save changes'}
          </button>
        </div>
      </form>

      <section className="ig-db-card ig-st-card" aria-labelledby="st-type-title">
        <div className="ig-st-head">
          <h2 id="st-type-title">Organisation type</h2>
          <p>Changes the words across your dashboard and guest screens, like Event or Program. Nothing else changes.</p>
        </div>
        <div className="ig-st-types" role="radiogroup" aria-labelledby="st-type-title">
          {TYPES.map(([key, name]) => {
            const on = key === (church.organizationType || templateKey);
            return (
              <button key={key} type="button" role="radio" aria-checked={on} className={`ig-st-type${on ? ' is-on' : ''}`} onClick={() => { if (!on) setPendingType(key); }}>
                <span className="ig-st-type-text"><strong>{name}</strong><span>{typeWords(key)}</span></span>
                <span className="ig-st-radio" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </section>
    </>
  );

  const pwEval = evaluatePassword(pw.next);
  const passwordPanel = (
    <>
      <form className="ig-db-card ig-st-card" onSubmit={savePassword} noValidate>
        <div className="ig-st-head">
          <h2>Change your password</h2>
          <p>You stay signed in on this device.</p>
        </div>
        <Field id="st-pw-current" label="Current password" error={pwErrors.current}>
          <SecretInput id="st-pw-current" value={pw.current} onChange={(e) => updatePw('current', e.target.value)} placeholder="Enter current password" autoComplete="current-password" invalid={Boolean(pwErrors.current)} describedBy={pwErrors.current ? 'st-pw-current-error' : undefined} />
        </Field>
        <Field id="st-pw-new" label="New password" error={pwErrors.next}>
          <SecretInput id="st-pw-new" value={pw.next} onChange={(e) => updatePw('next', e.target.value)} placeholder="Enter new password" autoComplete="new-password" invalid={Boolean(pwErrors.next)} describedBy="st-pw-strength" />
        </Field>
        <div id="st-pw-strength" className="ig-st-strength-wrap"><StrengthPanel password={pw.next} error={Boolean(pwErrors.next) && !pwEval.acceptable} /></div>
        <Field id="st-pw-repeat" label="Repeat new password" error={pwErrors.repeat}>
          <SecretInput id="st-pw-repeat" value={pw.repeat} onChange={(e) => updatePw('repeat', e.target.value)} placeholder="Repeat new password" autoComplete="new-password" invalid={Boolean(pwErrors.repeat)} describedBy={pwErrors.repeat ? 'st-pw-repeat-error' : undefined} />
        </Field>
        <div className="ig-st-actions">
          {pwErrors.form && <span className="ig-st-form-error" role="alert">{pwErrors.form}</span>}
          <button type="button" className="ig-db-btn-ghost" onClick={resetPw} disabled={savingPw}>Cancel</button>
          <button type="submit" className="ig-db-btn-primary ig-st-save" disabled={savingPw}>
            {savingPw ? <><span className="ig-st-spinner is-inline" aria-hidden="true" />Saving…</> : 'Set new password'}
          </button>
        </div>
      </form>
      <p className="ig-st-foot-note">Changing your password signs you out on every other phone and computer. Forgot your current password? Sign out and use "Forgot password" on the sign-in page.</p>
    </>
  );

  const notificationsPanel = (
    <section className="ig-db-card ig-st-card" aria-labelledby="st-notes-title">
      <div className="ig-st-head is-row">
        <span>
          <h2 id="st-notes-title">Notifications</h2>
          <p>Updates and tips from the Ingather team.</p>
        </span>
        {notes && notes.some((n) => !n.isRead) && (
          <button type="button" className="ig-st-pill" onClick={markAll} disabled={marking}>{marking ? 'Marking…' : 'Mark all as read'}</button>
        )}
      </div>
      {notesError ? (
        <div className="ig-db-inline-error" role="alert">{notesError}<button type="button" onClick={loadNotes}>Try again</button></div>
      ) : notes === null ? (
        <div className="ig-st-notes">{[0, 1, 2].map((i) => <div key={i} className="ig-db-skel is-row" />)}</div>
      ) : notes.length === 0 ? (
        <div className="ig-st-caught">
          <span className="ig-st-caught-icon">{DashIcon.bell}</span>
          <strong>You are all caught up</strong>
          <span>News and tips from Ingather will show up here.</span>
        </div>
      ) : (
        <ul className="ig-st-notes">
          {notes.map((n) => (
            <li key={n.id} className={`ig-st-note${n.isRead ? '' : ' is-unread'}`}>
              <span className="ig-st-note-icon" aria-hidden="true"><img src="/ingather-logo.png" alt="Ingather" /></span>
              <span className="ig-st-note-text">
                <span className="ig-st-note-top">
                  <strong>{n.title}</strong>
                  <span className="ig-st-note-time">{timeAgo(n.createdAt)}{!n.isRead && <><i aria-hidden="true" /><span className="ig-st-sr">, unread</span></>}</span>
                </span>
                <span>{n.message}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  const pendingTemplate = pendingType ? getEventTemplate(pendingType) : null;
  const currentTemplate = getEventTemplate(church?.organizationType || templateKey);
  const currentName = (TYPES.find(([k]) => k === (church?.organizationType || templateKey)) || TYPES[0])[1];
  const pendingName = pendingType ? (TYPES.find(([k]) => k === pendingType) || TYPES[0])[1] : '';
  const wordRows = pendingTemplate ? [
    [currentTemplate.event.singular, pendingTemplate.event.singular],
    [currentTemplate.event.all, pendingTemplate.event.all],
    [currentTemplate.event.create, pendingTemplate.event.create],
    [currentTemplate.attendee?.guest || currentTemplate.attendee?.singular, pendingTemplate.attendee?.guest || pendingTemplate.attendee?.singular],
    [currentTemplate.host?.singular, pendingTemplate.host?.singular],
    [currentTemplate.organization?.nameLabel, pendingTemplate.organization?.nameLabel]
  ].filter(([from, to]) => from && to) : [];

  return (
    <IgDashShell
      active="settings"
      crumb="Settings"
      church={shellChurch}
      counts={{ preEvents: stats?.preEventCount || 0, events: stats?.totalProgramsAllTime || 0 }}
      unreadCount={unread}
      live={stats?.live || null}
      template={template}
    >
      <div className="ig-db-page ig-st-page">
        <div className="ig-st-title">
          <h1>Settings</h1>
          <p>Your workspace, your password and news from Ingather.</p>
        </div>

        {loading ? (
          <div className="ig-st-layout">
            <div className="ig-db-skel ig-st-skel-nav" />
            <div className="ig-db-skel ig-st-skel-card" />
          </div>
        ) : !church ? (
          <div className="ig-db-card ig-db-error" role="alert">
            <strong>Your settings didn't load</strong>
            <span>{loadError}</span>
            <button type="button" className="ig-db-btn-ink" onClick={() => { setLoading(true); setReloadKey((k) => k + 1); }}>Try again</button>
          </div>
        ) : (
          <div className="ig-st-layout">
            <nav className="ig-st-nav" aria-label="Settings sections">
              <div role="tablist" aria-label="Settings sections">
                {TABS.map(([key, label]) => (
                  <button key={key} type="button" role="tab" id={`st-tab-${key}`} aria-selected={tab === key} aria-controls={`st-panel-${key}`} className={tab === key ? 'is-on' : ''} onClick={() => selectTab(key)}>
                    {label}{tabBadge(key)}
                  </button>
                ))}
              </div>
            </nav>
            <div className="ig-st-panels" role="tabpanel" id={`st-panel-${tab}`} aria-labelledby={`st-tab-${tab}`}>
              {tab === 'workspace' && workspacePanel}
              {tab === 'password' && passwordPanel}
              {tab === 'notifications' && notificationsPanel}
            </div>
          </div>
        )}
      </div>

      {pendingType && (
        <DashDialog
          tone="primary"
          icon={DashIcon.settings}
          title={`Switch to ${pendingName}?`}
          cancelLabel={`Keep ${currentName}`}
          confirmLabel="Switch"
          busy={savingType}
          onCancel={() => setPendingType(null)}
          onConfirm={confirmType}
        >
          <span className="ig-st-modal-intro">These words change everywhere in your dashboard and on guest screens.</span>
          <span className="ig-st-words" role="table" aria-label="Word changes">
            {wordRows.map(([from, to]) => (
              <span key={`${from}-${to}`} className="ig-st-word" role="row">
                <span role="cell">{from}</span>
                <span aria-hidden="true">→</span>
                <strong role="cell">{to}</strong>
              </span>
            ))}
          </span>
          <span className="ig-st-modal-note">Your events, guests and data stay exactly as they are. You can switch back any time.</span>
        </DashDialog>
      )}

      {toast && (
        <div className="ig-st-toast" role="status">
          <span className="ig-st-toast-icon" aria-hidden="true"><CheckIcon /></span>
          {toast}
          <button type="button" aria-label="Dismiss" onClick={() => setToast('')}>{DashIcon.close}</button>
        </div>
      )}

    </IgDashShell>
  );
}

export default Settings;
