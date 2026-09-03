import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Navigate, Link } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await login(email, password);
    if (success) navigate('/');
    setIsSubmitting(false);
  };

  const field =
    'w-full px-3 py-2.5 bg-white border border-slate-700 rounded text-slate-200 text-sm ' +
    'placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-colors';

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-slate-950">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-14" style={{ background: '#1e1c17' }}>
        <div className="flex items-center gap-2.5">
          <Bolt style={{ color: '#bf4a1f' }} />
          <span className="font-mono text-base font-semibold tracking-wide" style={{ color: '#f2f0ea' }}>
            GENMONITOR
          </span>
        </div>
        <div className="max-w-md">
          <p className="text-[1.6rem] leading-snug" style={{ color: '#f2f0ea' }}>
            Standby generator operations — telemetry, alerting, work orders and
            preventive maintenance, in one console.
          </p>
          <p className="mt-5 text-sm" style={{ color: '#8c8578' }}>
            NOC &amp; field access, role-based.
          </p>
        </div>
        <p className="font-mono text-xs" style={{ color: '#6f6959' }}>v1 — internal</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center px-6 py-12 sm:px-14">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <Bolt className="text-cyan-400" />
            <span className="font-mono font-semibold text-slate-100">GENMONITOR</span>
          </div>

          <h1 className="text-xl font-semibold text-slate-100">Sign in</h1>
          <p className="text-sm text-slate-400 mt-1 mb-8">Use your operator account.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-slate-400 mb-1.5">
                Email
              </label>
              <input
                id="email" type="email" required autoComplete="username"
                className={field} placeholder="operator@gensys.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-xs font-medium text-slate-400">Password</label>
                <Link to="/forgot-password" className="text-xs text-cyan-400 hover:text-cyan-300">
                  Forgot?
                </Link>
              </div>
              <input
                id="password" type="password" required autoComplete="current-password"
                className={field} placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded text-sm font-semibold text-white disabled:opacity-60 transition-colors"
              style={{ background: '#1e1c17' }}
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const Bolt = ({ className, style }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" className={className} style={style}
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
  </svg>
);

export default Login;
