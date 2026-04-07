import React, { useEffect, useState, useContext } from 'react';
import { AppContext } from '../App';
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

const TeamPage = () => {
  const { currentUser } = useContext(AppContext);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const res = await api.get('/api/users/');
        let users = res.data.results || res.data;
        // Filter to same team
        if (currentUser?.team) {
          users = users.filter(u => u.team === currentUser.team);
        }
        setMembers(users);
      } catch (err) {
        console.error('Failed to fetch team members', err);
      } finally {
        setLoading(false);
      }
    };
    if (currentUser) fetchTeamMembers();
  }, [currentUser]);

  if (loading) return <div style={{ padding: '2rem' }}>Loading team roster...</div>;

  if (!currentUser?.team) {
    return (
      <div className="animate-fade-in" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-panel" style={{ maxWidth: '400px', textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
          <h2>No Team Yet</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Join a team from the Dashboard to see your teammates here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ height: '100%' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1>{currentUser.team_name || 'My Team'}</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          {members.length} member{members.length !== 1 ? 's' : ''} · Team Code: <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>{currentUser.team_code}</span>
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {members.map(member => {
          const initials = (member.first_name?.[0] || member.username[0]).toUpperCase();
          const roleColor = ROLE_COLORS[member.role] || '#94a3b8';
          const isOnline = member.id === currentUser.id;

          return (
            <div key={member.id} className="glass-panel glassy-hover" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: '50px', height: '50px', borderRadius: '50%',
                  background: `linear-gradient(135deg, ${roleColor}40, ${roleColor}20)`,
                  border: `2px solid ${roleColor}60`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '1.1rem', color: roleColor
                }}>
                  {initials}
                </div>
                {isOnline && (
                  <div style={{
                    position: 'absolute', bottom: '1px', right: '1px',
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: 'var(--color-success)',
                    border: '2px solid var(--bg-secondary)'
                  }} />
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                  {member.first_name || member.username}
                  {member.last_name ? ` ${member.last_name}` : ''}
                  {member.id === currentUser.id && <span style={{ fontSize: '0.7rem', opacity: 0.5, marginLeft: '0.5rem' }}>(You)</span>}
                </div>
                <div style={{ fontSize: '0.78rem', color: roleColor, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '0.15rem' }}>
                  {ROLE_LABELS[member.role] || member.role}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {member.email}
                </div>
              </div>

              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
                {isOnline ? (
                  <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>● Online</span>
                ) : (
                  <span style={{ opacity: 0.5 }}>Offline</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TeamPage;
