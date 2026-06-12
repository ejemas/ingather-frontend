import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { verifyOtp, resendOtp } from '../api/authService';
import '../styles/Auth.css';

const OTP_LENGTH = 6;

function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || '';

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) {
      navigate('/register');
    }
  }, [email, navigate]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

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
      const focusIndex = Math.min(pastedData.length, OTP_LENGTH - 1);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');

    if (otpCode.length !== OTP_LENGTH) {
      setError(`Please enter the complete ${OTP_LENGTH}-digit code`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await verifyOtp(email, otpCode);
      setSuccess(response.message || 'Email verified successfully!');
      setTimeout(() => {
        navigate('/login', { state: { verified: true } });
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    try {
      await resendOtp(email);
      setResendCooldown(60);
      setError('');
      setSuccess('A new code has been sent to your email.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend code.');
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
          </button>

          <div className="auth-panel-content">
            <span className="auth-panel-pill">Email verification</span>
            <h1>Confirm the workspace belongs to you.</h1>
            <p>
              One quick code protects your organization data before your account is
              activated.
            </p>
          </div>

          <div className="auth-code-preview" aria-hidden="true">
            <span></span><span></span><span></span><span></span><span></span><span></span>
          </div>
        </aside>

        <main className="auth-modern-card">
          <div className="auth-modern-header">
            <p className="auth-modern-kicker">Verify email</p>
            <h2>Enter your code</h2>
            <span>We sent a six-digit verification code to your inbox.</span>
          </div>

          <div className="auth-modern-note">
            <span>Code sent to</span>
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
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    autoFocus={index === 0}
                    aria-label={`Digit ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {error && <div className="auth-message auth-message-error">{error}</div>}
            {success && <div className="auth-message auth-message-success">{success}</div>}

            <button type="submit" className="auth-modern-submit" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify email'}
            </button>

            <p className="auth-modern-switch">
              Didn't receive the code?{' '}
              {resendCooldown > 0 ? (
                <span className="resend-timer">Resend in {resendCooldown}s</span>
              ) : (
                <button type="button" className="resend-link" onClick={handleResend}>
                  Resend code
                </button>
              )}
            </p>

            <p className="auth-modern-switch auth-modern-switch-muted">
              <a href="/login">Back to login</a>
            </p>
          </form>
        </main>
      </div>
    </div>
  );
}

export default VerifyEmail;
