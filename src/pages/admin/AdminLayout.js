// Admin app frame: dark side menu on wide screens, a top bar and slide-out menu on phones.
import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { adminData } from '../../api/adminApi';
import { useAdminSession, canOpen } from './AdminSession';
import { AdminIcon } from './AdminIcons';

export const ADMIN_SECTIONS = [
  { key: 'overview', label: 'Overview', to: '/admin', end: true },
  { key: 'waitlist', label: 'Waitlist', to: '/admin/leads', badge: 'waitlistPending' },
  { key: 'orgs', label: 'Organisations', to: '/admin/organisations' },
  { key: 'events', label: 'Events', to: '/admin/events' },
  { key: 'help', label: 'Help', to: '/admin/help', badge: 'helpWaiting' },
  { key: 'broadcasts', label: 'Broadcasts', to: '/admin/broadcasts' },
  { key: 'team', label: 'Team', to: '/admin/team' },
  { key: 'activity', label: 'Activity log', to: '/admin/activity', ownerOnly: true }
];

const ROLE_WORDS = { owner: 'Owner', admin: 'Admin', viewer: 'Viewer' };

const initialsOf = (name) => String(name || '')
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((word) => word[0].toUpperCase())
  .join('') || 'IG';

const timeWords = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

function Brand() {
  return (
    <span className="ig-ad-side-brand">
      <img src="/ingather-logo.png" alt="Ingather" />
      <span className="ig-ad-pill-orange">Admin</span>
    </span>
  );
}

function Nav({ counts, role, onPick }) {
  return (
    <nav className="ig-ad-nav" aria-label="Admin sections">
      {ADMIN_SECTIONS.filter((item) => !item.ownerOnly || role === 'owner').map((item) => {
        const open = canOpen(role, item.key);
        const badge = open && item.badge && counts ? counts[item.badge] : null;
        return (
          <NavLink key={item.key} to={item.to} end={item.end} className={({ isActive }) => `${isActive ? 'is-on' : ''}${open ? '' : ' is-locked'}`} onClick={onPick} aria-label={open ? undefined : `${item.label} (locked for your role)`}>
            <span className="ig-ad-nav-ic"><AdminIcon name={item.key} size={18} nav /></span>
            <span className="ig-ad-nav-label">{item.label}</span>
            {badge ? <span className="ig-ad-badge">{badge > 99 ? '99+' : badge}</span> : null}
            {open ? null : <span className="ig-ad-nav-lock"><AdminIcon name="lock" size={14} /></span>}
          </NavLink>
        );
      })}
    </nav>
  );
}

function Me({ admin, onSignOut }) {
  return (
    <div className="ig-ad-me">
      <span className="ig-ad-me-av">{initialsOf(admin?.name)}</span>
      <span className="ig-ad-me-text">
        <strong>{admin?.name}</strong>
        <span>{ROLE_WORDS[admin?.role] || ''}</span>
      </span>
      <button type="button" className="ig-ad-me-out" aria-label="Sign out" title="Sign out" onClick={onSignOut}>
        <AdminIcon name="signout" size={17} />
      </button>
    </div>
  );
}

export default function AdminLayout() {
  const { session, signOut } = useAdminSession();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [counts, setCounts] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const loadCounts = useCallback(() => {
    adminData.summary().then(({ data }) => setCounts(data)).catch(() => {});
  }, []);

  useEffect(() => { loadCounts(); }, [loadCounts, location.pathname]);
  useEffect(() => { setDrawer(false); }, [location.pathname]);

  useEffect(() => {
    if (!drawer) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') setDrawer(false); };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [drawer]);

  const role = session.admin?.role;

  return (
    <div className="ig-ad-app">
      <aside className="ig-ad-side" aria-label="Admin">
        <Brand />
        <Nav counts={counts} role={role} />
        <div className="ig-ad-side-foot">
          <span className="ig-ad-side-note">
            Numbers update every 5 minutes.{updatedAt ? ` Last update ${timeWords(updatedAt)}.` : ''}
          </span>
          <Me admin={session.admin} onSignOut={signOut} />
        </div>
      </aside>

      <div className="ig-ad-body">
        <header className="ig-ad-topbar">
          <Brand />
          <button type="button" className="ig-ad-icon-btn" aria-label="Open menu" aria-expanded={drawer} onClick={() => setDrawer(true)}>
            <AdminIcon name="menu" size={20} />
          </button>
        </header>
        <main className="ig-ad-main">
          <Outlet context={{ setUpdatedAt, reloadCounts: loadCounts }} />
        </main>
      </div>

      {drawer ? (
        <div className="ig-ad-drawer-wrap" onClick={() => setDrawer(false)} role="presentation">
          <aside className="ig-ad-drawer" aria-label="Admin" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="ig-ad-drawer-head">
              <Brand />
              <button type="button" className="ig-ad-icon-btn" aria-label="Close menu" onClick={() => setDrawer(false)}>
                <AdminIcon name="close" size={17} />
              </button>
            </div>
            <Nav counts={counts} role={role} onPick={() => setDrawer(false)} />
            <div style={{ marginTop: 'auto' }}>
              <Me admin={session.admin} onSignOut={signOut} />
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
