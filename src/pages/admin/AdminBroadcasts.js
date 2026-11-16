// Admin Broadcasts: a message that shows in every organiser's notifications in their dashboard.
// "Send me a test" emails it to you only. Sending for real asks for your authenticator code.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { adminData, adminErrorMessage } from '../../api/adminApi';
import { useAdminSession } from './AdminSession';
import { AdminIcon } from './AdminIcons';
import { CodeBoxes } from './AdminAuthPages';

const TITLE_MAX = 120;
const MESSAGE_MAX = 1000;

const dayWords = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.round((new Date(today.toDateString()) - new Date(d.toDateString())) / 86400000);
  if (diff === 0) return `Today, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}) });
};

function ConfirmSend({ title, audience, onCancel, onSent }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef(null);
  const message = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  const send = async (value = code) => {
    if (busy) return;
    if (value.length !== 6) { setError('Type all 6 digits.'); return; }
    setBusy(true);
    setError('');
    try {
      await onSent(value);
    } catch (err) {
      setError(adminErrorMessage(err, 'Could not send. Nothing was sent.'));
      setCode('');
      setBusy(false);
    }
  };

  return (
    <div className="ig-ad-modal-wrap" role="presentation" onClick={() => !busy && onCancel()}>
      <div className="ig-ad-modal" role="dialog" aria-modal="true" aria-labelledby="ig-ad-bc-title" ref={ref} onClick={(e) => e.stopPropagation()}>
        <h2 id="ig-ad-bc-title">Send to all {audience.toLocaleString('en-US')} organisations?</h2>
        <p ref={message}>“{title}” shows in every organiser's notifications straight away. You cannot edit or unsend it.</p>
        <span className="ig-ad-field" style={{ gap: 8 }}>
          Code from your authenticator app
          <CodeBoxes value={code} onChange={(v) => { setCode(v); setError(''); }} onComplete={(v) => send(v)} label="Code from your authenticator app" invalid={Boolean(error)} />
        </span>
        {error ? <p className="ig-ad-error" role="alert" style={{ margin: 0 }}>{error}</p> : null}
        <p className="ig-ad-small ig-ad-muted" style={{ lineHeight: 1.5 }}>We ask again for actions that reach every organiser or change who has access. Every owner gets an email when a broadcast goes out.</p>
        <div className="ig-ad-modal-actions">
          <button type="button" className="ig-ad-btn-2" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="ig-ad-btn" onClick={() => send()} disabled={busy}>{busy ? 'Sending…' : 'Send now'}</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDelete({ broadcast, onCancel, onDeleted }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  const remove = async (value = code) => {
    if (busy) return;
    if (value.length !== 6) { setError('Type all 6 digits.'); return; }
    setBusy(true);
    setError('');
    try {
      await onDeleted(value);
    } catch (err) {
      setError(adminErrorMessage(err, 'Could not delete it. Nothing changed.'));
      setCode('');
      setBusy(false);
    }
  };

  return (
    <div className="ig-ad-modal-wrap" role="presentation" onClick={() => !busy && onCancel()}>
      <div className="ig-ad-modal" role="dialog" aria-modal="true" aria-labelledby="ig-ad-bc-del" onClick={(e) => e.stopPropagation()}>
        <h2 id="ig-ad-bc-del">Delete “{broadcast.title}”?</h2>
        <p>It disappears from every organiser's notifications in their dashboard, including people who already read it. You cannot bring it back.</p>
        <span className="ig-ad-field" style={{ gap: 8 }}>
          Code from your authenticator app
          <CodeBoxes value={code} onChange={(v) => { setCode(v); setError(''); }} onComplete={(v) => remove(v)} label="Code from your authenticator app" invalid={Boolean(error)} />
        </span>
        {error ? <p className="ig-ad-error" role="alert" style={{ margin: 0 }}>{error}</p> : null}
        <div className="ig-ad-modal-actions">
          <button type="button" className="ig-ad-btn-2" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="ig-ad-btn is-red" onClick={() => remove()} disabled={busy}>{busy ? 'Deleting…' : 'Delete'}</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminBroadcasts() {
  const { session } = useAdminSession();
  const canSend = session.admin?.role === 'owner' || session.admin?.role === 'admin';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [testing, setTesting] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const toastTimer = useRef(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const { data: res } = await adminData.broadcasts();
      setData(res);
    } catch (err) {
      if (err?.response?.status !== 401) setError(adminErrorMessage(err, 'Could not load broadcasts. Please try again.'));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toast = (text, tone = 'ok') => {
    setToastMsg({ text, tone });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 4500);
  };
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const check = () => {
    if (!title.trim()) return 'Add a title.';
    if (!message.trim()) return 'Write the message.';
    return '';
  };

  const sendTest = async () => {
    const problem = check();
    if (problem) { setFormError(problem); return; }
    setTesting(true);
    try {
      const { data: res } = await adminData.broadcastTest(title.trim(), message.trim());
      toast(`Test sent to ${res.sentTo}. No organiser got it.`);
    } catch (err) {
      toast(adminErrorMessage(err, 'Could not send the test.'), 'warn');
    } finally {
      setTesting(false);
    }
  };

  const openConfirm = () => {
    const problem = check();
    if (problem) { setFormError(problem); return; }
    setConfirming(true);
  };

  const sendForReal = async (code) => {
    const { data: res } = await adminData.broadcastSend(title.trim(), message.trim(), code);
    setConfirming(false);
    setTitle('');
    setMessage('');
    setData((d) => (d ? { ...d, sent: [res.broadcast, ...d.sent] } : d));
    toast(`Broadcast sent to ${res.broadcast.reach.toLocaleString('en-US')} organisations`);
  };

  const deleteForReal = async (code) => {
    await adminData.broadcastDelete(deleting.id, code);
    const gone = deleting;
    setDeleting(null);
    setData((d) => (d ? { ...d, sent: d.sent.filter((b) => b.id !== gone.id) } : d));
    toast(`“${gone.title}” was deleted from every organiser's notifications`);
  };

  const audience = data?.audience ?? 0;

  return (
    <>
      <div className="ig-ad-pagehead">
        <div className="ig-ad-pagehead-text">
          <h1>Broadcasts</h1>
          <p>Send a message to every organiser.</p>
        </div>
      </div>

      {error ? <div className="ig-ad-notice is-red" role="alert"><AdminIcon name="warn" size={16} /><span>{error} <button type="button" className="ig-ad-link ig-ad-link-orange" onClick={load}>Try again</button></span></div> : null}

      <div className="ig-ad-row ig-ad-bc-row">
        <section className="ig-ad-panel gap-14" aria-label="New broadcast">
          <div className="ig-ad-panel-head"><span><h2>New broadcast</h2><small>Shows in every organiser's notifications, in their dashboard</small></span></div>
          {canSend ? (
            <>
              <label className="ig-ad-field">
                <span className="ig-ad-label-row">Title<small>{title.length}/{TITLE_MAX}</small></span>
                <input className="ig-ad-input" value={title} maxLength={TITLE_MAX} onChange={(e) => { setTitle(e.target.value); setFormError(''); }} placeholder="Night mode is here" />
              </label>
              <label className="ig-ad-field">
                <span className="ig-ad-label-row">Message<small>{message.length}/{MESSAGE_MAX}</small></span>
                <textarea className="ig-ad-input ig-ad-textarea" rows={5} value={message} maxLength={MESSAGE_MAX} onChange={(e) => { setMessage(e.target.value); setFormError(''); }} placeholder="Tell organisers what is new, in a sentence or two." />
              </label>
              {formError ? <p className="ig-ad-error" role="alert" style={{ margin: '-6px 0 0' }}>{formError}</p> : null}
              <div className="ig-ad-bc-foot">
                <span className="ig-ad-muted ig-ad-small">{data ? `Goes to all ${audience.toLocaleString('en-US')} organisations` : ''}</span>
                <span className="ig-ad-bc-actions">
                  <button type="button" className="ig-ad-btn-2" onClick={sendTest} disabled={testing}>{testing ? 'Sending…' : 'Send me a test'}</button>
                  <button type="button" className="ig-ad-btn" onClick={openConfirm} disabled={!data}>Send broadcast</button>
                </span>
              </div>
              <p className="ig-ad-hint">“Send me a test” emails it to {session.admin?.email} only, so you can check the wording first. Organisers get nothing until you press Send broadcast and type your code.</p>
            </>
          ) : (
            <p className="ig-ad-hint">You can see what was sent. Ask the owner if you need to send a broadcast.</p>
          )}
        </section>

        <section className="ig-ad-panel gap-10" aria-label="Sent broadcasts">
          <div className="ig-ad-panel-head"><span><h2>Sent</h2><small>Read means opened in their dashboard</small></span></div>
          <div className="ig-ad-list">
            {!data ? <span className="ig-ad-skel" style={{ height: 200, display: 'block' }} /> : null}
            {data && !data.sent.length ? <p className="ig-ad-empty">Nothing sent yet.</p> : null}
            {(data?.sent || []).map((b) => (
              <article key={b.id} className="ig-ad-bc-item">
                <header><strong>{b.title}</strong><span>{dayWords(b.createdAt)}</span></header>
                <p>{b.message}</p>
                <span className="ig-ad-bc-read">
                  <span className="ig-ad-track"><span style={{ width: `${b.readPct}%` }} /></span>
                  <span>Read by {b.readPct}%</span>
                  {canSend ? <button type="button" className="ig-ad-link ig-ad-link-red ig-ad-bc-del" onClick={() => setDeleting(b)} aria-label={`Delete ${b.title}`}>Delete</button> : null}
                </span>
              </article>
            ))}
          </div>
        </section>
      </div>

      {deleting ? <ConfirmDelete broadcast={deleting} onCancel={() => setDeleting(null)} onDeleted={deleteForReal} /> : null}
      {confirming ? <ConfirmSend title={title.trim()} audience={audience} onCancel={() => setConfirming(false)} onSent={sendForReal} /> : null}
      {toastMsg ? (
        <div className={`ig-ad-toast${toastMsg.tone === 'warn' ? ' is-warn' : ''}`} role="status">
          <span className="ig-ad-toast-ic"><AdminIcon name={toastMsg.tone === 'warn' ? 'warn' : 'check'} size={14} strokeWidth={2.4} /></span>
          {toastMsg.text}
        </div>
      ) : null}
    </>
  );
}
