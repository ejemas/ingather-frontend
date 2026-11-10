import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { joinWaitlist } from '../api/waitlistService';
import '../styles/IgWaitlist.css';

const eventSizeOptions = [
  { value: '', label: 'Select event size' },
  { value: '1-50', label: '1 to 50 attendees' },
  { value: '50-200', label: '50 to 200 attendees' },
  { value: '200-500', label: '200 to 500 attendees' },
  { value: '500+', label: '500+ attendees' }
];

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  organizationName: '',
  eventSize: '',
  upcomingEventAt: '',
  website: ''
};

const Check = ({ size = 16, color = '#E8590C', width = 2.4 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

const PHOTO_ALT = 'Guests in traditional attire seated under a decorated canopy at an outdoor gathering';

function WaitlistPage() {
  const location = useLocation();
  const prefillEmail = typeof location.state?.email === 'string' ? location.state.email.slice(0, 254) : '';
  const [formData, setFormData] = useState({ ...initialForm, email: prefillEmail });
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
    if (!formData.upcomingEventAt) {
      nextErrors.upcomingEventAt = 'Choose your upcoming event date and time';
    } else if (Number.isNaN(new Date(formData.upcomingEventAt).getTime())) {
      nextErrors.upcomingEventAt = 'Enter a valid event date and time';
    }

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
        organizationName: formData.organizationName.trim(),
        upcomingEventAt: new Date(formData.upcomingEventAt).toISOString()
      });
      setSubmittedEmail(formData.email.trim().toLowerCase());
      setFormData(initialForm);
      // Bring the "You're on the list" card into view (the form was taller)
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setSubmitError(
        error.response?.data?.error ||
        'We could not add you to the waitlist right now. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Open the browser's date and time picker on click, so the calendar shows
  // wherever the field is tapped (older browsers just ignore this).
  const openPicker = (event) => {
    const input = event.currentTarget;
    if (typeof input.showPicker !== 'function') return;
    // Clicks on the browser's own calendar icon (right edge of the box) are
    // left to the browser, which already opens the picker from there.
    // Calling showPicker as well made some browsers open and close it at once.
    const rect = input.getBoundingClientRect();
    if (event.clientX && event.clientX > rect.right - 44) return;
    try {
      input.showPicker();
    } catch (error) {
      // Picker already open or not allowed here; typing the date still works.
    }
  };

  const fieldClass = (name) => (errors[name] ? 'has-error' : '');

  return (
    <div className="ig-wl">
      <div className="ig-wl-frame">
        <div className="ig-wl-col">
          <div className="ig-wl-navwrap">
            <nav className="ig-wl-nav" aria-label="Main">
              <Link to="/" className="ig-wl-brand" aria-label="Ingather home">
                <img src="/ingather-logo.png" alt="Ingather" />
              </Link>
              <div className="ig-wl-navlinks">
                <Link to="/">Home</Link>
                <Link to="/#features">Features</Link>
                <Link to="/discover">Discover</Link>
                <Link to="/#faq">FAQs</Link>
              </div>
              <Link to="/login" className="ig-wl-login">Log in</Link>
            </nav>
          </div>

          <main className="ig-wl-main">
            <div className="ig-wl-photo-top">
              <img src="/landing/gathering.jpg" alt={PHOTO_ALT} />
              <div className="ig-wl-shade" aria-hidden="true" />
              <span>Now onboarding organizers in phases</span>
            </div>

            <div className="ig-wl-left">
              <span className="ig-wl-pill"><span>Invite-only</span>Access opens in phases</span>
              <h1>Join the waitlist for your next <span className="ig-wl-mark">event</span></h1>
              <p className="ig-wl-lead">Tell us a little about your event. We'll email your invite when your spot opens.</p>

              {submittedEmail ? (
                <div className="ig-wl-card ig-wl-success" role="status" aria-live="polite">
                  <span className="ig-wl-success-icon"><Check size={26} /></span>
                  <span className="ig-wl-kicker">Request received</span>
                  <h2>You're on the list.</h2>
                  <p>We're opening access in phases. Keep an eye on <strong>{submittedEmail}</strong> for your invite.</p>
                  <div className="ig-wl-next">
                    <span className="ig-wl-next-title">What happens next</span>
                    <span><span className="ig-wl-num">1</span>We review your request and your event date.</span>
                    <span><span className="ig-wl-num">2</span>You get an invite link by email.</span>
                    <span><span className="ig-wl-num">3</span>Create your workspace and set up your first event.</span>
                  </div>
                  <div className="ig-wl-success-ctas">
                    <Link to="/" className="ig-wl-btn-dark">Back to home</Link>
                    <Link to="/discover" className="ig-wl-btn-light">Explore Events</Link>
                  </div>
                </div>
              ) : (
                <form className="ig-wl-card ig-wl-form" onSubmit={handleSubmit} noValidate>
                  <div className="ig-wl-row">
                    <label className={fieldClass('firstName')}>
                      <span>First name</span>
                      <input name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Frank" autoComplete="given-name" />
                      {errors.firstName && <small>{errors.firstName}</small>}
                    </label>
                    <label className={fieldClass('lastName')}>
                      <span>Last name</span>
                      <input name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Leo" autoComplete="family-name" />
                      {errors.lastName && <small>{errors.lastName}</small>}
                    </label>
                  </div>

                  <label className={fieldClass('email')}>
                    <span>Work email</span>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@organization.com" autoComplete="email" />
                    {errors.email && <small>{errors.email}</small>}
                  </label>

                  <label>
                    <span>Organization <em>(optional)</em></span>
                    <input name="organizationName" value={formData.organizationName} onChange={handleChange} placeholder="Your church, brand, school or event team" autoComplete="organization" />
                  </label>

                  <div className="ig-wl-row">
                    <label className={fieldClass('eventSize')}>
                      <span>Event size</span>
                      <select name="eventSize" value={formData.eventSize} onChange={handleChange}>
                        {eventSizeOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      {errors.eventSize && <small>{errors.eventSize}</small>}
                    </label>
                    <div className={`ig-wl-field ${fieldClass('upcomingEventAt')}`}>
                      <label htmlFor="waitlist-event-at">Next event date and time</label>
                      <input
                        id="waitlist-event-at"
                        type="datetime-local"
                        name="upcomingEventAt"
                        value={formData.upcomingEventAt}
                        onChange={handleChange}
                        onClick={openPicker}
                      />
                      {errors.upcomingEventAt && <small>{errors.upcomingEventAt}</small>}
                    </div>
                  </div>

                  <label className="ig-wl-honeypot" aria-hidden="true">
                    <span>Website</span>
                    <input name="website" value={formData.website} onChange={handleChange} tabIndex="-1" autoComplete="off" />
                  </label>

                  {submitError && <div className="ig-wl-error" role="alert">{submitError}</div>}

                  <button type="submit" className="ig-wl-submit" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="ig-wl-spinner" aria-hidden="true" />
                        Joining the waitlist...
                      </>
                    ) : 'Join the Waitlist'}
                  </button>
                  <p className="ig-wl-already">Already have an account? <Link to="/login">Log in</Link></p>
                </form>
              )}
            </div>

            <div className="ig-wl-photo">
              <img src="/landing/gathering.jpg" alt={PHOTO_ALT} />
              <div className="ig-wl-shade" aria-hidden="true" />
              <div className="ig-wl-photo-fade" aria-hidden="true" />
              <span className="ig-wl-photo-tag">Now onboarding organizers in phases</span>
              <div className="ig-wl-photo-card">
                <span className="ig-wl-photo-card-title">What you get with Ingather</span>
                <span><Check />Live attendance while your event is running</span>
                <span><Check />Fast QR check-in and RSVP passes</span>
                <span><Check />Sponsor and attendance reports after the event</span>
              </div>
            </div>
          </main>

          <footer className="ig-wl-foot">
            <span>&copy; 2026 Ingather. All rights reserved.</span>
            <span>Made in Nigeria</span>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default WaitlistPage;
