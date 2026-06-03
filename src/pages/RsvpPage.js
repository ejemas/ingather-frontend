import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicPreEvent, submitPreEventRsvp } from '../api/preEventService';
import '../styles/PreEvents.css';

const FIELD_LABELS = {
  emailAddress: 'Email Address',
  fullName: 'Full Name',
  phoneNumber: 'Phone Number',
  school: 'School',
  organization: 'Organization',
  ticketType: 'Ticket Type'
};

const FIELD_PLACEHOLDERS = {
  emailAddress: 'you@example.com',
  fullName: 'Your full name',
  phoneNumber: 'Phone number',
  school: 'School',
  organization: 'Organization, company, or group',
  ticketType: 'General, VIP, Student...'
};

const OPTIONAL_FIELDS = ['fullName', 'phoneNumber', 'school', 'organization', 'ticketType'];

const isValidEmail = (value) => {
  const email = String(value || '').trim();
  return email.length > 0
    && email.length <= 255
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    && email.indexOf('@') === email.lastIndexOf('@');
};

const formatDateTime = (value) => {
  if (!value) return 'Date coming soon';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date coming soon';
  return date.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
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

  return (
    <main className="rsvp-public-page">
      <section className="rsvp-public-shell">
        <div className="rsvp-public-banner">
          {preEvent.bannerUrl ? (
            <img src={preEvent.bannerUrl} alt={preEvent.title} />
          ) : (
            <div className="rsvp-public-banner-fallback">Ingather RSVP</div>
          )}
        </div>

        <div className="rsvp-public-grid">
          <section className="rsvp-public-copy">
            <span className="rsvp-public-kicker">Pre-event access</span>
            <h1>{preEvent.title}</h1>
            <p className="rsvp-public-date">{formatDateTime(preEvent.eventDate)}</p>
            {preEvent.description && <p className="rsvp-public-description">{preEvent.description}</p>}
            <div className={`rsvp-public-status ${preEvent.isRsvpActive ? 'active' : 'closed'}`}>
              {preEvent.isRsvpActive ? 'RSVPs are open' : 'RSVPs are closed'}
            </div>
          </section>

          <section className="rsvp-public-form-card">
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

                {selectedFields.map((field) => (
                  <label className="rsvp-public-field" key={field}>
                    <span>{FIELD_LABELS[field]}</span>
                    <input
                      type={field === 'emailAddress' ? 'email' : 'text'}
                      value={formData[field] || ''}
                      onChange={(event) => updateField(field, event.target.value)}
                      placeholder={FIELD_PLACEHOLDERS[field]}
                      disabled={!preEvent.isRsvpActive || submitting}
                      maxLength={field === 'emailAddress' ? 255 : 255}
                      required
                    />
                    {errors[field] && <small>{errors[field]}</small>}
                  </label>
                ))}

                <button type="submit" className="rsvp-public-submit" disabled={!preEvent.isRsvpActive || submitting}>
                  {submitting ? 'Securing access...' : 'Claim Event Access'}
                </button>
              </form>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

export default RsvpPage;
