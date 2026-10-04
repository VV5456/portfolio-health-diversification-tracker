import React from 'react';
import { RefreshCw, Activity, ShieldCheck } from 'lucide-react';
import { formatTime } from '../utils/formatters';

interface HeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
  lastUpdated?: string;
  holdingCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onRefresh,
  isLoading,
  lastUpdated,
  holdingCount,
}) => {
  return (
    <header className="bg-slate-900/90 border-b border-slate-800/80 sticky top-0 z-30 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          
          {/* Title & Brand */}
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white truncate">
                  BharatBuilds <span className="text-emerald-400">Portfolio Tracker</span>
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-950/90 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded-full shrink-0">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Live AWS API
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                Equity valuation, target drift & AI risk analysis
              </p>
            </div>
          </div>

          {/* Refresh Action & Sync Status */}
          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60 shrink-0">
            {lastUpdated ? (
              <div className="text-left sm:text-right text-xs text-slate-400">
                <div className="flex items-center gap-1.5 sm:justify-end">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-slate-400 text-[11px]">Synced:</span>
                  <span className="font-mono font-medium text-slate-200 text-xs">{formatTime(lastUpdated)}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {holdingCount} active {holdingCount === 1 ? 'position' : 'positions'}
                </div>
              </div>
            ) : (
              <div className="text-left sm:text-right text-xs text-slate-500 italic">
                Awaiting initial sync...
              </div>
            )}

            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 active:bg-slate-800 border border-slate-700/80 rounded-lg shadow-sm transition-all disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shrink-0 min-h-[38px]"
              title="Recalculate portfolio analysis"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : 'text-slate-300'}`} />
              <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

