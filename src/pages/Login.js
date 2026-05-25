import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { login } from '../api/authService';
import { useToast } from '../components/Toast';
import SignupIntentModal from '../components/SignupIntentModal';
import { DEFAULT_EVENT_TEMPLATE, EVENT_TEMPLATE_STORAGE_KEY, eventTemplates } from '../config/eventTemplates';
import '../styles/Auth.css';

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
          <button className="auth-modern-brand" onClick={() => window.location.href = '/'} type="button">
            <img src="/ingather-logo.png" alt="" />
            <span>Ingather</span>
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
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
              />
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
                onClick={() => setShowSignupIntent(true)}
              >
                Create an account
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
