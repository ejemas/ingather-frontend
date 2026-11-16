// Holding page for admin sections that are built next. Says plainly what is coming.
import React from 'react';
import { Link } from 'react-router-dom';

const SECTIONS = {
  waitlist: ['Waitlist', 'Review people waiting to join, then invite or turn them down.'],
  orgs: ['Organisations', 'Every organisation on Ingather, with their events and how they use it.'],
  events: ['Events', 'Events that are live now, coming up, and already done.'],
  help: ['Help', 'Help tickets from organisers. Urgent ones from live events sit at the top.'],
  broadcasts: ['Broadcasts', 'Send an email or an in-app message to organisers.'],
  team: ['Team', 'People who can open this dashboard, and what each of them can do.'],
  activity: ['Activity log', 'Everything people did in this admin dashboard. Only you can see it.']
};

export default function AdminSoon({ section }) {
  const [title, subtitle] = SECTIONS[section] || ['Coming soon', ''];
  return (
    <>
      <div className="ig-ad-pagehead">
        <div className="ig-ad-pagehead-text">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <section className="ig-ad-panel ig-ad-soon" aria-label={title}>
        <span className="ig-ad-eyebrow">Being built next</span>
        <p>This part of the admin dashboard is not switched on yet. The Overview is ready to use now.</p>
        {section === 'waitlist' ? (
          <p>Until this is ready, keep using the current waitlist page. It works the same as before.</p>
        ) : null}
        <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {section === 'waitlist' ? <Link className="ig-ad-btn" to="/admin/waitlist">Open the current waitlist page</Link> : null}
          <Link className="ig-ad-btn-2" to="/admin">Back to Overview</Link>
        </span>
      </section>
    </>
  );
}
