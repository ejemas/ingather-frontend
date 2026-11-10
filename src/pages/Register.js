import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { register } from '../api/authService';
import { validateInvite } from '../api/waitlistService';
import { useToast } from '../components/Toast';
import { SIGNUP_INTENT_STORAGE_KEY } from '../components/SignupIntentModal';
import { DEFAULT_EVENT_TEMPLATE, EVENT_TEMPLATE_STORAGE_KEY, getEventTemplate } from '../config/eventTemplates';
import {
  AccountLayout,
  CheckIcon,
  LockIcon,
  PasswordInput,
  PasswordStrength,
  passwordProblem
} from '../components/AccountLayout';

const INVITE_ONLY_MODE = process.env.REACT_APP_INVITE_ONLY_MODE !== 'false';
const LOGO_MAX_SIDE = 512;
const LOGO_MAX_BYTES = 240 * 1024;

const dataUrlBytes = (dataUrl) => Math.ceil(((dataUrl.split(',')[1] || '').length * 3) / 4);

// Shrinks the chosen logo in the browser so it uploads quickly (max 512px, about 240KB)
const prepareLogo = (file) => new Promise((resolve, reject) => {
  if (!file || !/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
    reject(new Error('Choose a PNG, JPG or WebP image.'));
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    reject(new Error('That image is too large. Choose one under 10MB.'));
    return;
  }
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('We could not read that image.'));
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => reject(new Error('We could not read that image.'));
    image.onload = () => {
      const scale = Math.min(1, LOGO_MAX_SIDE / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      let output = canvas.toDataURL('image/png');
      if (dataUrlBytes(output) > LOGO_MAX_BYTES) {
        const flat = document.createElement('canvas');
        flat.width = canvas.width;
        flat.height = canvas.height;
        const flatCtx = flat.getContext('2d');
        flatCtx.fillStyle = '#FFFFFF';
        flatCtx.fillRect(0, 0, flat.width, flat.height);
        flatCtx.drawImage(canvas, 0, 0);
        output = flat.toDataURL('image/jpeg', 0.85);
      }
      if (dataUrlBytes(output) > LOGO_MAX_BYTES) {
        reject(new Error('That image is still too large. Try a simpler logo.'));
        return;
      }
      resolve(output);
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
});

function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const inviteToken = useMemo(() => new URLSearchParams(location.search).get('invite') || '', [location.search]);
  const signupIntent = useMemo(() => {
    const queryType = new URLSearchParams(location.search).get('type');
    if (queryType === 'church' || queryType === 'general') return queryType;

    try {
      const storedIntent = localStorage.getItem(SIGNUP_INTENT_STORAGE_KEY);
      return storedIntent === 'church' ? 'church' : 'general';
    } catch (error) {
      return 'general';
    }
  }, [location.search]);
  const templateKey = signupIntent === 'church' ? 'church' : DEFAULT_EVENT_TEMPLATE;
  const template = getEventTemplate(templateKey);
  const [formData, setFormData] = useState({
    churchName: '',
    branchName: '',
    email: '',
    password: '',
    confirmPassword: '',
    location: ''
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState('');
  const [logoError, setLogoError] = useState('');
  const [inviteStatus, setInviteStatus] = useState(inviteToken ? 'loading' : 'missing');
  const [inviteLead, setInviteLead] = useState(null);
  const [inviteError, setInviteError] = useState('');
  const inviteUnlocked = !INVITE_ONLY_MODE || inviteStatus === 'valid';
  const hasValidInvite = inviteStatus === 'valid';

  useEffect(() => {
    try {
      localStorage.setItem(SIGNUP_INTENT_STORAGE_KEY, signupIntent);
      localStorage.setItem(EVENT_TEMPLATE_STORAGE_KEY, templateKey);
    } catch (error) {
      // Local storage can be unavailable in restricted browser contexts.
    }
  }, [signupIntent, templateKey]);

  useEffect(() => {
    let isMounted = true;

    const loadInvite = async () => {
      if (!inviteToken) {
        setInviteStatus('missing');
        setInviteLead(null);
        setInviteError('');
        return;
      }

      setInviteStatus('loading');
      setInviteError('');

      try {
        const response = await validateInvite(inviteToken);
        if (!isMounted) return;

        const lead = response.invite?.lead;
        setInviteLead(lead);
        setInviteStatus('valid');
        setFormData((current) => ({
          ...current,
          email: lead?.email || current.email,
          churchName: current.churchName || lead?.organizationName || '',
          branchName: current.branchName || 'Main',
        }));
      } catch (error) {
        if (!isMounted) return;
        setInviteStatus('invalid');
        setInviteLead(null);
        setInviteError(error.response?.data?.error || 'This invite link is invalid or has expired.');
      }
    };

    loadInvite();

    return () => {
      isMounted = false;
    };
  }, [inviteToken]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.churchName.trim()) {
      newErrors.churchName = `${template.organization.nameLabel} is required`;
    }

    if (!formData.branchName.trim()) {
      newErrors.branchName = `${template.organization.branchLabel} is required`;
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    const pwProblem = passwordProblem(formData.password);
    if (pwProblem) {
      newErrors.password = pwProblem;
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const newErrors = validateForm();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      const response = await register({
        ...formData,
        logoDataUrl: logoDataUrl || undefined,
        organizationType: signupIntent === 'church' ? 'church' : undefined,
        inviteToken: inviteToken || undefined
      });

      if (response?.emailSent === false) {
        toast.error("Workspace created, but we couldn't send your code. Press Resend code on the next page.");
      } else {
        toast.success('Workspace created. Check your email for the verification code.');
      }
      navigate('/verify-email', { state: { email: response?.email || formData.email } });
    } catch (error) {
      console.error('Registration error:', error);
      if (error.response?.data?.requiresVerification) {
        toast.error(error.response.data.error);
        navigate('/verify-email', { state: { email: error.response.data.email || formData.email } });
        return;
      }
      const errorMessage = error.response?.data?.error || 'Registration failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setLogoError('');
    try {
      setLogoDataUrl(await prepareLogo(file));
    } catch (error) {
      setLogoDataUrl('');
      setLogoError(error.message);
    }
  };

  const fieldClass = (name) => `ig-wl-field ${errors[name] ? 'has-error' : ''}`;

  /* Invite link missing, expired or already used */
  if (INVITE_ONLY_MODE && (inviteStatus === 'invalid' || inviteStatus === 'missing')) {
    const missing = inviteStatus === 'missing';
    return (
      <AccountLayout
        pillTag="Invite-only"
        pillText="Access opens in phases"
        titleStart={missing ? 'You need an' : "This link didn't"}
        titleBox={missing ? 'invite' : 'work'}
        lead={missing
          ? 'Ingather is currently invite-only. Join the waitlist and we will email your invite.'
          : 'Ingather is currently invite-only, and this invite link is no longer valid.'}
        photo="/landing/cta.jpg"
        photoAlt="Guests mingling at an evening event under string lights"
        chip="Private rollout"
        panelTitle="We are opening access in phases."
        panelText="So every team gets a smooth first event on Ingather."
        navLabel="Join Waitlist"
        navTo="/waitlist"
      >
        <div className="ig-wl-card ig-acct-state" role="status">
          <span className="ig-acct-state-icon"><LockIcon /></span>
          <h2>{missing ? 'Ingather is invite-only for now' : 'This invite link has expired'}</h2>
          <p>
            {missing
              ? 'Create your workspace from the invite link in your email. No invite yet? Join the waitlist and we will send one when your spot opens.'
              : 'Invite links last 14 days and work once. If you already created your workspace, log in. Otherwise, join the waitlist again and we will send a fresh invite.'}
          </p>
          {!missing && inviteError && inviteError !== 'This invite link is invalid or has expired.' && (
            <p className="ig-acct-code-note">{inviteError}</p>
          )}
          <div className="ig-acct-state-ctas">
            <Link to="/waitlist" className="ig-acct-btn-primary">Join the Waitlist</Link>
            <Link to="/login" className="ig-acct-btn-light">Log in</Link>
          </div>
        </div>
      </AccountLayout>
    );
  }

  const workspaceWord = (template.organization.workspaceLabel || 'Workspace').toLowerCase();

  return (
    <AccountLayout
      pillTag={hasValidInvite ? 'Invite accepted' : 'Create account'}
      pillText={`Set up your ${workspaceWord}`}
      titleStart={hasValidInvite ? "You're in. Let's set up your" : "Let's set up your"}
      titleBox={workspaceWord}
      lead="Add your organization details and choose a password. You can change most of this later in Settings."
      photo="/landing/gathering.jpg"
      photoAlt="Guests in traditional attire seated under a decorated canopy at an outdoor gathering"
      chip="Private rollout access"
      panelTitle="Give your organization a cleaner way to welcome people."
      panelText="RSVP pages, QR check-in and live attendance, ready for your first event."
      tall
    >
      {!inviteUnlocked ? (
        <div className="ig-wl-card" role="status" aria-live="polite">
          <div className="ig-acct-checking"><span className="ig-acct-spin" aria-hidden="true" />Checking your invite...</div>
          <div className="ig-acct-skeleton" aria-hidden="true"><span /><span /><span /></div>
        </div>
      ) : (
        <form className="ig-wl-card ig-wl-form" onSubmit={handleSubmit} noValidate>
          {hasValidInvite && INVITE_ONLY_MODE && (
            <div className="ig-acct-invite-ok" role="status">
              <span className="ig-acct-invite-ok-icon"><CheckIcon /></span>
              <span>
                <strong>Your invite is ready</strong>
                <span>{inviteLead?.email} can now create an Ingather workspace.</span>
              </span>
            </div>
          )}

          <div className="ig-wl-row">
            <div className={fieldClass('churchName')}>
              <label htmlFor="churchName">{template.organization.nameLabel}</label>
              <input
                type="text"
                id="churchName"
                name="churchName"
                value={formData.churchName}
                onChange={handleChange}
                placeholder={signupIntent === 'church' ? 'e.g., Grace Assembly' : 'e.g., Ingather Labs'}
                autoComplete="organization"
              />
              {errors.churchName && <small>{errors.churchName}</small>}
            </div>
            <div className={fieldClass('branchName')}>
              <label htmlFor="branchName">{template.organization.branchLabel}</label>
              <input
                type="text"
                id="branchName"
                name="branchName"
                value={formData.branchName}
                onChange={handleChange}
                placeholder={signupIntent === 'church' ? 'e.g., Lekki Branch' : 'e.g., Lagos Team'}
              />
              {errors.branchName && <small>{errors.branchName}</small>}
            </div>
          </div>

          <div className="ig-wl-row">
            <div className={fieldClass('email')}>
              <label htmlFor="email">Email address {hasValidInvite && <em>(from your invite)</em>}</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={hasValidInvite ? undefined : handleChange}
                placeholder="admin@organization.com"
                readOnly={hasValidInvite}
                className={hasValidInvite ? 'ig-acct-readonly' : ''}
                autoComplete="email"
              />
              {errors.email && <small>{errors.email}</small>}
            </div>
            <div className={fieldClass('location')}>
              <label htmlFor="location">Location or address</label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., Lagos, Nigeria"
                autoComplete="address-level2"
              />
              {errors.location && <small>{errors.location}</small>}
            </div>
          </div>

          <div className="ig-wl-field">
            <label className="ig-acct-logo">
              <span className="ig-acct-logo-thumb">
                {logoDataUrl ? (
                  <img src={logoDataUrl} alt="Your logo" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" /></svg>
                )}
              </span>
              <span className="ig-acct-logo-text">
                <strong>{logoDataUrl ? 'Logo added' : 'Add organization logo'}</strong>
                {logoDataUrl ? 'Tap to choose a different one.' : 'PNG or JPG. Optional, you can add it later.'}
              </span>
              {logoDataUrl && (
                <button
                  type="button"
                  className="ig-acct-logo-remove"
                  onClick={(event) => { event.preventDefault(); setLogoDataUrl(''); }}
                >
                  Remove
                </button>
              )}
              <input type="file" accept="image/png, image/jpeg, image/webp" onChange={handleLogoChange} />
            </label>
            {logoError && <small>{logoError}</small>}
          </div>

          <div className="ig-wl-row">
            <div className={fieldClass('password')}>
              <label htmlFor="password">Password</label>
              <PasswordInput
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="8+ characters"
                autoComplete="new-password"
                invalid={Boolean(errors.password)}
              />
              {errors.password && <small>{errors.password}</small>}
            </div>
            <div className={fieldClass('confirmPassword')}>
              <label htmlFor="confirmPassword">Confirm password</label>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password"
                autoComplete="new-password"
                invalid={Boolean(errors.confirmPassword)}
              />
              {errors.confirmPassword && <small>{errors.confirmPassword}</small>}
            </div>
          </div>

          <PasswordStrength password={formData.password} />

          <button type="submit" className="ig-wl-submit" disabled={submitting} aria-busy={submitting}>
            {submitting ? (
              <>
                <span className="ig-wl-spinner" aria-hidden="true" />
                Creating workspace...
              </>
            ) : 'Create workspace'}
          </button>
          <p className="ig-wl-already">Already have an account? <Link to="/login">Log in</Link></p>
        </form>
      )}
    </AccountLayout>
  );
}

export default Register;
