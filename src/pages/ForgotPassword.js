import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword } from '../api/authService';
import { AccountLayout, MailIcon } from '../components/AccountLayout';

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
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
    <AccountLayout
      pillTag="Password reset"
      pillText="Takes about a minute"
      titleStart="Forgot your"
      titleBox="password?"
      lead="Enter the email you use for Ingather and we will send you a code to set a new password."
      photo="/landing/account.jpg"
      photoAlt="Developers with laptops listening at a tech session"
      chip="Your data stays protected"
      panelTitle="Get back to your event workspace quickly."
      panelText="A short code confirms it is you, then you are back to managing events."
    >
      <form className="ig-wl-card ig-wl-form" onSubmit={handleSubmit} noValidate>
        <div className={`ig-wl-field ${error ? 'has-error' : ''}`}>
          <label htmlFor="email">Email address</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            placeholder="admin@organization.com"
            autoComplete="email"
            autoFocus
          />
          {error && <small>{error}</small>}
        </div>

        <span className="ig-acct-hint">
          <MailIcon />
          If this email has an Ingather account, we'll send a 6-digit code to it. The code expires in 10 minutes.
        </span>

        <button type="submit" className="ig-wl-submit" disabled={loading} aria-busy={loading}>
          {loading ? (
            <>
              <span className="ig-wl-spinner" aria-hidden="true" />
              Sending code...
            </>
          ) : 'Send reset code'}
        </button>
        <p className="ig-acct-center">Remembered it? <Link to="/login">Back to log in</Link></p>
      </form>
    </AccountLayout>
  );
}

export default ForgotPassword;
