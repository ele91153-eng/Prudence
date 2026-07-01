import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { requestNotificationPermission, subscribeToPush } from '../utils/push.js';
import TaskItem from '../components/TaskItem.jsx';
import Prudence from '../components/Prudence.jsx';

function localDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDateDisplay() {
  const d = new Date();
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[d.getDay()]} · ${months[d.getMonth()]} ${d.getDate()}`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function parseTimeToMinutes(t) {
  if (!t) return 0;
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 0;
  let [,h,min,p] = m; h = parseInt(h); min = parseInt(min);
  if (p.toUpperCase()==='PM' && h!==12) h += 12;
  if (p.toUpperCase()==='AM' && h===12) h = 0;
  return h*60+min;
}

const PRUDENCE_QUOTES = [
  '"One small step today is still forward."',
  '"Progress is made one day at a time — you\'re doing it."',
  '"Rest is part of the plan, not a detour from it."',
  '"Show up for yourself the way you\'d show up for a friend."',
  '"Small consistent wins compound into big results."',
];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notifAsked, setNotifAsked] = useState(false);
  const navigate = useNavigate();
  const quote = PRUDENCE_QUOTES[new Date().getDay() % PRUDENCE_QUOTES.length];

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
    setNotifAsked(true);
    const granted = await requestNotificationPermission();
    if (granted) await subscribeToPush();
  }

  if (loading) return (
    <div style={{ background: 'var(--canvas)', minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <Prudence size={88} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Prudence</div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic', fontFamily: 'Newsreader, serif' }}>AI for Productivity</div>
      </div>
      <div className="spinner" style={{ marginTop: 8 }} />
    </div>
  );

  if (error) return (
    <div className="page">
      <div className="error-box mt-4">{error}</div>
      <button className="btn btn-ghost mt-3" onClick={load}>Try again</button>
    </div>
  );

  const hasGoals = (data?.goals?.length ?? 0) > 0;
  const allTasks = (data?.goals ?? []).flatMap(g => g.tasks);
  const doneTasks = allTasks.filter(t => t.status === 'done').length;
  const showNotifBanner = !notifAsked && 'Notification' in window && Notification.permission === 'default';

  const today = new Date();
  const dayOfWeek = today.getDay();
  const DAYS = ['S','M','T','W','T','F','S'];
  const weekDots = DAYS.map((label, i) => ({
    label, isToday: i === dayOfWeek, isPast: i < dayOfWeek,
  }));

  return (
    <div style={{ background: 'var(--canvas)', minHeight: '100dvh', paddingBottom: 'calc(var(--nav-h) + var(--safe-bottom) + 16px)' }}>
      {/* Ambient glow */}
      <div style={{ position: 'fixed', top: -90, right: -70, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle,rgba(236,139,67,.14),transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: 120, left: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,169,138,.1),transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* ── Hero header ── */}
      <div style={{ position: 'relative', zIndex: 1, padding: 'calc(var(--safe-top) + 28px) 22px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
        {/* Prudence — large, centred, greeting the user */}
        <Prudence size={96} style={{ marginBottom: 4 }} />
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
          {formatDateDisplay()}
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.15 }}>
          {getGreeting()} ✦
        </div>
        <div style={{ fontSize: 13, fontStyle: 'italic', fontFamily: 'Newsreader, serif', color: 'var(--ink-3)', marginBottom: 4 }}>
          Prudence: AI for Productivity
        </div>
      </div>

      {/* Prudence says */}
      <div style={{ padding: '18px 22px 0', position: 'relative', zIndex: 1 }}>
        <div className="prudence-says mb-4" onClick={() => navigate('/chat')} style={{ cursor: 'pointer' }}>
          <div className="prudence-says-label">
            <span className="ms ms-fill" style={{ fontSize: 16, color: 'var(--accent-2)' }}>spa</span>
            Prudence says
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--accent-2)', fontWeight: 600 }}>Chat →</span>
          </div>
          <p className="prudence-says-quote">{quote}</p>
        </div>

        {/* Notification banner */}
        {showNotifBanner && (
          <div className="card row-between mb-4" style={{ background: 'var(--accent-soft)', borderColor: 'rgba(236,139,67,.25)' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>🔔 Enable task reminders</span>
            <button className="btn btn-sm btn-primary" onClick={enableNotifications}>Enable</button>
          </div>
        )}

        {/* Streak + week dots */}
        {hasGoals && (
          <div className="card mb-4">
            <div className="row-between mb-3">
              <div className="row gap-2">
                <span className="ms ms-fill" style={{ fontSize: 24, color: 'var(--accent)' }}>local_fire_department</span>
                <span style={{ fontSize: 19, fontWeight: 800, color: 'var(--ink)' }}>
                  {Math.max(0, ...Object.values(data.streaks ?? {}))}
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-2)' }}> day streak</span>
                </span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sage)' }}>
                {allTasks.length > 0 ? `${doneTasks} of ${allTasks.length} done` : 'on track ✓'}
              </span>
            </div>
            <div className="row-between">
              {weekDots.map((d, i) => (
                <div key={i} className="col" style={{ alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: d.isToday ? 700 : 600, color: d.isToday ? 'var(--accent)' : 'var(--ink-3)' }}>
                    {d.label}
                  </span>
                  <div className={`week-dot ${d.isPast ? 'done' : d.isToday ? 'today' : 'empty'}`}>
                    {d.isPast && <span className="ms ms-fill" style={{ fontSize: 14, color: '#fff' }}>check</span>}
                    {d.isToday && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)' }} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!hasGoals ? (
          <div style={{ textAlign: 'center', paddingTop: 16, paddingBottom: 32 }}>
            <p style={{ color: 'var(--ink-2)', marginBottom: 28, lineHeight: 1.6, fontSize: 15 }}>
              Tell Prudence your goal and get an evidence-based daily coaching plan.
            </p>
            <button className="btn btn-primary" style={{ padding: '14px 32px', fontSize: 16 }} onClick={() => navigate('/goals/new')}>
              Set your first goal
            </button>
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => navigate('/chat')}>
                <span className="ms" style={{ fontSize: 18 }}>chat</span>
                Chat with Prudence first
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Goal progress cards */}
            {data.goals.map(g => {
              const pct = Math.round((1 - g.days_until_deadline / Math.max(1, g.day_number + g.days_until_deadline)) * 100);
              return (
                <div key={g.goal_id} className="card mb-3" onClick={() => navigate(`/goals/${g.goal_id}`)} style={{ cursor: 'pointer' }}>
                  <div className="row-between mb-2">
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>{g.goal_title}</span>
                    <span className="pill pill-accent">{g.days_until_deadline}d left</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 8 }}>Day {g.day_number} · {g.phase_name}</div>
                  <div className="pbar-track"><div className="pbar-fill" style={{ width: `${Math.max(2, pct)}%` }} /></div>
                </div>
              );
            })}

            <div className="row-between mb-3 mt-4">
              <span className="section-label" style={{ margin: 0 }}>Today's focus</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-3)' }}>{doneTasks} of {allTasks.length} done</span>
            </div>

            {allTasks.length === 0 ? (
              <div className="card-soft" style={{ textAlign: 'center', padding: 24 }}>
                <p style={{ color: 'var(--ink-2)', fontSize: 14 }}>Tap a goal to load today's tasks</p>
              </div>
            ) : (
              <div className="col gap-2">
                {[...allTasks]
                  .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time))
                  .map(task => (
                    <TaskItem
                      key={`${task.goal_id}-${task.day_id}-${task.index}`}
                      task={task}
                      dayId={task.day_id}
                      goalId={task.goal_id}
                      onUpdate={load}
                    />
                  ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
