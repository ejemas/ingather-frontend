import axios from 'axios';

const SCAN_API = axios.create({
  baseURL: `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/scan`
});

export const getProgramInfo = async (programId) => {
  const response = await SCAN_API.get(`/program/${programId}`);
  return response.data;
};

export const submitScan = async (programId, deviceFingerprint, formData = null, gender = null, firstTimer = false) => {
  const response = await SCAN_API.post(`/program/${programId}`, {
    deviceFingerprint,
    formData,
    gender,
    firstTimer
  });
  return response.data;
};

export const submitFormData = async (programId, deviceFingerprint, formData, scanSessionToken, scanSessionId) => {
  const response = await SCAN_API.post(`/program/${programId}/form`, {
    deviceFingerprint,
    formData,
    scanSessionToken,
    scanSessionId
  });
  return response.data;
};

export const submitFastTrackRsvp = async (programId, deviceFingerprint, emailAddress, scanSessionToken, scanSessionId) => {
  const response = await SCAN_API.post(`/program/${programId}/fast-track`, {
    deviceFingerprint,
    emailAddress,
    scanSessionToken,
    scanSessionId
  });
  return response.data;
};

export const submitProxyAttendee = async (programId, hostDeviceFingerprint, formData) => {
  const response = await SCAN_API.post(`/program/${programId}/proxy`, {
    hostDeviceFingerprint,
    formData
  });
  return response.data;
};

export const updateScanData = async (programId, deviceFingerprint, gender, firstTimer, scanSessionToken, scanSessionId) => {
  const response = await SCAN_API.put(`/program/${programId}/update-scan`, {
    deviceFingerprint,
    gender,
    firstTimer,
    scanSessionToken,
    scanSessionId
  });
  return response.data;
};

export const trackSponsorClick = async (sponsorId, deviceFingerprint) => {
  const response = await SCAN_API.post(`/sponsors/${sponsorId}/click`, {
    deviceFingerprint
  });
  return response.data;
};
