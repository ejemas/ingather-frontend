import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

export const MAX_RSVP_IMPORT_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_RSVP_IMPORT_ROWS = 5000;

const NAME_ALIASES = new Set(['name', 'fullname', 'guestname', 'attendeename', 'participantname']);
const EMAIL_ALIASES = new Set(['email', 'emailaddress', 'guestemail', 'attendeeemail']);

const normalizeHeader = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
const normalizeCell = (value) => String(value ?? '').trim();
const normalizeEmail = (value) => normalizeCell(value).toLowerCase();
const isValidEmail = (value) => {
  const email = normalizeEmail(value);
  return email.length > 0
    && email.length <= 255
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    && email.indexOf('@') === email.lastIndexOf('@');
};

const isEmptyRow = (row) => !Array.isArray(row) || row.every(cell => normalizeCell(cell) === '');

export const parseCsvText = (source) => {
  const text = String(source || '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(cell);
      cell = '';
    } else if (character === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (character !== '\r') {
      cell += character;
    }
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
};

const parseXml = (xml, label) => {
  const documentNode = new DOMParser().parseFromString(xml, 'application/xml');
  if (documentNode.querySelector('parsererror')) {
    throw new Error(`The Excel ${label} could not be read.`);
  }
  return documentNode;
};

const getArchiveText = (archive, path, required = true) => {
  const entry = archive[path];
  if (!entry) {
    if (!required) return '';
    throw new Error('This Excel workbook is missing required worksheet data.');
  }
  return strFromU8(entry);
};

const normalizeArchivePath = (target) => {
  const parts = String(target || '').replace(/^\/+/, '').split('/');
  const normalized = [];
  parts.forEach((part) => {
    if (!part || part === '.') return;
    if (part === '..') normalized.pop();
    else normalized.push(part);
  });
  return normalized.join('/');
};

const columnIndexFromReference = (reference) => {
  const letters = String(reference || '').match(/[A-Z]+/i)?.[0]?.toUpperCase() || '';
  let value = 0;
  for (let index = 0; index < letters.length; index += 1) {
    value = (value * 26) + (letters.charCodeAt(index) - 64);
  }
  return Math.max(0, value - 1);
};

export const parseXlsxBuffer = (buffer) => {
  let archive;
  try {
    archive = unzipSync(new Uint8Array(buffer));
  } catch (error) {
    throw new Error('This Excel file is damaged or is not a supported .xlsx workbook.');
  }

  const expandedBytes = Object.values(archive).reduce((total, entry) => total + entry.byteLength, 0);
  if (expandedBytes > 50 * 1024 * 1024) {
    throw new Error('This Excel workbook expands beyond the supported size.');
  }

  const workbook = parseXml(getArchiveText(archive, 'xl/workbook.xml'), 'workbook');
  const relationships = parseXml(
    getArchiveText(archive, 'xl/_rels/workbook.xml.rels'),
    'worksheet relationships'
  );
  const firstSheet = workbook.getElementsByTagNameNS('*', 'sheet')[0];
  if (!firstSheet) throw new Error('This Excel workbook does not contain a worksheet.');

  const relationshipId = firstSheet.getAttribute('r:id')
    || firstSheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
  const relationship = Array.from(relationships.getElementsByTagNameNS('*', 'Relationship'))
    .find(item => item.getAttribute('Id') === relationshipId);
  if (!relationship) throw new Error('The first Excel worksheet could not be located.');

  const rawTarget = relationship.getAttribute('Target') || '';
  const worksheetPath = rawTarget.startsWith('/')
    ? normalizeArchivePath(rawTarget)
    : normalizeArchivePath(`xl/${rawTarget}`);
  const worksheet = parseXml(getArchiveText(archive, worksheetPath), 'worksheet');

  const sharedStringsXml = getArchiveText(archive, 'xl/sharedStrings.xml', false);
  const sharedStrings = sharedStringsXml
    ? Array.from(parseXml(sharedStringsXml, 'shared strings').getElementsByTagNameNS('*', 'si'))
      .map(item => item.textContent || '')
    : [];

  return Array.from(worksheet.getElementsByTagNameNS('*', 'row')).map((rowNode, rowIndex) => {
    const values = [];
    Array.from(rowNode.getElementsByTagNameNS('*', 'c')).forEach((cellNode, cellIndex) => {
      const columnIndex = cellNode.getAttribute('r')
        ? columnIndexFromReference(cellNode.getAttribute('r'))
        : cellIndex;
      const type = cellNode.getAttribute('t');
      const valueNode = cellNode.getElementsByTagNameNS('*', 'v')[0];
      let value = '';

      if (type === 'inlineStr') {
        value = cellNode.getElementsByTagNameNS('*', 'is')[0]?.textContent || '';
      } else if (type === 's') {
        value = sharedStrings[Number(valueNode?.textContent || 0)] || '';
      } else {
        value = valueNode?.textContent || '';
      }

      values[columnIndex] = value;
    });

    return {
      sourceRow: Number(rowNode.getAttribute('r')) || rowIndex + 1,
      values
    };
  });
};

const toParsedSheet = (matrix) => {
  const rowEntries = matrix.map((entry, index) => (
    Array.isArray(entry)
      ? { sourceRow: index + 1, values: entry }
      : entry
  ));
  const headerIndex = rowEntries.findIndex(entry => !isEmptyRow(entry.values));
  if (headerIndex < 0) throw new Error('The spreadsheet is empty.');

  const headerValues = rowEntries[headerIndex].values;
  const headers = headerValues.map((value, index) => normalizeCell(value) || `Column ${index + 1}`);
  const rows = rowEntries.slice(headerIndex + 1).filter(entry => !isEmptyRow(entry.values));

  if (headers.length < 2) {
    throw new Error('The spreadsheet needs separate Full Name and Email Address columns.');
  }
  if (rows.length === 0) throw new Error('The spreadsheet does not contain any attendee rows.');
  if (rows.length > MAX_RSVP_IMPORT_ROWS) {
    throw new Error(`A single import can contain at most ${MAX_RSVP_IMPORT_ROWS.toLocaleString()} attendees.`);
  }

  return { headers, rows };
};

export const parseRsvpImportFile = async (file) => {
  if (!file) throw new Error('Choose a CSV or Excel file.');
  if (file.size > MAX_RSVP_IMPORT_FILE_BYTES) {
    throw new Error('The spreadsheet must be 10 MB or smaller.');
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!['csv', 'xlsx'].includes(extension)) {
    throw new Error('Upload a .csv or .xlsx spreadsheet.');
  }

  if (extension === 'csv') {
    return toParsedSheet(parseCsvText(await file.text()));
  }

  return toParsedSheet(parseXlsxBuffer(await file.arrayBuffer()));
};

export const detectImportMapping = (headers) => {
  const mapping = { fullName: '', emailAddress: '' };
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    if (mapping.fullName === '' && NAME_ALIASES.has(normalized)) mapping.fullName = String(index);
    if (mapping.emailAddress === '' && EMAIL_ALIASES.has(normalized)) mapping.emailAddress = String(index);
  });
  return mapping;
};

export const buildImportPreview = ({ rows }, mapping) => {
  if (mapping.fullName === '' || mapping.emailAddress === '') {
    throw new Error('Map the Full Name and Email Address columns.');
  }
  const fullNameIndex = Number(mapping.fullName);
  const emailIndex = Number(mapping.emailAddress);
  if (!Number.isInteger(fullNameIndex) || !Number.isInteger(emailIndex) || fullNameIndex === emailIndex) {
    throw new Error('Map different spreadsheet columns to Full Name and Email Address.');
  }

  const seenEmails = new Set();
  const validRows = [];
  const invalidRows = [];
  const duplicateRows = [];

  rows.forEach((row) => {
    const fullName = normalizeCell(row.values[fullNameIndex]);
    const emailAddress = normalizeEmail(row.values[emailIndex]);
    let reason = '';

    if (!fullName) reason = 'Full Name is required.';
    else if (fullName.length > 255) reason = 'Full Name must be 255 characters or fewer.';
    else if (!emailAddress) reason = 'Email Address is required.';
    else if (!isValidEmail(emailAddress)) reason = 'Enter a valid email address.';

    const normalizedRow = { sourceRow: row.sourceRow, fullName, emailAddress };
    if (reason) {
      invalidRows.push({ ...normalizedRow, type: 'invalid', reason });
    } else if (seenEmails.has(emailAddress)) {
      duplicateRows.push({
        ...normalizedRow,
        type: 'duplicate',
        reason: 'This email appears more than once in the spreadsheet.'
      });
    } else {
      seenEmails.add(emailAddress);
      validRows.push(normalizedRow);
    }
  });

  return { validRows, invalidRows, duplicateRows };
};

const escapeXml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const createInlineCell = (reference, value) => (
  `<c r="${reference}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`
);

export const createRsvpImportTemplate = () => {
  const files = {
    '[Content_Types].xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
      + '</Types>'
    ),
    '_rels/.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
      + '</Relationships>'
    ),
    'xl/workbook.xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
      + 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + '<sheets><sheet name="RSVP Guests" sheetId="1" r:id="rId1"/></sheets></workbook>'
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
      + '</Relationships>'
    ),
    'xl/worksheets/sheet1.xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + '<sheetData><row r="1">'
      + createInlineCell('A1', 'Full Name')
      + createInlineCell('B1', 'Email Address')
      + '</row></sheetData></worksheet>'
    )
  };
  return new Blob(
    [zipSync(files, { level: 6 })],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  );
};

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const downloadRsvpImportTemplate = () => {
  downloadBlob(createRsvpImportTemplate(), 'ingather-rsvp-import-template.xlsx');
};

const escapeCsvCell = (value) => {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const downloadRsvpImportErrors = (errors) => {
  const rows = [
    ['Spreadsheet Row', 'Email Address', 'Type', 'Reason'],
    ...(errors || []).map(error => [
      error.sourceRow || '',
      error.emailAddress || '',
      error.type || 'invalid',
      error.reason || 'Unable to import this row.'
    ])
  ];
  const csv = rows.map(row => row.map(escapeCsvCell).join(',')).join('\r\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'ingather-rsvp-import-errors.csv');
};
