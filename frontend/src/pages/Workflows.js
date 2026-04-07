import React, { useEffect, useState, useContext } from 'react';
import api from '../api/api';
import { AppContext } from '../App';

const Workflows = () => {
  const { searchQuery } = useContext(AppContext);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [newTemplate, setNewTemplate] = useState({ name: '', description: '', is_active: true });
  const [addingStepTo, setAddingStepTo] = useState(null);
  const [newStep, setNewStep] = useState({ name: '', required_role: '', step_order: 1 });
  const [editingStepId, setEditingStepId] = useState(null);
  const [editStepData, setEditStepData] = useState({ name: '', required_role: '', step_order: 1 });
  const [error, setError] = useState('');

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/api/workflows/templates/');
      setTemplates(res.data.results || res.data);
    } catch (err) {
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
    try {
      if (editingTemplate) {
        await api.patch(`/api/workflows/templates/${editingTemplate.id}/`, newTemplate);
      } else {
        await api.post('/api/workflows/templates/', newTemplate);
      }
      setNewTemplate({ name: '', description: '', is_active: true });
      setShowAddForm(false);
      setEditingTemplate(null);
      fetchTemplates();
    } catch (err) {
      setError('Error saving template.');
    }
  };

  const handleEdit = (tpl) => {
    setNewTemplate({ name: tpl.name, description: tpl.description || '', is_active: tpl.is_active });
    setEditingTemplate(tpl);
    setShowAddForm(true);
  };

  const handleAddStep = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/workflows/steps/', {
        ...newStep,
        workflow: addingStepTo.id
      });
      setAddingStepTo(null);
      setNewStep({ name: '', required_role: '', step_order: 1 });
      fetchTemplates();
    } catch (err) {
      setError('Error adding step.');
    }
  };

  const submitEditStep = async (e, stepId) => {
    e.preventDefault();
    try {
      await api.patch(`/api/workflows/steps/${stepId}/`, editStepData);
      setEditingStepId(null);
      fetchTemplates();
    } catch (err) {
      setError('Error updating step.');
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading Engine Configurations...</div>;

  return (
    <div className="animate-fade-in" style={{ padding: '0' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Process Engine Configuration</h1>
          <p style={{ color: 'var(--text-muted)' }}>Define the logic and approval steps for your organization's tasks.</p>
        </div>
        <button className="btn btn-primary" onClick={() => {setShowAddForm(!showAddForm); setEditingTemplate(null); setNewTemplate({ name: '', description: '', is_active: true });}}>
          {showAddForm ? 'Close Portal' : '+ Create New Blueprint'}
        </button>
      </div>

       {showAddForm && (
        <div className="glass-panel animate-fade-in" style={{ marginBottom: '2rem', maxWidth: '600px' }}>
           <h3>{editingTemplate ? 'Modify Blueprint' : 'Define New Blueprint'}</h3>
           {error && <p style={{ color: 'var(--color-warning)'}}>{error}</p>}
           <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <input className="chat-input" placeholder="Blueprint Name" value={newTemplate.name} onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})} required />
              <textarea className="chat-input" placeholder="Process Description" value={newTemplate.description} onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                 <input type="checkbox" checked={newTemplate.is_active} onChange={(e) => setNewTemplate({...newTemplate, is_active: e.target.checked})} />
                 <label style={{ fontSize: '0.8rem' }}>Active Blueprint</label>
              </div>
              <button type="submit" className="btn btn-primary">{editingTemplate ? 'Update Definition' : 'Save Definition'}</button>
           </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '2rem' }}>
        {templates.filter(t => (t.name || '').toLowerCase().includes((searchQuery || '').toLowerCase())).map(tpl => (
          <div key={tpl.id} className="glass-panel" style={{ height: 'fit-content' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                   <h3 style={{ margin: 0 }}>{tpl.name}</h3>
                   <span className="status-badge" style={{ background: tpl.is_active ? 'var(--color-success)' : 'var(--color-warning)', marginTop: '0.5rem', display: 'inline-block' }}>
                      {tpl.is_active ? 'Active' : 'Inactive'}
                   </span>
                </div>
                <button className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }} onClick={() => handleEdit(tpl)}>Edit</button>
             </div>
             
             <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '1.5rem 0' }}>{tpl.description || 'No description provided.'}</p>
             
             <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                   <h4 style={{ textTransform: 'uppercase', fontSize: '0.75rem', opacity: 0.6, margin: 0 }}>Step Orchestration</h4>
                   <button className="btn btn-secondary" style={{ padding: '0.1rem 0.4rem', fontSize: '0.7rem' }} onClick={() => {
                        setAddingStepTo(tpl);
                        setNewStep({ name: '', required_role: '', step_order: (tpl.steps?.length || 0) + 1 });
                   }}>+ Add Step</button>
                </div>

                {addingStepTo?.id === tpl.id && (
                   <form onSubmit={handleAddStep} className="animate-fade-in" style={{ background: 'rgba(0,0,0,0.1)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <input className="chat-input" style={{ flex: '1 1 100%', fontSize: '0.8rem' }} placeholder="Step Name" required value={newStep.name} onChange={(e) => setNewStep({...newStep, name: e.target.value})} />
                      <input className="chat-input" style={{ flex: '1 1 45%', fontSize: '0.8rem' }} placeholder="Required Role" required value={newStep.required_role} onChange={(e) => setNewStep({...newStep, required_role: e.target.value})} />
                      <input className="chat-input" type="number" style={{ flex: '1 1 20%', fontSize: '0.8rem' }} placeholder="Order" required value={newStep.step_order} onChange={(e) => setNewStep({...newStep, step_order: e.target.value})} />
                      <button className="btn btn-primary" style={{ flex: '1 1 20%', fontSize: '0.8rem' }}>Save</button>
                      <button type="button" className="btn btn-secondary" style={{ flex: '1 1 20%', fontSize: '0.8rem' }} onClick={() => setAddingStepTo(null)}>X</button>
                   </form>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                   {tpl.steps?.length > 0 ? (
                      tpl.steps.sort((a,b) => a.step_order - b.step_order).map(step => (
                        <div key={step.id}>
                          {editingStepId === step.id ? (
                             <form onSubmit={(e) => submitEditStep(e, step.id)} className="animate-fade-in" style={{ padding: '0.8rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem', border: '1px dashed var(--accent-color)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <input className="chat-input" style={{ flex: '1 1 100%', fontSize: '0.8rem' }} required value={editStepData.name} onChange={(e) => setEditStepData({...editStepData, name: e.target.value})} />
                                <input className="chat-input" style={{ flex: '1 1 45%', fontSize: '0.8rem' }} required value={editStepData.required_role} onChange={(e) => setEditStepData({...editStepData, required_role: e.target.value})} />
                                <input className="chat-input" type="number" style={{ flex: '1 1 20%', fontSize: '0.8rem' }} required value={editStepData.step_order} onChange={(e) => setEditStepData({...editStepData, step_order: e.target.value})} />
                                <button className="btn btn-primary" style={{ flex: '1 1 20%', fontSize: '0.8rem' }}>Done</button>
                                <button type="button" className="btn btn-secondary" style={{ flex: '1 1 20%', fontSize: '0.8rem' }} onClick={() => setEditingStepId(null)}>X</button>
                             </form>
                          ) : (
                             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
                                   {step.step_order}
                                </div>
                                <div style={{ flex: 1 }}>
                                   <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{step.name}</div>
                                   <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>Responsibility: {step.required_role}</div>
                                </div>
                                <button className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem' }} onClick={() => {
                                   setEditStepData({ name: step.name, required_role: step.required_role, step_order: step.step_order });
                                   setEditingStepId(step.id);
                                }}>Edit Step</button>
                             </div>
                          )}
                        </div>
                      ))
                   ) : (
                      <div style={{ opacity: 0.3, textAlign: 'center', padding: '2rem', fontSize: '0.9rem' }}>No steps configured in this blueprint.</div>
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
