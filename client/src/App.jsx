import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Goals from './pages/Goals.jsx';
import NewGoal from './pages/NewGoal.jsx';
import GoalDetail from './pages/GoalDetail.jsx';
import History from './pages/History.jsx';
import Chat from './pages/Chat.jsx';
import Prudence from './components/Prudence.jsx';

function Nav() {
  const loc = useLocation();
  const isChat = loc.pathname === '/chat';
  const isNew = loc.pathname.includes('new');
  // Hide nav on chat page (full-screen experience)
  if (isChat) return null;

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
      {/* Centre Prudence button — opens Chat */}
      <NavLink to="/chat" className="nav-center">
        <div style={{
          width: 50, height: 50, borderRadius: '50%',
          boxShadow: '0 8px 20px rgba(236,139,67,.45)',
          position: 'relative', overflow: 'visible',
          transition: 'box-shadow 0.2s',
        }}>
          <Prudence size={50} style={{ animation: 'prudencefloat 4s ease-in-out infinite' }} />
        </div>
        <span>Chat</span>
      </NavLink>
      <NavLink to="/history" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
        <span className="ms" style={{ fontSize: 25 }}>insights</span>
        <span>Stats</span>
      </NavLink>
      <NavLink to="/goals/new" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
        <span className="ms" style={{ fontSize: 25 }}>add_circle</span>
        <span>New Goal</span>
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
        <Route path="/chat" element={<Chat />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Nav />
    </BrowserRouter>
  );
}
