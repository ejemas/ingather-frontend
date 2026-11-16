// API client for the Ingather admin dashboard. Kept apart from api/axios.js:
// it signs in with an http-only cookie (no token in localStorage) and sends a CSRF header.
import axios from 'axios';
import { API_BASE_URL } from './apiErrorUtils';

const ADMIN_BASE_URL = `${process.env.REACT_APP_ADMIN_API_URL || API_BASE_URL}/admin`;

let csrfToken = '';
export const setAdminCsrf = (token) => { csrfToken = token || ''; };

const adminApi = axios.create({
  baseURL: ADMIN_BASE_URL,
  withCredentials: true,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' }
});

adminApi.interceptors.request.use((config) => {
  if (csrfToken) config.headers['X-Admin-CSRF'] = csrfToken;
  return config;
});

// When the session ends (30 minutes idle, 12 hours, or signed out elsewhere), go to sign-in.
let onSignedOut = null;
export const setAdminSignedOutHandler = (handler) => { onSignedOut = handler; };

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error?.response?.data;
    if (error?.response?.status === 401 && data?.error === 'signed_out' && onSignedOut) {
      onSignedOut(data.reason);
    }
    return Promise.reject(error);
  }
);

export const adminErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (!error?.response) return 'Cannot reach Ingather right now. Check your connection and try again.';
  return error.response.data?.error && error.response.data.error !== 'signed_out'
    ? error.response.data.error
    : fallback;
};

export const adminAuth = {
  status: () => adminApi.get('/auth/status'),
  login: (email, password) => adminApi.post('/auth/login', { email, password }),
  setup: () => adminApi.get('/auth/setup'),
  confirmSetup: (code) => adminApi.post('/auth/setup', { code }),
  verify: (body) => adminApi.post('/auth/verify', body),
  emailCode: () => adminApi.post('/auth/email-code'),
  me: () => adminApi.get('/auth/me'),
  logout: () => adminApi.post('/auth/logout')
};

export const adminData = {
  overview: (range) => adminApi.get('/overview', { params: { range } }),
  summary: () => adminApi.get('/summary'),
  rsvpAlerts: () => adminApi.get('/rsvp-alerts'),
  waitlist: (params) => adminApi.get('/waitlist', { params }),
  waitlistInvite: (id, test = false) => adminApi.post(`/waitlist/${id}/invite`, { test }),
  waitlistReject: (id) => adminApi.post(`/waitlist/${id}/reject`),
  waitlistRevoke: (id) => adminApi.post(`/waitlist/${id}/revoke`),
  waitlistExport: (params) => adminApi.get('/waitlist/export', { params, responseType: 'blob' }),
  orgs: (params) => adminApi.get('/orgs', { params }),
  org: (id) => adminApi.get(`/orgs/${id}`),
  orgsExport: (params) => adminApi.get('/orgs/export', { params, responseType: 'blob' }),
  events: (params) => adminApi.get('/events', { params }),
  event: (id) => adminApi.get(`/events/${id}`),
  eventsExport: (params) => adminApi.get('/events/export', { params, responseType: 'blob' }),
  help: (params) => adminApi.get('/help', { params }),
  helpTicket: (number) => adminApi.get(`/help/${number}`),
  helpReply: (number, message, solve = false) => adminApi.post(`/help/${number}/reply`, { message, solve }),
  helpStatus: (number, status) => adminApi.post(`/help/${number}/status`, { status }),
  helpAssign: (number, adminId) => adminApi.post(`/help/${number}/assign`, { adminId }),
  broadcasts: () => adminApi.get('/broadcasts'),
  broadcastTest: (title, message) => adminApi.post('/broadcasts/test', { title, message }),
  broadcastSend: (title, message, code) => adminApi.post('/broadcasts', { title, message, code }),
  broadcastDelete: (id, code) => adminApi.post(`/broadcasts/${id}/delete`, { code }),
  team: () => adminApi.get('/team'),
  teamAdd: (body) => adminApi.post('/team', body),
  teamRole: (id, role, code) => adminApi.post(`/team/${id}/role`, { role, code }),
  teamRemove: (id, code) => adminApi.post(`/team/${id}/remove`, { code }),
  teamResetTwoStep: (id, code) => adminApi.post(`/team/${id}/reset-two-step`, { code }),
  teamResend: (id) => adminApi.post(`/team/${id}/resend`),
  activity: (params) => adminApi.get('/activity', { params }),
  activityExport: (params) => adminApi.get('/activity/export', { params, responseType: 'blob' }),
  joinCheck: (token) => adminApi.get(`/join/${encodeURIComponent(token)}`),
  join: (token, password) => adminApi.post('/join', { token, password })
};

export default adminApi;
