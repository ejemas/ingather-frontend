import axios from 'axios';
import API from './axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const PublicAPI = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const createPreEvent = async (data) => {
  const response = await API.post('/pre-events', data);
  return response.data;
};

export const getPreEvents = async () => {
  const response = await API.get('/pre-events');
  return response.data;
};

export const getPreEvent = async (id) => {
  const response = await API.get(`/pre-events/${id}`);
  return response.data;
};

export const updatePreEvent = async (id, data) => {
  const response = await API.put(`/pre-events/${id}`, data);
  return response.data;
};

export const resendRsvpQrEmail = async (preEventId, rsvpId) => {
  const response = await API.post(`/pre-events/${preEventId}/rsvps/${rsvpId}/resend-qr`);
  return response.data;
};

export const deletePreEvent = async (id) => {
  const response = await API.delete(`/pre-events/${id}`);
  return response.data;
};

export const getPublicPreEvent = async (slug) => {
  const response = await PublicAPI.get(`/pre-events/public/${slug}`);
  return response.data;
};

export const submitPreEventRsvp = async (slug, formData) => {
  const response = await PublicAPI.post(`/pre-events/public/${slug}/rsvps`, { formData });
  return response.data;
};

export const getDiscoverPreEvents = async (params = {}) => {
  const response = await PublicAPI.get('/pre-events/discover', { params });
  return response.data;
};
