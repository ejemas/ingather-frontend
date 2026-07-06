import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT_MS, attachApiErrorHandling } from './apiErrorUtils';

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

export default API;
