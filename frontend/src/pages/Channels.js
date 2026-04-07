import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { AppContext } from '../App';
import { toast } from '../components/Toast';
import api from '../api/api';

const ROLE_COLORS = {
  superadmin: '#ef4444', team_leader: '#f59e0b',
  senior_dev: '#3b82f6', junior_dev: '#10b981', intern: '#94a3b8',
};

const Avatar = ({ user, size = 38 }) => {
  const name = user?.first_name || user?.username || '?';
  const initials = name[0].toUpperCase();
  const color = ROLE_COLORS[user?.role] || '#6366f1';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${color}40, ${color}20)`,
      border: `2px solid ${color}60`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.38, color,
    }}>{initials}</div>
  );
};

const MessageBubble = ({ msg, isMe }) => (
  <div style={{
    display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row',
    alignItems: 'flex-end', gap: '0.5rem', marginBottom: '0.75rem',
  }}>
    {!isMe && (
      <Avatar user={{ username: msg.sender_name }} size={28} />
    )}
    <div style={{ maxWidth: '70%' }}>
      {!isMe && (
        <div style={{ fontSize: '0.7rem', color: 'var(--accent-color)', fontWeight: 600, marginBottom: '0.2rem', paddingLeft: '0.5rem' }}>
          {msg.sender_name}
        </div>
      )}
      <div style={{
        padding: '0.6rem 0.9rem',
        borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isMe ? 'var(--accent-color)' : 'rgba(255,255,255,0.07)',
        color: isMe ? '#fff' : 'var(--text-main)',
        fontSize: '0.88rem', lineHeight: 1.5,
        boxShadow: isMe ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
      }}>
        {msg.content}
      </div>
      <div style={{ fontSize: '0.65rem', opacity: 0.4, marginTop: '0.2rem', textAlign: isMe ? 'right' : 'left', paddingLeft: '0.5rem', paddingRight: '0.5rem' }}>
        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  </div>
);

const ChatPane = ({ channel, currentUser, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    if (!channel) return;
    try {
      const res = await api.get(`/api/chat/channels/${channel.id}/messages/`);
      setMessages(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to fetch messages', err);
    }
  }, [channel]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !channel) return;
    const text = input.trim();
    setInput('');
    try {
      await api.post(`/api/chat/channels/${channel.id}/messages/`, { content: text });
      fetchMessages();
    } catch (err) {
      toast.error('Failed to send message.');
      setInput(text);
    }
  };

  if (!channel) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', opacity: 0.4 }}>
        <div style={{ fontSize: '3rem' }}>💬</div>
        <p style={{ fontSize: '0.9rem' }}>Select a conversation to start chatting</p>
      </div>
    );
  }

  const otherMember = channel.channel_type === 'direct'
    ? channel.member_names?.find(m => m.id !== currentUser?.id)
    : null;
  const displayName = otherMember
    ? (otherMember.first_name || otherMember.username)
    : channel.name;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.1)', minWidth: 0 }}>
      {/* Header */}
      <div style={{
        padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)',
      }}>
        {onBack && (
          <button onClick={onBack} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', marginRight: '0.25rem' }}>←</button>
        )}
        {otherMember
          ? <Avatar user={otherMember} size={36} />
          : <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
              {channel.channel_type === 'group' ? '👥' : '#'}
            </div>
        }
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{displayName}</div>
          <div style={{ fontSize: '0.72rem', opacity: 0.5 }}>
            {channel.channel_type === 'direct' ? 'Direct Message' : `${channel.member_names?.length || 0} members`}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
        {messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3, fontSize: '0.85rem' }}>
            No messages yet. Say hello!
          </div>
        )}
        {messages.map(m => (
          <MessageBubble key={m.id} msg={m} isMe={m.sender_name === currentUser?.username} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem' }}>
        <input
          className="chat-input"
          style={{ flex: 1, padding: '0.7rem 1rem', borderRadius: '24px', fontSize: '0.9rem' }}
          placeholder="Type a message…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
        />
        <button
          className="btn btn-primary"
          onClick={sendMessage}
          disabled={!input.trim()}
          style={{ borderRadius: '50%', width: '42px', height: '42px', padding: 0, fontSize: '1.1rem', flexShrink: 0 }}
        >
          ➤
        </button>
      </div>
    </div>
  );
};

const Channels = () => {
  const { currentUser } = useContext(AppContext);
  const [channels, setChannels] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [tab, setTab] = useState('chats'); // 'chats' | 'people'
  const [loading, setLoading] = useState(true);
  const [startingDm, setStartingDm] = useState(false);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await api.get('/api/chat/channels/');
      setChannels(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchTeamMembers = useCallback(async () => {
    if (!currentUser?.team) return;
    try {
      const res = await api.get('/api/users/');
      let users = res.data.results || res.data;
      users = users.filter(u => u.team === currentUser.team && u.id !== currentUser.id);
      setTeamMembers(users);
    } catch (err) {
      console.error(err);
    }
  }, [currentUser]);

  const ensureGroupChat = useCallback(async () => {
    if (!currentUser?.team) return;
    try {
      const res = await api.post('/api/chat/channels/team_group/');
      setChannels(prev => {
        const exists = prev.find(c => c.id === res.data.id);
        if (exists) return prev;
        return [res.data, ...prev];
      });
    } catch (err) {
      console.error('Could not ensure group chat', err);
    }
  }, [currentUser]);

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchChannels(), fetchTeamMembers()]);
      await ensureGroupChat();
      setLoading(false);
    };
    if (currentUser) init();
  }, [currentUser, fetchChannels, fetchTeamMembers, ensureGroupChat]);

  const startDm = async (member) => {
    setStartingDm(true);
    try {
      const res = await api.post('/api/chat/channels/start_dm/', { target_user_id: member.id });
      // Add to channels list if not present, then select it
      setChannels(prev => {
        const exists = prev.find(c => c.id === res.data.id);
        if (exists) return prev;
        return [res.data, ...prev];
      });
      setSelectedChannel(res.data);
      setTab('chats');
    } catch (err) {
      toast.error('Failed to start conversation.');
    } finally {
      setStartingDm(false);
    }
  };

  const refreshAndSelect = async (chan) => {
    // Refresh the channel data then select
    try {
      const res = await api.get('/api/chat/channels/');
      const updated = res.data.results || res.data;
      setChannels(updated);
      const fresh = updated.find(c => c.id === chan.id) || chan;
      setSelectedChannel(fresh);
    } catch {
      setSelectedChannel(chan);
    }
  };

  const getChannelDisplayName = (chan) => {
    if (chan.channel_type === 'direct') {
      const other = chan.member_names?.find(m => m.id !== currentUser?.id);
      return other ? (other.first_name || other.username) : chan.name;
    }
    return chan.name;
  };

  const getChannelIcon = (chan) => {
    if (chan.channel_type === 'direct') return '👤';
    if (chan.channel_type === 'group') return '👥';
    return '#';
  };

  const getLastMessage = (chan) => {
    const msgs = chan.recent_messages;
    if (!msgs || msgs.length === 0) return 'No messages yet';
    const last = msgs[0];
    const prefix = last.sender_name === currentUser?.username ? 'You: ' : `${last.sender_name}: `;
    return prefix + (last.content?.length > 40 ? last.content.slice(0, 40) + '…' : last.content);
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading your conversations...</div>;

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'flex', gap: 0, overflow: 'hidden', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
      {/* Left sidebar */}
      <div style={{
        width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)',
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
          {['chats', 'people'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '0.9rem', border: 'none', background: 'none', cursor: 'pointer',
              color: tab === t ? 'var(--accent-color)' : 'var(--text-muted)',
              fontWeight: tab === t ? 700 : 400, fontSize: '0.85rem',
              borderBottom: tab === t ? '2px solid var(--accent-color)' : '2px solid transparent',
              fontFamily: 'inherit',
            }}>
              {t === 'chats' ? '💬 Chats' : '👥 People'}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {tab === 'chats' && (
            <>
              {channels.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.4, fontSize: '0.85rem' }}>
                  No conversations yet. Click on a person to start chatting.
                </div>
              )}
              {channels.map(chan => {
                const isSelected = selectedChannel?.id === chan.id;
                return (
                  <div
                    key={chan.id}
                    onClick={() => refreshAndSelect(chan)}
                    style={{
                      padding: '0.9rem 1rem', cursor: 'pointer',
                      background: isSelected ? 'rgba(99,102,241,0.12)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--accent-color)' : '3px solid transparent',
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                      background: chan.channel_type === 'group' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.1rem', border: '1px solid var(--border-color)',
                    }}>
                      {getChannelIcon(chan)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {getChannelDisplayName(chan)}
                      </div>
                      <div style={{ fontSize: '0.73rem', opacity: 0.5, marginTop: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {getLastMessage(chan)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {tab === 'people' && (
            <>
              <div style={{ padding: '0.75rem 1rem', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>
                Team Members
              </div>
              {teamMembers.length === 0 && (
                <div style={{ padding: '1rem', textAlign: 'center', opacity: 0.4, fontSize: '0.85rem' }}>No teammates found.</div>
              )}
              {teamMembers.map(member => (
                <div
                  key={member.id}
                  onClick={() => !startingDm && startDm(member)}
                  style={{
                    padding: '0.75rem 1rem', cursor: startingDm ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Avatar user={member} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                      {member.first_name || member.username}
                      {member.last_name ? ` ${member.last_name}` : ''}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: ROLE_COLORS[member.role] || 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      {member.role?.replace('_', ' ')}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.4 }}>Message →</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Right: Chat pane */}
      <ChatPane
        channel={selectedChannel}
        currentUser={currentUser}
        onBack={null}
      />
    </div>
  );
};

export default Channels;
