import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { EventTemplateProvider } from './context/EventTemplateContext';
import './styles/globals.css';

const Settings = lazy(() => import('./pages/Settings'));
const AllPrograms = lazy(() => import('./pages/AllPrograms'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Register = lazy(() => import('./pages/Register'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CreateProgram = lazy(() => import('./pages/CreateProgram'));
const ProgramDetail = lazy(() => import('./pages/ProgramDetail'));
const ScanPage = lazy(() => import('./pages/ScanPage'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

function RouteFallback() {
  return (
    <div className="app-route-loading" aria-live="polite" aria-label="Loading page">
      <div className="spinner"></div>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <EventTemplateProvider>
        <Router>
          <div className="App">
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/settings" element={<Settings />} />
                <Route path="/programs" element={<AllPrograms />} />
                <Route path="/" element={<LandingPage />} />
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/create-program" element={<CreateProgram />} />
                <Route path="/program/:id" element={<ProgramDetail />} />
                <Route path="/scan/:programId" element={<ScanPage />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
              </Routes>
            </Suspense>
          </div>
        </Router>
      </EventTemplateProvider>
    </ToastProvider>
  );
}

export default App;
