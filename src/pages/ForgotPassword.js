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
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <h1 onClick={() => window.location.href = '/'} style={{ cursor: 'pointer' }}>
                        Ingather
                    </h1>
                    <p>Reset your password</p>
                </div>

                <div className="verify-info">
                    <p className="verify-description">
                        Enter your email address and we'll send you a verification code to reset your password.
                    </p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {/* Email */}
                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setError(''); }}
                            placeholder="admin@church.com"
                        />
                        {error && <span className="error">{error}</span>}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="btn btn-primary btn-full"
                        disabled={loading}
                    >
                        {loading ? 'Sending...' : 'Send Reset Code'}
                    </button>

                    {/* Back to Login */}
                    <p className="auth-switch">
                        Remember your password?{' '}
                        <a href="/login">Back to Login</a>
                    </p>
                </form>
            </div>
        </div>
    );
}

export default ForgotPassword;
