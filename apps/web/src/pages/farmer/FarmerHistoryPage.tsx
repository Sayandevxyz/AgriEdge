import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { History, Droplets, Sprout, Calendar, ArrowRight, RefreshCw } from 'lucide-react';

export const FarmerHistoryPage: React.FC = () => {
  const { user, token } = useAuth();
  const { t } = useLanguage();

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/farmer/history', { headers });
      if (res.ok) {
        const d = await res.json();
        setHistory(d);
      }
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24 space-y-6">
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Previous Analyses & Advisories</h1>
          <p className="text-xs text-slate-500 mt-0.5">Audit trail of past crop health diagnoses and water recommendations.</p>
        </div>
        <button
          onClick={fetchHistory}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
          <RefreshCw className="w-8 h-8 text-agri-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Retrieving advisory records...</p>
        </div>
      ) : history.length > 0 ? (
        <div className="space-y-3">
          {history.map((item) => (
            <div
              key={item.id}
              className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-slate-900">{item.crop_name}</span>
                  <span className="text-xs text-slate-400 capitalize">({item.growth_stage} stage)</span>
                </div>
                <span className="text-xs text-slate-500 font-mono">{item.created_at}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {item.irrigation_action}
                  </span>
                  <span className="text-slate-500 ml-2">
                    Water: {item.estimated_water_litres?.toLocaleString()} L
                  </span>
                </div>

                {item.potential_water_saved_litres > 0 && (
                  <span className="font-bold text-emerald-600">
                    +{item.potential_water_saved_litres?.toLocaleString()} L Saved
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                {item.summary}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
          <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No past advisories logged yet.</p>
        </div>
      )}
    </div>
  );
};
