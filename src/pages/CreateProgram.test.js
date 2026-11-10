import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import CreateProgram from './CreateProgram';
import { EventTemplateProvider } from '../context/EventTemplateContext';
import { createProgram, getProgramForEdit, updateProgram } from '../api/programService';

const mockNavigate = jest.fn();
let mockParams = {};
const mockToast = { error: jest.fn(), success: jest.fn(), warning: jest.fn(), info: jest.fn() };

jest.mock('react-router-dom', () => ({
  useParams: () => mockParams,
  useNavigate: () => mockNavigate,
  Link: ({ to, children, ...props }) => <a href={String(to)} {...props}>{children}</a>
}), { virtual: true });

jest.mock('../api/programService', () => ({
  createProgram: jest.fn(),
  getProgramForEdit: jest.fn(),
  updateProgram: jest.fn(),
  getPrograms: jest.fn().mockResolvedValue({ programs: [] }),
  getDashboardBootstrap: jest.fn().mockResolvedValue(null)
}));

jest.mock('../components/IgDashShell', () => {
  const actual = jest.requireActual('../components/IgDashShell');
  return { __esModule: true, ...actual, default: ({ children }) => <div>{children}</div> };
});

jest.mock('../components/Toast', () => ({ useToast: () => mockToast }));

jest.mock('../utils/flyerCompression', () => ({
  compressFlyerImage: jest.fn(async (file) => file),
  fileToDataUrl: jest.fn(async () => 'data:image/png;base64,SU1H'),
  formatFileSize: (size) => `${size} B`
}));

const renderPage = () => render(
  <EventTemplateProvider>
    <CreateProgram />
  </EventTemplateProvider>
);

const fillBasics = () => {
  fireEvent.change(screen.getByLabelText('Event Title'), { target: { value: '  Builders Night #13 ' } });
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-11-30' } });
  fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '18:00' } });
  fireEvent.change(screen.getByLabelText('End time'), { target: { value: '21:00' } });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  localStorage.setItem('token', 't');
  global.URL.createObjectURL = jest.fn(() => 'blob:preview');
  global.URL.revokeObjectURL = jest.fn();
});

test('lists what to fix and does not call the server when details are missing', async () => {
  renderPage();
  fireEvent.click(screen.getByRole('button', { name: 'Create event' }));
  const summary = await screen.findByRole('alert');
  expect(summary).toHaveTextContent('Fix 4 things to create this event');
  expect(within(summary).getByRole('button', { name: 'Give your event a name' })).toBeInTheDocument();
  expect(createProgram).not.toHaveBeenCalled();
});

test('refuses an end time before the start time', async () => {
  renderPage();
  fillBasics();
  fireEvent.change(screen.getByLabelText('End time'), { target: { value: '17:30' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create event' }));
  expect(await screen.findAllByText('Must be after the start time')).not.toHaveLength(0);
  expect(createProgram).not.toHaveBeenCalled();
});

test('creates a count-only event with no form fields', async () => {
  createProgram.mockResolvedValue({ program: { id: 9 } });
  renderPage();
  fillBasics();
  fireEvent.click(screen.getByRole('button', { name: 'Create event' }));
  await waitFor(() => expect(createProgram).toHaveBeenCalledTimes(1));
  const payload = createProgram.mock.calls[0][0];
  expect(payload.programTitle).toBe('Builders Night #13');
  expect(payload.trackingMode).toBe('count-only');
  expect(Object.values(payload.dataFields).some(Boolean)).toBe(false);
  expect(payload.enableGifting).toBe(false);
  expect(payload.strictDeviceFingerprinting).toBe(true);
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/program/9'));
});

test('collects details, keeps Full Name for the personalized flyer, and sends gifting', async () => {
  createProgram.mockResolvedValue({ program: { id: 10 } });
  renderPage();
  fillBasics();
  fireEvent.click(screen.getByRole('radio', { name: /Collect details/ }));
  expect(screen.getByRole('button', { name: /Full Name/ })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: /^Gender/ }));

  fireEvent.click(screen.getByRole('tab', { name: /Personalized flyer/ }));
  fireEvent.click(screen.getByRole('button', { name: /Full Name/ }));
  expect(screen.getByRole('button', { name: /Full Name/ })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.change(screen.getByLabelText('Messages'), { target: { value: '[FirstName], welcome!\n[FirstName], you made it.' } });

  fireEvent.click(screen.getByRole('switch', { name: /Pick gift winners/ }));
  fireEvent.click(screen.getByRole('button', { name: 'More winners' }));
  fireEvent.click(screen.getByRole('button', { name: 'Create event' }));

  await waitFor(() => expect(createProgram).toHaveBeenCalledTimes(1));
  const payload = createProgram.mock.calls[0][0];
  expect(payload.trackingMode).toBe('collect-data');
  expect(payload.dataFields).toEqual(expect.objectContaining({ fullName: true, phoneNumber: true, sex: true }));
  expect(payload.flyerType).toBe('personalized');
  expect(payload.personalizedFlyerConfig.templates).toEqual(['[FirstName], welcome!', '[FirstName], you made it.']);
  expect(payload.enableGifting).toBe(true);
  expect(payload.numberOfWinners).toBe(2);
});

test('asks before allowing more than one check-in per phone', async () => {
  renderPage();
  fireEvent.click(screen.getByRole('radio', { name: /Collect details/ }));
  const rule = screen.getByRole('switch', { name: /One check-in per phone/ });
  fireEvent.click(rule);
  const dialog = screen.getByRole('alertdialog', { name: 'Turn off one check-in per phone?' });
  expect(within(dialog).getByText(/skewing your total attendance metrics/)).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  expect(rule).toHaveAttribute('aria-checked', 'true');
  fireEvent.click(rule);
  fireEvent.click(screen.getByRole('button', { name: 'Turn it off' }));
  expect(rule).toHaveAttribute('aria-checked', 'false');
});

test('explains letting guests check in others before switching it', async () => {
  renderPage();
  fireEvent.click(screen.getByRole('radio', { name: /Collect details/ }));
  const proxy = screen.getByRole('switch', { name: /Let guests check in others/ });
  fireEvent.click(proxy);
  const on = screen.getByRole('alertdialog', { name: 'Let guests check in others?' });
  expect(within(on).getByText(/arrive in a group/)).toBeInTheDocument();
  fireEvent.click(within(on).getByRole('button', { name: 'Cancel' }));
  expect(proxy).toHaveAttribute('aria-checked', 'false');
  fireEvent.click(proxy);
  fireEvent.click(screen.getByRole('button', { name: 'Turn it on' }));
  expect(proxy).toHaveAttribute('aria-checked', 'true');
  fireEvent.click(proxy);
  expect(screen.getByRole('alertdialog', { name: 'Stop guests checking in others?' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Turn it off' }));
  expect(proxy).toHaveAttribute('aria-checked', 'false');
});

test('shows a live preview of the guest screens that follows the form', async () => {
  const { container } = renderPage();
  const aside = container.querySelector('.ig-ce-aside');
  fireEvent.change(screen.getByLabelText('Event Title'), { target: { value: 'Builders Night #13' } });
  expect(within(aside).getByText('Builders Night #13')).toBeInTheDocument();
  expect(within(aside).getByText('check-in')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('radio', { name: /Collect details/ }));
  expect(within(aside).getByText('who you are')).toBeInTheDocument();
  fireEvent.click(within(aside).getByRole('tab', { name: 'After check-in' }));
  expect(within(aside).getByText(/You're in, Chiamaka/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
  const sheet = screen.getByRole('dialog', { name: 'Preview what guests see' });
  fireEvent.click(within(sheet).getByRole('button', { name: 'Done' }));
  expect(screen.queryByRole('dialog', { name: 'Preview what guests see' })).not.toBeInTheDocument();
});

test('adds a sponsor through the popup and checks the button link', async () => {
  createProgram.mockResolvedValue({ program: { id: 11 } });
  const { container } = renderPage();
  fillBasics();
  fireEvent.click(screen.getByRole('tab', { name: /Sponsors/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Add sponsor' }));

  const dialog = screen.getByRole('dialog', { name: 'Add a sponsor' });
  fireEvent.change(within(dialog).getByLabelText('Sponsor name'), { target: { value: 'Paystack' } });
  fireEvent.change(container.querySelector('.ig-ce-sponsor-modal input[type="file"]'), { target: { files: [new File(['x'], 'p.png', { type: 'image/png' })] } });
  await within(dialog).findByText('p.png');
  fireEvent.change(within(dialog).getByLabelText('Button link'), { target: { value: 'paystack.com' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Add sponsor' }));
  expect(within(dialog).getByText('Add a button link that starts with https://')).toBeInTheDocument();

  fireEvent.change(within(dialog).getByLabelText('Button link'), { target: { value: 'https://paystack.com' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Add sponsor' }));
  expect(screen.queryByRole('dialog', { name: 'Add a sponsor' })).not.toBeInTheDocument();
  expect(container.querySelector('.ig-ce-sponsor')).toHaveTextContent('Paystack');

  fireEvent.click(screen.getByRole('button', { name: 'Create event' }));
  await waitFor(() => expect(createProgram).toHaveBeenCalledTimes(1));
  const payload = createProgram.mock.calls[0][0];
  expect(payload.sponsors).toEqual([
    expect.objectContaining({ sponsorName: 'Paystack', ctaLink: 'https://paystack.com', flyer: expect.objectContaining({ dataUrl: 'data:image/png;base64,SU1H' }) })
  ]);
});

test('shows a server field error in the summary', async () => {
  createProgram.mockRejectedValue({ response: { data: { error: 'End time must be after the start time.', field: 'endTime' } } });
  renderPage();
  fillBasics();
  fireEvent.click(screen.getByRole('button', { name: 'Create event' }));
  const summary = await screen.findByRole('alert');
  expect(summary).toHaveTextContent('End time must be after the start time.');
  expect(mockNavigate).not.toHaveBeenCalled();
});

/* ---------------- Edit Event ---------------- */
const savedEvent = (over = {}) => ({
  id: 12,
  title: 'Builders Night #12',
  date: '2026-11-30',
  startTime: '18:00',
  endTime: '21:00',
  trackingMode: 'collect-data',
  dataFields: { fullName: true, phoneNumber: true },
  dataFieldConfig: { textareaLabel: 'Additional Response' },
  customFormSchema: [{ id: 'cf1', label: 'How did you hear?', type: 'radio', required: false, options: ['A friend', 'Instagram'] }],
  giftingEnabled: true,
  totalWinners: 6,
  winnersSelected: 0,
  flyerType: 'standard',
  flyerUrl: 'https://cdn.example.com/flyer.jpg',
  flyerOriginalName: 'flyer.jpg',
  personalizedFlyerConfig: null,
  sponsorDisplayMode: 'carousel',
  sponsorExpectedAttendees: null,
  proxyCheckinEnabled: false,
  strictDeviceFingerprinting: true,
  isActive: true,
  checkinsCount: 0,
  locked: false,
  sponsors: [{ id: 'sp-1', sponsorName: 'Paystack', flyerUrl: 'https://cdn.example.com/p.jpg', flyerOriginalName: 'p.jpg', ctaText: 'Learn More', ctaLink: 'https://paystack.com', boothText: '', campaignTag: '', tier: 'Headline', distributionPercentage: null, clickCount: 14 }],
  ...over
});

test('edit: fills in the saved event and saves only real changes', async () => {
  mockParams = { id: '12' };
  getProgramForEdit.mockResolvedValue({ program: savedEvent() });
  updateProgram.mockResolvedValue({ program: savedEvent() });
  renderPage();

  expect(await screen.findByDisplayValue('Builders Night #12')).toBeInTheDocument();
  expect(screen.getByRole('status', { name: '' })).toHaveTextContent('Not started');
  const save = screen.getByRole('button', { name: 'Save changes' });
  expect(save).toBeDisabled();

  fireEvent.change(screen.getByLabelText('Event Title'), { target: { value: 'Builders Night #12 (Rooftop)' } });
  expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Remove flyer' }));
  fireEvent.click(save);

  await waitFor(() => expect(updateProgram).toHaveBeenCalledTimes(1));
  const [id, payload] = updateProgram.mock.calls[0];
  expect(id).toBe('12');
  expect(payload.programTitle).toBe('Builders Night #12 (Rooftop)');
  expect(payload.removeEventFlyer).toBe(true);
  expect(payload.sponsors).toEqual([expect.objectContaining({ id: 'sp-1', sponsorName: 'Paystack', flyer: null })]);
  expect(payload.customFormSchema).toHaveLength(1);
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/program/12'));
});

test('edit: once guests have checked in, the date, start, method and form are locked', async () => {
  mockParams = { id: '13' };
  getProgramForEdit.mockResolvedValue({ program: savedEvent({ id: 13, locked: true, checkinsCount: 186, winnersSelected: 4 }) });
  renderPage();

  expect(await screen.findByText(/186 guests have checked in/)).toBeInTheDocument();
  expect(screen.getByLabelText('Date')).toBeDisabled();
  expect(screen.getByLabelText('Start time')).toBeDisabled();
  expect(screen.getByLabelText('End time')).not.toBeDisabled();
  expect(screen.getByRole('radio', { name: /Count only/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Full Name/ })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Add Question' })).not.toBeInTheDocument();
  expect(screen.getByText('4 already drawn. You can add more, but not fewer.')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Number of winners'), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(await screen.findByRole('button', { name: /4 winners have already been drawn/ })).toBeInTheDocument();
  expect(updateProgram).not.toHaveBeenCalled();
});

test('edit: asks before throwing changes away and returns to the event', async () => {
  mockParams = { id: '12' };
  getProgramForEdit.mockResolvedValue({ program: savedEvent() });
  renderPage();
  await screen.findByDisplayValue('Builders Night #12');
  fireEvent.change(screen.getByLabelText('Event Title'), { target: { value: 'Changed' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByRole('alertdialog', { name: 'Discard your changes?' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
  expect(mockNavigate).toHaveBeenCalledWith('/program/12');
});

test('edit: says so when the event does not exist', async () => {
  mockParams = { id: '404' };
  getProgramForEdit.mockRejectedValue({ response: { status: 404 } });
  renderPage();
  expect(await screen.findByText("This event doesn't exist")).toBeInTheDocument();
});
