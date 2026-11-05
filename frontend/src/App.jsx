import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import FeatureAttribution from './components/FeatureAttribution';
import RetentionChat from './components/RetentionChat';
import ModelTelemetry from './components/ModelTelemetry';
import { Gauge, Users, Sliders, MessageSquare, Activity, ShieldAlert, Check, RefreshCw } from 'lucide-react';

const INITIAL_CUSTOMER = {
  credit_score: 528,
  geography: 'Germany',
  gender: 'Female',
  age: 54,
  tenure: 2,
  balance: 142380.50,
  num_products: 1,
  has_credit_card: 1,
  is_active_member: 0,
  estimated_salary: 118400.00
};

export default function App() {
  const [customer, setCustomer] = useState(INITIAL_CUSTOMER);
  const [presets, setPresets] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState('critical_flight_risk');
  const [prediction, setPrediction] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [driftData, setDriftData] = useState(null);
  const [modelMetrics, setModelMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSimulatingDrift, setIsSimulatingDrift] = useState(false);

  // Fetch presets, metrics, and drift status on initial load
  useEffect(() => {
    fetchPresets();
    fetchDrift();
    fetchMetrics();
    runInference(INITIAL_CUSTOMER);
  }, []);

  const fetchPresets = async () => {
    try {
      const res = await fetch('/api/v1/churn/presets');
      if (res.ok) {
        const data = await res.json();
        setPresets(data);
      }
    } catch (e) {
      console.error("Could not fetch presets", e);
    }
  };

  const fetchDrift = async () => {
    try {
      const res = await fetch('/api/v1/telemetry/drift');
      if (res.ok) {
        const data = await res.json();
        setDriftData(data);
      }
    } catch (e) {
      console.error("Could not fetch drift telemetry", e);
    }
  };

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/v1/telemetry/metrics');
      if (res.ok) {
        const data = await res.json();
        setModelMetrics(data);
      }
    } catch (e) {
      console.error("Could not fetch model metrics", e);
    }
  };

  const runInference = async (targetCustomer) => {
    setLoading(true);
    try {
      const [predRes, expRes] = await Promise.all([
        fetch('/api/v1/churn/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(targetCustomer)
        }),
        fetch('/api/v1/churn/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(targetCustomer)
        })
      ]);

      if (predRes.ok && expRes.ok) {
        const predData = await predRes.json();
        const expData = await expRes.json();
        setPrediction(predData);
        setExplanation(expData);
      }
      fetchDrift();
    } catch (err) {
      console.error("Inference call failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (preset) => {
    setSelectedPresetId(preset.id);
    setCustomer(preset.features);
    runInference(preset.features);
  };

  const handleFieldChange = (field, value) => {
    const updated = { ...customer, [field]: value };
    setCustomer(updated);
    setSelectedPresetId('custom');
  };

  const handleSimulateDrift = async () => {
    setIsSimulatingDrift(true);
    try {
      const res = await fetch('/api/v1/telemetry/simulate-drift', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setDriftData(data);
      }
    } catch (e) {
      console.error("Drift simulation failed", e);
    } finally {
      setIsSimulatingDrift(false);
    }
  };

  const churnProb = prediction ? prediction.churn_probability : 0.82;
  const churnPct = Math.round(churnProb * 100);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        latency={prediction?.latency_ms}
        driftStatus={driftData?.status}
        onSimulateDrift={handleSimulateDrift}
        isSimulatingDrift={isSimulatingDrift}
      />

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Gauge className="h-4 w-4" />
            <span>Churn Risk & XAI Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'chat'
                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Autonomous Retention Agent</span>
          </button>

          <button
            onClick={() => setActiveTab('telemetry')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'telemetry'
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>MLOps & Latency Benchmarks</span>
          </button>
        </div>

        {/* Tab 1: Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Customer Profile Configurator (5 cols) */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col space-y-5">
              
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
                  <Sliders className="h-4 w-4 text-emerald-400" />
                  <span>Customer Profile Configurator</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Select a pre-built persona or tune telemetry attributes.</p>
              </div>

              {/* Persona Chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-slate-400">PERSONA PRESETS:</span>
                <div className="grid grid-cols-2 gap-2">
                  {presets.map((p) => {
                    const isSelected = selectedPresetId === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPreset(p)}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                          isSelected
                            ? 'bg-slate-800 border-emerald-500/60 ring-1 ring-emerald-500/30'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="font-semibold text-slate-100 flex items-center justify-between">
                          <span>{p.name}</span>
                          {isSelected && <Check className="h-3 w-3 text-emerald-400" />}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">{p.tag}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slider / Attribute Form */}
              <div className="space-y-4 pt-2 border-t border-slate-800 text-xs">
                
                {/* Region & Gender */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Regional Market</label>
                    <select
                      value={customer.geography}
                      onChange={(e) => handleFieldChange('geography', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="France">France</option>
                      <option value="Germany">Germany (High Churn)</option>
                      <option value="Spain">Spain</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Gender</label>
                    <select
                      value={customer.gender}
                      onChange={(e) => handleFieldChange('gender', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </select>
                  </div>
                </div>

                {/* Age Slider */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Customer Age</span>
                    <span className="font-mono text-emerald-400 font-semibold">{customer.age} years</span>
                  </div>
                  <input
                    type="range"
                    min="18"
                    max="80"
                    value={customer.age}
                    onChange={(e) => handleFieldChange('age', parseInt(e.target.value))}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Credit Score Slider */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">FICO Credit Score</span>
                    <span className="font-mono text-emerald-400 font-semibold">{customer.credit_score}</span>
                  </div>
                  <input
                    type="range"
                    min="350"
                    max="850"
                    value={customer.credit_score}
                    onChange={(e) => handleFieldChange('credit_score', parseInt(e.target.value))}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Balance Slider */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Account Balance</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      ${customer.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="220000"
                    step="2500"
                    value={customer.balance}
                    onChange={(e) => handleFieldChange('balance', parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Products Count */}
                <div>
                  <label className="text-slate-400 block mb-1.5">Number of Products Held</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleFieldChange('num_products', num)}
                        className={`py-1.5 rounded-lg border font-mono font-semibold transition-colors ${
                          customer.num_products === num
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Activity & Credit Card */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleFieldChange('is_active_member', customer.is_active_member === 1 ? 0 : 1)}
                    className={`p-2.5 rounded-xl border text-left transition-colors ${
                      customer.is_active_member === 1
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="block text-[11px]">Monthly Activity</span>
                    <span className="font-semibold text-xs">
                      {customer.is_active_member === 1 ? '✓ Active Member' : '✕ Dormant'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFieldChange('has_credit_card', customer.has_credit_card === 1 ? 0 : 1)}
                    className={`p-2.5 rounded-xl border text-left transition-colors ${
                      customer.has_credit_card === 1
                        ? 'bg-blue-950/40 border-blue-500/50 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="block text-[11px]">Credit Card</span>
                    <span className="font-semibold text-xs">
                      {customer.has_credit_card === 1 ? '✓ Cardholder' : '✕ No Card'}
                    </span>
                  </button>
                </div>

              </div>

              {/* Evaluate Button */}
              <button
                onClick={() => runInference(customer)}
                disabled={loading}
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 transition-all"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Evaluating Tensor Graph...</span>
                  </>
                ) : (
                  <>
                    <Gauge className="h-4 w-4" />
                    <span>Re-evaluate Churn Probability</span>
                  </>
                )}
              </button>

            </div>

            {/* Right Column: Risk Gauge & XAI Waterfall (7 cols) */}
            <div className="lg:col-span-7 flex flex-col space-y-6">
              
              {/* Risk Gauge Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
                
                {/* Circular Gauge Visual */}
                <div className="relative flex items-center justify-center shrink-0">
                  <svg className="w-36 h-36 transform -rotate-90">
                    <circle
                      cx="72"
                      cy="72"
                      r="58"
                      stroke="#1e293b"
                      strokeWidth="12"
                      fill="transparent"
                    />
                    <circle
                      cx="72"
                      cy="72"
                      r="58"
                      stroke={
                        churnProb >= 0.70
                          ? '#f43f5e'
                          : churnProb >= 0.40
                          ? '#f59e0b'
                          : '#10b981'
                      }
                      strokeWidth="12"
                      strokeDasharray={364.4}
                      strokeDashoffset={364.4 - (364.4 * churnProb)}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="font-mono text-3xl font-extrabold text-white tracking-tight">
                      {churnPct}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">CHURN PROB</span>
                  </div>
                </div>

                {/* Risk Tier & Recommended Policy */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400">ASSESSED RISK TIER:</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                      churnProb >= 0.70
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        : churnProb >= 0.40
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {prediction?.risk_tier || 'CRITICAL'}
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-xs">
                    <span className="font-semibold text-slate-300 block mb-1">
                      Recommended Retention Intervention
                    </span>
                    <p className="text-slate-400 leading-relaxed">
                      {prediction?.action_recommended || 'Immediate retention protocol authorization required.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                    <span>Engine: {prediction?.model_version || 'ONNX'}</span>
                    <span>Latency: {prediction?.latency_ms?.toFixed(2) || '0.09'}ms</span>
                  </div>
                </div>

              </div>

              {/* Explainable AI Attribution */}
              <FeatureAttribution explanation={explanation} loading={loading} />

            </div>

          </div>
        )}

        {/* Tab 2: Autonomous Retention Chatbot */}
        {activeTab === 'chat' && (
          <div className="max-w-4xl mx-auto w-full">
            <RetentionChat
              customer={customer}
              churnProbability={churnProb}
              topRiskFactors={explanation?.top_risk_factors || []}
            />
          </div>
        )}

        {/* Tab 3: MLOps Telemetry */}
        {activeTab === 'telemetry' && (
          <ModelTelemetry
            driftData={driftData}
            modelMetrics={modelMetrics}
            onSimulateDrift={handleSimulateDrift}
            isSimulating={isSimulatingDrift}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-4 text-center text-xs text-slate-400 font-mono">
        Aegis FinTech Platform • Built with PyTorch Tabular ResNet, ONNX Runtime, FastAPI & React
      </footer>
    </div>
  );
}
