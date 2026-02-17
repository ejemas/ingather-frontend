import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateProgram from './pages/CreateProgram';
import ProgramDetail from './pages/ProgramDetail';
import ScanPage from './pages/ScanPage';
import './styles/globals.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create-program" element={<CreateProgram />} />
          <Route path="/program/:id" element={<ProgramDetail />} />
          <Route path="/scan/:programId" element={<ScanPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;