import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Goals from './pages/Goals.jsx';
import NewGoal from './pages/NewGoal.jsx';
import GoalDetail from './pages/GoalDetail.jsx';
import History from './pages/History.jsx';
import Prudence from './components/Prudence.jsx';

function Nav() {
  const loc = useLocation();
  const isHome = loc.pathname === '/';
  const isGoals = loc.pathname.startsWith('/goals') && !loc.pathname.includes('new');
  const isNew = loc.pathname.includes('new');
  const isHistory = loc.pathname === '/history';

  return (
    <nav className="nav">
      <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
        <span className="ms ms-fill" style={{ fontSize: 25 }}>cottage</span>
        <span>Home</span>
      </NavLink>
      <NavLink to="/goals" className={({ isActive }) => `nav-item${isActive && !isNew ? ' active' : ''}`}>
        <span className="ms" style={{ fontSize: 25 }}>flag</span>
        <span>Goals</span>
      </NavLink>
      {/* Centre Prudence button — taps to New Goal */}
      <NavLink to="/goals/new" className="nav-center">
        <div style={{
          width: 50, height: 50, borderRadius: '50%',
          boxShadow: '0 8px 20px rgba(236,139,67,.45)',
          position: 'relative', overflow: 'visible',
          background: isNew ? 'var(--accent-2)' : 'transparent',
          transition: 'box-shadow 0.2s',
        }}>
          <Prudence size={50} style={{ animation: 'prudencefloat 4s ease-in-out infinite' }} />
        </div>
        <span style={{ color: isNew ? 'var(--accent)' : undefined }}>Prudence</span>
      </NavLink>
      <NavLink to="/history" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
        <span className="ms" style={{ fontSize: 25 }}>insights</span>
        <span>Stats</span>
      </NavLink>
      {/* Profile placeholder — links to goals for now */}
      <NavLink to="/goals" className="nav-item">
        <span className="ms" style={{ fontSize: 25 }}>person</span>
        <span>Profile</span>
      </NavLink>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/goals/new" element={<NewGoal />} />
        <Route path="/goals/:id" element={<GoalDetail />} />
        <Route path="/history" element={<History />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Nav />
    </BrowserRouter>
  );
}
