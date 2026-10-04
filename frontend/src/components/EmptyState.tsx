import React from 'react';
import { PlusCircle, ShieldCheck, Zap, BarChart2, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  onAddFirstHolding: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onAddFirstHolding }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center shadow-lg space-y-6">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950">
        <BarChart2 className="w-8 h-8" />
      </div>

      <div className="max-w-md mx-auto space-y-2">
        <h3 className="text-xl font-bold text-white tracking-tight">Your Portfolio is Empty</h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          Add your Indian equity stock positions to calculate real-time valuation, gain/loss, sector weights, concentration risk, and plain-language AI insights.
        </p>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto text-left pt-2">
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-400">
            <Zap className="w-3.5 h-3.5" />
            <span>Valuation & Return</span>
          </div>
          <p className="text-[11px] text-slate-400">Near live market prices, total cost basis, and gain/loss.</p>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-blue-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Sector & Drift</span>
          </div>
          <p className="text-[11px] text-slate-400">Automated sector tagging and target drift tracking.</p>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-purple-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Risk Summary</span>
          </div>
          <p className="text-[11px] text-slate-400">Plain-language factual analysis by Bedrock LLM.</p>
        </div>
      </div>

      <div>
        <button
          onClick={onAddFirstHolding}
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-950 hover:scale-105"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Your First Holding</span>
        </button>
      </div>
    </div>
  );
};
