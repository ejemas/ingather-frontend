import React, { useState } from 'react';
import { useEffect } from 'react';
import { getPrograms } from '../api/programService';
import { getCurrentChurch } from '../api/authService';
import '../styles/Dashboard.css';

function Dashboard() {
  // Mock data for programs (we'll replace with real data from backend later)
  const [programs, setPrograms] = useState([]);
const [churchData, setChurchData] = useState({
  name: '',
  branch: '',
  logo: null
});
const [loading, setLoading] = useState(true);
const [activeFilter, setActiveFilter] = useState('all'); // ADD THIS LINE

useEffect(() => {
  fetchData();
}, []);

const fetchData = async () => {
  try {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    // Get church info
    const church = await getCurrentChurch();
    setChurchData({
      name: church.churchName,
      branch: church.branchName,
      logo: church.logoUrl
    });

    // Get programs
    const response = await getPrograms();
    
    // Map backend data to frontend format
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
    console.error('Error fetching data:', error);
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    setLoading(false);
  }
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
          Loading dashboard...
        </p>
      </main>
    </div>
  );
}


  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      // Later: Clear authentication tokens
      window.location.href = '/';
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      active: 'status-active',
      upcoming: 'status-upcoming',
      completed: 'status-completed'
    };
    return statusColors[status] || '';
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
          <a href="/dashboard" className="nav-item active">
            <span className="nav-icon">📊</span>
            <span>Dashboard</span>
          </a>
          <a href="/create-program" className="nav-item">
            <span className="nav-icon">➕</span>
            <span>Create Program</span>
          </a>
          <a href="/programs" className="nav-item">
            <span className="nav-icon">📅</span>
            <span>All Programs</span>
          </a>
          <a href="/settings" className="nav-item">
            <span className="nav-icon">⚙️</span>
            <span>Settings</span>
          </a>
        </nav>

        <div className="sidebar-footer">
          <button className="btn-logout" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Top Bar */}
        <header className="dashboard-header">
          <div>
            <h1>Dashboard</h1>
            <p>Welcome back! Here's what's happening with your programs.</p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => window.location.href = '/create-program'}
          >
            + Create New Program
          </button>
        </header>


 <div className="stats-grid">
  <div className="stat-card">
    <div className="stat-icon">📊</div>
    <div className="stat-info">
      <p className="stat-label">Total Programs</p>
      <h2 className="stat-value">{programs.length}</h2>
    </div>
  </div>

  <div className="stat-card">
    <div className="stat-icon">✅</div>
    <div className="stat-info">
      <p className="stat-label">Active Programs</p>
      <h2 className="stat-value">{programs.filter(p => p.status === 'active').length}</h2>
    </div>
  </div>

  <div className="stat-card">
    <div className="stat-icon">👥</div>
    <div className="stat-info">
      <p className="stat-label">Total Attendance</p>
      <h2 className="stat-value">
        {programs.reduce((sum, p) => sum + p.totalScans, 0).toLocaleString()}
      </h2>
    </div>
  </div>

  <div className="stat-card">
    <div className="stat-icon">📅</div>
    <div className="stat-info">
      <p className="stat-label">Upcoming Programs</p>
      <h2 className="stat-value">{programs.filter(p => p.status === 'upcoming').length}</h2>
    </div>
  </div>
</div>

        {/* Programs Table */}
        <div className="programs-section">
          <div className="section-header">
            <h2>Recent Programs</h2>


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
                {programs.filter(program => {
  if (activeFilter === 'all') return true;
  return program.status === activeFilter;
}).map(program => (
                  <tr key={program.id}>
                    <td>
                      <strong>{program.title}</strong>
                    </td>
                    <td>{formatDate(program.date)}</td>
                    <td>{program.startTime} - {program.endTime}</td>
                    <td>
                      <span className={`status-badge ${getStatusBadge(program.status)}`}>
                        {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      <strong>{program.totalScans.toLocaleString()}</strong>
                    </td>
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
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="quick-actions-grid">
            <button className="quick-action-card" onClick={() => window.location.href = '/create-program'}>
              <span className="action-icon">➕</span>
              <span>Create Program</span>
            </button>
            <button className="quick-action-card">
              <span className="action-icon">📥</span>
              <span>Export Data</span>
            </button>
            <button className="quick-action-card">
              <span className="action-icon">📊</span>
              <span>View Reports</span>
            </button>
            <button className="quick-action-card">
              <span className="action-icon">⚙️</span>
              <span>Settings</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;