import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicPreEvent, submitPreEventRsvp } from '../api/preEventService';
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

const FIELD_PLACEHOLDERS = {
  emailAddress: 'you@example.com',
  fullName: 'Your full name',
  phoneNumber: 'Phone number',
  school: 'School',
  link: 'https://github.com/yourname',
  textarea: 'Write your response here',
  organization: 'Organization, company, or group',
  ticketType: 'General, VIP, Student...',
  address: 'Your address',
  department: 'Department',
  fellowship: 'Group',
  age: 'Age'
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

const formatEventDate = (value) => {
  if (!value) return 'Date coming soon';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date coming soon';
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
};

const formatEventTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });
};

const formatDateBadge = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { month: 'TBD', day: '--' };
  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: date.toLocaleDateString('en-US', { day: 'numeric' })
  };
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const rgbToHex = (r, g, b) => (
  `#${[r, g, b].map(channel => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0')).join('')}`
);

const buildThemeFromRgb = (r, g, b) => {
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const accent = rgbToHex(r, g, b);
  const bgR = luminance > 0.58 ? r * 0.25 : r * 0.42;
  const bgG = luminance > 0.58 ? g * 0.25 : g * 0.42;
  const bgB = luminance > 0.58 ? b * 0.25 : b * 0.42;
  return {
    accent,
    bg: rgbToHex(bgR, bgG, bgB),
    surface: luminance > 0.58 ? 'rgba(255, 255, 255, 0.88)' : 'rgba(16, 16, 18, 0.78)',
    text: luminance > 0.58 ? '#10131A' : '#FFFFFF',
    muted: luminance > 0.58 ? '#4B5563' : 'rgba(255, 255, 255, 0.74)'
  };
};

function RsvpPage() {
  const { slug } = useParams();
  const [preEvent, setPreEvent] = useState(null);
  const [formData, setFormData] = useState({ emailAddress: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState('');
  const [visualTheme, setVisualTheme] = useState({
    accent: '#E8590C',
    bg: '#18181A',
    surface: 'rgba(16, 16, 18, 0.78)',
    text: '#FFFFFF',
    muted: 'rgba(255, 255, 255, 0.74)'
  });

  useEffect(() => {
    const loadPublicEvent = async () => {
      try {
        setLoading(true);
        setServerError('');
        const response = await getPublicPreEvent(slug);
        if (!response?.preEvent) {
          throw new Error('RSVP page not found.');
        }
        setPreEvent(response.preEvent);
      } catch (error) {
        setPreEvent(null);
        setServerError(error.response?.data?.error || error.message || 'This RSVP page could not be loaded.');
      } finally {
        setLoading(false);
      }
    };

    loadPublicEvent();
  }, [slug]);

  useEffect(() => {
    if (!preEvent?.bannerUrl) {
      setVisualTheme({
        accent: '#E8590C',
        bg: '#18181A',
        surface: 'rgba(16, 16, 18, 0.78)',
        text: '#FFFFFF',
        muted: 'rgba(255, 255, 255, 0.74)'
      });
      return undefined;
    }

    let cancelled = false;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 24;
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0, size, size);
        const { data } = context.getImageData(0, 0, size, size);
        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;

        for (let index = 0; index < data.length; index += 4) {
          const alpha = data[index + 3];
          if (alpha < 160) continue;
          r += data[index];
          g += data[index + 1];
          b += data[index + 2];
          count += 1;
        }

        if (!cancelled && count > 0) {
          setVisualTheme(buildThemeFromRgb(r / count, g / count, b / count));
        }
      } catch (error) {
        if (!cancelled) {
          setVisualTheme(prev => ({ ...prev, accent: '#E8590C' }));
        }
      }
    };
    image.onerror = () => {
      if (!cancelled) {
        setVisualTheme(prev => ({ ...prev, accent: '#E8590C' }));
      }
    };
    image.src = preEvent.bannerUrl;

    return () => {
      cancelled = true;
    };
  }, [preEvent?.bannerUrl]);

  const selectedFields = useMemo(() => {
    if (!preEvent) return ['emailAddress'];
    const fields = ['emailAddress'];
    OPTIONAL_FIELDS.forEach((field) => {
      if (preEvent.rsvpFields?.[field]) fields.push(field);
    });
    return fields;
  }, [preEvent]);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!isValidEmail(formData.emailAddress)) {
      nextErrors.emailAddress = 'Enter a valid email address.';
    }

    selectedFields.forEach((field) => {
      if (field === 'emailAddress') return;
      if (field === 'firstTimer') return;
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

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError('');

    if (!validate()) return;

    try {
      setSubmitting(true);
      await submitPreEventRsvp(slug, formData);
      setSuccess(true);
    } catch (error) {
      setServerError(error.response?.data?.error || 'Unable to secure your access. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="rsvp-public-page">
        <div className="rsvp-public-loading">Loading RSVP page...</div>
      </main>
    );
  }

  if (!preEvent) {
    return (
      <main className="rsvp-public-page">
        <div className="rsvp-public-error-card">
          <span>Ingather RSVP</span>
          <h1>RSVP page unavailable</h1>
          <p>{serverError || 'This RSVP page could not be loaded.'}</p>
        </div>
      </main>
    );
  }

  const dateBadge = formatDateBadge(preEvent.eventDate);
  const pageStyle = {
    '--rsvp-event-image': preEvent.bannerUrl ? `url("${preEvent.bannerUrl}")` : 'none',
    '--rsvp-theme-accent': visualTheme.accent,
    '--rsvp-theme-bg': visualTheme.bg,
    '--rsvp-theme-surface': visualTheme.surface,
    '--rsvp-theme-text': visualTheme.text,
    '--rsvp-theme-muted': visualTheme.muted
  };

  return (
    <main className="rsvp-public-page rsvp-event-detail-page" style={pageStyle}>
      <div className="rsvp-adaptive-backdrop" aria-hidden="true" />
      <nav className="rsvp-event-nav" aria-label="RSVP event navigation">
        <a href="/" aria-label="Ingather home">
          <img src="/ingather-logo.png" alt="Ingather" />
        </a>
        <div>
          <a href="/discover">Discover Events</a>
          <a href="/login">Sign in</a>
        </div>
      </nav>

      <section className="rsvp-event-shell">
        <aside className="rsvp-event-side">
          <div className="rsvp-event-flyer">
            {preEvent.bannerUrl ? (
              <img src={preEvent.bannerUrl} alt={preEvent.title} />
            ) : (
              <div className="rsvp-public-banner-fallback">Ingather RSVP</div>
            )}
          </div>
          <div className="rsvp-event-host">
            <span>Hosted By</span>
            <strong>{preEvent.churchName || 'Ingather Organizer'}</strong>
          </div>
          <div className="rsvp-event-going">
            <strong>{preEvent.rsvpCount || 0} Going</strong>
            <p>Attendees who have secured access through Ingather.</p>
          </div>
        </aside>

        <section className="rsvp-event-main">
          <span className="rsvp-public-kicker">Featured {preEvent.city ? `in ${preEvent.city}` : 'event'}</span>
          <h1>{preEvent.title}</h1>

          <div className="rsvp-event-meta-list">
            <div className="rsvp-event-meta">
              <span className="rsvp-event-date-badge">
                <small>{dateBadge.month}</small>
                <strong>{dateBadge.day}</strong>
              </span>
              <p>
                <strong>{formatEventDate(preEvent.eventDate)}</strong>
                <span>{formatEventTime(preEvent.eventDate)}</span>
              </p>
            </div>
            <div className="rsvp-event-meta">
              <span className="rsvp-event-meta-icon">⌖</span>
              <p>
                <strong>{preEvent.venueName || 'Venue details coming soon'}</strong>
                <span>{preEvent.city || 'Location will be shared by the host'}</span>
              </p>
            </div>
          </div>

          <section className="rsvp-public-form-card rsvp-event-registration">
            <div className="rsvp-registration-bar">Registration</div>
            {success ? (
              <div className="rsvp-success-state">
                <span className="rsvp-success-mark">✓</span>
                <h2>Your access is secured. See you there!</h2>
                <p>Your RSVP has been recorded by Ingather.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="rsvp-form-heading">
                  <span>Reserve your spot</span>
                  <h2>Claim Event Access</h2>
                </div>

                {!preEvent.isRsvpActive && (
                  <p className="rsvp-public-error">RSVPs are currently closed for this event.</p>
                )}

                {serverError && <p className="rsvp-public-error">{serverError}</p>}

                {selectedFields.map((field) => {
                  if (field === 'firstTimer') {
                    return (
                      <label className="rsvp-public-checkbox" key={field}>
                        <input
                          type="checkbox"
                          checked={Boolean(formData.firstTimer)}
                          onChange={(event) => updateField('firstTimer', event.target.checked)}
                          disabled={!preEvent.isRsvpActive || submitting}
                        />
                        <span>I am a first-time attendee</span>
                      </label>
                    );
                  }

                  if (field === 'sex') {
                    return (
                      <label className="rsvp-public-field" key={field}>
                        <span>{FIELD_LABELS[field]}</span>
                        <select
                          value={formData.sex || ''}
                          onChange={(event) => updateField('sex', event.target.value)}
                          disabled={!preEvent.isRsvpActive || submitting}
                          required
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
                      <label className="rsvp-public-field" key={field}>
                        <span>{FIELD_LABELS[field]}</span>
                        <input
                          type="url"
                          value={formData.linkUrl || ''}
                          onChange={(event) => updateField('linkUrl', event.target.value)}
                          placeholder={FIELD_PLACEHOLDERS[field]}
                          disabled={!preEvent.isRsvpActive || submitting}
                          required
                        />
                        {errors.linkUrl && <small>{errors.linkUrl}</small>}
                      </label>
                    );
                  }

                  if (field === 'textarea') {
                    const textareaLabel = preEvent.rsvpFieldConfig?.textareaLabel || FIELD_LABELS.textarea;
                    return (
                      <label className="rsvp-public-field rsvp-public-field-wide" key={field}>
                        <span>{textareaLabel}</span>
                        <textarea
                          value={formData.textareaResponse || ''}
                          onChange={(event) => updateField('textareaResponse', event.target.value)}
                          placeholder={FIELD_PLACEHOLDERS[field]}
                          disabled={!preEvent.isRsvpActive || submitting}
                          rows={4}
                          maxLength={5000}
                          required
                        />
                        {errors.textareaResponse && <small>{errors.textareaResponse}</small>}
                      </label>
                    );
                  }

                  return (
                    <label className="rsvp-public-field" key={field}>
                      <span>{FIELD_LABELS[field]}</span>
                      <input
                        type={field === 'emailAddress' ? 'email' : field === 'age' ? 'number' : 'text'}
                        value={formData[field] || ''}
                        onChange={(event) => updateField(field, event.target.value)}
                        placeholder={FIELD_PLACEHOLDERS[field]}
                        disabled={!preEvent.isRsvpActive || submitting}
                        maxLength={field === 'emailAddress' ? 255 : undefined}
                        min={field === 'age' ? 1 : undefined}
                        max={field === 'age' ? 120 : undefined}
                        required
                      />
                      {errors[field] && <small>{errors[field]}</small>}
                    </label>
                  );
                })}

                <button type="submit" className="rsvp-public-submit" disabled={!preEvent.isRsvpActive || submitting}>
                  {submitting ? 'Securing access...' : 'Claim Event Access'}
                </button>
              </form>
            )}
          </section>

          <section className="rsvp-event-about">
            <h2>About Event</h2>
            <p>{preEvent.description || 'More details will be shared by the organizer soon.'}</p>
          </section>
        </section>
      </section>
    </main>
  );
}

export default RsvpPage;
