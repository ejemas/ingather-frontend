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