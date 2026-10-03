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
  RefreshCw
} from 'lucide-react';

export const FarmerWeatherPage: React.FC = () => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const [weatherData, setWeatherData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchWeather();
  }, []);

  const fetchWeather = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/weather/forecast?lat=12.65&lon=77.20');
      if (res.ok) {
        const d = await res.json();
        setWeatherData(d);
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
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Agro-Meteorology & Rainfall Risk
            </h1>
            <span className="text-[10px] bg-sky-50 text-sky-800 font-bold px-2 py-0.5 rounded-full border border-sky-200">
              Rainfall Agent
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            5-Day Precipitation Horizon • Soil Water Recharge Probability
          </p>
        </div>

        <button
          onClick={fetchWeather}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
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
              <span className="text-sky-300 font-semibold block mb-0.5">5-Day Cumulative Rainfall</span>
              <strong className="text-white font-bold">{rainAnalysis.total_5day_rain_mm} mm expected</strong>
            </div>
          </div>
        </div>
      )}

      {/* 5-Day Forecast Daily Cards */}
      <div className="space-y-3">
        <h2 className="text-base font-extrabold text-slate-900">5-Day Daily Agro-Weather Forecast</h2>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {weatherData?.forecast_days?.map((day: any, i: number) => (
            <div
              key={i}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center flex flex-col justify-between"
            >
              <div>
                <span className="text-xs font-bold text-slate-800 block mb-2">{day.date}</span>
                <div className="w-10 h-10 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-2">
                  <CloudRain className="w-5 h-5" />
                </div>
                <div className="text-base font-extrabold text-slate-900">
                  {Math.round(day.temp_max)}° / {Math.round(day.temp_min)}°
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 text-xs">
                <p className="font-bold text-water-700">{day.rain_mm} mm</p>
                <p className="text-[10px] text-slate-400">{day.pop}% rain prob</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
