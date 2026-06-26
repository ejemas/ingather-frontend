import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useParams } from 'react-router-dom';
import { getProgramById, getAttendees, getAttendanceData, getProgramDetailBootstrap, getSponsorAnalytics, stopProgram as stopProgramAPI, markWinnerGifted, addManualAttendee, checkInRsvpQr, getRsvpScannerLink, updateStrictDeviceFingerprinting } from '../api/programService';
import InfoTooltip from '../components/InfoTooltip';
import { useToast } from '../components/Toast';
import { useEventTemplate } from '../context/EventTemplateContext';
import '../styles/Dashboard.css';
import '../styles/ProgramDetail.css';

const QRCodeCanvas = React.lazy(() => (
  import('qrcode.react').then(module => ({ default: module.QRCodeCanvas }))
));

const isValidCollectedEmail = (value) => {
  const email = String(value || '').trim();
  return email.length <= 255
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    && email.indexOf('@') === email.lastIndexOf('@');
};

const isValidHttpUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return false;
  try {
    const url = new URL(raw);
    return ['http:', 'https:'].includes(url.protocol);
  } catch (error) {
    return false;
  }
};

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
  settings: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.15" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2h.2a2 2 0 0 1 2 1.75l.16 1.28a7.6 7.6 0 0 1 1.22.7l1.2-.5a2 2 0 0 1 2.46.78l.1.18a2 2 0 0 1-.35 2.55l-1.03.79c.03.23.04.47.04.71s-.01.48-.04.71l1.03.79a2 2 0 0 1 .35 2.55l-.1.18a2 2 0 0 1-2.46.78l-1.2-.5c-.38.27-.79.5-1.22.7l-.16 1.28a2 2 0 0 1-2 1.75H12a2 2 0 0 1-2-1.75l-.16-1.28a7.6 7.6 0 0 1-1.22-.7l-1.2.5a2 2 0 0 1-2.46-.78l-.1-.18a2 2 0 0 1 .35-2.55l1.03-.79a6.62 6.62 0 0 1 0-1.42l-1.03-.79a2 2 0 0 1-.35-2.55l.1-.18a2 2 0 0 1 2.46-.78l1.2.5c.38-.27.79-.5 1.22-.7L10 3.75A2 2 0 0 1 12 2Z" /><circle cx="12" cy="12" r="3" /></svg>),
  notification: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2a5 5 0 015 5c0 4 2 5 2 5H3s2-1 2-5a5 5 0 015-5z" /><path d="M8.5 17a1.5 1.5 0 003 0" /></svg>),
  logout: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17H4a1 1 0 01-1-1V4a1 1 0 011-1h3" /><polyline points="11,14 17,10 11,6" /><line x1="17" y1="10" x2="7" y2="10" /></svg>),
  chevronRight: (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6,4 10,8 6,12" /></svg>),
  sun: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="3.5" /><line x1="10" y1="2" x2="10" y2="4" /><line x1="10" y1="16" x2="10" y2="18" /><line x1="2" y1="10" x2="4" y2="10" /><line x1="16" y1="10" x2="18" y2="10" /><line x1="4.2" y1="4.2" x2="5.6" y2="5.6" /><line x1="14.4" y1="14.4" x2="15.8" y2="15.8" /><line x1="4.2" y1="15.8" x2="5.6" y2="14.4" /><line x1="14.4" y1="5.6" x2="15.8" y2="4.2" /></svg>),
  moon: (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 10.5A7 7 0 119.5 3a5.5 5.5 0 007.5 7.5z" /></svg>),
  gear: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.15" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2h.2a2 2 0 0 1 2 1.75l.16 1.28a7.6 7.6 0 0 1 1.22.7l1.2-.5a2 2 0 0 1 2.46.78l.1.18a2 2 0 0 1-.35 2.55l-1.03.79c.03.23.04.47.04.71s-.01.48-.04.71l1.03.79a2 2 0 0 1 .35 2.55l-.1.18a2 2 0 0 1-2.46.78l-1.2-.5c-.38.27-.79.5-1.22.7l-.16 1.28a2 2 0 0 1-2 1.75H12a2 2 0 0 1-2-1.75l-.16-1.28a7.6 7.6 0 0 1-1.22-.7l-1.2.5a2 2 0 0 1-2.46-.78l-.1-.18a2 2 0 0 1 .35-2.55l1.03-.79a6.62 6.62 0 0 1 0-1.42l-1.03-.79a2 2 0 0 1-.35-2.55l.1-.18a2 2 0 0 1 2.46-.78l1.2.5c.38-.27.79-.5 1.22-.7L10 3.75A2 2 0 0 1 12 2Z" /><circle cx="12" cy="12" r="3" /></svg>),
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
  copy: (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="5" width="7" height="8" rx="1.2" /><path d="M3 10.5V3.8C3 3.36 3.36 3 3.8 3h6.7" /></svg>),
  plus: (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="3" x2="8" y2="13" /><line x1="3" y1="8" x2="13" y2="8" /></svg>),
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

function SponsorEngagementCard({ analytics }) {
  const sponsors = analytics?.sponsors || [];
  const todayClicks = analytics?.todayClicks || 0;
  const totalClicks = analytics?.totalClicks || 0;
  const topSponsor = analytics?.topSponsor;

  return (
    <div className="pd-sponsor-engagement-card">
      <div className="pd-sponsor-card-header">
        <div>
          <span className="pd-sponsor-kicker">Sponsor ROI</span>
          <h3>Sponsor Engagement</h3>
        </div>
        <span className="pd-sponsor-count">{sponsors.length} active</span>
      </div>

      {sponsors.length === 0 ? (
        <div className="pd-sponsor-empty">
          <strong>No sponsor clicks yet.</strong>
          <span>Add sponsors to this program to track post-check-in ROI.</span>
        </div>
      ) : (
        <>
          <p className="pd-sponsor-roi-line">
            Your sponsor's link was clicked <strong>{todayClicks.toLocaleString()}</strong> times today.
          </p>
          <div className="pd-sponsor-metrics">
            <div>
              <span>Total clicks</span>
              <strong>{totalClicks.toLocaleString()}</strong>
            </div>
            <div>
              <span>Top sponsor</span>
              <strong>{topSponsor?.sponsorName || '-'}</strong>
            </div>
          </div>
          <div className="pd-sponsor-list">
            {sponsors.slice(0, 4).map(sponsor => (
              <div className="pd-sponsor-row" key={sponsor.id}>
                <span>{sponsor.sponsorName}</span>
                <strong>{sponsor.clickCount.toLocaleString()} clicks</strong>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ManualAttendeeModal({
  program,
  template,
  formData,
  errors,
  submitting,
  onChange,
  onClose,
  onSubmit
}) {
  const dataFields = program?.dataFields || {};
  const fieldLabels = {
    fullName: 'Full Name',
    emailAddress: 'Email Address',
    school: 'School',
    link: 'Link',
    phoneNumber: 'Phone Number',
    textarea: program?.dataFieldConfig?.textareaLabel || 'Additional Response',
    address: 'Address',
    department: 'Department',
    fellowship: 'Group',
    age: 'Age',
    sex: 'Gender',
    firstTimer: 'First Timer'
  };

  return (
    <div className="pd-modal-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="pd-manual-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-attendee-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="pd-manual-modal-header">
          <div>
            <span className="pd-manual-kicker">Manual check-in</span>
            <h3 id="manual-attendee-title">Add {template.attendee.singular.toLowerCase()} manually</h3>
            <p>Use this when someone checks in without a smartphone.</p>
          </div>
          <button type="button" className="pd-modal-close" onClick={onClose} aria-label="Close manual entry modal">×</button>
        </div>

        <form className="pd-manual-form" onSubmit={onSubmit}>
          <div className="pd-manual-grid">
            {dataFields.fullName && (
              <label className="pd-manual-field">
                <span>{fieldLabels.fullName}</span>
                <input name="fullName" value={formData.fullName} onChange={onChange} placeholder="Enter full name" />
                {errors.fullName && <small>{errors.fullName}</small>}
              </label>
            )}

            {dataFields.emailAddress && (
              <label className="pd-manual-field">
                <span>{fieldLabels.emailAddress}</span>
                <input type="email" name="emailAddress" value={formData.emailAddress} onChange={onChange} placeholder="name@example.com" />
                {errors.emailAddress && <small>{errors.emailAddress}</small>}
              </label>
            )}

            {dataFields.school && (
              <label className="pd-manual-field">
                <span>{fieldLabels.school}</span>
                <input name="school" value={formData.school} onChange={onChange} placeholder="Enter school" />
                {errors.school && <small>{errors.school}</small>}
              </label>
            )}

            {dataFields.link && (
              <label className="pd-manual-field">
                <span>{fieldLabels.link}</span>
                <input type="url" name="linkUrl" value={formData.linkUrl} onChange={onChange} placeholder="https://github.com/attendee" />
                {errors.linkUrl && <small>{errors.linkUrl}</small>}
              </label>
            )}

            {dataFields.textarea && (
              <label className="pd-manual-field pd-manual-field-wide">
                <span>{fieldLabels.textarea}</span>
                <textarea name="textareaResponse" value={formData.textareaResponse} onChange={onChange} placeholder="Enter response" rows="4" maxLength="5000" />
                {errors.textareaResponse && <small>{errors.textareaResponse}</small>}
              </label>
            )}

            {dataFields.phoneNumber && (
              <label className="pd-manual-field">
                <span>{fieldLabels.phoneNumber}</span>
                <input name="phoneNumber" value={formData.phoneNumber} onChange={onChange} placeholder="Enter phone number" />
                {errors.phoneNumber && <small>{errors.phoneNumber}</small>}
              </label>
            )}

            {dataFields.address && (
              <label className="pd-manual-field pd-manual-field-wide">
                <span>{fieldLabels.address}</span>
                <textarea name="address" value={formData.address} onChange={onChange} placeholder="Enter address" rows="3" />
                {errors.address && <small>{errors.address}</small>}
              </label>
            )}

            {dataFields.department && (
              <label className="pd-manual-field">
                <span>{fieldLabels.department}</span>
                <input name="department" value={formData.department} onChange={onChange} placeholder="Enter department" />
                {errors.department && <small>{errors.department}</small>}
              </label>
            )}

            {dataFields.fellowship && (
              <label className="pd-manual-field">
                <span>{fieldLabels.fellowship}</span>
                <input name="fellowship" value={formData.fellowship} onChange={onChange} placeholder="Enter group" />
              </label>
            )}

            {dataFields.age && (
              <label className="pd-manual-field">
                <span>{fieldLabels.age}</span>
                <input type="number" min="0" max="130" name="age" value={formData.age} onChange={onChange} placeholder="Enter age" />
                {errors.age && <small>{errors.age}</small>}
              </label>
            )}

            {dataFields.sex && (
              <label className="pd-manual-field">
                <span>{fieldLabels.sex}</span>
                <select name="sex" value={formData.sex} onChange={onChange}>
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                {errors.sex && <small>{errors.sex}</small>}
              </label>
            )}

            {dataFields.firstTimer && (
              <label className="pd-manual-check">
                <input type="checkbox" name="firstTimer" checked={formData.firstTimer} onChange={onChange} />
                <span>Mark as first timer</span>
              </label>
            )}
          </div>

          <div className="pd-manual-actions">
            <button type="button" className="pd-btn-cancel" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="pd-btn-submit-manual" disabled={submitting}>
              {submitting ? 'Adding...' : `Add ${template.attendee.singular}`}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function FingerprintWarningModal({ saving, onCancel, onConfirm }) {
  return (
    <div className="pd-modal-overlay" role="presentation" onMouseDown={saving ? undefined : onCancel}>
      <section
        className="pd-fingerprint-warning-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pd-fingerprint-warning-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <span className="pd-manual-kicker">Attendance accuracy</span>
        <h3 id="pd-fingerprint-warning-title">Disable Strict Fingerprinting?</h3>
        <p>
          Allowing multiple scans from the same device can help attendees with poor network connections,
          but it risks skewing your total attendance metrics with duplicate entries.
        </p>
        <div className="pd-manual-actions">
          <button type="button" className="pd-btn-cancel" onClick={onCancel} disabled={saving}>Cancel</button>
          <button type="button" className="pd-btn-submit-manual" onClick={onConfirm} disabled={saving}>
            {saving ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </section>
    </div>
  );
}

function RsvpQrScannerModal({ scanning, result, error, onClose, onSubmit, onReset }) {
  const readerIdRef = useRef(`pd-rsvp-qr-reader-${Math.random().toString(36).slice(2)}`);
  const scannerRef = useRef(null);
  const submittedRef = useRef(false);
  const [manualToken, setManualToken] = useState('');
  const [cameraState, setCameraState] = useState('idle');
  const [cameraMessage, setCameraMessage] = useState('Requesting camera access...');

  useEffect(() => {
    let cancelled = false;

    submittedRef.current = false;

    const stopScanner = async () => {
      const scanner = scannerRef.current;
      if (!scanner) return;

      try {
        await scanner.stop();
      } catch (stopError) {
        // The scanner may already be stopped if camera permission failed or a scan just completed.
      }

      try {
        await scanner.clear();
      } catch (clearError) {
        // Ignore cleanup errors from partially initialized scanner instances.
      }

      if (scannerRef.current === scanner) scannerRef.current = null;
    };

    const startScanner = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState('unsupported');
        setCameraMessage('Camera unavailable? Enter the attendee RSVP token below.');
        return;
      }

      try {
        setCameraState('starting');
        setCameraMessage('Allow camera access to scan RSVP QR codes.');

        const scanner = new Html5Qrcode(readerIdRef.current, { verbose: false });
        scannerRef.current = scanner;

        const config = {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const size = Math.max(180, Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.72));
            return { width: size, height: size };
          },
          aspectRatio: 1
        };

        const handleSuccess = async (decodedText) => {
          if (cancelled || submittedRef.current || !decodedText) return;
          submittedRef.current = true;
          setCameraState('detected');
          setCameraMessage('QR detected. Checking in attendee...');
          await stopScanner();
          if (!cancelled) onSubmit(decodedText);
        };

        const handleScanError = () => {};

        const startWithFallback = async () => {
          try {
            await scanner.start({ facingMode: { exact: 'environment' } }, config, handleSuccess, handleScanError);
            return;
          } catch (exactError) {
            try {
              await scanner.start({ facingMode: 'environment' }, config, handleSuccess, handleScanError);
              return;
            } catch (environmentError) {
              const cameras = await Html5Qrcode.getCameras();
              const preferredCamera = cameras.find(camera => /back|rear|environment/i.test(camera.label || ''))
                || cameras[cameras.length - 1]
                || cameras[0];
              if (!preferredCamera?.id) throw environmentError;
              await scanner.start(preferredCamera.id, config, handleSuccess, handleScanError);
            }
          }
        };

        await startWithFallback();
        if (cancelled) {
          await stopScanner();
          return;
        }
        setCameraState('active');
        setCameraMessage('Scanning RSVP QR code...');
      } catch (cameraError) {
        await stopScanner();
        setCameraState('blocked');
        setCameraMessage('Camera unavailable? Enter the attendee RSVP token below.');
      }
    };

    if (!result) startScanner();
    else setCameraMessage('Ready to scan the next RSVP QR code.');

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [onSubmit, result]);

  const submitManual = (event) => {
    event.preventDefault();
    if (!manualToken.trim() || scanning) return;
    onSubmit(manualToken);
  };

  return (
    <div className="pd-modal-overlay" role="presentation" onMouseDown={scanning ? undefined : onClose}>
      <section
        className="pd-rsvp-scanner-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pd-rsvp-scanner-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="pd-manual-modal-header">
          <div>
            <span className="pd-manual-kicker">RSVP QR check-in</span>
            <h3 id="pd-rsvp-scanner-title">Scan pre-registered attendee</h3>
            <p>Use this for guests who brought the personalized QR code from their RSVP email.</p>
          </div>
          <button type="button" className="pd-modal-close" onClick={onClose} disabled={scanning} aria-label="Close RSVP scanner">×</button>
        </div>

        <div className={`pd-rsvp-camera ${cameraState}`}>
          <div id={readerIdRef.current} className="pd-rsvp-reader" aria-label="RSVP QR scanner camera preview" />
          <div className="pd-rsvp-camera-frame" aria-hidden="true"></div>
        </div>
        <p className="pd-rsvp-camera-copy">{cameraMessage}</p>

        {result && (
          <div className="pd-rsvp-scan-result success">
            <strong>{result.attendee?.fullName || result.attendee?.emailAddress || 'RSVP attendee'} checked in.</strong>
            <span>This attendee is now reflected on the live event dashboard.</span>
          </div>
        )}

        {error && (
          <div className="pd-rsvp-scan-result error">
            <strong>Check-in failed</strong>
            <span>{error}</span>
          </div>
        )}

        <form className="pd-rsvp-manual-form" onSubmit={submitManual}>
          <label className="pd-manual-field">
            <span>RSVP token</span>
            <input
              value={manualToken}
              onChange={(event) => setManualToken(event.target.value)}
              placeholder="A7K9Q2M4"
              disabled={scanning}
            />
          </label>
          <div className="pd-manual-actions">
            {result ? (
              <button type="button" className="pd-btn-submit-manual" onClick={() => { setManualToken(''); onReset(); }}>
                Scan next
              </button>
            ) : (
              <button type="submit" className="pd-btn-submit-manual" disabled={scanning || !manualToken.trim()}>
                {scanning ? 'Checking in...' : 'Check in RSVP'}
              </button>
            )}
            <button type="button" className="pd-btn-cancel" onClick={onClose} disabled={scanning}>Close</button>
          </div>
        </form>
      </section>
    </div>
  );
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
  const [sponsorAnalytics, setSponsorAnalytics] = useState({ sponsorCount: 0, totalClicks: 0, todayClicks: 0, topSponsor: null, sponsors: [] });
  const [sharedDeviceCheckins, setSharedDeviceCheckins] = useState(0);
  const [churchData, setChurchData] = useState({ name: '', branch: '', email: '', logo: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [attendeeFilter, setAttendeeFilter] = useState('all');
  const [winnersGifted, setWinnersGifted] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('ingather-theme') === 'dark');
  const [chartPage, setChartPage] = useState(0);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualFormData, setManualFormData] = useState({
    fullName: '',
    emailAddress: '',
    school: '',
    linkUrl: '',
    textareaResponse: '',
    phoneNumber: '',
    address: '',
    department: '',
    fellowship: '',
    age: '',
    sex: '',
    firstTimer: false
  });
  const [manualErrors, setManualErrors] = useState({});
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [showRsvpScanner, setShowRsvpScanner] = useState(false);
  const [rsvpQrSubmitting, setRsvpQrSubmitting] = useState(false);
  const [rsvpQrResult, setRsvpQrResult] = useState(null);
  const [rsvpQrError, setRsvpQrError] = useState('');
  const rsvpQrSubmittingRef = useRef(false);
  const [rsvpScannerLinkLoading, setRsvpScannerLinkLoading] = useState(false);
  const [showFingerprintWarning, setShowFingerprintWarning] = useState(false);
  const [fingerprintSaving, setFingerprintSaving] = useState(false);
  const toast = useToast();
  const { template, setTemplateKey } = useEventTemplate();
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
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setShowManualModal(false);
        setShowRsvpScanner(false);
        if (!fingerprintSaving) setShowFingerprintWarning(false);
      }
    };
    const previousOverflow = document.body.style.overflow;

    document.addEventListener('keydown', handleEscape);
    if (isMobileMenuOpen || showManualModal || showRsvpScanner || showFingerprintWarning) document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen, showManualModal, showRsvpScanner, showFingerprintWarning, fingerprintSaving]);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);



  // Socket.io real-time
  useEffect(() => {
    let socket;
    let isMounted = true;

    fetchProgramData();
    import('socket.io-client').then(({ default: io }) => {
      if (!isMounted) return;

      socket = io(process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000');
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
        if (data.sharedDeviceCheckins !== undefined) setSharedDeviceCheckins(data.sharedDeviceCheckins);
        getAttendees(id).then(d => setAttendees(d.attendees)).catch(() => {});
      }
      if (data.winnersGifted !== undefined) {
        setWinnersGifted(data.winnersGifted);
        if (data.giftedAttendeeId) setAttendees(prev => prev.map(a => a.id === data.giftedAttendeeId ? { ...a, isGifted: true } : a));
      }
    });
    }).catch(err => console.error('Socket connection error:', err));

    return () => {
      isMounted = false;
      if (socket) socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchProgramData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { window.location.href = '/login'; return; }

      try {
        const bootstrap = await getProgramDetailBootstrap(id);
        const church = bootstrap.church;
        setChurchData({
          name: church.churchName,
          branch: church.branchName,
          email: church.email || '',
          logo: church.logoUrl
        });
        setTemplateKey(church.organizationType || 'general');
        setUnreadCount(bootstrap.unreadCount || 0);

        const programData = bootstrap.program;
        setProgram({ ...programData, status: programData.isActive ? 'active' : 'completed' });
        setTotalScans(programData.totalScans);
        setWinnersGifted(programData.winnersGifted || 0);
        setSharedDeviceCheckins(programData.sharedDeviceCheckins || 0);
        getSponsorAnalytics(id)
          .then(data => setSponsorAnalytics(data))
          .catch(error => console.error('Error fetching sponsor analytics:', error));

        const attendeesData = { attendees: bootstrap.attendees || [] };
        setAttendees(attendeesData.attendees);

        const chartResponse = bootstrap.attendanceData;
        if (chartResponse?.buckets && chartResponse.startTime && chartResponse.endTime) {
          setAttendanceData(mergeChartData(chartResponse.buckets, chartResponse.startTime, chartResponse.endTime, chartResponse.scanRangeStart, chartResponse.scanRangeEnd));
        } else {
          console.warn('Chart: unexpected response shape', chartResponse);
        }

        if (programData.trackingMode === 'count-only') {
          setCountOnlyStats(bootstrap.countOnlyStats || { maleCount: 0, femaleCount: 0, firstTimerCount: 0 });
          setCountOnlyScans(bootstrap.countOnlyScans || []);
        } else {
          const maleCount = attendeesData.attendees.filter(a => a.sex === 'Male').length;
          const femaleCount = attendeesData.attendees.filter(a => a.sex === 'Female').length;
          const firstTimerCount = attendeesData.attendees.filter(a => a.firstTimer).length;
          setCollectDataStats({ maleCount, femaleCount, firstTimerCount });
          setFormsSubmitted(attendeesData.attendees.length);
        }

        setLoading(false);
        return;
      } catch (bootstrapError) {
        console.error('Error fetching program bootstrap:', bootstrapError);
        if (bootstrapError.response?.status === 401) throw bootstrapError;
      }

      const { getCurrentChurch } = await import('../api/authService');
      const church = await getCurrentChurch();
      setChurchData({ name: church.churchName, branch: church.branchName, email: church.email || '', logo: church.logoUrl });
      setTemplateKey(church.organizationType || 'general');
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
      setSharedDeviceCheckins(programData.sharedDeviceCheckins || 0);
      getSponsorAnalytics(id)
        .then(data => setSponsorAnalytics(data))
        .catch(error => console.error('Error fetching sponsor analytics:', error));
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
    toast.confirm(`Are you sure you want to end this ${template.event.singular.toLowerCase()}? The QR code will be disabled.`, async () => {
      try {
        await stopProgramAPI(id);
        setProgram({ ...program, isActive: false, status: 'completed' });
        toast.success(`${template.event.singular} ended successfully!`);
      } catch (error) { toast.error(`Failed to stop ${template.event.singular.toLowerCase()}.`); }
    });
  };

  const handleDownloadQR = () => {
    const canvas = document.getElementById('qr-code-canvas');
    if (!canvas) {
      toast.info('QR code is still loading. Please try again in a moment.');
      return;
    }
    const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = `${program.title}-QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintQR = () => {
    const canvas = document.getElementById('qr-code-canvas');
    if (!canvas) {
      toast.info('QR code is still loading. Please try again in a moment.');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=560,height=760');
    if (!printWindow) {
      toast.info('Please allow popups for this site so the QR code can be printed.');
      return;
    }

    const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[character]));

    const qrImageUrl = canvas.toDataURL('image/png');
    const programTitle = escapeHtml(program.title);
    const statusText = program.isActive ? 'QR Code is Active - Accepting Scans' : 'QR Code is Disabled';
    const statusClass = program.isActive ? 'active' : 'inactive';

    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${programTitle} QR Code</title>
          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #ffffff;
              color: #070b1a;
              font-family: Inter, Arial, sans-serif;
              padding: 28px;
            }

            .qr-print-card {
              width: min(100%, 420px);
              border: 1px solid #e5e7eb;
              border-radius: 18px;
              padding: 30px 28px;
              text-align: center;
              background: #ffffff;
            }

            h1 {
              margin: 0 0 8px;
              font-size: 22px;
              line-height: 1.2;
              font-weight: 800;
            }

            .helper {
              margin: 0 auto 26px;
              max-width: 310px;
              color: #7b8192;
              font-size: 14px;
              line-height: 1.55;
            }

            .qr-image {
              width: 270px;
              height: 270px;
              object-fit: contain;
              display: block;
              margin: 0 auto 24px;
            }

            .program-title {
              margin: 0 0 6px;
              font-size: 20px;
              line-height: 1.25;
              font-weight: 850;
            }

            .scan-text {
              margin: 0 0 24px;
              color: #8a90a0;
              font-size: 14px;
            }

            .status {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              border-radius: 999px;
              padding: 12px 18px;
              font-size: 13px;
              font-weight: 800;
            }

            .status::before {
              content: "";
              width: 8px;
              height: 8px;
              border-radius: 999px;
              background: currentColor;
            }

            .status.active {
              background: #dcfce7;
              color: #079448;
            }

            .status.inactive {
              background: #fee2e2;
              color: #b91c1c;
            }

            @page {
              margin: 14mm;
            }

            @media print {
              body {
                min-height: auto;
                padding: 0;
              }

              .qr-print-card {
                border-color: #d9dde7;
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          <main class="qr-print-card">
            <h1>QR Code</h1>
            <p class="helper">Deploy this QR code at your event entrance or check-in desk</p>
            <img class="qr-image" src="${qrImageUrl}" alt="QR code for ${programTitle}" />
            <h2 class="program-title">${programTitle}</h2>
            <p class="scan-text">Scan to check in</p>
            <div class="status ${statusClass}">${statusText}</div>
          </main>
          <script>
            window.addEventListener('load', function () {
              setTimeout(function () {
                window.focus();
                window.print();
              }, 150);
            });
            window.addEventListener('afterprint', function () {
              window.close();
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const resetManualForm = () => {
    setManualFormData({
      fullName: '',
      emailAddress: '',
      school: '',
      linkUrl: '',
      textareaResponse: '',
      phoneNumber: '',
      address: '',
      department: '',
      fellowship: '',
      age: '',
      sex: '',
      firstTimer: false
    });
    setManualErrors({});
  };

  const openManualModal = () => {
    if (!program?.isActive) {
      toast.info(`This ${template.event.singular.toLowerCase()} has ended, so manual check-ins are disabled.`);
      return;
    }
    resetManualForm();
    setShowManualModal(true);
  };

  const closeManualModal = () => {
    if (manualSubmitting) return;
    setShowManualModal(false);
    setManualErrors({});
  };

  const closeRsvpScanner = () => {
    if (rsvpQrSubmitting) return;
    setShowRsvpScanner(false);
    setRsvpQrResult(null);
    setRsvpQrError('');
  };

  const getShareableRsvpScannerUrl = async () => {
    const response = await getRsvpScannerLink(id);
    if (!response.scannerUrl) throw new Error('Scanner link was not returned.');
    return response.scannerUrl;
  };

  const copyRsvpScannerLink = async () => {
    if (rsvpScannerLinkLoading) return;
    setRsvpScannerLinkLoading(true);
    try {
      const scannerUrl = await getShareableRsvpScannerUrl();
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(scannerUrl);
      } else {
        const input = document.createElement('input');
        input.value = scannerUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      toast.success('RSVP scanner link copied. Share it with your ushers.');
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'Unable to create RSVP scanner link.');
    } finally {
      setRsvpScannerLinkLoading(false);
    }
  };

  const openRsvpScannerLink = async () => {
    if (rsvpScannerLinkLoading) return;
    setRsvpScannerLinkLoading(true);
    try {
      const scannerUrl = await getShareableRsvpScannerUrl();
      window.open(scannerUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'Unable to open RSVP scanner link.');
    } finally {
      setRsvpScannerLinkLoading(false);
    }
  };

  const handleManualChange = (event) => {
    const { name, value, type, checked } = event.target;
    setManualFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (manualErrors[name]) {
      setManualErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateManualForm = () => {
    const dataFields = program?.dataFields || {};
    const errors = {};

    if (dataFields.fullName && !manualFormData.fullName.trim()) errors.fullName = 'Full name is required';
    if (dataFields.emailAddress) {
      if (!manualFormData.emailAddress.trim()) errors.emailAddress = 'Email address is required';
      else if (!isValidCollectedEmail(manualFormData.emailAddress)) errors.emailAddress = 'Enter a valid email address';
    }
    if (dataFields.school && !manualFormData.school.trim()) errors.school = 'School is required';
    if (dataFields.link) {
      if (!manualFormData.linkUrl.trim()) errors.linkUrl = 'Link is required';
      else if (!isValidHttpUrl(manualFormData.linkUrl)) errors.linkUrl = 'Enter a valid link starting with http:// or https://';
    }
    if (dataFields.textarea && !manualFormData.textareaResponse.trim()) errors.textareaResponse = 'Response is required';
    if (dataFields.phoneNumber && !manualFormData.phoneNumber.trim()) errors.phoneNumber = 'Phone number is required';
    if (dataFields.address && !manualFormData.address.trim()) errors.address = 'Address is required';
    if (dataFields.department && !manualFormData.department.trim()) errors.department = 'Department is required';
    if (dataFields.sex && !manualFormData.sex) errors.sex = 'Please select gender';

    if (dataFields.age && manualFormData.age !== '') {
      const age = Number(manualFormData.age);
      if (!Number.isInteger(age) || age < 0 || age > 130) errors.age = 'Age must be a valid number';
    }

    return errors;
  };

  const refreshAttendanceChart = useCallback(async () => {
    const chartResponse = await getAttendanceData(id);
    if (chartResponse.buckets && chartResponse.startTime && chartResponse.endTime) {
      setAttendanceData(mergeChartData(chartResponse.buckets, chartResponse.startTime, chartResponse.endTime, chartResponse.scanRangeStart, chartResponse.scanRangeEnd));
    }
  }, [id]);

  const handleManualSubmit = async (event) => {
    event.preventDefault();

    const errors = validateManualForm();
    if (Object.keys(errors).length > 0) {
      setManualErrors(errors);
      return;
    }

    setManualSubmitting(true);
    try {
      const response = await addManualAttendee(id, manualFormData);

      if (response.attendee) {
        setAttendees(prev => [response.attendee, ...prev.filter(attendee => attendee.id !== response.attendee.id)]);
      }
      if (response.totalScans !== undefined) setTotalScans(response.totalScans);
      if (response.attendeeMaleCount !== undefined) {
        setCollectDataStats({
          maleCount: response.attendeeMaleCount,
          femaleCount: response.attendeeFemaleCount,
          firstTimerCount: response.attendeeFirstTimerCount
        });
      }
      if (response.attendeeTotal !== undefined) setFormsSubmitted(response.attendeeTotal);

      await refreshAttendanceChart();
      setShowManualModal(false);
      resetManualForm();
      toast.success(`${template.attendee.singular} added manually.`);
    } catch (error) {
      const serverErrors = error.response?.data?.errors;
      if (serverErrors) {
        setManualErrors(serverErrors);
      }
      toast.error(error.response?.data?.error || `Failed to add ${template.attendee.singular.toLowerCase()}.`);
    } finally {
      setManualSubmitting(false);
    }
  };

  const handleRsvpQrCheckIn = useCallback(async (token) => {
    if (!token || rsvpQrSubmittingRef.current) return;

    rsvpQrSubmittingRef.current = true;
    setRsvpQrSubmitting(true);
    setRsvpQrError('');
    setRsvpQrResult(null);

    try {
      const response = await checkInRsvpQr(id, token);

      if (response.attendee) {
        setAttendees(prev => [response.attendee, ...prev.filter(attendee => attendee.id !== response.attendee.id)]);
      }
      if (response.totalScans !== undefined) setTotalScans(response.totalScans);
      if (response.attendeeMaleCount !== undefined) {
        setCollectDataStats({
          maleCount: response.attendeeMaleCount,
          femaleCount: response.attendeeFemaleCount,
          firstTimerCount: response.attendeeFirstTimerCount
        });
      }
      if (response.attendeeTotal !== undefined) setFormsSubmitted(response.attendeeTotal);
      if (response.sharedDeviceCheckins !== undefined) setSharedDeviceCheckins(response.sharedDeviceCheckins);

      await refreshAttendanceChart();
      setRsvpQrResult(response);
      toast.success('RSVP attendee checked in.');
    } catch (error) {
      const message = error.response?.data?.error || 'Unable to check in this RSVP QR.';
      setRsvpQrError(message);
      toast.error(message);
    } finally {
      rsvpQrSubmittingRef.current = false;
      setRsvpQrSubmitting(false);
    }
  }, [id, refreshAttendanceChart, toast]);

  const saveStrictFingerprinting = async (enabled) => {
    if (!program || fingerprintSaving) return;

    setFingerprintSaving(true);
    try {
      const response = await updateStrictDeviceFingerprinting(id, enabled);
      setProgram(prev => prev ? {
        ...prev,
        strictDeviceFingerprinting: response.strictDeviceFingerprinting
      } : prev);
      setShowFingerprintWarning(false);
      toast.success(response.strictDeviceFingerprinting
        ? 'Strict device fingerprinting enabled.'
        : 'Multiple check-ins from the same device are now allowed.');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update device fingerprinting.');
    } finally {
      setFingerprintSaving(false);
    }
  };

  const handleStrictFingerprintingToggle = () => {
    if (!program?.strictDeviceFingerprinting) {
      saveStrictFingerprinting(true);
      return;
    }

    setShowFingerprintWarning(true);
  };

  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTableModule = await import('jspdf-autotable');
      const { getCurrentChurch } = await import('../api/authService');
      const autoTable = autoTableModule.default || autoTableModule.autoTable;

      if (typeof autoTable !== 'function') {
        throw new Error('PDF table renderer is unavailable');
      }

      const church = await getCurrentChurch();
      const latestSponsorAnalytics = await getSponsorAnalytics(id).catch(() => sponsorAnalytics);
      const doc = new jsPDF('p', 'mm', 'a4');

      const orange = [232, 89, 12];
      const orangeSoft = [255, 244, 237];
      const dark = [7, 11, 26];
      const muted = [106, 113, 128];
      const border = [226, 229, 235];
      const generatedAt = new Date();
      const reportStats = program.trackingMode === 'count-only' ? countOnlyStats : collectDataStats;
      const dataFields = program.dataFields || {};
      const hasProxyGuests = attendees.some(attendee => Boolean(attendee.proxyHostFingerprint));
      const winnersSelected = attendees.filter(attendee => attendee.isWinner).length;
      const sponsorCount = latestSponsorAnalytics?.sponsorCount || 0;
      const totalSponsorClicks = latestSponsorAnalytics?.totalClicks || 0;
      const topSponsor = latestSponsorAnalytics?.topSponsor;
      const hasSharedDeviceMetric = program.trackingMode === 'collect-data' && (program.strictDeviceFingerprinting === false || sharedDeviceCheckins > 0);

      const safeText = (value, fallback = '-') => {
        if (value === null || value === undefined || value === '') return fallback;
        return String(value);
      };

      const formatReportDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return safeText(dateString);
        return date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
      };

      const formatReportDateTime = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return safeText(dateString);
        return date.toLocaleString();
      };

      const sanitizeFileName = (value) => safeText(value, 'Ingather')
        .replace(/[\\/:*?"<>|]+/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 80);

      const pageWidth = () => doc.internal.pageSize.getWidth();
      const pageHeight = () => doc.internal.pageSize.getHeight();

      const setFont = (style = 'normal', size = 10, color = dark) => {
        doc.setFont('helvetica', style);
        doc.setFontSize(size);
        doc.setTextColor(...color);
      };

      const drawMetricCard = (x, y, width, height, label, value, helper, accent = orange) => {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...border);
        doc.setLineWidth(0.35);
        doc.roundedRect(x, y, width, height, 3, 3, 'FD');
        doc.setFillColor(...accent);
        doc.roundedRect(x + 4, y + 5, 3, height - 10, 1.5, 1.5, 'F');
        setFont('bold', 7.5, muted);
        doc.text(label.toUpperCase(), x + 10, y + 9);
        setFont('bold', 17, dark);
        doc.text(safeText(value), x + 10, y + 18);
        if (helper) {
          setFont('normal', 7.5, muted);
          doc.text(safeText(helper), x + 10, y + 25, { maxWidth: width - 14 });
        }
      };

      const drawSectionTitle = (title, subtitle, y) => {
        setFont('bold', 13, dark);
        doc.text(title, 14, y);
        if (subtitle) {
          setFont('normal', 8.5, muted);
          doc.text(subtitle, 14, y + 5);
        }
      };

      const metricCards = [
        { label: 'Total Attendance', value: totalScans.toLocaleString(), helper: program.isActive ? 'Live scans recorded' : 'Total scans recorded' }
      ];

      if (program.trackingMode === 'collect-data') {
        metricCards.push({ label: 'Forms Submitted', value: formsSubmitted.toLocaleString(), helper: `${template.attendee.plural} with form data` });
      }
      if (program.trackingMode === 'collect-data' && dataFields.firstTimer) {
        metricCards.push({ label: 'First Timers', value: reportStats.firstTimerCount.toLocaleString(), helper: 'New attendees identified', accent: [124, 58, 237] });
      }
      if (program.trackingMode === 'collect-data' && dataFields.sex) {
        metricCards.push({ label: 'Male Attendance', value: reportStats.maleCount.toLocaleString(), helper: 'Gender breakdown', accent: [37, 99, 235] });
        metricCards.push({ label: 'Female Attendance', value: reportStats.femaleCount.toLocaleString(), helper: 'Gender breakdown', accent: [219, 39, 119] });
      }
      if (program.giftingEnabled) {
        metricCards.push({ label: 'Winners Selected', value: `${winnersSelected}/${attendees.length}`, helper: 'Gifting allocation', accent: [245, 158, 11] });
        metricCards.push({ label: 'Winners Gifted', value: `${winnersGifted}/${winnersSelected || 0}`, helper: 'Gifts marked complete', accent: [22, 163, 74] });
      }
      if (sponsorCount > 0) {
        metricCards.push({ label: 'Sponsor Clicks', value: totalSponsorClicks.toLocaleString(), helper: topSponsor ? `Top: ${topSponsor.sponsorName}` : 'Tracked sponsor ROI', accent: orange });
      }
      if (hasSharedDeviceMetric) {
        metricCards.push({ label: 'Shared Devices', value: sharedDeviceCheckins.toLocaleString(), helper: 'Duplicate-device check-ins', accent: [14, 165, 233] });
      }

      doc.setFillColor(...dark);
      doc.rect(0, 0, pageWidth(), 58, 'F');
      doc.setFillColor(...orange);
      doc.rect(0, 0, pageWidth(), 5, 'F');
      setFont('bold', 9, orange);
      doc.text('INGATHER EVENT INTELLIGENCE', 14, 17);
      setFont('bold', 24, [255, 255, 255]);
      doc.text('Post-Event Intelligence Report', 14, 29);
      setFont('normal', 9, [209, 213, 219]);
      doc.text(`Generated ${generatedAt.toLocaleString()}`, 14, 38);
      setFont('bold', 15, [255, 255, 255]);
      doc.text(safeText(program.title, template.event.singular), pageWidth() - 14, 24, { align: 'right', maxWidth: 72 });
      setFont('normal', 8.5, [209, 213, 219]);
      doc.text(`${formatReportDate(program.date)} | ${safeText(program.startTime)} - ${safeText(program.endTime)}`, pageWidth() - 14, 36, { align: 'right' });

      let yPos = 68;
      doc.setFillColor(249, 250, 251);
      doc.setDrawColor(...border);
      doc.roundedRect(14, yPos, pageWidth() - 28, 34, 4, 4, 'FD');
      setFont('bold', 8, orange);
      doc.text('WORKSPACE', 20, yPos + 9);
      setFont('bold', 12, dark);
      doc.text(safeText(church.churchName, churchData.name || template.organization.nameLabel), 20, yPos + 17, { maxWidth: 72 });
      setFont('normal', 8, muted);
      doc.text(`${template.organization.branchLabel}: ${safeText(church.branchName, churchData.branch)}`, 20, yPos + 24, { maxWidth: 76 });
      doc.text(`Email: ${safeText(church.email, churchData.email)}`, 108, yPos + 12, { maxWidth: 82 });
      doc.text(`Location: ${safeText(church.location)}`, 108, yPos + 20, { maxWidth: 82 });
      doc.text(`${template.event.titleLabel}: ${safeText(program.title)}`, 108, yPos + 28, { maxWidth: 82 });

      yPos += 48;
      drawSectionTitle('Executive Summary', 'Feature-aware metrics from this event.', yPos);
      yPos += 11;

      const cardGap = 5;
      const cardWidth = (pageWidth() - 28 - (cardGap * 2)) / 3;
      const cardHeight = 31;
      metricCards.forEach((card, index) => {
        const column = index % 3;
        const row = Math.floor(index / 3);
        drawMetricCard(
          14 + column * (cardWidth + cardGap),
          yPos + row * (cardHeight + 6),
          cardWidth,
          cardHeight,
          card.label,
          card.value,
          card.helper,
          card.accent || orange
        );
      });
      yPos += Math.ceil(metricCards.length / 3) * (cardHeight + 6) + 6;

      if (sponsorCount > 0) {
        drawSectionTitle('Sponsor ROI Snapshot', `Your sponsor links were clicked ${totalSponsorClicks.toLocaleString()} times.`, yPos);
        yPos += 10;
        doc.setFillColor(...orangeSoft);
        doc.setDrawColor(255, 210, 185);
        doc.roundedRect(14, yPos, pageWidth() - 28, 25, 4, 4, 'FD');
        setFont('bold', 10, dark);
        doc.text(topSponsor?.sponsorName ? `Top sponsor: ${topSponsor.sponsorName}` : 'Sponsor engagement tracked', 20, yPos + 10, { maxWidth: 92 });
        setFont('normal', 8.5, muted);
        doc.text(`${sponsorCount} active sponsor${sponsorCount === 1 ? '' : 's'} | ${safeText(latestSponsorAnalytics?.todayClicks || 0)} clicks today`, 20, yPos + 18);
        setFont('bold', 18, orange);
        doc.text(totalSponsorClicks.toLocaleString(), pageWidth() - 20, yPos + 14, { align: 'right' });
        setFont('normal', 8, muted);
        doc.text('total clicks', pageWidth() - 20, yPos + 21, { align: 'right' });
      }

      doc.addPage('a4', 'landscape');
      const tablePageWidth = pageWidth();
      let tableY = 18;
      setFont('bold', 16, dark);
      doc.text(`${template.attendee.singular} Data`, 14, tableY);
      setFont('normal', 8.5, muted);
      doc.text('Raw attendee records with dynamic columns based on enabled collection fields.', 14, tableY + 6);
      tableY += 14;

      const tableColumns = [];
      if (dataFields.fullName) tableColumns.push({ header: 'Name', value: attendee => safeText(attendee.fullName) });
      if (dataFields.emailAddress) tableColumns.push({ header: 'Email', value: attendee => safeText(attendee.emailAddress) });
      if (dataFields.school) tableColumns.push({ header: 'School', value: attendee => safeText(attendee.school) });
      if (dataFields.link) tableColumns.push({ header: 'Link', value: attendee => safeText(attendee.linkUrl) });
      if (dataFields.textarea) tableColumns.push({ header: program.dataFieldConfig?.textareaLabel || 'Additional Response', value: attendee => safeText(attendee.textareaResponse) });
      if (dataFields.phoneNumber) tableColumns.push({ header: 'Phone', value: attendee => safeText(attendee.phoneNumber) });
      if (dataFields.address) tableColumns.push({ header: 'Address', value: attendee => safeText(attendee.address) });
      if (dataFields.department) tableColumns.push({ header: 'Department', value: attendee => safeText(attendee.department) });
      if (dataFields.fellowship) tableColumns.push({ header: 'Group', value: attendee => safeText(attendee.fellowship) });
      if (dataFields.age) tableColumns.push({ header: 'Age', value: attendee => attendee.age ? `${attendee.age} Years` : '-' });
      if (dataFields.sex) tableColumns.push({ header: 'Gender', value: attendee => safeText(attendee.sex) });
      if (dataFields.firstTimer) tableColumns.push({ header: 'First Timer', value: attendee => attendee.firstTimer ? 'Yes' : 'No' });
      if (program.giftingEnabled) {
        tableColumns.push({ header: 'Winner', value: attendee => attendee.isWinner ? 'Selected' : '-' });
        tableColumns.push({ header: 'Gifted', value: attendee => attendee.isWinner ? (attendee.isGifted ? 'Gifted' : 'Pending') : '-' });
      }
      if (hasProxyGuests) {
        tableColumns.push({ header: 'Entry Type', value: attendee => attendee.proxyHostFingerprint ? 'Proxy Guest' : 'Direct' });
      }
      tableColumns.push({ header: 'Registration Type', value: attendee => getAttendeeSourceLabel(attendee) });
      tableColumns.push({ header: 'Checked In At', value: attendee => formatReportDateTime(attendee.checkedInAt || attendee.scanTime) });

      const tableBody = attendees.length > 0
        ? attendees.map(attendee => tableColumns.map(column => column.value(attendee)))
        : [[`No ${template.attendee.plural.toLowerCase()} recorded yet.`].concat(Array(Math.max(tableColumns.length - 1, 0)).fill(''))];

      autoTable(doc, {
        startY: tableY,
        head: [tableColumns.map(column => column.header)],
        body: tableBody,
        margin: { left: 14, right: 14, bottom: 18 },
        theme: 'grid',
        tableWidth: tablePageWidth - 28,
        styles: {
          font: 'helvetica',
          fontSize: tableColumns.length > 9 ? 6.4 : 7.2,
          cellPadding: 2.2,
          overflow: 'linebreak',
          valign: 'middle',
          lineColor: border,
          lineWidth: 0.15,
          textColor: dark
        },
        headStyles: {
          fillColor: dark,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'left'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        bodyStyles: {
          fillColor: [255, 255, 255]
        },
        didParseCell: (data) => {
          if (data.section !== 'body') return;
          const raw = String(data.cell.raw || '');
          if (['Yes', 'Selected', 'Gifted'].includes(raw)) {
            data.cell.styles.textColor = [21, 128, 61];
            data.cell.styles.fontStyle = 'bold';
          } else if (raw === 'Pending') {
            data.cell.styles.textColor = orange;
            data.cell.styles.fontStyle = 'bold';
          } else if (raw === 'Proxy Guest') {
            data.cell.styles.textColor = [14, 116, 144];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });

      const totalPages = doc.internal.getNumberOfPages();
      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
        doc.setPage(pageNumber);
        const footerY = pageHeight() - 9;
        doc.setDrawColor(...border);
        doc.line(14, footerY - 6, pageWidth() - 14, footerY - 6);
        setFont('normal', 7.5, muted);
        doc.text('Ingather Post-Event Intelligence Report', 14, footerY);
        doc.text(`Generated ${generatedAt.toLocaleString()}`, pageWidth() / 2, footerY, { align: 'center' });
        doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth() - 14, footerY, { align: 'right' });
      }

      const fileName = `${sanitizeFileName(church.churchName || churchData.name)}-${sanitizeFileName(program.title)}-Intelligence-Report.pdf`;
      doc.save(fileName);
      toast.success('Post-event intelligence report exported successfully!');
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
  const showSharedDeviceMetric = program?.trackingMode === 'collect-data' && (program.strictDeviceFingerprinting === false || sharedDeviceCheckins > 0);
  const getAttendeeRegistrationType = (attendee) => (
    attendee.registrationType
      || (attendee.proxyHostFingerprint ? 'proxy' : attendee.deviceFingerprint?.startsWith?.('manual-') ? 'manual' : 'walk_in')
  );
  const getAttendeeSourceLabel = (attendee) => {
    const type = getAttendeeRegistrationType(attendee);
    if (type === 'rsvp') return 'Pre-Registered';
    if (type === 'manual') return 'Manual';
    if (type === 'proxy') return 'Proxy';
    return 'Walk-In';
  };
  const attendeeSourceCounts = attendees.reduce((counts, attendee) => {
    const type = getAttendeeRegistrationType(attendee);
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {});
  const attendeeFilterOptions = [
    { key: 'all', label: 'All', count: attendees.length },
    { key: 'rsvp', label: 'Pre-Registered', count: attendeeSourceCounts.rsvp || 0 },
    { key: 'walk_in', label: 'Walk-In', count: attendeeSourceCounts.walk_in || 0 },
    { key: 'manual', label: 'Manual', count: attendeeSourceCounts.manual || 0 },
    { key: 'proxy', label: 'Proxy', count: attendeeSourceCounts.proxy || 0 }
  ];
  const filteredAttendees = attendees.filter(attendee => {
    const matchesFilter = attendeeFilter === 'all' || getAttendeeRegistrationType(attendee) === attendeeFilter;
    const matchesSearch = !searchQuery.trim()
      || [attendee.fullName, attendee.emailAddress, attendee.school, attendee.linkUrl, attendee.textareaResponse, getAttendeeSourceLabel(attendee)]
        .some(value => (value || '').toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });
  const attendeeTableColumnCount = [
    program?.dataFields?.fullName,
    program?.dataFields?.emailAddress,
    program?.dataFields?.school,
    program?.dataFields?.link,
    program?.dataFields?.textarea,
    program?.dataFields?.fellowship,
    program?.dataFields?.age,
    program?.giftingEnabled,
    program?.giftingEnabled,
    true,
    true
  ].filter(Boolean).length;

  /* ---- LOADING ---- */
  if (loading) {
    return (
      <div className="dashboard">
        <aside className="sidebar">
          <div className="sidebar-logo"><a href="/dashboard" className="sidebar-logo-link"><span className="sidebar-logo-icon">{Icons.logo}</span><span className="sidebar-logo-text">Ingather</span></a></div>
        </aside>
        <main className="dashboard-main">
          <div className="dashboard-loading"><div className="spinner"></div><p>Loading {template.event.singular.toLowerCase()}...</p></div>
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
          <div className="dashboard-loading"><p>{template.event.singular} not found</p></div>
        </main>
      </div>
    );
  }

  const hasSponsorDashboard = sponsorAnalytics?.sponsorCount > 0;

  const chartCard = (
    <div className="pd-chart-card">
      <h3 className="pd-chart-title">Attendance Over Time</h3>
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
  );

  const qrCodeCard = (
    <div className={`pd-qr-card ${hasSponsorDashboard ? 'pd-qr-card-horizontal' : ''}`}>
      <div className="pd-qr-card-heading">
        <h3 className="pd-qr-card-title">QR Code</h3>
        <p className="pd-qr-card-sub">Deploy this QR code at your event entrance or check-in desk</p>
      </div>
      <div className="pd-qr-canvas" id="qr-print-area">
        <React.Suspense fallback={<div style={{ width: 160, height: 160 }} aria-hidden="true"></div>}>
          <QRCodeCanvas id="qr-code-canvas" value={program.qrCodeUrl} size={160} level="H" includeMargin={true} />
        </React.Suspense>
      </div>
      <div className="pd-qr-card-details">
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
      </div>
      <div className="pd-qr-card-actions">
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
  );

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
          <a href="/pre-events" className="nav-item" onClick={closeMobileMenu}><span className="nav-icon">{Icons.allPrograms}</span><span>Pre-Events</span></a>
          <a href="/create-program" className="nav-item active" onClick={closeMobileMenu}><span className="nav-icon">{Icons.createProgram}</span><span>{template.event.create}</span></a>
          <a href="/programs" className="nav-item" onClick={closeMobileMenu}><span className="nav-icon">{Icons.allPrograms}</span><span>{template.event.all}</span></a>
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
              <button className="btn-end-program" onClick={handleStopProgram}>End Current {template.event.singular}</button>
            ) : (
              <button className="btn-end-program" disabled>{template.event.singular} Ended</button>
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
                <InfoTooltip
                  className="stat-info-icon"
                  label="Male attendance metric information"
                  content="Attendees counted in this gender group."
                />
              </div>
              <div className="pd-stat-card">
                <div className="stat-icon-box icon-pink">{Icons.female}</div>
                <div className="pd-stat-info">
                  <div className="pd-stat-label">Female</div>
                  <div className="pd-stat-value">{stats.femaleCount}</div>
                </div>
                <InfoTooltip
                  className="stat-info-icon"
                  label="Female attendance metric information"
                  content="Attendees counted in this gender group."
                />
              </div>
              <div className="pd-stat-card">
                <div className="stat-icon-box icon-purple">{Icons.star}</div>
                <div className="pd-stat-info">
                  <div className="pd-stat-label">First Timer</div>
                  <div className="pd-stat-value">{stats.firstTimerCount}</div>
                </div>
                <InfoTooltip
                  className="stat-info-icon"
                  label="First timer metric information"
                  content="Attendees marked as first-timers from submitted forms."
                />
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
                  <InfoTooltip
                    className="stat-info-icon"
                    label="Form submitted metric information"
                    content="Completed attendee forms for this event."
                  />
                </div>
                {/* First Timer (conditional) */}
                {program.dataFields?.firstTimer && (
                  <div className="pd-stat-card">
                    <div className="stat-icon-box icon-purple">{Icons.starOutline}</div>
                    <div className="pd-stat-info">
                      <div className="pd-stat-label">First Timer</div>
                      <div className="pd-stat-value">{stats.firstTimerCount}</div>
                    </div>
                    <InfoTooltip
                      className="stat-info-icon"
                      label="First timer metric information"
                      content="Attendees marked as first-timers from submitted forms."
                    />
                  </div>
                )}
              </div>

              {/* Row 2: Secondary Metrics — Gender / Gifting (conditional) */}
              {(program.dataFields?.sex || program.giftingEnabled || showSharedDeviceMetric) && (
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
                  {showSharedDeviceMetric && (
                    <div className="pd-metric-card pd-shared-device-card">
                      <span className="pd-metric-pill orange">Device Intelligence</span>
                      <div className="pd-metric-row">
                        <div className="pd-metric-item">
                          <span className="pd-metric-icon shared-device">{Icons.people}</span>
                          <div>
                            <div className="pd-metric-item-label">Shared Device Check-ins</div>
                            <div className="pd-metric-item-value">{sharedDeviceCheckins.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                      <p className="pd-shared-device-copy">
                        {sharedDeviceCheckins.toLocaleString()} {sharedDeviceCheckins === 1 ? 'attendee checked' : 'attendees checked'} in from devices already used before.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Middle Row: Chart + QR Code */}
          <div className={`pd-middle-row ${hasSponsorDashboard ? 'pd-middle-row-sponsored' : ''}`}>
            {hasSponsorDashboard ? (
              <div className="pd-sponsored-insights-stack">
                {chartCard}
                <SponsorEngagementCard analytics={sponsorAnalytics} />
              </div>
            ) : (
              chartCard
            )}

            {qrCodeCard}
          </div>

          {program.trackingMode === 'collect-data' && (
            <section className="pd-event-settings-card" aria-label="Live event settings">
              <div className="pd-event-settings-copy">
                <span className="pd-event-settings-kicker">Live event settings</span>
                <h3>Device Fingerprint Control</h3>
                <p>Control whether one attendee device can submit more than one check-in for this {template.event.singular.toLowerCase()}.</p>
              </div>
              <button
                type="button"
                className={`pd-fingerprint-toggle ${program.strictDeviceFingerprinting ? 'checked' : ''}`}
                onClick={handleStrictFingerprintingToggle}
                disabled={fingerprintSaving}
                aria-pressed={program.strictDeviceFingerprinting}
              >
                <span className="pd-fingerprint-switch" aria-hidden="true"></span>
                <span>Strict Device Fingerprinting (1 Scan Per Device)</span>
              </button>
            </section>
          )}

          {/* Attendee Data Table — Count Only Mode */}
          {program.trackingMode === 'count-only' && countOnlyScans.length > 0 && (
            <div className="pd-attendee-card">
              <div className="pd-attendee-header">
                <div>
                  <h3 className="pd-attendee-title">{template.attendee.singular} Data</h3>
                  <p className="pd-attendee-sub">People who completed check-in details</p>
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
          {program.trackingMode === 'collect-data' && (
            <div className="pd-attendee-card">
              <div className="pd-attendee-header">
                <div>
                  <h3 className="pd-attendee-title">{template.attendee.singular} Data</h3>
                  <p className="pd-attendee-sub">People who submitted the form</p>
                </div>
              </div>
              <div className="pd-attendee-toolbar">
                <div className="pd-search-box">
                  {Icons.search}
                  <input type="text" placeholder={`Search ${template.attendee.plural.toLowerCase()}...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <div className="pd-attendee-actions">
                  {program.linkedPreEventCount > 0 && (
                    <>
                      <button className="pd-btn-manual pd-btn-rsvp-scan" type="button" onClick={copyRsvpScannerLink} disabled={!program.isActive || rsvpScannerLinkLoading}>
                        {Icons.copy} {rsvpScannerLinkLoading ? 'Preparing...' : 'Copy RSVP Scanner Link'}
                      </button>
                      <button className="pd-btn-manual pd-btn-rsvp-scan" type="button" onClick={openRsvpScannerLink} disabled={!program.isActive || rsvpScannerLinkLoading}>
                        {Icons.search} Open Scanner
                      </button>
                    </>
                  )}
                  <button className="pd-btn-manual" type="button" onClick={openManualModal} disabled={!program.isActive}>{Icons.plus} Add Manually</button>
                  <button className="pd-btn-export" type="button" onClick={handleExportPDF}>{Icons.exportIcon} Export Data</button>
                </div>
              </div>
              <div className="pd-attendee-filter-row" role="tablist" aria-label="Filter attendee source">
                {attendeeFilterOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={`pd-attendee-filter ${attendeeFilter === option.key ? 'active' : ''}`}
                    onClick={() => setAttendeeFilter(option.key)}
                  >
                    {option.label} <span>{option.count}</span>
                  </button>
                ))}
              </div>
              <div className="pd-table-container">
                <table className="pd-table">
                  <thead>
                    <tr>
                      {program.dataFields?.fullName && <th>Name</th>}
                      {program.dataFields?.emailAddress && <th>Email</th>}
                      {program.dataFields?.school && <th>School</th>}
                      {program.dataFields?.link && <th>Link</th>}
                      {program.dataFields?.textarea && <th>{program.dataFieldConfig?.textareaLabel || 'Additional Response'}</th>}
                      {program.dataFields?.fellowship && <th>Group</th>}
                      {program.dataFields?.age && <th>Age</th>}
                      {program.giftingEnabled && <th>Winner</th>}
                      {program.giftingEnabled && <th>Gifted</th>}
                      <th>Source</th>
                      <th>Scan Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendees.length === 0 ? (
                      <tr>
                        <td colSpan={attendeeTableColumnCount}>
                          <div className="pd-empty-table">
                            <strong>No {template.attendee.plural.toLowerCase()} yet.</strong>
                            <span>Use Add Manually when someone checks in without a smartphone.</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredAttendees.map(attendee => (
                      <tr key={attendee.id}>
                        {program.dataFields?.fullName && (
                          <td data-label="Name">
                            <strong>{attendee.fullName || '-'}</strong>
                            <span className={`pd-source-badge pd-source-${getAttendeeRegistrationType(attendee)}`}>
                              {getAttendeeSourceLabel(attendee)}
                            </span>
                          </td>
                        )}
                        {program.dataFields?.emailAddress && <td data-label="Email">{attendee.emailAddress || '-'}</td>}
                        {program.dataFields?.school && <td data-label="School">{attendee.school || '-'}</td>}
                        {program.dataFields?.link && (
                          <td data-label="Link">
                            {attendee.linkUrl ? (
                              <a className="pd-table-link" href={attendee.linkUrl} target="_blank" rel="noreferrer">Open link</a>
                            ) : '-'}
                          </td>
                        )}
                        {program.dataFields?.textarea && <td data-label={program.dataFieldConfig?.textareaLabel || 'Additional Response'}>{attendee.textareaResponse || '-'}</td>}
                        {program.dataFields?.fellowship && <td data-label="Group">{attendee.fellowship || '-'}</td>}
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
                        <td data-label="Source">
                          <span className={`pd-source-badge pd-source-${getAttendeeRegistrationType(attendee)}`}>
                            {getAttendeeSourceLabel(attendee)}
                          </span>
                        </td>
                        <td data-label="Scan Time">{new Date(attendee.checkedInAt || attendee.scanTime).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {showManualModal && program?.trackingMode === 'collect-data' && (
        <ManualAttendeeModal
          program={program}
          template={template}
          formData={manualFormData}
          errors={manualErrors}
          submitting={manualSubmitting}
          onChange={handleManualChange}
          onClose={closeManualModal}
          onSubmit={handleManualSubmit}
        />
      )}

      {showRsvpScanner && (
        <RsvpQrScannerModal
          scanning={rsvpQrSubmitting}
          result={rsvpQrResult}
          error={rsvpQrError}
          onClose={closeRsvpScanner}
          onSubmit={handleRsvpQrCheckIn}
          onReset={() => {
            setRsvpQrResult(null);
            setRsvpQrError('');
          }}
        />
      )}

      {showFingerprintWarning && (
        <FingerprintWarningModal
          saving={fingerprintSaving}
          onCancel={() => {
            if (!fingerprintSaving) setShowFingerprintWarning(false);
          }}
          onConfirm={() => saveStrictFingerprinting(false)}
        />
      )}
    </div>
  );
}

export default ProgramDetail;
