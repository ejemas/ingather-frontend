import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ProgramDetail from './ProgramDetail';
import { EventTemplateProvider } from '../context/EventTemplateContext';
import { addManualAttendee, deleteProgram, getProgramDetailBootstrap, markWinnerGifted, stopProgram, updateStrictDeviceFingerprinting } from '../api/programService';

const mockNavigate = jest.fn();
const mockToast = { error: jest.fn(), success: jest.fn(), warning: jest.fn(), info: jest.fn() };

jest.mock('react-router-dom', () => ({
  useParams: () => ({ id: '12' }),
  useNavigate: () => mockNavigate,
  Link: ({ to, children, ...props }) => <a href={String(to)} {...props}>{children}</a>
}), { virtual: true });

jest.mock('../api/programService', () => ({
  getProgramDetailBootstrap: jest.fn(),
  getDashboardBootstrap: jest.fn().mockResolvedValue(null),
  getSponsorAnalytics: jest.fn().mockResolvedValue({ sponsorCount: 0, totalClicks: 0, todayClicks: 0, topSponsor: null, sponsors: [] }),
  getProgramById: jest.fn(),
  getAttendees: jest.fn().mockResolvedValue({ attendees: [] }),
  getAttendanceData: jest.fn().mockResolvedValue({}),
  stopProgram: jest.fn(),
  deleteProgram: jest.fn(),
  markWinnerGifted: jest.fn(),
  addManualAttendee: jest.fn(),
  getRsvpScannerLink: jest.fn(),
  updateStrictDeviceFingerprinting: jest.fn()
}));

jest.mock('../components/IgDashShell', () => {
  const actual = jest.requireActual('../components/IgDashShell');
  return { __esModule: true, ...actual, default: ({ children }) => <div>{children}</div> };
});

jest.mock('../components/Toast', () => ({ useToast: () => mockToast }));
jest.mock('../api/authService', () => ({ getCurrentChurch: jest.fn().mockRejectedValue(new Error('offline')) }));
jest.mock('qrcode.react', () => ({ QRCodeCanvas: () => <canvas data-testid="qr" /> }), { virtual: true });
jest.mock('socket.io-client', () => ({ __esModule: true, default: () => ({ emit: () => {}, on: () => {}, disconnect: () => {} }) }), { virtual: true });

const pad = (n) => String(n).padStart(2, '0');
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// A live event: started an hour ago, ends at 23:59 the same day.
const liveStart = new Date(Date.now() - 60 * 60 * 1000);
const program = (over = {}) => ({
  id: 12, title: 'Builders Night #12', date: isoDay(liveStart), startTime: `${pad(liveStart.getHours())}:${pad(liveStart.getMinutes())}`, endTime: '23:59', trackingMode: 'collect-data',
  dataFields: { fullName: true, emailAddress: true, fellowship: true, sex: true, firstTimer: true }, customFormSchema: [],
  giftingEnabled: true, strictDeviceFingerprinting: true, qrCodeUrl: 'https://ingather.app/scan/12', isActive: true,
  totalScans: 3, sharedDeviceCheckins: 1, linkedPreEventCount: 0, winnersGifted: 0, ...over
});

const attendees = [
  { id: 1, fullName: 'Chiamaka Eze', emailAddress: 'chiamaka@mail.com', fellowship: 'Design Circle', sex: 'Female', firstTimer: true, isWinner: true, isGifted: false, registrationType: 'rsvp', checkedInAt: '2026-11-02T18:41:00Z' },
  { id: 2, fullName: 'Tolu Adebayo', emailAddress: 'tolu@mail.com', fellowship: 'Backend Guild', sex: 'Male', firstTimer: false, isWinner: false, registrationType: 'walk_in', checkedInAt: '2026-11-02T18:39:00Z' },
  { id: 3, fullName: 'Ifeanyi Obi', emailAddress: 'ifeanyi@mail.com', fellowship: 'Product', sex: 'Male', firstTimer: false, isWinner: false, registrationType: 'proxy', checkedInAt: '2026-11-02T18:30:00Z' }
];

const boot = (over = {}, list = attendees) => ({
  church: { churchName: 'Lagos Builders Community', email: 'a@b.c', organizationType: 'general' },
  unreadCount: 0,
  program: program(over),
  attendees: list,
  attendanceData: { buckets: [{ time: '18:00', scans: 1 }, { time: '18:30', scans: 2 }], startTime: '18:00', endTime: '21:00' },
  countOnlyStats: { maleCount: 0, femaleCount: 0, firstTimerCount: 0 },
  countOnlyScans: []
});

const renderPage = async () => {
  const view = render(<EventTemplateProvider><ProgramDetail /></EventTemplateProvider>);
  await screen.findByRole('heading', { name: 'Builders Night #12' });
  return view;
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.setItem('token', 't');
});

test('shows a live event with its numbers, chart and guests', async () => {
  getProgramDetailBootstrap.mockResolvedValue(boot());
  await renderPage();
  expect(screen.getByText('Live, accepting check-ins')).toBeInTheDocument();
  expect(screen.getByText('Busiest 30 minutes')).toBeInTheDocument();
  expect(screen.getByText('6:30 to 7:00 PM · 2 in')).toBeInTheDocument();
  expect(screen.getByText('Collects guest details')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'End Event' })).toBeInTheDocument();
  const table = screen.getByRole('table');
  expect(within(table).getByText('Chiamaka Eze')).toBeInTheDocument();
  expect(within(table).getByText('Pre-Registered')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Proxy/ }));
  expect(within(screen.getByRole('table')).queryByText('Chiamaka Eze')).not.toBeInTheDocument();
  expect(within(screen.getByRole('table')).getByText('Ifeanyi Obi')).toBeInTheDocument();
});

test('explains a number when its info button is pressed', async () => {
  getProgramDetailBootstrap.mockResolvedValue(boot());
  await renderPage();
  fireEvent.click(screen.getByRole('button', { name: 'About First Timer' }));
  expect(screen.getByRole('dialog', { name: 'First Timer' })).toHaveTextContent('first-timer');
  fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
  expect(screen.queryByRole('dialog', { name: 'First Timer' })).not.toBeInTheDocument();
});

test('counts down to an event that has not started', async () => {
  const later = new Date(Date.now() + 3 * 3600 * 1000);
  getProgramDetailBootstrap.mockResolvedValue(boot({ date: isoDay(later), startTime: `${pad(later.getHours())}:${pad(later.getMinutes())}`, endTime: '23:59', totalScans: 0 }, []));
  await renderPage();
  expect(screen.getByText(/^Starts (today|tomorrow) at/)).toBeInTheDocument();
  expect(screen.getByText(/Your QR code already works/)).toBeInTheDocument();
  expect(screen.getByText('No one has checked in yet')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'End Event' })).not.toBeInTheDocument();
});

test('ends the event after asking', async () => {
  getProgramDetailBootstrap.mockResolvedValue(boot());
  stopProgram.mockResolvedValue({ success: true });
  await renderPage();
  fireEvent.click(screen.getByRole('button', { name: 'End Event' }));
  const dialog = screen.getByRole('alertdialog', { name: 'End Builders Night #12?' });
  expect(dialog).toHaveTextContent('Your 3 check-ins and the report stay saved.');
  fireEvent.click(within(dialog).getByRole('button', { name: 'End event' }));
  await waitFor(() => expect(stopProgram).toHaveBeenCalledWith('12'));
  expect(await screen.findByText('Ended')).toBeInTheDocument();
  expect(screen.getByText('Scanning closed')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Export Report \(PDF\)/ })).toBeInTheDocument();
});

test('deletes the event from the menu and goes back to the list', async () => {
  getProgramDetailBootstrap.mockResolvedValue(boot());
  deleteProgram.mockResolvedValue({ success: true });
  await renderPage();
  fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Delete event' }));
  const dialog = screen.getByRole('alertdialog', { name: 'Delete Builders Night #12?' });
  expect(dialog).toHaveTextContent('This event is live.');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete event' }));
  await waitFor(() => expect(deleteProgram).toHaveBeenCalledWith('12'));
  expect(mockNavigate).toHaveBeenCalledWith('/programs', { replace: true });
});

test('marks a winner as gifted after asking', async () => {
  getProgramDetailBootstrap.mockResolvedValue(boot());
  markWinnerGifted.mockResolvedValue({ success: true });
  await renderPage();
  fireEvent.click(screen.getByRole('button', { name: 'Mark gifted' }));
  fireEvent.click(within(screen.getByRole('alertdialog', { name: 'Mark Chiamaka Eze as gifted?' })).getByRole('button', { name: 'Mark gifted' }));
  await waitFor(() => expect(markWinnerGifted).toHaveBeenCalledWith('12', 1));
  expect(await within(screen.getByRole('table')).findByText('Gifted')).toBeInTheDocument();
});

test('asks before turning off one check-in per phone', async () => {
  getProgramDetailBootstrap.mockResolvedValue(boot());
  updateStrictDeviceFingerprinting.mockResolvedValue({ strictDeviceFingerprinting: false });
  await renderPage();
  const rule = screen.getByRole('switch', { name: 'One check-in per phone' });
  fireEvent.click(rule);
  const dialog = screen.getByRole('alertdialog', { name: 'Turn off one check-in per phone?' });
  expect(dialog).toHaveTextContent('skewing your total attendance metrics');
  await act(async () => { fireEvent.click(within(dialog).getByRole('button', { name: 'Turn it off' })); });
  await waitFor(() => expect(rule).toHaveAttribute('aria-checked', 'false'));
  expect(updateStrictDeviceFingerprinting).toHaveBeenCalledWith('12', false);
});

test('shows the quick check-in numbers for a count-only event', async () => {
  getProgramDetailBootstrap.mockResolvedValue({
    ...boot({ trackingMode: 'count-only', dataFields: {}, giftingEnabled: false, totalScans: 10 }, []),
    countOnlyStats: { maleCount: 4, femaleCount: 6, firstTimerCount: 2 },
    countOnlyScans: [{ id: 1, gender: 'female', firstTimer: true, scanTime: '2026-11-02T18:41:00Z' }]
  });
  await renderPage();
  expect(screen.getByText('Count only')).toBeInTheDocument();
  expect(screen.getByText('60%')).toBeInTheDocument();
  expect(screen.queryByRole('switch', { name: 'One check-in per phone' })).not.toBeInTheDocument();
  expect(within(screen.getByRole('table')).getByText('Female')).toBeInTheDocument();
});

test('says so when the event cannot be found', async () => {
  const error = new Error('x');
  error.response = { status: 404 };
  getProgramDetailBootstrap.mockRejectedValue(error);
  const { getProgramById } = jest.requireMock('../api/programService');
  getProgramById.mockRejectedValue(error);
  render(<EventTemplateProvider><ProgramDetail /></EventTemplateProvider>);
  expect(await screen.findByText("We couldn't find this event")).toBeInTheDocument();
});

test("opens a guest's full answers when their row is pressed", async () => {
  getProgramDetailBootstrap.mockResolvedValue(boot({ customFormSchema: [{ id: 'q1', label: 'How did you hear about tonight?', type: 'radio', options: ['Instagram'] }] }, [
    { ...attendees[0], phoneNumber: '0803 412 9981', customResponses: { q1: 'Instagram' } }, attendees[1]
  ]));
  markWinnerGifted.mockResolvedValue({ success: true });
  await renderPage();
  fireEvent.click(screen.getByRole('button', { name: 'See details for Chiamaka Eze' }));
  const panel = screen.getByRole('dialog', { name: 'Chiamaka Eze' });
  expect(within(panel).getByText('Instagram')).toBeInTheDocument();
  expect(within(panel).getByText('RSVP pass')).toBeInTheDocument();
  fireEvent.click(within(panel).getByRole('button', { name: 'Mark gifted' }));
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Mark gifted' }));
  expect(await within(panel).findByText('Gift handed out.')).toBeInTheDocument();
  fireEvent.click(within(panel).getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog', { name: 'Chiamaka Eze' })).not.toBeInTheDocument();
});

test('adds someone by hand and checks the form first', async () => {
  getProgramDetailBootstrap.mockResolvedValue(boot());
  addManualAttendee.mockResolvedValue({ attendee: { id: 9, fullName: 'Musa Bello', emailAddress: 'musa@mail.com', registrationType: 'manual', checkedInAt: '2026-11-02T19:00:00Z' }, totalScans: 4 });
  await renderPage();
  fireEvent.click(screen.getByRole('button', { name: 'Add Manually' }));
  const modal = screen.getByRole('dialog', { name: /^Add .+ manually$/ });
  fireEvent.click(within(modal).getByRole('button', { name: 'Check them in' }));
  expect(within(modal).getByText('Full name is required')).toBeInTheDocument();
  expect(addManualAttendee).not.toHaveBeenCalled();
  fireEvent.change(within(modal).getByLabelText('Full name'), { target: { value: 'Musa Bello' } });
  fireEvent.change(within(modal).getByLabelText('Email address'), { target: { value: 'musa@mail.com' } });
  fireEvent.click(within(modal).getByRole('radio', { name: 'Male' }));
  fireEvent.click(within(modal).getByRole('button', { name: 'Check them in' }));
  await waitFor(() => expect(addManualAttendee).toHaveBeenCalledWith('12', expect.objectContaining({ fullName: 'Musa Bello', emailAddress: 'musa@mail.com', sex: 'Male' })));
  expect(await within(screen.getByRole('table')).findByText('Musa Bello')).toBeInTheDocument();
});

test('exports the guest list as a CSV file', async () => {
  getProgramDetailBootstrap.mockResolvedValue(boot());
  let saved = null;
  global.URL.createObjectURL = jest.fn((blob) => { saved = blob; return 'blob:x'; });
  global.URL.revokeObjectURL = jest.fn();
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  await renderPage();
  fireEvent.click(screen.getByRole('button', { name: /^Proxy/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Export Data' }));
  const modal = screen.getByRole('dialog', { name: /^Export/ });
  fireEvent.click(within(modal).getByRole('radio', { name: /Current filter: Proxy/ }));
  fireEvent.click(within(modal).getByRole('button', { name: 'Download CSV' }));
  expect(click).toHaveBeenCalled();
  const text = await new Promise((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsText(saved); });
  expect(text).toContain('Full name,Email address,Group,Gender,First-timer');
  expect(text).toContain('Ifeanyi Obi');
  expect(text).not.toContain('Chiamaka Eze');
  expect(screen.queryByRole('dialog', { name: /^Export/ })).not.toBeInTheDocument();
  click.mockRestore();
});

test('shows when check-in closes, 12 hours after the end time', async () => {
  getProgramDetailBootstrap.mockResolvedValue(boot());
  await renderPage();
  const closes = new Date(liveStart.getFullYear(), liveStart.getMonth(), liveStart.getDate(), 23, 59);
  closes.setHours(closes.getHours() + 12);
  const label = `${closes.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, 11:59 AM`;
  expect(screen.getByText(`Closes automatically ${label}`)).toBeInTheDocument();
});

test('an event more than 12 hours past its end time shows as ended, even before the server catches up', async () => {
  getProgramDetailBootstrap.mockResolvedValue(boot({ date: '2026-11-02', startTime: '18:00', endTime: '21:00', isActive: true }));
  await renderPage();
  expect(screen.getAllByText('Ended').length).toBeGreaterThan(0);
  expect(screen.queryByText(/Closes automatically/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^End / })).not.toBeInTheDocument();
});
