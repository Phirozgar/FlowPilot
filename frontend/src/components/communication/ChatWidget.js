import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import { AppContext } from '../../App';

const ChatWidget = ({ contextPayload }) => {
  const { currentUser } = React.useContext(AppContext);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [channelId, setChannelId] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchChannelContext = async () => {
    try {
      // Determine what channel we're looking for
      let targetId = null;

      // Case 1: Direct channel ID passed (from /channels)
      if (contextPayload?.channelId) {
         targetId = contextPayload.channelId;
      } 
      // Case 2: Workflow Instance passed (from Dashboard)
      else if (contextPayload?.rawInst?.task_details?.id) {
         // Auto-link to Task channel (naming convention)
         const chanRes = await api.get('/api/chat/channels/');
         const channels = chanRes.data.results || chanRes.data;
         const match = channels.find(c => c.name.includes(`Task-${contextPayload.rawInst.task_details.id}`));
         if (match) targetId = match.id;
      }

      if (targetId) {
         const msgRes = await api.get(`/api/chat/channels/${targetId}/messages/`);
         setMessages(msgRes.data.results || msgRes.data);
         setChannelId(targetId);
      }
    } catch (err) {
      console.error("Error fetching chat context", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannelContext();
    const interval = setInterval(fetchChannelContext, 5000);
    return () => clearInterval(interval);
  }, [contextPayload]);

  const sendMessage = async () => {
    if (!newMessage || !channelId) return;
    try {
      await api.post(`/api/chat/channels/${channelId}/messages/`, {
         content: newMessage
      });
      setNewMessage('');
      fetchChannelContext();
    } catch (err) {
      console.error("Error sending message", err);
    }
  };

  if (loading) return <div style={{padding:'2rem'}}>Establishing secure connection...</div>;

  return (
    <div className="chat-widget animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 'calc(100vh - 120px)' }}>
      {!channelId ? (
         <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>No active communication channel detected for this task context.</div>
      ) : (
         <>
          <div className="chat-messages" style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.map(m => {
              const isMe = m.sender_name === currentUser?.username;
              return (
                 <div key={m.id} className="chat-message" style={{ background: isMe ? 'var(--accent-color)' : 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '0.5rem', alignSelf: isMe ? 'flex-end' : 'flex-start', minWidth: '60%', maxWidth: '85%' }}>
                   <strong style={{ color: isMe ? 'rgba(255,255,255,0.8)' : 'var(--accent-color)', fontSize: '0.8rem', display: 'block', marginBottom: '0.3rem', textAlign: isMe ? 'right' : 'left' }}>{m.sender_name}</strong>
                   <div style={{ fontSize: '0.9rem', color: isMe ? '#fff' : 'inherit' }}>{m.content}</div>
                   <div style={{ fontSize: '0.65rem', opacity: 0.5, marginTop: '0.4rem', textAlign: isMe ? 'left' : 'right', color: isMe ? 'rgba(255,255,255,0.8)' : 'inherit' }}>{new Date(m.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                 </div>
              );
            })}
            {messages.length === 0 && <span style={{opacity:0.3, textAlign:'center'}}>No project activity yet. Start the conversation.</span>}
          </div>
          <div className="chat-input-area" style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              className="chat-input" 
              placeholder="Post a secure update..." 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={sendMessage}>Send</button>
          </div>
         </>
      )}
    </div>
  );
};

export default ChatWidget;
