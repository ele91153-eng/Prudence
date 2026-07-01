import { useNavigate } from 'react-router-dom';
import { useMascot } from '../context/MascotContext.jsx';

export default function Wardrobe() {
  const navigate = useNavigate();
  const { mascots, unlocked, selected, selectMascot, currentSrc } = useMascot();

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
            src={currentSrc}
            width={96} height={96}
            alt="Current mascot"
            style={{ margin: '0 auto 12px', display: 'block', filter: 'drop-shadow(0 8px 18px rgba(0,0,0,.18))' }}
          />
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            {mascots.find(m => m.id === selected)?.name}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
            {mascots.find(m => m.id === selected)?.desc}
          </div>
        </div>

        {/* Streak banner */}
        <div className="card mb-4" style={{ background: 'var(--accent-soft)', border: '1.5px solid rgba(236,139,67,.25)', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 2 }}>Your best streak</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>
            {maxStreak} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-2)' }}>days</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
            Complete all daily tasks to unlock new Prudences
          </div>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {mascots.map(m => {
            const isUnlocked = unlocked.includes(m.id);
            const isSelected = selected === m.id;
            const progress = m.streakRequired > 0 ? Math.min(1, maxStreak / m.streakRequired) : 1;

            return (
              <div
                key={m.id}
                onClick={() => isUnlocked && selectMascot(m.id)}
                style={{
                  background: isSelected ? 'var(--accent-soft)' : 'var(--surface)',
                  border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--line)'}`,
                  borderRadius: 20, padding: '20px 14px 16px',
                  textAlign: 'center',
                  cursor: isUnlocked ? 'pointer' : 'default',
                  transition: 'all 0.15s',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {isSelected && (
                  <div style={{
                    position: 'absolute', top: 10, right: 10,
                    background: 'var(--accent)', borderRadius: 999,
                    padding: '2px 8px', fontSize: 10, fontWeight: 700, color: '#fff',
                  }}>ON</div>
                )}

                <img
                  src={m.src}
                  width={72} height={72}
                  alt={m.name}
                  style={{
                    display: 'block', margin: '0 auto 10px',
                    filter: isUnlocked ? 'drop-shadow(0 4px 8px rgba(0,0,0,.15))' : 'grayscale(1) brightness(0.45)',
                    transition: 'filter 0.3s',
                  }}
                />

                <div style={{ fontSize: 12, fontWeight: 700, color: isUnlocked ? 'var(--ink)' : 'var(--ink-3)', lineHeight: 1.3 }}>
                  {m.name}
                </div>
                <div style={{ fontSize: 11, marginTop: 4 }}>
                  {m.emoji}
                </div>

                {!isUnlocked && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>
                      🔒 {m.streakRequired} day streak
                    </div>
                    {/* Progress bar toward unlock */}
                    <div style={{ height: 4, borderRadius: 99, background: 'var(--line)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progress * 100}%`, background: 'var(--accent)', borderRadius: 99, transition: 'width 0.4s' }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 3 }}>
                      {maxStreak}/{m.streakRequired} days
                    </div>
                  </div>
                )}

                {isUnlocked && !isSelected && (
                  <div style={{ marginTop: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sage)' }}>Unlocked ✓</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
