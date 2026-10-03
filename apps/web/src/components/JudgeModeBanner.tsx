import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserCheck, Building2, Terminal } from 'lucide-react';
import { UserRole } from '../types';

export const JudgeModeBanner: React.FC = () => {
  const { user, demoLogin, isLoading } = useAuth();

  return (
    <div className="bg-emerald-950 text-emerald-100 text-xs py-1.5 px-4 border-b border-emerald-800/60 sticky top-0 z-50 flex flex-wrap items-center justify-between gap-2 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 bg-emerald-800/80 text-emerald-200 font-semibold px-2 py-0.5 rounded-full text-[10px] tracking-wide uppercase border border-emerald-700">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          Judge Mode
        </span>
        <span className="text-emerald-300 font-medium">Local Development Environment</span>
        <span className="hidden md:inline text-emerald-400/60">•</span>
        <span className="hidden md:inline text-emerald-400/80">FAO-56 Models Active • Isolated Fallback Data Badged</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-emerald-400/70 mr-1 text-[11px]">Quick Role Switch:</span>
        
        <button
          onClick={() => demoLogin('FARMER')}
          disabled={isLoading}
          className={`px-2 py-0.5 rounded transition flex items-center gap-1 text-[11px] ${
            user?.role === 'FARMER'
              ? 'bg-emerald-600 text-white font-semibold'
              : 'bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200'
          }`}
        >
          <UserCheck className="w-3 h-3" />
          Farmer
        </button>

        <button
          onClick={() => demoLogin('FPO_ADMIN')}
          disabled={isLoading}
          className={`px-2 py-0.5 rounded transition flex items-center gap-1 text-[11px] ${
            user?.role === 'FPO_ADMIN'
              ? 'bg-emerald-600 text-white font-semibold'
              : 'bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200'
          }`}
        >
          <Building2 className="w-3 h-3" />
          FPO Lead
        </button>

        <button
          onClick={() => demoLogin('SYSTEM_ADMIN')}
          disabled={isLoading}
          className={`px-2 py-0.5 rounded transition flex items-center gap-1 text-[11px] ${
            user?.role === 'SYSTEM_ADMIN'
              ? 'bg-emerald-600 text-white font-semibold'
              : 'bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200'
          }`}
        >
          <Terminal className="w-3 h-3" />
          System
        </button>
      </div>
    </div>
  );
};
