import React, { useState, useEffect } from 'react';
import { getPrograms } from '../api/programService';
import '../styles/Dashboard.css';

function AllPrograms() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [churchData, setChurchData] = useState({ name: '', branch: '' }); // ADD THIS

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    // Get church info
    const { getCurrentChurch } = await import('../api/authService');
    const church = await getCurrentChurch();
    setChurchData({
      name: church.churchName,
      branch: church.branchName
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

  if (loading) {
    return (
      <div className="dashboard">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>Ingather</h2>
          </div>
        </aside>
        <main className="dashboard-main">
          <div className="spinner"></div>
          <p style={{textAlign: 'center', color: 'var(--color-beige)', marginTop: '20px'}}>
            Loading programs...
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Ingather</h2>
          <div className="church-info">
            <p className="church-name">{churchData.name}</p>
            <p className="branch-name">{churchData.branch}</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <a href="/dashboard" className="nav-item">
            <span className="nav-icon">📊</span>
            <span>Dashboard</span>
          </a>
          <a href="/create-program" className="nav-item">
            <span className="nav-icon">➕</span>
            <span>Create Program</span>
          </a>
          <a href="/programs" className="nav-item active">
            <span className="nav-icon">📅</span>
            <span>All Programs</span>
          </a>
          <a href="/settings" className="nav-item">
            <span className="nav-icon">⚙️</span>
            <span>Settings</span>
          </a>
        </nav>

        <div className="sidebar-footer">
          <button className="btn-logout" onClick={() => window.location.href = '/'}>
            <span className="nav-icon">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="program-detail-header" style={{marginBottom: '30px'}}>
          <div>
            <button 
              className="btn-back"
              onClick={() => window.location.href = '/dashboard'}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(235, 235, 211, 0.7)',
                fontSize: '1rem',
                cursor: 'pointer',
                marginBottom: '10px',
                padding: '8px 0'
              }}
            >
              ← Back to Dashboard
            </button>
            <h1 style={{color: 'var(--color-beige)', fontSize: '2rem', marginBottom: '8px'}}>
              All Programs
            </h1>
            <p style={{color: 'rgba(235, 235, 211, 0.6)'}}>
              Manage all your church programs and events
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
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

          {/* Programs Table */}
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
                {programs.filter(program => {
                  if (activeFilter === 'all') return true;
                  return program.status === activeFilter;
                }).length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{textAlign: 'center', padding: '40px'}}>
                      No programs found for this filter
                    </td>
                  </tr>
                ) : (
                  programs.filter(program => {
                    if (activeFilter === 'all') return true;
                    return program.status === activeFilter;
                  }).map(program => (
                    <tr key={program.id}>
                      <td><strong>{program.title}</strong></td>
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
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AllPrograms;