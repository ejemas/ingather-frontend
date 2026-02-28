import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { resetPassword } from '../api/authService';
import '../styles/Auth.css';

function ResetPassword() {
    const location = useLocation();
    const navigate = useNavigate();
    const email = location.state?.email || '';

    const [otp, setOtp] = useState(['', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState({});
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const inputRefs = [useRef(), useRef(), useRef(), useRef()];

    // Redirect if no email in state
    useEffect(() => {
        if (!email) {
            navigate('/forgot-password');
        }
    }, [email, navigate]);

    const handleOtpChange = (index, value) => {
        if (value && !/^\d$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        setError('');

        if (value && index < 3) {
            inputRefs[index + 1].current.focus();
        }
    };

    const handleKeyDown = (index, e) => {
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
        const newErrors = {};

        if (otpCode.length !== 4) {
            newErrors.otp = 'Please enter the complete 4-digit code';
        }

        if (!newPassword) {
            newErrors.newPassword = 'New password is required';
        } else if (newPassword.length < 6) {
            newErrors.newPassword = 'Password must be at least 6 characters';
        }

        if (newPassword !== confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);
        setError('');
        setErrors({});

        try {
            const response = await resetPassword(email, otpCode, newPassword);
            setSuccess(response.message || 'Password reset successfully!');
            setTimeout(() => {
                navigate('/login', { state: { passwordReset: true } });
            }, 1500);
        } catch (err) {
            const errorMessage = err.response?.data?.error || 'Password reset failed. Please try again.';
            setError(errorMessage);
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
                    <p>Create your new password</p>
                </div>

                <div className="verify-info">
                    <p className="verify-description">
                        Enter the verification code sent to
                    </p>
                    <p className="verify-email">{email}</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {/* OTP Input */}
                    <div className="form-group">
                        <label>Verification Code</label>
                        <div className="otp-container">
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={inputRefs[index]}
                                    type="text"
                                    maxLength="1"
                                    className="otp-input"
                                    value={digit}
                                    onChange={(e) => handleOtpChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    onPaste={index === 0 ? handlePaste : undefined}
                                    autoFocus={index === 0}
                                />
                            ))}
                        </div>
                        {errors.otp && <span className="error">{errors.otp}</span>}
                    </div>

                    {/* New Password */}
                    <div className="form-group">
                        <label htmlFor="newPassword">New Password</label>
                        <input
                            type="password"
                            id="newPassword"
                            value={newPassword}
                            onChange={(e) => { setNewPassword(e.target.value); setErrors({ ...errors, newPassword: '' }); }}
                            placeholder="Minimum 6 characters"
                        />
                        {errors.newPassword && <span className="error">{errors.newPassword}</span>}
                    </div>

                    {/* Confirm Password */}
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => { setConfirmPassword(e.target.value); setErrors({ ...errors, confirmPassword: '' }); }}
                            placeholder="Re-enter your password"
                        />
                        {errors.confirmPassword && <span className="error">{errors.confirmPassword}</span>}
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
                        {loading ? 'Resetting...' : 'Reset Password'}
                    </button>

                    {/* Back to Login */}
                    <p className="auth-switch">
                        <a href="/login">Back to Login</a>
                    </p>
                </form>
            </div>
        </div>
    );
}

export default ResetPassword;
