import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { toast } from '../components/Toast';
import api from '../api/api';

const PRIORITY_COLOR = { low: '#64748b', medium: '#3b82f6', high: '#f59e0b', critical: '#ef4444' };
const STATUS_COLOR = { open: '#3b82f6', in_review: '#f59e0b', closed: '#10b981', rejected: '#ef4444' };
const STATUS_LABEL = { open: 'Open', in_review: 'In Review', closed: 'Closed', rejected: 'Rejected' };
const ROLE_LABEL = { 0: 'Superadmin', 1: 'Team Leader', 2: 'Senior Developer', 3: 'Junior Developer', 4: 'Intern' };

// Pipeline visualization
const Pipeline = ({ ticket }) => {
  if (!ticket?.pipeline?.length) return null;
  const stages = [...ticket.pipeline].reverse(); // show lowest to highest

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, marginBottom: '0.75rem' }}>
        Approval Pipeline
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', rowGap: '0.5rem' }}>
        {/* Creator */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(99,102,241,0.2)', border: '2px solid rgba(99,102,241,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--accent-color)' }}>
            {(ticket.created_by?.first_name?.[0] || ticket.created_by?.username?.[0] || '?').toUpperCase()}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '60px', lineHeight: 1.2 }}>
            {ROLE_LABEL[ticket.created_by?.role_level] || 'Author'}
          </div>
        </div>

        {stages.map((stage, i) => {
          const color = stage.done ? '#10b981' : stage.current ? '#f59e0b' : 'var(--border-color)';
          const textColor = stage.done ? '#10b981' : stage.current ? '#f59e0b' : 'var(--text-muted)';
          return (
            <React.Fragment key={stage.level}>
              {/* Arrow */}
              <div style={{ flex: '0 0 24px', height: '2px', background: stage.done ? '#10b981' : 'var(--border-color)', margin: '0 2px', marginBottom: '1rem' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: stage.done ? 'rgba(16,185,129,0.15)' : stage.current ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.8rem', color: textColor, fontWeight: 700,
                }}>
                  {stage.done ? '✓' : stage.current ? '•' : ''}
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

// Comment / chat section
const CommentSection = ({ ticketId, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [channelId, setChannelId] = useState(null);
  const bottomRef = useRef(null);

  const fetchOrCreateChannel = useCallback(async () => {
    try {
      const res = await api.get('/api/chat/channels/');
      const channels = res.data.results || res.data;
      const existing = channels.find(c => c.name?.includes(`Ticket #${ticketId}`));
      if (existing) {
        setChannelId(existing.id);
        const msgRes = await api.get(`/api/chat/channels/${existing.id}/messages/`);
        setMessages(msgRes.data.results || msgRes.data);
      }
    } catch {}
  }, [ticketId]);

  useEffect(() => {
    fetchOrCreateChannel();
    const iv = setInterval(fetchOrCreateChannel, 5000);
    return () => clearInterval(iv);
  }, [fetchOrCreateChannel]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !channelId) {
      if (!channelId) {
        toast.error('No chat channel linked to this ticket yet.');
      }
      return;
    }
    const txt = input.trim();
    setInput('');
    try {
      await api.post(`/api/chat/channels/${channelId}/messages/`, { content: txt });
      fetchOrCreateChannel();
    } catch {
      toast.error('Failed to send message.');
      setInput(txt);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, marginBottom: '0.75rem', padding: '1.25rem 1.25rem 0' }}>
        Activity & Comments
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {messages.length === 0 && (
          <div style={{ opacity: 0.35, fontSize: '0.82rem', textAlign: 'center', paddingTop: '1.5rem' }}>No comments yet.</div>
        )}
        {messages.map(m => {
          const isMe = m.sender_name === currentUser?.username;
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: '0.5rem', alignItems: 'flex-end' }}>
              <div style={{ maxWidth: '75%' }}>
                {!isMe && <div style={{ fontSize: '0.7rem', color: 'var(--accent-color)', fontWeight: 600, marginBottom: '0.2rem', paddingLeft: '0.5rem' }}>{m.sender_name}</div>}
                <div style={{
                  padding: '0.55rem 0.85rem', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: isMe ? 'var(--accent-color)' : 'rgba(255,255,255,0.07)',
                  fontSize: '0.85rem', lineHeight: 1.4, color: isMe ? '#fff' : 'var(--text-main)',
                }}>
                  {m.content}
                </div>
                <div style={{ fontSize: '0.62rem', opacity: 0.4, marginTop: '0.2rem', textAlign: isMe ? 'right' : 'left', padding: '0 0.5rem' }}>
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '0.85rem 1.25rem 1.25rem', display: 'flex', gap: '0.6rem' }}>
        <input
          className="chat-input"
          placeholder={channelId ? 'Add a comment...' : 'No channel linked yet'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          style={{ flex: 1, padding: '0.6rem 0.9rem', borderRadius: '20px', fontSize: '0.85rem' }}
          disabled={!channelId}
        />
        <button onClick={send} className="btn btn-primary" disabled={!input.trim() || !channelId}
          style={{ borderRadius: '50%', width: '38px', height: '38px', padding: 0, fontSize: '1rem', flexShrink: 0 }}>
          →
        </button>
      </div>
    </div>
  );
};

// Main TicketDetail
const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useContext(AppContext);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const fetchTicket = useCallback(async () => {
    try {
      const res = await api.get(`/api/tasks/${id}/`);
      setTicket(res.data);
    } catch (err) {
      toast.error('Ticket not found.');
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

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading ticket...</div>;
  if (!ticket) return null;

  const isCreator = ticket.created_by?.id === currentUser?.id;
  const userLevel = currentUser?.role_level ?? 99;
  const canApprove = !isCreator && ticket.status !== 'closed' && ticket.status !== 'rejected' && userLevel <= ticket.current_approver_level;
  const canClose = currentUser?.is_leader || userLevel <= 1;
  const canReopen = (isCreator || userLevel <= 1) && ticket.status !== 'open' && ticket.status !== 'in_review';

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem', minHeight: 0 }}>
      {/* Left: ticket detail */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: 0, overflowY: 'auto' }}>
        {/* Back button + header */}
        <div>
          <button className="btn btn-secondary" onClick={() => navigate('/tickets')} style={{ fontSize: '0.82rem', marginBottom: '1rem' }}>
            Back to Tickets
          </button>
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
              Waiting for approval from: <strong style={{ color: 'var(--text-main)' }}>{ticket.current_approver_role}</strong>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, marginBottom: '1rem' }}>Actions</div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {canApprove && (
              <button className="btn btn-primary" disabled={acting} onClick={() => doAction('approve', 'approved')} style={{ fontWeight: 700 }}>
                Approve & Escalate
              </button>
            )}
            {canApprove && (
              <button disabled={acting} onClick={() => doAction('reject', 'rejected')} style={{
                padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid #ef444460',
                background: 'rgba(239,68,68,0.10)', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.88rem',
              }}>
                Reject
              </button>
            )}
            {canClose && ticket.status !== 'closed' && (
              <button disabled={acting} onClick={() => doAction('close', 'closed')} style={{
                padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid #10b98160',
                background: 'rgba(16,185,129,0.10)', color: '#10b981', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.88rem',
              }}>
                Close Ticket
              </button>
            )}
            {canReopen && (
              <button disabled={acting} onClick={() => doAction('reopen', 'reopened')} style={{
                padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)',
                background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.88rem',
              }}>
                Reopen
              </button>
            )}
            {!canApprove && !canClose && !canReopen && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', opacity: 0.6 }}>
                {ticket.status === 'closed' ? 'This ticket is closed.' :
                  ticket.status === 'rejected' ? 'This ticket was rejected.' :
                    isCreator ? 'Waiting for approval from a senior team member.' :
                      'You are not the required approver at this stage.'}
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
              ['Reporter', `${ticket.created_by?.first_name || ticket.created_by?.username || '?'} (${ROLE_LABEL[ticket.created_by?.role_level]})`],
              ['Assignee', ticket.assigned_to ? (ticket.assigned_to.first_name || ticket.assigned_to.username) : 'Unassigned'],
              ['Created', new Date(ticket.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })],
              ['Last Updated', new Date(ticket.updated_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
                <span style={{ fontWeight: 600, textAlign: 'right' }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Comments */}
        <div className="glass-panel" style={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
          <CommentSection ticketId={id} currentUser={currentUser} />
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;
