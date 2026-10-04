import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Droplets,
  Zap,
  Sprout,
  CloudRain,
  Mic,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Cpu,
  BarChart3,
  Users,
  Compass,
  Layers,
  Sparkles
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { demoLogin } = useAuth();
  const navigate = useNavigate();

  const handleQuickDemo = async (role: 'FARMER' | 'FPO_ADMIN') => {
    await demoLogin(role);
    navigate(role === 'FARMER' ? '/farmer/dashboard' : '/fpo/dashboard');
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900">
      
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-200">
        <div className="absolute inset-0 bg-gradient-to-b from-agri-50/70 via-slate-50 to-slate-50 -z-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              
              <div className="inline-flex items-center gap-2 bg-agri-100/90 text-agri-900 px-3.5 py-1.5 rounded-full text-xs font-bold border border-agri-300 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-agri-700" />
                Farmer-Owned Intelligence Platform
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-agri-950 tracking-tight leading-[1.15]">
                AI That Helps Farmers Save <span className="text-agri-700">Water</span>, <span className="text-amber-600">Energy</span> & <span className="text-water-600">Yield</span>.
              </h1>

              <p className="text-base sm:text-lg text-slate-700 font-normal max-w-2xl leading-relaxed mx-auto lg:mx-0">
                AgriEdge replaces expensive physical soil sensors with transparent software intelligence. 
                Combining FAO-56 Penman-Monteith evapotranspiration, localized weather, leaf diagnosis, 
                and pump optimization in the farmer's own language.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
                <button
                  onClick={() => handleQuickDemo('FARMER')}
                  className="flex items-center gap-2 bg-agri-700 hover:bg-agri-800 text-white font-bold px-6 py-3.5 rounded-2xl shadow-lg shadow-agri-900/15 transition-all hover:scale-105 active:scale-95"
                >
                  <Sprout className="w-5 h-5" />
                  Try Farmer Experience
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>

                <button
                  onClick={() => handleQuickDemo('FPO_ADMIN')}
                  className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-800 font-bold px-6 py-3.5 rounded-2xl border border-slate-300 shadow-sm transition hover:scale-105"
                >
                  <Users className="w-5 h-5 text-agri-700" />
                  Explore FPO Dashboard
                </button>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  FAO-56 Penman-Monteith Standard
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Offline-First PWA Ready
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  English • தமிழ் • हिंदी
                </span>
              </div>

            </div>

            {/* Right Interactive Hero Visualization */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200/90 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-agri-100/50 rounded-full blur-2xl -z-0 pointer-events-none" />
                
                {/* Live Card Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
                      Live Agro-Triage Decision
                    </span>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    ESTIMATED
                  </span>
                </div>

                {/* Hero Dashboard Body */}
                <div className="space-y-3.5">
                  
                  {/* Weather + Rain Alert */}
                  <div className="bg-sky-50 rounded-2xl p-3 border border-sky-200 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-sky-950 uppercase">Weather Forecast</p>
                      <p className="text-xs text-sky-800 font-medium mt-0.5">28.4°C • Rain 18.5 mm expected in 24h</p>
                    </div>
                    <CloudRain className="w-6 h-6 text-sky-600" />
                  </div>

                  {/* Water Recommendation */}
                  <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-emerald-950">SKIP IRRIGATION</span>
                      <span className="text-xs font-extrabold text-emerald-700 bg-white px-2 py-0.5 rounded shadow-sm">
                        +8,400 L Water Saved
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800 mt-1">
                      Incoming monsoon rainfall satisfies crop evapotranspiration (ETc 5.2 mm).
                    </p>
                  </div>

                  {/* Energy Savings */}
                  <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-amber-950 uppercase">Pump Energy Impact</p>
                      <p className="text-xs text-amber-800 font-medium mt-0.5">Avoided 2.2 hrs runtime on 5 HP pump</p>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-sm text-amber-950">6.1 kWh</span>
                      <p className="text-[10px] text-amber-700 font-medium">₹40 saved</p>
                    </div>
                  </div>

                  {/* Foliar Health */}
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-slate-800 uppercase">Crop Foliage Diagnostic</p>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">Early Blight (Alternaria solani) • 89% Conf</p>
                    </div>
                    <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                      Moderate
                    </span>
                  </div>

                </div>

                {/* Footer Quote */}
                <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                  <p className="text-[11px] text-slate-500 italic">
                    "Replace physical sensor hardware with mathematical & AI intelligence."
                  </p>
                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* CORE DIFFERENTIATOR SECTION */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold text-agri-700 uppercase tracking-widest mb-2">
              The AgriEdge Difference
            </h2>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Most Agricultural AI only says: "Here is your disease."
            </h3>
            <p className="text-slate-600 mt-3 text-base">
              AgriEdge answers the entire operational question in one unified decision:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center">
              <Sprout className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
              <h4 className="font-bold text-sm text-slate-900 mb-1">What is happening?</h4>
              <p className="text-xs text-slate-600">Leaf disease optical classification with severity & affected area.</p>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center">
              <CloudRain className="w-8 h-8 text-sky-600 mx-auto mb-3" />
              <h4 className="font-bold text-sm text-slate-900 mb-1">What does weather say?</h4>
              <p className="text-xs text-slate-600">Real rainfall forecast & waterlogging risk window.</p>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center">
              <Droplets className="w-8 h-8 text-water-600 mx-auto mb-3" />
              <h4 className="font-bold text-sm text-slate-900 mb-1">Do I need to water?</h4>
              <p className="text-xs text-slate-600">Transparent FAO-56 Penman-Monteith crop water calculation.</p>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center">
              <Zap className="w-8 h-8 text-amber-600 mx-auto mb-3" />
              <h4 className="font-bold text-sm text-slate-900 mb-1">How much energy?</h4>
              <p className="text-xs text-slate-600">Pump runtime, electric kWh & diesel cost estimation.</p>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center">
              <ShieldCheck className="w-8 h-8 text-agri-700 mx-auto mb-3" />
              <h4 className="font-bold text-sm text-slate-900 mb-1">What should I do?</h4>
              <p className="text-xs text-slate-600">Verified extension treatments with ICAR and TNAU citations.</p>
            </div>

          </div>

        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold text-agri-700 uppercase tracking-widest mb-2">
              Simple 4-Step Farmer Flow
            </h2>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              From Photo or Voice to Verified Action in Seconds
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative">
              <span className="w-8 h-8 rounded-full bg-agri-100 text-agri-800 font-extrabold text-sm flex items-center justify-center mb-4">
                1
              </span>
              <h4 className="font-bold text-base text-slate-900 mb-1">Snap Crop Photo</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Take a photo or upload an image. Real-time blur and brightness checks ensure model accuracy.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative">
              <span className="w-8 h-8 rounded-full bg-agri-100 text-agri-800 font-extrabold text-sm flex items-center justify-center mb-4">
                2
              </span>
              <h4 className="font-bold text-base text-slate-900 mb-1">Contextual Triage</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Combines crop phenology, days since planting, soil capacity, and current weather forecast.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative">
              <span className="w-8 h-8 rounded-full bg-agri-100 text-agri-800 font-extrabold text-sm flex items-center justify-center mb-4">
                3
              </span>
              <h4 className="font-bold text-base text-slate-900 mb-1">Multi-Agent Triage</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Vision + ET-Engine + Rainfall + RAG Knowledge Agents synthesize an explainable recommendation.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative">
              <span className="w-8 h-8 rounded-full bg-agri-100 text-agri-800 font-extrabold text-sm flex items-center justify-center mb-4">
                4
              </span>
              <h4 className="font-bold text-base text-slate-900 mb-1">Feedback & Learning</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Report actual outcome. The Outcome Agent compares predicted vs actual to refine future advisories.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* FPO DASHBOARD PREVIEW BANNER */}
      <section className="py-16 bg-agri-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-6 space-y-4">
              <div className="inline-flex items-center gap-1.5 bg-agri-800/80 text-agri-200 px-3 py-1 rounded-full text-xs font-semibold border border-agri-700">
                <Users className="w-3.5 h-3.5" />
                For Farmer Producer Organizations (FPOs)
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Collective Intelligence Across Villages Without Violating Farmer Privacy
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed">
                Track disease hotspots with privacy-preserving geographic clustering. Monitor aggregated 
                groundwater savings, electricity consumption trends, and advisory adoption across hundreds of farms.
              </p>

              <div className="pt-2">
                <button
                  onClick={() => handleQuickDemo('FPO_ADMIN')}
                  className="bg-agri-600 hover:bg-agri-500 text-white font-bold px-6 py-3 rounded-2xl shadow-lg transition"
                >
                  View FPO Regional Dashboard
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 bg-agri-900/60 p-6 rounded-3xl border border-agri-800">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-agri-900 p-4 rounded-2xl border border-agri-700/60">
                  <span className="text-2xl font-black text-white">3.84 M</span>
                  <p className="text-xs text-agri-300 mt-1">Litres of Water Saved</p>
                </div>
                <div className="bg-agri-900 p-4 rounded-2xl border border-agri-700/60">
                  <span className="text-2xl font-black text-amber-400">4,120</span>
                  <p className="text-xs text-agri-300 mt-1">kWh Power Avoided</p>
                </div>
                <div className="bg-agri-900 p-4 rounded-2xl border border-agri-700/60">
                  <span className="text-2xl font-black text-water-400">82.4%</span>
                  <p className="text-xs text-agri-300 mt-1">Farmer Adherence Rate</p>
                </div>
                <div className="bg-agri-900 p-4 rounded-2xl border border-agri-700/60">
                  <span className="text-2xl font-black text-emerald-400">342</span>
                  <p className="text-xs text-agri-300 mt-1">Registered Smallholders</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg overflow-hidden bg-white p-0.5 border border-slate-700 shadow-xs flex items-center justify-center">
              <img src="/logo.png" alt="AgriEdge" className="w-full h-full object-cover" />
            </div>
            <span className="text-slate-200 font-bold">AgriEdge</span>
            <span>— Farmer-Owned Intelligence for Water, Energy & Crop Productivity</span>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/farmer/dashboard" className="hover:text-white transition">Farmer Experience</Link>
            <Link to="/fpo/dashboard" className="hover:text-white transition">FPO Dashboard</Link>
            <Link to="/admin" className="hover:text-white transition">System Health</Link>
          </div>
        </div>
      </footer>

    </div>
  );
};
