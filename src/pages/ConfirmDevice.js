import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { resendDeviceCode, verifyDevice } from '../api/authService';
import { AccountLayout, CodeInput, Notice } from '../components/AccountLayout';
import { completeLogin, getDeviceId } from '../utils/authSession';
import { useToast } from '../components/Toast';

const OTP_LENGTH = 6;

const PhoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2zM11 18h2" />
  </svg>
);

const formatCooldown = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

function ConfirmDevice() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const challengeId = location.state?.challengeId || '';
  const maskedEmail = location.state?.maskedEmail || 'your email';
  const deviceLabel = location.state?.deviceLabel || 'This device';

  const [code, setCode] = useState(Array(OTP_LENGTH).fill(''));
  const [rememberDevice, setRememberDevice] = useState(true);
  const [status, setStatus] = useState('entry'); // entry | wrong | expired | verifying
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [cooldown, setCooldown] = useState(() => Number(location.state?.resendInSeconds) || 30);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!challengeId) {
      navigate('/login', { replace: true });
    }
  }, [challengeId, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const restartLogin = (text) => {
    toast.error(text || 'This sign-in has ended. Please log in again.');
    navigate('/login', { replace: true });
  };

  const handleCodeChange = (next) => {
    setCode(next);
    if (status === 'wrong') {
      setStatus('entry');
      setMessage('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (status === 'verifying' || status === 'expired') return;
    const value = code.join('');
    if (value.length !== OTP_LENGTH) {
      setStatus('wrong');
      setMessage(`Enter the full ${OTP_LENGTH}-digit code.`);
      return;
    }

    setStatus('verifying');
    setMessage('');
    setNotice('');

    try {
      const response = await verifyDevice({
        challengeId,
        code: value,
        deviceId: getDeviceId(),
        rememberDevice
      });
      completeLogin(response);
    } catch (error) {
      const data = error.response?.data || {};
      if (data.restart) {
        restartLogin(data.error);
        return;
      }
      if (data.expired) {
        setStatus('expired');
        setMessage(data.error || 'This code has expired. Send a new one to keep going.');
        return;
      }
      setStatus('wrong');
      setMessage(data.error || "That code isn't right. Please try again.");
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setNotice('');
    try {
      const response = await resendDeviceCode({ challengeId, deviceId: getDeviceId() });
      setCode(Array(OTP_LENGTH).fill(''));
      setStatus('entry');
      setMessage('');
      setNotice('A new code is on its way.');
      setCooldown(Number(response.resendInSeconds) || 30);
    } catch (error) {
      const data = error.response?.data || {};
      if (data.restart) {
        restartLogin(data.error);
        return;
      }
      if (data.resendInSeconds) setCooldown(Number(data.resendInSeconds));
      setMessage(data.error || "We couldn't send a new code. Please try again.");
      if (status !== 'expired') setStatus('wrong');
    } finally {
      setResending(false);
    }
  };

  const isExpired = status === 'expired';
  const isVerifying = status === 'verifying';

  return (
    <AccountLayout
      pillTag="New device"
      pillText="A quick check"
      titleStart="Confirm it's"
      titleBox="you"
      lead="You're signing in on a device we haven't seen before. Enter the 6-digit code we just emailed you."
      photo="/landing/seg-boot.jpg"
      photoAlt="A team working together on laptops"
      chip="Asked once per device"
      panelTitle="Only you can open your workspace."
      panelText="Every new phone or computer is checked with a code before it can see your events and guests."
    >
      <form className="ig-wl-card ig-wl-form" onSubmit={handleSubmit} noValidate>
        <div className="ig-acct-row">
          <span className="ig-acct-row-icon is-device"><PhoneIcon /></span>
          <span className="ig-acct-row-text"><strong>{deviceLabel}</strong>Code sent to {maskedEmail}</span>
        </div>

        <div className={isExpired ? 'ig-acct-code-expired' : ''}>
          <CodeInput
            digits={code}
            onChange={handleCodeChange}
            invalid={status === 'wrong'}
            disabled={isVerifying || isExpired}
            label="6-digit code"
          />
          <p
            className="ig-acct-code-note"
            style={{ marginTop: 8, ...(message ? { color: '#B42318', fontWeight: 500 } : {}) }}
            role={message ? 'alert' : undefined}
          >
            {message || 'The code expires in 10 minutes. You can paste the whole code.'}
          </p>
        </div>

        {notice && <Notice tone="success">{notice}</Notice>}

        <label className="ig-acct-remember">
          <input
            type="checkbox"
            checked={rememberDevice}
            onChange={(event) => setRememberDevice(event.target.checked)}
          />
          <span>
            <strong>Remember this device for 30 days</strong>
            <span>Leave unticked on a shared or public computer.</span>
          </span>
        </label>

        {isExpired ? (
          <button type="button" className="ig-wl-submit ig-acct-dark" onClick={handleResend} disabled={cooldown > 0 || resending}>
            {resending ? 'Sending...' : cooldown > 0 ? `Send a new code in ${formatCooldown(cooldown)}` : 'Send a new code'}
          </button>
        ) : (
          <button type="submit" className="ig-wl-submit" disabled={isVerifying} aria-busy={isVerifying}>
            {isVerifying ? (
              <>
                <span className="ig-wl-spinner" aria-hidden="true" />
                Checking...
              </>
            ) : 'Confirm and continue'}
          </button>
        )}

        <div className="ig-acct-links">
          {isExpired ? (
            <span>Codes last 10 minutes.</span>
          ) : (
            <span>
              Didn't get it?{' '}
              <button type="button" className="ig-acct-linkbtn" onClick={handleResend} disabled={cooldown > 0 || resending}>
                {cooldown > 0 ? `Resend in ${formatCooldown(cooldown)}` : 'Resend code'}
              </button>
            </span>
          )}
          <Link to="/login">Use a different account</Link>
        </div>
      </form>
    </AccountLayout>
  );
}

export default ConfirmDevice;
