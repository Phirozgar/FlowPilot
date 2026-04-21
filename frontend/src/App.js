import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ChatWidget from './components/communication/ChatWidget';
import Login from './pages/Login';
import Workflows from './pages/Workflows';
import CalendarView from './pages/CalendarView';
import Register from './pages/Register';
import CreateTask from './pages/CreateTask';
import Channels from './pages/Channels';
import TeamPage from './pages/TeamPage';
import Tickets from './pages/Tickets';
import TicketDetail from './pages/TicketDetail';
import ToastContainer, { toast } from './components/Toast';
import api from './api/api';
import './index.css';

export const AppContext = React.createContext({});

const ROLE_OPTIONS = [
  { value: 'intern', label: 'Intern' },
  { value: 'junior_dev', label: 'Junior Developer' },
  { value: 'senior_dev', label: 'Senior Developer' },
  { value: 'team_leader', label: 'Team Leader' },
  { value: 'superadmin', label: 'Superadmin' },
];

const NAV_ITEMS = [
  { path: '/', label: '🏠 Dashboard' },
  { path: '/tickets', label: '🎫 Tickets' },
  { path: '/workflows', label: '⚙️ Workflows' },
  { path: '/channels', label: '💬 Chats' },
  { path: '/calendar', label: '📅 Calendar' },
  { path: '/team', label: '👥 My Team' },
];

// ─── Sidebar ─────────────────────────────────────────────────────────────────
const Sidebar = () => {
  const location = useLocation();
  const path = location.pathname;

  return (
    <aside className="sidebar panel-blur animate-fade-in" style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      borderRight: '1px solid var(--border-color)', zIndex: 10,
    }}>
      <div style={{
        padding: '1.75rem 2rem', fontWeight: 800, fontSize: '1.6rem',
        color: 'var(--accent-color)', letterSpacing: '-0.05rem',
        borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem',
      }}>
        FlowPilot
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0 1rem', flex: 1 }}>
        {NAV_ITEMS.map(({ path: p, label }) => {
          const active = path === p || (p === '/tickets' && path.startsWith('/tickets'));
          return (
            <Link key={p} to={p} style={{
              display: 'flex', alignItems: 'center',
              padding: '0.65rem 1rem', borderRadius: 'var(--radius-sm)',
              textDecoration: 'none', fontWeight: active ? 700 : 500,
              fontSize: '0.9rem', transition: 'all 0.15s',
              background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: active ? 'var(--accent-color)' : 'var(--text-muted)',
              borderLeft: active ? '3px solid var(--accent-color)' : '3px solid transparent',
            }}>
              {label}
            </Link>
          );
        })}
      </nav>
      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', fontSize: '0.78rem', opacity: 0.3 }}>
        FlowPilot Enterprise v2.0
      </div>
    </aside>
  );
};

// ─── Team Switcher ────────────────────────────────────────────────────────────
const TeamSwitcher = ({ currentUser, onSwitch }) => {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinRole, setJoinRole] = useState('intern');
  const [showJoin, setShowJoin] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(false);
    window.addEventListener('closeDropdowns', handler);
    return () => window.removeEventListener('closeDropdowns', handler);
  }, []);

  const switchTeam = async (teamId) => {
    if (teamId === currentUser?.team) { setOpen(false); return; }
    setSwitching(true);
    try {
      const res = await api.post('/api/users/teams/switch/', { team_id: teamId });
      toast.success(`Switched to ${res.data.user.team_name}!`);
      onSwitch(res.data.user);
      setOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.detail || 'Failed to switch team.');
    } finally {
      setSwitching(false);
    }
  };

  const joinNewTeam = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) { toast.error('Please enter a team invite code.'); return; }
    setSwitching(true);
    try {
      const res = await api.post('/api/users/teams/join/', { code: joinCode.trim(), role: joinRole });
      toast.success(res.data.message || 'Join request submitted! Awaiting manager approval.');
      setJoinCode('');
      setJoinRole('intern');
      setShowJoin(false);
      setOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.detail || 'Invalid team code.');
    } finally {
      setSwitching(false);
    }
  };

  const leaveTeam = async (teamId, teamName, e) => {
    e.stopPropagation();
    if (!window.confirm(`Leave "${teamName}"? You'll need approval to rejoin.`)) return;
    setSwitching(true);
    try {
      const res = await api.post('/api/users/teams/leave/', { team_id: teamId });
      toast.success(res.data.message || `Left ${teamName}.`);
      onSwitch(res.data.user);
      setOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.detail || 'Failed to leave team.');
    } finally {
      setSwitching(false);
    }
  };

  const allTeams = currentUser?.all_teams || [];
  const activeTeamId = currentUser?.team;

  return (
    <div style={{ position: 'relative' }}>
      <button
        className="btn btn-secondary"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
      >
        <span>🔀</span>
        <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentUser?.team_name || 'No Team'}
        </span>
        <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>▾</span>
      </button>

      {open && (
        <div
          className="animate-fade-in"
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute', top: '44px', right: 0, width: '280px', zIndex: 9999,
            padding: '1rem', borderRadius: 'var(--radius-md)',
            background: 'rgba(15,17,21,0.99)',
            backdropFilter: 'blur(30px)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px', fontWeight: 600, marginBottom: '0.75rem' }}>
            Your Teams
          </div>

          {allTeams.length === 0 ? (
            <div style={{ opacity: 0.4, fontSize: '0.82rem', marginBottom: '0.75rem' }}>No teams yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem' }}>
              {allTeams.map(m => {
                const isActive = m.team_id === activeTeamId;
                return (
                  <div
                    key={m.team_id}
                    onClick={() => !switching && switchTeam(m.team_id)}
                    style={{
                      padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)',
                      cursor: isActive ? 'default' : 'pointer',
                      background: isActive ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                      border: isActive ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--border-color)',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => !isActive && (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                    onMouseLeave={e => !isActive && (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: isActive ? 'var(--accent-color)' : 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {isActive && '✓ '}{m.team_name}
                        </div>
                        <div style={{ fontSize: '0.68rem', opacity: 0.5, marginTop: '0.1rem' }}>
                          {m.role?.replace(/_/g, ' ')} · Code: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{m.team_code}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => leaveTeam(m.team_id, m.team_name, e)}
                        disabled={switching}
                        style={{
                          marginLeft: '0.5rem', padding: '0.15rem 0.4rem',
                          borderRadius: '4px', border: '1px solid rgba(239,68,68,0.35)',
                          background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                          cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.65rem', flexShrink: 0,
                        }}
                        title="Leave team"
                      >
                        Leave
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
            {!showJoin ? (
              <button
                className="btn btn-secondary"
                onClick={() => setShowJoin(true)}
                style={{ width: '100%', fontSize: '0.8rem' }}
              >
                + Join Another Team
              </button>
            ) : (
              <form onSubmit={joinNewTeam} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input
                  className="chat-input"
                  placeholder="Team invite code (e.g. ABC-123)…"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  required
                  style={{ fontSize: '0.82rem', padding: '0.45rem 0.75rem', textTransform: 'uppercase', fontFamily: 'monospace' }}
                />
                <select
                  className="chat-input"
                  value={joinRole}
                  onChange={e => setJoinRole(e.target.value)}
                  style={{ fontSize: '0.82rem', padding: '0.45rem 0.75rem' }}
                >
                  {ROLE_OPTIONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => { setShowJoin(false); setJoinCode(''); }}
                    style={{ flex: 1, fontSize: '0.78rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={switching}
                    style={{ flex: 1, fontSize: '0.78rem' }}
                  >
                    {switching ? '…' : 'Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Topbar ───────────────────────────────────────────────────────────────────
const Topbar = ({ searchQuery, setSearchQuery, currentUser, onUserUpdate }) => {
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const closeHandler = () => { setShowProfile(false); };
    window.addEventListener('closeDropdowns', closeHandler);
    return () => window.removeEventListener('closeDropdowns', closeHandler);
  }, []);

  const handleLogout = (e) => {
    e.stopPropagation();
    localStorage.removeItem('opsflow_token');
    window.location.href = '/login';
  };

  const getInitials = () => {
    if (!currentUser) return 'U';
    return (currentUser.first_name?.[0] || currentUser.username?.[0] || 'U').toUpperCase();
  };

  return (
    <header className="topbar" style={{
      display: 'flex', justifyContent: 'space-between', padding: '0 2rem',
      background: 'rgba(15,17,21,0.9)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border-color)', position: 'relative', zIndex: 50,
      height: '64px',
    }}>
      <div style={{ flex: 1, maxWidth: '500px', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search tickets, workflows, channels…"
          className="chat-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '0.55rem 1rem', borderRadius: '20px' }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {currentUser && <TeamSwitcher currentUser={currentUser} onSwitch={onUserUpdate} />}

        <button
          className="btn btn-primary"
          onClick={() => navigate('/add-task')}
          style={{ padding: '0.45rem 1.1rem', fontWeight: 700, fontSize: '0.85rem' }}
        >
          + New Ticket
        </button>

        <div style={{ position: 'relative' }}>
          <div
            onClick={(e) => { e.stopPropagation(); setShowProfile(!showProfile); window.dispatchEvent(new CustomEvent('closeDropdowns')); setShowProfile(p => !p); }}
            style={{
              cursor: 'pointer', background: 'var(--accent-color)',
              width: '36px', height: '36px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, color: 'white', fontSize: '0.9rem',
              boxShadow: '0 0 0 2px rgba(99,102,241,0.4)',
            }}
          >
            {getInitials()}
          </div>

          {showProfile && currentUser && (
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: 'fixed', top: '72px', right: '1.5rem',
                width: '290px', zIndex: 99999, padding: '1.5rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(15,17,21,0.99)',
                backdropFilter: 'blur(30px)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  background: 'var(--accent-color)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '1.1rem', color: 'white',
                }}>
                  {getInitials()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                    {currentUser.first_name
                      ? `${currentUser.first_name} ${currentUser.last_name || ''}`
                      : currentUser.username}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--accent-color)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
                    {currentUser.role?.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {[
                  ['Active Team', currentUser.team_name || 'No Team'],
                  ['Organisation', 'FlowPilot Inc'],
                  ...(currentUser.team_code ? [['Invite Code', currentUser.team_code]] : []),
                  ['Email', currentUser.email || '—'],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', gap: '0.5rem' }}>
                    <span style={{ opacity: 0.5, flexShrink: 0 }}>{label}</span>
                    <span style={{
                      fontWeight: 600, textAlign: 'right', wordBreak: 'break-all',
                      fontFamily: label === 'Invite Code' ? 'monospace' : 'inherit',
                      color: label === 'Invite Code' ? 'var(--accent-color)' : 'inherit',
                    }}>{val}</span>
                  </div>
                ))}
              </div>

              {(currentUser.all_teams || []).length > 1 && (
                <div style={{ marginBottom: '1rem', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(99,102,241,0.08)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Member of {currentUser.all_teams.length} teams · Use 🔀 to switch
                </div>
              )}

              <button className="btn btn-secondary" onClick={handleLogout} style={{ width: '100%', fontSize: '0.85rem' }}>
                Logout Securely
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

// ─── App Root ─────────────────────────────────────────────────────────────────
function App() {
  const [activeContextPane, setActiveContextPane] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!localStorage.getItem('opsflow_token');

  const refreshUser = useCallback(() => {
    api.get('/api/users/me/')
      .then(res => setCurrentUser(res.data))
      .catch(err => console.error('refreshUser failed:', err));
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      api.get('/api/users/me/')
        .then(res => { setCurrentUser(res.data); setLoading(false); })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const contextValue = {
    activeContextPane, setActiveContextPane,
    searchQuery, currentUser, refreshUser,
  };

  if (loading) return null;

  return (
    <AppContext.Provider value={contextValue}>
      <ToastContainer />
      <Router>
        <div
          className="app-container"
          style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
          onClick={() => window.dispatchEvent(new CustomEvent('closeDropdowns'))}
        >
          {isAuthenticated && <Sidebar />}

          <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
            {isAuthenticated && (
              <Topbar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                currentUser={currentUser}
                onUserUpdate={setCurrentUser}
              />
            )}

            <main className="content-area" style={{ flex: 1, padding: isAuthenticated ? '2rem 2.5rem' : '0', overflowY: 'auto' }}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
                <Route path="/tickets" element={isAuthenticated ? <Tickets /> : <Navigate to="/login" />} />
                <Route path="/tickets/:id" element={isAuthenticated ? <TicketDetail /> : <Navigate to="/login" />} />
                <Route path="/workflows" element={isAuthenticated ? <Workflows /> : <Navigate to="/login" />} />
                <Route path="/calendar" element={isAuthenticated ? <CalendarView /> : <Navigate to="/login" />} />
                <Route path="/add-task" element={isAuthenticated ? <CreateTask /> : <Navigate to="/login" />} />
                <Route path="/channels" element={isAuthenticated ? <Channels /> : <Navigate to="/login" />} />
                <Route path="/team" element={isAuthenticated ? <TeamPage /> : <Navigate to="/login" />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </div>

          {/* Slide-over Context Pane */}
          {activeContextPane && (
            <div className="glass-panel animate-fade-in" style={{
              width: '420px', height: '100vh', borderLeft: '1px solid var(--border-color)',
              borderRadius: 0, padding: 0, display: 'flex', flexDirection: 'column',
              background: 'rgba(15,17,21,0.97)', backdropFilter: 'blur(30px)',
              position: 'relative', zIndex: 20,
            }}>
              <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{activeContextPane.title}</h3>
                <button onClick={() => setActiveContextPane(null)} className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '1.1rem', fontWeight: 800 }}>
                  ×
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {activeContextPane.type === 'TASK_CHAT' && (
                  <ChatWidget contextPayload={activeContextPane.data} />
                )}
              </div>
            </div>
          )}
        </div>
      </Router>
    </AppContext.Provider>
  );
}

export default App;
