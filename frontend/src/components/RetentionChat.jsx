import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, CheckCircle2, Gift, ChevronRight, MessageSquare, AlertCircle } from 'lucide-react';

export default function RetentionChat({ customer, churnProbability, topRiskFactors }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello! I am your Apex Bank Retention & Advisory Assistant. I am monitoring your client profile in our ${customer.geography === 'Germany' ? 'Central' : customer.geography === 'France' ? 'Western' : 'Southern'} regional branch. How can I assist you with your banking services today?`,
      offer: null
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentiment, setSentiment] = useState('NEUTRAL');
  const [activeOffer, setActiveOffer] = useState(null);
  const [offerClaimed, setOfferClaimed] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const quickPrompts = [
    "I am thinking of closing my account.",
    "Your international wire transfer fees are too high.",
    "Another bank is offering 5.2% APY on savings.",
    "What is my current total account balance?"
  ];

  const handleSend = async (textToSend) => {
    const messageText = textToSend || input;
    if (!messageText.trim() || loading) return;

    const userMessage = { role: 'user', content: messageText };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          customer_context: customer,
          churn_probability: churnProbability,
          top_risk_factors: topRiskFactors
        })
      });

      if (!response.ok) throw new Error('Chat API failed');
      const data = await response.json();

      setSentiment(data.sentiment);
      if (data.offer) {
        setActiveOffer(data.offer);
        setOfferClaimed(false);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply,
          offer: data.offer,
          actionTriggered: data.retention_action_triggered
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "I am having trouble connecting to the retention service. Please ensure the backend is active.",
          offer: null
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimOffer = (promo) => {
    setOfferClaimed(true);
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: `🎉 Benefit code [${promo}] has been successfully applied to your account. Your updated terms and fee waivers are now active.`,
        offer: null
      }
    ]);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col h-[680px]">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shadow-sm">
            <Bot className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>Autonomous Retention AI Agent</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </h3>
            <p className="text-xs text-slate-400">Context-Aware Real-Time Dialogue Engine</p>
          </div>
        </div>

        {/* Sentiment Indicator */}
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs font-mono">
          <span className="text-slate-400">Client Sentiment:</span>
          <span className={`font-bold ${
            sentiment === 'CHURN_RISK' || sentiment === 'FRUSTRATED'
              ? 'text-rose-400'
              : sentiment === 'SATISFIED'
              ? 'text-emerald-400'
              : 'text-slate-300'
          }`}>
            {sentiment}
          </span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start space-x-3 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="h-7 w-7 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="h-4 w-4 text-purple-400" />
              </div>
            )}

            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
              msg.role === 'user'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium rounded-tr-sm shadow-md'
                : 'bg-slate-950/80 border border-slate-800 text-slate-200 rounded-tl-sm shadow-sm'
            }`}>
              {msg.content}

              {/* In-chat retention offer card */}
              {msg.offer && (
                <div className="mt-3.5 p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-100 shadow-md">
                  <div className="flex items-center space-x-2 font-bold text-purple-300 mb-1 text-xs">
                    <Gift className="h-4 w-4 text-purple-400" />
                    <span>{msg.offer.title}</span>
                  </div>
                  <p className="text-[11px] text-purple-200/90 mb-3">{msg.offer.description}</p>
                  
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono text-[11px] px-2.5 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-500/30">
                      {msg.offer.promo_code}
                    </span>
                    {!offerClaimed ? (
                      <button
                        onClick={() => handleClaimOffer(msg.offer.promo_code)}
                        className="px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-[11px] transition-all flex items-center space-x-1 shadow-sm"
                      >
                        <span>{msg.offer.action_label}</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-400 font-semibold flex items-center space-x-1">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Benefit Applied to Account</span>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="h-7 w-7 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <User className="h-4 w-4 text-emerald-400" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-2 text-xs text-purple-400 animate-pulse pl-10">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Agent analyzing customer history and formulating tailored offer...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested English Scenarios */}
      <div className="py-2.5 flex items-center space-x-2 overflow-x-auto no-scrollbar border-t border-slate-800">
        <span className="text-[10px] text-slate-400 font-mono font-bold shrink-0">SCENARIOS:</span>
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            disabled={loading}
            className="text-[11px] px-3 py-1 rounded-full bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white shrink-0 transition-all font-medium"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="pt-2 flex items-center space-x-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type an inquiry or simulate client dissatisfaction (e.g. 'I want to close my account')..."
          disabled={loading}
          className="flex-1 bg-slate-950 border border-slate-800 focus:border-purple-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="h-10 w-10 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 disabled:hover:from-purple-600 disabled:hover:to-indigo-600 flex items-center justify-center text-white transition-all shrink-0 shadow-md"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
