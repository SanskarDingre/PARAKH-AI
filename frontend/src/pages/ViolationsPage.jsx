import { useEffect, useState } from 'react';
import client from '../api/client';
import { AlertTriangle, Filter } from 'lucide-react';

const severityConfig = {
  high: { badge: 'bg-red-500/15 text-red-400 border border-red-500/30', label: 'High' },
  medium: { badge: 'bg-amber-500/15 text-amber-400 border border-amber-500/30', label: 'Medium' },
  low: { badge: 'bg-slate-500/15 text-slate-400 border border-slate-600', label: 'Low' },
};

function ViolationsPage() {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    client
      .get('/api/violations')
      .then((res) => setViolations(res.data))
      .finally(() => setLoading(false));
  }, []);

  const displayed = filter === 'all' ? violations : violations.filter((v) => v.severity === filter);

  const counts = violations.reduce((acc, v) => {
    acc[v.severity] = (acc[v.severity] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-red-500/15 p-2.5 rounded-xl">
          <AlertTriangle size={22} className="text-red-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Violations</h1>
          <p className="text-slate-400 text-sm">Recent label compliance violations detected</p>
        </div>
      </div>

      {/* Summary counts */}
      {!loading && violations.length > 0 && (
        <div className="flex gap-3 flex-wrap mb-6">
          {['high', 'medium', 'low'].map((s) => counts[s] > 0 && (
            <div key={s} className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${severityConfig[s].badge}`}>
              {severityConfig[s].label}: {counts[s]}
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      {violations.length > 0 && (
        <div className="flex items-center gap-2 mb-5">
          <Filter size={14} className="text-slate-500" />
          {['all', 'high', 'medium', 'low'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && violations.length === 0 && (
        <div className="text-center py-20">
          <AlertTriangle size={40} className="mx-auto mb-3 text-slate-700" />
          <p className="text-slate-400">No violations recorded yet.</p>
          <p className="text-slate-600 text-sm mt-1">Run an inspection to start detecting violations.</p>
        </div>
      )}

      <div className="space-y-3">
        {displayed.map((v, i) => {
          const cfg = severityConfig[v.severity] || severityConfig.low;
          return (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition">
              <div className="flex items-start justify-between gap-3 mb-1">
                <span className="text-slate-200 font-medium">{v.title}</span>
                <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>
                  {cfg.label}
                </span>
              </div>
              <p className="text-slate-500 text-xs mb-1">{v.legalReference}</p>
              <p className="text-slate-600 text-xs">{new Date(v.date).toLocaleString()}</p>
            </div>
          );
        })}
      </div>

      {!loading && displayed.length === 0 && violations.length > 0 && (
        <p className="text-slate-500 text-center py-8">No {filter}-severity violations found.</p>
      )}
    </div>
  );
}
export default ViolationsPage;
