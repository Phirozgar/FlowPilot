import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';

const Login = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      // FlowPilot token endpoint
      const response = await api.post('/api/auth/token/', { username, password });
      const token = response.data.access;
      if (!token) throw new Error('No token returned');

      localStorage.setItem('opsflow_token', token);
      window.location.href = '/'; // Refresh entire app context
    } catch (err) {
      setError('Login failed. Check credentials.');
      console.error(err);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div className="glass-panel" style={{ width: '400px', maxWidth: '90%' }}>
        <h2 style={{ textAlign: 'center', color: 'var(--accent-color)' }}>FlowPilot Login</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
          <div>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Username</label>
            <input 
              className="chat-input"
              style={{ width: '100%', marginTop: '0.4rem' }}
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Password</label>
            <input 
              className="chat-input"
              style={{ width: '100%', marginTop: '0.4rem' }}
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.9rem' }}>{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>Enter Workspace</button>
          <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem' }}>
            <Link to="/register" style={{ color: 'var(--accent-color)', textDecoration: 'none' }}>Need an account? Sign up</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
