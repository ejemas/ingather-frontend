import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { resetPassword } from '../api/authService';
import '../styles/Auth.css';

const OTP_LENGTH = 6;

function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || '';

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) {
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  const handleOtpChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');
    setErrors({ ...errors, otp: '' });

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().slice(0, OTP_LENGTH);

    if (/^\d{1,6}$/.test(pastedData)) {
      const newOtp = Array(OTP_LENGTH).fill('');
      pastedData.split('').forEach((char, i) => {
        newOtp[i] = char;
      });
      setOtp(newOtp);
      setErrors({ ...errors, otp: '' });
      const focusIndex = Math.min(pastedData.length, OTP_LENGTH - 1);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    const newErrors = {};

    if (otpCode.length !== OTP_LENGTH) {
      newErrors.otp = `Please enter the complete ${OTP_LENGTH}-digit code`;
    }

    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setError('');
    setErrors({});

    try {
      const response = await resetPassword(email, otpCode, newPassword);
      setSuccess(response.message || 'Password reset successfully!');
      setTimeout(() => {
        navigate('/login', { state: { passwordReset: true } });
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Password reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modern-page auth-recovery-page">
      <div className="auth-modern-shell auth-recovery-shell">
        <aside
          className="auth-modern-panel auth-recovery-panel"
          style={{
            '--auth-panel-image': "url('/ingather-landing-hero.png')",
            '--auth-panel-image-modern': "image-set(url('/ingather-landing-hero.avif') type('image/avif'), url('/ingather-landing-hero.webp') type('image/webp'), url('/ingather-landing-hero.png') type('image/png'))"
          }}
        >
          <button className="auth-modern-brand" onClick={() => window.location.href = '/'} type="button">
            <img src="/ingather-logo.png" alt="" />
            <span>Ingather</span>
          </button>

          <div className="auth-panel-content">
            <span className="auth-panel-pill">New password</span>
            <h1>Reset access without losing momentum.</h1>
            <p>
              Use the code from your email and set a fresh password for your
              Ingather workspace.
            </p>
          </div>

          <div className="auth-recovery-proof" aria-hidden="true">
            <div>
              <span>Protected</span>
              <strong>OTP</strong>
            </div>
            <div>
              <span>Next step</span>
              <strong>Login</strong>
            </div>
          </div>
        </aside>

        <main className="auth-modern-card auth-reset-card">
          <div className="auth-modern-header">
            <p className="auth-modern-kicker">Reset password</p>
            <h2>Create a new password</h2>
            <span>Enter the six-digit code and choose a new password.</span>
          </div>

          <div className="auth-modern-note">
            <span>Reset code sent to</span>
            <strong>{email}</strong>
          </div>

          <form className="auth-modern-form" onSubmit={handleSubmit}>
            <div className="auth-modern-field">
              <label>Verification code</label>
              <div className="otp-container otp-container-modern">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => { inputRefs.current[index] = element; }}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    className="otp-input"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    autoFocus={index === 0}
                    aria-label={`Digit ${index + 1}`}
                  />
                ))}
              </div>
              {errors.otp && <span className="error">{errors.otp}</span>}
            </div>

            <div className="auth-modern-field">
              <label htmlFor="newPassword">New password</label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setErrors({ ...errors, newPassword: '' }); }}
                placeholder="Minimum 6 characters"
              />
              {errors.newPassword && <span className="error">{errors.newPassword}</span>}
            </div>

            <div className="auth-modern-field">
              <label htmlFor="confirmPassword">Confirm password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setErrors({ ...errors, confirmPassword: '' }); }}
                placeholder="Re-enter your password"
              />
              {errors.confirmPassword && <span className="error">{errors.confirmPassword}</span>}
            </div>

            {error && <div className="auth-message auth-message-error">{error}</div>}
            {success && <div className="auth-message auth-message-success">{success}</div>}

            <button type="submit" className="auth-modern-submit" disabled={loading}>
              {loading ? 'Resetting password...' : 'Reset password'}
            </button>

            <p className="auth-modern-switch">
              <a href="/login">Back to login</a>
            </p>
          </form>
        </main>
      </div>
    </div>
  );
}

export default ResetPassword;
