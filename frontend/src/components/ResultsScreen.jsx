import { useState } from 'react';
import { verifyInspection } from '../api/inspectAPI';
import { CheckCircle2, XCircle, AlertCircle, HelpCircle, Download, RotateCcw, ShieldCheck, ShieldX } from 'lucide-react';

const resultIcons = {
  PASS: <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />,
  FAIL: <XCircle size={16} className="text-red-400 flex-shrink-0" />,
  WARNING: <AlertCircle size={16} className="text-yellow-400 flex-shrink-0" />,
  NOT_APPLICABLE: <HelpCircle size={16} className="text-slate-500 flex-shrink-0" />,
  UNABLE_TO_VERIFY: <AlertCircle size={16} className="text-amber-400 flex-shrink-0" />,
};
const resultLabels = {
  PASS: 'Pass',
  FAIL: 'Fail',
  WARNING: 'Warning',
  NOT_APPLICABLE: 'N/A',
  UNABLE_TO_VERIFY: 'Needs Review',
};
const resultColors = {
  PASS: 'text-green-400',
  FAIL: 'text-red-400',
  WARNING: 'text-yellow-400',
  NOT_APPLICABLE: 'text-slate-500',
  UNABLE_TO_VERIFY: 'text-amber-400',
};

const overallConfig = {
  compliant: {
    label: 'Compliant',
    badge: 'bg-green-500/15 text-green-400 border border-green-500/30',
    icon: <ShieldCheck size={20} className="text-green-400" />,
  },
  'non-compliant': {
    label: 'Non-Compliant',
    badge: 'bg-red-500/15 text-red-400 border border-red-500/30',
    icon: <ShieldX size={20} className="text-red-400" />,
  },
  'needs-review': {
    label: 'Needs Review',
    badge: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    icon: <AlertCircle size={20} className="text-amber-400" />,
  },
};

function ScoreBar({ score }) {
  const color =
    score >= 70 ? 'from-green-500 to-emerald-400' :
    score >= 40 ? 'from-amber-500 to-yellow-400' :
    'from-red-500 to-rose-400';
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-slate-400 text-sm">Compliance Score</span>
        <span className="text-white font-bold">{score}%</span>
      </div>
      <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function ResultsScreen({ result, imageUrl, onReset }) {
  const [decision, setDecision] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const overall = overallConfig[result.status] || overallConfig['non-compliant'];

  async function handleVerify(choice) {
    setVerifying(true);
    await verifyInspection(result.inspectionId, choice);
    setDecision(choice);
    setVerifying(false);
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Inspection Result</h1>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${overall.badge}`}>
          {overall.icon}
          {overall.label}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Image */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex items-center justify-center min-h-[220px]">
          <img src={imageUrl} alt="Inspected package" className="w-full h-full object-contain max-h-80" />
        </div>

        {/* Summary panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <ScoreBar score={result.complianceScore} />

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {result.ruleResults.map((r) => {
              const ev = result.evidence?.[r.key];
              return (
                <div key={r.key} className="bg-slate-800/60 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    {resultIcons[r.result]}
                    <span className="text-slate-200 text-sm flex-1">{r.title}</span>
                    <span className={`text-xs font-semibold ${resultColors[r.result]}`}>
                      {resultLabels[r.result]}
                      {ev && <span className="text-slate-500 font-normal ml-1">({Math.round(ev.confidence * 100)}%)</span>}
                    </span>
                  </div>
                  {ev && (
                    <p className="text-slate-500 text-xs mt-1 pl-6 italic truncate" title={ev.text}>
                      "{ev.text}"
                    </p>
                  )}
                  <p className="text-slate-600 text-xs mt-0.5 pl-6">{r.legalReference}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Officer verification */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
        <p className="text-slate-300 font-semibold mb-3">Officer Verification</p>
        {decision ? (
          <div className={`flex items-center gap-2 text-sm font-medium ${decision === 'confirmed' ? 'text-green-400' : 'text-amber-400'}`}>
            {decision === 'confirmed' ? <ShieldCheck size={18} /> : <AlertCircle size={18} />}
            {decision === 'confirmed' ? 'Result confirmed by officer.' : 'Flagged for review by officer.'}
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => handleVerify('confirmed')}
              disabled={verifying}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 font-semibold py-2.5 rounded-xl transition disabled:opacity-50"
            >
              <ShieldCheck size={16} />
              Confirm Result
            </button>
            <button
              onClick={() => handleVerify('overridden')}
              disabled={verifying}
              className="flex-1 flex items-center justify-center gap-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-400 font-semibold py-2.5 rounded-xl transition disabled:opacity-50"
            >
              <AlertCircle size={16} />
              Override / Flag
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition"
        >
          <RotateCcw size={15} />
          Check another product
        </button>
        <a
          href={`http://localhost:5000/api/inspect/${result.inspectionId}/report`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 text-sm font-semibold px-4 py-2 rounded-xl transition"
        >
          <Download size={15} />
          Download PDF Report
        </a>
      </div>
    </div>
  );
}
export default ResultsScreen;
