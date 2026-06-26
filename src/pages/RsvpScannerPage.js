import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { checkInRsvpFromScanner, getRsvpScannerInfo } from '../api/rsvpScannerService';
import '../styles/RsvpScanner.css';

function formatEventDate(program) {
  if (!program?.date) return '';
  const date = new Date(`${String(program.date).slice(0, 10)}T00:00:00`);
  const dateLabel = Number.isNaN(date.getTime())
    ? String(program.date).slice(0, 10)
    : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const start = String(program.startTime || '').slice(0, 5);
  const end = String(program.endTime || '').slice(0, 5);
  return [dateLabel, start && end ? `${start} - ${end}` : start || end].filter(Boolean).join(' | ');
}

function RsvpScannerPage() {
  const { scannerToken } = useParams();
  const readerIdRef = useRef(`rsvp-public-reader-${Math.random().toString(36).slice(2)}`);
  const scannerRef = useRef(null);
  const submittedRef = useRef(false);
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [scanError, setScanError] = useState('');
  const [cameraState, setCameraState] = useState('idle');
  const [cameraMessage, setCameraMessage] = useState('Requesting camera access...');

  useEffect(() => {
    let mounted = true;
    getRsvpScannerInfo(scannerToken)
      .then((response) => {
        if (!mounted) return;
        setProgram(response.program);
      })
      .catch((error) => {
        if (!mounted) return;
        setPageError(error.response?.data?.error || 'This RSVP scanner link is unavailable.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [scannerToken]);

  const submitToken = useCallback(async (token) => {
    if (!token || submitting || !program?.isActive) return;

    submittedRef.current = true;
    setSubmitting(true);
    setScanError('');
    setResult(null);

    try {
      const response = await checkInRsvpFromScanner(scannerToken, token);
      setResult(response);
      setManualToken('');
      setCameraMessage('Checked in. Tap Scan next for the next attendee.');
    } catch (error) {
      setScanError(error.response?.data?.error || 'Unable to check in this RSVP.');
      setCameraMessage('Check-in failed. Scan again or enter the RSVP token.');
      submittedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }, [program?.isActive, scannerToken, submitting]);

  useEffect(() => {
    if (loading || pageError || !program?.isActive || result) return undefined;

    let cancelled = false;
    submittedRef.current = false;

    const stopScanner = async () => {
      const scanner = scannerRef.current;
      if (!scanner) return;
      try {
        await scanner.stop();
      } catch (error) {
        // Scanner can already be stopped after a successful scan or permission failure.
      }
      try {
        await scanner.clear();
      } catch (error) {
        // Ignore cleanup failures for partially initialized camera sessions.
      }
      if (scannerRef.current === scanner) scannerRef.current = null;
    };

    const startScanner = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState('blocked');
        setCameraMessage('Camera unavailable? Enter the attendee RSVP token below.');
        return;
      }

      try {
        setCameraState('starting');
        setCameraMessage('Allow camera access to scan RSVP QR codes.');
        const scanner = new Html5Qrcode(readerIdRef.current, { verbose: false });
        scannerRef.current = scanner;
        const config = {
          fps: 10,
          qrbox: (width, height) => {
            const size = Math.max(190, Math.floor(Math.min(width, height) * 0.72));
            return { width: size, height: size };
          },
          aspectRatio: 1
        };
        const onSuccess = async (decodedText) => {
          if (cancelled || submittedRef.current || !decodedText) return;
          submittedRef.current = true;
          setCameraState('detected');
          setCameraMessage('QR detected. Checking in attendee...');
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
            const preferred = cameras.find(camera => /back|rear|environment/i.test(camera.label || ''))
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
        setCameraState('active');
        setCameraMessage('Scanning RSVP QR code...');
      } catch (error) {
        await stopScanner();
        setCameraState('blocked');
        setCameraMessage('Camera unavailable? Enter the attendee RSVP token below.');
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [loading, pageError, program?.isActive, result, submitToken]);

  const submitManual = (event) => {
    event.preventDefault();
    submitToken(manualToken);
  };

  const scanNext = () => {
    setResult(null);
    setScanError('');
    setManualToken('');
    setCameraMessage('Requesting camera access...');
  };

  if (loading) {
    return <main className="rsvp-scanner-page"><section className="rsvp-scanner-card">Loading RSVP scanner...</section></main>;
  }

  if (pageError) {
    return (
      <main className="rsvp-scanner-page">
        <section className="rsvp-scanner-card">
          <img src="/ingather-logo.png" alt="Ingather" className="rsvp-scanner-logo" />
          <span className="rsvp-scanner-kicker">RSVP scanner</span>
          <h1>Scanner unavailable</h1>
          <p>{pageError}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="rsvp-scanner-page">
      <section className="rsvp-scanner-card">
        <img src="/ingather-logo.png" alt="Ingather" className="rsvp-scanner-logo" />
        <span className="rsvp-scanner-kicker">Usher RSVP scanner</span>
        <h1>Scan pre-registered attendee</h1>
        <p className="rsvp-scanner-intro">Use this page to scan RSVP QR codes or enter attendee RSVP tokens at the entrance.</p>

        <div className="rsvp-scanner-event">
          <strong>{program?.title}</strong>
          <span>{program?.organizerName}</span>
          <span>{formatEventDate(program)}</span>
          {!program?.isActive && <em>This live event has ended. Check-ins are disabled.</em>}
        </div>

        <div className={`rsvp-scanner-camera ${cameraState}`}>
          <div id={readerIdRef.current} className="rsvp-scanner-reader" aria-label="RSVP QR camera preview" />
          <div className="rsvp-scanner-frame" aria-hidden="true" />
        </div>
        <p className="rsvp-scanner-camera-copy">{cameraMessage}</p>

        {result && (
          <div className="rsvp-scanner-result success">
            <strong>{result.attendee?.fullName || result.attendee?.emailAddress || 'RSVP attendee'} checked in.</strong>
            <span>This attendee is now reflected on the live event dashboard.</span>
          </div>
        )}

        {scanError && (
          <div className="rsvp-scanner-result error">
            <strong>Check-in failed</strong>
            <span>{scanError}</span>
          </div>
        )}

        <form className="rsvp-scanner-manual" onSubmit={submitManual}>
          <label>
            <span>RSVP token</span>
            <input
              value={manualToken}
              onChange={(event) => setManualToken(event.target.value)}
              placeholder="A7K9Q2M4"
              disabled={submitting || !program?.isActive}
            />
          </label>
          {result ? (
            <button type="button" onClick={scanNext}>Scan next</button>
          ) : (
            <button type="submit" disabled={submitting || !manualToken.trim() || !program?.isActive}>
              {submitting ? 'Checking in...' : 'Check in RSVP'}
            </button>
          )}
        </form>
      </section>
    </main>
  );
}

export default RsvpScannerPage;
