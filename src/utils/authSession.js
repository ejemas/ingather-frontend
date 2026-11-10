import { DEFAULT_EVENT_TEMPLATE, EVENT_TEMPLATE_STORAGE_KEY, eventTemplates } from '../config/eventTemplates';

const DEVICE_ID_KEY = 'ingather-device-id';
const LOGGED_OUT_KEY = 'ingather-logged-out';

const randomId = () => {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
};

// A random id for this browser, so the server can recognise devices it has
// already confirmed. It is not linked to anything else about the person.
export const getDeviceId = () => {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id || !/^[A-Za-z0-9-]{16,100}$/.test(id)) {
      id = randomId();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch (error) {
    return '';
  }
};

// Saves the login and opens the dashboard. Same steps the login page always used.
export const completeLogin = (response) => {
  localStorage.setItem('token', response.token);
  localStorage.setItem('church', JSON.stringify(response.church));
  if (response.church?.organizationType && eventTemplates[response.church.organizationType]) {
    localStorage.setItem(EVENT_TEMPLATE_STORAGE_KEY, response.church.organizationType);
  } else {
    localStorage.setItem(EVENT_TEMPLATE_STORAGE_KEY, DEFAULT_EVENT_TEMPLATE);
  }
  window.location.href = '/dashboard';
};

// Called by every Log out button, so the login page can say "You are logged out".
export const markLoggedOut = () => {
  try {
    sessionStorage.setItem(LOGGED_OUT_KEY, '1');
  } catch (error) {
    // Session storage can be blocked; the message is optional.
  }
};

// Read without clearing (safe to call during render), then clear once shown.
export const peekLoggedOutFlag = () => {
  try {
    return sessionStorage.getItem(LOGGED_OUT_KEY) === '1';
  } catch (error) {
    return false;
  }
};

export const clearLoggedOutFlag = () => {
  try {
    sessionStorage.removeItem(LOGGED_OUT_KEY);
  } catch (error) {
    // Nothing to clear.
  }
};
