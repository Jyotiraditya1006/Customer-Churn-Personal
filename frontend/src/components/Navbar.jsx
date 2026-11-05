import React from 'react';
import { ShieldCheck, Cpu, Zap, Activity, ExternalLink, RefreshCw, Terminal, Sparkles } from 'lucide-react';

export default function Navbar({ latency, driftStatus, onSimulateDrift, isSimulatingDrift }) {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Title */}
        <div className="flex items-center space-x-3.5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-white/20">
            <ShieldCheck className="h-6 w-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base tracking-tight text-white">AEGIS</span>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono font-semibold border border-emerald-500/30">
                Enterprise AI
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block font-medium">
              FinTech Customer Retention & Churn Intelligence Engine
            </p>
          </div>
        </div>

        {/* Real-time System Metrics */}
        <div className="hidden lg:flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono shadow-sm">
            <Cpu className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-slate-400">Serving Engine:</span>
            <span className="text-blue-400 font-semibold">ONNX Runtime</span>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono shadow-sm">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-slate-400">Inference Latency:</span>
            <span className="text-amber-400 font-semibold">{latency ? `${latency.toFixed(2)} ms` : '0.09 ms'}</span>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono shadow-sm">
            <Activity className={`h-3.5 w-3.5 ${driftStatus === 'HEALTHY' ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}`} />
            <span className="text-slate-400">Data Drift:</span>
            <span className={driftStatus === 'HEALTHY' ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-bold'}>
              {driftStatus || 'HEALTHY'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={onSimulateDrift}
            disabled={isSimulatingDrift}
            title="Inject anomalous demographic shifts to test real-time MLOps drift alert"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-300 transition-all hover:border-slate-600 shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-rose-400 ${isSimulatingDrift ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isSimulatingDrift ? 'Simulating...' : 'Test Data Drift'}</span>
          </button>

          <a
            href="/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border border-emerald-500/30 text-xs font-semibold text-emerald-400 transition-all shadow-sm"
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>Interactive API</span>
            <ExternalLink className="h-3 w-3 ml-0.5" />
          </a>
        </div>
      </div>
    </header>
  );
}
