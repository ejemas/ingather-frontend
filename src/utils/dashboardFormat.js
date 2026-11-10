// Shared formatting for the organizer dashboard and All Events pages.

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Event dates come from the server as plain YYYY-MM-DD strings; read them without timezone shifts.
export const parseDateOnly = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) };
};

const weekdayOf = ({ year, month, day }) => new Date(Date.UTC(year, month, day)).getUTCDay();

export const toDateOnly = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const localToday = () => toDateOnly(new Date());

export const addDays = (dateOnly, days) => {
  const p = parseDateOnly(dateOnly);
  if (!p) return dateOnly;
  const d = new Date(p.year, p.month, p.day + days);
  return toDateOnly(d);
};

export const daysBetween = (startDateOnly, endDateOnly) => {
  const a = parseDateOnly(startDateOnly);
  const b = parseDateOnly(endDateOnly);
  if (!a || !b) return 0;
  return Math.round((Date.UTC(b.year, b.month, b.day) - Date.UTC(a.year, a.month, a.day)) / 86400000);
};

export const dateBadge = (value) => {
  const p = parseDateOnly(value);
  if (!p) return { month: '', day: '', weekday: '' };
  return { month: MONTHS[p.month], day: String(p.day), weekday: WEEKDAYS[weekdayOf(p)] };
};

// "5 Oct"
export const shortDate = (value) => {
  const p = parseDateOnly(value);
  return p ? `${p.day} ${MONTHS_SHORT[p.month]}` : '';
};

// "Sat, 14 Nov"
export const weekdayShortDate = (value) => {
  const p = parseDateOnly(value);
  return p ? `${WEEKDAYS[weekdayOf(p)].slice(0, 3)}, ${p.day} ${MONTHS_SHORT[p.month]}` : '';
};

// "3 Oct 2026"
export const fullDate = (value) => {
  const p = parseDateOnly(value);
  return p ? `${p.day} ${MONTHS_SHORT[p.month]} ${p.year}` : '';
};

export const monthTitle = (year, month) => `${MONTHS_LONG[month]} ${year}`;

// "Monday, 2 November"
export const greetingDate = (date = new Date()) => `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS_LONG[date.getMonth()]}`;

export const greetingWord = (date = new Date()) => {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const splitTime = (value) => {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value || ''));
  if (!match) return null;
  const hours = Number(match[1]);
  return { h12: hours % 12 || 12, minutes: match[2], meridiem: hours < 12 ? 'AM' : 'PM' };
};

// "6:00 PM"
export const formatTime = (value) => {
  const t = splitTime(value);
  return t ? `${t.h12}:${t.minutes} ${t.meridiem}` : '';
};

// "6:00 to 9:00 PM" or "9:00 AM to 4:00 PM"
export const formatTimeRange = (start, end) => {
  const a = splitTime(start);
  const b = splitTime(end);
  if (!a) return '';
  if (!b) return `${a.h12}:${a.minutes} ${a.meridiem}`;
  if (a.meridiem === b.meridiem) return `${a.h12}:${a.minutes} to ${b.h12}:${b.minutes} ${b.meridiem}`;
  return `${a.h12}:${a.minutes} ${a.meridiem} to ${b.h12}:${b.minutes} ${b.meridiem}`;
};

export const formatNumber = (value) => (Number(value) || 0).toLocaleString('en-US');

export const initialsOf = (name) => {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'IG';
  return words.slice(0, 2).map((w) => w[0]).join('').toUpperCase();
};

// Web links, plus small images saved inline by the old settings page.
export const isSafeImageUrl = (value) => /^(https:\/\/|data:image\/(png|jpe?g|webp|gif);base64,)/i.test(String(value || ''));
