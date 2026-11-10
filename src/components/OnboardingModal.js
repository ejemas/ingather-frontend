import React, { useEffect, useRef, useState } from 'react';
import '../styles/IgOnboarding.css';

// The words each choice uses across the dashboard and guest screens.
const onboardingOptions = [
  { id: 'techMeetup', title: 'Tech meetups', description: 'Builder communities, demos and networking nights.', words: 'Meetups · Guests' },
  { id: 'conference', title: 'Conferences', description: 'Large events with sessions, speakers and live arrivals.', words: 'Conferences · Guests' },
  { id: 'seminar', title: 'Seminars', description: 'Focused learning events, workshops and expert sessions.', words: 'Seminars · Facilitator' },
  { id: 'bootcamp', title: 'Bootcamps', description: 'Cohorts, classes and structured training.', words: 'Bootcamps · Instructor' },
  { id: 'corporateEvent', title: 'Corporate events', description: 'Town halls, offsites and team sessions.', words: 'Sessions · Guests' },
  { id: 'church', title: 'Church or ministry', description: 'Services, programs and ministry gatherings.', words: 'Programs · Visitors' },
  { id: 'communityGathering', title: 'Community gatherings', description: 'Local groups, forums and shared moments.', words: 'Gatherings · Guests' }
];

function OnboardingModal({ onSelect }) {
  const [savingType, setSavingType] = useState('');
  const [error, setError] = useState('');
  const dialogRef = useRef(null);

  useEffect(() => {
    dialogRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  const handleSelect = async (organizationType) => {
    if (savingType) return;
    setSavingType(organizationType);
    setError('');
    try {
      await onSelect(organizationType);
    } catch (err) {
      setError(err?.response
        ? (err.response.data?.error || "We couldn't save that. Please pick again.")
        : "We couldn't save that. Check your connection and pick again.");
      setSavingType('');
    }
  };

  return (
    <div className="ig-ob-overlay" role="presentation">
      <section className="ig-ob" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="ig-ob-title" aria-describedby="ig-ob-lead" aria-busy={Boolean(savingType) || undefined}>
        <header className="ig-ob-head">
          <span className="ig-ob-pill">Account setup</span>
          <h2 id="ig-ob-title">Welcome to Ingather. What do you mostly run?</h2>
          <p id="ig-ob-lead">This sets the words across your dashboard and guest screens, like Event or Program. You can change it later in Settings.</p>
        </header>

        <div className="ig-ob-grid">
          {onboardingOptions.map((option) => {
            const saving = savingType === option.id;
            const busy = Boolean(savingType);
            return (
              <button
                type="button"
                key={option.id}
                className={`ig-ob-option${saving ? ' is-saving' : ''}${busy && !saving ? ' is-muted' : ''}`}
                onClick={() => handleSelect(option.id)}
                disabled={busy}
                aria-pressed={saving}
              >
                <span className="ig-ob-option-top">
                  <strong>{option.title}</strong>
                  <span className="ig-ob-dot" aria-hidden="true" />
                </span>
                <span className="ig-ob-option-copy">{option.description}</span>
                <span className="ig-ob-option-words">{option.words}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <span className="ig-ob-error" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
            {error}
          </span>
        )}
        <span className="ig-ob-foot" aria-live="polite">{savingType ? 'Saving your choice…' : 'Pick one to continue. Your guests never see this.'}</span>
      </section>
    </div>
  );
}

export default OnboardingModal;
