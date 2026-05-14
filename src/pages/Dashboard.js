import React, { useState, useEffect, useRef } from 'react';
import { getDashboardStats, deleteProgram } from '../api/programService';
import { getCurrentChurch } from '../api/authService';
import { useToast } from '../components/Toast';
import '../styles/Dashboard.css';

/* ============================================
   SVG ICON COMPONENTS
   ============================================ */
const Icons = {
  logo: (
    <img src="/ingather-logo.png" alt="Ingather" className="sidebar-logo-img" />
  ),
  collapse: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="3" y="3" width="14" height="14" rx="2" />
      <line x1="9" y1="3" x2="9" y2="17" />
    </svg>
  ),
  dashboard: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="6" height="6" rx="1" fill="currentColor" stroke="none" />
      <rect x="11" y="3" width="6" height="6" rx="1" fill="currentColor" stroke="none" />
      <rect x="3" y="11" width="6" height="6" rx="1" fill="currentColor" stroke="none" />
      <rect x="11" y="11" width="6" height="6" rx="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  createProgram: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7" />
      <line x1="10" y1="7" x2="10" y2="13" />
      <line x1="7" y1="10" x2="13" y2="10" />
    </svg>
  ),
  allPrograms: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="14" height="12" rx="2" />
      <line x1="3" y1="8" x2="17" y2="8" />
      <line x1="7" y1="4" x2="7" y2="8" />
      <line x1="13" y1="4" x2="13" y2="8" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 3.5V5M10 15v1.5M16.5 10H15M5 10H3.5M14.6 5.4l-1.1 1.1M6.5 13.5l-1.1 1.1M14.6 14.6l-1.1-1.1M6.5 6.5L5.4 5.4" />
    </svg>
  ),
  notification: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2a5 5 0 015 5c0 4 2 5 2 5H3s2-1 2-5a5 5 0 015-5z" />
      <path d="M8.5 17a1.5 1.5 0 003 0" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17H4a1 1 0 01-1-1V4a1 1 0 011-1h3" />
      <polyline points="11,14 17,10 11,6" />
      <line x1="17" y1="10" x2="7" y2="10" />
    </svg>
  ),
  chevronRight: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6,4 10,8 6,12" />
    </svg>
  ),
  sun: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="3.5" />
      <line x1="10" y1="2" x2="10" y2="4" />
      <line x1="10" y1="16" x2="10" y2="18" />
      <line x1="2" y1="10" x2="4" y2="10" />
      <line x1="16" y1="10" x2="18" y2="10" />
      <line x1="4.2" y1="4.2" x2="5.6" y2="5.6" />
      <line x1="14.4" y1="14.4" x2="15.8" y2="15.8" />
      <line x1="4.2" y1="15.8" x2="5.6" y2="14.4" />
      <line x1="14.4" y1="5.6" x2="15.8" y2="4.2" />
    </svg>
  ),
  moon: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 10.5A7 7 0 119.5 3a5.5 5.5 0 007.5 7.5z" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="8" y1="3" x2="8" y2="13" />
      <line x1="3" y1="8" x2="13" y2="8" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="12" height="11" rx="1.5" />
      <line x1="2" y1="7" x2="14" y2="7" />
      <line x1="5.5" y1="1.5" x2="5.5" y2="4.5" />
      <line x1="10.5" y1="1.5" x2="10.5" y2="4.5" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <line x1="8" y1="7" x2="8" y2="11" />
      <circle cx="8" cy="5.5" r="0.3" fill="currentColor" />
    </svg>
  ),
  totalPrograms: (
    <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="16" height="14" rx="2" />
      <line x1="3" y1="9" x2="19" y2="9" />
      <line x1="8" y1="4" x2="8" y2="9" />
      <line x1="14" y1="4" x2="14" y2="9" />
    </svg>
  ),
  totalAttendance: (
    <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="7" r="3" />
      <circle cx="16" cy="7" r="2.5" />
      <path d="M2 19c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M14 19c0-2.5 1.3-4.5 3.5-4.5S21 16.5 21 19" />
    </svg>
  ),
  upcomingPrograms: (
    <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="16" height="14" rx="2" />
      <line x1="3" y1="9" x2="19" y2="9" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="14" y1="2" x2="14" y2="6" />
      <polyline points="9,13 11,15 15,11" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3,4 13,4" />
      <path d="M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1" />
      <path d="M4 4l.7 9.1a1 1 0 001 .9h4.6a1 1 0 001-.9L12 4" />
      <line x1="7" y1="7" x2="7" y2="12" />
      <line x1="9" y1="7" x2="9" y2="12" />
    </svg>
  ),
  chevronDown: (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3,5 7,9 11,5" />
    </svg>
  ),
  gear: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.3 3h3.4l.5 2.1a6 6 0 011.7 1l2-.7 1.7 3-1.5 1.4a6 6 0 010 2l1.5 1.4-1.7 3-2-.7a6 6 0 01-1.7 1L11.7 17H8.3l-.5-2.1a6 6 0 01-1.7-1l-2 .7-1.7-3 1.5-1.4a6 6 0 010-2L2.4 7.8l1.7-3 2 .7a6 6 0 011.7-1L8.3 3z" />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  ),
};

/* ============================================
   DONUT CHART COMPONENT
   ============================================ */
function DonutChart({ data }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = 70;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * radius;

  // Handle zero-data case — show empty grey ring
  if (total === 0) {
    return (
      <div className="donut-chart-wrapper">
        <div className="donut-chart-svg-container">
          <svg className="donut-chart-svg" viewBox="0 0 180 180">
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke="var(--border-color)"
              strokeWidth={strokeWidth}
            />
          </svg>
          <div className="donut-center-label">
            <div className="donut-center-value">
              0<span className="donut-center-suffix">%</span>
            </div>
          </div>
        </div>
        <div className="donut-legend">
          {data.map((d, i) => (
            <div className="donut-legend-item" key={i}>
              <div className="donut-legend-dot" style={{ backgroundColor: d.color }} />
              <span className="donut-legend-label">{d.label}</span>
              <span className="donut-legend-value">0%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  let offset = 0;
  const segments = data.map((d) => {
    const pct = d.value / total;
    const dashArray = pct * circumference;
    const dashOffset = -offset;
    offset += dashArray;
    return { ...d, dashArray, dashOffset, pct };
  });

  return (
    <div className="donut-chart-wrapper">
      <div className="donut-chart-svg-container">
        <svg className="donut-chart-svg" viewBox="0 0 180 180">
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${seg.dashArray} ${circumference - seg.dashArray}`}
              strokeDashoffset={seg.dashOffset}
              style={{ transition: 'all 0.6s ease' }}
            />
          ))}
        </svg>
        <div className="donut-center-label">
          <div className="donut-center-value">
            {data[0]?.value}<span className="donut-center-suffix">%</span>
          </div>
        </div>
      </div>
      <div className="donut-legend">
        {data.map((d, i) => (
          <div className="donut-legend-item" key={i}>
            <div className="donut-legend-dot" style={{ backgroundColor: d.color }} />
            <span className="donut-legend-label">{d.label}</span>
            <span className="donut-legend-value">{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================
   SPARKLINE COMPONENT — Data-driven
   Shows actual attendance trend over time.
   Green = uptrend, Red = downtrend, Grey = flat/no data.
   ============================================ */
function Sparkline({ data = [] }) {
  const W = 80, H = 40, PAD = 4;

  // Extract attendance values
  const values = data.map(d => d.attendance || 0);

  // Need at least 2 points to draw a line
  if (values.length < 2 || values.every(v => v === 0)) {
    // Flat placeholder line when no data
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
        <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} stroke="var(--text-tertiary)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />
      </svg>
    );
  }

  // Determine trend: compare first half avg vs second half avg
  const mid = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, mid);
  const secondHalf = values.slice(mid);
  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  let trendColor = '#6B7280'; // grey — flat
  if (avgSecond > avgFirst) trendColor = '#10B981'; // green — uptrend
  else if (avgSecond < avgFirst) trendColor = '#EF4444'; // red — downtrend

  // Scale values to SVG coordinates
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1; // avoid division by zero
  const plotW = W - PAD * 2;
  const plotH = H - PAD * 2;

  const points = values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * plotW;
    const y = PAD + plotH - ((v - minVal) / range) * plotH;
    return { x, y };
  });

  // Build SVG path
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  // Fill path (closes to bottom)
  const fillPath = linePath + ` L${points[points.length - 1].x.toFixed(1)} ${H} L${points[0].x.toFixed(1)} ${H}Z`;

  // Unique gradient ID to prevent collisions
  const gradId = `sparkGrad_${trendColor.replace('#', '')}`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
      <defs>
        <linearGradient id={gradId} x1="40" y1="0" x2="40" y2={H} gradientUnits="userSpaceOnUse">
          <stop stopColor={trendColor} />
          <stop offset="1" stopColor={trendColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gradId})`} opacity="0.15" />
      <path
        d={linePath}
        stroke={trendColor}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ============================================
   CUSTOM ATTENDANCE BAR CHART (Dynamic Y-Axis)
   Grey bar = always full height (max capacity)
   Orange bar = overlaid from same baseline
   ============================================ */
function AttendanceBarChart({ data }) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // — Dynamic max value & Y-ticks based on data —
  const rawMax = data.length > 0
    ? Math.max(...data.map(d => d.attendance || 0))
    : 0;

  // Compute a "nice" ceiling: round up to next multiple of a readable step
  const getNiceMax = (val) => {
    if (val === 0) return 100;
    const magnitude = Math.pow(10, Math.floor(Math.log10(val)));
    const step = magnitude >= 10 ? magnitude / 2 : magnitude;
    return Math.ceil(val / step) * step;
  };

  const maxValue = getNiceMax(rawMax);
  const tickCount = 4;
  const tickStep = maxValue / tickCount;
  const yTicks = Array.from({ length: tickCount }, (_, i) => tickStep * (i + 1));

  // Chart geometry
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 16;
  const paddingBottom = 36;
  const chartHeight = 280;
  const plotHeight = chartHeight - paddingTop - paddingBottom;
  const plotWidth = containerWidth - paddingLeft - paddingRight;
  const barWidth = Math.min(42, plotWidth / (data.length || 1) - 12);
  const colCount = data.length;
  const colSpacing = colCount > 0 ? plotWidth / colCount : 0;
  const barRadius = 6;

  const getY = (val) => {
    return paddingTop + plotHeight - (val / maxValue) * plotHeight;
  };

  const roundedTopRect = (x, y, w, h, r) => {
    if (h <= 0) return '';
    const cr = Math.min(r, w / 2, h);
    const bottom = y + h;
    return `M${x},${bottom} L${x},${y + cr} Q${x},${y} ${x + cr},${y} L${x + w - cr},${y} Q${x + w},${y} ${x + w},${y + cr} L${x + w},${bottom} Z`;
  };

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div ref={containerRef} className="custom-bar-chart">
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: chartHeight, color: 'var(--text-tertiary)', fontSize: '14px'
        }}>
          No attendance data for this period
        </div>
      </div>
    );
  }

  // Tooltip position calculation
  const getTooltipPos = (index) => {
    const colCenter = paddingLeft + colSpacing * index + colSpacing / 2;
    const val = data[index]?.attendance || 0;
    const barTopY = getY(Math.min(val, maxValue));
    return { x: colCenter, y: barTopY - 12 };
  };

  return (
    <div ref={containerRef} className="custom-bar-chart" style={{ position: 'relative' }}>
      {containerWidth > 0 && (
        <>
          <svg
            width={containerWidth}
            height={chartHeight}
            viewBox={`0 0 ${containerWidth} ${chartHeight}`}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {/* Horizontal grid lines */}
            {yTicks.map((tick) => (
              <line
                key={tick}
                x1={paddingLeft}
                y1={getY(tick)}
                x2={containerWidth - paddingRight}
                y2={getY(tick)}
                stroke="var(--border-color)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
            ))}
            {/* Baseline */}
            <line
              x1={paddingLeft}
              y1={getY(0)}
              x2={containerWidth - paddingRight}
              y2={getY(0)}
              stroke="var(--border-color)"
              strokeWidth="1"
            />

            {/* Y-axis labels */}
            {yTicks.map((tick) => (
              <text
                key={tick}
                x={paddingLeft - 12}
                y={getY(tick) + 4}
                textAnchor="end"
                fontSize="12"
                fill="var(--text-tertiary)"
                fontFamily="Inter, sans-serif"
              >
                {tick >= 1000 ? `${(tick / 1000).toFixed(tick % 1000 === 0 ? 0 : 1)}k` : tick}
              </text>
            ))}

            {/* Bars */}
            {data.map((d, i) => {
              const colCenter = paddingLeft + colSpacing * i + colSpacing / 2;
              const barX = colCenter - barWidth / 2;
              const baseline = getY(0);
              const isHovered = hoveredIndex === i;

              // Grey bar: always full height to maxValue
              const greyBarHeight = (maxValue / maxValue) * plotHeight;
              const greyBarY = baseline - greyBarHeight;

              // Orange bar: from baseline up to actual value
              const orangeBarHeight = (Math.min(d.attendance, maxValue) / maxValue) * plotHeight;
              const orangeBarY = baseline - orangeBarHeight;

              return (
                <g key={i}>
                  {/* Grey background bar (full capacity) */}
                  <path
                    d={roundedTopRect(barX, greyBarY, barWidth, greyBarHeight, barRadius)}
                    fill="var(--chart-bar-bg)"
                    opacity={isHovered ? 0.7 : 1}
                  />
                  {/* Orange foreground bar (attendance value) */}
                  {orangeBarHeight > 0 && (
                    <path
                      d={roundedTopRect(barX, orangeBarY, barWidth, orangeBarHeight, barRadius)}
                      fill="var(--chart-bar-active)"
                      opacity={isHovered ? 1 : 0.85}
                      style={{ transition: 'all 0.3s ease' }}
                    />
                  )}
                  {/* Invisible hit-area for hover detection */}
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

            {/* X-axis labels */}
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
                  fontWeight={hoveredIndex === i ? '600' : '400'}
                  fontFamily="Inter, sans-serif"
                  style={{ transition: 'all 0.2s ease' }}
                >
                  {d.name}
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
                  {d.attendance.toLocaleString()}
                </div>
                <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>
                  {d.name} — Total Attendance
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
   MAIN DASHBOARD COMPONENT
   ============================================ */
function Dashboard() {
  const [programs, setPrograms] = useState([]);
  const [churchData, setChurchData] = useState({
    name: '',
    branch: '',
    email: '',
    logo: null
  });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('ingather-theme') === 'dark';
  });
  const toast = useToast();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  // ---- Date-range filtering state ----
  const getDefaultDateRange = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  };

  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const [presetLabel, setPresetLabel] = useState('30');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(dateRange.startDate);
  const [customEndDate, setCustomEndDate] = useState(dateRange.endDate);

  // Dashboard stats from API
  const [totalPrograms, setTotalPrograms] = useState(0);
  const [totalAttendance, setTotalAttendance] = useState(0);
  const [upcomingPrograms, setUpcomingPrograms] = useState(0);
  const [chartData, setChartData] = useState([]);
  const [donutData, setDonutData] = useState([
    { label: 'Female Attendance', value: 0, color: '#7C3AED' },
    { label: 'Male Attendance', value: 0, color: '#10B981' },
    { label: 'First Timer Attendance', value: 0, color: '#F59E0B' },
  ]);

  // Refs for click-outside detection
  const datePickerRef = useRef(null);
  const presetDropdownRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
      if (presetDropdownRef.current && !presetDropdownRef.current.contains(e.target)) {
        setShowPresetDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Theme effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('ingather-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Cleanup theme on unmount (so other pages aren't affected)
  useEffect(() => {
    return () => {
      // Preserve theme across pages
    };
  }, []);

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

  // Fetch church data and unread notification count on mount
  useEffect(() => {
    const fetchChurchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          window.location.href = '/login';
          return;
        }
        const church = await getCurrentChurch();
        setChurchData({
          name: church.churchName,
          branch: church.branchName,
          email: church.email || '',
          logo: church.logoUrl
        });
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
      } catch (error) {
        console.error('Error fetching church data:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      }
    };
    fetchChurchData();
  }, []);

  // Fetch dashboard stats whenever dateRange changes
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        if (!initialLoadDone) setLoading(true);
        const stats = await getDashboardStats(dateRange.startDate, dateRange.endDate);

        setTotalPrograms(stats.totalPrograms);
        setTotalAttendance(stats.totalAttendance);
        setUpcomingPrograms(stats.upcomingPrograms);

        // Format programs for the table
        const formattedPrograms = stats.recentPrograms.map(p => ({
          id: p.id,
          title: p.title,
          date: p.date,
          startTime: p.startTime,
          endTime: p.endTime,
          totalScans: p.totalScans,
          status: p.isActive ? 'active' : 'completed',
          dataCollection: p.trackingMode === 'collect-data'
        }));
        setPrograms(formattedPrograms);

        // Chart data
        if (stats.attendanceOvertime && stats.attendanceOvertime.length > 0) {
          setChartData(stats.attendanceOvertime);
        } else {
          setChartData([]);
        }

        // Donut data from real percentages
        const gb = stats.genderBreakdown;
        if (gb && (gb.femalePercent > 0 || gb.malePercent > 0 || gb.firstTimerPercent > 0)) {
          setDonutData([
            { label: 'Female Attendance', value: gb.femalePercent, color: '#7C3AED' },
            { label: 'Male Attendance', value: gb.malePercent, color: '#10B981' },
            { label: 'First Timer Attendance', value: gb.firstTimerPercent, color: '#F59E0B' },
          ]);
        } else {
          setDonutData([
            { label: 'Female Attendance', value: 0, color: '#7C3AED' },
            { label: 'Male Attendance', value: 0, color: '#10B981' },
            { label: 'First Timer Attendance', value: 0, color: '#F59E0B' },
          ]);
        }

        setLoading(false);
        setInitialLoadDone(true);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        setLoading(false);
        setInitialLoadDone(true);
      }
    };
    fetchDashboardStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  // ---- Preset dropdown handler ----
  const handlePresetSelect = (days) => {
    setPresetLabel(days);
    setShowPresetDropdown(false);

    if (days === 'all') {
      setDateRange({ startDate: null, endDate: null });
      setCustomStartDate('');
      setCustomEndDate('');
    } else {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - parseInt(days));
      const newRange = {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      };
      setDateRange(newRange);
      setCustomStartDate(newRange.startDate);
      setCustomEndDate(newRange.endDate);
    }
  };

  // ---- Custom date range handler ----
  const handleApplyCustomRange = () => {
    if (customStartDate && customEndDate) {
      setDateRange({ startDate: customStartDate, endDate: customEndDate });
      setPresetLabel('custom');
      setShowDatePicker(false);
    }
  };

  const handleLogout = () => {
    toast.confirm('Are you sure you want to logout?', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('church');
      window.location.href = '/';
    });
  };

  const handleDeleteProgram = (program) => {
    toast.confirm(
      `Are you sure you want to delete "${program.title}"? This will permanently remove all its data.`,
      async () => {
        try {
          await deleteProgram(program.id);
          setPrograms(prev => prev.filter(p => p.id !== program.id));
          // Refresh stats after delete
          setDateRange(prev => ({ ...prev }));
          toast.success('Program deleted successfully!');
        } catch (error) {
          toast.error(error.response?.data?.error || 'Failed to delete program.');
        }
      }
    );
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      active: 'status-active',
      upcoming: 'status-upcoming',
      completed: 'status-completed'
    };
    return statusColors[status] || '';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const toggleTheme = () => {
    setDarkMode(prev => !prev);
  };

  // Filtered programs (by status tab — applied on top of date-filtered results)
  const filteredPrograms = programs.filter(p => {
    if (activeFilter === 'all') return true;
    return p.status === activeFilter;
  });

  // Formatted date range text for the date picker button
  const formatFilterDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const dateRangeText = dateRange.startDate && dateRange.endDate
    ? `${formatFilterDate(dateRange.startDate)} - ${formatFilterDate(dateRange.endDate)}`
    : 'All Time';

  const presetLabelMap = {
    '7': 'Last 7 days',
    '14': 'Last 14 days',
    '21': 'Last 21 days',
    '30': 'Last 30 days',
    'all': 'All',
    'custom': 'Custom'
  };
  const presetButtonText = presetLabelMap[presetLabel] || 'Last 30 days';

  // Church initials for avatar fallback
  const churchInitials = churchData.name
    ? churchData.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'IN';

  /* ============================================
     LOADING STATE
     ============================================ */
  if (loading) {
    return (
      <div className="dashboard">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <a href="/dashboard" className="sidebar-logo-link">
              <span className="sidebar-logo-icon">{Icons.logo}</span>
              <span className="sidebar-logo-text">Ingather</span>
            </a>
          </div>
        </aside>
        <main className="dashboard-main">
          <div className="dashboard-loading">
            <div className="spinner"></div>
            <p>Loading dashboard...</p>
          </div>
        </main>
      </div>
    );
  }

  /* ============================================
     MAIN RENDER
     ============================================ */
  return (
    <div className="dashboard">
      {/* ====== SIDEBAR ====== */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-drawer-open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <a href="/dashboard" className="sidebar-logo-link">
            <span className="sidebar-logo-icon">{Icons.logo}</span>
            <span className="sidebar-logo-text">Ingather</span>
          </a>
          <button className="sidebar-collapse-btn" title="Toggle sidebar">
            {Icons.collapse}
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <a href="/dashboard" className="nav-item active" id="nav-dashboard" onClick={closeMobileMenu}>
            <span className="nav-icon">{Icons.dashboard}</span>
            <span>Dashboard</span>
          </a>
          <a href="/create-program" className="nav-item" id="nav-create-program" onClick={closeMobileMenu}>
            <span className="nav-icon">{Icons.createProgram}</span>
            <span>Create Program</span>
          </a>
          <a href="/programs" className="nav-item" id="nav-all-programs" onClick={closeMobileMenu}>
            <span className="nav-icon">{Icons.allPrograms}</span>
            <span>All Program</span>
          </a>
          <a href="/settings" className="nav-item" id="nav-settings" onClick={closeMobileMenu}>
            <span className="nav-icon">{Icons.settings}</span>
            <span>Settings</span>
          </a>
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <a href="/settings?tab=notifications" className="sidebar-footer-item" id="nav-notifications" onClick={closeMobileMenu}>
            <span className="nav-icon">{Icons.notification}</span>
            <span>Notification</span>
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </a>
          <button className="btn-logout" onClick={() => { closeMobileMenu(); handleLogout(); }} id="btn-logout">
            <span className="nav-icon">{Icons.logout}</span>
            <span>Log out</span>
          </button>
        </div>

        {/* Church Profile */}
        <div className="sidebar-profile" onClick={() => { closeMobileMenu(); window.location.href = '/settings'; }}>
          <div className="sidebar-profile-avatar">
            {churchData.logo ? (
              <img src={churchData.logo} alt={churchData.name} />
            ) : (
              <span className="sidebar-profile-avatar-fallback">{churchInitials}</span>
            )}
          </div>
          <div className="sidebar-profile-info">
            <div className="sidebar-profile-name">{churchData.name}</div>
            <div className="sidebar-profile-email">{churchData.email || `${churchData.name?.toLowerCase().replace(/\s+/g, '')}@gmail.com`}</div>
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

      {/* ====== MAIN CONTENT ====== */}
      <main className="dashboard-main">
        {/* Top Navbar */}
        <header className="top-navbar">
          <div className="navbar-left">
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
            <span className="navbar-church-name">{churchData.name || 'Deeper Life Church'}</span>
          </div>
          <div className="navbar-right">
            {/* Day/Night Mode Toggle */}
            <button className="theme-toggle" onClick={toggleTheme} id="theme-toggle" title="Toggle theme">
              <span className="theme-toggle-label">{darkMode ? 'Night Mode' : 'Day Mode'}</span>
              <span className="theme-toggle-icon">
                {darkMode ? Icons.moon : Icons.sun}
              </span>
            </button>

            {/* Create New Program CTA */}
            <button
              className="navbar-cta"
              onClick={() => window.location.href = '/create-program'}
              id="btn-create-program"
            >
              <span>Create New Program</span>
              {Icons.plus}
            </button>

            {/* Notification Bell */}
            <button className="navbar-icon-btn" title="Notifications" id="btn-navbar-notifications" onClick={() => window.location.href = '/settings?tab=notifications'}>
              {Icons.notification}
              {unreadCount > 0 && <span className="icon-badge"></span>}
            </button>

            {/* Settings Gear */}
            <button
              className="navbar-icon-btn"
              title="Settings"
              onClick={() => window.location.href = '/settings'}
              id="btn-navbar-settings"
            >
              {Icons.gear}
            </button>

            {/* Avatar */}
            <div className="navbar-avatar-dropdown" ref={profileMenuRef}>
              <div className="navbar-avatar" onClick={() => window.location.href = '/settings'} title="View Profile">
                {churchData.logo ? (
                  <img src={churchData.logo} alt={churchData.name} />
                ) : (
                  <div className="navbar-avatar-fallback">{churchInitials}</div>
                )}
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

        {/* Dashboard Content */}
        <div className="dashboard-content">
          {/* Overview Header */}
          <div className="overview-header">
            <h2 className="overview-title">Overview</h2>
            <div className="overview-filters">
              {/* Custom Date Range Picker */}
              <div className="filter-dropdown-wrapper" ref={datePickerRef}>
                <button
                  className="filter-date-range"
                  id="filter-date-range"
                  onClick={() => { setShowDatePicker(!showDatePicker); setShowPresetDropdown(false); }}
                >
                  <span>{dateRangeText}</span>
                  {Icons.calendar}
                </button>
                {showDatePicker && (
                  <div className="datepicker-dropdown">
                    <div className="datepicker-field">
                      <label htmlFor="custom-start-date">Start Date</label>
                      <input
                        type="date"
                        id="custom-start-date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                      />
                    </div>
                    <div className="datepicker-field">
                      <label htmlFor="custom-end-date">End Date</label>
                      <input
                        type="date"
                        id="custom-end-date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                      />
                    </div>
                    <button
                      className="datepicker-apply-btn"
                      onClick={handleApplyCustomRange}
                      disabled={!customStartDate || !customEndDate}
                      id="btn-apply-date-range"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>

              {/* Preset Date Range Dropdown */}
              <div className="filter-dropdown-wrapper" ref={presetDropdownRef}>
                <button
                  className="filter-dropdown"
                  id="filter-last-30"
                  onClick={() => { setShowPresetDropdown(!showPresetDropdown); setShowDatePicker(false); }}
                >
                  <span>{presetButtonText}</span>
                  {Icons.calendar}
                </button>
                {showPresetDropdown && (
                  <div className="preset-dropdown">
                    {['7', '14', '21', '30', 'all'].map((val) => (
                      <button
                        key={val}
                        className={`preset-dropdown-item ${presetLabel === val ? 'active' : ''}`}
                        onClick={() => handlePresetSelect(val)}
                        id={`preset-${val}`}
                      >
                        {val === 'all' ? 'All' : `${val} days`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="stats-grid">
            {/* Total Programs */}
            <div className="stat-card" id="stat-total-programs">
              <div className="stat-icon">
                {Icons.totalPrograms}
              </div>
              <div className="stat-info">
                <span className="stat-label">Total Programs</span>
                <h2 className="stat-value">{totalPrograms}</h2>
              </div>
              <div className="stat-card-info" title="Total number of programs created">
                {Icons.info}
              </div>
            </div>

            {/* Total Attendance */}
            <div className="stat-card" id="stat-total-attendance">
              <div className="stat-icon">
                {Icons.totalAttendance}
              </div>
              <div className="stat-info">
                <span className="stat-label">Total Attendance</span>
                <h2 className="stat-value">{totalAttendance.toLocaleString()}</h2>
              </div>
              <div className="stat-sparkline">
                <Sparkline data={chartData} />
              </div>
            </div>

            {/* Upcoming Programs */}
            <div className="stat-card" id="stat-upcoming-programs">
              <div className="stat-icon">
                {Icons.upcomingPrograms}
              </div>
              <div className="stat-info">
                <span className="stat-label">Upcoming Programs</span>
                <h2 className="stat-value">{upcomingPrograms}</h2>
              </div>
              <div className="stat-card-info" title="Programs scheduled in the future">
                {Icons.info}
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="charts-row">
            {/* Attendance Over Time - Bar Chart */}
            <div className="chart-card" id="chart-attendance-overtime">
              <div className="chart-header">
                <h3 className="chart-title">Attendance Overtime</h3>
                <span className="chart-filter-label">{presetButtonText}</span>
              </div>
              <div className="bar-chart-container">
                <AttendanceBarChart data={chartData} />
              </div>
            </div>

            {/* Donut Chart - Attendance Breakdown */}
            <div className="chart-card" id="chart-attendance-breakdown">
              <DonutChart data={donutData} />
            </div>
          </div>

          {/* Recent Programs */}
          <div className="programs-section" id="recent-programs">
            <div className="section-header">
              <h2>Recent Programs</h2>
              <div className="filter-tabs">
                <button
                  className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('all')}
                  id="tab-all"
                >
                  All
                </button>
                <button
                  className={`filter-tab ${activeFilter === 'active' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('active')}
                  id="tab-active"
                >
                  Active
                </button>
                <button
                  className={`filter-tab ${activeFilter === 'upcoming' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('upcoming')}
                  id="tab-upcoming"
                >
                  Upcoming
                  {upcomingPrograms > 0 && (
                    <span className="filter-tab-badge">{upcomingPrograms}</span>
                  )}
                </button>
                <button
                  className={`filter-tab ${activeFilter === 'completed' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('completed')}
                  id="tab-completed"
                >
                  Completed
                </button>
              </div>
            </div>

            <div className="programs-table-container">
              <table className="programs-table" id="programs-table">
                <thead>
                  <tr>
                    <th>Program Title</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Attendance</th>
                    <th>Data Collection</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPrograms.length === 0 ? (
                    <tr>
                      <td colSpan="7">
                        <div className="empty-state">
                          <p>No programs found for this filter.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPrograms.map(program => (
                      <tr key={program.id}>
                        <td className="program-title-cell" data-label="Program">
                          {program.title}
                        </td>
                        <td data-label="Date">{formatDate(program.date)}</td>
                        <td data-label="Time">{program.startTime} - {program.endTime}</td>
                        <td data-label="Status">
                          <span className={`status-badge ${getStatusBadge(program.status)}`}>
                            {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
                          </span>
                        </td>
                        <td data-label="Attendance">
                          <strong>{program.totalScans.toLocaleString()}</strong>
                        </td>
                        <td data-label="Data Collection">
                          <span className={program.dataCollection ? 'badge-yes' : 'badge-no'}>
                            {program.dataCollection ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td data-label="Actions">
                          <div className="action-buttons">
                            <button
                              className="btn-action btn-view"
                              onClick={() => window.location.href = `/program/${program.id}`}
                              id={`btn-view-${program.id}`}
                            >
                              View
                            </button>
                            <button
                              className="btn-action btn-delete"
                              onClick={() => handleDeleteProgram(program)}
                              title="Delete program"
                              id={`btn-delete-${program.id}`}
                            >
                              {Icons.trash}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
