import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { getRsvpPass } from '../api/preEventService';
import '../styles/IgPass.css';

const PUBLIC_ORIGIN = 'https://ingather.app';

const normalizeCode = (value) => String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '');

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const shortDate = (value) => {
  const date = toDate(value);
  return date ? date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/^(\w+) /, '$1, ') : '';
};
const shortTime = (value) => {
  const date = toDate(value);
  return date ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
};

const attendingLabel = (pass) => {
  if (pass.attendanceMode === 'virtual') return 'Online';
  if (pass.attendanceMode === 'physical') return 'In person';
  return pass.event?.virtualAttendanceEnabled ? 'Not chosen yet' : 'In person';
};

const Icon = {
  info: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C84B07" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>,
  check: <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>,
  broken: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 7H7a5 5 0 000 10h2M15 7h2a5 5 0 014.6 3M15 17h2a5 5 0 001.9-.4M8 12h3M3 3l18 18" /></svg>,
  lock: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
};

function PassTop({ label = 'Pre-registered' }) {
  return (
    <div className="ig-ps-top">
      <Link to="/" aria-label="Ingather home"><img src="/ingather-logo.png" alt="Ingather" /></Link>
      <span className="ig-ps-tag"><span>Pass</span>{label}</span>
    </div>
  );
}

function RsvpCheckinPage() {
  const { token } = useParams();
  const code = normalizeCode(token);
  const checkinUrl = `${PUBLIC_ORIGIN}/rsvp-checkin/${encodeURIComponent(token || '')}`;
  const [state, setState] = useState({ status: 'loading', pass: null });
  const [photoFailed, setPhotoFailed] = useState(false);

  const load = useCallback(() => {
    if (!token) {
      setState({ status: 'notfound', pass: null });
      return undefined;
    }
    let active = true;
    setState((prev) => ({ ...prev, status: 'loading' }));
    getRsvpPass(token)
      .then((data) => { if (active) setState({ status: 'ready', pass: data.pass }); })
      .catch((error) => {
        if (!active) return;
        const status = error.response?.status;
        setState({ status: status === 404 || status === 400 ? 'notfound' : 'offline', pass: null });
      });
    return () => { active = false; };
  }, [token]);

  useEffect(() => load(), [load]);

  useEffect(() => {
    const title = state.pass?.event?.title;
    document.title = title ? `Your pass for ${title} | Ingather` : 'Your RSVP pass | Ingather';
  }, [state.pass]);

  if (state.status === 'notfound') {
    return (
      <main className="ig-ps">
        <div className="ig-ps-col">
          <PassTop label="Not found" />
          <section className="ig-ps-empty" role="alert">
            <span className="ig-ps-empty-icon">{Icon.broken}</span>
            <h1>This pass link isn't working</h1>
            <p>The link may be incomplete. Open your pass again from the button in your RSVP email, or ask the organizer to resend it.</p>
            <Link to="/discover" className="ig-ps-btn">Find events</Link>
          </section>
        </div>
      </main>
    );
  }

  const loading = state.status === 'loading';
  const offline = state.status === 'offline';
  const pass = state.pass;
  const event = pass?.event || {};
  const checkedIn = Boolean(pass?.checkedIn);
  const closed = Boolean(event.checkInClosed) && !checkedIn;
  const venue = [event.venueName, event.city].filter(Boolean).join(', ');
  const isOnline = pass?.attendanceMode === 'virtual';

  return (
    <main className="ig-ps">
      <div className="ig-ps-col">
        <PassTop label={checkedIn ? 'Checked in' : 'Pre-registered'} />

        <section className={`ig-ps-ticket${loading ? ' is-loading' : ''}`} aria-label="Your RSVP pass" aria-busy={loading || undefined}>
          <div className="ig-ps-banner">
            {event.bannerUrl && !photoFailed && <img src={event.bannerUrl} alt={`${event.title} event banner`} onError={() => setPhotoFailed(true)} />}
            <div className="ig-ps-banner-shade" aria-hidden="true" />
            <div className="ig-ps-banner-text">
              {loading ? <><span className="ig-ps-sk is-light" style={{ width: 120 }} /><span className="ig-ps-sk is-light is-lg" style={{ width: 200 }} /></> : (
                <>
                  <span>{offline ? 'Ingather RSVP' : event.organizerName}</span>
                  <strong>{offline ? 'Your pass' : event.title}</strong>
                </>
              )}
            </div>
          </div>

          {!offline && (
            <dl className="ig-ps-details">
              <div><dt>Guest</dt><dd>{loading ? <span className="ig-ps-sk" /> : (pass.guestName || 'Guest')}</dd></div>
              <div><dt>Attending</dt><dd>{loading ? <span className="ig-ps-sk" /> : attendingLabel(pass)}</dd></div>
              <div><dt>Date</dt><dd>{loading ? <span className="ig-ps-sk" /> : (shortDate(event.eventDate) || 'To be announced')}</dd></div>
              <div><dt>Time</dt><dd>{loading ? <span className="ig-ps-sk" /> : (shortTime(event.eventDate) || 'To be announced')}</dd></div>
              {(loading || (venue && !isOnline)) && (
                <div className="is-wide"><dt>Venue</dt><dd>{loading ? <span className="ig-ps-sk is-wide" /> : venue}</dd></div>
              )}
            </dl>
          )}

          <div className="ig-ps-tear" aria-hidden="true"><span /><span /></div>

          {checkedIn ? (
            <div className="ig-ps-done" role="status">
              <span className="ig-ps-done-icon">{Icon.check}</span>
              <strong>You're checked in</strong>
              <span>{pass.checkedInAt ? `Checked in at ${shortTime(pass.checkedInAt)} on ${shortDate(pass.checkedInAt)}.` : 'Your pass has been scanned.'} Enjoy the event.</span>
            </div>
          ) : (
            <div className="ig-ps-qr-area">
              <div className={`ig-ps-qr${closed ? ' is-dim' : ''}`}>
                {token ? <QRCodeCanvas value={checkinUrl} size={210} level="M" includeMargin={false} aria-label="Your personal check-in QR code" role="img" /> : null}
              </div>
              {closed ? (
                <>
                  <strong className="ig-ps-qr-title">{Icon.lock} Check-in has closed</strong>
                  <span className="ig-ps-qr-text">This event has ended, so this pass can no longer be scanned.</span>
                </>
              ) : (
                <>
                  <strong className="ig-ps-qr-title">Show this at the entrance</strong>
                  <span className="ig-ps-qr-text">An usher scans it to check you in. It works once, so don't share it.</span>
                  <span className="ig-ps-code">
                    <span>Backup code if scanning fails</span>
                    <strong>{pass?.code || code}</strong>
                  </span>
                </>
              )}
            </div>
          )}
        </section>

        {offline ? (
          <div className="ig-ps-note" role="status">
            {Icon.info}
            <span>We couldn't load the event details, but your QR code and backup code still work at the door. <button type="button" onClick={load}>Try again</button></span>
          </div>
        ) : !checkedIn && !closed && (
          <div className="ig-ps-note">
            {Icon.info}
            <span>Opening this page doesn't check you in. Turn up your screen brightness at the door so the code scans fast.</span>
          </div>
        )}

        {event.slug && (
          <Link to={`/rsvp/${event.slug}`} className="ig-ps-btn is-ghost">View event details</Link>
        )}
      </div>
    </main>
  );
}

export default RsvpCheckinPage;
