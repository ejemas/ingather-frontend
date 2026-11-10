import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { verifyOtp, resendOtp } from '../api/authService';
import { AccountLayout, CodeInput, MailIcon, Notice } from '../components/AccountLayout';

const OTP_LENGTH = 6;

const formatCooldown = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || '';

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

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
    return undefined;
  }, [resendCooldown]);

  const handleOtpChange = (next) => {
    setOtp(next);
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
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
      setOtp(Array(OTP_LENGTH).fill(''));
      setSuccess('A new code has been sent to your email.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend code.');
    }
  };

  return (
    <AccountLayout
      pillTag="Verify email"
      pillText="One last step"
      titleStart="Check your"
      titleBox="inbox"
      lead="Enter the 6-digit code we sent to confirm this workspace belongs to you."
      photo="/landing/seg-boot.jpg"
      photoAlt="A team working together on laptops"
      chip="Protecting your organization data"
      panelTitle="Confirm the workspace belongs to you."
      panelText="One quick code protects your organization before your account is activated."
    >
      <form className="ig-wl-card ig-wl-form" onSubmit={handleSubmit} noValidate>
        <div className="ig-acct-row">
          <span className="ig-acct-row-icon"><MailIcon /></span>
          <span className="ig-acct-row-text">Code sent to<strong>{email}</strong></span>
        </div>

        <div>
          <CodeInput digits={otp} onChange={handleOtpChange} invalid={Boolean(error)} disabled={loading} />
          <p className="ig-acct-code-note" style={{ marginTop: 8 }}>The code expires in 10 minutes. Check your spam folder if you can't find it.</p>
        </div>

        {error && <Notice tone="error">{error}</Notice>}
        {success && <Notice tone="success">{success}</Notice>}

        <button type="submit" className="ig-wl-submit" disabled={loading} aria-busy={loading}>
          {loading ? (
            <>
              <span className="ig-wl-spinner" aria-hidden="true" />
              Verifying...
            </>
          ) : 'Verify email'}
        </button>

        <div className="ig-acct-links">
          <span>
            Didn't get it?{' '}
            <button type="button" className="ig-acct-linkbtn" onClick={handleResend} disabled={resendCooldown > 0}>
              {resendCooldown > 0 ? `Resend in ${formatCooldown(resendCooldown)}` : 'Resend code'}
            </button>
          </span>
          <Link to="/login">Back to log in</Link>
        </div>
      </form>
    </AccountLayout>
  );
}

export default VerifyEmail;
