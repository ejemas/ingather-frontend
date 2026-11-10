import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPublicPreEvent, submitPreEventRsvp } from '../api/preEventService';
import { getCommunityCta, getCommunityLabel } from '../utils/communityLinks';
import '../styles/IgWaitlist.css';
import '../styles/IgRsvp.css';

const INVITE_ONLY_MODE = process.env.REACT_APP_INVITE_ONLY_MODE !== 'false';

const FIELD_LABELS = {
  emailAddress: 'Email address',
  fullName: 'Full name',
  phoneNumber: 'Phone number',
  school: 'School',
  link: 'Link',
  textarea: 'Additional response',
  organization: 'Organization',
  ticketType: 'Ticket type',
  address: 'Address',
  firstTimer: 'First-timer',
  department: 'Department',
  fellowship: 'Group',
  age: 'Age',
  sex: 'Gender'
};

const FIELD_PLACEHOLDERS = {
  emailAddress: 'name@example.com',
  fullName: 'Your full name',
  phoneNumber: '+234 800 000 0000',
  school: 'School',
  link: 'https://github.com/yourname',
  textarea: 'Write your response here',
  organization: 'Organization, company or group',
  ticketType: 'General, VIP, Student...',
  address: 'Your address',
  department: 'Department',
  fellowship: 'Group',
  age: 'Age'
};

// Same order as before: name and phone come first after email
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

const ABOUT_PARAGRAPH_LIMIT = 4;
const ABOUT_CHARACTER_LIMIT = 900;

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

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatLongDate = (value) => {
  const date = toDate(value);
  if (!date) return 'Date coming soon';
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

const formatTime = (value) => {
  const date = toDate(value);
  return date ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
};

const dateBadge = (value) => {
  const date = toDate(value);
  if (!date) return { month: 'TBD', day: '--' };
  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: String(date.getDate())
  };
};

const initials = (name) => String(name || 'Ingather')
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0].toUpperCase())
  .join('');

// Splits the description into paragraphs and decides what to show before "Read more"
const buildAbout = (description) => {
  const paragraphs = String(description || '')
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return { full: [], short: [], truncated: false };
  }

  const short = [];
  let used = 0;
  let truncated = false;
  for (let index = 0; index < paragraphs.length; index += 1) {
    if (index >= ABOUT_PARAGRAPH_LIMIT) {
      truncated = true;
      break;
    }
    const paragraph = paragraphs[index];
    if (used + paragraph.length > ABOUT_CHARACTER_LIMIT) {
      const room = Math.max(160, ABOUT_CHARACTER_LIMIT - used);
      const cut = paragraph.slice(0, room);
      const lastSpace = cut.lastIndexOf(' ');
      short.push(`${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim()}…`);
      truncated = true;
      break;
    }
    short.push(paragraph);
    used += paragraph.length;
  }

  return { full: paragraphs, short, truncated };
};

const COMMUNITY_ICON_ASSETS = {
  whatsapp: '/icon logo/whatsapp.png',
  instagram: '/icon logo/Instagram.png',
  discord: '/icon logo/Discord.png',
  telegram: '/icon logo/Telegram.png',
  facebook: '/icon logo/Facebook.png',
  linkedin: '/icon logo/LinkedIn.png',
  x: '/icon logo/X.png'
};

const PinIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);

const VideoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="13" height="14" rx="2" />
    <path d="M16 10l5-3v10l-5-3" />
  </svg>
);

const PeopleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5" />
    <circle cx="17" cy="9" r="2.4" />
    <path d="M15.5 14.4c2.2.2 3.9 1.8 4.5 4.6" />
  </svg>
);

const ShareIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
  </svg>
);

const LinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </svg>
);

const CheckIcon = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

const LockIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

// In preview (inside the Create page's phone) links are plain text so nothing navigates away.
function RsvpShell({ children, preview = false }) {
  const hostPath = INVITE_ONLY_MODE ? '/waitlist' : '/register';
  return (
    <div className="ig-wl ig-rv">
      <div className="ig-wl-frame">
        <div className="ig-wl-col">
          <div className="ig-wl-navwrap">
            <nav className="ig-wl-nav ig-rv-nav" aria-label="Main">
              {preview ? (
                <span className="ig-wl-brand"><img src="/ingather-logo.png" alt="Ingather" /></span>
              ) : (
                <Link to="/" className="ig-wl-brand" aria-label="Ingather home">
                  <img src="/ingather-logo.png" alt="Ingather" />
                </Link>
              )}
              {preview
                ? <span className="ig-wl-login">Discover Events</span>
                : <Link to="/discover" className="ig-wl-login">Discover Events</Link>}
            </nav>
          </div>
          {children}
          <footer className="ig-wl-foot ig-rv-foot">
            <span className="ig-rv-powered">RSVP powered by <img src="/ingather-logo.png" alt="Ingather" /></span>
            {preview ? <span>Host your own event</span> : <Link to={hostPath}>Host your own event</Link>}
          </footer>
        </div>
      </div>
    </div>
  );
}

// previewEvent: shows this event instead of loading one (used by the Create Pre-Event live preview).
function RsvpPage({ previewEvent = null }) {
  const { slug } = useParams();
  const isPreview = Boolean(previewEvent);
  const [loadedEvent, setPreEvent] = useState(null);
  const preEvent = previewEvent || loadedEvent;
  const [formData, setFormData] = useState({ emailAddress: '', attendanceMode: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(!isPreview);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [qrEmailSent, setQrEmailSent] = useState(false);
  // The server answers as soon as the RSVP is saved, then emails the pass straight after.
  const [qrEmailQueued, setQrEmailQueued] = useState(false);
  // Set when this email already has a spot: shown as a calm note, not an error.
  const [alreadyRegistered, setAlreadyRegistered] = useState('');
  const [emailWarning, setEmailWarning] = useState('');
  const [serverError, setServerError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [submittedName, setSubmittedName] = useState('');
  const [shareNote, setShareNote] = useState('');
  const [bannerFailed, setBannerFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    if (isPreview) return undefined;
    let active = true;
    const loadPublicEvent = async () => {
      try {
        setLoading(true);
        setLoadError('');
        const response = await getPublicPreEvent(slug);
        if (!response?.preEvent) {
          throw new Error('RSVP page not found.');
        }
        if (active) setPreEvent(response.preEvent);
      } catch (error) {
        if (!active) return;
        setPreEvent(null);
        setLoadError(error.response?.data?.error || error.message || 'This RSVP page could not be loaded.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPublicEvent();
    return () => {
      active = false;
    };
  }, [slug, isPreview]);

  useEffect(() => {
    if (!isPreview && preEvent?.title) {
      document.title = `${preEvent.title} | RSVP on Ingather`;
    }
  }, [preEvent?.title, isPreview]);

  // A new banner in the preview should show even if the previous one failed to load.
  useEffect(() => { setBannerFailed(false); }, [preEvent?.bannerUrl]);

  const selectedFields = useMemo(() => {
    if (!preEvent) return ['emailAddress'];
    const fields = ['emailAddress'];
    OPTIONAL_FIELDS.forEach((field) => {
      if (preEvent.rsvpFields?.[field]) fields.push(field);
    });
    // Design order: name, email, phone, then the rest
    const order = ['fullName', 'emailAddress', 'phoneNumber'];
    return [
      ...order.filter((field) => fields.includes(field)),
      ...fields.filter((field) => !order.includes(field))
    ];
  }, [preEvent]);

  // Enabled fields are required unless the host marked them optional; email is always required.
  const isFieldRequired = (field) => {
    if (field === 'emailAddress') return true;
    if (field === 'firstTimer') return false;
    return Boolean(preEvent?.rsvpFields?.[field]) && preEvent?.rsvpFieldConfig?.requiredFields?.[field] !== false;
  };

  const about = useMemo(() => buildAbout(preEvent?.description), [preEvent?.description]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
    if (serverError) setServerError('');
    if (alreadyRegistered && field === 'emailAddress') setAlreadyRegistered('');
  };

  const updateCustomField = (fieldId, value) => {
    setFormData((prev) => ({
      ...prev,
      customResponses: {
        ...(prev.customResponses || {}),
        [fieldId]: value
      }
    }));
    setErrors((prev) => ({ ...prev, [fieldId]: '' }));
    if (serverError) setServerError('');
  };

  const validate = () => {
    const nextErrors = {};

    if (!isValidEmail(formData.emailAddress)) {
      nextErrors.emailAddress = 'Enter a valid email address.';
    }

    if (preEvent?.virtualAttendanceEnabled && !['physical', 'virtual'].includes(formData.attendanceMode)) {
      nextErrors.attendanceMode = 'Please choose how you will attend.';
    }

    selectedFields.forEach((field) => {
      if (field === 'emailAddress') return;
      if (field === 'firstTimer') return;
      const required = isFieldRequired(field);
      if (field === 'link') {
        if (!String(formData.linkUrl || '').trim()) {
          if (required) nextErrors.linkUrl = 'Link is required.';
        } else if (!isValidHttpUrl(formData.linkUrl)) {
          nextErrors.linkUrl = 'Enter a valid link starting with http:// or https://.';
        }
        return;
      }
      if (field === 'textarea') {
        if (required && !String(formData.textareaResponse || '').trim()) {
          nextErrors.textareaResponse = 'Response is required.';
        }
        return;
      }
      if (field === 'age') {
        const age = Number(formData.age);
        if (!String(formData.age || '').trim()) {
          if (required) nextErrors.age = 'Age is required.';
        } else if (!Number.isInteger(age) || age < 1 || age > 120) {
          nextErrors.age = 'Enter an age between 1 and 120.';
        }
        return;
      }
      if (required && !String(formData[field] || '').trim()) {
        nextErrors[field] = `${FIELD_LABELS[field]} is required.`;
      }
    });

    (preEvent?.customFormSchema || []).forEach((field) => {
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setServerError('');
    setAlreadyRegistered('');

    if (!validate()) {
      window.setTimeout(() => {
        document.querySelector('.ig-rv-form .has-error input, .ig-rv-form .has-error select, .ig-rv-form .has-error textarea, .ig-rv-form .has-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
      return;
    }

    if (isPreview) return;

    try {
      setSubmitting(true);
      const response = await submitPreEventRsvp(slug, formData);
      setQrEmailSent(Boolean(response.qrEmailSent));
      setQrEmailQueued(Boolean(response.qrEmailQueued));
      setEmailWarning(response.emailWarning || '');
      setSubmittedEmail(String(response.sentTo || formData.emailAddress || '').trim());
      setSubmittedName(String(formData.fullName || '').trim().split(/\s+/)[0] || '');
      setSuccess(true);
      setPreEvent((current) => (current ? { ...current, rsvpCount: (current.rsvpCount || 0) + 1 } : current));
      window.setTimeout(() => {
        document.querySelector('.ig-rv-aside')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
    } catch (error) {
      if (error.response?.data?.code === 'ALREADY_REGISTERED') {
        setAlreadyRegistered(String(formData.emailAddress || '').trim());
        return;
      }
      if (error.response?.data?.code === 'RSVP_ENDED') {
        // The closing time passed while the page was open: switch to the closed card.
        setPreEvent((current) => (current ? { ...current, rsvpEnded: true } : current));
        return;
      }
      setServerError(error.response?.data?.error || 'We could not secure your spot. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const pageUrl = typeof window !== 'undefined' ? window.location.href.split('#')[0] : '';

  const copyLink = async () => {
    if (isPreview) return;
    try {
      await navigator.clipboard.writeText(pageUrl);
      setShareNote('Link copied');
    } catch (error) {
      setShareNote('Copy the link from your browser address bar');
    }
    window.setTimeout(() => setShareNote(''), 2500);
  };

  const shareEvent = async () => {
    if (isPreview) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: preEvent?.title || 'Ingather event', url: pageUrl });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    copyLink();
  };

  if (loading) {
    return (
      <RsvpShell preview={isPreview}>
        <main className="ig-rv-main" aria-busy="true">
          <div className="ig-rv-event">
            <div className="ig-rv-skel ig-rv-skel-banner" />
            <div className="ig-rv-skel ig-rv-skel-line" />
            <div className="ig-rv-skel ig-rv-skel-line short" />
          </div>
          <div className="ig-rv-aside"><div className="ig-rv-skel ig-rv-skel-card" /></div>
        </main>
      </RsvpShell>
    );
  }

  if (!preEvent) {
    return (
      <RsvpShell preview={isPreview}>
        <main className="ig-rv-main ig-rv-missing">
          <div className="ig-rv-card ig-rv-state">
            <span className="ig-rv-state-icon"><LockIcon /></span>
            <h1>This RSVP page isn't available</h1>
            <p>{loadError || 'The link may be wrong, or the host may have removed the event.'}</p>
            <Link to="/discover" className="ig-rv-btn-primary">Find other events</Link>
          </div>
        </main>
      </RsvpShell>
    );
  }

  const badge = dateBadge(preEvent.eventDate);
  const hostName = preEvent.churchName || 'the event host';
  const rsvpCount = Number(preEvent.rsvpCount) || 0;
  // RSVPs stop when the host pauses them, or at the closing time (12 hours after the start unless the host chose earlier).
  const endsAtMs = preEvent.rsvpEndsAt ? new Date(preEvent.rsvpEndsAt).getTime() : NaN;
  const rsvpEnded = preEvent.rsvpEnded === true || (!Number.isNaN(endsAtMs) && Date.now() >= endsAtMs);
  const rsvpOpen = preEvent.isRsvpActive && !rsvpEnded;
  const disabled = !rsvpOpen || submitting;
  const fieldClass = (key) => `ig-wl-field ${errors[key] ? 'has-error' : ''}`;

  const aboutSection = (
    <section className="ig-rv-about" aria-labelledby="rsvp-about-title">
      <h2 id="rsvp-about-title">About this event</h2>
      {about.full.length === 0 ? (
        <p className="ig-rv-muted">More details will be shared by the host soon.</p>
      ) : (
        <div className="ig-rv-about-copy">
          {(aboutExpanded ? about.full : about.short).map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      )}
      {about.truncated && (
        <button
          type="button"
          className="ig-rv-readmore"
          onClick={() => setAboutExpanded((value) => !value)}
          aria-expanded={aboutExpanded}
        >
          {aboutExpanded ? 'Show less' : 'Read more'}
        </button>
      )}
      <div className="ig-rv-share">
        <button type="button" onClick={shareEvent}><ShareIcon />Share event</button>
        <button type="button" onClick={copyLink}><LinkIcon />Copy link</button>
      </div>
      {shareNote && <span className="ig-rv-share-note" role="status">{shareNote}</span>}
    </section>
  );

  return (
    <RsvpShell preview={isPreview}>
      <main className="ig-rv-main">
        {/* Event details */}
        <article className="ig-rv-event">
          <div className="ig-rv-banner">
            {preEvent.bannerUrl && !bannerFailed ? (
              <img src={preEvent.bannerUrl} alt={`${preEvent.title} event banner`} onError={() => setBannerFailed(true)} />
            ) : (
              <span className="ig-rv-banner-fallback" aria-hidden="true"><span>{preEvent.title}</span></span>
            )}
            <span className={`ig-rv-status ${rsvpOpen ? '' : 'is-closed'}`}>
              <span aria-hidden="true" />
              {rsvpOpen ? 'RSVP open' : 'RSVP closed'}
            </span>
          </div>

          <div className="ig-rv-titleblock">
            <h1>{preEvent.title}</h1>
            <div className="ig-rv-chips">
              <span className="ig-rv-host">
                <span className="ig-rv-host-mark">
                  {preEvent.hostLogoUrl && !logoFailed ? (
                    <img src={preEvent.hostLogoUrl} alt="" onError={() => setLogoFailed(true)} />
                  ) : initials(preEvent.churchName)}
                </span>
                Hosted by <strong>{hostName}</strong>
              </span>
              {rsvpCount > 0 && (
                <span className="ig-rv-going"><PeopleIcon /><strong>{rsvpCount.toLocaleString()} going</strong></span>
              )}
            </div>
          </div>

          <div className="ig-rv-facts">
            <div className="ig-rv-fact">
              <span className="ig-rv-fact-date"><span>{badge.month}</span><strong>{badge.day}</strong></span>
              <span className="ig-rv-fact-text">
                <strong>{formatLongDate(preEvent.eventDate)}</strong>
                {formatTime(preEvent.eventDate) && <span>Starts {formatTime(preEvent.eventDate)}</span>}
              </span>
            </div>
            <div className="ig-rv-fact">
              <span className="ig-rv-fact-icon"><PinIcon /></span>
              <span className="ig-rv-fact-text">
                <strong>{preEvent.venueName || 'Venue to be announced'}</strong>
                <span>{preEvent.city || 'The host will share the location'}</span>
              </span>
            </div>
            <div className="ig-rv-fact">
              <span className="ig-rv-fact-icon">{preEvent.virtualAttendanceEnabled ? <VideoIcon /> : <PeopleIcon />}</span>
              <span className="ig-rv-fact-text">
                <strong>{preEvent.virtualAttendanceEnabled ? 'In person or online' : 'In person'}</strong>
                <span>{preEvent.virtualAttendanceEnabled ? "Choose how you'll attend when you RSVP" : 'Show your QR pass at the entrance'}</span>
              </span>
            </div>
          </div>

          {aboutSection}
        </article>

        {/* RSVP card */}
        <aside className="ig-rv-aside">
          {success ? (
            <div className="ig-rv-card ig-rv-success" role="status">
              <span className="ig-rv-success-icon"><CheckIcon /></span>
              <div className="ig-rv-success-head">
                <span className="ig-rv-kicker">RSVP confirmed</span>
                <h2>{submittedName ? `You're in, ${submittedName}. See you there.` : "You're in. See you there."}</h2>
                <p>Your RSVP is recorded by <strong>{hostName}</strong>.</p>
              </div>
              {qrEmailSent || qrEmailQueued ? (
                <div className="ig-rv-inbox">
                  <span className="ig-rv-inbox-icon" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 8l9 6 9-6" /></svg>
                  </span>
                  <span>
                    <strong>{qrEmailSent ? 'Your QR pass is in your inbox' : 'Your QR pass is on its way'}</strong>
                    <span>
                      {qrEmailSent ? 'Sent to ' : "We're emailing it to "}
                      <strong className="ig-rv-break ig-rv-sentto">{submittedEmail}</strong>
                      {qrEmailSent ? '.' : '. It usually arrives within a minute.'}
                      {' '}Show it at the door. If you don't see it, check your spam or Promotions folder.
                    </span>
                    <span className="ig-rv-typo">Spotted a typo in your email? RSVP again with the right address.</span>
                  </span>
                </div>
              ) : (
                <div className="ig-rv-warn" role="alert">
                  <strong>Your RSVP is saved, but your QR pass email didn't go out yet.</strong>
                  <span>{emailWarning ? `${emailWarning} ` : ''}Please contact {hostName} so they can resend it.</span>
                </div>
              )}

              {preEvent.communityLinks?.length > 0 && (
                <div className="ig-rv-community">
                  <span className="ig-rv-community-title">Join the event community</span>
                  {preEvent.communityLinks.slice(0, 3).map((link) => {
                    const icon = COMMUNITY_ICON_ASSETS[link.platform];
                    return (
                      <a key={`${link.platform}-${link.url}`} href={link.url} target="_blank" rel="noopener noreferrer">
                        <span className="ig-rv-community-icon">
                          {icon ? <img src={icon} alt="" /> : <span aria-hidden="true">↗</span>}
                        </span>
                        <span className="ig-rv-community-label">
                          {getCommunityCta(link.platform)}
                          <small>{getCommunityLabel(link.platform)}</small>
                        </span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8A8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                      </a>
                    );
                  })}
                </div>
              )}

              <Link to="/discover" className="ig-rv-btn-dark">Discover more events</Link>
            </div>
          ) : !rsvpOpen ? (
            <div className="ig-rv-card ig-rv-state" role="status">
              <span className="ig-rv-state-icon"><LockIcon /></span>
              <h2>RSVPs are closed</h2>
              <p>
                {rsvpEnded ? 'RSVPs for this event have closed.' : 'The host has stopped taking RSVPs for this event.'}
                {' '}If you already RSVP'd, your QR pass still works at the door.
              </p>
              <Link to="/discover" className="ig-rv-btn-primary is-wide">Find other events</Link>
            </div>
          ) : (
            <form className="ig-rv-card ig-wl-form ig-rv-form" onSubmit={handleSubmit} noValidate>
              <div className="ig-rv-form-head">
                <h2>Secure your <span className="ig-wl-mark">spot</span></h2>
                <p>We'll email you a personal QR pass for the door.</p>
                {preEvent.rsvpClosesAt && !Number.isNaN(endsAtMs) && (
                  <p className="ig-rv-closes">RSVPs close {formatLongDate(preEvent.rsvpEndsAt)}{formatTime(preEvent.rsvpEndsAt) ? `, ${formatTime(preEvent.rsvpEndsAt)}` : ''}.</p>
                )}
              </div>

              {preEvent.virtualAttendanceEnabled && (
                <fieldset className={`ig-rv-group ${errors.attendanceMode ? 'has-error' : ''}`}>
                  <legend>How will you attend?</legend>
                  <div className="ig-rv-mode">
                    {[['physical', 'In person'], ['virtual', 'Online']].map(([value, label]) => (
                      <label key={value} className={formData.attendanceMode === value ? 'is-on' : ''}>
                        <input
                          type="radio"
                          name="attendanceMode"
                          value={value}
                          checked={formData.attendanceMode === value}
                          onChange={(event) => updateField('attendanceMode', event.target.value)}
                          disabled={disabled}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  {errors.attendanceMode && <small>{errors.attendanceMode}</small>}
                </fieldset>
              )}

              {selectedFields.map((field) => {
                const label = (
                  <>
                    {field === 'textarea' ? (preEvent.rsvpFieldConfig?.textareaLabel || FIELD_LABELS.textarea) : FIELD_LABELS[field]}
                    {!isFieldRequired(field) && field !== 'firstTimer' && <em> (optional)</em>}
                  </>
                );
                const id = `rsvp-${field}`;

                if (field === 'firstTimer') {
                  return (
                    <label className="ig-rv-check" key={field}>
                      <input
                        type="checkbox"
                        checked={Boolean(formData.firstTimer)}
                        onChange={(event) => updateField('firstTimer', event.target.checked)}
                        disabled={disabled}
                      />
                      <span>This is my first time attending</span>
                    </label>
                  );
                }

                if (field === 'sex') {
                  return (
                    <div className={fieldClass(field)} key={field}>
                      <label htmlFor={id}>{label}</label>
                      <select id={id} value={formData.sex || ''} onChange={(event) => updateField('sex', event.target.value)} disabled={disabled}>
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                      {errors[field] && <small>{errors[field]}</small>}
                    </div>
                  );
                }

                if (field === 'link') {
                  return (
                    <div className={fieldClass('linkUrl')} key={field}>
                      <label htmlFor={id}>{label}</label>
                      <input
                        id={id}
                        type="url"
                        inputMode="url"
                        value={formData.linkUrl || ''}
                        onChange={(event) => updateField('linkUrl', event.target.value)}
                        placeholder={FIELD_PLACEHOLDERS.link}
                        disabled={disabled}
                      />
                      {errors.linkUrl && <small>{errors.linkUrl}</small>}
                    </div>
                  );
                }

                if (field === 'textarea') {
                  return (
                    <div className={fieldClass('textareaResponse')} key={field}>
                      <label htmlFor={id}>{label}</label>
                      <textarea
                        id={id}
                        value={formData.textareaResponse || ''}
                        onChange={(event) => updateField('textareaResponse', event.target.value)}
                        placeholder={FIELD_PLACEHOLDERS.textarea}
                        disabled={disabled}
                        rows={4}
                        maxLength={5000}
                      />
                      {errors.textareaResponse && <small>{errors.textareaResponse}</small>}
                    </div>
                  );
                }

                const inputType = field === 'emailAddress' ? 'email' : field === 'age' ? 'number' : field === 'phoneNumber' ? 'tel' : 'text';
                const autoComplete = { emailAddress: 'email', fullName: 'name', phoneNumber: 'tel', organization: 'organization', address: 'street-address' }[field];
                return (
                  <div className={fieldClass(field)} key={field}>
                    <label htmlFor={id}>{label}</label>
                    <input
                      id={id}
                      type={inputType}
                      value={formData[field] || ''}
                      onChange={(event) => updateField(field, event.target.value)}
                      placeholder={FIELD_PLACEHOLDERS[field]}
                      disabled={disabled}
                      autoComplete={autoComplete}
                      maxLength={field === 'emailAddress' ? 255 : undefined}
                      min={field === 'age' ? 1 : undefined}
                      max={field === 'age' ? 120 : undefined}
                    />
                    {errors[field] && <small>{errors[field]}</small>}
                  </div>
                );
              })}

              {(preEvent.customFormSchema || []).map((field) => {
                const value = formData.customResponses?.[field.id];
                const label = <>{field.label}{!field.required && <em> (optional)</em>}</>;

                if (field.type === 'radio' || field.type === 'checkbox') {
                  const selected = Array.isArray(value) ? value : [];
                  return (
                    <fieldset className={`ig-rv-group ${errors[field.id] ? 'has-error' : ''}`} key={field.id}>
                      <legend>{label}</legend>
                      <div className="ig-rv-options">
                        {field.options.map((option) => {
                          const checked = field.type === 'radio' ? value === option : selected.includes(option);
                          return (
                            <label key={option} className={checked ? 'is-on' : ''}>
                              <input
                                type={field.type}
                                name={field.id}
                                value={option}
                                checked={checked}
                                onChange={(event) => {
                                  if (field.type === 'radio') {
                                    updateCustomField(field.id, event.target.value);
                                  } else {
                                    updateCustomField(field.id, event.target.checked
                                      ? [...selected, option]
                                      : selected.filter((item) => item !== option));
                                  }
                                }}
                                disabled={disabled}
                              />
                              {option}
                            </label>
                          );
                        })}
                      </div>
                      {errors[field.id] && <small>{errors[field.id]}</small>}
                    </fieldset>
                  );
                }

                return (
                  <div className={fieldClass(field.id)} key={field.id}>
                    <label htmlFor={`rsvp-custom-${field.id}`}>{label}</label>
                    <input
                      id={`rsvp-custom-${field.id}`}
                      type="text"
                      value={value || ''}
                      onChange={(event) => updateCustomField(field.id, event.target.value)}
                      placeholder="Type your answer"
                      disabled={disabled}
                      maxLength={500}
                    />
                    {errors[field.id] && <small>{errors[field.id]}</small>}
                  </div>
                );
              })}

              {alreadyRegistered && (
                <div className="ig-rv-already" role="status">
                  <strong>You've already RSVP'd with this email</strong>
                  <span>
                    <span className="ig-rv-break">{alreadyRegistered}</span> already has a spot for this event. Your QR pass was emailed to it from Ingather, so check your inbox and your spam or Promotions folder.
                  </span>
                  <span>Not you, or used a different email? Change the email above and try again.</span>
                </div>
              )}
              {serverError && <div className="ig-wl-error" role="alert">{serverError}</div>}

              <button type="submit" className="ig-wl-submit ig-rv-submit" disabled={disabled} aria-busy={submitting}>
                {submitting ? (
                  <>
                    <span className="ig-wl-spinner" aria-hidden="true" />
                    Securing your spot...
                  </>
                ) : 'Secure my spot'}
              </button>
              <p className="ig-rv-fineprint">Your details are shared with {hostName}, the event host. See Ingather's <a href="/terms" target="_blank" rel="noopener noreferrer">Terms</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.</p>
            </form>
          )}
        </aside>
      </main>
    </RsvpShell>
  );
}

export default RsvpPage;
