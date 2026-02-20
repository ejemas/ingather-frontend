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
            <button className="btn btn-secondary nav-btn" onClick={() => window.location.href='/login'}>
              Login
            </button>
            <button className="btn btn-primary nav-btn" onClick={() => window.location.href='/register'}>
              Get Started Free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Ultra Modern */}
      <section className="hero">
        <div className="hero-bg"></div>
        <div className="container">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="badge-icon">✨</span>
              <span>Modern Church Management</span>
            </div>
            
            <h1 className="hero-title">
              Track Church Attendance
              <br />
              <span className="text-gradient">In Real-Time</span>
            </h1>
            
            <p className="hero-subtitle">
              Say goodbye to manual headcounts. Ingather uses smart QR technology 
              to help churches track attendance, collect visitor data, and gain 
              insights—all in one powerful platform.
            </p>
            
            <div className="hero-buttons">
              <button 
                className="btn btn-primary btn-large"
                onClick={() => window.location.href='/register'}
              >
                Start Free Today
                <span>→</span>
              </button>
              <button 
                className="btn btn-secondary btn-large"
                onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })}
              >
                See How It Works
              </button>
            </div>
            
            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-number">100%</div>
                <div className="stat-label">Free</div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <div className="stat-number">2min</div>
                <div className="stat-label">Setup Time</div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <div className="stat-number">∞</div>
                <div className="stat-label">Unlimited Events</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="hero-decoration">
          <div className="decoration-circle circle-1"></div>
          <div className="decoration-circle circle-2"></div>
          <div className="decoration-circle circle-3"></div>
        </div>
      </section>

      {/* Features Section - Modern Grid */}
      <section id="features" className="features">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Features</span>
            {/* <h2 className="section-title">Why Churches Love Ingather</h2> */}
            {/* <p className="section-subtitle"> */}
              {/* Everything you need to modernize your attendance tracking */}
            {/* </p> */}
          </div>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <div className="feature-icon">📊</div>
              </div>
              <h3>Real-Time Analytics</h3>
              <p>Watch your attendance numbers grow live during service. No more waiting or guessing.</p>
            </div>

            <div className="feature-card featured">
              <div className="feature-badge">Most Popular</div>
              <div className="feature-icon-wrapper">
                <div className="feature-icon">📱</div>
              </div>
              <h3>Simple QR Scanning</h3>
              <p>Attendees just scan a QR code at entry. Fast, contactless, and modern.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <div className="feature-icon">🎁</div>
              </div>
              <h3>Gamified Data Collection</h3>
              <p>Incentivize visitors to share their details with a lucky dip gift system.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <div className="feature-icon">📈</div>
              </div>
              <h3>Arrival Insights</h3>
              <p>See exactly when people arrive to optimize service start times and logistics.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <div className="feature-icon">🔒</div>
              </div>
              <h3>Duplicate Prevention</h3>
              <p>Smart fingerprinting ensures each device can only scan once per event.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <div className="feature-icon">📄</div>
              </div>
              <h3>Export & Reports</h3>
              <p>Download attendee data and reports for follow-ups and planning.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Modern Flow */}
      <section id="how-it-works" className="how-it-works">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Simple Process</span>
            {/* <h2 className="section-title">From Click to Confirmed in Seconds</h2> */}
            {/* <p className="section-subtitle">Get started in 3 simple steps</p> */}
          </div>
          
          <div className="process-flow">
            <div className="process-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Create Your Event</h3>
                <p>Set up your program details, date, time, and what data you want to collect in under 2 minutes.</p>
              </div>
            </div>

            <div className="flow-connector"></div>

            <div className="process-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Display QR Code</h3>
                <p>Print or display the generated QR code at your church entrance. One code, unlimited scans.</p>
              </div>
            </div>

            <div className="flow-connector"></div>

            <div className="process-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Watch Live Updates</h3>
                <p>Monitor attendance in real-time from your dashboard as people scan in. No refresh needed.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - Free Plan */}
      <section id="pricing" className="pricing">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Pricing</span>
            {/* <h2 className="section-title">Simple, Transparent Pricing</h2> */}
            {/* <p className="section-subtitle">All features included. No credit card required.</p> */}
          </div>
          
          <div className="pricing-container">
            <div className="pricing-card-modern">
              <div className="pricing-header">
                <div className="pricing-badge">Use for Free</div>
                <h3>Ingather Free</h3>
                <div className="price-wrapper">
                  <span className="currency">$</span>
                  <span className="amount">0</span>
                  <span className="period">/free</span>
                </div>
                <p className="pricing-description">
                  Everything you need to track church attendance, completely free
                </p>
              </div>

              <div className="pricing-features-list">
                <div className="feature-item">
                  <span className="check-icon">✓</span>
                  <span>Unlimited events & programs</span>
                </div>
                <div className="feature-item">
                  <span className="check-icon">✓</span>
                  <span>Unlimited scans & attendees</span>
                </div>
                <div className="feature-item">
                  <span className="check-icon">✓</span>
                  <span>Real-time analytics dashboard</span>
                </div>
                <div className="feature-item">
                  <span className="check-icon">✓</span>
                  <span>QR code generation</span>
                </div>
                <div className="feature-item">
                  <span className="check-icon">✓</span>
                  <span>Data collection forms</span>
                </div>
                <div className="feature-item">
                  <span className="check-icon">✓</span>
                  <span>Lucky dip gifting system</span>
                </div>
                <div className="feature-item">
                  <span className="check-icon">✓</span>
                  <span>Duplicate scan prevention</span>
                </div>
                <div className="feature-item">
                  <span className="check-icon">✓</span>
                  <span>CSV data export</span>
                </div>
                <div className="feature-item">
                  <span className="check-icon">✓</span>
                  <span>Mobile-optimized interface</span>
                </div>
                <div className="feature-item">
                  <span className="check-icon">✓</span>
                  <span>Attendance time-series charts</span>
                </div>
              </div>

              <button 
                className="btn btn-primary btn-large pricing-cta"
                onClick={() => window.location.href='/register'}
              >
                Get Started Free
                <span>→</span>
              </button>

              <p className="pricing-note">
                ✨ No credit card required • Start in 2 minutes
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-card">
            <div className="cta-content">
              <h2>Ready to Modernize Your Church?</h2>
              <p>
                Join churches using Ingather to streamline attendance tracking. 
                Set up your first event in under 2 minutes. No credit card required.
              </p>
              <button 
                className="btn btn-primary btn-large cta-button"
                onClick={() => window.location.href='/dashboard'}
              >
                Open Dashboard
                <span>→</span>
              </button>
            </div>
            <div className="cta-decoration">
              <div className="cta-circle"></div>
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
              <p>Modern attendance tracking for churches.</p>
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