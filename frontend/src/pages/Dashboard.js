import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../App';
import api from '../api/api';

const Dashboard = () => {
  const { setActiveContextPane, searchQuery, currentUser } = useContext(AppContext);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    // If user has no team (and isn't superadmin), don't fetch tasks since they won't see any.
    if (currentUser && !currentUser.team && currentUser.role !== 'superadmin') {
       setLoading(false);
       return;
    }

    const fetchData = async () => {
      try {
        const res = await api.get('/api/workflows/instances/');
        const data = res.data.results || res.data;
        
        const instances = data.map(inst => ({
           id: `WF-${inst.id}`,
           backendId: inst.id,
           title: inst.task_details?.title || inst.workflow?.name || 'Task Flow',
           status: inst.status.toLowerCase(), // active, completed, pending, rejected
           workflowState: inst.current_step?.name || 'None',
           assignee: inst.current_step?.required_role || 'System',
           rawInst: inst
        }));
        
        setTasks(instances);
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    
    if (currentUser) {
       fetchData();
    }
  }, [currentUser]);

  const handleApprove = async (e, instId) => {
    e.stopPropagation();
    try {
      await api.post(`/api/workflows/instances/${instId}/action/`, { action: 'APPROVE', comments: 'Approved via UI' });
      // Reload the dashboard data instead of refreshing entire page
      const res = await api.get('/api/workflows/instances/');
      const data = res.data.results || res.data;
      const instances = data.map(inst => ({
           id: `WF-${inst.id}`,
           backendId: inst.id,
           title: inst.task_details?.title || inst.workflow?.name || 'Task Flow',
           status: inst.status.toLowerCase(),
           workflowState: inst.current_step?.name || 'None',
           assignee: inst.current_step?.required_role || 'System',
           rawInst: inst
      }));
      setTasks(instances);
    } catch (err) {
      alert('Approval failed! ' + JSON.stringify(err.response?.data || err.message));
    }
  };

  const openTaskContext = (task) => {
    setActiveContextPane({
      title: `${task.id}: ${task.title}`,
      type: 'TASK_CHAT',
      data: task
    });
  };

  const handleJoinTeam = async (e) => {
     e.preventDefault();
     try {
         await api.post('/api/users/teams/join/', { code: joinCode });
         window.location.reload(); // Refresh to re-bootstrap everything
     } catch(err) {
         setJoinError(err.response?.data?.error || 'Failed to join team.');
     }
  };

  // Live filter based on global search query (null safe)
  const safeQuery = (searchQuery || '').toLowerCase();
  let filteredTasks = tasks.filter(t => 
    (t.title || '').toLowerCase().includes(safeQuery) ||
    (t.id || '').toLowerCase().includes(safeQuery) ||
    (t.workflowState || '').toLowerCase().includes(safeQuery)
  );

  if (currentUser && currentUser.role_level !== 0) {
      filteredTasks = filteredTasks.filter(t => {
          const taskObj = t.rawInst?.task_details;
          if (!taskObj) return false;
          
          const isMine = taskObj.assigned_to_username === currentUser.username || taskObj.created_by_username === currentUser.username;
          
          const normalizedMyRole = (currentUser.role || '').replace('_', ' ').toLowerCase();
          const normalizedReqRole = (t.assignee || '').toLowerCase();
          const isMyRoleToApprove = normalizedReqRole.includes(normalizedMyRole) || normalizedMyRole.replace('dev', 'developer').includes(normalizedReqRole);
          
          return isMine || isMyRoleToApprove;
      });
  }

  if (loading || !currentUser) return <div style={{ padding: '2rem' }}>Loading application state...</div>;

  // Render Join Team screen for users without a team
  if (!currentUser.team && currentUser.role !== 'superadmin') {
      return (
         <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div className="glass-panel" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '2rem' }}>
                <h2 style={{ color: 'var(--accent-color)' }}>Welcome to FlowPilot</h2>
                <p style={{ opacity: 0.8, fontSize: '0.9rem', marginBottom: '2rem' }}>You are not currently assigned to any team. Please join a team using an invite code provided by your Team Leader.</p>
                {joinError && <div style={{ color: 'var(--color-warning)', marginBottom: '1rem', fontSize: '0.8rem' }}>{joinError}</div>}
                <form onSubmit={handleJoinTeam} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input className="chat-input" placeholder="Team Access Code" required value={joinCode} onChange={e => setJoinCode(e.target.value)} />
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Join Team Environment</button>
                </form>
            </div>
         </div>
      );
  }

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1>Task Board</h1>
        <p style={{ color: 'var(--text-muted)' }}>Monitor your active tasks and pending approvals across your team context.</p>
      </div>
      
      <div className="kanban-board">
        {/* Pending Approval Column */}
        <div className="kanban-col">
          <div className="kanban-col-header">
            <span>Pending Instances</span>
            <span className="status-badge" style={{ background: 'var(--bg-primary)' }}>
               {filteredTasks.filter(t => t.status === 'pending').length}
            </span>
          </div>
          <div className="kanban-items">
            {filteredTasks.filter(t => t.status === 'pending').map(task => (
              <div key={task.id} className="task-card glassy-hover" onClick={() => openTaskContext(task)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{task.id}</span>
                  <span className="status-badge status-pending">Step: {task.workflowState}</span>
                </div>
                <h4>{task.title}</h4>
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Role: {task.assignee}</span>
                  <button className="btn btn-primary" onClick={(e) => handleApprove(e, task.backendId)} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Column */}
        <div className="kanban-col">
          <div className="kanban-col-header">
            <span>Active Workflows</span>
            <span className="status-badge" style={{ background: 'var(--bg-primary)' }}>
              {filteredTasks.filter(t => t.status === 'active').length}
            </span>
          </div>
          <div className="kanban-items">
            {filteredTasks.filter(t => t.status === 'active').map(task => (
               <div key={task.id} className="task-card glassy-hover" onClick={() => openTaskContext(task)}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                   <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{task.id}</span>
                   <span className="status-badge status-active">Step: {task.workflowState}</span>
                 </div>
                 <h4>{task.title}</h4>
                 <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Awaiting Role: {task.assignee}</span>
                  <button className="btn btn-secondary" onClick={(e) => handleApprove(e, task.backendId)} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
                    Approve
                  </button>
                </div>
               </div>
            ))}
          </div>
        </div>

        {/* Completed Column */}
        <div className="kanban-col">
          <div className="kanban-col-header">
            <span>Completed</span>
            <span className="status-badge" style={{ background: 'var(--bg-primary)' }}>
              {filteredTasks.filter(t => t.status === 'completed').length}
            </span>
          </div>
          <div className="kanban-items">
            {filteredTasks.filter(t => t.status === 'completed').map(task => (
               <div key={task.id} className="task-card glassy-hover" style={{ opacity: 0.7 }} onClick={() => openTaskContext(task)}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                   <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{task.id}</span>
                   <span className="status-badge status-completed">Done</span>
                 </div>
                 <h4>{task.title}</h4>
               </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
