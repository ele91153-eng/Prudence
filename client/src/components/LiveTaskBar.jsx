import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMascot } from '../context/MascotContext.jsx';

function parseTimeToMinutes(t) {
  if (!t) return null;
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return null;
  let [, h, min, p] = m;
  h = parseInt(h); min = parseInt(min);
  if (p.toUpperCase() === 'PM' && h !== 12) h += 12;
  if (p.toUpperCase() === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export default function LiveTaskBar({ goals = [] }) {
  const navigate = useNavigate();
  const { currentSrc } = useMascot();
  const [now, setNow] = useState(nowMinutes());
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(nowMinutes()), 30000);
    return () => clearInterval(t);
  }, []);

  // Gather all pending tasks with times
  const allTasks = goals.flatMap(g =>
    (g.tasks || [])
      .filter(t => t.status === 'pending' && t.time)
      .map(t => ({ ...t, goalColor: g.goal_color }))
  );

  if (!allTasks.length) return null;

  // Find the next upcoming task (next task after now, or the last past task if all done)
  const withMinutes = allTasks
    .map(t => ({ ...t, mins: parseTimeToMinutes(t.time) }))
    .filter(t => t.mins !== null)
    .sort((a, b) => a.mins - b.mins);

  if (!withMinutes.length) return null;

  const upcoming = withMinutes.find(t => t.mins >= now) || withMinutes[withMinutes.length - 1];
  const isNow = Math.abs(upcoming.mins - now) <= 5;
  const isPast = upcoming.mins < now - 5;
  const minUntil = upcoming.mins - now;

  // Pulse when task time hits
  useEffect(() => {
    if (isNow) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 3000);
      return () => clearTimeout(t);
    }
  }, [isNow]);

  const accent = upcoming.goalColor || 'var(--accent)';

  return (
    <div
      onClick={() => navigate('/')}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: isNow ? accent : 'var(--surface)',
        border: `1.5px solid ${isNow ? accent : 'var(--line)'}`,
        borderRadius: 999, padding: '8px 14px 8px 10px',
        marginBottom: 14, cursor: 'pointer',
        boxShadow: isNow
          ? `0 4px 18px ${accent}55`
          : '0 2px 10px rgba(70,52,28,.08)',
        animation: pulse ? 'prudencefloat 0.4s ease-in-out 3' : 'none',
        transition: 'all 0.3s',
      }}
    >
      {/* Mini mascot */}
      <img src={currentSrc} width={28} height={28} alt="" style={{ flexShrink: 0, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.15))' }} />

      {/* Task info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase',
          color: isNow ? 'rgba(255,255,255,.8)' : 'var(--ink-3)',
          marginBottom: 1,
        }}>
          {isNow ? '⏰ Starting now' : isPast ? 'Next task' : minUntil <= 60 ? `In ${minUntil}m` : upcoming.time}
        </div>
        <div style={{
          fontSize: 14, fontWeight: 700,
          color: isNow ? '#fff' : 'var(--ink)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {upcoming.title}
        </div>
      </div>

      {/* Color dot */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: isNow ? 'rgba(255,255,255,.7)' : accent,
        flexShrink: 0,
      }} />
    </div>
  );
}
