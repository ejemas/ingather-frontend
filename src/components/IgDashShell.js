import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { markLoggedOut } from '../utils/authSession';
import { dateBadge, initialsOf, isSafeImageUrl } from '../utils/dashboardFormat';
import '../styles/IgDash.css';

const THEME_KEY = 'ingather-theme';
const COLLAPSE_KEY = 'ingather-sidebar-collapsed';

const readStorage = (key) => {
  try { return window.localStorage.getItem(key); } catch (error) { return null; }
};
const writeStorage = (key, value) => {
  try { window.localStorage.setItem(key, value); } catch (error) { /* storage blocked */ }
};

export const DashIcon = {
  plus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>,
  dashboard: <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="6" height="6" rx="1.5" /><rect x="11" y="3" width="6" height="6" rx="1.5" /><rect x="3" y="11" width="6" height="6" rx="1.5" /><rect x="11" y="11" width="6" height="6" rx="1.5" /></svg>,
  preEvents: <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="14" height="13" rx="2" /><path d="M3 8h14M7 12l2 2 4-5" /></svg>,
  events: <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="14" height="12" rx="2" /><path d="M3 8h14M7 4v4M13 4v4" /></svg>,
  settings: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>,
  help: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 015 .5c0 1.7-2.5 2-2.5 3.5M12 17h.01" /></svg>,
  bell: <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 2a5 5 0 015 5c0 4 2 5 2 5H3s2-1 2-5a5 5 0 015-5z" /><path d="M8.5 17a1.5 1.5 0 003 0" /></svg>,
  collapse: <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="2" /><path d="M9 3v14" /></svg>,
  menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10" /></svg>,
  close: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>,
  sun: <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="10" cy="10" r="3.5" /><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4" /></svg>,
  moon: <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M17 10.5A7 7 0 119.5 3a5.5 5.5 0 007.5 7.5z" /></svg>,
  chevronRight: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 4l4 4-4 4" /></svg>,
  chevronLeft: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 4L6 8l4 4" /></svg>,
  logout: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>,
  trash: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>,
  calendar: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>,
  clock: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
};


const STATUS_LABEL = { active: 'Active', upcoming: 'Upcoming', completed: 'Completed' };

export function StatusPill({ status }) {
  return <span className={`ig-db-status is-${status}`}><span aria-hidden="true" />{STATUS_LABEL[status] || status}</span>;
}

export function DateTile({ date, highlight, large }) {
  const b = dateBadge(date);
  return (
    <span className={`ig-db-date${highlight ? ' is-hot' : ''}${large ? ' is-lg' : ''}`} aria-hidden="true">
      <span>{b.month}</span><strong>{b.day}</strong>
    </span>
  );
}

export function WorkspaceMark({ church, size = 'md' }) {
  const [failed, setFailed] = useState(false);
  const logo = isSafeImageUrl(church?.logoUrl) && !failed ? church.logoUrl : null;
  return (
    <span className={`ig-db-mark is-${size}`}>
      {logo ? <img src={logo} alt="" onError={() => setFailed(true)} /> : initialsOf(church?.name)}
    </span>
  );
}

export function DashDialog({ icon, tone = 'neutral', title, children, cancelLabel, confirmLabel, onCancel, onConfirm, busy }) {
  const cancelRef = useRef(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (event) => { if (event.key === 'Escape' && !busy) onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel, busy]);

  return (
    <div className="ig-db-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
      <div className="ig-db-dialog" role="alertdialog" aria-modal="true" aria-labelledby="ig-db-dialog-title">
        <span className={`ig-db-dialog-icon is-${tone}`}>{icon}</span>
        <h2 id="ig-db-dialog-title">{title}</h2>
        <div className="ig-db-dialog-body">{children}</div>
        <div className="ig-db-dialog-actions">
          <button type="button" ref={cancelRef} className="ig-db-btn-ghost" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
          <button type="button" className={tone === 'danger' ? 'ig-db-btn-danger' : tone === 'primary' ? 'ig-db-btn-primary' : 'ig-db-btn-ink'} onClick={onConfirm} disabled={busy}>
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// A small "i" button that opens a short explanation of a number.
export function InfoTip({ id, title, text, openId, setOpenId }) {
  const open = openId === id;
  const ref = useRef(null);
  const [openLeft, setOpenLeft] = useState(false);
  const toggle = () => {
    // Opens to the right when there isn't room on the left, so it never runs off a phone screen.
    const box = ref.current?.getBoundingClientRect();
    setOpenLeft(Boolean(box && box.right < 300));
    setOpenId(open ? null : id);
  };
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => { if (ref.current && !ref.current.contains(event.target)) setOpenId(null); };
    const onKey = (event) => { if (event.key === 'Escape') setOpenId(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open, setOpenId]);
  return (
    <span className="ig-ed-info" ref={ref}>
      <button type="button" className={`ig-ed-info-btn${open ? ' is-on' : ''}`} aria-label={`About ${title}`} aria-expanded={open} onClick={toggle}>i</button>
      {open && (
        <span className={`ig-ed-info-pop${openLeft ? ' is-right' : ''}`} role="dialog" aria-label={title}>
          <strong>{title}</strong>
          <span>{text}</span>
          <button type="button" onClick={() => setOpenId(null)}>Got it</button>
        </span>
      )}
    </span>
  );
}

const NAV_ITEMS = [
  { key: 'dashboard', to: '/dashboard', icon: 'dashboard', label: () => 'Dashboard' },
  { key: 'pre-events', to: '/pre-events', icon: 'preEvents', label: () => 'Pre-Events', count: 'preEvents' },
  { key: 'events', to: '/programs', icon: 'events', label: (t) => t?.event?.all || 'All Events', count: 'events' },
  { key: 'settings', to: '/settings', icon: 'settings', label: () => 'Settings' }
];

function IgDashShell({ active, crumb, church, counts = {}, unreadCount = 0, live, template, children }) {
  const navigate = useNavigate();
  const [night, setNight] = useState(() => readStorage(THEME_KEY) === 'dark');
  const [collapsed, setCollapsed] = useState(() => readStorage(COLLAPSE_KEY) === '1');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const accountRef = useRef(null);
  const menuButtonRef = useRef(null);
  const drawerRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', night ? 'dark' : 'light');
    writeStorage(THEME_KEY, night ? 'dark' : 'light');
  }, [night]);

  useEffect(() => { writeStorage(COLLAPSE_KEY, collapsed ? '1' : '0'); }, [collapsed]);

  useEffect(() => {
    if (!accountOpen) return undefined;
    const onDown = (event) => { if (accountRef.current && !accountRef.current.contains(event.target)) setAccountOpen(false); };
    const onKey = (event) => { if (event.key === 'Escape') setAccountOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [accountOpen]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawerRef.current?.querySelector('button')?.focus();
    const onKey = (event) => { if (event.key === 'Escape') setDrawerOpen(false); };
    document.addEventListener('keydown', onKey);
    const toFocus = menuButtonRef.current;
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
      toFocus?.focus();
    };
  }, [drawerOpen]);

  const confirmLogout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('church');
    } catch (error) { /* storage blocked */ }
    markLoggedOut();
    navigate('/login', { replace: true });
  };

  const countFor = (item) => {
    if (!item.count) return '';
    const value = counts[item.count];
    return value > 0 ? String(value) : '';
  };

  const navList = (large) => NAV_ITEMS.map((item) => {
    const on = item.key === active;
    return (
      <Link
        key={item.key}
        to={item.to}
        className={`ig-db-nav-item${on ? ' is-on' : ''}${large ? ' is-lg' : ''}`}
        aria-current={on ? 'page' : undefined}
        title={collapsed && !large ? item.label(template) : undefined}
        onClick={() => setDrawerOpen(false)}
      >
        <span className="ig-db-nav-icon">{DashIcon[item.icon]}</span>
        <span className="ig-db-nav-label">{item.label(template)}</span>
        <span className="ig-db-nav-count">{countFor(item)}</span>
      </Link>
    );
  });

  const unreadBadge = unreadCount > 0 ? (unreadCount > 99 ? '99+' : String(unreadCount)) : '';
  const createLabel = template?.event?.create || 'Create Event';

  return (
    <div className={`ig-db${collapsed ? ' is-collapsed' : ''}`}>
      <aside className="ig-db-side" aria-label="Workspace">
        <div className="ig-db-side-top">
          <Link to="/dashboard" className="ig-db-logo" aria-label="Ingather dashboard"><img src="/ingather-logo.png" alt="Ingather" /></Link>
          <button
            type="button"
            className="ig-db-collapse"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-pressed={collapsed}
            onClick={() => setCollapsed((v) => !v)}
          >{DashIcon.collapse}</button>
        </div>

        <Link to="/create-program" className="ig-db-create" title={collapsed ? createLabel : undefined}>
          {DashIcon.plus}<span>{createLabel}</span>
        </Link>

        <nav className="ig-db-nav" aria-label="Main">
          <span className="ig-db-nav-head">Workspace</span>
          {navList(false)}
        </nav>

        <div className="ig-db-side-foot">
          {live && (
            <div className="ig-db-callout">
              <strong>{live.title} is live</strong>
              <span>Open the live headcount to follow check-ins.</span>
              <Link to={`/program/${live.id}`}>Go to event</Link>
            </div>
          )}
          <Link to="/help" className={`ig-db-foot-link${active === 'help' ? ' is-on' : ''}`} aria-current={active === 'help' ? 'page' : undefined} title={collapsed ? 'Help' : undefined}>
            {DashIcon.help}<span className="ig-db-nav-label">Help</span>
          </Link>
          <Link to="/settings?tab=notifications" className="ig-db-foot-link" title={collapsed ? 'Notifications' : undefined}>
            {DashIcon.bell}<span className="ig-db-nav-label">Notifications</span>
            {unreadBadge && <span className="ig-db-badge">{unreadBadge}</span>}
          </Link>
          <Link to="/settings" className="ig-db-account-card" title={collapsed ? church?.name : undefined}>
            <WorkspaceMark church={church} />
            <span className="ig-db-account-text">
              <strong>{church?.name || 'Your workspace'}</strong>
              <span>{church?.email || ''}</span>
            </span>
            <span className="ig-db-account-chev">{DashIcon.chevronRight}</span>
          </Link>
        </div>
      </aside>

      <div className="ig-db-body">
        <header className="ig-db-top">
          <div className="ig-db-top-left">
            <button type="button" ref={menuButtonRef} className="ig-db-menu-btn" aria-label="Open menu" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}>{DashIcon.menu}</button>
            <Link to="/dashboard" className="ig-db-top-logo" aria-label="Ingather dashboard"><img src="/ingather-logo.png" alt="Ingather" /></Link>
            <span className="ig-db-crumb">
              <span className="ig-db-crumb-ws">{church?.name || 'Workspace'}</span>
              <span className="ig-db-crumb-sep" aria-hidden="true">/</span>
              <strong>{crumb}</strong>
            </span>
          </div>
          <div className="ig-db-top-right">
            <div className="ig-db-theme" role="group" aria-label="Theme">
              <button type="button" aria-pressed={!night} className={!night ? 'is-on' : ''} onClick={() => setNight(false)}>{DashIcon.sun}Day</button>
              <button type="button" aria-pressed={night} className={night ? 'is-on' : ''} onClick={() => setNight(true)}>{DashIcon.moon}Night</button>
            </div>
            <Link
              to="/settings?tab=notifications"
              className="ig-db-bell"
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            >
              {DashIcon.bell}
              {unreadCount > 0 && <span className="ig-db-bell-dot" aria-hidden="true" />}
            </Link>
            <span className="ig-db-acct" ref={accountRef}>
              <button
                type="button"
                className={`ig-db-avatar${accountOpen ? ' is-open' : ''}`}
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((v) => !v)}
              >
                <WorkspaceMark church={church} size="round" />
              </button>
              {accountOpen && (
                <div className="ig-db-acct-menu" role="menu" aria-label="Account">
                  <div className="ig-db-acct-head">
                    <WorkspaceMark church={church} />
                    <span className="ig-db-account-text">
                      <strong>{church?.name || 'Your workspace'}</strong>
                      <span>{church?.email || ''}</span>
                    </span>
                  </div>
                  <span className="ig-db-acct-rule" />
                  <Link role="menuitem" to="/settings" onClick={() => setAccountOpen(false)}>{DashIcon.settings}Settings</Link>
                  <Link role="menuitem" to="/settings?tab=notifications" onClick={() => setAccountOpen(false)}>{DashIcon.bell}Notifications</Link>
                  <span className="ig-db-acct-rule" />
                  <button type="button" role="menuitem" className="is-danger" onClick={() => { setAccountOpen(false); setLogoutOpen(true); }}>{DashIcon.logout}Log out</button>
                </div>
              )}
            </span>
          </div>
        </header>

        <main className="ig-db-main" id="main">{children}</main>
      </div>

      {drawerOpen && (
        <div className="ig-db-drawer-wrap">
          <button type="button" className="ig-db-drawer-scrim" aria-label="Close menu" tabIndex={-1} onClick={() => setDrawerOpen(false)} />
          <aside className="ig-db-drawer" aria-label="Workspace" ref={drawerRef}>
            <div className="ig-db-drawer-top">
              <img src="/ingather-logo.png" alt="Ingather" />
              <button type="button" className="ig-db-round-btn" aria-label="Close menu" onClick={() => setDrawerOpen(false)}>{DashIcon.close}</button>
            </div>
            <Link to="/create-program" className="ig-db-create is-lg" onClick={() => setDrawerOpen(false)}>{DashIcon.plus}<span>{createLabel}</span></Link>
            <nav className="ig-db-nav" aria-label="Main">{navList(true)}</nav>
            <div className="ig-db-drawer-foot">
              {live && (
                <Link to={`/program/${live.id}`} className="ig-db-drawer-live" onClick={() => setDrawerOpen(false)}>
                  <span className="ig-db-live-dot" aria-hidden="true" />
                  <span><strong>{live.title}</strong> is live</span>
                  {DashIcon.chevronRight}
                </Link>
              )}
              <Link to="/help" className={`ig-db-drawer-link${active === 'help' ? ' is-on' : ''}`} aria-current={active === 'help' ? 'page' : undefined} onClick={() => setDrawerOpen(false)}>Help</Link>
              <Link to="/settings?tab=notifications" className="ig-db-drawer-link" onClick={() => setDrawerOpen(false)}>
                Notifications{unreadBadge && <span className="ig-db-badge">{unreadBadge}</span>}
              </Link>
              <button type="button" role="switch" aria-checked={night} className="ig-db-drawer-link" onClick={() => setNight((v) => !v)}>
                Night mode<span className={`ig-db-switch${night ? ' is-on' : ''}`}><span /></span>
              </button>
              <Link to="/settings" className="ig-db-account-card" onClick={() => setDrawerOpen(false)}>
                <WorkspaceMark church={church} />
                <span className="ig-db-account-text">
                  <strong>{church?.name || 'Your workspace'}</strong>
                  <span>{church?.email || ''}</span>
                </span>
              </Link>
              <button type="button" className="ig-db-drawer-logout" onClick={() => { setDrawerOpen(false); setLogoutOpen(true); }}>Log out</button>
            </div>
          </aside>
        </div>
      )}

      {logoutOpen && (
        <DashDialog
          icon={DashIcon.logout}
          title="Log out of Ingather?"
          cancelLabel="Stay logged in"
          confirmLabel="Log out"
          onCancel={() => setLogoutOpen(false)}
          onConfirm={confirmLogout}
        >
          You will need your email and password to get back in. Your events keep running and guests can still check in.
        </DashDialog>
      )}
    </div>
  );
}

export default IgDashShell;
