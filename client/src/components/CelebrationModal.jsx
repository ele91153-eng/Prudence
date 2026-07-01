import { useEffect, useState, useRef } from 'react';

const CONFETTI_COLORS = ['#EC8B43','#7CA98A','#E6B23E','#D9694B','#9B8AC4','#D4748A','#6B8CAE','#5A9E9E'];

function makeConfetti(count = 60) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -10 - Math.random() * 20,
    vx: (Math.random() - 0.5) * 3,
    vy: 2 + Math.random() * 4,
    rot: Math.random() * 360,
    vrot: (Math.random() - 0.5) * 10,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 7 + Math.random() * 8,
    isCircle: Math.random() > 0.4,
    opacity: 1,
  }));
}

function Confetti() {
  const canvasRef = useRef(null);
  const particles = useRef(makeConfetti());
  const raf = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.current = particles.current.map(p => {
        const np = {
          ...p,
          x: p.x + p.vx * 0.4,
          y: p.y + p.vy * 0.6,
          rot: p.rot + p.vrot,
          vy: p.vy + 0.05,
          opacity: p.y > canvas.height * 0.85 ? p.opacity - 0.03 : p.opacity,
        };
        ctx.save();
        ctx.globalAlpha = Math.max(0, np.opacity);
        ctx.translate((np.x / 100) * canvas.width, (np.y / 100) * canvas.height);
        ctx.rotate((np.rot * Math.PI) / 180);
        ctx.fillStyle = np.color;
        if (np.isCircle) {
          ctx.beginPath();
          ctx.arc(0, 0, np.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-np.size / 2, -np.size / 4, np.size, np.size / 2);
        }
        ctx.restore();
        return np;
      }).filter(p => p.opacity > 0 && p.y < 120);

      if (particles.current.length > 0) raf.current = requestAnimationFrame(draw);
    }

    raf.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
}

export default function CelebrationModal({ mascot, onClose }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 60); return () => clearTimeout(t); }, []);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(20,14,8,.75)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <Confetti />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg)', borderRadius: 32, padding: '44px 28px 32px',
          textAlign: 'center', maxWidth: 340, width: '100%',
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.7) translateY(40px)',
          opacity: visible ? 1 : 0,
          transition: 'all 0.45s cubic-bezier(.34,1.56,.64,1)',
          boxShadow: '0 28px 70px rgba(0,0,0,.35)',
          position: 'relative', zIndex: 1,
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 8 }}>{mascot.emoji}</div>
        <img
          src="/prudence-original.png"
          width={110} height={110}
          alt={mascot.name}
          style={{ margin: '0 auto 16px', display: 'block', objectFit: 'contain', aspectRatio: '1', filter: 'drop-shadow(0 10px 24px rgba(0,0,0,.22))' }}
        />
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
          You unlocked {mascot.name}!
        </h2>
        <p style={{ color: 'var(--ink-2)', fontSize: 15, lineHeight: 1.5, marginBottom: 8 }}>
          {mascot.streakRequired} days of showing up.
        </p>
        <p style={{ color: 'var(--ink-3)', fontSize: 13, fontStyle: 'italic', fontFamily: 'Newsreader, serif', marginBottom: 28 }}>
          "{mascot.desc}"
        </p>
        <button className="btn btn-primary btn-full" style={{ fontSize: 16 }} onClick={onClose}>
          Let's keep going 🔥
        </button>
        <button className="btn btn-ghost" style={{ marginTop: 10, width: '100%', fontSize: 14 }} onClick={onClose}>
          Go to Wardrobe to equip
        </button>
      </div>
    </div>
  );
}
