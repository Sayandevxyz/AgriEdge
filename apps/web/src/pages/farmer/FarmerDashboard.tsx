import React, { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Store,
  Warehouse,
  CheckCircle2,
  Clock,
  Radio
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
  const [backgroundSyncing, setBackgroundSyncing] = useState<boolean>(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState<boolean>(false);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<number | 'custom'>('custom');
  const [selectedCrop, setSelectedCrop] = useState<string>('Tomato');
  
  // Real-time location state
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>('Detecting Live Location...');
  const [locationSource, setLocationSource] = useState<string>('Real-Time Telemetry');
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Real-time auto-updating state
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(60);
  const [lastSyncText, setLastSyncText] = useState<string>('Just now');
  const lastSyncTimeRef = useRef<number>(Date.now());

  // Real-time Market Intelligence state
  const [marketData, setMarketData] = useState<any>(null);
  const [loadingMarket, setLoadingMarket] = useState<boolean>(false);

  // 1. Initial Mount: Detect real-time location & load data
  useEffect(() => {
    initializeDashboard();
  }, []);

  // 2. Real-Time 1-second Countdown & Auto-Refresh Loop
  useEffect(() => {
    if (!autoUpdateEnabled) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Trigger seamless background update
          performBackgroundRefresh();
          return 60;
        }
        return prev - 1;
      });

      // Update "Last updated Xs ago" label
      const diffSec = Math.floor((Date.now() - lastSyncTimeRef.current) / 1000);
      if (diffSec < 15) {
        setLastSyncText('Just now');
      } else if (diffSec < 60) {
        setLastSyncText(`${diffSec}s ago`);
      } else {
        const mins = Math.floor(diffSec / 60);
        setLastSyncText(`${mins}m ago`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [autoUpdateEnabled, selectedCrop, selectedFarmId, geoCoords]);

  const initializeDashboard = async () => {
    setLoading(true);
    const resolvedCoords = await detectRealtimeLocation();
    await loadFarmsAndInitialAdvisory(resolvedCoords);
    fetchRealtimeMarket(selectedCrop, resolvedCoords.lat, resolvedCoords.lon);
  };

  const detectRealtimeLocation = async (): Promise<{ lat: number; lon: number }> => {
    setIsLocating(true);
    let resolved = { lat: 13.0895, lon: 80.2739 }; // initial high-probability anchor

    // A. Fast IP-based real-time detection from backend
    try {
      const res = await fetch('/api/v1/location/detect');
      if (res.ok) {
        const data = await res.json();
        resolved = { lat: data.latitude, lon: data.longitude };
        setGeoCoords(resolved);
        setLocationLabel(data.formatted_location || `${data.village}, ${data.state}`);
        setLocationSource(data.source || 'IP Telemetry');
      }
    } catch (err) {
      console.warn('IP location detection notice:', err);
    }

    // B. High-Precision Browser GPS (if granted)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const gpsCoords = {
            lat: Number(pos.coords.latitude.toFixed(4)),
            lon: Number(pos.coords.longitude.toFixed(4))
          };
          setGeoCoords(gpsCoords);
          setLocationSource('Live GPS Hardware');
          try {
            const revRes = await fetch(`/api/v1/location/reverse-geocode?lat=${gpsCoords.lat}&lon=${gpsCoords.lon}`);
            if (revRes.ok) {
              const rev = await revRes.json();
              setLocationLabel(rev.formatted_location || `${rev.village}, ${rev.state}`);
            }
          } catch (_) {}
          setIsLocating(false);
        },
        () => {
          setIsLocating(false);
        },
        { timeout: 5000, enableHighAccuracy: true }
      );
    } else {
      setIsLocating(false);
    }

    return resolved;
  };

  const loadFarmsAndInitialAdvisory = async (coords: { lat: number; lon: number }) => {
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
          await fetchAdvisoryForFarm(data[0], coords);
          return;
        }
      }
    } catch (e) {
      console.error('Failed to load farms:', e);
    }
    // Fallback initial advisory using detected coordinates
    await fetchAdvisoryWithParams('Tomato', '2026-08-20', 2.0, 'loam', 'drip', 5.0, coords.lat, coords.lon);
  };

  const fetchAdvisoryForFarm = async (farm: Farm, coords?: { lat: number; lon: number } | null) => {
    const lat = coords?.lat || farm.latitude || 13.0895;
    const lon = coords?.lon || farm.longitude || 80.2739;
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
    lon: number,
    isBackground: boolean = false
  ) => {
    if (!isBackground) setLoading(true);
    else setBackgroundSyncing(true);

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
        lastSyncTimeRef.current = Date.now();
        setLastSyncText('Just now');
        if (data.location_name) {
          setLocationLabel(data.location_name);
        }
      }
    } catch (err) {
      console.error('Failed to fetch advisory:', err);
    } finally {
      setLoading(false);
      setBackgroundSyncing(false);
    }
  };

  const fetchRealtimeMarket = async (crop: string, lat?: number, lon?: number) => {
    setLoadingMarket(true);
    try {
      const coords = geoCoords || (lat && lon ? { lat, lon } : { lat: 13.0895, lon: 80.2739 });
      const url = `/api/v1/market?crop=${encodeURIComponent(crop)}&lat=${coords.lat}&lon=${coords.lon}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMarketData(data);
      }
    } catch (e) {
      console.warn('Real-time market fetch error:', e);
    } finally {
      setLoadingMarket(false);
    }
  };

  const performBackgroundRefresh = () => {
    const lat = geoCoords?.lat || 13.0895;
    const lon = geoCoords?.lon || 80.2739;
    if (selectedFarmId !== 'custom') {
      const f = farms.find((farm) => farm.id === selectedFarmId);
      if (f) {
        fetchAdvisoryWithParams(
          f.active_crop || selectedCrop,
          f.planting_date || '2026-08-20',
          f.total_area_acres || 2.0,
          f.soil_type || 'loam',
          f.irrigation_type || 'drip',
          f.pump_hp || 5.0,
          lat,
          lon,
          true
        );
        fetchRealtimeMarket(f.active_crop || selectedCrop, lat, lon);
        return;
      }
    }
    fetchAdvisoryWithParams(selectedCrop, '2026-08-20', 2.0, 'loam', 'drip', 5.0, lat, lon, true);
    fetchRealtimeMarket(selectedCrop, lat, lon);
  };

  const refreshCurrent = () => {
    setCountdown(60);
    performBackgroundRefresh();
  };

  const handleFarmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const lat = geoCoords?.lat || 13.0895;
    const lon = geoCoords?.lon || 80.2739;

    if (val === 'custom') {
      setSelectedFarmId('custom');
      fetchAdvisoryWithParams(selectedCrop, '2026-08-20', 2.0, 'loam', 'drip', 5.0, lat, lon);
      fetchRealtimeMarket(selectedCrop, lat, lon);
    } else {
      const fId = Number(val);
      setSelectedFarmId(fId);
      const f = farms.find((farm) => farm.id === fId);
      if (f) {
        const crop = f.active_crop || 'Tomato';
        setSelectedCrop(crop);
        fetchAdvisoryForFarm(f, geoCoords);
        fetchRealtimeMarket(crop, lat, lon);
      }
    }
  };

  const handleCropQuickSwitch = (cropName: string) => {
    setSelectedCrop(cropName);
    const activeFarm = farms.find((f) => f.id === selectedFarmId);
    const lat = geoCoords?.lat || activeFarm?.latitude || 13.0895;
    const lon = geoCoords?.lon || activeFarm?.longitude || 80.2739;
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
    fetchRealtimeMarket(cropName, lat, lon);
  };

  const activeFarm = farms.find((f) => f.id === selectedFarmId);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24 sm:pb-12 space-y-6">
      
      {/* Top Real-Time Status & Auto-Update Ticker Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900 text-slate-200 rounded-2xl text-xs border border-slate-800 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${autoUpdateEnabled ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${autoUpdateEnabled ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          </span>
          <span className="font-extrabold tracking-wide uppercase text-[11px] text-emerald-400 flex items-center gap-1.5">
            Live Telemetry Engine
          </span>
          <span className="text-slate-400 hidden sm:inline">•</span>
          <span className="text-slate-300 hidden sm:inline">
            Synced: <strong className="text-white">{lastSyncText}</strong>
          </span>
          {backgroundSyncing && (
            <span className="text-emerald-300 font-bold animate-pulse text-[10px] bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
              Updating in background...
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Next sync in: <strong className="text-emerald-400">{countdown}s</strong></span>
          </div>

          <button
            onClick={() => setAutoUpdateEnabled(!autoUpdateEnabled)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition border ${
              autoUpdateEnabled
                ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {autoUpdateEnabled ? 'Auto-Update: ON' : 'Auto-Update: PAUSED'}
          </button>
        </div>
      </div>

      {/* Top Greeting & Real-Time Location Context */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-agri-900 via-agri-850 to-agri-950 text-white p-6 rounded-3xl shadow-md border border-agri-700/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              {t('farm_intelligence_today')}
            </span>
            <span className="text-[10px] bg-emerald-900/80 text-emerald-200 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono">
              Live Real-Time AI
            </span>
          </div>

          <h1 className="text-2xl font-black tracking-tight">
            {t('greeting')}, {user?.full_name ? user.full_name.split(' ')[0] : 'Farmer'}!
          </h1>

          {/* Real-time Location Pill & Details */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-agri-200 mt-2">
            <div className="flex items-center gap-1.5 bg-agri-800/80 px-3 py-1 rounded-full border border-agri-600/50 text-emerald-300 font-medium">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{locationLabel}</span>
              <span className="text-[10px] text-slate-300 bg-agri-700 px-1.5 py-0.2 rounded font-mono">
                {geoCoords ? `${geoCoords.lat}°N, ${geoCoords.lon}°E` : locationSource}
              </span>
            </div>

            <button
              onClick={detectRealtimeLocation}
              disabled={isLocating}
              className="text-[11px] text-agri-200 hover:text-white underline decoration-emerald-400 underline-offset-2 flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
              {isLocating ? 'Detecting GPS...' : 'Refresh Location'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
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
            className="p-2.5 bg-agri-800 hover:bg-agri-700 text-agri-200 hover:text-white rounded-xl transition border border-agri-700/60 shadow-sm flex items-center gap-1.5"
            title="Sync all agents in real time"
          >
            <RefreshCw className={`w-4 h-4 ${loading || backgroundSyncing ? 'animate-spin' : ''}`} />
            <span className="text-xs font-bold hidden sm:inline">Sync Now</span>
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

      {/* Primary Action Buttons */}
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
              <p className="text-xs text-agri-100 mt-0.5">Upload leaf photo for real-time AI pathology & irrigation</p>
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
              <p className="text-xs text-water-100 mt-0.5">Speak live query in English, हिंदी, or தமிழ்</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform" />
        </button>

      </div>

      {/* 4 Summary Quick Glance Cards - 100% Real-Time Live Telemetry */}
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

      {/* REAL-TIME MARKET AGENT & COMMODITY INTELLIGENCE CARD */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white rounded-3xl p-5 border border-emerald-800/40 shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h3 className="font-black text-base tracking-tight text-white flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-400" />
              Real-Time Market Intelligence Agent
            </h3>
            <span className="text-[10px] bg-emerald-900/80 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-700/60">
              Live Mandi Data
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-300">
              Mandi: <strong className="text-white">{marketData?.market || `${locationLabel.split(',')[0]} Main APMC`}</strong>
            </span>
          </div>
        </div>

        {loadingMarket ? (
          <div className="py-4 text-center text-xs text-slate-400">
            <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-emerald-400" />
            Fetching live APMC prices and market trends...
          </div>
        ) : marketData ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            
            {/* Modal Price & Trend */}
            <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5">Live Modal Mandi Price</span>
                <div className="text-2xl font-black text-emerald-400">
                  ₹{marketData.modal_price_inr_quintal?.toLocaleString() || '--'}
                  <span className="text-xs font-normal text-slate-400 ml-1">/ quintal</span>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-400">Range: ₹{marketData.min_price_inr_quintal} - ₹{marketData.max_price_inr_quintal}</span>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1 ${
                  marketData.trend === 'BULLISH' ? 'bg-emerald-900 text-emerald-300' :
                  marketData.trend === 'BEARISH' ? 'bg-rose-900 text-rose-300' : 'bg-slate-800 text-slate-300'
                }`}>
                  {marketData.trend === 'BULLISH' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {marketData.trend}
                </span>
              </div>
            </div>

            {/* Strategic Selling Recommendation */}
            <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5">AI Selling Strategy</span>
                <p className="text-xs text-slate-200 leading-relaxed font-normal">
                  {marketData.selling_strategy || 'Prices are currently stable across regional markets.'}
                </p>
              </div>
              <div className="mt-2 text-[10px] text-emerald-400 font-mono">
                Expected 7-day velocity: {marketData.expected_7d_price_change_pct > 0 ? '+' : ''}{marketData.expected_7d_price_change_pct}%
              </div>
            </div>

            {/* Mandi Arbitrage Quick Glance */}
            <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Mandi Price Arbitrage</span>
                {marketData.mandi_arbitrage && marketData.mandi_arbitrage.length > 1 ? (
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="truncate max-w-[130px]">{marketData.mandi_arbitrage[0].mandi_name}</span>
                      <strong className="text-white">₹{marketData.mandi_arbitrage[0].modal_price_inr_quintal}</strong>
                    </div>
                    <div className="flex items-center justify-between text-emerald-300 font-bold bg-emerald-950/60 p-1 rounded-lg border border-emerald-800/40">
                      <span className="truncate max-w-[130px] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        {marketData.mandi_arbitrage[1].mandi_name}
                      </span>
                      <span>+₹{marketData.mandi_arbitrage[1].net_profit_delta_inr}/qtl net</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Comparing regional mandi gateways...</p>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1 text-slate-300">
                  <Warehouse className="w-3 h-3 text-slate-400" /> Cold Storage Available
                </span>
                <span className="text-emerald-400 font-bold">Live Hub Active</span>
              </div>
            </div>

          </div>
        ) : null}
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
