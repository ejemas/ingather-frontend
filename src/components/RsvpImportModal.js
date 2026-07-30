import React, { useMemo, useRef, useState } from 'react';
import {
  buildImportPreview,
  detectImportMapping,
  downloadRsvpImportErrors,
  downloadRsvpImportTemplate,
  parseRsvpImportFile
} from '../utils/rsvpImport';

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 16V4" />
    <path d="m7 9 5-5 5 5" />
    <path d="M5 14v5h14v-5" />
  </svg>
);

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 4v12" />
    <path d="m7 11 5 5 5-5" />
    <path d="M5 20h14" />
  </svg>
);

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function RsvpImportModal({ onClose, onImport }) {
  const inputRef = useRef(null);
  const [stage, setStage] = useState('upload');
  const [fileMeta, setFileMeta] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [mapping, setMapping] = useState({ fullName: '', emailAddress: '' });
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  const reviewRows = useMemo(() => {
    if (!preview) return [];
    return [
      ...preview.validRows.map(row => ({ ...row, status: 'Ready' })),
      ...preview.invalidRows.map(row => ({ ...row, status: 'Invalid' })),
      ...preview.duplicateRows.map(row => ({ ...row, status: 'Duplicate' }))
    ].sort((a, b) => a.sourceRow - b.sourceRow).slice(0, 10);
  }, [preview]);

  const chooseFile = async (file) => {
    if (!file) return;
    try {
      setParsing(true);
      setError('');
      const parsed = await parseRsvpImportFile(file);
      setFileMeta({ name: file.name, size: file.size });
      setSheet(parsed);
      setMapping(detectImportMapping(parsed.headers));
      setPreview(null);
      setResult(null);
      setStage('mapping');
    } catch (parseError) {
      setError(parseError.message || 'Unable to read this spreadsheet.');
      if (inputRef.current) inputRef.current.value = '';
    } finally {
      setParsing(false);
    }
  };

  const reviewImport = () => {
    try {
      setError('');
      const nextPreview = buildImportPreview(sheet, mapping);
      setPreview(nextPreview);
      setStage('preview');
    } catch (mappingError) {
      setError(mappingError.message || 'Complete the column mapping.');
    }
  };

  const importGuests = async () => {
    if (!preview?.validRows.length) return;
    try {
      setImporting(true);
      setError('');
      const response = await onImport(preview.validRows);
      const serverErrors = response.errors || [];
      const allErrors = [
        ...preview.invalidRows,
        ...preview.duplicateRows,
        ...serverErrors
      ];
      setResult({
        summary: {
          received: preview.validRows.length + preview.invalidRows.length + preview.duplicateRows.length,
          imported: response.summary?.imported || 0,
          invalid: preview.invalidRows.length + (response.summary?.invalid || 0),
          duplicates: preview.duplicateRows.length + (response.summary?.duplicates || 0)
        },
        errors: allErrors,
        dashboardRefreshWarning: response.dashboardRefreshWarning || ''
      });
      setStage('result');
    } catch (importError) {
      setError(importError.response?.data?.error || importError.message || 'Unable to import attendees.');
    } finally {
      setImporting(false);
    }
  };

  const resetFile = () => {
    setStage('upload');
    setFileMeta(null);
    setSheet(null);
    setMapping({ fullName: '', emailAddress: '' });
    setPreview(null);
    setResult(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const close = () => {
    if (!importing) onClose();
  };

  return (
    <div className="rsvp-import-overlay" role="presentation" onMouseDown={close}>
      <section
        className="rsvp-import-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rsvp-import-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="rsvp-import-header">
          <div>
            <span>Pre-event guest list</span>
            <h3 id="rsvp-import-title">Upload RSVP data</h3>
            <p>The spreadsheet stays in this browser. Only confirmed names and emails are sent to InGather.</p>
          </div>
          <button type="button" onClick={close} disabled={importing} aria-label="Close attendee import">x</button>
        </header>

        <div className="rsvp-import-body">
          <div className="rsvp-import-steps" aria-label="Import progress">
            {['upload', 'mapping', 'preview', 'result'].map((step, index) => {
              const currentIndex = ['upload', 'mapping', 'preview', 'result'].indexOf(stage);
              return (
                <span key={step} className={index <= currentIndex ? 'active' : ''}>
                  {index + 1}
                </span>
              );
            })}
          </div>

          {error && <div className="rsvp-import-alert error" role="alert">{error}</div>}

          {stage === 'upload' && (
            <>
              <button type="button" className="rsvp-import-template-btn" onClick={downloadRsvpImportTemplate}>
                <DownloadIcon />
                Download Excel template
              </button>
              <label className={`rsvp-import-dropzone ${parsing ? 'busy' : ''}`}>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,.xlsx"
                  disabled={parsing}
                  onChange={(event) => chooseFile(event.target.files?.[0])}
                />
                <span className="rsvp-import-upload-icon"><UploadIcon /></span>
                <strong>{parsing ? 'Reading spreadsheet...' : 'Choose CSV or Excel file'}</strong>
                <small>CSV or .xlsx, up to 10 MB and 5,000 attendees.</small>
              </label>
            </>
          )}

          {stage === 'mapping' && sheet && (
            <div className="rsvp-import-mapping">
              <div className="rsvp-import-file-row">
                <span><strong>{fileMeta.name}</strong><small>{formatFileSize(fileMeta.size)} - {sheet.rows.length.toLocaleString()} rows</small></span>
                <button type="button" onClick={resetFile}>Change file</button>
              </div>
              <div className="rsvp-import-copy">
                <h4>Match your columns</h4>
                <p>Choose which spreadsheet column contains each required value.</p>
              </div>
              <div className="rsvp-import-mapping-grid">
                <label>
                  <span>Full Name</span>
                  <select
                    value={mapping.fullName}
                    onChange={(event) => setMapping(prev => ({ ...prev, fullName: event.target.value }))}
                  >
                    <option value="">Select column</option>
                    {sheet.headers.map((header, index) => <option value={index} key={`${header}-${index}`}>{header}</option>)}
                  </select>
                </label>
                <label>
                  <span>Email Address</span>
                  <select
                    value={mapping.emailAddress}
                    onChange={(event) => setMapping(prev => ({ ...prev, emailAddress: event.target.value }))}
                  >
                    <option value="">Select column</option>
                    {sheet.headers.map((header, index) => <option value={index} key={`${header}-${index}`}>{header}</option>)}
                  </select>
                </label>
              </div>
            </div>
          )}

          {stage === 'preview' && preview && (
            <div className="rsvp-import-preview">
              <div className="rsvp-import-summary" aria-label="Spreadsheet validation summary">
                <span><strong>{preview.validRows.length.toLocaleString()}</strong>Ready</span>
                <span><strong>{preview.invalidRows.length.toLocaleString()}</strong>Invalid</span>
                <span><strong>{preview.duplicateRows.length.toLocaleString()}</strong>Duplicates</span>
              </div>
              <div className="rsvp-import-preview-heading">
                <div>
                  <h4>Review before importing</h4>
                  <p>Only rows marked Ready will be sent to InGather.</p>
                </div>
                <button type="button" onClick={() => setStage('mapping')}>Edit mapping</button>
              </div>
              <div className="rsvp-import-table-wrap">
                <table>
                  <thead><tr><th>Row</th><th>Full Name</th><th>Email Address</th><th>Status</th></tr></thead>
                  <tbody>
                    {reviewRows.map(row => (
                      <tr key={`${row.sourceRow}-${row.emailAddress}-${row.status}`}>
                        <td>{row.sourceRow}</td>
                        <td>{row.fullName || '-'}</td>
                        <td>{row.emailAddress || '-'}</td>
                        <td><span className={`rsvp-import-row-status ${row.status.toLowerCase()}`}>{row.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {reviewRows.length < (preview.validRows.length + preview.invalidRows.length + preview.duplicateRows.length) && (
                <small className="rsvp-import-preview-note">Showing the first 10 spreadsheet rows.</small>
              )}
            </div>
          )}

          {stage === 'result' && result && (
            <div className="rsvp-import-result">
              <span className="rsvp-import-result-mark">OK</span>
              <h4>Import complete</h4>
              <p>
                {result.dashboardRefreshWarning
                  ? 'Your guests are saved, but the dashboard still needs to refresh.'
                  : 'The RSVP attendee table and analytics have been refreshed.'}
              </p>
              {result.dashboardRefreshWarning && (
                <div className="rsvp-import-alert warning" role="alert">
                  {result.dashboardRefreshWarning}
                </div>
              )}
              <div className="rsvp-import-summary">
                <span><strong>{result.summary.imported.toLocaleString()}</strong>Imported</span>
                <span><strong>{result.summary.invalid.toLocaleString()}</strong>Invalid</span>
                <span><strong>{result.summary.duplicates.toLocaleString()}</strong>Duplicates</span>
              </div>
              {result.errors.length > 0 && (
                <button type="button" className="rsvp-import-template-btn" onClick={() => downloadRsvpImportErrors(result.errors)}>
                  <DownloadIcon />
                  Download skipped-row report
                </button>
              )}
            </div>
          )}
        </div>

        <footer className="rsvp-import-actions">
          {stage === 'upload' && <button type="button" className="secondary" onClick={close}>Cancel</button>}
          {stage === 'mapping' && (
            <>
              <button type="button" className="secondary" onClick={resetFile}>Back</button>
              <button type="button" className="primary" onClick={reviewImport}>Review rows</button>
            </>
          )}
          {stage === 'preview' && (
            <>
              <button type="button" className="secondary" onClick={() => setStage('mapping')} disabled={importing}>Back</button>
              <button type="button" className="primary" onClick={importGuests} disabled={importing || preview.validRows.length === 0}>
                {importing
                  ? 'Importing...'
                  : `Import ${preview.validRows.length.toLocaleString()} ${preview.validRows.length === 1 ? 'guest' : 'guests'}`}
              </button>
            </>
          )}
          {stage === 'result' && <button type="button" className="primary" onClick={close}>Done</button>}
        </footer>
      </section>
    </div>
  );
}

export default RsvpImportModal;
