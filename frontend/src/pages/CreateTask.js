/**
 * CreateTask.js — Launch a new ticket into the approval pipeline.
 *
 * Issue 5: Proper messaging when workflow template fails (graceful degradation).
 * Issue 6: "Direct to Team Leader" template option — sends ticket straight to
 *          team_leader (level 1) skipping all intermediate approvers.
 * Issue 7: Workflow template fetch failure no longer blocks ticket creation.
 *           If the workflow API is unavailable, templates section is hidden
 *           but the form still works.
 */
import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import api from '../api/api';
import { toast } from '../components/Toast';

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: '#64748b' },
  { value: 'medium', label: 'Medium', color: '#3b82f6' },
  { value: 'high', label: 'High', color: '#f59e0b' },
  { value: 'critical', label: 'Critical', color: '#ef4444' },
];

/**
 * Workflow template options — the first two are built-in (not from the DB),
 * the rest come from the workflow API.
 */
const BUILT_IN_TEMPLATES = [
  {
    id: '',
    name: 'Standard',
    description: 'Ticket goes through each approval level in order (your role → team leader → superadmin).',
    direct: false,
  },
  {
    id: '__direct__',
    name: 'Direct to Team Leader',
    description: 'Skips all intermediate approvers. Ticket goes straight to your Team Leader.',
    direct: true,
  },
];

const CreateTask = () => {
  const navigate = useNavigate();
  const { currentUser } = useContext(AppContext);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assigned_to_id: '',
    selectedTemplate: '',  // '' = Standard, '__direct__' = Direct, or DB template ID
  });
  const [users, setUsers] = useState([]);
  const [dbTemplates, setDbTemplates] = useState([]);   // from /api/workflows/templates/
  const [templatesError, setTemplatesError] = useState(false); // Issue 7: track fetch failure
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const fetchData = async () => {
      // Fetch users (required) and templates (optional — Issue 7)
      try {
        // Fetch users synchronously (required for form)
        const usersRes = await api.get('/api/users/');
        let fetchedUsers = usersRes.data.results || usersRes.data;

        if (!currentUser.is_superuser && currentUser.role_level !== 0) {
          fetchedUsers = fetchedUsers.filter(
            u => u.role_level >= currentUser.role_level && u.id !== currentUser.id
          );
        } else {
          fetchedUsers = fetchedUsers.filter(u => u.id !== currentUser.id);
        }
        setUsers(fetchedUsers);
      } catch (err) {
        const msg = err.response?.data?.detail || 'Failed to load user list. Please refresh.';
        setError(msg);
        toast.error(msg);
      }

      // Issue 7: Fetch workflow templates separately — failure doesn't break the form.
      try {
        const tplRes = await api.get('/api/workflows/templates/');
        const templates = (tplRes.data.results || tplRes.data).filter(t => t.is_active);
        setDbTemplates(templates);
      } catch {
        // Silently fail — user still gets Standard and Direct templates
        setTemplatesError(true);
        console.warn('Workflow templates unavailable. Built-in templates will still work.');
      }

      setInitLoading(false);
    };
    fetchData();
  }, [currentUser]);

  const validate = () => {
    const errors = {};
    if (!formData.title.trim()) errors.title = 'Ticket title is required.';
    if (formData.title.trim().length > 255) errors.title = 'Title must be under 255 characters.';
    if (!currentUser?.team && !currentUser?.is_superuser && currentUser?.role !== 'superadmin') {
      errors.general = 'You must be part of a team to create tickets.';
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      if (validationErrors.general) setError(validationErrors.general);
      return;
    }

    setLoading(true);

    // Resolve assignee
    let assignedToId = null;
    if (formData.assigned_to_id === 'self') {
      assignedToId = currentUser?.id ?? null;
    } else if (formData.assigned_to_id && formData.assigned_to_id !== '') {
      assignedToId = parseInt(formData.assigned_to_id, 10) || null;
    }

    // Determine if this is a direct-to-leader ticket (Issue 6)
    const isDirect = formData.selectedTemplate === '__direct__';
    // DB template ID (if any)
    const dbTemplateId = !isDirect && formData.selectedTemplate !== ''
      ? parseInt(formData.selectedTemplate, 10) || null
      : null;

    try {
      // Step 1: Create the ticket
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || '',
        priority: formData.priority,
        direct: isDirect,  // Issue 6: tell the backend to use direct routing
      };
      if (assignedToId !== null) {
        payload.assigned_to_id = assignedToId;
      }

      const taskRes = await api.post('/api/tasks/', payload);
      const ticketId = taskRes.data.id;

      // Step 2: Attach workflow template (only for DB templates, not built-in ones — Issue 5)
      if (dbTemplateId) {
        try {
          await api.post('/api/workflows/instances/', {
            workflow_id: dbTemplateId,
            task_id: ticketId,
          });
        } catch (wfErr) {
          // Issue 5: Ticket was created successfully. Only the workflow attachment failed.
          const wfMsg = wfErr.response?.data?.detail
            || 'Ticket was created, but the workflow template could not be attached. '
            + 'The ticket will follow the standard approval pipeline.';
          toast.error(wfMsg);
          navigate(`/tickets/${ticketId}`);
          return;
        }
      }

      toast.success(
        isDirect
          ? 'Ticket created! It has been sent directly to your Team Leader for approval.'
          : 'Ticket created and entered the approval pipeline!'
      );
      navigate(`/tickets/${ticketId}`);
    } catch (err) {
      // Step 1 failed — ticket was NOT created
      const data = err.response?.data;
      let msg = 'Failed to create ticket. Please check your inputs and try again.';

      if (!data) {
        msg = 'Network error. Please check your connection and try again.';
      } else if (typeof data === 'string') {
        msg = data;
      } else if (data.detail) {
        msg = data.detail;
      } else if (Array.isArray(data) && data.length > 0) {
        msg = data[0];
      } else if (typeof data === 'object') {
        const fieldErrs = {};
        let firstMsg = '';
        for (const [field, errs] of Object.entries(data)) {
          const errMsg = Array.isArray(errs) ? errs[0] : String(errs);
          fieldErrs[field] = errMsg;
          if (!firstMsg) firstMsg = field === 'non_field_errors' ? errMsg : `${field}: ${errMsg}`;
        }
        setFieldErrors(fieldErrs);
        msg = firstMsg || msg;
      }

      setError(msg);
      toast.error(msg);
      console.error('CreateTask: ticket creation failed:', err.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  if (initLoading) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem', color: 'var(--text-muted)' }}>
        Loading form...
      </div>
    );
  }

  // No-team guard
  const isPrivileged = currentUser?.role === 'superadmin' || currentUser?.is_superuser;
  if (!currentUser?.team && !isPrivileged) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1>Launch New Task Workflow</h1>
        <div className="glass-panel" style={{ marginTop: '2rem', textAlign: 'center', padding: '2.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
          <h3 style={{ color: '#f59e0b', marginBottom: '0.5rem' }}>No Active Team</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            You need to be part of a team before you can create tickets.<br />
            Go to <strong>My Team</strong> to join or create a team.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => navigate('/team')}>Go to My Team</button>
            <button className="btn btn-secondary" onClick={() => navigate('/')}>Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  // Build the template options list for the UI
  const allTemplateOptions = [
    ...BUILT_IN_TEMPLATES,
    ...dbTemplates.map(t => ({
      id: String(t.id),
      name: t.name,
      description: t.description || 'Custom workflow template.',
      direct: false,
    })),
  ];

  const selectedTpl = allTemplateOptions.find(t => t.id === formData.selectedTemplate)
    || BUILT_IN_TEMPLATES[0];

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1>Launch New Task Workflow</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
        Create a ticket that enters the approval pipeline. Choose how it's routed below.
      </p>

      {/* General error */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1.5rem',
          fontSize: '0.88rem', color: '#ef4444', lineHeight: 1.5,
        }}>
          ⚠ {error}
        </div>
      )}

      <div className="glass-panel">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Title */}
          <div>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
              Ticket Title <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              className="chat-input"
              style={{
                width: '100%',
                borderColor: fieldErrors.title ? 'rgba(239,68,68,0.6)' : undefined,
              }}
              value={formData.title}
              onChange={e => {
                setFormData({ ...formData, title: e.target.value });
                if (fieldErrors.title) setFieldErrors({ ...fieldErrors, title: '' });
              }}
              placeholder="e.g. Purchase New Dev Hardware"
              maxLength={255}
              autoFocus
            />
            {fieldErrors.title && (
              <div style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.3rem' }}>{fieldErrors.title}</div>
            )}
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
              Description <span style={{ opacity: 0.5 }}>(Optional)</span>
            </label>
            <textarea
              className="chat-input"
              style={{ width: '100%', minHeight: '100px', resize: 'vertical' }}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide context for the team..."
            />
          </div>

          {/* Priority */}
          <div>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
              Priority
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {PRIORITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, priority: opt.value })}
                  style={{
                    padding: '0.45rem 1rem', borderRadius: '20px', border: '1px solid',
                    borderColor: formData.priority === opt.value ? opt.color : 'var(--border-color)',
                    background: formData.priority === opt.value ? `${opt.color}20` : 'transparent',
                    color: formData.priority === opt.value ? opt.color : 'var(--text-muted)',
                    fontWeight: formData.priority === opt.value ? 700 : 400,
                    cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit',
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Routing / Workflow Template — Issue 6 */}
          <div>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.6rem' }}>
              Approval Routing
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {allTemplateOptions.map(tpl => {
                const isSelected = formData.selectedTemplate === tpl.id;
                const borderColor = isSelected
                  ? (tpl.direct ? '#f59e0b' : 'var(--accent-color)')
                  : 'var(--border-color)';
                const bg = isSelected
                  ? (tpl.direct ? 'rgba(245,158,11,0.08)' : 'rgba(99,102,241,0.08)')
                  : 'rgba(255,255,255,0.02)';
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setFormData({ ...formData, selectedTemplate: tpl.id })}
                    style={{
                      padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${borderColor}`,
                      background: bg, cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        width: 14, height: 14, borderRadius: '50%',
                        border: `2px solid ${borderColor}`,
                        background: isSelected ? borderColor : 'transparent',
                        flexShrink: 0, marginTop: '1px',
                      }} />
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: isSelected ? (tpl.direct ? '#f59e0b' : 'var(--accent-color)') : 'var(--text-main)' }}>
                        {tpl.name}
                        {tpl.direct && (
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '0.1rem 0.4rem', borderRadius: '8px', fontWeight: 700 }}>
                            Direct
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', paddingLeft: '1.5rem', lineHeight: 1.4 }}>
                      {tpl.description}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Issue 7: gracefully show a notice if DB templates failed to load */}
            {templatesError && dbTemplates.length === 0 && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', opacity: 0.6 }}>
                ⚠ Custom workflow templates are currently unavailable. Standard and Direct routing still work.
              </div>
            )}
          </div>

          {/* Assignee */}
          <div>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
              Initial Assignee <span style={{ opacity: 0.5 }}>(Optional)</span>
            </label>
            <select
              className="chat-input"
              style={{ width: '100%' }}
              value={formData.assigned_to_id}
              onChange={e => setFormData({ ...formData, assigned_to_id: e.target.value })}
            >
              <option value="">Unassigned</option>
              <option value="self">⭐ Myself</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.username}
                  {' '}({u.role?.replace(/_/g, ' ')})
                </option>
              ))}
            </select>
          </div>

          {/* Summary of selected routing */}
          {selectedTpl && (
            <div style={{
              padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)',
              background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
              fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5,
            }}>
              📋 <strong>Routing:</strong> {selectedTpl.description}
            </div>
          )}

          {/* Submit */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={loading || !formData.title.trim()}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              {loading ? 'Creating Ticket...' : '🚀 Launch Ticket'}
            </button>
            <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTask;
