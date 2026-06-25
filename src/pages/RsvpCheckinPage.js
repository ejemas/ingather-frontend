import React from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import '../styles/RsvpCheckin.css';

const PUBLIC_ORIGIN = 'https://ingather.app';

function RsvpCheckinPage() {
  const { token } = useParams();
  const checkinUrl = `${PUBLIC_ORIGIN}/rsvp-checkin/${encodeURIComponent(token || '')}`;

  return (
    <main className="rsvp-checkin-page">
      <section className="rsvp-checkin-card">
        <img src="/ingather-logo.png" alt="Ingather" className="rsvp-checkin-logo" />
        <span className="rsvp-checkin-kicker">Pre-registered access</span>
        <h1>Show this QR code at check-in</h1>
        <p>
          This is your personal RSVP check-in code. An event organizer should scan it from the live Ingather dashboard.
        </p>
        <div className="rsvp-checkin-qr">
          {token ? (
            <QRCodeCanvas value={checkinUrl} size={220} level="M" includeMargin />
          ) : (
            <span>QR unavailable</span>
          )}
        </div>
        <p className="rsvp-checkin-note">
          This page does not check you in automatically. It only gives the organizer your secure RSVP QR.
        </p>
      </section>
    </main>
  );
}

export default RsvpCheckinPage;
