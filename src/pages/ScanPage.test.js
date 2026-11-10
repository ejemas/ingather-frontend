import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ScanPage from './ScanPage';
import { EventTemplateProvider } from '../context/EventTemplateContext';
import { getProgramInfo, submitScan, submitFormData, submitProxyAttendee, trackSponsorClick, updateScanData } from '../api/scanService';

const mockToast = { error: jest.fn(), success: jest.fn(), warning: jest.fn(), info: jest.fn() };

jest.mock('react-router-dom', () => ({ useParams: () => ({ programId: '12' }) }), { virtual: true });
jest.mock('../components/Toast', () => ({ useToast: () => mockToast }));
jest.mock('../utils/scanSounds', () => ({ playSuccessSound: jest.fn(), playErrorSound: jest.fn() }));
jest.mock('../api/scanService', () => ({
  getProgramInfo: jest.fn(),
  submitScan: jest.fn(),
  submitFormData: jest.fn(),
  submitFastTrackRsvp: jest.fn(),
  submitProxyAttendee: jest.fn(),
  updateScanData: jest.fn(),
  trackSponsorClick: jest.fn()
}));

const program = (over = {}) => ({
  id: 12, title: 'Lagos Builders Summit', churchName: 'Lagos Builders Community', date: '2026-11-14', startTime: '09:00:00', endTime: '16:00:00',
  trackingMode: 'collect-data', dataFields: { fullName: true, emailAddress: true, sex: true, firstTimer: true, fellowship: true },
  customFormSchema: [{ id: 'q1', label: 'How did you hear about this event?', type: 'radio', required: true, options: ['WhatsApp', 'Instagram'] }],
  giftingEnabled: false, proxyCheckinEnabled: false, fastTrackRsvpEnabled: false, isActive: true, ...over
});

const renderPage = () => render(<EventTemplateProvider><ScanPage /></EventTemplateProvider>);

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.setItem('ingather_device_fingerprint_v1', 'fp-1');
  submitScan.mockResolvedValue({ scanSessionId: 's1', scanSessionToken: 't1' });
  Element.prototype.scrollIntoView = jest.fn();
});

test('shows the event and the check-in form, and checks answers before sending', async () => {
  getProgramInfo.mockResolvedValue(program());
  submitFormData.mockResolvedValue({ giftingEnabled: false });
  renderPage();
  expect(await screen.findByRole('heading', { name: 'Lagos Builders Summit' })).toBeInTheDocument();
  expect(screen.getByText('Sat, 14 Nov, 9:00 AM to 4:00 PM')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Complete check-in' }));
  expect(screen.getByText('Full name is required')).toBeInTheDocument();
  expect(screen.getByText('How did you hear about this event? is required')).toBeInTheDocument();
  expect(submitFormData).not.toHaveBeenCalled();

  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Chiamaka Eze' } });
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'chi@mail.com' } });
  fireEvent.click(screen.getByRole('radio', { name: 'Female' }));
  fireEvent.click(screen.getByLabelText('Instagram'));
  fireEvent.click(screen.getByLabelText(/I'm a first-timer/));
  fireEvent.click(screen.getByRole('button', { name: 'Complete check-in' }));
  await waitFor(() => expect(submitFormData).toHaveBeenCalledWith('12', 'fp-1', expect.objectContaining({
    fullName: 'Chiamaka Eze', emailAddress: 'chi@mail.com', sex: 'Female', firstTimer: true, customResponses: { q1: 'Instagram' }
  }), 't1', 's1'));
});

test('shows answers the server rejects next to the right field', async () => {
  getProgramInfo.mockResolvedValue(program({ customFormSchema: [] }));
  const error = new Error('x');
  error.response = { status: 400, data: { error: 'Please complete the required attendee fields', errors: { emailAddress: 'Enter a valid email address' } } };
  submitFormData.mockRejectedValue(error);
  renderPage();
  await screen.findByLabelText('Full name');
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Chiamaka Eze' } });
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'chi@mail.com' } });
  fireEvent.click(screen.getByRole('radio', { name: 'Female' }));
  fireEvent.click(screen.getByRole('button', { name: 'Complete check-in' }));
  expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
});

test('quick check-in for count-only events needs a gender first', async () => {
  getProgramInfo.mockResolvedValue(program({ trackingMode: 'count-only' }));
  updateScanData.mockResolvedValue({});
  renderPage();
  const button = await screen.findByRole('button', { name: 'Complete check-in' });
  expect(button).toBeDisabled();
  fireEvent.click(screen.getByRole('radio', { name: 'Male' }));
  fireEvent.click(screen.getByLabelText(/I'm a first-timer/));
  fireEvent.click(button);
  await waitFor(() => expect(updateScanData).toHaveBeenCalledWith('12', 'fp-1', 'male', true, 't1', 's1'));
});

test('tells a guest this phone already checked in', async () => {
  getProgramInfo.mockResolvedValue(program());
  const error = new Error('x');
  error.response = { status: 400, data: { alreadyScanned: true } };
  submitScan.mockRejectedValue(error);
  renderPage();
  expect(await screen.findByRole('heading', { name: "You're already checked in" })).toBeInTheDocument();
});

test('says when check-in has closed', async () => {
  getProgramInfo.mockResolvedValue(program({ isActive: false }));
  renderPage();
  expect(await screen.findByRole('heading', { name: 'Check-in has closed' })).toBeInTheDocument();
  expect(submitScan).not.toHaveBeenCalled();
});

test('explains a wrong link', async () => {
  const error = new Error('x');
  error.response = { status: 404, data: { error: 'Program not found' } };
  getProgramInfo.mockRejectedValue(error);
  renderPage();
  expect(await screen.findByRole('heading', { name: /This check-in link isn't/ })).toBeInTheDocument();
});

test('lets a guest try again when there is no internet', async () => {
  getProgramInfo.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce(program());
  renderPage();
  fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
  expect(await screen.findByLabelText('Full name')).toBeInTheDocument();
  expect(submitScan).toHaveBeenCalledTimes(1);
});

const fillMainForm = async () => {
  fireEvent.change(await screen.findByLabelText('Full name'), { target: { value: 'Chiamaka Eze' } });
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'chi@mail.com' } });
  fireEvent.click(screen.getByRole('radio', { name: 'Female' }));
};

test('welcomes the guest by name and shows the sponsors, counting clicks', async () => {
  getProgramInfo.mockResolvedValue(program({ customFormSchema: [] }));
  submitScan.mockResolvedValue({ scanSessionId: 's1', scanSessionToken: 't1', sponsorPlacement: { mode: 'carousel', sponsors: [{ id: 7, sponsorName: 'Paystack', ctaText: 'Claim the offer', ctaLink: 'https://paystack.com' }] } });
  submitFormData.mockResolvedValue({ giftingEnabled: false });
  trackSponsorClick.mockResolvedValue({});
  const open = jest.spyOn(window, 'open').mockImplementation(() => null);
  window.scrollTo = jest.fn();
  renderPage();
  await fillMainForm();
  fireEvent.click(screen.getByRole('button', { name: 'Complete check-in' }));
  expect(await screen.findByRole('heading', { name: /You're in,\s*Chiamaka/ })).toBeInTheDocument();
  expect(screen.getByText('From our sponsor')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Claim the offer' }));
  await waitFor(() => expect(trackSponsorClick).toHaveBeenCalledWith(7, 'fp-1'));
  expect(open).toHaveBeenCalledWith('https://paystack.com', '_blank', 'noopener,noreferrer');
  open.mockRestore();
});

test('tells a gift winner how to collect it', async () => {
  getProgramInfo.mockResolvedValue(program({ customFormSchema: [], giftingEnabled: true }));
  submitFormData.mockResolvedValue({ giftingEnabled: true, isWinner: true });
  window.scrollTo = jest.fn();
  renderPage();
  await fillMainForm();
  fireEvent.click(screen.getByRole('button', { name: 'Complete check-in' }));
  expect(await screen.findByRole('heading', { name: 'You won a gift, Chiamaka!' })).toBeInTheDocument();
  expect(screen.getByText('Go to the ushering stand.')).toBeInTheDocument();
});

test('lets a guest check in someone with them, then continue', async () => {
  getProgramInfo.mockResolvedValue(program({ customFormSchema: [], proxyCheckinEnabled: true }));
  submitFormData.mockResolvedValue({ giftingEnabled: false });
  submitProxyAttendee.mockResolvedValue({ proxyCount: 1 });
  window.scrollTo = jest.fn();
  renderPage();
  await fillMainForm();
  fireEvent.click(screen.getByRole('button', { name: 'Complete check-in' }));
  expect(await screen.findByRole('heading', { name: 'Checking in someone with you?' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Yes, add a guest' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Check in guest' }));
  expect(screen.getByText('Full name is required')).toBeInTheDocument();
  expect(submitProxyAttendee).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Guest's full name"), { target: { value: 'Tolu Ade' } });
  fireEvent.change(screen.getByLabelText("Guest's email address"), { target: { value: 'tolu@mail.com' } });
  fireEvent.click(screen.getByRole('radio', { name: 'Male' }));
  fireEvent.click(screen.getByRole('button', { name: 'Check in guest' }));
  await waitFor(() => expect(submitProxyAttendee).toHaveBeenCalledWith('12', 'fp-1', expect.objectContaining({ fullName: 'Tolu Ade', sex: 'Male' })));
  expect(await screen.findByText('1 of 3 guests added')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: "No, I'm done" }));
  expect(await screen.findByRole('heading', { name: /You're in,\s*Chiamaka/ })).toBeInTheDocument();
});

test('count-only guests see a simple checked-in screen', async () => {
  getProgramInfo.mockResolvedValue(program({ trackingMode: 'count-only' }));
  updateScanData.mockResolvedValue({});
  window.scrollTo = jest.fn();
  renderPage();
  fireEvent.click(await screen.findByRole('radio', { name: 'Female' }));
  fireEvent.click(screen.getByRole('button', { name: 'Complete check-in' }));
  expect(await screen.findByRole('heading', { name: "You're checked in" })).toBeInTheDocument();
});

test('a fast double tap sends the check-in only once', async () => {
  getProgramInfo.mockResolvedValue(program({ customFormSchema: [] }));
  let finish;
  submitFormData.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  window.scrollTo = jest.fn();
  renderPage();
  await fillMainForm();
  const form = screen.getByRole('button', { name: 'Complete check-in' }).closest('form');
  fireEvent.submit(form);
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(submitFormData).toHaveBeenCalledTimes(1);
  finish({ giftingEnabled: false });
  expect(await screen.findByRole('heading', { name: /You're in,\s*Chiamaka/ })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: "You're already checked in" })).not.toBeInTheDocument();
});

test('a guest the server already saved sees their success screen, not "phone already used"', async () => {
  getProgramInfo.mockResolvedValue(program({ customFormSchema: [] }));
  const error = new Error('x');
  error.response = { status: 400, data: { error: 'Form already submitted for this scan' } };
  submitFormData.mockRejectedValue(error);
  window.scrollTo = jest.fn();
  renderPage();
  await fillMainForm();
  fireEvent.click(screen.getByRole('button', { name: 'Complete check-in' }));
  expect(await screen.findByRole('heading', { name: /You're in,\s*Chiamaka/ })).toBeInTheDocument();
  expect(screen.queryByText(/already been used/)).not.toBeInTheDocument();
});

test('with the phone rule off, a phone that checked in before can check in another guest', async () => {
  getProgramInfo.mockResolvedValue(program({ customFormSchema: [], strictDeviceFingerprinting: false }));
  submitScan.mockResolvedValue({ scanSessionId: 's2', scanSessionToken: 't2' });
  submitFormData.mockResolvedValue({ giftingEnabled: false });
  window.scrollTo = jest.fn();
  renderPage();
  await fillMainForm();
  fireEvent.click(screen.getByRole('button', { name: 'Complete check-in' }));
  await waitFor(() => expect(submitFormData).toHaveBeenCalledWith('12', 'fp-1', expect.any(Object), 't2', 's2'));
  expect(await screen.findByRole('heading', { name: /You're in,\s*Chiamaka/ })).toBeInTheDocument();
});
