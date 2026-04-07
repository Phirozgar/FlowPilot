import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await api.post('/api/users/register/', {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        password2: formData.confirmPassword
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      const data = err.response?.data;
      let errMsg = 'Registration failed. Try again.';
      if (data) {
          if (data.message) {
              errMsg = data.message;
          } else if (typeof data === 'object') {
              // Parse DRF dict { field: [error_str] }
              const firstKey = Object.keys(data)[0];
              if (Array.isArray(data[firstKey])) {
                  errMsg = `${firstKey}: ${data[firstKey][0]}`;
              } else if (typeof data[firstKey] === 'string') {
                  errMsg = data[firstKey];
              }
          }
      }
      setError(errMsg);
      console.error(err);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div className="glass-panel" style={{ width: '400px', maxWidth: '90%' }}>
        <h2 style={{ textAlign: 'center', color: 'var(--accent-color)' }}>Join FlowPilot</h2>
        {success ? (
          <div style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--color-success)' }}>
            Registration successful! Redirecting to login...
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
            <div>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Username</label>
              <input 
                className="chat-input"
                style={{ width: '100%', marginTop: '0.4rem' }}
                value={formData.username} 
                onChange={(e) => setFormData({...formData, username: e.target.value})} 
                required 
              />
            </div>
            <div>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Email</label>
              <input 
                className="chat-input"
                style={{ width: '100%', marginTop: '0.4rem' }}
                type="email"
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})} 
                required 
              />
            </div>
            <div>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Password</label>
              <input 
                className="chat-input"
                style={{ width: '100%', marginTop: '0.4rem' }}
                type="password" 
                value={formData.password} 
                onChange={(e) => setFormData({...formData, password: e.target.value})} 
                required 
              />
            </div>
            <div>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Confirm Password</label>
              <input 
                className="chat-input"
                style={{ width: '100%', marginTop: '0.4rem' }}
                type="password" 
                value={formData.confirmPassword} 
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} 
                required 
              />
            </div>
            {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.9rem' }}>{error}</p>}
            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>Create Account</button>
            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem' }}>
              <Link to="/login" style={{ color: 'var(--accent-color)', textDecoration: 'none' }}>Already have an account? Login</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Register;
