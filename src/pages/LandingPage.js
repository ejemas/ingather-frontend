import React from 'react';
import '../styles/LandingPage.css';

function LandingPage() {
  return (
    <div className="landing-page">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="container nav-container">
          <div className="logo">
            <h2>Ingather</h2>
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#pricing">Pricing</a>
            <button className="btn btn-secondary" onClick={() => window.location.href='/login'}>
              Login
            </button>
            <button className="btn btn-primary" onClick={() => window.location.href='/register'}>
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">
              Track Church Attendance <br />
              <span className="highlight">In Real-Time</span>
            </h1>
            <p className="hero-subtitle">
              Say goodbye to manual headcounts. Ingather uses smart QR technology 
              to help churches track attendance, collect visitor data, and gain 
              insights—all in one powerful platform.
            </p>
            <div className="hero-buttons">
              <button className="btn btn-primary btn-lg" onClick={() => window.location.href='/register'}>
                Start Free Trial
              </button>
              <button className="btn btn-secondary btn-lg" onClick={() => window.location.href='#how-it-works'}>
                See How It Works
              </button>
            </div>
            <p className="hero-note">✨ No credit card required • 14-day free trial</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="container">
          <h2 className="section-title">Why Churches Love Ingather</h2>
          <p className="section-subtitle">Everything you need to modernize your attendance tracking</p>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Real-Time Analytics</h3>
              <p>Watch your attendance numbers grow live during service. No more waiting or guessing.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Simple QR Scanning</h3>
              <p>Attendees just scan a QR code at entry. Fast, contactless, and modern.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🎁</div>
              <h3>Gamified Data Collection</h3>
              <p>Incentivize visitors to share their details with a lucky dip gift system.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <h3>Arrival Insights</h3>
              <p>See exactly when people arrive to optimize service start times and logistics.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Duplicate Prevention</h3>
              <p>Smart fingerprinting ensures each device can only scan once per event.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📄</div>
              <h3>Export & Reports</h3>
              <p>Download attendee data and reports for follow-ups and planning.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="how-it-works">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Get started in 3 simple steps</p>
          
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Create Your Event</h3>
              <p>Set up your program details, date, time, and what data you want to collect.</p>
            </div>

            <div className="step">
              <div className="step-number">2</div>
              <h3>Display QR Code</h3>
              <p>Print or display the generated QR code at your church entrance.</p>
            </div>

            <div className="step">
              <div className="step-number">3</div>
              <h3>Watch Live Updates</h3>
              <p>Monitor attendance in real-time from your dashboard as people scan in.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing">
        <div className="container">
          <h2 className="section-title">Simple, Transparent Pricing</h2>
          <p className="section-subtitle">Choose the plan that fits your church</p>
          
          <div className="pricing-grid">
            <div className="pricing-card">
              <h3>Starter</h3>
              <div className="price">
                <span className="currency">$</span>
                <span className="amount">29</span>
                <span className="period">/month</span>
              </div>
              <ul className="pricing-features">
                <li>✓ Up to 500 scans/event</li>
                <li>✓ 5 events per month</li>
                <li>✓ Basic analytics</li>
                <li>✓ Data export</li>
              </ul>
              <button className="btn btn-secondary" onClick={() => window.location.href='/register'}>
                Start Free Trial
              </button>
            </div>

            <div className="pricing-card featured">
              <div className="popular-badge">Most Popular</div>
              <h3>Growth</h3>
              <div className="price">
                <span className="currency">$</span>
                <span className="amount">79</span>
                <span className="period">/month</span>
              </div>
              <ul className="pricing-features">
                <li>✓ Up to 2,000 scans/event</li>
                <li>✓ Unlimited events</li>
                <li>✓ Advanced analytics</li>
                <li>✓ Gifting system</li>
                <li>✓ Priority support</li>
              </ul>
              <button className="btn btn-primary" onClick={() => window.location.href='/register'}>
                Start Free Trial
              </button>
            </div>

            <div className="pricing-card">
              <h3>Enterprise</h3>
              <div className="price">
                <span className="currency">$</span>
                <span className="amount">199</span>
                <span className="period">/month</span>
              </div>
              <ul className="pricing-features">
                <li>✓ Unlimited scans</li>
                <li>✓ Unlimited events</li>
                <li>✓ Multiple branches</li>
                <li>✓ Custom branding</li>
                <li>✓ Dedicated support</li>
              </ul>
              <button className="btn btn-secondary" onClick={() => window.location.href='/register'}>
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-left">
              <h3>Ingather</h3>
              <p>Modern attendance tracking for modern churches.</p>
            </div>
            <div className="footer-right">
              <p>&copy; 2026 Ingather. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;