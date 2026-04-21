import React, { useEffect, useState, useContext, useCallback } from 'react';
import { AppContext } from '../App';
import { toast } from '../components/Toast';
import api from '../api/api';

const ROLE_LABELS = {
  superadmin: 'Superadmin',
  team_leader: 'Team Leader',
  senior_dev: 'Senior Developer',
  junior_dev: 'Junior Developer',
  intern: 'Intern',
};

const ROLE_COLORS = {
  superadmin: '#ef4444',
  team_leader: '#f59e0b',
  senior_dev: '#3b82f6',
  junior_dev: '#10b981',
  intern: '#94a3b8',
};

const ROLE_OPTIONS = [
  { value: 'intern', label: 'Intern' },
  { value: 'junior_dev', label: 'Junior Developer' },
  { value: 'senior_dev', label: 'Senior Developer' },
  { value: 'team_leader', label: 'Team Leader' },
  { value: 'superadmin', label: 'Superadmin' },
];

// ── Create Team Modal ─────────────────────────────────────────────────────────
const CreateTeamModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({ name: '', organization: 'FlowPilot Inc' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Team name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/api/users/teams/', form);
      toast.success(`Team "${res.data.name}" created! Invite Code: ${res.data.code}`);
      onCreated(res.data);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.detail
        || Object.values(err.response?.data || {})?.[0]?.[0]
        || 'Failed to create team.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }} onClick={onClose}>
      <div className="glass-panel" onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: '440px', padding: '2rem',
        background: 'rgba(26,29,36,0.98)', backdropFilter: 'blur(30px)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0 }}>Create New Team</h3>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '0.2rem 0.6rem' }}>×</button>
        </div>
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '0.65rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#ef4444' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Team Name *</label>
            <input
              className="chat-input"
              style={{ width: '100%' }}
              placeholder="e.g. Alpha Squad"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
            />
          </div>
          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Organization</label>
            <input
              className="chat-input"
              style={{ width: '100%' }}
              placeholder="e.g. FlowPilot Inc"
              value={form.organization}
              onChange={e => setForm({ ...form, organization: e.target.value })}
            />
          </div>
          <div style={{ padding: '0.75rem', background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            💡 You will be auto-added as <strong>Team Leader</strong>. Share the generated invite code with your team.
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
              {saving ? 'Creating...' : 'Create Team'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Join Team Panel ───────────────────────────────────────────────────────────
const JoinTeamPanel = ({ onJoined }) => {
  const [joinCode, setJoinCode] = useState('');
  const [role, setRole] = useState('intern');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) { toast.error('Please enter a team invite code.'); return; }
    setSubmitting(true);
    try {
      const res = await api.post('/api/users/teams/join/', { code: joinCode.trim(), role });
      toast.success(res.data.message || 'Join request submitted! Waiting for approval.');
      setJoinCode('');
      if (onJoined) onJoined();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.detail || 'Failed to submit join request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '3px solid var(--accent-color)' }}>
      <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.75rem', color: 'var(--accent-color)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Join Another Team
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '2 1 200px' }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Invite Code (ABC-123)</label>
          <input
            className="chat-input"
            placeholder="e.g. ZQX-847"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            required
            style={{ width: '100%', fontFamily: 'monospace', textTransform: 'uppercase' }}
          />
        </div>
        <div style={{ flex: '1 1 160px' }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>My Role in This Team</label>
          <select className="chat-input" value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%' }}>
            {ROLE_OPTIONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary" disabled={submitting} style={{ flexShrink: 0 }}>
          {submitting ? 'Submitting...' : 'Request to Join'}
        </button>
      </form>
    </div>
  );
};

// ── TeamPage ──────────────────────────────────────────────────────────────────
const TeamPage = () => {
  const { currentUser, refreshUser } = useContext(AppContext);
  const [members, setMembers] = useState([]);
  const [allMyTeams, setAllMyTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [leavingTeamId, setLeavingTeamId] = useState(null);

  const canCreateTeam = ['superadmin', 'team_leader', 'senior_dev'].includes(currentUser?.role)
    || currentUser?.is_superuser;

  /**
   * Fetch members of the active team from the team memberships endpoint.
   * This is more reliable than filtering /api/users/ because it uses
   * UserTeamMembership records (updated on approval).
   */
  const fetchMembers = useCallback(async () => {
    if (!currentUser?.team) {
      setMembers([]);
      return;
    }
    try {
      // Use the users list filtered by team membership
      const res = await api.get('/api/users/');
      const allUsers = res.data.results || res.data;
      // Match on team ID (integer comparison)
      // Match on team ID within their memberships list
      const activeTeamId = Number(currentUser.team);
      const teamMembers = allUsers
        .filter(u => u.all_teams?.some(m => Number(m.team_id) === activeTeamId))
        .map(u => {
          // Attach the specific role for this team so it displays correctly
          const membership = u.all_teams.find(m => Number(m.team_id) === activeTeamId);
          return { ...u, displayRole: membership?.role || u.role };
        });
      setMembers(teamMembers);
    } catch (err) {
      toast.error('Failed to fetch team members.');
      console.error('fetchMembers error:', err);
    }
  }, [currentUser?.team]);

  const fetchMyTeams = useCallback(async () => {
    try {
      const res = await api.get('/api/users/teams/my_teams/');
      setAllMyTeams(res.data);
    } catch (err) {
      console.error('Failed to fetch my teams:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    fetchMembers();
    fetchMyTeams();
    if (refreshUser) refreshUser();
  }, [fetchMembers, fetchMyTeams, refreshUser]);

  useEffect(() => {
    if (currentUser) {
      fetchMembers();
      fetchMyTeams();
    }
  }, [currentUser, fetchMembers, fetchMyTeams]);

  const handleLeaveTeam = async (teamId, teamName) => {
    if (!window.confirm(`Are you sure you want to leave "${teamName}"? You will need to request to rejoin.`)) return;
    setLeavingTeamId(teamId);
    try {
      const res = await api.post('/api/users/teams/leave/', { team_id: teamId });
      toast.success(res.data.message || `Left ${teamName}.`);
      // Update local user from response
      if (refreshUser) refreshUser();
      setTimeout(() => { fetchMyTeams(); fetchMembers(); }, 300);
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.detail || 'Failed to leave team.');
    } finally {
      setLeavingTeamId(null);
    }
  };

  const handleSwitchTeam = async (teamId) => {
    if (Number(teamId) === Number(currentUser?.team)) return;
    try {
      const res = await api.post('/api/users/teams/switch/', { team_id: teamId });
      toast.success(`Switched to ${res.data.user.team_name}`);
      if (refreshUser) refreshUser();
      setTimeout(() => fetchMembers(), 300);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to switch team.');
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading team roster...</div>;

  const activeTeamId = Number(currentUser?.team);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {showCreateModal && (
        <CreateTeamModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setTimeout(refresh, 300); }}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>{currentUser?.team_name || 'My Team'}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {members.length} active member{members.length !== 1 ? 's' : ''}
            {currentUser?.team_code && (
              <> · Invite Code: <span style={{ color: 'var(--accent-color)', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.95rem' }}>{currentUser.team_code}</span></>
            )}
          </p>
        </div>
        {canCreateTeam && (
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            + Create New Team
          </button>
        )}
      </div>

      {/* All My Teams with switch/leave */}
      {allMyTeams.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>
            Your Teams ({allMyTeams.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {allMyTeams.map(m => {
              const isActive = Number(m.team_id) === activeTeamId;
              return (
                <div
                  key={m.team_id}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.7rem 0.9rem', borderRadius: 'var(--radius-sm)',
                    background: isActive ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isActive ? 'rgba(99,102,241,0.3)' : 'var(--border-color)'}`,
                    flexWrap: 'wrap', gap: '0.5rem',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: isActive ? 'var(--accent-color)' : 'var(--text-main)' }}>
                      {isActive && '✓ '}{m.team_name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {ROLE_LABELS[m.role] || m.role} · <span style={{ fontFamily: 'monospace', color: 'var(--accent-color)' }}>{m.team_code}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    {!isActive && (
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '0.78rem', padding: '0.3rem 0.7rem' }}
                        onClick={() => handleSwitchTeam(m.team_id)}
                      >
                        Switch
                      </button>
                    )}
                    <button
                      style={{
                        fontSize: '0.78rem', padding: '0.3rem 0.7rem',
                        borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239,68,68,0.4)',
                        background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                        cursor: 'pointer', fontFamily: 'inherit',
                        opacity: leavingTeamId === m.team_id ? 0.5 : 1,
                      }}
                      disabled={leavingTeamId === m.team_id}
                      onClick={() => handleLeaveTeam(m.team_id, m.team_name)}
                    >
                      {leavingTeamId === m.team_id ? 'Leaving...' : 'Leave'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active team members */}
      {currentUser?.team ? (
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>
            Members of {currentUser.team_name}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {members.length === 0 ? (
              <div style={{ opacity: 0.4, fontSize: '0.85rem', padding: '2rem', gridColumn: '1/-1' }}>
                No members found. (If you just approved a join request, it may take a moment to refresh.)
              </div>
            ) : (
              members.map(member => {
                const initials = (member.first_name?.[0] || member.username?.[0] || '?').toUpperCase();
                const roleColor = ROLE_COLORS[member.displayRole] || '#94a3b8';
                const isYou = member.id === currentUser.id;

                return (
                  <div key={member.id} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{
                        width: '48px', height: '48px', borderRadius: '50%',
                        background: `linear-gradient(135deg, ${roleColor}40, ${roleColor}20)`,
                        border: `2px solid ${roleColor}60`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '1.1rem', color: roleColor,
                      }}>
                        {initials}
                      </div>
                      {isYou && (
                        <div style={{
                          position: 'absolute', bottom: '1px', right: '1px',
                          width: '12px', height: '12px', borderRadius: '50%',
                          background: 'var(--color-success)', border: '2px solid var(--bg-secondary)',
                        }} />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                        {member.first_name || member.username}
                        {member.last_name ? ` ${member.last_name}` : ''}
                        {isYou && <span style={{ fontSize: '0.7rem', opacity: 0.5, marginLeft: '0.4rem' }}>(You)</span>}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: roleColor, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '0.1rem' }}>
                        {ROLE_LABELS[member.displayRole] || member.displayRole}
                      </div>
                      {member.email && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {member.email}
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
                      {isYou
                        ? <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>● Online</span>
                        : <span style={{ opacity: 0.4 }}>–</span>
                      }
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {/* Manual refresh button */}
          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" style={{ fontSize: '0.78rem' }} onClick={fetchMembers}>
              ↻ Refresh Members
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
          <h3>No Active Team</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            You're not currently in any team. Join one below or create a new team.
          </p>
        </div>
      )}

      {/* Join new team panel */}
      <JoinTeamPanel onJoined={() => { fetchMyTeams(); if (refreshUser) refreshUser(); }} />
    </div>
  );
};

export default TeamPage;
