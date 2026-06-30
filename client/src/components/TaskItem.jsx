import { useState } from 'react';
import { api } from '../utils/api.js';

export default function TaskItem({ task, dayId, goalId, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function setStatus(status) {
    setLoading(true);
    try {
      await api.post(`/goals/${goalId}/tasks/${dayId}/${task.index}/status`, { status });
      onUpdate?.();
    } finally {
      setLoading(false);
    }
  }

  const isDone = task.status === 'done';
  const isSkipped = task.status === 'skipped';

  return (
    <div className={`task-item ${isDone ? 'done' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
      <button
        className={`checkbox ${isDone ? 'checked' : isSkipped ? 'skipped' : ''}`}
        onClick={e => { e.stopPropagation(); setStatus(isDone ? 'pending' : 'done'); }}
        disabled={loading}
      >
        {isDone && '✓'}
        {isSkipped && '—'}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="task-time">{task.time} · {task.duration_minutes}min</div>
        <div className="task-title">{task.title}</div>
        {expanded && (
          <div className="task-instruction mt-2">{task.instruction}</div>
        )}
        {!expanded && (
          <div className="task-instruction" style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {task.instruction}
          </div>
        )}
        {expanded && !isDone && (
          <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
            <button className="btn btn-sm btn-secondary" onClick={() => setStatus('done')} disabled={loading}>
              Mark Done ✓
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setStatus('skipped')} disabled={loading}>
              Skip
            </button>
          </div>
        )}
        {task.goal_title && (
          <div className="text-xs text-muted mt-2">📎 {task.goal_title}</div>
        )}
      </div>
    </div>
  );
}
