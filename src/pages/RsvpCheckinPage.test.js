import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import RsvpCheckinPage from './RsvpCheckinPage';
import { getRsvpPass } from '../api/preEventService';

jest.mock('react-router-dom', () => ({
  useParams: () => ({ token: 'a7k9-q2m4' }),
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>
}), { virtual: true });
jest.mock('qrcode.react', () => ({ QRCodeCanvas: ({ value }) => <canvas data-testid="qr" data-value={value} /> }), { virtual: true });
jest.mock('../api/preEventService', () => ({ getRsvpPass: jest.fn() }));

const pass = (over = {}, event = {}) => ({ pass: {
  guestName: 'Chiamaka Eze', attendanceMode: 'physical', checkedIn: false, checkedInAt: null, code: 'A7K9Q2M4',
  event: { title: 'Lagos Builders Summit', organizerName: 'Lagos Builders Community', eventDate: '2026-11-14T09:00:00', venueName: 'Landmark Centre', city: 'Lagos', bannerUrl: null, slug: 'lagos-builders-summit', virtualAttendanceEnabled: false, checkInClosed: false, ...event },
  ...over
} });
const fail = (status) => { const e = new Error('x'); e.response = status ? { status, data: {} } : undefined; return e; };

beforeEach(() => jest.clearAllMocks());

test('shows the guest their pass with the QR, details and backup code', async () => {
  getRsvpPass.mockResolvedValue(pass());
  render(<RsvpCheckinPage />);
  expect(await screen.findByText('Chiamaka Eze')).toBeInTheDocument();
  expect(screen.getByText('Lagos Builders Summit')).toBeInTheDocument();
  expect(screen.getByText('In person')).toBeInTheDocument();
  expect(screen.getByText('Landmark Centre, Lagos')).toBeInTheDocument();
  expect(screen.getByText('A7K9Q2M4')).toBeInTheDocument();
  expect(screen.getByTestId('qr')).toHaveAttribute('data-value', 'https://ingather.app/rsvp-checkin/a7k9-q2m4');
  expect(screen.getByRole('link', { name: 'View event details' })).toHaveAttribute('href', '/rsvp/lagos-builders-summit');
});

test('an online guest does not see a venue', async () => {
  getRsvpPass.mockResolvedValue(pass({ attendanceMode: 'virtual' }));
  render(<RsvpCheckinPage />);
  expect(await screen.findByText('Online')).toBeInTheDocument();
  expect(screen.queryByText('Venue')).not.toBeInTheDocument();
});

test('after check-in the QR is replaced by a confirmation', async () => {
  getRsvpPass.mockResolvedValue(pass({ checkedIn: true, checkedInAt: '2026-11-14T09:42:00' }));
  render(<RsvpCheckinPage />);
  expect(await screen.findByText("You're checked in")).toBeInTheDocument();
  expect(screen.queryByTestId('qr')).not.toBeInTheDocument();
  expect(screen.queryByText('A7K9Q2M4')).not.toBeInTheDocument();
});

test('says when check-in has closed', async () => {
  getRsvpPass.mockResolvedValue(pass({}, { checkInClosed: true }));
  render(<RsvpCheckinPage />);
  expect(await screen.findByText(/Check-in has closed/)).toBeInTheDocument();
});

test('without internet the QR and code still show', async () => {
  getRsvpPass.mockRejectedValueOnce(fail(null)).mockResolvedValueOnce(pass());
  render(<RsvpCheckinPage />);
  expect(await screen.findByText(/couldn't load the event details/)).toBeInTheDocument();
  expect(screen.getByTestId('qr')).toBeInTheDocument();
  expect(screen.getByText('A7K9Q2M4')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('Chiamaka Eze')).toBeInTheDocument();
});

test('explains a broken pass link', async () => {
  getRsvpPass.mockRejectedValue(fail(404));
  render(<RsvpCheckinPage />);
  expect(await screen.findByRole('heading', { name: "This pass link isn't working" })).toBeInTheDocument();
  expect(screen.queryByTestId('qr')).not.toBeInTheDocument();
});
