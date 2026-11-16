import { createContext, useContext } from 'react';

export const AdminSessionContext = createContext(null);
export const useAdminSession = () => useContext(AdminSessionContext);

// The "admin" role is for helpers: only the waitlist (people waiting), help and broadcasts.
// Keep in step with ROLE_SECTIONS in backend/middleware/adminAuth.js (the server enforces it too).
export const ROLE_SECTIONS = { admin: ['waitlist', 'help', 'broadcasts'] };
// The activity log is for the owner only, whatever the role.
export const canOpen = (role, section) => role === 'owner'
  || (section !== 'activity' && (!ROLE_SECTIONS[role] || ROLE_SECTIONS[role].includes(section)));
export const homeFor = (role) => (ROLE_SECTIONS[role] ? '/admin/leads' : '/admin');
