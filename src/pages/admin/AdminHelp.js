// Admin Help: tickets organisers send from their dashboard. Reply, assign and solve here;
// the organiser sees replies in their Help page and by email.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { adminData, adminErrorMessage } from '../../api/adminApi';
import { useAdminSession } from './AdminSession';
import { AdminIcon } from './AdminIcons';

const TABS = [['needs', 'Needs a reply'], ['waiting', 'Waiting on organiser'], ['solved', 'Solved'], ['all', 'All']];
const TAB_WORDS = { needs: 'needing a reply', waiting: 'waiting on the organiser', solved: 'solved', all: 'in total' };
const AVATARS = [['#111111', '#FFFFFF'], ['#FFF1E7', '#C84B07'], ['#EAF2FF', '#2563C9'], ['#E6F6F4', '#1D8A7E'], ['#FDECF1', '#C2416B'], ['#FFF6DB', '#B7791F']];
const REFRESH_MS = 60 * 1000;

const fmt = (n) => (n == null ? '–' : Number(n).toLocaleString('en-US'));

const sinceWords = (iso) => {
  if (!iso) return '';
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr`;
  if (hrs < 48) return 'Yesterday';
  return `${Math.floor(hrs / 24)} days`;
};

const durationWords = (seconds, compact = false) => {
  if (seconds == null) return '–';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${Math.max(1, mins)} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (compact) return m ? `${h}h ${m}m` : `${h}h`;
  return m ? `${h} hr ${m} min` : `${h} hr`;
};

const stampWords = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) return `Today, ${time}`;
  const y = new Date(today.getTime() - 86400000);
  if (d.toDateString() === y.toDateString()) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${time}`;
};

const initials = (name) => {
  const words = String(name || '').replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w && !/^\d+$/.test(w));
  return ((words[0] || '')[0] || '').concat((words[1] || '')[0] || '').toUpperCase() || 'IG';
};
const avatarFor = (id) => AVATARS[Math.abs(Number(id) || 0) % AVATARS.length];

function useCompact() {
  const query = '(max-width: 960px)';
  const [compact, setCompact] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setCompact(list.matches);
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, []);
  return compact;
}

function StatusPill({ t }) {
  if (t.status === 'waiting') return t.urgent ? <span className="ig-ad-pill is-red">Urgent</span> : <span className="ig-ad-pill is-orange">Needs a reply</span>;
  if (t.status === 'replied') return <span className="ig-ad-pill is-blue">Waiting on them</span>;
  return <span className="ig-ad-pill is-green">Solved</span>;
}

function TicketPanel({ number, canAct, team, onClose, onChanged, toast }) {
  const { session } = useAdminSession();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState('');
  const [replyError, setReplyError] = useState('');
  const closeRef = useRef(null);
  const threadEnd = useRef(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError('');
    setReply('');
    adminData.helpTicket(number)
      .then(({ data: res }) => { if (alive) { setData(res); onChanged(); } })
      .catch((err) => { if (alive) setError(adminErrorMessage(err, 'Could not open this ticket.')); });
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [number]);

  useEffect(() => { threadEnd.current?.scrollIntoView({ block: 'nearest' }); }, [data?.messages?.length]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [onClose]);

  const t = data?.ticket;
  const [bg, fg] = avatarFor(t?.orgId);

  const send = async (solve = false) => {
    if (!reply.trim()) { setReplyError('Write a reply first.'); return; }
    setBusy(solve ? 'send-solve' : 'send');
    setReplyError('');
    try {
      const { data: res } = await adminData.helpReply(number, reply.trim(), solve);
      setData(res);
      setReply('');
      onChanged();
      toast(res.emailSent ? `Reply sent to ${res.ticket.org}` : `Reply saved for ${res.ticket.org}. It shows in their Help page, but the email did not send.`, res.emailSent ? 'ok' : 'warn');
      if (solve) onClose();
    } catch (err) {
      setReplyError(adminErrorMessage(err, 'Could not send the reply. Please try again.'));
    } finally {
      setBusy('');
    }
  };

  const setStatus = async (status) => {
    setBusy(status);
    try {
      const { data: res } = await adminData.helpStatus(number, status);
      setData(res);
      onChanged();
      toast(status === 'solved' ? `Ticket #${number} marked solved` : `Ticket #${number} reopened`);
      if (status === 'solved') onClose();
    } catch (err) {
      toast(adminErrorMessage(err, 'Could not update this ticket.'), 'warn');
    } finally {
      setBusy('');
    }
  };

  const assign = async (value) => {
    setBusy('assign');
    try {
      const { data: res } = await adminData.helpAssign(number, value === '' ? null : Number(value));
      setData(res);
      onChanged();
    } catch (err) {
      toast(adminErrorMessage(err, 'Could not assign this ticket.'), 'warn');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="ig-ad-panel-wrap" role="presentation" onClick={onClose}>
      <aside className="ig-ad-sheet" role="dialog" aria-modal="true" aria-label={t ? t.subject : 'Ticket'} onClick={(e) => e.stopPropagation()}>
        <header className="ig-ad-sheet-head">
          <span className="ig-ad-av" style={{ background: bg, color: fg, width: 48, height: 48, borderRadius: 12 }}>{t ? initials(t.org) : ''}</span>
          <span className="ig-ad-sheet-title">
            <strong>{t ? t.subject : 'Loading…'}</strong>
            {t ? <span>{[`#${t.number}`, t.org, t.eventTitle].filter(Boolean).join(' · ')}</span> : null}
          </span>
          <button type="button" className="ig-ad-x" aria-label="Close" onClick={onClose} ref={closeRef}><AdminIcon name="close" size={16} /></button>
        </header>

        <div className="ig-ad-sheet-body">
          {error ? <div className="ig-ad-notice is-red" role="alert"><AdminIcon name="warn" size={16} /><span>{error}</span></div> : null}
          {!t && !error ? <span className="ig-ad-skel" style={{ display: 'block', height: 280 }} /> : null}
          {t ? (
            <>
              <div className="ig-ad-chips">
                {t.urgent && t.status === 'waiting' ? <span className="ig-ad-pill is-red">Urgent, event is live</span> : null}
                <span className="ig-ad-pill is-grey">{t.topicLabel}</span>
                {t.status === 'solved' ? <span className="ig-ad-pill is-green">Solved</span> : null}
              </div>

              <div className="ig-ad-thread">
                {data.messages.map((m) => (
                  <article key={m.id} className={`ig-ad-msg${m.author === 'admin' ? ' is-team' : ''}`}>
                    <header>
                      {m.author === 'admin'
                        ? <span className="ig-ad-av" style={{ background: '#111111', color: '#FFFFFF', width: 30, height: 30, borderRadius: 8, fontSize: 11 }}>IG</span>
                        : <span className="ig-ad-av" style={{ background: bg, color: fg, width: 30, height: 30, borderRadius: 8, fontSize: 11 }}>{initials(t.org)}</span>}
                      <span>
                        <strong>{m.authorName}</strong>
                        <small>{stampWords(m.createdAt)}{m.author === 'admin' ? ' · Ingather team' : ' · from the dashboard'}</small>
                      </span>
                    </header>
                    <p>{m.body}</p>
                    {m.screenshot ? (
                      m.screenshot.url
                        ? <a className="ig-ad-file" href={m.screenshot.url} target="_blank" rel="noreferrer noopener"><AdminIcon name="download" size={14} />{m.screenshot.name}</a>
                        : <span className="ig-ad-file is-off" title="Screenshot storage is not set up on this server"><AdminIcon name="download" size={14} />{m.screenshot.name} (not available here)</span>
                    ) : null}
                  </article>
                ))}
                <span ref={threadEnd} />
              </div>

              {canAct ? (
                <>
                  <label className="ig-ad-field ig-ad-assign">
                    Assigned to
                    <span className="ig-ad-select">
                      <select value={t.assignedId || ''} onChange={(e) => assign(e.target.value)} disabled={busy === 'assign'}>
                        <option value="">Nobody yet</option>
                        {team.map((p) => <option key={p.id} value={p.id}>{p.id === session.admin?.id ? `${p.name} (you)` : p.name}</option>)}
                      </select>
                      <AdminIcon name="down" size={16} />
                    </span>
                  </label>
                  <label className="ig-ad-field">
                    Reply
                    <textarea
                      className="ig-ad-input ig-ad-textarea"
                      rows={5}
                      maxLength={5000}
                      value={reply}
                      onChange={(e) => { setReply(e.target.value); setReplyError(''); }}
                      placeholder={`Write to ${t.org}…`}
                      aria-invalid={replyError ? 'true' : 'false'}
                    />
                  </label>
                  {replyError ? <p className="ig-ad-error" role="alert" style={{ margin: '-10px 0 0' }}>{replyError}</p> : null}
                  <p className="ig-ad-small ig-ad-muted" style={{ lineHeight: 1.5 }}>
                    The organiser sees your reply in their Help page and by email at {t.contactEmail}, signed “{(session.admin?.name || '').split(' ')[0]} from Ingather”. Admin can see what they wrote here, never their guest list.
                  </p>
                </>
              ) : (
                <p className="ig-ad-hint">You can read tickets. Ask the owner if you need to reply.</p>
              )}
            </>
          ) : null}
        </div>

        {t && canAct ? (
          <footer className="ig-ad-sheet-foot ig-ad-pair">
            {t.status === 'solved'
              ? <button type="button" className="ig-ad-btn-2" disabled={!!busy} onClick={() => setStatus('open')}>{busy === 'open' ? 'Reopening…' : 'Reopen'}</button>
              : reply.trim()
                ? <button type="button" className="ig-ad-btn-2" disabled={!!busy} onClick={() => send(true)}>{busy === 'send-solve' ? 'Sending…' : 'Send and solve'}</button>
                : <button type="button" className="ig-ad-btn-2" disabled={!!busy} onClick={() => setStatus('solved')}>{busy === 'solved' ? 'Saving…' : 'Mark solved'}</button>}
            <button type="button" className="ig-ad-btn" disabled={!!busy} onClick={() => send(false)}>{busy === 'send' ? 'Sending…' : 'Send reply'}</button>
          </footer>
        ) : null}
      </aside>
    </div>
  );
}

export default function AdminHelp() {
  const compact = useCompact();
  const { session } = useAdminSession();
  const { reloadCounts } = useOutletContext() || {};
  const canAct = session.admin?.role === 'owner' || session.admin?.role === 'admin';
  const [tab, setTab] = useState('needs');
  const [assigned, setAssigned] = useState('anyone');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openNumber, setOpenNumber] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const request = useRef(0);
  const toastTimer = useRef(null);
  const lastFocus = useRef(null);

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(query.trim()), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  const toast = useCallback((text, tone = 'ok') => {
    setToastMsg({ text, tone });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 4500);
  }, []);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const load = useCallback(async (nextPage = 1, quiet = false) => {
    const id = ++request.current;
    if (!quiet) setLoading(true);
    setError('');
    try {
      const { data: res } = await adminData.help({ tab, assigned, q: search || undefined, page: nextPage });
      if (id !== request.current) return;
      setData(res);
      setPage(nextPage);
      setTickets((prev) => (nextPage === 1 ? res.tickets : [...prev, ...res.tickets]));
    } catch (err) {
      if (id === request.current && err?.response?.status !== 401 && !quiet) setError(adminErrorMessage(err, 'Could not load help tickets. Please try again.'));
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [tab, assigned, search]);

  useEffect(() => { load(1); }, [load]);

  // New tickets can arrive at any time, especially during live events.
  useEffect(() => {
    if (page !== 1 || openNumber != null) return undefined;
    const timer = window.setInterval(() => { if (!document.hidden) load(1, true); }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [page, openNumber, load]);

  const changed = useCallback(() => {
    load(1, true);
    if (reloadCounts) reloadCounts();
  }, [load, reloadCounts]);

  const open = (number, e) => { lastFocus.current = e?.currentTarget || null; setOpenNumber(number); };
  const close = useCallback(() => {
    setOpenNumber(null);
    window.setTimeout(() => lastFocus.current?.focus?.(), 0);
  }, []);

  const counts = data?.counts;
  const s = data?.stats;
  const total = data?.total ?? 0;
  const topicMax = Math.max(1, ...(data?.topics || []).map((t) => t.count));

  return (
    <>
      <div className="ig-ad-pagehead">
        <div className="ig-ad-pagehead-text">
          <h1>Help</h1>
          <p>Tickets organisers send from their dashboard.</p>
        </div>
      </div>

      <section aria-label="Help numbers" className="ig-ad-kpis ig-ad-help-stats">
        <div className="ig-ad-kpi">
          <span className="ig-ad-kpi-label">Open tickets</span>
          {s ? <strong className="ig-ad-kpi-value">{fmt(s.open)}</strong> : <span className="ig-ad-skel" style={{ height: 30, width: '50%' }} />}
          <span className="ig-ad-kpi-delta is-grey">{s ? `${fmt(s.needs)} need a reply, ${fmt(s.waitingOn)} waiting on the organiser` : ''}</span>
        </div>
        <div className="ig-ad-kpi">
          <span className="ig-ad-kpi-label">Urgent right now</span>
          {s ? <strong className={`ig-ad-kpi-value${s.urgent ? ' is-red-value' : ''}`}>{fmt(s.urgent)}</strong> : <span className="ig-ad-skel" style={{ height: 30, width: '30%' }} />}
          <span className="ig-ad-kpi-delta is-grey">{s ? (s.urgent ? 'From an event that is live' : 'Nothing urgent') : ''}</span>
        </div>
        <div className="ig-ad-kpi">
          <span className="ig-ad-kpi-label">First reply, on average</span>
          {s ? <strong className="ig-ad-kpi-value">{durationWords(s.firstReplySeconds, compact)}</strong> : <span className="ig-ad-skel" style={{ height: 30, width: '60%' }} />}
          <span className="ig-ad-kpi-delta is-grey">{s ? (s.firstReplyCount ? `Last 30 days, ${fmt(s.firstReplyCount)} tickets` : 'No replies yet in 30 days') : ''}</span>
        </div>
        <div className="ig-ad-kpi">
          <span className="ig-ad-kpi-label">Raised in 30 days</span>
          {s ? <strong className="ig-ad-kpi-value">{fmt(s.raised30)}</strong> : <span className="ig-ad-skel" style={{ height: 30, width: '40%' }} />}
          <span className="ig-ad-kpi-delta is-grey">{s ? `By ${fmt(s.orgs30)} of ${fmt(s.allOrgs)} organisations` : ''}</span>
        </div>
      </section>

      <section className="ig-ad-panel ig-ad-wl" aria-label="Help tickets">
        <div className="ig-ad-tabs" role="tablist" aria-label="Ticket status">
          {TABS.map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => { setTab(key); setTickets([]); }}>
              {label}{counts ? <span>{counts[key].toLocaleString('en-US')}</span> : null}
            </button>
          ))}
        </div>

        <div className="ig-ad-wl-tools is-row">
          <label className="ig-ad-search">
            <AdminIcon name="search" size={16} />
            <input type="search" placeholder="Search tickets" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search tickets by subject, organisation or number" />
          </label>
          <label className="ig-ad-select">
            <span className="ig-ad-sr">Assigned to</span>
            <select value={assigned} onChange={(e) => { setAssigned(e.target.value); setTickets([]); }}>
              <option value="anyone">Anyone</option>
              <option value="me">Assigned to me</option>
              <option value="nobody">Nobody yet</option>
              {(data?.team || []).filter((p) => p.id !== session.admin?.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <AdminIcon name="down" size={16} />
          </label>
        </div>

        {error ? (
          <div className="ig-ad-notice is-red" role="alert"><AdminIcon name="warn" size={16} /><span>{error} <button type="button" className="ig-ad-link ig-ad-link-orange" onClick={() => load(1)}>Try again</button></span></div>
        ) : null}

        {!compact ? (
          <div className="ig-ad-table" aria-busy={loading}>
            <div className="ig-ad-tr ig-ad-th ig-ad-help-grid" aria-hidden="true">
              <span>Ticket</span><span>Organisation</span><span>Topic</span><span>{tab === 'solved' ? 'Solved' : 'Waiting'}</span><span>Assigned</span><span>Status</span>
            </div>
            {tickets.map((t) => (
              <button key={t.number} type="button" className={`ig-ad-tr ig-ad-help-grid ig-ad-row-btn${t.urgent && t.status === 'waiting' ? ' is-urgent' : ''}${openNumber === t.number ? ' is-open' : ''}`} onClick={(e) => open(t.number, e)} aria-label={`Open ticket ${t.number}: ${t.subject}`}>
                <span className="ig-ad-person"><strong>{t.unread ? <span className="ig-ad-unread" aria-label="New" /> : null}{t.subject}</strong><span>#{t.number}</span></span>
                <span className="ig-ad-cell-text">{t.org}</span>
                <span className="ig-ad-cell-text">{t.topicShort}</span>
                <span className={t.urgent && t.status === 'waiting' ? 'is-red' : ''}>{sinceWords(tab === 'solved' ? t.solvedAt : t.lastMessageAt)}</span>
                <span className={t.assignedName ? 'ig-ad-cell-text' : 'is-red-soft'}>{t.assignedName ? t.assignedName.split(' ')[0] : 'Nobody yet'}</span>
                <span><StatusPill t={t} /></span>
              </button>
            ))}
          </div>
        ) : (
          <div className="ig-ad-wl-cards" aria-busy={loading}>
            {tickets.map((t) => (
              <button key={t.number} type="button" className="ig-ad-wl-card ig-ad-org-card ig-ad-help-card" onClick={(e) => open(t.number, e)}>
                <span className="ig-ad-help-card-top">
                  <StatusPill t={t} /><span className="ig-ad-muted">#{t.number}</span>
                  <span className={`ig-ad-help-age${t.urgent && t.status === 'waiting' ? ' is-red' : ''}`}>{sinceWords(t.lastMessageAt)}</span>
                </span>
                <strong className="ig-ad-help-subject">{t.unread ? <span className="ig-ad-unread" aria-label="New" /> : null}{t.subject}</strong>
                <span className="ig-ad-muted ig-ad-small">{t.org} · {t.assignedName ? t.assignedName.split(' ')[0] : 'Nobody yet'}</span>
              </button>
            ))}
          </div>
        )}

        {loading && !tickets.length ? <span className="ig-ad-skel" style={{ display: 'block', height: 180 }} /> : null}
        {!loading && !error && !tickets.length ? (
          <p className="ig-ad-empty">{search ? `No ticket matches “${search}”.` : tab === 'needs' ? 'All caught up. No ticket needs a reply.' : 'No tickets here.'}</p>
        ) : null}

        {tickets.length ? (
          <div className="ig-ad-wl-foot">
            <span>
              {total > tickets.length ? `Showing ${tickets.length} of ${total} ${TAB_WORDS[tab]}. ` : ''}
              {tab === 'needs' ? 'Urgent tickets come from events that are live right now, so they sit at the top. Then the longest waiting.' : ''}
            </span>
            {tickets.length < total ? <button type="button" className="ig-ad-btn-2" disabled={loading} onClick={() => load(page + 1)}>{loading ? 'Loading…' : 'Show more'}</button> : null}
          </div>
        ) : null}
      </section>

      <div className="ig-ad-row ig-ad-help-row">
        <section className="ig-ad-panel gap-14" aria-label="What people ask about">
          <div className="ig-ad-panel-head"><span><h2>What people ask about</h2><small>Tickets by topic, last 30 days</small></span></div>
          <div className="ig-ad-cities">
            {(data?.topics || []).map((t) => (
              <span key={t.key} className="ig-ad-city ig-ad-topic-row">
                <span>{compact ? t.short : t.label}</span>
                <span className="ig-ad-track"><span style={{ width: `${Math.round((t.count / topicMax) * 100)}%`, background: 'var(--ad-orange)' }} /></span>
                <strong>{fmt(t.count)}</strong>
              </span>
            ))}
            {!data ? <span className="ig-ad-skel" style={{ height: 140 }} /> : null}
          </div>
        </section>
        <section className="ig-ad-panel gap-10" aria-label="Who asks the most">
          <div className="ig-ad-panel-head"><span><h2>Who asks the most</h2><small>Organisations by tickets, last 30 days</small></span></div>
          <div className="ig-ad-list">
            {(data?.topOrgs || []).map((o, i) => (
              <div key={o.id} className="ig-ad-org">
                <span className="ig-ad-av" style={{ background: AVATARS[i % AVATARS.length][0], color: AVATARS[i % AVATARS.length][1] }}>{initials(o.name)}</span>
                <span className="ig-ad-org-name"><strong>{o.name}</strong><span>{o.type} · {fmt(o.events)} event{o.events === 1 ? '' : 's'}</span></span>
                <strong>{fmt(o.tickets)}</strong>
              </div>
            ))}
            {data && !data.topOrgs.length ? <p className="ig-ad-empty">No tickets in the last 30 days.</p> : null}
          </div>
        </section>
      </div>

      {openNumber != null ? (
        <TicketPanel number={openNumber} canAct={canAct} team={data?.team || []} onClose={close} onChanged={changed} toast={toast} />
      ) : null}
      {toastMsg ? (
        <div className={`ig-ad-toast${toastMsg.tone === 'warn' ? ' is-warn' : ''}`} role="status">
          <span className="ig-ad-toast-ic"><AdminIcon name={toastMsg.tone === 'warn' ? 'warn' : 'check'} size={14} strokeWidth={2.4} /></span>
          {toastMsg.text}
        </div>
      ) : null}
    </>
  );
}
