import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { login } from '../api/authService';
import '../styles/Auth.css';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [rememberMe, setRememberMe] = useState(false);
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
    // Clear error for this field
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
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

    const newErrors = validateForm();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const { login } = await import('../api/authService');

      const response = await login(formData.email, formData.password);

      // Store token
      localStorage.setItem('token', response.token);

      // Store church info
      localStorage.setItem('church', JSON.stringify(response.church));

      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Login error:', error);

      // Handle unverified email
      if (error.response?.status === 403 && error.response?.data?.requiresVerification) {
        const goToVerify = window.confirm(
          'Your email is not verified. Would you like to verify it now?'
        );
        if (goToVerify) {
          navigate('/verify-email', { state: { email: formData.email } });
        }
        return;
      }

      const errorMessage = error.response?.data?.error || 'Login failed. Please check your credentials.';
      alert(errorMessage);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1 onClick={() => window.location.href = '/'} style={{ cursor: 'pointer' }}>
            Ingather
          </h1>
          <p>Welcome back! Please login to your account</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Success Message */}
          {successMessage && (
            <div className="auth-message auth-message-success">{successMessage}</div>
          )}

          {/* Email */}
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="admin@church.com"
            />
            {errors.email && <span className="error">{errors.email}</span>}
          </div>

          {/* Password */}
          <div className="form-group">
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

          {/* Remember Me & Forgot Password */}
          <div className="form-extras">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
            <a href="/forgot-password" className="forgot-link">
              Forgot password?
            </a>
          </div>

          {/* Submit Button */}
          <button type="submit" className="btn btn-primary btn-full">
            Login
          </button>

          {/* Register Link */}
          <p className="auth-switch">
            Don't have an account?
            <a href="/register"> Sign up here</a>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;