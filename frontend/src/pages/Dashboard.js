import React, { useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { toast } from '../components/Toast';
import api from '../api/api';

const PRIORITY_COLOR = { low: '#64748b', medium: '#3b82f6', high: '#f59e0b', critical: '#ef4444' };
const STATUS_COLOR = { open: '#3b82f6', in_review: '#f59e0b', closed: '#10b981', rejected: '#ef4444' };
const STATUS_LABEL = { open: 'Open', in_review: 'In Review', closed: 'Closed', rejected: 'Rejected' };

const ROLE_OPTIONS = [
  { value: 'intern', label: 'Intern' },
  { value: 'junior_dev', label: 'Junior Developer' },
  { value: 'senior_dev', label: 'Senior Developer' },
  { value: 'team_leader', label: 'Team Leader' },
  { value: 'superadmin', label: 'Superadmin' },
];

const StatCard = ({ label, value, sub, accent }) => (
  <div className="glass-panel" style={{
    padding: '1.4rem 1.6rem', display: 'flex', flexDirection: 'column', gap: '0.3rem',
    borderLeft: `3px solid ${accent}`,
  }}>
    <div style={{ fontSize: '2rem', fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</div>
    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</div>
    {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub}</div>}
  </div>
);

// ── Join Request Notification Banner ────────────────────────────────────────
const JoinRequestBanner = ({ requests, onAction }) => {
  if (!requests.length) return null;
  return (
    <div className="glass-panel" style={{
      borderLeft: '3px solid #f59e0b', padding: '1rem 1.25rem',
      display: 'flex', flexDirection: 'column', gap: '0.75rem',
    }}>
      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        🔔 Pending Team Join Requests ({requests.length})
      </div>
      {requests.map(req => (
        <div key={req.id} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-sm)',
          background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
          flexWrap: 'wrap', gap: '0.5rem',
        }}>
          <div>
            <span style={{ fontWeight: 700 }}>{req.first_name || req.username}</span>
            {req.first_name && <span style={{ opacity: 0.6, fontSize: '0.8rem' }}> ({req.username})</span>}
            <span style={{ opacity: 0.7, fontSize: '0.82rem' }}> wants to join as </span>
            <span style={{ fontWeight: 600, color: '#f59e0b' }}>{req.requested_role?.replace(/_/g, ' ')}</span>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              Team: {req.team_name}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <button
              className="btn btn-primary"
              style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
              onClick={() => onAction(req.id, 'approve')}
            >
              ✓ Approve
            </button>
            <button
              style={{
                padding: '0.35rem 0.85rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)',
                border: '1px solid #ef444450', background: 'rgba(239,68,68,0.08)',
                color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit',
              }}
              onClick={() => onAction(req.id, 'reject')}
            >
              ✗ Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Join Team Form ──────────────────────────────────────────────────────────
const JoinTeamForm = ({ onJoined }) => {
  const [joinCode, setJoinCode] = useState('');
  const [role, setRole] = useState('intern');
  const [submitting, setSubmitting] = useState(false);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      toast.error('Please enter a team invite code.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/api/users/teams/join/', { code: joinCode.trim(), role });
      toast.success(res.data.message || 'Join request submitted! Waiting for manager approval.');
      setJoinCode('');
      if (onJoined) onJoined();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to submit join request.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '460px', width: '100%', padding: '2.5rem', textAlign: 'center' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🚀</div>
      <h2 style={{ color: 'var(--accent-color)', marginBottom: '0.5rem' }}>Welcome to FlowPilot</h2>
      <p style={{ opacity: 0.7, fontSize: '0.9rem', marginBottom: '2rem' }}>
        Join a team to get started. Your request will be reviewed by a Team Leader.
      </p>
      <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left' }}>
        <div>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
            Team Invite Code
          </label>
          <input
            className="chat-input"
            placeholder="Enter the code from your Team Leader"
            required
            value={joinCode}
            onChange={e => setJoinCode(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
            Your Role in this Team
          </label>
          <select
            className="chat-input"
            value={role}
            onChange={e => setRole(e.target.value)}
            style={{ width: '100%' }}
          >
            {ROLE_OPTIONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Request to Join Team'}
        </button>
      </form>
    </div>
  );
};

const Dashboard = () => {
  const { currentUser, refreshUser } = useContext(AppContext);
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [awaitingMe, setAwaitingMe] = useState([]);
  const [recentTickets, setRecentTickets] = useState([]);
  const [todayMeetings, setTodayMeetings] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const isLeader = currentUser?.role === 'team_leader' || currentUser?.role === 'superadmin' || currentUser?.is_superuser;

  const fetchAll = useCallback(async () => {
    try {
      const requests = [
        api.get('/api/tasks/dashboard/'),
        api.get('/api/tasks/awaiting_my_review/'),
        api.get('/api/tasks/?ordering=-created_at'),
        api.get('/api/calendar/events/today/'),
      ];

      if (isLeader) {
        requests.push(api.get('/api/users/teams/pending_requests/'));
      }

      const results = await Promise.allSettled(requests);

      if (results[0].status === 'fulfilled') setStats(results[0].value.data);
      if (results[1].status === 'fulfilled') {
        const d = results[1].value.data;
        setAwaitingMe(d.results || d);
      }
      if (results[2].status === 'fulfilled') {
        const d = results[2].value.data;
        setRecentTickets((d.results || d).slice(0, 6));
      }
      if (results[3].status === 'fulfilled') {
        setTodayMeetings(results[3].value.data);
      }
      if (isLeader && results[4] && results[4].status === 'fulfilled') {
        setJoinRequests(results[4].value.data);
      }
    } catch (err) {
      console.error('Dashboard fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, [isLeader]);

  useEffect(() => {
    if (!currentUser) return;
    // Issue 2: include currentUser.team so dashboard reloads on team switch
    setLoading(true);
    fetchAll();
    const iv = setInterval(fetchAll, 15000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.team, fetchAll]);

  const handleJoinRequestAction = async (requestId, action) => {
    try {
      const endpoint = action === 'approve'
        ? '/api/users/teams/approve_request/'
        : '/api/users/teams/reject_request/';
      const res = await api.post(endpoint, { request_id: requestId });
      toast.success(res.data.message || `Request ${action}d.`);
      // Refresh join requests list
      setJoinRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || `Failed to ${action} request.`;
      toast.error(msg);
    }
  };

  if (loading || !currentUser) return (
    <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading...</div>
  );

  // User has no team and isn't superadmin
  if (!currentUser.team && currentUser.role !== 'superadmin') {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <JoinTeamForm onJoined={refreshUser} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontWeight: 800 }}>
          {currentUser.first_name ? `Good day, ${currentUser.first_name}` : `Good day, ${currentUser.username}`}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          {currentUser.team_name} · {currentUser.role?.replace(/_/g, ' ')}
        </p>
      </div>

      {/* Join Request Notifications for leaders */}
      {isLeader && joinRequests.length > 0 && (
        <JoinRequestBanner requests={joinRequests} onAction={handleJoinRequestAction} />
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
        <StatCard label="Open Tickets" value={stats?.total_tasks ?? '—'} sub="Visible to you" accent="#3b82f6" />
        <StatCard label="Awaiting Your Review" value={awaitingMe.length} sub="Needs your approval" accent="#f59e0b" />
        <StatCard label="Closed Tickets" value={stats?.approved_tasks ?? '—'} sub="Resolved" accent="#10b981" />
        <StatCard
          label="Today's Meetings"
          value={todayMeetings.length}
          sub={todayMeetings[0]?.title || 'None scheduled'}
          accent="#8b5cf6"
        />
        {isLeader && (
          <StatCard
            label="Join Requests"
            value={joinRequests.length}
            sub={joinRequests.length > 0 ? 'Awaiting approval' : 'All clear'}
            accent="#f59e0b"
          />
        )}
      </div>

      {/* Awaiting review + Today meetings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Awaiting review */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Awaiting Your Approval
          </div>
          {awaitingMe.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', opacity: 0.5 }}>
              No tickets waiting for your review.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {awaitingMe.slice(0, 5).map(t => (
                <div key={t.id} onClick={() => navigate(`/tickets/${t.id}`)} style={{
                  padding: '0.7rem 0.9rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{t.ticket_number} · by {t.created_by_name || t.created_by_username}</div>
                  </div>
                  <span style={{ fontSize: '0.7rem', background: `${PRIORITY_COLOR[t.priority]}20`, color: PRIORITY_COLOR[t.priority], padding: '0.2rem 0.5rem', borderRadius: '8px', fontWeight: 700, flexShrink: 0 }}>
                    {t.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's meetings */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Today's Schedule
          </div>
          {todayMeetings.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', opacity: 0.5 }}>
              No events scheduled for today.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {todayMeetings.map(e => (
                <div key={e.id} style={{
                  padding: '0.7rem 0.9rem', borderRadius: 'var(--radius-sm)',
                  background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
                }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{e.title}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    {new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                    {new Date(e.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {e.description && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', opacity: 0.7 }}>
                      {e.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* My Tickets section */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            My Tickets
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/tickets')} style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}>
            View all
          </button>
        </div>
        {recentTickets.length === 0 ? (
          <div style={{ opacity: 0.4, fontSize: '0.85rem', textAlign: 'center', paddingTop: '1rem' }}>No tickets yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
            {recentTickets.map(t => (
              <div key={t.id} onClick={() => navigate(`/tickets/${t.id}`)} style={{
                padding: '0.9rem 1rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)',
                transition: 'border-color 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{t.ticket_number}</span>
                  <span style={{ fontSize: '0.68rem', background: `${STATUS_COLOR[t.status]}18`, color: STATUS_COLOR[t.status], padding: '0.1rem 0.45rem', borderRadius: '8px', fontWeight: 700 }}>
                    {STATUS_LABEL[t.status] || t.status}
                  </span>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', lineHeight: 1.3 }}>{t.title}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  {t.created_by_name || t.created_by_username}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
