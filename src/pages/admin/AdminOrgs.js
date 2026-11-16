// Admin Organisations: everyone with an Ingather account. Totals only, never guest details.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { adminData, adminErrorMessage } from '../../api/adminApi';
import { useAdminSession } from './AdminSession';
import { AdminIcon } from './AdminIcons';

const TABS = [['all', 'All'], ['active', 'Active'], ['quiet', 'Quiet'], ['none', 'No event yet']];
const STATE = { active: ['Active', 'is-green'], quiet: ['Quiet', 'is-grey'], none: ['No event yet', 'is-orange'] };
const TAB_WORDS = { all: 'organisations', active: 'active organisations', quiet: 'quiet organisations', none: 'organisations with no event yet' };
const AVATARS = [['#111111', '#FFFFFF'], ['#FFF1E7', '#C84B07'], ['#EAF2FF', '#2563C9'], ['#E6F6F4', '#1D8A7E'], ['#FDECF1', '#C2416B'], ['#FFF6DB', '#B7791F']];
const DAY = 86400000;

const fmt = (n) => (n == null ? '–' : Number(n).toLocaleString('en-US'));

// Event dates are calendar days ("2026-11-10"); read them as local days, not UTC midnight.
const asDay = (value) => {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
};

const dayWords = (value) => {
  const d = asDay(value);
  if (!d) return 'None yet';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - d) / DAY);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}) });
};

const monthYear = (iso) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '');
const longDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

const signInWords = (iso) => {
  if (!iso) return 'Not recorded';
  const d = new Date(iso);
  const today = new Date();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) return `Today, ${time}`;
  const y = new Date(today.getTime() - DAY);
  if (d.toDateString() === y.toDateString()) return `Yesterday, ${time}`;
  return `${longDate(iso)}, ${time}`;
};

const initials = (name) => {
  const words = String(name || '').replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
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

function Avatar({ org, size }) {
  const [bg, fg] = avatarFor(org.id);
  return <span className="ig-ad-av" style={{ background: bg, color: fg, ...(size ? { width: size, height: size, borderRadius: size > 40 ? 12 : 10 } : {}) }}>{initials(org.name)}</span>;
}

function StatePill({ state }) {
  const [label, tone] = STATE[state] || STATE.none;
  return <span className={`ig-ad-pill ${tone}`}>{label}</span>;
}

function OrgPanel({ id, onClose }) {
  const [org, setOrg] = useState(null);
  const [error, setError] = useState('');
  const closeRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setOrg(null);
    setError('');
    adminData.org(id)
      .then(({ data }) => { if (alive) setOrg(data.org); })
      .catch((err) => { if (alive) setError(adminErrorMessage(err, 'Could not load this organisation.')); });
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [onClose]);

  const came = org?.cameFrom?.kind === 'waitlist'
    ? `Waitlist invite${org.cameFrom.at ? `, ${longDate(org.cameFrom.at)}` : ''}`
    : 'Signed up directly';

  return (
    <div className="ig-ad-panel-wrap" role="presentation" onClick={onClose}>
      <aside className="ig-ad-sheet" role="dialog" aria-modal="true" aria-label={org ? org.name : 'Organisation'} onClick={(e) => e.stopPropagation()}>
        <header className="ig-ad-sheet-head">
          {org ? <Avatar org={org} size={48} /> : <span className="ig-ad-skel" style={{ width: 48, height: 48, borderRadius: 12 }} />}
          <span className="ig-ad-sheet-title">
            <strong>{org ? org.name : 'Loading…'}</strong>
            {org ? <span>{[org.type, org.city, `joined ${monthYear(org.joinedAt)}`].filter(Boolean).join(' · ')}</span> : null}
          </span>
          <button type="button" className="ig-ad-x" aria-label="Close" onClick={onClose} ref={closeRef}><AdminIcon name="close" size={16} /></button>
        </header>

        <div className="ig-ad-sheet-body">
          {error ? <div className="ig-ad-notice is-red" role="alert"><AdminIcon name="warn" size={16} /><span>{error}</span></div> : null}
          {!org && !error ? <span className="ig-ad-skel" style={{ display: 'block', height: 320 }} /> : null}
          {org ? (
            <>
              <div className="ig-ad-stat-grid">
                <div><span>Events run</span><strong>{fmt(org.events)}</strong></div>
                <div><span>People checked in</span><strong>{fmt(org.checkedIn)}</strong></div>
                <div><span>Pre-registrations</span><strong>{fmt(org.rsvps)}</strong></div>
                <div><span>First-timers</span><strong>{fmt(org.firstTimers)}</strong></div>
              </div>

              <section className="ig-ad-dl">
                <h3>Details</h3>
                <div><span>Account email</span><strong>{org.email}</strong></div>
                <div><span>Email verified</span><strong>{org.verified == null ? '–' : org.verified ? 'Yes' : 'Not yet'}</strong></div>
                <div><span>Came from</span><strong>{came}</strong></div>
                <div><span>Last signed in</span><strong>{signInWords(org.lastSignInAt)}</strong></div>
                <div><span>Features used</span><strong>{org.features == null ? '–' : org.features.length ? org.features.join(', ') : 'None yet'}</strong></div>
              </section>

              <section className="ig-ad-dl">
                <h3>Latest events</h3>
                {org.latestEvents.length ? org.latestEvents.slice(0, 4).map((e) => (
                  <div key={e.id} className="ig-ad-ev-row">
                    <span className="ig-ad-ev-name"><strong>{e.title}</strong><span className={e.live ? 'is-live' : ''}>{e.live ? 'Live now' : dayWords(e.date)}</span></span>
                    <strong>{fmt(e.checkedIn)} in</strong>
                  </div>
                )) : <p className="ig-ad-empty" style={{ padding: '6px 0' }}>No events yet.</p>}
              </section>

              <p className="ig-ad-hint">Admin sees totals only. Guest names, phone numbers and answers stay with the organiser.</p>
            </>
          ) : null}
        </div>

        <footer className="ig-ad-sheet-foot">
          {org ? (
            <a className="ig-ad-btn-2" href={`mailto:${org.email}?subject=${encodeURIComponent('A note from the Ingather team')}`}>
              <AdminIcon name="mail" size={16} />Email organiser
            </a>
          ) : null}
        </footer>
      </aside>
    </div>
  );
}

export default function AdminOrgs() {
  const compact = useCompact();
  const { session } = useAdminSession();
  const canExport = session.admin?.role === 'owner' || session.admin?.role === 'admin';
  const [tab, setTab] = useState('all');
  const [type, setType] = useState('');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const request = useRef(0);
  const lastFocus = useRef(null);

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(query.trim()), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  const load = useCallback(async (nextPage = 1) => {
    const id = ++request.current;
    setLoading(true);
    setError('');
    try {
      const { data: res } = await adminData.orgs({ tab, type: type || undefined, q: search || undefined, page: nextPage });
      if (id !== request.current) return;
      setData(res);
      setPage(nextPage);
      setOrgs((prev) => (nextPage === 1 ? res.orgs : [...prev, ...res.orgs]));
    } catch (err) {
      if (id === request.current && err?.response?.status !== 401) setError(adminErrorMessage(err, 'Could not load organisations. Please try again.'));
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [tab, type, search]);

  useEffect(() => { load(1); }, [load]);

  const open = (id, event) => { lastFocus.current = event?.currentTarget || null; setOpenId(id); };
  const close = useCallback(() => {
    setOpenId(null);
    window.setTimeout(() => lastFocus.current?.focus?.(), 0);
  }, []);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const response = await adminData.orgsExport({ tab, type: type || undefined, q: search || undefined });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      const match = /filename="([^"]+)"/.exec(response.headers['content-disposition'] || '');
      link.href = url;
      link.download = match ? match[1] : 'ingather-organisations.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Could not export. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const counts = data?.counts;
  const total = data?.total ?? 0;
  const quietDays = data?.quietDays || 60;

  return (
    <>
      <div className="ig-ad-pagehead">
        <div className="ig-ad-pagehead-text">
          <h1>Organisations</h1>
          <p>Everyone with an Ingather account.</p>
        </div>
      </div>

      <section className="ig-ad-panel ig-ad-wl" aria-label="Organisations">
        <div className="ig-ad-tabs" role="tablist" aria-label="Organisation status">
          {TABS.map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => { setTab(key); setOrgs([]); }}>
              {label}{counts ? <span>{counts[key].toLocaleString('en-US')}</span> : null}
            </button>
          ))}
        </div>

        <div className="ig-ad-wl-tools">
          <label className="ig-ad-search">
            <AdminIcon name="search" size={16} />
            <input type="search" placeholder="Search organisation, email or city" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search organisations" />
          </label>
          <div className="ig-ad-tool-pair">
            <label className="ig-ad-select">
              <span className="ig-ad-sr">Organisation type</span>
              <select value={type} onChange={(e) => { setType(e.target.value); setOrgs([]); }}>
                <option value="">All types</option>
                {(data?.types || []).map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
              <AdminIcon name="down" size={16} />
            </label>
            {canExport ? (
              <button type="button" className="ig-ad-btn-2" onClick={exportCsv} disabled={exporting}>
                <AdminIcon name="download" size={16} />{exporting ? 'Exporting…' : 'Export CSV'}
              </button>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="ig-ad-notice is-red" role="alert"><AdminIcon name="warn" size={16} /><span>{error} <button type="button" className="ig-ad-link ig-ad-link-orange" onClick={() => load(1)}>Try again</button></span></div>
        ) : null}

        {!compact ? (
          <div className="ig-ad-table" aria-busy={loading}>
            <div className="ig-ad-tr ig-ad-th ig-ad-org-grid" aria-hidden="true">
              <span>Organisation</span><span>Type</span><span>City</span>
              <span>Events</span><span>Checked in</span><span>Last event</span>
              <span>Joined</span><span>Status</span>
            </div>
            {orgs.map((org) => (
              <button key={org.id} type="button" className={`ig-ad-tr ig-ad-org-grid ig-ad-row-btn${openId === org.id ? ' is-open' : ''}`} onClick={(e) => open(org.id, e)} aria-label={`Open ${org.name}`}>
                <span className="ig-ad-org-cell"><Avatar org={org} /><span className="ig-ad-person"><strong>{org.name}</strong><span>{org.email}</span></span></span>
                <span>{org.type}</span>
                <span className="ig-ad-cell-text">{org.city}</span>
                <span className="ig-ad-strong">{fmt(org.events)}</span>
                <span className="ig-ad-strong">{fmt(org.checkedIn)}</span>
                <span className={org.lastEvent ? 'ig-ad-muted' : 'is-faint'}>{dayWords(org.lastEvent)}</span>
                <span className="ig-ad-muted">{monthYear(org.joinedAt)}</span>
                <span><StatePill state={org.state} /></span>
              </button>
            ))}
          </div>
        ) : (
          <div className="ig-ad-wl-cards" aria-busy={loading}>
            {orgs.map((org) => (
              <button key={org.id} type="button" className="ig-ad-wl-card ig-ad-org-card" onClick={(e) => open(org.id, e)}>
                <span className="ig-ad-wl-card-top">
                  <span className="ig-ad-org-cell"><Avatar org={org} /><span className="ig-ad-person"><strong>{org.name}</strong><span>{[org.type, org.city].filter(Boolean).join(' · ')}</span></span></span>
                  <StatePill state={org.state} />
                </span>
                <span className="ig-ad-org-nums">
                  <span><strong>{fmt(org.events)}</strong>Events</span>
                  <span><strong>{fmt(org.checkedIn)}</strong>Checked in</span>
                  <span><strong>{dayWords(org.lastEvent)}</strong>Last event</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {loading && !orgs.length ? <span className="ig-ad-skel" style={{ display: 'block', height: 180 }} /> : null}
        {!loading && !error && !orgs.length ? <p className="ig-ad-empty">{search ? `No organisation matches “${search}”.` : 'No organisations here yet.'}</p> : null}

        {orgs.length ? (
          <div className="ig-ad-wl-foot">
            <span>Showing {orgs.length.toLocaleString('en-US')} of {total.toLocaleString('en-US')} {TAB_WORDS[tab]}. Quiet means no event in the last {quietDays} days.</span>
            {orgs.length < total ? <button type="button" className="ig-ad-btn-2" disabled={loading} onClick={() => load(page + 1)}>{loading ? 'Loading…' : 'Show more'}</button> : null}
          </div>
        ) : null}
      </section>

      {openId != null ? <OrgPanel id={openId} onClose={close} /> : null}
    </>
  );
}
