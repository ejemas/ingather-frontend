import React, { useEffect, useState } from 'react';
import {
  CUSTOM_FIELD_TYPES,
  MAX_CUSTOM_OPTIONS,
  createCustomField,
  prepareCustomFieldForSave,
  validateCustomFieldDraft
} from '../utils/customFields';
import '../styles/CustomFields.css';

function CustomFieldBuilderModal({ field, onClose, onSave }) {
  const [draft, setDraft] = useState(() => field || createCustomField());
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const updateDraft = (key, value) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const updateOption = (index, value) => {
    setDraft(prev => ({
      ...prev,
      options: prev.options.map((option, optionIndex) => optionIndex === index ? value : option)
    }));
    setErrors(prev => ({ ...prev, options: '' }));
  };

  const addOption = () => {
    setDraft(prev => ({
      ...prev,
      options: [...(prev.options || []), ''].slice(0, MAX_CUSTOM_OPTIONS)
    }));
  };

  const removeOption = (index) => {
    setDraft(prev => ({
      ...prev,
      options: prev.options.filter((_, optionIndex) => optionIndex !== index)
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validateCustomFieldDraft(draft);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    onSave(prepareCustomFieldForSave(draft));
  };

  const needsOptions = draft.type === 'radio' || draft.type === 'checkbox';

  return (
    <div className="custom-field-modal-overlay" role="presentation" onMouseDown={onClose}>
      <form
        className="custom-field-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-field-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="custom-field-modal-header">
          <span>Customized Field</span>
          <h3 id="custom-field-modal-title">{field ? 'Edit custom field' : 'Add custom field'}</h3>
        </div>

        <label className="custom-field-config-control">
          <span>Field Label</span>
          <input
            type="text"
            value={draft.label}
            onChange={(event) => updateDraft('label', event.target.value)}
            placeholder="Company Name"
            maxLength={120}
            autoFocus
          />
          {errors.label && <small>{errors.label}</small>}
        </label>

        <label className="custom-field-config-control">
          <span>Field Type</span>
          <select
            value={draft.type}
            onChange={(event) => updateDraft('type', event.target.value)}
          >
            {CUSTOM_FIELD_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          {errors.type && <small>{errors.type}</small>}
        </label>

        {needsOptions && (
          <div className="custom-field-options-builder">
            <div className="custom-field-options-heading">
              <span>Options</span>
              <button type="button" onClick={addOption} disabled={(draft.options || []).length >= MAX_CUSTOM_OPTIONS}>
                Add another option
              </button>
            </div>
            {(draft.options || []).map((option, index) => (
              <div className="custom-field-option-row" key={`${draft.id}-option-${index}`}>
                <input
                  type="text"
                  value={option}
                  onChange={(event) => updateOption(index, event.target.value)}
                  placeholder={`Option ${index + 1}`}
                  maxLength={80}
                />
                <button type="button" onClick={() => removeOption(index)} disabled={(draft.options || []).length <= 2}>
                  Remove
                </button>
              </div>
            ))}
            {errors.options && <small className="custom-field-config-error">{errors.options}</small>}
          </div>
        )}

        <label className="custom-field-required-toggle">
          <input
            type="checkbox"
            checked={draft.required}
            onChange={(event) => updateDraft('required', event.target.checked)}
          />
          <span aria-hidden="true"></span>
          <strong>Is Required</strong>
        </label>

        <div className="custom-field-modal-actions">
          <button type="button" className="custom-field-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="custom-field-primary">Save field</button>
        </div>
      </form>
    </div>
  );
}

export default CustomFieldBuilderModal;
