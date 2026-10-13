import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import { ShieldCheck, Lock, CheckCircle2, AlertTriangle, ArrowLeft, RefreshCw, FileText } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  const { user } = useAuth();
  const [consentState, setConsentState] = useState<boolean>(user?.consent_given ?? true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleToggleConsent = async (nextConsent: boolean) => {
    if (!user) return;
    setUpdating(true);
    setStatusMessage(null);
    try {
      const res = await apiFetch('/api/v1/auth/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consent_given: nextConsent,
          consent_version: 'dpdp-v1.0'
        })
      });

      if (res.ok) {
        setConsentState(nextConsent);
        setStatusMessage(
          nextConsent
            ? 'Consent successfully recorded (dpdp-v1.0).'
            : 'Consent successfully revoked. Leaf image analysis is now blocked.'
        );
      } else {
        setStatusMessage('Failed to update consent preferences. Please retry.');
      }
    } catch {
      setStatusMessage('Network error while updating consent.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24 space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-agri-700 hover:text-agri-800 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to App
          </Link>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-agri-100 text-agri-800">
              <ShieldCheck className="w-5 h-5 text-agri-700" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Privacy & Data Protection Notice
              </h1>
              <p className="text-xs text-slate-500">
                Digital Personal Data Protection (DPDP) Act Compliance • Version dpdp-v1.0
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Consent Management Card for Authenticated Users */}
      {user && (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-700" />
              <h2 className="text-base font-extrabold text-slate-900">
                Your DPDP Consent Record
              </h2>
            </div>
            <span className="text-xs font-mono font-bold bg-white text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
              Version: {user.consent_version || 'dpdp-v1.0'}
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Registered Data Principal: <strong className="text-slate-900">{user.full_name}</strong> ({user.email})
          </p>

          <div className="p-4 bg-white rounded-2xl border border-emerald-200 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">Current Status:</span>
                <span className={`text-xs font-black uppercase px-2 py-0.5 rounded-full ${
                  consentState ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {consentState ? 'Consent Recorded' : 'Consent Withdrawn'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {consentState
                  ? 'You have consented to farm telemetry and leaf photo processing for precision advisories.'
                  : 'You have withdrawn consent. Leaf photo uploads and AI analysis are blocked until re-enabled.'}
              </p>
            </div>

            <button
              onClick={() => handleToggleConsent(!consentState)}
              disabled={updating}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                consentState
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
            >
              {updating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              {consentState ? 'Revoke Consent' : 'Grant DPDP Consent'}
            </button>
          </div>

          {statusMessage && (
            <p className="text-xs font-semibold text-emerald-900 bg-emerald-100/70 p-2.5 rounded-xl border border-emerald-200">
              {statusMessage}
            </p>
          )}
        </div>
      )}

      {/* DPDP Policy Sections */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 text-xs text-slate-700 leading-relaxed">
        
        <section className="space-y-2">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-agri-600" /> 1. Commitment to Farmer Data Minimization
          </h3>
          <p>
            Under the Digital Personal Data Protection (DPDP) Act, 2023, AgriEdge acts as a <strong>Data Fiduciary</strong> solely dedicated to providing smallholder precision agriculture recommendations. We collect only the minimum telemetry required to compute crop water requirements, pump runtime, and disease risk.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-agri-600" /> 2. What Information We Process
          </h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Farm Characteristics:</strong> Total area (acres), soil texture (sandy, loam, clay), irrigation pump HP and pump type (electric or diesel).</li>
            <li><strong>Crop Telemetry:</strong> Crop species, planting date, current growth stage, and crop variety.</li>
            <li><strong>Approximate Farm Coordinates:</strong> Latitude and longitude used exclusively to look up local meteorological forecasts (rainfall, solar radiation, temperature) and mandi market commodity prices.</li>
            <li><strong>Leaf Imagery:</strong> User-captured leaf photographs processed for optical disease lesions, chlorosis, and necrosis.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-agri-600" /> 3. Strict Farmer Privacy & Regional Spatial Aggregation
          </h3>
          <p>
            AgriEdge enforces strict privacy boundaries for all regional and FPO dashboards:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>No Public Farmer Coordinates:</strong> We never expose individual farmer GPS coordinates on maps or public endpoints.</li>
            <li><strong>District-Level Spatial Centroids:</strong> Disease alerts on the FPO map are aggregated strictly to district centroids. Individual farm boundaries and field locations are never rendered.</li>
            <li><strong>Zero Commercial Data Selling:</strong> We do not sell or monetize farmer telemetry, land records, or commodity sales with third-party advertisers or brokers.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-agri-600" /> 4. Data Principal Rights
          </h3>
          <p>
            In accordance with the DPDP Act, every registered farmer has the right to:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Right to Summary & Access:</strong> Access all advisories, feedback entries, and registered farms.</li>
            <li><strong>Right to Correction & Erasure:</strong> Update farm telemetry or request deletion of account records.</li>
            <li><strong>Right to Grievance Redressal:</strong> Contact our designated Data Protection Officer at <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-semibold">dpo@agriedge.internal</code>.</li>
            <li><strong>Right to Withdraw Consent:</strong> Revoke consent at any time directly through this page or profile settings.</li>
          </ul>
        </section>

      </div>

    </div>
  );
};
