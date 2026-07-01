import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import Prudence from '../components/Prudence.jsx';
import { formatGoalTitle } from '../utils/titleFormat.js';

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/goals').then(g => { setGoals(g); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="loading-screen" style={{ background: 'var(--canvas)', minHeight: '100dvh' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div style={{ background: 'var(--canvas)', minHeight: '100dvh', paddingBottom: 'calc(var(--nav-h) + var(--safe-bottom) + 16px)' }}>
      <div className="sticky-header row-between">
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>My Goals</h1>
        <button className="btn btn-sm btn-primary" onClick={() => navigate('/goals/new')}>
          <span className="ms" style={{ fontSize: 18 }}>add</span> New
        </button>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        {goals.length === 0 ? (
          <div className="empty-state">
            <Prudence size={80} style={{ margin: '0 auto 20px' }} />
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>No active goals</h2>
            <p style={{ color: 'var(--ink-2)', marginBottom: 28, lineHeight: 1.5 }}>
              Let Prudence build you an evidence-based plan for any goal.
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/goals/new')}>Create a goal</button>
          </div>
        ) : (
          <div className="col gap-3">
            {goals.map(g => {
              const daysLeft = Math.ceil((new Date(g.deadline) - new Date()) / (1000*60*60*24));
              const startDate = g.created_at.split('T')[0].split(' ')[0];
              const dayNum = Math.max(1, Math.ceil((new Date() - new Date(startDate)) / (1000*60*60*24)) + 1);
              const totalDays = dayNum + Math.max(0, daysLeft);
              const pct = Math.round((dayNum / totalDays) * 100);

              return (
                <div
                  key={g.id}
                  className="card"
                  style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                  onClick={() => navigate(`/goals/${g.id}`)}
                >
                  <div className="row-between mb-2">
                    <span style={{ fontSize: 16, fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 10 }}>
                      {formatGoalTitle(g.title)}
                    </span>
                    <span className="pill pill-accent">{Math.max(0,daysLeft)}d left</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10 }}>
                    Day {dayNum} · {new Date(g.deadline + 'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                  </div>
                  <div className="pbar-track">
                    <div className="pbar-fill" style={{ width: `${Math.max(2,pct)}%` }} />
                  </div>
                  <div className="row mt-3" style={{ justifyContent: 'flex-end' }}>
                    <span className="ms" style={{ fontSize: 20, color: 'var(--ink-3)' }}>chevron_right</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
