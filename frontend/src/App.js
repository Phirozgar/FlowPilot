import React, { useState, useEffect } from 'react';
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
import ToastContainer, { toast } from './components/Toast';
import api from './api/api';
import './index.css';

// Global Context for the user session
export const AppContext = React.createContext({});

const NAV_ITEMS = [
  { path: '/', icon: '🎛️', label: 'Task Board' },
  { path: '/workflows', icon: '⚙️', label: 'Workflows' },
  { path: '/channels', icon: '💬', label: 'Chats' },
  { path: '/calendar', icon: '📅', label: 'Calendar' },
  { path: '/team', icon: '👥', label: 'My Team' },
];

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
        {NAV_ITEMS.map(({ path: p, icon, label }) => {
          const active = path === p;
          return (
            <Link
              key={p}
              to={p}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.65rem 1rem', borderRadius: 'var(--radius-sm)',
                textDecoration: 'none', fontWeight: active ? 700 : 500,
                fontSize: '0.9rem', transition: 'all 0.15s',
                background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: active ? 'var(--accent-color)' : 'var(--text-muted)',
                borderLeft: active ? '3px solid var(--accent-color)' : '3px solid transparent',
              }}
            >
              <span style={{ fontSize: '1rem' }}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>
      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', fontSize: '0.78rem', opacity: 0.3 }}>
        FlowPilot Enterprise v1.0
      </div>
    </aside>
  );
};

const Topbar = ({ searchQuery, setSearchQuery, currentUser }) => {
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const closeHandler = () => setShowProfile(false);
    window.addEventListener('closeProfile', closeHandler);
    return () => window.removeEventListener('closeProfile', closeHandler);
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
      background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border-color)', position: 'relative', zIndex: 50,
    }}>
      <div style={{ flex: 1, maxWidth: '500px', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search tasks, workflows, channels…"
          className="chat-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '0.55rem 1rem', borderRadius: '20px' }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/add-task')}
          style={{ padding: '0.5rem 1.2rem', fontWeight: 700, fontSize: '0.85rem' }}
        >
          + Create Task
        </button>

        <div style={{ position: 'relative' }}>
          <div
            onClick={(e) => { e.stopPropagation(); setShowProfile(!showProfile); }}
            style={{
              cursor: 'pointer', background: 'var(--accent-color)',
              width: '36px', height: '36px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, color: 'white', fontSize: '0.9rem',
              boxShadow: '0 0 0 2px rgba(99,102,241,0.3)',
            }}
          >
            {getInitials()}
          </div>

          {showProfile && currentUser && (
            <div
              className="glass-panel animate-fade-in"
              onClick={e => e.stopPropagation()}
              style={{
                position: 'absolute', top: '48px', right: '0',
                width: '260px', zIndex: 9999, padding: '1.5rem',
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
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-color)', textTransform: 'uppercase', fontWeight: 600 }}>
                    {currentUser.role?.replace('_', ' ')}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
                {[
                  ['Team', currentUser.team_name || 'No Team'],
                  ['Org', 'FlowPilot Inc'],
                  ...(currentUser.team_code ? [['Join Code', currentUser.team_code]] : []),
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ opacity: 0.5 }}>{label}</span>
                    <span style={{ fontWeight: 600 }}>{val}</span>
                  </div>
                ))}
              </div>

              <button
                className="btn btn-secondary"
                onClick={handleLogout}
                style={{ width: '100%', fontSize: '0.85rem' }}
              >
                Logout Securely
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

function App() {
  const [activeContextPane, setActiveContextPane] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!localStorage.getItem('opsflow_token');

  useEffect(() => {
    if (isAuthenticated) {
      api.get('/api/users/me/').then(res => {
        setCurrentUser(res.data);
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const contextValue = { activeContextPane, setActiveContextPane, searchQuery, currentUser };

  if (loading) return null;

  return (
    <AppContext.Provider value={contextValue}>
      {/* Toast is always rendered at root level */}
      <ToastContainer />

      <Router>
        <div
          className="app-container"
          style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          onClick={() => window.dispatchEvent(new CustomEvent('closeProfile'))}
        >
          {isAuthenticated && <Sidebar />}

          <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
            {isAuthenticated && (
              <Topbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} currentUser={currentUser} />
            )}

            <main className="content-area" style={{ flex: 1, padding: isAuthenticated ? '2rem 2.5rem' : '0', overflowY: 'auto' }}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
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
            <div
              className="glass-panel animate-fade-in"
              style={{
                width: '420px', height: '100vh', borderLeft: '1px solid var(--border-color)',
                borderRadius: 0, padding: 0, display: 'flex', flexDirection: 'column',
                background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(30px)',
                position: 'relative', zIndex: 20,
              }}
            >
              <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{activeContextPane.title}</h3>
                <button
                  onClick={() => setActiveContextPane(null)}
                  className="btn btn-secondary"
                  style={{ padding: '0.2rem 0.6rem', fontSize: '1.1rem', fontWeight: 800 }}
                >
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
