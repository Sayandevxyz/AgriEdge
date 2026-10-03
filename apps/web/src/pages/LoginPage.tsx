import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Sprout, ShieldCheck, Lock, Mail, ArrowRight, UserCheck, Building2, Terminal } from 'lucide-react';
import { UserRole } from '../types';

export const LoginPage: React.FC = () => {
  const { login, demoLogin, isLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>('ramesh.farmer@agriedge.internal');
  const [password, setPassword] = useState<string>('agriedge2026');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (res.ok) {
        const data = await res.json();
        login(data.access_token, {
          id: data.user_id,
          email,
          full_name: data.full_name,
          role: data.role,
          language_preference: data.language_preference || 'en'
        });
        navigate(data.role === 'FPO_ADMIN' ? '/fpo/dashboard' : (data.role === 'SYSTEM_ADMIN' ? '/admin' : '/farmer/dashboard'));
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.detail?.message || 'Invalid credentials. Or use 1-click Judge Mode buttons below.');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to backend API server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoSwitch = async (role: UserRole) => {
    await demoLogin(role);
    navigate(role === 'FPO_ADMIN' ? '/fpo/dashboard' : (role === 'SYSTEM_ADMIN' ? '/admin' : '/farmer/dashboard'));
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-200 shadow-xl space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-agri-700 to-agri-500 p-2 mx-auto flex items-center justify-center shadow-md">
            <img src="/logo.svg" alt="AgriEdge" className="w-full h-full" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight pt-2">Sign in to AgriEdge</h1>
          <p className="text-xs text-slate-500">
            Farmer-Owned Intelligence for Water, Energy & Crop Productivity
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 text-rose-800 p-3.5 rounded-xl border border-rose-200 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-agri-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-agri-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-agri-700 hover:bg-agri-800 text-white font-bold py-3 rounded-2xl shadow transition"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Mode Buttons */}
        <div className="pt-4 border-t border-slate-100 text-center space-y-2.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            ⚡ Quick Judge / Demo Mode Access
          </span>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleDemoSwitch('FARMER')}
              className="w-full flex items-center justify-between p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-xl border border-emerald-200 text-xs font-semibold transition"
            >
              <span className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-700" />
                Sign In as Farmer Ramesh
              </span>
              <span className="text-[10px] bg-white px-2 py-0.5 rounded text-emerald-800 border border-emerald-300 font-mono">
                Smallholder (2 Acres)
              </span>
            </button>

            <button
              onClick={() => handleDemoSwitch('FPO_ADMIN')}
              className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-900 rounded-xl border border-slate-200 text-xs font-semibold transition"
            >
              <span className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-agri-700" />
                Sign In as FPO Agronomist Lead
              </span>
              <span className="text-[10px] bg-white px-2 py-0.5 rounded text-slate-700 border border-slate-200 font-mono">
                342 Farmers Cluster
              </span>
            </button>

            <button
              onClick={() => handleDemoSwitch('SYSTEM_ADMIN')}
              className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-900 rounded-xl border border-slate-200 text-xs font-semibold transition"
            >
              <span className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-slate-700" />
                Sign In as System Observability Lead
              </span>
              <span className="text-[10px] bg-white px-2 py-0.5 rounded text-slate-700 border border-slate-200 font-mono">
                Agent Health
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
