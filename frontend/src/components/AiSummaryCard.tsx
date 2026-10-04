import React from 'react';
import { Sparkles, Info, RefreshCw, AlertTriangle } from 'lucide-react';

interface AiSummaryCardProps {
  aiSummary?: string;
  isLoading: boolean;
  onRetryAnalysis?: () => void;
  analysisError?: string | null;
}

export const AiSummaryCard: React.FC<AiSummaryCardProps> = ({
  aiSummary,
  isLoading,
  onRetryAnalysis,
  analysisError,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 shrink-0">
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
          <div className="h-4 bg-slate-800/80 rounded w-full"></div>
          <div className="h-4 bg-slate-800/80 rounded w-5/6"></div>
          <div className="h-4 bg-slate-800/80 rounded w-4/6"></div>
        </div>
      ) : !aiSummary && analysisError ? (
        <div className="text-xs text-amber-200 bg-amber-950/40 border border-amber-800/50 rounded-lg p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Analysis Insights unavailable until portfolio analysis is refreshed.</span>
          </div>
          {onRetryAnalysis && (
            <button
              onClick={onRetryAnalysis}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-900 hover:bg-amber-800 text-amber-100 text-[11px] font-semibold rounded-md transition-colors shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          )}
        </div>
      ) : (
        <div className="text-sm text-slate-200 leading-relaxed bg-slate-950/60 border border-slate-800/40 rounded-lg p-4">
          <p className="whitespace-pre-line">{aiSummary || 'No summary available.'}</p>
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 flex-wrap gap-2">
        <span className="flex items-center gap-1">
          <Info className="w-3 h-3 text-slate-400 shrink-0" />
          Factual evaluation generated from portfolio state.
        </span>
        <span className="text-slate-400 font-medium">Not investment advice</span>
      </div>
    </div>
  );
};


