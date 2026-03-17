import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await api.get('/api/tasks/');
        setTasks(response.data);
      } catch (err) {
        setError('Could not load tasks.');
      }
    };
    fetchTasks();
  }, []);

  const filtered = filter ? tasks.filter((t) => t.status === filter) : tasks;

  return (
    <div className="page">
      <h2>Task List</h2>
      {error && <p className="error">{error}</p>}
      <div className="filter-row">
        <label>Status</label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="in_review">In Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      <ul className="task-list">
        {filtered.map((task) => (
          <li key={task.id}>
            <Link to={`/tasks/${task.id}`}><strong>{task.title}</strong></Link>
            <div>Status: {task.status}</div>
            <div>Assigned to: {task.assigned_to?.username || 'None'}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TaskList;
