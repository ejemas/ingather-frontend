import React, { useEffect, useRef, useState } from 'react';
import {
  MAX_CUSTOM_FIELDS,
  MAX_CUSTOM_OPTIONS,
  createCustomField,
  prepareCustomFieldForSave,
  validateCustomFieldDraft
} from '../utils/customFields';
import { DashIcon } from './IgDashShell';

const TYPES = [
  ['text', 'Short text', 'One line answer'],
  ['radio', 'Pick one', 'Radio buttons'],
  ['checkbox', 'Pick many', 'Checkboxes']
];

// Add or edit one custom question (redesign). Used for RSVP pages and event check-in forms;
// subtitle and note say where the question goes and when it is saved.
function IgQuestionModal({ field, onClose, onSave, subtitle = 'Guests answer this on your RSVP page.', note = 'Saved with Save Settings.' }) {
  const [draft, setDraft] = useState(() => {
    const base = field ? { ...field } : createCustomField();
    if ((base.type === 'radio' || base.type === 'checkbox') && (!base.options || base.options.length < 2)) {
      base.options = [...(base.options || []), '', ''].slice(0, Math.max(2, (base.options || []).length));
    }
    if (!base.options || base.options.length === 0) base.options = ['', ''];
    return base;
  });
  const [errors, setErrors] = useState({});
  const labelRef = useRef(null);

  useEffect(() => {
    labelRef.current?.focus();
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const update = (key, value) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };
  const updateOption = (index, value) => {
    setDraft((d) => ({ ...d, options: d.options.map((o, i) => (i === index ? value : o)) }));
    setErrors((e) => ({ ...e, options: '' }));
  };
  const addOption = () => setDraft((d) => ({ ...d, options: [...d.options, ''].slice(0, MAX_CUSTOM_OPTIONS) }));
  const removeOption = (index) => setDraft((d) => ({ ...d, options: d.options.filter((_, i) => i !== index) }));

  const submit = (event) => {
    event.preventDefault();
    const nextErrors = validateCustomFieldDraft(draft);
    if (nextErrors.label) nextErrors.label = 'Type the question guests will answer.';
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    onSave(prepareCustomFieldForSave(draft));
  };

  const needsOptions = draft.type === 'radio' || draft.type === 'checkbox';

  return (
    <div className="ig-db-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="ig-db-dialog ig-pd-modal" role="dialog" aria-modal="true" aria-labelledby="ig-q-title" onSubmit={submit} noValidate>
        <div className="ig-pd-modal-head">
          <span>
            <h2 id="ig-q-title">{field ? 'Edit question' : 'Add a question'}</h2>
            <p>{subtitle}</p>
          </span>
          <button type="button" className="ig-db-round-btn is-sm" aria-label="Close" onClick={onClose}>{DashIcon.close}</button>
        </div>

        <div className={`ig-st-field${errors.label ? ' has-error' : ''}`}>
          <label htmlFor="ig-q-label">Question</label>
          <input
            id="ig-q-label"
            ref={labelRef}
            value={draft.label}
            onChange={(event) => update('label', event.target.value)}
            placeholder="e.g. Which sessions will you join?"
            maxLength={120}
            aria-invalid={Boolean(errors.label) || undefined}
          />
          <span className="ig-pd-counter">{errors.label ? <span className="ig-st-error">{errors.label}</span> : <span />}{draft.label.length} / 120</span>
        </div>

        <fieldset className="ig-pd-fieldset">
          <legend>Answer type</legend>
          <div className="ig-pd-types" role="radiogroup" aria-label="Answer type">
            {TYPES.map(([key, name, sub]) => (
              <button key={key} type="button" role="radio" aria-checked={draft.type === key} className={draft.type === key ? 'is-on' : ''} onClick={() => update('type', key)}>
                <strong>{name}</strong><span>{sub}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {needsOptions && (
          <fieldset className="ig-pd-fieldset">
            <legend className="ig-pd-legend-row">
              <span>Options <em>(2 to {MAX_CUSTOM_OPTIONS})</em></span>
            </legend>
            <div className="ig-pd-options">
              {draft.options.map((option, index) => (
                <div className="ig-pd-option" key={`${draft.id}-o-${index}`}>
                  <input value={option} onChange={(event) => updateOption(index, event.target.value)} placeholder={`Option ${index + 1}`} maxLength={80} aria-label={`Option ${index + 1}`} />
                  <button type="button" className="ig-db-round-btn is-xs" aria-label={`Remove option ${index + 1}`} onClick={() => removeOption(index)} disabled={draft.options.length <= 2}>{DashIcon.close}</button>
                </div>
              ))}
            </div>
            {errors.options && <span className="ig-st-error">{errors.options}</span>}
            {draft.options.length < MAX_CUSTOM_OPTIONS && (
              <button type="button" className="ig-pd-text-btn" onClick={addOption}>+ Add option</button>
            )}
          </fieldset>
        )}

        <button type="button" role="switch" aria-checked={draft.required} className="ig-pd-switch-row" onClick={() => update('required', !draft.required)}>
          <span><strong>Required</strong><span>Guests must answer before they can RSVP</span></span>
          <span className={`ig-db-switch${draft.required ? ' is-on' : ''}`}><span /></span>
        </button>

        <div className="ig-db-dialog-actions">
          <button type="button" className="ig-db-btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="ig-db-btn-primary">{field ? 'Save changes' : 'Add question'}</button>
        </div>
        <p className="ig-pd-modal-note">Up to {MAX_CUSTOM_FIELDS} questions. {note}</p>
      </form>
    </div>
  );
}

export default IgQuestionModal;
