import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RsvpImportModal from './RsvpImportModal';

test('uploads only normalized name and email rows after browser preview', async () => {
  const onImport = jest.fn().mockResolvedValue({
    summary: { received: 1, imported: 1, invalid: 0, duplicates: 0 },
    errors: []
  });
  const file = new File(
    ['Full Name,Email Address\nAda Okafor,ADA@example.com'],
    'guests.csv',
    { type: 'text/csv' }
  );
  file.text = jest.fn().mockResolvedValue('Full Name,Email Address\nAda Okafor,ADA@example.com');

  const { container } = render(<RsvpImportModal onClose={jest.fn()} onImport={onImport} />);
  fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });

  expect(await screen.findByText('Match your columns')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Review rows' }));
  expect(await screen.findByText('Review before importing')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Import 1 guest' }));

  await waitFor(() => {
    expect(onImport).toHaveBeenCalledWith([
      { sourceRow: 2, fullName: 'Ada Okafor', emailAddress: 'ada@example.com' }
    ]);
  });
  expect(await screen.findByText('Import complete')).toBeInTheDocument();
});

test('keeps a successful import distinct from a dashboard refresh warning', async () => {
  const onImport = jest.fn().mockResolvedValue({
    summary: { received: 1, imported: 1, invalid: 0, duplicates: 0 },
    errors: [],
    dashboardRefreshWarning: '1 guest was imported, but the dashboard could not refresh.'
  });
  const file = new File(
    ['Full Name,Email Address\nAda Okafor,ada@example.com'],
    'guests.csv',
    { type: 'text/csv' }
  );
  file.text = jest.fn().mockResolvedValue('Full Name,Email Address\nAda Okafor,ada@example.com');

  const { container } = render(<RsvpImportModal onClose={jest.fn()} onImport={onImport} />);
  fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });

  expect(await screen.findByText('Match your columns')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Review rows' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Import 1 guest' }));

  expect(await screen.findByText('Import complete')).toBeInTheDocument();
  expect(screen.getByText('Your guests are saved, but the dashboard still needs to refresh.')).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('1 guest was imported');
  expect(onImport).toHaveBeenCalledTimes(1);
});
