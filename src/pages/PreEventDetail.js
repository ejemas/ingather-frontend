import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { addManualPreEventRsvp, getPreEvent, resendRsvpQrEmail, updatePreEvent } from '../api/preEventService';
import { getPrograms } from '../api/programService';
import DashboardShell from '../components/DashboardShell';
import { useToast } from '../components/Toast';
import CustomFieldBuilderModal from '../components/CustomFieldBuilderModal';
import { MAX_CUSTOM_FIELDS, formatCustomAnswer } from '../utils/customFields';
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

const FIELD_PLACEHOLDERS = {
  emailAddress: 'you@example.com',
  fullName: 'Full name',
  phoneNumber: 'Phone number',
  school: 'School',
  link: 'https://github.com/attendee',
  textarea: 'Write the attendee response',
  organization: 'Organization, company, or group',
  ticketType: 'General, VIP, Student...',
  address: 'Address',
  department: 'Department',
  fellowship: 'Group',
  age: 'Age'
};

const isValidEmail = (value) => {
  const email = String(value || '').trim();
  return email.length > 0
    && email.length <= 255
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    && email.indexOf('@') === email.lastIndexOf('@');
};

const isValidHttpUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return false;
  try {
    const url = new URL(raw);
    return ['http:', 'https:'].includes(url.protocol);
  } catch (error) {
    return false;
  }
};

const isFutureDiscoverDate = (value) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() >= Date.now() - (12 * 60 * 60 * 1000);
};

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

function ManualRsvpModal({ preEvent, customFormSchema, submitting, onClose, onSubmit }) {
  const [formData, setFormData] = useState({ emailAddress: '', attendanceMode: '', customResponses: {} });
  const [sendQrEmail, setSendQrEmail] = useState(true);
  const [errors, setErrors] = useState({});

  const selectedFields = useMemo(() => {
    const fields = ['emailAddress'];
    OPTIONAL_FIELDS.forEach((field) => {
      if (preEvent?.rsvpFields?.[field]) fields.push(field);
    });
    return fields;
  }, [preEvent]);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const updateCustomField = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      customResponses: {
        ...(prev.customResponses || {}),
        [fieldId]: value
      }
    }));
    setErrors(prev => ({ ...prev, [fieldId]: '' }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!isValidEmail(formData.emailAddress)) {
      nextErrors.emailAddress = 'Enter a valid email address.';
    }

    if (preEvent?.virtualAttendanceEnabled && !['physical', 'virtual'].includes(formData.attendanceMode)) {
      nextErrors.attendanceMode = 'Please select how this attendee will attend.';
    }

    selectedFields.forEach((field) => {
      if (field === 'emailAddress' || field === 'firstTimer') return;

      if (field === 'link') {
        if (!String(formData.linkUrl || '').trim()) {
          nextErrors.linkUrl = 'Link is required.';
        } else if (!isValidHttpUrl(formData.linkUrl)) {
          nextErrors.linkUrl = 'Enter a valid link starting with http:// or https://.';
        }
        return;
      }

      if (field === 'textarea') {
        if (!String(formData.textareaResponse || '').trim()) {
          nextErrors.textareaResponse = 'Response is required.';
        }
        return;
      }

      if (field === 'age') {
        const age = Number(formData.age);
        if (!String(formData.age || '').trim()) {
          nextErrors.age = 'Age is required.';
        } else if (!Number.isInteger(age) || age < 1 || age > 120) {
          nextErrors.age = 'Enter an age between 1 and 120.';
        }
        return;
      }

      if (!String(formData[field] || '').trim()) {
        nextErrors[field] = `${FIELD_LABELS[field]} is required.`;
      }
    });

    (customFormSchema || []).forEach((field) => {
      const value = formData.customResponses?.[field.id];
      if (field.type === 'checkbox') {
        if (field.required && (!Array.isArray(value) || value.length === 0)) {
          nextErrors[field.id] = `${field.label} is required.`;
        }
        return;
      }

      if (field.required && !String(value || '').trim()) {
        nextErrors[field.id] = `${field.label} is required.`;
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = (event) => {
    event.preventDefault();
    if (!validate()) return;
    onSubmit(formData, sendQrEmail);
  };

  return (
    <div className="pre-event-manual-overlay" role="presentation" onMouseDown={onClose}>
      <form
        className="pre-event-manual-modal"
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-rsvp-title"
      >
        <div className="pre-event-manual-header">
          <div>
            <span>Manual RSVP entry</span>
            <h3 id="manual-rsvp-title">Add pre-registered attendee</h3>
            <p>Save someone as pre-registered so live QR fast-track can check them in by email.</p>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Close manual RSVP entry">x</button>
        </div>

        <div className="pre-event-manual-body">
          {preEvent?.virtualAttendanceEnabled && (
            <fieldset className="pre-event-manual-choice-group">
              <legend>How will this attendee attend? *</legend>
              <label>
                <input
                  type="radio"
                  name="manualAttendanceMode"
                  value="physical"
                  checked={formData.attendanceMode === 'physical'}
                  onChange={(event) => updateField('attendanceMode', event.target.value)}
                  disabled={submitting}
                />
                <span>Physical</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="manualAttendanceMode"
                  value="virtual"
                  checked={formData.attendanceMode === 'virtual'}
                  onChange={(event) => updateField('attendanceMode', event.target.value)}
                  disabled={submitting}
                />
                <span>Virtual</span>
              </label>
              {errors.attendanceMode && <small>{errors.attendanceMode}</small>}
            </fieldset>
          )}

          <div className="pre-event-manual-grid">
            {selectedFields.map((field) => {
              if (field === 'firstTimer') {
                return (
                  <label className="pre-event-manual-check" key={field}>
                    <input
                      type="checkbox"
                      checked={Boolean(formData.firstTimer)}
                      onChange={(event) => updateField('firstTimer', event.target.checked)}
                      disabled={submitting}
                    />
                    <span>I am a first-time attendee</span>
                  </label>
                );
              }

              if (field === 'sex') {
                return (
                  <label className="pre-event-manual-field" key={field}>
                    <span>{FIELD_LABELS[field]}</span>
                    <select
                      value={formData.sex || ''}
                      onChange={(event) => updateField('sex', event.target.value)}
                      disabled={submitting}
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                    {errors[field] && <small>{errors[field]}</small>}
                  </label>
                );
              }

              if (field === 'link') {
                return (
                  <label className="pre-event-manual-field" key={field}>
                    <span>{FIELD_LABELS[field]}</span>
                    <input
                      type="url"
                      value={formData.linkUrl || ''}
                      onChange={(event) => updateField('linkUrl', event.target.value)}
                      placeholder={FIELD_PLACEHOLDERS[field]}
                      disabled={submitting}
                    />
                    {errors.linkUrl && <small>{errors.linkUrl}</small>}
                  </label>
                );
              }

              if (field === 'textarea') {
                const textareaLabel = preEvent.rsvpFieldConfig?.textareaLabel || FIELD_LABELS.textarea;
                return (
                  <label className="pre-event-manual-field wide" key={field}>
                    <span>{textareaLabel}</span>
                    <textarea
                      value={formData.textareaResponse || ''}
                      onChange={(event) => updateField('textareaResponse', event.target.value)}
                      placeholder={FIELD_PLACEHOLDERS[field]}
                      disabled={submitting}
                      rows={4}
                      maxLength={5000}
                    />
                    {errors.textareaResponse && <small>{errors.textareaResponse}</small>}
                  </label>
                );
              }

              return (
                <label className="pre-event-manual-field" key={field}>
                  <span>{FIELD_LABELS[field]}</span>
                  <input
                    type={field === 'emailAddress' ? 'email' : field === 'age' ? 'number' : 'text'}
                    value={formData[field] || ''}
                    onChange={(event) => updateField(field, event.target.value)}
                    placeholder={FIELD_PLACEHOLDERS[field]}
                    disabled={submitting}
                    maxLength={field === 'emailAddress' ? 255 : undefined}
                    min={field === 'age' ? 1 : undefined}
                    max={field === 'age' ? 120 : undefined}
                  />
                  {errors[field] && <small>{errors[field]}</small>}
                </label>
              );
            })}
          </div>

          {(customFormSchema || []).map((field) => {
            const value = formData.customResponses?.[field.id];
            if (field.type === 'radio') {
              return (
                <fieldset className="pre-event-manual-choice-group" key={field.id}>
                  <legend>{field.label}{field.required ? ' *' : ''}</legend>
                  {field.options.map(option => (
                    <label key={option}>
                      <input
                        type="radio"
                        name={`manual-${field.id}`}
                        value={option}
                        checked={value === option}
                        onChange={(event) => updateCustomField(field.id, event.target.value)}
                        disabled={submitting}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                  {errors[field.id] && <small>{errors[field.id]}</small>}
                </fieldset>
              );
            }

            if (field.type === 'checkbox') {
              const selected = Array.isArray(value) ? value : [];
              return (
                <fieldset className="pre-event-manual-choice-group" key={field.id}>
                  <legend>{field.label}{field.required ? ' *' : ''}</legend>
                  {field.options.map(option => (
                    <label key={option}>
                      <input
                        type="checkbox"
                        value={option}
                        checked={selected.includes(option)}
                        onChange={(event) => {
                          const next = event.target.checked
                            ? [...selected, option]
                            : selected.filter(item => item !== option);
                          updateCustomField(field.id, next);
                        }}
                        disabled={submitting}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                  {errors[field.id] && <small>{errors[field.id]}</small>}
                </fieldset>
              );
            }

            return (
              <label className="pre-event-manual-field wide" key={field.id}>
                <span>{field.label}{field.required ? ' *' : ''}</span>
                <input
                  type="text"
                  value={value || ''}
                  onChange={(event) => updateCustomField(field.id, event.target.value)}
                  placeholder="Type the attendee answer"
                  disabled={submitting}
                  maxLength={500}
                />
                {errors[field.id] && <small>{errors[field.id]}</small>}
              </label>
            );
          })}

          <label className="pre-event-manual-email-toggle">
            <input
              type="checkbox"
              checked={sendQrEmail}
              onChange={(event) => setSendQrEmail(event.target.checked)}
              disabled={submitting}
            />
            <span>
              <strong>Send RSVP QR email now</strong>
              <small>Attendee receives their QR code and short RSVP token immediately.</small>
            </span>
          </label>
        </div>

        <div className="pre-event-manual-actions">
          <button type="button" className="pre-event-manual-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="pre-events-primary-btn" disabled={submitting}>
            {submitting ? 'Adding...' : 'Add RSVP'}
          </button>
        </div>
      </form>
    </div>
  );
}

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
  const [eventMeta, setEventMeta] = useState({ venueName: '', city: '', discoverEnabled: false, virtualAttendanceEnabled: false });
  const [customFormSchema, setCustomFormSchema] = useState([]);
  const [customFieldModal, setCustomFieldModal] = useState(null);
  const [savingLink, setSavingLink] = useState(false);
  const [resendingRsvpId, setResendingRsvpId] = useState(null);
  const [manualRsvpOpen, setManualRsvpOpen] = useState(false);
  const [manualRsvpSubmitting, setManualRsvpSubmitting] = useState(false);
  const toast = useToast();

  const loadDetail = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const response = await getPreEvent(id);
      setPreEvent(response.preEvent);
      setLinkedProgramId(response.preEvent?.programId ? String(response.preEvent.programId) : '');
      setEventMeta({
        venueName: response.preEvent?.venueName || '',
        city: response.preEvent?.city || '',
        discoverEnabled: response.preEvent?.discoverEnabled === true,
        virtualAttendanceEnabled: response.preEvent?.virtualAttendanceEnabled === true
      });
      setCustomFormSchema(response.preEvent?.customFormSchema || []);
      setRsvps(response.rsvps || []);
      setAnalytics(response.analytics || { totalRsvps: 0, todayRsvps: 0, velocity: [] });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to load pre-event dashboard');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

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
    if (preEvent.virtualAttendanceEnabled || rsvps.some(rsvp => rsvp.attendanceMode)) selected.push('attendanceMode');
    OPTIONAL_FIELDS.forEach((field) => {
      if (preEvent.rsvpFields?.[field]) selected.push(field);
    });
    selected.push('createdAt');
    customFormSchema.forEach((field) => {
      selected.push(`custom:${field.id}`);
    });
    return selected;
  }, [preEvent, customFormSchema, rsvps]);

  const filteredRsvps = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rsvps;
    return rsvps.filter((rsvp) => (
      [rsvp.emailAddress, rsvp.fullName, rsvp.phoneNumber, rsvp.school, rsvp.organization, rsvp.ticketType]
        .concat([rsvp.linkUrl, rsvp.textareaResponse, rsvp.address, rsvp.department, rsvp.fellowship, rsvp.age, rsvp.sex, rsvp.attendanceMode, rsvp.firstTimer ? 'first timer yes' : 'first timer no'])
        .concat(Object.values(rsvp.customAnswers || {}).flat())
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(query))
    ));
  }, [rsvps, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRsvps.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visibleRsvps = filteredRsvps.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const physicalRsvpCount = rsvps.filter(rsvp => rsvp.attendanceMode === 'physical').length;
  const virtualRsvpCount = rsvps.filter(rsvp => rsvp.attendanceMode === 'virtual').length;
  const showAttendanceModeStats = preEvent?.virtualAttendanceEnabled || physicalRsvpCount > 0 || virtualRsvpCount > 0;

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
        virtualAttendanceEnabled: eventMeta.virtualAttendanceEnabled,
        rsvpFields: preEvent.rsvpFields,
        rsvpFieldConfig: preEvent.rsvpFieldConfig,
        customFormSchema,
        isRsvpActive: preEvent.isRsvpActive,
        programId: linkedProgramId || null
      });
      setPreEvent(response.preEvent);
      setLinkedProgramId(response.preEvent?.programId ? String(response.preEvent.programId) : '');
      setEventMeta({
        venueName: response.preEvent?.venueName || '',
        city: response.preEvent?.city || '',
        discoverEnabled: response.preEvent?.discoverEnabled === true,
        virtualAttendanceEnabled: response.preEvent?.virtualAttendanceEnabled === true
      });
      setCustomFormSchema(response.preEvent?.customFormSchema || []);
      const canAppearOnDiscover = response.preEvent?.discoverEnabled === true
        && response.preEvent?.isRsvpActive
        && isFutureDiscoverDate(response.preEvent?.eventDate);
      toast.success(canAppearOnDiscover
        ? 'Discover settings saved. Refresh the landing page or /discover to see it listed.'
        : 'Settings saved. This event is hidden from Discover until RSVP is active and the event is upcoming.');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to update live program link');
    } finally {
      setSavingLink(false);
    }
  };

  const getColumnLabel = (column) => {
    if (column === 'createdAt') return 'Submitted';
    if (column === 'attendanceMode') return 'Attendance Mode';
    if (column.startsWith('custom:')) {
      const fieldId = column.slice('custom:'.length);
      return customFormSchema.find(field => field.id === fieldId)?.label || 'Custom Field';
    }
    if (column === 'textarea') return preEvent.rsvpFieldConfig?.textareaLabel || FIELD_LABELS.textarea;
    return FIELD_LABELS[column] || column;
  };

  const getRsvpValue = (rsvp, column) => {
    if (column === 'createdAt') return formatSubmittedAt(rsvp.createdAt);
    if (column.startsWith('custom:')) return formatCustomAnswer(rsvp.customAnswers?.[column.slice('custom:'.length)]);
    if (column === 'attendanceMode') return rsvp.attendanceMode ? rsvp.attendanceMode.charAt(0).toUpperCase() + rsvp.attendanceMode.slice(1) : '-';
    if (column === 'firstTimer') return rsvp.firstTimer ? 'Yes' : 'No';
    if (column === 'link') return rsvp.linkUrl || '-';
    if (column === 'textarea') return rsvp.textareaResponse || '-';
    return rsvp[column] || '-';
  };

  const openCustomFieldModal = (field = null) => {
    if (!field && customFormSchema.length >= MAX_CUSTOM_FIELDS) {
      toast.error(`You can add up to ${MAX_CUSTOM_FIELDS} custom fields.`);
      return;
    }
    setCustomFieldModal(field || {});
  };

  const handleSaveCustomField = (field) => {
    setCustomFormSchema(prev => {
      const exists = prev.some(item => item.id === field.id);
      return exists ? prev.map(item => item.id === field.id ? field : item) : [...prev, field];
    });
    setCustomFieldModal(null);
  };

  const handleRemoveCustomField = (fieldId) => {
    setCustomFormSchema(prev => prev.filter(field => field.id !== fieldId));
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

  const addManualRsvp = async (formData, sendQrEmail) => {
    try {
      setManualRsvpSubmitting(true);
      const response = await addManualPreEventRsvp(preEvent.id, formData, sendQrEmail);
      await loadDetail(false);
      setManualRsvpOpen(false);

      if (response.emailWarning) {
        toast.warning(response.message || response.emailWarning);
      } else if (sendQrEmail && response.qrEmailSent) {
        toast.success('RSVP added and QR email sent.');
      } else {
        toast.success(response.message || 'RSVP added successfully.');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to add RSVP manually');
    } finally {
      setManualRsvpSubmitting(false);
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
          {showAttendanceModeStats && (
            <>
              <article className="pre-event-metric-card">
                <span>Physical RSVPs</span>
                <strong>{physicalRsvpCount}</strong>
                <p>Attendees planning to join in person.</p>
              </article>
              <article className="pre-event-metric-card">
                <span>Virtual RSVPs</span>
                <strong>{virtualRsvpCount}</strong>
                <p>Attendees planning to join online.</p>
              </article>
            </>
          )}
        </section>

        <section className="pre-event-form-card pre-event-link-card">
          <div className="pre-event-card-heading">
            <div>
              <h2>Event Visibility & Live Link</h2>
              <p>Control public discovery and connect this RSVP page to a live collect-data program.</p>
            </div>
          </div>
          <label className={`pre-event-discover-switch ${eventMeta.discoverEnabled ? 'enabled' : ''}`}>
            <input
              type="checkbox"
              checked={eventMeta.discoverEnabled}
              onChange={(event) => setEventMeta(prev => ({ ...prev, discoverEnabled: event.target.checked }))}
            />
            <span className="pre-event-switch-track" aria-hidden="true">
              <span className="pre-event-switch-thumb" />
            </span>
            <span className="pre-event-switch-copy">
              <strong>Show on Discover Events</strong>
              <small>List this RSVP page publicly on the landing Discover section.</small>
            </span>
          </label>
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
            <div className="pre-event-save-cell">
              <button type="button" className="pre-events-primary-btn" onClick={saveProgramLink} disabled={savingLink}>
                {savingLink ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
          <p className="pre-event-discover-note">
            Discover is opt-in. Private RSVP links remain accessible when public discovery is off. Only active, upcoming RSVP events appear on the landing page and /discover after refresh.
          </p>
          <label className={`pre-event-virtual-switch ${eventMeta.virtualAttendanceEnabled ? 'enabled' : ''}`}>
            <input
              type="checkbox"
              checked={eventMeta.virtualAttendanceEnabled}
              onChange={(event) => setEventMeta(prev => ({ ...prev, virtualAttendanceEnabled: event.target.checked }))}
            />
            <span className="pre-event-switch-track" aria-hidden="true">
              <span className="pre-event-switch-thumb" />
            </span>
            <span className="pre-event-switch-copy">
              <strong>Track virtual attendance</strong>
              <small>Ask attendees whether they will attend physically or virtually.</small>
            </span>
          </label>
        </section>

        <section className="pre-event-form-card">
          <div className="pre-event-card-heading">
            <div>
              <h2>Customized Fields</h2>
              <p>Add extra RSVP questions for attendees. Click Save Settings above after editing.</p>
            </div>
            <button type="button" className="custom-field-add-btn" onClick={() => openCustomFieldModal()}>
              Add Custom Field
            </button>
          </div>
          <div className="custom-field-list">
            {customFormSchema.length === 0 ? (
              <p className="pre-event-discover-note">No custom RSVP questions yet.</p>
            ) : customFormSchema.map(field => (
              <div className="custom-field-card" key={field.id}>
                <div>
                  <strong>{field.label}</strong>
                  <span>
                    {field.type === 'text' ? 'Short Text' : field.type === 'radio' ? 'Radio Buttons' : 'Checkboxes'}
                    {field.required ? ' · Required' : ' · Optional'}
                    {field.options?.length ? ` · ${field.options.join(', ')}` : ''}
                  </span>
                </div>
                <div className="custom-field-card-actions">
                  <button type="button" onClick={() => openCustomFieldModal(field)}>Edit</button>
                  <button type="button" onClick={() => handleRemoveCustomField(field.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
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
            <div className="pre-event-table-actions">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search RSVPs..."
                className="pre-event-search"
              />
              <button type="button" className="pre-event-add-manual-btn" onClick={() => setManualRsvpOpen(true)}>
                + Add Manually
              </button>
            </div>
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
                          ) : column === 'attendanceMode' && rsvp.attendanceMode ? (
                            <span className={`pre-event-mode-badge ${rsvp.attendanceMode}`}>
                              {getRsvpValue(rsvp, column)}
                            </span>
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
        {customFieldModal && (
          <CustomFieldBuilderModal
            field={customFieldModal.id ? customFieldModal : null}
            onClose={() => setCustomFieldModal(null)}
            onSave={handleSaveCustomField}
          />
        )}
        {manualRsvpOpen && (
          <ManualRsvpModal
            preEvent={preEvent}
            customFormSchema={customFormSchema}
            submitting={manualRsvpSubmitting}
            onClose={() => {
              if (!manualRsvpSubmitting) setManualRsvpOpen(false);
            }}
            onSubmit={addManualRsvp}
          />
        )}
      </div>
    </DashboardShell>
  );
}

export default PreEventDetail;
