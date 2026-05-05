import React, { useState, useEffect } from 'react';
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
  const toast = useToast();

  useEffect(() => {
    // Apply stored theme
    const theme = localStorage.getItem('ingather-theme');
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    fetchPrograms();
  }, []);

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
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      active: 'status-active',
      upcoming: 'status-upcoming',
      completed: 'status-completed'
    };
    return statusColors[status] || '';
  };

  const churchInitials = churchData.name
    ? churchData.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'IN';

  const filteredPrograms = programs.filter(program => {
    if (activeFilter === 'all') return true;
    return program.status === activeFilter;
  });

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
      <aside className="sidebar">
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
          <a href="/dashboard" className="nav-item">
            <span className="nav-icon">{Icons.dashboard}</span>
            <span>Dashboard</span>
          </a>
          <a href="/create-program" className="nav-item">
            <span className="nav-icon">{Icons.createProgram}</span>
            <span>Create Program</span>
          </a>
          <a href="/programs" className="nav-item active">
            <span className="nav-icon">{Icons.allPrograms}</span>
            <span>All Program</span>
          </a>
          <a href="/settings" className="nav-item">
            <span className="nav-icon">{Icons.settings}</span>
            <span>Settings</span>
          </a>
        </nav>

        <div className="sidebar-footer">
          <a href="/dashboard" className="sidebar-footer-item">
            <span className="nav-icon">{Icons.notification}</span>
            <span>Notification</span>
            <span className="notification-badge">2</span>
          </a>
          <button className="btn-logout" onClick={handleLogout}>
            <span className="nav-icon">{Icons.logout}</span>
            <span>Log out</span>
          </button>
        </div>

        <div className="sidebar-profile" onClick={() => window.location.href = '/settings'}>
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

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-content">
          <div className="overview-header" style={{ marginBottom: '24px' }}>
            <h2 className="overview-title">All Programs</h2>
            <button
              className="btn btn-primary"
              onClick={() => window.location.href = '/create-program'}
              style={{ fontSize: '0.85rem', padding: '10px 20px' }}
            >
              + Create New Program
            </button>
          </div>

          <div className="programs-section">
            <div className="section-header">
              <h2>Programs ({programs.length})</h2>
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
                        <td className="program-title-cell">{program.title}</td>
                        <td>{formatDate(program.date)}</td>
                        <td>{program.startTime} - {program.endTime}</td>
                        <td>
                          <span className={`status-badge ${getStatusBadge(program.status)}`}>
                            {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
                          </span>
                        </td>
                        <td><strong>{program.totalScans.toLocaleString()}</strong></td>
                        <td>
                          <span className={program.dataCollection ? 'badge-yes' : 'badge-no'}>
                            {program.dataCollection ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn-action btn-view"
                              onClick={() => window.location.href = `/program/${program.id}`}
                            >
                              View
                            </button>
                            {program.status === 'completed' && (
                              <button
                                className="btn-action btn-delete"
                                onClick={() => handleDeleteProgram(program)}
                                title="Delete program"
                              >
                                {Icons.trash}
                              </button>
                            )}
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