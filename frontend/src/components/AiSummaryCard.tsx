import React from 'react';
import { Sparkles, Info } from 'lucide-react';

interface AiSummaryCardProps {
  aiSummary?: string;
  isLoading: boolean;
}

export const AiSummaryCard: React.FC<AiSummaryCardProps> = ({ aiSummary, isLoading }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-800/60 text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Portfolio Insights
            </h3>
            <p className="text-xs text-slate-400">Analysis derived from computed portfolio metrics</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2 py-2 animate-pulse">
          <div className="h-4 bg-slate-800 rounded w-full"></div>
          <div className="h-4 bg-slate-800 rounded w-5/6"></div>
          <div className="h-4 bg-slate-800 rounded w-4/6"></div>
        </div>
      ) : (
        <div className="text-sm text-slate-200 leading-relaxed bg-slate-950 border border-slate-800/80 rounded-lg p-4">
          <p className="whitespace-pre-line">{aiSummary || 'No summary available.'}</p>
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
        <span className="flex items-center gap-1">
          <Info className="w-3 h-3 text-slate-400" />
          Factual evaluation generated from portfolio state.
        </span>
        <span className="text-slate-400 font-medium">Not investment advice</span>
      </div>
    </div>
  );
};
