import React, { useState, useEffect } from 'react';
import { getCurrentChurch } from '../api/authService';
import '../styles/Dashboard.css';
import '../styles/Auth.css';

function Settings() {
  const [churchData, setChurchData] = useState({
    churchName: '',
    branchName: '',
    email: '',
    location: '',
    logoUrl: ''
  });
  const [formData, setFormData] = useState({
    churchName: '',
    branchName: '',
    email: '',
    location: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchChurchData();
  }, []);

  const fetchChurchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

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
        email: church.email,
        location: church.location
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching church data:', error);
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setSaving(true);
  setMessage('');

  try {
    const { updateChurchInfo } = await import('../api/settingsService');
    
    const response = await updateChurchInfo({
      churchName: formData.churchName,
      branchName: formData.branchName,
      location: formData.location
    });

    // Update local state
    setChurchData({
      ...churchData,
      churchName: response.church.churchName,
      branchName: response.church.branchName,
      location: response.church.location
    });

    // Update localStorage
    const storedChurch = JSON.parse(localStorage.getItem('church') || '{}');
    const updatedChurch = {
      ...storedChurch,
      churchName: response.church.churchName,
      branchName: response.church.branchName,
      location: response.church.location
    };
    localStorage.setItem('church', JSON.stringify(updatedChurch));

    setMessage('✅ Settings updated successfully!');
    
    setTimeout(() => {
      setMessage('');
      // Refresh the page to update sidebar
      window.location.reload();
    }, 2000);
  } catch (error) {
    console.error('Update error:', error);
    const errorMessage = error.response?.data?.error || 'Failed to update settings. Please try again.';
    setMessage('❌ ' + errorMessage);
  } finally {
    setSaving(false);
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
            <p className="church-name">{churchData.churchName}</p>
            <p className="branch-name">{churchData.branchName}</p>
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
          <a href="/programs" className="nav-item">
            <span className="nav-icon">📅</span>
            <span>All Programs</span>
          </a>
          <a href="/settings" className="nav-item active">
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
        <header className="dashboard-header">
          <div>
            <h1>Settings</h1>
            <p>Manage your church information</p>
          </div>
        </header>

        <div className="card" style={{maxWidth: '800px', margin: '0 auto'}}>
          <h2 style={{marginBottom: '20px'}}>Church Information</h2>
          
          {message && (
            <div style={{
              padding: '12px',
              marginBottom: '20px',
              backgroundColor: message.includes('success') ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
              color: message.includes('success') ? '#4CAF50' : '#f44336',
              borderRadius: '8px',
              border: `1px solid ${message.includes('success') ? '#4CAF50' : '#f44336'}`
            }}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="churchName">Church Name</label>
              <input
                type="text"
                id="churchName"
                name="churchName"
                value={formData.churchName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="branchName">Branch Name</label>
              <input
                type="text"
                id="branchName"
                name="branchName"
                value={formData.branchName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="location">Location/Address</label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={saving}
              style={{marginTop: '20px'}}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default Settings;