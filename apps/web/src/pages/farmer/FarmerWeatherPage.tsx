import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  CloudRain,
  Sun,
  Wind,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Compass,
  RefreshCw,
  MapPin,
  Radio
} from 'lucide-react';

export const FarmerWeatherPage: React.FC = () => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const [weatherData, setWeatherData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [locationLabel, setLocationLabel] = useState<string>('Detecting Live Location...');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    initWeather();
  }, []);

  const initWeather = async () => {
    setLoading(true);
    let lat: number | undefined;
    let lon: number | undefined;

    // Detect real-time location via IP or GPS
    try {
      const locRes = await fetch('/api/v1/location/detect');
      if (locRes.ok) {
        const loc = await locRes.json();
        lat = loc.latitude;
        if (typeof lat === 'number' && typeof lon === 'number') {
          setCoords({ lat, lon });
        }
        setLocationLabel(loc.formatted_location || `${loc.village}, ${loc.state}`);
      }
    } catch (_) {}

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const gLat = Number(pos.coords.latitude.toFixed(4));
          const gLon = Number(pos.coords.longitude.toFixed(4));
          setCoords({ lat: gLat, lon: gLon });
          await fetchWeatherWithCoords(gLat, gLon);
          try {
            const revRes = await fetch(`/api/v1/location/reverse-geocode?lat=${gLat}&lon=${gLon}`);
            if (revRes.ok) {
              const rev = await revRes.json();
              setLocationLabel(rev.formatted_location || `${rev.village}, ${rev.state}`);
            }
          } catch (_) {}
        },
        () => {
          fetchWeatherWithCoords(lat, lon);
        },
        { timeout: 4000 }
      );
    } else {
      fetchWeatherWithCoords(lat, lon);
    }
  };

  const fetchWeatherWithCoords = async (lat?: number, lon?: number) => {
    setLoading(true);
    try {
      const url = lat && lon ? `/api/v1/weather/forecast?lat=${lat}&lon=${lon}` : '/api/v1/weather/forecast';
      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        setWeatherData(d);
        if (d.location_name) {
          setLocationLabel(d.location_name);
        }
      }
    } catch (err) {
      console.error('Weather fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const rainAnalysis = weatherData?.rainfall_analysis;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24 space-y-6">
      
      {/* Header with Live Real-time Location Indicator */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Agro-Meteorology & Rainfall Risk
            </h1>
            <span className="text-[10px] bg-sky-50 text-sky-800 font-bold px-2 py-0.5 rounded-full border border-sky-200 flex items-center gap-1">
              <Radio className="w-2.5 h-2.5 text-sky-600 animate-pulse" />
              Live Rainfall Agent
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <span className="flex items-center gap-1 font-semibold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              <MapPin className="w-3 h-3 text-sky-600" />
              {locationLabel}
            </span>
            <span>•</span>
            <span>5-Day Precipitation Horizon • Soil Water Recharge Probability</span>
          </div>
        </div>

        <button
          onClick={() => fetchWeatherWithCoords(coords?.lat, coords?.lon)}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition flex items-center gap-1.5"
          title="Refresh real-time weather"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-xs font-bold hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Primary Hazard & Window Card */}
      {rainAnalysis && (
        <div className="bg-gradient-to-r from-sky-950 via-sky-900 to-slate-900 text-white rounded-3xl p-6 shadow-lg space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-sky-400 animate-ping" />
              <span className="text-xs uppercase font-extrabold tracking-wider text-sky-200">
                Precipitation Analysis
              </span>
            </div>
            <span className="text-xs bg-sky-800/80 px-3 py-1 rounded-full font-bold border border-sky-700">
              Rain Risk: {rainAnalysis.rain_risk}
            </span>
          </div>

          <p className="text-sm text-slate-100 leading-relaxed font-normal">
            {rainAnalysis.rain_risk_description}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="bg-sky-900/60 p-3 rounded-2xl border border-sky-800">
              <span className="text-sky-300 font-semibold block mb-0.5">Recommended Irrigation Window</span>
              <strong className="text-white font-bold">{rainAnalysis.irrigation_window}</strong>
            </div>

            <div className="bg-sky-900/60 p-3 rounded-2xl border border-sky-800">
              <span className="text-sky-300 font-semibold block mb-0.5">Waterlogging / Flood Risk</span>
              <strong className="text-white font-bold">{rainAnalysis.flood_risk} ({rainAnalysis.flood_action})</strong>
            </div>

            <div className="bg-sky-900/60 p-3 rounded-2xl border border-sky-800">
              <span className="text-sky-300 font-semibold block mb-0.5">Dry Spell Alert</span>
              <strong className="text-white font-bold">{rainAnalysis.dry_spell_note}</strong>
            </div>
          </div>
        </div>
      )}

      {/* 5-Day Rainfall Table / Cards */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900">
            5-Day Micro-Precipitation Breakdown
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            Total 5-day rain: <strong>{rainAnalysis?.total_5day_rain_mm || 0} mm</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {weatherData?.forecast_days?.map((day: any, i: number) => (
            <div
              key={i}
              className={`p-3.5 rounded-2xl border flex flex-col justify-between transition ${
                day.rain_mm >= 10.0
                  ? 'bg-sky-50 border-sky-300'
                  : day.rain_mm > 0.0
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase">
                  {day.date}
                </div>
                <div className="flex items-center justify-between my-2">
                  <span className="text-xs font-semibold text-slate-700">{day.condition}</span>
                  {day.rain_mm > 0 ? (
                    <CloudRain className="w-5 h-5 text-sky-500" />
                  ) : (
                    <Sun className="w-5 h-5 text-amber-500" />
                  )}
                </div>
              </div>

              <div>
                <div className="text-lg font-black text-slate-900">
                  {day.rain_mm} <span className="text-xs font-normal text-slate-500">mm</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                  <span>PoP: {day.pop}%</span>
                  <span>{Math.round(day.temp_max)}° / {Math.round(day.temp_min)}°</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
