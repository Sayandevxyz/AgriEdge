import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import {
  Compass,
  Droplets,
  Zap,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

export const ScenarioSimulatorPage: React.FC = () => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const [crop, setCrop] = useState<string>('Tomato');
  const [stage, setStage] = useState<string>('flowering');
  const [farmAcres, setFarmAcres] = useState<number>(2.0);
  const [forecastRain, setForecastRain] = useState<number>(18.5);
  const [simulationData, setSimulationData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    runSimulation();
  }, [crop, stage, farmAcres, forecastRain]);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/scenario/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crop,
          growth_stage: stage,
          farm_acres: farmAcres,
          et0_mm: 4.8,
          pump_hp: 5.0,
          forecast_rain_24h_mm: forecastRain,
          forecast_rain_48h_mm: 8.0
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSimulationData(data);
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const chartData = simulationData?.scenarios?.map((s: any) => ({
    name: s.title.split(' ')[0] + ' ' + (s.title.split(' ')[1] || ''),
    Water_Litres: s.water_litres,
    Energy_kWh: s.energy_kwh * 1000 // scaled for dual axis view or visualization
  })) || [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24 space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              What-If Irrigation & Energy Simulator
            </h1>
            <span className="text-[10px] bg-water-50 text-water-700 font-bold px-2 py-0.5 rounded-full border border-water-200">
              Scenario Agent
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Simulate operational outcomes before pumping. Compare conventional fixed schedules with 
            weather-aware AI optimization.
          </p>
        </div>

        {/* Quick Parameters */}
        <div className="flex items-center gap-3">
          <div className="text-xs">
            <label className="block text-slate-400 font-medium mb-0.5">Forecast Rain (mm)</label>
            <input
              type="number"
              value={forecastRain}
              onChange={(e) => setForecastRain(parseFloat(e.target.value) || 0)}
              className="w-24 p-2 rounded-xl border border-slate-300 font-bold text-slate-800"
            />
          </div>
          <button
            onClick={runSimulation}
            className="p-2.5 bg-agri-50 hover:bg-agri-100 text-agri-800 rounded-xl transition border border-agri-200 mt-4"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Side-by-Side Savings Summary Banner */}
      {simulationData && (
        <div className="bg-gradient-to-r from-emerald-900 via-agri-900 to-agri-950 text-white rounded-3xl p-6 shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
            
            <div>
              <p className="text-xs text-emerald-300 font-semibold uppercase tracking-wider">
                Potential Water Avoided
              </p>
              <div className="text-3xl font-black text-white mt-1">
                {simulationData.comparison.potential_water_saved_litres.toLocaleString()}{' '}
                <span className="text-sm font-normal text-emerald-300">Litres</span>
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5">Groundwater abstraction prevented</p>
            </div>

            <div>
              <p className="text-xs text-amber-300 font-semibold uppercase tracking-wider">
                Potential Energy Saved
              </p>
              <div className="text-3xl font-black text-white mt-1">
                {simulationData.comparison.potential_energy_saved_kwh}{' '}
                <span className="text-sm font-normal text-amber-300">kWh</span>
              </div>
              <p className="text-[11px] text-amber-300 mt-0.5">Pump electricity conserved</p>
            </div>

            <div>
              <p className="text-xs text-slate-300 font-semibold uppercase tracking-wider">
                Financial Expenditure Saved
              </p>
              <div className="text-3xl font-black text-white mt-1">
                ₹{simulationData.comparison.potential_cost_saved_inr}{' '}
                <span className="text-sm font-normal text-slate-300">INR</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">Direct tariff or diesel savings</p>
            </div>

          </div>
        </div>
      )}

      {/* Scenario Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {simulationData?.scenarios?.map((s: any) => (
          <div
            key={s.id}
            className={`p-5 rounded-3xl border transition-all ${
              s.is_recommended
                ? 'bg-emerald-50/70 border-emerald-300 shadow-md ring-2 ring-emerald-400/40'
                : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-extrabold text-base text-slate-900">{s.title}</h3>
              {s.is_recommended && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-600 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                  <CheckCircle2 className="w-3 h-3" />
                  Recommended
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 mb-4">{s.description}</p>

            <div className="grid grid-cols-3 gap-2 bg-white/80 p-3 rounded-2xl border border-slate-200/60 mb-3 text-center">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Water</span>
                <p className="text-sm font-bold text-water-700">{s.water_litres.toLocaleString()} L</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Energy</span>
                <p className="text-sm font-bold text-amber-700">{s.energy_kwh} kWh</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Cost</span>
                <p className="text-sm font-bold text-slate-800">₹{s.cost_inr}</p>
              </div>
            </div>

            <div className="text-[11px] flex items-start gap-1.5 text-slate-600">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span>Risk: <strong>{s.risk_level}</strong> — {s.risk_reason}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recharts Bar Visualization */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-base font-extrabold text-slate-900 mb-4">
          Comparative Water Volume Demand (Litres) Across Scenarios
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}
              />
              <Bar dataKey="Water_Litres" fill="#0284C7" radius={[8, 8, 0, 0]} name="Water Volume (Litres)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
