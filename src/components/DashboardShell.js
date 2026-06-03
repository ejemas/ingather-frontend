import React, { useEffect, useRef, useState } from 'react';
import API from '../api/axios';
import { getCurrentChurch } from '../api/authService';
import { useEventTemplate } from '../context/EventTemplateContext';
import '../styles/Dashboard.css';

const Icons = {
  logo: <img src="/ingather-logo.png" alt="Ingather" className="sidebar-logo-img" />,
  collapse: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="3" y="3" width="14" height="14" rx="2" />
      <line x1="9" y1="3" x2="9" y2="17" />
    </svg>
  ),
  dashboard: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="6" height="6" rx="1" fill="currentColor" stroke="none" />
      <rect x="11" y="3" width="6" height="6" rx="1" fill="currentColor" stroke="none" />
      <rect x="3" y="11" width="6" height="6" rx="1" fill="currentColor" stroke="none" />
      <rect x="11" y="11" width="6" height="6" rx="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  preEvents: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="14" height="13" rx="2" />
      <line x1="3" y1="8" x2="17" y2="8" />
      <path d="M7 12l2 2 4-5" />
    </svg>
  ),
  createProgram: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7" />
      <line x1="10" y1="7" x2="10" y2="13" />
      <line x1="7" y1="10" x2="13" y2="10" />
    </svg>
  ),
  allPrograms: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="14" height="12" rx="2" />
      <line x1="3" y1="8" x2="17" y2="8" />
      <line x1="7" y1="4" x2="7" y2="8" />
      <line x1="13" y1="4" x2="13" y2="8" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.15" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2h.2a2 2 0 0 1 2 1.75l.16 1.28a7.6 7.6 0 0 1 1.22.7l1.2-.5a2 2 0 0 1 2.46.78l.1.18a2 2 0 0 1-.35 2.55l-1.03.79c.03.23.04.47.04.71s-.01.48-.04.71l1.03.79a2 2 0 0 1 .35 2.55l-.1.18a2 2 0 0 1-2.46.78l-1.2-.5c-.38.27-.79.5-1.22.7l-.16 1.28a2 2 0 0 1-2 1.75H12a2 2 0 0 1-2-1.75l-.16-1.28a7.6 7.6 0 0 1-1.22-.7l-1.2.5a2 2 0 0 1-2.46-.78l-.1-.18a2 2 0 0 1 .35-2.55l1.03-.79a6.62 6.62 0 0 1 0-1.42l-1.03-.79a2 2 0 0 1-.35-2.55l.1-.18a2 2 0 0 1 2.46-.78l1.2.5c.38-.27.79-.5 1.22-.7L10 3.75A2 2 0 0 1 12 2Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  notification: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2a5 5 0 015 5c0 4 2 5 2 5H3s2-1 2-5a5 5 0 015-5z" />
      <path d="M8.5 17a1.5 1.5 0 003 0" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17H4a1 1 0 01-1-1V4a1 1 0 011-1h3" />
      <polyline points="11,14 17,10 11,6" />
      <line x1="17" y1="10" x2="7" y2="10" />
    </svg>
  ),
  chevronRight: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6,4 10,8 6,12" />
    </svg>
  ),
  chevronDown: (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3,5 7,9 11,5" />
    </svg>
  ),
  sun: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="3.5" />
      <line x1="10" y1="2" x2="10" y2="4" />
      <line x1="10" y1="16" x2="10" y2="18" />
      <line x1="2" y1="10" x2="4" y2="10" />
      <line x1="16" y1="10" x2="18" y2="10" />
      <line x1="4.2" y1="4.2" x2="5.6" y2="5.6" />
      <line x1="14.4" y1="14.4" x2="15.8" y2="15.8" />
      <line x1="4.2" y1="15.8" x2="5.6" y2="14.4" />
      <line x1="14.4" y1="5.6" x2="15.8" y2="4.2" />
    </svg>
  ),
  moon: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 10.5A7 7 0 119.5 3a5.5 5.5 0 007.5 7.5z" />
    </svg>
  )
};

function DashboardShell({ activeNav = 'pre-events', pageTitle = 'Pre-Events', children }) {
  const [churchData, setChurchData] = useState({ name: '', email: '', logo: null });
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('ingather-theme') === 'dark');
  const profileMenuRef = useRef(null);
  const { template, setTemplateKey } = useEventTemplate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    const loadShellData = async () => {
      try {
        const [church, unread] = await Promise.all([
          getCurrentChurch(),
          API.get('/notifications/unread-count').catch(() => ({ data: { unreadCount: 0 } }))
        ]);

        const organizationType = church.organizationType || '';
        if (organizationType) {
          setTemplateKey(organizationType);
        }

        setChurchData({
          name: church.churchName,
          email: church.email,
          logo: church.logoUrl
        });
        setUnreadCount(unread.data?.unreadCount || 0);
      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      }
    };

    loadShellData();
  }, [setTemplateKey]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('ingather-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('church');
    window.location.href = '/login';
  };

  const churchInitials = churchData.name
    ? churchData.name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase()
    : 'IN';

  return (
    <div className="dashboard">
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-drawer-open' : ''}`}>
        <div className="sidebar-logo">
          <a href="/dashboard" className="sidebar-logo-link">
            <span className="sidebar-logo-icon">{Icons.logo}</span>
            <span className="sidebar-logo-text">Ingather</span>
          </a>
          <button className="sidebar-collapse-btn" title="Toggle sidebar">
            {Icons.collapse}
          </button>
        </div>

        <nav className="sidebar-nav">
          <a href="/dashboard" className={`nav-item ${activeNav === 'dashboard' ? 'active' : ''}`} onClick={closeMobileMenu}>
            <span className="nav-icon">{Icons.dashboard}</span>
            <span>Dashboard</span>
          </a>
          <a href="/pre-events" className={`nav-item ${activeNav === 'pre-events' ? 'active' : ''}`} onClick={closeMobileMenu}>
            <span className="nav-icon">{Icons.preEvents}</span>
            <span>Pre-Events</span>
          </a>
          <a href="/create-program" className={`nav-item ${activeNav === 'create-program' ? 'active' : ''}`} onClick={closeMobileMenu}>
            <span className="nav-icon">{Icons.createProgram}</span>
            <span>{template.event.create}</span>
          </a>
          <a href="/programs" className={`nav-item ${activeNav === 'programs' ? 'active' : ''}`} onClick={closeMobileMenu}>
            <span className="nav-icon">{Icons.allPrograms}</span>
            <span>{template.event.all}</span>
          </a>
          <a href="/settings" className={`nav-item ${activeNav === 'settings' ? 'active' : ''}`} onClick={closeMobileMenu}>
            <span className="nav-icon">{Icons.settings}</span>
            <span>Settings</span>
          </a>
        </nav>

        <div className="sidebar-footer">
          <a href="/settings?tab=notifications" className="sidebar-footer-item" onClick={closeMobileMenu}>
            <span className="nav-icon">{Icons.notification}</span>
            <span>Notification</span>
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </a>
          <button className="btn-logout" onClick={() => { closeMobileMenu(); handleLogout(); }}>
            <span className="nav-icon">{Icons.logout}</span>
            <span>Log out</span>
          </button>
        </div>

        <div className="sidebar-profile" onClick={() => { closeMobileMenu(); window.location.href = '/settings'; }}>
          <div className="sidebar-profile-avatar">
            {churchData.logo ? (
              <img src={churchData.logo} alt={churchData.name} />
            ) : (
              <span className="sidebar-profile-avatar-fallback">{churchInitials}</span>
            )}
          </div>
          <div className="sidebar-profile-info">
            <div className="sidebar-profile-name">{churchData.name || 'Ingather'}</div>
            <div className="sidebar-profile-email">{churchData.email || 'workspace@ingather.app'}</div>
          </div>
          <span className="sidebar-profile-chevron">{Icons.chevronRight}</span>
        </div>
      </aside>

      {isMobileMenuOpen && (
        <button type="button" className="mobile-sidebar-backdrop" aria-label="Close navigation menu" onClick={closeMobileMenu} />
      )}

      <main className="dashboard-main">
        <header className="top-navbar">
          <div className="navbar-left">
            <button
              type="button"
              className="mobile-menu-btn"
              aria-label="Open navigation menu"
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(true)}
            >
              {Icons.dashboard}
            </button>
            <span className="navbar-church-name">{pageTitle}</span>
          </div>

          <div className="navbar-right">
            <button className="theme-toggle" onClick={() => setDarkMode(prev => !prev)}>
              <span className="theme-toggle-label">{darkMode ? 'Night Mode' : 'Day Mode'}</span>
              <span className="theme-toggle-icon">{darkMode ? Icons.moon : Icons.sun}</span>
            </button>
            <a href="/settings?tab=notifications" className="navbar-icon-btn" aria-label="Notifications">
              {Icons.notification}
              {unreadCount > 0 && <span className="icon-badge"></span>}
            </a>
            <a href="/settings" className="navbar-icon-btn" aria-label="Settings">
              {Icons.settings}
            </a>
            <div className="navbar-avatar-dropdown" ref={profileMenuRef}>
              <div className="navbar-avatar" onClick={() => window.location.href = '/settings'} title="View Profile">
                {churchData.logo ? (
                  <img src={churchData.logo} alt={churchData.name} />
                ) : (
                  <div className="navbar-avatar-fallback">{churchInitials}</div>
                )}
              </div>
              <span className={`chevron-toggle ${showProfileMenu ? 'open' : ''}`} onClick={() => setShowProfileMenu(prev => !prev)}>
                {Icons.chevronDown}
              </span>
              {showProfileMenu && (
                <div className="profile-dropdown-menu">
                  <button className="profile-dropdown-item" onClick={() => { setShowProfileMenu(false); window.location.href = '/settings'; }}>
                    {Icons.settings}
                    Settings
                  </button>
                  <div className="profile-dropdown-divider"></div>
                  <button className="profile-dropdown-item logout-item" onClick={handleLogout}>
                    {Icons.logout}
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}

export default DashboardShell;
