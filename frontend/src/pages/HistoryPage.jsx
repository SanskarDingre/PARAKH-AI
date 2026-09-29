import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { listInspections } from '../api/inspectionsAPI';
import {
  Clock, Search, Filter, ShieldCheck, ShieldX, AlertCircle,
  ChevronLeft, ChevronRight, FileText, X, Loader2
} from 'lucide-react';

const STATUS_CFG = {
  compliant: { badge: 'bg-green-500/15 text-green-400 border-green-500/30', icon: ShieldCheck, label: 'Compliant' },
  'non-compliant': { badge: 'bg-red-500/15 text-red-400 border-red-500/30', icon: ShieldX, label: 'Non-Compliant' },
  'needs-review': { badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: AlertCircle, label: 'Needs Review' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG['needs-review'];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border ${cfg.badge}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

function HistoryPage() {
  const [inspections, setInspections] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listInspections({ search, status: statusFilter, page, limit: PAGE_SIZE });
      setInspections(data.inspections || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.displayMessage || 'Could not load inspections');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  // Debounce search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Inspection History</h1>
          <p className="text-slate-400 text-sm mt-1">
            {total > 0 ? `${total} inspection${total > 1 ? 's' : ''} total` : 'No inspections yet'}
          </p>
        </div>
        <Link
          to="/new-inspection"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          + New Inspection
        </Link>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by product, manufacturer, inspector…"
            className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl focus:outline-none focus:border-blue-500 transition text-sm"
          />
          {searchInput && (
            <button onClick={() => setSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-500" />
          {['all', 'compliant', 'non-compliant', 'needs-review'].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`text-xs font-medium px-3 py-2 rounded-lg transition ${
                statusFilter === s ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_CFG[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-5">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="text-blue-500 animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && inspections.length === 0 && (
        <div className="text-center py-20">
          <Clock size={40} className="mx-auto mb-3 text-slate-700" />
          <p className="text-slate-400 text-lg font-medium">No inspections found</p>
          <p className="text-slate-600 text-sm mt-1">
            {search || statusFilter !== 'all'
              ? 'Try a different search or filter'
              : 'Create a new inspection to get started'}
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && inspections.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left text-slate-500 font-medium px-4 py-3">Product</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3 hidden md:table-cell">Inspector</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3">Status</th>
                <th className="text-right text-slate-500 font-medium px-4 py-3 hidden sm:table-cell">Score</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3 hidden lg:table-cell">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {inspections.map((insp) => (
                <tr key={insp._id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                  <td className="px-4 py-3">
                    <p className="text-slate-200 font-medium">{insp.productName || 'Unnamed Product'}</p>
                    {insp.manufacturerName && (
                      <p className="text-slate-500 text-xs mt-0.5">{insp.manufacturerName}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 hidden md:table-cell">
                    {insp.inspectorName || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={insp.complianceStatus} />
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    <span className={`font-bold ${
                      insp.complianceScore >= 70 ? 'text-green-400' : insp.complianceScore >= 40 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {insp.complianceScore != null ? `${insp.complianceScore}%` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">
                    {new Date(insp.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/inspections/${insp._id}`}
                      className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs transition"
                    >
                      <FileText size={12} />
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-slate-500 text-sm">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-white disabled:opacity-40 bg-slate-800 px-3 py-1.5 rounded-lg transition"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-white disabled:opacity-40 bg-slate-800 px-3 py-1.5 rounded-lg transition"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default HistoryPage;
