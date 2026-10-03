import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Farm } from '../../types';
import {
  Sprout,
  Plus,
  Droplets,
  Zap,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';

export const FarmsListPage: React.FC = () => {
  const { user, token } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // New Farm Form State
  const [farmName, setFarmName] = useState<string>('Cauvery North Field');
  const [areaAcres, setAreaAcres] = useState<number>(2.5);
  const [cropName, setCropName] = useState<string>('Tomato');
  const [variety, setVariety] = useState<string>('Arka Rakshak');
  const [plantingDate, setPlantingDate] = useState<string>('2026-08-20');
  const [soilType, setSoilType] = useState<string>('loam');
  const [irrigationType, setIrrigationType] = useState<string>('drip');
  const [pumpHp, setPumpHp] = useState<number>(5.0);
  const [village, setVillage] = useState<string>('Channapatna');
  const [district, setDistrict] = useState<string>('Ramanagara');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetchFarms();
  }, []);

  const fetchFarms = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/farms', { headers });
      if (res.ok) {
        const data = await res.json();
        setFarms(data);
      }
    } catch (err) {
      console.error('Failed to fetch farms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/farms', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          farm_name: farmName,
          total_area_acres: areaAcres,
          crop_name: cropName,
          variety,
          planting_date: plantingDate,
          soil_type: soilType,
          irrigation_type: irrigationType,
          pump_hp: pumpHp,
          pump_type: 'electric',
          discharge_rate_lps: 8.0,
          village,
          district,
          state: 'Karnataka'
        })
      });

      if (res.ok) {
        setShowAddModal(false);
        fetchFarms();
      }
    } catch (err) {
      console.error('Farm creation error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24 space-y-6">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t('my_farms')}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure farm boundary, soil available water capacity, and pump power parameters.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 bg-agri-700 hover:bg-agri-800 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow transition"
        >
          <Plus className="w-4 h-4" />
          {t('add_farm')}
        </button>
      </div>

      {/* Farms Grid */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
          <RefreshCw className="w-8 h-8 text-agri-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading farm configurations...</p>
        </div>
      ) : farms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {farms.map((f) => (
            <div
              key={f.id}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">{f.farm_name}</h3>
                  <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-agri-600" />
                    {f.village}, {f.district}
                  </span>
                </div>
                <span className="bg-agri-100 text-agri-800 text-xs font-bold px-2.5 py-1 rounded-full">
                  {f.total_area_acres} Acres
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Crop & Stage</span>
                  <strong className="text-slate-900">{f.active_crop}</strong> ({f.current_stage || 'Flowering'})
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Soil Type</span>
                  <strong className="text-slate-900 capitalize">{f.soil_type.replace('_', ' ')}</strong>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Irrigation Type</span>
                  <strong className="text-slate-900 capitalize">{f.irrigation_type}</strong>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Pump Capacity</span>
                  <strong className="text-slate-900">{f.pump_hp} HP ({f.pump_type})</strong>
                </div>
              </div>

              <button
                onClick={() => navigate('/farmer/analyze')}
                className="w-full flex items-center justify-center gap-2 bg-agri-50 hover:bg-agri-100 text-agri-800 font-bold text-xs py-2.5 rounded-xl border border-agri-200 transition"
              >
                Run Decision Triage on this Farm
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
          <Sprout className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">No farms registered yet.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-3 text-xs bg-agri-700 text-white font-bold px-4 py-2 rounded-xl"
          >
            Add Your First Farm
          </button>
        </div>
      )}

      {/* Add Farm Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-black text-slate-900">Add New Farm Profile</h2>
            
            <form onSubmit={handleCreateFarm} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Farm Name</label>
                <input
                  type="text"
                  required
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Area (Acres)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={areaAcres}
                    onChange={(e) => setAreaAcres(parseFloat(e.target.value) || 1.0)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Crop</label>
                  <select
                    value={cropName}
                    onChange={(e) => setCropName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-medium"
                  >
                    <option value="Tomato">Tomato</option>
                    <option value="Chilli">Chilli / Pepper</option>
                    <option value="Rice">Paddy / Rice</option>
                    <option value="Wheat">Wheat</option>
                    <option value="Cotton">Cotton</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Planting Date</label>
                  <input
                    type="date"
                    required
                    value={plantingDate}
                    onChange={(e) => setPlantingDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Soil Type</label>
                  <select
                    value={soilType}
                    onChange={(e) => setSoilType(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-medium"
                  >
                    <option value="loam">Loam</option>
                    <option value="clay">Clay</option>
                    <option value="sandy_loam">Sandy Loam</option>
                    <option value="black_cotton">Black Cotton</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Irrigation Method</label>
                  <select
                    value={irrigationType}
                    onChange={(e) => setIrrigationType(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-medium"
                  >
                    <option value="drip">Drip (90% Efficiency)</option>
                    <option value="sprinkler">Sprinkler (75% Efficiency)</option>
                    <option value="flood">Surface / Flood (60% Efficiency)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pump HP</label>
                  <input
                    type="number"
                    step="0.5"
                    value={pumpHp}
                    onChange={(e) => setPumpHp(parseFloat(e.target.value) || 5.0)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-agri-700 hover:bg-agri-800 text-white font-bold px-5 py-2 rounded-xl shadow"
                >
                  {submitting ? 'Saving...' : 'Save Farm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
