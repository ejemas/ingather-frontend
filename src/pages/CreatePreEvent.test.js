import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CreatePreEvent from './CreatePreEvent';
import { EventTemplateProvider } from '../context/EventTemplateContext';
import { createPreEvent } from '../api/preEventService';

const mockNavigate = jest.fn();
const mockToast = { error: jest.fn(), success: jest.fn(), warning: jest.fn() };

jest.mock('react-router-dom', () => ({
  useParams: () => ({}),
  useNavigate: () => mockNavigate,
  Link: ({ to, children, ...props }) => <a href={String(to)} {...props}>{children}</a>
}), { virtual: true });

jest.mock('../api/preEventService', () => ({
  createPreEvent: jest.fn(),
  getPublicPreEvent: jest.fn(),
  submitPreEventRsvp: jest.fn()
}));

jest.mock('../api/programService', () => ({
  getPrograms: jest.fn().mockResolvedValue({ programs: [] }),
  getDashboardBootstrap: jest.fn().mockResolvedValue(null)
}));

jest.mock('../components/IgDashShell', () => {
  const actual = jest.requireActual('../components/IgDashShell');
  return { __esModule: true, ...actual, default: ({ children }) => <div>{children}</div> };
});

jest.mock('../components/Toast', () => ({ useToast: () => mockToast }));

const renderPage = () => render(
  <EventTemplateProvider>
    <CreatePreEvent />
  </EventTemplateProvider>
);

const pad = (n) => String(n).padStart(2, '0');
const futureInput = () => {
  const d = new Date(Date.now() + 5 * 86400000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.setItem('token', 't');
});

test('shows field errors and does not call the server when required details are missing', async () => {
  renderPage();
  fireEvent.click(screen.getByRole('button', { name: 'Create RSVP page' }));
  expect(await screen.findByText('Give your event a name.')).toBeInTheDocument();
  expect(screen.getByText('Pick the date and time it starts.')).toBeInTheDocument();
  expect(createPreEvent).not.toHaveBeenCalled();
});

test('blocks a past date and asks for a city when Discover is on', async () => {
  renderPage();
  fireEvent.change(screen.getByLabelText('Event name'), { target: { value: 'Summit' } });
  fireEvent.change(screen.getByLabelText('Date and time'), { target: { value: '2020-01-01T09:00' } });
  fireEvent.click(screen.getByRole('switch', { name: /Show on Discover Events/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Create RSVP page' }));
  expect(await screen.findByText(/already passed/)).toBeInTheDocument();
  expect(screen.getByText('Add a city to show this page on Discover.')).toBeInTheDocument();
  expect(createPreEvent).not.toHaveBeenCalled();
});

test('sends the chosen fields and opens the new page', async () => {
  createPreEvent.mockResolvedValue({ preEvent: { id: 42 } });
  renderPage();
  fireEvent.change(screen.getByLabelText('Event name'), { target: { value: '  Lagos Builders Summit ' } });
  fireEvent.change(screen.getByLabelText('Date and time'), { target: { value: futureInput() } });
  fireEvent.click(screen.getByRole('button', { name: /Phone Number/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Create RSVP page' }));

  await waitFor(() => expect(createPreEvent).toHaveBeenCalledTimes(1));
  const payload = createPreEvent.mock.calls[0][0];
  expect(payload.title).toBe('Lagos Builders Summit');
  expect(payload.rsvpFields).toEqual(expect.objectContaining({ emailAddress: true, fullName: true, phoneNumber: true, school: false }));
  expect(payload.isRsvpActive).toBe(true);
  expect(payload.banner).toBeNull();
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/pre-events/42'));
});

test('puts a server field error next to the right field', async () => {
  createPreEvent.mockRejectedValue({ response: { data: { error: 'Community link 1 must use http:// or https://.', field: 'communityLinks' } } });
  renderPage();
  fireEvent.click(screen.getByRole('button', { name: 'Add link' }));
  fireEvent.change(screen.getByLabelText('Link'), { target: { value: 'https://chat.whatsapp.com/x' } });
  fireEvent.change(screen.getByLabelText('Event name'), { target: { value: 'Summit' } });
  fireEvent.change(screen.getByLabelText('Date and time'), { target: { value: futureInput() } });
  fireEvent.click(screen.getByRole('button', { name: 'Create RSVP page' }));
  expect(await screen.findByText('Community link 1 must use http:// or https://.')).toBeInTheDocument();
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('sends no closing time by default, so RSVPs close 12 hours after the start', async () => {
  createPreEvent.mockResolvedValue({ preEvent: { id: 7 } });
  renderPage();
  fireEvent.change(screen.getByLabelText('Event name'), { target: { value: 'Summit' } });
  fireEvent.change(screen.getByLabelText('Date and time'), { target: { value: futureInput() } });
  expect(screen.getByText(/RSVPs close automatically 12 hours after the event starts/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Create RSVP page' }));
  await waitFor(() => expect(createPreEvent).toHaveBeenCalledTimes(1));
  expect(createPreEvent.mock.calls[0][0].rsvpClosesAt).toBeNull();
});

test('checks a chosen closing time and sends it', async () => {
  createPreEvent.mockResolvedValue({ preEvent: { id: 8 } });
  renderPage();
  const start = futureInput();
  fireEvent.change(screen.getByLabelText('Event name'), { target: { value: 'Summit' } });
  fireEvent.change(screen.getByLabelText('Date and time'), { target: { value: start } });
  fireEvent.click(screen.getByRole('switch', { name: /Close RSVPs at a set time/ }));

  // More than 12 hours after the start is refused.
  const late = new Date(new Date(start).getTime() + 13 * 3600000);
  const local = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  fireEvent.change(screen.getByLabelText('RSVPs close on'), { target: { value: local(late) } });
  fireEvent.click(screen.getByRole('button', { name: 'Create RSVP page' }));
  expect(await screen.findByText('RSVPs can close no later than 12 hours after the event starts.')).toBeInTheDocument();
  expect(createPreEvent).not.toHaveBeenCalled();

  const earlier = new Date(new Date(start).getTime() - 24 * 3600000);
  fireEvent.change(screen.getByLabelText('RSVPs close on'), { target: { value: local(earlier) } });
  fireEvent.click(screen.getByRole('button', { name: 'Create RSVP page' }));
  await waitFor(() => expect(createPreEvent).toHaveBeenCalledTimes(1));
  expect(new Date(createPreEvent.mock.calls[0][0].rsvpClosesAt).getTime()).toBe(earlier.getTime());
});
