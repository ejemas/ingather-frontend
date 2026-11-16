// Admin Waitlist: people waiting to use Ingather. Invite sends them a sign-up link.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { adminData, adminErrorMessage } from '../../api/adminApi';
import { useAdminSession } from './AdminSession';
import { AdminIcon } from './AdminIcons';

const TABS = [['waiting', 'Waiting'], ['invited', 'Invited'], ['signedup', 'Signed up'], ['rejected', 'Rejected'], ['all', 'All']];
const STATUS = {
  pending: ['Waiting', 'is-orange'],
  invited: ['Invited', 'is-blue'],
  accepted: ['Signed up', 'is-green'],
  rejected: ['Rejected', 'is-grey']
};
const FOOT = {
  waiting: 'Sorted by next event date, so the most urgent come first.',
  invited: 'Newest invites first.',
  signedup: 'Newest sign-ups first.',
  rejected: 'Most recently rejected first.',
  all: 'Newest first.'
};
const TAB_WORDS = { waiting: 'waiting', invited: 'invited', signedup: 'signed up', rejected: 'rejected', all: 'in total' };

const DAY = 86400000;
const fullName = (lead) => `${lead.firstName || ''} ${lead.lastName || ''}`.trim();

const joinedWords = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))} min ago`;
  if (diff < DAY) return `${Math.floor(diff / 3600000)} hr ago`;
  if (diff < 2 * DAY) return 'Yesterday';
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)} days ago`;
  if (diff < 14 * DAY) return '1 week ago';
  if (diff < 60 * DAY) return `${Math.floor(diff / (7 * DAY))} weeks ago`;
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

// "in 9 days" (red when within 2 weeks), "in 3 weeks", "Passed", "Not set"
const nextEvent = (iso) => {
  if (!iso) return { text: 'Not set', tone: 'is-faint' };
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return { text: 'Passed', tone: 'is-faint' };
  const days = Math.ceil(diff / DAY);
  if (days <= 1) return { text: days === 0 ? 'Today' : 'Tomorrow', tone: 'is-red' };
  if (days < 14) return { text: `in ${days} days`, tone: 'is-red' };
  if (days < 60) return { text: `in ${Math.round(days / 7)} weeks`, tone: '' };
  return { text: new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }), tone: '' };
};

const expiresWords = (iso) => {
  if (!iso) return '';
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / DAY);
  if (days <= 0) return 'Link expired';
  return `Link expires in ${days} day${days === 1 ? '' : 's'}`;
};

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

function Dialog({ title, children, onClose, actions }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    ref.current?.querySelector('[data-autofocus]')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="ig-ad-modal-wrap" role="presentation" onClick={onClose}>
      <div className="ig-ad-modal" role="dialog" aria-modal="true" aria-labelledby="ig-ad-modal-title" ref={ref} onClick={(e) => e.stopPropagation()}>
        <h2 id="ig-ad-modal-title">{title}</h2>
        {children}
        <div className="ig-ad-modal-actions">{actions}</div>
      </div>
    </div>
  );
}

function Actions({ lead, canAct, busy, onAsk }) {
  if (!canAct) return null;
  const b = busy === lead.id;
  if (lead.status === 'pending') {
    return (
      <>
        <button type="button" className="ig-ad-sbtn" disabled={b} onClick={() => onAsk('reject', lead)}>Reject</button>
        <button type="button" className="ig-ad-sbtn is-ink" disabled={b} onClick={() => onAsk('invite', lead)}>Invite</button>
      </>
    );
  }
  if (lead.status === 'invited') {
    return (
      <>
        <button type="button" className="ig-ad-sbtn" disabled={b} onClick={() => onAsk('revoke', lead)}>Cancel invite</button>
        <button type="button" className="ig-ad-sbtn is-ink" disabled={b} onClick={() => onAsk('invite', lead)}>Resend</button>
      </>
    );
  }
  if (lead.status === 'rejected') {
    return <button type="button" className="ig-ad-sbtn is-ink" disabled={b} onClick={() => onAsk('invite', lead)}>Invite</button>;
  }
  return null;
}

function Status({ lead }) {
  const [label, tone] = STATUS[lead.status] || [lead.status, 'is-grey'];
  return <span className={`ig-ad-pill ${tone}`}>{label}</span>;
}

function SubLine({ lead }) {
  if (lead.status === 'invited') {
    const expired = lead.inviteExpiresAt && new Date(lead.inviteExpiresAt).getTime() <= Date.now();
    return <span className={`ig-ad-sub${expired ? ' is-expired' : ''}`}>{expired ? 'Link expired, resend' : expiresWords(lead.inviteExpiresAt)}</span>;
  }
  if (lead.status === 'accepted' && lead.signedUpAs) return <span className="ig-ad-sub">As {lead.signedUpAs}</span>;
  return null;
}

export default function AdminWaitlist() {
  const compact = useCompact();
  const { session } = useAdminSession();
  const { reloadCounts } = useOutletContext() || {};
  const canAct = session.admin?.role === 'owner' || session.admin?.role === 'admin';
  // Admins (helpers) only see people still waiting; exporting is for the owner.
  const onlyWaiting = session.admin?.role === 'admin';
  const canExport = session.admin?.role === 'owner';
  const [tab, setTab] = useState('waiting');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [leads, setLeads] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ask, setAsk] = useState(null); // { kind, lead }
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState(null);
  const [exporting, setExporting] = useState(false);
  const toastTimer = useRef(null);
  const request = useRef(0);

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(query.trim()), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  const showToast = useCallback((text, tone = 'ok') => {
    setToast({ text, tone });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4000);
  }, []);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const load = useCallback(async (nextPage = 1) => {
    const id = ++request.current;
    setLoading(true);
    setError('');
    try {
      const { data: res } = await adminData.waitlist({ tab, q: search, page: nextPage });
      if (id !== request.current) return;
      setData(res);
      setPage(nextPage);
      setLeads((prev) => (nextPage === 1 ? res.leads : [...prev, ...res.leads]));
    } catch (err) {
      if (id === request.current && err?.response?.status !== 401) setError(adminErrorMessage(err, 'Could not load the waitlist. Please try again.'));
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => { load(1); }, [load]);

  const replaceLead = (lead) => {
    // A lead that no longer fits this tab leaves the list.
    const fits = tab === 'all'
      || (tab === 'waiting' && lead.status === 'pending')
      || (tab === 'invited' && lead.status === 'invited')
      || (tab === 'signedup' && lead.status === 'accepted')
      || (tab === 'rejected' && lead.status === 'rejected');
    setLeads((prev) => (fits ? prev.map((l) => (l.id === lead.id ? { ...l, ...lead } : l)) : prev.filter((l) => l.id !== lead.id)));
    if (!fits) setData((d) => (d ? { ...d, total: Math.max(0, d.total - 1) } : d));
  };

  const refreshCounts = async () => {
    try {
      const { data: res } = await adminData.waitlist({ tab, q: search, page: 1 });
      setData((d) => (d ? { ...d, counts: res.counts, total: res.total } : res));
    } catch (e) { /* counts refresh is best effort */ }
    if (reloadCounts) reloadCounts();
  };

  const run = async (kind, lead, opts = {}) => {
    setBusy(lead.id);
    try {
      if (kind === 'invite' && opts.test) {
        const { data: res } = await adminData.waitlistInvite(lead.id, true);
        showToast(`Test invite sent to ${res.sentTo}. ${lead.firstName} got nothing.`);
        return;
      }
      setAsk(null);
      if (kind === 'invite') {
        const { data: res } = await adminData.waitlistInvite(lead.id, false);
        replaceLead(res.lead);
        if (res.emailSent) showToast(res.resend ? `New invite sent to ${fullName(lead)}` : `Invite sent to ${fullName(lead)}`);
        else showToast(`${fullName(lead)} is invited, but the email did not send. Check the email settings, then resend.`, 'warn');
      } else if (kind === 'reject') {
        const { data: res } = await adminData.waitlistReject(lead.id);
        replaceLead(res.lead);
        showToast(`${fullName(lead)} moved to Rejected`);
      } else if (kind === 'revoke') {
        const { data: res } = await adminData.waitlistRevoke(lead.id);
        replaceLead(res.lead);
        showToast(`Invite cancelled. ${fullName(lead)} is back to Waiting.`);
      }
      refreshCounts();
    } catch (err) {
      showToast(adminErrorMessage(err, 'That did not work. Please try again.'), 'warn');
      if (err?.response?.status === 409) load(1);
    } finally {
      setBusy(null);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const response = await adminData.waitlistExport({ tab, q: search });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      const match = /filename="([^"]+)"/.exec(response.headers['content-disposition'] || '');
      link.href = url;
      link.download = match ? match[1] : 'ingather-waitlist.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast('Could not export. Please try again.', 'warn');
    } finally {
      setExporting(false);
    }
  };

  const counts = data?.counts;
  const inviteDays = data?.inviteDays || 14;
  const total = data?.total ?? 0;

  const dialog = ask && (() => {
    const { kind, lead } = ask;
    const name = fullName(lead);
    const close = () => setAsk(null);
    if (kind === 'reject') {
      return (
        <Dialog title={`Reject ${name}?`} onClose={close} actions={(
          <>
            <button type="button" className="ig-ad-btn-2" onClick={close} data-autofocus>Cancel</button>
            <button type="button" className="ig-ad-btn is-red" onClick={() => run('reject', lead)}>Reject</button>
          </>
        )}>
          <p>They stay on the list as Rejected and get no email. You can still invite them later.</p>
        </Dialog>
      );
    }
    if (kind === 'revoke') {
      return (
        <Dialog title={`Cancel ${name}'s invite?`} onClose={close} actions={(
          <>
            <button type="button" className="ig-ad-btn-2" onClick={close} data-autofocus>Keep it</button>
            <button type="button" className="ig-ad-btn is-red" onClick={() => run('revoke', lead)}>Cancel invite</button>
          </>
        )}>
          <p>The link we emailed stops working and they go back to Waiting. They are not told.</p>
        </Dialog>
      );
    }
    const resend = lead.status === 'invited';
    return (
      <Dialog title={resend ? `Send ${name} a new invite?` : `Invite ${name}?`} onClose={close} actions={(
        <>
          <button type="button" className="ig-ad-link ig-ad-link-orange ig-ad-modal-test" disabled={busy === lead.id} onClick={() => run('invite', lead, { test: true })}>
            {busy === lead.id ? 'Sending test…' : 'Send me a test first'}
          </button>
          <button type="button" className="ig-ad-btn-2" onClick={close}>Cancel</button>
          <button type="button" className="ig-ad-btn is-ink" onClick={() => run('invite', lead)} data-autofocus>{resend ? 'Send new invite' : 'Send invite'}</button>
        </>
      )}>
        <p>
          We email <strong>{lead.email}</strong> a sign-up link that lasts {inviteDays} days.
          {resend ? ' Their old link stops working.' : ''}
        </p>
        <p className="ig-ad-modal-note">Not sure how it looks? “Send me a test first” sends the same email to {session.admin?.email} only. {lead.firstName} gets nothing.</p>
      </Dialog>
    );
  })();

  return (
    <>
      <div className="ig-ad-pagehead">
        <div className="ig-ad-pagehead-text">
          <h1>Waitlist</h1>
          <p>People waiting to use Ingather. Invite sends them a sign-up link that lasts {inviteDays} days.</p>
        </div>
      </div>

      <section className="ig-ad-panel ig-ad-wl" aria-label="Waitlist">
        <div className="ig-ad-tabs" role="tablist" aria-label="Waitlist status">
          {(onlyWaiting ? TABS.filter(([key]) => key === 'waiting') : TABS).map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => { setTab(key); setLeads([]); setData((d) => (d ? { ...d, total: 0 } : d)); }}>
              {label}{counts && counts[key] != null ? <span>{counts[key].toLocaleString('en-US')}</span> : null}
            </button>
          ))}
        </div>

        <div className="ig-ad-wl-tools">
          <label className="ig-ad-search">
            <AdminIcon name="search" size={16} />
            <input type="search" placeholder="Search name, email or organisation" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search the waitlist" />
          </label>
          {canExport ? (
            <button type="button" className="ig-ad-btn-2" onClick={exportCsv} disabled={exporting}>
              <AdminIcon name="download" size={16} />{exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="ig-ad-notice is-red" role="alert"><AdminIcon name="warn" size={16} /><span>{error} <button type="button" className="ig-ad-link ig-ad-link-orange" onClick={() => load(1)}>Try again</button></span></div>
        ) : null}

        {!compact ? (
          <div className="ig-ad-table" role="table" aria-label="People on the waitlist" aria-busy={loading}>
            <div className="ig-ad-tr ig-ad-th" role="row">
              <span role="columnheader">Person</span><span role="columnheader">Organisation</span><span role="columnheader">Event size</span>
              <span role="columnheader">Next event</span><span role="columnheader">Joined</span><span role="columnheader">Status</span><span role="columnheader" aria-label="Actions" />
            </div>
            {leads.map((lead) => {
              const next = nextEvent(lead.nextEventAt);
              return (
                <div key={lead.id} className="ig-ad-tr" role="row">
                  <span role="cell" className="ig-ad-person"><strong>{fullName(lead)}</strong><span>{lead.email}</span></span>
                  <span role="cell" className="ig-ad-cell-text">{lead.organisation || <span className="is-faint">Not given</span>}</span>
                  <span role="cell">{lead.eventSize}</span>
                  <span role="cell" className={next.tone}>{next.text}</span>
                  <span role="cell" className="ig-ad-muted">{joinedWords(lead.joinedAt)}</span>
                  <span role="cell" className="ig-ad-status-cell"><Status lead={lead} /><SubLine lead={lead} /></span>
                  <span role="cell" className="ig-ad-row-actions"><Actions lead={lead} canAct={canAct} busy={busy} onAsk={(kind, l) => setAsk({ kind, lead: l })} /></span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="ig-ad-wl-cards" aria-busy={loading}>
            {leads.map((lead) => {
              const next = nextEvent(lead.nextEventAt);
              return (
                <article key={lead.id} className="ig-ad-wl-card">
                  <div className="ig-ad-wl-card-top">
                    <span className="ig-ad-person"><strong>{fullName(lead)}</strong><span>{lead.organisation || lead.email}</span></span>
                    <Status lead={lead} />
                  </div>
                  <div className="ig-ad-wl-meta">
                    <span>{lead.eventSize} guests</span>
                    <span className={next.tone}>Next event {next.text}</span>
                  </div>
                  <span className="ig-ad-muted ig-ad-small">Joined {joinedWords(lead.joinedAt)}</span>
                  <SubLine lead={lead} />
                  {canAct && ['pending', 'invited', 'rejected'].includes(lead.status) ? (
                    <div className="ig-ad-wl-card-actions"><Actions lead={lead} canAct={canAct} busy={busy} onAsk={(kind, l) => setAsk({ kind, lead: l })} /></div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}

        {loading && !leads.length ? <div className="ig-ad-wl-loading"><span className="ig-ad-skel" style={{ display: 'block', height: 180 }} /></div> : null}
        {!loading && !error && !leads.length ? (
          <p className="ig-ad-empty">{search ? `No one matches “${search}”.` : tab === 'waiting' ? 'No one is waiting right now.' : 'No one here yet.'}</p>
        ) : null}

        {leads.length ? (
          <div className="ig-ad-wl-foot">
            <span>Showing {leads.length.toLocaleString('en-US')} of {total.toLocaleString('en-US')} {TAB_WORDS[tab]}. {FOOT[tab]}</span>
            {leads.length < total ? <button type="button" className="ig-ad-btn-2" disabled={loading} onClick={() => load(page + 1)}>{loading ? 'Loading…' : 'Show more'}</button> : null}
          </div>
        ) : null}
        {onlyWaiting ? <p className="ig-ad-small ig-ad-muted">Your role shows people still waiting. Once you invite or reject someone, the owner takes it from there.</p> : null}
        {!canAct ? <p className="ig-ad-small ig-ad-muted">You can look at the waitlist. Ask the owner if you need to invite people.</p> : null}
      </section>

      {dialog}
      {toast ? (
        <div className={`ig-ad-toast${toast.tone === 'warn' ? ' is-warn' : ''}`} role="status">
          <span className="ig-ad-toast-ic"><AdminIcon name={toast.tone === 'warn' ? 'warn' : 'check'} size={14} strokeWidth={2.4} /></span>
          {toast.text}
        </div>
      ) : null}
    </>
  );
}
