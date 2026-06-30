import { useEffect, useState } from 'react';
import { api } from '../utils/api.js';

export default function History() {
  const [goals, setGoals] = useState([]);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/goals').then(g => {
      setGoals(g);
      if (g.length > 0) setSelected(g[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    api.get(`/goals/${selected}/history`).then(setHistory);
  }, [selected]);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const totalDays = history?.days?.length || 0;
  const completedDays = history?.days?.filter(d => d.completed_tasks > 0 && d.completed_tasks >= d.total_tasks * 0.5).length || 0;
  const completionRate = totalDays ? Math.round((completedDays / totalDays) * 100) : 0;

  return (
    <div style={{ paddingBottom: 80 }}>
      <div className="header">
        <h1>History</h1>
        {goals.length > 1 && (
          <select
            value={selected || ''}
            onChange={e => setSelected(e.target.value)}
            style={{ marginTop: 8, padding: '6px 10px', fontSize: 14 }}
          >
            {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
        )}
      </div>

      <div className="page" style={{ paddingTop: 16 }}>
        {goals.length === 0 ? (
          <div className="text-muted text-sm">No goals yet.</div>
        ) : (
          <>
            <div className="flex gap-3 mb-4">
              <div className="card" style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent2)' }}>{completionRate}%</div>
                <div className="text-xs text-muted">Completion Rate</div>
              </div>
              <div className="card" style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--green)' }}>{completedDays}</div>
                <div className="text-xs text-muted">Days Completed</div>
              </div>
              <div className="card" style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{totalDays}</div>
                <div className="text-xs text-muted">Days Tracked</div>
              </div>
            </div>

            <div className="section-title">Day Log</div>
            {history?.days?.length === 0 && (
              <div className="text-muted text-sm">No logged days yet — start working on today's tasks!</div>
            )}
            {history?.days?.map(day => {
              const pct = day.total_tasks ? Math.round((day.completed_tasks / day.total_tasks) * 100) : 0;
              return (
                <div key={day.id} className="card mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm" style={{ fontWeight: 600 }}>
                      {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-xs text-muted">{day.completed_tasks}/{day.total_tasks} tasks</span>
                  </div>
                  <div className="text-xs text-muted mb-2">{day.phase_name} · Day {day.day_number}</div>
                  <div className="progress-bar-track">
                    <div className="progress-bar-fill" style={{ width: `${pct}%`, background: pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--accent)' : 'var(--yellow)' }} />
                  </div>
                </div>
              );
            })}

            {history?.metrics?.length > 0 && (
              <>
                <div className="section-title mt-4">Logged Metrics</div>
                {history.metrics.map(m => (
                  <div key={m.id} className="card mb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ fontWeight: 600 }}>{m.metric_name}</span>
                      <span className="text-accent">{m.value}</span>
                    </div>
                    <div className="text-xs text-muted">{new Date(m.date + 'T12:00:00').toLocaleDateString()}</div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
