import React from 'react';
import { ArrowUpRight, ArrowDownRight, ShieldAlert, CheckCircle2, TrendingUp, TrendingDown, HelpCircle, Layers } from 'lucide-react';

export default function FeatureAttribution({ explanation, loading }) {
  if (loading) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 animate-pulse">
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
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
        Run an evaluation to inspect explainability attributions.
      </div>
    );
  }

  const { attributions, top_risk_factors, top_protective_factors, executive_summary, churn_probability } = explanation;

  // Max absolute attribution for scale
  const maxAttribution = Math.max(...attributions.map((a) => Math.abs(a.attribution)), 0.05);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <span>Explainable AI (XAI) Risk Breakdown</span>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-mono font-semibold border border-blue-500/20">
              Sensitivity Attribution
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Marginal impact of each client metric on the final churn prediction.
          </p>
        </div>
      </div>

      {/* Executive Risk Diagnosis */}
      <div className={`p-4 rounded-xl border ${
        churn_probability >= 0.70
          ? 'bg-rose-950/30 border-rose-800/60 text-rose-100'
          : churn_probability >= 0.40
          ? 'bg-amber-950/30 border-amber-800/60 text-amber-100'
          : 'bg-emerald-950/30 border-emerald-800/60 text-emerald-100'
      }`}>
        <div className="flex items-start space-x-3">
          {churn_probability >= 0.70 ? (
            <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div className="text-xs leading-relaxed">
            <span className="font-bold block text-sm mb-1 tracking-tight">Executive Bank Diagnosis</span>
            <p className="opacity-95">{executive_summary}</p>
          </div>
        </div>
      </div>

      {/* Attribution Bars */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-slate-400 border-b border-slate-800 pb-2">
          <span>CLIENT ATTRIBUTE & OBSERVED VALUE</span>
          <span>MARGINAL IMPACT (ΔP)</span>
        </div>

        {attributions.slice(0, 7).map((item) => {
          const isRisk = item.direction === 'INCREASES_RISK';
          const pctWidth = Math.min(100, Math.round((Math.abs(item.attribution) / maxAttribution) * 100));

          return (
            <div key={item.feature} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  {isRisk ? (
                    <TrendingUp className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  )}
                  <span className="font-medium text-slate-200">{item.display_name}</span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    ({typeof item.value === 'number' && item.value > 1000 ? `$${item.value.toLocaleString()}` : String(item.value)})
                  </span>
                </div>
                <span className={`font-mono text-xs font-bold ${isRisk ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {isRisk ? '+' : ''}{(item.attribution * 100).toFixed(1)}%
                </span>
              </div>

              {/* Bar visualization */}
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden flex ring-1 ring-slate-800">
                {isRisk ? (
                  <div
                    style={{ width: `${pctWidth}%` }}
                    className="bg-gradient-to-r from-rose-500 to-red-400 h-full rounded-full transition-all duration-500 shadow-sm"
                  />
                ) : (
                  <div
                    style={{ width: `${pctWidth}%` }}
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500 shadow-sm"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Categorized Impact Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800 text-xs">
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
          <span className="font-bold text-rose-400 flex items-center space-x-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
            <span>Why is this client at risk?</span>
          </span>
          <ul className="space-y-1.5 text-slate-300">
            {top_risk_factors.length > 0 ? (
              top_risk_factors.map((f, i) => (
                <li key={i} className="leading-snug flex items-start space-x-1.5">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>{f}</span>
                </li>
              ))
            ) : (
              <li className="text-slate-400">No elevated risk catalysts detected.</li>
            )}
          </ul>
        </div>

        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
          <span className="font-bold text-emerald-400 flex items-center space-x-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>Why is this client staying loyal?</span>
          </span>
          <ul className="space-y-1.5 text-slate-300">
            {top_protective_factors.length > 0 ? (
              top_protective_factors.map((f, i) => (
                <li key={i} className="leading-snug flex items-start space-x-1.5">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>{f}</span>
                </li>
              ))
            ) : (
              <li className="text-slate-400">Standard market loyalty baseline.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
