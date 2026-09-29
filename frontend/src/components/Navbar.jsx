import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck, LogOut, LayoutDashboard, ScanLine, Clock,
  AlertTriangle, Info, Settings, Plus
} from 'lucide-react';

const linkClass = ({ isActive }) =>
  `flex items-center gap-1.5 text-sm font-medium transition-colors ${
    isActive ? 'text-blue-400' : 'text-slate-400 hover:text-white'
  }`;

function Navbar() {
  const { isAuthenticated, isAdmin, role, name, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const canInspect = isAuthenticated && ['admin', 'officer', 'inspector'].includes(role);

  return (
    <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <NavLink to="/" className="flex items-center gap-2 text-white font-bold text-lg">
        <ShieldCheck size={22} className="text-blue-400" />
        Parakh AI
      </NavLink>

      <div className="flex items-center gap-5">
        <NavLink to="/" end className={linkClass}>Home</NavLink>

        {isAuthenticated && (
          <>
            <NavLink to="/dashboard" className={linkClass}>
              <LayoutDashboard size={15} />Dashboard
            </NavLink>
            <NavLink to="/history" className={linkClass}>
              <Clock size={15} />History
            </NavLink>
            <NavLink to="/violations" className={linkClass}>
              <AlertTriangle size={15} />Violations
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={linkClass}>
                <Settings size={15} />Admin
              </NavLink>
            )}
          </>
        )}

        <NavLink to="/about" className={linkClass}>
          <Info size={15} />About
        </NavLink>
      </div>

      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          <>
            <span className="text-slate-400 text-sm hidden sm:block">
              Hi, <span className="text-white font-medium">{name}</span>
            </span>
            {role && role !== 'viewer' && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                isAdmin ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}>
                {role}
              </span>
            )}
            {canInspect && (
              <NavLink
                to="/new-inspection"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition ${
                    isActive ? 'bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`
                }
              >
                <Plus size={15} />
                New Inspection
              </NavLink>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-400 transition"
            >
              <LogOut size={16} />
              <span className="hidden sm:block">Sign out</span>
            </button>
          </>
        ) : (
          <NavLink
            to="/login"
            className="text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg transition"
          >
            Sign In
          </NavLink>
        )}
      </div>
    </nav>
  );
}
export default Navbar;
