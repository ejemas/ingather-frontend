import React, { useState } from 'react';
import '../styles/OnboardingModal.css';

const onboardingOptions = [
  {
    id: 'techMeetup',
    title: 'Tech Meetups',
    description: 'Builder communities, demos, and networking nights.'
  },
  {
    id: 'conference',
    title: 'Conferences',
    description: 'Large events with sessions, speakers, and live attendee flow.'
  },
  {
    id: 'seminar',
    title: 'Seminars',
    description: 'Focused learning events, workshops, and expert-led sessions.'
  },
  {
    id: 'bootcamp',
    title: 'Bootcamps',
    description: 'Cohorts, classes, trainings, and structured learning programs.'
  },
  {
    id: 'corporateEvent',
    title: 'Corporate Events',
    description: 'Town halls, offsites, team events, and business sessions.'
  },
  {
    id: 'church',
    title: 'Church/Ministry',
    description: 'Services, programs, ministry gatherings, and church events.'
  },
  {
    id: 'communityGathering',
    title: 'Community Gatherings',
    description: 'Local groups, meetups, community forums, and shared moments.'
  }
];

function OnboardingModal({ onSelect }) {
  const [savingType, setSavingType] = useState('');
  const [error, setError] = useState('');

  const handleSelect = async (organizationType) => {
    if (savingType) return;

    setSavingType(organizationType);
    setError('');

    try {
      await onSelect(organizationType);
    } catch (err) {
      setError(err?.response?.data?.error || 'We could not save your selection. Please try again.');
      setSavingType('');
    }
  };

  return (
    <div className="onboarding-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="onboarding-modal">
        <div className="onboarding-modal-header">
          <span className="onboarding-modal-kicker">Account setup</span>
          <h2 id="onboarding-title">
            Welcome to Ingather. Let's personalize your workspace.
          </h2>
          <p>What kind of events do you primarily organize?</p>
        </div>

        <div className="onboarding-option-grid">
          {onboardingOptions.map(option => {
            const isSaving = savingType === option.id;
            const isDisabled = Boolean(savingType);

            return (
              <button
                type="button"
                key={option.id}
                className={`onboarding-option-card ${isSaving ? 'is-saving' : ''}`}
                onClick={() => handleSelect(option.id)}
                disabled={isDisabled}
              >
                <span className="onboarding-option-indicator" aria-hidden="true">
                  {isSaving ? <span className="onboarding-option-spinner" /> : null}
                </span>
                <span className="onboarding-option-title">{option.title}</span>
                <span className="onboarding-option-description">{option.description}</span>
              </button>
            );
          })}
        </div>

        {error && <p className="onboarding-modal-error">{error}</p>}
      </div>
    </div>
  );
}

export default OnboardingModal;
