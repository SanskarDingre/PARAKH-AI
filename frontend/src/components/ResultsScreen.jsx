import { useState } from 'react';
import { verifyInspection } from '../api/inspectAPI';

const statusStyles = { PASS: 'text-green-400', FAIL: 'text-red-400', UNABLE_TO_VERIFY: 'text-amber-400' };
const statusLabels = { PASS: 'Pass', FAIL: 'Fail', UNABLE_TO_VERIFY: 'Needs Review' };
const overallStyles = {
  compliant: { label: 'Compliant', className: 'bg-green-500/20 text-green-400' },
  'non-compliant': { label: 'Non-Compliant', className: 'bg-red-500/20 text-red-400' },
  'needs-review': { label: 'Needs Review', className: 'bg-amber-500/20 text-amber-400' },
};

function ResultsScreen({ result, imageUrl, onReset }) {
  const [decision, setDecision] = useState(null);
  const overall = overallStyles[result.status] || overallStyles['non-compliant'];

  async function handleVerify(choice) {
    setDecision(choice);
    await verifyInspection(result.inspectionId, choice);
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold text-white mt-4 mb-6">Inspection Result</h1>

      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-3xl shadow-lg grid md:grid-cols-2 gap-6">
        <img src={imageUrl} alt="Inspected package" className="rounded-lg w-full h-fit" />

        <div>
          <div className={`inline-block px-4 py-1.5 rounded-full font-semibold mb-4 ${overall.className}`}>
            {overall.label}
          </div>
                    <p className="text-slate-400 text-sm mb-4">
            Compliance Score: <span className="text-white font-semibold">{result.complianceScore}%</span>
          </p>

          <ul className="space-y-2">
            {result.ruleResults.map((r) => {
              const ev = result.evidence?.[r.key];
              return (
                <li key={r.key} className="bg-slate-700/50 px-3 py-2 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-200">{r.title}</span>
                    <span className={statusStyles[r.result]}>
                      {statusLabels[r.result]}
                      {ev && <span className="text-slate-500 text-xs ml-2">({Math.round(ev.confidence * 100)}%)</span>}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs mt-1">{r.legalReference}</p>
                  {ev && <p className="text-slate-400 text-xs mt-1 italic">Matched: "{ev.text}"</p>}
                </li>
              );
            })}
          </ul>

          <div className="mt-5 flex gap-3 no-print">
            <button onClick={() => handleVerify('confirmed')} disabled={decision !== null} className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-semibold py-2 rounded-lg transition">
              {decision === 'confirmed' ? 'Confirmed' : 'Confirm Result'}
            </button>
            <button onClick={() => handleVerify('overridden')} disabled={decision !== null} className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-sm font-semibold py-2 rounded-lg transition">
              {decision === 'overridden' ? 'Flagged' : 'Override / Flag for Review'}
            </button>
          </div>
        </div>
      </div>

      <div className="no-print flex gap-4 mt-6">
        <button onClick={onReset} className="text-slate-400 hover:text-white underline">Check another product</button>
        <a href={`http://localhost:5000/api/inspect/${result.inspectionId}/report`} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline">Download Report (PDF)</a>
      </div>
    </div>
  );
}
export default ResultsScreen;
