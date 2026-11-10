import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { checkInRsvpFromScanner, getRsvpScannerInfo } from '../api/rsvpScannerService';
import { isSoundMuted, toggleSoundMuted, playSuccessSound, playErrorSound } from '../utils/scanSounds';
import { useToast } from '../components/Toast';
import { formatNumber, formatTime, parseDateOnly } from '../utils/dashboardFormat';
import '../styles/IgUsher.css';

const RECENT_LIMIT = 8;
const RECENT_SHOWN = 5;

// The QR holds a link like https://ingather.app/rsvp-checkin/CODE. Show only a short, masked code.
const passCode = (raw) => {
  const text = String(raw || '').trim();
  const match = /rsvp-checkin\/([^/?#]+)/.exec(text);
  return decodeURIComponent(match ? match[1] : text).toUpperCase();
};
const maskCode = (raw) => {
  const code = passCode(raw);
  return code.length > 6 ? `${code.slice(0, 4)}…${code.slice(-2)}` : code;
};

const clock = (date) => formatTime(`${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`).replace(/\s?(AM|PM)$/, '');

const whenLabel = (program) => {
  const day = parseDateOnly(program?.date);
  const time = formatTime(program?.startTime);
  if (!day) return time;
  const date = new Date(day.year, day.month, day.day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((date - today) / 86400000);
  const dayText = diff === 0 ? 'today' : diff === 1 ? 'tomorrow' : diff === -1 ? 'yesterday' : date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return [dayText, time].filter(Boolean).join(' ');
};

const readRecent = (key) => {
  try {
    const list = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(list) ? list.slice(0, RECENT_LIMIT) : [];
  } catch (error) {
    return [];
  }
};
const saveRecent = (key, list) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(list.slice(0, RECENT_LIMIT)));
  } catch (error) {
    // Private browsing can block storage; the list still works for this visit.
  }
};

const Icon = {
  soundOn: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /></svg>,
  soundOff: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M17 9l5 6M22 9l-5 6" /></svg>,
  check: <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>,
  alert: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 7v6M12 17h.01" /></svg>,
  cross: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" /></svg>,
  camOff: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7h3l2-3h8l2 3h3v13H3z" /><circle cx="12" cy="13" r="4" /><path d="M3 3l18 18" /></svg>,
  lock: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>,
  scan: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /></svg>
};

function UsherTop({ muted, onToggleSound }) {
  return (
    <div className="ig-us-top">
      <span className="ig-us-brand">
        <img src="/ingather-logo.png" alt="Ingather" />
        <span className="ig-us-badge">Usher</span>
      </span>
      {onToggleSound && (
        <button type="button" className="ig-us-sound" onClick={onToggleSound} aria-label={muted ? 'Turn sound on' : 'Mute sound'}>
          {muted ? Icon.soundOff : Icon.soundOn}
          {muted ? 'Muted' : 'Sound on'}
        </button>
      )}
    </div>
  );
}

function RsvpScannerPage() {
  const { scannerToken } = useParams();
  const toast = useToast();
  const readerIdRef = useRef(`ig-us-reader-${Math.random().toString(36).slice(2)}`);
  const scannerRef = useRef(null);
  const sendingRef = useRef(false);
  const recentKey = `ig-usher-recent-${scannerToken}`;

  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [screen, setScreen] = useState('scan');
  const [guest, setGuest] = useState(null);
  const [count, setCount] = useState(0);
  const [recent, setRecent] = useState(() => readRecent(recentKey));
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [muted, setMuted] = useState(isSoundMuted);
  const [photoFailed, setPhotoFailed] = useState(false);
  // Bumped to restart the camera after a problem, since the screen may already be 'scan'.
  const [cameraRun, setCameraRun] = useState(0);

  useEffect(() => {
    document.title = 'Usher scanner | Ingather';
  }, []);

  useEffect(() => {
    let mounted = true;
    getRsvpScannerInfo(scannerToken)
      .then((response) => {
        if (!mounted) return;
        setProgram(response.program);
        setCount(Number(response.program?.checkedInCount) || 0);
        if (response.program && !response.program.isActive) setScreen('ended');
      })
      .catch((error) => {
        if (!mounted) return;
        setPageError(error.response
          ? (error.response.data?.error || 'This scanner link is not available.')
          : 'We couldn\'t reach Ingather. Check your data or Wi-Fi, then reload this page.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [scannerToken]);

  const addRecent = useCallback((entry) => {
    setRecent((prev) => {
      const next = [{ ...entry, at: Date.now() }, ...prev].slice(0, RECENT_LIMIT);
      saveRecent(recentKey, next);
      return next;
    });
  }, [recentKey]);

  const backToScanning = useCallback(() => {
    setScreen('scan');
    setCameraRun((n) => n + 1);
  }, []);

  const submitToken = useCallback(async (raw) => {
    const token = String(raw || '').trim();
    if (!token || sendingRef.current) return;
    sendingRef.current = true;
    setSubmitting(true);

    try {
      const response = await checkInRsvpFromScanner(scannerToken, token);
      const attendee = response.attendee || {};
      setGuest(attendee);
      setCount((prev) => (Number.isFinite(Number(response.attendeeTotal)) ? Number(response.attendeeTotal) : prev + 1));
      setScreen('success');
      setCode('');
      addRecent({ label: attendee.fullName || attendee.emailAddress || maskCode(token), status: 'in' });
      playSuccessSound();
    } catch (error) {
      const status = error.response?.status;
      const data = error.response?.data || {};
      const message = data.error || '';
      if (!error.response) {
        toast.error('No internet connection. Check your data or Wi-Fi, then scan again.');
        backToScanning();
      } else if (status === 409 || data.alreadyCheckedIn) {
        setScreen('already');
        addRecent({ label: maskCode(token), status: 'used', code: true });
        playErrorSound();
      } else if (/has ended/i.test(message)) {
        setProgram((prev) => (prev ? { ...prev, isActive: false } : prev));
        setScreen('ended');
      } else if (status === 404 || status === 400) {
        setScreen('invalid');
        addRecent({ label: maskCode(token), status: 'invalid', code: true });
        playErrorSound();
      } else if (status === 429) {
        toast.warning('Too many scans in a short time. Wait a few seconds, then scan again.');
        backToScanning();
      } else {
        toast.error(message || 'We could not check this pass in. Please scan again.');
        backToScanning();
      }
    } finally {
      sendingRef.current = false;
      setSubmitting(false);
    }
  }, [addRecent, backToScanning, scannerToken, toast]);

  // Run the camera only while the scanning screen is showing.
  useEffect(() => {
    if (loading || pageError || !program?.isActive || screen !== 'scan') return undefined;

    let cancelled = false;
    let detected = false;

    const stopScanner = async () => {
      const scanner = scannerRef.current;
      if (!scanner) return;
      if (scannerRef.current === scanner) scannerRef.current = null;
      try { await scanner.stop(); } catch (error) { /* already stopped */ }
      try { await scanner.clear(); } catch (error) { /* partly started */ }
    };

    const startScanner = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setScreen('blocked');
        return;
      }
      try {
        const scanner = new Html5Qrcode(readerIdRef.current, { verbose: false });
        scannerRef.current = scanner;
        const config = { fps: 10 };
        const onSuccess = async (decodedText) => {
          if (cancelled || detected || !decodedText) return;
          detected = true;
          await stopScanner();
          if (!cancelled) submitToken(decodedText);
        };
        const onError = () => {};

        try {
          await scanner.start({ facingMode: { exact: 'environment' } }, config, onSuccess, onError);
        } catch (exactError) {
          try {
            await scanner.start({ facingMode: 'environment' }, config, onSuccess, onError);
          } catch (environmentError) {
            const cameras = await Html5Qrcode.getCameras();
            const preferred = cameras.find((camera) => /back|rear|environment/i.test(camera.label || ''))
              || cameras[cameras.length - 1]
              || cameras[0];
            if (!preferred?.id) throw environmentError;
            await scanner.start(preferred.id, config, onSuccess, onError);
          }
        }

        if (cancelled) {
          await stopScanner();
          return;
        }
        setCameraOn(true);
      } catch (error) {
        await stopScanner();
        if (!cancelled) setScreen('blocked');
      }
    };

    setCameraOn(false);
    startScanner();

    return () => {
      cancelled = true;
      setCameraOn(false);
      stopScanner();
    };
  }, [loading, pageError, program?.isActive, screen, submitToken, cameraRun]);

  const submitCode = (event) => {
    event.preventDefault();
    if (!code.trim()) return;
    submitToken(code);
  };

  const scanNext = () => {
    setGuest(null);
    setScreen('scan');
  };

  const handleToggleSound = () => setMuted(toggleSoundMuted());

  if (loading) {
    return (
      <main className="ig-us">
        <div className="ig-us-col">
          <UsherTop muted={muted} />
          <div className="ig-us-panel is-plain" aria-busy="true"><span className="ig-us-spinner" aria-hidden="true" />Opening the scanner…</div>
        </div>
      </main>
    );
  }

  if (pageError) {
    return (
      <main className="ig-us">
        <div className="ig-us-col">
          <UsherTop muted={muted} />
          <div className="ig-us-panel is-plain" role="alert">
            <span className="ig-us-icon is-grey">{Icon.lock}</span>
            <strong className="ig-us-h-sm">Scanner link not available</strong>
            <p>{pageError}</p>
            <p className="ig-us-small">Ask the organizer to copy a fresh scanner link from the event dashboard.</p>
          </div>
        </div>
      </main>
    );
  }

  const isResult = screen === 'success' || screen === 'already' || screen === 'invalid';
  const showCodeForm = program?.isActive && (screen === 'scan' || screen === 'blocked');
  const chips = guest ? [
    guest.registrationType === 'rsvp' || !guest.registrationType ? 'RSVP' : null,
    guest.attendanceMode === 'virtual' ? 'Online' : guest.attendanceMode === 'physical' ? 'In person' : null,
    guest.firstTimer ? 'First-timer' : null
  ].filter(Boolean) : [];

  return (
    <main className="ig-us">
      <div className="ig-us-col">
        <UsherTop muted={muted} onToggleSound={handleToggleSound} />

        <div className="ig-us-event">
          {program?.flyerUrl && !photoFailed
            ? <img src={program.flyerUrl} alt="" onError={() => setPhotoFailed(true)} />
            : <span className="ig-us-event-mark" aria-hidden="true">{(program?.title || 'E').trim().charAt(0).toUpperCase()}</span>}
          <span className="ig-us-event-text">
            <strong>{program?.title}</strong>
            <span>{[program?.organizerName, whenLabel(program)].filter(Boolean).join(', ')}</span>
          </span>
          <span className="ig-us-count" aria-live="polite">
            <strong>{formatNumber(count)}</strong>
            <span>checked in</span>
          </span>
        </div>

        {screen === 'scan' && (
          <div className="ig-us-camera">
            <div id={readerIdRef.current} className="ig-us-reader" aria-label="Camera preview" />
            <div className="ig-us-shade" aria-hidden="true" />
            <div className={`ig-us-frame${cameraOn ? ' is-on' : ''}`} aria-hidden="true">
              <span /><span /><span /><span />
              <i />
            </div>
            <span className="ig-us-hint" role="status">
              {submitting ? 'Checking the pass…' : cameraOn ? 'Point the camera at the guest\'s QR pass' : 'Starting the camera…'}
            </span>
          </div>
        )}

        {screen === 'success' && (
          <div className="ig-us-panel is-success" role="status">
            <span className="ig-us-icon is-white">{Icon.check}</span>
            <span className="ig-us-kicker">Checked in</span>
            <strong className="ig-us-name">{guest?.fullName || guest?.emailAddress || 'RSVP guest'}</strong>
            {chips.length > 0 && <span className="ig-us-chips">{chips.map((chip) => <span key={chip}>{chip}</span>)}</span>}
          </div>
        )}

        {screen === 'already' && (
          <div className="ig-us-panel is-already" role="alert">
            <span className="ig-us-icon is-peach">{Icon.alert}</span>
            <strong className="ig-us-h">Pass already used</strong>
            <p>This RSVP has already checked in. Don't let a second person in on the same pass.</p>
            <span className="ig-us-note">Guest says it's wrong? Check the attendee list on the dashboard.</span>
          </div>
        )}

        {screen === 'invalid' && (
          <div className="ig-us-panel is-invalid" role="alert">
            <span className="ig-us-icon is-red">{Icon.cross}</span>
            <strong className="ig-us-h">Pass not recognised</strong>
            <p>This QR isn't an RSVP pass for this event, or the code was typed wrong. Ask the guest for the pass from their RSVP email.</p>
          </div>
        )}

        {screen === 'blocked' && (
          <div className="ig-us-panel is-plain is-dashed">
            <span className="ig-us-icon is-grey">{Icon.camOff}</span>
            <strong className="ig-us-h-sm">Camera isn't available</strong>
            <p>Allow camera access in your browser settings, then reload. Meanwhile, type the code printed under the guest's QR.</p>
            <button type="button" className="ig-us-btn is-small" onClick={() => setScreen('scan')}>Try camera again</button>
          </div>
        )}

        {screen === 'ended' && (
          <div className="ig-us-panel is-plain">
            <span className="ig-us-icon is-grey">{Icon.lock}</span>
            <strong className="ig-us-h-sm">Check-in has ended</strong>
            <p>The organizer has stopped this event, so passes can't be checked in from this link anymore.</p>
          </div>
        )}

        {isResult && (
          <button type="button" className="ig-us-btn is-big" onClick={scanNext} autoFocus>
            {Icon.scan}
            Scan next guest
          </button>
        )}

        {showCodeForm && (
          <form className="ig-us-code" onSubmit={submitCode}>
            <label htmlFor="ig-us-code-input">Can't scan? Type the pass code</label>
            <div>
              <input
                id="ig-us-code-input"
                type="text"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck="false"
                placeholder="A7K9Q2M4"
                disabled={submitting}
              />
              <button type="submit" disabled={submitting || !code.trim()}>{submitting ? 'Checking…' : 'Check in'}</button>
            </div>
          </form>
        )}

        {recent.length > 0 && (
          <section className="ig-us-recent" aria-label="Recent check-ins">
            <span className="ig-us-recent-title">Recent on this phone</span>
            {recent.slice(0, RECENT_SHOWN).map((item) => (
              <div key={`${item.at}-${item.label}`} className="ig-us-recent-row">
                <span className={item.code ? 'is-code' : ''}>{item.label}</span>
                <span className={`is-${item.status}`}>
                  {item.status === 'in' ? 'Checked in' : item.status === 'used' ? 'Already used' : 'Not recognised'}, {clock(new Date(item.at))}
                </span>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

export default RsvpScannerPage;
