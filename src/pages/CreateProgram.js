// import React, { useState } from 'react';
import { createProgram } from '../api/programService';
import '../styles/CreateProgram.css';
import React, { useState, useEffect } from 'react';

function CreateProgram() {
  const [formData, setFormData] = useState({
    programTitle: '',
    date: '',
    startTime: '',
    endTime: '',
    trackingMode: 'count-only', // 'count-only' or 'collect-data'
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
  const [churchData, setChurchData] = useState({ name: '', branch: '' }); // ADD THIS

useEffect(() => {
  fetchChurchData();
}, []);

const fetchChurchData = async () => {
  try {
    const { getCurrentChurch } = await import('../api/authService');
    const church = await getCurrentChurch();
    setChurchData({
      name: church.churchName,
      branch: church.branchName
    });
  } catch (error) {
    console.error('Error fetching church data:', error);
  }
};

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Clear error for this field
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const handleTrackingModeChange = (mode) => {
    setFormData({
      ...formData,
      trackingMode: mode,
      // Reset data fields if switching to count-only
      dataFields: mode === 'count-only' ? {
        fullName: false,
        address: false,
        firstTimer: false,
        phoneNumber: false,
        department: false,
        fellowship: false,
        age: false,
        sex: false
      } : formData.dataFields,
      enableGifting: mode === 'count-only' ? false : formData.enableGifting
    });
  };

  const handleDataFieldToggle = (field) => {
    setFormData({
      ...formData,
      dataFields: {
        ...formData.dataFields,
        [field]: !formData.dataFields[field]
      }
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

    if (!formData.programTitle.trim()) {
      newErrors.programTitle = 'Program title is required';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    }

    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      newErrors.endTime = 'End time must be after start time';
    }

    if (formData.trackingMode === 'collect-data') {
      const selectedFields = Object.values(formData.dataFields).filter(v => v).length;
      if (selectedFields === 0) {
        newErrors.dataFields = 'Please select at least one data field to collect';
      }
    }

    if (formData.enableGifting) {
      if (!formData.numberOfWinners || formData.numberOfWinners <= 0) {
        newErrors.numberOfWinners = 'Number of winners must be greater than 0';
      }
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

  setIsSubmitting(true);

  try {
    const response = await createProgram({
      programTitle: formData.programTitle,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      trackingMode: formData.trackingMode,
      dataFields: formData.dataFields,
      enableGifting: formData.enableGifting,
      numberOfWinners: formData.numberOfWinners
    });

    alert('Program created successfully!');
    window.location.href = `/program/${response.program.id}`;
  } catch (error) {
    console.error('Create program error:', error);
    const errorMessage = error.response?.data?.error || 'Failed to create program. Please try again.';
    alert(errorMessage);
    setIsSubmitting(false);
  }
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
          <a href="/dashboard" className="nav-item">
            <span className="nav-icon">📊</span>
            <span>Dashboard</span>
          </a>
          <a href="/create-program" className="nav-item active">
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
          <button className="btn-logout" onClick={() => window.location.href = '/'}>
            <span className="nav-icon">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="page-header">
          <div>
            <h1>Create New Program</h1>
            <p>Set up a new event and configure attendance tracking</p>
          </div>
          <button 
            className="btn btn-secondary"
            onClick={() => window.location.href = '/dashboard'}
          >
            ← Back to Dashboard
          </button>
        </div>

        <form className="create-program-form" onSubmit={handleSubmit}>
          {/* Basic Information Card */}
          <div className="form-card">
            <h2 className="card-title">Basic Information</h2>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="programTitle">Program Title *</label>
                <input
                  type="text"
                  id="programTitle"
                  name="programTitle"
                  value={formData.programTitle}
                  onChange={handleChange}
                  placeholder="e.g., Sunday Service, Revival Hub"
                  className="form-input"
                />
                {errors.programTitle && <span className="error">{errors.programTitle}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="date">Date *</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="form-input"
                />
                {errors.date && <span className="error">{errors.date}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="startTime">Start Time *</label>
                <input
                  type="time"
                  id="startTime"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  className="form-input"
                />
                {errors.startTime && <span className="error">{errors.startTime}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="endTime">End Time *</label>
                <input
                  type="time"
                  id="endTime"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  className="form-input"
                />
                {errors.endTime && <span className="error">{errors.endTime}</span>}
              </div>
            </div>
          </div>

          {/* Tracking Mode Card */}
          <div className="form-card">
            <h2 className="card-title">Tracking Mode</h2>
            <p className="card-description">Choose how you want to track attendance</p>

            <div className="tracking-options">
              <div 
                className={`tracking-option ${formData.trackingMode === 'count-only' ? 'selected' : ''}`}
                onClick={() => handleTrackingModeChange('count-only')}
              >
                <div className="option-header">
                  <div className="radio-circle">
                    {formData.trackingMode === 'count-only' && <div className="radio-dot"></div>}
                  </div>
                  <div>
                    <h3>Count Only</h3>
                    <p>Track attendance numbers anonymously</p>
                  </div>
                </div>
                <p className="option-detail">
                  Users scan the QR code and are immediately counted. No data is collected.
                </p>
              </div>

              <div 
                className={`tracking-option ${formData.trackingMode === 'collect-data' ? 'selected' : ''}`}
                onClick={() => handleTrackingModeChange('collect-data')}
              >
                <div className="option-header">
                  <div className="radio-circle">
                    {formData.trackingMode === 'collect-data' && <div className="radio-dot"></div>}
                  </div>
                  <div>
                    <h3>Collect Data</h3>
                    <p>Track attendance and collect visitor information</p>
                  </div>
                </div>
                <p className="option-detail">
                  Users fill a form after scanning. You can enable gifting to incentivize participation.
                </p>
              </div>
            </div>
          </div>

          {/* Data Collection Settings (Only if collect-data is selected) */}
          {formData.trackingMode === 'collect-data' && (
            <div className="form-card">
              <h2 className="card-title">Data Collection Settings</h2>
              <p className="card-description">Select the information you want to collect from attendees</p>

              <div className="data-fields-grid">
                {Object.keys(formData.dataFields).map(field => (
                  <label key={field} className="checkbox-card">
                    <input
                      type="checkbox"
                      checked={formData.dataFields[field]}
                      onChange={() => handleDataFieldToggle(field)}
                    />
                    <span className="checkbox-label">
                      {field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </span>
                  </label>
                ))}
              </div>
              {errors.dataFields && <span className="error">{errors.dataFields}</span>}
            </div>
          )}

          {/* Gifting Configuration (Only if collect-data is selected) */}
          {formData.trackingMode === 'collect-data' && (
            <div className="form-card">
              <h2 className="card-title">Gifting System</h2>
              <p className="card-description">Enable a lucky dip system to incentivize data collection</p>

              <label className="toggle-option">
                <input
                  type="checkbox"
                  checked={formData.enableGifting}
                  onChange={handleGiftingToggle}
                />
                <span className="toggle-label">Enable Gifting System</span>
              </label>

              {formData.enableGifting && (
                <div className="form-group mt-3">
                  <label htmlFor="numberOfWinners">Number of Winners</label>
                  <input
                    type="number"
                    id="numberOfWinners"
                    name="numberOfWinners"
                    value={formData.numberOfWinners}
                    onChange={handleChange}
                    placeholder="e.g., 50"
                    min="1"
                    className="form-input"
                  />
                  {errors.numberOfWinners && <span className="error">{errors.numberOfWinners}</span>}
                  <p className="field-hint">
                    The system will randomly select this number of attendees to win gifts
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary btn-large"
              onClick={() => window.location.href = '/dashboard'}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-large"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Program...' : 'Create Program'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default CreateProgram;