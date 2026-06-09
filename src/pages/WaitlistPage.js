import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { joinWaitlist } from '../api/waitlistService';
import '../styles/Waitlist.css';

const eventSizeOptions = [
  { value: '', label: 'Select event size' },
  { value: '1-50', label: '1 - 50 attendees' },
  { value: '50-200', label: '50 - 200 attendees' },
  { value: '200-500', label: '200 - 500 attendees' },
  { value: '500+', label: '500+ attendees' }
];

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  organizationName: '',
  eventSize: '',
  website: ''
};

function WaitlistPage() {
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    if (errors[name]) {
      setErrors((current) => ({ ...current, [name]: '' }));
    }
    if (submitError) {
      setSubmitError('');
    }
  };

  const validate = () => {
    const nextErrors = {};
    const email = formData.email.trim();

    if (!formData.firstName.trim()) nextErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) nextErrors.lastName = 'Last name is required';
    if (!email) {
      nextErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Enter a valid email address';
    }
    if (!formData.eventSize) nextErrors.eventSize = 'Choose your typical event size';

    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    setSubmitError('');

    try {
      await joinWaitlist({
        ...formData,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        organizationName: formData.organizationName.trim()
      });
      setSubmittedEmail(formData.email.trim().toLowerCase());
      setFormData(initialForm);
    } catch (error) {
      setSubmitError(
        error.response?.data?.error ||
        'We could not add you to the waitlist right now. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="waitlist-page">
      <div className="waitlist-noise" aria-hidden="true"></div>
      <header className="waitlist-header">
        <Link to="/" className="waitlist-brand" aria-label="Ingather home">
          <img src="/ingather-logo.png" alt="Ingather" />
        </Link>
        <span>Invite-only access</span>
      </header>

      <main className="waitlist-shell">
        <section className="waitlist-copy" aria-labelledby="waitlist-title">
          <p className="waitlist-kicker">Built for serious event teams</p>
          <h1 id="waitlist-title">Kill the check-in queue before it starts.</h1>
          <p>
            Ingather is rolling out access in phases for organizers who need
            QR check-ins, attendee intelligence, sponsor ROI, and polished
            post-event reporting in one calm workspace.
          </p>

          <div className="waitlist-proof-grid" aria-label="Ingather waitlist highlights">
            <div>
              <strong>Live</strong>
              <span>attendance intelligence</span>
            </div>
            <div>
              <strong>Fast</strong>
              <span>QR and RSVP workflows</span>
            </div>
            <div>
              <strong>ROI</strong>
              <span>sponsor engagement data</span>
            </div>
          </div>
        </section>

        <section className="waitlist-card" aria-label="Join the Ingather waitlist">
          {submittedEmail ? (
            <div className="waitlist-success" role="status" aria-live="polite">
              <span className="waitlist-success-icon" aria-hidden="true">✓</span>
              <p className="waitlist-kicker">Request received</p>
              <h2>You're on the list.</h2>
              <p>
                We're rolling out access in phases. Keep an eye on
                <strong> {submittedEmail}</strong>.
              </p>
              <Link to="/" className="waitlist-secondary-link">Back to home</Link>
            </div>
          ) : (
            <>
              <div className="waitlist-card-header">
                <p className="waitlist-kicker">Request access</p>
                <h2>Join the Ingather waitlist</h2>
                <span>Tell us where Ingather can help your event team move faster.</span>
              </div>

              <form className="waitlist-form" onSubmit={handleSubmit} noValidate>
                <div className="waitlist-field-grid">
                  <label>
                    <span>First name</span>
                    <input
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="Ejemighaye"
                      autoComplete="given-name"
                    />
                    {errors.firstName && <small>{errors.firstName}</small>}
                  </label>

                  <label>
                    <span>Last name</span>
                    <input
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Maro"
                      autoComplete="family-name"
                    />
                    {errors.lastName && <small>{errors.lastName}</small>}
                  </label>
                </div>

                <label>
                  <span>Email address</span>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@organization.com"
                    autoComplete="email"
                  />
                  {errors.email && <small>{errors.email}</small>}
                </label>

                <label>
                  <span>Organization name</span>
                  <input
                    name="organizationName"
                    value={formData.organizationName}
                    onChange={handleChange}
                    placeholder="Your church, brand, school, or event team"
                    autoComplete="organization"
                  />
                </label>

                <label>
                  <span>Typical event size</span>
                  <select name="eventSize" value={formData.eventSize} onChange={handleChange}>
                    {eventSizeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {errors.eventSize && <small>{errors.eventSize}</small>}
                </label>

                <label className="waitlist-honeypot" aria-hidden="true">
                  <span>Website</span>
                  <input
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    tabIndex="-1"
                    autoComplete="off"
                  />
                </label>

                {submitError && <div className="waitlist-error">{submitError}</div>}

                <button type="submit" className="waitlist-submit" disabled={loading}>
                  {loading ? 'Joining waitlist...' : 'Join the waitlist'}
                </button>
              </form>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default WaitlistPage;
