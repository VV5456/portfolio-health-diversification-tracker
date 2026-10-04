import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { ConcentrationInfo } from '../types';

interface ConcentrationCardProps {
  concentration?: ConcentrationInfo;
  isLoading: boolean;
}

export const ConcentrationCard: React.FC<ConcentrationCardProps> = ({ concentration, isLoading }) => {
  if (isLoading && !concentration) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-1/3"></div>
        <div className="h-8 bg-slate-800 rounded w-full"></div>
      </div>
    );
  }

  const top1 = concentration?.top1Percent ?? 0;
  const top3 = concentration?.top3Percent ?? 0;
  const top1Symbol = concentration?.top1Symbol ?? 'N/A';
  const flag = concentration?.flag ?? 'low';
  const flagReason = concentration?.flagReason ?? 'Concentration risk analysis';

  const flagStyles =
    flag === 'high'
      ? {
          badge: 'bg-rose-950/90 text-rose-300 border-rose-800',
          icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
          accent: 'border-l-4 border-l-rose-500',
        }
      : flag === 'moderate'
      ? {
          badge: 'bg-amber-950/90 text-amber-300 border-amber-800',
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
          accent: 'border-l-4 border-l-amber-500',
        }
      : {
          badge: 'bg-emerald-950/90 text-emerald-300 border-emerald-800',
          icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,
          accent: 'border-l-4 border-l-emerald-500',
        };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 ${flagStyles.accent}`}>
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
            {flagStyles.icon}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Concentration Risk</h2>
            <p className="text-xs text-slate-400">Single stock & top 3 weight distribution</p>
          </div>
        </div>

        <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${flagStyles.badge}`}>
          {flag} Risk
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-400 block uppercase font-medium">Largest Position ({top1Symbol})</span>
          <span className="text-xl font-bold font-mono text-white mt-1 block">{top1.toFixed(1)}%</span>
          <span className="text-[10px] text-slate-500">of portfolio value</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-400 block uppercase font-medium">Top 3 Holdings Weight</span>
          <span className="text-xl font-bold font-mono text-white mt-1 block">{top3.toFixed(1)}%</span>
          <span className="text-[10px] text-slate-500">combined weight</span>
        </div>
      </div>

      <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">{flagReason}</p>
      </div>
    </div>
  );
};
