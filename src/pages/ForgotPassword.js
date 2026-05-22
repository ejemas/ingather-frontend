import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgotPassword } from '../api/authService';
import '../styles/Auth.css';

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      await forgotPassword(email);
      navigate('/reset-password', { state: { email } });
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
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
            <span className="auth-panel-pill">Secure recovery</span>
            <h1>Get back to your event workspace quickly.</h1>
            <p>
              Receive a short verification code, confirm ownership, and return
              to managing events without disrupting your team.
            </p>
          </div>

          <div className="auth-recovery-proof" aria-hidden="true">
            <div>
              <span>Reset code</span>
              <strong>10 min</strong>
            </div>
            <div>
              <span>Account check</span>
              <strong>Email</strong>
            </div>
          </div>
        </aside>

        <main className="auth-modern-card">
          <div className="auth-modern-header">
            <p className="auth-modern-kicker">Password reset</p>
            <h2>Recover your account</h2>
            <span>Enter the email connected to your Ingather workspace.</span>
          </div>

          <form className="auth-modern-form" onSubmit={handleSubmit}>
            <div className="auth-modern-field">
              <label htmlFor="email">Email address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="admin@organization.com"
              />
              {error && <span className="error">{error}</span>}
            </div>

            <button type="submit" className="auth-modern-submit" disabled={loading}>
              {loading ? 'Sending code...' : 'Send reset code'}
            </button>

            <p className="auth-modern-switch">
              Remember your password?
              <a href="/login"> Back to login</a>
            </p>
          </form>
        </main>
      </div>
    </div>
  );
}

export default ForgotPassword;
