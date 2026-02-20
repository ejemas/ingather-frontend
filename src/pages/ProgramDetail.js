import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import io from 'socket.io-client';
import { getProgramById, getAttendees, getAttendanceData, stopProgram as stopProgramAPI } from '../api/programService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import '../styles/ProgramDetail.css';

function ProgramDetail() {
  const { id } = useParams();
  
  const [program, setProgram] = useState(null);
  const [totalScans, setTotalScans] = useState(0);
  const [attendanceData, setAttendanceData] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgramData();
    
    // Set up Socket.io for real-time updates
    const socket = io(process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000');
    
    socket.emit('join-program', id);
    
    socket.on(`program-${id}-update`, (data) => {
      console.log('Real-time update:', data);
      setTotalScans(data.totalScans);
    });
    
    return () => {
      socket.disconnect();
    };
  }, [id]);

  const fetchProgramData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      // Get program details
      const programData = await getProgramById(id);
      setProgram({
        ...programData,
        status: programData.isActive ? 'active' : 'completed'
      });
      setTotalScans(programData.totalScans);

      // Get attendees
      const attendeesData = await getAttendees(id);
      setAttendees(attendeesData.attendees);

      // Get attendance over time
      const chartData = await getAttendanceData(id);
      setAttendanceData(chartData.attendanceData);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching program:', error);
      if (error.response?.status === 401) {
        window.location.href = '/login';
      }
      setLoading(false);
    }
  };

  const handleStopProgram = async () => {
    if (window.confirm('Are you sure you want to stop this program? The QR code will be disabled.')) {
      try {
        await stopProgramAPI(id);
        setProgram({ ...program, isActive: false, status: 'completed' });
        alert('Program stopped successfully!');
      } catch (error) {
        console.error('Stop program error:', error);
        alert('Failed to stop program.');
      }
    }
  };

  const handleDownloadQR = () => {
    const canvas = document.getElementById('qr-code-canvas');
    const pngUrl = canvas
      .toDataURL('image/png')
      .replace('image/png', 'image/octet-stream');
    
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `${program.title}-QR.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const handlePrintQR = () => {
    window.print();
  };

  const handleExportData = async () => {
  try {
    // Get church info
    const { getCurrentChurch } = await import('../api/authService');
    const church = await getCurrentChurch();
    
    // Get fresh attendee data
    const { getAttendees } = await import('../api/programService');
    const attendeesData = await getAttendees(id);
    const attendeesList = attendeesData.attendees;

    // Create comprehensive CSV with church info
    const timestamp = new Date().toLocaleString();
    const csvLines = [
      '=== CHURCH INFORMATION ===',
      `Church Name,${church.churchName}`,
      `Branch,${church.branchName}`,
      `Location,${church.location}`,
      `Email,${church.email}`,
      '',
      '=== PROGRAM INFORMATION ===',
      `Program Title,${program.title}`,
      `Date,${program.date}`,
      `Time,${program.startTime} - ${program.endTime}`,
      `Total Scans,${program.totalScans}`,
      `Data Collection,${program.trackingMode === 'collect-data' ? 'Yes' : 'No'}`,
      `Exported On,${timestamp}`,
      '',
      '=== STATISTICS ===',
      `Total Attendees,${attendeesList.length}`,
      `First Timers,${attendeesList.filter(a => a.firstTimer).length}`,
      `Winners,${attendeesList.filter(a => a.isWinner).length}`,
      '',

      ];

// Create dynamic CSV headers based on selected fields
const dataHeaders = [];

if (program.dataFields?.fullName) dataHeaders.push('Name');
if (program.dataFields?.phoneNumber) dataHeaders.push('Phone Number');
if (program.dataFields?.address) dataHeaders.push('Address');
if (program.dataFields?.firstTimer) dataHeaders.push('First Timer');
if (program.dataFields?.department) dataHeaders.push('Department');
if (program.dataFields?.fellowship) dataHeaders.push('Fellowship');
if (program.dataFields?.age) dataHeaders.push('Age');
if (program.dataFields?.sex) dataHeaders.push('Gender');
if (program.giftingEnabled) dataHeaders.push('Winner');
dataHeaders.push('Scan Time');

csvLines.push('=== ATTENDEE DATA ===');
csvLines.push(dataHeaders.join(','));

// Add attendee rows with dynamic fields
attendeesList.forEach(a => {
  const row = [];
  if (program.dataFields?.fullName) row.push(a.fullName || '');
  if (program.dataFields?.phoneNumber) row.push(a.phoneNumber || '');
  if (program.dataFields?.address) row.push(a.address || '');
  if (program.dataFields?.firstTimer) row.push(a.firstTimer ? 'Yes' : 'No');
  if (program.dataFields?.department) row.push(a.department || '');
  if (program.dataFields?.fellowship) row.push(a.fellowship || '');
  if (program.dataFields?.age) row.push(a.age || '');
  if (program.dataFields?.sex) row.push(a.sex || '');
  if (program.giftingEnabled) row.push(a.isWinner ? 'Yes' : 'No');
  row.push(new Date(a.scanTime).toLocaleString());
  
  csvLines.push(row.join(','));
});

const csvContent = csvLines.join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${church.churchName}-${program.title}-Report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    alert('Data exported successfully!');
  } catch (error) {
    console.error('Export error:', error);
    alert('Failed to export data. Please try again.');
  }
};

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="dashboard">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>Ingather</h2>
          </div>
        </aside>
        <main className="dashboard-main">
          <div className="spinner"></div>
          <p style={{textAlign: 'center', color: 'var(--color-beige)', marginTop: '20px'}}>
            Loading program...
          </p>
        </main>
      </div>
    );
  }

  // Program not found
  if (!program) {
    return (
      <div className="dashboard">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>Ingather</h2>
          </div>
        </aside>
        <main className="dashboard-main">
          <h1 style={{color: 'var(--color-beige)'}}>Program not found</h1>
        </main>
      </div>
    );
  }

  // Main render
  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Ingather</h2>
          <div className="church-info">
            <p className="church-name">Grace Assembly</p>
            <p className="branch-name">Lekki Branch</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <a href="/dashboard" className="nav-item">
            <span className="nav-icon">📊</span>
            <span>Dashboard</span>
          </a>
          <a href="/create-program" className="nav-item">
            <span className="nav-icon">➕</span>
            <span>Create Program</span>
          </a>
          <a href="/programs" className="nav-item active">
            <span className="nav-icon">📅</span>
            <span>All Programs</span>
          </a>
          <a href="/settings" className="nav-item">
            <span className="nav-icon">⚙️</span>
            <span>Settings</span>
          </a>
        </nav>

        <div className="sidebar-footer">
          <button className="btn-logout" onClick={() => window.location.href = '/'}>
            <span className="nav-icon">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Header */}
        <div className="program-detail-header">
          <div>
            <button 
              className="btn-back"
              onClick={() => window.location.href = '/dashboard'}
            >
              ← Back
            </button>
            <h1>{program.title}</h1>
            <div className="program-meta">
              <span className="meta-item">📅 {formatDate(program.date)}</span>
              <span className="meta-item">🕐 {program.startTime} - {program.endTime}</span>
              <span className={`status-badge ${program.status === 'active' ? 'status-active' : 'status-completed'}`}>
                {program.status === 'active' ? '● Live' : 'Completed'}
              </span>
            </div>
          </div>
          <div className="header-actions">
            {program.isActive ? (
              <button className="btn btn-danger" onClick={handleStopProgram}>
                Stop Program
              </button>
            ) : (
              <button className="btn btn-secondary" disabled>
                Program Ended
              </button>
            )}
          </div>
        </div>

        {/* Live Stats */}
        <div className="live-stats-grid">
          <div className="live-stat-card primary">
            <div className="live-indicator">
              {program.isActive && <span className="pulse-dot"></span>}
              <span className="live-label">
                {program.isActive ? 'LIVE ATTENDANCE' : 'TOTAL ATTENDANCE'}
              </span>
            </div>
            <h2 className="live-count">{totalScans.toLocaleString()}</h2>
            <p className="stat-subtitle">Total Scans</p>
          </div>

          {program.trackingMode === 'collect-data' && (
            <>
              <div className="live-stat-card">
                <span className="stat-icon">📝</span>
                <h3>{attendees.length}</h3>
                <p>Forms Submitted</p>
              </div>

              <div className="live-stat-card">
                <span className="stat-icon">⭐</span>
                <h3>{attendees.filter(a => a.firstTimer).length}</h3>
                <p>First Timers</p>
              </div>

              {program.giftingEnabled && (
                <div className="live-stat-card">
                  <span className="stat-icon">🎁</span>
                  <h3>{program.winnersSelected}/{program.totalWinners}</h3>
                  <p>Winners Selected</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Two Column Layout */}
        <div className="detail-grid">
          {/* Left Column - QR Code */}
          <div className="qr-section">
            <div className="section-card">
              <h2 className="section-title">QR Code</h2>
              <p className="section-subtitle">Display this QR code at your church entrance</p>
              
              <div className="qr-code-container" id="qr-print-area">
                <div className="qr-code-wrapper">
                  <QRCodeCanvas
                    id="qr-code-canvas"
                    value={program.qrCodeUrl}
                    size={300}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <div className="qr-info">
                  <h3>{program.title}</h3>
                  <p>Scan to check in</p>
                  <p className="qr-url">{program.qrCodeUrl}</p>
                </div>
              </div>

              <div className="qr-actions">
                <button className="btn btn-primary" onClick={handleDownloadQR}>
                  📥 Download QR
                </button>
                <button className="btn btn-secondary" onClick={handlePrintQR}>
                  🖨️ Print QR
                </button>
              </div>

              {program.isActive && (
                <div className="qr-status active">
                  <span className="status-dot"></span>
                  QR Code is Active - Accepting Scans
                </div>
              )}
              {!program.isActive && (
                <div className="qr-status inactive">
                  <span className="status-dot"></span>
                  QR Code is Disabled
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Analytics */}
          <div className="analytics-section">
            <div className="section-card">
              <h2 className="section-title">Attendance Over Time</h2>
              <p className="section-subtitle">See when people arrived</p>
              
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart 
                    data={attendanceData}
                    margin={{ top: 10, right: 30, left: 20, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(235, 235, 211, 0.1)" />
                    <XAxis 
                      dataKey="time" 
                      stroke="rgba(9, 8, 9, 0.6)"
                      style={{ fontSize: '0.9rem', fontWeight: '600' }}
                      label={{ 
                        value: 'Time Intervals', 
                        position: 'insideBottom', 
                        offset: -20,
                        style: { 
                          fill: 'rgba(9, 8, 9, 0.6)', 
                          fontSize: '1rem',
                          fontWeight: '700'
                        } 
                      }}
                    />
                    <YAxis 
                      stroke="rgba(9, 8, 9, 0.6)"
                      style={{ fontSize: '0.9rem', fontWeight: '600' }}
                      label={{ 
                        value: 'Number of Scans', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { 
                          fill: 'rgba(9, 8, 9, 0.6)', 
                          fontSize: '1rem',
                          fontWeight: '700',
                          textAnchor: 'middle'
                        } 
                      }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#EBEBD3',
                        border: '2px solid #F96D10',
                        borderRadius: '8px',
                        color: '#090809',
                        fontWeight: '600'
                      }}
                      labelStyle={{
                        color: '#F96D10',
                        fontWeight: '700'
                      }}
                      formatter={(value) => [`${value} scans`, 'Attendance']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="scans" 
                      stroke="#F96D10" 
                      strokeWidth={3}
                      dot={{ fill: '#F96D10', r: 6, strokeWidth: 2, stroke: '#EBEBD3' }}
                      activeDot={{ r: 10, strokeWidth: 3 }}
                      name="Total Scans"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Attendees Table */}
        {program.trackingMode === 'collect-data' && attendees.length > 0 && (
          <div className="section-card">
            <div className="section-header">
              <div>
                <h2 className="section-title">Attendee Data</h2>
                <p className="section-subtitle">People who submitted the form</p>
              </div>
              <button className="btn btn-primary" onClick={handleExportData}>
                📥 Export CSV
              </button>
            </div>



            <div className="attendees-table-container">
              <table className="attendees-table">
                <thead>
    <tr>
      {/* Dynamically show headers based on selected fields */}
      {program.dataFields?.fullName && <th>Name</th>}
      {program.dataFields?.phoneNumber && <th>Phone Number</th>}
      {program.dataFields?.address && <th>Address</th>}
      {program.dataFields?.firstTimer && <th>First Timer</th>}
      {program.dataFields?.department && <th>Department</th>}
      {program.dataFields?.fellowship && <th>Fellowship</th>}
      {program.dataFields?.age && <th>Age</th>}
      {program.dataFields?.sex && <th>Gender</th>}
      {program.giftingEnabled && <th>Winner</th>}
      <th>Scan Time</th>
    </tr>
  </thead>
   <tbody>
    {attendees.map(attendee => (
      <tr key={attendee.id}>
        {/* Dynamically show data based on selected fields */}
        {program.dataFields?.fullName && (
          <td><strong>{attendee.fullName || '-'}</strong></td>
        )}
        {program.dataFields?.phoneNumber && (
          <td>{attendee.phoneNumber || '-'}</td>
        )}
        {program.dataFields?.address && (
          <td>{attendee.address || '-'}</td>
        )}
        {program.dataFields?.firstTimer && (
          <td>
            {attendee.firstTimer ? (
              <span className="badge-yes">Yes ⭐</span>
            ) : (
              <span className="badge-no">No</span>
            )}
          </td>
        )}
        {program.dataFields?.department && (
          <td>{attendee.department || '-'}</td>
        )}
        {program.dataFields?.fellowship && (
          <td>{attendee.fellowship || '-'}</td>
        )}
        {program.dataFields?.age && (
          <td>{attendee.age || '-'}</td>
        )}
        {program.dataFields?.sex && (
          <td>{attendee.sex || '-'}</td>
        )}
        {program.giftingEnabled && (
          <td>
            {attendee.isWinner ? (
              <span className="badge-winner">🎁 Winner</span>
            ) : (
              <span className="badge-no">-</span>
            )}
          </td>
        )}
        <td>{new Date(attendee.scanTime).toLocaleString()}</td>
      </tr>
    ))}
  </tbody>
              </table>



            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default ProgramDetail;