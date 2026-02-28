import API from './axios';

export const register = async (data) => {
  const response = await API.post('/auth/register', {
    churchName: data.churchName,
    branchName: data.branchName,
    email: data.email,
    password: data.password,
    location: data.location,
    logoUrl: data.logoUrl
  });
  return response.data;
};

export const login = async (email, password) => {
  const response = await API.post('/auth/login', { email, password });
  return response.data;
};

export const getCurrentChurch = async () => {
  const response = await API.get('/auth/me');
  return response.data;
};

export const verifyOtp = async (email, otp) => {
  const response = await API.post('/auth/verify-otp', { email, otp });
  return response.data;
};

export const resendOtp = async (email) => {
  const response = await API.post('/auth/resend-otp', { email });
  return response.data;
};

export const forgotPassword = async (email) => {
  const response = await API.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (email, otp, newPassword) => {
  const response = await API.post('/auth/reset-password', { email, otp, newPassword });
  return response.data;
};