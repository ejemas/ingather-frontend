import API from './axios';

export const updateWorkspace = async ({ churchName, branchName, location }) => {
  const response = await API.put('/auth/update', { churchName, branchName, location });
  return response.data;
};

export const uploadWorkspaceLogo = async (logoDataUrl) => {
  const response = await API.put('/auth/logo', { logoDataUrl }, { timeout: 60000 });
  return response.data;
};

export const removeWorkspaceLogo = async () => {
  const response = await API.delete('/auth/logo');
  return response.data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const response = await API.put('/auth/change-password', { currentPassword, newPassword });
  return response.data;
};

export const getNotifications = async () => {
  const response = await API.get('/notifications');
  return response.data;
};

export const markNotificationsRead = async () => {
  const response = await API.put('/notifications/mark-read');
  return response.data;
};
