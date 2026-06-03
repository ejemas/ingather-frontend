import React, { useEffect, useMemo, useState } from 'react';
import { deletePreEvent, getPreEvents } from '../api/preEventService';
import DashboardShell from '../components/DashboardShell';
import { useToast } from '../components/Toast';
import '../styles/PreEvents.css';

const formatDateTime = (value) => {
  if (!value) return 'Date not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date not set';
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

function PreEvents() {
  const [preEvents, setPreEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [eventToDelete, setEventToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const loadPreEvents = async () => {
      try {
        setLoading(true);
        const response = await getPreEvents();
        setPreEvents(response.preEvents || []);
      } catch (error) {
        toast.error(error.response?.data?.error || 'Unable to load pre-events');
      } finally {
        setLoading(false);
      }
    };

    loadPreEvents();
  }, [toast]);

  const groupedEvents = useMemo(() => {
    const now = new Date();
    const upcoming = [];
    const past = [];

    preEvents.forEach((event) => {
      const eventDate = new Date(event.eventDate);
      if (!Number.isNaN(eventDate.getTime()) && eventDate >= now) {
        upcoming.push(event);
      } else {
        past.push(event);
      }
    });

    upcoming.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
    past.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));

    return { upcoming, past };
  }, [preEvents]);

  const visibleEvents = groupedEvents[activeTab] || [];

  useEffect(() => {
    if (!eventToDelete) return undefined;

    const handleKeyDown = (keyboardEvent) => {
      if (keyboardEvent.key === 'Escape' && !deleting) {
        setEventToDelete(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [eventToDelete, deleting]);

  const copyLink = async (event) => {
    try {
      await navigator.clipboard.writeText(event.publicUrl);
      toast.success('RSVP link copied');
    } catch (error) {
      toast.error('Unable to copy RSVP link');
    }
  };

  const handleDelete = async () => {
    if (!eventToDelete) return;
    try {
      setDeleting(true);
      await deletePreEvent(eventToDelete.id);
      setPreEvents(prev => prev.filter(item => item.id !== eventToDelete.id));
      setEventToDelete(null);
      toast.success('Pre-event deleted');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to delete pre-event');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardShell pageTitle="Pre-Events" activeNav="pre-events">
      <div className="pre-events-page">
        <section className="pre-events-hero">
          <div>
            <span className="pre-events-kicker">Pre-event intelligence</span>
            <h1>RSVP pages before the room fills up.</h1>
            <p>
              Create public registration pages, capture attendee intent, and watch demand build before event day.
            </p>
          </div>
          <a className="pre-events-primary-btn" href="/pre-events/create">Create Pre-Event</a>
        </section>

        <section className="pre-events-panel">
          <div className="pre-events-tabs" role="tablist" aria-label="Pre-event filters">
            <button
              type="button"
              className={activeTab === 'upcoming' ? 'active' : ''}
              onClick={() => setActiveTab('upcoming')}
            >
              Upcoming <span>{groupedEvents.upcoming.length}</span>
            </button>
            <button
              type="button"
              className={activeTab === 'past' ? 'active' : ''}
              onClick={() => setActiveTab('past')}
            >
              Past <span>{groupedEvents.past.length}</span>
            </button>
          </div>

          {loading ? (
            <div className="pre-events-empty">Loading pre-events...</div>
          ) : visibleEvents.length === 0 ? (
            <div className="pre-events-empty">
              <h2>No {activeTab} pre-events yet.</h2>
              <p>Create a pre-event RSVP page to begin collecting attendees before the live scan flow.</p>
            </div>
          ) : (
            <div className="pre-events-grid">
              {visibleEvents.map((event) => (
                <article key={event.id} className="pre-event-card">
                  <div className="pre-event-card-media">
                    {event.bannerUrl ? (
                      <img src={event.bannerUrl} alt={event.title} />
                    ) : (
                      <div className="pre-event-card-fallback">RSVP</div>
                    )}
                    <span className={`pre-event-status ${event.isRsvpActive ? 'active' : 'paused'}`}>
                      {event.isRsvpActive ? 'Open' : 'Paused'}
                    </span>
                  </div>
                  <div className="pre-event-card-body">
                    <div>
                      <h2>{event.title}</h2>
                      <p>{formatDateTime(event.eventDate)}</p>
                    </div>
                    <div className="pre-event-card-metrics">
                      <span>{event.rsvpCount}</span>
                      <small>RSVPs secured</small>
                    </div>
                    <div className="pre-event-card-actions">
                      <a href={`/pre-events/${event.id}`} className="pre-event-card-primary">View Dashboard</a>
                      <button type="button" onClick={() => copyLink(event)}>Copy Link</button>
                      <a href={event.publicUrl} target="_blank" rel="noreferrer">Open Page</a>
                      <button type="button" className="danger" onClick={() => setEventToDelete(event)}>Delete</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {eventToDelete && (
        <div className="pre-event-delete-overlay" role="presentation" onMouseDown={() => !deleting && setEventToDelete(null)}>
          <div
            className="pre-event-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pre-event-delete-title"
            onMouseDown={(modalEvent) => modalEvent.stopPropagation()}
          >
            <span className="pre-event-delete-kicker">Delete pre-event</span>
            <h2 id="pre-event-delete-title">Delete "{eventToDelete.title}"?</h2>
            <p>
              This will permanently delete the RSVP page and all RSVP records collected for this pre-event.
            </p>
            <div className="pre-event-delete-actions">
              <button type="button" className="pre-event-delete-cancel" onClick={() => setEventToDelete(null)} disabled={deleting}>
                Cancel
              </button>
              <button type="button" className="pre-event-delete-confirm" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

export default PreEvents;
