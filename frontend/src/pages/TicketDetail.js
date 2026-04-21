import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { toast } from '../components/Toast';
import api from '../api/api';

const PRIORITY_COLOR = { low: '#64748b', medium: '#3b82f6', high: '#f59e0b', critical: '#ef4444' };
const STATUS_COLOR = { open: '#3b82f6', in_review: '#f59e0b', closed: '#10b981', rejected: '#ef4444' };
const STATUS_LABEL = { open: 'Open', in_review: 'In Review', closed: 'Closed', rejected: 'Rejected' };
const ROLE_LABEL = { 0: 'Superadmin', 1: 'Team Leader', 2: 'Senior Dev', 3: 'Junior Dev', 4: 'Intern' };
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'critical'];

// ── Approval Pipeline Visualization ───────────────────────────────────────────
// Pipeline from backend: stages[0] = first approver (just above creator),
// stages[last] = Superadmin. Left to right = first to last in approval chain.
const Pipeline = ({ ticket }) => {
  if (!ticket?.pipeline?.length) return null;

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, marginBottom: '0.75rem' }}>
        Approval Pipeline
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', rowGap: '0.5rem' }}>
        {/* Creator node */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(99,102,241,0.2)', border: '2px solid rgba(99,102,241,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', color: 'var(--accent-color)',
          }}>
            {(ticket.created_by?.first_name?.[0] || ticket.created_by?.username?.[0] || '?').toUpperCase()}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '60px', lineHeight: 1.2 }}>
            {ROLE_LABEL[ticket.created_by?.role_level] || 'Author'}
          </div>
        </div>

        {/* Approval stages: first in array = first approver */}
        {ticket.pipeline.map((stage) => {
          const color = stage.done ? '#10b981' : stage.current ? '#f59e0b' : 'var(--border-color)';
          const textColor = stage.done ? '#10b981' : stage.current ? '#f59e0b' : 'var(--text-muted)';
          return (
            <React.Fragment key={stage.level}>
              <div style={{
                flex: '0 0 24px', height: '2px',
                background: stage.done ? '#10b981' : 'var(--border-color)',
                margin: '0 2px', marginBottom: '1rem',
              }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: stage.done ? 'rgba(16,185,129,0.15)' : stage.current ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.8rem', color: textColor, fontWeight: 700,
                }}>
                  {stage.done ? '✓' : stage.current ? '●' : ''}
                </div>
                <div style={{ fontSize: '0.65rem', color: textColor, textAlign: 'center', maxWidth: '64px', lineHeight: 1.2 }}>
                  {stage.role}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// ── Edit Ticket Modal ─────────────────────────────────────────────────────────
const EditTicketModal = ({ ticket, onSave, onClose }) => {
  const [form, setForm] = useState({
    title: ticket.title || '',
    description: ticket.description || '',
    priority: ticket.priority || 'medium',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await api.patch(`/api/tasks/${ticket.id}/`, {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
      });
      toast.success('Ticket updated.');
      onSave(res.data);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.detail
        || Object.values(err.response?.data || {})?.[0]?.[0]
        || 'Failed to update ticket.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div className="glass-panel" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '560px', padding: '2rem', background: 'rgba(26,29,36,0.98)', backdropFilter: 'blur(30px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0 }}>Edit Ticket</h3>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '0.2rem 0.6rem' }}>×</button>
        </div>
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '0.65rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#ef4444' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Title *</label>
            <input className="chat-input" style={{ width: '100%' }} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Description</label>
            <textarea className="chat-input" style={{ width: '100%', minHeight: '100px', resize: 'vertical' }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Priority</label>
            <select className="chat-input" style={{ width: '100%' }} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
              {PRIORITY_OPTIONS.map(p => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Audit Log Section ─────────────────────────────────────────────────────────
const ACTION_ICON = {
  created: '🆕',
  approved: '✅',
  rejected: '❌',
  closed: '🔒',
  reopened: '🔓',
  edited: '✏️',
  comment: '💬',
};

const AuditLog = ({ logs }) => {
  if (!logs || logs.length === 0) {
    return (
      <div style={{ opacity: 0.35, fontSize: '0.82rem', padding: '1rem 0' }}>
        No activity recorded yet.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {logs.map((log, idx) => (
        <div
          key={log.id}
          style={{
            display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
            padding: '0.6rem 0',
            borderBottom: idx < logs.length - 1 ? '1px solid var(--border-color)' : 'none',
          }}
        >
          <div style={{ fontSize: '1rem', flexShrink: 0, marginTop: '0.1rem' }}>
            {ACTION_ICON[log.action] || '📋'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.83rem' }}>
              <strong style={{ color: 'var(--accent-color)' }}>{log.actor_name || 'System'}</strong>
              {' '}
              <span style={{ opacity: 0.8 }}>{log.action_display?.toLowerCase()}</span>
              {log.note && (
                <span style={{ opacity: 0.5, fontSize: '0.78rem' }}> — {log.note}</span>
              )}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              {new Date(log.timestamp).toLocaleString(undefined, {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Comment Section ───────────────────────────────────────────────────────────
const CommentSection = ({ ticket, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [channelId, setChannelId] = useState(null);
  const [channelLoading, setChannelLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const fetchOrCreateChannel = useCallback(async () => {
    try {
      const res = await api.post('/api/chat/channels/ticket-channel/', { ticket_id: ticket.id });
      const ch = res.data;
      if (ch?.id) {
        setChannelId(ch.id);
        const msgRes = await api.get(`/api/chat/channels/${ch.id}/messages/`);
        setMessages(msgRes.data.results || msgRes.data);
      }
    } catch (err) {
      // If POST says "already exists", try GET
      try {
        const res = await api.get(`/api/chat/channels/ticket-channel/?ticket_id=${ticket.id}`);
        const ch = res.data;
        if (ch?.id) {
          setChannelId(ch.id);
          const msgRes = await api.get(`/api/chat/channels/${ch.id}/messages/`);
          setMessages(msgRes.data.results || msgRes.data);
        }
      } catch (e) {
        console.error('Failed to load ticket channel:', e);
      }
    } finally {
      setChannelLoading(false);
    }
  }, [ticket.id]);

  useEffect(() => {
    fetchOrCreateChannel();
    const iv = setInterval(() => {
      if (channelId) {
        api.get(`/api/chat/channels/${channelId}/messages/`)
          .then(res => setMessages(res.data.results || res.data))
          .catch(() => {});
      }
    }, 5000);
    return () => clearInterval(iv);
  }, [channelId, fetchOrCreateChannel]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const txt = input.trim();
    if (!txt || !channelId) return;
    setSending(true);
    setInput('');
    try {
      await api.post(`/api/chat/channels/${channelId}/messages/`, { content: txt });
      const msgRes = await api.get(`/api/chat/channels/${channelId}/messages/`);
      setMessages(msgRes.data.results || msgRes.data);
    } catch {
      toast.error('Failed to send message.');
      setInput(txt);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, padding: '1.25rem 1.25rem 0.75rem' }}>
        Comments
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', minHeight: 0 }}>
        {channelLoading ? (
          <div style={{ opacity: 0.35, fontSize: '0.82rem', textAlign: 'center', paddingTop: '1.5rem' }}>Loading chat...</div>
        ) : messages.length === 0 ? (
          <div style={{ opacity: 0.35, fontSize: '0.82rem', textAlign: 'center', paddingTop: '1.5rem' }}>No comments yet. Start the conversation!</div>
        ) : (
          messages.map(m => {
            const isMe = m.sender === currentUser?.id || m.sender_name === currentUser?.username;
            return (
              <div key={m.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: '0.5rem', alignItems: 'flex-end' }}>
                <div style={{ maxWidth: '75%' }}>
                  {!isMe && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--accent-color)', fontWeight: 600, marginBottom: '0.2rem', paddingLeft: '0.5rem' }}>
                      {m.sender_name}
                    </div>
                  )}
                  <div style={{
                    padding: '0.55rem 0.85rem',
                    borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: isMe ? 'var(--accent-color)' : 'rgba(255,255,255,0.07)',
                    fontSize: '0.85rem', lineHeight: 1.4,
                    color: isMe ? '#fff' : 'var(--text-main)',
                  }}>
                    {m.content}
                  </div>
                  <div style={{ fontSize: '0.62rem', opacity: 0.4, marginTop: '0.2rem', textAlign: isMe ? 'right' : 'left', padding: '0 0.5rem' }}>
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: '0.85rem 1.25rem 1.25rem', display: 'flex', gap: '0.6rem' }}>
        <textarea
          className="chat-input"
          placeholder={channelLoading ? 'Loading...' : 'Add a comment… (Enter to send)'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={channelLoading || sending}
          rows={1}
          style={{ flex: 1, padding: '0.6rem 0.9rem', borderRadius: '20px', fontSize: '0.85rem', resize: 'none', overflow: 'hidden' }}
        />
        <button
          onClick={send}
          className="btn btn-primary"
          disabled={!input.trim() || channelLoading || sending}
          style={{ borderRadius: '50%', width: '38px', height: '38px', padding: 0, fontSize: '1rem', flexShrink: 0 }}
        >→</button>
      </div>
    </div>
  );
};

// ── Main TicketDetail ─────────────────────────────────────────────────────────
const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useContext(AppContext);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [activeTab, setActiveTab] = useState('comments'); // 'comments' | 'log'

  const fetchTicket = useCallback(async () => {
    try {
      const res = await api.get(`/api/tasks/${id}/`);
      setTicket(res.data);
    } catch (err) {
      const msg = err.response?.status === 404 ? 'Ticket not found.' : 'Failed to load ticket.';
      toast.error(msg);
      navigate('/tickets');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchTicket(); }, [fetchTicket]);

  const doAction = async (action, label) => {
    setActing(true);
    try {
      await api.post(`/api/tasks/${id}/${action}/`);
      toast.success(`Ticket ${label}.`);
      fetchTicket();
    } catch (err) {
      toast.error(err.response?.data?.detail || `Failed to ${label} ticket.`);
    } finally {
      setActing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete ticket ${ticket.ticket_number}? This cannot be undone.`)) return;
    setActing(true);
    try {
      await api.delete(`/api/tasks/${id}/`);
      toast.success(`Ticket deleted.`);
      navigate('/tickets');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete ticket.');
      setActing(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading ticket...</div>;
  if (!ticket) return null;

  const isCreator = ticket.created_by?.id === currentUser?.id;
  const userLevel = currentUser?.role_level ?? 99;
  const canApprove = !isCreator
    && ticket.status !== 'closed'
    && ticket.status !== 'rejected'
    && userLevel <= ticket.current_approver_level;
  const canClose = userLevel <= 1 && ticket.status !== 'closed';
  const canReopen = (isCreator || userLevel <= 1) && (ticket.status === 'closed' || ticket.status === 'rejected');
  const canEdit = isCreator && ticket.status !== 'closed' && ticket.status !== 'rejected';

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem', minHeight: 0 }}>
      {showEdit && (
        <EditTicketModal
          ticket={ticket}
          onSave={(updated) => setTicket(t => ({ ...t, ...updated }))}
          onClose={() => setShowEdit(false)}
        />
      )}

      {/* Left: main detail */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: 0, overflowY: 'auto' }}>
        {/* Header */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/tickets')} style={{ fontSize: '0.82rem' }}>
              ← Back to Tickets
            </button>
            {canEdit && (
              <button className="btn btn-secondary" onClick={() => setShowEdit(true)} style={{ fontSize: '0.82rem' }}>
                ✏ Edit Ticket
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ticket.ticket_number}</span>
            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.7rem', borderRadius: '20px', background: `${STATUS_COLOR[ticket.status]}18`, color: STATUS_COLOR[ticket.status], fontWeight: 700 }}>
              {STATUS_LABEL[ticket.status]}
            </span>
            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.7rem', borderRadius: '20px', background: `${PRIORITY_COLOR[ticket.priority]}18`, color: PRIORITY_COLOR[ticket.priority], fontWeight: 700 }}>
              {ticket.priority}
            </span>
          </div>
          <h1 style={{ fontWeight: 800, fontSize: '1.5rem', lineHeight: 1.3 }}>{ticket.title}</h1>
        </div>

        {/* Description */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, marginBottom: '0.75rem' }}>Description</div>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', opacity: ticket.description ? 1 : 0.4 }}>
            {ticket.description || 'No description provided.'}
          </p>
        </div>

        {/* Pipeline */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <Pipeline ticket={ticket} />
          {ticket.current_approver_role && ticket.status !== 'closed' && ticket.status !== 'rejected' && (
            <div style={{ marginTop: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              Awaiting approval from: <strong style={{ color: 'var(--text-main)' }}>{ticket.current_approver_role}</strong>
            </div>
          )}
        </div>

        {/* Audit Log */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, marginBottom: '1rem' }}>
            Activity Log
          </div>
          <AuditLog logs={ticket.logs || []} />
        </div>

        {/* Actions */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, marginBottom: '1rem' }}>Actions</div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {canApprove && (
              <>
                <button className="btn btn-primary" disabled={acting} onClick={() => doAction('approve', 'approved')} style={{ fontWeight: 700 }}>
                  {acting ? 'Processing...' : 'Approve & Escalate'}
                </button>
                <button disabled={acting} onClick={() => doAction('reject', 'rejected')} style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid #ef444460', background: 'rgba(239,68,68,0.10)', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.88rem' }}>
                  {acting ? '...' : 'Reject'}
                </button>
              </>
            )}
            {canClose && (
              <button disabled={acting} onClick={() => doAction('close', 'closed')} style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid #10b98160', background: 'rgba(16,185,129,0.10)', color: '#10b981', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.88rem' }}>
                Close Ticket
              </button>
            )}
            {canReopen && (
              <button disabled={acting} onClick={() => doAction('reopen', 'reopened')} style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.88rem' }}>
                Reopen Ticket
              </button>
            )}
            {ticket.can_delete && (
              <button disabled={acting} onClick={handleDelete} style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.88rem' }}>
                {acting ? '...' : 'Delete Ticket'}
              </button>
            )}
            {!canApprove && !canClose && !canReopen && !ticket.can_delete && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', opacity: 0.7 }}>
                {ticket.status === 'closed' ? '✅ This ticket is closed.' :
                  ticket.status === 'rejected' ? '❌ This ticket was rejected.' :
                    isCreator ? `⏳ Waiting for ${ticket.current_approver_role || 'a senior member'} to approve.` :
                      `🔒 Not your stage. Approval needed from: ${ticket.current_approver_role || 'a higher role'}.`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: meta + comments */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 0 }}>
        {/* Meta */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, marginBottom: '1rem' }}>Details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {[
              // Issue 9: Renamed "Reporter" → "Submitted By"
              ['Submitted By', `${ticket.created_by?.first_name || ticket.created_by?.username || '?'} (${ROLE_LABEL[ticket.created_by?.role_level] || 'Unknown'})`],
              ['Assigned To', ticket.assigned_to ? (ticket.assigned_to.first_name || ticket.assigned_to.username) : 'Unassigned'],
              ['Created', new Date(ticket.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })],
              ['Updated', new Date(ticket.updated_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
                <span style={{ fontWeight: 600, textAlign: 'right' }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Comment section */}
        <div className="glass-panel" style={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'column', minHeight: '300px', overflow: 'hidden' }}>
          <CommentSection ticket={ticket} currentUser={currentUser} />
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;
