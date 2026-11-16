import React from 'react';

// Icons from the admin design (24 x 24, drawn with lines). Static, trusted markup.
// Each entry is [stroke width, inner SVG].
/* eslint-disable max-len */
export const ADMIN_ICONS = {
  "overview": [2, "<rect x=\"3\" y=\"3\" width=\"7\" height=\"9\" rx=\"1.5\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"5\" rx=\"1.5\"/><rect x=\"14\" y=\"12\" width=\"7\" height=\"9\" rx=\"1.5\"/><rect x=\"3\" y=\"16\" width=\"7\" height=\"5\" rx=\"1.5\"/>"],
  "waitlist": [2, "<path d=\"M8 6h13M8 12h13M8 18h13\"/><circle cx=\"3.5\" cy=\"6\" r=\"1\"/><circle cx=\"3.5\" cy=\"12\" r=\"1\"/><circle cx=\"3.5\" cy=\"18\" r=\"1\"/>"],
  "orgs": [2, "<path d=\"M3 21h18M5 21V8l7-5 7 5v13\"/><path d=\"M9 21v-6h6v6\"/>"],
  "events": [2, "<rect x=\"3\" y=\"4\" width=\"18\" height=\"17\" rx=\"2\"/><path d=\"M3 9h18M8 2v4M16 2v4\"/>"],
  "activity": [2, "<path d=\"M3 12h4l3-8 4 16 3-8h4\"/>"],
  "shield": [2, "<path d=\"M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z\"/><path d=\"M9 12l2 2 4-4\"/>"],
  "phone": [2, "<rect x=\"6\" y=\"2\" width=\"12\" height=\"20\" rx=\"2.5\"/><path d=\"M11 18h2\"/>"],
  "warn": [2, "<path d=\"M12 3l10 18H2z\"/><path d=\"M12 10v5M12 18v.2\"/>"],
  "help": [2, "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M9.5 9.5a2.5 2.5 0 014.6 1.4c0 1.6-2.1 2.1-2.1 3.6\"/><path d=\"M12 17.3v.2\"/>"],
  "broadcasts": [2, "<path d=\"M3 11v2a1 1 0 001 1h2l5 4V6L6 10H4a1 1 0 00-1 1z\"/><path d=\"M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13\"/>"],
  "team": [2, "<circle cx=\"9\" cy=\"8\" r=\"3.5\"/><path d=\"M2.5 20a6.5 6.5 0 0113 0\"/><circle cx=\"17\" cy=\"9\" r=\"2.5\"/><path d=\"M16 14.2a5 5 0 016 4.8\"/>"],
  "search": [2, "<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"M20 20l-3.5-3.5\"/>"],
  "menu": [2, "<path d=\"M4 7h16M4 12h16M4 17h16\"/>"],
  "close": [2, "<path d=\"M6 6l12 12M18 6L6 18\"/>"],
  "check": [2, "<path d=\"M5 12.5l4.5 4.5L19 7.5\"/>"],
  "people": [2, "<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21a8 8 0 0116 0\"/>"],
  "mail": [2, "<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"M3 7l9 6 9-6\"/>"],
  "ticket": [2, "<path d=\"M3 8a2 2 0 002-2h14a2 2 0 002 2v2a2 2 0 000 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-4z\"/><path d=\"M14 6v12\" stroke-dasharray=\"2 2\"/>"],
  "qr": [2, "<rect x=\"3\" y=\"3\" width=\"7\" height=\"7\" rx=\"1\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\" rx=\"1\"/><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\" rx=\"1\"/><path d=\"M14 14h3v3M21 14v.01M14 21h3M20 18v3\"/>"],
  "clock": [2, "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/>"],
  "lock": [2, "<rect x=\"4\" y=\"10\" width=\"16\" height=\"11\" rx=\"2\"/><path d=\"M8 10V7a4 4 0 018 0v3\"/>"],
  "chev": [2, "<path d=\"M9 6l6 6-6 6\"/>"],
  "down": [2, "<path d=\"M6 9l6 6 6-6\"/>"],
  "logout": [2, "<path d=\"M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3\"/><path d=\"M10 17l-5-5 5-5M5 12h11\"/>"],
  "plus": [2, "<path d=\"M12 5v14M5 12h14\"/>"],
  "export": [2, "<path d=\"M12 3v12M7 10l5 5 5-5\"/><path d=\"M4 21h16\"/>"],
};

export const ADMIN_NAV_ICONS = {
  "overview": [1.8, "<rect x=\"3\" y=\"3\" width=\"7\" height=\"9\" rx=\"1.5\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"5\" rx=\"1.5\"/><rect x=\"14\" y=\"12\" width=\"7\" height=\"9\" rx=\"1.5\"/><rect x=\"3\" y=\"16\" width=\"7\" height=\"5\" rx=\"1.5\"/>"],
  "waitlist": [1.8, "<path d=\"M8 6h13M8 12h13M8 18h13\"/><circle cx=\"3.5\" cy=\"6\" r=\"1\"/><circle cx=\"3.5\" cy=\"12\" r=\"1\"/><circle cx=\"3.5\" cy=\"18\" r=\"1\"/>"],
  "orgs": [1.8, "<path d=\"M3 21h18M5 21V8l7-5 7 5v13\"/><path d=\"M9 21v-6h6v6\"/>"],
  "events": [1.8, "<rect x=\"3\" y=\"4\" width=\"18\" height=\"17\" rx=\"2\"/><path d=\"M3 9h18M8 2v4M16 2v4\"/>"],
  "help": [1.8, "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M9.5 9.5a2.5 2.5 0 014.6 1.4c0 1.6-2.1 2.1-2.1 3.6\"/><path d=\"M12 17.3v.2\"/>"],
  "broadcasts": [1.8, "<path d=\"M3 11v2a1 1 0 001 1h2l5 4V6L6 10H4a1 1 0 00-1 1z\"/><path d=\"M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13\"/>"],
  "team": [1.8, "<circle cx=\"9\" cy=\"8\" r=\"3.5\"/><path d=\"M2.5 20a6.5 6.5 0 0113 0\"/><circle cx=\"17\" cy=\"9\" r=\"2.5\"/><path d=\"M16 14.2a5 5 0 016 4.8\"/>"],
  "activity": [1.8, "<path d=\"M3 12h4l3-8 4 16 3-8h4\"/>"],
};

export const ADMIN_UI_ICONS = {
  "download": [1.8, "<path d=\"M12 3v12M7 10l5 5 5-5\"/><path d=\"M4 21h16\"/>"],
  "passkey": [1.8, "<path d=\"M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z\"/><path d=\"M9 12l2 2 4-4\"/>"],
  "menu": [1.8, "<path d=\"M4 7h16M4 12h16M4 17h16\"/>"],
  "signout": [1.8, "<path d=\"M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3\"/><path d=\"M10 17l-5-5 5-5M5 12h11\"/>"],
  "lock": [2, "<rect x=\"4\" y=\"10\" width=\"16\" height=\"11\" rx=\"2\"/><path d=\"M8 10V7a4 4 0 018 0v3\"/>"],
};

const pick = (name) => ADMIN_UI_ICONS[name] || ADMIN_ICONS[name] || ADMIN_NAV_ICONS[name];

export function AdminIcon({ name, size = 16, nav = false, strokeWidth }) {
  const entry = nav ? ADMIN_NAV_ICONS[name] : pick(name);
  if (!entry) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth || entry[0]}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ flex: 'none', display: 'block' }}
      dangerouslySetInnerHTML={{ __html: entry[1] }}
    />
  );
}
