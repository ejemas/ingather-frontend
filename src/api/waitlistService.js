import API from './axios';

export const joinWaitlist = async (payload) => {
  const response = await API.post('/waitlist', payload);
  return response.data;
};

export const validateInvite = async (token) => {
  const response = await API.get(`/waitlist/invite/${encodeURIComponent(token)}`);
  return response.data;
};

const adminHeaders = (adminKey) => ({
  headers: {
    'X-Admin-Key': adminKey
  }
});

export const getWaitlistLeads = async (adminKey) => {
  const response = await API.get('/waitlist/admin/leads', adminHeaders(adminKey));
  return response.data;
};

export const inviteWaitlistLead = async (adminKey, leadId) => {
  const response = await API.post(`/waitlist/admin/leads/${leadId}/invite`, {}, adminHeaders(adminKey));
  return response.data;
};

export const rejectWaitlistLead = async (adminKey, leadId) => {
  const response = await API.post(`/waitlist/admin/leads/${leadId}/reject`, {}, adminHeaders(adminKey));
  return response.data;
};

export const revokeWaitlistInvite = async (adminKey, leadId) => {
  const response = await API.post(`/waitlist/admin/leads/${leadId}/revoke`, {}, adminHeaders(adminKey));
  return response.data;
};
