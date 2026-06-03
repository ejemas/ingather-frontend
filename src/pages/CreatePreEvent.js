import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPreEvent } from '../api/preEventService';
import DashboardShell from '../components/DashboardShell';
import { useToast } from '../components/Toast';
import { compressFlyerImage, fileToDataUrl, formatFileSize } from '../utils/flyerCompression';
import '../styles/PreEvents.css';

const FIELD_LABELS = {
  emailAddress: 'Email Address',
  fullName: 'Full Name',
  phoneNumber: 'Phone Number',
  school: 'School',
  organization: 'Organization',
  ticketType: 'Ticket Type'
};

const FIELD_COPY = {
  emailAddress: 'Always required so organizers can identify RSVP records.',
  fullName: 'Capture each attendee name before the event.',
  phoneNumber: 'Useful for reminders and door operations.',
  school: 'Good for campus, youth, and student events.',
  organization: 'Capture company, ministry, team, or group affiliation.',
  ticketType: 'Let attendees identify their access category.'
};

const OPTIONAL_FIELDS = ['fullName', 'phoneNumber', 'school', 'organization', 'ticketType'];

function CreatePreEvent() {
  const [formData, setFormData] = useState({
    title: '',
    eventDate: '',
    description: '',
    isRsvpActive: true,
    rsvpFields: {
      emailAddress: true,
      fullName: true,
      phoneNumber: false,
      school: false,
      organization: false,
      ticketType: false
    }
  });
  const [bannerData, setBannerData] = useState({
    compressedFile: null,
    previewUrl: '',
    originalName: '',
    originalSize: 0,
    compressedSize: 0,
    processing: false,
    error: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleRsvpField = (field) => {
    if (field === 'emailAddress') return;
    setFormData(prev => ({
      ...prev,
      rsvpFields: {
        ...prev.rsvpFields,
        [field]: !prev.rsvpFields[field]
      }
    }));
  };

  const handleBannerChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (bannerData.previewUrl) {
      URL.revokeObjectURL(bannerData.previewUrl);
    }

    setBannerData(prev => ({ ...prev, processing: true, error: '' }));

    try {
      const compressedFile = await compressFlyerImage(file);
      setBannerData({
        compressedFile,
        previewUrl: URL.createObjectURL(compressedFile),
        originalName: file.name,
        originalSize: file.size,
        compressedSize: compressedFile.size,
        processing: false,
        error: ''
      });
      toast.success('Banner compressed and ready');
    } catch (error) {
      setBannerData({
        compressedFile: null,
        previewUrl: '',
        originalName: '',
        originalSize: 0,
        compressedSize: 0,
        processing: false,
        error: error.message
      });
      toast.error(error.message);
    } finally {
      event.target.value = '';
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      toast.error('Event name is required');
      return false;
    }
    if (!formData.eventDate) {
      toast.error('Event date and time is required');
      return false;
    }
    if (Number.isNaN(new Date(formData.eventDate).getTime())) {
      toast.error('Please choose a valid event date and time');
      return false;
    }
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const banner = bannerData.compressedFile
        ? {
            dataUrl: await fileToDataUrl(bannerData.compressedFile),
            originalName: bannerData.originalName
          }
        : null;

      const response = await createPreEvent({
        title: formData.title,
        eventDate: formData.eventDate,
        description: formData.description,
        isRsvpActive: formData.isRsvpActive,
        rsvpFields: formData.rsvpFields,
        banner
      });

      toast.success('Pre-event RSVP page created');
      navigate(`/pre-events/${response.preEvent.id}`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to create pre-event');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardShell pageTitle="Create Pre-Event" activeNav="pre-events">
      <div className="pre-events-page">
        <section className="pre-event-builder-header">
          <a href="/pre-events" className="pre-event-back-link">Back to Pre-Events</a>
          <div>
            <span className="pre-events-kicker">Pre-event setup</span>
            <h1>Create an RSVP landing page.</h1>
            <p>Collect intent before your live check-in flow begins. Email is always required.</p>
          </div>
        </section>

        <form className="pre-event-builder" onSubmit={handleSubmit}>
          <section className="pre-event-form-card">
            <h2>Event Details</h2>
            <div className="pre-event-form-grid">
              <label className="pre-event-field">
                <span>Event Name</span>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(event) => updateField('title', event.target.value)}
                  placeholder="Youth Conference 2026"
                  maxLength={255}
                  required
                />
              </label>
              <label className="pre-event-field">
                <span>Date & Time</span>
                <input
                  type="datetime-local"
                  value={formData.eventDate}
                  onChange={(event) => updateField('eventDate', event.target.value)}
                  required
                />
              </label>
            </div>
            <label className="pre-event-field">
              <span>Description</span>
              <textarea
                value={formData.description}
                onChange={(event) => updateField('description', event.target.value)}
                placeholder="Tell attendees what to expect, who should attend, and why they should secure access early."
                rows={5}
                maxLength={5000}
              />
            </label>
          </section>

          <section className="pre-event-form-card">
            <div className="pre-event-card-heading">
              <div>
                <h2>Event Banner</h2>
                <p>Upload a high-impact banner. Ingather compresses it before upload.</p>
              </div>
            </div>
            <label className={`pre-event-banner-upload ${bannerData.processing ? 'processing' : ''}`}>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleBannerChange} />
              {bannerData.previewUrl ? (
                <img src={bannerData.previewUrl} alt="Pre-event banner preview" />
              ) : (
                <span>
                  <strong>Choose banner image</strong>
                  <small>JPEG, PNG, or WebP. Recommended wide image.</small>
                </span>
              )}
            </label>
            {bannerData.compressedFile && (
              <p className="pre-event-upload-meta">
                {bannerData.originalName} compressed from {formatFileSize(bannerData.originalSize)} to {formatFileSize(bannerData.compressedSize)}
              </p>
            )}
            {bannerData.error && <p className="pre-event-error">{bannerData.error}</p>}
          </section>

          <section className="pre-event-form-card">
            <div className="pre-event-card-heading">
              <div>
                <h2>RSVP Data Collection</h2>
                <p>Pick exactly what attendees must fill out before the event.</p>
              </div>
              <label className="pre-event-active-toggle">
                <input
                  type="checkbox"
                  checked={formData.isRsvpActive}
                  onChange={(event) => updateField('isRsvpActive', event.target.checked)}
                />
                <span>RSVP page active</span>
              </label>
            </div>

            <div className="pre-event-field-grid">
              <button type="button" className="pre-event-field-card selected locked">
                <span>{FIELD_LABELS.emailAddress}</span>
                <small>{FIELD_COPY.emailAddress}</small>
                <strong>Required</strong>
              </button>
              {OPTIONAL_FIELDS.map((field) => (
                <button
                  key={field}
                  type="button"
                  className={`pre-event-field-card ${formData.rsvpFields[field] ? 'selected' : ''}`}
                  onClick={() => toggleRsvpField(field)}
                >
                  <span>{FIELD_LABELS[field]}</span>
                  <small>{FIELD_COPY[field]}</small>
                  <strong>{formData.rsvpFields[field] ? 'Required' : 'Optional'}</strong>
                </button>
              ))}
            </div>
          </section>

          <div className="pre-event-submit-row">
            <a href="/pre-events" className="pre-event-secondary-btn">Cancel</a>
            <button type="submit" className="pre-events-primary-btn" disabled={submitting || bannerData.processing}>
              {submitting ? 'Creating...' : 'Create RSVP Page'}
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}

export default CreatePreEvent;
