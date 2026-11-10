import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/IgWaitlist.css';
import '../styles/IgLegal.css';

const KINDS = {
  page: {
    big: '404', tag: 'Not found', tagText: 'The link may be broken', titleStart: "This page doesn't", titleBox: 'exist',
    lead: 'The address may be mistyped, or the page has moved. Try one of these instead.', primary: 'Discover events', primaryTo: '/discover', photo: '/landing/gathering.jpg'
  },
  event: {
    big: 'RSVP', tag: 'Event unavailable', tagText: 'This RSVP link is not active', titleStart: "We couldn't find this", titleBox: 'event',
    lead: 'The link may be wrong, or the host has removed the event. Check the link with whoever shared it, or find another event.', primary: 'Find other events', primaryTo: '/discover', photo: '/landing/cta.jpg'
  }
};

function NotFound({ kind = 'page' }) {
  const k = KINDS[kind] || KINDS.page;
  useEffect(() => { document.title = 'Page not found | Ingather'; }, []);
  return (
    <div className="ig-wl ig-lg ig-nf">
      <div className="ig-wl-frame">
        <div className="ig-wl-col">
          <div className="ig-wl-navwrap">
            <nav className="ig-wl-nav" aria-label="Main">
              <Link to="/" className="ig-wl-brand" aria-label="Ingather home"><img src="/ingather-logo.png" alt="Ingather" /></Link>
              <Link to="/discover" className="ig-wl-login">Discover Events</Link>
            </nav>
          </div>

          <main className="ig-nf-main">
            <div className="ig-nf-art" aria-hidden="true">
              <img src={k.photo} alt="" />
              <span>{k.big}</span>
            </div>
            <span className="ig-wl-pill"><span>{k.tag}</span>{k.tagText}</span>
            <h1>{k.titleStart} <span className="ig-wl-mark">{k.titleBox}</span></h1>
            <p>{k.lead}</p>
            <div className="ig-nf-actions">
              <Link to={k.primaryTo} className="ig-nf-btn">{k.primary}</Link>
              <Link to="/" className="ig-nf-btn is-ghost">Back to home</Link>
            </div>
          </main>

          <footer className="ig-wl-foot">
            <span>&copy; 2026 Ingather. All rights reserved.</span>
            <Link to="/contact">Report a broken link</Link>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
