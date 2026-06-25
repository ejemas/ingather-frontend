import API from './axios';

export const createProgram = async (data) => {
  const response = await API.post('/programs', data);
  return response.data;
};

export const getPrograms = async () => {
  const response = await API.get('/programs');
  return response.data;
};

export const getDashboardBootstrap = async (startDate, endDate) => {
  const params = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  const response = await API.get('/programs/dashboard-bootstrap', { params });
  return response.data;
};

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
