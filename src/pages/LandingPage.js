import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SignupIntentModal from '../components/SignupIntentModal';
import { getDiscoverPreEvents } from '../api/preEventService';
import '../styles/IgLanding.css';

const INVITE_ONLY_MODE = process.env.REACT_APP_INVITE_ONLY_MODE !== 'false';

const Check = ({ size = 14, width = 2.6, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

const segments = [
  { id: 'tech', img: '/landing/seg-tech.jpg', pos: 'center 30%', alt: 'Young professionals smiling together at a tech meetup', label: 'Tech Meetups', title: 'Know who actually showed up', text: 'Compare RSVPs with real check-ins and see how many first-timers came through the door.' },
  { id: 'conf', img: '/landing/seg-conf.jpg', pos: 'center 40%', alt: 'A packed conference hall with a panel on stage and large screens', label: 'Conferences', title: 'Move hundreds through registration', text: 'Ushers scan personal passes from their phones while walk-ins check themselves in.' },
  { id: 'church', img: '/landing/seg-church.jpg', pos: 'center 30%', alt: 'Women worshipping with raised hands during a church service', label: 'Churches', title: 'Count every service without a register', text: 'Members and first-timers scan in at the door, and your team sees the numbers live.' },
  { id: 'boot', img: '/landing/seg-boot.jpg', pos: 'center 35%', alt: 'Young developers working on laptops at a bootcamp session', label: 'Bootcamps', title: 'Track attendance session by session', text: 'Every session gets its own check-in, with clean records you can export.' },
  { id: 'corp', img: '/landing/seg-corp.jpg', pos: 'center 45%', alt: 'Delegates seated in a large hall at a corporate summit', label: 'Corporate Events', title: 'Keep a clean record of every company event', text: 'Collect the details your team needs, then download the attendance report.' },
  { id: 'comm', img: '/landing/seg-comm.jpg', pos: 'center 35%', alt: 'Community members with hands raised at an evening gathering', label: 'Communities', title: 'Welcome everyone by name', text: 'Personal welcome flyers and gift draws make every guest feel seen.' }
];

const faqs = [
  { q: 'Do guests need to download an app?', a: 'No. Guests scan the event QR code with their phone camera and check in on a web page.' },
  { q: 'Can I bring my existing guest list?', a: 'Yes. Import up to 5,000 guests from CSV or Excel and send each one a personal QR pass.' },
  { q: 'Does it work for hybrid events?', a: 'Yes. Your RSVP page can ask whether each guest is attending in person or online.' },
  ...(INVITE_ONLY_MODE
    ? [{ q: 'Why is Ingather invite-only?', a: "We're opening access in phases so every team has a smooth first event. Join the waitlist and we'll email your invite." }]
    : []),
  { q: 'How much does it cost?', a: 'Ingather is free to start.' }
];

const menuLinks = [
  ['top', 'Start Here'],
  ['features', 'Features'],
  ['how', 'How it Works'],
  ['discover', 'Discover'],
  ['faq', 'FAQs']
];

const prefersReducedMotion = () => (
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

const LIVE_COUNT = 642;

const formatEventDate = (value) => {
  if (!value) return 'Date coming soon';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date coming soon';
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const eventLocation = (event) => (
  [event.venueName, event.city].filter(Boolean).join(', ') || event.churchName || 'Ingather event'
);

function LandingPage() {
  const navigate = useNavigate();
  const [showSignupIntent, setShowSignupIntent] = useState(false);
  const [discoverEvents, setDiscoverEvents] = useState([]);
  const [discoverLoaded, setDiscoverLoaded] = useState(false);
  const [segId, setSegId] = useState('church');
  const [menuOpen, setMenuOpen] = useState(false);
  const [footerEmail, setFooterEmail] = useState('');
  const [liveCount, setLiveCount] = useState(LIVE_COUNT);
  const [thumb, setThumb] = useState(null);
  const [barsArmed, setBarsArmed] = useState(false);
  const [barsIn, setBarsIn] = useState(false);
  const tabsRef = useRef(null);
  const barsRef = useRef(null);

  // Hero card: count up to 642 once, on first load
  useLayoutEffect(() => {
    if (prefersReducedMotion() || typeof window.requestAnimationFrame !== 'function') return undefined;
    let frame;
    const start = window.performance.now();
    const duration = 900;
    setLiveCount(0);
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setLiveCount(Math.round(LIVE_COUNT * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // Event-type tabs: slide the white card and orange bar to the chosen tab
  useLayoutEffect(() => {
    const list = tabsRef.current;
    if (!list) return undefined;
    const measure = () => {
      const button = list.querySelector('[aria-selected="true"]');
      if (!button) return;
      setThumb({
        left: button.offsetLeft,
        top: button.offsetTop,
        width: button.offsetWidth,
        height: button.offsetHeight
      });
    };
    measure();
    if (typeof window.ResizeObserver !== 'function') return undefined;
    const observer = new window.ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [segId]);

  // Arrivals chart: bars grow once when scrolled into view
  useEffect(() => {
    const node = barsRef.current;
    if (!node || prefersReducedMotion() || typeof window.IntersectionObserver !== 'function') return undefined;
    setBarsArmed(true);
    const observer = new window.IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setBarsIn(true);
        observer.disconnect();
      }
    }, { threshold: 0.4 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let mounted = true;
    getDiscoverPreEvents({ limit: 3 })
      .then((response) => {
        if (mounted) setDiscoverEvents((response.preEvents || []).slice(0, 3));
      })
      .catch(() => {
        if (mounted) setDiscoverEvents([]);
      })
      .finally(() => {
        if (mounted) setDiscoverLoaded(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Support links like /#features coming from other pages
  useEffect(() => {
    const id = window.location.hash.replace('#', '');
    if (!id) return undefined;
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const openSignupIntent = () => {
    setMenuOpen(false);
    if (INVITE_ONLY_MODE) {
      navigate('/waitlist');
      return;
    }
    setShowSignupIntent(true);
  };

  const handleSignupIntentSelect = (intent) => {
    navigate(`/register?type=${intent}`);
  };

  const scrollTo = (id) => (event) => {
    if (event) event.preventDefault();
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleFooterSubmit = (event) => {
    event.preventDefault();
    navigate('/waitlist', { state: { email: footerEmail.trim() } });
  };

  const primaryLabel = INVITE_ONLY_MODE ? 'Join the Waitlist' : 'Get Started Free';
  const navCtaLabel = INVITE_ONLY_MODE ? 'Join Waitlist' : 'Start Free';
  const seg = segments.find((item) => item.id === segId) || segments[2];

  return (
    <div className="ig-lp">
      <div className="ig-lp-frame">
        <div className="ig-lp-col">

          {/* NAV */}
          <div className="ig-lp-navwrap">
            <nav className="ig-lp-nav" aria-label="Main">
              <a href="#top" onClick={scrollTo('top')} className="ig-lp-brand" aria-label="Ingather home">
                <img src="/ingather-logo.png" alt="Ingather" />
              </a>
              <div className="ig-lp-navlinks">
                <a href="#top" onClick={scrollTo('top')} className="is-current">Start Here<span aria-hidden="true" /></a>
                <a href="#features" onClick={scrollTo('features')}>Features</a>
                <a href="#how" onClick={scrollTo('how')}>How it Works</a>
                <a href="#discover" onClick={scrollTo('discover')}>Discover</a>
                <a href="#faq" onClick={scrollTo('faq')}>FAQs</a>
                <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Log in</a>
              </div>
              <button type="button" className="ig-lp-navcta" onClick={openSignupIntent}>{navCtaLabel}</button>
              <button
                type="button"
                className="ig-lp-burger"
                onClick={() => setMenuOpen((open) => !open)}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
              >
                <span className="ig-lp-burger-icon" key={menuOpen ? 'x' : 'bars'}>
                  {menuOpen ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
                  )}
                </span>
              </button>
            </nav>
            {menuOpen && (
              <>
                <div className="ig-lp-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                <div className="ig-lp-menu">
                  <nav aria-label="Menu">
                    {menuLinks.map(([id, label], index) => (
                      <a key={id} href={`#${id}`} onClick={scrollTo(id)} className={index === 0 ? 'is-current' : ''}>
                        {label}
                        {index === 0 && <span aria-hidden="true" />}
                      </a>
                    ))}
                  </nav>
                  <div className="ig-lp-menu-rule" />
                  <div className="ig-lp-menu-ctas">
                    <button type="button" className="ig-lp-menu-primary" onClick={openSignupIntent}>{navCtaLabel}</button>
                    <button type="button" className="ig-lp-menu-secondary" onClick={() => navigate('/login')}>Log in</button>
                  </div>
                </div>
              </>
            )}
          </div>

          <main>
            {/* HERO */}
            <section id="top" className="ig-lp-hero">
              <a href="#how" onClick={scrollTo('how')} className="ig-lp-pill">
                <span className="ig-lp-pill-tag">New</span>
                <span>Send every guest a personal <u>QR pass</u></span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
              </a>
              <h1>A guest arrival system that works like your best <span className="ig-lp-mark">Usher</span></h1>
              <p className="ig-lp-lead">Great events deserve a system that does it all, from RSVP pages and QR check-ins to live attendance and reports you can act on.</p>
              <div className="ig-lp-hero-ctas">
                <button type="button" className="ig-lp-btn-primary" onClick={openSignupIntent}>{primaryLabel}</button>
                <a href="#discover" onClick={scrollTo('discover')} className="ig-lp-btn-explore">
                  <span className="ig-lp-btn-explore-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
                  </span>
                  Explore Events
                </a>
              </div>
              <div className="ig-lp-hero-media">
                <img
                  src="/landing/hero.jpg"
                  alt="An usher holds up an Ingather QR pass while a guest scans it with the Ingather scanner at the Lagos Festival entrance"
                  fetchPriority="high"
                />
                <div className="ig-lp-shade" aria-hidden="true" />
                <div className="ig-lp-hero-fade" aria-hidden="true" />
                <div className="ig-lp-livecard" aria-hidden="true">
                  <div className="ig-lp-livecard-top"><span>Live check-ins</span><span className="ig-lp-dot is-pulse" /></div>
                  <div className="ig-lp-livecard-num"><span>{liveCount}</span><span>guests in</span></div>
                  <div className="ig-lp-livecard-bar"><div /></div>
                  <div className="ig-lp-livecard-row"><span>First-timers</span><strong>118</strong></div>
                </div>
                <div className="ig-lp-hero-toast" aria-hidden="true">
                  <span className="ig-lp-hero-toast-icon"><Check /></span>
                  <span><strong>Adaeze Okafor</strong> checked in, 9:42</span>
                </div>
              </div>
            </section>

            {/* SEGMENTS */}
            <section className="ig-lp-sec ig-lp-segments" aria-label="Who Ingather is for">
              <div role="tablist" aria-label="Event types" className={`ig-lp-segtabs${thumb ? ' has-thumb' : ''}`} ref={tabsRef}>
                {segments.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={item.id === segId}
                    className={item.id === segId ? 'is-on' : ''}
                    onClick={(e) => {
                      setSegId(item.id);
                      e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
                    }}
                  >
                    {item.label}
                    <span aria-hidden="true" />
                  </button>
                ))}
                {thumb && (
                  <span
                    className="ig-lp-segthumb"
                    aria-hidden="true"
                    style={{ transform: `translate(${thumb.left}px, ${thumb.top}px)`, width: thumb.width, height: thumb.height }}
                  >
                    <span />
                  </span>
                )}
              </div>
              <div className="ig-lp-segcard" role="tabpanel">
                <div className="ig-lp-segimg">
                  {segments.map((item) => (
                    <img
                      key={item.id}
                      src={item.img}
                      alt={item.id === segId ? item.alt : ''}
                      aria-hidden={item.id === segId ? undefined : 'true'}
                      className={item.id === segId ? 'is-on' : ''}
                      style={{ objectPosition: item.pos }}
                    />
                  ))}
                  <div className="ig-lp-shade" aria-hidden="true" />
                </div>
                <div className="ig-lp-segcopy" key={seg.id}>
                  <span className="ig-lp-chip">{seg.label}</span>
                  <h2>{seg.title}</h2>
                  <p>{seg.text}</p>
                </div>
              </div>
            </section>

            {/* BEFORE / AFTER */}
            <section id="features" className="ig-lp-sec ig-lp-center">
              <span className="ig-lp-eyebrow">Before and After</span>
              <h2 className="ig-lp-h2">Retire the Register at the Door</h2>
              <p className="ig-lp-sub">Paper sign-in sheets slow the queue, lose half the names and leave you counting by hand after everyone has gone home.</p>
              <div className="ig-lp-shell ig-lp-doors">
                <div className="ig-lp-door ig-lp-door-old">
                  <div className="ig-lp-door-head">
                    <span className="ig-lp-door-title">
                      <span className="ig-lp-door-badge is-old">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" /></svg>
                      </span>
                      The old door
                    </span>
                    <span className="ig-lp-door-meta">Page 4 of 11</span>
                  </div>
                  <div className="ig-lp-sheet" aria-hidden="true">
                    <div><span>31</span><span>Adaeze Okafor</span><span>8:52</span></div>
                    <div><span>32</span><span><s>Tunde</s> T. Bakare</span><span>8:55</span></div>
                    <div className="is-faint"><span>33</span><span>Em... Ch... (?)</span><span /></div>
                    <div><span>34</span><span /><span /></div>
                  </div>
                  <span className="ig-lp-door-total">Total: counted by hand on Monday.</span>
                </div>
                <div className="ig-lp-door ig-lp-door-new">
                  <div className="ig-lp-door-head">
                    <span className="ig-lp-door-title">
                      <span className="ig-lp-door-badge is-new"><Check width={3} /></span>
                      The Ingather door
                    </span>
                    <span className="ig-lp-livechip">Live</span>
                  </div>
                  <div className="ig-lp-list" aria-hidden="true">
                    {[
                      ['Adaeze Okafor', 'RSVP, 8:52'],
                      ['Tunde Bakare', 'Walk-in, 8:55'],
                      ['Emeka Chukwu', 'First-timer, 9:01'],
                      ['Ifeoma Nwosu +2', 'Group, 9:03']
                    ].map(([name, meta]) => (
                      <div key={name}>
                        <span className="ig-lp-tick"><Check size={11} width={3} color="#FFFFFF" /></span>
                        <strong>{name}</strong>
                        <span>{meta}</span>
                      </div>
                    ))}
                  </div>
                  <span className="ig-lp-door-total is-new">Total: <strong>642, counted as they walked in.</strong></span>
                </div>
              </div>
            </section>

            {/* HOW IT WORKS */}
            <section id="how" className="ig-lp-sec ig-lp-center">
              <span className="ig-lp-eyebrow">How it Works</span>
              <h2 className="ig-lp-h2">From a Shared Link to a Warm Welcome</h2>
              <p className="ig-lp-sub ig-lp-sub-narrow">What every guest goes through on Ingather. Four steps, all on their own phone.</p>
              <div className="ig-lp-journey">
                <div className="ig-lp-journey-line" aria-hidden="true" />
                <div className="ig-lp-journey-grid">
                  <div className="ig-lp-step">
                    <span className="ig-lp-stepnum">1</span>
                    <div className="ig-lp-stepcard ig-lp-rsvpmock" aria-hidden="true">
                      <span className="ig-lp-url">ingather.app/rsvp/lagos-builders</span>
                      <span className="ig-lp-field" />
                      <span className="ig-lp-field" />
                      <span className="ig-lp-choice"><span className="is-on">In person</span><span>Online</span></span>
                      <span className="ig-lp-mockbtn">Secure my spot</span>
                    </div>
                    <span className="ig-lp-stepcopy"><strong>RSVP in seconds</strong><span>A branded page with your questions, shared anywhere or listed on Discover.</span></span>
                  </div>

                  <div className="ig-lp-step">
                    <span className="ig-lp-stepnum">2</span>
                    <div className="ig-lp-stepcard ig-lp-passmock" aria-hidden="true">
                      <div className="ig-lp-pass">
                        <span className="ig-lp-pass-label">YOUR PASS</span>
                        <svg width="86" height="86" viewBox="-1 -1 23 23" shapeRendering="crispEdges"><path fill="#111111" d="M0 0h7v7h-7zM14 0h7v7h-7zM0 14h7v7h-7zM8 0h5v1h-5zM10 4h3v1h-3zM8 8h1v1h-1zM10 8h5v1h-5zM0 9h5v1h-5zM5 10h3v1h-3zM9 11h3v1h-3zM13 11h2v1h-2zM16 9h2v1h-2zM14 14h1v1h-1zM18 13h3v1h-3zM15 15h3v1h-3zM8 17h5v1h-5zM16 17h5v1h-5zM9 19h7v1h-7zM8 20h8v1h-8z" /><path fill="#FFFFFF" d="M1 1h5v5h-5zM15 1h5v5h-5zM1 15h5v5h-5z" /><path fill="#111111" d="M2 2h3v3h-3zM16 2h3v3h-3zM2 16h3v3h-3z" /></svg>
                        <span className="ig-lp-pass-code">A7K9Q2M4</span>
                      </div>
                    </div>
                    <span className="ig-lp-stepcopy"><strong>A pass in their inbox</strong><span>Every RSVP gets a personal QR pass by email. Import up to 5,000 guests at once.</span></span>
                  </div>

                  <div className="ig-lp-step">
                    <span className="ig-lp-stepnum is-filled">3</span>
                    <div className="ig-lp-stepcard ig-lp-scanmock">
                      <img src="/landing/scan.jpg" alt="A guest scanning the event QR code at the entrance" loading="lazy" />
                      <div className="ig-lp-shade is-light" aria-hidden="true" />
                      <span className="ig-lp-scantoast" aria-hidden="true">
                        <span className="ig-lp-tick is-big"><Check size={13} width={3} color="#FFFFFF" /></span>
                        Checked in, 9:42
                      </span>
                    </div>
                    <span className="ig-lp-stepcopy"><strong>One scan at the gate</strong><span>Walk-ins scan the event QR. Ushers scan passes. No app, no queue at a table.</span></span>
                  </div>

                  <div className="ig-lp-step">
                    <span className="ig-lp-stepnum">4</span>
                    <div className="ig-lp-stepcard ig-lp-welcomemock" aria-hidden="true">
                      <span className="ig-lp-welcome-kicker">Welcome note</span>
                      <span className="ig-lp-welcome-text">Chiamaka, you are welcome and deeply valued.</span>
                      <span className="ig-lp-welcome-chip">You won a gift</span>
                    </div>
                    <span className="ig-lp-stepcopy"><strong>A welcome that feels personal</strong><span>Named welcome flyers, gift draws and your sponsors, right after the scan.</span></span>
                  </div>
                </div>
              </div>
            </section>

            {/* HEADCOUNT */}
            <section className="ig-lp-sec">
              <div className="ig-lp-board">
                <div className="ig-lp-board-left">
                  <span className="ig-lp-tag">Live Dashboard</span>
                  <h2 className="ig-lp-h2 is-left">Your Headcount, <span className="ig-lp-mark is-flat">Live</span></h2>
                  <p className="ig-lp-muted">Watch arrivals as they happen. Know when to start, how many chairs to add and who came for the first time.</p>
                  <div className="ig-lp-bignum-wrap" aria-hidden="true">
                    <span>Lagos Builders Summit, in the room now</span>
                    <span className="ig-lp-bignum">642</span>
                  </div>
                </div>
                <div className="ig-lp-board-right" aria-hidden="true">
                  <div className="ig-lp-stats">
                    <div className="is-hot"><span>RSVP fast-track</span><strong>391</strong></div>
                    <div><span>Walk-ins</span><strong>251</strong></div>
                    <div><span>First-timers</span><strong>118<small> new</small></strong></div>
                  </div>
                  <div className="ig-lp-chart">
                    <div className="ig-lp-chart-head"><span>Arrivals every 30 minutes</span><span className="ig-lp-updating"><span className="is-pulse" />Updating live</span></div>
                    <div className={`ig-lp-bars${barsArmed ? ' is-armed' : ''}${barsIn ? ' is-in' : ''}`} ref={barsRef}>
                      {[[12, '#FDE7D7'], [28, '#FAD4BB'], [58, '#F7B48A'], [100, '#E8590C'], [76, '#F47A35'], [40, '#F7B48A'], [18, '#FAD4BB']].map(([h, c], i) => (
                        <div key={i} style={{ height: `${h}%`, background: c, transitionDelay: `${i * 35}ms` }} />
                      ))}
                    </div>
                    <div className="ig-lp-chart-axis"><span>8:00</span><span>9:00</span><span>10:00</span><span>11:00</span></div>
                  </div>
                  <div className="ig-lp-reportbar">
                    <span><strong>When it ends, the report is ready</strong><span>Every attendee, their answers, gift winners and sponsor taps.</span></span>
                    <span className="ig-lp-exportchip">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
                      Export PDF
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* BENTO */}
            <section className="ig-lp-sec ig-lp-center">
              <span className="ig-lp-eyebrow">Event Day</span>
              <h2 className="ig-lp-h2 ig-lp-h2-narrow">Happier Guests, Better-Run Events</h2>
              <p className="ig-lp-sub">Use the screen every guest sees after scanning to welcome them, reward them, and bring sponsors along.</p>
              <div className="ig-lp-shell ig-lp-bento">
                <div className="ig-lp-gift">
                  <div className="ig-lp-giftimg">
                    <img src="/landing/gifting.jpg" alt="A small orange gift box tied with a satin bow" loading="lazy" />
                    <div className="ig-lp-gifttoast" aria-hidden="true">
                      <span><strong>Chiamaka Eze</strong> won a gift</span>
                      <span className="ig-lp-giftchip">Gifted</span>
                    </div>
                  </div>
                  <div className="ig-lp-giftcopy">
                    <h3>Gift Draws</h3>
                    <p>Set how many gifts you have. Winners are picked at random as guests check in, and you mark each gift as claimed.</p>
                  </div>
                </div>
                <div className="ig-lp-bento-right">
                  <div className="ig-lp-sponsor">
                    <div>
                      <h3>Sponsor Analytics</h3>
                      <p>Show sponsor flyers in rotation or by share of attendees, then see how many people tapped through.</p>
                    </div>
                    <div className="ig-lp-sponsorbars" aria-hidden="true">
                      {[[55, '#FAD4BB'], [85, '#E8590C'], [40, '#F7B48A'], [65, '#F47A35']].map(([h, c], i) => (
                        <div key={i} style={{ height: `${h}%`, background: c }} />
                      ))}
                    </div>
                  </div>
                  <div className="ig-lp-group">
                    <h3>Group Check-in</h3>
                    <span>Up to 3 guests<br />per phone</span>
                  </div>
                </div>
              </div>
            </section>

            {/* DISCOVER */}
            <section id="discover" className="ig-lp-sec ig-lp-center">
              <span className="ig-lp-eyebrow">Discover</span>
              <h2 className="ig-lp-h2">Gatherings Open for RSVP</h2>
              {discoverEvents.length > 0 ? (
                <div className="ig-lp-discover">
                  {discoverEvents.map((event) => (
                    <a
                      key={event.id}
                      href={`/rsvp/${event.slug}`}
                      onClick={(e) => { e.preventDefault(); navigate(`/rsvp/${event.slug}`); }}
                      className="ig-lp-event"
                    >
                      <span className="ig-lp-event-media">
                        {event.bannerUrl ? (
                          <img src={event.bannerUrl} alt={event.title} loading="lazy" />
                        ) : (
                          <span className="ig-lp-event-noimg" aria-hidden="true">RSVP</span>
                        )}
                      </span>
                      <span className="ig-lp-event-copy">
                        <span className="ig-lp-event-date">{formatEventDate(event.eventDate)}</span>
                        <span className="ig-lp-event-title">{event.title}</span>
                        <span className="ig-lp-event-place">{eventLocation(event)}</span>
                      </span>
                    </a>
                  ))}
                </div>
              ) : discoverLoaded ? (
                <div className="ig-lp-discover-empty">
                  <strong>Public events are warming up</strong>
                  <span>RSVP pages will appear here as organizers publish them.</span>
                </div>
              ) : (
                <div className="ig-lp-discover-loading" aria-hidden="true" />
              )}
              <button type="button" className="ig-lp-btn-dark" onClick={() => navigate('/discover')}>View All Events</button>
            </section>

            {/* FAQ */}
            <section id="faq" className="ig-lp-sec ig-lp-faq">
              <div className="ig-lp-faq-head">
                <span className="ig-lp-tag">FAQs</span>
                <h2 className="ig-lp-h2 is-left is-bold">Questions organizers ask</h2>
              </div>
              <div className="ig-lp-faq-list">
                {faqs.map((item, index) => (
                  <details key={item.q} open={index === 0}>
                    <summary>
                      {item.q}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                    </summary>
                    <p>{item.a}</p>
                  </details>
                ))}
              </div>
            </section>

            {/* FINAL CTA */}
            <section className="ig-lp-ctawrap">
              <div className="ig-lp-cta">
                <img src="/landing/cta.jpg" alt="" loading="lazy" />
                <div className="ig-lp-cta-glow" aria-hidden="true" />
                <h2>One Platform for Every Gathering</h2>
                <p>{INVITE_ONLY_MODE ? 'Join the waitlist and run your next event on Ingather.' : 'Create your workspace and run your next event on Ingather.'}</p>
                <button type="button" className="ig-lp-btn-white" onClick={openSignupIntent}>{primaryLabel}</button>
                <div className="ig-lp-cta-points">
                  <span><Check width={2.4} color="#F59A5F" />Free to start</span>
                  <span><Check width={2.4} color="#F59A5F" />No app for guests</span>
                </div>
              </div>
            </section>
          </main>

          {/* FOOTER */}
          <footer className="ig-lp-foot">
            <img className="ig-lp-foot-mark" src="/ingather-logo.png" alt="" aria-hidden="true" />
            <div className="ig-lp-foot-top">
              <div className="ig-lp-foot-about">
                <img src="/ingather-logo.png" alt="Ingather" />
                <p>Ingather helps organizers run RSVPs, QR check-ins and live attendance for every kind of gathering.</p>
              </div>
              {INVITE_ONLY_MODE && (
                <form className="ig-lp-foot-form" onSubmit={handleFooterSubmit}>
                  <label htmlFor="footer-email">Get your invite</label>
                  <div className="ig-lp-foot-field">
                    <input
                      id="footer-email"
                      type="email"
                      placeholder="Enter your email"
                      autoComplete="email"
                      value={footerEmail}
                      onChange={(e) => setFooterEmail(e.target.value)}
                    />
                    <button type="submit">Join Waitlist</button>
                  </div>
                </form>
              )}
            </div>
            <div className="ig-lp-foot-cols">
              <div>
                <span>Product</span>
                <a href="#features" onClick={scrollTo('features')}>Features</a>
                <a href="#how" onClick={scrollTo('how')}>How it Works</a>
                <a href="#faq" onClick={scrollTo('faq')}>FAQs</a>
              </div>
              <div>
                <span>Events</span>
                <a href="/discover" onClick={(e) => { e.preventDefault(); navigate('/discover'); }}>Discover</a>
                <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Log in</a>
                <a href="/waitlist" onClick={(e) => { e.preventDefault(); openSignupIntent(); }}>{navCtaLabel}</a>
              </div>
              <div>
                <span>Built For</span>
                <em>Tech Meetups</em>
                <em>Conferences</em>
                <em>Churches</em>
              </div>
            </div>
            <div className="ig-lp-foot-base">
              <span>&copy; 2026 Ingather. All rights reserved.</span>
              <span className="ig-lp-foot-legal">
                <a href="/privacy" onClick={(e) => { e.preventDefault(); navigate('/privacy'); }}>Privacy</a>
                <a href="/terms" onClick={(e) => { e.preventDefault(); navigate('/terms'); }}>Terms</a>
                <a href="/contact" onClick={(e) => { e.preventDefault(); navigate('/contact'); }}>Contact</a>
                <span>Made in Nigeria</span>
              </span>
            </div>
          </footer>
        </div>
      </div>

      {showSignupIntent && (
        <SignupIntentModal
          onClose={() => setShowSignupIntent(false)}
          onSelect={handleSignupIntentSelect}
        />
      )}
    </div>
  );
}

export default LandingPage;
