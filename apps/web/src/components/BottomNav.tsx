import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Camera, Droplets, Mic, History, Settings } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface BottomNavProps {
  onOpenVoice: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenVoice }) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  if (!user || user.role !== 'FARMER') {
    return null;
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 pt-1.5 safe-bottom-nav z-40 shadow-lg">
      <div className="flex items-center justify-around max-w-md mx-auto">
        
        {/* Dashboard */}
        <NavLink
          to="/farmer/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium transition ${
              isActive ? 'text-agri-700 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </NavLink>

        {/* Analyze Leaf / Camera */}
        <NavLink
          to="/farmer/analyze"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium transition ${
              isActive ? 'text-agri-700 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <Camera className="w-5 h-5 mb-0.5" />
          <span>{t('analyze_crop')}</span>
        </NavLink>

        {/* Central Voice Button */}
        <button
          onClick={onOpenVoice}
          className="flex flex-col items-center -mt-5 group"
          title="Ask AgriEdge Voice Assistant"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-agri-700 to-agri-500 text-white flex items-center justify-center shadow-lg shadow-agri-700/30 group-active:scale-95 transition-transform border-2 border-white">
            <Mic className="w-6 h-6 animate-pulse" />
          </div>
          <span className="text-[10px] font-bold text-agri-800 mt-0.5">Voice</span>
        </button>

        {/* Water & Scenarios */}
        <NavLink
          to="/farmer/scenarios"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium transition ${
              isActive ? 'text-water-700 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <Droplets className="w-5 h-5 mb-0.5 text-water-600" />
          <span>Water AI</span>
        </NavLink>

        {/* History */}
        <NavLink
          to="/farmer/history"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium transition ${
              isActive ? 'text-agri-700 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <History className="w-5 h-5 mb-0.5" />
          <span>History</span>
        </NavLink>

      </div>
    </div>
  );
};
