import React, { useId } from 'react';

function InfoIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="8" cy="8" r="6" />
      <line x1="8" y1="10.5" x2="8" y2="7.5" />
      <circle cx="8" cy="5.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function InfoTooltip({ content, className = '', label = 'Metric information' }) {
  const tooltipId = useId();

  return (
    <span className={`info-tooltip ${className}`.trim()}>
      <button
        type="button"
        className="info-tooltip-trigger"
        aria-label={label}
        aria-describedby={tooltipId}
      >
        <InfoIcon />
      </button>
      <span id={tooltipId} className="info-tooltip-bubble" role="tooltip">
        {content}
      </span>
    </span>
  );
}

export default InfoTooltip;
