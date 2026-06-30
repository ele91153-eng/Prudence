import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { requestNotificationPermission, subscribeToPush } from '../utils/push.js';
import TaskItem from '../components/TaskItem.jsx';

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notifStatus, setNotifStatus] = useState(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const d = await api.get('/dashboard/today');
      setData(d);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function enableNotifications() {
    const granted = await requestNotificationPermission();
    if (!granted) { setNotifStatus('denied'); return; }
    await subscribeToPush();
    setNotifStatus('enabled');
  }

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <span>Loading your day…</span>
    </div>
  );

  if (error) return (
    <div className="page">
      <div className="error-box mt-4">{error}</div>
    </div>
  );

  const allTasks = data?.goals?.flatMap(g => g.tasks) || [];
  const hasGoals = data?.goals?.length > 0;

  // Notification banner
  const showNotifBanner = 'Notification' in window && Notification.permission === 'default';

  return (
    <div style={{ paddingBottom: 80 }}>
      <div className="header">
        <div className="flex items-center justify-between">
          <div>
            <h1>Today</h1>
            <div className="text-sm text-muted mt-2" style={{ marginTop: 2 }}>{formatDate(data?.date)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {data?.goals?.map(g => (
              <div key={g.goal_id} className="text-xs text-muted" style={{ marginBottom: 2 }}>
                {g.goal_title}: <span className="text-accent">Day {g.day_number}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="page" style={{ paddingTop: 16 }}>
        {showNotifBanner && notifStatus !== 'enabled' && (
          <div className="card mb-4" style={{ background: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.3)' }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">🔔 Enable notifications for task reminders</span>
              <button className="btn btn-sm btn-primary" onClick={enableNotifications}>Enable</button>
            </div>
            {notifStatus === 'denied' && <div className="text-xs text-muted mt-2">Notifications blocked. Enable in browser settings.</div>}
          </div>
        )}

        {!hasGoals ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎯</div>
            <h2 style={{ marginBottom: 8 }}>No goals yet</h2>
            <p className="text-muted" style={{ marginBottom: 24 }}>Create your first goal and get a personalized daily plan.</p>
            <button className="btn btn-primary" onClick={() => navigate('/goals/new')}>Create a Goal</button>
          </div>
        ) : (
          <>
            {/* Streak row */}
            <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
              {data.goals.map(g => (
                <div key={g.goal_id} className="badge badge-accent">
                  🔥 {data.streaks[g.goal_id] || 0} day streak · {g.goal_title.slice(0, 20)}
                </div>
              ))}
            </div>

            {/* Per-goal progress */}
            {data.goals.map(g => {
              const pct = Math.round((1 - g.days_until_deadline / (g.day_number + g.days_until_deadline)) * 100);
              return (
                <div key={g.goal_id} className="card mb-3" onClick={() => navigate(`/goals/${g.goal_id}`)} style={{ cursor: 'pointer' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm" style={{ fontWeight: 600 }}>{g.goal_title}</span>
                    <span className="badge">{g.days_until_deadline}d left</span>
                  </div>
                  <div className="text-xs text-muted mb-2">{g.phase_name}</div>
                  <div className="progress-bar-track">
                    <div className="progress-bar-fill" style={{ width: `${Math.max(2, pct)}%` }} />
                  </div>
                </div>
              );
            })}

            {/* All tasks merged */}
            <div className="section-title mt-4">Today's Schedule</div>
            {allTasks.length === 0 ? (
              <div className="text-muted text-sm">No tasks generated yet. Tap a goal to load today's tasks.</div>
            ) : (
              allTasks
                .sort((a, b) => a.time?.localeCompare(b.time || '') || 0)
                .map((task, i) => (
                  <TaskItem
                    key={`${task.goal_id}-${task.day_id}-${task.index}`}
                    task={task}
                    dayId={task.day_id}
                    goalId={task.goal_id}
                    onUpdate={load}
                  />
                ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
