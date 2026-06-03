import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { getPreEvent } from '../api/preEventService';
import DashboardShell from '../components/DashboardShell';
import { useToast } from '../components/Toast';
import '../styles/PreEvents.css';

const FIELD_LABELS = {
  emailAddress: 'Email Address',
  fullName: 'Full Name',
  phoneNumber: 'Phone Number',
  school: 'School',
  organization: 'Organization',
  ticketType: 'Ticket Type'
};

const OPTIONAL_FIELDS = ['fullName', 'phoneNumber', 'school', 'organization', 'ticketType'];
const PAGE_SIZE = 10;

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

const formatSubmittedAt = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

function PreEventDetail() {
  const { id } = useParams();
  const [preEvent, setPreEvent] = useState(null);
  const [rsvps, setRsvps] = useState([]);
  const [analytics, setAnalytics] = useState({ totalRsvps: 0, todayRsvps: 0, velocity: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const toast = useToast();

  useEffect(() => {
    const loadDetail = async () => {
      try {
        setLoading(true);
        const response = await getPreEvent(id);
        setPreEvent(response.preEvent);
        setRsvps(response.rsvps || []);
        setAnalytics(response.analytics || { totalRsvps: 0, todayRsvps: 0, velocity: [] });
      } catch (error) {
        toast.error(error.response?.data?.error || 'Unable to load pre-event dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [id, toast]);

  useEffect(() => {
    setPage(0);
  }, [search]);

  const columns = useMemo(() => {
    if (!preEvent) return ['emailAddress'];
    const selected = ['emailAddress'];
    OPTIONAL_FIELDS.forEach((field) => {
      if (preEvent.rsvpFields?.[field]) selected.push(field);
    });
    selected.push('createdAt');
    return selected;
  }, [preEvent]);

  const filteredRsvps = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rsvps;
    return rsvps.filter((rsvp) => (
      [rsvp.emailAddress, rsvp.fullName, rsvp.phoneNumber, rsvp.school, rsvp.organization, rsvp.ticketType]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(query))
    ));
  }, [rsvps, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRsvps.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visibleRsvps = filteredRsvps.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const copyLink = async () => {
    if (!preEvent?.publicUrl) return;
    try {
      await navigator.clipboard.writeText(preEvent.publicUrl);
      toast.success('RSVP link copied');
    } catch (error) {
      toast.error('Unable to copy RSVP link');
    }
  };

  if (loading) {
    return (
      <DashboardShell pageTitle="Pre-Event Dashboard" activeNav="pre-events">
        <div className="pre-events-page">
          <div className="pre-events-empty">Loading pre-event dashboard...</div>
        </div>
      </DashboardShell>
    );
  }

  if (!preEvent) {
    return (
      <DashboardShell pageTitle="Pre-Event Dashboard" activeNav="pre-events">
        <div className="pre-events-page">
          <div className="pre-events-empty">Pre-event not found.</div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell pageTitle="Pre-Event Dashboard" activeNav="pre-events">
      <div className="pre-events-page">
        <section className="pre-event-detail-hero">
          <div className="pre-event-detail-copy">
            <a href="/pre-events" className="pre-event-back-link">Back to Pre-Events</a>
            <span className="pre-events-kicker">RSVP dashboard</span>
            <h1>{preEvent.title}</h1>
            <p>{formatDateTime(preEvent.eventDate)}</p>
            <div className="pre-event-detail-actions">
              <button type="button" onClick={copyLink}>Copy RSVP Link</button>
              <a href={preEvent.publicUrl} target="_blank" rel="noreferrer">Open Public Page</a>
            </div>
          </div>
          <div className="pre-event-detail-media">
            {preEvent.bannerUrl ? (
              <img src={preEvent.bannerUrl} alt={preEvent.title} />
            ) : (
              <div className="pre-event-card-fallback">RSVP</div>
            )}
          </div>
        </section>

        <section className="pre-event-metric-grid">
          <article className="pre-event-metric-card primary">
            <span>Total RSVPs</span>
            <strong>{analytics.totalRsvps}</strong>
            <p>People who secured event access before check-in.</p>
          </article>
          <article className="pre-event-metric-card">
            <span>Today</span>
            <strong>{analytics.todayRsvps}</strong>
            <p>New RSVPs collected today.</p>
          </article>
          <article className="pre-event-metric-card">
            <span>Status</span>
            <strong>{preEvent.isRsvpActive ? 'Open' : 'Paused'}</strong>
            <p>{preEvent.isRsvpActive ? 'The RSVP page is accepting registrations.' : 'New RSVPs are currently blocked.'}</p>
          </article>
        </section>

        <section className="pre-event-analytics-grid">
          <article className="pre-event-chart-panel">
            <div className="pre-event-section-heading">
              <div>
                <h2>Daily Registration Velocity</h2>
                <p>RSVPs over the last 14 days.</p>
              </div>
            </div>
            <div className="pre-event-chart-wrap">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.velocity || []} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="rgba(148, 163, 184, 0.22)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#8A94A6', fontSize: 12 }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#8A94A6', fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: 'rgba(232, 89, 12, 0.08)' }}
                    contentStyle={{
                      background: '#0B0B0F',
                      border: '1px solid rgba(232, 89, 12, 0.24)',
                      borderRadius: '10px',
                      color: '#fff'
                    }}
                  />
                  <Bar dataKey="registrations" fill="#E8590C" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>

        <section className="pre-event-table-panel">
          <div className="pre-event-section-heading">
            <div>
              <h2>RSVP Attendees</h2>
              <p>Dynamic columns mirror the fields selected during setup.</p>
            </div>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search RSVPs..."
              className="pre-event-search"
            />
          </div>

          <div className="pre-event-table-scroll">
            <table className="pre-event-table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column}>{column === 'createdAt' ? 'Submitted' : FIELD_LABELS[column]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRsvps.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="pre-event-table-empty">
                      No RSVP records match this view.
                    </td>
                  </tr>
                ) : (
                  visibleRsvps.map((rsvp) => (
                    <tr key={rsvp.id}>
                      {columns.map((column) => (
                        <td key={`${rsvp.id}-${column}`}>
                          {column === 'createdAt' ? formatSubmittedAt(rsvp.createdAt) : (rsvp[column] || '-')}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredRsvps.length > PAGE_SIZE && (
            <div className="pre-event-pagination">
              <button type="button" disabled={safePage === 0} onClick={() => setPage(prev => Math.max(0, prev - 1))}>
                Previous
              </button>
              <span>Page {safePage + 1} of {totalPages}</span>
              <button type="button" disabled={safePage >= totalPages - 1} onClick={() => setPage(prev => Math.min(totalPages - 1, prev + 1))}>
                Next
              </button>
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}

export default PreEventDetail;
