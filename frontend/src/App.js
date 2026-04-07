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
import api from './api/api';
import './index.css';

// Global Context for the user session
export const AppContext = React.createContext({});

const Sidebar = () => {
  const location = useLocation();
  const path = location.pathname;

  return (
    <aside className="sidebar panel-blur animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100vh', borderRight: '1px solid var(--border-color)', zIndex: 10 }}>
      <div style={{ padding: '2rem', fontWeight: 800, fontSize: '1.8rem', color: 'var(--accent-color)', letterSpacing: '-0.05rem', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem' }}>
        FlowPilot
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '1.5rem', flex: 1 }}>
        <Link to="/" className={`btn ${path === '/' ? 'btn-primary' : 'btn-secondary'}`} style={{ textAlign: 'left', fontWeight: 600 }}>🎛️ Task Board</Link>
        <Link to="/workflows" className={`btn ${path === '/workflows' ? 'btn-primary' : 'btn-secondary'}`} style={{ textAlign: 'left', fontWeight: 600 }}>⚙️ Workflows Engine</Link>
        <Link to="/channels" className={`btn ${path === '/channels' ? 'btn-primary' : 'btn-secondary'}`} style={{ textAlign: 'left', fontWeight: 600 }}>💬 Channels / Chats</Link>
        <Link to="/calendar" className={`btn ${path === '/calendar' ? 'btn-primary' : 'btn-secondary'}`} style={{ textAlign: 'left', fontWeight: 600 }}>📅 Calendar</Link>
      </nav>
      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', fontSize: '0.85rem', opacity: 0.4 }}>
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
     if(!currentUser) return 'U';
     return (currentUser.first_name?.[0] || currentUser.username?.[0] || 'U').toUpperCase();
  };

  return (
    <header className="topbar" style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 2rem', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border-color)', position: 'relative', zIndex: 50 }}>
      <div className="search-bar" style={{ flex: 1, maxWidth: '500px' }}>
         <input 
            type="text" 
            placeholder="Search tasks, blueprints, channels..." 
            className="chat-input" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 1rem' }}
         />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <button className="btn btn-primary" onClick={() => navigate('/add-task')} style={{ padding: '0.5rem 1.2rem', fontWeight: 700 }}>+ Create Task</button>
        
        <div style={{ position: 'relative' }}>
          <div 
             onClick={(e) => { e.stopPropagation(); setShowProfile(!showProfile); }}
             style={{ cursor: 'pointer', background: 'var(--accent-color)', width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white' }}>
            {getInitials()}
          </div>
          
          {showProfile && currentUser && (
             <div className="glass-panel animate-fade-in" style={{ position: 'absolute', top: '50px', right: '0', width: '250px', zIndex: 9999, padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.5rem' }}>{currentUser.first_name} {currentUser.last_name || currentUser.username}</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-color)', marginBottom: '1rem', textTransform: 'uppercase', fontWeight: 700 }}>
                   {currentUser.role?.replace('_', ' ')}
                </div>
                
                <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.4rem' }}>
                   <strong>Team:</strong> {currentUser.team_name || 'No Team Assigned'}
                </div>
                {currentUser.team_code && (
                   <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.4rem' }}>
                      <strong>Join Code:</strong> {currentUser.team_code}
                   </div>
                )}
                <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '1.5rem' }}>
                   <strong>Org:</strong> FlowPilot Inc
                </div>
                
                <button className="btn btn-secondary" onClick={handleLogout} style={{ width: '100%', fontSize: '0.85rem' }}>Logout Securely</button>
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
     if(isAuthenticated) {
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
      <Router>
        <div className="app-container" style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} onClick={() => {
             // Close profile popover globally if clicking outside
             const event = new CustomEvent('closeProfile');
             window.dispatchEvent(event);
        }}>
          {isAuthenticated && <Sidebar />}
          
          <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
            {isAuthenticated && <Topbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} currentUser={currentUser} />}
            
            <main className="content-area" style={{ flex: 1, padding: isAuthenticated ? '2.5rem' : '0', overflowY: 'auto' }}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
                <Route path="/workflows" element={isAuthenticated ? <Workflows /> : <Navigate to="/login" />} />
                <Route path="/calendar" element={isAuthenticated ? <CalendarView /> : <Navigate to="/login" />} />
                <Route path="/add-task" element={isAuthenticated ? <CreateTask /> : <Navigate to="/login" />} />
                <Route path="/channels" element={isAuthenticated ? <Channels /> : <Navigate to="/login" />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </div>
          
          {/* Slide-over Context Pane */}
          {activeContextPane && (
            <div className="glass-panel animate-fade-in" style={{ width: '450px', height: '100vh', borderLeft: '1px solid var(--border-color)', borderRadius: 0, padding: 0, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(30px)', position: 'relative', zIndex: 20 }}>
               <div style={{ padding: '2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>{activeContextPane.title}</h3>
                  <button onClick={() => setActiveContextPane(null)} className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '1.2rem', fontWeight: 800 }}>×</button>
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
