import React, { useEffect, useState } from 'react';
import api from '../api/api';

const Dashboard = () => {
  const [stats, setStats] = useState({ total_tasks: 0, pending_tasks: 0, approved_tasks: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/api/dashboard/');
        setStats(response.data);
      } catch (err) {
        setError('Could not load dashboard.');
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="page">
      <h2>Dashboard</h2>
      {error && <p className="error">{error}</p>}
      <div className="card-row">
        <div className="card">Total Tasks: {stats.total_tasks}</div>
        <div className="card">Pending: {stats.pending_tasks}</div>
        <div className="card">Approved: {stats.approved_tasks}</div>
      </div>
    </div>
  );
};

export default Dashboard;
