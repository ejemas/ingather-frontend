import React from 'react';

// Live preview of the guest check-in screens for the Create / Edit Event page.
// It is a picture, not a working form: nothing in it can be typed into or submitted.
// Sample guest details stand in for a real guest.

const SAMPLE = { firstName: 'Chiamaka', time: '9:42 AM' };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const FIELD_ORDER = ['fullName', 'emailAddress', 'phoneNumber', 'fellowship', 'sex', 'age', 'school', 'department', 'address', 'link', 'textarea', 'firstTimer'];
const TEXT_FIELDS = {
  fullName: ['Full name', 'John Doe'],
  emailAddress: ['Email address', 'name@example.com'],
  phoneNumber: ['Phone number', '+234 800 000 0000'],
  fellowship: ['Group', 'Your group or fellowship'],
  age: ['Age', 'e.g. 24'],
  school: ['School', 'Your school'],
  department: ['Department', 'Your department or unit'],
  address: ['Address', 'Where you are coming from'],
  link: ['Link', 'https://']
};

const timeLabel = (value) => {
  if (!value) return '';
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h)) return '';
  return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

const dateLabel = (value) => {
  if (!value) return '';
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

const initials = (name) => String(name || 'Host').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

function HostChip({ hostName, hostLogoUrl }) {
  return (
    <span className="ig-gp-host">
      {hostLogoUrl ? <img src={hostLogoUrl} alt="" /> : <span aria-hidden="true">{initials(hostName)}</span>}
      {hostName || 'Your workspace'}
    </span>
  );
}

function Radio({ on }) {
  return <span className={`ig-gp-radio${on ? ' is-on' : ''}`} aria-hidden="true" />;
}

function CheckinScreen({ event, collect, dataFields, textareaLabel, questions, gifting }) {
  const when = [dateLabel(event.date), [timeLabel(event.startTime), timeLabel(event.endTime)].filter(Boolean).join(' to ')].filter(Boolean).join(', ');
  const fields = FIELD_ORDER.filter((key) => dataFields[key]);
  return (
    <>
      <div className="ig-gp-hero" style={event.flyerUrl ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.78)), url("${event.flyerUrl}")` } : undefined}>
        <HostChip hostName={event.hostName} hostLogoUrl={event.hostLogoUrl} />
        <span className="ig-gp-hero-text">
          <strong>{event.title || 'Your event name'}</strong>
          {when && <span>{when}</span>}
        </span>
      </div>

      {collect ? (
        <>
          <span className="ig-gp-chip"><em>Check-in</em>Takes about a minute</span>
          <h3 className="ig-gp-title">Welcome! Tell us <span>who you are</span></h3>
          {gifting && (
            <div className="ig-gp-gift">
              <span aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M5 12v9h14v-9M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" /></svg>
              </span>
              Fill this form for a chance to win a special gift from the organizer.
            </div>
          )}
          <div className="ig-gp-card">
            {fields.length === 0 && questions.length === 0 && (
              <span className="ig-gp-empty">Add fields on the left to build this form.</span>
            )}
            {fields.map((key) => {
              if (key === 'sex') {
                return (
                  <span className="ig-gp-field" key={key}>
                    <span className="ig-gp-label">Gender</span>
                    <span className="ig-gp-pair"><span className="is-on"><Radio on />Male</span><span><Radio />Female</span></span>
                  </span>
                );
              }
              if (key === 'firstTimer') {
                return <span className="ig-gp-check" key={key}>I'm a first-timer<span aria-hidden="true" /></span>;
              }
              if (key === 'textarea') {
                return (
                  <span className="ig-gp-field" key={key}>
                    <span className="ig-gp-label">{textareaLabel || 'Additional Response'}</span>
                    <span className="ig-gp-input is-tall">Type your answer</span>
                  </span>
                );
              }
              const [label, placeholder] = TEXT_FIELDS[key];
              return (
                <span className="ig-gp-field" key={key}>
                  <span className="ig-gp-label">{label}</span>
                  <span className="ig-gp-input">{placeholder}</span>
                </span>
              );
            })}
            {questions.map((q) => (
              <span className="ig-gp-field" key={q.id}>
                <span className="ig-gp-label">{q.label}{!q.required && <em> (optional)</em>}</span>
                {q.type === 'text' ? (
                  <span className="ig-gp-input">Your answer</span>
                ) : (
                  <span className="ig-gp-options">
                    {(q.options || []).filter(Boolean).map((option) => (
                      <span key={option}>
                        {q.type === 'radio' ? <Radio /> : <span className="ig-gp-box" aria-hidden="true" />}
                        {option}
                      </span>
                    ))}
                  </span>
                )}
              </span>
            ))}
            <span className="ig-gp-btn">Complete check-in</span>
            <span className="ig-gp-legal">By checking in, you agree to Ingather's Terms and Privacy Policy. Your details are shared with {event.hostName || 'the host'}, the event host.</span>
          </div>
        </>
      ) : (
        <>
          <span className="ig-gp-chip"><em>Check-in</em>Two taps and you're in</span>
          <h3 className="ig-gp-title">Quick <span>check-in</span></h3>
          <p className="ig-gp-lead">Your scan is recorded. Two quick details help the organizer plan.</p>
          <div className="ig-gp-card">
            <span className="ig-gp-field">
              <span className="ig-gp-label">Gender</span>
              <span className="ig-gp-pair is-big"><span><Radio />Male</span><span className="is-on"><Radio on />Female</span></span>
            </span>
            <span className="ig-gp-check">I'm a first-timer<span aria-hidden="true" /></span>
            <span className="ig-gp-btn">Complete check-in</span>
          </div>
        </>
      )}
      <span className="ig-gp-powered">Powered by <img src="/ingather-logo.png" alt="Ingather" /></span>
    </>
  );
}

function AfterScreen({ event, collect, after, messages, colors, backgroundUrl, logoUrl, sponsors, sponsorMode, proxy }) {
  const firstMessage = (messages[0] || '[FirstName], you are deeply loved and created for purpose.')
    .replace(/\[FirstName\]\s*,?\s*/i, '')
    .trim();
  const personal = collect && after === 'personalFlyer';
  const showSponsors = after === 'sponsors' && sponsors.length > 0;
  const shownSponsors = sponsorMode === 'distribution' ? sponsors.slice(0, 1) : sponsors;
  return (
    <>
      <div className="ig-gp-top">
        {event.flyerUrl ? <img src={event.flyerUrl} alt="" /> : <span className="ig-gp-top-thumb" aria-hidden="true" />}
        <span><strong>{event.title || 'Your event name'}</strong><span>{event.hostName || 'Your workspace'}</span></span>
      </div>

      <div className="ig-gp-done">
        <span className="ig-gp-done-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
        </span>
        <span>
          <strong>{collect ? `You're in, ${SAMPLE.firstName}` : "You're checked in"}</strong>
          <span>Checked in at {SAMPLE.time}</span>
        </span>
        {collect && <em>First-timer</em>}
      </div>

      {personal && (
        <>
          <span className="ig-gp-section"><strong>Made for you</strong><span>Personal welcome flyer</span></span>
          <div className="ig-gp-pflyer" style={{ borderColor: colors.brand }}>
            <div className="ig-gp-pflyer-top" style={{ background: backgroundUrl ? `center / cover no-repeat url("${backgroundUrl}")` : colors.brand }}>
              <span className="ig-gp-host">
                {logoUrl ? <img src={logoUrl} alt="" /> : <span aria-hidden="true">{initials(event.hostName)}</span>}
                {event.hostName || 'Your workspace'}
              </span>
            </div>
            <div className="ig-gp-pflyer-body">
              <span className="ig-gp-pflyer-kicker" style={{ color: colors.brand }}>Welcome to {event.title || 'your event'}</span>
              <strong>{SAMPLE.firstName},</strong>
              <span className="ig-gp-pflyer-msg">
                {firstMessage}
              </span>
              <span className="ig-gp-pflyer-foot"><span>{dateLabel(event.date)}</span><span className="ig-gp-pflyer-brand">Powered by <img src="/ingather-logo.png" alt="Ingather" /></span></span>
            </div>
          </div>
          <span className="ig-gp-row">
            <span className="ig-gp-btn" style={{ background: colors.brand, color: colors.text }}>Save my flyer</span>
            <span className="ig-gp-btn is-ghost">Post to status</span>
          </span>
        </>
      )}

      {!personal && after === 'eventFlyer' && event.flyerUrl && (
        <>
          <span className="ig-gp-section"><strong>Event flyer</strong><span>From {event.hostName || 'the host'}</span></span>
          <img className="ig-gp-flyer" src={event.flyerUrl} alt="" />
          <span className="ig-gp-btn is-ghost">Save flyer</span>
        </>
      )}

      {showSponsors && (
        <>
          <span className="ig-gp-section"><strong>{sponsorMode === 'distribution' ? 'From our sponsor' : "Today's sponsors"}</strong>{shownSponsors.length > 1 && <span>Swipe for more</span>}</span>
          <div className="ig-gp-sponsors">
            {shownSponsors.map((sponsor) => (
              <div className="ig-gp-sponsor" key={sponsor.clientId}>
                <div className="ig-gp-sponsor-img">
                  {sponsor.image?.previewUrl ? <img src={sponsor.image.previewUrl} alt="" /> : <span>[Sponsor flyer]</span>}
                  {sponsor.boothText && <em>{sponsor.boothText}</em>}
                </div>
                <span className="ig-gp-sponsor-name">
                  <span aria-hidden="true">{initials(sponsor.sponsorName)}</span>
                  <strong>{sponsor.sponsorName}</strong>
                </span>
                <span className="ig-gp-btn is-ink">{sponsor.ctaText || 'Learn More'}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {collect && proxy && (
        <div className="ig-gp-proxy">
          <strong>Checking in someone with you?</strong>
          <span>Family or friends without a phone can check in from yours. You can add up to 3.</span>
          <span className="ig-gp-btn is-ghost">Yes, add a guest</span>
        </div>
      )}

      {!personal && !(after === 'eventFlyer' && event.flyerUrl) && !showSponsors && !(collect && proxy) && (
        <p className="ig-gp-lead is-center">Guests see a simple "You're checked in" message.</p>
      )}

      <span className="ig-gp-link">View event details</span>
      <span className="ig-gp-powered">Powered by <img src="/ingather-logo.png" alt="Ingather" /></span>
    </>
  );
}

function IgCheckinPreview({ tab, ...props }) {
  return (
    <div className="ig-gp" aria-hidden="true">
      {tab === 'after' ? <AfterScreen {...props} /> : <CheckinScreen {...props} />}
    </div>
  );
}

export default IgCheckinPreview;
