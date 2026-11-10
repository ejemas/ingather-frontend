import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { resetPassword } from '../api/authService';
import {
  AccountLayout,
  CodeInput,
  Notice,
  PasswordInput,
  PasswordStrength,
  passwordProblem
} from '../components/AccountLayout';

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

  useEffect(() => {
    if (!email) {
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  const handleOtpChange = (next) => {
    setOtp(next);
    setError('');
    if (errors.otp) setErrors({ ...errors, otp: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    const otpCode = otp.join('');
    const newErrors = {};

    if (otpCode.length !== OTP_LENGTH) {
      newErrors.otp = `Please enter the complete ${OTP_LENGTH}-digit code`;
    }

    const pwProblem = passwordProblem(newPassword);
    if (pwProblem) {
      newErrors.newPassword = pwProblem;
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
    <AccountLayout
      pillTag="Reset password"
      pillText="Check your email for a code"
      titleStart="Create a new"
      titleBox="password"
      lead="Enter the 6-digit code we sent you, then choose a new password."
      photo="/landing/account.jpg"
      photoAlt="Developers with laptops listening at a tech session"
      chip="Codes expire after 10 minutes"
      panelTitle="Reset access without losing momentum."
      panelText="Your events, attendees and reports are right where you left them."
      tall
    >
      <form className="ig-wl-card ig-wl-form" onSubmit={handleSubmit} noValidate>
        <div>
          <CodeInput digits={otp} onChange={handleOtpChange} invalid={Boolean(errors.otp || error)} disabled={loading} />
          {errors.otp ? (
            <p className="ig-acct-code-note" style={{ marginTop: 8, color: '#B42318', fontWeight: 500 }}>{errors.otp}</p>
          ) : (
            <p className="ig-acct-code-note" style={{ marginTop: 8 }}>
              If an account uses <strong>{email}</strong>, a code is on its way. You can paste the whole code.
            </p>
          )}
        </div>

        <div className={`ig-wl-field ${errors.newPassword ? 'has-error' : ''}`}>
          <label htmlFor="newPassword">New password</label>
          <PasswordInput
            id="newPassword"
            name="newPassword"
            value={newPassword}
            onChange={(e) => { setNewPassword(e.target.value); setErrors({ ...errors, newPassword: '' }); }}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            invalid={Boolean(errors.newPassword)}
          />
          {errors.newPassword && <small>{errors.newPassword}</small>}
        </div>

        <PasswordStrength password={newPassword} />

        <div className={`ig-wl-field ${errors.confirmPassword ? 'has-error' : ''}`}>
          <label htmlFor="confirmPassword">Confirm password</label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setErrors({ ...errors, confirmPassword: '' }); }}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            invalid={Boolean(errors.confirmPassword)}
          />
          {errors.confirmPassword && <small>{errors.confirmPassword}</small>}
        </div>

        {error && <Notice tone="error">{error}</Notice>}
        {success && <Notice tone="success">{success}</Notice>}

        <button type="submit" className="ig-wl-submit" disabled={loading} aria-busy={loading}>
          {loading ? (
            <>
              <span className="ig-wl-spinner" aria-hidden="true" />
              Resetting password...
            </>
          ) : 'Reset password'}
        </button>
        <p className="ig-acct-center">Didn't get a code? <Link to="/forgot-password">Request a new one</Link></p>
      </form>
    </AccountLayout>
  );
}

export default ResetPassword;
