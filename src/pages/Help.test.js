import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Help from './Help';
import { EventTemplateProvider } from '../context/EventTemplateContext';
import { createHelpTicket, getHelpTicket, getHelpTickets, replyToHelpTicket, solveHelpTicket } from '../api/helpService';

const mockToast = { error: jest.fn(), success: jest.fn(), warning: jest.fn(), info: jest.fn() };
const mockNavigate = jest.fn();
let mockParams = {};
let mockSearch = '';
const mockListeners = new Set();

jest.mock('react-router-dom', () => {
  const R = jest.requireActual('react');
  return {
    useParams: () => mockParams,
    useNavigate: () => mockNavigate,
    useSearchParams: () => {
      const [, force] = R.useState(0);
      R.useEffect(() => { const f = () => force((n) => n + 1); mockListeners.add(f); return () => mockListeners.delete(f); }, []);
      return [new URLSearchParams(mockSearch), (next) => { mockSearch = String(next); mockListeners.forEach((f) => f()); }];
    },
    Link: ({ to, children, ...props }) => <a href={String(to)} {...props}>{children}</a>
  };
}, { virtual: true });
jest.mock('../components/IgDashShell', () => {
  const actual = jest.requireActual('../components/IgDashShell');
  return { __esModule: true, ...actual, default: ({ children }) => <div>{children}</div> };
});
jest.mock('../components/Toast', () => ({ useToast: () => mockToast }));
jest.mock('../api/programService', () => ({ getDashboardBootstrap: jest.fn().mockResolvedValue(null) }));
jest.mock('../api/helpService', () => ({
  getHelpTickets: jest.fn(),
  getHelpEventOptions: jest.fn().mockResolvedValue({ events: [{ kind: 'program', id: 12, title: 'Builders Night #12', live: true }] }),
  createHelpTicket: jest.fn(),
  getHelpTicket: jest.fn(),
  replyToHelpTicket: jest.fn(),
  solveHelpTicket: jest.fn(),
  prepareScreenshot: jest.fn()
}));

const ticket = (over = {}) => ({ number: 1038, subject: 'Can I change the date of an RSVP page?', topicLabel: 'RSVP pages and passes', eventTitle: 'Lagos Builders Summit', urgent: false, status: 'replied', unread: true, contactEmail: 'hello@lb.org', createdAt: '2026-11-04T15:12:00Z', lastMessageAt: '2026-11-04T17:40:00Z', canReopen: true, ...over });
const renderPage = () => render(<EventTemplateProvider><Help /></EventTemplateProvider>);

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockSearch = '';
  localStorage.setItem('token', 'x');
});

test('lists open tickets with their status and shows solved ones on the other tab', async () => {
  getHelpTickets.mockResolvedValue({ tickets: [ticket(), ticket({ number: 1021, subject: 'Old logo on flyer', status: 'solved', unread: false })], contactEmail: 'hello@lb.org' });
  renderPage();
  expect(await screen.findByText('Can I change the date of an RSVP page?')).toBeInTheDocument();
  expect(screen.getByText('Ingather replied')).toBeInTheDocument();
  expect(screen.getByLabelText('New reply')).toBeInTheDocument();
  expect(screen.queryByText('Old logo on flyer')).not.toBeInTheDocument();
  expect(screen.getByText('Replies also go to hello@lb.org.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: /Solved/ }));
  expect(await screen.findByText('Old logo on flyer')).toBeInTheDocument();
});

test('shows a friendly empty state', async () => {
  getHelpTickets.mockResolvedValue({ tickets: [], contactEmail: 'hello@lb.org' });
  renderPage();
  expect(await screen.findByText('No tickets yet')).toBeInTheDocument();
});

test('new ticket checks the subject and message, then sends and opens the ticket', async () => {
  getHelpTickets.mockResolvedValue({ tickets: [], contactEmail: 'hello@lb.org' });
  createHelpTicket.mockResolvedValue({ ticket: ticket({ number: 1044 }) });
  mockSearch = 'new=1';
  renderPage();
  const dialog = await screen.findByRole('dialog', { name: 'New ticket' });
  fireEvent.click(screen.getByRole('button', { name: 'Send ticket' }));
  expect(screen.getByText('Add a short subject.')).toBeInTheDocument();
  expect(screen.getByText('Tell us a little about the problem.')).toBeInTheDocument();
  expect(createHelpTicket).not.toHaveBeenCalled();
  expect(dialog).toBeInTheDocument();

  await screen.findByRole('option', { name: 'Builders Night #12, live now' });
  fireEvent.click(screen.getByRole('radio', { name: 'Reports and exports' }));
  fireEvent.change(screen.getByLabelText(/Which event/), { target: { value: 'program:12' } });
  fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Export is empty' } });
  fireEvent.change(screen.getByLabelText('What happened?'), { target: { value: 'The CSV has no rows.' } });
  fireEvent.click(screen.getByRole('checkbox', { name: /My event is happening now/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Send ticket' }));
  await waitFor(() => expect(createHelpTicket).toHaveBeenCalledWith(expect.objectContaining({
    topic: 'data', subject: 'Export is empty', message: 'The CSV has no rows.', urgent: true, eventKind: 'program', eventId: '12'
  })));
  expect(mockToast.success).toHaveBeenCalledWith('Ticket #1044 sent. We will reply here and by email.');
  expect(mockNavigate).toHaveBeenCalledWith('/help/1044', { replace: true });
});

test('opens a conversation, sends a reply and marks it solved', async () => {
  mockParams = { number: '1038' };
  const messages = [
    { id: 1, author: 'organizer', authorName: 'Lagos Builders', body: 'We moved the Summit.', createdAt: '2026-11-04T15:12:00Z', screenshot: null },
    { id: 2, author: 'admin', authorName: 'Ada from Ingather', body: 'Yes. Open the Summit and choose Edit.', createdAt: '2026-11-04T17:40:00Z', screenshot: null }
  ];
  getHelpTicket.mockResolvedValue({ ticket: ticket(), messages });
  replyToHelpTicket.mockResolvedValue({ ticket: ticket({ status: 'waiting' }), messages: [...messages, { id: 3, author: 'organizer', authorName: 'Lagos Builders', body: 'Thank you!', createdAt: '2026-11-05T08:41:00Z', screenshot: null }] });
  solveHelpTicket.mockResolvedValue({ ticket: ticket({ status: 'solved', solvedAt: '2026-11-05T09:00:00Z' }), messages });
  renderPage();
  expect(await screen.findByRole('heading', { name: 'Can I change the date of an RSVP page?' })).toBeInTheDocument();
  expect(screen.getByText('Ada from Ingather')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Send reply' }));
  expect(screen.getByText('Write a reply first.')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Your reply'), { target: { value: 'Thank you!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send reply' }));
  expect(await screen.findByText('Thank you!')).toBeInTheDocument();
  expect(replyToHelpTicket).toHaveBeenCalledWith('1038', expect.objectContaining({ message: 'Thank you!' }));

  fireEvent.click(screen.getByRole('button', { name: 'Mark as solved' }));
  expect(await screen.findByText(/Solved. Reply any time within 14 days/)).toBeInTheDocument();
  expect(screen.queryByLabelText('Your reply')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Write back' }));
  expect(screen.getByLabelText('Your reply')).toBeInTheDocument();
});

test('a ticket closed for more than 14 days points to a new ticket', async () => {
  mockParams = { number: '1009' };
  getHelpTicket.mockResolvedValue({ ticket: ticket({ number: 1009, status: 'solved', canReopen: false }), messages: [] });
  renderPage();
  expect(await screen.findByText(/This ticket is closed/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'send a new ticket' })).toBeInTheDocument();
});

test('explains a ticket that does not exist', async () => {
  mockParams = { number: '9999' };
  const error = new Error('x');
  error.response = { status: 404, data: {} };
  getHelpTicket.mockRejectedValue(error);
  renderPage();
  expect(await screen.findByText("We couldn't find that ticket")).toBeInTheDocument();
});
