import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import TaskItem from '../components/TaskItem.jsx';
import Prudence from '../components/Prudence.jsx';
import { formatGoalTitle } from '../utils/titleFormat.js';

function parseTimeToMinutes(t) {
  if (!t) return 0;
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 0;
  let [,h,min,p] = m; h = parseInt(h); min = parseInt(min);
  if (p.toUpperCase()==='PM' && h!==12) h += 12;
  if (p.toUpperCase()==='AM' && h===12) h = 0;
  return h*60+min;
}

function MetricSheet({ goalId, onClose }) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name || !value) return;
    setSaving(true);
    await api.post(`/goals/${goalId}/metrics`, { metric_name: name, value });
    setSaving(false);
    onClose();
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Log progress</h2>
        <div className="mb-3">
          <label className="label">What are you tracking?</label>
          <input placeholder="e.g. Practice test score, miles run, words learned" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="mb-4">
          <label className="label">Value</label>
          <input placeholder="e.g. 1420, 8.5, 200" value={value} onChange={e => setValue(e.target.value)} />
        </div>
        <div className="row gap-2">
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={save} disabled={saving || !name || !value}>
            {saving ? <span className="spinner" /> : 'Save'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function RegenSheet({ onRegen, onClose }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  async function go() {
    setLoading(true);
    await onRegen(reason);
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Regenerate today</h2>
        <p style={{ color: 'var(--ink-2)', fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>
          Tell Prudence why you need different tasks — or just tap Regenerate.
        </p>
        <textarea
          placeholder="e.g. Can't run outside today (rain), need indoor alternatives"
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={2}
          className="mb-4"
        />
        <div className="row gap-2">
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={go} disabled={loading}>
            {loading ? <span className="spinner" /> : 'Regenerate'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function GoalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dayData, setDayData] = useState(null);
  const [goal, setGoal] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRegen, setShowRegen] = useState(false);
  const [showMetric, setShowMetric] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [g, d, h] = await Promise.all([
        api.get(`/goals/${id}`),
        api.get(`/goals/${id}/today`),
        api.get(`/goals/${id}/history`),
      ]);
      setGoal(g); setDayData(d); setHistory(h);
      setError(null);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleRegen(reason) {
    setRegenLoading(true);
    setShowRegen(false);
    try {
      await api.post(`/goals/${id}/today/regenerate`, { reason });
      await load();
    } catch (e) { setError(e.message); }
    finally { setRegenLoading(false); }
  }

  async function archiveGoal() {
    if (!confirm('Archive this goal?')) return;
    await api.delete(`/goals/${id}`);
    navigate('/goals', { replace: true });
  }

  if (loading) return (
    <div className="loading-screen" style={{ background: 'var(--canvas)', minHeight: '100dvh' }}>
      <Prudence size={64} />
      <span className="fw-600 ink-2">Loading…</span>
    </div>
  );

  if (error) return (
    <div className="page">
      <div className="error-box mt-4">{error}</div>
      <button className="btn btn-ghost mt-3" onClick={load}>Retry</button>
    </div>
  );

  const phases = goal?.phases ?? [];
  const tasks = dayData?.tasks ?? [];
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const pct = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;
  const ringDeg = (pct / 100) * 360;
  const daysLeft = dayData?.days_until_deadline ?? 0;
  const dayNum = dayData?.day_number ?? 1;
  const totalDays = dayNum + daysLeft;
  const overallPct = Math.round((dayNum / Math.max(1, totalDays)) * 100);

  // Build 28-day heatmap from history
  const dayMap = {};
  (history?.days ?? []).forEach(d => {
    const ratio = d.total_tasks > 0 ? d.completed_tasks / d.total_tasks : 0;
    dayMap[d.date] = ratio;
  });
  const heatmapDays = Array.from({ length: 28 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (27 - i));
    const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    return dayMap[key] ?? null;
  });

  return (
    <div style={{ background: 'var(--canvas)', minHeight: '100dvh', paddingBottom: 'calc(var(--nav-h) + var(--safe-bottom) + 16px)' }}>
      {/* Header */}
      <div className="sticky-header row-between">
        <button className="btn-icon" onClick={() => navigate(-1)}>
          <span className="ms" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
        </button>
        <div style={{ flex: 1, textAlign: 'center', padding: '0 8px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatGoalTitle(goal?.title)}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Day {dayNum} · {daysLeft} days left</div>
        </div>
        <button className="btn-icon" onClick={archiveGoal}>
          <span className="ms" style={{ fontSize: 20, color: 'var(--ink-3)' }}>archive</span>
        </button>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        {/* Ring + Prudence */}
        <div className="col" style={{ alignItems: 'center', marginBottom: 20 }}>
          <div className="ring-wrap" style={{
            width: 168, height: 168,
            background: `conic-gradient(${goal?.color || 'var(--accent)'} 0% ${overallPct}%, ${goal?.color ? goal.color + '22' : 'var(--accent-soft)'} ${overallPct}% 100%)`,
          }}>
            <div className="ring-inner" style={{ width: 132, height: 132 }}>
              <Prudence size={46} style={{ marginBottom: 4 }} />
              <span style={{ fontSize: 28, fontWeight: 800 }}>{dayNum}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>day streak</span>
            </div>
          </div>
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <span className="pill pill-accent">{dayData?.phase_name}</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="row gap-2 mb-4">
          <div className="stat-card">
            <div className="stat-num">{pct}%</div>
            <div className="stat-label">Today</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{overallPct}%</div>
            <div className="stat-label">Overall</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{daysLeft}</div>
            <div className="stat-label">Days left</div>
          </div>
        </div>

        {/* Phase chips */}
        {phases.length > 0 && (
          <div className="mb-4">
            <div className="section-label">Plan phases</div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
              {phases.map((p, i) => {
                const isActive = dayNum >= p.start_day && dayNum <= p.end_day;
                const isPast = dayNum > p.end_day;
                return (
                  <span key={i} className="pill" style={{
                    background: isActive ? 'var(--accent-soft)' : isPast ? 'var(--sage-soft)' : 'var(--bg-2)',
                    color: isActive ? 'var(--accent-2)' : isPast ? 'var(--sage)' : 'var(--ink-3)',
                    fontWeight: 600,
                  }}>
                    {isPast ? '✓ ' : isActive ? '▶ ' : ''}{p.name}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Heatmap */}
        <div className="card mb-4">
          <div className="section-label" style={{ marginBottom: 12 }}>Last 4 weeks</div>
          <div className="heatmap">
            {heatmapDays.map((ratio, i) => (
              <div key={i} className="heatmap-cell" style={{
                background: ratio === null
                  ? 'var(--bg-2)'
                  : ratio === 0
                  ? 'var(--line)'
                  : `rgba(236,139,67,${0.25 + ratio * 0.75})`,
              }} />
            ))}
          </div>
        </div>

        {/* Today's tasks */}
        <div className="row-between mb-3">
          <div className="section-label" style={{ margin: 0 }}>Today's tasks</div>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => setShowRegen(true)}
            disabled={regenLoading}
          >
            {regenLoading
              ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
              : <><span className="ms" style={{ fontSize: 15 }}>refresh</span> Regenerate</>
            }
          </button>
        </div>

        <div className="col gap-2 mb-4">
          {[...tasks]
            .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time))
            .map(task => (
              <TaskItem key={task.index} task={task} dayId={dayData.day_id} goalId={id} onUpdate={load} />
            ))
          }
        </div>

        {/* Log Progress */}
        <button className="btn btn-secondary btn-full mb-2" onClick={() => setShowMetric(true)}>
          <span className="ms" style={{ fontSize: 18 }}>bar_chart</span>
          Log Progress
        </button>
      </div>

      {showRegen && <RegenSheet onRegen={handleRegen} onClose={() => setShowRegen(false)} />}
      {showMetric && <MetricSheet goalId={id} onClose={() => { setShowMetric(false); load(); }} />}
    </div>
  );
}
