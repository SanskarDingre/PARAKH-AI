import { ScanLine, Brain, ShieldCheck, AlertCircle, FileText, Server, Code2, Database } from 'lucide-react';

const steps = [
  {
    icon: <ScanLine size={20} className="text-blue-400" />,
    title: 'Scan',
    desc: 'Product, package, or label image is uploaded or captured via the mobile camera.',
  },
  {
    icon: <Brain size={20} className="text-purple-400" />,
    title: 'Understand',
    desc: 'EasyOCR extracts all text blocks with spatial bounding boxes and confidence scores.',
  },
  {
    icon: <ShieldCheck size={20} className="text-emerald-400" />,
    title: 'Verify',
    desc: 'The Legal Metrology rule engine validates each declaration field against LMPC Rules 2011.',
  },
  {
    icon: <AlertCircle size={20} className="text-amber-400" />,
    title: 'Flag',
    desc: 'Missing, inconsistent, or low-confidence declarations are highlighted with legal references.',
  },
  {
    icon: <FileText size={20} className="text-cyan-400" />,
    title: 'Report',
    desc: 'An explainable compliance report is generated — downloadable as PDF for regulatory records.',
  },
];

const techStack = [
  { icon: <Code2 size={18} className="text-blue-400" />, name: 'React 19 + Vite', desc: 'Frontend SPA' },
  { icon: <Server size={18} className="text-green-400" />, name: 'Node.js + Express 5', desc: 'REST API backend' },
  { icon: <Database size={18} className="text-orange-400" />, name: 'MongoDB + Mongoose', desc: 'Data persistence' },
  { icon: <Brain size={18} className="text-purple-400" />, name: 'Python + FastAPI + EasyOCR', desc: 'OCR microservice' },
  { icon: <ShieldCheck size={18} className="text-emerald-400" />, name: 'JWT + bcrypt', desc: 'Auth & security' },
  { icon: <FileText size={18} className="text-cyan-400" />, name: 'PDFKit', desc: 'Report generation' },
];

function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-3">How Parakh AI Works</h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          A five-stage pipeline from raw image to legally-grounded compliance verdict.
        </p>
      </div>

      {/* Steps */}
      <div className="relative mb-16">
        {/* Vertical line */}
        <div className="absolute left-6 top-8 bottom-8 w-px bg-gradient-to-b from-blue-600/50 via-slate-700 to-transparent" />

        <div className="space-y-5">
          {steps.map((s, i) => (
            <div key={s.title} className="flex gap-5 relative">
              <div className="flex-shrink-0 w-12 h-12 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center z-10">
                {s.icon}
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex-1 hover:border-slate-700 transition">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-blue-500 text-xs font-bold">0{i + 1}</span>
                  <p className="text-white font-semibold">{s.title}</p>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tech stack */}
      <h2 className="text-2xl font-bold text-white mb-6 text-center">Tech Stack</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
        {techStack.map((t) => (
          <div key={t.name} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition">
            <div className="flex items-center gap-2 mb-1">
              {t.icon}
              <span className="text-white text-sm font-semibold">{t.name}</span>
            </div>
            <p className="text-slate-500 text-xs">{t.desc}</p>
          </div>
        ))}
      </div>

      {/* Legal disclaimer */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-400/80 leading-relaxed">
        <strong>Disclaimer:</strong> Parakh AI provides an AI-assisted preliminary compliance assessment only.
        The final legal determination of compliance remains subject to authorised inspection by designated officers
        under the Legal Metrology Act, 2009, and applicable rules.
      </div>
    </div>
  );
}
export default AboutPage;
