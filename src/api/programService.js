import API from './axios';
import { rememberDashboard } from './dashboardCache';

export const createProgram = async (data) => {
  const response = await API.post('/programs', data);
  return response.data;
};

export const getPrograms = async () => {
  const response = await API.get('/programs');
  return response.data;
};

// Pages pass { fresh: true } when they must show the latest numbers (the main Dashboard).
// Other pages reuse an answer from the last 30 seconds, so switching pages is instant.
export const getDashboardBootstrap = async (startDate, endDate, today, { fresh = false } = {}) => (
  rememberDashboard([startDate || '', endDate || '', today || ''], async () => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (today) params.today = today;
    const response = await API.get('/programs/dashboard-bootstrap', { params });
    return response.data;
  }, { fresh })
);

export const getDashboardStats = async (startDate, endDate) => {
  const params = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  const response = await API.get('/programs/dashboard-stats', { params });
  return response.data;
};

export const getProgramById = async (id) => {
  const response = await API.get(`/programs/${id}`);
  return response.data;
};

// Everything the Edit Event page needs, including sponsors and how many guests have checked in.
export const getProgramForEdit = async (id) => {
  const response = await API.get(`/programs/${id}/edit`);
  return response.data;
};

// Saves changes to an event. Its QR code and check-in links stay the same.
export const updateProgram = async (id, data) => {
  const response = await API.put(`/programs/${id}`, data);
  return response.data;
};

export const getProgramDetailBootstrap = async (id) => {
  const response = await API.get(`/programs/${id}/detail-bootstrap`);
  return response.data;
};

export const getSponsorAnalytics = async (id) => {
  const response = await API.get(`/programs/${id}/sponsor-analytics`);
  return response.data;
};

export const stopProgram = async (id) => {
  const response = await API.put(`/programs/${id}/stop`);
  return response.data;
};

export const getAttendees = async (id) => {
  const response = await API.get(`/programs/${id}/attendees`);
  return response.data;
};

export const addManualAttendee = async (id, formData) => {
  const response = await API.post(`/programs/${id}/attendees/manual`, { formData });
  return response.data;
};

export const checkInRsvpQr = async (id, token) => {
  const response = await API.post(`/programs/${id}/rsvp-qr-checkin`, { token });
  return response.data;
};

export const getRsvpScannerLink = async (id) => {
  const response = await API.get(`/programs/${id}/rsvp-scanner-link`);
  return response.data;
};

export const updateStrictDeviceFingerprinting = async (id, strictDeviceFingerprinting) => {
  const response = await API.put(`/programs/${id}/strict-device-fingerprinting`, {
    strictDeviceFingerprinting
  });
  return response.data;
};

export const getAttendanceData = async (id, tzOffset = 0) => {
  const response = await API.get(`/programs/${id}/attendance-data`, {
    params: { tzOffset }
  });
  return response.data;
};

export const markWinnerGifted = async (programId, attendeeId) => {
  const response = await API.put(`/programs/${programId}/attendees/${attendeeId}/gift-claimed`);
  return response.data;
};

export const deleteProgram = async (id) => {
  const response = await API.delete(`/programs/${id}`);
  return response.data;
};
