import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import TaskItem from '../components/TaskItem.jsx';

export default function GoalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dayData, setDayData] = useState(null);
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState(null);
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenReason, setRegenReason] = useState('');
  const [showMetricModal, setShowMetricModal] = useState(false);
  const [metricValues, setMetricValues] = useState({});

  const load = useCallback(async () => {
    try {
      const [g, d] = await Promise.all([
        api.get(`/goals/${id}`),
        api.get(`/goals/${id}/today`),
      ]);
      setGoal(g);
      setDayData(d);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function regenerate() {
    setRegenerating(true);
    setShowRegenModal(false);
    try {
      await api.post(`/goals/${id}/today/regenerate`, { reason: regenReason });
      setRegenReason('');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setRegenerating(false);
    }
  }

  async function logMetric(name) {
    const value = metricValues[name];
    if (!value) return;
    await api.post(`/goals/${id}/metrics`, { metric_name: name, value });
    setMetricValues(v => ({ ...v, [name]: '' }));
  }

  async function deleteGoal() {
    if (!confirm('Archive this goal?')) return;
    await api.delete(`/goals/${id}`);
    navigate('/goals', { replace: true });
  }

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <span>Loading today's plan…</span>
    </div>
  );

  if (error) return (
    <div className="page">
      <div className="error-box mt-4">{error}</div>
      <button className="btn btn-ghost mt-3" onClick={load}>Retry</button>
    </div>
  );

  const phases = goal?.phases || [];
  const completedTasks = dayData?.tasks?.filter(t => t.status === 'done').length || 0;
  const totalTasks = dayData?.tasks?.length || 0;
  const pct = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div style={{ paddingBottom: 80 }}>
      <div className="header">
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>←</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 18, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {goal?.title}
            </h1>
            <div className="text-xs text-muted">
              Day {dayData?.day_number} · {dayData?.days_until_deadline} days left · {dayData?.phase_name}
            </div>
          </div>
        </div>
      </div>

      <div className="page" style={{ paddingTop: 16 }}>
        {/* Progress */}
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ fontWeight: 600 }}>Today's Progress</span>
            <span className="text-sm text-accent">{completedTasks}/{totalTasks} tasks</span>
          </div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted">Deadline: {new Date(dayData?.deadline).toLocaleDateString()}</span>
            <span className="text-xs text-muted">{dayData?.days_until_deadline} days remain</span>
          </div>
        </div>

        {/* Phase progress */}
        {phases.length > 0 && (
          <div className="mb-4">
            <div className="section-title">Plan Phases</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {phases.map((p, i) => {
                const isActive = dayData?.day_number >= p.start_day && dayData?.day_number <= p.end_day;
                const isPast = dayData?.day_number > p.end_day;
                return (
                  <div key={i} className="badge" style={{
                    background: isActive ? 'rgba(99,102,241,0.2)' : isPast ? 'rgba(34,197,94,0.15)' : 'var(--bg3)',
                    color: isActive ? 'var(--accent2)' : isPast ? 'var(--green)' : 'var(--text2)',
                    fontSize: 12,
                  }}>
                    {isPast ? '✓ ' : isActive ? '▶ ' : ''}{p.name}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Today's tasks */}
        <div className="flex items-center justify-between mb-3">
          <div className="section-title" style={{ margin: 0 }}>Today's Tasks</div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowRegenModal(true)}
            disabled={regenerating}
          >
            {regenerating ? <span className="spinner" /> : '🔄 Regenerate'}
          </button>
        </div>

        {dayData?.tasks?.map((task, i) => (
          <TaskItem key={i} task={task} dayId={dayData.day_id} goalId={id} onUpdate={load} />
        ))}

        {/* Metrics logging */}
        {goal?.phases?.length > 0 && (
          <div className="mt-4">
            <div className="section-title">Log a Metric</div>
            <button className="btn btn-ghost w-full" onClick={() => setShowMetricModal(true)}>
              📈 Log Progress
            </button>
          </div>
        )}

        <div className="mt-4">
          <button className="btn btn-ghost btn-sm text-muted" onClick={deleteGoal}>Archive Goal</button>
        </div>
      </div>

      {/* Regenerate modal */}
      {showRegenModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
          <div style={{ background: 'var(--bg2)', width: '100%', borderRadius: '20px 20px 0 0', padding: 24, paddingBottom: 'calc(24px + var(--safe-bottom))' }}>
            <h2 className="mb-3">Regenerate Today's Tasks</h2>
            <p className="text-muted text-sm mb-3">Tell the coach why you need different tasks today (optional):</p>
            <textarea
              placeholder="e.g. I can't run outside today (rain), swap for indoor alternatives"
              value={regenReason}
              onChange={e => setRegenReason(e.target.value)}
              rows={2}
              className="mb-3"
            />
            <div className="flex gap-2">
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={regenerate}>Regenerate</button>
              <button className="btn btn-ghost" onClick={() => setShowRegenModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
