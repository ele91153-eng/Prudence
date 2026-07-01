import { useNavigate } from 'react-router-dom';

export default function Wardrobe() {
  const navigate = useNavigate();
  const maxStreak = parseInt(localStorage.getItem('prudence_max_streak') || '0', 10);

  return (
    <div style={{ background: 'var(--canvas)', minHeight: '100dvh', paddingBottom: 'calc(var(--nav-h) + var(--safe-bottom) + 24px)' }}>
      <div className="sticky-header row-between">
        <button className="btn-icon" onClick={() => navigate(-1)}>
          <span className="ms" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>Wardrobe</h1>
        <div style={{ width: 40 }} />
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        {/* Active mascot hero */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img
            src="/prudence-original.png"
            width={96} height={96}
            alt="Prudence"
            style={{ margin: '0 auto 12px', display: 'block', objectFit: 'contain', aspectRatio: '1', filter: 'drop-shadow(0 8px 18px rgba(0,0,0,.18))' }}
          />
          <div style={{ fontSize: 16, fontWeight: 700 }}>Prudence</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
            Your productivity companion
          </div>
        </div>

        {/* Streak banner */}
        <div className="card mb-4" style={{ background: 'var(--accent-soft)', border: '1.5px solid rgba(236,139,67,.25)', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 2 }}>Your best streak</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>
            {maxStreak} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-2)' }}>days</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
            Complete all daily tasks to build your streak
          </div>
        </div>

        {/* Prudence card */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginTop: 8 }}>
          <div style={{
            background: 'var(--accent-soft)', border: '2px solid var(--accent)',
            borderRadius: 20, padding: '24px 20px 20px',
            textAlign: 'center', width: '100%', position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: 12, right: 12,
              background: 'var(--accent)', borderRadius: 999,
              padding: '2px 10px', fontSize: 11, fontWeight: 700, color: '#fff',
            }}>ON</div>
            <img
              src="/prudence-original.png"
              width={88} height={88}
              alt="Prudence"
              style={{ display: 'block', margin: '0 auto 12px', objectFit: 'contain', aspectRatio: '1', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,.15))' }}
            />
            <div style={{ fontSize: 15, fontWeight: 700 }}>Prudence</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>🍊 Your original companion</div>
          </div>

          <div style={{ fontSize: 14, color: 'var(--ink-3)', textAlign: 'center', fontStyle: 'italic', padding: '0 20px' }}>
            More companions coming soon — keep your streak going! 🔥
          </div>
        </div>
      </div>
    </div>
  );
}
