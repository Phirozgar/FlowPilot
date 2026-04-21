import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { toast } from '../components/Toast';
import api from '../api/api';

const PRIORITY_COLOR = { low: '#64748b', medium: '#3b82f6', high: '#f59e0b', critical: '#ef4444' };
const STATUS_COLOR = { open: '#3b82f6', in_review: '#f59e0b', closed: '#10b981', rejected: '#ef4444' };
const STATUS_LABEL = { open: 'Open', in_review: 'In Review', closed: 'Closed', rejected: 'Rejected' };

// Issue 8: Column grid — added a narrow delete column
const GRID_COLS = '120px 1fr 100px 100px 120px 110px 40px';

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_review', label: 'In Review' },
  { key: 'closed', label: 'Closed' },
  { key: 'rejected', label: 'Rejected' },
];

const Tickets = () => {
  const { currentUser, searchQuery } = useContext(AppContext);
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [mineOnly, setMineOnly] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchTickets = useCallback(async () => {
    try {
      let url = '/api/tasks/';
      const params = [];
      if (statusFilter) params.push(`status=${statusFilter}`);
      if (mineOnly) params.push('mine=true');
      if (params.length) url += '?' + params.join('&');
      const res = await api.get(url);
      setTickets(res.data.results || res.data);
    } catch (err) {
      toast.error('Failed to load tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, mineOnly]);

  // Reload when user or their active team changes (Issue 2)
  useEffect(() => {
    if (currentUser) {
      setLoading(true);
      fetchTickets();
    }
  }, [currentUser, currentUser?.team, fetchTickets]);

  // Issue 8: delete a ticket with confirmation
  const handleDelete = async (e, ticketId, ticketNumber) => {
    e.stopPropagation(); // don't navigate to detail page
    if (!window.confirm(`Delete ticket ${ticketNumber}? This cannot be undone.`)) return;
    setDeletingId(ticketId);
    try {
      await api.delete(`/api/tasks/${ticketId}/`);
      toast.success(`Ticket ${ticketNumber} deleted.`);
      setTickets(prev => prev.filter(t => t.id !== ticketId));
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to delete ticket.';
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const safeQ = (searchQuery || '').toLowerCase();
  const filtered = tickets.filter(t =>
    !safeQ ||
    t.title?.toLowerCase().includes(safeQ) ||
    t.ticket_number?.toLowerCase().includes(safeQ) ||
    (t.created_by_name || t.created_by_username || '').toLowerCase().includes(safeQ)
  );

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontWeight: 800 }}>Tickets</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            {filtered.length} ticket{filtered.length !== 1 ? 's' : ''}
            {statusFilter ? ` · ${STATUS_LABEL[statusFilter]}` : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/add-task')} style={{ fontWeight: 700 }}>
          + New Ticket
        </button>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            style={{
              padding: '0.4rem 0.9rem', borderRadius: '20px', border: '1px solid',
              borderColor: statusFilter === f.key ? 'var(--accent-color)' : 'var(--border-color)',
              background: statusFilter === f.key ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: statusFilter === f.key ? 'var(--accent-color)' : 'var(--text-muted)',
              fontWeight: statusFilter === f.key ? 700 : 400,
              cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            {f.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <input type="checkbox" checked={mineOnly} onChange={e => setMineOnly(e.target.checked)} />
          My tickets only
        </label>
      </div>

      {/* Ticket table */}
      {loading ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: '2rem' }}>Loading tickets...</div>
      ) : (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', flex: 1 }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: GRID_COLS,
            padding: '0.7rem 1.25rem',
            borderBottom: '1px solid var(--border-color)',
            fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            <span>Ticket</span>
            <span>Title</span>
            <span>Status</span>
            <span>Priority</span>
            <span>Raised By</span>
            <span>Next Approver</span>
            <span></span>
          </div>

          <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 340px)' }}>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', opacity: 0.5 }}>
                No tickets found.
              </div>
            )}
            {filtered.map((t, i) => (
              <div
                key={t.id}
                onClick={() => navigate(`/tickets/${t.id}`)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: GRID_COLS,
                  padding: '0.85rem 1.25rem',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--border-color)' : 'none',
                  cursor: 'pointer', alignItems: 'center',
                  background: 'transparent', transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.ticket_number}</span>
                <span style={{ fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '1rem' }}>{t.title}</span>
                <span>
                  <span style={{
                    fontSize: '0.72rem', padding: '0.2rem 0.55rem', borderRadius: '20px',
                    background: `${STATUS_COLOR[t.status]}18`, color: STATUS_COLOR[t.status], fontWeight: 700
                  }}>
                    {STATUS_LABEL[t.status]}
                  </span>
                </span>
                <span>
                  <span style={{
                    fontSize: '0.72rem', padding: '0.2rem 0.55rem', borderRadius: '20px',
                    background: `${PRIORITY_COLOR[t.priority]}18`, color: PRIORITY_COLOR[t.priority], fontWeight: 700
                  }}>
                    {t.priority}
                  </span>
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.created_by_name || t.created_by_username}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.current_approver_role || '—'}</span>
                {/* Issue 8: Delete button — only shown when backend says can_delete */}
                <span onClick={e => e.stopPropagation()}>
                  {t.can_delete && (
                    <button
                      title="Delete this ticket"
                      disabled={deletingId === t.id}
                      onClick={e => handleDelete(e, t.id, t.ticket_number)}
                      style={{
                        padding: '0.15rem 0.4rem', borderRadius: '4px',
                        border: '1px solid rgba(239,68,68,0.35)',
                        background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                        cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.7rem',
                        opacity: deletingId === t.id ? 0.5 : 1,
                      }}
                    >
                      {deletingId === t.id ? '…' : '×'}
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Tickets;
