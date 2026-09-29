import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getInspection, verifyInspectionNew, getReportUrl } from '../api/inspectionsAPI';
import client from '../api/client';
import {
  ShieldCheck, ShieldX, AlertCircle, CheckCircle2, XCircle, HelpCircle,
  Download, ArrowLeft, Eye, X, Clock, User, FileText, Loader2,
  ChevronDown, ChevronUp
} from 'lucide-react';

// ── Config ────────────────────────────────────────────────────────────────────

const RESULT_CFG = {
  PASS: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', label: 'Pass' },
  FAIL: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', label: 'Fail' },
  WARNING: { icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', label: 'Warning' },
  NOT_APPLICABLE: { icon: HelpCircle, color: 'text-slate-500', bg: 'bg-slate-800/50 border-slate-700', label: 'N/A' },
  UNABLE_TO_VERIFY: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', label: 'Needs Review' },
  REQUIRES_REVIEW: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', label: 'Requires Review' },
};

const STATUS_CFG = {
  compliant: { badge: 'bg-green-500/15 text-green-400 border-green-500/30', icon: ShieldCheck, label: 'Compliant' },
  'non-compliant': { badge: 'bg-red-500/15 text-red-400 border-red-500/30', icon: ShieldX, label: 'Non-Compliant' },
  'needs-review': { badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: AlertCircle, label: 'Needs Review' },
};

// ── Canvas Evidence Viewer ────────────────────────────────────────────────────

function EvidenceViewer({ imageData, highlightBbox, ocrLines, title }) {
  const canvasRef = useRef(null);

  function draw(img) {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);

    // Dim OCR lines
    if (ocrLines) {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
      ctx.lineWidth = 1;
      for (const line of ocrLines) {
        const pts = line.box;
        if (!pts || pts.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath();
        ctx.stroke();
      }
    }

    // Highlight bbox
    if (highlightBbox) {
      const { x, y, width, height } = highlightBbox;
      ctx.fillStyle = 'rgba(251, 191, 36, 0.18)';
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);
    }
  }

  return (
    <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
        <span className="text-slate-400 text-xs">{title || 'Evidence'}</span>
      </div>
      <div className="relative">
        <img src={imageData} alt="Evidence" className="hidden" onLoad={(e) => draw(e.target)} />
        <canvas ref={canvasRef} className="w-full" />
      </div>
    </div>
  );
}

// ── Score Bar ─────────────────────────────────────────────────────────────────

function ScoreBar({ score }) {
  const color = score >= 70 ? 'from-green-500 to-emerald-400' : score >= 40 ? 'from-amber-500 to-yellow-400' : 'from-red-500 to-rose-400';
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-slate-400 text-sm">Compliance Score</span>
        <span className="text-white font-bold">{score}%</span>
      </div>
      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function InspectionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Evidence modal
  const [evidenceModal, setEvidenceModal] = useState(null);
  const [loadingEvidence, setLoadingEvidence] = useState(false);

  // Officer verify
  const [verifyDecision, setVerifyDecision] = useState(null);
  const [verifyNote, setVerifyNote] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    getInspection(id)
      .then((data) => {
        setInspection(data);
        setVerifyDecision(data.officerDecision);
      })
      .catch((err) => setError(err.displayMessage || 'Could not load inspection'))
      .finally(() => setLoading(false));
  }, [id]);

  async function openEvidenceModal(ruleResult) {
    if (!ruleResult.evidence?.imageId) return;
    setLoadingEvidence(true);
    try {
      const res = await client.get(`/api/inspections/${id}/images/${ruleResult.evidence.imageId}`);
      setEvidenceModal({
        ruleResult,
        imageData: res.data.originalData,
        ocrLines: res.data.ocrLines || [],
        highlightBbox: ruleResult.evidence.bbox,
      });
    } catch (e) {
      console.error('Evidence load failed:', e.message);
    } finally {
      setLoadingEvidence(false);
    }
  }

  async function handleVerify(decision) {
    if (!window.confirm(`Mark this inspection as "${decision}"?`)) return;
    setVerifying(true);
    try {
      await verifyInspectionNew(id, decision, verifyNote);
      setVerifyDecision(decision);
    } catch (e) {
      alert('Could not save verification: ' + (e.displayMessage || e.message));
    } finally {
      setVerifying(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 size={32} className="text-blue-500 animate-spin" />
    </div>
  );

  if (error) return (
    <div className="max-w-3xl mx-auto px-6 py-20 text-center">
      <p className="text-red-400 mb-4">{error}</p>
      <Link to="/history" className="text-blue-400 hover:text-blue-300 text-sm">← Back to History</Link>
    </div>
  );

  if (!inspection) return null;

  const statusCfg = STATUS_CONFIG[inspection.complianceStatus] || STATUS_CONFIG['non-compliant'];
  const StatusIcon = statusCfg?.icon || AlertCircle;
  const ruleResults = inspection.ruleResults || [];
  const extractedFields = inspection.extractedFields || [];
  const violations = inspection.violations || [];

  const passCnt = ruleResults.filter((r) => r.result === 'PASS').length;
  const failCnt = ruleResults.filter((r) => r.result === 'FAIL').length;
  const warnCnt = ruleResults.filter((r) => r.result === 'UNABLE_TO_VERIFY' || r.result === 'REQUIRES_REVIEW').length;
  const naCnt = ruleResults.filter((r) => r.result === 'NOT_APPLICABLE').length;

  const STATUS_CONFIG = {
    compliant: { badge: 'bg-green-500/15 text-green-400 border-green-500/30', icon: ShieldCheck, label: 'Compliant' },
    'non-compliant': { badge: 'bg-red-500/15 text-red-400 border-red-500/30', icon: ShieldX, label: 'Non-Compliant' },
    'needs-review': { badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: AlertCircle, label: 'Needs Review' },
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Evidence modal */}
      {evidenceModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setEvidenceModal(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div>
                <h3 className="text-white font-semibold">{evidenceModal.ruleResult.title}</h3>
                <p className="text-slate-500 text-xs">{evidenceModal.ruleResult.legalReference}</p>
              </div>
              <button onClick={() => setEvidenceModal(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-4">
              <EvidenceViewer
                imageData={evidenceModal.imageData}
                highlightBbox={evidenceModal.highlightBbox}
                ocrLines={evidenceModal.ocrLines}
                title={`Evidence: ${evidenceModal.ruleResult.title}`}
              />
              {evidenceModal.ruleResult.evidence?.rawValue && (
                <div className="mt-3 bg-slate-800 rounded-xl p-3">
                  <p className="text-slate-400 text-xs mb-1">Detected text</p>
                  <p className="text-slate-200 text-sm font-mono">"{evidenceModal.ruleResult.evidence.rawValue}"</p>
                  {evidenceModal.ruleResult.evidence.confidence != null && (
                    <p className="text-slate-500 text-xs mt-1">
                      OCR confidence: {Math.round(evidenceModal.ruleResult.evidence.confidence * 100)}%
                    </p>
                  )}
                </div>
              )}
              {evidenceModal.ruleResult.explanation && (
                <p className="text-slate-400 text-sm mt-3">{evidenceModal.ruleResult.explanation}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <button onClick={() => navigate('/history')} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-2 transition">
            <ArrowLeft size={14} /> History
          </button>
          <h1 className="text-2xl font-bold text-white">{inspection.productName || 'Unnamed Product'}</h1>
          <p className="text-slate-500 text-xs mt-1">ID: {inspection._id}</p>
        </div>
        <div className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${STATUS_CONFIG[inspection.complianceStatus]?.badge || ''}`}>
          <StatusIcon size={15} />
          {STATUS_CONFIG[inspection.complianceStatus]?.label || inspection.complianceStatus}
        </div>
      </div>

      {/* Meta info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { icon: User, label: 'Inspector', value: inspection.inspectorName || '—' },
          { icon: Clock, label: 'Date', value: new Date(inspection.createdAt).toLocaleDateString('en-IN') },
          { icon: FileText, label: 'Rule Set', value: inspection.ruleSetVersion || '—' },
          { icon: ShieldCheck, label: 'Score', value: inspection.complianceScore != null ? `${inspection.complianceScore}%` : '—' },
        ].map((m) => (
          <div key={m.label} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
              <m.icon size={12} /> {m.label}
            </div>
            <p className="text-slate-200 text-sm font-medium">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Score + summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
        <ScoreBar score={inspection.complianceScore || 0} />
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[
            { label: 'Passed', count: passCnt, color: 'text-green-400' },
            { label: 'Failed', count: failCnt, color: 'text-red-400' },
            { label: 'Review', count: warnCnt, color: 'text-amber-400' },
            { label: 'N/A', count: naCnt, color: 'text-slate-500' },
          ].map((s) => (
            <div key={s.label} className="bg-slate-800/50 rounded-xl p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-slate-500 text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Extracted fields */}
      {extractedFields.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
          <h2 className="text-slate-300 font-semibold mb-3">Extracted Declarations ({extractedFields.length})</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {extractedFields.map((f, i) => (
              <div key={i} className="bg-slate-800/60 rounded-xl px-3 py-2.5">
                <p className="text-slate-500 text-xs mb-0.5">{f.fieldKey}</p>
                <p className="text-slate-200 text-sm font-mono truncate" title={f.rawValue}>{f.rawValue}</p>
                <p className="text-slate-600 text-xs mt-0.5">{Math.round(f.confidence * 100)}% confidence</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Violations */}
      {violations.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
          <h2 className="text-slate-300 font-semibold mb-3 flex items-center gap-2">
            <XCircle size={16} className="text-red-400" />
            Violations ({violations.length})
          </h2>
          <div className="space-y-2">
            {violations.map((v, i) => (
              <div key={i} className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-200 text-sm font-medium">{v.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    v.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                    v.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-slate-700 text-slate-400'
                  }`}>
                    {v.severity}
                  </span>
                </div>
                <p className="text-slate-500 text-xs mt-0.5">{v.legalReference}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rule-by-rule */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
        <h2 className="text-slate-300 font-semibold mb-3">Rule-by-Rule Results</h2>
        <div className="space-y-2">
          {ruleResults.map((r) => {
            const cfg = RESULT_CFG[r.result] || RESULT_CFG.UNABLE_TO_VERIFY;
            const Icon = cfg.icon;
            const hasEvidence = r.evidence?.imageId;
            return (
              <div key={r.ruleId || r.key} className={`border rounded-xl px-3 py-2.5 ${cfg.bg}`}>
                <div className="flex items-start gap-2">
                  <Icon size={15} className={`${cfg.color} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-200 text-sm font-medium">{r.title}</span>
                      <span className={`text-xs font-bold ml-2 flex-shrink-0 ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    {r.evidence?.rawValue && (
                      <p className="text-slate-400 text-xs mt-0.5 italic truncate">
                        "{r.evidence.rawValue}"
                        {r.evidence.confidence != null && ` (${Math.round(r.evidence.confidence * 100)}%)`}
                      </p>
                    )}
                    {r.explanation && !r.evidence?.rawValue && (
                      <p className="text-slate-500 text-xs mt-0.5">{r.explanation}</p>
                    )}
                    <p className="text-slate-600 text-xs mt-0.5">{r.legalReference}</p>
                  </div>
                  {hasEvidence && (
                    <button
                      onClick={() => openEvidenceModal(r)}
                      disabled={loadingEvidence}
                      className="flex-shrink-0 text-xs text-blue-400 hover:text-blue-300 transition border border-blue-500/30 bg-blue-600/10 hover:bg-blue-600/20 px-2 py-1 rounded-lg disabled:opacity-50"
                    >
                      {loadingEvidence ? <Loader2 size={11} className="animate-spin" /> : <Eye size={11} />}
                      {' '}Evidence
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Officer verification */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
        <h2 className="text-slate-300 font-semibold mb-3">Officer Verification</h2>
        {verifyDecision ? (
          <div className={`flex items-center gap-2 text-sm font-medium ${verifyDecision === 'confirmed' ? 'text-green-400' : 'text-amber-400'}`}>
            {verifyDecision === 'confirmed' ? <ShieldCheck size={18} /> : <AlertCircle size={18} />}
            {verifyDecision === 'confirmed' ? 'Result confirmed by officer.' : 'Result overridden / flagged for review by officer.'}
            {inspection.officerName && <span className="text-slate-500 font-normal ml-1">({inspection.officerName})</span>}
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="text"
              value={verifyNote}
              onChange={(e) => setVerifyNote(e.target.value)}
              placeholder="Optional: Add a review note…"
              className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 transition"
            />
            <div className="flex gap-3">
              <button
                onClick={() => handleVerify('confirmed')}
                disabled={verifying}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 font-semibold py-2.5 rounded-xl transition disabled:opacity-50"
              >
                {verifying ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                Confirm Result
              </button>
              <button
                onClick={() => handleVerify('overridden')}
                disabled={verifying}
                className="flex-1 flex items-center justify-center gap-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-400 font-semibold py-2.5 rounded-xl transition disabled:opacity-50"
              >
                {verifying ? <Loader2 size={15} className="animate-spin" /> : <AlertCircle size={15} />}
                Override / Flag
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 flex-wrap">
        <a
          href={getReportUrl(id)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <Download size={15} />
          Download PDF Report
        </a>
        <Link to="/history" className="text-slate-400 hover:text-white text-sm transition">
          ← Back to History
        </Link>
      </div>
    </div>
  );
}

export default InspectionDetailPage;
