import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { login } from '../api/authService';
import { useToast } from '../components/Toast';
import SignupIntentModal from '../components/SignupIntentModal';
import { DEFAULT_EVENT_TEMPLATE, EVENT_TEMPLATE_STORAGE_KEY, eventTemplates } from '../config/eventTemplates';
import '../styles/Auth.css';

const PasswordVisibilityIcon = ({ visible }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {visible ? (
      <>
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6a2 2 0 002.8 2.8" />
        <path d="M9.9 5.1A10.9 10.9 0 0112 5c5 0 8.5 4 10 7a13.4 13.4 0 01-3 4.1" />
        <path d="M6.6 6.6A13.8 13.8 0 002 12c1.5 3 5 7 10 7 1.5 0 2.9-.4 4.1-1" />
      </>
    ) : (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
);

const INVITE_ONLY_MODE = process.env.REACT_APP_INVITE_ONLY_MODE !== 'false';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSignupIntent, setShowSignupIntent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage] = useState(
    location.state?.verified ? 'Email verified successfully! You can now login.' :
      location.state?.passwordReset ? 'Password reset successfully! Login with your new password.' : ''
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const handleSignupIntentSelect = (intent) => {
    window.location.href = `/register?type=${intent}`;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    const newErrors = validateForm();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const response = await login(formData.email, formData.password);

      localStorage.setItem('token', response.token);
      localStorage.setItem('church', JSON.stringify(response.church));
      if (response.church?.organizationType && eventTemplates[response.church.organizationType]) {
        localStorage.setItem(EVENT_TEMPLATE_STORAGE_KEY, response.church.organizationType);
      } else {
        localStorage.setItem(EVENT_TEMPLATE_STORAGE_KEY, DEFAULT_EVENT_TEMPLATE);
      }

      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Login error:', error);

      if (error.response?.status === 403 && error.response?.data?.requiresVerification) {
        toast.confirm(
          'Your email is not verified. Would you like to verify it now?',
          () => navigate('/verify-email', { state: { email: formData.email } })
        );
        return;
      }

      const errorMessage = error.response?.data?.error || 'Login failed. Please check your credentials.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modern-page auth-login-page">
      <div className="auth-modern-shell">
        <aside
          className="auth-modern-panel"
          style={{
            '--auth-panel-image': "url('/ingather-landing-hero.png')",
            '--auth-panel-image-modern': "image-set(url('/ingather-landing-hero.avif') type('image/avif'), url('/ingather-landing-hero.webp') type('image/webp'), url('/ingather-landing-hero.png') type('image/png'))"
          }}
        >
          <button className="auth-modern-brand" onClick={() => window.location.href = '/'} type="button" aria-label="Ingather home">
            <img src="/ingather-logo.png" alt="Ingather" />
          </button>

          <div className="auth-panel-content">
            <span className="auth-panel-pill">Live event intelligence</span>
            <h1>Welcome back to your event command center.</h1>
            <p>
              Track scans, attendee forms, gifting, and event reports from one
              calm dashboard built for event organizers.
            </p>
          </div>

          <div className="auth-panel-preview" aria-hidden="true">
            <div className="preview-card preview-card-main">
              <span>Current Event</span>
              <strong>Builder Summit</strong>
              <div className="preview-bars">
                <i></i><i></i><i></i><i></i>
              </div>
            </div>
            <div className="preview-card preview-card-floating">
              <span>Live check-ins</span>
              <strong>248</strong>
            </div>
          </div>
        </aside>

        <main className="auth-modern-card">
          <div className="auth-modern-header">
            <p className="auth-modern-kicker">Sign in</p>
            <h2>Access your workspace</h2>
            <span>Enter your details to continue managing attendance.</span>
          </div>

          <form className="auth-modern-form" onSubmit={handleSubmit}>
            {successMessage && (
              <div className="auth-message auth-message-success">{successMessage}</div>
            )}

            <div className="auth-modern-field">
              <label htmlFor="email">Email address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="admin@organization.com"
              />
              {errors.email && <span className="error">{errors.email}</span>}
            </div>

            <div className="auth-modern-field">
              <label htmlFor="password">Password</label>
              <div className="auth-password-control">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword(prev => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  <PasswordVisibilityIcon visible={showPassword} />
                </button>
              </div>
              {errors.password && <span className="error">{errors.password}</span>}
            </div>

            <div className="auth-modern-extras">
              <label className="auth-modern-checkbox">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <a href="/forgot-password">Forgot password?</a>
            </div>

            <button
              type="submit"
              className="auth-modern-submit"
              disabled={loading}
              aria-busy={loading}
            >
              {loading && <span className="auth-submit-spinner" aria-hidden="true"></span>}
              <span>{loading ? 'Logging in...' : 'Login'}</span>
            </button>

            <p className="auth-modern-switch">
              New to Ingather?
              <button
                type="button"
                className="auth-modern-link-button"
                onClick={() => INVITE_ONLY_MODE ? navigate('/waitlist') : setShowSignupIntent(true)}
              >
                {INVITE_ONLY_MODE ? 'Join the waitlist' : 'Create an account'}
              </button>
            </p>
          </form>
        </main>
      </div>
      {showSignupIntent && (
        <SignupIntentModal
          onClose={() => setShowSignupIntent(false)}
          onSelect={handleSignupIntentSelect}
        />
      )}
    </div>
  );
}

export default Login;
