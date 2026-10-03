import React, { useState } from 'react';
import { AdvisoryPayload } from '../types';
import {
  Droplets,
  Zap,
  Sprout,
  CloudRain,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  MessageSquarePlus,
  Send
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface AdvisoryCardProps {
  advisory: AdvisoryPayload;
  onFeedbackSubmitted?: () => void;
}

export const AdvisoryCard: React.FC<AdvisoryCardProps> = ({ advisory, onFeedbackSubmitted }) => {
  const { t } = useLanguage();
  const { token } = useAuth();
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);
  const [feedbackAction, setFeedbackAction] = useState<string>('Followed advice and skipped irrigation');
  const [cropCondition, setCropCondition] = useState<string>('Improved');
  const [farmerNotes, setFarmerNotes] = useState<string>('');
  const [feedbackSuccess, setFeedbackSuccess] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const getActionBadgeStyle = (action: string) => {
    switch (action) {
      case 'SKIP IRRIGATION':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'REDUCE IRRIGATION':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'IRRIGATE NOW':
        return 'bg-water-100 text-water-800 border-water-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          advisory_id: advisory.advisory_id,
          predicted_action: advisory.water.action,
          action_taken: feedbackAction,
          water_used_litres: advisory.water.estimated_gross_volume_litres,
          predicted_water_litres: advisory.water.estimated_gross_volume_litres,
          energy_used_kwh: advisory.energy.energy_consumed,
          predicted_energy_kwh: advisory.energy.energy_consumed,
          crop_condition: cropCondition,
          farmer_comment: farmerNotes
        })
      });

      if (res.ok) {
        setFeedbackSuccess(true);
        setTimeout(() => {
          setShowFeedbackModal(false);
          setFeedbackSuccess(false);
          if (onFeedbackSubmitted) onFeedbackSubmitted();
        }, 1500);
      }
    } catch (err) {
      console.error('Feedback submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden mb-6 transition-all hover:shadow-2xl">
      
      {/* Top Banner with Action Badge & Timestamp */}
      <div className="bg-gradient-to-r from-agri-900 via-agri-800 to-agri-950 text-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-agri-200">
              {advisory.crop_context.crop} • {advisory.crop_context.active_stage} Stage ({advisory.crop_context.farm_acres} Acres)
            </span>
          </div>
          <span className="text-[11px] text-slate-300 font-mono">
            ID: {advisory.advisory_id}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-xs font-extrabold tracking-wide uppercase border ${getActionBadgeStyle(advisory.water.action)}`}>
            {advisory.water.action}
          </div>
          <span className="text-sm font-medium text-slate-100">
            {advisory.water.urgency.toUpperCase()} PRIORITY
          </span>
        </div>

        <p className="mt-3 text-sm text-slate-200 leading-relaxed font-normal">
          {advisory.summary}
        </p>
      </div>

      {/* Grid of 4 Key Intelligence Pillars */}
      <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* 💧 WATER INTELLIGENCE PILLAR */}
        <div className="bg-water-50/60 rounded-2xl p-4 border border-water-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-water-900">
                <Droplets className="w-4 h-4 text-water-600" />
                Water Allocation
              </span>
              <span className="text-[10px] bg-white px-2 py-0.5 rounded-full font-semibold text-water-700 border border-water-200">
                {advisory.water.badge}
              </span>
            </div>

            <div className="my-2">
              <div className="text-2xl font-black text-water-950">
                {advisory.water.estimated_gross_volume_litres.toLocaleString()} <span className="text-sm font-semibold text-water-700">Litres</span>
              </div>
              <p className="text-xs text-water-800 mt-1">
                Crop ETc: <span className="font-semibold">{advisory.water.etc_mm_day} mm/day</span> • Effective Rain: <span className="font-semibold">{advisory.water.effective_rainfall_mm} mm</span>
              </p>
            </div>
          </div>

          {advisory.water.potential_water_saved_litres > 0 && (
            <div className="mt-3 pt-2 border-t border-water-200/60 flex items-center justify-between text-xs">
              <span className="text-water-800 font-medium">Potential Water Avoided:</span>
              <span className="font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                +{advisory.water.potential_water_saved_litres.toLocaleString()} L
              </span>
            </div>
          )}
        </div>

        {/* ⚡ ENERGY & PUMP PILLAR */}
        <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-amber-900">
                <Zap className="w-4 h-4 text-amber-600" />
                Pump Energy Impact
              </span>
              <span className="text-[10px] bg-white px-2 py-0.5 rounded-full font-semibold text-amber-700 border border-amber-200">
                {advisory.energy.badge}
              </span>
            </div>

            <div className="my-2">
              <div className="text-2xl font-black text-amber-950">
                {advisory.energy.energy_consumed} <span className="text-sm font-semibold text-amber-700">{advisory.energy.energy_unit}</span>
              </div>
              <p className="text-xs text-amber-800 mt-1">
                Estimated runtime: <span className="font-semibold">{advisory.energy.estimated_runtime_hours} hrs</span> on {advisory.energy.pump_hp} HP {advisory.energy.pump_type} pump
              </p>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs">
            <span className="text-amber-800 font-medium">Estimated Operational Cost:</span>
            <span className="font-bold text-slate-900">
              ₹{advisory.energy.estimated_cost_inr.toFixed(0)}
            </span>
          </div>
        </div>

        {/* 🌱 CROP HEALTH PILLAR */}
        <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-emerald-900">
                <Sprout className="w-4 h-4 text-emerald-600" />
                Foliar Health
              </span>
              <span className="text-[10px] bg-white px-2 py-0.5 rounded-full font-semibold text-emerald-700 border border-emerald-200">
                {advisory.crop_health.badge}
              </span>
            </div>

            <div className="my-2">
              <div className="text-lg font-bold text-emerald-950">
                {advisory.crop_health.detected}
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">
                Confidence: <span className="font-semibold">{Math.round(advisory.crop_health.confidence * 100)}%</span> • Severity: <span className="font-semibold">{advisory.crop_health.severity}</span>
              </p>
              {advisory.crop_health.visual_explanation && (
                <p className="text-[11px] text-slate-600 mt-1 italic">
                  "{advisory.crop_health.visual_explanation}"
                </p>
              )}
            </div>
          </div>

          {advisory.crop_health.requires_verification && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-100/60 px-2 py-1 rounded">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              Agronomist physical inspection recommended.
            </div>
          )}
        </div>

        {/* 🌦 WEATHER & RAIN RISK PILLAR */}
        <div className="bg-sky-50/60 rounded-2xl p-4 border border-sky-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-sky-900">
                <CloudRain className="w-4 h-4 text-sky-600" />
                Agro-Meteorology
              </span>
              <span className="text-[10px] bg-white px-2 py-0.5 rounded-full font-semibold text-sky-700 border border-sky-200">
                {advisory.weather_context.badge}
              </span>
            </div>

            <div className="my-2">
              <div className="text-xl font-black text-sky-950">
                {advisory.weather_context.temperature_c}°C • {advisory.weather_context.condition}
              </div>
              <p className="text-xs text-sky-800 mt-1">
                24h Rain Forecast: <span className="font-semibold">{advisory.weather_context.rainfall_24h_mm} mm</span> (Risk: {advisory.weather_context.rain_risk})
              </p>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-sky-200/60 text-xs text-sky-900 font-medium">
            Irrigation Window: <span className="font-semibold">{advisory.weather_context.irrigation_window}</span>
          </div>
        </div>

      </div>

      {/* WHY Section (Explainability & Grounding) */}
      <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t border-b border-slate-200">
        <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
          <HelpCircle className="w-4 h-4 text-agri-600" />
          Why this recommendation?
        </h4>
        <p className="text-xs text-slate-700 leading-relaxed">
          {advisory.water.why}
        </p>
      </div>

      {/* Actionable Directives: What to Do & What NOT to Do */}
      <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* What to Do */}
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Recommended Actions
          </h4>
          <ul className="space-y-1.5">
            {advisory.what_to_do.map((item, idx) => (
              <li key={idx} className="text-xs text-slate-700 flex items-start gap-2 bg-emerald-50/40 p-2 rounded-lg border border-emerald-100">
                <span className="font-bold text-emerald-600">{idx + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* What NOT to Do */}
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-800 mb-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            What NOT to Do
          </h4>
          <ul className="space-y-1.5">
            {advisory.what_not_to_do.map((item, idx) => (
              <li key={idx} className="text-xs text-slate-700 flex items-start gap-2 bg-rose-50/40 p-2 rounded-lg border border-rose-100">
                <span className="font-bold text-rose-600">✕</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>

      {/* Citations & Verified Sources */}
      {advisory.citations && advisory.citations.length > 0 && (
        <div className="px-5 sm:px-6 py-3 bg-slate-50/80 border-t border-slate-200 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-700 mb-1">
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            Agronomic Citations & Reference Documents:
          </div>
          <div className="space-y-1">
            {advisory.citations.map((cite, idx) => (
              <div key={idx} className="text-[11px] text-slate-600">
                • <span className="font-semibold text-slate-800">{cite.title}</span> ({cite.source})
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Safety Notice & Feedback Trigger Footer */}
      <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-slate-400 max-w-md">
          {advisory.safety_note}
        </p>

        <button
          onClick={() => setShowFeedbackModal(true)}
          className="flex items-center gap-1.5 text-xs font-bold bg-agri-50 hover:bg-agri-100 text-agri-800 px-4 py-2 rounded-xl border border-agri-300 transition"
        >
          <MessageSquarePlus className="w-4 h-4 text-agri-600" />
          Report Outcome Feedback
        </button>
      </div>

      {/* Feedback Modal for Closing the Loop */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Report Actual Farm Outcome</h3>
            <p className="text-xs text-slate-500 mb-4">
              Close the intelligence feedback loop. Your actual field result helps improve future personalization.
            </p>

            {feedbackSuccess ? (
              <div className="bg-emerald-50 text-emerald-800 p-4 rounded-2xl border border-emerald-200 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-bold">Feedback Successfully Logged!</p>
                <p className="text-xs text-emerald-700 mt-1">Outcome Agent evaluated the efficacy score.</p>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Action you took:</label>
                  <select
                    value={feedbackAction}
                    onChange={(e) => setFeedbackAction(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-agri-500"
                  >
                    <option value="Followed advice and skipped irrigation">Followed advice: Skipped irrigation</option>
                    <option value="Applied reduced volume as advised">Followed advice: Reduced irrigation volume</option>
                    <option value="Irrigated anyway due to visual soil dryness">Irrigated anyway: Saw surface dryness</option>
                    <option value="Sprayed organic foliar treatment">Sprayed organic foliar remedy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Crop Condition After 48h:</label>
                  <select
                    value={cropCondition}
                    onChange={(e) => setCropCondition(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-agri-500"
                  >
                    <option value="Improved">Improved / Foliage Vibrant</option>
                    <option value="Stable">Stable / No Change</option>
                    <option value="Worsened">Worsened / Further Stress</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Your comments (optional):</label>
                  <textarea
                    rows={2}
                    value={farmerNotes}
                    onChange={(e) => setFarmerNotes(e.target.value)}
                    placeholder="e.g. Rain arrived in the evening as predicted, saving pump power."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-agri-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowFeedbackModal(false)}
                    className="text-xs px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 text-xs font-bold bg-agri-600 hover:bg-agri-700 text-white px-4 py-2 rounded-xl shadow transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSubmitting ? 'Recording...' : 'Submit to Outcome Agent'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
