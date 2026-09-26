import { useEffect, useState } from 'react';
import axios from 'axios';

function DashboardPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get('http://localhost:5000/api/dashboard', {
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
}).then((res) => setData(res.data));
  }, []);

  if (!data) return <div className="text-slate-400 p-6">Loading...</div>;

  const cards = [
    ['Total Inspections', data.total, 'text-white'],
    ['Compliant', data.compliant, 'text-green-400'],
    ['Non-Compliant', data.nonCompliant, 'text-red-400'],
    ['Needs Review', data.needsReview, 'text-amber-400'],
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-white mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map(([label, value, color]) => (
          <div key={label} className="bg-slate-800 rounded-lg p-4">
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-slate-400 text-sm mt-1">{label}</p>
          </div>
        ))}
      </div>

      {data.severityBreakdown.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-slate-300 font-semibold mb-3">Violations by Severity</p>
          <div className="space-y-2">
            {data.severityBreakdown.map((s) => (
              <div key={s._id} className="flex justify-between text-sm text-slate-300">
                <span className="capitalize">{s._id}</span>
                <span>{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
export default DashboardPage;
