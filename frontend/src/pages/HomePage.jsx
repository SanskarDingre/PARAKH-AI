import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck, ScanLine, FileText, BarChart3, CheckCircle2, XCircle,
  ArrowRight, Zap, BookOpen, Lock,
} from 'lucide-react';

const features = [
  {
    icon: <ScanLine size={22} className="text-blue-400" />,
    title: 'AI-Powered OCR',
    desc: 'EasyOCR scans product labels and extracts every text element with spatial coordinates and confidence scores.',
  },
  {
    icon: <BookOpen size={22} className="text-emerald-400" />,
    title: 'Legal Metrology Rule Engine',
    desc: 'Rules aligned to LMPC Rules 2011 — Manufacturer, MRP, Net Quantity, Mfg Date, Consumer Care and more.',
  },
  {
    icon: <Zap size={22} className="text-amber-400" />,
    title: 'Instant Compliance Verdict',
    desc: 'Get PASS / FAIL / Needs Review per field in seconds, with the exact matched text shown as evidence.',
  },
  {
    icon: <FileText size={22} className="text-purple-400" />,
    title: 'Downloadable PDF Report',
    desc: 'Generate a formatted compliance report per inspection — ready for regulatory records or team review.',
  },
  {
    icon: <BarChart3 size={22} className="text-cyan-400" />,
    title: 'Inspection Analytics',
    desc: 'Dashboard shows compliant vs non-compliant trends, severity breakdowns and most common violations.',
  },
  {
    icon: <Lock size={22} className="text-rose-400" />,
    title: 'Role-Based Access',
    desc: 'Viewer, Officer and Admin roles. OTP login, JWT-secured API, officer override and audit trail built-in.',
  },
];

const rules = [
  { label: 'Manufacturer / Packer Details', ref: 'Rule 6(1)(a)', pass: true },
  { label: 'Net Quantity', ref: 'Rule 6(1)(c)', pass: true },
  { label: 'Maximum Retail Price (MRP)', ref: 'Rule 6(1)(e)', pass: false },
  { label: 'Month & Year of Manufacture', ref: 'Rule 6(1)(d)', pass: true },
  { label: 'Consumer Care Details', ref: 'Rule 6(2)', pass: false },
];

function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-28 flex flex-col items-center text-center">
        {/* Glowing background blobs */}
        <div className="absolute -top-40 left-1/4 w-[500px] h-[500px] bg-blue-700/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-[350px] h-[350px] bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

        <h1 className="relative text-5xl md:text-7xl font-extrabold tracking-tight mb-5 bg-gradient-to-br from-white via-slate-200 to-slate-400 bg-clip-text text-transparent leading-tight">
          Parakh AI
        </h1>
        <p className="relative text-slate-400 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed">
          AI-powered automated compliance verification for packaged commodities
          under <span className="text-white font-semibold">Legal Metrology (Packaged Commodities) Rules, 2011</span>.
          Scan a label — get an instant, explainable verdict.
        </p>

        <div className="relative flex flex-wrap gap-4 justify-center">
          {isAuthenticated ? (
            <Link
              to="/check"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-7 py-3.5 rounded-xl transition-all hover:scale-105 shadow-lg shadow-blue-600/25"
            >
              <ScanLine size={18} />
              Check a Product
              <ArrowRight size={16} />
            </Link>
          ) : (
            <>
              <Link
                to="/check"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-7 py-3.5 rounded-xl transition-all hover:scale-105 shadow-lg shadow-blue-600/25"
              >
                <ScanLine size={18} />
                Check a Product
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/login"
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold px-7 py-3.5 rounded-xl transition-all hover:scale-105"
              >
                Sign In
              </Link>
            </>
          )}
          <Link
            to="/about"
            className="flex items-center gap-2 text-slate-400 hover:text-white font-medium px-5 py-3.5 transition"
          >
            How it works →
          </Link>
        </div>
      </section>

      {/* Live mockup */}
      <section className="px-6 pb-20 flex justify-center">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <p className="text-slate-300 font-semibold text-sm">Sample Inspection Result</p>
            <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-semibold">Non-Compliant</span>
          </div>
          <div className="space-y-2">
            {rules.map((r) => (
              <div
                key={r.label}
                className="flex items-center justify-between bg-slate-800/60 rounded-lg px-3 py-2"
              >
                <div>
                  <p className="text-slate-200 text-sm font-medium">{r.label}</p>
                  <p className="text-slate-500 text-xs">{r.ref}</p>
                </div>
                {r.pass ? (
                  <CheckCircle2 size={18} className="text-green-400 flex-shrink-0" />
                ) : (
                  <XCircle size={18} className="text-red-400 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-slate-500 text-xs">Compliance Score</span>
            <div className="flex items-center gap-2">
              <div className="w-28 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" style={{ width: '60%' }} />
              </div>
              <span className="text-slate-300 text-xs font-semibold">60%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-28 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-3">Everything You Need</h2>
        <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
          From OCR extraction to legal rule validation, audit trail and PDF export — all in one system.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-600 transition-colors group"
            >
              <div className="mb-3 inline-block bg-slate-800 p-2.5 rounded-xl group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <p className="text-white font-semibold mb-1">{f.title}</p>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      {!isAuthenticated && (
        <section className="px-6 pb-24 text-center">
          <div className="max-w-xl mx-auto bg-gradient-to-br from-blue-600/20 to-emerald-600/10 border border-blue-500/20 rounded-3xl p-10">
            <ShieldCheck size={36} className="text-blue-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-3">Try it — no account needed</h2>
            <p className="text-slate-400 text-sm mb-6">
              Scan any packaged commodity label instantly. Sign in to save history, download reports and access the dashboard.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                to="/check"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3 rounded-xl transition-all hover:scale-105 shadow-lg shadow-blue-600/20"
              >
                <ScanLine size={16} /> Check a Product
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold px-8 py-3 rounded-xl transition-all hover:scale-105"
              >
                Create Free Account
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
export default HomePage;
