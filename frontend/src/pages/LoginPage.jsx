import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import { Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await client.post('/api/auth/login', { identifier, password });
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials.');
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
          <p className="text-slate-400 text-sm">Legal Metrology Compliance Checker</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl p-7 shadow-2xl"
        >
          <h2 className="text-lg font-semibold text-white mb-5">Sign in to your account</h2>

          <div className="relative mb-3">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Email or mobile number"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-slate-800 text-white placeholder-slate-500 outline-none border border-transparent focus:border-blue-500 transition"
            />
          </div>

          <div className="relative mb-4">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-slate-800 text-white placeholder-slate-500 outline-none border border-transparent focus:border-blue-500 transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition mb-3"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          <p className="text-center mb-2">
            <Link to="/otp-login" className="text-blue-400 hover:text-blue-300 text-sm font-medium">
              Sign in with OTP instead
            </Link>
          </p>
          <p className="text-slate-500 text-sm text-center">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
export default LoginPage;
