import React, { useState, useEffect, useRef } from 'react';
import { getPrograms, deleteProgram } from '../api/programService';
import { useToast } from '../components/Toast';
import '../styles/Dashboard.css';

/* SVG Icons (shared with Dashboard) */
const Icons = {
  logo: (
    <img src="/ingather-logo.png" alt="Ingather" className="sidebar-logo-img" />
  ),
  collapse: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="3" y="3" width="14" height="14" rx="2" />
      <line x1="9" y1="3" x2="9" y2="17" />
    </svg>
  ),
  dashboard: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="6" height="6" rx="1" fill="currentColor" stroke="none" />
      <rect x="11" y="3" width="6" height="6" rx="1" fill="currentColor" stroke="none" />
      <rect x="3" y="11" width="6" height="6" rx="1" fill="currentColor" stroke="none" />
      <rect x="11" y="11" width="6" height="6" rx="1" fill="currentColor" stroke="none" />
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
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 1.75c.82 0 1.52.58 1.68 1.39l.22 1.09c.09.46.58.73 1.02.56l1.04-.4c.76-.29 1.63.02 2.05.72.41.7.27 1.6-.35 2.13l-.85.72c-.36.3-.36.86 0 1.16l.85.72c.62.53.76 1.43.35 2.13-.42.7-1.29 1.01-2.05.72l-1.04-.4c-.44-.17-.93.1-1.02.56l-.22 1.09A1.72 1.72 0 0110 18.25c-.82 0-1.52-.58-1.68-1.39l-.22-1.09a.78.78 0 00-1.02-.56l-1.04.4a1.72 1.72 0 01-2.05-.72 1.72 1.72 0 01.35-2.13l.85-.72c.36-.3.36-.86 0-1.16l-.85-.72A1.72 1.72 0 013.99 5.1c.42-.7 1.29-1.01 2.05-.72l1.04.4c.44.17.93-.1 1.02-.56l.22-1.09A1.72 1.72 0 0110 1.75z" />
      <circle cx="10" cy="10" r="2.5" />
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
      <line x1="10" y1="2" x2="10" y2="4" /><line x1="10" y1="16" x2="10" y2="18" />
      <line x1="2" y1="10" x2="4" y2="10" /><line x1="16" y1="10" x2="18" y2="10" />
      <line x1="4.2" y1="4.2" x2="5.6" y2="5.6" /><line x1="14.4" y1="14.4" x2="15.8" y2="15.8" />
      <line x1="4.2" y1="15.8" x2="5.6" y2="14.4" /><line x1="14.4" y1="5.6" x2="15.8" y2="4.2" />
    </svg>
  ),
  moon: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 10.5A7 7 0 119.5 3a5.5 5.5 0 007.5 7.5z" />
    </svg>
  ),
  gear: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 1.75c.82 0 1.52.58 1.68 1.39l.22 1.09c.09.46.58.73 1.02.56l1.04-.4c.76-.29 1.63.02 2.05.72.41.7.27 1.6-.35 2.13l-.85.72c-.36.3-.36.86 0 1.16l.85.72c.62.53.76 1.43.35 2.13-.42.7-1.29 1.01-2.05.72l-1.04-.4c-.44-.17-.93.1-1.02.56l-.22 1.09A1.72 1.72 0 0110 18.25c-.82 0-1.52-.58-1.68-1.39l-.22-1.09a.78.78 0 00-1.02-.56l-1.04.4a1.72 1.72 0 01-2.05-.72 1.72 1.72 0 01.35-2.13l.85-.72c.36-.3.36-.86 0-1.16l-.85-.72A1.72 1.72 0 013.99 5.1c.42-.7 1.29-1.01 2.05-.72l1.04.4c.44.17.93-.1 1.02-.56l.22-1.09A1.72 1.72 0 0110 1.75z" />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3,4 13,4" />
      <path d="M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1" />
      <path d="M4 4l.7 9.1a1 1 0 001 .9h4.6a1 1 0 001-.9L12 4" />
      <line x1="7" y1="7" x2="7" y2="12" />
      <line x1="9" y1="7" x2="9" y2="12" />
    </svg>
  ),
};

function AllPrograms() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [churchData, setChurchData] = useState({ name: '', branch: '', email: '', logo: null });
  const [unreadCount, setUnreadCount] = useState(0);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('ingather-theme') === 'dark';
  });
  const toast = useToast();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  // Theme effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('ingather-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    fetchPrograms();
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    const previousOverflow = document.body.style.overflow;

    document.addEventListener('keydown', handleEscape);
    if (isMobileMenuOpen) document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const fetchPrograms = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const { getCurrentChurch } = await import('../api/authService');
      const church = await getCurrentChurch();
      setChurchData({
        name: church.churchName,
        branch: church.branchName,
        email: church.email || '',
        logo: church.logoUrl
      });

      // Fetch unread notification count
      try {
        const axios = (await import('axios')).default;
        const countRes = await axios.get(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/notifications/unread-count`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        setUnreadCount(countRes.data.unreadCount || 0);
      } catch (err) {
        console.error('Error fetching unread count:', err);
      }

      const response = await getPrograms();
      const formattedPrograms = response.programs.map(p => ({
        id: p.id,
        title: p.title,
        date: p.date,
        startTime: p.startTime,
        endTime: p.endTime,
        totalScans: p.totalScans,
        status: p.isActive ? 'active' : 'completed',
        dataCollection: p.trackingMode === 'collect-data'
      }));

      setPrograms(formattedPrograms);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching programs:', error);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    toast.confirm('Are you sure you want to logout?', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('church');
      window.location.href = '/';
    });
  };

  const handleDeleteProgram = (program) => {
    toast.confirm(
      `Are you sure you want to delete "${program.title}"? This will permanently remove all its data.`,
      async () => {
        try {
          await deleteProgram(program.id);
          setPrograms(prev => prev.filter(p => p.id !== program.id));
          toast.success('Program deleted successfully!');
        } catch (error) {
          toast.error(error.response?.data?.error || 'Failed to delete program.');
        }
      }
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${weekday}, ${month} ${day}${suffix}, ${year}`;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      active: 'status-active',
      upcoming: 'status-upcoming',
      completed: 'status-completed'
    };
    return statusColors[status] || '';
  };

  const toggleTheme = () => setDarkMode(prev => !prev);

  const churchInitials = churchData.name
    ? churchData.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'IN';

  const filteredPrograms = programs.filter(program => {
    if (activeFilter === 'all') return true;
    return program.status === activeFilter;
  });

  // Count active programs for the "Active" tab badge
  const activeCount = programs.filter(p => p.status === 'active').length;

  if (loading) {
    return (
      <div className="dashboard">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <a href="/dashboard" className="sidebar-logo-link">
              <span className="sidebar-logo-icon">{Icons.logo}</span>
              <span className="sidebar-logo-text">Ingather</span>
            </a>
          </div>
        </aside>
        <main className="dashboard-main">
          <div className="dashboard-loading">
            <div className="spinner"></div>
            <p>Loading programs...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Sidebar */}
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
          <a href="/dashboard" className="nav-item" onClick={closeMobileMenu}>
            <span className="nav-icon">{Icons.dashboard}</span>
            <span>Dashboard</span>
          </a>
          <a href="/create-program" className="nav-item" onClick={closeMobileMenu}>
            <span className="nav-icon">{Icons.createProgram}</span>
            <span>Create Program</span>
          </a>
          <a href="/programs" className="nav-item active" onClick={closeMobileMenu}>
            <span className="nav-icon">{Icons.allPrograms}</span>
            <span>All Program</span>
          </a>
          <a href="/settings" className="nav-item" onClick={closeMobileMenu}>
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
            <div className="sidebar-profile-name">{churchData.name}</div>
            <div className="sidebar-profile-email">{churchData.email}</div>
          </div>
          <span className="sidebar-profile-chevron">{Icons.chevronRight}</span>
        </div>
      </aside>
      {isMobileMenuOpen && (
        <button
          type="button"
          className="mobile-sidebar-backdrop"
          aria-label="Close navigation menu"
          onClick={closeMobileMenu}
        />
      )}

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Top Navbar */}
        <header className="top-navbar">
          <div className="navbar-left">
            <button
              type="button"
              className="mobile-menu-btn"
              aria-label="Open navigation menu"
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
            <span className="navbar-church-name">All Programs</span>
          </div>
          <div className="navbar-right">
            <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
              <span className="theme-toggle-label">{darkMode ? 'Night Mode' : 'Day Mode'}</span>
              <span className="theme-toggle-icon">{darkMode ? Icons.moon : Icons.sun}</span>
            </button>
            <button className="navbar-icon-btn" title="Notifications" onClick={() => window.location.href = '/settings?tab=notifications'}>
              {Icons.notification}
              {unreadCount > 0 && <span className="icon-badge"></span>}
            </button>
            <button className="navbar-icon-btn" title="Settings" onClick={() => window.location.href = '/settings'}>
              {Icons.gear}
            </button>
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
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="7" r="3" /><path d="M3 18v-1a5 5 0 0110 0v1" /><path d="M14 3.5a3 3 0 010 5.5" /><path d="M17 18v-1a5 5 0 00-3-4.5" /></svg>
                    View Profile
                  </button>
                  <div className="profile-dropdown-divider"></div>
                  <button className="profile-dropdown-item logout-item" onClick={() => { setShowProfileMenu(false); handleLogout(); }}>
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17H4a1 1 0 01-1-1V4a1 1 0 011-1h3" /><polyline points="11,14 17,10 11,6" /><line x1="17" y1="10" x2="7" y2="10" /></svg>
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          <h2 className="overview-title" style={{ marginBottom: '24px' }}>All Programs</h2>

          <div className="programs-section">
            <div className="section-header">
              <div className="filter-tabs">
                <button
                  className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('all')}
                >
                  All
                </button>
                <button
                  className={`filter-tab ${activeFilter === 'active' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('active')}
                >
                  Active
                </button>
                <button
                  className={`filter-tab ${activeFilter === 'upcoming' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('upcoming')}
                >
                  Upcoming
                  {activeCount > 0 && <span className="filter-tab-badge">{activeCount}</span>}
                </button>
                <button
                  className={`filter-tab ${activeFilter === 'completed' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('completed')}
                >
                  Completed
                </button>
              </div>
            </div>

            <div className="programs-table-container">
              <table className="programs-table">
                <thead>
                  <tr>
                    <th>Program Title</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Attendance</th>
                    <th>Data Collection</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPrograms.length === 0 ? (
                    <tr>
                      <td colSpan="7">
                        <div className="empty-state">
                          <p>No programs found for this filter.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPrograms.map(program => (
                      <tr key={program.id}>
                        <td className="program-title-cell" data-label="Program">{program.title}</td>
                        <td data-label="Date">{formatDate(program.date)}</td>
                        <td data-label="Time">{formatTime(program.startTime)} - {formatTime(program.endTime)}</td>
                        <td data-label="Status">
                          <span className={`status-badge ${getStatusBadge(program.status)}`}>
                            {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
                          </span>
                        </td>
                        <td data-label="Attendance"><strong>{program.totalScans.toLocaleString()}</strong></td>
                        <td data-label="Data Collection">
                          <span className={program.dataCollection ? 'badge-yes' : 'badge-no'}>
                            {program.dataCollection ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td data-label="Actions">
                          <div className="action-buttons">
                            <button
                              className="btn-action btn-view"
                              onClick={() => window.location.href = `/program/${program.id}`}
                            >
                              View
                            </button>
                            <button
                              className="btn-action btn-delete"
                              onClick={() => handleDeleteProgram(program)}
                              title="Delete program"
                            >
                              {Icons.trash}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AllPrograms;
