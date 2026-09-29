import { useEffect, useState, useCallback } from 'react';
import client from '../api/client';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Legend,
  AreaChart, Area, CartesianGrid,
} from 'recharts';
import {
  ShieldCheck, AlertTriangle, Clock, Layers,
  TrendingUp, BarChart2, RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';

/* ─── Colour tokens ──────────────────────────────────────────────────────── */
const SEVERITY_COLORS = { high: '#f87171', medium: '#fbbf24', low: '#94a3b8' };
const STATUS_COLORS   = ['#4ade80', '#f87171', '#fbbf24'];
const TREND_COLORS    = {
  compliant:     '#4ade80',
  'non-compliant': '#f87171',
  'needs-review': '#fbbf24',
};
const SCORE_COLORS = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80'];

/* ─── Shared tooltip style ───────────────────────────────────────────────── */
const TOOLTIP_STYLE = {
  contentStyle : { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '8px 14px' },
  itemStyle    : { color: '#e2e8f0', fontSize: 13 },
  labelStyle   : { color: '#94a3b8', fontSize: 12, marginBottom: 4 },
};

/* ─── Stat card ──────────────────────────────────────────────────────────── */
function StatCard({ label, value, color, icon, sub }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4 hover:border-slate-700 transition-colors duration-200">
      <div className="p-3 rounded-xl bg-slate-800 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className={`text-3xl font-bold tabular-nums ${color}`}>{value ?? '—'}</p>
        <p className="text-slate-400 text-sm mt-0.5 truncate">{label}</p>
        {sub && <p className="text-slate-600 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── Section card wrapper ───────────────────────────────────────────────── */
function Card({ title, subtitle, children, className = '' }) {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 ${className}`}>
      {title && (
        <div className="mb-4">
          <p className="text-slate-200 font-semibold">{title}</p>
          {subtitle && <p className="text-slate-500 text-xs mt-0.5">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

/* ─── Skeleton loader ────────────────────────────────────────────────────── */
function Skeleton({ h = 'h-8', className = '' }) {
  return <div className={`bg-slate-800 animate-pulse rounded-xl ${h} ${className}`} />;
}

/* ─── Custom area chart dot ──────────────────────────────────────────────── */
function CustomDot({ cx, cy, stroke }) {
  return <circle cx={cx} cy={cy} r={3} fill={stroke} strokeWidth={0} />;
}

/* ─── Day-range toggle ───────────────────────────────────────────────────── */
function RangeToggle({ value, onChange }) {
  return (
    <div className="flex gap-1 bg-slate-800 rounded-lg p-1 text-xs">
      {[7, 14, 30].map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={`px-3 py-1 rounded-md font-semibold transition-all ${
            value === d
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {d}d
        </button>
      ))}
    </div>
  );
}

/* ─── Format axis date label ─────────────────────────────────────────────── */
function fmtAxisDate(iso, days) {
  const d = new Date(iso);
  if (days <= 14) return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  // For 30-day view, only label every 5th day
  return d.getDate() % 5 === 1 ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [data,        setData]        = useState(null);
  const [trends,      setTrends]      = useState(null);
  const [scores,      setScores]      = useState(null);
  const [days,        setDays]        = useState(30);
  const [error,       setError]       = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);

  /* Fetch summary + scores (once on mount) */
  const fetchSummary = useCallback(async () => {
    try {
      const [summaryRes, scoresRes] = await Promise.all([
        client.get('/api/dashboard'),
        client.get('/api/dashboard/scores'),
      ]);
      setData(summaryRes.data);
      setScores(scoresRes.data);
    } catch {
      setError('Could not load dashboard data. Make sure the backend is running.');
    }
  }, []);

  /* Fetch trend data (re-runs when `days` changes) */
  const fetchTrends = useCallback(async (d) => {
    setTrendLoading(true);
    try {
      const res = await client.get(`/api/dashboard/trends?days=${d}`);
      setTrends(res.data);
    } catch {
      setTrends([]);
    } finally {
      setTrendLoading(false);
    }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { fetchTrends(days); }, [fetchTrends, days]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchSummary(), fetchTrends(days)]);
    setRefreshing(false);
  };

  /* ── Derived data ─────────────────────────────────────────────────────── */
  const complianceRate = data?.total > 0
    ? Math.round((data.compliant / data.total) * 100)
    : 0;

  const statusPieData = data
    ? [
        { name: 'Compliant',     value: data.compliant    },
        { name: 'Non-Compliant', value: data.nonCompliant },
        { name: 'Needs Review',  value: data.needsReview  },
      ].filter((d) => d.value > 0)
    : [];

  const severityData = data?.severityBreakdown?.map((s) => ({
    name  : s._id ? s._id.charAt(0).toUpperCase() + s._id.slice(1) : 'Unknown',
    count : s.count,
    fill  : SEVERITY_COLORS[s._id] || '#94a3b8',
  })) ?? [];

  // Trend totals for the selected range
  const trendTotal    = trends?.reduce((a, t) => a + t.total, 0) ?? 0;
  const trendPeak     = trends ? Math.max(...trends.map((t) => t.total), 1) : 1;
  const activeToday   = trends?.at(-1)?.total ?? 0;

  /* ── Error / loading ──────────────────────────────────────────────────── */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
        <AlertTriangle size={40} className="text-red-400" />
        <p className="text-red-400 font-semibold">{error}</p>
        <button
          onClick={handleRefresh}
          className="text-sm text-blue-400 hover:text-blue-300 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} h="h-24" />)}
        </div>
        <Skeleton h="h-10" />
        <Skeleton h="h-64" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton h="h-52" />
          <Skeleton h="h-52" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Inspection analytics &amp; compliance overview</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className={`p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition ${refreshing ? 'animate-spin' : ''}`}
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <Link
            to="/new-inspection"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
          >
            + New Inspection
          </Link>
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Inspections" value={data.total}        color="text-white"       icon={<Layers     size={20} className="text-slate-400"  />} />
        <StatCard label="Compliant"          value={data.compliant}   color="text-green-400"   icon={<ShieldCheck size={20} className="text-green-400"  />} />
        <StatCard label="Non-Compliant"      value={data.nonCompliant} color="text-red-400"   icon={<AlertTriangle size={20} className="text-red-400"   />} />
        <StatCard label="Needs Review"       value={data.needsReview} color="text-amber-400"   icon={<Clock      size={20} className="text-amber-400"  />} />
      </div>

      {/* ── Compliance rate bar ─────────────────────────────────────────── */}
      {data.total > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-300 font-semibold">Overall Compliance Rate</p>
            <span className={`text-lg font-bold ${
              complianceRate >= 70 ? 'text-green-400' : complianceRate >= 40 ? 'text-amber-400' : 'text-red-400'
            }`}>
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
          <p className="text-slate-500 text-xs mt-2">
            {data.compliant} of {data.total} inspections passed compliance checks
          </p>
        </Card>
      )}

      {/* ── ★ TREND CHART — Inspections Over Time ─────────────────────── */}
      <Card
        title="Inspections Over Time"
        subtitle={`${trendTotal} inspections in the last ${days} days · Today: ${activeToday}`}
      >
        <div className="flex items-center justify-between mb-4 -mt-2">
          <div className="flex items-center gap-4">
            {Object.entries(TREND_COLORS).map(([key, color]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                <span className="text-slate-400 text-xs capitalize">{key.replace('-', ' ')}</span>
              </div>
            ))}
          </div>
          <RangeToggle value={days} onChange={setDays} />
        </div>

        {trendLoading ? (
          <Skeleton h="h-56" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trends ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                {Object.entries(TREND_COLORS).map(([key, color]) => (
                  <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>

              <CartesianGrid stroke="#1e293b" vertical={false} />

              <XAxis
                dataKey="date"
                stroke="#334155"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => fmtAxisDate(v, days)}
              />
              <YAxis
                stroke="#334155"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                domain={[0, Math.ceil(trendPeak * 1.2) || 5]}
              />

              <Tooltip
                {...TOOLTIP_STYLE}
                labelFormatter={(v) =>
                  new Date(v).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
                }
              />

              {Object.entries(TREND_COLORS).map(([key, color]) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={key.replace(/-/g, ' ')}
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#grad-${key})`}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: color }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* ── Charts row: Pie + Score distribution ───────────────────────── */}
      {data.total > 0 && (
        <div className="grid md:grid-cols-2 gap-6">

          {/* Status Pie */}
          <Card title="Inspection Status Breakdown">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={80}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {statusPieData.map((_, i) => (
                    <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2 flex-wrap">
              {statusPieData.map((s, i) => (
                <div key={s.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[i] }} />
                  <span className="text-slate-400 text-xs">{s.name} ({s.value})</span>
                </div>
              ))}
            </div>
          </Card>

          {/* ★ Score Distribution histogram */}
          <Card title="Score Distribution" subtitle="Compliance score buckets across all inspections">
            {scores ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={scores} barSize={32} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#334155"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#334155"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    formatter={(v) => [v, 'Inspections']}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Inspections">
                    {scores.map((_, i) => (
                      <Cell key={i} fill={SCORE_COLORS[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton h="h-[200px]" />
            )}
          </Card>
        </div>
      )}

      {/* ── Violations by severity ─────────────────────────────────────── */}
      {severityData.length > 0 && (
        <Card title="Violations by Severity" subtitle="Across all inspections">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={severityData} barSize={40} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#334155"
                tick={{ fill: '#64748b', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke="#334155"
                tick={{ fill: '#64748b', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Violations">
                {severityData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────── */}
      {data.total === 0 && (
        <div className="text-center py-20 text-slate-500">
          <ShieldCheck size={40} className="mx-auto mb-3 text-slate-700" />
          <p className="text-lg font-medium text-slate-400">No inspections yet</p>
          <p className="text-sm mt-1">
            Go to{' '}
            <Link to="/new-inspection" className="text-blue-400 underline">
              New Inspection
            </Link>{' '}
            to scan your first product.
          </p>
        </div>
      )}

      {/* ── Recent inspections table ────────────────────────────────────── */}
      {data.recent?.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <p className="text-slate-300 font-semibold text-sm">Recent Inspections</p>
            <Link to="/history" className="text-blue-400 hover:text-blue-300 text-xs underline">
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left text-slate-500 font-medium px-5 py-2.5">Product</th>
                  <th className="text-left text-slate-500 font-medium px-4 py-2.5 hidden md:table-cell">Inspector</th>
                  <th className="text-left text-slate-500 font-medium px-4 py-2.5">Status</th>
                  <th className="text-right text-slate-500 font-medium px-5 py-2.5">Score</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((insp) => (
                  <tr key={insp._id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                    <td className="px-5 py-2.5">
                      <Link to={`/inspections/${insp._id}`} className="text-slate-200 hover:text-blue-400 font-medium transition">
                        {insp.productName || 'Unnamed Product'}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 hidden md:table-cell">{insp.inspectorName || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        insp.complianceStatus === 'compliant'     ? 'bg-green-500/20 text-green-400' :
                        insp.complianceStatus === 'non-compliant' ? 'bg-red-500/20   text-red-400'   :
                                                                    'bg-amber-500/20 text-amber-400'
                      }`}>
                        {insp.complianceStatus || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right font-bold tabular-nums">
                      <span className={
                        insp.complianceScore >= 70 ? 'text-green-400' :
                        insp.complianceScore >= 40 ? 'text-amber-400' : 'text-red-400'
                      }>
                        {insp.complianceScore != null ? `${insp.complianceScore}%` : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Quick links ─────────────────────────────────────────────────── */}
      <div className="flex gap-4 flex-wrap pb-4">
        <Link to="/history"    className="text-blue-400 hover:text-blue-300 text-sm underline">View Full History</Link>
        <Link to="/violations" className="text-blue-400 hover:text-blue-300 text-sm underline">View All Violations</Link>
      </div>

    </div>
  );
}
