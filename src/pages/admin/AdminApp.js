// The Ingather team's admin dashboard, everything under /admin.
// Separate sign-in (cookie, password + authenticator code) from organiser accounts.
// The older /admin/waitlist page is a different route and keeps working as before.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { adminAuth, setAdminCsrf, setAdminSignedOutHandler } from '../../api/adminApi';
import { AdminLogin, AdminCode, AdminSetup, AdminBackupCodes, AdminJoin } from './AdminAuthPages';
import AdminLayout from './AdminLayout';
import AdminOverview from './AdminOverview';
import AdminWaitlist from './AdminWaitlist';
import AdminOrgs from './AdminOrgs';
import AdminEvents from './AdminEvents';
import AdminHelp from './AdminHelp';
import AdminBroadcasts from './AdminBroadcasts';
import AdminTeam from './AdminTeam';
import AdminLocked from './AdminLocked';
import AdminActivity from './AdminActivity';
import { AdminSessionContext, useAdminSession, canOpen } from './AdminSession';
import '../../styles/IgAdmin.css';

const IDLE_MS = 30 * 60 * 1000;
const KEEP_ALIVE_MS = 5 * 60 * 1000;

function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    const previousTitle = document.title;
    document.title = 'Ingather admin';
    return () => {
      meta.remove();
      document.title = previousTitle;
    };
  }, []);
}

function RequireFull({ children }) {
  const { session } = useAdminSession();
  const location = useLocation();
  if (session.stage === 'full') return children;
  if (session.stage === 'password') return <Navigate to={session.next === 'setup' ? '/admin/setup' : '/admin/code'} replace />;
  return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
}

// Shows the page only if the signed-in role includes it; otherwise a "locked" page.
function Section({ name, children }) {
  const { session } = useAdminSession();
  const role = session.admin?.role;
  return canOpen(role, name) ? children : <AdminLocked section={name} role={role} />;
}

export default function AdminApp() {
  useNoIndex();
  const navigate = useNavigate();
  const [session, setSession] = useState({ stage: 'loading' });
  // Backup codes live only in memory, straight after setup, and are never shown again.
  const [freshBackupCodes, setFreshBackupCodes] = useState(null);
  const lastActivity = useRef(Date.now());
  const lastPing = useRef(Date.now());

  const applyStatus = useCallback((data) => {
    setAdminCsrf(data.csrf || '');
    setSession(data.stage === 'full'
      ? { stage: 'full', admin: data.admin }
      : data.stage === 'password'
        ? { stage: 'password', next: data.next, email: data.email }
        : { stage: 'none' });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { data } = await adminAuth.status();
      applyStatus(data);
      return data;
    } catch (error) {
      setSession({ stage: 'none', offline: true });
      return null;
    }
  }, [applyStatus]);

  const signedOut = useCallback((reason) => {
    setAdminCsrf('');
    setFreshBackupCodes(null);
    setSession({ stage: 'none' });
    navigate(reason === 'idle' ? '/admin/login?reason=idle' : '/admin/login', { replace: true });
  }, [navigate]);

  const signOut = useCallback(async () => {
    try { await adminAuth.logout(); } catch (error) { /* signed out anyway */ }
    signedOut();
  }, [signedOut]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { setAdminSignedOutHandler(signedOut); return () => setAdminSignedOutHandler(null); }, [signedOut]);

  // Sign out after 30 minutes without activity. While someone is active, let the server know
  // now and then, so a person reading the page is not signed out.
  useEffect(() => {
    if (session.stage !== 'full') return undefined;
    const mark = () => {
      lastActivity.current = Date.now();
      if (Date.now() - lastPing.current > KEEP_ALIVE_MS) {
        lastPing.current = Date.now();
        adminAuth.me().catch(() => {});
      }
    };
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((name) => window.addEventListener(name, mark, { passive: true }));
    const timer = window.setInterval(() => {
      if (Date.now() - lastActivity.current > IDLE_MS) {
        adminAuth.logout().catch(() => {});
        signedOut('idle');
      }
    }, 30 * 1000);
    return () => {
      events.forEach((name) => window.removeEventListener(name, mark));
      window.clearInterval(timer);
    };
  }, [session.stage, signedOut]);

  const value = useMemo(() => ({
    session, setSession, applyStatus, refresh, signOut, freshBackupCodes, setFreshBackupCodes
  }), [session, applyStatus, refresh, signOut, freshBackupCodes]);

  if (session.stage === 'loading') {
    return <div className="ig-ad"><div className="ig-ad-loading" role="status" aria-label="Loading"><span /></div></div>;
  }

  return (
    <AdminSessionContext.Provider value={value}>
      <div className="ig-ad">
        <Routes>
          <Route path="login" element={<AdminLogin />} />
          <Route path="code" element={<AdminCode />} />
          <Route path="setup" element={<AdminSetup />} />
          <Route path="backup-codes" element={<AdminBackupCodes />} />
          <Route path="join" element={<AdminJoin />} />
          <Route element={<RequireFull><AdminLayout /></RequireFull>}>
            <Route index element={<Section name="overview"><AdminOverview /></Section>} />
            <Route path="leads" element={<Section name="waitlist"><AdminWaitlist /></Section>} />
            <Route path="organisations" element={<Section name="orgs"><AdminOrgs /></Section>} />
            <Route path="events" element={<Section name="events"><AdminEvents /></Section>} />
            <Route path="help" element={<Section name="help"><AdminHelp /></Section>} />
            <Route path="broadcasts" element={<Section name="broadcasts"><AdminBroadcasts /></Section>} />
            <Route path="team" element={<Section name="team"><AdminTeam /></Section>} />
            <Route path="activity" element={<Section name="activity"><AdminActivity /></Section>} />
          </Route>
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </div>
    </AdminSessionContext.Provider>
  );
}
