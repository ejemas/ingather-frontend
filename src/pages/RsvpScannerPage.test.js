import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RsvpScannerPage from './RsvpScannerPage';
import { checkInRsvpFromScanner, getRsvpScannerInfo } from '../api/rsvpScannerService';

const mockToast = { error: jest.fn(), success: jest.fn(), warning: jest.fn(), info: jest.fn() };
jest.mock('react-router-dom', () => ({ useParams: () => ({ scannerToken: 'scan-token-123456' }) }), { virtual: true });
jest.mock('../components/Toast', () => ({ useToast: () => mockToast }));
jest.mock('../utils/scanSounds', () => ({ isSoundMuted: () => false, toggleSoundMuted: () => true, playSuccessSound: jest.fn(), playErrorSound: jest.fn() }));
jest.mock('html5-qrcode', () => ({ Html5Qrcode: class { async start() { throw new Error('no camera'); } async stop() {} async clear() {} static async getCameras() { return []; } } }), { virtual: true });
jest.mock('../api/rsvpScannerService', () => ({ getRsvpScannerInfo: jest.fn(), checkInRsvpFromScanner: jest.fn() }));

const program = (over = {}) => ({ id: 5, title: 'Lagos Builders Summit', date: '2026-11-14', startTime: '09:00:00', endTime: '16:00:00', isActive: true, organizerName: 'Lagos Builders Community', flyerUrl: null, checkedInCount: 391, ...over });
const fail = (status, data) => { const e = new Error('x'); e.response = status ? { status, data } : undefined; return e; };

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
  getRsvpScannerInfo.mockResolvedValue({ program: program() });
});

const typeCode = async (value) => {
  fireEvent.change(await screen.findByLabelText("Can't scan? Type the pass code"), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Check in' }));
};

test('shows the event, its count, and a camera fallback', async () => {
  render(<RsvpScannerPage />);
  expect(await screen.findByText('Lagos Builders Summit')).toBeInTheDocument();
  expect(screen.getByText('391')).toBeInTheDocument();
  expect(await screen.findByText("Camera isn't available")).toBeInTheDocument();
});

test('checks a guest in by code, shows their name, raises the count and lists them', async () => {
  checkInRsvpFromScanner.mockResolvedValue({ attendee: { fullName: 'Chiamaka Eze', registrationType: 'rsvp', attendanceMode: 'physical', firstTimer: true }, attendeeTotal: 392 });
  render(<RsvpScannerPage />);
  await typeCode('a7k9q2m4');
  expect(await screen.findByText('Chiamaka Eze', { selector: '.ig-us-name' })).toBeInTheDocument();
  expect(checkInRsvpFromScanner).toHaveBeenCalledWith('scan-token-123456', 'a7k9q2m4');
  expect(screen.getByText('392')).toBeInTheDocument();
  expect(screen.getByText('First-timer')).toBeInTheDocument();
  expect(screen.getByText(/Checked in, /)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Scan next guest' }));
  expect(await screen.findByLabelText("Can't scan? Type the pass code")).toBeInTheDocument();
});

test('warns when a pass was already used', async () => {
  checkInRsvpFromScanner.mockRejectedValue(fail(409, { error: 'This RSVP has already checked in.', alreadyCheckedIn: true }));
  render(<RsvpScannerPage />);
  await typeCode('https://ingather.app/rsvp-checkin/K4M2ZZQ9');
  expect(await screen.findByText('Pass already used')).toBeInTheDocument();
  expect(screen.getByText('K4M2…Q9')).toBeInTheDocument();
});

test('says when a pass is not for this event', async () => {
  checkInRsvpFromScanner.mockRejectedValue(fail(404, { error: 'This RSVP QR code is not valid for this live event.' }));
  render(<RsvpScannerPage />);
  await typeCode('XXXX1234');
  expect(await screen.findByText('Pass not recognised')).toBeInTheDocument();
});

test('a lost connection is not treated as a bad pass', async () => {
  checkInRsvpFromScanner.mockRejectedValue(fail(null));
  render(<RsvpScannerPage />);
  await typeCode('A7K9Q2M4');
  await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith(expect.stringMatching(/No internet/)));
  expect(screen.queryByText('Pass not recognised')).not.toBeInTheDocument();
});

test('an ended event cannot check anyone in', async () => {
  getRsvpScannerInfo.mockResolvedValue({ program: program({ isActive: false }) });
  render(<RsvpScannerPage />);
  expect(await screen.findByText('Check-in has ended')).toBeInTheDocument();
  expect(screen.queryByLabelText("Can't scan? Type the pass code")).not.toBeInTheDocument();
});

test('explains a broken scanner link', async () => {
  getRsvpScannerInfo.mockRejectedValue(fail(404, { error: 'This RSVP scanner link is invalid.' }));
  render(<RsvpScannerPage />);
  expect(await screen.findByText('Scanner link not available')).toBeInTheDocument();
  expect(screen.getByText('This RSVP scanner link is invalid.')).toBeInTheDocument();
});
