import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { login } from '../api/authService';
import { useToast } from '../components/Toast';
import SignupIntentModal from '../components/SignupIntentModal';
import { clearLoggedOutFlag, completeLogin, getDeviceId, peekLoggedOutFlag } from '../utils/authSession';
import '../styles/IgWaitlist.css';
import '../styles/IgLogin.css';

const PasswordVisibilityIcon = ({ visible }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

const Check = ({ size = 14, color = 'currentColor', width = 2.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

const INVITE_ONLY_MODE = process.env.REACT_APP_INVITE_ONLY_MODE !== 'false';
const PHOTO_ALT = 'Professionals listening to a keynote at a business summit';

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
  const [notice] = useState(() => {
    if (location.state?.verified) {
      return { title: 'Email verified', text: 'You can now log in to your workspace.' };
    }
    if (location.state?.passwordReset) {
      return { title: 'Password reset', text: 'Log in with your new password.' };
    }
    if (location.state?.loggedOut || peekLoggedOutFlag()) {
      return { title: 'You are logged out', text: 'Log back in any time to manage your events.' };
    }
    return null;
  });

  useEffect(() => {
    clearLoggedOutFlag();
  }, []);

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

  const openSignup = () => {
    if (INVITE_ONLY_MODE) {
      navigate('/waitlist');
      return;
    }
    setShowSignupIntent(true);
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
      const response = await login(formData.email, formData.password, {
        deviceId: getDeviceId(),
        remember: rememberMe
      });

      if (response.requiresDeviceVerification) {
        navigate('/confirm-device', {
          state: {
            challengeId: response.challengeId,
            maskedEmail: response.maskedEmail,
            deviceLabel: response.deviceLabel,
            resendInSeconds: response.resendInSeconds
          }
        });
        return;
      }

      completeLogin(response);
    } catch (error) {
      console.error('Login error:', error);

      if (error.response?.status === 403 && error.response?.data?.requiresVerification) {
        toast.confirm(
          "You need to confirm your email address before you can log in. We'll take you to enter the code we sent you.",
          () => navigate('/verify-email', { state: { email: formData.email } }),
          undefined,
          { title: 'Verify your email first', confirmLabel: 'Verify email', cancelLabel: 'Not now', tone: 'primary' }
        );
        return;
      }

      const errorMessage = error.response?.data?.error || 'Login failed. Please check your credentials.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signupLabel = INVITE_ONLY_MODE ? 'Join the Waitlist' : 'Create an account';

  return (
    <div className="ig-wl ig-login">
      <div className="ig-wl-frame">
        <div className="ig-wl-col">
          <div className="ig-wl-navwrap">
            <nav className="ig-wl-nav" aria-label="Main">
              <Link to="/" className="ig-wl-brand" aria-label="Ingather home">
                <img src="/ingather-logo.png" alt="Ingather" />
              </Link>
              <div className="ig-wl-navlinks">
                <Link to="/">Home</Link>
                <Link to="/#features">Features</Link>
                <Link to="/discover">Discover</Link>
                <Link to="/#faq">FAQs</Link>
              </div>
              <button type="button" className="ig-wl-login ig-login-navcta" onClick={openSignup}>
                {INVITE_ONLY_MODE ? 'Join Waitlist' : 'Start Free'}
              </button>
            </nav>
          </div>

          <main className="ig-wl-main">
            <div className="ig-wl-photo-top ig-login-photo-top">
              <img src="/landing/login.jpg" alt={PHOTO_ALT} />
              <div className="ig-wl-shade" aria-hidden="true" />
              <div className="ig-login-minicard" aria-hidden="true">
                <span>Live check-ins</span>
                <strong>642</strong>
              </div>
            </div>

            <div className="ig-wl-left ig-login-left">
              {notice && (
                <div className="ig-login-notice" role="status">
                  <span className="ig-login-notice-icon"><Check color="#FFFFFF" width={3} /></span>
                  <span>
                    <strong>{notice.title}</strong>
                    <span>{notice.text}</span>
                  </span>
                </div>
              )}
              <span className="ig-wl-pill"><span>Organizers</span>Log in to your workspace</span>
              <h1>Welcome <span className="ig-wl-mark">back</span></h1>
              <p className="ig-wl-lead">Manage your events, check-ins and reports from one dashboard.</p>

              <form className="ig-wl-card ig-wl-form" onSubmit={handleSubmit} noValidate>
                <div className={`ig-wl-field ${errors.email ? 'has-error' : ''}`}>
                  <label htmlFor="email">Email address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="admin@organization.com"
                    autoComplete="email"
                  />
                  {errors.email && <small>{errors.email}</small>}
                </div>

                <div className={`ig-wl-field ${errors.password ? 'has-error' : ''}`}>
                  <label htmlFor="password">Password</label>
                  <div className="ig-login-pw">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                    >
                      <PasswordVisibilityIcon visible={showPassword} />
                    </button>
                  </div>
                  {errors.password && <small>{errors.password}</small>}
                </div>

                <div className="ig-login-extras">
                  <label className="ig-login-remember">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    Remember me for 30 days
                  </label>
                  <Link to="/forgot-password">Forgot password?</Link>
                </div>

                <button type="submit" className="ig-wl-submit" disabled={loading} aria-busy={loading}>
                  {loading ? (
                    <>
                      <span className="ig-wl-spinner" aria-hidden="true" />
                      Logging in...
                    </>
                  ) : 'Log in'}
                </button>

                <div className="ig-login-divider" aria-hidden="true"><span />New to Ingather?<span /></div>
                <button type="button" className="ig-login-secondary" onClick={openSignup}>{signupLabel}</button>
                {INVITE_ONLY_MODE && (
                  <p className="ig-login-hint">Got an invite email? Use the link inside it to create your account.</p>
                )}
              </form>
            </div>

            <div className="ig-wl-photo ig-login-photo">
              <img src="/landing/login.jpg" alt={PHOTO_ALT} />
              <div className="ig-wl-shade" aria-hidden="true" />
              <div className="ig-login-photo-fade" aria-hidden="true" />
              <div className="ig-login-livecard" aria-hidden="true">
                <div className="ig-login-livecard-top"><span>Live check-ins</span><span className="ig-login-dot" /></div>
                <div className="ig-login-livecard-num"><span>642</span><span>guests in</span></div>
                <div className="ig-login-livecard-bar"><div /></div>
                <div className="ig-login-livecard-row"><span>First-timers</span><strong>118</strong></div>
              </div>
              <div className="ig-login-photo-copy">
                <span className="ig-login-toast" aria-hidden="true">
                  <span className="ig-login-toast-icon"><Check size={12} /></span>
                  <span><strong>Adaeze Okafor</strong> checked in, 9:42</span>
                </span>
                <span className="ig-login-photo-title">Your event command center.</span>
                <span className="ig-login-photo-text">Track scans, attendee forms, gifting and reports from one dashboard.</span>
              </div>
            </div>
          </main>

          <footer className="ig-wl-foot">
            <span>&copy; 2026 Ingather. All rights reserved.</span>
            <span>Made in Nigeria</span>
          </footer>
        </div>
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
