import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getDiscoverPreEvents } from '../api/preEventService';
import '../styles/IgWaitlist.css';
import '../styles/IgDiscover.css';

const INVITE_ONLY_MODE = process.env.REACT_APP_INVITE_ONLY_MODE !== 'false';
const PAGE_SIZE = 12;

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatWhen = (value) => {
  const date = toDate(value);
  if (!date) return 'Date coming soon';
  const weekday = date.toLocaleString('en-US', { weekday: 'short' });
  const month = date.toLocaleString('en-US', { month: 'short' });
  const time = date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${weekday}, ${date.getDate()} ${month}, ${time}`;
};

const dateBadge = (value) => {
  const date = toDate(value);
  if (!date) return null;
  return {
    month: date.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
    day: String(date.getDate()).padStart(2, '0')
  };
};

const formatWhere = (event) => [event.venueName, event.city].filter(Boolean).join(', ') || 'Venue to be announced';
const formatMode = (event) => (event.virtualAttendanceEnabled ? 'In person or online' : 'In person');
const formatGoing = (count) => (count > 0 ? `${count.toLocaleString()} going` : 'Be the first to RSVP');

const SearchIcon = ({ color = 'currentColor' }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);

function EventImage({ event, className }) {
  const [failed, setFailed] = useState(false);
  const badge = dateBadge(event.eventDate);
  return (
    <span className={className}>
      {event.bannerUrl && !failed ? (
        <img src={event.bannerUrl} alt={event.title} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="ig-dc-noimg" aria-hidden="true">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
        </span>
      )}
      {badge && (
        <span className="ig-dc-badge" aria-hidden="true">
          <span>{badge.month}</span>
          <strong>{badge.day}</strong>
        </span>
      )}
    </span>
  );
}

function DiscoverPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const city = searchParams.get('city') || '';

  const [draft, setDraft] = useState(query);
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [cities, setCities] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  useEffect(() => {
    setDraft(query);
  }, [query]);

  const load = useCallback(async () => {
    const id = requestId.current + 1;
    requestId.current = id;
    setLoading(true);
    setError('');
    try {
      const response = await getDiscoverPreEvents({
        limit: PAGE_SIZE + 1,
        offset: 0,
        q: query || undefined,
        city: city || undefined,
        facets: 1
      });
      if (requestId.current !== id) return;
      setEvents(response.preEvents || []);
      setTotal(Number(response.total) || (response.preEvents || []).length);
      setHasMore(Boolean(response.hasMore));
      if (Array.isArray(response.cities)) setCities(response.cities);
      setOnlineCount(Number(response.onlineCount) || 0);
    } catch (loadError) {
      if (requestId.current !== id) return;
      setError(loadError.response?.data?.error || 'We could not load events right now.');
      setEvents([]);
      setTotal(0);
      setHasMore(false);
    } finally {
      if (requestId.current === id) setLoading(false);
    }
  }, [query, city]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await getDiscoverPreEvents({
        limit: PAGE_SIZE,
        offset: events.length,
        q: query || undefined,
        city: city || undefined
      });
      const next = response.preEvents || [];
      setEvents((current) => {
        const seen = new Set(current.map((event) => event.id));
        return [...current, ...next.filter((event) => !seen.has(event.id))];
      });
      setHasMore(Boolean(response.hasMore));
    } catch (loadError) {
      setError(loadError.response?.data?.error || 'We could not load more events.');
    } finally {
      setLoadingMore(false);
    }
  };

  const updateParams = (next) => {
    const params = new URLSearchParams();
    const nextQuery = next.q !== undefined ? next.q : query;
    const nextCity = next.city !== undefined ? next.city : city;
    if (nextQuery) params.set('q', nextQuery);
    if (nextCity) params.set('city', nextCity);
    setSearchParams(params, { replace: true });
  };

  const handleSearch = (event) => {
    event.preventDefault();
    updateParams({ q: draft.trim() });
  };

  const clearAll = () => {
    setDraft('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const hostLabel = INVITE_ONLY_MODE ? 'Join the Waitlist' : 'Get started';
  const hostPath = INVITE_ONLY_MODE ? '/waitlist' : '/register';
  const filtered = Boolean(query || city);
  const cityLabel = city.toLowerCase() === 'online' ? 'online' : `in ${city}`;
  const heading = query
    ? `Results for "${query}"${city ? ` ${cityLabel}` : ''}`
    : city
      ? `Events ${cityLabel}`
      : 'Happening soon';
  const [featured, ...rest] = events;
  const chipList = [
    { key: '', label: 'All' },
    ...cities.map((item) => ({ key: item.name, label: item.name })),
    ...(onlineCount > 0 ? [{ key: 'online', label: 'Online' }] : [])
  ];
  if (city && !chipList.some((chip) => chip.key.toLowerCase() === city.toLowerCase())) {
    chipList.push({ key: city, label: city.toLowerCase() === 'online' ? 'Online' : city });
  }

  return (
    <div className="ig-wl ig-dc">
      <div className="ig-wl-frame">
        <div className="ig-wl-col">
          <div className="ig-wl-navwrap">
            <nav className="ig-wl-nav" aria-label="Main">
              <Link to="/" className="ig-wl-brand" aria-label="Ingather home">
                <img src="/ingather-logo.png" alt="Ingather" />
              </Link>
              <div className="ig-wl-navlinks">
                <Link to="/">Home</Link>
                <Link to="/discover" className="is-current" aria-current="page">Discover<span aria-hidden="true" /></Link>
                <Link to="/#faq">FAQs</Link>
                <Link to="/login">Log in</Link>
              </div>
              <Link to={hostPath} className="ig-wl-login">Host an Event</Link>
            </nav>
          </div>

          <section className="ig-dc-hero">
            <span className="ig-wl-pill"><span>Discover</span>RSVP to public events on Ingather</span>
            <h1>Find gatherings <span className="ig-wl-mark">near you</span></h1>
            <p>Secure your spot, get a personal QR pass, and walk straight in on the day.</p>

            <form role="search" className="ig-dc-search" onSubmit={handleSearch}>
              <SearchIcon color="#6B6B6B" />
              <label htmlFor="discover-search" className="ig-dc-sr">Search events</label>
              <input
                id="discover-search"
                type="search"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Search by event, city, venue or host"
                maxLength={120}
                enterKeyHint="search"
              />
              <button type="submit">Search</button>
            </form>

            {chipList.length > 1 && (
              <div role="group" aria-label="Filter by city" className="ig-dc-chips">
                {chipList.map((chip) => {
                  const selected = chip.key.toLowerCase() === city.toLowerCase();
                  return (
                    <button
                      key={chip.key || 'all'}
                      type="button"
                      aria-pressed={selected}
                      className={selected ? 'is-on' : ''}
                      onClick={() => updateParams({ city: chip.key })}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="ig-dc-list" aria-live="polite" aria-busy={loading}>
            <div className="ig-dc-list-head">
              <h2>{heading}</h2>
              {!loading && !error && total > 0 && (
                <span>{total} {total === 1 ? 'event' : 'events'} listed</span>
              )}
            </div>

            {loading ? (
              <div className="ig-dc-skeleton" aria-hidden="true">
                <div className="ig-dc-skel-feature" />
                <div className="ig-dc-grid">
                  <div className="ig-dc-skel-card" /><div className="ig-dc-skel-card" /><div className="ig-dc-skel-card" />
                </div>
              </div>
            ) : error ? (
              <div className="ig-dc-empty">
                <strong>Something went wrong</strong>
                <span>{error}</span>
                <button type="button" className="ig-dc-btn-dark" onClick={load}>Try again</button>
              </div>
            ) : events.length === 0 ? (
              <div className="ig-dc-empty">
                <span className="ig-dc-empty-icon"><SearchIcon /></span>
                <strong>
                  {filtered
                    ? `No events match ${query ? `"${query}"` : ''}${query && city ? ' ' : ''}${city ? cityLabel : ''}`
                    : 'No public events yet'}
                </strong>
                <span>
                  {filtered
                    ? 'Try another city or a shorter search. New events are listed as organizers publish them.'
                    : 'New events are listed here as organizers publish them. Check back soon.'}
                </span>
                {filtered && <button type="button" className="ig-dc-btn-dark" onClick={clearAll}>Clear search</button>}
              </div>
            ) : (
              <>
                <Link to={`/rsvp/${featured.slug}`} className="ig-dc-feature">
                  <EventImage event={featured} className="ig-dc-feature-img" />
                  <span className="ig-dc-feature-copy">
                    <span className="ig-dc-tag"><span aria-hidden="true" />Next up</span>
                    <span className="ig-dc-feature-title">{featured.title}</span>
                    <span className="ig-dc-feature-meta">
                      <span>{formatWhen(featured.eventDate)}</span>
                      <span>{formatWhere(featured)}</span>
                      {featured.churchName && <span>Hosted by {featured.churchName}</span>}
                    </span>
                    <span className="ig-dc-feature-foot">
                      <span>{formatGoing(featured.rsvpCount)}</span>
                      <span className="ig-dc-rsvp-btn">RSVP</span>
                    </span>
                  </span>
                </Link>

                {rest.length > 0 && (
                  <div className="ig-dc-grid">
                    {rest.map((event) => (
                      <Link to={`/rsvp/${event.slug}`} className="ig-dc-card" key={event.id}>
                        <span className="ig-dc-card-media">
                          <EventImage event={event} className="ig-dc-card-img" />
                          <span className="ig-dc-mode">{formatMode(event)}</span>
                        </span>
                        <span className="ig-dc-card-copy">
                          <span className="ig-dc-card-title">{event.title}</span>
                          <span>{formatWhen(event.eventDate)}</span>
                          <span>{formatWhere(event)}</span>
                          <span className="ig-dc-card-foot">
                            <span>{formatGoing(event.rsvpCount)}</span>
                            <strong>RSVP</strong>
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                )}

                {hasMore && (
                  <div className="ig-dc-more">
                    <button type="button" onClick={loadMore} disabled={loadingMore}>
                      {loadingMore ? (
                        <>
                          <span className="ig-dc-spin" aria-hidden="true" />
                          Loading...
                        </>
                      ) : 'Show more events'}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          <section className="ig-dc-cta-wrap">
            <div className="ig-dc-cta">
              <img src="/landing/cta.jpg" alt="" loading="lazy" />
              <div className="ig-dc-cta-glow" aria-hidden="true" />
              <h2>Hosting an event? List it here.</h2>
              <p>Create an RSVP page on Ingather and put it in front of people looking for things to attend.</p>
              <button type="button" onClick={() => navigate(hostPath)}>{hostLabel}</button>
            </div>
          </section>

          <footer className="ig-wl-foot">
            <span>&copy; 2026 Ingather. All rights reserved.</span>
            <span>Made in Nigeria</span>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default DiscoverPage;
