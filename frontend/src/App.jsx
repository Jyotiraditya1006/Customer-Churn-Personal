import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import FeatureAttribution from './components/FeatureAttribution';
import RetentionChat from './components/RetentionChat';
import ModelTelemetry from './components/ModelTelemetry';
import { 
  Gauge, 
  Users, 
  Sliders, 
  MessageSquare, 
  Activity, 
  ShieldAlert, 
  Check, 
  RefreshCw, 
  DollarSign, 
  CreditCard, 
  Zap,
  TrendingDown,
  TrendingUp,
  Award,
  Sparkles,
  Gift,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

const INITIAL_CUSTOMER = {
  credit_score: 542,
  geography: 'North America',
  gender: 'Female',
  age: 54,
  tenure: 2,
  balance: 195400.00,
  num_products: 1,
  has_credit_card: 1,
  is_active_member: 0,
  estimated_salary: 148000.00
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
  const [retentionApplied, setRetentionApplied] = useState(false);
  const debounceTimer = useRef(null);

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
    setRetentionApplied(false);
    runInference(preset.features);
  };

  const handleFieldChange = (field, value) => {
    const updated = { ...customer, [field]: value };
    setCustomer(updated);
    setSelectedPresetId('custom');
    setRetentionApplied(false);

    // Instant real-time debounced evaluation
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      runInference(updated);
    }, 180);
  };

  // Interactive retention intervention simulation
  const handleToggleRetention = () => {
    if (!retentionApplied) {
      // Simulate client reactivation + second product bundle
      const updated = {
        ...customer,
        is_active_member: 1,
        num_products: Math.min(2, Math.max(customer.num_products, 2))
      };
      setCustomer(updated);
      setRetentionApplied(true);
      runInference(updated);
    } else {
      // Reset back to initial preset
      const original = presets.find((p) => p.id === selectedPresetId)?.features || INITIAL_CUSTOMER;
      setCustomer(original);
      setRetentionApplied(false);
      runInference(original);
    }
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

  const getCreditRating = (score) => {
    if (score >= 750) return { label: 'Excellent', color: 'text-emerald-400' };
    if (score >= 700) return { label: 'Good', color: 'text-teal-400' };
    if (score >= 600) return { label: 'Fair', color: 'text-amber-400' };
    return { label: 'Poor', color: 'text-rose-400' };
  };

  const creditRating = getCreditRating(customer.credit_score);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      <Navbar
        latency={prediction?.latency_ms}
        driftStatus={driftData?.status}
        onSimulateDrift={handleSimulateDrift}
        isSimulatingDrift={isSimulatingDrift}
      />

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col space-y-6">
        
        {/* Top Executive KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm backdrop-blur-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
              <span>ATTRITION RISK LEVEL</span>
              <ShieldAlert className={`h-4 w-4 ${churnProb >= 0.7 ? 'text-rose-400' : churnProb >= 0.4 ? 'text-amber-400' : 'text-emerald-400'}`} />
            </div>
            <div className={`font-mono text-xl sm:text-2xl font-black ${
              churnProb >= 0.70 ? 'text-rose-400' : churnProb >= 0.40 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {prediction?.risk_tier || 'CRITICAL'} RISK
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Probability: <span className="font-semibold text-white">{churnPct}%</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm backdrop-blur-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
              <span>PRIMARY BALANCE</span>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="font-mono text-xl sm:text-2xl font-black text-white">
              ${customer.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Activity: <span className={`font-semibold ${customer.is_active_member === 1 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {customer.is_active_member === 1 ? 'Active Account' : 'Dormant (90+ Days)'}
              </span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm backdrop-blur-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
              <span>CREDIT STANDING (FICO)</span>
              <Award className="h-4 w-4 text-blue-400" />
            </div>
            <div className="font-mono text-xl sm:text-2xl font-black text-white flex items-baseline space-x-2">
              <span>{customer.credit_score}</span>
              <span className={`text-xs font-semibold ${creditRating.color}`}>({creditRating.label})</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Credit Card: <span className="font-semibold text-white">{customer.has_credit_card === 1 ? 'Active Card' : 'None'}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm backdrop-blur-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
              <span>MODEL INFERENCE SPEED</span>
              <Zap className="h-4 w-4 text-amber-400" />
            </div>
            <div className="font-mono text-xl sm:text-2xl font-black text-amber-400">
              {prediction?.latency_ms?.toFixed(2) || '0.09'} ms
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Engine: <span className="font-semibold text-white">ONNX Runtime Graph</span>
            </div>
          </div>

        </div>

        {/* Persona Showcase Deck (Instant 1-Click Cards) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 tracking-wider flex items-center space-x-1.5">
              <Users className="h-3.5 w-3.5 text-emerald-400" />
              <span>TESTED CLIENT PERSONAS (SELECT TO LOAD):</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
              Instant sub-millisecond evaluation
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {presets.map((p) => {
              const isSelected = selectedPresetId === p.id;
              const initials = p.name.split(' ').map((n) => n[0]).join('');
              const isRiskHigh = p.id === 'critical_flight_risk' || p.id === 'dormant_credit_card';

              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectPreset(p)}
                  className={`p-3.5 rounded-2xl border text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-800/90 border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg'
                      : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900 text-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2.5">
                      <div className={`h-8 w-8 rounded-xl font-bold font-mono text-xs flex items-center justify-center ${
                        isRiskHigh ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {initials}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white leading-tight">{p.name}</div>
                        <div className="text-[10px] text-slate-400 leading-tight">{p.tag}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-400 leading-snug line-clamp-2 mt-1">
                    {p.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-3">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              activeTab === 'dashboard'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Gauge className="h-4 w-4" />
            <span>Customer Risk & Explainability Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              activeTab === 'chat'
                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Autonomous Retention AI Agent</span>
          </button>

          <button
            onClick={() => setActiveTab('telemetry')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              activeTab === 'telemetry'
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>MLOps Telemetry & Latency Benchmarks</span>
          </button>
        </div>

        {/* Tab 1: Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Customer Profile Configurator (5 cols) */}
            <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col space-y-5">
              
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Sliders className="h-4 w-4 text-emerald-400" />
                    <span>Client Telemetry Tuning</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Adjust sliders to see instant real-time risk updates.</p>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Live Reactive
                </span>
              </div>

              {/* Attributes Form */}
              <div className="space-y-4 pt-1 text-xs">
                
                {/* Regional Branch & Gender */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">Global Region & Branch</label>
                    <select
                      value={customer.geography}
                      onChange={(e) => handleFieldChange('geography', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none font-medium"
                    >
                      <option value="North America">North America (US & Canada)</option>
                      <option value="Europe & UK">Europe & UK (London & EU)</option>
                      <option value="Asia-Pacific">Asia-Pacific (Singapore, Tokyo, Sydney)</option>
                      <option value="South Asia">South Asia (Mumbai & Delhi)</option>
                      <option value="Middle East">Middle East (Dubai & Riyadh)</option>
                      <option value="Latin America">Latin America (São Paulo & Mexico City)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">Client Gender</label>
                    <select
                      value={customer.gender}
                      onChange={(e) => handleFieldChange('gender', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none font-medium"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </select>
                  </div>
                </div>

                {/* Age Slider */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400 font-medium">Customer Age</span>
                    <span className="font-mono text-emerald-400 font-bold">{customer.age} years</span>
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
                    <span className="text-slate-400 font-medium">Credit Score (FICO)</span>
                    <span className="font-mono text-emerald-400 font-bold">{customer.credit_score}</span>
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
                    <span className="text-slate-400 font-medium">Primary Account Balance</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      ${customer.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="500000"
                    step="5000"
                    value={customer.balance}
                    onChange={(e) => handleFieldChange('balance', parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                    <span>$0 (Zero Bal)</span>
                    <span>$250,000 (Premier)</span>
                    <span>$500,000+ (Private Wealth)</span>
                  </div>
                </div>

                {/* Products Count */}
                <div>
                  <label className="text-slate-400 block mb-1.5 font-medium">Banking Accounts / Products Held</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleFieldChange('num_products', num)}
                        className={`py-2 rounded-xl border font-mono font-bold transition-all shadow-sm ${
                          customer.num_products === num
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 ring-1 ring-emerald-400'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {num} {num === 1 ? 'Product' : 'Products'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Monthly Activity & Credit Card */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleFieldChange('is_active_member', customer.is_active_member === 1 ? 0 : 1)}
                    className={`p-3 rounded-xl border text-left transition-all shadow-sm ${
                      customer.is_active_member === 1
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="block text-[11px] opacity-80">Monthly Activity</span>
                    <span className="font-bold text-xs">
                      {customer.is_active_member === 1 ? '✓ Active Client' : '✕ Dormant (90+ Days)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFieldChange('has_credit_card', customer.has_credit_card === 1 ? 0 : 1)}
                    className={`p-3 rounded-xl border text-left transition-all shadow-sm ${
                      customer.has_credit_card === 1
                        ? 'bg-blue-950/40 border-blue-500/50 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="block text-[11px] opacity-80">Credit Card</span>
                    <span className="font-bold text-xs">
                      {customer.has_credit_card === 1 ? '✓ Active Cardholder' : '✕ No Card'}
                    </span>
                  </button>
                </div>

              </div>

              {/* Instant Re-evaluate Button */}
              <button
                onClick={() => runInference(customer)}
                disabled={loading}
                className="w-full mt-2 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 transition-all"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Evaluating Tensor Graph...</span>
                  </>
                ) : (
                  <>
                    <Gauge className="h-4 w-4" />
                    <span>Re-evaluate Customer Risk</span>
                  </>
                )}
              </button>

            </div>

            {/* Right Column: Risk Gauge & Explainability Waterfall (7 cols) */}
            <div className="lg:col-span-7 flex flex-col space-y-6">
              
              {/* Risk Gauge Card */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
                
                {/* Circular Gauge Visual */}
                <div className="relative flex items-center justify-center shrink-0">
                  <svg className="w-40 h-40 transform -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="65"
                      stroke="#1e293b"
                      strokeWidth="14"
                      fill="transparent"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="65"
                      stroke={
                        churnProb >= 0.70
                          ? '#f43f5e'
                          : churnProb >= 0.40
                          ? '#f59e0b'
                          : '#10b981'
                      }
                      strokeWidth="14"
                      strokeDasharray={408.4}
                      strokeDashoffset={408.4 - (408.4 * churnProb)}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="font-mono text-3xl sm:text-4xl font-black text-white tracking-tight">
                      {churnPct}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">CHURN RISK</span>
                  </div>
                </div>

                {/* Risk Tier & Recommended Policy */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400 font-medium">ASSESSED TIER:</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-mono font-extrabold ${
                      churnProb >= 0.70
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        : churnProb >= 0.40
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {prediction?.risk_tier || 'CRITICAL'} RISK
                    </span>
                  </div>

                  <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-xs">
                    <span className="font-bold text-slate-200 block mb-1">
                      Recommended Retention Intervention
                    </span>
                    <p className="text-slate-400 leading-relaxed font-normal">
                      {prediction?.action_recommended || 'Immediate retention protocol authorization required.'}
                    </p>
                  </div>

                  {/* Interactive Retention Simulation Button */}
                  <div className="pt-1">
                    <button
                      onClick={handleToggleRetention}
                      className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                        retentionApplied
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                          : 'bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20'
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>
                        {retentionApplied
                          ? '✓ Retention Applied: Revert to Base Telemetry'
                          : '⚡ Simulate Retention Impact (Activate Perks & APY Boost)'}
                      </span>
                    </button>
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
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-400 font-mono">
        Aegis FinTech Platform • Built with PyTorch Tabular ResNet, ONNX Runtime, FastAPI & React
      </footer>
    </div>
  );
}
