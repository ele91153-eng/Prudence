import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/goals').then(g => { setGoals(g); setLoading(false); });
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div style={{ paddingBottom: 80 }}>
      <div className="header">
        <div className="flex items-center justify-between">
          <h1>My Goals</h1>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/goals/new')}>+ New</button>
        </div>
      </div>

      <div className="page" style={{ paddingTop: 16 }}>
        {goals.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎯</div>
            <h2>No active goals</h2>
            <p className="text-muted mt-2">Create a goal to get started with your AI coach.</p>
            <button className="btn btn-primary mt-4" onClick={() => navigate('/goals/new')}>Create a Goal</button>
          </div>
        ) : (
          goals.map(g => {
            const daysLeft = Math.ceil((new Date(g.deadline) - new Date()) / (1000 * 60 * 60 * 24));
            const startDate = g.created_at.split('T')[0].split(' ')[0];
            const dayNum = Math.ceil((new Date() - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
            const totalDays = dayNum + daysLeft;
            const pct = Math.round((dayNum / totalDays) * 100);

            return (
              <div key={g.id} className="goal-card" onClick={() => navigate(`/goals/${g.id}`)}>
                <div className="flex items-center justify-between mb-2">
                  <h3 style={{ flex: 1, marginRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {g.title}
                  </h3>
                  <span className="badge">{daysLeft}d left</span>
                </div>
                <div className="text-xs text-muted mb-2">Day {dayNum} · {new Date(g.deadline).toLocaleDateString()}</div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${Math.max(2, pct)}%` }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
