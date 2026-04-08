import React, { useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { toast } from '../components/Toast';
import api from '../api/api';

const PRIORITY_COLOR = { low: '#64748b', medium: '#3b82f6', high: '#f59e0b', critical: '#ef4444' };

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

const Dashboard = () => {
  const { currentUser } = useContext(AppContext);
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [awaitingMe, setAwaitingMe] = useState([]);
  const [recentTickets, setRecentTickets] = useState([]);
  const [todayMeetings, setTodayMeetings] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [statsRes, awaitRes, ticketsRes, calRes, channelRes] = await Promise.all([
        api.get('/api/tasks/dashboard/'),
        api.get('/api/tasks/awaiting_my_review/'),
        api.get('/api/tasks/?ordering=-created_at'),
        api.get('/api/calendar/events/'),
        api.get('/api/chat/channels/'),
      ]);

      setStats(statsRes.data);
      setAwaitingMe(awaitRes.data.results || awaitRes.data);
      setRecentTickets((ticketsRes.data.results || ticketsRes.data).slice(0, 6));

      const today = new Date().toISOString().slice(0, 10);
      const events = calRes.data.results || calRes.data;
      setTodayMeetings(events.filter(e => e.start_time?.startsWith(today)));

      // Count channels with messages
      const channels = channelRes.data.results || channelRes.data;
      setUnreadCount(channels.filter(c => (c.recent_messages || []).length > 0).length);
    } catch (err) {
      console.error('Dashboard fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    if (!currentUser.team && currentUser.role !== 'superadmin') { setLoading(false); return; }
    fetchAll();
    const iv = setInterval(fetchAll, 15000);
    return () => clearInterval(iv);
  }, [currentUser, fetchAll]);

  const handleJoinTeam = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/users/teams/join/', { code: joinCode });
      toast.success('Joined team!');
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid team code.');
    }
  };

  if (loading || !currentUser) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading...</div>;

  if (!currentUser.team && currentUser.role !== 'superadmin') {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-panel" style={{ maxWidth: '400px', width: '100%', padding: '2.5rem', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--accent-color)', marginBottom: '0.5rem' }}>Welcome to FlowPilot</h2>
          <p style={{ opacity: 0.7, fontSize: '0.9rem', marginBottom: '2rem' }}>
            You are not yet part of a team. Get an invite code from your Team Leader.
          </p>
          <form onSubmit={handleJoinTeam} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input className="chat-input" placeholder="Team invite code" required value={joinCode}
              onChange={e => setJoinCode(e.target.value)} style={{ textAlign: 'center' }} />
            <button type="submit" className="btn btn-primary">Join Team</button>
          </form>
        </div>
      </div>
    );
  }

  const STATUS_COLOR = { open: '#3b82f6', in_review: '#f59e0b', closed: '#10b981', rejected: '#ef4444' };
  const STATUS_LABEL = { open: 'Open', in_review: 'In Review', closed: 'Closed', rejected: 'Rejected' };

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontWeight: 800 }}>
          {currentUser.first_name ? `Good day, ${currentUser.first_name}` : `Good day, ${currentUser.username}`}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          {currentUser.team_name} · {currentUser.role?.replace(/_/g, ' ')}
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
        <StatCard label="Open Tickets" value={stats?.total_tasks ?? '—'} sub="Visible to you" accent="#3b82f6" />
        <StatCard label="Awaiting Your Review" value={awaitingMe.length} sub="Needs your approval" accent="#f59e0b" />
        <StatCard label="Closed Tickets" value={stats?.approved_tasks ?? '—'} sub="Resolved" accent="#10b981" />
        <StatCard label="Today's Meetings" value={todayMeetings.length} sub={todayMeetings[0]?.title || 'None scheduled'} accent="#8b5cf6" />
        <StatCard label="Active Conversations" value={unreadCount} sub="Channels with activity" accent="#6366f1" />
      </div>

      {/* Awaiting review + Today meetings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', minHeight: 0 }}>

        {/* Awaiting review */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Awaiting Your Approval
          </div>
          {awaitingMe.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', opacity: 0.5, flex: 1, display: 'flex', alignItems: 'center' }}>No tickets waiting for your review.</div>
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
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', opacity: 0.5, flex: 1, display: 'flex', alignItems: 'center' }}>No events scheduled for today.</div>
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent team tickets */}
      <div className="glass-panel" style={{ padding: '1.25rem', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Recent Tickets
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/tickets')} style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}>
            View all
          </button>
        </div>
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
        {recentTickets.length === 0 && (
          <div style={{ opacity: 0.4, fontSize: '0.85rem', textAlign: 'center', paddingTop: '1rem' }}>No tickets yet.</div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
