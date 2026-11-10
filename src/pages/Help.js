import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import IgDashShell, { DashIcon } from '../components/IgDashShell';
import { useToast } from '../components/Toast';
import { useEventTemplate } from '../context/EventTemplateContext';
import { getDashboardBootstrap } from '../api/programService';
import { createHelpTicket, getHelpEventOptions, getHelpTicket, getHelpTickets, prepareScreenshot, replyToHelpTicket, solveHelpTicket } from '../api/helpService';
import { localToday } from '../utils/dashboardFormat';
import '../styles/IgHelp.css';

const TOPICS = [
  ['checkin', 'Check-in and QR codes'],
  ['rsvp', 'RSVP pages and passes'],
  ['account', 'Account and sign-in'],
  ['extras', 'Flyers, gifts and sponsors'],
  ['data', 'Reports and exports'],
  ['other', 'Something else']
];

const STATUS = {
  waiting: { label: 'Waiting for Ingather', className: 'is-waiting' },
  replied: { label: 'Ingather replied', className: 'is-replied' },
  solved: { label: 'Solved', className: 'is-solved' }
};

const Icon = {
  chevron: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 4l4 4-4 4" /></svg>,
  back: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 4L6 8l4 4" /></svg>,
  chat: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z" /><path d="M8.5 11h7M8.5 14.5h4" /></svg>,
  image: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></svg>,
  close: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>,
  check: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>,
  alert: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
};

/* ---------- Time labels ---------- */
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const clock = (date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const dayMonth = (date) => date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

const fullWhen = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (sameDay(date, now)) return `Today, ${clock(date)}`;
  if (sameDay(date, yesterday)) return `Yesterday, ${clock(date)}`;
  return `${date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, ${clock(date)}`;
};

const shortAgo = (value) => {
  const date = new Date(value);
  const ms = Date.now() - date.getTime();
  if (Number.isNaN(ms)) return '';
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return dayMonth(date);
};

const initialsOf = (name) => String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || 'Y';

const errorText = (error, fallback) => (error?.response ? (error.response.data?.error || fallback) : 'No internet connection. Check your data or Wi-Fi, then try again.');

/* ---------- Screenshot picker ---------- */
function ScreenshotPicker({ value, onChange, error, setError, compact }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const pick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      onChange(await prepareScreenshot(file));
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ig-hp-shot-wrap">
      <input ref={inputRef} type="file" accept="image/png,image/jpeg" className="ig-hp-file" onChange={pick} tabIndex={-1} aria-hidden="true" />
      {value ? (
        <span className="ig-hp-shot-chip">
          <img src={value.dataUrl} alt="" />
          <span>{value.name}</span>
          <button type="button" onClick={() => onChange(null)} aria-label="Remove screenshot">{Icon.close}</button>
        </span>
      ) : (
        <button type="button" className={compact ? 'ig-hp-shot-link' : `ig-hp-shot${error ? ' is-error' : ''}`} onClick={() => inputRef.current?.click()} disabled={busy}>
          {Icon.image}{busy ? 'Preparing…' : compact ? 'Add screenshot' : <>Add a screenshot <span>PNG or JPEG, up to 5 MB</span></>}
        </button>
      )}
      {error && <span className="ig-hp-err" role="alert">{Icon.alert}{error}</span>}
    </div>
  );
}

/* ---------- New ticket ---------- */
function NewTicketModal({ onClose, onSent, eventOptions }) {
  const toast = useToast();
  const [form, setForm] = useState({ topic: 'checkin', event: '', subject: '', message: '', urgent: false });
  const [shot, setShot] = useState(null);
  const [shotError, setShotError] = useState('');
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const dialogRef = useRef(null);
  const subjectRef = useRef(null);
  const messageRef = useRef(null);

  useEffect(() => {
    dialogRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape' && !sending) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, sending]);

  const set = (key) => (event) => {
    const value = event?.target ? event.target.value : event;
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (sending) return;
    const next = {};
    if (!form.subject.trim()) next.subject = 'Add a short subject.';
    if (!form.message.trim()) next.message = 'Tell us a little about the problem.';
    if (Object.keys(next).length) {
      setErrors(next);
      (next.subject ? subjectRef : messageRef).current?.focus();
      return;
    }
    const [eventKind, eventId] = form.event ? form.event.split(':') : [null, null];
    setSending(true);
    try {
      const { ticket } = await createHelpTicket({
        topic: form.topic,
        subject: form.subject,
        message: form.message,
        urgent: form.urgent,
        eventKind,
        eventId,
        screenshot: shot?.dataUrl || undefined,
        screenshotName: shot?.name || undefined
      });
      onSent(ticket);
    } catch (error) {
      const fieldErrors = error.response?.data?.errors;
      if (fieldErrors) {
        setErrors(fieldErrors);
        if (fieldErrors.screenshot) setShotError(fieldErrors.screenshot);
      }
      toast.error(errorText(error, 'We could not send your ticket. Please try again.'));
      setSending(false);
    }
  };

  return (
    <div className="ig-hp-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !sending) onClose(); }}>
      <form className="ig-hp-modal" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="ig-hp-new-title" onSubmit={submit} noValidate>
        <div className="ig-hp-modal-head">
          <span>
            <strong id="ig-hp-new-title">New ticket</strong>
            <span>We reply here and by email.</span>
          </span>
          <button type="button" className="ig-hp-x" onClick={onClose} aria-label="Close" disabled={sending}>{Icon.close}</button>
        </div>

        <div className="ig-hp-field" role="radiogroup" aria-label="What is it about?">
          <span className="ig-hp-label">What is it about?</span>
          <span className="ig-hp-topics">
            {TOPICS.map(([key, label]) => (
              <button key={key} type="button" role="radio" aria-checked={form.topic === key} className={form.topic === key ? 'is-on' : ''} onClick={() => set('topic')(key)}>{label}</button>
            ))}
          </span>
        </div>

        <div className="ig-hp-field">
          <label className="ig-hp-label" htmlFor="ig-hp-event">Which event? <span className="ig-hp-optional">Optional</span></label>
          <select id="ig-hp-event" value={form.event} onChange={set('event')}>
            <option value="">Not about an event</option>
            {eventOptions.map((option) => (
              <option key={`${option.kind}:${option.id}`} value={`${option.kind}:${option.id}`}>
                {option.title}{option.live ? ', live now' : option.date ? `, ${dayMonth(new Date(option.date))}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="ig-hp-field">
          <label className="ig-hp-label" htmlFor="ig-hp-subject">Subject</label>
          <input id="ig-hp-subject" ref={subjectRef} type="text" value={form.subject} onChange={set('subject')} maxLength={160} placeholder="For example: Scanner says pass already used" aria-invalid={Boolean(errors.subject) || undefined} aria-describedby={errors.subject ? 'ig-hp-subject-err' : undefined} className={errors.subject ? 'is-error' : ''} />
          {errors.subject && <span className="ig-hp-err" id="ig-hp-subject-err">{Icon.alert}{errors.subject}</span>}
        </div>

        <div className="ig-hp-field">
          <label className="ig-hp-label" htmlFor="ig-hp-message">What happened?</label>
          <textarea id="ig-hp-message" ref={messageRef} rows={4} value={form.message} onChange={set('message')} maxLength={5000} placeholder="Tell us what you did, what you expected and what you saw instead." aria-invalid={Boolean(errors.message) || undefined} aria-describedby={errors.message ? 'ig-hp-message-err' : undefined} className={errors.message ? 'is-error' : ''} />
          {errors.message && <span className="ig-hp-err" id="ig-hp-message-err">{Icon.alert}{errors.message}</span>}
        </div>

        <ScreenshotPicker value={shot} onChange={setShot} error={shotError} setError={setShotError} />

        <button type="button" role="checkbox" aria-checked={form.urgent} className={`ig-hp-urgent${form.urgent ? ' is-on' : ''}`} onClick={() => set('urgent')(!form.urgent)}>
          <span className="ig-hp-urgent-box">{Icon.check}</span>
          <span>
            <strong>My event is happening now</strong>
            <span>Guests are at the door. We look at these first.</span>
          </span>
        </button>

        <div className="ig-hp-modal-actions">
          <button type="button" className="ig-db-btn-ghost" onClick={onClose} disabled={sending}>Cancel</button>
          <button type="submit" className="ig-db-btn-primary" disabled={sending}>
            {sending && <span className="ig-hp-spin" aria-hidden="true" />}
            {sending ? 'Sending…' : 'Send ticket'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------- Ticket list ---------- */
function TicketList({ data, onNew, contactEmail }) {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'solved' ? 'solved' : 'open';
  const tickets = data?.tickets || [];
  const open = tickets.filter((ticket) => ticket.status !== 'solved');
  const solved = tickets.filter((ticket) => ticket.status === 'solved');
  const visible = tab === 'solved' ? solved : open;
  const loading = !data;

  const choose = (key) => {
    const next = new URLSearchParams(params);
    if (key === 'open') next.delete('tab'); else next.set('tab', key);
    setParams(next, { replace: true });
  };

  return (
    <>
      <div className="ig-hp-head">
        <div>
          <h1>Help</h1>
          <p>Ask the Ingather team anything. We reply here and by email.</p>
        </div>
        <button type="button" className="ig-db-btn-primary ig-hp-new" onClick={onNew}>{DashIcon.plus}New ticket</button>
      </div>

      <div className="ig-hp-layout">
        <section className="ig-hp-card ig-hp-main" aria-label="Your tickets">
          <div className="ig-hp-tabs" role="tablist" aria-label="Tickets">
            {[['open', 'Open', open.length], ['solved', 'Solved', solved.length]].map(([key, label, count]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'is-on' : ''} onClick={() => choose(key)}>
                {label}<span>{loading ? '' : count}</span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="ig-hp-rows" aria-busy="true">
              {[0, 1, 2].map((n) => <div key={n} className="ig-hp-row is-skeleton"><span /><span /><span /></div>)}
            </div>
          ) : visible.length > 0 ? (
            <div className="ig-hp-rows">
              {visible.map((ticket) => (
                <Link key={ticket.number} to={`/help/${ticket.number}`} className={`ig-hp-row${ticket.unread ? ' is-unread' : ''}`}>
                  <span className="ig-hp-row-text">
                    <span className="ig-hp-row-tags">
                      <span className={`ig-hp-pill ${STATUS[ticket.status]?.className || ''}`}>{STATUS[ticket.status]?.label}</span>
                      {ticket.urgent && ticket.status !== 'solved' && <span className="ig-hp-pill is-urgent">Urgent</span>}
                      <span className="ig-hp-num">#{ticket.number}</span>
                    </span>
                    <strong>{ticket.subject}</strong>
                    <span className="ig-hp-meta">{[ticket.topicLabel, ticket.eventTitle, shortAgo(ticket.lastMessageAt)].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className="ig-hp-row-end">
                    {ticket.unread && <span className="ig-hp-dot" aria-label="New reply" />}
                    {Icon.chevron}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="ig-hp-empty">
              <span className="ig-hp-empty-icon">{Icon.chat}</span>
              <strong>{tab === 'solved' ? 'No solved tickets yet' : tickets.length ? 'Nothing open right now' : 'No tickets yet'}</strong>
              <span>{tab === 'solved' ? 'Tickets you mark as solved show up here.' : 'When something is not working, or you are not sure how to do something, send us a ticket.'}</span>
              {tab === 'open' && <button type="button" className="ig-db-btn-ghost" onClick={onNew}>{DashIcon.plus}New ticket</button>}
            </div>
          )}
        </section>

        <aside className="ig-hp-card ig-hp-aside" aria-label="Before you write">
          <strong>Help us help you faster</strong>
          <span className="ig-hp-step"><span>1</span>Pick the event it is about, so we can see what you see.</span>
          <span className="ig-hp-step"><span>2</span>Add a screenshot if something looks wrong.</span>
          <span className="ig-hp-step"><span>3</span>If guests are at the door right now, tick "My event is happening now". We answer those first.</span>
          {contactEmail && <span className="ig-hp-note">Replies also go to {contactEmail}.</span>}
        </aside>
      </div>
    </>
  );
}

/* ---------- One ticket ---------- */
function TicketView({ number, onNew, churchName }) {
  const toast = useToast();
  const [state, setState] = useState({ status: 'loading', data: null });
  const [reply, setReply] = useState('');
  const [replyError, setReplyError] = useState('');
  const [shot, setShot] = useState(null);
  const [shotError, setShotError] = useState('');
  const [busy, setBusy] = useState('');
  const [writeBack, setWriteBack] = useState(false);

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, status: prev.data ? 'ready' : 'loading' }));
    try {
      const data = await getHelpTicket(number);
      setState({ status: 'ready', data });
    } catch (error) {
      setState({ status: error.response?.status === 404 ? 'notfound' : 'error', data: null, message: errorText(error, 'We could not load this ticket.') });
    }
  }, [number]);

  useEffect(() => { load(); }, [load]);

  const ticket = state.data?.ticket;
  const messages = state.data?.messages || [];

  const send = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!reply.trim()) {
      setReplyError('Write a reply first.');
      return;
    }
    setBusy('reply');
    try {
      const data = await replyToHelpTicket(number, { message: reply, screenshot: shot?.dataUrl || undefined, screenshotName: shot?.name || undefined });
      setState({ status: 'ready', data });
      setReply('');
      setShot(null);
      setWriteBack(false);
      toast.success(ticket?.status === 'solved' ? 'Reply sent. Ticket opened again.' : 'Reply sent');
    } catch (error) {
      if (error.response?.data?.closed) await load();
      if (error.response?.data?.errors?.screenshot) setShotError(error.response.data.errors.screenshot);
      toast.error(errorText(error, 'We could not send your reply. Please try again.'));
    } finally {
      setBusy('');
    }
  };

  const solve = async () => {
    if (busy) return;
    setBusy('solve');
    try {
      const data = await solveHelpTicket(number);
      setState({ status: 'ready', data });
      toast.success('Marked as solved');
    } catch (error) {
      toast.error(errorText(error, 'We could not update this ticket. Please try again.'));
    } finally {
      setBusy('');
    }
  };

  if (state.status === 'loading') {
    return (
      <div className="ig-hp-layout" aria-busy="true">
        <section className="ig-hp-card ig-hp-main"><div className="ig-hp-row is-skeleton is-tall"><span /><span /><span /></div></section>
      </div>
    );
  }

  if (state.status !== 'ready') {
    return (
      <>
        <Link to="/help" className="ig-hp-back">{Icon.back}All tickets</Link>
        <div className="ig-hp-card ig-hp-empty" role="alert">
          <span className="ig-hp-empty-icon">{Icon.chat}</span>
          <strong>{state.status === 'notfound' ? "We couldn't find that ticket" : "We couldn't load this ticket"}</strong>
          <span>{state.status === 'notfound' ? 'It may belong to a different workspace, or the link is wrong.' : state.message}</span>
          {state.status === 'error' && <button type="button" className="ig-db-btn-ghost" onClick={load}>Try again</button>}
        </div>
      </>
    );
  }

  const solved = ticket.status === 'solved';
  const replyBox = (
    <form className="ig-hp-reply" onSubmit={send} noValidate>
      <div className="ig-hp-field">
        <label className="ig-hp-label" htmlFor="ig-hp-reply">Your reply</label>
        <textarea id="ig-hp-reply" rows={3} value={reply} onChange={(event) => { setReply(event.target.value); setReplyError(''); }} maxLength={5000} placeholder="Write a reply" aria-invalid={Boolean(replyError) || undefined} aria-describedby={replyError ? 'ig-hp-reply-err' : undefined} className={replyError ? 'is-error' : ''} />
        {replyError && <span className="ig-hp-err" id="ig-hp-reply-err">{Icon.alert}{replyError}</span>}
      </div>
      <div className="ig-hp-reply-bar">
        <ScreenshotPicker value={shot} onChange={setShot} error={shotError} setError={setShotError} compact />
        <span className="ig-hp-reply-actions">
          {!solved && <button type="button" className="ig-db-btn-ghost" onClick={solve} disabled={Boolean(busy)}>{busy === 'solve' ? 'Saving…' : 'Mark as solved'}</button>}
          <button type="submit" className="ig-db-btn-primary" disabled={Boolean(busy)}>
            {busy === 'reply' && <span className="ig-hp-spin" aria-hidden="true" />}
            {busy === 'reply' ? 'Sending…' : 'Send reply'}
          </button>
        </span>
      </div>
    </form>
  );

  const facts = [
    ['Ticket', `#${ticket.number}`],
    ['Topic', ticket.topicLabel],
    ['Event', ticket.eventTitle],
    ['Opened', fullWhen(ticket.createdAt)],
    ['Replies go to', ticket.contactEmail]
  ].filter(([, value]) => value);

  return (
    <>
      <Link to="/help" className="ig-hp-back">{Icon.back}All tickets</Link>
      <div className="ig-hp-layout">
        <section className="ig-hp-card ig-hp-main ig-hp-convo" aria-label="Conversation">
          <div className="ig-hp-convo-head">
            <span className="ig-hp-row-tags">
              <span className={`ig-hp-pill ${STATUS[ticket.status]?.className || ''}`}>{STATUS[ticket.status]?.label}</span>
              {ticket.urgent && !solved && <span className="ig-hp-pill is-urgent">Urgent</span>}
              <span className="ig-hp-num">#{ticket.number}</span>
            </span>
            <h1>{ticket.subject}</h1>
          </div>

          <ol className="ig-hp-thread">
            {messages.map((message) => {
              const team = message.author === 'admin';
              return (
                <li key={message.id} className={`ig-hp-msg${team ? ' is-team' : ''}`}>
                  <span className="ig-hp-msg-head">
                    <span className="ig-hp-avatar" aria-hidden="true">{team ? 'IG' : initialsOf(churchName || message.authorName)}</span>
                    <span>
                      <strong>{team ? message.authorName : 'You'}</strong>
                      <span>{fullWhen(message.createdAt)}</span>
                    </span>
                  </span>
                  <p>{message.body}</p>
                  {message.screenshot && (
                    message.screenshot.url ? (
                      <a className="ig-hp-attach" href={message.screenshot.url} target="_blank" rel="noopener noreferrer">
                        <img src={message.screenshot.url} alt={`Screenshot: ${message.screenshot.name || 'attached image'}`} />
                        <span>{Icon.image}{message.screenshot.name || 'Screenshot'}</span>
                      </a>
                    ) : (
                      <span className="ig-hp-attach is-missing">{Icon.image}{message.screenshot.name || 'Screenshot'} (not available right now)</span>
                    )
                  )}
                </li>
              );
            })}
          </ol>

          {!solved && replyBox}
          {solved && ticket.canReopen && (
            <>
              <div className="ig-hp-solved" role="status"><span>{Icon.check}</span>Solved. Reply any time within 14 days to open it again.</div>
              {writeBack ? replyBox : <button type="button" className="ig-db-btn-ghost ig-hp-writeback" onClick={() => setWriteBack(true)}>Write back</button>}
            </>
          )}
          {solved && !ticket.canReopen && (
            <div className="ig-hp-solved is-closed" role="status">
              <span>{Icon.check}</span>
              <span>This ticket is closed. If you still need help, <button type="button" onClick={onNew}>send a new ticket</button>.</span>
            </div>
          )}
        </section>

        <aside className="ig-hp-card ig-hp-aside ig-hp-facts" aria-label="Ticket details">
          <strong>Details</strong>
          {facts.map(([key, value]) => (
            <span key={key} className="ig-hp-fact"><span>{key}</span><span>{value}</span></span>
          ))}
        </aside>
      </div>
    </>
  );
}

/* ---------- Page ---------- */
function Help() {
  const navigate = useNavigate();
  const toast = useToast();
  const { number } = useParams();
  const [params, setParams] = useSearchParams();
  const { template, setTemplateKey } = useEventTemplate();
  const setTemplateRef = useRef(setTemplateKey);
  setTemplateRef.current = setTemplateKey;
  const today = useMemo(() => localToday(), []);

  const [boot, setBoot] = useState(null);
  const [list, setList] = useState(null);
  const [listError, setListError] = useState('');
  const [eventOptions, setEventOptions] = useState([]);
  const newOpen = params.get('new') === '1';

  useEffect(() => {
    document.title = 'Help | Ingather';
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login', { replace: true });
      return undefined;
    }
    let alive = true;
    getDashboardBootstrap(today, today, today)
      .then((shell) => {
        if (!alive || !shell) return;
        setBoot(shell);
        if (shell.church?.organizationType) setTemplateRef.current(shell.church.organizationType);
      })
      .catch((error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login', { replace: true });
        }
      });
    return () => { alive = false; };
  }, [today, navigate]);

  const loadList = useCallback(async () => {
    setListError('');
    try {
      setList(await getHelpTickets());
    } catch (error) {
      setListError(errorText(error, 'We could not load your tickets.'));
    }
  }, []);

  useEffect(() => {
    if (!number) loadList();
  }, [number, loadList]);

  useEffect(() => {
    if (!newOpen) return;
    getHelpEventOptions().then((data) => setEventOptions(data.events || [])).catch(() => {});
  }, [newOpen]);

  const openNew = () => {
    const next = new URLSearchParams(params);
    next.set('new', '1');
    if (number) navigate(`/help?new=1`); else setParams(next);
  };
  const closeNew = useCallback(() => {
    const next = new URLSearchParams(params);
    next.delete('new');
    setParams(next, { replace: true });
  }, [params, setParams]);

  const onSent = (ticket) => {
    toast.success(`Ticket #${ticket.number} sent. We will reply here and by email.`);
    navigate(`/help/${ticket.number}`, { replace: true });
  };

  const church = boot?.church ? { name: boot.church.churchName, email: boot.church.email, logoUrl: boot.church.logoUrl } : null;
  const stats = boot?.stats;

  return (
    <IgDashShell
      active="help"
      crumb="Help"
      church={church}
      counts={{ preEvents: stats?.preEventCount || 0, events: stats?.totalProgramsAllTime || 0 }}
      unreadCount={boot?.unreadCount || 0}
      live={stats?.live || null}
      template={template}
    >
      <div className="ig-db-page ig-hp">
        {number ? (
          <TicketView key={number} number={number} onNew={openNew} churchName={church?.name} />
        ) : listError ? (
          <>
            <div className="ig-hp-head"><div><h1>Help</h1><p>Ask the Ingather team anything. We reply here and by email.</p></div></div>
            <div className="ig-hp-card ig-hp-empty" role="alert">
              <span className="ig-hp-empty-icon">{Icon.chat}</span>
              <strong>We couldn't load your tickets</strong>
              <span>{listError}</span>
              <button type="button" className="ig-db-btn-ghost" onClick={loadList}>Try again</button>
            </div>
          </>
        ) : (
          <TicketList data={list} onNew={openNew} contactEmail={list?.contactEmail || church?.email} />
        )}
      </div>
      {newOpen && <NewTicketModal onClose={closeNew} onSent={onSent} eventOptions={eventOptions} />}
    </IgDashShell>
  );
}

export default Help;
