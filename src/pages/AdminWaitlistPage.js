import React, { useEffect, useMemo, useState } from 'react';
import {
  getWaitlistLeads,
  inviteWaitlistLead,
  rejectWaitlistLead,
  revokeWaitlistInvite
} from '../api/waitlistService';
import { useToast } from '../components/Toast';
import '../styles/AdminWaitlist.css';

const ADMIN_KEY_STORAGE = 'ingather-admin-key';
const statusTabs = ['all', 'pending', 'invited', 'accepted', 'rejected'];

const formatDate = (value) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
};

function AdminWaitlistPage() {
  const toast = useToast();
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem(ADMIN_KEY_STORAGE) || '');
  const [keyInput, setKeyInput] = useState(() => sessionStorage.getItem(ADMIN_KEY_STORAGE) || '');
  const [leads, setLeads] = useState([]);
  const [activeStatus, setActiveStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');
  const [lastInviteLink, setLastInviteLink] = useState('');

  const loadLeads = async (key = adminKey) => {
    if (!key) return;
    setLoading(true);
    setError('');
    try {
      const response = await getWaitlistLeads(key);
      setLeads(response.leads || []);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not load waitlist leads.');
      if (requestError.response?.status === 403) {
        sessionStorage.removeItem(ADMIN_KEY_STORAGE);
        setAdminKey('');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminKey) {
      loadLeads(adminKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminKey]);

  const filteredLeads = useMemo(() => {
    if (activeStatus === 'all') return leads;
    return leads.filter((lead) => lead.status === activeStatus);
  }, [activeStatus, leads]);

  const counts = useMemo(() => {
    return leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      acc.all += 1;
      return acc;
    }, { all: 0 });
  }, [leads]);

  const handleKeySubmit = (event) => {
    event.preventDefault();
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    sessionStorage.setItem(ADMIN_KEY_STORAGE, trimmed);
    setAdminKey(trimmed);
  };

  const copyInvite = async (link) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Invite link copied.');
    } catch (copyError) {
      setLastInviteLink(link);
      toast.info('Copy failed. The invite link is shown above the table.');
    }
  };

  const runLeadAction = async (leadId, action) => {
    setActionLoading(`${action}:${leadId}`);
    setError('');

    try {
      if (action === 'invite') {
        const response = await inviteWaitlistLead(adminKey, leadId);
        setLastInviteLink(response.inviteLink || '');
        if (response.inviteLink) {
          await copyInvite(response.inviteLink);
        }
        if (response.emailWarning) {
          toast.info(response.emailWarning);
        } else {
          toast.success(response.emailSent ? 'Invite sent and copied.' : 'Invite generated.');
        }
      } else if (action === 'reject') {
        await rejectWaitlistLead(adminKey, leadId);
        toast.success('Lead rejected.');
      } else if (action === 'revoke') {
        await revokeWaitlistInvite(adminKey, leadId);
        toast.success('Invite revoked.');
      }
      await loadLeads(adminKey);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Action failed. Please try again.');
    } finally {
      setActionLoading('');
    }
  };

  if (!adminKey) {
    return (
      <main className="admin-waitlist-gate">
        <form className="admin-waitlist-gate-card" onSubmit={handleKeySubmit}>
          <img src="/ingather-logo.png" alt="Ingather" />
          <p>Founder console</p>
          <h1>Waitlist access</h1>
          <span>Enter your admin key to review, invite, and approve waitlist leads.</span>
          <input
            type="password"
            value={keyInput}
            onChange={(event) => setKeyInput(event.target.value)}
            placeholder="ADMIN_API_KEY"
            autoFocus
          />
          <button type="submit">Open waitlist console</button>
          {error && <div className="admin-waitlist-error">{error}</div>}
        </form>
      </main>
    );
  }

  return (
    <main className="admin-waitlist-page">
      <header className="admin-waitlist-header">
        <div>
          <p>Founder console</p>
          <h1>Waitlist approvals</h1>
          <span>Review leads, generate invites, and control who gets Ingather access.</span>
        </div>
        <div className="admin-waitlist-header-actions">
          <button type="button" onClick={() => loadLeads(adminKey)} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            type="button"
            className="admin-waitlist-ghost"
            onClick={() => {
              sessionStorage.removeItem(ADMIN_KEY_STORAGE);
              setAdminKey('');
              setLeads([]);
            }}
          >
            Lock console
          </button>
        </div>
      </header>

      {lastInviteLink && (
        <section className="admin-waitlist-invite-link">
          <span>Latest invite link</span>
          <code>{lastInviteLink}</code>
          <button type="button" onClick={() => copyInvite(lastInviteLink)}>Copy</button>
        </section>
      )}

      {error && <div className="admin-waitlist-error">{error}</div>}

      <section className="admin-waitlist-panel">
        <div className="admin-waitlist-tabs">
          {statusTabs.map((status) => (
            <button
              type="button"
              key={status}
              className={activeStatus === status ? 'active' : ''}
              onClick={() => setActiveStatus(status)}
            >
              {status}
              <span>{counts[status] || 0}</span>
            </button>
          ))}
        </div>

        <div className="admin-waitlist-table-wrap">
          <table className="admin-waitlist-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Organization</th>
                <th>Event size</th>
                <th>Upcoming event</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Invite expires</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <strong>{lead.firstName} {lead.lastName}</strong>
                    <span>{lead.email}</span>
                  </td>
                  <td>{lead.organizationName || '-'}</td>
                  <td>{lead.eventSize}</td>
                  <td>{formatDate(lead.upcomingEventAt)}</td>
                  <td><span className={`admin-waitlist-status ${lead.status}`}>{lead.status}</span></td>
                  <td>{formatDate(lead.createdAt)}</td>
                  <td>{formatDate(lead.inviteExpiresAt)}</td>
                  <td>
                    <div className="admin-waitlist-actions">
                      {lead.status !== 'accepted' && (
                        <button
                          type="button"
                          onClick={() => runLeadAction(lead.id, 'invite')}
                          disabled={Boolean(actionLoading)}
                        >
                          {actionLoading === `invite:${lead.id}` ? 'Inviting...' : lead.status === 'invited' ? 'Resend' : 'Invite'}
                        </button>
                      )}
                      {lead.status === 'invited' && (
                        <button
                          type="button"
                          className="neutral"
                          onClick={() => runLeadAction(lead.id, 'revoke')}
                          disabled={Boolean(actionLoading)}
                        >
                          Revoke
                        </button>
                      )}
                      {lead.status !== 'accepted' && lead.status !== 'rejected' && (
                        <button
                          type="button"
                          className="danger"
                          onClick={() => runLeadAction(lead.id, 'reject')}
                          disabled={Boolean(actionLoading)}
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredLeads.length && (
                <tr>
                  <td colSpan="8" className="admin-waitlist-empty">
                    {loading ? 'Loading waitlist leads...' : 'No leads found for this filter.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default AdminWaitlistPage;
