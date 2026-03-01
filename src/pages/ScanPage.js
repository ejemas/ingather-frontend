// CHANGE THIS LINE:
import React, { useState, useEffect, useRef } from 'react';
// import { getProgramInfo, submitScan } from '../api/scanService';
import { useParams } from 'react-router-dom';
import { getProgramInfo, submitScan, submitFormData } from '../api/scanService';
import '../styles/ScanPage.css';


function ScanPage() {
  const { programId } = useParams();


  // ADD THESE NEW ONES:
  const [showGenderForm, setShowGenderForm] = useState(false);
  const [gender, setGender] = useState('');
  const [isFirstTimer, setIsFirstTimer] = useState(false);
  const [submittingGender, setSubmittingGender] = useState(false);

  const hasScannedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [alreadyScanned, setAlreadyScanned] = useState(false);
  const [programData, setProgramData] = useState(null);
  const [showForm, setShowForm] = useState(false);


  // Form data
  const [formData, setFormData] = useState({
    fullName: '',
    address: '',
    firstTimer: false,
    phoneNumber: '',
    department: '',
    fellowship: '',
    age: '',
    sex: ''
  });

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // Initialize on component mount
  // REPLACE YOUR useEffect WITH THIS:
  useEffect(() => {
    // If we already scanned, stop immediately
    if (hasScannedRef.current) return;

    // Mark as scanned so it doesn't run again
    hasScannedRef.current = true;

    console.log('Initializing scan page for program:', programId);
    initializeScan();
  }, [programId]);
  //   useEffect(() => {
  // console.log('Initializing scan page for program:', programId);
  // initializeScan();
  //   }, [programId]);



  //   const initializeScan = () => {
  // try {
  // Create simple device fingerprint
  // We added 'window.' before 'screen' to satisfy the computer
  // const fingerprint = `${navigator.userAgent}-${navigator.language}-${window.screen.width}x${window.screen.height}`;
  //   console.log('Device fingerprint:', fingerprint);

  const initializeScan = async () => {
    try {
      const fingerprint = `${navigator.userAgent}-${navigator.language}-${window.screen.width}x${window.screen.height}`;
      console.log('Device fingerprint:', fingerprint);

      // 1. Get program info from backend
      const programData = await getProgramInfo(programId);
      console.log('Program data loaded:', programData);

      if (!programData.isActive) {
        setProgramData(programData);
        setLoading(false);
        return;
      }

      setProgramData(programData);

      // Submit scan to backend
      try {
        const scanResult = await submitScan(programId, fingerprint, null);
        console.log('Scan recorded successfully:', scanResult);

        // Scan successful - decide what to show based on tracking mode
        if (programData.trackingMode === 'count-only') {
          // Count only - show gender selection form
          setShowGenderForm(true);
          setLoading(false);
        } else if (programData.trackingMode === 'collect-data') {
          // Collect data - show the form
          setShowForm(true);
          setLoading(false);
        }
      } catch (scanError) {
        console.error('Scan error:', scanError);

        // Check if it's because device already scanned
        if (scanError.response?.status === 400 &&
          (scanError.response?.data?.alreadyScanned ||
            scanError.response?.data?.error?.includes('already scanned'))) {
          // Device has already scanned this program
          setAlreadyScanned(true);
        }
        setLoading(false); // Turn off loading on error
      }

    } catch (error) {
      console.error('Error in initializeScan:', error);
      setLoading(false);
    }
  };


  const handleGenderSubmit = async () => {
    if (!gender) {
      alert('Please select your gender');
      return;
    }

    setSubmittingGender(true);

    try {
      const fingerprint = `${navigator.userAgent}-${navigator.language}-${window.screen.width}x${window.screen.height}`;

      // Update the scan record with gender and first-timer data
      const axios = (await import('axios')).default;
      await axios.put(
        `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}/api/scan/program/${programId}/update-scan`,
        {
          deviceFingerprint: fingerprint,
          gender: gender,
          firstTimer: isFirstTimer
        }
      );

      console.log('Gender data updated successfully');

      setSubmittingGender(false);
      setShowGenderForm(false);

      // Show result based on first-timer status
      if (isFirstTimer) {
        setResult('first-timer-message');
      } else {
        setResult('count-only-success');
      }
    } catch (error) {
      console.error('Gender submit error:', error);
      alert('Failed to submit. Please try again.');
      setSubmittingGender(false);
    }
  };

  const handleReset = () => {
    console.log('Resetting...');
    localStorage.removeItem('scannedPrograms');
    setAlreadyScanned(false);
    setShowForm(false);
    setResult(null);
    setFormData({
      fullName: '',
      address: '',
      firstTimer: false,
      phoneNumber: '',
      department: '',
      fellowship: '',
      age: '',
      sex: ''
    });
    setLoading(true);

    // Re-initialize
    setTimeout(() => {
      initializeScan();
    }, 100);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });

    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };

  const validateForm = () => {
    const errors = {};

    if (programData.dataFields.fullName && !formData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }

    if (programData.dataFields.phoneNumber && !formData.phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required';
    }

    if (programData.dataFields.address && !formData.address.trim()) {
      errors.address = 'Address is required';
    }

    if (programData.dataFields.department && !formData.department.trim()) {
      errors.department = 'Department is required';
    }

    if (programData.dataFields.sex && !formData.sex) {
      errors.sex = 'Please select your gender';
    }

    return errors;
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateForm();

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);

    try {
      const fingerprint = `${navigator.userAgent}-${navigator.language}-${window.screen.width}x${window.screen.height}`;

      // Submit only the form data (scan was already recorded)
      const response = await submitFormData(programId, fingerprint, formData);
      console.log('Form submitted successfully:', response);

      if (formData.firstTimer) {
        setResult('first-timer-message');
      } else if (response.giftingEnabled) {
        setResult(response.isWinner ? 'winner' : 'no-win');
      } else {
        setResult('no-gifting');
      }

      setSubmitting(false);
      setShowForm(false);
    } catch (error) {
      console.error('Submit error:', error);
      alert('Failed to submit form. Please try again.');
      setSubmitting(false);
    }
  };


  // LOADING
  if (loading) {
    return (
      <div className="scan-page">
        <div className="scan-container">
          <div className="spinner"></div>
          <p className="loading-text">Loading program...</p>
        </div>
      </div>
    );
  }

  // ALREADY SCANNED
  // ALREADY SCANNED
  if (alreadyScanned) {
    return (
      <div className="scan-page">
        <div className="scan-container">
          <div className="message-card error">
            <div className="message-icon">⚠️</div>
            <h2>Already Checked In</h2>
            <p>You have already scanned this QR code. Each device can only scan once per program.</p>
            <p className="sub-message">If you believe this is an error, please contact an usher.</p>
          </div>
        </div>
      </div>
    );
  }

  // GENDER SELECTION FORM (Count-Only Mode)
  if (showGenderForm && programData) {
    return (
      <div className="scan-page">
        <div className="scan-container">
          <div className="form-header">
            <h1>{programData.churchName}</h1>
            <h2>{programData.title}</h2>
            <p style={{ marginTop: '10px', color: 'rgba(235, 235, 211, 0.8)' }}>
              Please provide some basic information
            </p>
          </div>

          <div className="gender-form" style={{
            background: 'rgba(235, 235, 211, 0.05)',
            padding: '30px',
            borderRadius: '16px',
            marginTop: '20px'
          }}>
            <div className="form-group">
              <label style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                marginBottom: '15px',
                display: 'block',
                color: 'var(--color-beige)'
              }}>
                Select Your Gender *
              </label>

              <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
                <label style={{
                  flex: 1,
                  padding: '20px',
                  background: gender === 'male' ? 'var(--gradient-primary)' : 'rgba(235, 235, 211, 0.1)',
                  border: `2px solid ${gender === 'male' ? 'var(--color-pumpkin)' : 'rgba(235, 235, 211, 0.2)'}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  textAlign: 'center',
                  fontWeight: '600',
                  fontSize: '1rem',
                  color: gender === 'male' ? 'var(--color-beige)' : 'rgba(235, 235, 211, 0.7)'
                }}>
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={gender === 'male'}
                    onChange={(e) => setGender(e.target.value)}
                    style={{ display: 'none' }}
                  />
                  👨 Male
                </label>

                <label style={{
                  flex: 1,
                  padding: '20px',
                  background: gender === 'female' ? 'var(--gradient-primary)' : 'rgba(235, 235, 211, 0.1)',
                  border: `2px solid ${gender === 'female' ? 'var(--color-pumpkin)' : 'rgba(235, 235, 211, 0.2)'}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  textAlign: 'center',
                  fontWeight: '600',
                  fontSize: '1rem',
                  color: gender === 'female' ? 'var(--color-beige)' : 'rgba(235, 235, 211, 0.7)'
                }}>
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={gender === 'female'}
                    onChange={(e) => setGender(e.target.value)}
                    style={{ display: 'none' }}
                  />
                  👩 Female
                </label>
              </div>
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '15px',
                background: 'rgba(235, 235, 211, 0.05)',
                borderRadius: '12px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={isFirstTimer}
                  onChange={(e) => setIsFirstTimer(e.target.checked)}
                  style={{
                    width: '24px',
                    height: '24px',
                    accentColor: 'var(--color-pumpkin)',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '1rem', fontWeight: '500' }}>
                  ⭐ I am a first-timer
                </span>
              </label>
            </div>

            <button
              className="btn btn-primary btn-full"
              onClick={handleGenderSubmit}
              disabled={submittingGender || !gender}
              style={{ marginTop: '25px' }}
            >
              {submittingGender ? 'Submitting...' : 'Submit'}
            </button>


          </div>
        </div>
      </div>
    );



  }

  // SHOW FORM
  if (showForm && programData && !result) {
    return (
      <div className="scan-page">
        <div className="scan-container">
          <div className="form-header">
            <h1>{programData.churchName}</h1>
            <h2>{programData.title}</h2>
            {programData.giftingEnabled && (
              <div className="incentive-banner">
                🎁 Fill this form for a chance to win a special gift from the church!
              </div>
            )}
          </div>

          <form className="attendee-form" onSubmit={handleSubmit}>
            {programData.dataFields.fullName && (
              <div className="form-group">
                <label htmlFor="fullName">Full Name *</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="John Doe"
                />
                {formErrors.fullName && <span className="error">{formErrors.fullName}</span>}
              </div>
            )}

            {programData.dataFields.phoneNumber && (
              <div className="form-group">
                <label htmlFor="phoneNumber">Phone Number *</label>
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="+234 800 000 0000"
                />
                {formErrors.phoneNumber && <span className="error">{formErrors.phoneNumber}</span>}
              </div>
            )}

            {programData.dataFields.address && (
              <div className="form-group">
                <label htmlFor="address">Address *</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Your address"
                />
                {formErrors.address && <span className="error">{formErrors.address}</span>}
              </div>
            )}

            {programData.dataFields.department && (
              <div className="form-group">
                <label htmlFor="department">Department *</label>
                <input
                  type="text"
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="e.g., Youth, Men, Women, Choir"
                />
                {formErrors.department && <span className="error">{formErrors.department}</span>}
              </div>
            )}

            {programData.dataFields.fellowship && (
              <div className="form-group">
                <label htmlFor="fellowship">Fellowship</label>
                <input
                  type="text"
                  id="fellowship"
                  name="fellowship"
                  value={formData.fellowship}
                  onChange={handleChange}
                  placeholder="Your fellowship group"
                />
              </div>
            )}

            {programData.dataFields.age && (
              <div className="form-group">
                <label htmlFor="age">Age</label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  placeholder="25"
                  min="1"
                  max="120"
                />
              </div>
            )}

            {programData.dataFields.sex && (
              <div className="form-group">
                <label htmlFor="sex">Gender *</label>
                <select
                  id="sex"
                  name="sex"
                  value={formData.sex}
                  onChange={handleChange}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                {formErrors.sex && <span className="error">{formErrors.sex}</span>}
              </div>
            )}

            {programData.dataFields.firstTimer && (
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="firstTimer"
                    checked={formData.firstTimer}
                    onChange={handleChange}
                  />
                  <span>I am a first-timer</span>
                </label>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // RESULT SCREENS
  if (result === 'winner') {
    return (
      <div className="scan-page">
        <div className="scan-container">
          <div className="message-card winner">
            <div className="confetti">🎉</div>
            <div className="message-icon celebration">🎁</div>
            <h2>Congratulations!</h2>
            <p className="winner-message">
              You have been selected to receive a gift from the church!
            </p>
            <p className="winner-instruction">
              Please proceed to the <strong>ushering stand</strong> to collect your gift.
            </p>
            <p className="sub-message">Thank you for being here. Enjoy the service!</p>
          </div>
        </div>
      </div>
    );
  }

  if (result === 'no-win') {
    return (
      <div className="scan-page">
        <div className="scan-container">
          <div className="message-card no-win">
            <div className="message-icon">💙</div>
            <h2>Thank You!</h2>
            <p>Your information has been submitted successfully.</p>
            <p className="sub-message">
              You didn't win this time, but we are glad you are here. Enjoy the service!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // FIRST-TIMER MESSAGE (Count-Only)
  if (result === 'first-timer-message') {
    return (
      <div className="scan-page">
        <div className="scan-container">
          <div className="message-card success">
            <div className="message-icon">⭐</div>
            <h2>Welcome First-Timer!</h2>
            <p style={{ fontSize: '1.2rem', marginBottom: '20px' }}>
              Thank you for joining us today!
            </p>
            <div style={{
              background: 'rgba(249, 109, 16, 0.1)',
              padding: '20px',
              borderRadius: '12px',
              border: '2px solid var(--color-pumpkin)',
              marginTop: '20px'
            }}>
              <p style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-pumpkin)' }}>
                📍 Please kindly wait behind at the close of service
              </p>
            </div>
            <p className="sub-message" style={{ marginTop: '20px' }}>
              We look forward to connecting with you!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // COUNT-ONLY SUCCESS
  if (result === 'count-only-success') {
    return (
      <div className="scan-page">
        <div className="scan-container">
          <div className="message-card success">
            <div className="message-icon">✅</div>
            <h2>Thank You!</h2>
            <p>You have been checked in successfully.</p>
            <p className="sub-message">Enjoy the service!</p>
          </div>
        </div>
      </div>
    );
  }

  // NO-GIFTING SUCCESS (Collect Data mode without gifting)
  if (result === 'no-gifting') {
    return (
      <div className="scan-page">
        <div className="scan-container">
          <div className="message-card success">
            <div className="message-icon">✅</div>
            <h2>Thank You!</h2>
            <p>Your information has been submitted successfully.</p>
            <p className="sub-message">Thank you for coming to church today, do enjoy the rest of the service!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="scan-page">
      <div className="scan-container">
        <div className="message-card error">
          <div className="message-icon">❌</div>
          <h2>Program Already closed</h2>
          <p>This program may have ended or is no longer active.</p>
        </div>
      </div>
    </div>
  );


}

export default ScanPage;