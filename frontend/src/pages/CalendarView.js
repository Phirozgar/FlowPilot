import React, { useEffect, useState } from 'react';
import api from '../api/api';

const CalendarView = () => {
  const [events, setEvents] = useState([]);
  const [viewState, setViewState] = useState('month'); // month or week
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', start_time: '', end_time: '' });
  const [error, setError] = useState('');

  // Define current Date scope for the calendar
  const [currentDate] = useState(new Date());

  const fetchEvents = async () => {
    try {
      const res = await api.get('/api/calendar/events/');
      setEvents(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/calendar/events/', newEvent);
      setNewEvent({ title: '', description: '', start_time: '', end_time: '' });
      setShowAddForm(false);
      fetchEvents();
    } catch (err) {
      setError('Check input dates/times.');
    }
  };

  const handleGoogleSync = () => {
     alert("Google Calendar Sync Successful! (Mocked)");
  };

  const generateMonthDays = () => {
     const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
     const startDay = startOfMonth.getDay(); 
     const days = [];
     
     for(let i = 0; i < startDay; i++) {
        days.push({ day: null, date: null });
     }
     
     const totalDays = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
     for(let i = 1; i <= totalDays; i++) {
        days.push({ day: i, date: new Date(currentDate.getFullYear(), currentDate.getMonth(), i) });
     }
     return days;
  };

  const generateWeekDays = () => {
      const curr = new Date(currentDate);
      const first = curr.getDate() - curr.getDay(); 
      const days = [];
      for(let i = 0; i < 7; i++) {
          const next = new Date(curr.setDate(first + i));
          days.push({ day: next.getDate(), date: new Date(next) });
      }
      return days;
  };

  const getEventsForDate = (dateObj) => {
     if(!dateObj) return [];
     return events.filter(ev => {
        const d = new Date(ev.start_time);
        return d.getDate() === dateObj.getDate() && d.getMonth() === dateObj.getMonth() && d.getFullYear() === dateObj.getFullYear();
     });
  };

  if (loading) return <div style={{ padding: '2rem' }}>Synchronizing Schedule...</div>;

  const displayDays = viewState === 'month' ? generateMonthDays() : generateWeekDays();

  return (
    <div className="animate-fade-in" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Organization Timeline</h1>
          <p style={{ color: 'var(--text-muted)' }}>Dynamic event tracking for SLA deadlines and team syncs.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
           <button className="btn btn-secondary" onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? 'Close Entry' : '+ New Schedule Entry'}
           </button>
           <button className="btn btn-primary" onClick={handleGoogleSync}>Sync External Google Calendar</button>
        </div>
      </div>

       {showAddForm && (
        <div className="glass-panel animate-fade-in" style={{ marginBottom: '2rem', maxWidth: '600px' }}>
           <h3>Finalize Schedule Detail</h3>
           {error && <div style={{ color: 'var(--color-warning)', marginBottom: '1rem' }}>{error}</div>}
           <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <input className="chat-input" placeholder="Event Label (e.g. Q3 Finance Sign-off)" value={newEvent.title} onChange={(e) => setNewEvent({...newEvent, title: e.target.value})} required />
              <textarea className="chat-input" placeholder="Context & Objectives" value={newEvent.description} onChange={(e) => setNewEvent({...newEvent, description: e.target.value})} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <input type="datetime-local" className="chat-input" value={newEvent.start_time} onChange={(e) => setNewEvent({...newEvent, start_time: e.target.value})} required />
                <input type="datetime-local" className="chat-input" value={newEvent.end_time} onChange={(e) => setNewEvent({...newEvent, end_time: e.target.value})} required />
              </div>
              <button type="submit" className="btn btn-primary">Publish to Timeline</button>
           </form>
        </div>
      )}

      <div className="glass-panel" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <h2 style={{ fontSize: '1.2rem', color: 'var(--accent-color)', margin: 0 }}>
               {viewState === 'month' 
                 ? `${currentDate.toLocaleString('default', { month: 'long' })} ${currentDate.getFullYear()}`
                 : `Week of ${displayDays[0]?.date?.toLocaleDateString()} - ${displayDays[6]?.date?.toLocaleDateString()}`
               }
             </h2>
             <div style={{ display: 'flex', background: 'var(--bg-primary)', borderRadius: '0.4rem', border: '1px solid var(--border-color)', padding: '0.2rem' }}>
                <button 
                   onClick={() => setViewState('month')} 
                   className={viewState === 'month' ? 'btn btn-primary' : 'btn btn-secondary'} 
                   style={{ padding: '0.3rem 1rem', border: 'none', background: viewState === 'month' ? 'var(--accent-color)' : 'none' }}>
                   Month
                </button>
                <button 
                   onClick={() => setViewState('week')} 
                   className={viewState === 'week' ? 'btn btn-primary' : 'btn btn-secondary'} 
                   style={{ padding: '0.3rem 1rem', border: 'none', background: viewState === 'week' ? 'var(--accent-color)' : 'none' }}>
                   Week
                </button>
             </div>
          </div>

          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: viewState === 'month' ? 'auto repeat(5, 1fr)' : 'auto 1fr', height: '100%', overflowY: 'auto' }}>
              {/* Header Days */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                 <div key={d} style={{ padding: '0.8rem', textAlign: 'center', fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.6, borderBottom: '1px solid var(--border-color)' }}>{d}</div>
              ))}
              
              {displayDays.map((dayObj, i) => (
                 <div key={i} style={{ borderRight: (i+1)%7 === 0 ? 'none' : '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', minHeight: viewState === 'week' ? '400px' : '120px', padding: '0.5rem' }}>
                    <div style={{ fontSize: '0.8rem', opacity: dayObj.day ? 0.9 : 0.3, marginBottom: '0.5rem' }}>{dayObj.day}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                       {getEventsForDate(dayObj.date).map(ev => (
                          <div key={ev.id} className="glassy-hover" style={{ background: 'var(--accent-color)', color: 'white', fontSize: '0.7rem', padding: '0.4rem', borderRadius: '0.3rem', cursor: 'pointer' }}>
                             <div style={{ fontWeight: 700 }}>{ev.title}</div>
                             <div style={{ fontSize: '0.65rem', opacity: 0.8, marginTop: '2px' }}>
                               {new Date(ev.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
              ))}
          </div>
      </div>
    </div>
  );
};

export default CalendarView;
