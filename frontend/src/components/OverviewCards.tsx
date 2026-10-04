import React from 'react';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, PieChart, ShieldAlert } from 'lucide-react';
import { PortfolioAnalysis } from '../types';
import { formatCurrency, formatPercent } from '../utils/formatters';

interface OverviewCardsProps {
  analysis: PortfolioAnalysis | null;
  isLoading: boolean;
}

export const OverviewCards: React.FC<OverviewCardsProps> = ({ analysis, isLoading }) => {
  if (isLoading && !analysis) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-slate-900 border border-slate-800/80 rounded-xl p-4">
            <div className="h-4 bg-slate-800/80 rounded w-1/2 mb-3"></div>
            <div className="h-7 bg-slate-800/80 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-slate-800/50 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  const totalValue = analysis?.totalValue ?? 0;
  const totalInvested = analysis?.totalInvested ?? 0;
  const totalGainLoss = analysis?.totalGainLoss ?? 0;
  const gainLossPercent = analysis?.gainLossPercent ?? 0;
  const isPositive = totalGainLoss >= 0;

  const flag = analysis?.concentration?.flag ?? 'low';
  const top1Percent = analysis?.concentration?.top1Percent ?? 0;
  const top3Percent = analysis?.concentration?.top3Percent ?? 0;
  const top1Symbol = analysis?.concentration?.top1Symbol;

  const flagBadgeColor =
    flag === 'high'
      ? 'bg-rose-950/90 text-rose-300 border-rose-800/80'
      : flag === 'moderate'
      ? 'bg-amber-950/90 text-amber-300 border-amber-800/80'
      : 'bg-emerald-950/90 text-emerald-300 border-emerald-800/80';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Valuation */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 shadow-sm hover:border-slate-700/80 transition-colors flex flex-col justify-between min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Valuation</span>
          <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-white tracking-tight font-mono truncate">
          {formatCurrency(totalValue)}
        </div>
        <p className="mt-1 text-xs text-slate-400 truncate">Current market value of positions</p>
      </div>

      {/* 2. Total Invested */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 shadow-sm hover:border-slate-700/80 transition-colors flex flex-col justify-between min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Invested</span>
          <div className="p-2 rounded-lg bg-blue-950/60 border border-blue-800/40 text-blue-400 shrink-0">
            <PiggyBank className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-white tracking-tight font-mono truncate">
          {formatCurrency(totalInvested)}
        </div>
        <p className="mt-1 text-xs text-slate-400 truncate">Total cost basis of holdings</p>
      </div>

      {/* 3. Total Gain / Loss */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 shadow-sm hover:border-slate-700/80 transition-colors flex flex-col justify-between min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Gain / Loss</span>
          <div
            className={`p-2 rounded-lg border shrink-0 ${
              isPositive
                ? 'bg-emerald-950/60 border-emerald-800/40 text-emerald-400'
                : 'bg-rose-950/60 border-rose-800/40 text-rose-400'
            }`}
          >
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2 min-w-0">
          <span className={`text-2xl font-bold tracking-tight font-mono truncate ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? `+${formatCurrency(totalGainLoss)}` : formatCurrency(totalGainLoss)}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold truncate">
          <span className={isPositive ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}>
            {formatPercent(gainLossPercent)}
          </span>
          <span className="text-slate-500 font-normal">overall return</span>
        </div>
      </div>

      {/* 4. Concentration Risk (Compact Overview) */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 shadow-sm hover:border-slate-700/80 transition-colors flex flex-col justify-between min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Concentration Risk</span>
          <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 shrink-0">
            <PieChart className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between flex-wrap gap-1.5 min-w-0">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold uppercase rounded-md border shrink-0 ${flagBadgeColor}`}
          >
            <ShieldAlert className="w-3 h-3" />
            {flag} Risk
          </span>
          <span className="text-right font-mono text-xs text-slate-300 font-semibold shrink-0">
            Top 3: {top3Percent.toFixed(1)}%
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-400 pt-1.5 border-t border-slate-800/80 min-w-0">
          <span className="truncate">Largest Position:</span>
          <span className="font-mono font-semibold text-slate-200 shrink-0 ml-1">
            {top1Symbol ? `${top1Symbol} (${top1Percent.toFixed(1)}%)` : `${top1Percent.toFixed(1)}%`}
          </span>
        </div>
      </div>
    </div>
  );
};

