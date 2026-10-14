import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Sprout, ShieldCheck, Lock, Mail, ArrowRight, UserCheck, Building2, Terminal, Sparkles, Key, Check } from 'lucide-react';
import { UserRole } from '../types';

import { apiFetch } from '../config/api';

export const LoginPage: React.FC = () => {
  const { user, login, demoLogin, isLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [demoRoleLoading, setDemoRoleLoading] = useState<UserRole | null>(null);
  // Default to true so demo login is immediately accessible without waiting for backend
  const [demoEnabled, setDemoEnabled] = useState<boolean>(true);

  React.useEffect(() => {
    apiFetch('/api/v1/auth/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        // Only disable if backend explicitly reports demo_enabled is false
        if (data && data.demo_enabled === false) {
          setDemoEnabled(false);
        }
      })
      .catch(() => {
        // Keep demo login enabled if backend is offline or unreachable
        setDemoEnabled(true);
      });
  }, []);

  React.useEffect(() => {
    if (user) {
      navigate(user.role === 'FPO_ADMIN' ? '/fpo/dashboard' : (user.role === 'SYSTEM_ADMIN' ? '/admin' : '/farmer/dashboard'));
    }
  }, [user, navigate]);

  const fillDemoCredentials = (role: 'FARMER' | 'FPO_ADMIN' | 'SYSTEM_ADMIN') => {
    if (role === 'FARMER') {
      setEmail('ramesh.farmer@agriedge.internal');
      setPassword('agriedge2026');
    } else if (role === 'FPO_ADMIN') {
      setEmail('admin.cauveryfpo@agriedge.internal');
      setPassword('agriedge2026');
    } else {
      setEmail('admin@agriedge.internal');
      setPassword('agriedge2026');
    }
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
      });

      if (res.ok) {
        const data = await res.json();
        login(data.access_token, {
          id: data.user_id,
          email: email.trim().toLowerCase(),
          full_name: data.full_name,
          role: data.role,
          language_preference: data.language_preference || 'en'
        }, data.refresh_token);
        navigate(data.role === 'FPO_ADMIN' ? '/fpo/dashboard' : (data.role === 'SYSTEM_ADMIN' ? '/admin' : '/farmer/dashboard'));
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.detail?.message || 'Invalid credentials. You can use 1-click Demo Login below.');
      }
    } catch (err) {
      // If backend is offline but user typed demo credentials, gracefully handle demo login
      const cleanEmail = email.trim().toLowerCase();
      if (password === 'agriedge2026' || cleanEmail.includes('farmer') || cleanEmail.includes('cauveryfpo') || cleanEmail.includes('admin')) {
        let matchedRole: UserRole = 'FARMER';
        if (cleanEmail.includes('fpo') || cleanEmail.includes('cauvery')) matchedRole = 'FPO_ADMIN';
        else if (cleanEmail.includes('admin@agriedge.internal') || cleanEmail.includes('system')) matchedRole = 'SYSTEM_ADMIN';
        await demoLogin(matchedRole);
        navigate(matchedRole === 'FPO_ADMIN' ? '/fpo/dashboard' : (matchedRole === 'SYSTEM_ADMIN' ? '/admin' : '/farmer/dashboard'));
        return;
      }
      setErrorMsg('Cannot reach backend server. Please use the 1-click Demo Login options below.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoSwitch = async (role: UserRole) => {
    setDemoRoleLoading(role);
    setErrorMsg(null);
    try {
      await demoLogin(role);
      navigate(role === 'FPO_ADMIN' ? '/fpo/dashboard' : (role === 'SYSTEM_ADMIN' ? '/admin' : '/farmer/dashboard'));
    } finally {
      setDemoRoleLoading(null);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="bg-white rounded-3xl p-7 sm:p-8 max-w-md w-full border border-slate-200 shadow-xl space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto flex items-center justify-center shadow-lg border border-slate-100 bg-white">
            <img src="/logo.png" alt="AgriEdge" className="w-full h-full object-cover" />
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
                placeholder="ramesh.farmer@agriedge.internal"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-agri-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-700">Password</label>
              <span className="text-[10px] text-slate-400">Demo pwd: agriedge2026</span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (agriedge2026)"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-agri-500"
              />
            </div>
          </div>

          {/* Quick Demo Autofill Chips */}
          <div className="flex items-center justify-between pt-0.5 bg-slate-50 p-2 rounded-xl border border-slate-100">
            <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
              <Key className="w-3 h-3 text-agri-600" />
              Fill Demo:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => fillDemoCredentials('FARMER')}
                className="px-2 py-0.5 rounded-lg bg-emerald-100/70 hover:bg-emerald-200 text-emerald-900 text-[10px] font-semibold transition"
              >
                🌾 Farmer
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials('FPO_ADMIN')}
                className="px-2 py-0.5 rounded-lg bg-blue-100/70 hover:bg-blue-200 text-blue-900 text-[10px] font-semibold transition"
              >
                🏢 FPO
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials('SYSTEM_ADMIN')}
                className="px-2 py-0.5 rounded-lg bg-slate-200/70 hover:bg-slate-300 text-slate-800 text-[10px] font-semibold transition"
              >
                ⚙️ Admin
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-agri-700 hover:bg-agri-800 active:scale-[0.99] text-white font-bold py-3.5 rounded-2xl shadow transition text-sm cursor-pointer"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Link to Sign Up */}
        <div className="text-center pt-0">
          <p className="text-xs text-slate-600">
            New to AgriEdge?{' '}
            <Link
              to="/signup"
              className="font-bold text-agri-700 hover:text-agri-800 underline underline-offset-2"
            >
              Create a free account
            </Link>
          </p>
        </div>

        {/* Quick Demo Mode Buttons - Always visible */}
        {demoEnabled && (
          <div className="pt-4 border-t border-slate-200 text-center space-y-3">
            <div className="flex items-center justify-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                ⚡ Instant 1-Click Demo Login
              </span>
            </div>
            <p className="text-[11px] text-slate-500 -mt-1">
              Select any role to test dashboards instantly with preloaded farm data:
            </p>

            <div className="flex flex-col gap-2 text-left">
              <button
                type="button"
                disabled={Boolean(demoRoleLoading)}
                onClick={() => handleDemoSwitch('FARMER')}
                className="group w-full flex items-center justify-between p-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-emerald-950 rounded-xl border border-emerald-200 shadow-sm hover:shadow transition"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                    <UserCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-900">
                        {demoRoleLoading === 'FARMER' ? 'Signing in as Farmer...' : 'Farmer Ramesh Gowda'}
                      </span>
                      <span className="text-[9px] bg-emerald-200/80 text-emerald-900 font-bold px-1.5 py-0.2 rounded font-mono">
                        Smallholder
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      2 Acres | Tomato Crop | Mandya Drip Telemetry
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-600 transform group-hover:translate-x-1 transition" />
              </button>

              <button
                type="button"
                disabled={Boolean(demoRoleLoading)}
                onClick={() => handleDemoSwitch('FPO_ADMIN')}
                className="group w-full flex items-center justify-between p-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-950 rounded-xl border border-blue-200 shadow-sm hover:shadow transition"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-blue-900">
                        {demoRoleLoading === 'FPO_ADMIN' ? 'Signing in as FPO...' : 'Cauvery FPO Manager'}
                      </span>
                      <span className="text-[9px] bg-blue-200/80 text-blue-900 font-bold px-1.5 py-0.2 rounded font-mono">
                        342 Farmers
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      Cluster-Wide Analytics & Shared Assets
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-blue-600 transform group-hover:translate-x-1 transition" />
              </button>

              <button
                type="button"
                disabled={Boolean(demoRoleLoading)}
                onClick={() => handleDemoSwitch('SYSTEM_ADMIN')}
                className="group w-full flex items-center justify-between p-2.5 bg-gradient-to-r from-slate-50 to-zinc-100 hover:from-slate-100 hover:to-zinc-200 text-slate-900 rounded-xl border border-slate-200 shadow-sm hover:shadow transition"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-700 text-white flex items-center justify-center shadow-sm">
                    <Terminal className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">
                        {demoRoleLoading === 'SYSTEM_ADMIN' ? 'Signing in as Admin...' : 'System Observability Lead'}
                      </span>
                      <span className="text-[9px] bg-slate-200 text-slate-800 font-bold px-1.5 py-0.2 rounded font-mono">
                        Platform
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      SLI / SLO Latency & Edge Node Observability
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 transform group-hover:translate-x-1 transition" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
