import { useEffect, useState } from 'react';
import { getHistory, clearHistory } from '../api/inspectAPI';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function HistoryScreen() {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);

  function loadHistory() {
    setLoading(true);
    getHistory().then(setInspections).finally(() => setLoading(false));
  }

  useEffect(() => { loadHistory(); }, []);

  async function handleClear() {
    if (!window.confirm('This permanently deletes ALL inspection history. Continue?')) return;
    await clearHistory();
    loadHistory();
  }

  const compliantCount = inspections.filter((i) => i.status === 'compliant').length;
  const nonCompliantCount = inspections.filter((i) => i.status === 'non-compliant').length;
  const statusData = [
    { name: 'Compliant', count: compliantCount, fill: '#4ade80' },
    { name: 'Non-Compliant', count: nonCompliantCount, fill: '#f87171' },
  ];

  const missingCounts = {};
  inspections.forEach((item) => {
    (item.missingFields || []).forEach((field) => {
      missingCounts[field] = (missingCounts[field] || 0) + 1;
    });
  });
  const missingData = Object.entries(missingCounts).map(([name, count]) => ({ name, count }));

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">Inspection History</h1>
          {inspections.length > 0 && (
            <button onClick={handleClear} className="text-red-400 hover:text-red-300 text-sm underline">
              Clear History
            </button>
          )}
        </div>

        {loading && <p className="text-slate-400">Loading...</p>}

        {!loading && inspections.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-800 rounded-lg p-4">
              <p className="text-slate-300 font-semibold mb-2">Compliance Overview</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={statusData}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: 'none' }} />
                  <Bar dataKey="count">
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {missingData.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-4">
                <p className="text-slate-300 font-semibold mb-2">Most Common Missing Fields</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={missingData}>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: 'none' }} />
                    <Bar dataKey="count" fill="#60a5fa" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {!loading && inspections.length === 0 && <p className="text-slate-400">No inspections yet — go check a product.</p>}

        <div className="space-y-3">
          {inspections.map((item) => (
            <div key={item._id} className="bg-slate-800 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-slate-200 text-sm">{new Date(item.createdAt).toLocaleString()}</p>
                {item.missingFields?.length > 0 && (
                  <p className="text-slate-500 text-xs mt-1">Missing: {item.missingFields.join(', ')}</p>
                )}
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                item.status === 'compliant' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {item.status === 'compliant' ? 'Compliant' : 'Non-Compliant'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export default HistoryScreen;
