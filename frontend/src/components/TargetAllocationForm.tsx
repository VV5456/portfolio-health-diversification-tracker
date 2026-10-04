import React, { useState, useEffect } from 'react';
import { Target, Plus, Trash2, Save, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { TargetAllocation, TargetDriftItem } from '../types';

interface TargetAllocationFormProps {
  targets: TargetAllocation[];
  targetDrift: TargetDriftItem[];
  onSaveTargets: (targets: Array<{ category: string; targetPercent: number }>) => Promise<void>;
  isSubmitting: boolean;
}

export const TargetAllocationForm: React.FC<TargetAllocationFormProps> = ({
  targets,
  targetDrift,
  onSaveTargets,
  isSubmitting,
}) => {
  const [rows, setRows] = useState<Array<{ category: string; targetPercent: string }>>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (targets && targets.length > 0) {
      setRows(targets.map((t) => ({ category: t.category, targetPercent: t.targetPercent.toString() })));
    } else {
      // Default initial presets if empty
      setRows([
        { category: 'IT', targetPercent: '30' },
        { category: 'Banking', targetPercent: '40' },
        { category: 'Energy', targetPercent: '30' },
      ]);
    }
  }, [targets]);

  const handleRowChange = (index: number, field: 'category' | 'targetPercent', value: string) => {
    const updated = [...rows];
    updated[index][field] = value;
    setRows(updated);
  };

  const handleAddRow = () => {
    setRows([...rows, { category: '', targetPercent: '0' }]);
  };

  const handleRemoveRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const totalPercent = rows.reduce((sum, r) => sum + (parseFloat(r.targetPercent) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (rows.length === 0) {
      setErrorMsg('Please add at least one target allocation category.');
      return;
    }

    const payload: Array<{ category: string; targetPercent: number }> = [];
    for (const r of rows) {
      const cleanCat = r.category.trim();
      const val = parseFloat(r.targetPercent);

      if (!cleanCat) {
        setErrorMsg('Category name cannot be empty.');
        return;
      }
      if (isNaN(val) || val < 0 || val > 100) {
        setErrorMsg(`Target percentage for "${cleanCat}" must be between 0% and 100%.`);
        return;
      }
      payload.push({ category: cleanCat, targetPercent: val });
    }

    try {
      await onSaveTargets(payload);
      setSuccessMsg('Target allocations updated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update target allocation.');
    }
  };

  // Map drift items for quick lookup
  const driftMap = new Map<string, TargetDriftItem>();
  targetDrift.forEach((d) => driftMap.set(d.category.toLowerCase(), d));

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-blue-950/80 text-blue-400 border border-blue-800/60 shrink-0">
            <Target className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-100 truncate">Target Allocation & Drift</h2>
            <p className="text-xs text-slate-400 truncate">Set desired sector targets and monitor drift</p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-950/90 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-950/90 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-2.5">
          {rows.map((row, index) => {
            const driftData = driftMap.get(row.category.trim().toLowerCase());
            const actualPct = driftData ? driftData.actualPercent : 0;
            const driftPct = driftData ? driftData.driftPercent : 0;

            return (
              <div key={index} className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/60 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-2.5">
                {/* Category Name Input */}
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Sector e.g. IT, Banking"
                    value={row.category}
                    onChange={(e) => handleRowChange(index, 'category', e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-semibold min-h-[38px]"
                    required
                  />
                  {/* Remove Button for Mobile (top right) */}
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(index)}
                    disabled={isSubmitting || rows.length <= 1}
                    className="sm:hidden p-2 text-slate-400 hover:text-rose-400 disabled:opacity-30 bg-slate-900 border border-slate-800 rounded-lg min-h-[38px] min-w-[38px] flex items-center justify-center shrink-0"
                    title="Remove target"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Target % Input & Actual/Drift Stats */}
                <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800/40">
                  <div className="w-28 shrink-0">
                    <div className="relative">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={row.targetPercent}
                        onChange={(e) => handleRowChange(index, 'targetPercent', e.target.value)}
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 pr-7 bg-slate-900 border border-slate-800/80 rounded-lg text-xs font-mono text-white text-right focus:outline-none focus:border-blue-500 min-h-[38px]"
                        required
                      />
                      <span className="absolute right-2.5 top-2.5 text-xs text-slate-500 font-mono">%</span>
                    </div>
                  </div>

                  {driftData ? (
                    <div className="text-right text-[11px] font-mono shrink-0 px-2 py-1 bg-slate-900/60 border border-slate-800/40 rounded-md min-w-[100px]">
                      <div className="text-slate-400">Actual: {actualPct.toFixed(1)}%</div>
                      <div className={`font-semibold ${driftPct > 0 ? 'text-amber-400' : driftPct < 0 ? 'text-blue-400' : 'text-emerald-400'}`}>
                        Drift: {driftPct > 0 ? `+${driftPct.toFixed(1)}%` : `${driftPct.toFixed(1)}%`}
                      </div>
                    </div>
                  ) : (
                    <div className="text-right text-[10px] text-slate-500 italic shrink-0 hidden sm:block">
                      No positions
                    </div>
                  )}

                  {/* Remove Button for Desktop */}
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(index)}
                    disabled={isSubmitting || rows.length <= 1}
                    className="hidden sm:flex p-2 text-slate-400 hover:text-rose-400 disabled:opacity-30 rounded-lg hover:bg-slate-900 transition-colors"
                    title="Remove target"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total Sum Bar & Validation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-950/60 p-3 rounded-lg border border-slate-800/60 text-xs gap-2">
          <button
            type="button"
            onClick={handleAddRow}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold focus:outline-none min-h-[32px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Sector Target</span>
          </button>

          <div className="flex items-center justify-between sm:justify-end gap-2 font-mono">
            <span className="text-slate-400">Total Allocation:</span>
            <span className={`font-bold ${totalPercent === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {totalPercent.toFixed(0)}%
            </span>
            {totalPercent !== 100 && (
              <span className="text-[10px] text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/80">
                (Target 100%)
              </span>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-all shadow-md shadow-blue-950/60 disabled:opacity-50 min-h-[40px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Updating Targets...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Target Allocations</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

