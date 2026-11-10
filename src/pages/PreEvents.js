import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { deletePreEvent, getPreEvents } from '../api/preEventService';
import { getDashboardBootstrap } from '../api/programService';
import IgDashShell, { DashIcon, DashDialog } from '../components/IgDashShell';
import { useToast } from '../components/Toast';
import { useEventTemplate } from '../context/EventTemplateContext';
import { formatNumber, isSafeImageUrl, localToday } from '../utils/dashboardFormat';

const TABS = [['upcoming', 'Upcoming'], ['past', 'Past']];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "Sat, 14 Nov, 9:00 AM" in the organizer's own time.
const formatWhen = (value) => {
  const d = new Date(value);
  if (!value || Number.isNaN(d.getTime())) return 'Date not set';
  const h = d.getHours();
  const time = `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  const year = d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : '';
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}${year}, ${time}`;
};

const shortLink = (url) => String(url || '').replace(/^https?:\/\//i, '').replace(/\/$/, '');

function PreEventCard({ event, past, onCopy, onDelete }) {
  const [imgFailed, setImgFailed] = useState(false);
  const banner = isSafeImageUrl(event.bannerUrl) && !imgFailed ? event.bannerUrl : null;
  // RSVPs end 12 hours after the start, or earlier if the organizer set a closing time.
  const endsMs = event.rsvpEndsAt ? new Date(event.rsvpEndsAt).getTime() : NaN;
  const ended = event.rsvpEnded === true || (Number.isNaN(endsMs) ? past : Date.now() >= endsMs);
  const state = ended ? 'closed' : event.isRsvpActive ? 'open' : 'paused';
  const stateLabel = { open: 'RSVP open', paused: 'Paused', closed: past ? 'Closed' : 'RSVPs closed' }[state];

  return (
    <article className="ig-pe-card">
      <div className={`ig-pe-media${banner ? '' : ' is-empty'}`}>
        {banner ? <img src={banner} alt="" onError={() => setImgFailed(true)} /> : (
          <span className="ig-pe-media-icon" aria-hidden="true">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9a2 2 0 002-2V6a1 1 0 011-1h12a1 1 0 011 1v1a2 2 0 000 4v1a2 2 0 000 4v1a1 1 0 01-1 1H6a1 1 0 01-1-1v-1a2 2 0 00-2-2" /><path d="M10 5v14" strokeDasharray="2 2" /></svg>
          </span>
        )}
        <span className="ig-pe-media-shade" aria-hidden="true" />
        <span className={`ig-pe-chip is-${state}`}><span aria-hidden="true" />{stateLabel}</span>
      </div>
      <div className="ig-pe-card-text">
        <strong>{event.title}</strong>
        <span>{formatWhen(event.eventDate)}</span>
      </div>
      <div className="ig-pe-stat">
        <span className="ig-pe-stat-num"><strong>{formatNumber(event.rsvpCount)}</strong><span>{event.rsvpCount === 1 ? 'RSVP secured' : 'RSVPs secured'}</span></span>
        <span className="ig-pe-stat-link"><span>Public link</span><a href={`/rsvp/${event.slug}`} target="_blank" rel="noreferrer" title={event.publicUrl}>{shortLink(event.publicUrl)}</a></span>
      </div>
      <div className="ig-pe-actions">
        <Link to={`/pre-events/${event.id}`} className="ig-pe-main">View Dashboard</Link>
        <button type="button" className="ig-pe-ghost" onClick={() => onCopy(event)}>Copy Link</button>
        <a href={`/rsvp/${event.slug}`} target="_blank" rel="noreferrer" className="ig-pe-ghost">Open Page</a>
        <button type="button" className="ig-db-trash ig-pe-trash" aria-label={`Delete ${event.title}`} title="Delete" onClick={() => onDelete(event)}>{DashIcon.trash}</button>
      </div>
    </article>
  );
}

function PreEvents() {
  const toast = useToast();
  const navigate = useNavigate();
  const { template, setTemplateKey } = useEventTemplate();
  const setTemplateRef = useRef(setTemplateKey);
  setTemplateRef.current = setTemplateKey;
  const [params, setParams] = useSearchParams();
  const today = useMemo(() => localToday(), []);
  const tab = params.get('tab') === 'past' ? 'past' : 'upcoming';

  const [boot, setBoot] = useState(null);
  const [preEvents, setPreEvents] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login', { replace: true });
      return undefined;
    }
    let alive = true;
    (async () => {
      setLoadError('');
      try {
        const [list, shell] = await Promise.all([
          getPreEvents(),
          getDashboardBootstrap(today, today, today).catch(() => null)
        ]);
        if (!alive) return;
        setPreEvents(list.preEvents || []);
        if (shell) {
          setBoot(shell);
          if (shell.church?.organizationType) setTemplateRef.current(shell.church.organizationType);
        }
      } catch (error) {
        if (!alive) return;
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login', { replace: true });
          return;
        }
        setLoadError(error.response?.data?.error || 'We could not load your pre-events. Check your connection and try again.');
      }
    })();
    return () => { alive = false; };
  }, [today, reloadKey, navigate]);

  const grouped = useMemo(() => {
    const now = Date.now();
    const upcoming = [];
    const past = [];
    (preEvents || []).forEach((event) => {
      const t = new Date(event.eventDate).getTime();
      if (!Number.isNaN(t) && t >= now) upcoming.push(event); else past.push(event);
    });
    upcoming.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
    past.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));
    return { upcoming, past };
  }, [preEvents]);

  const selectTab = (key) => {
    const next = new URLSearchParams(params);
    if (key === 'upcoming') next.delete('tab'); else next.set('tab', key);
    setParams(next, { replace: true });
  };

  const copyLink = async (event) => {
    try {
      await navigator.clipboard.writeText(event.publicUrl);
      toast.success('RSVP link copied');
    } catch (error) {
      toast.error('Could not copy the link. Open the page and copy it from the address bar.');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deletePreEvent(deleting.id);
      setPreEvents((list) => (list || []).filter((item) => item.id !== deleting.id));
      setBoot((b) => (b ? { ...b, stats: { ...b.stats, preEventCount: Math.max(0, (b.stats?.preEventCount || 1) - 1) } } : b));
      toast.success('Pre-event deleted');
      setDeleting(null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not delete this pre-event. Try again.');
    } finally {
      setDeleteBusy(false);
    }
  };

  const church = boot?.church ? { name: boot.church.churchName, email: boot.church.email, logoUrl: boot.church.logoUrl } : null;
  const stats = boot?.stats;
  const visible = grouped[tab];
  const loading = preEvents === null && !loadError;

  return (
    <IgDashShell
      active="pre-events"
      crumb="Pre-Events"
      church={church}
      counts={{ preEvents: preEvents ? preEvents.length : stats?.preEventCount || 0, events: stats?.totalProgramsAllTime || 0 }}
      unreadCount={boot?.unreadCount || 0}
      live={stats?.live || null}
      template={template}
    >
      <div className="ig-db-page">
        <section className="ig-pe-hero">
          <div className="ig-pe-hero-text">
            <span className="ig-pe-kicker"><span>Pre-Events</span>RSVP pages</span>
            <h1>RSVP pages before the <span className="ig-db-title-mark">room fills up</span></h1>
            <p>Share a page, collect RSVPs, and every guest gets a QR pass by email. Link it to your event and they check in in one tap.</p>
          </div>
          <Link to="/pre-events/create" className="ig-db-btn-primary ig-pe-cta">{DashIcon.plus}Create Pre-Event</Link>
        </section>

        <div className="ig-pe-tabs" role="tablist" aria-label="Pre-event filters">
          {TABS.map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'is-on' : ''} onClick={() => selectTab(key)}>
              {label}<span>{loading || loadError ? '' : grouped[key].length}</span>
            </button>
          ))}
        </div>

        {loadError ? (
          <div className="ig-db-card ig-db-error" role="alert">
            <strong>Your pre-events didn't load</strong>
            <span>{loadError}</span>
            <button type="button" className="ig-db-btn-ink" onClick={() => { setPreEvents(null); setReloadKey((k) => k + 1); }}>Try again</button>
          </div>
        ) : loading ? (
          <div className="ig-pe-grid" aria-busy="true" aria-label="Loading pre-events">
            {[0, 1, 2].map((i) => <div key={i} className="ig-db-skel ig-pe-skel" />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="ig-pe-empty">
            <span className="ig-pe-ticket" aria-hidden="true"><i /><b /><b /></span>
            <strong>No {tab} pre-events yet.</strong>
            <span>
              {tab === 'past'
                ? 'Pre-events move here once their date has passed.'
                : 'Create a pre-event RSVP page to start collecting attendees before the doors open.'}
            </span>
            {tab === 'upcoming' && <Link to="/pre-events/create" className="ig-db-btn-primary">{DashIcon.plus}Create Pre-Event</Link>}
          </div>
        ) : (
          <div className="ig-pe-grid">
            {visible.map((event) => (
              <PreEventCard key={event.id} event={event} past={tab === 'past'} onCopy={copyLink} onDelete={setDeleting} />
            ))}
          </div>
        )}
      </div>

      {deleting && (
        <DashDialog
          tone="danger"
          icon={DashIcon.trash}
          title={`Delete "${deleting.title}"?`}
          cancelLabel="Keep page"
          confirmLabel="Delete page"
          busy={deleteBusy}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        >
          This removes the RSVP page
          {deleting.rsvpCount > 0 ? ` and its ${formatNumber(deleting.rsvpCount)} ${deleting.rsvpCount === 1 ? 'RSVP' : 'RSVPs'}` : ''}.
          The public link stops working{deleting.rsvpCount > 0 ? ' and guests’ QR passes will no longer check them in' : ''}. You can't undo this.
        </DashDialog>
      )}
    </IgDashShell>
  );
}

export default PreEvents;
