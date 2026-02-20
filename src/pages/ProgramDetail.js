import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import io from 'socket.io-client';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
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






  const handleExportPDF = async () => {
  try {
    // Get church info
    const { getCurrentChurch } = await import('../api/authService');
    const church = await getCurrentChurch();
    
    // Get fresh attendee data
    const { getAttendees } = await import('../api/programService');
    const attendeesData = await getAttendees(id);
    const attendeesList = attendeesData.attendees;

    // Calculate summary statistics
    const totalScans = program.totalScans || 0;
    const totalFormsSubmitted = attendeesList.length;
    const totalFirstTimers = attendeesList.filter(a => a.firstTimer).length;
    const totalWinners = attendeesList.filter(a => a.isWinner).length;

    // Create PDF with better styling
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Add border to page
    doc.setDrawColor(249, 109, 16);
    doc.setLineWidth(0.5);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

    // Header with gradient effect (simulated with rectangles)
    doc.setFillColor(249, 109, 16);
    doc.rect(15, 15, pageWidth - 30, 25, 'F');
    
    // Title
    doc.setFontSize(24);
    doc.setTextColor(235, 235, 211);
    doc.setFont(undefined, 'bold');
    doc.text('ATTENDANCE REPORT', pageWidth / 2, 28, { align: 'center' });
    
    // Date stamp on header
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 35, { align: 'center' });
    
    yPosition = 50;

    // Church Information Section
    doc.setFillColor(245, 245, 245);
    doc.rect(15, yPosition - 5, pageWidth - 30, 35, 'F');
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('CHURCH INFORMATION', 20, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    // Two column layout for church info
    const col1X = 20;
    const col2X = pageWidth / 2 + 5;
    
    doc.setFont(undefined, 'bold');
    doc.text('Church Name:', col1X, yPosition);
    doc.setFont(undefined, 'normal');
    doc.text(church.churchName, col1X + 30, yPosition);
    
    doc.setFont(undefined, 'bold');
    doc.text('Email:', col2X, yPosition);
    doc.setFont(undefined, 'normal');
    doc.text(church.email, col2X + 15, yPosition);
    yPosition += 6;
    
    doc.setFont(undefined, 'bold');
    doc.text('Branch:', col1X, yPosition);
    doc.setFont(undefined, 'normal');
    doc.text(church.branchName, col1X + 30, yPosition);
    
    doc.setFont(undefined, 'bold');
    doc.text('Location:', col2X, yPosition);
    doc.setFont(undefined, 'normal');
    doc.text(church.location, col2X + 15, yPosition);
    
    yPosition += 15;

    // Program Information Section
    doc.setFillColor(245, 245, 245);
    doc.rect(15, yPosition - 5, pageWidth - 30, 30, 'F');
    
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('PROGRAM INFORMATION', 20, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    doc.setFont(undefined, 'bold');
    doc.text('Program Title:', col1X, yPosition);
    doc.setFont(undefined, 'normal');
    doc.text(program.title, col1X + 30, yPosition);
    
    doc.setFont(undefined, 'bold');
    doc.text('Status:', col2X, yPosition);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(program.isActive ? 76 : 158, program.isActive ? 175 : 158, program.isActive ? 80 : 158);
    doc.text(program.isActive ? 'Active' : 'Completed', col2X + 15, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 6;
    
    doc.setFont(undefined, 'bold');
    doc.text('Date:', col1X, yPosition);
    doc.setFont(undefined, 'normal');
    doc.text(new Date(program.date).toLocaleDateString(), col1X + 30, yPosition);
    
    doc.setFont(undefined, 'bold');
    doc.text('Time:', col2X, yPosition);
    doc.setFont(undefined, 'normal');
    doc.text(`${program.startTime} - ${program.endTime}`, col2X + 15, yPosition);
    
    yPosition += 15;

    // Summary Statistics - Card Style
    doc.setFillColor(249, 109, 16);
    doc.rect(15, yPosition - 5, pageWidth - 30, 40, 'F');
    
    doc.setTextColor(235, 235, 211);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('SUMMARY STATISTICS', 20, yPosition);
    yPosition += 10;
    
    // Statistics in grid layout
    const statBoxWidth = (pageWidth - 40) / 4;
    const statY = yPosition;
    
    // Stat 1: Total Scans
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(15, statY, statBoxWidth - 2, 18, 2, 2, 'F');
    doc.setTextColor(249, 109, 16);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(totalScans.toString(), 15 + (statBoxWidth - 2) / 2, statY + 8, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Total Scans', 15 + (statBoxWidth - 2) / 2, statY + 14, { align: 'center' });
    
    // Stat 2: Forms Submitted
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(15 + statBoxWidth, statY, statBoxWidth - 2, 18, 2, 2, 'F');
    doc.setTextColor(249, 109, 16);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(totalFormsSubmitted.toString(), 15 + statBoxWidth + (statBoxWidth - 2) / 2, statY + 8, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Forms Submitted', 15 + statBoxWidth + (statBoxWidth - 2) / 2, statY + 14, { align: 'center' });
    
    // Stat 3: First Timers
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(15 + statBoxWidth * 2, statY, statBoxWidth - 2, 18, 2, 2, 'F');
    doc.setTextColor(249, 109, 16);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(totalFirstTimers.toString(), 15 + statBoxWidth * 2 + (statBoxWidth - 2) / 2, statY + 8, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('First Timers', 15 + statBoxWidth * 2 + (statBoxWidth - 2) / 2, statY + 14, { align: 'center' });
    
    // Stat 4: Winners
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(15 + statBoxWidth * 3, statY, statBoxWidth - 2, 18, 2, 2, 'F');
    doc.setTextColor(249, 109, 16);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(totalWinners.toString(), 15 + statBoxWidth * 3 + (statBoxWidth - 2) / 2, statY + 8, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Winners', 15 + statBoxWidth * 3 + (statBoxWidth - 2) / 2, statY + 14, { align: 'center' });
    
    yPosition = statY + 25;

    // Attendee Data Table
    if (attendeesList.length > 0) {
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('ATTENDEE DATA', 20, yPosition);
      yPosition += 5;

      // Create dynamic table headers
      const tableHeaders = [];
      const tableColumns = [];
      
      if (program.dataFields?.fullName) {
        tableHeaders.push('Name');
        tableColumns.push('fullName');
      }
      if (program.dataFields?.phoneNumber) {
        tableHeaders.push('Phone');
        tableColumns.push('phoneNumber');
      }
      if (program.dataFields?.address) {
        tableHeaders.push('Address');
        tableColumns.push('address');
      }
      if (program.dataFields?.firstTimer) {
        tableHeaders.push('First Timer');
        tableColumns.push('firstTimer');
      }
      if (program.dataFields?.department) {
        tableHeaders.push('Department');
        tableColumns.push('department');
      }
      if (program.dataFields?.fellowship) {
        tableHeaders.push('Fellowship');
        tableColumns.push('fellowship');
      }
      if (program.dataFields?.age) {
        tableHeaders.push('Age');
        tableColumns.push('age');
      }
      if (program.dataFields?.sex) {
        tableHeaders.push('Gender');
        tableColumns.push('sex');
      }
      if (program.giftingEnabled) {
        tableHeaders.push('Winner');
        tableColumns.push('isWinner');
      }
      tableHeaders.push('Scan Time');
      tableColumns.push('scanTime');

      // Create table rows
      const tableData = attendeesList.map((a, index) => {
        const row = [];
        tableColumns.forEach(col => {
          if (col === 'firstTimer' || col === 'isWinner') {
            row.push(a[col] ? '✓ Yes' : '✗ No');
          } else if (col === 'scanTime') {
            row.push(new Date(a[col]).toLocaleString());
          } else {
            row.push(a[col] || '-');
          }
        });
        return row;
      });

      // Add table with beautiful styling
      doc.autoTable({
        startY: yPosition,
        head: [tableHeaders],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [249, 109, 16],
          textColor: [235, 235, 211],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center',
          cellPadding: 3
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 2.5,
          textColor: [0, 0, 0]
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250]
        },
        columnStyles: tableColumns.reduce((acc, col, index) => {
          if (col === 'fullName' || col === 'address') {
            acc[index] = { cellWidth: 'auto' };
          } else if (col === 'firstTimer' || col === 'isWinner' || col === 'age') {
            acc[index] = { halign: 'center', cellWidth: 20 };
          } else if (col === 'scanTime') {
            acc[index] = { cellWidth: 35, fontSize: 7 };
          }
          return acc;
        }, {}),
        styles: {
          lineColor: [200, 200, 200],
          lineWidth: 0.1
        },
        margin: { left: 15, right: 15 },
        didDrawPage: function (data) {
          // Footer on each page
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `${church.churchName} - ${program.title} | Page ${data.pageNumber}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          );
        }
      });
    } else {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('No attendee data available for this program.', 20, yPosition);
    }

    // Save PDF
    const fileName = `${church.churchName.replace(/\s+/g, '-')}-${program.title.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    alert('✅ PDF Report exported successfully!');
  } catch (error) {
    console.error('PDF export error:', error);
    alert('❌ Failed to export PDF. Please try again.');
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