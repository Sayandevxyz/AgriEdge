import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { AdvisoryCard } from '../../components/AdvisoryCard';
import { VoiceQueryModal } from '../../components/VoiceQueryModal';
import { AdvisoryPayload } from '../../types';
import {
  Camera,
  Mic,
  Droplets,
  Zap,
  CloudRain,
  Sprout,
  Compass,
  ArrowRight,
  RefreshCw,
  Sparkles,
  MapPin,
  Calendar
} from 'lucide-react';

export const FarmerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const [advisory, setAdvisory] = useState<AdvisoryPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isVoiceOpen, setIsVoiceOpen] = useState<boolean>(false);
  const [farmsCount, setFarmsCount] = useState<number>(1);

  useEffect(() => {
    fetchTodaysAdvisory();
  }, []);

  const fetchTodaysAdvisory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('agriedge_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/advisory/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          crop: 'Tomato',
          planting_date: '2026-08-20',
          farm_acres: 2.0,
          soil_type: 'loam',
          irrigation_method: 'drip',
          pump_hp: 5.0,
          pump_type: 'electric',
          latitude: 12.65,
          longitude: 77.20
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAdvisory(data);
      }
    } catch (err) {
      console.error('Failed to fetch advisory:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24 sm:pb-12 space-y-6">
      
      {/* Top Greeting & Location Context */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-agri-900 to-agri-800 text-white p-5 rounded-3xl shadow-md">
        <div>
          <span className="text-xs font-semibold text-agri-300 uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-agri-400" />
            {t('farm_intelligence_today')}
          </span>
          <h1 className="text-2xl font-black tracking-tight">
            {t('greeting')}, {user?.full_name ? user.full_name.split(' ')[0] : 'Farmer'}!
          </h1>
          <div className="flex items-center gap-3 text-xs text-agri-200 mt-1">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-agri-400" />
              Channapatna, Ramanagara
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-agri-400" />
              Tomato (Flowering Stage)
            </span>
          </div>
        </div>

        <button
          onClick={fetchTodaysAdvisory}
          className="p-2.5 bg-agri-800 hover:bg-agri-700 text-agri-200 hover:text-white rounded-xl transition border border-agri-700/60 shadow-sm"
          title="Refresh intelligence"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Primary Action Buttons (Large, high contrast for rural and mobile use) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        
        {/* Main CTA: Analyze My Crop */}
        <button
          onClick={() => navigate('/farmer/analyze')}
          className="flex items-center justify-between p-5 bg-gradient-to-r from-agri-600 to-agri-700 hover:from-agri-700 hover:to-agri-800 text-white rounded-3xl shadow-lg shadow-agri-800/15 transition-all hover:scale-[1.02] active:scale-[0.98] text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-white/20 flex items-center justify-center p-3">
              <Camera className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg leading-tight">{t('analyze_crop')}</h2>
              <p className="text-xs text-agri-100 mt-0.5">Upload leaf photo for disease & water advice</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Secondary CTA: Ask AgriEdge Voice */}
        <button
          onClick={() => setIsVoiceOpen(true)}
          className="flex items-center justify-between p-5 bg-gradient-to-r from-water-600 to-water-700 hover:from-water-700 hover:to-water-800 text-white rounded-3xl shadow-lg shadow-water-800/15 transition-all hover:scale-[1.02] active:scale-[0.98] text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-white/20 flex items-center justify-center p-3">
              <Mic className="w-7 h-7 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg leading-tight">{t('ask_agriedge')}</h2>
              <p className="text-xs text-water-100 mt-0.5">Speak query in English, हिंदी, or தமிழ்</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform" />
        </button>

      </div>

      {/* 4 Summary Quick Glance Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        {/* Weather Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase">{t('weather')}</span>
            <CloudRain className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-lg font-black text-slate-900">28.4°C</div>
          <p className="text-[11px] text-slate-500 mt-0.5">18.5 mm rain forecast</p>
        </div>

        {/* Water Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase">{t('water_advice')}</span>
            <Droplets className="w-4 h-4 text-water-500" />
          </div>
          <div className="text-lg font-black text-emerald-600">
            {advisory ? advisory.water.action.split(' ')[0] : 'SKIP'}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            +{advisory?.water.potential_water_saved_litres?.toLocaleString() || '8,400'} L avoided
          </p>
        </div>

        {/* Energy Status */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase">{t('energy_status')}</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-black text-amber-600">
            {advisory?.energy.potential_saved_energy || '6.1'} kWh
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">2.2 hrs pump avoided</p>
        </div>

        {/* Crop Stage */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase">Crop Stage</span>
            <Sprout className="w-4 h-4 text-agri-600" />
          </div>
          <div className="text-lg font-black text-agri-800 capitalize">
            {advisory?.crop_context.active_stage || 'Flowering'}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Day 45 of Kharif cycle</p>
        </div>

      </div>

      {/* TODAY'S UNIFIED ADVISORY CARD */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
            {t('todays_advisory')}
          </h2>
          <span className="text-xs text-agri-700 font-semibold bg-agri-50 px-2.5 py-1 rounded-full border border-agri-200">
            FAO-56 Computational Model
          </span>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center shadow-sm">
            <RefreshCw className="w-8 h-8 text-agri-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">Synthesizing Farm Intelligence...</p>
            <p className="text-xs text-slate-400 mt-1">Calculating Penman-Monteith ET0, rainfall and pump runtime</p>
          </div>
        ) : advisory ? (
          <AdvisoryCard advisory={advisory} onFeedbackSubmitted={fetchTodaysAdvisory} />
        ) : (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center">
            <p className="text-sm text-slate-600">Could not retrieve today's advisory.</p>
          </div>
        )}
      </div>

      {/* Quick Navigation to Simulation & Farms */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        <div
          onClick={() => navigate('/farmer/scenarios')}
          className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition flex items-center justify-between"
        >
          <div>
            <h3 className="font-bold text-sm text-slate-900">{t('scenario_sim')}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Test "What if I wait 2 days?" or "What if rain is 20mm?"</p>
          </div>
          <ArrowRight className="w-4 h-4 text-agri-600 shrink-0" />
        </div>

        <div
          onClick={() => navigate('/farmer/farms')}
          className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition flex items-center justify-between"
        >
          <div>
            <h3 className="font-bold text-sm text-slate-900">{t('my_farms')}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Manage soil types, crop sowing dates, and pump HP</p>
          </div>
          <ArrowRight className="w-4 h-4 text-agri-600 shrink-0" />
        </div>

      </div>

      {/* Voice Assistant Modal */}
      <VoiceQueryModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onAdvisoryReceived={(newAdvisory) => setAdvisory(newAdvisory)}
      />

    </div>
  );
};
