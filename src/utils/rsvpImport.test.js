import {
  buildImportPreview,
  createRsvpImportTemplate,
  detectImportMapping,
  parseCsvText,
  parseRsvpImportFile,
  parseXlsxBuffer
} from './rsvpImport';

const readBlob = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsArrayBuffer(blob);
});

describe('RSVP import utilities', () => {
  test('parses quoted CSV cells and embedded commas', () => {
    expect(parseCsvText('Full Name,Email Address\r\n"Okafor, Ada",ada@example.com')).toEqual([
      ['Full Name', 'Email Address'],
      ['Okafor, Ada', 'ada@example.com']
    ]);
  });

  test('detects common name and email headings', () => {
    expect(detectImportMapping(['Guest Name', 'Email'])).toEqual({
      fullName: '0',
      emailAddress: '1'
    });
  });

  test('separates ready, invalid, and duplicate rows', () => {
    const preview = buildImportPreview({
      rows: [
        { sourceRow: 2, values: ['Ada Okafor', 'ADA@example.com'] },
        { sourceRow: 3, values: ['', 'missing-name@example.com'] },
        { sourceRow: 4, values: ['Ada Again', 'ada@example.com'] }
      ]
    }, { fullName: '0', emailAddress: '1' });

    expect(preview.validRows).toEqual([
      { sourceRow: 2, fullName: 'Ada Okafor', emailAddress: 'ada@example.com' }
    ]);
    expect(preview.invalidRows).toHaveLength(1);
    expect(preview.duplicateRows).toHaveLength(1);
  });

  test('rejects CSV imports over 5,000 attendee rows', async () => {
    const rows = Array.from({ length: 5001 }, (_, index) => `Guest ${index},guest${index}@example.com`);
    const text = `Full Name,Email Address\n${rows.join('\n')}`;
    const file = { name: 'guests.csv', size: text.length, text: async () => text };
    await expect(parseRsvpImportFile(file)).rejects.toThrow('at most 5,000 attendees');
  });

  test('creates an Excel template that the local parser can read', async () => {
    const buffer = await readBlob(createRsvpImportTemplate());
    const rows = parseXlsxBuffer(buffer);
    expect(rows[0].values).toEqual(['Full Name', 'Email Address']);
  });
});
