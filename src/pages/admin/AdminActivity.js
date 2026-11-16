// Admin Activity log: everything people did in this admin dashboard. Owner only, read only.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { adminData, adminErrorMessage } from '../../api/adminApi';
import { AdminIcon } from './AdminIcons';

const TABS = [['all', 'Everything'], ['signin', 'Sign-ins'], ['change', 'Changes'], ['failed', 'Failed tries']];
const RANGES = [['today', 'Today'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['90d', 'Last 90 days'], ['all', 'Everything kept']];
const TAGS = {
  signin: ['Sign-in', 'is-grey'],
  sent: ['Sent', 'is-blue'],
  failed: ['Failed', 'is-red'],
  change: ['Change', 'is-orange'],
  export: ['Export', 'is-grey']
};
const TAB_WORDS = { all: 'entries', signin: 'sign-ins', change: 'changes', failed: 'failed tries' };
const TINTS = [['#EAF2FF', '#2563C9'], ['#FFF1E7', '#C84B07'], ['#E6F6F4', '#1D8A7E'], ['#FDECF1', '#C2416B'], ['#FFF6DB', '#B7791F'], ['#F0F0EE', '#4A4642']];
const DAY = 86400000;

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

const timeOf = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

// Today: "10:42 PM". Earlier: "Yesterday · 9:12 PM", "3 days ago · 4:10 PM", "11 Nov · 4:10 PM".
const whenWords = (iso) => {
  const d = new Date(iso);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const that = new Date(d);
  that.setHours(0, 0, 0, 0);
  const days = Math.round((start - that) / DAY);
  if (days <= 0) return timeOf(d);
  if (days === 1) return `Yesterday · ${timeOf(d)}`;
  if (days < 7) return `${days} days ago · ${timeOf(d)}`;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) })} · ${timeOf(d)}`;
};

const fullTime = (iso) => new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

const initialsOf = (name) => String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

function Who({ entry, small = false }) {
  let style;
  let text;
  if (!entry.whoId) {
    style = { background: '#FDEDEC', color: 'var(--ad-red)' };
    text = '?';
  } else if (entry.whoRole === 'owner') {
    style = { background: 'var(--ad-orange)', color: '#FFFFFF' };
    text = initialsOf(entry.who);
  } else {
    const [bg, fg] = TINTS[Math.abs(Number(entry.whoId) || 0) % TINTS.length];
    style = { background: bg, color: fg };
    text = initialsOf(entry.who);
  }
  if (small) return <strong>{entry.who}</strong>;
  return (
    <span className="ig-ad-act-who">
      <span className="ig-ad-act-av" style={style} aria-hidden="true">{text}</span>
      <span className="ig-ad-person"><strong>{entry.who}</strong></span>
    </span>
  );
}

function Tag({ tag }) {
  const [label, tone] = TAGS[tag] || TAGS.change;
  return <span className={`ig-ad-pill ${tone}`}>{label}</span>;
}

const whereWords = (entry) => [entry.device, entry.ip].filter(Boolean).join(' · ') || 'Not recorded';

export default function AdminActivity() {
  const compact = useCompact();
  const [tab, setTab] = useState('all');
  const [range, setRange] = useState('7d');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const request = useRef(0);

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(query.trim()), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  const load = useCallback(async (nextPage = 1) => {
    const id = ++request.current;
    setLoading(true);
    setError('');
    try {
      const { data: res } = await adminData.activity({ tab, range, q: search || undefined, page: nextPage });
      if (id !== request.current) return;
      setData(res);
      setPage(nextPage);
      setEntries((prev) => (nextPage === 1 ? res.entries : [...prev, ...res.entries]));
    } catch (err) {
      if (id === request.current && err?.response?.status !== 401) setError(adminErrorMessage(err, 'Could not load the activity log. Please try again.'));
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [tab, range, search]);

  useEffect(() => { load(1); }, [load]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const response = await adminData.activityExport({ tab, range, q: search || undefined });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      const match = /filename="([^"]+)"/.exec(response.headers['content-disposition'] || '');
      link.href = url;
      link.download = match ? match[1] : 'ingather-admin-activity.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      // The export itself is logged, so show it straight away.
      load(1);
    } catch (err) {
      setError('Could not export. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const counts = data?.counts;
  const total = data?.total ?? 0;
  const rangeWord = (RANGES.find(([k]) => k === range) || [])[1] || '';

  return (
    <>
      <div className="ig-ad-pagehead">
        <div className="ig-ad-pagehead-text">
          <h1>Activity log</h1>
          <p>Everything people did in this admin dashboard. Only you can see it.</p>
        </div>
      </div>

      <section className="ig-ad-panel ig-ad-wl" aria-label="Activity log">
        <div className="ig-ad-tabs" role="tablist" aria-label="Kind of activity">
          {TABS.map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => { setTab(key); setEntries([]); }}>
              {label}{counts ? <span>{counts[key].toLocaleString('en-US')}</span> : null}
            </button>
          ))}
        </div>

        <div className="ig-ad-wl-tools">
          <label className="ig-ad-search">
            <AdminIcon name="search" size={16} />
            <input type="search" placeholder="Search person or action" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search the activity log" />
          </label>
          <div className="ig-ad-tool-pair">
            <label className="ig-ad-select">
              <span className="ig-ad-sr">Time range</span>
              <select value={range} onChange={(e) => { setRange(e.target.value); setEntries([]); }}>
                {RANGES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
              <AdminIcon name="down" size={16} />
            </label>
            <button type="button" className="ig-ad-btn-2" onClick={exportCsv} disabled={exporting}>
              <AdminIcon name="download" size={16} />{exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>
        </div>

        {error ? (
          <div className="ig-ad-notice is-red" role="alert"><AdminIcon name="warn" size={16} /><span>{error} <button type="button" className="ig-ad-link ig-ad-link-orange" onClick={() => load(1)}>Try again</button></span></div>
        ) : null}

        {!compact ? (
          <div className="ig-ad-table" role="table" aria-label="Activity" aria-busy={loading}>
            <div className="ig-ad-tr ig-ad-th ig-ad-act-grid" role="row">
              <span role="columnheader">When</span><span role="columnheader">Who</span>
              <span role="columnheader">What happened</span><span role="columnheader">Where from</span>
            </div>
            {entries.map((e) => (
              <div key={e.id} role="row" className={`ig-ad-tr ig-ad-act-grid${e.tag === 'failed' ? ' is-failed' : ''}`}>
                <span role="cell" className="ig-ad-muted" title={fullTime(e.at)}>{whenWords(e.at)}</span>
                <span role="cell"><Who entry={e} /></span>
                <span role="cell" className="ig-ad-act-what"><Tag tag={e.tag} /><span>{e.what}</span></span>
                <span role="cell" className="ig-ad-muted ig-ad-act-where">
                  <span>{e.device || 'Not recorded'}</span>
                  {e.ip ? <span className="ig-ad-small">{e.ip}</span> : null}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="ig-ad-wl-cards" aria-busy={loading}>
            {entries.map((e) => (
              <div key={e.id} className={`ig-ad-wl-card ig-ad-act-card${e.tag === 'failed' ? ' is-failed' : ''}`}>
                <span className="ig-ad-act-card-top">
                  <Tag tag={e.tag} />
                  <span className="ig-ad-muted ig-ad-small" title={fullTime(e.at)}>{whenWords(e.at)}</span>
                </span>
                <p className="ig-ad-act-card-what"><Who entry={e} small /> <span>{e.what}</span></p>
                <span className="ig-ad-muted ig-ad-small">{whereWords(e)}</span>
              </div>
            ))}
          </div>
        )}

        {loading && !entries.length ? <span className="ig-ad-skel" style={{ display: 'block', height: 180 }} /> : null}
        {!loading && !error && !entries.length ? (
          <p className="ig-ad-empty">{search ? `Nothing matches “${search}” in ${rangeWord.toLowerCase()}.` : `Nothing here for ${rangeWord.toLowerCase()}.`}</p>
        ) : null}

        {entries.length ? (
          <div className="ig-ad-wl-foot">
            <span>Showing {entries.length.toLocaleString('en-US')} of {total.toLocaleString('en-US')} {TAB_WORDS[tab]}.</span>
            {entries.length < total ? <button type="button" className="ig-ad-btn-2" disabled={loading} onClick={() => load(page + 1)}>{loading ? 'Loading…' : 'Show more'}</button> : null}
          </div>
        ) : null}

        <p className="ig-ad-act-note">
          <AdminIcon name="lock" size={14} />
          <span>Only the owner can see this page. Nobody can edit or delete an entry, including the owner. Entries are kept for 2 years.</span>
        </p>
      </section>
    </>
  );
}
