// Admin Events: every event across Ingather. Live events refresh every minute.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminData, adminErrorMessage } from '../../api/adminApi';
import { useAdminSession } from './AdminSession';
import { AdminIcon } from './AdminIcons';

const TABS = [['live', 'Live now'], ['upcoming', 'Upcoming'], ['past', 'Past']];
const STATE = { live: ['Live', 'is-live'], upcoming: ['Upcoming', 'is-blue'], past: ['Ended', 'is-grey'] };
const TAB_WORDS = { live: 'live', upcoming: 'upcoming', past: 'past' };
const AVATARS = [['#FFF1E7', '#C84B07'], ['#EAF2FF', '#2563C9'], ['#E6F6F4', '#1D8A7E'], ['#FDECF1', '#C2416B'], ['#FFF6DB', '#B7791F'], ['#111111', '#FFFFFF']];
const DAY = 86400000;
const LIVE_REFRESH_MS = 60 * 1000;

const fmt = (n) => (n == null ? '–' : Number(n).toLocaleString('en-US'));

// Times come as Nigeria wall-clock "2026-11-13T17:00"; read them as local, without time-zone shifts.
const parse = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(s || ''));
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : null;
};
const clock = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const dayDiff = (d) => {
  const a = new Date(d); a.setHours(0, 0, 0, 0);
  const b = new Date(); b.setHours(0, 0, 0, 0);
  return Math.round((a - b) / DAY);
};
const shortDay = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });

const whenWords = (event, compact = false) => {
  const start = parse(event.startsAt);
  if (!start) return '';
  if (event.state === 'live') return `Now, since ${clock(start)}`;
  const diff = dayDiff(start);
  if (event.state === 'upcoming') {
    const day = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : shortDay(start);
    return compact ? day : `${day}, ${clock(start)}`;
  }
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  return shortDay(start);
};

const slotWords = (s) => {
  const a = parse(s);
  if (!a) return '–';
  const b = new Date(a.getTime() + 30 * 60000);
  const sameHalf = (a.getHours() < 12) === (b.getHours() < 12);
  const short = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(/ (AM|PM)$/, '');
  return sameHalf ? `${short(a)} to ${clock(b)}` : `${clock(a)} to ${clock(b)}`;
};

// What kind of event this is, in plain words.
const kindWords = (ev) => {
  if (!ev.hasCheckIn) return 'RSVP page only so far';
  return ev.hasRsvp ? 'RSVP page and check-in' : 'Check-in only';
};
const avatarIndex = (id) => String(id).split('').reduce((a, ch) => a + ch.charCodeAt(0), 0) % AVATARS.length;

const initials = (text) => {
  const words = String(text || '').replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w && !/^\d+$/.test(w));
  return ((words[0] || '')[0] || '').concat((words[1] || '')[0] || '').toUpperCase() || 'EV';
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

function StatePill({ state }) {
  const [label, tone] = STATE[state] || STATE.past;
  return <span className={`ig-ad-pill ${tone}`}>{label}</span>;
}

function Status({ ev }) {
  return (
    <span className="ig-ad-status-cell">
      <StatePill state={ev.state} />
      {ev.rsvpOpen && ev.state !== 'past' ? <span className="ig-ad-sub is-green-text">Taking RSVPs</span> : null}
    </span>
  );
}

function ShowedUp({ value }) {
  return (
    <span className="ig-ad-show">
      <span className="ig-ad-track"><span style={{ width: `${value == null ? 0 : Math.min(100, value)}%` }} /></span>
      <span>{value == null ? '—' : `${value}%`}</span>
    </span>
  );
}

function EventPanel({ id, onClose }) {
  const [event, setEvent] = useState(null);
  const [error, setError] = useState('');
  const closeRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setEvent(null);
    setError('');
    adminData.event(id)
      .then(({ data }) => { if (alive) setEvent(data.event); })
      .catch((err) => { if (alive) setError(adminErrorMessage(err, 'Could not load this event.')); });
    return () => { alive = false; };
  }, [id]);

  // Keep the latest close handler without re-running this effect: re-running it on every
  // redraw moved the cursor back to the first field while people were typing.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onCloseRef.current(); };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, []);

  const start = event && parse(event.startsAt);
  const sub = event ? [event.org, event.state === 'live' ? `live now, since ${clock(start)}` : start ? `${shortDay(start)}, ${clock(start)}` : ''].filter(Boolean).join(' · ') : '';
  const [bg, fg] = AVATARS[avatarIndex(id)];

  return (
    <div className="ig-ad-panel-wrap" role="presentation" onClick={onClose}>
      <aside className="ig-ad-sheet" role="dialog" aria-modal="true" aria-label={event ? event.title : 'Event'} onClick={(e) => e.stopPropagation()}>
        <header className="ig-ad-sheet-head">
          <span className="ig-ad-av" style={{ background: bg, color: fg, width: 48, height: 48, borderRadius: 12 }}>{event ? initials(event.title) : ''}</span>
          <span className="ig-ad-sheet-title">
            <strong>{event ? event.title : 'Loading…'}</strong>
            {event ? <span>{sub}</span> : null}
          </span>
          <button type="button" className="ig-ad-x" aria-label="Close" onClick={onClose} ref={closeRef}><AdminIcon name="close" size={16} /></button>
        </header>

        <div className="ig-ad-sheet-body">
          {error ? <div className="ig-ad-notice is-red" role="alert"><AdminIcon name="warn" size={16} /><span>{error}</span></div> : null}
          {!event && !error ? <span className="ig-ad-skel" style={{ display: 'block', height: 320 }} /> : null}
          {event ? (
            <>
              <div className="ig-ad-stat-grid">
                <div><span>Pre-registered</span><strong>{event.hasRsvp ? fmt(event.registered) : '—'}</strong></div>
                <div><span>Checked in{event.state === 'live' ? ' so far' : ''}</span><strong>{event.state === 'upcoming' ? '—' : fmt(event.checkedIn)}</strong></div>
                <div><span>Showed up</span><strong>{event.showedUp == null || event.state === 'upcoming' ? '—' : `${event.showedUp}%`}</strong></div>
                <div><span>Walk-ins</span><strong>{event.hasCheckIn && event.state !== 'upcoming' ? fmt(event.walkIns) : '—'}</strong></div>
              </div>

              <section className="ig-ad-dl">
                <h3>Details</h3>
                <div><span>Check-in type</span><strong>{event.checkInType}</strong></div>
                {!event.hasCheckIn && event.firstTimersRegistered != null ? <div><span>First-timers registered</span><strong>{fmt(event.firstTimersRegistered)}</strong></div> : null}
                <div><span>RSVP page</span><strong>{event.rsvpPage}</strong></div>
                {event.hasRsvp ? <div><span>QR passes emailed</span><strong>{fmt(event.qrEmailed)}</strong></div> : null}
                <div><span>Busiest 30 minutes</span><strong>{event.busiestSlot ? slotWords(event.busiestSlot) : event.state === 'upcoming' ? 'Not started' : 'No check-ins yet'}</strong></div>
                <div><span>Extras</span><strong>{event.extras}</strong></div>
              </section>

              {!event.hasCheckIn ? (
                <p className="ig-ad-hint">
                  The organiser has opened this RSVP page but has not created its check-in event yet.
                  {event.state === 'upcoming' ? ' Once they do and link it, it shows here as one event with check-in numbers.' : ' Guests scanned with the RSVP scanner count as checked in.'}
                </p>
              ) : null}

              {event.how && !event.hasCheckIn && event.state !== 'upcoming' ? (
                <section className="ig-ad-dl">
                  <h3>How people came in</h3>
                  <div className="ig-ad-ev-row"><span className="ig-ad-ev-name"><strong>Checked in with their RSVP</strong><span>QR pass or name match</span></span><strong>{fmt(event.how.preRegistered)}</strong></div>
                  <div className="ig-ad-ev-row"><span className="ig-ad-ev-name"><strong>First-timers</strong><span>Said so when registering</span></span><strong>{fmt(event.how.firstTimers)}</strong></div>
                </section>
              ) : null}

              {event.how && event.hasCheckIn && event.state !== 'upcoming' ? (
                <section className="ig-ad-dl">
                  <h3>How people came in</h3>
                  {event.hasRsvp ? (
                    <div className="ig-ad-ev-row"><span className="ig-ad-ev-name"><strong>Pre-registered and showed up</strong><span>QR pass or name match</span></span><strong>{fmt(event.how.preRegistered)}</strong></div>
                  ) : null}
                  <div className="ig-ad-ev-row"><span className="ig-ad-ev-name"><strong>Walk-ins</strong><span>Scanned at the door</span></span><strong>{fmt(event.how.walkIns)}</strong></div>
                  {event.how.proxy ? (
                    <div className="ig-ad-ev-row"><span className="ig-ad-ev-name"><strong>Checked in by a friend</strong><span>On someone else's phone</span></span><strong>{fmt(event.how.proxy)}</strong></div>
                  ) : null}
                  <div className="ig-ad-ev-row"><span className="ig-ad-ev-name"><strong>Checked in by an usher</strong><span>Manual</span></span><strong>{fmt(event.how.manual)}</strong></div>
                  <div className="ig-ad-ev-row"><span className="ig-ad-ev-name"><strong>First-timers</strong><span>Said so on the form</span></span><strong>{fmt(event.how.firstTimers)}</strong></div>
                </section>
              ) : null}

              <p className="ig-ad-hint">Admin sees totals only. Guest names, phone numbers and answers stay with the organiser.</p>
            </>
          ) : null}
        </div>

        <footer className="ig-ad-sheet-foot">
          {event ? (
            <a className="ig-ad-btn-2" href={`mailto:${event.orgEmail}?subject=${encodeURIComponent(`About ${event.title}`)}`}>
              <AdminIcon name="mail" size={16} />Email organiser
            </a>
          ) : null}
        </footer>
      </aside>
    </div>
  );
}

export default function AdminEvents() {
  const compact = useCompact();
  const { session } = useAdminSession();
  const canExport = session.admin?.role === 'owner' || session.admin?.role === 'admin';
  const [params, setParams] = useSearchParams();
  const urlTab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : null;
  const [tab, setTab] = useState(urlTab);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [events, setEvents] = useState([]);
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

  const load = useCallback(async (nextPage = 1, quiet = false) => {
    const id = ++request.current;
    if (!quiet) setLoading(true);
    setError('');
    try {
      const { data: res } = await adminData.events({ tab: tab || undefined, q: search || undefined, page: nextPage });
      if (id !== request.current) return;
      setData(res);
      if (!tab) setTab(res.tab);
      setPage(nextPage);
      setEvents((prev) => (nextPage === 1 ? res.events : [...prev, ...res.events]));
    } catch (err) {
      if (id === request.current && err?.response?.status !== 401 && !quiet) setError(adminErrorMessage(err, 'Could not load events. Please try again.'));
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => { load(1); }, [load]);

  // Live numbers move during an event, so refresh the first page every minute.
  useEffect(() => {
    if (tab !== 'live' || page !== 1) return undefined;
    const timer = window.setInterval(() => { if (!document.hidden) load(1, true); }, LIVE_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [tab, page, load]);

  const pickTab = (key) => {
    setTab(key);
    setEvents([]);
    setParams(key === 'live' ? {} : { tab: key }, { replace: true });
  };

  const open = (id, e) => { lastFocus.current = e?.currentTarget || null; setOpenId(id); };
  const close = useCallback(() => {
    setOpenId(null);
    window.setTimeout(() => lastFocus.current?.focus?.(), 0);
  }, []);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const response = await adminData.eventsExport({ tab: tab || 'past', q: search || undefined });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      const match = /filename="([^"]+)"/.exec(response.headers['content-disposition'] || '');
      link.href = url;
      link.download = match ? match[1] : 'ingather-events.csv';
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
  const shownTab = tab || data?.tab;

  return (
    <>
      <div className="ig-ad-pagehead">
        <div className="ig-ad-pagehead-text">
          <h1>Events</h1>
          <p>Every event across Ingather.</p>
        </div>
      </div>

      <section className="ig-ad-panel ig-ad-wl" aria-label="Events">
        <div className="ig-ad-tabs" role="tablist" aria-label="When">
          {TABS.map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={shownTab === key} onClick={() => pickTab(key)}>
              {key === 'live' && counts?.live ? <span className="ig-ad-live-dot" aria-hidden="true" /> : null}
              {label}{counts ? <span>{counts[key].toLocaleString('en-US')}</span> : null}
            </button>
          ))}
        </div>

        <div className="ig-ad-wl-tools">
          <label className="ig-ad-search">
            <AdminIcon name="search" size={16} />
            <input type="search" placeholder="Search event or organisation" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search events" />
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
          <div className="ig-ad-table" aria-busy={loading}>
            <div className="ig-ad-tr ig-ad-th ig-ad-ev-grid" aria-hidden="true">
              <span>Event</span><span>Organisation</span><span>Date</span><span>Registered</span><span>Checked in</span><span>Showed up</span><span>Status</span>
            </div>
            {events.map((ev) => (
              <button key={ev.id} type="button" className={`ig-ad-tr ig-ad-ev-grid ig-ad-row-btn${openId === ev.id ? ' is-open' : ''}`} onClick={(e) => open(ev.id, e)} aria-label={`Open ${ev.title}`}>
                <span className="ig-ad-person"><strong>{ev.title}</strong><span>{kindWords(ev)}</span></span>
                <span className="ig-ad-cell-text">{ev.org}</span>
                <span className="ig-ad-cell-text">{whenWords(ev)}</span>
                <span className="ig-ad-strong">{ev.hasRsvp ? fmt(ev.registered) : '—'}</span>
                <span className="ig-ad-strong">{ev.state === 'upcoming' ? '—' : fmt(ev.checkedIn)}</span>
                <span>{ev.state === 'upcoming' ? <span className="is-faint">Not started</span> : <ShowedUp value={ev.showedUp} />}</span>
                <Status ev={ev} />
              </button>
            ))}
          </div>
        ) : (
          <div className="ig-ad-wl-cards" aria-busy={loading}>
            {events.map((ev) => (
              <button key={ev.id} type="button" className="ig-ad-wl-card ig-ad-org-card" onClick={(e) => open(ev.id, e)}>
                <span className="ig-ad-wl-card-top">
                  <span className="ig-ad-person"><strong>{ev.title}</strong><span>{ev.org} · {whenWords(ev, true)}</span></span>
                  <Status ev={ev} />
                </span>
                {!ev.hasCheckIn ? <span className="ig-ad-sub">RSVP page only so far</span> : null}
                <span className="ig-ad-org-nums">
                  <span><strong>{ev.hasRsvp ? fmt(ev.registered) : '—'}</strong>Registered</span>
                  <span><strong>{ev.state === 'upcoming' ? '—' : fmt(ev.checkedIn)}</strong>Checked in</span>
                  <span><strong>{ev.showedUp == null || ev.state === 'upcoming' ? '—' : `${ev.showedUp}%`}</strong>Showed up</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {loading && !events.length ? <span className="ig-ad-skel" style={{ display: 'block', height: 180 }} /> : null}
        {!loading && !error && !events.length ? (
          <p className="ig-ad-empty">{search ? `No event matches “${search}”.` : shownTab === 'live' ? 'No events are live right now.' : shownTab === 'upcoming' ? 'No upcoming events.' : 'No past events yet.'}</p>
        ) : null}

        {events.length ? (
          <div className="ig-ad-wl-foot">
            <span>
              {total > events.length ? `Showing ${events.length.toLocaleString('en-US')} of ${total.toLocaleString('en-US')} ${TAB_WORDS[shownTab]} events. ` : ''}
              Registered counts pre-registrations from the event's RSVP page. A dash means the event had no RSVP page. Events that only have an RSVP page so far are listed too.
              {shownTab === 'live' ? ' Live numbers refresh every minute.' : ''}
            </span>
            {events.length < total ? <button type="button" className="ig-ad-btn-2" disabled={loading} onClick={() => load(page + 1)}>{loading ? 'Loading…' : 'Show more'}</button> : null}
          </div>
        ) : null}
      </section>

      {openId != null ? <EventPanel id={openId} onClose={close} /> : null}
    </>
  );
}
