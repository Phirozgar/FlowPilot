import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/api';

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [error, setError] = useState('');

  const fetchTask = async () => {
    try {
      const response = await api.get(`/api/tasks/${id}/`);
      setTask(response.data);
    } catch (err) {
      setError('Could not load task details.');
    }
  };

  useEffect(() => {
    fetchTask();
  }, [id]);

  const handleAction = async (action) => {
    setError('');
    try {
      await api.patch(`/api/tasks/${id}/${action}/`);
      await fetchTask();
    } catch (err) {
      setError('Action failed.');
    }
  };

  if (!task) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <h2>Task Detail</h2>
      {error && <p className="error">{error}</p>}
      <div className="card">
        <h3>{task.title}</h3>
        <p>{task.description}</p>
        <p>Status: {task.status}</p>
        <p>Approval step: {task.approval_step}</p>
        <p>Created by: {task.created_by?.username || 'Unknown'}</p>
        <p>Assigned to: {task.assigned_to?.username || 'None'}</p>
        <div className="button-row">
          <button onClick={() => handleAction('approve')}>Approve</button>
          <button onClick={() => handleAction('reject')}>Reject</button>
          <button onClick={() => navigate('/tasks')}>Back</button>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
