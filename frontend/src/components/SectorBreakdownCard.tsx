import React from 'react';
import { PieChart } from 'lucide-react';

interface SectorBreakdownCardProps {
  sectorBreakdown: Record<string, number>;
  isLoading: boolean;
}

const SECTOR_COLORS: Record<string, string> = {
  IT: 'bg-emerald-500',
  Banking: 'bg-blue-500',
  Energy: 'bg-amber-500',
  Pharma: 'bg-rose-500',
  Auto: 'bg-purple-500',
  FMCG: 'bg-teal-500',
  Metals: 'bg-cyan-500',
  Consumer: 'bg-indigo-500',
  Financials: 'bg-sky-500',
  Unassigned: 'bg-slate-500',
};

const getSectorColor = (sector: string, index: number): string => {
  if (SECTOR_COLORS[sector]) return SECTOR_COLORS[sector];
  const defaultColors = ['bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-teal-500'];
  return defaultColors[index % defaultColors.length];
};

export const SectorBreakdownCard: React.FC<SectorBreakdownCardProps> = ({
  sectorBreakdown,
  isLoading,
}) => {
  const sectors = Object.entries(sectorBreakdown || {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-teal-950/80 text-teal-400 border border-teal-800/60 shrink-0">
            <PieChart className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-100 truncate">Sector Breakdown</h2>
            <p className="text-xs text-slate-400 truncate">Distribution of portfolio value across industry sectors</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-4 bg-slate-800/80 rounded w-1/3"></div>
              <div className="h-2 bg-slate-800/50 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : sectors.length === 0 ? (
        <p className="text-xs text-slate-500 py-4 text-center">No holdings to compute sector breakdown.</p>
      ) : (
        <div className="space-y-3.5">
          {/* Combined Stacked Distribution Bar */}
          <div className="w-full h-3 bg-slate-950/80 rounded-full overflow-hidden flex border border-slate-800/60">
            {sectors.map(([sector, pct], idx) => (
              <div
                key={sector}
                style={{ width: `${Math.max(pct, 0)}%` }}
                className={`${getSectorColor(sector, idx)} transition-all duration-500`}
                title={`${sector}: ${pct.toFixed(1)}%`}
              ></div>
            ))}
          </div>

          {/* Individual Sector Bars & Labels */}
          <div className="space-y-2.5 pt-1">
            {sectors.map(([sector, pct], idx) => {
              const color = getSectorColor(sector, idx);
              return (
                <div key={sector} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${color}`}></span>
                      <span className="font-semibold text-slate-200">{sector}</span>
                    </div>
                    <span className="font-mono text-slate-300 font-bold">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950/60 rounded-full overflow-hidden border border-slate-800/40">
                    <div
                      className={`h-full ${color} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

