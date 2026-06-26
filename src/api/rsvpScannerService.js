import API from './axios';

export const getRsvpScannerInfo = async (scannerToken) => {
  const response = await API.get(`/rsvp-scanner/${encodeURIComponent(scannerToken)}`);
  return response.data;
};

export const checkInRsvpFromScanner = async (scannerToken, token) => {
  const response = await API.post(`/rsvp-scanner/${encodeURIComponent(scannerToken)}/check-in`, { token });
  return response.data;
};
