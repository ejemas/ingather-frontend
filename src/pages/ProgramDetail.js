import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import io from 'socket.io-client';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  const [churchData, setChurchData] = useState({ name: '', branch: '' }); // ADD THIS

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

      // Get church info
    const { getCurrentChurch } = await import('../api/authService');
    const church = await getCurrentChurch();
    setChurchData({
      name: church.churchName,
      branch: church.branchName
    });

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






  
const handleExportPDF = async () => {
  try {
    // Get church info
    const { getCurrentChurch } = await import('../api/authService');
    const church = await getCurrentChurch();
    
    // Get fresh attendee data
    const attendeesData = await getAttendees(id);
    const attendeesList = attendeesData.attendees;

    // Calculate summary statistics
    const totalScans = program.totalScans || 0;
    const totalFormsSubmitted = attendeesList.length;
    const totalFirstTimers = attendeesList.filter(a => a.firstTimer).length;
    const totalWinners = attendeesList.filter(a => a.isWinner).length;

    // Create PDF
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Add decorative border
    doc.setDrawColor(249, 109, 16);
    doc.setLineWidth(1);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

    // Header Banner
    doc.setFillColor(249, 109, 16);
    doc.rect(14, 14, pageWidth - 28, 30, 'F');
    
    // Title
    doc.setFontSize(24);
    doc.setTextColor(235, 235, 211);
    doc.setFont(undefined, 'bold');
    doc.text('ATTENDANCE REPORT', pageWidth / 2, 28, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 37, { align: 'center' });
    
    let yPos = 55;

    // Church Information Section
    doc.setFillColor(248, 248, 248);
    doc.rect(14, yPos - 5, pageWidth - 28, 38, 'F');
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('CHURCH INFORMATION', 18, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    const col1 = 18;
    const col2 = pageWidth / 2 + 5;
    
    doc.setFont(undefined, 'bold');
    doc.text('Church Name:', col1, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(church.churchName, col1 + 32, yPos);
    
    doc.setFont(undefined, 'bold');
    doc.text('Email:', col2, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(church.email, col2 + 15, yPos);
    yPos += 6;
    
    doc.setFont(undefined, 'bold');
    doc.text('Branch:', col1, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(church.branchName, col1 + 32, yPos);
    
    doc.setFont(undefined, 'bold');
    doc.text('Location:', col2, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(church.location, col2 + 15, yPos);
    yPos += 15;

    // Program Information Section
    doc.setFillColor(248, 248, 248);
    doc.rect(14, yPos - 5, pageWidth - 28, 32, 'F');
    
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('PROGRAM INFORMATION', 18, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Title:', col1, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(program.title, col1 + 32, yPos);
    
    doc.setFont(undefined, 'bold');
    doc.text('Status:', col2, yPos);
    doc.setTextColor(program.isActive ? 76 : 100, program.isActive ? 175 : 100, program.isActive ? 80 : 100);
    doc.setFont(undefined, 'bold');
    doc.text(program.isActive ? 'ACTIVE' : 'COMPLETED', col2 + 15, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 6;
    
    doc.setFont(undefined, 'bold');
    doc.text('Date:', col1, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(new Date(program.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }), col1 + 32, yPos);
    
    doc.setFont(undefined, 'bold');
    doc.text('Time:', col2, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(`${program.startTime} - ${program.endTime}`, col2 + 15, yPos);
    yPos += 15;

    // Summary Statistics Banner - WITH PADDING
    doc.setFillColor(249, 109, 16);
    doc.rect(14, yPos - 5, pageWidth - 28, 50, 'F'); // Increased height for padding
    
    doc.setTextColor(235, 235, 211);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('SUMMARY STATISTICS', 18, yPos);
    yPos += 12; // More space after title
    
    // Statistics Cards in Grid - WITH PADDING
    const cardWidth = (pageWidth - 44) / 4; // Reduced width for padding
    const cardHeight = 22;
    const cardGap = 3; // Increased gap
    const cardStartX = 18; // Padding from left edge
    
    // Card 1: Total Scans
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cardStartX, yPos, cardWidth, cardHeight, 3, 3, 'F');
    doc.setTextColor(249, 109, 16);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text(totalScans.toString(), cardStartX + cardWidth / 2, yPos + 10, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Total Scans', cardStartX + cardWidth / 2, yPos + 17, { align: 'center' });
    
    // Card 2: Forms Submitted
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cardStartX + cardWidth + cardGap, yPos, cardWidth, cardHeight, 3, 3, 'F');
    doc.setTextColor(249, 109, 16);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text(totalFormsSubmitted.toString(), cardStartX + cardWidth + cardGap + cardWidth / 2, yPos + 10, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Forms Submitted', cardStartX + cardWidth + cardGap + cardWidth / 2, yPos + 17, { align: 'center' });
    
    // Card 3: First Timers
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cardStartX + (cardWidth + cardGap) * 2, yPos, cardWidth, cardHeight, 3, 3, 'F');
    doc.setTextColor(249, 109, 16);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text(totalFirstTimers.toString(), cardStartX + (cardWidth + cardGap) * 2 + cardWidth / 2, yPos + 10, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('First Timers', cardStartX + (cardWidth + cardGap) * 2 + cardWidth / 2, yPos + 17, { align: 'center' });
    
    // Card 4: Winners
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cardStartX + (cardWidth + cardGap) * 3, yPos, cardWidth, cardHeight, 3, 3, 'F');
    doc.setTextColor(249, 109, 16);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text(totalWinners.toString(), cardStartX + (cardWidth + cardGap) * 3 + cardWidth / 2, yPos + 10, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Winners', cardStartX + (cardWidth + cardGap) * 3 + cardWidth / 2, yPos + 17, { align: 'center' });
    
    yPos += cardHeight + 18; // More space after stats

    // Attendee Data Section Header
    if (attendeesList.length > 0) {
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.text('ATTENDEE DATA', 18, yPos);
      yPos += 10; // More space after title

      // Collect ALL fields that were selected
      const headers = [];
      const fields = [];
      
      if (program.dataFields?.fullName) { 
        headers.push('Name'); 
        fields.push('fullName'); 
      }
      if (program.dataFields?.phoneNumber) { 
        headers.push('Phone'); 
        fields.push('phoneNumber'); 
      }
      if (program.dataFields?.address) { 
        headers.push('Address'); 
        fields.push('address'); 
      }
      if (program.dataFields?.firstTimer) { 
        headers.push('First Timer'); 
        fields.push('firstTimer'); 
      }
      if (program.dataFields?.department) { 
        headers.push('Department'); 
        fields.push('department'); 
      }
      if (program.dataFields?.fellowship) { 
        headers.push('Fellowship'); 
        fields.push('fellowship'); 
      }
      if (program.dataFields?.age) { 
        headers.push('Age'); 
        fields.push('age'); 
      }
      if (program.dataFields?.sex) { 
        headers.push('Gender'); 
        fields.push('sex'); 
      }
      if (program.giftingEnabled) { 
        headers.push('Winner'); 
        fields.push('isWinner'); 
      }
      headers.push('Scan Time');
      fields.push('scanTime');

      // Calculate column width based on number of columns
      const tableWidth = pageWidth - 32;
      const colWidth = tableWidth / headers.length;

      // Draw header background
      doc.setFillColor(249, 109, 16);
      doc.rect(16, yPos, tableWidth, 8, 'F');
      
      doc.setTextColor(235, 235, 211);
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      
      // Draw headers
      let xPos = 18;
      headers.forEach((header, index) => {
        doc.text(header, xPos, yPos + 5);
        xPos += colWidth;
      });
      
      yPos += 12; // MORE SPACE between header and data rows
      
      // Data rows
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(7);
      
      attendeesList.forEach((attendee, index) => {
        if (yPos > pageHeight - 30) {
          // Add new page if needed
          doc.addPage();
          doc.setDrawColor(249, 109, 16);
          doc.setLineWidth(1);
          doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
          yPos = 20;
        }
        
        xPos = 18;
        
        fields.forEach(field => {
          let value = '-';
          
          if (field === 'firstTimer' || field === 'isWinner') {
            value = attendee[field] ? 'Yes' : 'No';
          } else if (field === 'scanTime') {
            value = new Date(attendee[field]).toLocaleString();
          } else if (attendee[field]) {
            value = attendee[field].toString().substring(0, 20); // Truncate long values
          }
          
          doc.text(value, xPos, yPos);
          xPos += colWidth;
        });
        
        yPos += 6; // Space between rows
      });
      
    } else {
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.setFont(undefined, 'italic');
      doc.text('No attendee data available.', 18, yPos);
    }

    // Footer
    // Footer
doc.setFontSize(8);
doc.setTextColor(130, 130, 130);
doc.text(`${church.churchName} - ${program.title}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
doc.text(`Page 1`, pageWidth / 2, pageHeight - 10, { align: 'center' });

// Bottom right watermark
doc.setFontSize(20);
doc.setFont(undefined, 'bold');
doc.setTextColor(200, 200, 200); // Faint gray
doc.text('Powered by INGATHER', pageWidth - 18, pageHeight - 6, { 
  align: 'right'
});

    // Save PDF
    const fileName = `${church.churchName.replace(/\s+/g, '-')}-${program.title.replace(/\s+/g, '-')}-Report.pdf`;
    doc.save(fileName);
    
    alert('✅ PDF Report exported successfully!');
  } catch (error) {
    console.error('PDF export error:', error);
    alert('❌ Failed to export PDF: ' + error.message);
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
      <p className="church-name">{churchData.name}</p>
      <p className="branch-name">{churchData.branch}</p>
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
              <button className="btn btn-primary" onClick={handleExportPDF}>
                 📄 Export Report (PDF)
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