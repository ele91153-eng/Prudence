import { useState } from 'react';
import { api } from '../utils/api.js';

function EditSheet({ task, dayId, goalId, onSave, onCancel }) {
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
    setSaving(true); setError(null);
    try {
      await api.post(`/goals/${goalId}/tasks/${dayId}/${task.index}/edit`, form);
      onSave();
    } catch (e) { setError(e.message); setSaving(false); }
  }

  return (
    <div className="sheet-overlay" onClick={onCancel}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="row-between mb-4">
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Edit task</h2>
          <button className="btn-icon" onClick={onCancel}>
            <span className="ms" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        {error && <div className="error-box mb-3">{error}</div>}
        <div className="row gap-3 mb-3">
          <div style={{ flex: 1 }}>
            <label className="label">Start time</label>
            <input placeholder="9:00 AM" value={form.time} onChange={e => set('time', e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">End time</label>
            <input placeholder="10:00 AM" value={form.time_end} onChange={e => set('time_end', e.target.value)} />
          </div>
        </div>
        <div className="mb-3">
          <label className="label">Title</label>
          <input value={form.title} onChange={e => set('title', e.target.value)} />
        </div>
        <div className="mb-4">
          <label className="label">Instructions</label>
          <textarea rows={4} value={form.instruction} onChange={e => set('instruction', e.target.value)} />
        </div>
        <div className="row gap-2">
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={save} disabled={saving}>
            {saving ? <span className="spinner" /> : 'Save changes'}
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
    } finally { setLoading(false); }
  }

  const isDone = task.status === 'done';
  const isSkipped = task.status === 'skipped';

  return (
    <>
      <div
        className={`task-row${isDone ? ' done' : ''}`}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Checkbox */}
        <button
          className={`task-row-check${isDone ? ' done' : isSkipped ? ' skipped' : ''}`}
          onClick={e => { e.stopPropagation(); setStatus(isDone ? 'pending' : 'done'); }}
          disabled={loading}
        >
          {isDone && <span className="ms ms-fill" style={{ fontSize: 16, color: '#fff' }}>check</span>}
          {isSkipped && <span className="ms ms-fill" style={{ fontSize: 16, color: '#fff' }}>remove</span>}
          {loading && <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />}
        </button>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-2)', marginBottom: 2 }}>
            {task.time}{task.time_end ? ` – ${task.time_end}` : task.duration_minutes ? ` · ${task.duration_minutes}min` : ''}
          </div>
          <div style={{
            fontSize: 15, fontWeight: 600, color: 'var(--ink)',
            textDecoration: isDone ? 'line-through' : 'none',
            textDecorationColor: 'var(--ink-3)',
          }}>
            {task.title}
          </div>
          <div style={{
            fontSize: 13, color: 'var(--ink-2)', marginTop: 3, lineHeight: 1.4,
            ...(expanded ? {} : { overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }),
          }}>
            {task.instruction}
          </div>
          {task.goal_title && (
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
              📎 {task.goal_title}
            </div>
          )}
          {expanded && (
            <div className="row gap-2 mt-3" onClick={e => e.stopPropagation()}>
              {!isDone && (
                <button className="btn btn-sm btn-sage" onClick={() => setStatus('done')} disabled={loading}>
                  Done ✓
                </button>
              )}
              {isDone && (
                <button className="btn btn-sm btn-ghost" onClick={() => setStatus('pending')} disabled={loading}>
                  Undo
                </button>
              )}
              {!isSkipped && !isDone && (
                <button className="btn btn-sm btn-ghost" onClick={() => setStatus('skipped')} disabled={loading}>
                  Skip
                </button>
              )}
              <button className="btn btn-sm btn-ghost" onClick={() => { setEditing(true); }}>
                <span className="ms" style={{ fontSize: 15 }}>edit</span> Edit
              </button>
            </div>
          )}
        </div>

        {/* Right dot */}
        <span className={`task-dot${isDone ? ' done' : ''}`} />
      </div>

      {editing && (
        <EditSheet
          task={task}
          dayId={dayId}
          goalId={goalId}
          onSave={() => { setEditing(false); setExpanded(false); onUpdate?.(); }}
          onCancel={() => setEditing(false)}
        />
      )}
    </>
  );
}
