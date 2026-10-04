import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useOfflineSync } from '../context/OfflineSyncContext';
import { Languages, Wifi, WifiOff, RefreshCw, LogOut, Sprout, LayoutDashboard, ShieldAlert } from 'lucide-react';
import { LanguageCode } from '../types';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { isOnline, isSyncing, pendingCount, syncNow } = useOfflineSync();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as LanguageCode);
  };

  return (
    <nav className="bg-white/95 backdrop-blur border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo & Brand Identity */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md shadow-agri-900/10 group-hover:scale-105 transition-transform flex items-center justify-center bg-white border border-slate-100">
              <img src="/logo.png" alt="AgriEdge Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-agri-950">AGRI</span>
                <span className="font-extrabold text-lg tracking-tight text-agri-600">EDGE</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide -mt-1 hidden sm:block">
                Water • Energy • Yield Intelligence
              </p>
            </div>
          </Link>

          {/* Navigation Links based on role */}
          {user && (
            <div className="hidden md:flex items-center gap-1 text-sm font-medium">
              {user.role === 'FARMER' && (
                <>
                  <Link
                    to="/farmer/dashboard"
                    className={`px-3 py-2 rounded-lg transition ${
                      location.pathname === '/farmer/dashboard'
                        ? 'bg-agri-50 text-agri-800 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Farmer Dashboard
                  </Link>
                  <Link
                    to="/farmer/analyze"
                    className={`px-3 py-2 rounded-lg transition ${
                      location.pathname.startsWith('/farmer/analyze')
                        ? 'bg-agri-50 text-agri-800 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Analyze Crop
                  </Link>
                  <Link
                    to="/farmer/scenarios"
                    className={`px-3 py-2 rounded-lg transition ${
                      location.pathname.startsWith('/farmer/scenarios')
                        ? 'bg-agri-50 text-agri-800 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Water AI
                  </Link>
                </>
              )}

              {user.role === 'FPO_ADMIN' && (
                <Link
                  to="/fpo/dashboard"
                  className={`px-3 py-2 rounded-lg transition ${
                    location.pathname.startsWith('/fpo')
                      ? 'bg-agri-50 text-agri-800 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  FPO Intelligence
                </Link>
              )}

              {user.role === 'SYSTEM_ADMIN' && (
                <Link
                  to="/admin"
                  className={`px-3 py-2 rounded-lg transition ${
                    location.pathname.startsWith('/admin')
                      ? 'bg-agri-50 text-agri-800 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  System Health
                </Link>
              )}
            </div>
          )}

          {/* Right Toolbar: Offline Status + Language Selector + User Info */}
          <div className="flex items-center gap-3">
            
            {/* Offline / Online Sync Indicator */}
            <div className="flex items-center">
              {isOnline ? (
                <div
                  className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-xs font-semibold border border-emerald-200/80 cursor-pointer"
                  onClick={syncNow}
                  title={pendingCount > 0 ? `${pendingCount} items waiting to sync` : 'All observations synchronized'}
                >
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">ONLINE</span>
                  {pendingCount > 0 && (
                    <span className="bg-emerald-600 text-white text-[10px] px-1.5 rounded-full font-mono">
                      {pendingCount}
                    </span>
                  )}
                  {isSyncing && <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" />}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-800 rounded-md text-xs font-semibold border border-amber-300">
                  <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                  <span>OFFLINE</span>
                  {pendingCount > 0 && (
                    <span className="bg-amber-600 text-white text-[10px] px-1.5 rounded-full font-mono">
                      {pendingCount} queued
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Language Selector */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
              <Languages className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-0.5" />
              <select
                value={language}
                onChange={handleLanguageChange}
                aria-label="Language selection"
                className="bg-transparent text-xs font-medium text-slate-800 py-0.5 pr-2 pl-1 rounded focus:outline-none cursor-pointer"
              >
                <option value="en">English (EN)</option>
                <option value="hi">हिंदी (HI)</option>
                <option value="ta">தமிழ் (TA)</option>
              </select>
            </div>

            {/* User Profile or Sign In */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-semibold text-slate-900 leading-tight">{user.full_name}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">{user.role}</p>
                </div>
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  title="Sign Out"
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => navigate('/login')}
                  className="text-xs font-semibold text-slate-700 hover:text-agri-800 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="text-xs font-bold bg-agri-600 hover:bg-agri-700 text-white px-3 py-1.5 rounded-lg shadow-sm transition"
                >
                  Sign Up
                </button>
              </div>
            )}

          </div>

        </div>
      </div>
    </nav>
  );
};
