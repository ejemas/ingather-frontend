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
import { getPreEvent, resendRsvpQrEmail, updatePreEvent } from '../api/preEventService';
import { getPrograms } from '../api/programService';
import DashboardShell from '../components/DashboardShell';
import { useToast } from '../components/Toast';
import '../styles/PreEvents.css';

const FIELD_LABELS = {
  emailAddress: 'Email Address',
  fullName: 'Full Name',
  phoneNumber: 'Phone Number',
  school: 'School',
  link: 'Link',
  textarea: 'Additional Response',
  organization: 'Organization',
  ticketType: 'Ticket Type',
  address: 'Address',
  firstTimer: 'First-Timer',
  department: 'Department',
  fellowship: 'Group',
  age: 'Age',
  sex: 'Gender'
};

const OPTIONAL_FIELDS = [
  'fullName',
  'phoneNumber',
  'school',
  'link',
  'textarea',
  'organization',
  'ticketType',
  'address',
  'firstTimer',
  'department',
  'fellowship',
  'age',
  'sex'
];
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
  const [programOptions, setProgramOptions] = useState([]);
  const [linkedProgramId, setLinkedProgramId] = useState('');
  const [eventMeta, setEventMeta] = useState({ venueName: '', city: '', discoverEnabled: false });
  const [savingLink, setSavingLink] = useState(false);
  const [resendingRsvpId, setResendingRsvpId] = useState(null);
  const toast = useToast();

  useEffect(() => {
    const loadDetail = async () => {
      try {
        setLoading(true);
        const response = await getPreEvent(id);
        setPreEvent(response.preEvent);
        setLinkedProgramId(response.preEvent?.programId ? String(response.preEvent.programId) : '');
        setEventMeta({
          venueName: response.preEvent?.venueName || '',
          city: response.preEvent?.city || '',
          discoverEnabled: response.preEvent?.discoverEnabled === true
        });
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
    const loadPrograms = async () => {
      try {
        const response = await getPrograms();
        setProgramOptions((response.programs || []).filter(program => program.trackingMode === 'collect-data'));
      } catch (error) {
        setProgramOptions([]);
      }
    };

    loadPrograms();
  }, []);

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
        .concat([rsvp.linkUrl, rsvp.textareaResponse, rsvp.address, rsvp.department, rsvp.fellowship, rsvp.age, rsvp.sex, rsvp.firstTimer ? 'first timer yes' : 'first timer no'])
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

  const saveProgramLink = async () => {
    if (!preEvent) return;
    if (eventMeta.discoverEnabled && !eventMeta.city.trim()) {
      toast.error('City is required when showing this event on Discover');
      return;
    }

    try {
      setSavingLink(true);
      const response = await updatePreEvent(preEvent.id, {
        title: preEvent.title,
        eventDate: preEvent.eventDate,
        description: preEvent.description,
        venueName: eventMeta.venueName,
        city: eventMeta.city,
        discoverEnabled: eventMeta.discoverEnabled,
        rsvpFields: preEvent.rsvpFields,
        rsvpFieldConfig: preEvent.rsvpFieldConfig,
        isRsvpActive: preEvent.isRsvpActive,
        programId: linkedProgramId || null
      });
      setPreEvent(response.preEvent);
      setLinkedProgramId(response.preEvent?.programId ? String(response.preEvent.programId) : '');
      setEventMeta({
        venueName: response.preEvent?.venueName || '',
        city: response.preEvent?.city || '',
        discoverEnabled: response.preEvent?.discoverEnabled === true
      });
      toast.success('Pre-event settings updated');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to update live program link');
    } finally {
      setSavingLink(false);
    }
  };

  const getColumnLabel = (column) => {
    if (column === 'createdAt') return 'Submitted';
    if (column === 'textarea') return preEvent.rsvpFieldConfig?.textareaLabel || FIELD_LABELS.textarea;
    return FIELD_LABELS[column] || column;
  };

  const getRsvpValue = (rsvp, column) => {
    if (column === 'createdAt') return formatSubmittedAt(rsvp.createdAt);
    if (column === 'firstTimer') return rsvp.firstTimer ? 'Yes' : 'No';
    if (column === 'link') return rsvp.linkUrl || '-';
    if (column === 'textarea') return rsvp.textareaResponse || '-';
    return rsvp[column] || '-';
  };

  const getQrStatusLabel = (rsvp) => {
    if (rsvp.status === 'checked_in') return 'Checked in';
    if (rsvp.checkinQrLastSentAt || rsvp.checkinQrSentAt) return 'QR sent';
    return 'Not sent';
  };

  const resendQr = async (rsvp) => {
    try {
      setResendingRsvpId(rsvp.id);
      const response = await resendRsvpQrEmail(preEvent.id, rsvp.id);
      if (response.rsvp) {
        setRsvps(prev => prev.map(item => item.id === response.rsvp.id ? response.rsvp : item));
      }
      toast.success('RSVP QR email resent');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to resend RSVP QR email');
    } finally {
      setResendingRsvpId(null);
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

        <section className="pre-event-form-card pre-event-link-card">
          <div className="pre-event-card-heading">
            <div>
              <h2>Event Visibility & Live Link</h2>
              <p>Control public discovery and connect this RSVP page to a live collect-data program.</p>
            </div>
            <label className="pre-event-active-toggle">
              <input
                type="checkbox"
                checked={eventMeta.discoverEnabled}
                onChange={(event) => setEventMeta(prev => ({ ...prev, discoverEnabled: event.target.checked }))}
              />
              <span>Show on Discover Events</span>
            </label>
          </div>
          <div className="pre-event-link-row pre-event-link-grid">
            <label className="pre-event-field">
              <span>Venue Name</span>
              <input
                type="text"
                value={eventMeta.venueName}
                onChange={(event) => setEventMeta(prev => ({ ...prev, venueName: event.target.value }))}
                placeholder="Civic Centre, Main Auditorium"
                maxLength={255}
              />
            </label>
            <label className="pre-event-field">
              <span>City</span>
              <input
                type="text"
                value={eventMeta.city}
                onChange={(event) => setEventMeta(prev => ({ ...prev, city: event.target.value }))}
                placeholder="Lagos"
                maxLength={120}
              />
            </label>
            <label className="pre-event-field">
              <span>Live Program</span>
              <select value={linkedProgramId} onChange={(event) => setLinkedProgramId(event.target.value)}>
                <option value="">Not linked yet</option>
                {programOptions.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.title} - {program.date}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="pre-events-primary-btn" onClick={saveProgramLink} disabled={savingLink}>
              {savingLink ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
          <p className="pre-event-discover-note">
            Discover is opt-in. Private RSVP links remain accessible even when public discovery is off.
          </p>
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
                    <th key={column}>{getColumnLabel(column)}</th>
                  ))}
                  <th>QR Email</th>
                  <th>Checked In</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRsvps.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 3} className="pre-event-table-empty">
                      No RSVP records match this view.
                    </td>
                  </tr>
                ) : (
                  visibleRsvps.map((rsvp) => (
                    <tr key={rsvp.id}>
                      {columns.map((column) => (
                        <td key={`${rsvp.id}-${column}`}>
                          {column === 'link' && rsvp.linkUrl ? (
                            <a className="pre-event-table-link" href={rsvp.linkUrl} target="_blank" rel="noreferrer">Open link</a>
                          ) : (
                            getRsvpValue(rsvp, column)
                          )}
                        </td>
                      ))}
                      <td>
                        <span className={`pre-event-status-pill ${rsvp.status === 'checked_in' ? 'checked' : rsvp.checkinQrLastSentAt ? 'sent' : 'pending'}`}>
                          {getQrStatusLabel(rsvp)}
                        </span>
                      </td>
                      <td>{rsvp.checkedInAt ? formatSubmittedAt(rsvp.checkedInAt) : '-'}</td>
                      <td>
                        <button
                          type="button"
                          className="pre-event-table-action"
                          onClick={() => resendQr(rsvp)}
                          disabled={rsvp.status === 'checked_in' || resendingRsvpId === rsvp.id}
                        >
                          {resendingRsvpId === rsvp.id ? 'Sending...' : 'Resend QR'}
                        </button>
                      </td>
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
