import React from 'react';
import { ArrowUpRight, ArrowDownRight, Info, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';

export default function FeatureAttribution({ explanation, loading }) {
  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 animate-pulse">
        <div className="h-5 w-48 bg-slate-800 rounded mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 bg-slate-800/60 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!explanation) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
        Run prediction to view feature attribution.
      </div>
    );
  }

  const { attributions, top_risk_factors, top_protective_factors, executive_summary, churn_probability } = explanation;

  // Max absolute attribution for scale
  const maxAttribution = Math.max(...attributions.map((a) => Math.abs(a.attribution)), 0.05);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center space-x-2">
            <span>Explainable AI (XAI) Attribution</span>
            <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono border border-blue-500/20">
              Perturbation Sensitivity
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Empirical marginal contribution of customer telemetry toward churn decision.
          </p>
        </div>
      </div>

      {/* Executive Summary Alert */}
      <div className={`p-4 rounded-xl border ${
        churn_probability >= 0.70
          ? 'bg-rose-950/30 border-rose-800/50 text-rose-200'
          : churn_probability >= 0.40
          ? 'bg-amber-950/30 border-amber-800/50 text-amber-200'
          : 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200'
      }`}>
        <div className="flex items-start space-x-3">
          {churn_probability >= 0.70 ? (
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div className="text-xs leading-relaxed">
            <span className="font-semibold block text-sm mb-0.5">Executive Risk Diagnosis</span>
            {executive_summary}
          </div>
        </div>
      </div>

      {/* Attribution Bars */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
          <span>FEATURE (OBSERVED VALUE)</span>
          <span>MARGINAL RISK IMPACT (ΔP)</span>
        </div>

        {attributions.slice(0, 7).map((item) => {
          const isRisk = item.direction === 'INCREASES_RISK';
          const pctWidth = Math.min(100, Math.round((Math.abs(item.attribution) / maxAttribution) * 100));

          return (
            <div key={item.feature} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  {isRisk ? (
                    <ArrowUpRight className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  )}
                  <span className="font-medium text-slate-200">{item.display_name}</span>
                  <span className="text-slate-400 font-mono text-[11px]">({String(item.value)})</span>
                </div>
                <span className={`font-mono text-xs font-semibold ${isRisk ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {isRisk ? '+' : ''}{(item.attribution * 100).toFixed(1)}%
                </span>
              </div>

              {/* Bar visualization */}
              <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden flex">
                {isRisk ? (
                  <div
                    style={{ width: `${pctWidth}%` }}
                    className="bg-gradient-to-r from-rose-600 to-rose-400 h-full rounded-full transition-all duration-500"
                  />
                ) : (
                  <div
                    style={{ width: `${pctWidth}%` }}
                    className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full transition-all duration-500"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Factors Split */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800 text-xs">
        <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
          <span className="font-semibold text-rose-400 flex items-center space-x-1.5 mb-2">
            <span className="h-2 w-2 rounded-full bg-rose-400"></span>
            <span>Primary Attrition Catalysts</span>
          </span>
          <ul className="space-y-1 text-slate-300">
            {top_risk_factors.length > 0 ? (
              top_risk_factors.map((f, i) => (
                <li key={i} className="leading-snug">• {f}</li>
              ))
            ) : (
              <li className="text-slate-400">No major negative anomalies detected.</li>
            )}
          </ul>
        </div>

        <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
          <span className="font-semibold text-emerald-400 flex items-center space-x-1.5 mb-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            <span>Retention Anchor Factors</span>
          </span>
          <ul className="space-y-1 text-slate-300">
            {top_protective_factors.length > 0 ? (
              top_protective_factors.map((f, i) => (
                <li key={i} className="leading-snug">• {f}</li>
              ))
            ) : (
              <li className="text-slate-400">Standard market baseline anchors.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
