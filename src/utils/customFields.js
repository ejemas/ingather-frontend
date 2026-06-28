export const CUSTOM_FIELD_TYPES = [
  { value: 'text', label: 'Short Text' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'checkbox', label: 'Checkboxes' }
];

export const MAX_CUSTOM_FIELDS = 15;
export const MAX_CUSTOM_OPTIONS = 12;

export const createCustomField = () => ({
  id: `cf_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`,
  label: '',
  type: 'text',
  required: false,
  options: ['', '']
});

export const normalizeCustomFieldSchema = (schema = []) => {
  if (!Array.isArray(schema)) return [];

  return schema
    .filter(field => field && typeof field === 'object')
    .slice(0, MAX_CUSTOM_FIELDS)
    .map(field => ({
      id: field.id || createCustomField().id,
      label: String(field.label || '').trim().slice(0, 120),
      type: ['text', 'radio', 'checkbox'].includes(field.type) ? field.type : 'text',
      required: Boolean(field.required),
      options: Array.isArray(field.options)
        ? field.options.map(option => String(option || '').trim()).filter(Boolean).slice(0, MAX_CUSTOM_OPTIONS)
        : []
    }))
    .filter(field => {
      if (!field.label) return false;
      if ((field.type === 'radio' || field.type === 'checkbox') && field.options.length < 2) return false;
      return true;
    });
};

export const validateCustomFieldDraft = (field) => {
  const errors = {};
  const label = String(field?.label || '').trim();
  const type = field?.type || 'text';
  const options = Array.isArray(field?.options)
    ? field.options.map(option => String(option || '').trim()).filter(Boolean)
    : [];

  if (!label) errors.label = 'Field label is required.';
  if (!['text', 'radio', 'checkbox'].includes(type)) errors.type = 'Choose a valid field type.';
  if ((type === 'radio' || type === 'checkbox') && options.length < 2) {
    errors.options = 'Add at least two options.';
  }

  return errors;
};

export const prepareCustomFieldForSave = (field) => {
  const type = ['text', 'radio', 'checkbox'].includes(field.type) ? field.type : 'text';
  return {
    id: field.id || createCustomField().id,
    label: String(field.label || '').trim().slice(0, 120),
    type,
    required: Boolean(field.required),
    options: type === 'radio' || type === 'checkbox'
      ? [...new Set((field.options || []).map(option => String(option || '').trim()).filter(Boolean))].slice(0, MAX_CUSTOM_OPTIONS)
      : []
  };
};

export const formatCustomAnswer = (value) => {
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '-';
  return value ? String(value) : '-';
};
