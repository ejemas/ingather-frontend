import React from 'react';
import '../styles/LandingPage.css';

const Icon = {
  qr: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm11 1h2v2h-2v-2Zm3 3h2v2h-2v-2Zm-4 0h2v2h-2v-2Zm4-4h2v2h-2v-2Z" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 19V5h2v12h14v2H4Zm4-4V9h3v6H8Zm5 0V6h3v9h-3Zm5 0v-4h3v4h-3Z" />
    </svg>
  ),
  form: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h9l4 4v14H6V3Zm8 1.8V8h3.2L14 4.8ZM8 11h8v2H8v-2Zm0 4h8v2H8v-2Z" />
    </svg>
  ),
  gift: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 10h14v10H5V10Zm1-5c1.7-1.7 4.3-.8 6 2 1.7-2.8 4.3-3.7 6-2 1.6 1.6.6 4.2-2 5h4v4h-2v-2h-5v8h-2v-8H6v2H4v-4h4C5.4 9.2 4.4 6.6 6 5Zm1.4 1.4c-.5.5-.1 1.6 2.9 1.6-.9-1.6-2.1-2.4-2.9-1.6Zm9.2 0c-.8-.8-2 .1-2.9 1.6 3 0 3.4-1.1 2.9-1.6Z" />
    </svg>
  ),
  report: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 3h14v18H5V3Zm3 4v2h8V7H8Zm0 4v2h8v-2H8Zm0 4v2h5v-2H8Z" />
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M11.2 4.4 16.8 10l-5.6 5.6-1.4-1.4 3.2-3.2H3V9h10l-3.2-3.2 1.4-1.4Z" />
    </svg>
  )
};

const features = [
  {
    icon: Icon.qr,
    title: 'QR check-in',
    text: 'Generate a clean check-in link for every program and let people scan in from any phone.'
  },
  {
    icon: Icon.chart,
    title: 'Live attendance',
    text: 'Watch attendance, gender, first-timer, and arrival patterns update while service is running.'
  },
  {
    icon: Icon.form,
    title: 'Visitor forms',
    text: 'Collect only the fields you need, from names and phone numbers to fellowship and department.'
  },
  {
    icon: Icon.gift,
    title: 'Gifting moments',
    text: 'Run simple winner selection for events where you want visitors to engage and feel seen.'
  },
  {
    icon: Icon.report,
    title: 'Reports ready',
    text: 'Keep event records organized and export attendance details when your team needs them.'
  }
];

const steps = [
  ['Create', 'Add the program name, date, time, tracking mode, and optional event flyer.'],
  ['Share', 'Display the generated QR code at the entrance, on screen, or in a service group.'],
  ['Track', 'Follow scans, forms, and gifting status from a dashboard built for church teams.']
];

function LandingPage() {
  const goTo = (path) => {
    window.location.href = path;
  };

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="lp-page">
      <nav className="lp-nav" aria-label="Primary navigation">
        <div className="lp-container lp-nav-inner">
          <a className="lp-brand" href="/" aria-label="Ingather home">
            <img src="/ingather-logo.png" alt="" />
            <span>Ingather</span>
          </a>
          <div className="lp-nav-links">
            <button type="button" onClick={() => scrollTo('features')}>Features</button>
            <button type="button" onClick={() => scrollTo('how-it-works')}>How it works</button>
            <button type="button" onClick={() => scrollTo('pricing')}>Pricing</button>
          </div>
          <div className="lp-nav-actions">
            <button type="button" className="lp-btn lp-btn-ghost" onClick={() => goTo('/login')}>
              Login
            </button>
            <button type="button" className="lp-btn lp-btn-primary" onClick={() => goTo('/register')}>
              Start free
            </button>
          </div>
        </div>
      </nav>

      <main>
        <section className="lp-hero">
          <picture>
            <source srcSet="/ingather-landing-hero.avif" type="image/avif" />
            <source srcSet="/ingather-landing-hero.webp" type="image/webp" />
            <img className="lp-hero-bg" src="/ingather-landing-hero.png" alt="" />
          </picture>
          <div className="lp-hero-overlay"></div>
          <div className="lp-container lp-hero-content">
            <p className="lp-kicker">Church attendance, finally effortless</p>
            <h1>Ingather</h1>
            <p className="lp-hero-lead">
              Modern QR attendance tracking for churches that want accurate counts,
              visitor insight, and live event reports without paper lists.
            </p>
            <div className="lp-hero-actions">
              <button type="button" className="lp-btn lp-btn-primary lp-btn-large" onClick={() => goTo('/register')}>
                Create your first program
                <span className="lp-btn-icon">{Icon.arrow}</span>
              </button>
              <button type="button" className="lp-btn lp-btn-glass lp-btn-large" onClick={() => scrollTo('how-it-works')}>
                See the workflow
              </button>
            </div>
            <div className="lp-hero-metrics" aria-label="Ingather highlights">
              <div>
                <strong>2 min</strong>
                <span>event setup</span>
              </div>
              <div>
                <strong>Live</strong>
                <span>scan updates</span>
              </div>
              <div>
                <strong>Free</strong>
                <span>to start</span>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="lp-section lp-features">
          <div className="lp-container">
            <div className="lp-section-heading">
              <p className="lp-eyebrow">Built for Sunday flow</p>
              <h2>Everything your team needs before, during, and after a program.</h2>
            </div>
            <div className="lp-feature-grid">
              {features.map((feature) => (
                <article className="lp-feature-card" key={feature.title}>
                  <span className="lp-feature-icon">{feature.icon}</span>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="lp-section lp-workflow">
          <div className="lp-container lp-workflow-inner">
            <div className="lp-section-heading lp-section-heading-left">
              <p className="lp-eyebrow">Simple process</p>
              <h2>From event setup to clean records in three moves.</h2>
            </div>
            <div className="lp-step-list">
              {steps.map(([title, text], index) => (
                <article className="lp-step" key={title}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="lp-section lp-pricing">
          <div className="lp-container lp-pricing-band">
            <div>
              <p className="lp-eyebrow">Free plan</p>
              <h2>Start tracking attendance today.</h2>
              <p>
                Create programs, generate QR codes, collect visitor details, and view
                live attendance without adding another manual process to your team.
              </p>
            </div>
            <div className="lp-price-panel">
              <span>Ingather Free</span>
              <strong>$0</strong>
              <p>No credit card required.</p>
              <button type="button" className="lp-btn lp-btn-primary lp-btn-large" onClick={() => goTo('/register')}>
                Get started free
              </button>
            </div>
          </div>
        </section>

        <section className="lp-final-cta">
          <div className="lp-container lp-final-inner">
            <h2>Replace the attendance sheet with a QR code.</h2>
            <p>Set up your church account and launch your first event in minutes.</p>
            <button type="button" className="lp-btn lp-btn-primary lp-btn-large" onClick={() => goTo('/register')}>
              Start with Ingather
              <span className="lp-btn-icon">{Icon.arrow}</span>
            </button>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <span>Ingather</span>
          <p>Modern attendance tracking for churches.</p>
          <small>&copy; 2026 Ingather. All rights reserved.</small>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
