import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud, X, ScanLine, CheckCircle2, XCircle, AlertCircle,
  HelpCircle, Eye, ZoomIn, Trash2,
  FileImage, Loader2, ShieldCheck, ShieldX, Download,
  ArrowLeft
} from 'lucide-react';
import { createInspection, uploadImages, analyzeInspection, getReportUrl, getInspectionImage } from '../api/inspectionsAPI';
import { useAuth } from '../context/AuthContext';

const IMAGE_LABELS = ['front', 'back', 'side', 'mrp', 'ingredients', 'other'];

const RESULT_CONFIG = {
  PASS: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', label: 'Pass' },
  FAIL: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', label: 'Fail' },
  WARNING: { icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', label: 'Warning' },
  NOT_APPLICABLE: { icon: HelpCircle, color: 'text-slate-500', bg: 'bg-slate-800/50 border-slate-700', label: 'N/A' },
  UNABLE_TO_VERIFY: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', label: 'Needs Review' },
  REQUIRES_REVIEW: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', label: 'Requires Review' },
};

const STATUS_CONFIG = {
  compliant: { badge: 'bg-green-500/15 text-green-400 border-green-500/30', icon: ShieldCheck, label: 'Compliant' },
  'non-compliant': { badge: 'bg-red-500/15 text-red-400 border-red-500/30', icon: ShieldX, label: 'Non-Compliant' },
  'needs-review': { badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: AlertCircle, label: 'Needs Review' },
};

const PROCESSING_STEPS = [
  { key: 'upload', label: 'Uploading images' },
  { key: 'ocr', label: 'Running OCR (this may take 15-40 sec)' },
  { key: 'extract', label: 'Extracting declarations' },
  { key: 'rules', label: 'Applying LMPC 2011 rules' },
  { key: 'done', label: 'Analysis complete' },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function ImageThumbnail({ item, index, onRemove, onLabelChange, onPreview }) {
  return (
    <div className="relative bg-slate-800 border border-slate-700 rounded-xl overflow-hidden group">
      <img
        src={item.previewUrl}
        alt={`Image ${index + 1}`}
        className="w-full h-32 object-cover"
      />
      {/* Overlay actions */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
        <button
          onClick={() => onPreview(item)}
          className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"
          title="Preview"
        >
          <ZoomIn size={14} />
        </button>
        <button
          onClick={() => onRemove(index)}
          className="p-1.5 bg-red-600/80 hover:bg-red-600 rounded-lg text-white"
          title="Remove"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {/* Label selector */}
      <div className="p-2">
        <select
          value={item.label}
          onChange={(e) => onLabelChange(index, e.target.value)}
          className="w-full bg-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 border border-slate-600 focus:border-blue-500 focus:outline-none"
        >
          {IMAGE_LABELS.map((l) => (
            <option key={l} value={l}>
              {l.charAt(0).toUpperCase() + l.slice(1)}
            </option>
          ))}
        </select>
      </div>
      {/* Index badge */}
      <div className="absolute top-2 left-2 bg-slate-900/80 text-slate-300 text-xs px-1.5 py-0.5 rounded font-mono">
        #{index + 1}
      </div>
    </div>
  );
}

function ProcessingIndicator({ step }) {
  const currentIdx = PROCESSING_STEPS.findIndex((s) => s.key === step);
  return (
    <div className="space-y-2 py-4">
      {PROCESSING_STEPS.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={s.key} className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
              done ? 'bg-green-500' : active ? 'bg-blue-500' : 'bg-slate-700'
            }`}>
              {done ? (
                <CheckCircle2 size={12} className="text-white" />
              ) : active ? (
                <Loader2 size={12} className="text-white animate-spin" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              )}
            </div>
            <span className={`text-sm ${done ? 'text-slate-400 line-through' : active ? 'text-white font-medium' : 'text-slate-600'}`}>
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ScoreBar({ score }) {
  const color = score >= 70 ? 'from-green-500 to-emerald-400' : score >= 40 ? 'from-amber-500 to-yellow-400' : 'from-red-500 to-rose-400';
  return (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-slate-400 text-sm">Compliance Score</span>
        <span className="text-white font-bold text-lg">{score}%</span>
      </div>
      <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
      <p className="text-slate-600 text-xs mt-1">
        Weighted by severity · High×3, Medium×2, Low×1 · N/A rules excluded
      </p>
    </div>
  );
}

function EvidenceBboxViewer({ imageData, highlightBbox, ocrLines }) {
  const canvasRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  function drawOverlay(img) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);

    // Draw all OCR bboxes in dim blue
    if (ocrLines) {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)';
      ctx.lineWidth = 1;
      for (const line of ocrLines) {
        if (line.box && line.box.length >= 2) {
          const pts = line.box;
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
          ctx.closePath();
          ctx.stroke();
        }
      }
    }

    // Highlight specific bbox in bright yellow
    if (highlightBbox) {
      const { x, y, width, height } = highlightBbox;
      ctx.fillStyle = 'rgba(251, 191, 36, 0.20)';
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);
    }
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
      <img
        src={imageData}
        alt="Evidence"
        className="w-full hidden"
        onLoad={(e) => { drawOverlay(e.target); setLoaded(true); }}
      />
      <canvas ref={canvasRef} className="w-full" />
      {!loaded && <div className="flex items-center justify-center py-16 text-slate-500">Loading image…</div>}
    </div>
  );
}

// ── Main Page Component ────────────────────────────────────────────────────────

function NewInspectionPage() {
  const navigate = useNavigate();
  const { name: inspectorName } = useAuth();

  // Image selection state
  const [imageItems, setImageItems] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [productName, setProductName] = useState('');
  const fileInputRef = useRef(null);

  // Processing state
  const [phase, setPhase] = useState('upload'); // 'upload' | 'processing' | 'results'
  const [processingStep, setProcessingStep] = useState('upload');
  const [processingError, setProcessingError] = useState(null);

  // Results state
  const [result, setResult] = useState(null);

  // Evidence viewer state
  const [evidenceModal, setEvidenceModal] = useState(null); // { ruleResult, imageData, ocrLines }

  // Preview modal
  const [previewImg, setPreviewImg] = useState(null);

  // ── Image handlers ──────────────────────────────────────────────────────────

  function addFiles(files) {
    const valid = Array.from(files).filter((f) => /image\/(jpeg|jpg|png|webp)/.test(f.type));
    if (valid.length === 0) return;
    const newItems = valid.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      label: imageItems.length === 0 ? 'front' : 'other',
    }));
    setImageItems((prev) => [...prev, ...newItems]);
  }

  const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback(() => setIsDragging(false), []);
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }, [imageItems]);

  function removeImage(index) {
    setImageItems((prev) => prev.filter((_, i) => i !== index));
  }

  function setLabel(index, label) {
    setImageItems((prev) => prev.map((item, i) => i === index ? { ...item, label } : item));
  }

  // ── Analysis ────────────────────────────────────────────────────────────────

  async function handleAnalyze() {
    if (imageItems.length === 0) return;
    setPhase('processing');
    setProcessingError(null);

    try {
      // Step 1: Create inspection
      setProcessingStep('upload');
      const inspection = await createInspection(productName || 'Unknown Product');
      const inspectionId = inspection._id;

      // Step 2: Upload images
      await uploadImages(inspectionId, imageItems, () => {});

      // Step 3: Run OCR
      setProcessingStep('ocr');
      // Small visual pause so user sees the step
      await new Promise((r) => setTimeout(r, 300));

      // Step 4: Analyze (OCR + extraction + rules all in one call)
      setProcessingStep('extract');
      const analysisResult = await analyzeInspection(inspectionId);
      setProcessingStep('rules');
      await new Promise((r) => setTimeout(r, 200));
      setProcessingStep('done');

      setResult({ ...analysisResult, inspectionId });
      setPhase('results');
    } catch (err) {
      setProcessingError(err.displayMessage || err.message || 'Analysis failed. Please try again.');
      setPhase('upload');
    }
  }

  // ── Render helpers ──────────────────────────────────────────────────────────

  function renderUploadPhase() {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-blue-600/15 border border-blue-500/30 text-blue-400 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
            <ScanLine size={15} />
            New Inspection
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Upload Product Images</h1>
          <p className="text-slate-400 text-sm">
            Upload one or more photos of the product label. Label each image (front, back, side, MRP area, etc.)
            for better results.
          </p>
        </div>

        {/* Product name */}
        <div className="mb-5">
          <label className="block text-slate-300 text-sm font-medium mb-1.5">Product Name (optional)</label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="e.g. Britannia Good Day Biscuits 100g"
            className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all mb-5 ${
            isDragging
              ? 'border-blue-500 bg-blue-600/10'
              : 'border-slate-700 bg-slate-900 hover:border-slate-500 hover:bg-slate-800/50'
          }`}
        >
          <UploadCloud size={40} className={`mx-auto mb-3 ${isDragging ? 'text-blue-400' : 'text-slate-600'}`} />
          <p className="text-slate-300 font-medium mb-1">
            {isDragging ? 'Drop images here' : 'Drag & drop product label images'}
          </p>
          <p className="text-slate-500 text-sm">or click to browse · JPG, PNG, WEBP · up to 10 images · 20MB each</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            onChange={(e) => addFiles(e.target.files)}
            className="hidden"
          />
        </div>

        {/* Thumbnails grid */}
        {imageItems.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-slate-300 text-sm font-medium">{imageItems.length} image{imageItems.length > 1 ? 's' : ''} selected</p>
              <button onClick={() => setImageItems([])} className="text-slate-500 hover:text-red-400 text-xs transition">
                Clear all
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {imageItems.map((item, i) => (
                <ImageThumbnail
                  key={i}
                  item={item}
                  index={i}
                  onRemove={removeImage}
                  onLabelChange={setLabel}
                  onPreview={(it) => setPreviewImg(it.previewUrl)}
                />
              ))}
            </div>
          </div>
        )}

        {processingError && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-5">
            <strong>Error:</strong> {processingError}
          </div>
        )}

        {/* Analyze button */}
        <button
          onClick={handleAnalyze}
          disabled={imageItems.length === 0}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3.5 rounded-xl transition text-lg"
        >
          <ScanLine size={20} />
          Analyze Product
        </button>
        {imageItems.length === 0 && (
          <p className="text-slate-600 text-xs text-center mt-2">Upload at least one image to continue</p>
        )}
      </div>
    );
  }

  function renderProcessingPhase() {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 size={28} className="text-blue-400 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Analyzing Product</h2>
          <p className="text-slate-400 text-sm mb-6">
            Running OCR and applying Legal Metrology (Packaged Commodities) Rules, 2011…
          </p>
          <ProcessingIndicator step={processingStep} />
        </div>
      </div>
    );
  }

  function renderResultsPhase() {
    if (!result) return null;
    const statusCfg = STATUS_CONFIG[result.complianceStatus] || STATUS_CONFIG['non-compliant'];
    const StatusIcon = statusCfg.icon;

    const passCnt = result.ruleResults.filter((r) => r.result === 'PASS').length;
    const failCnt = result.ruleResults.filter((r) => r.result === 'FAIL').length;
    const warnCnt = result.ruleResults.filter((r) => r.result === 'UNABLE_TO_VERIFY' || r.result === 'REQUIRES_REVIEW').length;
    const naCnt = result.ruleResults.filter((r) => r.result === 'NOT_APPLICABLE').length;

    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Top row */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => { setPhase('upload'); setResult(null); setImageItems([]); }}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-2 transition"
            >
              <ArrowLeft size={14} /> New Inspection
            </button>
            <h1 className="text-3xl font-bold text-white">Inspection Result</h1>
            {result.inspectionId && (
              <p className="text-slate-500 text-xs mt-1">ID: {result.inspectionId}</p>
            )}
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${statusCfg.badge}`}>
            <StatusIcon size={16} />
            {statusCfg.label}
          </div>
        </div>

        {/* Score + summary cards */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
          <ScoreBar score={result.complianceScore} />
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Passed', count: passCnt, color: 'text-green-400' },
              { label: 'Failed', count: failCnt, color: 'text-red-400' },
              { label: 'Review', count: warnCnt, color: 'text-amber-400' },
              { label: 'N/A', count: naCnt, color: 'text-slate-500' },
            ].map((s) => (
              <div key={s.label} className="bg-slate-800/50 rounded-xl p-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Extracted declarations */}
        {result.extractedFields && result.extractedFields.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
            <h2 className="text-slate-300 font-semibold mb-3 flex items-center gap-2">
              <FileImage size={16} className="text-blue-400" />
              Extracted Declarations
              <span className="text-slate-600 text-xs font-normal">({result.extractedFields.length} fields found)</span>
            </h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {result.extractedFields.map((f, i) => (
                <div key={i} className="bg-slate-800/60 rounded-xl px-3 py-2.5">
                  <p className="text-slate-500 text-xs mb-0.5">{f.fieldKey}</p>
                  <p className="text-slate-200 text-sm font-mono">{f.rawValue}</p>
                  <div className="flex items-center justify-between mt-1">
                    {f.normalizedValue && typeof f.normalizedValue === 'object' && f.normalizedValue !== null && (
                      <p className="text-blue-400 text-xs">
                        {f.normalizedValue.amount != null ? `${f.normalizedValue.amount} ${f.unit || ''}`.trim()
                          : f.normalizedValue.display || f.normalizedValue.country || f.normalizedValue.number || ''}
                      </p>
                    )}
                    <span className="text-slate-600 text-xs ml-auto">{Math.round(f.confidence * 100)}% conf.</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Raw OCR text */}
        {result.rawText && (
          <details className="bg-slate-900 border border-slate-800 rounded-2xl mb-6">
            <summary className="p-4 text-slate-300 text-sm font-medium cursor-pointer select-none">
              Raw OCR Text ({result.rawText.split(' ').length} words)
            </summary>
            <div className="px-4 pb-4">
              <p className="text-slate-500 text-xs font-mono whitespace-pre-wrap break-words">{result.rawText}</p>
            </div>
          </details>
        )}

        {/* Rule-by-rule checklist */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
          <h2 className="text-slate-300 font-semibold mb-3">Rule-by-Rule Compliance Checklist</h2>
          <div className="space-y-2">
            {result.ruleResults.map((r) => {
              const cfg = RESULT_CONFIG[r.result] || RESULT_CONFIG.UNABLE_TO_VERIFY;
              const Icon = cfg.icon;
              const hasEvidence = r.evidence && (r.evidence.rawValue || r.evidence.bbox);
              return (
                <div key={r.ruleId} className={`border rounded-xl px-3 py-2.5 ${cfg.bg}`}>
                  <div className="flex items-start gap-2">
                    <Icon size={15} className={`${cfg.color} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-200 text-sm font-medium">{r.title}</span>
                        <span className={`text-xs font-bold ml-2 flex-shrink-0 ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      {r.evidence?.rawValue && (
                        <p className="text-slate-400 text-xs mt-0.5 italic truncate" title={r.evidence.rawValue}>
                          "{r.evidence.rawValue}"
                          {r.evidence.confidence != null && (
                            <span className="text-slate-600 not-italic ml-1">
                              ({Math.round(r.evidence.confidence * 100)}%)
                            </span>
                          )}
                        </p>
                      )}
                      {r.explanation && !r.evidence?.rawValue && (
                        <p className="text-slate-500 text-xs mt-0.5">{r.explanation}</p>
                      )}
                      <p className="text-slate-600 text-xs mt-0.5">{r.legalReference}</p>
                    </div>
                    {hasEvidence && r.evidence?.imageId && (
                      <button
                        onClick={() => openEvidenceViewer(r)}
                        className="flex-shrink-0 text-xs text-blue-400 hover:text-blue-300 transition border border-blue-500/30 bg-blue-600/10 hover:bg-blue-600/20 px-2 py-1 rounded-lg"
                      >
                        <Eye size={12} className="inline mr-1" />
                        Evidence
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-4 flex-wrap">
          <a
            href={getReportUrl(result.inspectionId)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 text-sm font-semibold px-4 py-2.5 rounded-xl transition"
          >
            <Download size={15} />
            Download PDF Report
          </a>
          <button
            onClick={() => navigate('/history')}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition"
          >
            View in History
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Evidence viewer — load image + OCR lines from backend
  async function openEvidenceViewer(ruleResult) {
    if (!ruleResult.evidence?.imageId) return;
    try {
      const imgData = await getInspectionImage(result.inspectionId, ruleResult.evidence.imageId);
      setEvidenceModal({
        ruleResult,
        imageData: imgData.originalData,
        ocrLines: imgData.ocrLines || [],
        highlightBbox: ruleResult.evidence.bbox,
      });
    } catch (e) {
      console.error('Could not load evidence image:', e.message);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Image preview modal */}
      {previewImg && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImg(null)}
        >
          <img src={previewImg} alt="Preview" className="max-w-full max-h-full rounded-xl shadow-2xl" />
          <button className="absolute top-4 right-4 text-white bg-slate-800 p-2 rounded-xl" onClick={() => setPreviewImg(null)}>
            <X size={20} />
          </button>
        </div>
      )}

      {/* Evidence modal */}
      {evidenceModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setEvidenceModal(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div>
                <h3 className="text-white font-semibold">{evidenceModal.ruleResult.title}</h3>
                <p className="text-slate-500 text-xs mt-0.5">{evidenceModal.ruleResult.legalReference}</p>
              </div>
              <button onClick={() => setEvidenceModal(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <EvidenceBboxViewer
                imageData={evidenceModal.imageData}
                highlightBbox={evidenceModal.highlightBbox}
                ocrLines={evidenceModal.ocrLines}
              />
              {evidenceModal.ruleResult.evidence?.rawValue && (
                <div className="mt-3 bg-slate-800 rounded-xl p-3">
                  <p className="text-slate-400 text-xs mb-1">Extracted text</p>
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

      {phase === 'upload' && renderUploadPhase()}
      {phase === 'processing' && renderProcessingPhase()}
      {phase === 'results' && renderResultsPhase()}
    </div>
  );
}

export default NewInspectionPage;
