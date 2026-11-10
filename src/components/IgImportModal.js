import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildImportPreview,
  detectImportMapping,
  downloadRsvpImportErrors,
  downloadRsvpImportTemplate,
  parseRsvpImportFile
} from '../utils/rsvpImport';
import { DashIcon } from './IgDashShell';

const STEPS = [['upload', 'Upload'], ['mapping', 'Match'], ['preview', 'Review'], ['result', 'Done']];
const REVIEW_PAGE = 6;

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
const columnLetter = (index) => {
  let n = Number(index) + 1;
  let s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
};
const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

const UploadIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 14v5h14v-5" /></svg>
);
const DownloadIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v12" /><path d="m7 11 5 5 5-5" /><path d="M5 20h14" /></svg>
);
const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 8l9 6 9-6" /></svg>
);

// Upload guest list (redesign). Spreadsheet is read in the browser; only confirmed names and emails are sent.
function IgImportModal({ eventTitle, onClose, onImport, onSendQr }) {
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
  const [dragging, setDragging] = useState(false);
  const [reviewPage, setReviewPage] = useState(0);

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape' && !importing) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, importing]);

  const reviewRows = useMemo(() => {
    if (!preview) return [];
    return [
      ...preview.validRows.map((row) => ({ ...row, status: 'Ready' })),
      ...preview.invalidRows.map((row) => ({ ...row, status: /email/i.test(row.reason || '') ? 'Invalid email' : 'Missing name' })),
      ...preview.duplicateRows.map((row) => ({ ...row, status: 'Duplicate' }))
    ].sort((a, b) => a.sourceRow - b.sourceRow);
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
      setPreview(buildImportPreview(sheet, mapping));
      setReviewPage(0);
      setStage('preview');
    } catch (mappingError) {
      setError(mappingError.message || 'Complete the column matching.');
    }
  };

  const importGuests = async () => {
    if (!preview?.validRows.length) return;
    try {
      setImporting(true);
      setError('');
      const response = await onImport(preview.validRows);
      const serverErrors = response.errors || [];
      setResult({
        summary: {
          imported: response.summary?.imported || 0,
          invalid: preview.invalidRows.length + (response.summary?.invalid || 0),
          duplicates: preview.duplicateRows.length + (response.summary?.duplicates || 0)
        },
        errors: [...preview.invalidRows, ...preview.duplicateRows, ...serverErrors],
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

  const close = () => { if (!importing) onClose(); };
  const stepIndex = STEPS.findIndex(([key]) => key === stage);
  const titles = { upload: 'Upload guest list', mapping: 'Match your columns', preview: 'Review guests', result: 'Import complete' };
  const firstRow = sheet && sheet.rows[0];
  const mappedValue = (key) => (firstRow && mapping[key] !== '' ? String((firstRow.values || firstRow)[Number(mapping[key])] ?? '').trim() : '');
  const pages = Math.max(1, Math.ceil(reviewRows.length / REVIEW_PAGE));
  const pageRows = reviewRows.slice(reviewPage * REVIEW_PAGE, reviewPage * REVIEW_PAGE + REVIEW_PAGE);
  const extension = (fileMeta?.name.split('.').pop() || 'csv').toUpperCase().slice(0, 4);

  return (
    <div className="ig-db-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="ig-db-dialog ig-pd-modal ig-im" role="dialog" aria-modal="true" aria-labelledby="ig-im-title">
        <div className="ig-pd-modal-head">
          <span>
            <h2 id="ig-im-title">{titles[stage]}</h2>
            <p>{stage === 'upload' ? 'Bring in guests from a spreadsheet.' : `Step ${stepIndex + 1} of 4`}</p>
          </span>
          <button type="button" className="ig-db-round-btn is-sm" aria-label="Close" onClick={close} disabled={importing}>{DashIcon.close}</button>
        </div>

        <ol className="ig-im-steps" aria-label="Import progress">
          {STEPS.map(([key, label], index) => (
            <li key={key} className={index <= stepIndex ? 'is-done' : ''} aria-current={index === stepIndex ? 'step' : undefined}><span />{label}</li>
          ))}
        </ol>

        {error && <div className="ig-im-alert is-error" role="alert">{error}</div>}

        {stage === 'upload' && (
          <>
            <label
              className={`ig-im-drop${dragging ? ' is-over' : ''}${parsing ? ' is-busy' : ''}`}
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files?.[0]); }}
            >
              <input ref={inputRef} type="file" accept=".csv,.xlsx" disabled={parsing} onChange={(event) => chooseFile(event.target.files?.[0])} />
              <span className="ig-im-drop-icon"><UploadIcon /></span>
              <strong>{parsing ? 'Reading your file…' : <>Drop your file here or <u>browse</u></>}</strong>
              <span>CSV or .xlsx, up to 10 MB and 5,000 guests</span>
            </label>
            <p className="ig-im-note">Your file stays in this browser. Only names and emails you confirm are sent.</p>
            <button type="button" className="ig-pd-text-btn" onClick={downloadRsvpImportTemplate}>Download template</button>
          </>
        )}

        {stage === 'mapping' && sheet && (
          <>
            <div className="ig-im-file">
              <span className="ig-im-file-badge">{extension}</span>
              <span className="ig-im-file-text"><strong>{fileMeta.name}</strong><span>{formatFileSize(fileMeta.size)} · {plural(sheet.rows.length, 'row', 'rows')}</span></span>
              <button type="button" className="ig-pd-text-btn" onClick={resetFile}>Change file</button>
            </div>
            <div className="ig-im-copy">
              <strong>Match your columns</strong>
              <span>Choose which column in your sheet holds each value. We guessed from your headings.</span>
            </div>
            {[['fullName', 'Full name'], ['emailAddress', 'Email address']].map(([key, label]) => (
              <div className="ig-im-map" key={key}>
                <span className="ig-im-map-label"><strong>{label}</strong><em>Required</em></span>
                <span className="ig-im-map-arrow" aria-hidden="true">→</span>
                <select aria-label={`${label} column`} value={mapping[key]} onChange={(event) => setMapping((m) => ({ ...m, [key]: event.target.value }))}>
                  <option value="">Select column</option>
                  {sheet.headers.map((header, index) => (
                    <option value={index} key={`${header}-${index}`}>Column {columnLetter(index)}: "{header}"</option>
                  ))}
                </select>
              </div>
            ))}
            <div className="ig-im-sample">
              <span>First row with this matching</span>
              <strong>{mappedValue('fullName') || '—'} <i>·</i> <em>{mappedValue('emailAddress') || '—'}</em></strong>
            </div>
          </>
        )}

        {stage === 'preview' && preview && (
          <>
            <div className="ig-im-summary">
              <span className="is-hot"><strong>{preview.validRows.length.toLocaleString()}</strong>Ready to import</span>
              <span><strong>{preview.invalidRows.length.toLocaleString()}</strong>Invalid</span>
              <span><strong>{preview.duplicateRows.length.toLocaleString()}</strong>Duplicates</span>
            </div>
            <div className="ig-im-review-head">
              <span><strong>Review before importing</strong><span>Only rows marked Ready are added. The rest are skipped.</span></span>
              <button type="button" className="ig-pd-text-btn" onClick={() => setStage('mapping')}>Edit matching</button>
            </div>
            <div className="ig-im-table-wrap">
              <table className="ig-im-table">
                <thead><tr><th>Name</th><th>Email</th><th>Status</th></tr></thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr key={`${row.sourceRow}-${row.status}`}>
                      <td>{row.fullName || '—'}</td>
                      <td>{row.emailAddress || '—'}</td>
                      <td><span className={`ig-im-status is-${row.status === 'Ready' ? 'ok' : row.status === 'Duplicate' ? 'dup' : 'bad'}`} title={row.reason || ''}>{row.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ig-im-pager">
              <span>Showing <strong>{reviewPage * REVIEW_PAGE + 1} to {Math.min(reviewRows.length, (reviewPage + 1) * REVIEW_PAGE)}</strong> of {reviewRows.length.toLocaleString()}</span>
              {pages > 1 && (
                <span className="ig-ae-pager-btns">
                  <button type="button" onClick={() => setReviewPage((p) => Math.max(0, p - 1))} disabled={reviewPage === 0} aria-label="Previous rows">{DashIcon.chevronLeft}</button>
                  <strong>{reviewPage + 1} / {pages}</strong>
                  <button type="button" onClick={() => setReviewPage((p) => Math.min(pages - 1, p + 1))} disabled={reviewPage >= pages - 1} aria-label="Next rows">{DashIcon.chevronRight}</button>
                </span>
              )}
            </div>
          </>
        )}

        {stage === 'result' && result && (
          <div className="ig-im-result">
            <span className="ig-im-check" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg></span>
            <strong>{plural(result.summary.imported, 'guest', 'guests')} added{eventTitle ? ` to ${eventTitle}` : ''}</strong>
            <span>
              {result.dashboardRefreshWarning
                ? 'Your guests are saved, but the dashboard still needs to refresh.'
                : "They're in your RSVP list now. Their QR passes haven't been sent yet."}
            </span>
            {result.dashboardRefreshWarning && <div className="ig-im-alert is-warn" role="alert">{result.dashboardRefreshWarning}</div>}
            <div className="ig-im-summary">
              <span className="is-hot"><strong>{result.summary.imported.toLocaleString()}</strong>Imported</span>
              <span><strong>{result.summary.invalid.toLocaleString()}</strong>Invalid</span>
              <span><strong>{result.summary.duplicates.toLocaleString()}</strong>Duplicates</span>
            </div>
            {result.errors.length > 0 && (
              <button type="button" className="ig-pd-link-btn" onClick={() => downloadRsvpImportErrors(result.errors)}>
                <DownloadIcon />Download skipped-row report ({plural(result.errors.length, 'row', 'rows')})
              </button>
            )}
          </div>
        )}

        <div className="ig-db-dialog-actions">
          {stage === 'upload' && (
            <>
              <button type="button" className="ig-db-btn-ghost" onClick={close}>Cancel</button>
              <button type="button" className="ig-db-btn-primary" onClick={() => inputRef.current?.click()} disabled={parsing}>Choose file</button>
            </>
          )}
          {stage === 'mapping' && (
            <>
              <button type="button" className="ig-db-btn-ghost" onClick={resetFile}>Back</button>
              <button type="button" className="ig-db-btn-primary" onClick={reviewImport}>Review rows</button>
            </>
          )}
          {stage === 'preview' && (
            <>
              <button type="button" className="ig-db-btn-ghost" onClick={() => setStage('mapping')} disabled={importing}>Back</button>
              <button type="button" className="ig-db-btn-primary" onClick={importGuests} disabled={importing || preview.validRows.length === 0}>
                {importing ? 'Importing…' : `Import ${plural(preview.validRows.length, 'guest', 'guests')}`}
              </button>
            </>
          )}
          {stage === 'result' && (
            <>
              <button type="button" className="ig-db-btn-ghost" onClick={close}>Done</button>
              {onSendQr && result?.summary.imported > 0 && (
                <button type="button" className="ig-db-btn-primary" onClick={() => { onClose(); onSendQr(); }}><MailIcon />Send their QR passes</button>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default IgImportModal;
