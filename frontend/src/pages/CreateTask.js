import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { toast } from '../components/Toast';

const CreateTask = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assigned_to_id: '',
    workflow_template_id: ''
  });
  const [users, setUsers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, tplRes, meRes] = await Promise.all([
          api.get('/api/users/'),
          api.get('/api/workflows/templates/'),
          api.get('/api/users/me/')
        ]);
        
        const me = meRes.data;
        setCurrentUser(me);
        
        let fetchedUsers = usersRes.data.results || usersRes.data;
        // Superadmin sees everyone; others see same-level or lower (can't assign up)
        if (!me.is_superuser && me.role_level !== 0) {
           fetchedUsers = fetchedUsers.filter(u => u.role_level >= me.role_level && u.id !== me.id);
        } else {
           fetchedUsers = fetchedUsers.filter(u => u.id !== me.id);
        }
        
        setUsers(fetchedUsers);
        setTemplates(tplRes.data.results || tplRes.data);
      } catch (err) {
        console.error('Initial data load failed', err);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Create the task
      const taskRes = await api.post('/api/tasks/', {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        assigned_to_id: formData.assigned_to_id === 'self'
          ? currentUser?.id
          : (formData.assigned_to_id || null)
      });

      // 2. If a workflow was selected, instantiate it
      if (formData.workflow_template_id) {
        await api.post('/api/workflows/instances/', {
          workflow_id: formData.workflow_template_id,
          task_id: taskRes.data.id
        });
      }

      toast.success('Task created successfully!');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.detail
        || Object.values(err.response?.data || {})?.[0]?.[0]
        || 'Failed to create task.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1>Launch New Task Workflow</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Every task created here initiates a contextual chat thread and optional workflow instance.</p>
      
      <div className="glass-panel">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Task Title</label>
            <input 
              className="chat-input"
              style={{ width: '100%', marginTop: '0.5rem' }}
              value={formData.title} 
              onChange={(e) => setFormData({...formData, title: e.target.value})} 
              placeholder="e.g. Purchase New Dev Hardware"
              required 
            />
          </div>

          <div>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Description (Optional)</label>
            <textarea 
              className="chat-input"
              style={{ width: '100%', marginTop: '0.5rem', minHeight: '100px', resize: 'vertical' }}
              value={formData.description} 
              onChange={(e) => setFormData({...formData, description: e.target.value})} 
              placeholder="Provide context for the team..."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
             <div>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Initial Assignee</label>
                <select 
                   className="chat-input"
                   style={{ width: '100%', marginTop: '0.5rem' }}
                   value={formData.assigned_to_id}
                   onChange={(e) => setFormData({...formData, assigned_to_id: e.target.value})}
                >
                 <option value="">Unassigned (Independent)</option>
                   <option value="self">⭐ Myself — Self-assigned</option>
                   {users.map(u => (
                      <option key={u.id} value={u.id}>{u.username}</option>
                   ))}
                </select>
             </div>

             <div>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Workflow Template</label>
                <select 
                   className="chat-input"
                   style={{ width: '100%', marginTop: '0.5rem' }}
                   value={formData.workflow_template_id}
                   onChange={(e) => setFormData({...formData, workflow_template_id: e.target.value})}
                >
                   <option value="">None (Static Task)</option>
                   {templates.map(tpl => (
                      <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                   ))}
                </select>
             </div>
          </div>

          {/* No inline error needed — using toast now */}
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
             <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>
                {loading ? 'Initializing Engine...' : 'Launch Workflow'}
             </button>
             <button type="button" onClick={() => navigate('/')} className="btn btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTask;
