import { useEffect, useState } from 'react';
import axios from 'axios';
import { Settings, Users, BookOpen, ShieldAlert, RefreshCw } from 'lucide-react';

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

function AdminPage() {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [ruleSet, setRuleSet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (tab === 'users') loadUsers();
    if (tab === 'ruleset') loadRuleSet();
  }, [tab]);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/admin/users', { headers: authHeaders() });
      setUsers(res.data);
    } catch {
      setMsg({ type: 'error', text: 'Failed to load users.' });
    } finally {
      setLoading(false);
    }
  }

  async function changeRole(userId, newRole) {
    try {
      await axios.patch(`http://localhost:5000/api/admin/users/${userId}/role`, { role: newRole }, { headers: authHeaders() });
      setMsg({ type: 'success', text: `Role updated to ${newRole}.` });
      loadUsers();
    } catch {
      setMsg({ type: 'error', text: 'Failed to update role.' });
    }
  }

  async function loadRuleSet() {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/admin/ruleset', { headers: authHeaders() });
      setRuleSet(res.data);
    } catch {
      setMsg({ type: 'error', text: 'Failed to load rule set.' });
    } finally {
      setLoading(false);
    }
  }

  const tabs = [
    { key: 'users', label: 'Users', icon: <Users size={16} /> },
    { key: 'ruleset', label: 'Rule Set', icon: <BookOpen size={16} /> },
  ];

  const roleBadge = {
    admin: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    officer: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    viewer: 'bg-slate-500/15 text-slate-400 border border-slate-600',
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-amber-500/15 p-2.5 rounded-xl">
          <Settings size={22} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
          <p className="text-slate-400 text-sm">Manage users and rule sets</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setMsg(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm border ${
          msg.type === 'error'
            ? 'bg-red-500/10 border-red-500/30 text-red-400'
            : 'bg-green-500/10 border-green-500/30 text-green-400'
        }`}>
          {msg.text}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Users tab */}
      {!loading && tab === 'users' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-2">
            <p className="text-slate-400 text-sm">{users.length} registered users</p>
            <button onClick={loadUsers} className="text-slate-500 hover:text-white transition">
              <RefreshCw size={16} />
            </button>
          </div>
          {users.map((u) => (
            <div key={u._id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-white font-medium">{u.name}</p>
                <p className="text-slate-500 text-xs">{u.email || u.phone || '—'}</p>
                <p className="text-slate-600 text-xs">{new Date(u.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleBadge[u.role] || roleBadge.viewer}`}>
                  {u.role}
                </span>
                <select
                  defaultValue={u.role}
                  onChange={(e) => changeRole(u._id, e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-blue-500"
                >
                  <option value="viewer">viewer</option>
                  <option value="officer">officer</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            </div>
          ))}
          {users.length === 0 && <p className="text-slate-500 text-center py-10">No users found.</p>}
        </div>
      )}

      {/* Rule Set tab */}
      {!loading && tab === 'ruleset' && ruleSet && (
        <div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-5">
            <div className="flex items-center gap-3 mb-1">
              <ShieldAlert size={18} className="text-blue-400" />
              <p className="text-white font-semibold text-lg">{ruleSet.version}</p>
              {ruleSet.isActive && (
                <span className="text-xs bg-green-500/15 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-semibold">Active</span>
              )}
            </div>
            <p className="text-slate-500 text-sm">Effective: {new Date(ruleSet.effectiveDate).toLocaleDateString()}</p>
            <p className="text-slate-500 text-sm">{ruleSet.rules.length} rules</p>
          </div>

          <div className="space-y-3">
            {ruleSet.rules.map((r) => (
              <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-white font-medium">{r.title}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      r.severity === 'high' ? 'bg-red-500/15 text-red-400' :
                      r.severity === 'medium' ? 'bg-amber-500/15 text-amber-400' :
                      'bg-slate-600/30 text-slate-400'
                    }`}>
                      {r.severity}
                    </span>
                  </div>
                </div>
                <p className="text-slate-500 text-xs">{r.legalReference}</p>
                <p className="text-slate-600 text-xs mt-1">ID: {r.id} · Category: {r.category}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.patterns.map((p, i) => (
                    <span key={i} className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">{p}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
export default AdminPage;
