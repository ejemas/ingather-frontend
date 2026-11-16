// Admin Overview: how Ingather is doing across every organisation. Totals only, no guest details.
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useOutletContext } from 'react-router-dom';
import { adminData, adminErrorMessage } from '../../api/adminApi';
import { AdminIcon } from './AdminIcons';

const RANGES = [['7d', '7 days'], ['30d', '30 days'], ['90d', '90 days'], ['all', 'All time']];
const RANGE_WORDS = { '7d': 'last 7 days', '30d': 'last 30 days', '90d': 'last 90 days', all: 'all time' };
const METRICS = [['checkins', 'Check-ins', 'People checked in each month'], ['orgs', 'Organisations', 'New organisations each month'], ['rsvps', 'Pre-registrations', 'Pre-registrations each month']];

const KPI_DEFS = [
  { key: 'checkins', label: 'People checked in', short: 'Checked in', icon: 'people', bg: '#FFF1E7', fg: '#C84B07' },
  { key: 'orgs', label: 'Organisations', short: 'Organisations', icon: 'orgs', bg: '#EAF2FF', fg: '#2563C9' },
  { key: 'events', label: 'Events run', short: 'Events run', icon: 'events', bg: '#E6F6F4', fg: '#1D8A7E' },
  { key: 'rsvps', label: 'Pre-registrations', short: 'RSVPs', icon: 'ticket', bg: '#FDECF1', fg: '#C2416B' },
  { key: 'waitlist', label: 'Waitlist', short: 'Waitlist', icon: 'waitlist', bg: '#FFF6DB', fg: '#B7791F' },
  { key: 'qr', label: 'QR passes emailed', short: 'QR passes', icon: 'qr', bg: '#F0F0EE', fg: '#3F3F3F' },
  { key: 'emails', label: 'Emails sent', short: 'Emails sent', icon: 'mail', bg: '#EAF2FF', fg: '#2563C9' },
  { key: 'flyers', label: 'Personal flyers made', short: 'Flyers made', icon: 'export', bg: '#FFF1E7', fg: '#C84B07' }
];

const TYPE_COLORS = ['#E8590C', '#111111', '#2563C9', '#1D8A7E', '#C2416B', '#B7791F', '#7A5AF8', '#B5B5B3'];
const AVATARS = [['#111111', '#FFFFFF'], ['#FFF1E7', '#C84B07'], ['#EAF2FF', '#2563C9'], ['#E6F6F4', '#1D8A7E'], ['#FDECF1', '#C2416B']];
const FUNNEL_COLORS = ['#111111', '#3F3F3F', '#E8590C', '#C84B07', '#1F8A4C'];
const ACTIVITY_STYLE = {
  help: ['help', '#FDEDEC', '#B42318'],
  orgs: ['orgs', '#EAF2FF', '#2563C9'],
  waitlist: ['waitlist', '#FFF6DB', '#B7791F'],
  events: ['events', '#E6F6F4', '#1D8A7E'],
  rsvps: ['ticket', '#FDECF1', '#C2416B'],
  qr: ['qr', '#F0F0EE', '#3F3F3F']
};

const fmt = (value) => (value == null ? '–' : Number(value).toLocaleString('en-US'));
const monthYear = (iso) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '');

const ago = (iso) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 172800) return 'Yesterday';
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

// Rounds the top of the chart to a tidy number and labels the steps (8k, 6k ...).
const niceScale = (max) => {
  const top = Math.max(max, 1);
  const pow = 10 ** Math.floor(Math.log10(top));
  const steps = [1, 2, 2.5, 4, 5, 8, 10];
  const ceil = steps.map((s) => s * pow).find((s) => s >= top) || 10 * pow;
  const count = ceil / pow === 2.5 || ceil / pow === 5 ? 5 : 4;
  const short = (v) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : String(+v.toFixed(1)));
  return { max: ceil, ticks: Array.from({ length: count + 1 }, (_, i) => short(ceil - (ceil / count) * i)) };
};

function useCompact() {
  const query = '(max-width: 960px)';
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setCompact(list.matches);
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, []);
  return compact;
}

function Panel({ label, title, sub, action, gap = 16, children }) {
  return (
    <section aria-label={label || title} className={`ig-ad-panel gap-${gap}`}>
      <div className="ig-ad-panel-head">
        <span><h2>{title}</h2>{sub ? <small>{sub}</small> : null}</span>
        {action}
      </div>
      {children}
    </section>
  );
}

function Skeleton({ h = 16, w = '100%' }) {
  return <span className="ig-ad-skel" style={{ display: 'block', height: h, width: w }} />;
}

function Kpis({ data, range, compact }) {
  return (
    <section aria-label="Key numbers" className="ig-ad-kpis">
      {KPI_DEFS.map((def) => {
        const k = data?.kpis?.[def.key];
        const notTracked = data && !k;
        let delta = '';
        let tone = '';
        if (notTracked) {
          delta = def.key === 'emails' ? 'Not counted yet' : 'No data yet';
          tone = 'is-grey';
        } else if (k) {
          if (def.key === 'waitlist') {
            delta = range === 'all' || compact ? `${fmt(k.waiting)} waiting` : `+${fmt(k.inRange)} joined, ${fmt(k.waiting)} waiting`;
            tone = range === 'all' ? 'is-grey' : 'is-amber';
          } else if (range === 'all') {
            delta = k.since ? `${compact ? 'Since' : 'since'} ${monthYear(k.since)}` : '';
            tone = 'is-grey';
          } else {
            delta = `+${fmt(k.inRange)}${compact ? '' : ` in the ${RANGE_WORDS[range]}`}`;
          }
        }
        return (
          <div key={def.key} className="ig-ad-kpi">
            <span className="ig-ad-kpi-top">
              <span className="ig-ad-kpi-label">{compact ? def.short : def.label}</span>
              <span className="ig-ad-chip" style={{ background: def.bg, color: def.fg }}><AdminIcon name={def.icon} size={16} /></span>
            </span>
            {data ? (
              <strong className={`ig-ad-kpi-value${notTracked ? ' is-empty' : ''}`}>{notTracked ? '–' : fmt(k.total)}</strong>
            ) : <Skeleton h={compact ? 24 : 30} w="60%" />}
            {data ? <span className={`ig-ad-kpi-delta ${tone}`}>{delta}</span> : <Skeleton h={12} w="80%" />}
          </div>
        );
      })}
    </section>
  );
}

function Growth({ growth, compact }) {
  const [metric, setMetric] = useState('checkins');
  const def = METRICS.find((m) => m[0] === metric);
  const values = (growth || []).map((row) => row[metric] || 0);
  const scale = niceScale(Math.max(0, ...values));
  return (
    <Panel
      label="Growth"
      title="Growth over the last 12 months"
      sub={def[2]}
      gap={18}
      action={(
        <div role="radiogroup" aria-label="Chart" className="ig-ad-toggle">
          {METRICS.map(([key, label]) => (
            <button key={key} type="button" role="radio" aria-checked={key === metric} onClick={() => setMetric(key)}>
              {compact && key === 'rsvps' ? 'RSVPs' : label}
            </button>
          ))}
        </div>
      )}
    >
      <div className="ig-ad-chart">
        <div className="ig-ad-chart-y" aria-hidden="true">{scale.ticks.map((t) => <span key={t}>{t}</span>)}</div>
        <div className="ig-ad-chart-bars" role="list">
          {(growth || Array.from({ length: 12 }, () => null)).map((row, i, all) => (
            <div key={i} role="listitem" className={`ig-ad-bar${i === all.length - 1 ? ' is-last' : ''}`} tabIndex={row ? 0 : -1}
              aria-label={row ? `${row.label}: ${fmt(row[metric])}` : undefined}>
              {row ? <span className="ig-ad-bar-tip">{fmt(row[metric])}</span> : null}
              <span className="ig-ad-bar-fill" style={{ height: row ? `${Math.round(((row[metric] || 0) / scale.max) * 194)}px` : '40px', opacity: row ? 1 : 0.35 }} />
              <span className="ig-ad-bar-label">{row ? (compact ? row.label[0] : row.label) : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function Funnel({ funnel }) {
  const rows = funnel ? [
    ['Joined the waitlist', funnel.joined],
    ['Invited', funnel.invited],
    ['Signed up', funnel.signedUp],
    ['Ran at least one event', funnel.ranOne],
    ['Ran an event in the last 30 days', funnel.ranRecent]
  ] : [];
  const base = funnel?.joined || 0;
  return (
    <Panel label="From waitlist to active" title="From waitlist to active" sub="How far people get, all time">
      {!funnel ? <><Skeleton h={28} /><Skeleton h={28} /><Skeleton h={28} /></> : (
        <>
          <div className="ig-ad-funnel">
            {rows.map(([label, value], i) => {
              const pct = base ? Math.round((value / base) * 100) : 0;
              return (
                <div key={label} className="ig-ad-funnel-row">
                  <span className="ig-ad-funnel-top">
                    <span>{label}</span>
                    <span><strong>{fmt(value)}</strong> {i ? `${pct}%` : ''}</span>
                  </span>
                  <span className="ig-ad-track"><span style={{ width: `${base ? pct : 0}%`, background: FUNNEL_COLORS[i] }} /></span>
                </div>
              );
            })}
          </div>
          <span className="ig-ad-hint">
            {fmt(Math.max(0, funnel.invited - funnel.signedUp))} people were invited but have not signed up yet. {fmt(Math.max(0, funnel.signedUp - funnel.ranOne))} signed up but never ran an event.
          </span>
        </>
      )}
    </Panel>
  );
}

function TopOrgs({ orgs, range }) {
  return (
    <Panel label="Top organisations" title="Top organisations" sub={`By people checked in, ${RANGE_WORDS[range]}`} gap={14}
      action={<Link to="/admin/organisations">See all</Link>}>
      <div className="ig-ad-list">
        {!orgs ? <Skeleton h={160} /> : !orgs.length ? <p className="ig-ad-empty">No check-ins in this time yet.</p> : orgs.map((org, i) => {
          const initials = org.name.split(/\s+/).map((w) => w[0]).filter((ch) => /[A-Z]/.test(ch)).slice(0, 2).join('') || org.name.slice(0, 2).toUpperCase();
          return (
            <div key={`${org.name}-${i}`} className="ig-ad-org">
              <span className="ig-ad-org-rank">{i + 1}</span>
              <span className="ig-ad-av" style={{ background: AVATARS[i][0], color: AVATARS[i][1] }}>{initials}</span>
              <span className="ig-ad-org-name"><strong>{org.name}</strong><span>{[org.type, org.city].filter(Boolean).join(' · ')}</span></span>
              <span className="ig-ad-org-num"><strong>{fmt(org.checkins)}</strong><span>{org.events} event{org.events === 1 ? '' : 's'}</span></span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function WhoUses({ types, cities, total }) {
  const sum = total || (types || []).reduce((a, t) => a + t.count, 0) || 1;
  const cityMax = cities && cities.length ? cities[0].count : 1;
  return (
    <Panel label="Who uses Ingather" title="Who uses Ingather" sub="Organisations by type">
      {!types ? <Skeleton h={90} /> : (
        <>
          <span className="ig-ad-typebar" aria-hidden="true">
            {types.map((t, i) => <span key={t.name} style={{ width: `${((t.count / sum) * 100).toFixed(1)}%`, background: TYPE_COLORS[i % TYPE_COLORS.length] }} />)}
          </span>
          <div className="ig-ad-legend">
            {types.map((t, i) => (
              <span key={t.name}><i style={{ background: TYPE_COLORS[i % TYPE_COLORS.length] }} /><em>{t.name}</em><strong>{fmt(t.count)}</strong></span>
            ))}
          </div>
        </>
      )}
      <div className="ig-ad-divider" />
      <div className="ig-ad-panel-head"><span><h2>Top cities</h2><small>From organisation locations</small></span></div>
      <div className="ig-ad-cities">
        {!cities ? <Skeleton h={80} /> : !cities.length ? <p className="ig-ad-empty">No locations yet.</p> : cities.map((c) => (
          <span key={c.name} className="ig-ad-city">
            <span>{c.name}</span>
            <span className="ig-ad-track"><span style={{ width: `${Math.round((c.count / cityMax) * 100)}%`, background: '#111111' }} /></span>
            <strong>{fmt(c.count)}</strong>
          </span>
        ))}
      </div>
    </Panel>
  );
}

function Features({ features, range }) {
  return (
    <Panel label="Features used" title="What organisers use" sub={`Share of events using each feature, ${RANGE_WORDS[range]}`} gap={14}>
      <div className="ig-ad-feats">
        {!features ? <Skeleton h={160} /> : features.list.map((f) => (
          <div key={f.name} className="ig-ad-feat">
            <span className="ig-ad-feat-top"><span>{f.name}</span><strong>{f.pct}%</strong></span>
            <span className="ig-ad-track"><span style={{ width: `${f.pct}%` }} /></span>
            <small>{f.note}</small>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Activity({ items, compact }) {
  const list = (items || []).slice(0, compact ? 5 : 7);
  return (
    <Panel label="Recent activity" title="Recent activity" sub="Across all organisations" gap={10}>
      <div className="ig-ad-list">
        {!items ? <Skeleton h={200} /> : !list.length ? <p className="ig-ad-empty">Nothing yet.</p> : list.map((a, i) => {
          const [icon, bg, fg] = ACTIVITY_STYLE[a.kind] || ACTIVITY_STYLE.events;
          return (
            <div key={i} className="ig-ad-act">
              <span className="ig-ad-chip" style={{ background: bg, color: fg }}><AdminIcon name={icon} size={16} /></span>
              <span className="ig-ad-act-text">{a.text}</span>
              <span className="ig-ad-act-time">{ago(a.at)}</span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function LiveStrip({ live, compact }) {
  if (!live) return null;
  const quiet = !live.count;
  const names = live.names || [];
  const nameText = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0] || '';
  const line = quiet
    ? 'Nothing is live right now.'
    : compact
      ? `${fmt(live.checkedIn)} people checked in so far`
      : `${nameText}${live.count > names.length ? ' and others' : ''}. ${fmt(live.checkedIn)} people checked in so far.`;
  return (
    <section aria-label="Live now" className={`ig-ad-live${quiet ? ' is-quiet' : ''}`}>
      <span className="ig-ad-live-count"><span className="ig-ad-live-dot" />{quiet ? 'No events live' : `${live.count} event${live.count === 1 ? '' : 's'} live right now`}</span>
      {!quiet || !compact ? <span className="ig-ad-live-line">{line}</span> : null}
      {!quiet ? <Link to="/admin/events?tab=live">See live events</Link> : null}
    </section>
  );
}

// Security: public RSVP pages that got unusually busy in the last 7 days. Emails were not paused.
function RsvpAlerts({ alerts }) {
  if (!alerts || !alerts.length) return null;
  return (
    <section aria-label="Unusual RSVP activity" className="ig-ad-notice ig-ad-rsvp-alerts" role="status">
      <AdminIcon name="warn" size={16} />
      <span className="ig-ad-rsvp-alerts-body">
        <strong>Unusual RSVP activity in the last 7 days</strong>
        {alerts.map((a) => (
          <span key={a.id} className="ig-ad-rsvp-alert">
            <a href={`/rsvp/${encodeURIComponent(a.slug)}`} target="_blank" rel="noreferrer">{a.event}</a> by {a.org}: {a.count.toLocaleString('en-US')} RSVPs in {a.minutes === 60 ? 'an hour' : `${a.minutes} minutes`} · {ago(a.at)}
          </span>
        ))}
        <span className="ig-ad-rsvp-alerts-note">The organiser was notified in their dashboard. QR emails kept sending. Check their guest list for fake entries.</span>
      </span>
    </section>
  );
}

export default function AdminOverview() {
  const compact = useCompact();
  const location = useLocation();
  const { setUpdatedAt } = useOutletContext() || {};
  const [range, setRange] = useState('30d');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [rsvpAlerts, setRsvpAlerts] = useState([]);
  const backupLeft = location.state?.backupCodesLeft;

  useEffect(() => {
    let alive = true;
    adminData.rsvpAlerts().then(({ data: res }) => { if (alive) setRsvpAlerts(res.alerts || []); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const load = useCallback(async (key) => {
    setError('');
    try {
      const { data: next } = await adminData.overview(key);
      setData(next);
      if (setUpdatedAt) setUpdatedAt(next.updatedAt);
    } catch (err) {
      if (err?.response?.status !== 401) setError(adminErrorMessage(err, 'Could not load the numbers. Please try again.'));
    }
  }, [setUpdatedAt]);

  useEffect(() => { load(range); }, [load, range]);

  const shown = data && data.range === range ? data : null;

  return (
    <>
      <div className="ig-ad-pagehead">
        <div className="ig-ad-pagehead-text">
          <h1>How Ingather is doing</h1>
          <p>Every organisation, event and guest in one place.</p>
        </div>
        <div role="radiogroup" aria-label="Time range" className="ig-ad-range">
          {RANGES.map(([key, label]) => (
            <button key={key} type="button" role="radio" aria-checked={key === range} onClick={() => setRange(key)}>{label}</button>
          ))}
        </div>
      </div>

      {typeof backupLeft === 'number' ? (
        <div className="ig-ad-notice" role="status" style={backupLeft <= 2 ? { background: '#FFF6DB', color: '#7A4F0B' } : undefined}>
          <AdminIcon name="shield" size={16} />
          <span>You signed in with a backup code. {backupLeft} left.{backupLeft <= 2 ? ' Ask the owner to reset your two-step sign-in soon.' : ''}</span>
        </div>
      ) : null}

      {error ? (
        <div className="ig-ad-notice is-red" role="alert">
          <AdminIcon name="warn" size={16} />
          <span>{error} <button type="button" className="ig-ad-link ig-ad-link-orange" onClick={() => load(range)}>Try again</button></span>
        </div>
      ) : null}

      <RsvpAlerts alerts={rsvpAlerts} />
      <LiveStrip live={shown?.live} compact={compact} />
      <Kpis data={shown} range={range} compact={compact} />
      <div className="ig-ad-row">
        <Growth growth={shown?.growth} compact={compact} />
        <Funnel funnel={shown?.funnel} />
      </div>
      <div className="ig-ad-row">
        <TopOrgs orgs={shown?.topOrgs} range={range} />
        <WhoUses types={shown?.types} cities={shown?.cities} total={shown?.totalOrgs} />
      </div>
      <div className="ig-ad-row">
        <Features features={shown?.features} range={range} />
        <Activity items={shown?.activity} compact={compact} />
      </div>
    </>
  );
}
