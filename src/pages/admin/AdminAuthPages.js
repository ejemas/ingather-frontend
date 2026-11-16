// Admin sign-in screens: password, authenticator code, first-time setup and backup codes.
import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { adminAuth, adminData, adminErrorMessage, setAdminCsrf } from '../../api/adminApi';
import { useAdminSession, homeFor } from './AdminSession';
import { AdminIcon } from './AdminIcons';

function AuthCard({ wide = false, children }) {
  return (
    <main className="ig-ad-auth">
      <div className={`ig-ad-card${wide ? ' is-wide' : ''}`}>
        <div className="ig-ad-brand">
          <img src="/ingather-logo.png" alt="Ingather" />
          <span className="ig-ad-pill-ink">Admin</span>
        </div>
        {children}
      </div>
    </main>
  );
}

// Six boxes on screen, one real input underneath, so typing, pasting and
// the phone's "fill code from messages" all work.
export function CodeBoxes({ value, onChange, onComplete, tight = false, label, autoFocus = true, invalid = false }) {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (autoFocus) inputRef.current?.focus(); }, [autoFocus]);
  const digits = value.padEnd(6, ' ').slice(0, 6).split('');
  return (
    <div className={`ig-ad-code${tight ? ' is-tight' : ''}`}>
      {digits.map((digit, index) => (
        <span
          key={index}
          className={`ig-ad-code-box${focused && index === Math.min(value.length, 5) ? ' is-active' : ''}`}
          style={invalid ? { borderColor: '#F04438' } : undefined}
          aria-hidden="true"
        >
          {digit.trim()}
        </span>
      ))}
      <input
        ref={inputRef}
        className="ig-ad-code-input"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        aria-label={label}
        aria-invalid={invalid ? 'true' : 'false'}
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          const next = event.target.value.replace(/\D/g, '').slice(0, 6);
          onChange(next);
          if (next.length === 6 && onComplete) onComplete(next);
        }}
      />
    </div>
  );
}

const nextPath = (next) => (next === 'setup' ? '/admin/setup' : '/admin/code');

export function AdminLogin() {
  const { session, applyStatus } = useAdminSession();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const [email, setEmail] = useState(() => params.get('email') || '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false);

  if (session.stage === 'full') return <Navigate to={homeFor(session.admin?.role)} replace />;

  const submit = async (event) => {
    event.preventDefault();
    if (busy || locked) return;
    setError('');
    if (!email.trim() || !password) {
      setError('Type your work email and password.');
      return;
    }
    setBusy(true);
    try {
      const { data } = await adminAuth.login(email.trim(), password);
      setAdminCsrf(data.csrf);
      applyStatus({ stage: 'password', next: data.next, csrf: data.csrf, email: email.trim() });
      navigate(nextPath(data.next), { replace: true });
    } catch (err) {
      if (err?.response?.status === 423) {
        setLocked(true);
      } else {
        setError(adminErrorMessage(err, 'Could not sign you in. Please try again.'));
      }
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  const timedOut = params.get('reason') === 'idle';
  const joined = params.get('reason') === 'joined';

  return (
    <AuthCard>
      <div className="ig-ad-head">
        <h1>Admin sign in</h1>
        <p>Only people the owner has added can sign in here. This is separate from organiser accounts.</p>
      </div>
      {locked ? (
        <div className="ig-ad-notice is-red" role="alert">
          <AdminIcon name="lock" size={16} />
          <span>Too many wrong tries. This account is paused for 15 minutes, and the owner has been told.</span>
        </div>
      ) : joined ? (
        <div className="ig-ad-notice is-green" role="status">
          <AdminIcon name="check" size={16} />
          <span>Your password is set. Sign in, then set up two-step sign-in with an authenticator app on your phone.</span>
        </div>
      ) : timedOut ? (
        <div className="ig-ad-notice" role="status">
          <AdminIcon name="clock" size={16} />
          <span>You were signed out after 30 minutes without activity. Sign in again to carry on.</span>
        </div>
      ) : null}
      <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <label className="ig-ad-field">
          Work email
          <input className="ig-ad-input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} disabled={locked} />
        </label>
        <label className="ig-ad-field">
          Password
          <input
            className="ig-ad-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error ? 'true' : 'false'}
            disabled={locked}
          />
        </label>
        {error ? <p className="ig-ad-error" role="alert">{error}</p> : null}
        <button type="submit" className="ig-ad-btn" disabled={busy || locked}>{busy ? 'Checking…' : 'Continue'}</button>
      </form>
      <span className="ig-ad-lock-note">
        <span><AdminIcon name="lock" size={14} /></span>
        After your password, you confirm it is you with the authenticator app on your phone. Every time, on every device.
      </span>
    </AuthCard>
  );
}

export function AdminCode() {
  const { session, applyStatus } = useAdminSession();
  const navigate = useNavigate();
  const [mode, setMode] = useState('app'); // app | backup | email
  const [code, setCode] = useState('');
  const [backup, setBackup] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  if (session.stage === 'full') return <Navigate to={homeFor(session.admin?.role)} replace />;
  if (session.stage !== 'password') return <Navigate to="/admin/login" replace />;
  if (session.next === 'setup') return <Navigate to="/admin/setup" replace />;

  const submit = async (body) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await adminAuth.verify(body);
      applyStatus({ stage: 'full', admin: data.admin, csrf: data.csrf });
      navigate(homeFor(data.admin?.role), { replace: true, state: { backupCodesLeft: data.backupCodesLeft } });
    } catch (err) {
      if (err?.response?.status === 423) {
        applyStatus({ stage: 'none' });
        navigate('/admin/login', { replace: true });
        return;
      }
      setError(adminErrorMessage(err, 'That code did not work. Check it and try again.'));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const askEmail = async () => {
    setError('');
    setInfo('');
    setBusy(true);
    try {
      await adminAuth.emailCode();
      setMode('email');
      setCode('');
      setInfo(`We emailed a 6-digit code to ${session.email}. It works for 10 minutes.`);
    } catch (err) {
      setError(adminErrorMessage(err, 'We could not send the email. Use your app or a backup code.'));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (event) => {
    event.preventDefault();
    if (mode === 'backup') {
      if (backup.replace(/[^a-z0-9]/gi, '').length < 8) { setError('Type the whole backup code, like 7KQ2-M9XD.'); return; }
      submit({ backupCode: backup });
    } else if (code.length === 6) {
      submit(mode === 'email' ? { emailCode: code } : { code });
    } else {
      setError('Type all 6 digits.');
    }
  };

  return (
    <AuthCard>
      <div className="ig-ad-head">
        <h1>{mode === 'backup' ? 'Use a backup code' : 'Enter your code'}</h1>
        {mode === 'app' ? (
          <p>Open your authenticator app and type the 6-digit code it shows for <strong>Ingather Admin</strong>.</p>
        ) : mode === 'email' ? (
          <p>Type the 6-digit code from the email we just sent you.</p>
        ) : (
          <p>Type one of the 8 backup codes you saved when you set up two-step sign-in. Each one works once.</p>
        )}
      </div>
      {info && mode === 'email' ? <div className="ig-ad-notice is-green" role="status"><AdminIcon name="mail" size={16} /><span>{info}</span></div> : null}
      <form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {mode === 'backup' ? (
          <label className="ig-ad-field">
            Backup code
            <input
              className="ig-ad-input"
              value={backup}
              onChange={(e) => setBackup(e.target.value.toUpperCase().slice(0, 12))}
              autoComplete="off"
              spellCheck={false}
              placeholder="XXXX-XXXX"
              aria-invalid={error ? 'true' : 'false'}
              style={{ letterSpacing: '0.08em', fontWeight: 600 }}
              autoFocus
            />
          </label>
        ) : (
          <CodeBoxes
            key={mode}
            value={code}
            onChange={(next) => { setCode(next); setError(''); }}
            onComplete={(next) => submit(mode === 'email' ? { emailCode: next } : { code: next })}
            label={mode === 'email' ? 'Code from the email' : 'Code from your authenticator app'}
            invalid={Boolean(error)}
          />
        )}
        {error ? <p className="ig-ad-error" role="alert">{error}</p> : null}
        <button type="submit" className="ig-ad-btn" disabled={busy}>{busy ? 'Checking…' : 'Sign in'}</button>
      </form>
      <span className="ig-ad-row-links">
        {mode === 'backup' ? (
          <button type="button" className="ig-ad-link ig-ad-link-orange" onClick={() => { setMode('app'); setError(''); }}>Use the app instead</button>
        ) : (
          <button type="button" className="ig-ad-link ig-ad-link-orange" onClick={() => { setMode('backup'); setError(''); }}>Use a backup code</button>
        )}
        {mode === 'email' ? (
          <button type="button" className="ig-ad-link ig-ad-link-grey" onClick={askEmail} disabled={busy}>Send a new code</button>
        ) : (
          <button type="button" className="ig-ad-link ig-ad-link-grey" onClick={askEmail} disabled={busy}>Email me a code instead</button>
        )}
      </span>
    </AuthCard>
  );
}

export function AdminSetup() {
  const { session, applyStatus, freshBackupCodes, setFreshBackupCodes } = useAdminSession();
  const navigate = useNavigate();
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const canSetup = session.stage === 'password' && session.next === 'setup';

  useEffect(() => {
    if (!canSetup) return;
    let alive = true;
    adminAuth.setup()
      .then(({ data }) => { if (alive) setSetup(data); })
      .catch((err) => { if (alive) setLoadError(adminErrorMessage(err, 'Could not make your setup code. Refresh to try again.')); });
    return () => { alive = false; };
  }, [canSetup]);

  if (session.stage === 'full') return <Navigate to={freshBackupCodes ? '/admin/backup-codes' : homeFor(session.admin?.role)} replace />;
  if (session.stage !== 'password') return <Navigate to="/admin/login" replace />;
  if (session.next !== 'setup') return <Navigate to="/admin/code" replace />;

  const confirm = async (event) => {
    event?.preventDefault();
    if (busy) return;
    if (code.length !== 6) { setError('Type all 6 digits from the app.'); return; }
    setBusy(true);
    setError('');
    try {
      const { data } = await adminAuth.confirmSetup(code);
      setFreshBackupCodes(data.backupCodes);
      applyStatus({ stage: 'full', admin: data.admin, csrf: data.csrf });
    } catch (err) {
      if (err?.response?.status === 423) {
        applyStatus({ stage: 'none' });
        navigate('/admin/login', { replace: true });
        return;
      }
      setError(adminErrorMessage(err, 'That code did not work. Check the app and type the newest code.'));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard wide>
      <div className="ig-ad-head">
        <span className="ig-ad-eyebrow">First sign-in, one time only</span>
        <h1>Set up two-step sign-in</h1>
        <p>After this, every sign-in asks for your password and a code from your phone. Someone with only your password cannot get in.</p>
      </div>
      <form onSubmit={confirm} noValidate className="ig-ad-steps">
        <div className="ig-ad-step">
          <span className="ig-ad-step-num">1</span>
          <span className="ig-ad-step-body">
            <strong>Install an authenticator app</strong>
            <span>Google Authenticator, Microsoft Authenticator or 1Password all work.</span>
          </span>
        </div>
        <div className="ig-ad-step">
          <span className="ig-ad-step-num">2</span>
          <span className="ig-ad-step-body is-gap">
            <strong>Scan this code with the app</strong>
            <span className="ig-ad-qr-row">
              <span className="ig-ad-qr">
                {setup ? <img src={setup.qr} alt="QR code to add Ingather Admin to your authenticator app" /> : <span className="ig-ad-skel" style={{ width: '100%', height: '100%' }} />}
              </span>
              <span className="ig-ad-qr-help">
                Cannot scan it? Type this key into the app instead.
                <code className="ig-ad-key">{setup ? setup.key : '···· ···· ···· ····'}</code>
              </span>
            </span>
          </span>
        </div>
        <div className="ig-ad-step">
          <span className="ig-ad-step-num">3</span>
          <span className="ig-ad-step-body is-gap">
            <strong>Type the 6-digit code it shows</strong>
            <CodeBoxes value={code} onChange={(next) => { setCode(next); setError(''); }} tight label="Code from your authenticator app" autoFocus={false} invalid={Boolean(error)} />
          </span>
        </div>
        {loadError ? <p className="ig-ad-error" role="alert" style={{ margin: 0 }}>{loadError}</p> : null}
        {error ? <p className="ig-ad-error" role="alert" style={{ margin: 0 }}>{error}</p> : null}
        <button type="submit" className="ig-ad-btn" disabled={busy || !setup}>{busy ? 'Checking…' : 'Turn on two-step sign-in'}</button>
      </form>
    </AuthCard>
  );
}

export function AdminBackupCodes() {
  const { session, freshBackupCodes, setFreshBackupCodes } = useAdminSession();
  const navigate = useNavigate();
  const codes = freshBackupCodes;
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // Codes are only ever in memory, straight after setup. A refresh cannot show them again.
  if (session.stage !== 'full' || !Array.isArray(codes) || !codes.length) return <Navigate to={homeFor(session.admin?.role)} replace />;

  const text = [
    'Ingather Admin backup codes',
    `For ${session.admin?.email || ''}`,
    'Each code signs you in once. Keep them away from your phone.',
    '',
    ...codes
  ].join('\n');

  const download = () => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ingather-admin-backup-codes.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      setCopied(false);
    }
  };

  return (
    <AuthCard wide>
      <div className="ig-ad-head">
        <span className="ig-ad-eyebrow is-green">Two-step sign-in is on</span>
        <h1>Save your backup codes</h1>
        <p>If you lose your phone, each code lets you sign in once. Keep them somewhere safe, away from your phone. We will not show them again.</p>
      </div>
      <div className="ig-ad-backup">
        {codes.map((code) => <code key={code}>{code}</code>)}
      </div>
      <span className="ig-ad-pair">
        <button type="button" className="ig-ad-btn-2" onClick={download}><AdminIcon name="download" size={16} />Download</button>
        <button type="button" className="ig-ad-btn-2" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
      </span>
      <label className="ig-ad-check">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
        I have saved these codes somewhere safe.
      </label>
      <button type="button" className="ig-ad-btn" disabled={!saved} onClick={() => { setFreshBackupCodes(null); navigate(homeFor(session.admin?.role), { replace: true }); }}>Go to the dashboard</button>
    </AuthCard>
  );
}

// A new team member opens the link from their invite email and sets their own password.
export function AdminJoin() {
  const { session } = useAdminSession();
  const navigate = useNavigate();
  const location = useLocation();
  const token = new URLSearchParams(location.search).get('token') || '';
  const [invite, setInvite] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    if (!token) { setLoadError('This link is missing its code. Open the link from your invite email again.'); return undefined; }
    adminData.joinCheck(token)
      .then(({ data }) => { if (alive) setInvite(data); })
      .catch((err) => { if (alive) setLoadError(adminErrorMessage(err, 'This invite link has expired or was already used. Ask the owner to send a new one.')); });
    return () => { alive = false; };
  }, [token]);

  if (session.stage === 'full') return <Navigate to={homeFor(session.admin?.role)} replace />;

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (password.length < 12) { setError('Use at least 12 characters.'); return; }
    if (password !== again) { setError('The two passwords do not match.'); return; }
    setBusy(true);
    try {
      const { data } = await adminData.join(token, password);
      navigate(`/admin/login?reason=joined&email=${encodeURIComponent(data.email)}`, { replace: true });
    } catch (err) {
      setError(adminErrorMessage(err, 'Could not set your password. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const roleWords = { owner: 'an Owner', admin: 'an Admin', viewer: 'a Viewer' };

  return (
    <AuthCard>
      <div className="ig-ad-head">
        <span className="ig-ad-eyebrow">Join the Ingather team</span>
        <h1>{invite ? `Welcome, ${invite.name.split(' ')[0]}` : 'Set your password'}</h1>
        {invite ? <p>You have been added as {roleWords[invite.role] || 'a member'}. Set a password for <strong>{invite.email}</strong>. Next, you set up an authenticator app on your phone.</p> : null}
      </div>
      {loadError ? (
        <div className="ig-ad-notice is-red" role="alert"><AdminIcon name="warn" size={16} /><span>{loadError}</span></div>
      ) : null}
      {invite ? (
        <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <input type="email" autoComplete="username" value={invite.email} readOnly hidden />
          <label className="ig-ad-field">
            New password
            <input className="ig-ad-input" type="password" autoComplete="new-password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} autoFocus />
          </label>
          <label className="ig-ad-field">
            Type it again
            <input className="ig-ad-input" type="password" autoComplete="new-password" value={again} onChange={(e) => { setAgain(e.target.value); setError(''); }} />
          </label>
          <span className="ig-ad-lock-note"><span><AdminIcon name="lock" size={14} /></span>At least 12 characters. A few words with a number works well. Do not reuse a password from another site.</span>
          {error ? <p className="ig-ad-error" role="alert">{error}</p> : null}
          <button type="submit" className="ig-ad-btn" disabled={busy}>{busy ? 'Saving…' : 'Set password'}</button>
        </form>
      ) : null}
      {loadError ? <button type="button" className="ig-ad-btn-2" onClick={() => navigate('/admin/login')}>Go to sign in</button> : null}
    </AuthCard>
  );
}
