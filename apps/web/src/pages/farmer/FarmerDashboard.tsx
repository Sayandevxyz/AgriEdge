import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { AdvisoryCard } from '../../components/AdvisoryCard';
import { VoiceQueryModal } from '../../components/VoiceQueryModal';
import { AdvisoryPayload, Farm } from '../../types';
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
  Calendar,
  Activity,
  Layers,
  ChevronDown
} from 'lucide-react';

const COMMON_CROPS = [
  { name: 'Tomato', variety: 'Arka Rakshak (Hybrid)' },
  { name: 'Chilli', variety: 'G4 / Byadgi' },
  { name: 'Potato', variety: 'Kufri Jyoti' },
  { name: 'Onion', variety: 'Bhima Super' },
  { name: 'Rice', variety: 'Sona Masoori' },
  { name: 'Cotton', variety: 'BT Cotton' },
  { name: 'Maize', variety: 'DeKalb Hybrid' },
  { name: 'Wheat', variety: 'HD-2967' },
];

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
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<number | 'custom'>('custom');
  const [selectedCrop, setSelectedCrop] = useState<string>('Tomato');
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    // Attempt live browser geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoCoords({
            lat: Number(pos.coords.latitude.toFixed(4)),
            lon: Number(pos.coords.longitude.toFixed(4))
          });
        },
        (err) => {
          console.log('[FarmerDashboard] Geolocation not provided, using regional default:', err.message);
        },
        { timeout: 5000 }
      );
    }

    loadFarmsAndInitialAdvisory();
  }, []);

  const loadFarmsAndInitialAdvisory = async () => {
    try {
      const token = localStorage.getItem('agriedge_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/farms', { headers });
      if (res.ok) {
        const data: Farm[] = await res.json();
        setFarms(data);
        if (data.length > 0) {
          setSelectedFarmId(data[0].id);
          setSelectedCrop(data[0].active_crop || 'Tomato');
          await fetchAdvisoryForFarm(data[0], geoCoords);
          return;
        }
      }
    } catch (e) {
      console.error('Failed to load farms:', e);
    }
    // Fallback initial advisory
    await fetchAdvisoryWithParams('Tomato', '2026-08-20', 2.0, 'loam', 'drip', 5.0, 12.97, 77.59);
  };

  const fetchAdvisoryForFarm = async (farm: Farm, coords?: { lat: number; lon: number } | null) => {
    const lat = coords?.lat || farm.latitude || 12.97;
    const lon = coords?.lon || farm.longitude || 77.59;
    await fetchAdvisoryWithParams(
      farm.active_crop || 'Tomato',
      farm.planting_date || '2026-08-20',
      farm.total_area_acres || 2.0,
      farm.soil_type || 'loam',
      farm.irrigation_type || 'drip',
      farm.pump_hp || 5.0,
      lat,
      lon
    );
  };

  const fetchAdvisoryWithParams = async (
    crop: string,
    plantingDate: string,
    acres: number,
    soil: string,
    irrigation: string,
    hp: number,
    lat: number,
    lon: number
  ) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('agriedge_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/advisory/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          crop: crop,
          planting_date: plantingDate,
          farm_acres: acres,
          soil_type: soil,
          irrigation_method: irrigation,
          pump_hp: hp,
          pump_type: 'electric',
          latitude: lat,
          longitude: lon
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

  const handleFarmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'custom') {
      setSelectedFarmId('custom');
      fetchAdvisoryWithParams(selectedCrop, '2026-08-20', 2.0, 'loam', 'drip', 5.0, geoCoords?.lat || 12.97, geoCoords?.lon || 77.59);
    } else {
      const fId = Number(val);
      setSelectedFarmId(fId);
      const f = farms.find((farm) => farm.id === fId);
      if (f) {
        setSelectedCrop(f.active_crop || 'Tomato');
        fetchAdvisoryForFarm(f, geoCoords);
      }
    }
  };

  const handleCropQuickSwitch = (cropName: string) => {
    setSelectedCrop(cropName);
    const activeFarm = farms.find((f) => f.id === selectedFarmId);
    const lat = geoCoords?.lat || activeFarm?.latitude || 12.97;
    const lon = geoCoords?.lon || activeFarm?.longitude || 77.59;
    fetchAdvisoryWithParams(
      cropName,
      activeFarm?.planting_date || '2026-08-20',
      activeFarm?.total_area_acres || 2.0,
      activeFarm?.soil_type || 'loam',
      activeFarm?.irrigation_type || 'drip',
      activeFarm?.pump_hp || 5.0,
      lat,
      lon
    );
  };

  const refreshCurrent = () => {
    if (selectedFarmId !== 'custom') {
      const f = farms.find((farm) => farm.id === selectedFarmId);
      if (f) {
        fetchAdvisoryForFarm(f, geoCoords);
        return;
      }
    }
    fetchAdvisoryWithParams(selectedCrop, '2026-08-20', 2.0, 'loam', 'drip', 5.0, geoCoords?.lat || 12.97, geoCoords?.lon || 77.59);
  };

  const activeFarm = farms.find((f) => f.id === selectedFarmId);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24 sm:pb-12 space-y-6">
      
      {/* Top Greeting & Location Context */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-agri-900 via-agri-850 to-agri-950 text-white p-5 rounded-3xl shadow-md border border-agri-700/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              {t('farm_intelligence_today')}
            </span>
            <span className="text-[10px] bg-emerald-900/80 text-emerald-200 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono">
              Live Real-Time Telemetry
            </span>
          </div>

          <h1 className="text-2xl font-black tracking-tight">
            {t('greeting')}, {user?.full_name ? user.full_name.split(' ')[0] : 'Farmer'}!
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-xs text-agri-200 mt-1.5">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              {activeFarm?.village
                ? `${activeFarm.village}, ${activeFarm.district || ''}`
                : geoCoords
                ? `GPS: ${geoCoords.lat}°N, ${geoCoords.lon}°E`
                : 'Karnataka Region'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              {advisory ? `${advisory.crop_context.crop} (${advisory.crop_context.active_stage.toUpperCase()})` : `${selectedCrop} (Active Cycle)`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {farms.length > 0 && (
            <select
              value={selectedFarmId}
              onChange={handleFarmChange}
              className="text-xs bg-agri-800/90 text-white border border-agri-600 rounded-xl px-3 py-2 outline-none cursor-pointer hover:bg-agri-700 transition font-medium"
            >
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.farm_name} ({f.active_crop})
                </option>
              ))}
              <option value="custom">Quick Crop Simulator</option>
            </select>
          )}

          <button
            onClick={refreshCurrent}
            className="p-2.5 bg-agri-800 hover:bg-agri-700 text-agri-200 hover:text-white rounded-xl transition border border-agri-700/60 shadow-sm"
            title="Refresh real-time intelligence"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Quick Crop Selector Pill Row */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <Sprout className="w-3.5 h-3.5 text-agri-600" /> Real-time Crop:
        </span>
        {COMMON_CROPS.map((c) => {
          const isSelected = selectedCrop.toLowerCase() === c.name.toLowerCase();
          return (
            <button
              key={c.name}
              onClick={() => handleCropQuickSwitch(c.name)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold transition shrink-0 border ${
                isSelected
                  ? 'bg-agri-700 text-white border-agri-700 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-agri-300 hover:bg-agri-50'
              }`}
            >
              {c.name}
            </button>
          );
        })}
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

      {/* 4 Summary Quick Glance Cards - 100% Real-Time Live Data */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        {/* Weather Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase">{t('weather')}</span>
              <CloudRain className="w-4 h-4 text-sky-500" />
            </div>
            <div className="text-lg font-black text-slate-900">
              {advisory ? `${advisory.weather_context.temperature_c}°C` : '--'}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {advisory ? `${advisory.weather_context.rainfall_24h_mm} mm rain • ${advisory.weather_context.condition}` : 'Fetching live weather...'}
          </p>
        </div>

        {/* Water Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase">{t('water_advice')}</span>
              <Droplets className="w-4 h-4 text-water-500" />
            </div>
            <div className={`text-base font-black truncate ${
              advisory?.water.action === 'SKIP IRRIGATION' ? 'text-emerald-600' :
              advisory?.water.action === 'REDUCE IRRIGATION' ? 'text-amber-600' : 'text-water-600'
            }`}>
              {advisory ? advisory.water.action : 'ESTIMATING'}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            {advisory?.water.potential_water_saved_litres && advisory.water.potential_water_saved_litres > 0
              ? `+${advisory.water.potential_water_saved_litres.toLocaleString()} L avoided`
              : `${advisory?.water.estimated_gross_volume_litres.toLocaleString() || '0'} L allocation`}
          </p>
        </div>

        {/* Energy Status */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase">{t('energy_status')}</span>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-lg font-black text-amber-600">
              {advisory ? (
                advisory.energy.energy_consumed > 0
                  ? `${advisory.energy.energy_consumed} kWh`
                  : `${advisory.energy.potential_saved_energy} kWh saved`
              ) : '--'}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {advisory ? `${advisory.energy.estimated_runtime_hours} hrs pump runtime` : 'Calculating...'}
          </p>
        </div>

        {/* Crop Stage */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase">Crop Stage</span>
              <Sprout className="w-4 h-4 text-agri-600" />
            </div>
            <div className="text-lg font-black text-agri-800 capitalize truncate">
              {advisory?.crop_context.active_stage || 'Flowering'}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            {advisory ? `Day ${advisory.crop_context.days_elapsed} • ${advisory.crop_context.variety}` : 'Phenology'}
          </p>
        </div>

      </div>

      {/* TODAY'S UNIFIED ADVISORY CARD */}
      <div>
        <div className="flex flex-wrap items-center justify-between mb-3 px-1 gap-2">
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
            {t('todays_advisory')}
          </h2>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-800 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-300 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              Real-Time AI Multi-Agent ({advisory?.execution_metadata?.agent_model ? advisory.execution_metadata.agent_model.split('/')[1] || advisory.execution_metadata.agent_model : 'Live'})
            </span>

            {advisory?.weather_context.data_source && (
              <span className="text-[10px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 font-mono hidden sm:inline">
                {advisory.weather_context.data_source.replace(" Live API", "")}
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center shadow-sm">
            <RefreshCw className="w-8 h-8 text-agri-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">Synthesizing Real-Time Farm Intelligence...</p>
            <p className="text-xs text-slate-400 mt-1">Multi-Agent reasoning over Penman-Monteith ET0, micro-weather, and foliar status</p>
          </div>
        ) : advisory ? (
          <AdvisoryCard advisory={advisory} onFeedbackSubmitted={refreshCurrent} />
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
