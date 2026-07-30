import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import PreEventDetail from './PreEventDetail';
import {
  getPreEvent,
  importPreEventRsvps,
  sendImportedRsvpQrBatch
} from '../api/preEventService';

const mockToast = {
  error: jest.fn(),
  success: jest.fn(),
  warning: jest.fn()
};

jest.mock('react-router-dom', () => ({
  useParams: () => ({ id: '42' })
}), { virtual: true });

jest.mock('../api/preEventService', () => ({
  addManualPreEventRsvp: jest.fn(),
  getPreEvent: jest.fn(),
  importPreEventRsvps: jest.fn(),
  resendRsvpQrEmail: jest.fn(),
  sendImportedRsvpQrBatch: jest.fn(),
  updatePreEvent: jest.fn()
}));

jest.mock('../api/programService', () => ({
  getPrograms: jest.fn().mockResolvedValue({ programs: [] })
}));

jest.mock('../components/DashboardShell', () => function MockDashboardShell({ children }) {
  return <div>{children}</div>;
});

jest.mock('../components/CustomFieldBuilderModal', () => function MockCustomFieldBuilderModal() {
  return null;
});

jest.mock('../components/Toast', () => ({
  useToast: () => mockToast
}));

jest.mock('recharts', () => ({
  Bar: () => null,
  BarChart: ({ data, children }) => (
    <div data-testid="velocity-chart" data-chart={JSON.stringify(data)}>{children}</div>
  ),
  CartesianGrid: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null
}));

const quota = {
  limit: 100,
  used: 0,
  remaining: 100,
  timezone: 'Africa/Lagos',
  resetsAt: '2026-07-31T23:00:00.000Z'
};

const preEvent = {
  id: 42,
  title: 'Builder Summit',
  eventDate: '2026-08-01T09:00:00.000Z',
  description: '',
  venueName: '',
  city: '',
  discoverEnabled: false,
  virtualAttendanceEnabled: false,
  rsvpFields: {},
  customFormSchema: [],
  programId: null,
  publicUrl: 'https://ingather.app/rsvp/builder-summit'
};

const initialDetail = {
  preEvent,
  rsvps: [
    {
      id: 1,
      fullName: 'Existing Guest',
      emailAddress: 'existing@example.com',
      status: 'pre_registered',
      createdAt: '2026-07-30T08:00:00.000Z'
    }
  ],
  analytics: {
    totalRsvps: 1,
    todayRsvps: 1,
    velocity: [{ date: '2026-07-30', label: 'Jul 30', registrations: 1 }]
  },
  qrEmailQuota: quota
};

const refreshedDetail = {
  preEvent: { ...preEvent, rsvpCount: 2 },
  rsvps: [
    {
      id: 2,
      fullName: 'Ada Okafor',
      emailAddress: 'ada@example.com',
      status: 'pre_registered',
      createdAt: '2026-07-30T10:00:00.000Z'
    },
    ...initialDetail.rsvps
  ],
  analytics: {
    totalRsvps: 2,
    todayRsvps: 2,
    velocity: [{ date: '2026-07-30', label: 'Jul 30', registrations: 2 }]
  },
  qrEmailQuota: quota
};

const prepareSingleGuestImport = async (container) => {
  fireEvent.click(screen.getByRole('button', { name: 'Upload Data' }));
  const file = new File(
    ['Full Name,Email Address\nAda Okafor,ADA@example.com'],
    'guests.csv',
    { type: 'text/csv' }
  );
  file.text = jest.fn().mockResolvedValue('Full Name,Email Address\nAda Okafor,ADA@example.com');
  fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });

  expect(await screen.findByText('Match your columns')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Review rows' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Import 1 guest' }));
};

beforeEach(() => {
  jest.clearAllMocks();
  getPreEvent.mockReset();
  importPreEventRsvps.mockReset();
  sendImportedRsvpQrBatch.mockReset();
});

test('refreshes RSVP rows and all analytics exactly once after import', async () => {
  getPreEvent
    .mockResolvedValueOnce(initialDetail)
    .mockResolvedValueOnce(refreshedDetail);
  importPreEventRsvps.mockResolvedValue({
    summary: { received: 1, imported: 1, invalid: 0, duplicates: 0 },
    errors: []
  });

  const { container } = render(<PreEventDetail />);

  const totalCard = await screen.findByText('Total RSVPs');
  expect(totalCard.closest('article')).toHaveTextContent('1');
  await prepareSingleGuestImport(container);

  await waitFor(() => expect(getPreEvent).toHaveBeenCalledTimes(2));
  expect(importPreEventRsvps).toHaveBeenCalledTimes(1);
  expect(importPreEventRsvps).toHaveBeenCalledWith(42, [
    { sourceRow: 2, fullName: 'Ada Okafor', emailAddress: 'ada@example.com' }
  ]);

  expect(totalCard.closest('article')).toHaveTextContent('2');
  expect(screen.getByText('Today').closest('article')).toHaveTextContent('2');
  expect(JSON.parse(screen.getByTestId('velocity-chart').getAttribute('data-chart'))).toEqual([
    { date: '2026-07-30', label: 'Jul 30', registrations: 2 }
  ]);

  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  expect(within(screen.getByRole('table')).getByText('Ada Okafor')).toBeInTheDocument();
});

test('keeps import success when the single dashboard refresh fails', async () => {
  getPreEvent
    .mockResolvedValueOnce(initialDetail)
    .mockRejectedValueOnce(new Error('Refresh unavailable'));
  importPreEventRsvps.mockResolvedValue({
    summary: { received: 1, imported: 1, invalid: 0, duplicates: 0 },
    errors: []
  });

  const { container } = render(<PreEventDetail />);
  await screen.findByText('Total RSVPs');
  await prepareSingleGuestImport(container);

  expect(await screen.findByText('Import complete')).toBeInTheDocument();
  expect(screen.getByText('Your guests are saved, but the dashboard still needs to refresh.')).toBeInTheDocument();
  expect(getPreEvent).toHaveBeenCalledTimes(2);
  expect(mockToast.warning).toHaveBeenCalledWith(expect.stringContaining('1 guest was imported'));
  expect(mockToast.error).not.toHaveBeenCalled();
});

test('does not refresh the dashboard when the import request fails', async () => {
  getPreEvent.mockResolvedValueOnce(initialDetail);
  importPreEventRsvps.mockRejectedValue({
    response: { data: { error: 'Import rejected' } }
  });

  const { container } = render(<PreEventDetail />);
  await screen.findByText('Total RSVPs');
  await prepareSingleGuestImport(container);

  expect(await screen.findByRole('alert')).toHaveTextContent('Import rejected');
  expect(getPreEvent).toHaveBeenCalledTimes(1);
  expect(mockToast.success).not.toHaveBeenCalledWith(expect.stringContaining('guests imported'));
});

test('shows the actual bulk QR count and confirms the allowance impact', async () => {
  getPreEvent.mockResolvedValueOnce({
    ...initialDetail,
    qrEmailQuota: { ...quota, used: 98, remaining: 2 },
    rsvps: [
      {
        id: 10,
        emailAddress: 'first@example.com',
        status: 'pre_registered',
        registrationSource: 'import',
        createdAt: '2026-07-30T08:00:00.000Z'
      },
      {
        id: 11,
        emailAddress: 'second@example.com',
        status: 'pre_registered',
        registrationSource: 'import',
        createdAt: '2026-07-30T08:05:00.000Z'
      },
      {
        id: 12,
        emailAddress: 'third@example.com',
        status: 'pre_registered',
        registrationSource: 'import',
        createdAt: '2026-07-30T08:10:00.000Z'
      }
    ]
  });

  render(<PreEventDetail />);

  const bulkButton = await screen.findByRole('button', { name: 'Send 2 QR emails' });
  fireEvent.click(bulkButton);

  const dialog = screen.getByRole('dialog', { name: 'Send 2 QR emails?' });
  expect(dialog).toHaveTextContent('Expected remaining today');
  expect(dialog).toHaveTextContent('0');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('sends imported QR emails and refreshes the dashboard exactly once', async () => {
  let resolveBatchRequest;
  const importedRsvps = [
    {
      id: 20,
      emailAddress: 'one@example.com',
      status: 'pre_registered',
      registrationSource: 'import',
      createdAt: '2026-07-30T08:00:00.000Z'
    },
    {
      id: 21,
      emailAddress: 'two@example.com',
      status: 'pre_registered',
      registrationSource: 'import',
      createdAt: '2026-07-30T08:05:00.000Z'
    }
  ];
  getPreEvent
    .mockResolvedValueOnce({ ...initialDetail, rsvps: importedRsvps })
    .mockResolvedValueOnce({
      ...initialDetail,
      rsvps: importedRsvps.map(rsvp => ({
        ...rsvp,
        checkinQrSentAt: '2026-07-30T09:00:00.000Z',
        checkinQrLastSentAt: '2026-07-30T09:00:00.000Z'
      })),
      qrEmailQuota: { ...quota, used: 2, remaining: 98 }
    });
  sendImportedRsvpQrBatch.mockReturnValue(new Promise((resolve) => {
    resolveBatchRequest = resolve;
  }));

  render(<PreEventDetail />);

  fireEvent.click(await screen.findByRole('button', { name: 'Send 2 QR emails' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Send 2 QR emails' }));

  await waitFor(() => expect(sendImportedRsvpQrBatch).toHaveBeenCalledWith(42));
  expect(await screen.findByRole('button', { name: 'Sending 2...' })).toBeDisabled();
  const firstImportedRow = screen.getByText('one@example.com').closest('tr');
  expect(within(firstImportedRow).getByRole('button', { name: 'Send QR' })).toBeDisabled();

  resolveBatchRequest({
    success: true,
    summary: { selected: 2, sent: 2, failed: 0, remainingUnsent: 0 },
    errors: [],
    quota: { ...quota, used: 2, remaining: 98 }
  });

  await waitFor(() => expect(getPreEvent).toHaveBeenCalledTimes(2));
  expect(mockToast.success).toHaveBeenCalledWith('2 QR emails sent. 98 remaining today.');
  expect(screen.getByText('98 / 100 remaining')).toBeInTheDocument();
});

test('keeps bulk-send success when the dashboard refresh fails', async () => {
  getPreEvent
    .mockResolvedValueOnce({
      ...initialDetail,
      rsvps: [{
        id: 30,
        emailAddress: 'one@example.com',
        status: 'pre_registered',
        registrationSource: 'import',
        createdAt: '2026-07-30T08:00:00.000Z'
      }]
    })
    .mockRejectedValueOnce(new Error('Refresh unavailable'));
  sendImportedRsvpQrBatch.mockResolvedValue({
    success: true,
    summary: { selected: 1, sent: 1, failed: 0, remainingUnsent: 0 },
    errors: [],
    quota: { ...quota, used: 1, remaining: 99 }
  });

  render(<PreEventDetail />);

  fireEvent.click(await screen.findByRole('button', { name: 'Send 1 QR email' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Send 1 QR email' }));

  await waitFor(() => expect(mockToast.warning).toHaveBeenCalledWith(
    expect.stringContaining('1 QR email sent, but the dashboard could not refresh')
  ));
  expect(mockToast.error).not.toHaveBeenCalled();
});

test('keeps public QR actions enabled when the organizer-added allowance is exhausted', async () => {
  getPreEvent.mockResolvedValueOnce({
    ...initialDetail,
    qrEmailQuota: {
      ...quota,
      used: 100,
      remaining: 0
    },
    rsvps: [
      {
        id: 3,
        fullName: 'Public Guest',
        emailAddress: 'public@example.com',
        status: 'pre_registered',
        registrationSource: 'public',
        checkinQrSentAt: '2026-07-30T10:01:00.000Z',
        checkinQrLastSentAt: '2026-07-30T10:01:00.000Z',
        createdAt: '2026-07-30T10:00:00.000Z'
      },
      {
        id: 4,
        fullName: 'Imported Guest',
        emailAddress: 'imported@example.com',
        status: 'pre_registered',
        registrationSource: 'import',
        createdAt: '2026-07-30T10:05:00.000Z'
      }
    ]
  });

  render(<PreEventDetail />);

  expect(await screen.findByText(/100 daily QR emails for uploaded\/manual guests/)).toBeInTheDocument();
  expect(screen.getByText(/public RSVPs are excluded/)).toBeInTheDocument();
  const quotaCard = screen.getByText('QR email allowance').closest('.pre-event-qr-quota');
  const quotaStatus = quotaCard.querySelector('.pre-event-qr-quota-status');
  expect(within(quotaStatus).getByText('0 / 100 remaining')).toBeInTheDocument();
  expect(within(quotaStatus).getByText(/Resets/)).toBeInTheDocument();

  const publicRow = screen.getByText('public@example.com').closest('tr');
  const importedRow = screen.getByText('imported@example.com').closest('tr');
  expect(within(publicRow).getByRole('button', { name: 'Resend QR' })).toBeEnabled();
  expect(within(importedRow).getByRole('button', { name: 'Send QR' })).toBeDisabled();
});
