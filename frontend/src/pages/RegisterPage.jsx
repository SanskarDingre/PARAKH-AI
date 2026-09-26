import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { User, Mail, Phone, Lock, ShieldCheck } from 'lucide-react';

function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await axios.post('http://localhost:5000/api/auth/register', form);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden px-4">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl"></div>

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-blue-600/20 p-3 rounded-2xl mb-3">
            <ShieldCheck className="text-blue-400" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">Parakh AI</h1>
          <p className="text-slate-400 text-sm">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl p-7 shadow-2xl">
          <div className="relative mb-3">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input placeholder="Full name" value={form.name} onChange={(e) => update('name', e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-slate-800 text-white placeholder-slate-500 outline-none border border-transparent focus:border-blue-500 transition" />
          </div>
          <div className="relative mb-3">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input placeholder="Email" value={form.email} onChange={(e) => update('email', e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-slate-800 text-white placeholder-slate-500 outline-none border border-transparent focus:border-blue-500 transition" />
          </div>
          <div className="relative mb-3">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input placeholder="Mobile number (optional)" value={form.phone} onChange={(e) => update('phone', e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-slate-800 text-white placeholder-slate-500 outline-none border border-transparent focus:border-blue-500 transition" />
          </div>
          <div className="relative mb-4">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input type="password" placeholder="Password" value={form.password} onChange={(e) => update('password', e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-slate-800 text-white placeholder-slate-500 outline-none border border-transparent focus:border-blue-500 transition" />
          </div>

          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          {success && <p className="text-green-400 text-sm mb-3">Account created — redirecting to login...</p>}

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg transition">
            Create Account
          </button>

          <p className="text-slate-500 text-sm text-center mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
export default RegisterPage;
