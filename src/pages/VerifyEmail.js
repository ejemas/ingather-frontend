import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { verifyOtp, resendOtp } from '../api/authService';
import '../styles/Auth.css';

function VerifyEmail() {
    const location = useLocation();
    const navigate = useNavigate();
    const email = location.state?.email || '';

    const [otp, setOtp] = useState(['', '', '', '']);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const inputRefs = [useRef(), useRef(), useRef(), useRef()];

    // Redirect if no email in state
    useEffect(() => {
        if (!email) {
            navigate('/register');
        }
    }, [email, navigate]);

    // Resend cooldown timer
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleChange = (index, value) => {
        // Only allow digits
        if (value && !/^\d$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        setError('');

        // Auto-advance to next input
        if (value && index < 3) {
            inputRefs[index + 1].current.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        // Go back on backspace if current field is empty
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs[index - 1].current.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').trim().slice(0, 4);
        if (/^\d{1,4}$/.test(pastedData)) {
            const newOtp = [...otp];
            pastedData.split('').forEach((char, i) => {
                newOtp[i] = char;
            });
            setOtp(newOtp);
            const focusIndex = Math.min(pastedData.length, 3);
            inputRefs[focusIndex].current.focus();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const otpCode = otp.join('');

        if (otpCode.length !== 4) {
            setError('Please enter the complete 4-digit code');
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
            const errorMessage = err.response?.data?.error || 'Verification failed. Please try again.';
            setError(errorMessage);
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
            setSuccess('A new OTP has been sent to your email.');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to resend OTP.');
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <h1 onClick={() => window.location.href = '/'} style={{ cursor: 'pointer' }}>
                        Ingather
                    </h1>
                    <p>Verify your email address</p>
                </div>

                <div className="verify-info">
                    <p className="verify-description">
                        We've sent a 4-digit verification code to
                    </p>
                    <p className="verify-email">{email}</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {/* OTP Input */}
                    <div className="otp-container">
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                ref={inputRefs[index]}
                                type="text"
                                maxLength="1"
                                className="otp-input"
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={index === 0 ? handlePaste : undefined}
                                autoFocus={index === 0}
                            />
                        ))}
                    </div>

                    {/* Error Message */}
                    {error && <div className="auth-message auth-message-error">{error}</div>}

                    {/* Success Message */}
                    {success && <div className="auth-message auth-message-success">{success}</div>}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="btn btn-primary btn-full"
                        disabled={loading}
                    >
                        {loading ? 'Verifying...' : 'Verify Email'}
                    </button>

                    {/* Resend OTP */}
                    <p className="auth-switch">
                        Didn't receive the code?{' '}
                        {resendCooldown > 0 ? (
                            <span className="resend-timer">Resend in {resendCooldown}s</span>
                        ) : (
                            <button type="button" className="resend-link" onClick={handleResend}>
                                Resend OTP
                            </button>
                        )}
                    </p>

                    {/* Back to Login */}
                    <p className="auth-switch">
                        <a href="/login">Back to Login</a>
                    </p>
                </form>
            </div>
        </div>
    );
}

export default VerifyEmail;
