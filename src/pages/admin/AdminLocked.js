// Shown when someone opens a section their role does not include.
// The server refuses these sections too, so this page is a signpost, not the lock itself.
import React from 'react';
import { Link } from 'react-router-dom';
import { AdminIcon } from './AdminIcons';
import { ROLE_SECTIONS } from './AdminSession';

const TITLES = {
  overview: 'Overview',
  orgs: 'Organisations',
  events: 'Events',
  team: 'Team',
  activity: 'Activity log'
};

const OPEN_LINKS = {
  waitlist: ['Waitlist', '/admin/leads'],
  help: ['Help', '/admin/help'],
  broadcasts: ['Broadcasts', '/admin/broadcasts']
};

export default function AdminLocked({ section, role }) {
  const title = TITLES[section] || 'This page';
  const open = (ROLE_SECTIONS[role] || []).map((key) => OPEN_LINKS[key]).filter(Boolean);
  return (
    <>
      <div className="ig-ad-pagehead">
        <div className="ig-ad-pagehead-text">
          <h1>{title}</h1>
          <p>Locked for your role</p>
        </div>
      </div>
      <section className="ig-ad-panel ig-ad-locked" aria-label={`${title} is locked`}>
        <span className="ig-ad-locked-ic"><AdminIcon name="lock" size={22} /></span>
        <h2>This page is locked for you</h2>
        <p>
          {role === 'admin'
            ? `You are signed in as an Admin. That role covers the waitlist (people waiting to join), help tickets and broadcasts. If you need ${title === 'This page' ? 'this page' : title}, ask the owner.`
            : `${title} is for the owner only. Ask the owner if you need it.`}
        </p>
        {open.length ? (
          <span className="ig-ad-locked-links">
            {open.map(([label, to], i) => (
              <Link key={to} className={i === 0 ? 'ig-ad-btn' : 'ig-ad-btn-2'} to={to}>Go to {label}</Link>
            ))}
          </span>
        ) : null}
      </section>
    </>
  );
}
