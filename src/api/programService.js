import API from './axios';

export const createProgram = async (data) => {
  const response = await API.post('/programs', data);
  return response.data;
};

export const getPrograms = async () => {
  const response = await API.get('/programs');
  return response.data;
};

export const getProgramById = async (id) => {
  const response = await API.get(`/programs/${id}`);
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

export const getAttendanceData = async (id) => {
  const response = await API.get(`/programs/${id}/attendance-data`);
  return response.data;
};