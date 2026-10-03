import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { DiseaseMap } from '../../components/DiseaseMap';
import { DiseaseHotspot } from '../../types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Building2,
  Users,
  Droplets,
  Zap,
  Sprout,
  Shield,
  Download,
  Filter,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

export const FPODashboard: React.FC = () => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const [fpoData, setFpoData] = useState<any>(null);
  const [hotspots, setHotspots] = useState<DiseaseHotspot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCluster, setSelectedCluster] = useState<DiseaseHotspot | null>(null);

  useEffect(() => {
    fetchFpoData();
  }, []);

  const fetchFpoData = async () => {
    setLoading(true);
    try {
      const [dashRes, mapRes] = await Promise.all([
        fetch('/api/v1/fpo/dashboard'),
        fetch('/api/v1/fpo/disease-map')
      ]);

      if (dashRes.ok) {
        const d = await dashRes.json();
        setFpoData(d);
      }
      if (mapRes.ok) {
        const m = await mapRes.json();
        setHotspots(m);
      }
    } catch (err) {
      console.error('FPO data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = (format: 'PDF' | 'CSV') => {
    alert(`Exporting ${format} Report: "Cauvery Basin FPO Agriculture Intelligence Report - Q3 2026"`);
  };

  const CROP_COLORS = ['#15803D', '#F59E0B', '#0284C7', '#7C3AED', '#EC4899'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top FPO Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-agri-100 text-agri-800">
              <Building2 className="w-5 h-5 text-agri-700" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {fpoData?.fpo_name || 'Cauvery Basin Farmer Producer Organization'}
              </h1>
              <p className="text-xs text-slate-500">
                {fpoData?.jurisdiction || 'Mandya & Ramanagara Districts, Karnataka'} • FPO ID: FPO_KA_01
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportReport('CSV')}
            className="flex items-center gap-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl border border-slate-200 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => exportReport('PDF')}
            className="flex items-center gap-1.5 text-xs font-semibold bg-agri-700 hover:bg-agri-800 text-white px-3.5 py-2 rounded-xl shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export Intelligence Report
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Farmers & Farms */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Member Farmers</span>
            <Users className="w-4 h-4 text-agri-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">
            {fpoData?.kpi_metrics?.total_registered_farmers || 342}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            <strong className="text-emerald-700 font-semibold">{fpoData?.kpi_metrics?.active_farmers_this_month || 289}</strong> active this month ({fpoData?.kpi_metrics?.total_acreage_under_management || 845.5} acres)
          </p>
        </div>

        {/* Water Saved */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Estimated Water Saved</span>
            <Droplets className="w-4 h-4 text-water-600" />
          </div>
          <div className="text-3xl font-black text-water-950">
            3.84 <span className="text-lg font-bold text-water-700">M Litres</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Penman-Monteith rain offset avoided pumping
          </p>
        </div>

        {/* Energy Saved */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Energy Conserved</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-950">
            4,120 <span className="text-lg font-bold text-amber-700">kWh</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ~₹26,780 financial savings across cluster
          </p>
        </div>

        {/* Adherence Rate */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Advisory Adherence</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-emerald-700">
            {fpoData?.kpi_metrics?.advisory_adherence_rate_pct || 82.4}%
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Based on {fpoData?.kpi_metrics?.total_advisories_generated || 1420} generated advisories
          </p>
        </div>

      </div>

      {/* Disease Hotspot Map Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
            Village Disease Hotspots & Spatial Distribution
          </h2>
          <span className="text-xs text-slate-500">
            Centroid clusters aggregated to ensure individual farmer confidentiality
          </span>
        </div>

        <DiseaseMap
          hotspots={hotspots}
          onSelectCluster={(cluster) => setSelectedCluster(cluster)}
        />

        {selectedCluster && (
          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-emerald-950 text-sm">
                Cluster Selected: {selectedCluster.village} ({selectedCluster.block} Block)
              </span>
              <p className="text-emerald-800 mt-0.5">
                {selectedCluster.crop}: {selectedCluster.disease} ({selectedCluster.severity} severity) • {selectedCluster.active_cases} active reports across {selectedCluster.affected_area_acres} acres.
              </p>
              <p className="text-slate-600 mt-1 font-medium">
                Action: {selectedCluster.recommended_action}
              </p>
            </div>
            <button
              onClick={() => setSelectedCluster(null)}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Recharts Analytics: Water Trends & Energy Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Water Demand vs Delivered (AreaChart) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">7-Day Cluster Water Trends</h3>
              <p className="text-xs text-slate-500">Estimated Demand vs Delivered (kiloLitres)</p>
            </div>
            <span className="text-xs font-semibold text-water-700 bg-water-50 px-2 py-1 rounded-md">
              Rainfall Day: Wed
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fpoData?.water_trends_7d || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}
                />
                <Area type="monotone" dataKey="estimated_demand_kL" stroke="#0284C7" fill="#BAE6FD" fillOpacity={0.6} name="Demand (kL)" />
                <Area type="monotone" dataKey="water_saved_kL" stroke="#16A34A" fill="#BBF7D0" fillOpacity={0.7} name="Water Saved (kL)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Energy Consumed vs Conserved (BarChart) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">7-Day Cluster Energy Trends</h3>
              <p className="text-xs text-slate-500">Electricity Consumed vs Conserved (kWh)</p>
            </div>
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-md">
              5 HP / 7.5 HP Pumps
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fpoData?.energy_trends_7d || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}
                />
                <Bar dataKey="kwh_consumed" fill="#F59E0B" radius={[6, 6, 0, 0]} name="Consumed (kWh)" />
                <Bar dataKey="kwh_saved" fill="#22C55E" radius={[6, 6, 0, 0]} name="Saved (kWh)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Crop Distribution & Disease Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Crop Distribution Table */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-extrabold text-slate-900 mb-4">Acreage & Crop Distribution</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold">
                  <th className="pb-2">Crop</th>
                  <th className="pb-2">Acres</th>
                  <th className="pb-2">Farmers</th>
                  <th className="pb-2">Health Index</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {fpoData?.crop_distribution?.map((c: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-2.5 font-bold text-slate-900">{c.crop}</td>
                    <td className="py-2.5 text-slate-600">{c.acres}</td>
                    <td className="py-2.5 text-slate-600">{c.farmers}</td>
                    <td className="py-2.5">
                      <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                        {c.health_pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Disease Incident Incidences */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-extrabold text-slate-900 mb-4">Active Disease Incident Registry</h3>
          <div className="space-y-3">
            {fpoData?.disease_breakdown?.map((d: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                <div>
                  <span className="font-bold text-slate-900">{d.disease}</span>
                  <p className="text-slate-500 mt-0.5">{d.crop} • {d.incident_count} reported cases</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${
                  d.severity === 'Severe'
                    ? 'bg-rose-100 text-rose-800'
                    : d.severity === 'Moderate'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {d.severity}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
