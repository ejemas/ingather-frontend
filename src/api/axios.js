import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT_MS, attachApiErrorHandling } from './apiErrorUtils';
import { clearDashboardCache } from './dashboardCache';

const API = attachApiErrorHandling(axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json'
  }
}));

// Add token to requests if it exists
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// After any change is saved (anything that is not a plain read), or when the sign-in has ended,
// forget the remembered workspace summary so the next page shows the new numbers.
API.interceptors.response.use(
  (response) => {
    if (String(response.config?.method || 'get').toLowerCase() !== 'get') clearDashboardCache();
    return response;
  },
  (error) => {
    if (error?.response?.status === 401) clearDashboardCache();
    return Promise.reject(error);
  }
);

export default API;
