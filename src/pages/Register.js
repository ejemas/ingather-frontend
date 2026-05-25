import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { register } from '../api/authService';
import { useToast } from '../components/Toast';
import { SIGNUP_INTENT_STORAGE_KEY } from '../components/SignupIntentModal';
import { DEFAULT_EVENT_TEMPLATE, EVENT_TEMPLATE_STORAGE_KEY, getEventTemplate } from '../config/eventTemplates';
import '../styles/Auth.css';

function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const signupIntent = useMemo(() => {
    const queryType = new URLSearchParams(location.search).get('type');
    if (queryType === 'church' || queryType === 'general') return queryType;

    try {
      const storedIntent = localStorage.getItem(SIGNUP_INTENT_STORAGE_KEY);
      return storedIntent === 'church' ? 'church' : 'general';
    } catch (error) {
      return 'general';
    }
  }, [location.search]);
  const templateKey = signupIntent === 'church' ? 'church' : DEFAULT_EVENT_TEMPLATE;
  const template = getEventTemplate(templateKey);
  const [formData, setFormData] = useState({
    churchName: '',
    branchName: '',
    email: '',
    password: '',
    confirmPassword: '',
    location: '',
    logo: null
  });

  const [errors, setErrors] = useState({});
  const [logoPreview, setLogoPreview] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(SIGNUP_INTENT_STORAGE_KEY, signupIntent);
      localStorage.setItem(EVENT_TEMPLATE_STORAGE_KEY, templateKey);
    } catch (error) {
      // Local storage can be unavailable in restricted browser contexts.
    }
  }, [signupIntent, templateKey]);

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

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        logo: file
      });
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.churchName.trim()) {
      newErrors.churchName = `${template.organization.nameLabel} is required`;
    }

    if (!formData.branchName.trim()) {
      newErrors.branchName = `${template.organization.branchLabel} is required`;
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
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

    try {
      await register({
        ...formData,
        organizationType: signupIntent === 'church' ? 'church' : undefined
      });

      toast.success('Registration successful! Please check your email for the verification code.');
      navigate('/verify-email', { state: { email: formData.email } });
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.error || 'Registration failed. Please try again.';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="auth-modern-page auth-register-page">
      <div className="auth-modern-shell auth-modern-shell-wide">
        <aside
          className="auth-modern-panel auth-register-panel"
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
            <span className="auth-panel-pill">Start in minutes</span>
            <h1>Give your organization a cleaner way to welcome people.</h1>
            <p>
              Create events, collect attendee information, prevent duplicate scans,
              and keep attendance records organized from day one.
            </p>
          </div>

          <div className="auth-register-highlights" aria-hidden="true">
            <div><strong>QR</strong><span>Fast check-in</span></div>
            <div><strong>Live</strong><span>Event insights</span></div>
            <div><strong>Free</strong><span>No card needed</span></div>
          </div>
        </aside>

        <main className="auth-modern-card auth-register-card">
          <div className="auth-modern-header">
            <p className="auth-modern-kicker">Create account</p>
            <h2>Set up your {template.organization.workspaceLabel.toLowerCase()}</h2>
            <span>Tell us about your organization so Ingather can prepare your dashboard.</span>
          </div>

          <form className="auth-modern-form" onSubmit={handleSubmit}>
            <div className="auth-modern-grid">
              <div className="auth-modern-field">
                <label htmlFor="churchName">{template.organization.nameLabel}</label>
                <input
                  type="text"
                  id="churchName"
                  name="churchName"
                  value={formData.churchName}
                  onChange={handleChange}
                  placeholder={signupIntent === 'church' ? 'e.g., Grace Assembly' : 'e.g., Ingather Labs'}
                />
                {errors.churchName && <span className="error">{errors.churchName}</span>}
              </div>

              <div className="auth-modern-field">
                <label htmlFor="branchName">{template.organization.branchLabel}</label>
                <input
                  type="text"
                  id="branchName"
                  name="branchName"
                  value={formData.branchName}
                  onChange={handleChange}
                  placeholder={signupIntent === 'church' ? 'e.g., Lekki Branch' : 'e.g., Lagos Team'}
                />
                {errors.branchName && <span className="error">{errors.branchName}</span>}
              </div>
            </div>

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
              <label htmlFor="location">Location or address</label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., Lagos, Nigeria"
              />
              {errors.location && <span className="error">{errors.location}</span>}
            </div>

            <div className="auth-modern-upload">
              <input
                type="file"
                id="logo"
                accept="image/*"
                onChange={handleLogoUpload}
              />
              <label htmlFor="logo">
                <span className="auth-upload-avatar">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo preview" />
                  ) : (
                    <img src="/ingather-logo.png" alt="" />
                  )}
                </span>
                <span>
                  <strong>{logoPreview ? 'Logo selected' : 'Add organization logo'}</strong>
                  <small>Optional, JPG or PNG</small>
                </span>
              </label>
            </div>

            <div className="auth-modern-grid">
              <div className="auth-modern-field">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimum 6 characters"
                />
                {errors.password && <span className="error">{errors.password}</span>}
              </div>

              <div className="auth-modern-field">
                <label htmlFor="confirmPassword">Confirm password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                />
                {errors.confirmPassword && <span className="error">{errors.confirmPassword}</span>}
              </div>
            </div>

            <button type="submit" className="auth-modern-submit">
              Create Account
            </button>

            <p className="auth-modern-switch">
              Already have an account?
              <a href="/login"> Login here</a>
            </p>
          </form>
        </main>
      </div>
    </div>
  );
}

export default Register;
