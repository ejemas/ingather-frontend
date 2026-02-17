import React, { useState } from 'react';
import { register } from '../api/authService';
import '../styles/Auth.css';

function Register() {
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Clear error for this field when user starts typing
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
      // Create preview
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
      newErrors.churchName = 'Church name is required';
    }

    if (!formData.branchName.trim()) {
      newErrors.branchName = 'Branch name is required';
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
    // Import at top of file
    const { register } = await import('../api/authService');
    
    const response = await register(formData);
    
    // Store token
    localStorage.setItem('token', response.token);
    
    // Store church info
    localStorage.setItem('church', JSON.stringify(response.church));
    
    alert('Registration successful!');
    window.location.href = '/dashboard';
  } catch (error) {
    console.error('Registration error:', error);
    const errorMessage = error.response?.data?.error || 'Registration failed. Please try again.';
    alert(errorMessage);
  }
};

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1 onClick={() => window.location.href='/'} style={{cursor: 'pointer'}}>
            Ingather
          </h1>
          <p>Create your church account</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Church Name */}
          <div className="form-group">
            <label htmlFor="churchName">Church Name *</label>
            <input
              type="text"
              id="churchName"
              name="churchName"
              value={formData.churchName}
              onChange={handleChange}
              placeholder="e.g., Grace Assembly"
            />
            {errors.churchName && <span className="error">{errors.churchName}</span>}
          </div>

          {/* Branch Name */}
          <div className="form-group">
            <label htmlFor="branchName">Branch Name *</label>
            <input
              type="text"
              id="branchName"
              name="branchName"
              value={formData.branchName}
              onChange={handleChange}
              placeholder="e.g., Lekki Branch"
            />
            {errors.branchName && <span className="error">{errors.branchName}</span>}
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
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

          {/* Location */}
          <div className="form-group">
            <label htmlFor="location">Location/Address *</label>
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

          {/* Logo Upload */}
          <div className="form-group">
            <label htmlFor="logo">Church Logo (Optional)</label>
            <div className="logo-upload">
              <input
                type="file"
                id="logo"
                accept="image/*"
                onChange={handleLogoUpload}
                style={{display: 'none'}}
              />
              <label htmlFor="logo" className="upload-btn">
                {logoPreview ? 'Change Logo' : 'Upload Logo'}
              </label>
              {logoPreview && (
                <div className="logo-preview">
                  <img src={logoPreview} alt="Logo preview" />
                </div>
              )}
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password">Password *</label>
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

          {/* Confirm Password */}
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your password"
            />
            {errors.confirmPassword && <span className="error">{errors.confirmPassword}</span>}
          </div>

          {/* Submit Button */}
          <button type="submit" className="btn btn-primary btn-full">
            Create Account
          </button>

          {/* Login Link */}
          <p className="auth-switch">
            Already have an account? 
            <a href="/login"> Login here</a>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Register;