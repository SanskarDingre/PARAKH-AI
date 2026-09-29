import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Mail, ShieldCheck, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function OtpLoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('request');
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  async function requestOtp(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/otp/request', { identifier });
      setInfo(res.data.message);
      setStep('verify');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not send OTP.');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/otp/verify', { identifier, code });
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden px-4">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-blue-600/20 p-3 rounded-2xl mb-3 ring-1 ring-blue-500/30">
            <ShieldCheck className="text-blue-400" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">Parakh AI</h1>
          <p className="text-slate-400 text-sm">Sign in with a one-time code</p>
        </div>

        <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl p-7 shadow-2xl">
          {step === 'request' && (
            <form onSubmit={requestOtp}>
              <div className="relative mb-4">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  placeholder="Email or mobile number"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-slate-800 text-white placeholder-slate-500 outline-none border border-transparent focus:border-blue-500 transition"
                />
              </div>
              {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition"
              >
                {loading ? 'Sending…' : 'Send Code'}
              </button>
              <p className="text-slate-600 text-xs text-center mt-3">
                Mobile OTP prints to the server console (no SMS provider yet).
              </p>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={verifyOtp}>
              {info && <p className="text-slate-400 text-sm mb-3 bg-slate-800 rounded-lg p-3">{info}</p>}
              <div className="relative mb-4">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  placeholder="6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  required
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-slate-800 text-white placeholder-slate-500 outline-none border border-transparent focus:border-blue-500 transition tracking-widest text-lg"
                />
              </div>
              {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition"
              >
                {loading ? 'Verifying…' : 'Verify & Sign In'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('request'); setError(null); setInfo(null); }}
                className="w-full text-slate-500 hover:text-slate-300 text-sm mt-3 transition"
              >
                ← Use a different address
              </button>
            </form>
          )}

          <p className="text-slate-500 text-sm text-center mt-5">
            Prefer a password?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">Sign in here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
export default OtpLoginPage;
