import { useEffect, useState } from 'react';
import axios from 'axios';

const severityColor = {
  high: 'bg-red-500/20 text-red-400',
  medium: 'bg-amber-500/20 text-amber-400',
  low: 'bg-slate-500/20 text-slate-400',
};

function ViolationsPage() {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
  .get('http://localhost:5000/api/violations', {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  })
  .then((res) => setViolations(res.data))
  .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-white mb-6">Violations</h1>
      {loading && <p className="text-slate-400">Loading...</p>}
      {!loading && violations.length === 0 && <p className="text-slate-400">No violations recorded yet.</p>}
      <div className="space-y-3">
        {violations.map((v, i) => (
          <div key={i} className="bg-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-200 font-medium">{v.title}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${severityColor[v.severity] || severityColor.low}`}>
                {v.severity}
              </span>
            </div>
            <p className="text-slate-500 text-xs">{v.legalReference}</p>
            <p className="text-slate-600 text-xs mt-1">{new Date(v.date).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ViolationsPage;
