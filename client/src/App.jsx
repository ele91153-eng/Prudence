import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Goals from './pages/Goals.jsx';
import NewGoal from './pages/NewGoal.jsx';
import GoalDetail from './pages/GoalDetail.jsx';
import History from './pages/History.jsx';

function Nav() {
  return (
    <nav className="nav">
      <NavLink to="/" end className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <span className="nav-icon">🏠</span>
        <span>Today</span>
      </NavLink>
      <NavLink to="/goals" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <span className="nav-icon">🎯</span>
        <span>Goals</span>
      </NavLink>
      <NavLink to="/goals/new" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <span className="nav-icon">＋</span>
        <span>New</span>
      </NavLink>
      <NavLink to="/history" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <span className="nav-icon">📊</span>
        <span>History</span>
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
