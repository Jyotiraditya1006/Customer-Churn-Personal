import React from 'react';
import { ShieldAlert, Cpu, Activity, ExternalLink, Zap, Terminal } from 'lucide-react';

export default function Navbar({ latency, driftStatus, onSimulateDrift, isSimulatingDrift }) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldAlert className="h-6 w-6 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">AEGIS</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20">
                PROD v2.0
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Enterprise FinTech Churn Intelligence & Retention Platform
            </p>
          </div>
        </div>

        {/* Telemetry Pills */}
        <div className="hidden md:flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs font-mono text-slate-300">
            <Cpu className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-slate-400">Engine:</span>
            <span className="text-blue-400 font-semibold">ONNX Runtime</span>
          </div>

          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs font-mono text-slate-300">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-slate-400">P99 Latency:</span>
            <span className="text-amber-400 font-semibold">{latency ? `${latency.toFixed(2)}ms` : '0.09ms'}</span>
          </div>

          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs font-mono text-slate-300">
            <Activity className={`h-3.5 w-3.5 ${driftStatus === 'HEALTHY' ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}`} />
            <span className="text-slate-400">Data Drift:</span>
            <span className={driftStatus === 'HEALTHY' ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-bold'}>
              {driftStatus || 'HEALTHY'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onSimulateDrift}
            disabled={isSimulatingDrift}
            title="Inject anomalous distribution to trigger real-time MLOps drift alert"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 transition-colors"
          >
            <Activity className="h-3.5 w-3.5 text-rose-400" />
            <span>{isSimulatingDrift ? 'Simulating...' : 'Simulate Drift'}</span>
          </button>

          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-medium text-emerald-400 transition-colors"
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>FastAPI Docs</span>
            <ExternalLink className="h-3 w-3 ml-0.5" />
          </a>
        </div>
      </div>
    </header>
  );
}
