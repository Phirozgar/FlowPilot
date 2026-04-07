import React, { useEffect, useState, useContext } from 'react';
import api from '../api/api';
import { AppContext } from '../App';

const Channels = () => {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setActiveContextPane, searchQuery } = useContext(AppContext);

  const fetchChannels = async () => {
    try {
      const res = await api.get('/api/chat/channels/');
      setChannels(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const openChannel = (chan) => {
    setActiveContextPane({
       title: chan.name,
       type: 'TASK_CHAT',
       data: { channelId: chan.id } // Compatible with ChatWidget payload requirements
    });
  };

  if (loading) return <div style={{ padding: '2rem' }}>Opening Communication Portal...</div>;

  return (
    <div className="animate-fade-in" style={{ height: '100%' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1>Unified Communications</h1>
        <p style={{ color: 'var(--text-muted)' }}>Context-aware chat channels linked to every blueprint and task.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {channels.filter(c => (c.name || '').toLowerCase().includes((searchQuery || '').toLowerCase())).map(chan => (
          <div key={chan.id} className="glass-panel glassy-hover" style={{ cursor: 'pointer' }} onClick={() => openChannel(chan)}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 700 }}>
                   #
                </div>
                <div style={{ flex: 1 }}>
                   <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{chan.name}</h3>
                   <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>Created: {new Date(chan.created_at).toLocaleDateString()}</div>
                </div>
             </div>
             
             {chan.recent_messages?.length > 0 && (
                <div style={{ marginTop: '1.5rem', padding: '0.8rem', background: 'rgba(0,0,0,0.1)', borderRadius: '0.5rem' }}>
                   <div style={{ fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.5rem' }}>Latest Activity</div>
                   <div style={{ fontSize: '0.85rem' }}>
                      <strong>{chan.recent_messages[0].sender_name}:</strong> {chan.recent_messages[0].content}
                   </div>
                </div>
             )}
          </div>
        ))}
        {channels.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', opacity: 0.5, padding: '4rem' }}>No active channels found. Channels are created automatically with tasks.</div>}
      </div>
    </div>
  );
};

export default Channels;
