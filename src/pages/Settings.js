import React, { useState, useEffect, useRef } from 'react';
import { getCurrentChurch } from '../api/authService';
import { useToast } from '../components/Toast';
import '../styles/Dashboard.css';
import '../styles/Settings.css';

/* ============================================
   SVG ICONS
   ============================================ */
const Icons = {
  logo: (
    <img src="/ingather-logo.png" alt="Ingather" className="sidebar-logo-img" />
  ),
  collapse: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="14" height="14" rx="2" /><line x1="9" y1="3" x2="9" y2="17" /></svg>),
  dashboard: (<svg viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="6" height="6" rx="1" fill="currentColor" /><rect x="11" y="3" width="6" height="6" rx="1" fill="currentColor" /><rect x="3" y="11" width="6" height="6" rx="1" fill="currentColor" /><rect x="11" y="11" width="6" height="6" rx="1" fill="currentColor" /></svg>),
  createProgram: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="7" /><line x1="10" y1="7" x2="10" y2="13" /><line x1="7" y1="10" x2="13" y2="10" /></svg>),
  allPrograms: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="14" height="12" rx="2" /><line x1="3" y1="8" x2="17" y2="8" /><line x1="7" y1="4" x2="7" y2="8" /><line x1="13" y1="4" x2="13" y2="8" /></svg>),
  settings: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="2.5" /><path d="M10 3.5V5M10 15v1.5M16.5 10H15M5 10H3.5M14.6 5.4l-1.1 1.1M6.5 13.5l-1.1 1.1M14.6 14.6l-1.1-1.1M6.5 6.5L5.4 5.4" /></svg>),
  notification: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2a5 5 0 015 5c0 4 2 5 2 5H3s2-1 2-5a5 5 0 015-5z" /><path d="M8.5 17a1.5 1.5 0 003 0" /></svg>),
  logout: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17H4a1 1 0 01-1-1V4a1 1 0 011-1h3" /><polyline points="11,14 17,10 11,6" /><line x1="17" y1="10" x2="7" y2="10" /></svg>),
  chevronRight: (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6,4 10,8 6,12" /></svg>),
  chevronDown: (<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,5 7,9 11,5" /></svg>),
  sun: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="3.5" /><line x1="10" y1="2" x2="10" y2="4" /><line x1="10" y1="16" x2="10" y2="18" /><line x1="2" y1="10" x2="4" y2="10" /><line x1="16" y1="10" x2="18" y2="10" /><line x1="4.2" y1="4.2" x2="5.6" y2="5.6" /><line x1="14.4" y1="14.4" x2="15.8" y2="15.8" /><line x1="4.2" y1="15.8" x2="5.6" y2="14.4" /><line x1="14.4" y1="5.6" x2="15.8" y2="4.2" /></svg>),
  moon: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 10.5A7 7 0 119.5 3a5.5 5.5 0 007.5 7.5z" /></svg>),
  gear: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.3 3h3.4l.5 2.1a6 6 0 011.7 1l2-.7 1.7 3-1.5 1.4a6 6 0 010 2l1.5 1.4-1.7 3-2-.7a6 6 0 01-1.7 1L11.7 17H8.3l-.5-2.1a6 6 0 01-1.7-1l-2 .7-1.7-3 1.5-1.4a6 6 0 010-2L2.4 7.8l1.7-3 2 .7a6 6 0 011.7-1L8.3 3z" /><circle cx="10" cy="10" r="2.5" /></svg>),
  // Sub-nav icons
  user: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="7" r="4" /><path d="M3 19v-1a5 5 0 015-5h4a5 5 0 015 5v1" /></svg>),
  lock: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="9" width="12" height="8" rx="2" /><path d="M7 9V6a3 3 0 016 0v3" /></svg>),
  bell: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2a5 5 0 015 5c0 4 2 5 2 5H3s2-1 2-5a5 5 0 015-5z" /><path d="M8.5 17a1.5 1.5 0 003 0" /></svg>),
  pencil: (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" /></svg>),
  gearSmall: (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="2" /><path d="M6.6 2.4h2.8l.4 1.7a4.8 4.8 0 011.4.8l1.6-.6 1.4 2.4-1.2 1.1a4.8 4.8 0 010 1.6l1.2 1.1-1.4 2.4-1.6-.6a4.8 4.8 0 01-1.4.8l-.4 1.7H6.6l-.4-1.7a4.8 4.8 0 01-1.4-.8l-1.6.6-1.4-2.4 1.2-1.1a4.8 4.8 0 010-1.6L1.8 6.7l1.4-2.4 1.6.6a4.8 4.8 0 011.4-.8L6.6 2.4z" /></svg>),
  avatarPlaceholder: (<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round"><circle cx="24" cy="24" r="23" strokeDasharray="4 3" /><circle cx="24" cy="19" r="7" /><path d="M8 42c0-8 7-14 16-14s16 6 16 14" /></svg>),
};

/* ============================================
   RELATIVE TIME UTILITY
   ============================================ */
function getRelativeTime(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  if (diffWeek < 4) return `${diffWeek}w`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ============================================
   MAIN SETTINGS COMPONENT
   ============================================ */
function Settings() {
  // Read ?tab query parameter from URL
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab') === 'notifications' ? 'notifications' : 'church';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [churchData, setChurchData] = useState({ churchName: '', branchName: '', email: '', location: '', logoUrl: '' });
  const [formData, setFormData] = useState({ churchName: '', branchName: '', location: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', repeatPassword: '' });
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [logoPreview, setLogoPreview] = useState(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('ingather-theme') === 'dark');
  const toast = useToast();
  const logoInputRef = React.useRef(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  // Theme
  useEffect(() => {
    if (darkMode) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('ingather-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

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

  // Fetch church data
  useEffect(() => {
    fetchChurchData();
  }, []);

  const fetchChurchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { window.location.href = '/login'; return; }
      const church = await getCurrentChurch();
      setChurchData({
        churchName: church.churchName,
        branchName: church.branchName,
        email: church.email,
        location: church.location,
        logoUrl: church.logoUrl
      });
      setFormData({
        churchName: church.churchName,
        branchName: church.branchName,
        location: church.location
      });
      // Fetch notifications
      fetchNotifications();
      setLoading(false);
    } catch (error) {
      console.error('Error fetching church data:', error);
      if (error.response?.status === 401) { localStorage.removeItem('token'); window.location.href = '/login'; }
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const axios = (await import('axios')).default;
      const token = localStorage.getItem('token');
      const [notifRes, countRes] = await Promise.all([
        axios.get(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/notifications`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        ),
        axios.get(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/notifications/unread-count`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        )
      ]);
      setNotifications(notifRes.data.notifications || []);
      setUnreadCount(countRes.data.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  /* ---- Logo upload: resize to 200x200, convert to base64 ---- */
  const handleLogoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize to 200x200 using canvas
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');

        // Crop to center square
        const size = Math.min(img.width, img.height);
        const offsetX = (img.width - size) / 2;
        const offsetY = (img.height - size) / 2;
        ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, 200, 200);

        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        setLogoPreview(base64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    // Reset file input so the same file can be re-selected
    e.target.value = '';
  };

  /* ---- Save Church Info ---- */
  const handleSaveChurch = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });
    try {
      const axios = (await import('axios')).default;
      const token = localStorage.getItem('token');
      const payload = { churchName: formData.churchName, branchName: formData.branchName, location: formData.location };
      // Include logo if user selected a new one
      if (logoPreview) {
        payload.logoUrl = logoPreview;
      }
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/auth/update`,
        payload,
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      setChurchData({
        ...churchData,
        churchName: response.data.church.churchName,
        branchName: response.data.church.branchName,
        location: response.data.church.location,
        logoUrl: response.data.church.logoUrl
      });
      setLogoPreview(null); // Clear preview since it's now the real logo
      const storedChurch = JSON.parse(localStorage.getItem('church') || '{}');
      localStorage.setItem('church', JSON.stringify({
        ...storedChurch,
        churchName: response.data.church.churchName,
        branchName: response.data.church.branchName,
        location: response.data.church.location,
        logoUrl: response.data.church.logoUrl
      }));
      toast.success('Settings updated successfully!');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to update settings.';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  /* ---- Change Password ---- */
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.repeatPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setChangingPassword(true);
    try {
      const axios = (await import('axios')).default;
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/auth/change-password`,
        { currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword },
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      toast.success('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', repeatPassword: '' });
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to change password.';
      toast.error(errorMessage);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCancelPassword = () => {
    setPasswordData({ currentPassword: '', newPassword: '', repeatPassword: '' });
  };

  /* ---- Mark notifications as read ---- */
  const handleMarkAllRead = async () => {
    try {
      const axios = (await import('axios')).default;
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/notifications/mark-read`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications read:', error);
      toast.error('Failed to mark notifications as read.');
    }
  };

  const handleLogout = () => {
    toast.confirm('Are you sure you want to logout?', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('church');
      window.location.href = '/';
    });
  };

  const toggleTheme = () => setDarkMode(prev => !prev);

  const churchInitials = churchData.churchName
    ? churchData.churchName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'IN';

  /* ===== LOADING ===== */
  if (loading) {
    return (
      <div className="dashboard">
        <aside className="sidebar">
          <div className="sidebar-logo"><a href="/dashboard" className="sidebar-logo-link"><span className="sidebar-logo-icon">{Icons.logo}</span><span className="sidebar-logo-text">Ingather</span></a></div>
        </aside>
        <main className="dashboard-main">
          <div className="dashboard-loading"><div className="spinner"></div><p>Loading settings...</p></div>
        </main>
      </div>
    );
  }

  /* ===== SUB-NAV TABS ===== */
  const tabs = [
    { key: 'church', label: 'Church Information', icon: Icons.user },
    { key: 'password', label: 'Password', icon: Icons.lock },
    { key: 'notifications', label: 'Notification', icon: Icons.bell },
  ];

  /* ===== RENDER ===== */
  return (
    <div className="dashboard">
      {/* ====== SIDEBAR ====== */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-drawer-open' : ''}`}>
        <div className="sidebar-logo">
          <a href="/dashboard" className="sidebar-logo-link">
            <span className="sidebar-logo-icon">{Icons.logo}</span>
            <span className="sidebar-logo-text">Ingather</span>
          </a>
          <button className="sidebar-collapse-btn" title="Toggle sidebar">{Icons.collapse}</button>
        </div>
        <nav className="sidebar-nav">
          <a href="/dashboard" className="nav-item" onClick={closeMobileMenu}><span className="nav-icon">{Icons.dashboard}</span><span>Dashboard</span></a>
          <a href="/create-program" className="nav-item" onClick={closeMobileMenu}><span className="nav-icon">{Icons.createProgram}</span><span>Create Program</span></a>
          <a href="/programs" className="nav-item" onClick={closeMobileMenu}><span className="nav-icon">{Icons.allPrograms}</span><span>All Program</span></a>
          <a href="/settings" className="nav-item active" onClick={closeMobileMenu}><span className="nav-icon">{Icons.settings}</span><span>Settings</span></a>
        </nav>
        <div className="sidebar-footer">
          <a href="/settings?tab=notifications" className="sidebar-footer-item" onClick={closeMobileMenu}><span className="nav-icon">{Icons.notification}</span><span>Notification</span>{unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}</a>
          <button className="btn-logout" onClick={() => { closeMobileMenu(); handleLogout(); }}><span className="nav-icon">{Icons.logout}</span><span>Log out</span></button>
        </div>
        <div className="sidebar-profile" onClick={() => { closeMobileMenu(); setActiveTab('church'); }}>
          <div className="sidebar-profile-avatar">
            {(logoPreview || churchData.logoUrl) ? <img src={logoPreview || churchData.logoUrl} alt={churchData.churchName} /> : <span className="sidebar-profile-avatar-fallback">{churchInitials}</span>}
          </div>
          <div className="sidebar-profile-info">
            <div className="sidebar-profile-name">{churchData.churchName}</div>
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

      {/* ====== MAIN ====== */}
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
            <h2 className="navbar-church-name">Settings</h2>
          </div>
          <div className="navbar-right">
            <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
              <span className="theme-toggle-label">{darkMode ? 'Night Mode' : 'Day Mode'}</span>
              <span className="theme-toggle-icon">{darkMode ? Icons.moon : Icons.sun}</span>
            </button>
            <button className="navbar-icon-btn" title="Notifications" onClick={() => setActiveTab('notifications')}>{Icons.notification}{unreadCount > 0 && <span className="icon-badge"></span>}</button>
            <button className="navbar-icon-btn" title="Settings">{Icons.gear}</button>
            <div className="navbar-avatar-dropdown" ref={profileMenuRef}>
              <div className="navbar-avatar" onClick={() => setActiveTab('church')} title="View Profile">
                {(logoPreview || churchData.logoUrl) ? <img src={logoPreview || churchData.logoUrl} alt={churchData.churchName} /> : <div className="navbar-avatar-fallback">{churchInitials}</div>}
              </div>
              <span className={`chevron-toggle ${showProfileMenu ? 'open' : ''}`} onClick={() => setShowProfileMenu(prev => !prev)}>
                {Icons.chevronDown}
              </span>
              {showProfileMenu && (
                <div className="profile-dropdown-menu">
                  <button className="profile-dropdown-item" onClick={() => { setShowProfileMenu(false); setActiveTab('church'); }}>
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
          <div className="settings-grid">
            {/* Sub-Navigation */}
            <div className="settings-subnav">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  className={`settings-subnav-item ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <span className="subnav-icon">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Dynamic Content */}
            <div className="settings-content">

              {/* ===== CHURCH INFORMATION ===== */}
              {activeTab === 'church' && (
                <>
                  <h2 className="settings-content-title">Manage your Church Information</h2>
                  <div className="settings-card">
                    <form onSubmit={handleSaveChurch}>
                      {/* Avatar */}
                      <div className="settings-avatar-section">
                        <div className="settings-avatar-wrapper" onClick={() => logoInputRef.current?.click()} style={{ cursor: 'pointer' }}>
                          {(logoPreview || churchData.logoUrl) ? (
                            <img src={logoPreview || churchData.logoUrl} alt={churchData.churchName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                          ) : (
                            <span className="settings-avatar-placeholder">{Icons.avatarPlaceholder}</span>
                          )}
                          <span className="settings-avatar-edit">{Icons.pencil}</span>
                        </div>
                        <input
                          type="file"
                          ref={logoInputRef}
                          accept="image/*"
                          onChange={handleLogoSelect}
                          style={{ display: 'none' }}
                        />
                      </div>

                      {/* Fields */}
                      <div className="settings-field">
                        <label className="settings-field-label" htmlFor="churchName">Church Name</label>
                        <input
                          className="settings-field-input"
                          type="text"
                          id="churchName"
                          name="churchName"
                          value={formData.churchName}
                          onChange={handleFormChange}
                          placeholder="Enter church name"
                          required
                        />
                      </div>
                      <div className="settings-field">
                        <label className="settings-field-label" htmlFor="branchName">Branch Name</label>
                        <input
                          className="settings-field-input"
                          type="text"
                          id="branchName"
                          name="branchName"
                          value={formData.branchName}
                          onChange={handleFormChange}
                          placeholder="Enter branch name"
                          required
                        />
                      </div>
                      <div className="settings-field">
                        <label className="settings-field-label" htmlFor="location">Location/Address</label>
                        <input
                          className="settings-field-input"
                          type="text"
                          id="location"
                          name="location"
                          value={formData.location}
                          onChange={handleFormChange}
                          placeholder="Enter location"
                          required
                        />
                      </div>

                      <button type="submit" className="settings-btn-save" disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </form>
                  </div>
                </>
              )}

              {/* ===== PASSWORD ===== */}
              {activeTab === 'password' && (
                <>
                  <h2 className="settings-content-title">Change your password</h2>
                  <div className="settings-card">
                    <form onSubmit={handleChangePassword}>
                      <div className="settings-field">
                        <label className="settings-field-label" htmlFor="currentPassword">Current Password</label>
                        <input
                          className="settings-field-input"
                          type="password"
                          id="currentPassword"
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          placeholder="Enter current password"
                          required
                        />
                      </div>
                      <div className="settings-field">
                        <label className="settings-field-label" htmlFor="newPassword">New Password</label>
                        <input
                          className="settings-field-input"
                          type="password"
                          id="newPassword"
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          placeholder="Enter new password"
                          required
                        />
                      </div>
                      <div className="settings-field">
                        <label className="settings-field-label" htmlFor="repeatPassword">Repeat New Password</label>
                        <input
                          className="settings-field-input"
                          type="password"
                          id="repeatPassword"
                          name="repeatPassword"
                          value={passwordData.repeatPassword}
                          onChange={handlePasswordChange}
                          placeholder="Repeat new password"
                          required
                        />
                      </div>

                      <div className="settings-password-actions">
                        <button type="button" className="settings-btn-cancel" onClick={handleCancelPassword}>Cancel</button>
                        <button type="submit" className="settings-btn-primary" disabled={changingPassword}>
                          {changingPassword ? 'Changing...' : 'Set New Password'}
                        </button>
                      </div>
                    </form>
                  </div>
                </>
              )}

              {/* ===== NOTIFICATIONS ===== */}
              {activeTab === 'notifications' && (
                <div className="settings-card">
                  <div className="settings-notif-header">
                    <h2 className="settings-notif-title">Notifications</h2>
                    {notifications.some(n => !n.isRead) && (
                      <button className="settings-mark-read" onClick={handleMarkAllRead}>Mark as read</button>
                    )}
                  </div>
                  <div className="settings-notif-list">
                    {notifications.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)' }}>
                        <p style={{ fontSize: '14px' }}>No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <div key={notif.id} className={`settings-notif-item ${!notif.isRead ? 'unread' : ''}`}>
                          <div className="settings-notif-icon"><img src="/ingather-logo.png" alt="Ingather" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>
                          <div className="settings-notif-body">
                            <p className="settings-notif-item-title">{notif.title}</p>
                            <p className="settings-notif-item-desc">{notif.message}</p>
                          </div>
                          <div className="settings-notif-meta">
                            <span className="settings-notif-time">{getRelativeTime(notif.createdAt)}</span>
                            {!notif.isRead && <span className="settings-notif-dot"></span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Settings;
