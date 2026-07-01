import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

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
const [now, setNow] = useState(nowMinutes());
  const [pulse, setPulse] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const firedRef = useRef(new Set()); // track which tasks we already alerted

  useEffect(() => {
    const t = setInterval(() => setNow(nowMinutes()), 15000); // check every 15s
    return () => clearInterval(t);
  }, []);

  // Gather all pending tasks with times
  const allTasks = goals.flatMap(g =>
    (g.tasks || [])
      .filter(t => t.status === 'pending' && t.time)
      .map(t => ({ ...t, goalColor: g.goal_color, goalTitle: g.title }))
  );

  const withMinutes = allTasks
    .map(t => ({ ...t, mins: parseTimeToMinutes(t.time) }))
    .filter(t => t.mins !== null)
    .sort((a, b) => a.mins - b.mins);

  if (!withMinutes.length) return null;

  const upcoming = withMinutes.find(t => t.mins >= now) || withMinutes[withMinutes.length - 1];
  const isNow = Math.abs(upcoming.mins - now) <= 5;
  const isPast = upcoming.mins < now - 5;
  const minUntil = upcoming.mins - now;

  // In-app alert when task hits (fallback when Notification not granted / not supported)
  useEffect(() => {
    if (isNow && !firedRef.current.has(upcoming.id)) {
      firedRef.current.add(upcoming.id);
      setPulse(true);
      setShowBanner(true);

      // Vibration fallback (works even without notification permission)
      if ('vibrate' in navigator) navigator.vibrate([300, 100, 300, 100, 300]);

      setTimeout(() => setPulse(false), 4000);
      // Auto-dismiss banner after 30 seconds
      setTimeout(() => setShowBanner(false), 30000);
    }
  }, [isNow, upcoming.id]);

  const accent = upcoming.goalColor || 'var(--accent)';

  return (
    <>
      {/* Persistent in-app banner when task is starting NOW */}
      {showBanner && isNow && (
        <div
          onClick={() => setShowBanner(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
            background: accent,
            padding: '12px 16px 10px',
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: `0 4px 24px ${accent}88`,
            animation: 'prudencefloat 0.5s ease-in-out 3',
            cursor: 'pointer',
          }}
        >
          <img src="/prudence-original.png" width={32} height={32} alt="" style={{ flexShrink: 0, objectFit: 'contain', aspectRatio: '1' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.8)', letterSpacing: 1, textTransform: 'uppercase' }}>⏰ Starting Now</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{upcoming.title}</div>
          </div>
          <div style={{ fontSize: 18, color: 'rgba(255,255,255,.7)', lineHeight: 1 }}>✕</div>
        </div>
      )}

      {/* Live task pill */}
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
        <img src="/prudence-original.png" width={28} height={28} alt="" style={{ flexShrink: 0, objectFit: 'contain', aspectRatio: '1', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.15))' }} />

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

        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: isNow ? 'rgba(255,255,255,.7)' : accent,
          flexShrink: 0,
        }} />
      </div>
    </>
  );
}
