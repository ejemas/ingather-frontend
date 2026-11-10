import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDashboardBootstrap, deleteProgram } from '../api/programService';
import { updateOrganizationType } from '../api/authService';
import OnboardingModal from '../components/OnboardingModal';
import IgDashShell, { DashIcon, DashDialog, StatusPill, DateTile, InfoTip } from '../components/IgDashShell';
import { useToast } from '../components/Toast';
import { useEventTemplate } from '../context/EventTemplateContext';
import {
  addDays,
  dateBadge,
  daysBetween,
  formatNumber,
  formatTime,
  formatTimeRange,
  fullDate,
  greetingDate,
  greetingWord,
  isSafeImageUrl,
  localToday,
  monthTitle,
  parseDateOnly,
  shortDate,
  toDateOnly,
  weekdayShortDate
} from '../utils/dashboardFormat';

const RANGES = [['7', '7d'], ['14', '14d'], ['30', '30d'], ['all', 'All']];
const RANGE_TEXT = { '7': 'last 7 days', '14': 'last 14 days', '30': 'last 30 days', all: 'all time' };
const TABS = [['all', 'All'], ['active', 'Active'], ['upcoming', 'Upcoming'], ['completed', 'Completed']];
const RECENT_LIMIT = 5;

const presetRange = (key, today) => {
  if (key === 'all') return { key, startDate: null, endDate: null };
  const days = Number(key);
  return { key, startDate: addDays(today, -(days - 1)), endDate: today };
};

const useIsCompact = (query = '(max-width: 760px)') => {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false);
  const [compact, setCompact] = useState(get);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const onChange = () => setCompact(mq.matches);
    onChange();
    if (mq.addEventListener) mq.addEventListener('change', onChange); else mq.addListener(onChange);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', onChange); else mq.removeListener(onChange); };
  }, [query]);
  return compact;
};

/* ---------------- Date range picker ---------------- */

function DatePicker({ range, today, onApply, onClose }) {
  const initialStart = range.startDate || addDays(today, -29);
  const initialEnd = range.endDate || today;
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [picking, setPicking] = useState('start');
  const startParts = parseDateOnly(initialStart);
  const [view, setView] = useState({ year: startParts.year, month: startParts.month });
  const ref = useRef(null);

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    const onDown = (event) => {
      if (ref.current && !ref.current.contains(event.target) && !event.target.closest('[data-dates-toggle]')) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [onClose]);

  const firstWeekday = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(toDateOnly(new Date(view.year, view.month, d)));

  const pick = (value) => {
    if (value > today) return;
    if (picking === 'start' || value < start) {
      setStart(value);
      setEnd(value);
      setPicking('end');
    } else {
      setEnd(value);
      setPicking('start');
    }
  };

  const moveMonth = (delta) => setView((v) => {
    const d = new Date(v.year, v.month + delta, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const atCurrentMonth = (() => {
    const t = parseDateOnly(today);
    return view.year > t.year || (view.year === t.year && view.month >= t.month);
  })();

  const totalDays = daysBetween(start, end) + 1;

  return (
    <div className="ig-db-dates" role="dialog" aria-modal="false" aria-labelledby="ig-db-dates-title" ref={ref}>
      <span className="ig-db-dates-caret" aria-hidden="true" />
      <div className="ig-db-dates-head">
        <strong id="ig-db-dates-title">Choose dates</strong>
        <button type="button" className="ig-db-round-btn is-sm" aria-label="Close" onClick={onClose}>{DashIcon.close}</button>
      </div>
      <div className="ig-db-dates-fields">
        <button type="button" className={picking === 'start' ? 'is-on' : ''} onClick={() => setPicking('start')}>
          <span>Start date</span><strong>{fullDate(start)}</strong>
        </button>
        <button type="button" className={picking === 'end' ? 'is-on' : ''} onClick={() => setPicking('end')}>
          <span>End date</span><strong>{fullDate(end)}</strong>
        </button>
      </div>
      <div className="ig-db-dates-month">
        <button type="button" className="ig-db-round-btn is-sm is-line" aria-label="Previous month" onClick={() => moveMonth(-1)}>{DashIcon.chevronLeft}</button>
        <strong aria-live="polite">{monthTitle(view.year, view.month)}</strong>
        <button type="button" className="ig-db-round-btn is-sm is-line" aria-label="Next month" onClick={() => moveMonth(1)} disabled={atCurrentMonth}>{DashIcon.chevronRight}</button>
      </div>
      <div className="ig-db-cal" role="grid" aria-label={monthTitle(view.year, view.month)}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, i) => <span key={`w${i}`} className="ig-db-cal-wd" aria-hidden="true">{w}</span>)}
        {cells.map((value, i) => {
          if (!value) return <span key={`e${i}`} className="ig-db-cal-cell" />;
          const col = i % 7;
          const inRange = value >= start && value <= end;
          const isStart = value === start;
          const isEnd = value === end;
          const future = value > today;
          const rowStart = col === 0 || Number(value.slice(8)) === 1;
          const rowEnd = col === 6 || Number(value.slice(8)) === daysInMonth;
          const cls = [
            'ig-db-cal-cell',
            inRange ? 'in-range' : '',
            isStart ? 'is-start' : '',
            isEnd ? 'is-end' : '',
            inRange && rowStart ? 'row-start' : '',
            inRange && rowEnd ? 'row-end' : ''
          ].filter(Boolean).join(' ');
          return (
            <span key={value} className={cls}>
              <button
                type="button"
                onClick={() => pick(value)}
                disabled={future}
                aria-pressed={isStart || isEnd}
                aria-label={fullDate(value)}
              >{Number(value.slice(8))}</button>
            </span>
          );
        })}
      </div>
      <span className="ig-db-dates-sum">From {shortDate(start)} to {shortDate(end)}, {totalDays} {totalDays === 1 ? 'day' : 'days'}</span>
      <div className="ig-db-dates-actions">
        <button type="button" className="ig-db-btn-ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="ig-db-btn-primary" onClick={() => onApply({ key: 'custom', startDate: start, endDate: end })}>Apply</button>
      </div>
    </div>
  );
}

/* ---------------- Charts ---------------- */

const niceMax = (value) => {
  if (value <= 0) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 2, 2.5, 4, 5, 8, 10];
  for (const s of steps) {
    if (s * magnitude >= value) return s * magnitude;
  }
  return 10 * magnitude;
};

function AttendanceChart({ events, rangeText, compact, liveId }) {
  const perPage = compact ? 6 : 10;
  const pages = Math.max(1, Math.ceil(events.length / perPage));
  const [page, setPage] = useState(pages - 1);
  const [hovered, setHovered] = useState(null);
  const [pinned, setPinned] = useState(null);
  const chartRef = useRef(null);
  useEffect(() => { setPage(Math.max(0, Math.ceil(events.length / perPage) - 1)); }, [events, perPage]);
  useEffect(() => { setHovered(null); setPinned(null); }, [page, events]);

  // A tapped bar stays selected until the next tap elsewhere or Escape.
  useEffect(() => {
    if (pinned === null) return undefined;
    const onDown = (event) => { if (chartRef.current && !chartRef.current.contains(event.target)) setPinned(null); };
    const onKey = (event) => { if (event.key === 'Escape') setPinned(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [pinned]);

  const end = events.length - (pages - 1 - page) * perPage;
  const shown = events.slice(Math.max(0, end - perPage), end);
  const top = niceMax(Math.max(...shown.map((e) => e.attendance), 1));
  const activeId = hovered !== null ? hovered : pinned;
  const best = shown.reduce((max, e) => (e.attendance > max ? e.attendance : max), 0);
  const liveShown = liveId && shown.some((e) => e.id === liveId);

  return (
    <section className="ig-db-card ig-db-chart" aria-label="Attendance over time">
      <div className="ig-db-card-head">
        <span className="ig-db-card-title"><strong>Attendance Over Time</strong><span>Check-ins per event, {rangeText}</span></span>
        {pages > 1 && (
          <span className="ig-db-chart-nav">
            <button type="button" className="ig-db-round-btn is-xs is-line" aria-label="Earlier events" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>{DashIcon.chevronLeft}</button>
            <button type="button" className="ig-db-round-btn is-xs is-line" aria-label="Later events" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}>{DashIcon.chevronRight}</button>
          </span>
        )}
      </div>
      {shown.length === 0 ? (
        <div className="ig-db-empty-chart">
          <strong>No check-ins in this period</strong>
          <span>Pick a longer range, or check back after your next event.</span>
        </div>
      ) : (
        <div ref={chartRef} className="ig-db-chart-body">
          <div className="ig-db-bars" onMouseLeave={() => setHovered(null)}>
            <div className="ig-db-grid" aria-hidden="true">
              <span><em>{formatNumber(top)}</em><i /></span>
              <span><em>{formatNumber(top / 2)}</em><i /></span>
              <span><em>0</em><i /></span>
            </div>
            {shown.map((e, i) => {
              const height = Math.max(e.attendance > 0 ? 3 : 0, Math.round((e.attendance / top) * 100));
              const isOn = activeId === e.id;
              const isLive = e.id === liveId;
              const edge = i === 0 ? ' is-first' : i === shown.length - 1 ? ' is-last' : '';
              return (
                <div className={`ig-db-bar-col${isOn ? ' is-on' : ''}`} key={e.id}>
                  <span className={`ig-db-bar-val${activeId === null && (isLive || (best > 0 && e.attendance === best)) ? ' is-shown' : ''}`} aria-hidden="true">{formatNumber(e.attendance)}</span>
                  <button
                    type="button"
                    className={`ig-db-bar${isLive ? ' is-live' : ''}`}
                    style={{ height: `${height}%` }}
                    aria-label={`${e.title}, ${weekdayShortDate(e.date)}: ${formatNumber(e.attendance)} check-ins${isLive ? ', still counting' : ''}`}
                    aria-pressed={pinned === e.id}
                    onMouseEnter={() => setHovered(e.id)}
                    onFocus={() => setHovered(e.id)}
                    onBlur={() => setHovered(null)}
                    onClick={() => setPinned((current) => (current === e.id ? null : e.id))}
                  />
                  {isOn && (
                    <span className={`ig-db-tip${edge}`} role="status" style={{ bottom: `calc(${height}% + 10px)` }}>
                      <strong>{formatNumber(e.attendance)}</strong>
                      <span>{weekdayShortDate(e.date).replace(',', '')} — Total Attendance</span>
                      <em>{e.title}{isLive ? ' · still counting' : ''}</em>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="ig-db-bar-labels" aria-hidden="true">
            {shown.map((e) => <span key={e.id} className={activeId === e.id ? 'is-on' : ''}>{shortDate(e.date)}</span>)}
          </div>
          {liveShown && (
            <div className="ig-db-legend">
              <span><i className="is-live" />Live, still counting</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function WhoCame({ checkins }) {
  const withGender = checkins.female + checkins.male;
  const femalePct = withGender > 0 ? Math.round((checkins.female / withGender) * 100) : 0;
  const malePct = withGender > 0 ? 100 - femalePct : 0;
  const firstPct = checkins.total > 0 ? Math.round((checkins.firstTimers / checkins.total) * 100) : 0;

  return (
    <section className="ig-db-card ig-db-who" aria-label="Who came">
      <span className="ig-db-card-title"><strong>Who Came</strong><span>From guests who filled the check-in form</span></span>

      {withGender === 0 ? (
        <div className="ig-db-who-empty">
          <strong>No gender answers yet</strong>
          <span>Turn on data collection with a gender question to see this split.</span>
        </div>
      ) : (
        <div className="ig-db-who-block">
          <div className="ig-db-who-row">
            <span><i className="is-female" aria-hidden="true" />Female <strong>{femalePct}%</strong></span>
            <span><strong>{malePct}%</strong> Male<i className="is-male" aria-hidden="true" /></span>
          </div>
          <div className="ig-db-split" role="img" aria-label={`${femalePct} percent female, ${malePct} percent male, from ${formatNumber(withGender)} guests`}>
            {femalePct > 0 && <span className={`is-female${malePct === 0 ? ' is-full' : ''}`} style={{ width: `${femalePct}%` }} />}
            {malePct > 0 && <span className={`is-male${femalePct === 0 ? ' is-full' : ''}`} />}
          </div>
        </div>
      )}

      <div className="ig-db-who-rule" aria-hidden="true" />

      <div className="ig-db-who-block">
        <div className="ig-db-who-row"><span>First-timers</span><strong>{firstPct}%</strong></div>
        <div className="ig-db-meter" role="img" aria-label={`${firstPct} percent first-timers`}>
          <span style={{ width: `${firstPct}%` }} />
        </div>
        <span className="ig-db-who-note">
          {checkins.firstTimers > 0
            ? `${formatNumber(checkins.firstTimers)} ${checkins.firstTimers === 1 ? 'person' : 'people'} came to one of your events for the first time.`
            : 'No first-time guests recorded in this period.'}
        </span>
      </div>

      <Link to="/programs" className="ig-db-link">See full event reports{DashIcon.chevronRight}</Link>
    </section>
  );
}

function Sparkline({ values }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [2 + (i * 92) / (values.length - 1), 30 - ((v - min) / span) * 26]);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg className="ig-db-spark" width="88" height="30" viewBox="0 0 96 34" fill="none" aria-hidden="true">
      <path d={d} stroke="#E8590C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="3" fill="#E8590C" />
    </svg>
  );
}

/* ---------------- Page ---------------- */

function Dashboard() {
  const toast = useToast();
  const navigate = useNavigate();
  const [statInfo, setStatInfo] = useState(null);
  const { template, setTemplateKey } = useEventTemplate();
  // Stable handle: changing the wording must not trigger another data load.
  const setTemplateRef = useRef(setTemplateKey);
  setTemplateRef.current = setTemplateKey;
  const compact = useIsCompact();
  const today = useMemo(() => localToday(), []);

  const [range, setRange] = useState(() => presetRange('30', localToday()));
  const [datesOpen, setDatesOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState('all');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const firstLoad = useRef(true);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login', { replace: true });
      return undefined;
    }
    let alive = true;
    const load = async () => {
      if (firstLoad.current) setLoading(true); else setRefreshing(true);
      setLoadError('');
      try {
        // Always fresh here: this is where organizers watch their live numbers.
        const res = await getDashboardBootstrap(range.startDate, range.endDate, today, { fresh: true });
        if (!alive) return;
        setData(res);
        const orgType = res.church?.organizationType || '';
        if (orgType) {
          setTemplateRef.current(orgType);
          setShowOnboarding(false);
        } else {
          setShowOnboarding(true);
        }
      } catch (error) {
        if (!alive) return;
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login', { replace: true });
          return;
        }
        setLoadError(error.response?.data?.error || 'We could not load your dashboard. Check your connection and try again.');
      } finally {
        if (alive) {
          setLoading(false);
          setRefreshing(false);
          firstLoad.current = false;
        }
      }
    };
    load();
    return () => { alive = false; };
  }, [range, today, reloadKey, navigate]);

  const handleOnboardingSelect = async (organizationType) => {
    const response = await updateOrganizationType(organizationType);
    const savedType = response.church?.organizationType || organizationType;
    setTemplateKey(savedType);
    try {
      const stored = JSON.parse(localStorage.getItem('church') || '{}');
      localStorage.setItem('church', JSON.stringify({ ...stored, organizationType: savedType }));
    } catch (error) { /* storage blocked */ }
    setShowOnboarding(false);
    toast.success('Workspace personalized successfully!');
  };

  const closeDates = useCallback(() => setDatesOpen(false), []);

  const stats = data?.stats;
  const church = data?.church ? {
    name: data.church.churchName,
    email: data.church.email,
    logoUrl: data.church.logoUrl
  } : null;
  const live = stats?.live || null;
  const events = useMemo(() => (stats?.recentPrograms || []).map((p) => ({ ...p, status: p.status || 'completed' })), [stats]);
  const statusCounts = useMemo(() => events.reduce((acc, e) => { acc[e.status] = (acc[e.status] || 0) + 1; return acc; }, {}), [events]);

  const visibleEvents = useMemo(() => {
    let list = tab === 'all' ? events : events.filter((e) => e.status === tab);
    if (tab === 'all') {
      const rank = { active: 0, upcoming: 1, completed: 2 };
      list = [...list].sort((a, b) => (rank[a.status] - rank[b.status])
        || (a.status === 'upcoming' ? `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`) : `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`)));
    } else if (tab === 'upcoming') {
      list = [...list].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
    }
    return list.slice(0, RECENT_LIMIT);
  }, [events, tab]);

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteProgram(deleting.id);
      toast.success(template.dashboard?.deleteSuccess || 'Event deleted.');
      setDeleting(null);
      setReloadKey((k) => k + 1);
    } catch (error) {
      toast.error(error.response?.data?.error || template.dashboard?.deleteFailure || 'Could not delete this event.');
    } finally {
      setDeleteBusy(false);
    }
  };

  const plural = template?.event?.plural || 'Events';
  const singular = template?.event?.singular || 'Event';
  const rangeText = range.key === 'custom'
    ? `${shortDate(range.startDate)} to ${shortDate(range.endDate)}`
    : RANGE_TEXT[range.key];
  const rangeButton = range.startDate ? `${shortDate(range.startDate)} to ${shortDate(range.endDate)}` : 'All time';

  const shell = (content) => (
    <IgDashShell
      active="dashboard"
      crumb="Dashboard"
      church={church}
      counts={{ preEvents: stats?.preEventCount || 0, events: stats?.totalProgramsAllTime || 0 }}
      unreadCount={data?.unreadCount || 0}
      live={live}
      template={template}
    >
      {content}
      {showOnboarding && <OnboardingModal onSelect={handleOnboardingSelect} />}
    </IgDashShell>
  );

  if (loading) {
    return shell(
      <div className="ig-db-page" aria-busy="true" aria-label="Loading dashboard">
        <div className="ig-db-skel is-head" />
        <div className="ig-db-skel is-live" />
        <div className="ig-db-stats">{[0, 1, 2, 3].map((i) => <div key={i} className="ig-db-skel is-stat" />)}</div>
        <div className="ig-db-charts"><div className="ig-db-skel is-chart" /><div className="ig-db-skel is-chart is-narrow" /></div>
      </div>
    );
  }

  if (!stats) {
    return shell(
      <div className="ig-db-page">
        <div className="ig-db-card ig-db-error" role="alert">
          <strong>Your dashboard didn't load</strong>
          <span>{loadError || 'Something went wrong.'}</span>
          <button type="button" className="ig-db-btn-ink" onClick={() => setReloadKey((k) => k + 1)}>Try again</button>
        </div>
      </div>
    );
  }

  const checkins = stats.checkins || { total: 0, female: 0, male: 0, firstTimers: 0 };
  const firstPct = checkins.total > 0 ? Math.round((checkins.firstTimers / checkins.total) * 100) : 0;
  const change = stats.attendanceChange;
  const byEvent = stats.attendanceByEvent || [];
  const now = new Date();

  return shell(
    <div className={`ig-db-page${refreshing ? ' is-refreshing' : ''}`}>
      {loadError && (
        <div className="ig-db-inline-error" role="alert">
          {loadError}
          <button type="button" onClick={() => setReloadKey((k) => k + 1)}>Try again</button>
        </div>
      )}

      <div className="ig-db-hello">
        <div className="ig-db-hello-text">
          <span>{greetingDate(now)} <i aria-hidden="true">·</i> {greetingWord(now)}</span>
          <h1 className="ig-db-overview">Overview</h1>
        </div>
        <div className="ig-db-range">
          <div className="ig-db-seg" role="group" aria-label="Date range">
            {RANGES.map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={range.key === key}
                className={range.key === key ? 'is-on' : ''}
                onClick={() => { setDatesOpen(false); setRange(presetRange(key, today)); }}
              >{label}</button>
            ))}
          </div>
          <button
            type="button"
            data-dates-toggle
            className={`ig-db-range-btn${datesOpen ? ' is-open' : ''}${range.key === 'custom' ? ' is-custom' : ''}`}
            aria-haspopup="dialog"
            aria-expanded={datesOpen}
            aria-label={compact ? `Choose custom dates. Showing ${rangeButton}` : undefined}
            onClick={() => setDatesOpen((v) => !v)}
          >
            {DashIcon.calendar}<span>{rangeButton}</span>
          </button>
          {datesOpen && (
            <DatePicker
              range={range}
              today={today}
              onClose={closeDates}
              onApply={(next) => { setDatesOpen(false); setRange(next); }}
            />
          )}
        </div>
      </div>

      {live && (
        <section className="ig-db-live" aria-label="Live event">
          {isSafeImageUrl(live.flyerUrl) && <img src={live.flyerUrl} alt="" className="ig-db-live-img" />}
          <div className="ig-db-live-shade" aria-hidden="true" />
          <div className="ig-db-live-inner">
            <div className="ig-db-live-text">
              <span className="ig-db-live-pill"><span aria-hidden="true" />Live now</span>
              <strong>{live.title}</strong>
              <span>
                Started {formatTime(live.startTime)}.
                {live.endTime ? ` Check-in open until ${formatTime(live.endTime)}.` : ''}
              </span>
            </div>
            <div className="ig-db-live-stats">
              <div><strong>{formatNumber(live.checkedIn)}</strong><span>checked in</span></div>
              <i aria-hidden="true" />
              <div><strong>+{formatNumber(live.lastTenMinutes)}</strong><span>last 10 min</span></div>
            </div>
            <div className="ig-db-live-actions">
              <Link to={`/program/${live.id}`} className="ig-db-live-btn">Live headcount</Link>
            </div>
          </div>
        </section>
      )}

      <div className="ig-db-stats">
        <div className="ig-db-stat">
          <div className="ig-db-stat-head"><span>Total {plural}</span><InfoTip id="total" title={`Total ${plural}`} text={`Every ${singular.toLowerCase()} created in this workspace, including ones that have ended. It doesn't change with the date filter.`} openId={statInfo} setOpenId={setStatInfo} /></div>
          <strong>{formatNumber(stats.totalProgramsAllTime)}</strong>
          <span className="ig-db-stat-sub">All time</span>
        </div>
        <div className="ig-db-stat">
          <div className="ig-db-stat-head"><span>Total Attendance</span></div>
          <span className="ig-db-stat-row"><strong>{formatNumber(stats.totalAttendance)}</strong>{!compact && <Sparkline values={byEvent.slice(-9).map((e) => e.attendance)} />}</span>
          <span className="ig-db-stat-sub">
            {change ? (
              <>
                <span className={`ig-db-chip${change.percent < 0 ? ' is-down' : ''}`}>{change.percent > 0 ? '+' : ''}{change.percent}%</span>
                <span className="ig-db-ellipsis">vs last period</span>
              </>
            ) : <span className="ig-db-ellipsis">{range.key === 'all' ? 'All time' : `In the ${rangeText}`}</span>}
          </span>
        </div>
        <div className="ig-db-stat">
          <div className="ig-db-stat-head"><span>Upcoming {plural}</span><InfoTip id="upcoming" title={`Upcoming ${plural}`} text={`${plural} scheduled for a future date. The next one is shown underneath.`} openId={statInfo} setOpenId={setStatInfo} /></div>
          <strong>{formatNumber(stats.upcomingPrograms)}</strong>
          <span className="ig-db-stat-sub">{stats.nextUpcoming ? `Next: ${weekdayShortDate(stats.nextUpcoming.date)}` : 'Nothing scheduled yet'}</span>
        </div>
        <div className="ig-db-stat">
          <div className="ig-db-stat-head"><span>First-timers</span></div>
          <strong>{firstPct}%</strong>
          <span className="ig-db-stat-sub">{formatNumber(checkins.firstTimers)} of {formatNumber(checkins.total)} guests</span>
        </div>
      </div>

      <div className="ig-db-charts">
        <AttendanceChart events={byEvent} rangeText={rangeText} compact={compact} liveId={live?.id} />
        <WhoCame checkins={checkins} />
      </div>

      <section className="ig-db-card ig-db-recent" aria-label={template?.event?.recent || 'Recent events'}>
        <div className="ig-db-recent-head">
          <strong>{template?.event?.recent || 'Recent Events'}</strong>
          <div className="ig-db-tabs" role="tablist" aria-label={`Filter ${plural.toLowerCase()}`}>
            {TABS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                className={tab === key ? 'is-on' : ''}
                onClick={() => setTab(key)}
              >
                {label}
                {key === 'upcoming' && statusCounts.upcoming > 0 && <span className="ig-db-tab-badge">{statusCounts.upcoming}</span>}
              </button>
            ))}
          </div>
        </div>

        {visibleEvents.length === 0 ? (
          <div className="ig-db-empty">
            {events.length === 0 ? (
              <>
                <strong>No {plural.toLowerCase()} in this period</strong>
                <span>Create your first {singular.toLowerCase()} to start checking guests in.</span>
                <Link to="/create-program" className="ig-db-btn-primary is-inline">{DashIcon.plus}{template?.event?.create || 'Create Event'}</Link>
              </>
            ) : <span>No {plural.toLowerCase()} match this filter.</span>}
          </div>
        ) : compact ? (
          <div className="ig-db-cards">
            {visibleEvents.map((e) => (
              <Link key={e.id} to={`/program/${e.id}`} className="ig-db-ev-card">
                <span className="ig-db-ev-card-top">
                  <DateTile date={e.date} highlight={e.status === 'active'} large />
                  <span className="ig-db-ev-card-text">
                    <strong>{e.title}</strong>
                    <span>{DashIcon.clock}{formatTimeRange(e.startTime, e.endTime)}</span>
                  </span>
                  <span className="ig-db-ev-card-count"><strong>{e.status === 'upcoming' ? '-' : formatNumber(e.totalScans)}</strong><span>attended</span></span>
                </span>
                <span className="ig-db-ev-card-foot">
                  <StatusPill status={e.status} />
                  <span className="ig-db-ev-card-view">View{DashIcon.chevronRight}</span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="ig-db-table" role="table" aria-label={plural}>
            <div className="ig-db-tr is-head" role="row">
              <span role="columnheader">{singular}</span><span role="columnheader">Time</span><span role="columnheader">Status</span>
              <span role="columnheader">Attendance</span><span role="columnheader">Data collection</span><span role="columnheader" className="is-right">Actions</span>
            </div>
            {visibleEvents.map((e) => {
              const badge = dateBadge(e.date);
              const collecting = e.trackingMode === 'collect-data';
              const canDelete = e.status === 'completed';
              return (
                <div className="ig-db-tr" role="row" key={e.id}>
                  <span role="cell" className="ig-db-ev">
                    <DateTile date={e.date} highlight={e.status === 'active'} />
                    <span className="ig-db-ev-text"><strong>{e.title}</strong><span>{badge.weekday}</span></span>
                  </span>
                  <span role="cell" className="ig-db-muted-cell">{formatTimeRange(e.startTime, e.endTime)}</span>
                  <span role="cell"><StatusPill status={e.status} /></span>
                  <span role="cell" className="ig-db-num-cell">{e.status === 'upcoming' ? '-' : formatNumber(e.totalScans)}</span>
                  <span role="cell" className={collecting ? 'ig-db-data-cell' : 'ig-db-data-cell is-muted'}>{collecting ? 'Collecting' : 'Count only'}</span>
                  <span role="cell" className="ig-db-actions">
                    <Link to={`/program/${e.id}`} className="ig-db-view">View</Link>
                    <button
                      type="button"
                      className="ig-db-trash"
                      aria-label={canDelete ? `Delete ${e.title}` : `Stop ${e.title} before deleting it`}
                      title={canDelete ? 'Delete' : `Stop this ${singular.toLowerCase()} before deleting it`}
                      disabled={!canDelete}
                      onClick={() => setDeleting(e)}
                    >{DashIcon.trash}</button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {events.length > 0 && <Link to="/programs" className="ig-db-link is-center">View all {plural.toLowerCase()}</Link>}
      </section>

      {deleting && (
        <DashDialog
          tone="danger"
          icon={DashIcon.trash}
          title={`Delete "${deleting.title}"?`}
          cancelLabel={`Keep ${singular.toLowerCase()}`}
          confirmLabel={`Delete ${singular.toLowerCase()}`}
          busy={deleteBusy}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        >
          This permanently removes the {singular.toLowerCase()}
          {deleting.totalScans > 0 ? `, its ${formatNumber(deleting.totalScans)} check-ins and its report` : ' and its report'}. You can't undo this.
        </DashDialog>
      )}
    </div>
  );
}

export default Dashboard;
