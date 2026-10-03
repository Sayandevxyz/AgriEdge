import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Sprout,
  Building2,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  ArrowRight,
  UserCheck,
  Terminal,
  Globe,
  CheckCircle2
} from 'lucide-react';
import { UserRole, LanguageCode } from '../types';

export const SignupPage: React.FC = () => {
  const { user, login, demoLogin } = useAuth();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [role, setRole] = useState<'FARMER' | 'FPO_ADMIN'>('FARMER');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(language);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  React.useEffect(() => {
    if (user) {
      navigate(
        user.role === 'FPO_ADMIN'
          ? '/fpo/dashboard'
          : user.role === 'SYSTEM_ADMIN'
          ? '/admin'
          : '/farmer/dashboard'
      );
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify and try again.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          phone_number: phoneNumber.trim() || undefined,
          role,
          language_preference: selectedLanguage
        })
      });

      if (res.ok) {
        const data = await res.json();
        setLanguage(selectedLanguage);
        login(data.access_token, {
          id: data.user_id,
          email: email.trim(),
          full_name: data.full_name,
          role: data.role as UserRole,
          language_preference: data.language_preference || selectedLanguage
        });

        navigate(
          data.role === 'FPO_ADMIN'
            ? '/fpo/dashboard'
            : data.role === 'SYSTEM_ADMIN'
            ? '/admin'
            : '/farmer/dashboard'
        );
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(
          err.detail?.message ||
            'Registration failed. This email may already be in use.'
        );
      }
    } catch {
      setErrorMsg('Unable to connect to the authentication server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoSwitch = async (demoRole: UserRole) => {
    await demoLogin(demoRole);
    navigate(
      demoRole === 'FPO_ADMIN'
        ? '/fpo/dashboard'
        : demoRole === 'SYSTEM_ADMIN'
        ? '/admin'
        : '/farmer/dashboard'
    );
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-10 bg-slate-50">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-agri-700 to-agri-500 p-2 mx-auto flex items-center justify-center shadow-md">
            <img src="/logo.svg" alt="AgriEdge" className="w-full h-full" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight pt-2">
            Create Your AgriEdge Account
          </h1>
          <p className="text-xs text-slate-500">
            Farmer-Owned Precision Intelligence for Water, Energy & Yield
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 text-rose-800 p-3.5 rounded-xl border border-rose-200 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Role Selector Tabs */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            Select Your Account Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole('FARMER')}
              className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition ${
                role === 'FARMER'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Sprout className={`w-4 h-4 ${role === 'FARMER' ? 'text-emerald-700' : 'text-slate-400'}`} />
              <span>Smallholder Farmer</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('FPO_ADMIN')}
              className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition ${
                role === 'FPO_ADMIN'
                  ? 'bg-agri-50 border-agri-500 text-agri-950 shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Building2 className={`w-4 h-4 ${role === 'FPO_ADMIN' ? 'text-agri-700' : 'text-slate-400'}`} />
              <span>FPO / Agronomist</span>
            </button>
          </div>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-agri-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. ramesh.kumar@example.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-agri-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-agri-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                App Language
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value as LanguageCode)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-agri-500 bg-white"
                >
                  <option value="en">English (EN)</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-agri-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-agri-500"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-agri-700 hover:bg-agri-800 text-white font-bold py-3.5 rounded-2xl shadow transition text-sm mt-2"
          >
            {submitting ? 'Creating Account...' : 'Sign Up & Continue'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Link back to Sign In */}
        <div className="text-center pt-2">
          <p className="text-xs text-slate-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-bold text-agri-700 hover:text-agri-800 underline underline-offset-2"
            >
              Sign in here
            </Link>
          </p>
        </div>

        {/* Quick Demo Mode Buttons */}
        <div className="pt-4 border-t border-slate-100 text-center space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            ⚡ Or Instantly Explore Demo Accounts
          </span>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleDemoSwitch('FARMER')}
              className="w-full flex items-center justify-between p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-xl border border-emerald-200 text-xs font-semibold transition"
            >
              <span className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-700" />
                Demo Farmer Ramesh
              </span>
              <span className="text-[10px] bg-white px-2 py-0.5 rounded text-emerald-800 border border-emerald-300 font-mono">
                Mandya (2 Acres)
              </span>
            </button>

            <button
              onClick={() => handleDemoSwitch('FPO_ADMIN')}
              className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-900 rounded-xl border border-slate-200 text-xs font-semibold transition"
            >
              <span className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-agri-700" />
                Demo FPO Agronomist Lead
              </span>
              <span className="text-[10px] bg-white px-2 py-0.5 rounded text-slate-700 border border-slate-200 font-mono">
                Cluster View
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
