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
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 animate-pulse">
        <div className="h-6 bg-slate-800 rounded w-1/4 mb-4"></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-slate-800/60 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (holdings.length === 0) {
    return null; // Handled by EmptyState
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            Portfolio Holdings ({holdings.length})
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Valuation, invested capital, gain/loss and portfolio weight</p>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
            <tr>
              <th className="py-3 px-3">Symbol</th>
              <th className="py-3 px-3">Sector</th>
              <th className="py-3 px-3 text-right">Qty</th>
              <th className="py-3 px-3 text-right">Avg Price</th>
              <th className="py-3 px-3 text-right">Current Price</th>
              <th className="py-3 px-3 text-right">Invested</th>
              <th className="py-3 px-3 text-right">Current Value</th>
              <th className="py-3 px-3 text-right">Gain / Loss</th>
              <th className="py-3 px-3 text-right">Weight</th>
              <th className="py-3 px-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {holdings.map((h) => {
              const isProfit = h.gainLoss >= 0;
              return (
                <tr key={h.stockSymbol} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                    <span className="bg-slate-800 px-2 py-1 rounded text-xs font-mono text-emerald-300 border border-slate-700">
                      {h.stockSymbol}
                    </span>
                    {h.isPriceCached && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-950/80 text-amber-400 border border-amber-800 px-1.5 py-0.5 rounded"
                        title={`Price cached from ${h.lastFetchedAt ? new Date(h.lastFetchedAt).toLocaleTimeString() : 'previous fetch'}`}
                      >
                        <Clock className="w-2.5 h-2.5" />
                        Cached
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    <span className="bg-slate-950 text-slate-300 px-2 py-0.5 rounded text-[11px] border border-slate-800">
                      {h.sector || 'Unassigned'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-200">{h.quantity}</td>
                  <td className="py-3 px-3 text-right font-mono text-slate-300">{formatCurrency(h.avgBuyPrice)}</td>
                  <td className="py-3 px-3 text-right font-mono text-slate-100 font-semibold">{formatCurrency(h.currentPrice)}</td>
                  <td className="py-3 px-3 text-right font-mono text-slate-400">{formatCurrency(h.investedValue)}</td>
                  <td className="py-3 px-3 text-right font-mono text-white font-bold">{formatCurrency(h.currentValue)}</td>
                  <td className="py-3 px-3 text-right font-mono font-semibold">
                    <div className={`inline-flex items-center gap-0.5 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      <span>{isProfit ? `+${formatCurrency(h.gainLoss)}` : formatCurrency(h.gainLoss)}</span>
                    </div>
                    <div className={`text-[10px] ${isProfit ? 'text-emerald-500/90' : 'text-rose-500/90'}`}>
                      ({formatPercent(h.gainLossPercent)})
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-slate-200">
                    {h.weightPercent.toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <button
                        onClick={() => onEdit(h)}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors"
                        title="Edit holding"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteRequest(h.stockSymbol)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
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
          const isProfit = h.gainLoss >= 0;
          return (
            <div key={h.stockSymbol} className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-emerald-300 text-sm">{h.stockSymbol}</span>
                  <span className="text-[11px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400">
                    {h.sector || 'General'}
                  </span>
                  {h.isPriceCached && (
                    <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      Cached
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => onEdit(h)}
                    className="p-1.5 text-slate-400 hover:text-emerald-400 bg-slate-900 border border-slate-800 rounded"
                    title="Edit holding"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteRequest(h.stockSymbol)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-900 border border-slate-800 rounded"
                    title="Delete holding"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-medium">Qty & Avg Price</span>
                  <span className="font-mono text-slate-200">{h.quantity} @ {formatCurrency(h.avgBuyPrice)}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px] uppercase font-medium">Current Price</span>
                  <span className="font-mono font-bold text-white">{formatCurrency(h.currentPrice)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-medium">Current Value</span>
                  <span className="font-mono font-bold text-white">{formatCurrency(h.currentValue)}</span>
                  <span className="text-[10px] text-slate-500 ml-1">({h.weightPercent.toFixed(1)}%)</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px] uppercase font-medium">Gain / Loss</span>
                  <span className={`font-mono font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isProfit ? `+${formatCurrency(h.gainLoss)}` : formatCurrency(h.gainLoss)} ({formatPercent(h.gainLossPercent)})
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
