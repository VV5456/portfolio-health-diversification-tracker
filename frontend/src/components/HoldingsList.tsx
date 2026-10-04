import React from 'react';
import { Edit2, Trash2, Clock, Layers, TrendingUp, TrendingDown } from 'lucide-react';
import { CalculatedHolding } from '../types';
import { formatCurrency, formatPercent } from '../utils/formatters';

interface HoldingsListProps {
  holdings: CalculatedHolding[];
  onEdit: (holding: CalculatedHolding) => void;
  onDeleteRequest: (stockSymbol: string) => void;
  isLoading: boolean;
}

export const HoldingsList: React.FC<HoldingsListProps> = ({
  holdings,
  onEdit,
  onDeleteRequest,
  isLoading,
}) => {
  if (isLoading && holdings.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 space-y-4 animate-pulse">
        <div className="h-6 bg-slate-800/80 rounded w-1/4 mb-4"></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-slate-800/50 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (holdings.length === 0) {
    return null; // Handled by EmptyState
  }

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
            Portfolio Holdings ({holdings.length})
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Valuation, invested capital, gain/loss and portfolio weight</p>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-800/80">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800/80">
            <tr>
              <th className="py-2.5 px-2.5">Symbol</th>
              <th className="py-2.5 px-2">Sector</th>
              <th className="py-2.5 px-2 text-right">Qty</th>
              <th className="py-2.5 px-2 text-right">Avg Price</th>
              <th className="py-2.5 px-2 text-right">Current Price</th>
              <th className="py-2.5 px-2 text-right">Invested</th>
              <th className="py-2.5 px-2 text-right">Current Value</th>
              <th className="py-2.5 px-2 text-right">Gain / Loss</th>
              <th className="py-2.5 px-2 text-right">Weight</th>
              <th className="py-2.5 px-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 bg-slate-900/50">
            {holdings.map((h) => {
              const isGain = h.gainLoss >= 0;
              return (
                <tr key={h.stockSymbol} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2 px-2.5 font-bold text-white whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-slate-950 px-1.5 py-0.5 rounded text-xs font-mono text-emerald-300 border border-slate-800">
                        {h.stockSymbol}
                      </span>
                      {h.isPriceCached && (
                        <span
                          className="inline-flex items-center gap-0.5 text-[9px] font-medium bg-amber-950/80 text-amber-400 border border-amber-800/80 px-1 py-0.5 rounded shrink-0"
                          title={`Price cached from ${h.lastFetchedAt ? new Date(h.lastFetchedAt).toLocaleTimeString() : 'previous fetch'}`}
                        >
                          <Clock className="w-2.5 h-2.5" />
                          Cached
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-2 text-slate-300 whitespace-nowrap">
                    <span className="bg-slate-950/80 text-slate-300 px-1.5 py-0.5 rounded text-[10px] border border-slate-800/60">
                      {h.sector || 'Unassigned'}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-slate-200 whitespace-nowrap">{h.quantity}</td>
                  <td className="py-2 px-2 text-right font-mono text-slate-300 whitespace-nowrap">{formatCurrency(h.avgBuyPrice)}</td>
                  <td className="py-2 px-2 text-right font-mono text-slate-100 font-semibold whitespace-nowrap">{formatCurrency(h.currentPrice)}</td>
                  <td className="py-2 px-2 text-right font-mono text-slate-400 whitespace-nowrap">{formatCurrency(h.investedValue)}</td>
                  <td className="py-2 px-2 text-right font-mono text-white font-bold whitespace-nowrap">{formatCurrency(h.currentValue)}</td>
                  <td className="py-2 px-2 text-right font-mono font-semibold whitespace-nowrap">
                    <div className={`inline-flex items-center gap-1 ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isGain ? <TrendingUp className="w-3 h-3 shrink-0" /> : <TrendingDown className="w-3 h-3 shrink-0" />}
                      <span>{isGain ? `+${formatCurrency(h.gainLoss)}` : formatCurrency(h.gainLoss)}</span>
                    </div>
                    <div className={`text-[10px] ${isGain ? 'text-emerald-500/90' : 'text-rose-500/90'}`}>
                      ({formatPercent(h.gainLossPercent)})
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-semibold text-slate-200 whitespace-nowrap">
                    {h.weightPercent.toFixed(1)}%
                  </td>
                  <td className="py-2 px-2 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center space-x-0.5">
                      <button
                        onClick={() => onEdit(h)}
                        className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors focus:outline-none"
                        title="Edit holding"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteRequest(h.stockSymbol)}
                        className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors focus:outline-none"
                        title="Delete holding"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View */}
      <div className="md:hidden space-y-3">
        {holdings.map((h) => {
          const isGain = h.gainLoss >= 0;
          return (
            <div key={h.stockSymbol} className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-3 shadow-sm">
              {/* Header Row: Symbol, Badges, Action Buttons */}
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="font-mono font-bold text-emerald-400 text-sm bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                    {h.stockSymbol}
                  </span>
                  <span className="text-[11px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300 truncate">
                    {h.sector || 'General'}
                  </span>
                  {h.isPriceCached && (
                    <span className="text-[10px] bg-amber-950/90 text-amber-400 border border-amber-800/80 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                      <Clock className="w-2.5 h-2.5" />
                      Cached
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={() => onEdit(h)}
                    className="p-2 text-slate-300 hover:text-emerald-400 bg-slate-900 border border-slate-800 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title="Edit holding"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteRequest(h.stockSymbol)}
                    className="p-2 text-slate-300 hover:text-rose-400 bg-slate-900 border border-slate-800 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title="Delete holding"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Data Grid: 2 columns */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-medium">Qty & Avg Price</span>
                  <span className="font-mono text-slate-200 text-xs">{h.quantity} @ {formatCurrency(h.avgBuyPrice)}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase font-medium">Current Price</span>
                  <span className="font-mono font-bold text-white text-xs">{formatCurrency(h.currentPrice)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-medium">Current Valuation</span>
                  <span className="font-mono font-bold text-white text-xs">{formatCurrency(h.currentValue)}</span>
                  <span className="text-[10px] text-slate-400 ml-1 font-mono">({h.weightPercent.toFixed(1)}%)</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase font-medium">Total Gain / Loss</span>
                  <div className={`font-mono font-bold text-xs inline-flex items-center justify-end gap-1 ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isGain ? <TrendingUp className="w-3 h-3 shrink-0" /> : <TrendingDown className="w-3 h-3 shrink-0" />}
                    <span>{isGain ? `+${formatCurrency(h.gainLoss)}` : formatCurrency(h.gainLoss)}</span>
                  </div>
                  <div className={`text-[10px] font-mono ${isGain ? 'text-emerald-500' : 'text-rose-500'}`}>
                    ({formatPercent(h.gainLossPercent)})
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

