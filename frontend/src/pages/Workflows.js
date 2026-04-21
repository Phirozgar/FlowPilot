import React, { useEffect, useState, useContext } from 'react';
import api from '../api/api';
import { AppContext } from '../App';
import { toast } from '../components/Toast';

const ROLE_OPTIONS = [
  { value: 'intern', label: 'Intern' },
  { value: 'junior_dev', label: 'Junior Developer' },
  { value: 'senior_dev', label: 'Senior Developer' },
  { value: 'team_leader', label: 'Team Leader' },
  { value: 'superadmin', label: 'Superadmin' },
];

const ROLE_LABEL = {
  intern: 'Intern',
  junior_dev: 'Junior Developer',
  senior_dev: 'Senior Developer',
  team_leader: 'Team Leader',
  superadmin: 'Superadmin',
};

const Workflows = () => {
  const { searchQuery, currentUser } = useContext(AppContext);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [newTemplate, setNewTemplate] = useState({ name: '', description: '', is_active: true });
  const [addingStepTo, setAddingStepTo] = useState(null);
  const [newStep, setNewStep] = useState({ name: '', required_role: 'team_leader', step_order: 1 });
  const [editingStepId, setEditingStepId] = useState(null);
  const [editStepData, setEditStepData] = useState({ name: '', required_role: 'team_leader', step_order: 1 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/api/workflows/templates/');
      setTemplates(res.data.results || res.data);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to load workflow templates.';
      toast.error(msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTemplate.name.trim()) {
      setError('Blueprint name is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editingTemplate) {
        await api.patch(`/api/workflows/templates/${editingTemplate.id}/`, newTemplate);
        toast.success('Blueprint updated.');
      } else {
        await api.post('/api/workflows/templates/', newTemplate);
        toast.success('Blueprint created.');
      }
      setNewTemplate({ name: '', description: '', is_active: true });
      setShowAddForm(false);
      setEditingTemplate(null);
      fetchTemplates();
    } catch (err) {
      const msg = err.response?.data?.detail
        || Object.values(err.response?.data || {})?.[0]?.[0]
        || 'Error saving template.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (tpl) => {
    setNewTemplate({ name: tpl.name, description: tpl.description || '', is_active: tpl.is_active });
    setEditingTemplate(tpl);
    setShowAddForm(true);
    setError('');
  };

  const handleAddStep = async (e) => {
    e.preventDefault();
    if (!newStep.name.trim()) {
      toast.error('Step name is required.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/workflows/steps/', {
        ...newStep,
        workflow: addingStepTo.id,
      });
      setAddingStepTo(null);
      setNewStep({ name: '', required_role: 'team_leader', step_order: 1 });
      toast.success('Step added.');
      fetchTemplates();
    } catch (err) {
      const msg = err.response?.data?.detail
        || Object.values(err.response?.data || {})?.[0]?.[0]
        || 'Error adding step.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const submitEditStep = async (e, stepId) => {
    e.preventDefault();
    if (!editStepData.name.trim()) {
      toast.error('Step name is required.');
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/api/workflows/steps/${stepId}/`, editStepData);
      setEditingStepId(null);
      toast.success('Step updated.');
      fetchTemplates();
    } catch (err) {
      const msg = err.response?.data?.detail
        || Object.values(err.response?.data || {})?.[0]?.[0]
        || 'Error updating step.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStep = async (stepId) => {
    if (!window.confirm('Delete this step?')) return;
    try {
      await api.delete(`/api/workflows/steps/${stepId}/`);
      toast.success('Step removed.');
      fetchTemplates();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete step.');
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading Engine Configurations...</div>;

  const filtered = templates.filter(t =>
    (t.name || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  return (
    <div className="animate-fade-in" style={{ padding: '0' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Process Engine Configuration</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Define the approval steps for your organization's workflows.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingTemplate(null);
            setNewTemplate({ name: '', description: '', is_active: true });
            setError('');
          }}
        >
          {showAddForm ? 'Close' : '+ Create Blueprint'}
        </button>
      </div>

      {/* Create/Edit template form */}
      {showAddForm && (
        <div className="glass-panel animate-fade-in" style={{ marginBottom: '2rem', maxWidth: '600px' }}>
          <h3>{editingTemplate ? 'Edit Blueprint' : 'New Blueprint'}</h3>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius-sm)', padding: '0.65rem 0.9rem', marginBottom: '1rem',
              fontSize: '0.85rem', color: '#ef4444',
            }}>
              {error}
            </div>
          )}
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                Blueprint Name *
              </label>
              <input
                className="chat-input"
                style={{ width: '100%' }}
                placeholder="e.g. Standard Bug Report"
                value={newTemplate.name}
                onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                Description
              </label>
              <textarea
                className="chat-input"
                style={{ width: '100%', resize: 'vertical', minHeight: '80px' }}
                placeholder="Describe this workflow..."
                value={newTemplate.description}
                onChange={e => setNewTemplate({ ...newTemplate, description: e.target.value })}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={newTemplate.is_active}
                onChange={e => setNewTemplate({ ...newTemplate, is_active: e.target.checked })}
              />
              <span style={{ fontSize: '0.85rem' }}>Active Blueprint</span>
            </label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : editingTemplate ? 'Update Blueprint' : 'Create Blueprint'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowAddForm(false); setError(''); }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Template list */}
      {filtered.length === 0 && !showAddForm && (
        <div style={{ opacity: 0.4, textAlign: 'center', padding: '4rem', fontSize: '0.9rem' }}>
          No blueprints configured yet. Create one to get started.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '2rem' }}>
        {filtered.map(tpl => (
          <div key={tpl.id} className="glass-panel" style={{ height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: 0 }}>{tpl.name}</h3>
                <span className="status-badge" style={{
                  background: tpl.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                  color: tpl.is_active ? 'var(--color-success)' : 'var(--color-warning)',
                  marginTop: '0.5rem', display: 'inline-block',
                }}>
                  {tpl.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <button className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }} onClick={() => handleEdit(tpl)}>
                Edit
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '1rem 0' }}>
              {tpl.description || 'No description provided.'}
            </p>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ textTransform: 'uppercase', fontSize: '0.72rem', opacity: 0.6, margin: 0, letterSpacing: '0.5px' }}>
                  Approval Steps ({tpl.steps?.length || 0})
                </h4>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.15rem 0.5rem', fontSize: '0.72rem' }}
                  onClick={() => {
                    setAddingStepTo(tpl);
                    setNewStep({ name: '', required_role: 'team_leader', step_order: (tpl.steps?.length || 0) + 1 });
                  }}
                >
                  + Add Step
                </button>
              </div>

              {/* Add step form */}
              {addingStepTo?.id === tpl.id && (
                <form
                  onSubmit={handleAddStep}
                  className="animate-fade-in"
                  style={{
                    background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: 'var(--radius-sm)',
                    marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap',
                    border: '1px dashed var(--accent-color)',
                  }}
                >
                  <div style={{ flex: '1 1 100%' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                      Step Name *
                    </label>
                    <input
                      className="chat-input"
                      style={{ width: '100%', fontSize: '0.82rem' }}
                      placeholder="e.g. Senior Review"
                      required
                      value={newStep.name}
                      onChange={e => setNewStep({ ...newStep, name: e.target.value })}
                    />
                  </div>
                  <div style={{ flex: '1 1 55%' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                      Required Role *
                    </label>
                    <select
                      className="chat-input"
                      style={{ width: '100%', fontSize: '0.82rem' }}
                      value={newStep.required_role}
                      onChange={e => setNewStep({ ...newStep, required_role: e.target.value })}
                    >
                      {ROLE_OPTIONS.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: '0 1 80px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                      Order
                    </label>
                    <input
                      className="chat-input"
                      type="number"
                      style={{ width: '100%', fontSize: '0.82rem' }}
                      min={1}
                      value={newStep.step_order}
                      onChange={e => setNewStep({ ...newStep, step_order: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div style={{ flex: '1 1 100%', display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.82rem' }} disabled={saving}>
                      {saving ? 'Saving...' : 'Add Step'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ flex: '0 0 auto', fontSize: '0.82rem' }}
                      onClick={() => setAddingStepTo(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Step list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {tpl.steps?.length > 0 ? (
                  [...tpl.steps].sort((a, b) => a.step_order - b.step_order).map(step => (
                    <div key={step.id}>
                      {editingStepId === step.id ? (
                        <form
                          onSubmit={e => submitEditStep(e, step.id)}
                          className="animate-fade-in"
                          style={{
                            padding: '0.8rem', background: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-sm)', border: '1px dashed var(--accent-color)',
                            display: 'flex', gap: '0.5rem', flexWrap: 'wrap',
                          }}
                        >
                          <input
                            className="chat-input"
                            style={{ flex: '1 1 100%', fontSize: '0.82rem' }}
                            required
                            value={editStepData.name}
                            placeholder="Step name"
                            onChange={e => setEditStepData({ ...editStepData, name: e.target.value })}
                          />
                          <select
                            className="chat-input"
                            style={{ flex: '1 1 55%', fontSize: '0.82rem' }}
                            value={editStepData.required_role}
                            onChange={e => setEditStepData({ ...editStepData, required_role: e.target.value })}
                          >
                            {ROLE_OPTIONS.map(r => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                          <input
                            className="chat-input"
                            type="number"
                            style={{ flex: '0 1 80px', fontSize: '0.82rem' }}
                            min={1}
                            value={editStepData.step_order}
                            onChange={e => setEditStepData({ ...editStepData, step_order: parseInt(e.target.value) || 1 })}
                          />
                          <div style={{ flex: '1 1 100%', display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.82rem' }} disabled={saving}>
                              Save
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ fontSize: '0.82rem' }}
                              onClick={() => setEditingStepId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 0.9rem',
                          background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                        }}>
                          <div style={{
                            width: '26px', height: '26px', borderRadius: '50%',
                            background: 'var(--accent-color)', color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.72rem', fontWeight: 700, flexShrink: 0,
                          }}>
                            {step.step_order}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{step.name}</div>
                            <div style={{ fontSize: '0.72rem', opacity: 0.6, marginTop: '0.1rem' }}>
                              Requires: <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>
                                {ROLE_LABEL[step.required_role] || step.required_role}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem' }}
                              onClick={() => {
                                setEditStepData({
                                  name: step.name,
                                  required_role: step.required_role,
                                  step_order: step.step_order,
                                });
                                setEditingStepId(step.id);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              style={{
                                padding: '0.2rem 0.6rem', fontSize: '0.7rem',
                                borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239,68,68,0.4)',
                                background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                                cursor: 'pointer', fontFamily: 'inherit',
                              }}
                              onClick={() => handleDeleteStep(step.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ opacity: 0.3, textAlign: 'center', padding: '1.5rem', fontSize: '0.85rem' }}>
                    No steps configured. Add steps to define the approval flow.
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Workflows;
