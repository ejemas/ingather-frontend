import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LEGAL_DETAILS, PRIVACY_SECTIONS, TERMS_SECTIONS, hasDetail } from '../config/legalContent';
import '../styles/IgWaitlist.css';
import '../styles/IgLegal.css';

const INVITE_ONLY_MODE = process.env.REACT_APP_INVITE_ONLY_MODE !== 'false';

const DOCS = {
  privacy: { path: '/privacy', tab: 'Privacy Policy', titleStart: 'Privacy', titleBox: 'Policy', lead: 'What information Ingather collects, why, who sees it and how to ask us to change or delete it.', sections: PRIVACY_SECTIONS },
  terms: { path: '/terms', tab: 'Terms of Use', titleStart: 'Terms of', titleBox: 'Use', lead: 'The rules for using Ingather as an organizer or a guest.', sections: TERMS_SECTIONS },
  contact: { path: '/contact', tab: 'Contact', titleStart: 'Get in', titleBox: 'touch', lead: 'Questions about Ingather, your account or your data. A person on our team reads every message.', sections: [] }
};

const mailHref = (email, subject) => (hasDetail(email) ? `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}` : undefined);

function ContactCard({ icon, title, text, email }) {
  const href = mailHref(email, title);
  const Tag = href ? 'a' : 'div';
  return (
    <Tag className="ig-lg-card" href={href}>
      <span className="ig-lg-card-icon" aria-hidden="true">{icon}</span>
      <strong>{title}</strong>
      <span>{text}</span>
      {hasDetail(email) && <span className="ig-lg-card-mail">{email}</span>}
    </Tag>
  );
}

const Icon = {
  mail: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 8l9 6 9-6" /></svg>,
  help: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 015 .5c0 1.7-2.5 2-2.5 3.5M12 17h.01" /></svg>,
  shield: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
};

function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', role: 'An event organizer', message: '' });
  const [error, setError] = useState('');
  const canSend = hasDetail(LEGAL_DETAILS.generalEmail);
  const update = (key) => (event) => { setForm((prev) => ({ ...prev, [key]: event.target.value })); setError(''); };

  // There is no message server yet, so this opens the visitor's email app with everything filled in.
  const submit = (event) => {
    event.preventDefault();
    if (!form.message.trim()) {
      setError('Write a short message so we know how to help.');
      return;
    }
    const body = `${form.message.trim()}\n\n${[form.name.trim(), form.email.trim(), `Writing as: ${form.role}`].filter(Boolean).join('\n')}`;
    window.location.href = `mailto:${LEGAL_DETAILS.generalEmail}?subject=${encodeURIComponent(`Message from ${form.name.trim() || 'the Ingather website'}`)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <form className="ig-lg-form" onSubmit={submit} noValidate>
      <h2>Send us a message</h2>
      <div className="ig-lg-form-row">
        <label>Your name<input type="text" value={form.name} onChange={update('name')} placeholder="John Doe" autoComplete="name" /></label>
        <label>Email address<input type="email" value={form.email} onChange={update('email')} placeholder="you@example.com" autoComplete="email" /></label>
      </div>
      <label>I'm writing as
        <select value={form.role} onChange={update('role')}>
          <option>An event organizer</option>
          <option>A guest at an event</option>
          <option>A sponsor or partner</option>
          <option>Something else</option>
        </select>
      </label>
      <label>Message
        <textarea rows={6} value={form.message} onChange={update('message')} placeholder="How can we help?" aria-invalid={Boolean(error) || undefined} />
      </label>
      {error && <span className="ig-lg-error" role="alert">{error}</span>}
      <button type="submit" disabled={!canSend}>Send message</button>
      <p>
        {canSend ? 'This opens your email app with your message ready to send. ' : 'Messages open soon. '}
        {hasDetail(LEGAL_DETAILS.responseTime) && `We usually reply within ${LEGAL_DETAILS.responseTime}. `}Guests: for questions about a specific event, contact its organizer first.
      </p>
    </form>
  );
}

function LegalPage({ doc = 'privacy' }) {
  const meta = DOCS[doc] || DOCS.privacy;
  const [current, setCurrent] = useState(meta.sections[0]?.id || '');

  useEffect(() => {
    document.title = `${meta.tab} | Ingather`;
    window.scrollTo?.(0, 0);
  }, [meta.tab]);

  useEffect(() => {
    if (!meta.sections.length || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setCurrent(visible[0].target.id);
    }, { rootMargin: '-20% 0px -65% 0px' });
    meta.sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [meta.sections]);

  return (
    <div className="ig-wl ig-lg">
      <div className="ig-wl-frame">
        <div className="ig-wl-col">
          <div className="ig-wl-navwrap">
            <nav className="ig-wl-nav" aria-label="Main">
              <Link to="/" className="ig-wl-brand" aria-label="Ingather home"><img src="/ingather-logo.png" alt="Ingather" /></Link>
              <div className="ig-wl-navlinks">
                <Link to="/">Home</Link>
                <Link to="/discover">Discover</Link>
                <Link to="/#faq">FAQs</Link>
                <Link to="/login">Log in</Link>
              </div>
              <Link to={INVITE_ONLY_MODE ? '/waitlist' : '/register'} className="ig-wl-login">{INVITE_ONLY_MODE ? 'Join Waitlist' : 'Get started'}</Link>
            </nav>
          </div>

          <header className="ig-lg-hero">
            <div className="ig-lg-tabs" role="navigation" aria-label="Legal pages">
              {Object.entries(DOCS).map(([key, item]) => (
                <Link key={key} to={item.path} className={key === doc ? 'is-on' : ''} aria-current={key === doc ? 'page' : undefined}>{item.tab}</Link>
              ))}
            </div>
            <h1>{meta.titleStart} <span className="ig-wl-mark">{meta.titleBox}</span></h1>
            <p>{meta.lead}</p>
            {doc !== 'contact' && hasDetail(LEGAL_DETAILS.lastUpdated) && (
              <div className="ig-lg-meta"><span>Last updated {LEGAL_DETAILS.lastUpdated}</span></div>
            )}
          </header>

          {doc === 'contact' ? (
            <main className="ig-lg-contact">
              <div className="ig-lg-cards">
                <ContactCard icon={Icon.mail} title="General questions" text="Access, partnerships and anything else." email={LEGAL_DETAILS.generalEmail} />
                <ContactCard icon={Icon.help} title="Organizer support" text="Help with events, check-in or your account." email={LEGAL_DETAILS.supportEmail} />
                <ContactCard icon={Icon.shield} title="Privacy and your data" text="See, correct or delete information we hold about you." email={LEGAL_DETAILS.privacyEmail} />
              </div>
              <ContactForm />
            </main>
          ) : (
            <main className="ig-lg-doc">
              <nav className="ig-lg-toc" aria-label="On this page">
                <span>On this page</span>
                {meta.sections.map((section) => (
                  <a key={section.id} href={`#${section.id}`} className={current === section.id ? 'is-on' : ''} aria-current={current === section.id ? 'location' : undefined}>{section.title}</a>
                ))}
              </nav>
              <article className="ig-lg-article">
                {meta.sections.map((section) => (
                  <section key={section.id} id={section.id}>
                    <h2>{section.title}</h2>
                    {section.paras.map((para) => <p key={para.slice(0, 40)}>{para}</p>)}
                    {section.list && (
                      <ul>
                        {section.list.map(([key, value]) => (
                          <li key={key}><span className="ig-lg-tick" aria-hidden="true">{Icon.check}</span><span><strong>{key}</strong> {value}</span></li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </article>
            </main>
          )}

          <footer className="ig-wl-foot">
            <span>&copy; 2026 Ingather. All rights reserved.</span>
            <span className="ig-lg-footlinks"><Link to="/privacy">Privacy Policy</Link><Link to="/terms">Terms of Use</Link><Link to="/contact">Contact</Link></span>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default LegalPage;
