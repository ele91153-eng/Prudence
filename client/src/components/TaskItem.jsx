import { useState } from 'react';
import { api } from '../utils/api.js';

function EditModal({ task, dayId, goalId, onSave, onCancel }) {
  const [form, setForm] = useState({
    time: task.time || '',
    time_end: task.time_end || '',
    title: task.title || '',
    instruction: task.instruction || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.post(`/goals/${goalId}/tasks/${dayId}/${task.index}/edit`, form);
      onSave();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 300 }}
      onClick={onCancel}
    >
      <div
        style={{ background: 'var(--bg2)', width: '100%', borderRadius: '20px 20px 0 0', padding: 20, paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: 17 }}>Edit Task</h2>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>✕</button>
        </div>

        {error && <div className="error-box mb-3">{error}</div>}

        <div className="flex gap-2 mb-3">
          <div style={{ flex: 1 }}>
            <label className="label">Start time</label>
            <input
              type="text"
              placeholder="9:00 AM"
              value={form.time}
              onChange={e => set('time', e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">End time</label>
            <input
              type="text"
              placeholder="10:00 AM"
              value={form.time_end}
              onChange={e => set('time_end', e.target.value)}
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="label">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={e => set('title', e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="label">Description / Instructions</label>
          <textarea
            rows={4}
            value={form.instruction}
            onChange={e => set('instruction', e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={save} disabled={saving}>
            {saving ? <span className="spinner" /> : 'Save'}
          </button>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function TaskItem({ task, dayId, goalId, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);

  async function setStatus(status) {
    setLoading(true);
    try {
      await api.post(`/goals/${goalId}/tasks/${dayId}/${task.index}/status`, { status });
      onUpdate?.();
    } finally {
      setLoading(false);
    }
  }

  function handleSaved() {
    setEditing(false);
    setExpanded(false);
    onUpdate?.();
  }

  const isDone = task.status === 'done';
  const isSkipped = task.status === 'skipped';

  return (
    <>
      <div
        className={`task-item ${isDone ? 'done' : ''}`}
        style={{ cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        <button
          className={`checkbox ${isDone ? 'checked' : isSkipped ? 'skipped' : ''}`}
          onClick={e => { e.stopPropagation(); setStatus(isDone ? 'pending' : 'done'); }}
          disabled={loading}
        >
          {isDone && '✓'}
          {isSkipped && '—'}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="task-time">
            {task.time}{task.time_end ? ` – ${task.time_end}` : task.duration_minutes ? ` · ${task.duration_minutes}min` : ''}
          </div>
          <div className="task-title">{task.title}</div>
          {expanded ? (
            <div className="task-instruction mt-2">{task.instruction}</div>
          ) : (
            <div className="task-instruction" style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {task.instruction}
            </div>
          )}
          {expanded && (
            <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
              {!isDone && (
                <button className="btn btn-sm btn-secondary" onClick={() => setStatus('done')} disabled={loading}>
                  Done ✓
                </button>
              )}
              {!isSkipped && !isDone && (
                <button className="btn btn-sm btn-ghost" onClick={() => setStatus('skipped')} disabled={loading}>
                  Skip
                </button>
              )}
              <button className="btn btn-sm btn-ghost" onClick={() => setEditing(true)}>
                ✏️ Edit
              </button>
            </div>
          )}
          {task.goal_title && (
            <div className="text-xs text-muted mt-2">📎 {task.goal_title}</div>
          )}
        </div>
      </div>

      {editing && (
        <EditModal
          task={task}
          dayId={dayId}
          goalId={goalId}
          onSave={handleSaved}
          onCancel={() => setEditing(false)}
        />
      )}
    </>
  );
}
