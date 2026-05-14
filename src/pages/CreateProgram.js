import React, { useState, useEffect, useRef } from 'react';
import { createProgram } from '../api/programService';
import { useToast } from '../components/Toast';
import { compressFlyerImage, fileToDataUrl, formatFileSize } from '../utils/flyerCompression';
import '../styles/Dashboard.css';
import '../styles/CreateProgram.css';

/* ============================================
   SVG ICON COMPONENTS (shared sidebar icons)
   ============================================ */
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
    <svg viewBox="0 0 20 20" fill="none">
      <rect x="3" y="3" width="6" height="6" rx="1" fill="currentColor" />
      <rect x="11" y="3" width="6" height="6" rx="1" fill="currentColor" />
      <rect x="3" y="11" width="6" height="6" rx="1" fill="currentColor" />
      <rect x="11" y="11" width="6" height="6" rx="1" fill="currentColor" />
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
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 3.5V5M10 15v1.5M16.5 10H15M5 10H3.5M14.6 5.4l-1.1 1.1M6.5 13.5l-1.1 1.1M14.6 14.6l-1.1-1.1M6.5 6.5L5.4 5.4" />
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
      <path d="M8.3 3h3.4l.5 2.1a6 6 0 011.7 1l2-.7 1.7 3-1.5 1.4a6 6 0 010 2l1.5 1.4-1.7 3-2-.7a6 6 0 01-1.7 1L11.7 17H8.3l-.5-2.1a6 6 0 01-1.7-1l-2 .7-1.7-3 1.5-1.4a6 6 0 010-2L2.4 7.8l1.7-3 2 .7a6 6 0 011.7-1L8.3 3z" />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  ),
  chevronDown: (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3,5 7,9 11,5" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="12" height="11" rx="1.5" />
      <line x1="2" y1="7" x2="14" y2="7" />
      <line x1="5.5" y1="1.5" x2="5.5" y2="4.5" />
      <line x1="10.5" y1="1.5" x2="10.5" y2="4.5" />
    </svg>
  ),
};

/* ============================================
   TIME OPTIONS
   ============================================ */
const generateTimeOptions = () => {
  const times = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hh = h.toString().padStart(2, '0');
      const mm = m.toString().padStart(2, '0');
      times.push(`${hh}:${mm}`);
    }
  }
  return times;
};

const timeOptions = generateTimeOptions();

/* ============================================
   MAIN COMPONENT
   ============================================ */
function CreateProgram() {
  const [formData, setFormData] = useState({
    programTitle: '',
    date: '',
    startTime: '',
    endTime: '',
    trackingMode: 'count-only',
    dataFields: {
      fullName: false,
      address: false,
      firstTimer: false,
      phoneNumber: false,
      department: false,
      fellowship: false,
      age: false,
      sex: false
    },
    enableGifting: false,
    numberOfWinners: 0
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [churchData, setChurchData] = useState({ name: '', branch: '', email: '', logo: null });
  const [unreadCount, setUnreadCount] = useState(0);
  const [flyerProcessing, setFlyerProcessing] = useState(false);
  const [flyerData, setFlyerData] = useState({
    compressedFile: null,
    previewUrl: '',
    originalName: '',
    originalSize: 0,
    compressedSize: 0,
    error: ''
  });
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('ingather-theme') === 'dark';
  });
  const toast = useToast();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const flyerInputRef = useRef(null);

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
    fetchChurchData();
  }, []);

  useEffect(() => {
    return () => {
      if (flyerData.previewUrl) {
        URL.revokeObjectURL(flyerData.previewUrl);
      }
    };
  }, [flyerData.previewUrl]);

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

  const fetchChurchData = async () => {
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
    } catch (error) {
      console.error('Error fetching church data:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleFlyerSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setFlyerProcessing(true);
    setFlyerData(prev => ({ ...prev, error: '' }));

    try {
      const compressedFile = await compressFlyerImage(file);
      const previewUrl = URL.createObjectURL(compressedFile);

      setFlyerData(prev => {
        if (prev.previewUrl) URL.revokeObjectURL(prev.previewUrl);
        return {
          compressedFile,
          previewUrl,
          originalName: file.name,
          originalSize: file.size,
          compressedSize: compressedFile.size,
          error: ''
        };
      });

      toast.success(`Flyer compressed to ${formatFileSize(compressedFile.size)}.`);
    } catch (error) {
      const message = error.message || 'Flyer compression failed. Please try another image.';
      setFlyerData(prev => {
        if (prev.previewUrl) URL.revokeObjectURL(prev.previewUrl);
        return {
          compressedFile: null,
          previewUrl: '',
          originalName: '',
          originalSize: 0,
          compressedSize: 0,
          error: message
        };
      });
      toast.error(message);
    } finally {
      setFlyerProcessing(false);
    }
  };

  const handleRemoveFlyer = () => {
    setFlyerData(prev => {
      if (prev.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return {
        compressedFile: null,
        previewUrl: '',
        originalName: '',
        originalSize: 0,
        compressedSize: 0,
        error: ''
      };
    });
  };

  const handleTrackingModeChange = (mode) => {
    setFormData({
      ...formData,
      trackingMode: mode,
      dataFields: mode === 'count-only' ? {
        fullName: false, address: false, firstTimer: false, phoneNumber: false,
        department: false, fellowship: false, age: false, sex: false
      } : formData.dataFields,
      enableGifting: mode === 'count-only' ? false : formData.enableGifting
    });
  };

  const handleDataFieldToggle = (field) => {
    setFormData({
      ...formData,
      dataFields: { ...formData.dataFields, [field]: !formData.dataFields[field] }
    });
  };

  const handleGiftingToggle = () => {
    setFormData({
      ...formData,
      enableGifting: !formData.enableGifting,
      numberOfWinners: !formData.enableGifting ? formData.numberOfWinners : 0
    });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.programTitle.trim()) newErrors.programTitle = 'Program title is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.startTime) newErrors.startTime = 'Start time is required';
    if (!formData.endTime) newErrors.endTime = 'End time is required';
    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      newErrors.endTime = 'End time must be after start time';
    }
    if (formData.trackingMode === 'collect-data') {
      const selectedFields = Object.values(formData.dataFields).filter(v => v).length;
      if (selectedFields === 0) newErrors.dataFields = 'Please select at least one data field';
    }
    if (formData.enableGifting && (!formData.numberOfWinners || formData.numberOfWinners <= 0)) {
      newErrors.numberOfWinners = 'Number of winners must be greater than 0';
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    if (flyerProcessing) {
      toast.info('Please wait for the flyer compression to finish.');
      return;
    }
    setIsSubmitting(true);
    try {
      const eventFlyer = flyerData.compressedFile
        ? {
            dataUrl: await fileToDataUrl(flyerData.compressedFile),
            originalName: flyerData.originalName,
            size: flyerData.compressedSize
          }
        : null;

      const response = await createProgram({
        programTitle: formData.programTitle,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        trackingMode: formData.trackingMode,
        dataFields: formData.dataFields,
        enableGifting: formData.enableGifting,
        numberOfWinners: formData.numberOfWinners,
        eventFlyer
      });
      toast.success('Program created successfully!');
      setTimeout(() => {
        window.location.href = `/program/${response.program.id}`;
      }, 1500);
    } catch (error) {
      console.error('Create program error:', error);
      toast.error(error.response?.data?.error || 'Failed to create program. Please try again.');
      setIsSubmitting(false);
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

  const churchInitials = churchData.name
    ? churchData.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'IN';

  return (
    <div className="dashboard">
      {/* ====== SIDEBAR ====== */}
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
          <a href="/create-program" className="nav-item active" onClick={closeMobileMenu}>
            <span className="nav-icon">{Icons.createProgram}</span>
            <span>Create Program</span>
          </a>
          <a href="/programs" className="nav-item" onClick={closeMobileMenu}>
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
            <div className="sidebar-profile-email">{churchData.email || `${churchData.name?.toLowerCase().replace(/\s+/g, '')}@gmail.com`}</div>
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

      {/* ====== MAIN CONTENT ====== */}
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
            <span className="navbar-church-name">Create Program</span>
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

        {/* Page Content */}
        <div className="dashboard-content">
          <div className="cp-page-title">
            <h2>Create A New Program</h2>
          </div>

          <form className="create-program-form" onSubmit={handleSubmit}>
            {/* Basic Information Card */}
            <div className="form-card" id="basic-info-card">
              <h3 className="card-title">Basic Information</h3>
              <p className="card-description">Set up a new event and configure Date and Time of event</p>

              <div className="form-group">
                <label htmlFor="programTitle">Program Title</label>
                <input
                  type="text"
                  id="programTitle"
                  name="programTitle"
                  value={formData.programTitle}
                  onChange={handleChange}
                  placeholder="e.g., Sunday Service, Revival Hub"
                  className={`form-input ${errors.programTitle ? 'input-error' : ''}`}
                />
                {errors.programTitle && <span className="error-text">{errors.programTitle}</span>}
              </div>

              <div className="form-row-3col">
                <div className="form-group">
                  <label htmlFor="date">Date</label>
                  <div className="input-icon-wrapper">
                    <input
                      type="date"
                      id="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      className={`form-input ${errors.date ? 'input-error' : ''}`}
                      placeholder="dd/mm/yyyy"
                    />
                  </div>
                  {errors.date && <span className="error-text">{errors.date}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="startTime">Start Time</label>
                  <div className="select-wrapper">
                    <select
                      id="startTime"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleChange}
                      className={`form-input form-select ${errors.startTime ? 'input-error' : ''}`}
                    >
                      <option value="">00:00</option>
                      {timeOptions.map(t => (
                        <option key={`s-${t}`} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  {errors.startTime && <span className="error-text">{errors.startTime}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="endTime">End Time</label>
                  <div className="select-wrapper">
                    <select
                      id="endTime"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleChange}
                      className={`form-input form-select ${errors.endTime ? 'input-error' : ''}`}
                    >
                      <option value="">00:00</option>
                      {timeOptions.map(t => (
                        <option key={`e-${t}`} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  {errors.endTime && <span className="error-text">{errors.endTime}</span>}
                </div>
              </div>
            </div>

            {/* Optional Event Flyer */}
            <div className="form-card" id="event-flyer-card">
              <div className="flyer-card-header">
                <div>
                  <h3 className="card-title">Event Flyer</h3>
                  <p className="card-description">Upload an optional event image for attendees to view after check-in</p>
                </div>
                <span className="flyer-optional-pill">Optional</span>
              </div>

              <input
                ref={flyerInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFlyerSelect}
                className="flyer-file-input"
              />

              {!flyerData.compressedFile ? (
                <button
                  type="button"
                  className={`flyer-upload-zone ${flyerProcessing ? 'processing' : ''}`}
                  onClick={() => !flyerProcessing && flyerInputRef.current?.click()}
                  disabled={flyerProcessing}
                >
                  <span className="flyer-upload-icon">
                    {flyerProcessing ? (
                      <span className="flyer-mini-spinner"></span>
                    ) : (
                      Icons.calendar
                    )}
                  </span>
                  <span className="flyer-upload-copy">
                    <strong>{flyerProcessing ? 'Compressing flyer...' : 'Choose flyer image'}</strong>
                    <span>JPEG, PNG, or WebP. It will be compressed to about 200 KB before upload.</span>
                  </span>
                </button>
              ) : (
                <div className="flyer-preview-panel">
                  <div className="flyer-preview-image-wrap">
                    <img src={flyerData.previewUrl} alt="Event flyer preview" />
                  </div>
                  <div className="flyer-preview-meta">
                    <div>
                      <p className="flyer-preview-title">{flyerData.originalName}</p>
                      <p className="flyer-preview-sub">
                        {formatFileSize(flyerData.originalSize)} compressed to {formatFileSize(flyerData.compressedSize)}
                      </p>
                    </div>
                    <div className="flyer-preview-actions">
                      <button type="button" className="flyer-change-btn" onClick={() => flyerInputRef.current?.click()}>
                        Change
                      </button>
                      <button type="button" className="flyer-remove-btn" onClick={handleRemoveFlyer}>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {flyerData.error && <span className="error-text">{flyerData.error}</span>}
            </div>

            {/* Tracking Mode Card */}
            <div className="form-card" id="tracking-mode-card">
              <h3 className="card-title">Tracking Mode</h3>
              <p className="card-description">Check how you want to track attendance</p>

              <div className="tracking-options">
                {/* Count Only */}
                <div
                  className={`tracking-option ${formData.trackingMode === 'count-only' ? 'selected' : ''}`}
                  onClick={() => handleTrackingModeChange('count-only')}
                  id="opt-count-only"
                >
                  <div className="option-top">
                    <h4 className="option-title">Count Only</h4>
                    <div className="radio-circle">
                      {formData.trackingMode === 'count-only' && <div className="radio-dot"></div>}
                    </div>
                  </div>
                  <p className="option-detail">
                    Track attendance numbers anonymously Users scan the QR code and are immediately counted. No data is collected
                  </p>
                </div>

                {/* Collect Data */}
                <div
                  className={`tracking-option ${formData.trackingMode === 'collect-data' ? 'selected' : ''}`}
                  onClick={() => handleTrackingModeChange('collect-data')}
                  id="opt-collect-data"
                >
                  <div className="option-top">
                    <h4 className="option-title">Collect Data</h4>
                    <div className="radio-circle">
                      {formData.trackingMode === 'collect-data' && <div className="radio-dot"></div>}
                    </div>
                  </div>
                  <p className="option-detail">
                    Track attendance and collect visitor information. Users fill a form after scanning. You can enable gifting to incentivize participation.
                  </p>
                </div>
              </div>
            </div>

            {/* Data Collection Settings (conditional) */}
            {formData.trackingMode === 'collect-data' && (
              <div className="form-card" id="data-fields-card">
                <h3 className="card-title">Data Collection Settings</h3>
                <p className="card-description">Select the information you want to collect from attendees</p>

                <div className="data-fields-grid">
                  {Object.keys(formData.dataFields).map(field => (
                    <div
                      key={field}
                      className={`checkbox-card ${formData.dataFields[field] ? 'checked' : ''}`}
                      onClick={() => handleDataFieldToggle(field)}
                    >
                      <span className="checkbox-label">
                        {field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </span>
                      <span className="checkbox-icon">
                        {formData.dataFields[field] ? (
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <rect x="1" y="1" width="18" height="18" rx="4" fill="#E8590C" stroke="#E8590C" strokeWidth="1.5"/>
                            <path d="M6 10l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <rect x="1" y="1" width="18" height="18" rx="4" stroke="var(--border-color)" strokeWidth="1.5" fill="none"/>
                          </svg>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                {errors.dataFields && <span className="error-text">{errors.dataFields}</span>}
              </div>
            )}

            {/* Gifting Configuration (conditional) */}
            {formData.trackingMode === 'collect-data' && (
              <div className="form-card" id="gifting-card">
                <h3 className="card-title">Gifting System</h3>
                <p className="card-description">Enable a lucky dip system to incentivize data collection</p>

                <div
                  className={`toggle-option ${formData.enableGifting ? 'checked' : ''}`}
                  onClick={handleGiftingToggle}
                >
                  <span className="toggle-label">Enable Gifting System</span>
                  <span className="checkbox-icon">
                    {formData.enableGifting ? (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <rect x="1" y="1" width="18" height="18" rx="4" fill="#E8590C" stroke="#E8590C" strokeWidth="1.5"/>
                        <path d="M6 10l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <rect x="1" y="1" width="18" height="18" rx="4" stroke="var(--border-color)" strokeWidth="1.5" fill="none"/>
                      </svg>
                    )}
                  </span>
                </div>

                {formData.enableGifting && (
                  <div className="form-group gifting-winners-group">
                    <label htmlFor="numberOfWinners">Number of Winners</label>
                    <input
                      type="number"
                      id="numberOfWinners"
                      name="numberOfWinners"
                      value={formData.numberOfWinners}
                      onChange={handleChange}
                      placeholder="10"
                      min="1"
                      className="form-input"
                    />
                    {errors.numberOfWinners && <span className="error-text">{errors.numberOfWinners}</span>}
                  </div>
                )}
              </div>
            )}

            {/* Form Actions */}
            <div className="form-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => window.location.href = '/dashboard'}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-create"
                disabled={isSubmitting || flyerProcessing}
              >
                {isSubmitting ? 'Creating...' : flyerProcessing ? 'Preparing Flyer...' : 'Create  Program'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default CreateProgram;
