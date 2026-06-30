import { useEffect, useState } from 'react';
import { api } from '../utils/api.js';
import Prudence from '../components/Prudence.jsx';

export default function History() {
  const [goals, setGoals] = useState([]);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMetric, setShowMetric] = useState(false);
  const [metricName, setMetricName] = useState('');
  const [metricValue, setMetricValue] = useState('');
  const [metricSaving, setMetricSaving] = useState(false);

  useEffect(() => {
    api.get('/goals').then(g => {
      setGoals(g);
      if (g.length > 0) setSelected(g[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setHistory(null);
    api.get(`/goals/${selected}/history`).then(setHistory);
  }, [selected]);

  async function saveMetric() {
    if (!metricName || !metricValue) return;
    setMetricSaving(true);
    await api.post(`/goals/${selected}/metrics`, { metric_name: metricName, value: metricValue });
    setMetricSaving(false);
    setShowMetric(false);
    setMetricName(''); setMetricValue('');
    api.get(`/goals/${selected}/history`).then(setHistory);
  }

  if (loading) return (
    <div className="loading-screen" style={{ background: 'var(--canvas)', minHeight: '100dvh' }}>
      <div className="spinner" />
    </div>
  );

  const days = history?.days ?? [];
  const metrics = history?.metrics ?? [];
  const totalDays = days.length;
  const completedDays = days.filter(d => d.total_tasks > 0 && d.completed_tasks >= d.total_tasks * 0.5).length;
  const completionRate = totalDays ? Math.round((completedDays / totalDays) * 100) : 0;
  const totalTasks = days.reduce((s, d) => s + (d.total_tasks || 0), 0);
  const doneTasks = days.reduce((s, d) => s + (d.completed_tasks || 0), 0);

  return (
    <div style={{ background: 'var(--canvas)', minHeight: '100dvh', paddingBottom: 'calc(var(--nav-h) + var(--safe-bottom) + 16px)' }}>
      <div className="sticky-header">
        <div className="row-between">
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Stats</h1>
          {selected && (
            <button className="btn btn-sm btn-secondary" onClick={() => setShowMetric(true)}>
              <span className="ms" style={{ fontSize: 16 }}>add</span> Log metric
            </button>
          )}
        </div>
        {goals.length > 1 && (
          <select
            value={selected ?? ''}
            onChange={e => setSelected(e.target.value)}
            style={{ marginTop: 10, fontSize: 14, padding: '8px 12px' }}
          >
            {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
        )}
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        {goals.length === 0 ? (
          <div className="empty-state">
            <Prudence size={72} style={{ margin: '0 auto 20px' }} />
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>No stats yet</h2>
            <p style={{ color: 'var(--ink-2)', marginTop: 8 }}>Create a goal to start tracking progress.</p>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="row gap-2 mb-4">
              <div className="stat-card">
                <div className="stat-num" style={{ color: 'var(--accent)' }}>{completionRate}%</div>
                <div className="stat-label">Completion</div>
              </div>
              <div className="stat-card">
                <div className="stat-num" style={{ color: 'var(--sage)' }}>{completedDays}</div>
                <div className="stat-label">Days done</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{totalDays}</div>
                <div className="stat-label">Days tracked</div>
              </div>
            </div>

            {/* Task count */}
            {totalTasks > 0 && (
              <div className="card mb-4">
                <div className="row-between mb-2">
                  <span style={{ fontSize: 14, fontWeight: 700 }}>Tasks completed</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{doneTasks}/{totalTasks}</span>
                </div>
                <div className="pbar-track">
                  <div className="pbar-fill" style={{ width: `${Math.round(doneTasks/Math.max(1,totalTasks)*100)}%` }} />
                </div>
              </div>
            )}

            {/* Day log */}
            <div className="section-label">Day log</div>
            {!history ? (
              <div style={{ textAlign: 'center', padding: 24 }}><div className="spinner" /></div>
            ) : days.length === 0 ? (
              <div className="card-soft" style={{ textAlign: 'center', padding: 24 }}>
                <p style={{ color: 'var(--ink-2)', fontSize: 14 }}>No logged days yet — start checking off tasks!</p>
              </div>
            ) : (
              <div className="col gap-2">
                {days.map(day => {
                  const pct = day.total_tasks ? Math.round((day.completed_tasks / day.total_tasks) * 100) : 0;
                  const isGood = pct >= 80;
                  const isOk = pct >= 50;
                  return (
                    <div key={day.id} className="card">
                      <div className="row-between mb-1">
                        <span style={{ fontSize: 14, fontWeight: 700 }}>
                          {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: isGood ? 'var(--sage)' : isOk ? 'var(--accent)' : 'var(--ink-3)' }}>
                          {day.completed_tasks}/{day.total_tasks} tasks
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 8 }}>
                        {day.phase_name} · Day {day.day_number}
                      </div>
                      <div className="pbar-track">
                        <div className="pbar-fill" style={{
                          width: `${pct}%`,
                          background: isGood ? 'var(--sage)' : isOk ? 'linear-gradient(90deg,var(--accent),var(--accent-2))' : 'var(--gold)',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Metrics */}
            {metrics.length > 0 && (
              <>
                <div className="section-label mt-4">Logged metrics</div>
                <div className="col gap-2">
                  {metrics.map(m => (
                    <div key={m.id} className="card row-between">
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{m.metric_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                          {new Date(m.date + 'T12:00:00').toLocaleDateString()}
                        </div>
                      </div>
                      <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>{m.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Log metric sheet */}
      {showMetric && (
        <div className="sheet-overlay" onClick={() => setShowMetric(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Log a metric</h2>
            <div className="mb-3">
              <label className="label">What are you tracking?</label>
              <input placeholder="e.g. Practice test score, miles run" value={metricName} onChange={e => setMetricName(e.target.value)} />
            </div>
            <div className="mb-4">
              <label className="label">Value</label>
              <input placeholder="e.g. 1420, 8.5" value={metricValue} onChange={e => setMetricValue(e.target.value)} />
            </div>
            <div className="row gap-2">
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveMetric} disabled={metricSaving || !metricName || !metricValue}>
                {metricSaving ? <span className="spinner" /> : 'Save'}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowMetric(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
