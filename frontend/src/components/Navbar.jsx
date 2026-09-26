import { NavLink } from 'react-router-dom';

function Navbar() {
  const linkClass = ({ isActive }) =>
    `text-sm font-medium transition ${isActive ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`;

  return (
    <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
      <NavLink to="/" className="text-white font-bold text-lg">Parakh AI</NavLink>
      <div className="flex gap-6">
        <NavLink to="/" className={linkClass}>Home</NavLink>
        <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
        <NavLink to="/check" className={linkClass}>Check Compliance</NavLink>
        <NavLink to="/history" className={linkClass}>History</NavLink>
        <NavLink to="/about" className={linkClass}>About</NavLink>
      </div>
    </nav>
  );
}
export default Navbar;
