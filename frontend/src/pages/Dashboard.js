import React, { useContext, useEffect, useState, useCallback } from 'react';
import { AppContext } from '../App';
import { toast } from '../components/Toast';
import api from '../api/api';

const Dashboard = () => {
  const { setActiveContextPane, searchQuery, currentUser } = useContext(AppContext);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get('/api/tasks/');
      const data = res.data.results || res.data;
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    if (!currentUser.team && currentUser.role !== 'superadmin') {
      setLoading(false);
      return;
    }
    fetchTasks();
    const interval = setInterval(fetchTasks, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [currentUser, fetchTasks]);

  const handleApprove = async (e, taskId) => {
    e.stopPropagation();
    try {
      await api.post(`/api/tasks/${taskId}/approve/`);
      toast.success('Task approved!');
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Approval failed.');
    }
  };

  const handleJoinTeam = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/users/teams/join/', { code: joinCode });
      toast.success('Successfully joined team!');
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to join team. Check the code.');
    }
  };

  const openTaskContext = (task) => {
    setActiveContextPane({
      title: `Task: ${task.title}`,
      type: 'TASK_CHAT',
      data: { rawInst: { task_details: task } }
    });
  };

  const safeQuery = (searchQuery || '').toLowerCase();
  const filtered = tasks.filter(t =>
    (t.title || '').toLowerCase().includes(safeQuery) ||
    (t.status || '').toLowerCase().includes(safeQuery)
  );

  const pending = filtered.filter(t => t.status === 'pending');
  const inReview = filtered.filter(t => t.status === 'in_review');
  const approved = filtered.filter(t => t.status === 'approved');
  const rejected = filtered.filter(t => t.status === 'rejected');

  if (loading || !currentUser) return <div style={{ padding: '2rem' }}>Loading task board...</div>;

  if (!currentUser.team && currentUser.role !== 'superadmin') {
    return (
      <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-panel" style={{ maxWidth: '420px', width: '100%', textAlign: 'center', padding: '2.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚀</div>
          <h2 style={{ color: 'var(--accent-color)', marginBottom: '0.5rem' }}>Welcome to FlowPilot</h2>
          <p style={{ opacity: 0.7, fontSize: '0.9rem', marginBottom: '2rem' }}>
            You're not in a team yet. Enter the invite code from your Team Leader to get started.
          </p>
          <form onSubmit={handleJoinTeam} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              className="chat-input"
              placeholder="Team Access Code (e.g. ENG-101)"
              required
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              style={{ textAlign: 'center', fontSize: '1rem', padding: '0.8rem' }}
            />
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.8rem' }}>
              Join Team Environment →
            </button>
          </form>
        </div>
      </div>
    );
  }

  const TaskCard = ({ task, showApprove }) => {
    const assignee = task.assigned_to_username || 'Unassigned';
    const creator = task.created_by_username || '?';
    return (
      <div className="task-card glassy-hover" onClick={() => openTaskContext(task)}
        style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{task.id}</span>
          <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>by {creator}</span>
        </div>
        <h4 style={{ marginBottom: '0.75rem', fontSize: '0.95rem', lineHeight: 1.3 }}>{task.title}</h4>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>→ {assignee}</span>
          {showApprove && (
            <button
              className="btn btn-primary"
              onClick={(e) => handleApprove(e, task.id)}
              style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
            >
              Approve
            </button>
          )}
        </div>
      </div>
    );
  };

  const col = (label, items, badge, showApprove = false) => (
    <div className="kanban-col">
      <div className="kanban-col-header">
        <span>{label}</span>
        <span className="status-badge" style={{ background: 'var(--bg-primary)' }}>{items.length}</span>
      </div>
      <div className="kanban-items">
        {items.map(t => <TaskCard key={t.id} task={t} showApprove={showApprove} />)}
        {items.length === 0 && <div style={{ opacity: 0.3, fontSize: '0.85rem', textAlign: 'center', marginTop: '1rem' }}>No tasks</div>}
      </div>
    </div>
  );

  const canApprove = currentUser?.role_level <= 2; // senior_dev and above

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1>Task Board</h1>
        <p style={{ color: 'var(--text-muted)' }}>Your tasks and team workflow across all active instances.</p>
      </div>
      <div className="kanban-board">
        {col('Pending', pending, pending.length, canApprove)}
        {col('In Review', inReview, inReview.length, canApprove)}
        {col('Approved ✓', approved, approved.length)}
        {col('Rejected', rejected, rejected.length)}
      </div>
    </div>
  );
};

export default Dashboard;
