import React, { useEffect, useMemo, useState } from 'react';
import { getDiscoverPreEvents } from '../api/preEventService';
import '../styles/DiscoverPage.css';

const formatDate = (value) => {
  if (!value) return 'Date coming soon';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date coming soon';
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const getLocation = (event) => (
  [event.venueName, event.city].filter(Boolean).join(', ') || event.churchName || 'Ingather event'
);

function DiscoverPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await getDiscoverPreEvents({ limit: 48 });
        setEvents(response.preEvents || []);
      } catch (loadError) {
        setError(loadError.response?.data?.error || 'Unable to load discover events.');
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return events;
    return events.filter((event) => (
      [event.title, event.description, event.venueName, event.city, event.churchName]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(needle))
    ));
  }, [events, query]);

  return (
    <main className="discover-page">
      <nav className="discover-nav" aria-label="Discover navigation">
        <a href="/" className="discover-brand" aria-label="Ingather home">
          <img src="/ingather-logo.png" alt="Ingather" />
        </a>
        <div className="discover-nav-links">
          <a href="/">Home</a>
          <a href="/waitlist">Start free</a>
        </div>
      </nav>

      <section className="discover-hero">
        <span>Discover Events</span>
        <h1>Explore gatherings taking shape on Ingather.</h1>
        <p>Browse RSVP-ready events, secure your spot, and arrive with your personalized check-in QR ready.</p>
        <label className="discover-search">
          <span>Search events</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by event, city, venue, or host"
          />
        </label>
      </section>

      <section className="discover-list-section">
        <div className="discover-section-title">
          <div>
            <h2>Popular Events</h2>
            <p>{filteredEvents[0]?.city || 'Upcoming'} events</p>
          </div>
          <span>{filteredEvents.length} listed</span>
        </div>

        {loading ? (
          <div className="discover-state-card">Loading events...</div>
        ) : error ? (
          <div className="discover-state-card error">{error}</div>
        ) : filteredEvents.length === 0 ? (
          <div className="discover-state-card">No discoverable events match this search yet.</div>
        ) : (
          <div className="discover-event-grid">
            {filteredEvents.map((event) => (
              <a className="discover-event-card" href={`/rsvp/${event.slug}`} key={event.id}>
                <span className="discover-event-image">
                  {event.bannerUrl ? (
                    <img src={event.bannerUrl} alt={event.title} />
                  ) : (
                    <span>Ingather RSVP</span>
                  )}
                </span>
                <span className="discover-event-copy">
                  <small>{formatDate(event.eventDate)}</small>
                  <strong>{event.title}</strong>
                  <em>{getLocation(event)}</em>
                  <span>{event.rsvpCount || 0} going</span>
                </span>
              </a>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default DiscoverPage;
