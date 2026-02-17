import axios from 'axios';

const SCAN_API = axios.create({
  baseURL: `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/scan`
});

export const getProgramInfo = async (programId) => {
  const response = await SCAN_API.get(`/program/${programId}`);
  return response.data;
};

export const submitScan = async (programId, deviceFingerprint, formData = null) => {
  const response = await SCAN_API.post(`/program/${programId}`, {
    deviceFingerprint,
    formData
  });
  return response.data;
};

export const submitFormData = async (programId, deviceFingerprint, formData) => {
  const response = await SCAN_API.post(`/program/${programId}/form`, {
    deviceFingerprint,
    formData
  });
  return response.data;
};