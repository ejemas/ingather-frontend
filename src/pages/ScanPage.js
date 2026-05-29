// CHANGE THIS LINE:
import React, { useState, useEffect, useRef } from 'react';
// import { getProgramInfo, submitScan } from '../api/scanService';
import { useParams } from 'react-router-dom';
import { getProgramInfo, submitScan, submitFormData, submitProxyAttendee, updateScanData, trackSponsorClick } from '../api/scanService';
import { useToast } from '../components/Toast';
import { useEventTemplate } from '../context/EventTemplateContext';
import '../styles/ScanPage.css';

const INGATHER_PUBLIC_ORIGIN = 'https://ingather.app';

const getEventDetailsUrl = (programId) => `${INGATHER_PUBLIC_ORIGIN}/scan/${programId}?details=1`;

const fallbackFingerprint = () => {
  return `${navigator.userAgent}-${navigator.language}-${window.screen.width}x${window.screen.height}`;
};

const FINGERPRINT_CACHE_KEY = 'ingather_device_fingerprint_v1';

const getCachedFingerprint = () => {
  try {
    return window.localStorage.getItem(FINGERPRINT_CACHE_KEY);
  } catch (error) {
    return null;
  }
};

const setCachedFingerprint = (fingerprint) => {
  try {
    window.localStorage.setItem(FINGERPRINT_CACHE_KEY, fingerprint);
  } catch (error) {
    // Private browsing or storage restrictions should not block scanning.
  }
};

const getDeviceFingerprint = async () => {
  const cachedFingerprint = getCachedFingerprint();
  if (cachedFingerprint) return cachedFingerprint;

  try {
    const { default: FingerprintJS } = await import('@fingerprintjs/fingerprintjs');
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    setCachedFingerprint(result.visitorId);
    return result.visitorId;
  } catch (error) {
    const fallback = fallbackFingerprint();
    setCachedFingerprint(fallback);
    return fallback;
  }
};

const getShareLinks = (shareUrl, title) => {
  const text = `View ${title || 'this event'} details on Ingather`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(text);
  const encodedTextWithUrl = encodeURIComponent(`${text} ${shareUrl}`);

  return [
    { key: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${encodedTextWithUrl}` },
    { key: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { key: 'x', label: 'X', href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}` },
    { key: 'telegram', label: 'Telegram', href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}` },
    { key: 'linkedin', label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` }
  ];
};

const formatEventDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const formatEventTime = (startTime, endTime) => {
  if (!startTime && !endTime) return '';
  return [startTime, endTime].filter(Boolean).join(' - ');
};

const isPersonalizedFlyer = (programData) => (
  programData?.flyerType === 'personalized' && Boolean(programData?.personalizedFlyerConfig?.template)
);

const getFirstName = (fullName) => {
  const firstName = String(fullName || '').trim().split(/\s+/)[0];
  return firstName || 'Friend';
};

const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const personalizeTemplate = (template, firstName) => (
  String(template || '[FirstName], you are welcome and deeply valued.')
    .replace(/\[FirstName\]/gi, firstName)
);

const loadCanvasImage = (src) => new Promise((resolve, reject) => {
  if (!src) return resolve(null);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

const wrapWordsToCanvasLines = (ctx, words, maxWidth) => {
  const lines = [];
  let line = '';

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  });

  if (line) lines.push(line);
  return lines;
};

function EventDetailsButton({ programData, onClick }) {
  const personalized = isPersonalizedFlyer(programData);
  if (!personalized && !programData?.flyerUrl) return null;

  return (
    <button type="button" className="event-details-trigger" onClick={onClick}>
      <span className="event-details-trigger-icon">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="14" height="12" rx="2" />
          <line x1="3" y1="8" x2="17" y2="8" />
          <path d="M7 12h4" />
        </svg>
      </span>
      <span>
        <strong>{personalized ? 'View Personalized Flyer' : 'View Event Details'}</strong>
        <small>{personalized ? 'Your custom encouragement card' : 'Flyer, date, and share link'}</small>
      </span>
      <svg className="event-details-trigger-arrow" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="10" x2="15" y2="10" />
        <polyline points="11,6 15,10 11,14" />
      </svg>
    </button>
  );
}

function GenderIcon({ type }) {
  if (type === 'female') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="8" r="4" />
        <path d="M12 12v8" />
        <path d="M8.5 16h7" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10" cy="14" r="4" />
      <path d="M13 11l6-6" />
      <path d="M15 5h4v4" />
    </svg>
  );
}

function ScanFormShell({ badge, programData, helperText, mode, children }) {
  return (
    <div className="scan-page scan-form-page">
      <div className={`scan-container scan-form-container ${mode ? `scan-form-container-${mode}` : ''}`}>
        <section className="scan-figma-card">
          <div className="scan-figma-pill">{badge}</div>
          <header className="scan-figma-header">
            <h1>{programData.churchName}</h1>
            <h2>{programData.title}</h2>
            <p>{helperText}</p>
          </header>
          {children}
        </section>
      </div>
    </div>
  );
}

function ScanInputField({ label, error, ...inputProps }) {
  return (
    <div className="scan-figma-field">
      <label htmlFor={inputProps.id}>{label}</label>
      <input className={`scan-figma-input ${error ? 'has-error' : ''}`} {...inputProps} />
      {error && <span className="scan-figma-error">{error}</span>}
    </div>
  );
}

function ScanSelectField({ label, error, children, ...selectProps }) {
  return (
    <div className="scan-figma-field">
      <label htmlFor={selectProps.id}>{label}</label>
      <span className="scan-figma-select-wrap">
        <select className={`scan-figma-input ${error ? 'has-error' : ''}`} {...selectProps}>
          {children}
        </select>
      </span>
      {error && <span className="scan-figma-error">{error}</span>}
    </div>
  );
}

function PersonalizedFlyerViewer({ programData, attendeeName, onClose, standalone = false, toast }) {
  if (!isPersonalizedFlyer(programData)) return null;

  const config = programData.personalizedFlyerConfig || {};
  const firstName = getFirstName(attendeeName);
  const message = personalizeTemplate(config.template, firstName);
  const brandColor = config.brandColor || '#E8590C';
  const configuredTextColor = config.textColor || '#111217';
  const textColor = ['#fff', '#ffffff', 'white'].includes(String(configuredTextColor).trim().toLowerCase())
    ? '#111217'
    : configuredTextColor;
  const logoUrl = config.logoUrl || programData.personalizedLogoUrl || programData.churchLogo;
  const logoFallback = (programData.churchName || 'Ingather').slice(0, 2).toUpperCase();
  const messageWithoutName = message.replace(new RegExp(`^${escapeRegExp(firstName)}[,\\s-]*`, 'i'), '').trim() || message;
  const motivationalWords = messageWithoutName.split(/\s+/).filter(Boolean);
  const firstMessageLine = motivationalWords.slice(0, 5).join(' ') || messageWithoutName;
  const secondMessageLine = motivationalWords.slice(5).join(' ');

  const handleDownload = async () => {
    try {
      const flyerSize = 800;
      const pathThickness = 5;
      const pathRadius = 55;
      const logoSize = 96;
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = flyerSize * scale;
      canvas.height = flyerSize * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, flyerSize, flyerSize);

      ctx.strokeStyle = brandColor;
      ctx.lineWidth = pathThickness;
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(102.5, 0);
      ctx.lineTo(102.5, 400);
      ctx.moveTo(102.5, 400);
      ctx.lineTo(102.5, 650 - pathRadius);
      ctx.quadraticCurveTo(102.5, 647.5, 100 + pathRadius, 647.5);
      ctx.lineTo(600 - pathRadius, 647.5);
      ctx.quadraticCurveTo(597.5, 647.5, 597.5, 650 - pathRadius);
      ctx.lineTo(597.5, 400);
      ctx.moveTo(350, 252.5);
      ctx.lineTo(600 - pathRadius, 252.5);
      ctx.quadraticCurveTo(597.5, 252.5, 597.5, 250 + pathRadius);
      ctx.lineTo(597.5, 400);
      ctx.stroke();

      const logo = await loadCanvasImage(logoUrl).catch(() => null);
      const drawLogoCircle = (x, y, size) => {
        const cx = x + size / 2;
        const cy = y + size / 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.lineWidth = pathThickness;
        ctx.strokeStyle = brandColor;
        ctx.stroke();

        if (logo) {
          ctx.clip();
          const ratio = logo.width / logo.height;
          let drawWidth = size;
          let drawHeight = size;
          let dx = x;
          let dy = y;
          if (ratio > 1) {
            drawWidth = size * ratio;
            dx = cx - drawWidth / 2;
          } else {
            drawHeight = size / ratio;
            dy = cy - drawHeight / 2;
          }
          ctx.drawImage(logo, dx, dy, drawWidth, drawHeight);
        } else {
          ctx.fillStyle = brandColor;
          ctx.font = '600 16px Inter, Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(logoFallback, cx, cy);
        }
        ctx.restore();
      };

      drawLogoCircle(520, 60, logoSize);
      drawLogoCircle(254, 204.5, logoSize);

      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      const textLeft = 245;
      const textRight = 585;
      const firstLineY = 397;
      const secondaryY = 427;
      const displayName = `“${firstName}`;
      ctx.font = '800 42px Poppins, Arial, sans-serif';
      let nameFontSize = 42;
      while (ctx.measureText(displayName).width > 220 && nameFontSize > 30) {
        nameFontSize -= 1;
        ctx.font = `800 ${nameFontSize}px Poppins, Arial, sans-serif`;
      }
      ctx.fillStyle = brandColor;
      ctx.fillText(displayName, textLeft, firstLineY);

      const descriptionX = textLeft + ctx.measureText(displayName).width + 8;
      ctx.font = '400 17px Inter, Arial, sans-serif';
      ctx.fillStyle = textColor;
      const words = messageWithoutName.split(/\s+/).filter(Boolean);
      const firstLine = [];
      let firstLineText = '';
      while (words.length) {
        const testLine = firstLineText ? `${firstLineText} ${words[0]}` : words[0];
        if (ctx.measureText(testLine).width > Math.max(80, textRight - descriptionX) && firstLineText) break;
        firstLine.push(words.shift());
        firstLineText = firstLine.join(' ');
      }
      if (firstLineText) ctx.fillText(firstLineText, descriptionX, firstLineY);

      const remainingLines = wrapWordsToCanvasLines(ctx, words, textRight - textLeft);
      remainingLines.slice(0, 3).forEach((textLine, index) => {
        ctx.fillText(textLine, textLeft + 2, secondaryY + index * 24);
      });

      const link = document.createElement('a');
      link.download = `${firstName.toLowerCase()}-ingather-flyer.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      toast?.error('Unable to download this flyer. Please try again.');
    }
  };

  const handleShare = async () => {
    const shareText = `${message} - ${programData.title || 'Ingather Event'}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Ingather Flyer', text: shareText });
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      toast?.success('Personalized message copied.');
    } catch (error) {
      toast?.info('Download the flyer to share it.');
    }
  };

  const content = (
    <div className="personalized-viewer-card">
      <div className="personalized-viewer-header">
        <div>
          <p className="personalized-viewer-kicker">{programData.churchName}</p>
          <h2>Your Personalized Flyer</h2>
        </div>
        {!standalone && (
          <button type="button" className="flyer-viewer-close" onClick={onClose} aria-label="Close personalized flyer">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <line x1="5" y1="5" x2="15" y2="15" />
              <line x1="15" y1="5" x2="5" y2="15" />
            </svg>
          </button>
        )}
      </div>

      <div
        className="personalized-card-preview"
        style={{
          '--personalized-brand': brandColor,
          '--personalized-text': textColor
        }}
      >
        <div className="path-left-extension" aria-hidden="true" />
        <div className="path-main-u" aria-hidden="true" />
        <div className="path-top-hook" aria-hidden="true" />

        <span className="logo-circle top-logo">
          {logoUrl ? <img src={logoUrl} alt="" /> : <span>{logoFallback}</span>}
        </span>
        <span className="logo-circle inline-logo">
          {logoUrl ? (
            <img src={logoUrl} alt={`${programData.churchName || 'Organization'} logo`} />
          ) : (
            <span>{logoFallback}</span>
          )}
        </span>

        <div className="personalized-text-content">
          <div className="personalized-line-primary">
            <span className="personalized-brand-name"><span>&ldquo;</span>{firstName}</span>
            <span className="personalized-description">{firstMessageLine}</span>
          </div>
          {secondMessageLine && <div className="personalized-line-secondary">{secondMessageLine}</div>}
        </div>
      </div>

      <div className="personalized-actions">
        <button type="button" className="flyer-share-primary" onClick={handleDownload}>
          Download flyer
        </button>
        <button type="button" className="personalized-share-secondary" onClick={handleShare}>
          Share message
        </button>
      </div>
    </div>
  );

  if (standalone) return content;

  return (
    <div className="flyer-viewer-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        {content}
      </div>
    </div>
  );
}

function FlyerDetailsViewer({ programData, programId, onClose, standalone = false, toast }) {
  if (!programData?.flyerUrl) return null;

  const shareUrl = getEventDetailsUrl(programId);
  const shareLinks = getShareLinks(shareUrl, programData.title);

  const handleShare = async () => {
    const shareData = {
      title: programData.title || 'Ingather Event',
      text: `View ${programData.title || 'this event'} details on Ingather`,
      url: shareUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast?.success('Event link copied.');
    } catch (error) {
      window.open(shareLinks[0].href, '_blank', 'noopener,noreferrer');
    }
  };

  const dateText = formatEventDate(programData.date);
  const timeText = formatEventTime(programData.startTime, programData.endTime);

  const content = (
    <div className="flyer-viewer-card">
      <div className="flyer-viewer-header">
        <div>
          <p className="flyer-viewer-kicker">{programData.churchName}</p>
          <h2>{programData.title}</h2>
          {(dateText || timeText) && (
            <div className="flyer-viewer-meta">
              {dateText && <span>{dateText}</span>}
              {timeText && <span>{timeText}</span>}
            </div>
          )}
        </div>
        {!standalone && (
          <button type="button" className="flyer-viewer-close" onClick={onClose} aria-label="Close event details">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <line x1="5" y1="5" x2="15" y2="15" />
              <line x1="15" y1="5" x2="5" y2="15" />
            </svg>
          </button>
        )}
      </div>

      <div className="flyer-viewer-image-wrap">
        <img src={programData.flyerUrl} alt={`${programData.title} event flyer`} />
      </div>

      <div className="flyer-share-panel">
        <div className="flyer-share-copy">
          <h3>Share this event</h3>
          <p>Send the flyer and details to someone who may want to attend.</p>
        </div>
        <button type="button" className="flyer-share-primary" onClick={handleShare}>
          Share event link
        </button>
        <div className="flyer-share-links">
          {shareLinks.map(link => (
            <a
              key={link.key}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flyer-share-link"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );

  if (standalone) {
    return content;
  }

  return (
    <div className="flyer-viewer-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        {content}
      </div>
    </div>
  );
}

const groupSponsorsByTier = (sponsors = []) => {
  const groups = [];
  sponsors.forEach((sponsor) => {
    const label = sponsor.tier || 'Featured Sponsors';
    let group = groups.find(item => item.label === label);
    if (!group) {
      group = { label, sponsors: [] };
      groups.push(group);
    }
    group.sponsors.push(sponsor);
  });
  return groups;
};

const isHeadlineSponsor = (sponsor) => /headline/i.test(sponsor?.tier || '');

const getSponsorFlyerUrl = (sponsor) => sponsor?.flyerUrl || sponsor?.flyer_url || '';

function GiftBoxIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <rect x="3" y="7" width="18" height="4" rx="1.5" />
      <line x1="12" y1="7" x2="12" y2="20" />
      <path d="M12 7C10.4 4.4 8.2 3.7 7 4.9C5.7 6.2 7.1 8 12 7Z" />
      <path d="M12 7c1.6-2.6 3.8-3.3 5-2.1C18.3 6.2 16.9 8 12 7Z" />
    </svg>
  );
}

function WinnerConfetti() {
  const pieces = [
    ['left', '#E8590C'], ['left', '#16A34A'], ['left', '#F59E0B'], ['left', '#7C3AED'],
    ['right', '#E8590C'], ['right', '#16A34A'], ['right', '#F59E0B'], ['right', '#2563EB'],
    ['top', '#E8590C'], ['top', '#16A34A'], ['top', '#F59E0B'], ['top', '#EF4444']
  ];

  return (
    <div className="winner-confetti" aria-hidden="true">
      {pieces.map(([origin, color], index) => (
        <span
          key={`${origin}-${index}`}
          className={`winner-confetti-piece ${origin}`}
          style={{
            '--confetti-color': color,
            '--confetti-index': index,
            '--confetti-left': `${18 + (index * 5)}%`
          }}
        />
      ))}
    </div>
  );
}

const getOrderedSponsors = (sponsors = []) => {
  return [...sponsors].sort((first, second) => {
    const firstIsHeadline = isHeadlineSponsor(first);
    const secondIsHeadline = isHeadlineSponsor(second);
    if (firstIsHeadline === secondIsHeadline) return 0;
    return firstIsHeadline ? -1 : 1;
  });
};

function SponsorCarouselDots({ count, activeIndex = 0, onSelect }) {
  if (count <= 1) return null;

  return (
    <div className="post-checkin-sponsor-dots" aria-label="Sponsor carousel position">
      {Array.from({ length: count }).map((_, index) => (
        <button
          key={index}
          type="button"
          className={index === activeIndex ? 'active' : ''}
          aria-label={`Show sponsor ${index + 1}`}
          aria-current={index === activeIndex ? 'true' : undefined}
          onClick={() => onSelect?.(index)}
        />
      ))}
    </div>
  );
}

function SponsorCard({ sponsor, onSponsorClick, compact = false }) {
  const [imageFailed, setImageFailed] = useState(false);
  const handleClick = () => onSponsorClick(sponsor);
  const headline = isHeadlineSponsor(sponsor);
  const flyerUrl = getSponsorFlyerUrl(sponsor);
  const canShowFlyer = flyerUrl && !imageFailed;

  return (
    <article className={`post-checkin-sponsor-card ${compact ? 'compact' : ''} ${headline ? 'is-headline' : ''}`}>
      <button type="button" className="post-checkin-sponsor-image" onClick={handleClick}>
        {headline && <span className="post-checkin-sponsor-badge">Headline Sponsor</span>}
        {canShowFlyer ? (
          <img
            src={flyerUrl}
            alt={`${sponsor.sponsorName} sponsor flyer`}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="post-checkin-sponsor-image-fallback">
            Sponsor flyer unavailable
          </span>
        )}
      </button>
      <div className="post-checkin-sponsor-copy">
        <div>
          <p className="post-checkin-sponsor-kicker">Sponsored By</p>
          <h3>{sponsor.sponsorName}</h3>
          {sponsor.boothText && <span className="post-checkin-sponsor-booth">{sponsor.boothText}</span>}
        </div>
        <button type="button" className="post-checkin-sponsor-cta" onClick={handleClick}>
          {sponsor.ctaText || 'Learn More'}
        </button>
      </div>
    </article>
  );
}

function PostCheckInSponsors({ placement, onSponsorClick }) {
  const carouselRef = useRef(null);
  const [activeSponsorIndex, setActiveSponsorIndex] = useState(0);

  const updateActiveSponsorIndex = () => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const cards = Array.from(carousel.querySelectorAll('.post-checkin-sponsor-card'));
    if (cards.length === 0) return;

    const viewportCenter = carousel.scrollLeft + carousel.clientWidth / 2;
    const closestIndex = cards.reduce((closest, card, index) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(cardCenter - viewportCenter);
      return distance < closest.distance ? { index, distance } : closest;
    }, { index: 0, distance: Number.POSITIVE_INFINITY }).index;

    setActiveSponsorIndex(closestIndex);
  };

  const scrollToSponsor = (index) => {
    const carousel = carouselRef.current;
    const card = carousel?.querySelectorAll('.post-checkin-sponsor-card')?.[index];
    if (!carousel || !card) return;

    carousel.scrollTo({
      left: card.offsetLeft - carousel.offsetLeft,
      behavior: 'smooth'
    });
    setActiveSponsorIndex(index);
  };

  useEffect(() => {
    updateActiveSponsorIndex();
    const carousel = carouselRef.current;
    if (!carousel) return;

    carousel.addEventListener('scroll', updateActiveSponsorIndex, { passive: true });
    window.addEventListener('resize', updateActiveSponsorIndex);

    return () => {
      carousel.removeEventListener('scroll', updateActiveSponsorIndex);
      window.removeEventListener('resize', updateActiveSponsorIndex);
    };
  }, [placement]);

  if (!placement) return null;

  if (placement.mode === 'distribution' && placement.sponsor) {
    return (
      <section className="post-checkin-sponsors post-checkin-sponsors-single" aria-label="Event sponsor">
        <div className="post-checkin-sponsors-header">
          <span>MEET OUR SPONSORS</span>
          <strong>Get familiar with our sponsors and visit their booth</strong>
        </div>
        <SponsorCard sponsor={placement.sponsor} onSponsorClick={onSponsorClick} compact />
      </section>
    );
  }

  const groups = groupSponsorsByTier(placement.sponsors || []);
  if (groups.length === 0) return null;
  const sponsors = getOrderedSponsors(groups.flatMap(group => group.sponsors));

  return (
    <section className="post-checkin-sponsors" aria-label="Event sponsors">
      <div className="post-checkin-sponsors-header">
        <span>MEET OUR SPONSORS</span>
        <strong>Get familiar with our sponsors and visit their booth</strong>
      </div>
      <div className="post-checkin-sponsor-carousel" ref={carouselRef}>
        {sponsors.map(sponsor => (
          <SponsorCard key={sponsor.id} sponsor={sponsor} onSponsorClick={onSponsorClick} />
        ))}
      </div>
      <SponsorCarouselDots count={sponsors.length} activeIndex={activeSponsorIndex} onSelect={scrollToSponsor} />
    </section>
  );
}

function ScanPage() {
  const { programId } = useParams();
  const toast = useToast();
  const { template } = useEventTemplate();
  const detailsOnly = new URLSearchParams(window.location.search).get('details') === '1';


  // ADD THESE NEW ONES:
  const [showGenderForm, setShowGenderForm] = useState(false);
  const [gender, setGender] = useState('');
  const [isFirstTimer, setIsFirstTimer] = useState(false);
  const [submittingGender, setSubmittingGender] = useState(false);

  const hasScannedRef = useRef(false);
  const deviceFingerprintRef = useRef('');
  const scanSessionIdRef = useRef('');
  const scanSessionTokenRef = useRef('');
  const [loading, setLoading] = useState(true);
  const [alreadyScanned, setAlreadyScanned] = useState(false);
  const [programData, setProgramData] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showFlyerDetails, setShowFlyerDetails] = useState(false);
  const [sponsorPlacement, setSponsorPlacement] = useState(null);
  const [showProxyPrompt, setShowProxyPrompt] = useState(false);
  const [showProxyForm, setShowProxyForm] = useState(false);
  const [proxyCount, setProxyCount] = useState(0);
  const [pendingResult, setPendingResult] = useState(null);
  const [proxyFormData, setProxyFormData] = useState({
    fullName: '',
    address: '',
    firstTimer: false,
    phoneNumber: '',
    department: '',
    fellowship: '',
    age: '',
    sex: ''
  });
  const [proxyFormErrors, setProxyFormErrors] = useState({});
  const [submittingProxy, setSubmittingProxy] = useState(false);


  // Form data
  const [formData, setFormData] = useState({
    fullName: '',
    address: '',
    firstTimer: false,
    phoneNumber: '',
    department: '',
    fellowship: '',
    age: '',
    sex: ''
  });

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // Initialize on component mount
  // REPLACE YOUR useEffect WITH THIS:
  useEffect(() => {
    // If we already scanned, stop immediately
    if (hasScannedRef.current) return;

    // Mark as scanned so it doesn't run again
    hasScannedRef.current = true;

    console.log('Initializing scan page for program:', programId);
    if (detailsOnly) {
      loadProgramDetailsOnly();
    } else {
      initializeScan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, detailsOnly]);
  //   useEffect(() => {
  // console.log('Initializing scan page for program:', programId);
  // initializeScan();
  //   }, [programId]);



  //   const initializeScan = () => {
  // try {
  // Create simple device fingerprint
  // We added 'window.' before 'screen' to satisfy the computer
  // const fingerprint = `${navigator.userAgent}-${navigator.language}-${window.screen.width}x${window.screen.height}`;
  //   console.log('Device fingerprint:', fingerprint);

  const initializeScan = async () => {
    try {
      const [fingerprint, programData] = await Promise.all([
        getDeviceFingerprint(),
        getProgramInfo(programId)
      ]);

      deviceFingerprintRef.current = fingerprint;
      console.log('Device fingerprint:', fingerprint);
      console.log('Program data loaded:', programData);

      if (!programData.isActive) {
        setProgramData(programData);
        setLoading(false);
        return;
      }

      setProgramData(programData);

      // Submit scan to backend
      try {
        const scanResult = await submitScan(programId, fingerprint, null);
        scanSessionIdRef.current = scanResult.scanSessionId || '';
        scanSessionTokenRef.current = scanResult.scanSessionToken || '';
        setSponsorPlacement(scanResult.sponsorPlacement || null);
        console.log('Scan recorded successfully:', scanResult);

        // Scan successful - decide what to show based on tracking mode
        if (programData.trackingMode === 'count-only') {
          // Count only - show gender selection form
          setShowGenderForm(true);
          setLoading(false);
        } else if (programData.trackingMode === 'collect-data') {
          // Collect data - show the form
          setShowForm(true);
          setLoading(false);
        }
      } catch (scanError) {
        console.error('Scan error:', scanError);

        // Check if it's because device already scanned
        if (scanError.response?.status === 400 &&
          (scanError.response?.data?.alreadyScanned ||
            scanError.response?.data?.error?.includes('already scanned'))) {
          // Device has already scanned this program
          setAlreadyScanned(true);
        }
        setLoading(false); // Turn off loading on error
      }

    } catch (error) {
      console.error('Error in initializeScan:', error);
      setLoading(false);
    }
  };

  const loadProgramDetailsOnly = async () => {
    try {
      const data = await getProgramInfo(programId);
      setProgramData(data);
      setShowFlyerDetails(Boolean(data.flyerUrl));
    } catch (error) {
      console.error('Error loading event details:', error);
      toast.error('Unable to load event details.');
    } finally {
      setLoading(false);
    }
  };


  const handleGenderSubmit = async () => {
    if (!gender) {
      toast.warning('Please select your gender');
      return;
    }

    setSubmittingGender(true);

    try {
      const fingerprint = deviceFingerprintRef.current || await getDeviceFingerprint();
      deviceFingerprintRef.current = fingerprint;
      await updateScanData(programId, fingerprint, gender, isFirstTimer, scanSessionTokenRef.current, scanSessionIdRef.current);

      console.log('Gender data updated successfully');

      setSubmittingGender(false);
      setShowGenderForm(false);

      // Show result based on first-timer status
      if (isFirstTimer) {
        setResult('first-timer-message');
      } else {
        setResult('count-only-success');
      }
    } catch (error) {
      console.error('Gender submit error:', error);
      toast.error('Failed to submit. Please try again.');
      setSubmittingGender(false);
    }
  };

  const handleReset = () => {
    console.log('Resetting...');
    localStorage.removeItem('scannedPrograms');
    setAlreadyScanned(false);
    setShowForm(false);
    setShowProxyPrompt(false);
    setShowProxyForm(false);
    setProxyCount(0);
    setPendingResult(null);
    setResult(null);
    setSponsorPlacement(null);
    deviceFingerprintRef.current = '';
    scanSessionIdRef.current = '';
    scanSessionTokenRef.current = '';
    setFormData({
      fullName: '',
      address: '',
      firstTimer: false,
      phoneNumber: '',
      department: '',
      fellowship: '',
      age: '',
      sex: ''
    });
    setProxyFormData({
      fullName: '',
      address: '',
      firstTimer: false,
      phoneNumber: '',
      department: '',
      fellowship: '',
      age: '',
      sex: ''
    });
    setProxyFormErrors({});
    setLoading(true);

    // Re-initialize
    setTimeout(() => {
      initializeScan();
    }, 100);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });

    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };

  const validateForm = () => {
    const errors = {};

    if (programData.dataFields.fullName && !formData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }

    if (programData.dataFields.phoneNumber && !formData.phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required';
    }

    if (programData.dataFields.address && !formData.address.trim()) {
      errors.address = 'Address is required';
    }

    if (programData.dataFields.department && !formData.department.trim()) {
      errors.department = 'Department is required';
    }

    if (programData.dataFields.sex && !formData.sex) {
      errors.sex = 'Please select your gender';
    }

    return errors;
  };

  const getNextResult = (submittedFormData, response) => {
    if (submittedFormData.firstTimer && response.isWinner) return 'first-timer-winner';
    if (submittedFormData.firstTimer) return 'first-timer-message';
    if (response.giftingEnabled) return response.isWinner ? 'winner' : 'no-win';
    return 'no-gifting';
  };

  const emptyProxyFormData = () => ({
    fullName: '',
    address: '',
    firstTimer: false,
    phoneNumber: '',
    department: '',
    fellowship: '',
    age: '',
    sex: ''
  });

  const handleProxyChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProxyFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (proxyFormErrors[name]) {
      setProxyFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateProxyForm = () => {
    const errors = {};
    const dataFields = programData?.dataFields || {};

    if (dataFields.fullName && !proxyFormData.fullName.trim()) errors.fullName = 'Full name is required';
    if (dataFields.phoneNumber && !proxyFormData.phoneNumber.trim()) errors.phoneNumber = 'Phone number is required';
    if (dataFields.address && !proxyFormData.address.trim()) errors.address = 'Address is required';
    if (dataFields.department && !proxyFormData.department.trim()) errors.department = 'Department is required';
    if (dataFields.sex && !proxyFormData.sex) errors.sex = 'Please select gender';

    return errors;
  };

  const continueToPendingResult = () => {
    setShowProxyPrompt(false);
    setShowProxyForm(false);
    setResult(pendingResult || 'no-gifting');
    setPendingResult(null);
  };

  const startProxyForm = () => {
    setProxyFormData(emptyProxyFormData());
    setProxyFormErrors({});
    setShowProxyPrompt(false);
    setShowProxyForm(true);
  };

  const handleProxySubmit = async (e) => {
    e.preventDefault();

    const errors = validateProxyForm();
    if (Object.keys(errors).length > 0) {
      setProxyFormErrors(errors);
      return;
    }

    setSubmittingProxy(true);

    try {
      const fingerprint = deviceFingerprintRef.current || await getDeviceFingerprint();
      deviceFingerprintRef.current = fingerprint;

      const response = await submitProxyAttendee(programId, fingerprint, proxyFormData);
      const nextCount = response.proxyCount || proxyCount + 1;
      setProxyCount(nextCount);
      setProxyFormData(emptyProxyFormData());
      setProxyFormErrors({});
      setSubmittingProxy(false);
      setShowProxyForm(false);

      if (nextCount >= 3) {
        continueToPendingResult();
      } else {
        setShowProxyPrompt(true);
      }
    } catch (error) {
      const serverErrors = error.response?.data?.errors;
      if (serverErrors) setProxyFormErrors(serverErrors);
      toast.error(error.response?.data?.error || 'Failed to add attendee. Please try again.');
      setSubmittingProxy(false);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateForm();

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);

    try {
      const fingerprint = deviceFingerprintRef.current || await getDeviceFingerprint();
      deviceFingerprintRef.current = fingerprint;

      // Submit only the form data (scan was already recorded)
      const response = await submitFormData(programId, fingerprint, formData, scanSessionTokenRef.current, scanSessionIdRef.current);
      setSponsorPlacement(response.sponsorPlacement || sponsorPlacement);
      console.log('Form submitted successfully:', response);

      const nextResult = getNextResult(formData, response);

      if (programData?.proxyCheckinEnabled) {
        setPendingResult(nextResult);
        setProxyCount(0);
        setShowProxyPrompt(true);
      } else {
        setResult(nextResult);
      }

      setSubmitting(false);
      setShowForm(false);
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to submit form. Please try again.');
      setSubmitting(false);
    }
  };

  const flyerDetailsOverlay = showFlyerDetails && !detailsOnly ? (
    isPersonalizedFlyer(programData) ? (
      <PersonalizedFlyerViewer
        programData={programData}
        attendeeName={formData.fullName}
        onClose={() => setShowFlyerDetails(false)}
        toast={toast}
      />
    ) : (
      <FlyerDetailsViewer
        programData={programData}
        programId={programId}
        onClose={() => setShowFlyerDetails(false)}
        toast={toast}
      />
    )
  ) : null;

  const handleSponsorClick = async (sponsor) => {
    if (!sponsor?.ctaLink) return;

    try {
      const fingerprint = deviceFingerprintRef.current || await getDeviceFingerprint();
      deviceFingerprintRef.current = fingerprint;
      await trackSponsorClick(sponsor.id, fingerprint);
    } catch (error) {
      console.error('Sponsor click tracking failed:', error);
    } finally {
      window.open(sponsor.ctaLink, '_blank', 'noopener,noreferrer');
    }
  };

  const successActions = (
    <>
      <EventDetailsButton programData={programData} onClick={() => setShowFlyerDetails(true)} />
      <PostCheckInSponsors placement={sponsorPlacement} onSponsorClick={handleSponsorClick} />
    </>
  );

  const feedbackPageClass = 'scan-page scan-feedback-page';

  // LOADING
  if (loading) {
    return (
      <div className="scan-page">
        <div className="scan-container">
          <div className="spinner"></div>
          <p className="loading-text">{detailsOnly ? 'Loading event details...' : 'Checking you in...'}</p>
        </div>
      </div>
    );
  }

  if (detailsOnly) {
    const hasEventDetails = isPersonalizedFlyer(programData) || Boolean(programData?.flyerUrl);

    return (
      <div className={hasEventDetails ? 'scan-page' : feedbackPageClass}>
        <div className="scan-container">
          {isPersonalizedFlyer(programData) ? (
            <PersonalizedFlyerViewer
              programData={programData}
              attendeeName="Friend"
              standalone
              toast={toast}
            />
          ) : programData?.flyerUrl ? (
            <FlyerDetailsViewer
              programData={programData}
              programId={programId}
              standalone
              toast={toast}
            />
          ) : (
            <div className="modal-card">
              <div className="modal-card-topbar orange"></div>
              <div className="modal-card-body">
                <div className="modal-icon-circle">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                </div>
                <h2>Event Details Unavailable</h2>
                <p className="modal-subtitle">No flyer has been added for this event yet.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ALREADY SCANNED
  if (alreadyScanned) {
    return (
      <div className={feedbackPageClass}>
        <div className="scan-container">
          <div className="modal-card">
            <div className="modal-card-topbar orange"></div>
            <div className="modal-card-body">
              <div className="modal-icon-circle">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              </div>
              <h2>Already Checked In</h2>
              <p className="modal-subtitle">{template.scan.alreadyScanned}</p>
              <div className="modal-callout">
                <svg className="callout-diamond" viewBox="0 0 20 20"><rect x="5" y="5" width="10" height="10" rx="2" transform="rotate(45 10 10)" /></svg>
                <span className="callout-text">If you believe this is an error, please contact an usher</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // GENDER SELECTION FORM (Count-Only Mode)
  if (showGenderForm && programData) {
    return (
      <ScanFormShell
        badge="Check-in"
        programData={programData}
        helperText="Please provide a few quick details to complete your check-in."
        mode="count"
      >
        <div className="scan-figma-form scan-count-form">
          <div className="scan-figma-field">
            <label>Select Your Gender *</label>
            <div className="scan-gender-grid" role="radiogroup" aria-label="Select your gender">
              <button
                type="button"
                className={`scan-gender-card ${gender === 'male' ? 'selected' : ''}`}
                onClick={() => setGender('male')}
                aria-pressed={gender === 'male'}
              >
                <span className="scan-gender-icon scan-gender-icon-male">
                  <GenderIcon type="male" />
                </span>
                <strong>Male</strong>
              </button>

              <button
                type="button"
                className={`scan-gender-card ${gender === 'female' ? 'selected' : ''}`}
                onClick={() => setGender('female')}
                aria-pressed={gender === 'female'}
              >
                <span className="scan-gender-icon scan-gender-icon-female">
                  <GenderIcon type="female" />
                </span>
                <strong>Female</strong>
              </button>
            </div>
          </div>

          <label className={`scan-figma-checkbox ${isFirstTimer ? 'checked' : ''}`}>
            <input
              type="checkbox"
              checked={isFirstTimer}
              onChange={(e) => setIsFirstTimer(e.target.checked)}
            />
            <span className="scan-checkbox-box" aria-hidden="true"></span>
            <span>I am a first-timer</span>
          </label>

          <button
            type="button"
            className="scan-figma-submit"
            onClick={handleGenderSubmit}
            disabled={submittingGender || !gender}
          >
            {submittingGender ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </ScanFormShell>
    );
  }

  if (!ScanFormShell && showGenderForm && programData) {
    return (
      <div className="scan-page">
        <div className="scan-container">
          <div className="form-header scan-form-hero">
            <div className="scan-hero-badge">Check-in recorded</div>
            <h1>{programData.churchName}</h1>
            <h2>{programData.title}</h2>
            <p>Please provide a few quick details to complete your check-in.</p>
          </div>

          <div className="gender-form scan-form-card" style={{
            background: 'rgba(235, 235, 211, 0.05)',
            padding: '30px',
            borderRadius: '16px',
            marginTop: '20px'
          }}>
            <div className="form-group">
              <label className="scan-field-heading" style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                marginBottom: '15px',
                display: 'block',
                color: 'var(--color-beige)'
              }}>
                Select Your Gender *
              </label>

              <div className="scan-choice-grid" style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
                <label className={`scan-choice-card male-choice ${gender === 'male' ? 'selected' : ''}`} style={{
                  flex: 1,
                  padding: '20px',
                  background: gender === 'male' ? 'var(--gradient-primary)' : 'rgba(235, 235, 211, 0.1)',
                  border: `2px solid ${gender === 'male' ? 'var(--color-pumpkin)' : 'rgba(235, 235, 211, 0.2)'}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  textAlign: 'center',
                  fontWeight: '600',
                  fontSize: '1rem',
                  color: gender === 'male' ? 'var(--color-beige)' : 'rgba(235, 235, 211, 0.7)'
                }}>
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={gender === 'male'}
                    onChange={(e) => setGender(e.target.value)}
                    style={{ display: 'none' }}
                  />
                  👨 Male
                </label>

                <label className={`scan-choice-card female-choice ${gender === 'female' ? 'selected' : ''}`} style={{
                  flex: 1,
                  padding: '20px',
                  background: gender === 'female' ? 'var(--gradient-primary)' : 'rgba(235, 235, 211, 0.1)',
                  border: `2px solid ${gender === 'female' ? 'var(--color-pumpkin)' : 'rgba(235, 235, 211, 0.2)'}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  textAlign: 'center',
                  fontWeight: '600',
                  fontSize: '1rem',
                  color: gender === 'female' ? 'var(--color-beige)' : 'rgba(235, 235, 211, 0.7)'
                }}>
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={gender === 'female'}
                    onChange={(e) => setGender(e.target.value)}
                    style={{ display: 'none' }}
                  />
                  👩 Female
                </label>
              </div>
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label scan-checkbox-card" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '15px',
                background: 'rgba(235, 235, 211, 0.05)',
                borderRadius: '12px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={isFirstTimer}
                  onChange={(e) => setIsFirstTimer(e.target.checked)}
                  style={{
                    width: '24px',
                    height: '24px',
                    accentColor: 'var(--color-pumpkin)',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '1rem', fontWeight: '500' }}>
                  ⭐ I am a first-timer
                </span>
              </label>
            </div>

            <button
              className="btn btn-primary btn-full"
              onClick={handleGenderSubmit}
              disabled={submittingGender || !gender}
              style={{ marginTop: '25px' }}
            >
              {submittingGender ? 'Submitting...' : 'Submit'}
            </button>


          </div>
        </div>
      </div>
    );



  }

  if (showProxyPrompt && programData && !result) {
    const remaining = Math.max(0, 3 - proxyCount);

    return (
      <div className={feedbackPageClass}>
        <div className="scan-container">
          <div className="modal-card scan-proxy-card">
            <div className="modal-card-topbar orange"></div>
            <div className="modal-card-body">
              <div className="modal-icon-circle">
                <svg viewBox="0 0 24 24"><path d="M16 11a4 4 0 10-8 0" /><path d="M4 20a6 6 0 0116 0" /><path d="M19 8v6" /><path d="M16 11h6" /></svg>
              </div>
              <p className="scan-proxy-eyebrow">Guest check-in</p>
              <h2>Scan for your fellow attendee?</h2>
              <p className="modal-subtitle">
                You can add up to {remaining} more {remaining === 1 ? 'attendee' : 'attendees'} from this device.
              </p>
              {proxyCount > 0 && (
                <span className="scan-proxy-progress">{proxyCount} of 3 guests added</span>
              )}
              <div className="scan-proxy-actions">
                <button type="button" className="scan-proxy-primary" onClick={startProxyForm}>
                  Yes, add attendee
                </button>
                <button type="button" className="scan-proxy-secondary" onClick={continueToPendingResult}>
                  No, continue
                </button>
              </div>
            </div>
          </div>
        </div>
        {flyerDetailsOverlay}
      </div>
    );
  }

  if (showProxyForm && programData && !result) {
    return (
      <ScanFormShell
        badge={`Guest ${proxyCount + 1} of 3`}
        programData={programData}
        helperText="Enter your fellow attendee's details to check them in."
        mode="collect"
      >
        <form className="scan-figma-form" onSubmit={handleProxySubmit}>
          <div className="scan-figma-fields">
            {programData.dataFields.fullName && (
              <ScanInputField
                label="Full Name *"
                type="text"
                id="proxyFullName"
                name="fullName"
                value={proxyFormData.fullName}
                onChange={handleProxyChange}
                placeholder="John Doe"
                error={proxyFormErrors.fullName}
              />
            )}

            {programData.dataFields.phoneNumber && (
              <ScanInputField
                label="Phone Number *"
                type="tel"
                id="proxyPhoneNumber"
                name="phoneNumber"
                value={proxyFormData.phoneNumber}
                onChange={handleProxyChange}
                placeholder="+234 800 000 0000"
                error={proxyFormErrors.phoneNumber}
              />
            )}

            {programData.dataFields.address && (
              <ScanInputField
                label="Address *"
                type="text"
                id="proxyAddress"
                name="address"
                value={proxyFormData.address}
                onChange={handleProxyChange}
                placeholder="Address"
                error={proxyFormErrors.address}
              />
            )}

            {programData.dataFields.department && (
              <ScanInputField
                label="Department *"
                type="text"
                id="proxyDepartment"
                name="department"
                value={proxyFormData.department}
                onChange={handleProxyChange}
                placeholder="e.g., Product, Marketing, Community"
                error={proxyFormErrors.department}
              />
            )}

            {programData.dataFields.fellowship && (
              <ScanInputField
                label="Group"
                type="text"
                id="proxyFellowship"
                name="fellowship"
                value={proxyFormData.fellowship}
                onChange={handleProxyChange}
                placeholder="Group or community"
              />
            )}

            {programData.dataFields.age && (
              <ScanInputField
                label="Age"
                type="number"
                id="proxyAge"
                name="age"
                value={proxyFormData.age}
                onChange={handleProxyChange}
                placeholder="25"
                min="1"
                max="120"
              />
            )}

            {programData.dataFields.sex && (
              <ScanSelectField
                label="Gender *"
                id="proxySex"
                name="sex"
                value={proxyFormData.sex}
                onChange={handleProxyChange}
                error={proxyFormErrors.sex}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </ScanSelectField>
            )}

            {programData.dataFields.firstTimer && (
              <label className={`scan-figma-checkbox ${proxyFormData.firstTimer ? 'checked' : ''}`}>
                <input
                  type="checkbox"
                  name="firstTimer"
                  checked={proxyFormData.firstTimer}
                  onChange={handleProxyChange}
                />
                <span className="scan-checkbox-box" aria-hidden="true"></span>
                <span>This attendee is a first-timer</span>
              </label>
            )}
          </div>

          <button type="submit" className="scan-figma-submit" disabled={submittingProxy}>
            {submittingProxy ? 'Adding attendee...' : 'Add attendee'}
          </button>
        </form>
      </ScanFormShell>
    );
  }

  // SHOW FORM
  if (showForm && programData && !result) {
    return (
      <ScanFormShell
        badge="Welcome"
        programData={programData}
        helperText={programData.giftingEnabled
          ? template.scan.giftHelper
          : 'Fill in your details to complete your check-in.'}
        mode="collect"
      >
        <form className="scan-figma-form" onSubmit={handleSubmit}>
          <div className="scan-figma-fields">
            {programData.dataFields.fullName && (
              <ScanInputField
                label="Full Name *"
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="John Doe"
                error={formErrors.fullName}
              />
            )}

            {programData.dataFields.phoneNumber && (
              <ScanInputField
                label="Phone Number *"
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="+234 800 000 0000"
                error={formErrors.phoneNumber}
              />
            )}

            {programData.dataFields.address && (
              <ScanInputField
                label="Address *"
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Your address"
                error={formErrors.address}
              />
            )}

            {programData.dataFields.department && (
              <ScanInputField
                label="Department *"
                type="text"
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="e.g., Product, Marketing, Community"
                error={formErrors.department}
              />
            )}

            {programData.dataFields.fellowship && (
              <ScanInputField
                label="Group"
                type="text"
                id="fellowship"
                name="fellowship"
                value={formData.fellowship}
                onChange={handleChange}
                placeholder="Your group or community"
              />
            )}

            {programData.dataFields.age && (
              <ScanInputField
                label="Age"
                type="number"
                id="age"
                name="age"
                value={formData.age}
                onChange={handleChange}
                placeholder="25"
                min="1"
                max="120"
              />
            )}

            {programData.dataFields.sex && (
              <ScanSelectField
                label="Gender *"
                id="sex"
                name="sex"
                value={formData.sex}
                onChange={handleChange}
                error={formErrors.sex}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </ScanSelectField>
            )}

            {programData.dataFields.firstTimer && (
              <label className={`scan-figma-checkbox ${formData.firstTimer ? 'checked' : ''}`}>
                <input
                  type="checkbox"
                  name="firstTimer"
                  checked={formData.firstTimer}
                  onChange={handleChange}
                />
                <span className="scan-checkbox-box" aria-hidden="true"></span>
                <span>I am a first-timer</span>
              </label>
            )}
          </div>

          <button
            type="submit"
            className="scan-figma-submit"
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </ScanFormShell>
    );
  }

  if (!ScanFormShell && showForm && programData && !result) {
    return (
      <div className="scan-page">
        <div className="scan-container">
          <div className="form-header scan-form-hero">
            <div className="scan-hero-badge">Welcome</div>
            <h1>{programData.churchName}</h1>
            <h2>{programData.title}</h2>
            {programData.giftingEnabled && (
              <div className="incentive-banner">
                Fill this form for a chance to win a special gift from the organizer!
              </div>
            )}
          </div>

          <form className="attendee-form" onSubmit={handleSubmit}>
            {programData.dataFields.fullName && (
              <div className="form-group">
                <label htmlFor="fullName">Full Name *</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="John Doe"
                />
                {formErrors.fullName && <span className="error">{formErrors.fullName}</span>}
              </div>
            )}

            {programData.dataFields.phoneNumber && (
              <div className="form-group">
                <label htmlFor="phoneNumber">Phone Number *</label>
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="+234 800 000 0000"
                />
                {formErrors.phoneNumber && <span className="error">{formErrors.phoneNumber}</span>}
              </div>
            )}

            {programData.dataFields.address && (
              <div className="form-group">
                <label htmlFor="address">Address *</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Your address"
                />
                {formErrors.address && <span className="error">{formErrors.address}</span>}
              </div>
            )}

            {programData.dataFields.department && (
              <div className="form-group">
                <label htmlFor="department">Department *</label>
                <input
                  type="text"
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="e.g., Product, Marketing, Community"
                />
                {formErrors.department && <span className="error">{formErrors.department}</span>}
              </div>
            )}

            {programData.dataFields.fellowship && (
              <div className="form-group">
                <label htmlFor="fellowship">Group</label>
                <input
                  type="text"
                  id="fellowship"
                  name="fellowship"
                  value={formData.fellowship}
                  onChange={handleChange}
                  placeholder="Your group or community"
                />
              </div>
            )}

            {programData.dataFields.age && (
              <div className="form-group">
                <label htmlFor="age">Age</label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  placeholder="25"
                  min="1"
                  max="120"
                />
              </div>
            )}

            {programData.dataFields.sex && (
              <div className="form-group">
                <label htmlFor="sex">Gender *</label>
                <select
                  id="sex"
                  name="sex"
                  value={formData.sex}
                  onChange={handleChange}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                {formErrors.sex && <span className="error">{formErrors.sex}</span>}
              </div>
            )}

            {programData.dataFields.firstTimer && (
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="firstTimer"
                    checked={formData.firstTimer}
                    onChange={handleChange}
                  />
                  <span>I am a first-timer</span>
                </label>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // RESULT SCREENS
  if (result === 'winner') {
    return (
      <div className={feedbackPageClass}>
        <div className="scan-container">
          <div className="modal-card">
            <WinnerConfetti />
            <div className="modal-card-topbar green"></div>
            <div className="modal-card-body">
              <div className="modal-icon-circle dark">
                <GiftBoxIcon />
              </div>
              <h2>Congratulations !</h2>
              <p className="modal-subtitle">You have been selected to receive a gift from the organizer. Thank you for joining us today.</p>
              <div className="modal-callout-action">
                <svg className="callout-diamond" viewBox="0 0 20 20"><rect x="5" y="5" width="10" height="10" rx="2" transform="rotate(45 10 10)" /></svg>
                <span className="callout-text">Please proceed to the ushering stand to collect your gift.</span>
                <GiftBoxIcon className="callout-gift-icon" />
              </div>
              {successActions}
            </div>
          </div>
          {flyerDetailsOverlay}
        </div>
      </div>
    );
  }

  if (result === 'no-win') {
    return (
      <div className={feedbackPageClass}>
        <div className="scan-container">
          <div className="modal-card">
            <div className="modal-card-topbar orange"></div>
            <div className="modal-card-body">
              <div className="modal-decorative-dots">
                <span className="dot dot-1"></span>
                <span className="dot dot-2"></span>
                <span className="dot dot-3"></span>
                <span className="dot dot-4"></span>
                <span className="dot dot-5"></span>
                <span className="dot dot-6"></span>
                <span className="dot dot-7"></span>
                <div className="dot-icon-circle">
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /><polyline points="16 6 9 13" /></svg>
                </div>
              </div>
              <h2>Thank You!</h2>
              <p className="modal-subtitle">Your Information has been submitted successfully</p>
              <div className="modal-callout">
                <svg className="callout-diamond" viewBox="0 0 20 20"><rect x="5" y="5" width="10" height="10" rx="2" transform="rotate(45 10 10)" /></svg>
                <span className="callout-text">{template.scan.noWin}</span>
              </div>
              {successActions}
            </div>
          </div>
          {flyerDetailsOverlay}
        </div>
      </div>
    );
  }

  // FIRST-TIMER WINNER (Gifting Enabled + First Timer + Winner)
  if (result === 'first-timer-winner') {
    return (
      <div className={feedbackPageClass}>
        <div className="scan-container">
          <div className="modal-card">
            <WinnerConfetti />
            <div className="modal-card-topbar green"></div>
            <div className="modal-card-body">
              <div className="modal-icon-circle dark">
                <GiftBoxIcon />
              </div>
              <h2>Welcome &amp; Congratulations !</h2>
              <p className="modal-subtitle">Welcome first-timer! You have been selected to receive a gift from the organizer.</p>
              <div className="modal-callout-action">
                <svg className="callout-diamond" viewBox="0 0 20 20"><rect x="5" y="5" width="10" height="10" rx="2" transform="rotate(45 10 10)" /></svg>
                <span className="callout-text">Please wait after the event. We look forward to connecting with you.</span>
                <GiftBoxIcon className="callout-gift-icon" />
              </div>
              {successActions}
            </div>
          </div>
          {flyerDetailsOverlay}
        </div>
      </div>
    );
  }

  // FIRST-TIMER MESSAGE (Count-Only or Collect-Data without winning)
  if (result === 'first-timer-message') {
    return (
      <div className={feedbackPageClass}>
        <div className="scan-container">
          <div className="modal-card">
            <div className="modal-card-topbar orange"></div>
            <div className="modal-card-body">
              <div className="modal-decorative-dots">
                <span className="dot dot-1"></span>
                <span className="dot dot-2"></span>
                <span className="dot dot-3"></span>
                <span className="dot dot-4"></span>
                <span className="dot dot-5"></span>
                <span className="dot dot-6"></span>
                <span className="dot dot-7"></span>
                <div className="dot-icon-circle">
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /><polyline points="16 6 9 13" /></svg>
                </div>
              </div>
              <h2>Welcome First-Timer</h2>
              <p className="modal-subtitle">Thank you for joining us today we look forward to connecting with you.</p>
              <div className="modal-callout">
                <svg className="callout-diamond" viewBox="0 0 20 20"><rect x="5" y="5" width="10" height="10" rx="2" transform="rotate(45 10 10)" /></svg>
                <span className="callout-text">Please wait after the event so the team can connect with you.</span>
              </div>
              {successActions}
            </div>
          </div>
          {flyerDetailsOverlay}
        </div>
      </div>
    );
  }

  // COUNT-ONLY SUCCESS
  if (result === 'count-only-success') {
    return (
      <div className={feedbackPageClass}>
        <div className="scan-container">
          <div className="modal-card">
            <div className="modal-card-topbar orange"></div>
            <div className="modal-card-body">
              <div className="modal-decorative-dots">
                <span className="dot dot-1"></span>
                <span className="dot dot-2"></span>
                <span className="dot dot-3"></span>
                <span className="dot dot-4"></span>
                <span className="dot dot-5"></span>
                <span className="dot dot-6"></span>
                <span className="dot dot-7"></span>
                <div className="dot-icon-circle">
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /><polyline points="16 6 9 13" /></svg>
                </div>
              </div>
              <h2>Thank You!</h2>
              <p className="modal-subtitle">{template.scan.success}</p>
              {successActions}
            </div>
          </div>
          {flyerDetailsOverlay}
        </div>
      </div>
    );
  }

  // NO-GIFTING SUCCESS (Collect Data mode without gifting)
  if (result === 'no-gifting') {
    return (
      <div className={feedbackPageClass}>
        <div className="scan-container">
          <div className="message-card success">
            <div className="message-icon">✅</div>
            <h2>Thank You!</h2>
            <p>Your information has been submitted successfully.</p>
            <p className="sub-message">Thank you for joining us today. Enjoy the rest of the event!</p>
            {successActions}
          </div>
          {flyerDetailsOverlay}
        </div>
      </div>
    );
  }

  return (
    <div className={feedbackPageClass}>
      <div className="scan-container">
        <div className="modal-card">
          <div className="modal-card-topbar red"></div>
          <div className="modal-card-body">
            <div className="modal-closed-icon">
              <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </div>
            <h2>{template.scan.closedTitle}</h2>
            <p className="modal-subtitle">{template.scan.closedBody}</p>
          </div>
        </div>
      </div>
    </div>
  );


}

export default ScanPage;
