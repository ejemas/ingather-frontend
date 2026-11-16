// Admin Team: who can open the admin dashboard. Only owners can add, change or remove people,
// and each change asks for a fresh code from their authenticator app.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { adminData, adminErrorMessage } from '../../api/adminApi';
import { useAdminSession } from './AdminSession';
import { AdminIcon } from './AdminIcons';
import { CodeBoxes } from './AdminAuthPages';

const ROLE = {
  owner: { label: 'Owner', pill: 'is-ink', can: 'Everything: every page and number, the team, exports and the activity log.' },
  admin: { label: 'Admin', pill: 'is-orange', can: 'Only the waitlist (people waiting), help tickets and broadcasts. Every other page is locked.' },
  viewer: { label: 'Viewer', pill: 'is-grey', can: 'Sees every number and list. Cannot invite, reject or send anything.' }
};
const ROLE_SHORT = {
  owner: 'Everything, including the team and the activity log',
  admin: 'Only waitlist (people waiting), help and broadcasts',
  viewer: 'See numbers only'
};
const RULES = [
  ['Password and a code from your phone', 'Authenticator app. Email codes only as a backup.'],
  ['Signed out after 30 minutes idle', 'And everyone signs in again every 12 hours.'],
  ['Paused after 5 wrong tries', 'The account waits 15 minutes and every owner gets an email.'],
  ['Code again for big actions', 'Broadcasts, adding or removing people, changing roles and resetting two-step sign-in.'],
  ['Owners are told about changes', 'New devices, new people, role changes, removals and every broadcast.'],
  ['Activity log kept for 2 years', 'Nobody can edit or delete it, owners included.']
];
const AVATARS = [['#E8590C', '#FFFFFF'], ['#FFF1E7', '#C84B07'], ['#EAF2FF', '#2563C9'], ['#E6F6F4', '#1D8A7E'], ['#FDECF1', '#C2416B'], ['#FFF6DB', '#B7791F']];

const initials = (name) => String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'IG';

const seenWords = (iso) => {
  if (!iso) return 'never';
  const d = new Date(iso);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 5) return 'now';
  const today = new Date();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) return `today, ${time}`;
  const days = Math.round((new Date(today.toDateString()) - new Date(d.toDateString())) / 86400000);
  if (days === 1) return `yesterday, ${time}`;
  if (days < 30) return `${days} days ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

function TwoStepLine({ p }) {
  if (!p.joined) {
    return p.inviteExpired
      ? <span className="ig-ad-team-line is-red">Invite link expired. Send a new one.</span>
      : <span className="ig-ad-team-line is-amber">Invite sent {seenWords(p.invitedAt)}, password not set yet</span>;
  }
  if (!p.twoStep) return <span className="ig-ad-team-line is-red">Two-step: not set up, sets it up on next sign-in</span>;
  return <span className="ig-ad-team-line is-green">Two-step: Authenticator app{p.backupCodesLeft != null ? `, ${p.backupCodesLeft} backup codes left` : ''}</span>;
}

function Dialog({ title, children, onClose, busy }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);
  return (
    <div className="ig-ad-modal-wrap" role="presentation" onClick={() => !busy && onClose()}>
      <div className="ig-ad-modal ig-ad-team-modal" role="dialog" aria-modal="true" aria-labelledby="ig-ad-team-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="ig-ad-team-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function RolePicker({ value, onChange, allowOwner }) {
  return (
    <div className="ig-ad-roles" role="radiogroup" aria-label="Role">
      {['admin', 'viewer', ...(allowOwner ? ['owner'] : [])].map((r) => (
        <label key={r} className={`ig-ad-role-opt${value === r ? ' is-on' : ''}`}>
          <input type="radio" name="role" value={r} checked={value === r} onChange={() => onChange(r)} />
          <span><strong>{ROLE[r].label}</strong><small>{ROLE_SHORT[r]}</small></span>
        </label>
      ))}
    </div>
  );
}

function InviteLinkNote({ link, name }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="ig-ad-notice" role="status" style={{ flexDirection: 'column', gap: 8 }}>
      <span>The invite email did not send. You can send {name.split(' ')[0]} this link yourself. It works once, for 72 hours.</span>
      <code className="ig-ad-key" style={{ fontWeight: 500, fontSize: 12 }}>{link}</code>
      <button type="button" className="ig-ad-btn-2" style={{ alignSelf: 'flex-start', minHeight: 36 }} onClick={async () => {
        try { await navigator.clipboard.writeText(link); setCopied(true); } catch (e) { setCopied(false); }
      }}>{copied ? 'Copied' : 'Copy link'}</button>
    </div>
  );
}

function AddDialog({ startRole, onClose, onAdded }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(startRole || 'viewer');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  const submit = async (value = code) => {
    if (busy) return;
    if (!name.trim()) { setError('Add their full name.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Add a valid email address.'); return; }
    if (value.length !== 6) { setError('Type the 6-digit code from your authenticator app.'); return; }
    setBusy(true);
    setError('');
    try {
      const { data } = await adminData.teamAdd({ name: name.trim(), email: email.trim(), role, code: value });
      onAdded(data);
      if (data.inviteLink) setDone(data);
      else onClose();
    } catch (err) {
      setError(adminErrorMessage(err, 'Could not add this person.'));
      if (err?.response?.data?.codeError) setCode('');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Dialog title={`${done.person.name} is on the team`} onClose={onClose}>
        <InviteLinkNote link={done.inviteLink} name={done.person.name} />
        <div className="ig-ad-modal-actions"><button type="button" className="ig-ad-btn" onClick={onClose}>Done</button></div>
      </Dialog>
    );
  }

  return (
    <Dialog title={startRole === 'owner' ? 'Add a second owner' : 'Add a person'} onClose={onClose} busy={busy}>
      <p>They get an email to set a password. Then they set up an authenticator app, and need a code from it every time they sign in.</p>
      <label className="ig-ad-field">Full name<input className="ig-ad-input" value={name} onChange={(e) => { setName(e.target.value); setError(''); }} autoFocus maxLength={120} /></label>
      <label className="ig-ad-field">Email<input className="ig-ad-input" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} maxLength={255} /></label>
      <span className="ig-ad-field">Role<RolePicker value={role} onChange={setRole} allowOwner /></span>
      <span className="ig-ad-field" style={{ gap: 8 }}>
        Code from your authenticator app
        <CodeBoxes value={code} onChange={(v) => { setCode(v); setError(''); }} label="Code from your authenticator app" autoFocus={false} tight invalid={Boolean(error) && code.length === 0} />
      </span>
      {error ? <p className="ig-ad-error" role="alert" style={{ margin: 0 }}>{error}</p> : null}
      <div className="ig-ad-modal-actions">
        <button type="button" className="ig-ad-btn-2" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="button" className="ig-ad-btn" onClick={() => submit()} disabled={busy}>{busy ? 'Adding…' : 'Send invite'}</button>
      </div>
    </Dialog>
  );
}

function ManageDialog({ person, onlyOwnerLeft, onClose, onChanged, toast }) {
  const [role, setRole] = useState(person.role);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [link, setLink] = useState(null);

  const run = async (kind) => {
    if (busy) return;
    if (kind !== 'resend' && code.length !== 6) { setError('Type the 6-digit code from your authenticator app first.'); return; }
    setBusy(kind);
    setError('');
    try {
      if (kind === 'role') {
        await adminData.teamRole(person.id, role, code);
        toast(`${person.name} is now ${role === 'viewer' ? 'a' : 'an'} ${ROLE[role].label}`);
        onChanged();
        onClose();
      } else if (kind === 'reset') {
        await adminData.teamResetTwoStep(person.id, code);
        toast(`${person.name.split(' ')[0]} sets up two-step sign-in again on their next sign-in`);
        onChanged();
        onClose();
      } else if (kind === 'remove') {
        await adminData.teamRemove(person.id, code);
        toast(`${person.name} was removed and signed out`);
        onChanged();
        onClose();
      } else if (kind === 'resend') {
        const { data } = await adminData.teamResend(person.id);
        onChanged();
        if (data.inviteLink) setLink(data.inviteLink);
        else { toast(`New invite sent to ${person.email}`); onClose(); }
      }
    } catch (err) {
      setError(adminErrorMessage(err, 'That did not work. Please try again.'));
      if (err?.response?.data?.codeError) setCode('');
    } finally {
      setBusy('');
    }
  };

  if (confirmRemove) {
    return (
      <Dialog title={`Remove ${person.name}?`} onClose={onClose} busy={!!busy}>
        <p>They are signed out right away and can no longer open the admin dashboard. Their past actions stay in the activity log.</p>
        <span className="ig-ad-field" style={{ gap: 8 }}>
          Code from your authenticator app
          <CodeBoxes value={code} onChange={(v) => { setCode(v); setError(''); }} label="Code from your authenticator app" invalid={Boolean(error)} />
        </span>
        {error ? <p className="ig-ad-error" role="alert" style={{ margin: 0 }}>{error}</p> : null}
        <p className="ig-ad-small ig-ad-muted">We ask again for actions that reach every organiser or change who has access.</p>
        <div className="ig-ad-modal-actions">
          <button type="button" className="ig-ad-btn-2" onClick={() => { setConfirmRemove(false); setError(''); }} disabled={!!busy}>Cancel</button>
          <button type="button" className="ig-ad-btn is-red" onClick={() => run('remove')} disabled={!!busy}>{busy === 'remove' ? 'Removing…' : 'Remove'}</button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog title={`Manage ${person.name}`} onClose={onClose} busy={!!busy}>
      <p>{person.email}</p>
      {link ? <InviteLinkNote link={link} name={person.name} /> : null}
      <span className="ig-ad-field">Role<RolePicker value={role} onChange={(r) => { setRole(r); setError(''); }} allowOwner /></span>
      {person.role === 'owner' && onlyOwnerLeft ? <p className="ig-ad-small ig-ad-muted">This is the only owner. Make someone else an owner before changing this role.</p> : null}
      <span className="ig-ad-field" style={{ gap: 8 }}>
        Code from your authenticator app
        <CodeBoxes value={code} onChange={(v) => { setCode(v); setError(''); }} label="Code from your authenticator app" autoFocus={false} tight invalid={Boolean(error) && code.length === 0} />
      </span>
      {error ? <p className="ig-ad-error" role="alert" style={{ margin: 0 }}>{error}</p> : null}
      <div className="ig-ad-manage-more">
        {!person.joined ? <button type="button" className="ig-ad-link ig-ad-link-orange" onClick={() => run('resend')} disabled={!!busy}>{busy === 'resend' ? 'Sending…' : 'Send a new invite link'}</button> : null}
        {person.twoStep ? <button type="button" className="ig-ad-link ig-ad-link-orange" onClick={() => run('reset')} disabled={!!busy}>{busy === 'reset' ? 'Resetting…' : 'Reset two-step sign-in (lost phone)'}</button> : null}
        <button type="button" className="ig-ad-link ig-ad-link-red" onClick={() => setConfirmRemove(true)} disabled={!!busy}>Remove from the team</button>
      </div>
      <div className="ig-ad-modal-actions">
        <button type="button" className="ig-ad-btn-2" onClick={onClose} disabled={!!busy}>Close</button>
        <button type="button" className="ig-ad-btn" onClick={() => run('role')} disabled={!!busy || role === person.role}>{busy === 'role' ? 'Saving…' : 'Save role'}</button>
      </div>
    </Dialog>
  );
}

export default function AdminTeam() {
  const { session } = useAdminSession();
  const isOwner = session.admin?.role === 'owner';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(null); // null | 'viewer' | 'owner'
  const [managing, setManaging] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const toastTimer = useRef(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const { data: res } = await adminData.team();
      setData(res);
    } catch (err) {
      if (err?.response?.status !== 401) setError(adminErrorMessage(err, 'Could not load the team. Please try again.'));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toast = useCallback((text, tone = 'ok') => {
    setToastMsg({ text, tone });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 4500);
  }, []);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const people = data?.people || [];

  return (
    <>
      <div className="ig-ad-pagehead">
        <div className="ig-ad-pagehead-text">
          <h1>Team</h1>
          <p>People who can open this admin dashboard.</p>
        </div>
      </div>

      {error ? <div className="ig-ad-notice is-red" role="alert"><AdminIcon name="warn" size={16} /><span>{error} <button type="button" className="ig-ad-link ig-ad-link-orange" onClick={load}>Try again</button></span></div> : null}

      {data?.onlyOwner ? (
        <div className="ig-ad-owner-warn" role="note">
          <AdminIcon name="warn" size={18} />
          <span><strong>You are the only owner.</strong> If you lose your phone and your backup codes, nobody can manage this team. Make one person you trust a second owner.</span>
          <button type="button" className="ig-ad-btn-2" onClick={() => setAdding('owner')}>Add a second owner</button>
        </div>
      ) : null}

      <div className="ig-ad-row ig-ad-team-row">
        <section className="ig-ad-panel gap-10" aria-label="People with access">
          <div className="ig-ad-panel-head">
            <span><h2>People with access</h2><small>{data ? `${people.length} ${people.length === 1 ? 'person' : 'people'}` : ''}</small></span>
            {isOwner ? <button type="button" className="ig-ad-btn" style={{ minHeight: 42 }} onClick={() => setAdding('viewer')}><AdminIcon name="plus" size={16} />Add person</button> : null}
          </div>
          <div className="ig-ad-list">
            {!data ? <span className="ig-ad-skel" style={{ height: 220, display: 'block' }} /> : null}
            {people.map((p, i) => {
              const [bg, fg] = AVATARS[i % AVATARS.length];
              const me = p.id === session.admin?.id;
              return (
                <div key={p.id} className="ig-ad-team-person">
                  <span className="ig-ad-av" style={{ background: bg, color: fg }}>{initials(p.name)}</span>
                  <span className="ig-ad-team-text">
                    <strong>{p.name}{me ? <span className="ig-ad-muted" style={{ fontWeight: 400 }}> (you)</span> : null}</strong>
                    <span>{p.email}</span>
                    <span>{p.joined ? `Last seen ${seenWords(me ? new Date().toISOString() : p.lastSeenAt)}` : 'Has not signed in yet'}</span>
                    <TwoStepLine p={p} />
                    {p.lockedUntil ? <span className="ig-ad-team-line is-red">Paused after 5 wrong tries</span> : null}
                  </span>
                  <span className="ig-ad-team-side">
                    <span className={`ig-ad-pill ${ROLE[p.role].pill}`}>{ROLE[p.role].label}</span>
                    {isOwner && !me ? <button type="button" className="ig-ad-link ig-ad-link-orange" onClick={() => setManaging(p)}>Manage</button> : null}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <div className="ig-ad-team-side-col">
          <section className="ig-ad-panel gap-10" aria-label="What each role can do">
            <div className="ig-ad-panel-head"><span><h2>What each role can do</h2><small>Only an owner can add or remove people</small></span></div>
            {['owner', 'admin', 'viewer'].map((r) => (
              <div key={r} className="ig-ad-role-card">
                <span className={`ig-ad-pill ${ROLE[r].pill}`}>{ROLE[r].label}</span>
                <p>{ROLE[r].can}</p>
              </div>
            ))}
            <span className="ig-ad-lock-note" style={{ padding: '4px 2px 0' }}>
              <span><AdminIcon name="lock" size={14} /></span>
              No one here can see guest phone numbers or answers. Admin shows totals only, never a guest list.
            </span>
          </section>

          {isOwner ? (
            <section className="ig-ad-panel gap-10" aria-label="Sign-in rules">
              <div className="ig-ad-panel-head"><span><h2>Sign-in rules</h2><small>The same for everyone here. Only an owner can see this.</small></span></div>
              <div className="ig-ad-list">
                {RULES.map(([t, d]) => (
                  <div key={t} className="ig-ad-rule">
                    <span><strong>{t}</strong><small>{d}</small></span>
                    <span className="ig-ad-pill is-green">On</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>

      {adding ? <AddDialog startRole={adding} onClose={() => setAdding(null)} onAdded={(res) => { load(); if (!res.inviteLink) toast(`Invite sent to ${res.person.email}`); }} /> : null}
      {managing ? (
        <ManageDialog
          person={managing}
          onlyOwnerLeft={data?.ownerCount <= 1}
          onClose={() => setManaging(null)}
          onChanged={load}
          toast={toast}
        />
      ) : null}
      {toastMsg ? (
        <div className={`ig-ad-toast${toastMsg.tone === 'warn' ? ' is-warn' : ''}`} role="status">
          <span className="ig-ad-toast-ic"><AdminIcon name={toastMsg.tone === 'warn' ? 'warn' : 'check'} size={14} strokeWidth={2.4} /></span>
          {toastMsg.text}
        </div>
      ) : null}
    </>
  );
}
