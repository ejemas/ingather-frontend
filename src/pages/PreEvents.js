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

  const copyLink = async (event) => {
    try {
      await navigator.clipboard.writeText(event.publicUrl);
      toast.success('RSVP link copied');
    } catch (error) {
      toast.error('Unable to copy RSVP link');
    }
  };

  const handleDelete = async (event) => {
    const confirmed = window.confirm(`Delete "${event.title}" and all RSVPs?`);
    if (!confirmed) return;

    try {
      await deletePreEvent(event.id);
      setPreEvents(prev => prev.filter(item => item.id !== event.id));
      toast.success('Pre-event deleted');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to delete pre-event');
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
                      <button type="button" className="danger" onClick={() => handleDelete(event)}>Delete</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}

export default PreEvents;
