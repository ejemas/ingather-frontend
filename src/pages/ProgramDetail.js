import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import io from 'socket.io-client';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getProgramById, getAttendees, getAttendanceData, stopProgram as stopProgramAPI, markWinnerGifted } from '../api/programService';
import { useToast } from '../components/Toast';
import '../styles/Dashboard.css';
import '../styles/ProgramDetail.css';

/* ============================================
   SVG ICON COMPONENTS
   ============================================ */
const Icons = {
  logo: (
    <img src="/ingather-logo.png" alt="Ingather" className="sidebar-logo-img" />
  ),
  collapse: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="14" height="14" rx="2" /><line x1="9" y1="3" x2="9" y2="17" /></svg>),
  dashboard: (<svg viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="6" height="6" rx="1" fill="currentColor" /><rect x="11" y="3" width="6" height="6" rx="1" fill="currentColor" /><rect x="3" y="11" width="6" height="6" rx="1" fill="currentColor" /><rect x="11" y="11" width="6" height="6" rx="1" fill="currentColor" /></svg>),
  createProgram: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="7" /><line x1="10" y1="7" x2="10" y2="13" /><line x1="7" y1="10" x2="13" y2="10" /></svg>),
  allPrograms: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="14" height="12" rx="2" /><line x1="3" y1="8" x2="17" y2="8" /><line x1="7" y1="4" x2="7" y2="8" /><line x1="13" y1="4" x2="13" y2="8" /></svg>),
  settings: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="2.5" /><path d="M10 3.5V5M10 15v1.5M16.5 10H15M5 10H3.5M14.6 5.4l-1.1 1.1M6.5 13.5l-1.1 1.1M14.6 14.6l-1.1-1.1M6.5 6.5L5.4 5.4" /></svg>),
  notification: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2a5 5 0 015 5c0 4 2 5 2 5H3s2-1 2-5a5 5 0 015-5z" /><path d="M8.5 17a1.5 1.5 0 003 0" /></svg>),
  logout: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17H4a1 1 0 01-1-1V4a1 1 0 011-1h3" /><polyline points="11,14 17,10 11,6" /><line x1="17" y1="10" x2="7" y2="10" /></svg>),
  chevronRight: (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6,4 10,8 6,12" /></svg>),
  sun: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="3.5" /><line x1="10" y1="2" x2="10" y2="4" /><line x1="10" y1="16" x2="10" y2="18" /><line x1="2" y1="10" x2="4" y2="10" /><line x1="16" y1="10" x2="18" y2="10" /><line x1="4.2" y1="4.2" x2="5.6" y2="5.6" /><line x1="14.4" y1="14.4" x2="15.8" y2="15.8" /><line x1="4.2" y1="15.8" x2="5.6" y2="14.4" /><line x1="14.4" y1="5.6" x2="15.8" y2="4.2" /></svg>),
  moon: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 10.5A7 7 0 119.5 3a5.5 5.5 0 007.5 7.5z" /></svg>),
  gear: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.3 3h3.4l.5 2.1a6 6 0 011.7 1l2-.7 1.7 3-1.5 1.4a6 6 0 010 2l1.5 1.4-1.7 3-2-.7a6 6 0 01-1.7 1L11.7 17H8.3l-.5-2.1a6 6 0 01-1.7-1l-2 .7-1.7-3 1.5-1.4a6 6 0 010-2L2.4 7.8l1.7-3 2 .7a6 6 0 011.7-1L8.3 3z" /><circle cx="10" cy="10" r="2.5" /></svg>),
  chevronDown: (<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,5 7,9 11,5" /></svg>),
  calendar: (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="12" height="11" rx="1.5" /><line x1="2" y1="7" x2="14" y2="7" /><line x1="5.5" y1="1.5" x2="5.5" y2="4.5" /><line x1="10.5" y1="1.5" x2="10.5" y2="4.5" /></svg>),
  clock: (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6.5" /><polyline points="8,4.5 8,8 10.5,9.5" /></svg>),
  arrowLeft: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="10" x2="3" y2="10" /><polyline points="9,4 3,10 9,16" /></svg>),
  arrowRight: (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="8" x2="13" y2="8" /><polyline points="9,4 13,8 9,12" /></svg>),
  arrowLeftSmall: (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="13" y1="8" x2="3" y2="8" /><polyline points="7,4 3,8 7,12" /></svg>),
  download: (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 10v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3" /><polyline points="5,7 8,10 11,7" /><line x1="8" y1="10" x2="8" y2="2" /></svg>),
  printer: (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><polyline points="4,6 4,1 12,1 12,6" /><path d="M4 12H2.5A1.5 1.5 0 011 10.5V7.5A1.5 1.5 0 012.5 6h11A1.5 1.5 0 0115 7.5v3A1.5 1.5 0 0113.5 12H12" /><rect x="4" y="10" width="8" height="5" rx="0.5" /></svg>),
  search: (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="7" r="5" /><line x1="14" y1="14" x2="10.8" y2="10.8" /></svg>),
  info: (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6" /><line x1="8" y1="10.5" x2="8" y2="7.5" /><circle cx="8" cy="5.5" r="0.5" fill="currentColor" stroke="none" /></svg>),
  people: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="7" r="3" /><path d="M1 17v-1a4 4 0 014-4h4a4 4 0 014 4v1" /><circle cx="15" cy="7" r="2" /><path d="M15 12h1a3 3 0 013 3v1" /></svg>),
  male: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="12" r="5" /><line x1="12" y1="3" x2="17" y2="3" /><line x1="17" y1="3" x2="17" y2="8" /><line x1="12" y1="8" x2="17" y2="3" /></svg>),
  female: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="7" r="5" /><line x1="10" y1="12" x2="10" y2="19" /><line x1="7" y1="16" x2="13" y2="16" /></svg>),
  star: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2l2.4 5 5.6.8-4 3.9.9 5.3L10 14.5 5.1 17l.9-5.3-4-3.9 5.6-.8L10 2z" /></svg>),
  exportIcon: (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 10v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3" /><polyline points="11,5 8,2 5,5" /><line x1="8" y1="2" x2="8" y2="10" /></svg>),
  formDoc: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 3h8l4 4v10a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z" /><polyline points="12,3 12,7 16,7" /><line x1="6" y1="10" x2="14" y2="10" /><line x1="6" y1="13" x2="14" y2="13" /><line x1="6" y1="16" x2="10" y2="16" /></svg>),
  starOutline: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2l2.4 5 5.6.8-4 3.9.9 5.3L10 14.5 5.1 17l.9-5.3-4-3.9 5.6-.8L10 2z" /></svg>),
  giftBox: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="9" width="16" height="9" rx="1" /><rect x="3" y="5" width="14" height="4" rx="1" /><line x1="10" y1="5" x2="10" y2="18" /><path d="M10 5C10 3 8 1 6 3s2 2 4 2" /><path d="M10 5c0-2 2-4 4-2s-2 2-4 2" /></svg>),
  checkDouble: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,10 6,14 14,6" /><polyline points="6,10 10,14 18,6" /></svg>),
  maleSymbol: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="12" r="5" /><line x1="12" y1="3" x2="17" y2="3" /><line x1="17" y1="3" x2="17" y2="8" /><line x1="12" y1="8" x2="17" y2="3" /></svg>),
  femaleSymbol: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="7" r="5" /><line x1="10" y1="12" x2="10" y2="19" /><line x1="7" y1="16" x2="13" y2="16" /></svg>),
};

/* ============================================
   CUSTOM BAR CHART (Dynamic Y-Axis + Hover Tooltip)
   ============================================ */
function AttendanceBarChart({ data }) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth);
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // — Dynamic max value & Y-ticks based on real data —
  const rawMax = data.length > 0
    ? Math.max(...data.map(d => d.scans || 0))
    : 0;

  // Returns a "nice" max divisible by 4 (for clean tick spacing)
  const getNiceMax = (val) => {
    if (val <= 4) return 4;          // ticks: 1, 2, 3, 4
    if (val <= 8) return 8;          // ticks: 2, 4, 6, 8
    if (val <= 12) return 12;        // ticks: 3, 6, 9, 12
    if (val <= 20) return 20;        // ticks: 5, 10, 15, 20
    if (val <= 40) return 40;        // ticks: 10, 20, 30, 40
    if (val <= 100) return Math.ceil(val / 20) * 20;
    if (val <= 500) return Math.ceil(val / 100) * 100;
    if (val <= 2000) return Math.ceil(val / 500) * 500;
    return Math.ceil(val / 1000) * 1000;
  };

  const maxValue = getNiceMax(rawMax);
  const tickCount = 4;
  const tickStep = maxValue / tickCount;
  const yTicks = Array.from({ length: tickCount }, (_, i) => Math.round(tickStep * (i + 1)));

  const paddingLeft = 50;
  const paddingRight = 16;
  const paddingTop = 12;
  const paddingBottom = 36;
  const chartHeight = 280;
  const plotHeight = chartHeight - paddingTop - paddingBottom;
  const plotWidth = containerWidth - paddingLeft - paddingRight;
  const barWidth = Math.min(42, plotWidth / (data.length || 1) - 10);
  const colCount = data.length;
  const colSpacing = colCount > 0 ? plotWidth / colCount : 0;
  const barRadius = 6;

  const getY = (val) => paddingTop + plotHeight - (val / maxValue) * plotHeight;
  const baseline = paddingTop + plotHeight;

  const roundedTopRect = (x, y, w, h, r) => {
    if (h <= 0) return '';
    const cr = Math.min(r, w / 2, h);
    const bottom = y + h;
    return `M${x},${bottom} L${x},${y + cr} Q${x},${y} ${x + cr},${y} L${x + w - cr},${y} Q${x + w},${y} ${x + w},${y + cr} L${x + w},${bottom} Z`;
  };

  // Format time: "13:00" → "01:00"
  const formatTimeLabel = (time) => {
    if (!time) return '--:--';
    const [h, m] = time.split(':').map(Number);
    const hour12 = h % 12 || 12;
    const mm = (m || 0).toString().padStart(2, '0');
    return `${hour12.toString().padStart(2, '0')}:${mm}`;
  };

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div ref={containerRef} className="custom-bar-chart" style={{ width: '100%', height: '100%' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: chartHeight, color: 'var(--text-tertiary)', fontSize: '14px'
        }}>
          No attendance data yet
        </div>
      </div>
    );
  }

  // Tooltip position
  const getTooltipPos = (index) => {
    const colCenter = paddingLeft + colSpacing * index + colSpacing / 2;
    const val = data[index]?.scans || 0;
    const barTopY = getY(Math.min(val, maxValue));
    return { x: colCenter, y: barTopY - 10 };
  };

  return (
    <div ref={containerRef} className="custom-bar-chart" style={{ width: '100%', height: '100%', position: 'relative' }}>
      {containerWidth > 0 && (
        <>
          <svg
            width={containerWidth}
            height={chartHeight}
            viewBox={`0 0 ${containerWidth} ${chartHeight}`}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {/* Gradient definition for orange bars */}
            <defs>
              <linearGradient id="barGradPD" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E8590C" />
                <stop offset="100%" stopColor="#FFB380" />
              </linearGradient>
            </defs>

            {/* Horizontal grid lines */}
            {yTicks.map(t => (
              <line key={t} x1={paddingLeft} y1={getY(t)} x2={containerWidth - paddingRight} y2={getY(t)} stroke="var(--border-color)" strokeWidth="1" />
            ))}
            <line x1={paddingLeft} y1={baseline} x2={containerWidth - paddingRight} y2={baseline} stroke="var(--border-color)" strokeWidth="1" />

            {/* Y-axis labels */}
            {yTicks.map(t => (
              <text key={t} x={paddingLeft - 12} y={getY(t) + 4} textAnchor="end" fontSize="12" fill="var(--text-tertiary)" fontFamily="Inter, sans-serif" fontWeight="500">
                {t >= 1000 ? `${(t / 1000).toFixed(t % 1000 === 0 ? 0 : 1)}k` : t.toLocaleString()}
              </text>
            ))}

            {/* Bars */}
            {data.map((d, i) => {
              const colCenter = paddingLeft + colSpacing * i + colSpacing / 2;
              const barX = colCenter - barWidth / 2;
              const isHovered = hoveredIndex === i;
              // Grey bar always reaches full height
              const greyH = plotHeight;
              const greyY = baseline - greyH;
              // Orange bar proportional to scans
              const scans = Math.min(d.scans || 0, maxValue);
              const orangeH = (scans / maxValue) * plotHeight;
              const orangeY = baseline - orangeH;
              return (
                <g key={i}>
                  <path d={roundedTopRect(barX, greyY, barWidth, greyH, barRadius)} fill="var(--chart-bar-bg)" opacity={isHovered ? 0.7 : 1} />
                  {orangeH > 0 && (
                    <path
                      d={roundedTopRect(barX, orangeY, barWidth, orangeH, barRadius)}
                      fill="url(#barGradPD)"
                      opacity={isHovered ? 1 : 0.85}
                      style={{ transition: 'all 0.3s ease' }}
                    />
                  )}
                  {/* Invisible hit-area for hover */}
                  <rect
                    x={colCenter - colSpacing / 2}
                    y={paddingTop}
                    width={colSpacing}
                    height={plotHeight + paddingBottom}
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                </g>
              );
            })}

            {/* X-axis time labels */}
            {data.map((d, i) => {
              const colCenter = paddingLeft + colSpacing * i + colSpacing / 2;
              return (
                <text
                  key={i}
                  x={colCenter}
                  y={chartHeight - 8}
                  textAnchor="middle"
                  fontSize="11"
                  fill={hoveredIndex === i ? 'var(--text-primary)' : 'var(--text-tertiary)'}
                  fontWeight={hoveredIndex === i ? '600' : '500'}
                  fontFamily="Inter, sans-serif"
                  style={{ transition: 'all 0.2s ease' }}
                >
                  {formatTimeLabel(d.time)}
                </text>
              );
            })}
          </svg>

          {/* Floating tooltip */}
          {hoveredIndex !== null && data[hoveredIndex] && (() => {
            const pos = getTooltipPos(hoveredIndex);
            const d = data[hoveredIndex];
            return (
              <div
                className="chart-tooltip"
                style={{
                  position: 'absolute',
                  left: pos.x,
                  top: pos.y,
                  transform: 'translate(-50%, -100%)',
                  background: 'var(--tooltip-bg, #1a1a2e)',
                  color: 'var(--tooltip-text, #fff)',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  zIndex: 10,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                  transition: 'opacity 0.15s ease, top 0.15s ease, left 0.15s ease',
                  opacity: 1,
                }}
              >
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#FF8C42' }}>
                  {(d.scans || 0).toLocaleString()} {d.scans === 1 ? 'scan' : 'scans'}
                </div>
                <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>
                  {formatTimeLabel(d.time)} — {formatTimeLabel(
                    (() => {
                      const [h, m] = d.time.split(':').map(Number);
                      const totalMin = h * 60 + m + 30;
                      return `${Math.floor(totalMin / 60).toString().padStart(2, '0')}:${(totalMin % 60).toString().padStart(2, '0')}`;
                    })()
                  )}
                </div>
                {/* Tooltip arrow */}
                <div style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: '-6px',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: '6px solid var(--tooltip-bg, #1a1a2e)',
                }} />
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

/* ============================================
   CHART DATA UTILITIES
   Generate a skeleton of all 30-min slots and merge
   with backend buckets (Phase 3 of the implementation).
   ============================================ */
function generateChartSkeleton(startTime, endTime) {
  const slots = [];
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  // Floor start to nearest 30-min boundary
  let current = sh * 60 + (sm < 30 ? 0 : 30);
  // Ceil end to nearest 30-min boundary
  const end = eh * 60 + (em <= 0 ? 0 : em <= 30 ? 30 : 60);
  while (current <= end) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    slots.push({
      time: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
      scans: 0
    });
    current += 30;
  }
  return slots;
}

function mergeChartData(buckets, startTime, endTime, scanRangeStart, scanRangeEnd) {
  // Widen the skeleton to include actual scan times (handles scans outside the program window)
  let effectiveStart = startTime;
  let effectiveEnd = endTime;
  if (scanRangeStart && scanRangeStart < effectiveStart) effectiveStart = scanRangeStart;
  if (scanRangeEnd && scanRangeEnd > effectiveEnd) effectiveEnd = scanRangeEnd;
  const skeleton = generateChartSkeleton(effectiveStart, effectiveEnd);
  const bucketMap = {};
  buckets.forEach(b => { bucketMap[b.time] = b.scans; });
  return skeleton.map(slot => ({
    ...slot,
    scans: bucketMap[slot.time] || 0
  }));
}

/* ============================================
   MAIN COMPONENT
   ============================================ */
function ProgramDetail() {
  const { id } = useParams();
  const [program, setProgram] = useState(null);
  const [totalScans, setTotalScans] = useState(0);
  const [attendanceData, setAttendanceData] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [countOnlyStats, setCountOnlyStats] = useState({ maleCount: 0, femaleCount: 0, firstTimerCount: 0 });
  const [collectDataStats, setCollectDataStats] = useState({ maleCount: 0, femaleCount: 0, firstTimerCount: 0 });
  const [formsSubmitted, setFormsSubmitted] = useState(0);
  const [countOnlyScans, setCountOnlyScans] = useState([]);
  const [churchData, setChurchData] = useState({ name: '', branch: '', email: '', logo: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [winnersGifted, setWinnersGifted] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('ingather-theme') === 'dark');
  const [chartPage, setChartPage] = useState(0);
  const toast = useToast();
  const BARS_PER_PAGE = 8;
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  // Theme
  useEffect(() => {
    if (darkMode) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('ingather-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    const previousOverflow = document.body.style.overflow;

    document.addEventListener('keydown', handleEscape);
    if (isMobileMenuOpen) document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);



  // Socket.io real-time
  useEffect(() => {
    fetchProgramData();
    const socket = io(process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000');
    socket.emit('join-program', id);
    socket.on(`program-${id}-update`, (data) => {
      if (data.totalScans !== undefined) {
        setTotalScans(data.totalScans);
        // Re-fetch chart data and merge into skeleton
        getAttendanceData(id).then(d => {
          if (d.buckets && d.startTime && d.endTime) {
            setAttendanceData(mergeChartData(d.buckets, d.startTime, d.endTime, d.scanRangeStart, d.scanRangeEnd));
          } else {
            console.warn('📊 Chart: unexpected response shape', d);
          }
        }).catch(err => console.error('📊 Chart refresh error:', err));
      }
      if (data.maleCount !== undefined) {
        setCountOnlyStats({ maleCount: data.maleCount, femaleCount: data.femaleCount, firstTimerCount: data.firstTimerCount });
      }
      if (data.attendeeMaleCount !== undefined) {
        setCollectDataStats({ maleCount: data.attendeeMaleCount, femaleCount: data.attendeeFemaleCount, firstTimerCount: data.attendeeFirstTimerCount });
        if (data.attendeeTotal !== undefined) setFormsSubmitted(data.attendeeTotal);
        getAttendees(id).then(d => setAttendees(d.attendees)).catch(() => {});
      }
      if (data.winnersGifted !== undefined) {
        setWinnersGifted(data.winnersGifted);
        if (data.giftedAttendeeId) setAttendees(prev => prev.map(a => a.id === data.giftedAttendeeId ? { ...a, isGifted: true } : a));
      }
    });
    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchProgramData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { window.location.href = '/login'; return; }
      const { getCurrentChurch } = await import('../api/authService');
      const church = await getCurrentChurch();
      setChurchData({ name: church.churchName, branch: church.branchName, email: church.email || '', logo: church.logoUrl });
      // Fetch unread notification count
      try {
        const axios = (await import('axios')).default;
        const countRes = await axios.get(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/notifications/unread-count`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        setUnreadCount(countRes.data.unreadCount || 0);
      } catch (err) {
        console.error('Error fetching unread count:', err);
      }
      const programData = await getProgramById(id);
      setProgram({ ...programData, status: programData.isActive ? 'active' : 'completed' });
      setTotalScans(programData.totalScans);
      setWinnersGifted(programData.winnersGifted || 0);
      const attendeesData = await getAttendees(id);
      setAttendees(attendeesData.attendees);
      // Fetch chart data, then merge into skeleton
      try {
        const chartResponse = await getAttendanceData(id);
        console.log('📊 Chart response:', chartResponse);
        if (chartResponse.buckets && chartResponse.startTime && chartResponse.endTime) {
          setAttendanceData(mergeChartData(chartResponse.buckets, chartResponse.startTime, chartResponse.endTime, chartResponse.scanRangeStart, chartResponse.scanRangeEnd));
        } else {
          console.warn('📊 Chart: unexpected response shape', chartResponse);
        }
      } catch (chartErr) {
        console.error('📊 Chart data fetch error:', chartErr);
      }
      if (programData.trackingMode === 'count-only') {
        try {
          const axios = (await import('axios')).default;
          const statsResponse = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/programs/${id}/count-stats`, { headers: { 'Authorization': `Bearer ${token}` } });
          setCountOnlyStats(statsResponse.data.stats);
          const scansResponse = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/scan/program/${id}/scans`, { headers: { 'Authorization': `Bearer ${token}` } });
          setCountOnlyScans(scansResponse.data.scans || []);
        } catch (error) { console.error('Error fetching count-only stats:', error); }
      } else {
        const maleCount = attendeesData.attendees.filter(a => a.sex === 'Male').length;
        const femaleCount = attendeesData.attendees.filter(a => a.sex === 'Female').length;
        const firstTimerCount = attendeesData.attendees.filter(a => a.firstTimer).length;
        setCollectDataStats({ maleCount, femaleCount, firstTimerCount });
        setFormsSubmitted(attendeesData.attendees.length);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching program:', error);
      if (error.response?.status === 401) { localStorage.removeItem('token'); window.location.href = '/login'; }
      setLoading(false);
    }
  };

  const handleStopProgram = async () => {
    toast.confirm('Are you sure you want to end this program? The QR code will be disabled.', async () => {
      try {
        await stopProgramAPI(id);
        setProgram({ ...program, isActive: false, status: 'completed' });
        toast.success('Program ended successfully!');
      } catch (error) { toast.error('Failed to stop program.'); }
    });
  };

  const handleDownloadQR = () => {
    const canvas = document.getElementById('qr-code-canvas');
    const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = `${program.title}-QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintQR = () => window.print();

  const handleExportPDF = async () => {
    try {
      const { getCurrentChurch } = await import('../api/authService');
      const church = await getCurrentChurch();
      const attendeesData = await getAttendees(id);
      const attendeesList = attendeesData.attendees;
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setDrawColor(249, 109, 16); doc.setLineWidth(1); doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
      doc.setFillColor(249, 109, 16); doc.rect(14, 14, pageWidth - 28, 30, 'F');
      doc.setFontSize(24); doc.setTextColor(235, 235, 211); doc.setFont(undefined, 'bold');
      doc.text('ATTENDANCE REPORT', pageWidth / 2, 28, { align: 'center' });
      doc.setFontSize(9); doc.setFont(undefined, 'normal');
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 37, { align: 'center' });
      let yPos = 55;
      doc.setFillColor(248, 248, 248); doc.rect(14, yPos - 5, pageWidth - 28, 38, 'F');
      doc.setTextColor(0, 0, 0); doc.setFontSize(13); doc.setFont(undefined, 'bold');
      doc.text('CHURCH INFORMATION', 18, yPos); yPos += 8;
      doc.setFontSize(10); const col1 = 18; const col2 = pageWidth / 2 + 5;
      doc.setFont(undefined, 'bold'); doc.text('Church Name:', col1, yPos); doc.setFont(undefined, 'normal'); doc.text(church.churchName, col1 + 32, yPos);
      doc.setFont(undefined, 'bold'); doc.text('Email:', col2, yPos); doc.setFont(undefined, 'normal'); doc.text(church.email, col2 + 15, yPos); yPos += 6;
      doc.setFont(undefined, 'bold'); doc.text('Branch:', col1, yPos); doc.setFont(undefined, 'normal'); doc.text(church.branchName, col1 + 32, yPos);
      doc.setFont(undefined, 'bold'); doc.text('Location:', col2, yPos); doc.setFont(undefined, 'normal'); doc.text(church.location, col2 + 15, yPos); yPos += 15;
      doc.setFontSize(13); doc.setFont(undefined, 'bold'); doc.text('PROGRAM INFORMATION', 18, yPos); yPos += 8;
      doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.text('Title:', col1, yPos); doc.setFont(undefined, 'normal'); doc.text(program.title, col1 + 32, yPos); yPos += 6;
      doc.setFont(undefined, 'bold'); doc.text('Date:', col1, yPos); doc.setFont(undefined, 'normal');
      doc.text(new Date(program.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }), col1 + 32, yPos); yPos += 15;
      const fileName = `${church.churchName.replace(/\s+/g, '-')}-${program.title.replace(/\s+/g, '-')}-Report.pdf`;
      doc.save(fileName);
      toast.success('PDF Report exported successfully!');
    } catch (error) { toast.error('Failed to export PDF: ' + error.message); }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleLogout = () => {
    toast.confirm('Are you sure you want to logout?', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('church');
      window.location.href = '/';
    });
  };

  const toggleTheme = () => setDarkMode(prev => !prev);

  const churchInitials = churchData.name ? churchData.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'IN';

  // Get correct stats based on mode
  const stats = program?.trackingMode === 'count-only' ? countOnlyStats : collectDataStats;

  /* ---- LOADING ---- */
  if (loading) {
    return (
      <div className="dashboard">
        <aside className="sidebar">
          <div className="sidebar-logo"><a href="/dashboard" className="sidebar-logo-link"><span className="sidebar-logo-icon">{Icons.logo}</span><span className="sidebar-logo-text">Ingather</span></a></div>
        </aside>
        <main className="dashboard-main">
          <div className="dashboard-loading"><div className="spinner"></div><p>Loading program...</p></div>
        </main>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="dashboard">
        <aside className="sidebar">
          <div className="sidebar-logo"><a href="/dashboard" className="sidebar-logo-link"><span className="sidebar-logo-icon">{Icons.logo}</span><span className="sidebar-logo-text">Ingather</span></a></div>
        </aside>
        <main className="dashboard-main">
          <div className="dashboard-loading"><p>Program not found</p></div>
        </main>
      </div>
    );
  }

  /* ---- MAIN RENDER ---- */
  return (
    <div className="dashboard">
      {/* ====== SIDEBAR ====== */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-drawer-open' : ''}`}>
        <div className="sidebar-logo">
          <a href="/dashboard" className="sidebar-logo-link">
            <span className="sidebar-logo-icon">{Icons.logo}</span>
            <span className="sidebar-logo-text">Ingather</span>
          </a>
          <button className="sidebar-collapse-btn" title="Toggle sidebar">{Icons.collapse}</button>
        </div>
        <nav className="sidebar-nav">
          <a href="/dashboard" className="nav-item" onClick={closeMobileMenu}><span className="nav-icon">{Icons.dashboard}</span><span>Dashboard</span></a>
          <a href="/create-program" className="nav-item active" onClick={closeMobileMenu}><span className="nav-icon">{Icons.createProgram}</span><span>Create Program</span></a>
          <a href="/programs" className="nav-item" onClick={closeMobileMenu}><span className="nav-icon">{Icons.allPrograms}</span><span>All Program</span></a>
          <a href="/settings" className="nav-item" onClick={closeMobileMenu}><span className="nav-icon">{Icons.settings}</span><span>Settings</span></a>
        </nav>
        <div className="sidebar-footer">
          <a href="/settings?tab=notifications" className="sidebar-footer-item" onClick={closeMobileMenu}><span className="nav-icon">{Icons.notification}</span><span>Notification</span>{unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}</a>
          <button className="btn-logout" onClick={() => { closeMobileMenu(); handleLogout(); }}><span className="nav-icon">{Icons.logout}</span><span>Log out</span></button>
        </div>
        <div className="sidebar-profile" onClick={() => { closeMobileMenu(); window.location.href = '/settings'; }}>
          <div className="sidebar-profile-avatar">
            {churchData.logo ? <img src={churchData.logo} alt={churchData.name} /> : <span className="sidebar-profile-avatar-fallback">{churchInitials}</span>}
          </div>
          <div className="sidebar-profile-info">
            <div className="sidebar-profile-name">{churchData.name}</div>
            <div className="sidebar-profile-email">{churchData.email}</div>
          </div>
          <span className="sidebar-profile-chevron">{Icons.chevronRight}</span>
        </div>
      </aside>
      {isMobileMenuOpen && (
        <button
          type="button"
          className="mobile-sidebar-backdrop"
          aria-label="Close navigation menu"
          onClick={closeMobileMenu}
        />
      )}

      {/* ====== MAIN ====== */}
      <main className="dashboard-main">
        {/* Top Navbar */}
        <header className="top-navbar">
          <div className="navbar-left" style={{ gap: '12px' }}>
            <button
              type="button"
              className="mobile-menu-btn"
              aria-label="Open navigation menu"
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
            <button className="btn-back-arrow" onClick={() => window.location.href = '/dashboard'} title="Back">{Icons.arrowLeft}</button>
          </div>
          <div className="navbar-right">
            <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
              <span className="theme-toggle-label">{darkMode ? 'Night Mode' : 'Day Mode'}</span>
              <span className="theme-toggle-icon">{darkMode ? Icons.moon : Icons.sun}</span>
            </button>
            {program.isActive ? (
              <button className="btn-end-program" onClick={handleStopProgram}>End Current Program</button>
            ) : (
              <button className="btn-end-program" disabled>Program Ended</button>
            )}
            <button className="navbar-icon-btn" title="Notifications" onClick={() => window.location.href = '/settings?tab=notifications'}>{Icons.notification}{unreadCount > 0 && <span className="icon-badge"></span>}</button>
            <button className="navbar-icon-btn" title="Settings" onClick={() => window.location.href = '/settings'}>{Icons.gear}</button>
            <div className="navbar-avatar-dropdown" ref={profileMenuRef}>
              <div className="navbar-avatar" onClick={() => window.location.href = '/settings'} title="View Profile">
                {churchData.logo ? <img src={churchData.logo} alt={churchData.name} /> : <div className="navbar-avatar-fallback">{churchInitials}</div>}
              </div>
              <span className={`chevron-toggle ${showProfileMenu ? 'open' : ''}`} onClick={() => setShowProfileMenu(prev => !prev)}>
                {Icons.chevronDown}
              </span>
              {showProfileMenu && (
                <div className="profile-dropdown-menu">
                  <button className="profile-dropdown-item" onClick={() => { setShowProfileMenu(false); window.location.href = '/settings'; }}>
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="7" r="3" /><path d="M3 18v-1a5 5 0 0110 0v1" /><path d="M14 3.5a3 3 0 010 5.5" /><path d="M17 18v-1a5 5 0 00-3-4.5" /></svg>
                    View Profile
                  </button>
                  <div className="profile-dropdown-divider"></div>
                  <button className="profile-dropdown-item logout-item" onClick={() => { setShowProfileMenu(false); handleLogout(); }}>
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17H4a1 1 0 01-1-1V4a1 1 0 011-1h3" /><polyline points="11,14 17,10 11,6" /><line x1="17" y1="10" x2="7" y2="10" /></svg>
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          {/* Program Header */}
          <div className="pd-header">
            <h2 className="pd-title">{program.title}</h2>
            <div className="pd-pills">
              <span className="pd-pill">{Icons.calendar} {formatDate(program.date)}</span>
              <span className="pd-pill">{Icons.clock} {program.startTime} - {program.endTime}</span>
            </div>
          </div>

          {/* ====== COUNT-ONLY MODE — 4 Stat Cards ====== */}
          {program.trackingMode === 'count-only' && (
            <div className="pd-stats-grid">
              <div className="pd-stat-card primary">
                <div className="stat-icon-box">{Icons.people}</div>
                <div className="pd-stat-info">
                  <div className="pd-stat-label">Total Attendance</div>
                  <div className="pd-stat-value">{totalScans.toLocaleString()}</div>
                  <div className="pd-stat-sub">{program.isActive ? 'Live scans' : 'Total scans'}</div>
                </div>
                {program.isActive && <div className="live-dot"></div>}
              </div>
              <div className="pd-stat-card">
                <div className="stat-icon-box icon-blue">{Icons.male}</div>
                <div className="pd-stat-info">
                  <div className="pd-stat-label">Male</div>
                  <div className="pd-stat-value">{stats.maleCount}</div>
                </div>
                <span className="stat-info-icon">{Icons.info}</span>
              </div>
              <div className="pd-stat-card">
                <div className="stat-icon-box icon-pink">{Icons.female}</div>
                <div className="pd-stat-info">
                  <div className="pd-stat-label">Female</div>
                  <div className="pd-stat-value">{stats.femaleCount}</div>
                </div>
                <span className="stat-info-icon">{Icons.info}</span>
              </div>
              <div className="pd-stat-card">
                <div className="stat-icon-box icon-purple">{Icons.star}</div>
                <div className="pd-stat-info">
                  <div className="pd-stat-label">First Timer</div>
                  <div className="pd-stat-value">{stats.firstTimerCount}</div>
                </div>
                <span className="stat-info-icon">{Icons.info}</span>
              </div>
            </div>
          )}

          {/* ====== COLLECT-DATA MODE — Dynamic Stat Layout ====== */}
          {program.trackingMode === 'collect-data' && (
            <>
              {/* Row 1: Total Attendance + Form Submitted + (optional First Timer) */}
              <div className={`pd-stats-grid pd-stats-row1 ${program.dataFields?.firstTimer ? 'cols-3' : 'cols-2'}`}>
                {/* Total Attendance — Primary */}
                <div className="pd-stat-card primary">
                  <div className="stat-icon-box">{Icons.people}</div>
                  <div className="pd-stat-info">
                    <div className="pd-stat-label">Total Attendance</div>
                    <div className="pd-stat-value">{totalScans.toLocaleString()}</div>
                    <div className="pd-stat-sub">{program.isActive ? 'Live scans' : 'Total scans'}</div>
                  </div>
                  {program.isActive && <div className="live-dot"></div>}
                </div>
                {/* Form Submitted */}
                <div className="pd-stat-card">
                  <div className="stat-icon-box icon-orange-outline">{Icons.formDoc}</div>
                  <div className="pd-stat-info">
                    <div className="pd-stat-label">Form Submitted</div>
                    <div className="pd-stat-value">{formsSubmitted}</div>
                  </div>
                  <span className="stat-info-icon">{Icons.info}</span>
                </div>
                {/* First Timer (conditional) */}
                {program.dataFields?.firstTimer && (
                  <div className="pd-stat-card">
                    <div className="stat-icon-box icon-purple">{Icons.starOutline}</div>
                    <div className="pd-stat-info">
                      <div className="pd-stat-label">First Timer</div>
                      <div className="pd-stat-value">{stats.firstTimerCount}</div>
                    </div>
                    <span className="stat-info-icon">{Icons.info}</span>
                  </div>
                )}
              </div>

              {/* Row 2: Secondary Metrics — Gender / Gifting (conditional) */}
              {(program.dataFields?.sex || program.giftingEnabled) && (
                <div className="pd-secondary-metrics">
                  {/* Gender Card */}
                  {program.dataFields?.sex && (
                    <div className="pd-metric-card">
                      <span className="pd-metric-pill purple">Gender</span>
                      <div className="pd-metric-row">
                        <div className="pd-metric-item">
                          <span className="pd-metric-icon male">{Icons.maleSymbol}</span>
                          <div>
                            <div className="pd-metric-item-label">Male</div>
                            <div className="pd-metric-item-value">{stats.maleCount}</div>
                          </div>
                        </div>
                        <div className="pd-metric-item">
                          <span className="pd-metric-icon female">{Icons.femaleSymbol}</span>
                          <div>
                            <div className="pd-metric-item-label">Female</div>
                            <div className="pd-metric-item-value">{stats.femaleCount}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Gifting Card */}
                  {program.giftingEnabled && (
                    <div className="pd-metric-card">
                      <span className="pd-metric-pill orange">Gifting</span>
                      <div className="pd-metric-row">
                        <div className="pd-metric-item">
                          <span className="pd-metric-icon gift">{Icons.giftBox}</span>
                          <div>
                            <div className="pd-metric-item-label">Winner Selected</div>
                            <div className="pd-metric-item-value">{attendees.filter(a => a.isWinner).length}/{attendees.length}</div>
                          </div>
                        </div>
                        <div className="pd-metric-item">
                          <span className="pd-metric-icon gifted">{Icons.checkDouble}</span>
                          <div>
                            <div className="pd-metric-item-label">Winner Gifted</div>
                            <div className="pd-metric-item-value">{winnersGifted}/{attendees.length}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Middle Row: Chart + QR Code */}
          <div className="pd-middle-row">
            {/* Chart Card */}
            <div className="pd-chart-card">
              <h3 className="pd-chart-title">Attendance Overtime</h3>
              <div className="pd-chart-area">
                {(() => {
                  const startIdx = chartPage * BARS_PER_PAGE;
                  const slicedData = attendanceData.slice(startIdx, startIdx + BARS_PER_PAGE);
                  return <AttendanceBarChart data={slicedData} />;
                })()}
              </div>
              <div className="pd-chart-pagination">
                <button
                  title="Previous"
                  disabled={chartPage === 0}
                  onClick={() => setChartPage(p => Math.max(0, p - 1))}
                >{Icons.arrowLeftSmall}</button>
                <button
                  title="Next"
                  disabled={(chartPage + 1) * BARS_PER_PAGE >= attendanceData.length}
                  onClick={() => setChartPage(p => p + 1)}
                >{Icons.arrowRight}</button>
              </div>
            </div>

            {/* QR Code Card */}
            <div className="pd-qr-card">
              <h3 className="pd-qr-card-title">QR Code</h3>
              <p className="pd-qr-card-sub">Deploy this QR Code at your Church Entrance</p>
              <div className="pd-qr-canvas" id="qr-print-area">
                <QRCodeCanvas id="qr-code-canvas" value={program.qrCodeUrl} size={160} level="H" includeMargin={true} />
              </div>
              <h4 className="pd-qr-program-title">{program.title}</h4>
              <p className="pd-qr-scan-text">Scan to check in</p>
              <div className="pd-qr-link-row">
                <p className="pd-qr-link">{program.qrCodeUrl}</p>
                <button
                  className="pd-copy-btn"
                  title="Copy link"
                  onClick={(e) => {
                    navigator.clipboard.writeText(program.qrCodeUrl);
                    const btn = e.currentTarget;
                    btn.classList.add('copied');
                    setTimeout(() => btn.classList.remove('copied'), 1500);
                  }}
                >
                  <svg className="copy-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
                    <path d="M10.5 5.5V3.5a1.5 1.5 0 00-1.5-1.5H3.5A1.5 1.5 0 002 3.5V9A1.5 1.5 0 003.5 10.5H5.5" />
                  </svg>
                  <svg className="check-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3,8 7,12 13,4" />
                  </svg>
                </button>
              </div>
              <button className="pd-qr-btn-download" onClick={handleDownloadQR}>
                {Icons.download} Download QR Code
              </button>
              <button className="pd-qr-btn-print" onClick={handlePrintQR}>
                {Icons.printer} Print QR Code
              </button>
              {program.isActive ? (
                <span className="pd-qr-status active"><span className="status-dot"></span> QR Code is Active - Accepting Scans</span>
              ) : (
                <span className="pd-qr-status inactive"><span className="status-dot"></span> QR Code is Disabled</span>
              )}
            </div>
          </div>

          {/* Attendee Data Table — Count Only Mode */}
          {program.trackingMode === 'count-only' && countOnlyScans.length > 0 && (
            <div className="pd-attendee-card">
              <div className="pd-attendee-header">
                <div>
                  <h3 className="pd-attendee-title">Attendee Data</h3>
                  <p className="pd-attendee-sub">People who submitted the form</p>
                </div>
              </div>
              <div className="pd-table-container">
                <table className="pd-table">
                  <thead><tr><th>Gender</th><th>First Timer</th><th>Scan Time</th></tr></thead>
                  <tbody>
                    {countOnlyScans.map((scan) => (
                      <tr key={scan.id}>
                        <td data-label="Gender"><strong>{scan.gender ? scan.gender.charAt(0).toUpperCase() + scan.gender.slice(1) : '-'}</strong></td>
                        <td data-label="First Timer">{scan.firstTimer ? <span className="pd-badge-yes">Yes</span> : <span className="pd-badge-no">No</span>}</td>
                        <td data-label="Scan Time">{new Date(scan.scanTime).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Attendee Data Table — Collect Data Mode */}
          {program.trackingMode === 'collect-data' && attendees.length > 0 && (
            <div className="pd-attendee-card">
              <div className="pd-attendee-header">
                <div>
                  <h3 className="pd-attendee-title">Attendee Data</h3>
                  <p className="pd-attendee-sub">People who submitted the form</p>
                </div>
              </div>
              <div className="pd-attendee-toolbar">
                <div className="pd-search-box">
                  {Icons.search}
                  <input type="text" placeholder="Search attendees..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <button className="pd-btn-export" onClick={handleExportPDF}>{Icons.exportIcon} Export Data</button>
              </div>
              <div className="pd-table-container">
                <table className="pd-table">
                  <thead>
                    <tr>
                      {program.dataFields?.fullName && <th>Name</th>}
                      {program.dataFields?.fellowship && <th>Fellowship</th>}
                      {program.dataFields?.age && <th>Age</th>}
                      {program.giftingEnabled && <th>Winner</th>}
                      {program.giftingEnabled && <th>Gifted</th>}
                      <th>Scan Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendees.filter(a => !searchQuery.trim() || (a.fullName || '').toLowerCase().includes(searchQuery.toLowerCase())).map(attendee => (
                      <tr key={attendee.id}>
                        {program.dataFields?.fullName && <td data-label="Name"><strong>{attendee.fullName || '-'}</strong></td>}
                        {program.dataFields?.fellowship && <td data-label="Fellowship">{attendee.fellowship || '-'}</td>}
                        {program.dataFields?.age && <td data-label="Age">{attendee.age ? `${attendee.age} Years` : '-'}</td>}
                        {program.giftingEnabled && (
                          <td data-label="Winner">
                            {attendee.isWinner ? <span className="pill-winner">✓ Completed</span> : <span className="pill-dash">-</span>}
                          </td>
                        )}
                        {program.giftingEnabled && (
                          <td data-label="Gifted">
                            {attendee.isWinner ? (
                              attendee.isGifted ? (
                                <span className="pill-gifted">✓ Gifted</span>
                              ) : (
                                <span className="pill-pending" onClick={() => {
                                  toast.confirm(`Mark ${attendee.fullName || 'this winner'} as gifted?`, async () => {
                                    try {
                                      await markWinnerGifted(id, attendee.id);
                                      setAttendees(prev => prev.map(a => a.id === attendee.id ? { ...a, isGifted: true } : a));
                                      setWinnersGifted(prev => prev + 1);
                                      toast.success(`${attendee.fullName || 'Winner'} marked as gifted!`);
                                    } catch (err) { toast.error('Failed to mark as gifted.'); }
                                  });
                                }}>Pending...</span>
                              )
                            ) : <span className="pill-dash">-</span>}
                          </td>
                        )}
                        <td data-label="Scan Time">{new Date(attendee.scanTime).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default ProgramDetail;
