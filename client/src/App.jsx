import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Goals from './pages/Goals.jsx';
import NewGoal from './pages/NewGoal.jsx';
import GoalDetail from './pages/GoalDetail.jsx';
import History from './pages/History.jsx';
import Chat from './pages/Chat.jsx';
import Wardrobe from './pages/Wardrobe.jsx';
import Prudence from './components/Prudence.jsx';
import { MascotProvider } from './context/MascotContext.jsx';

function Nav() {
  const loc = useLocation();
  const isChat = loc.pathname === '/chat';
  const isNew = loc.pathname.includes('new');
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
        <Prudence size={50} animate={false} style={{ filter: 'drop-shadow(0 4px 10px rgba(236,139,67,.45))' }} />
        <span>Chat</span>
      </NavLink>
      <NavLink to="/history" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
        <span className="ms" style={{ fontSize: 25 }}>insights</span>
        <span>Stats</span>
      </NavLink>
      <NavLink to="/wardrobe" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
        <span className="ms" style={{ fontSize: 25 }}>checkroom</span>
        <span>Wardrobe</span>
      </NavLink>
    </nav>
  );
}

export default function App() {
  return (
    <MascotProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/goals/new" element={<NewGoal />} />
          <Route path="/goals/:id" element={<GoalDetail />} />
          <Route path="/history" element={<History />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/wardrobe" element={<Wardrobe />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Nav />
      </BrowserRouter>
    </MascotProvider>
  );
}
