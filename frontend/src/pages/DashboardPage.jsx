import { useEffect, useState } from 'react';
import client from '../api/client';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Legend,
} from 'recharts';
import { ShieldCheck, AlertTriangle, Clock, Layers, ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';

const SEVERITY_COLORS = { high: '#f87171', medium: '#fbbf24', low: '#94a3b8' };
const STATUS_COLORS = ['#4ade80', '#f87171', '#fbbf24'];

function StatCard({ label, value, color, icon }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
      <div className={`p-3 rounded-xl bg-slate-800`}>{icon}</div>
      <div>
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
        <p className="text-slate-400 text-sm mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    client
      .get('/api/dashboard')
      .then((res) => setData(res.data))
      .catch(() => setError('Could not load dashboard data.'));
  }, []);

  if (error) return <div className="text-red-400 p-6">{error}</div>;
  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statusPieData = [
    { name: 'Compliant', value: data.compliant },
    { name: 'Non-Compliant', value: data.nonCompliant },
    { name: 'Needs Review', value: data.needsReview },
  ].filter((d) => d.value > 0);

  const severityData = data.severityBreakdown.map((s) => ({
    name: s._id ? s._id.charAt(0).toUpperCase() + s._id.slice(1) : 'Unknown',
    count: s.count,
    fill: SEVERITY_COLORS[s._id] || '#94a3b8',
  }));

  const complianceRate = data.total > 0 ? Math.round((data.compliant / data.total) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Inspection summary and compliance trends</p>
        </div>
        <Link
          to="/new-inspection"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          + New Inspection
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Inspections"
          value={data.total}
          color="text-white"
          icon={<Layers size={20} className="text-slate-400" />}
        />
        <StatCard
          label="Compliant"
          value={data.compliant}
          color="text-green-400"
          icon={<ShieldCheck size={20} className="text-green-400" />}
        />
        <StatCard
          label="Non-Compliant"
          value={data.nonCompliant}
          color="text-red-400"
          icon={<AlertTriangle size={20} className="text-red-400" />}
        />
        <StatCard
          label="Needs Review"
          value={data.needsReview}
          color="text-amber-400"
          icon={<Clock size={20} className="text-amber-400" />}
        />
      </div>

      {/* Compliance rate bar */}
      {data.total > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-300 font-semibold">Overall Compliance Rate</p>
            <span
              className={`text-lg font-bold ${
                complianceRate >= 70 ? 'text-green-400' : complianceRate >= 40 ? 'text-amber-400' : 'text-red-400'
              }`}
            >
              {complianceRate}%
            </span>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                complianceRate >= 70
                  ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                  : complianceRate >= 40
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                  : 'bg-gradient-to-r from-red-500 to-rose-400'
              }`}
              style={{ width: `${complianceRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Charts row */}
      {data.total > 0 && (
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Status Pie */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p className="text-slate-300 font-semibold mb-4">Inspection Status Breakdown</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {statusPieData.map((_, i) => (
                    <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {statusPieData.map((s, i) => (
                <div key={s.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[i] }} />
                  <span className="text-slate-400 text-xs">{s.name} ({s.value})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Severity Bar */}
          {severityData.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-slate-300 font-semibold mb-4">Violations by Severity</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={severityData} barSize={36}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} axisLine={false} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                    itemStyle={{ color: '#e2e8f0' }}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {severityData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {data.total === 0 && (
        <div className="text-center py-20 text-slate-500">
          <ShieldCheck size={40} className="mx-auto mb-3 text-slate-700" />
          <p className="text-lg font-medium text-slate-400">No inspections yet</p>
          <p className="text-sm mt-1">Go to <Link to="/check" className="text-blue-400 underline">Check Compliance</Link> to scan your first product.</p>
        </div>
      )}

      {/* Recent inspections table */}
      {data.recent && data.recent.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-slate-800">
            <p className="text-slate-300 font-semibold text-sm">Recent Inspections</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left text-slate-500 font-medium px-4 py-2.5">Product</th>
                <th className="text-left text-slate-500 font-medium px-4 py-2.5 hidden md:table-cell">Inspector</th>
                <th className="text-left text-slate-500 font-medium px-4 py-2.5">Status</th>
                <th className="text-right text-slate-500 font-medium px-4 py-2.5">Score</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((insp) => (
                <tr key={insp._id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                  <td className="px-4 py-2.5">
                    <Link to={`/inspections/${insp._id}`} className="text-slate-200 hover:text-blue-400 font-medium transition">
                      {insp.productName || 'Unnamed Product'}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-slate-400 hidden md:table-cell">{insp.inspectorName || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      insp.complianceStatus === 'compliant' ? 'bg-green-500/20 text-green-400' :
                      insp.complianceStatus === 'non-compliant' ? 'bg-red-500/20 text-red-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {insp.complianceStatus || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold">
                    <span className={insp.complianceScore >= 70 ? 'text-green-400' : insp.complianceScore >= 40 ? 'text-amber-400' : 'text-red-400'}>
                      {insp.complianceScore != null ? `${insp.complianceScore}%` : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick links */}
      <div className="flex gap-4 flex-wrap">
        <Link to="/history" className="text-blue-400 hover:text-blue-300 text-sm underline">View Full History</Link>
        <Link to="/violations" className="text-blue-400 hover:text-blue-300 text-sm underline">View All Violations</Link>
      </div>
    </div>
  );
}
export default DashboardPage;
