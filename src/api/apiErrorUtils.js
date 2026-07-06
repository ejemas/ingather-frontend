import axios from 'axios';

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
export const API_TIMEOUT_MS = 15000;
export const CONNECTION_ERROR_MESSAGE = "We're having trouble connecting. Retry.";
export const GENERIC_API_ERROR_MESSAGE = 'Something went wrong. Please try again.';

const getBackendMessage = (error) => {
  const data = error?.response?.data;

  if (!data) return '';
  if (typeof data === 'string') return data;

  return data.error || data.message || '';
};

export const normalizeApiError = (error) => {
  const backendMessage = getBackendMessage(error);

  if (backendMessage) {
    return {
      message: backendMessage,
      isConnectionError: false
    };
  }

  const hasResponse = Boolean(error?.response);
  const isTimeout = error?.code === 'ECONNABORTED' || /timeout/i.test(error?.message || '');
  const isNetworkFailure = !hasResponse || error?.message === 'Network Error';

  if (isTimeout || isNetworkFailure) {
    return {
      message: CONNECTION_ERROR_MESSAGE,
      isConnectionError: true
    };
  }

  return {
    message: GENERIC_API_ERROR_MESSAGE,
    isConnectionError: false
  };
};

const decorateApiError = (error) => {
  const normalized = normalizeApiError(error);

  error.publicMessage = normalized.message;
  error.isConnectionError = normalized.isConnectionError;

  if (error.response) {
    const existingData = error.response.data;
    const responseData = existingData && typeof existingData === 'object' ? existingData : {};

    error.response.data = {
      ...responseData,
      error: responseData.error || normalized.message
    };
  } else {
    error.response = {
      status: 0,
      data: {
        error: normalized.message
      }
    };
  }

  return error;
};

export const attachApiErrorHandling = (client) => {
  if (!client || client.__ingatherApiErrorHandlingAttached) {
    return client;
  }

  client.__ingatherApiErrorHandlingAttached = true;
  client.defaults.timeout = client.defaults.timeout || API_TIMEOUT_MS;
  client.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(decorateApiError(error))
  );

  return client;
};

axios.defaults.timeout = axios.defaults.timeout || API_TIMEOUT_MS;
attachApiErrorHandling(axios);
