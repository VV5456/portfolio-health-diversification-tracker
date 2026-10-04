import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit3, X, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { CalculatedHolding, Holding } from '../types';

interface HoldingsFormProps {
  editingHolding: CalculatedHolding | Holding | null;
  onSave: (data: { stockSymbol: string; quantity: number; avgBuyPrice: number }) => Promise<void>;
  onCancelEdit: () => void;
  isSubmitting: boolean;
}

export const HoldingsForm: React.FC<HoldingsFormProps> = ({
  editingHolding,
  onSave,
  onCancelEdit,
  isSubmitting,
}) => {
  const [stockSymbol, setStockSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [avgBuyPrice, setAvgBuyPrice] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (editingHolding) {
      setStockSymbol(editingHolding.stockSymbol);
      setQuantity(editingHolding.quantity.toString());
      setAvgBuyPrice(editingHolding.avgBuyPrice.toString());
      setValidationError(null);
    } else {
      setStockSymbol('');
      setQuantity('');
      setAvgBuyPrice('');
    }
  }, [editingHolding]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSuccessMsg(null);

    const cleanSymbol = stockSymbol.trim().toUpperCase();
    const parsedQty = parseFloat(quantity);
    const parsedPrice = parseFloat(avgBuyPrice);

    if (!cleanSymbol) {
      setValidationError('Please enter a valid stock symbol (e.g. TCS, INFY).');
      return;
    }
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setValidationError('Quantity must be a positive number greater than 0.');
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setValidationError('Average buy price must be a positive number greater than 0.');
      return;
    }

    try {
      await onSave({
        stockSymbol: cleanSymbol,
        quantity: parsedQty,
        avgBuyPrice: parsedPrice,
      });
      setSuccessMsg(`Position for ${cleanSymbol} ${editingHolding ? 'updated' : 'added'} successfully!`);
      if (!editingHolding) {
        setStockSymbol('');
        setQuantity('');
        setAvgBuyPrice('');
      }
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to save holding.');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/50">
            {editingHolding ? <Edit3 className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">
              {editingHolding ? `Edit Position: ${editingHolding.stockSymbol}` : 'Add Holding Position'}
            </h2>
            <p className="text-xs text-slate-400">Enter ticker, share quantity, and cost basis</p>
          </div>
        </div>

        {editingHolding && (
          <button
            onClick={onCancelEdit}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Cancel Edit"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {validationError && (
        <div className="mb-4 p-3 rounded-lg bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{validationError}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Stock Symbol */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Stock Symbol (NSE / BSE Ticker)
          </label>
          <input
            type="text"
            placeholder="e.g. TCS, INFY, HDFCBANK, RELIANCE"
            value={stockSymbol}
            onChange={(e) => setStockSymbol(e.target.value.toUpperCase())}
            disabled={isSubmitting || !!editingHolding}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-60 uppercase"
            required
          />
          <p className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
            <Info className="w-3 h-3 text-slate-500" />
            Sector taxonomy is derived automatically by the backend.
          </p>
        </div>

        {/* Quantity & Avg Price Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Quantity (Shares)
            </label>
            <input
              type="number"
              step="any"
              min="0.0001"
              placeholder="e.g. 10"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Average Buy Price (₹)
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              placeholder="e.g. 3800.50"
              value={avgBuyPrice}
              onChange={(e) => setAvgBuyPrice(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
              required
            />
          </div>
        </div>

        {/* Form Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-all shadow-md shadow-emerald-950 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Saving Position...</span>
              </>
            ) : (
              <>
                {editingHolding ? <Edit3 className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                <span>{editingHolding ? 'Update Position' : 'Save Position'}</span>
              </>
            )}
          </button>

          {editingHolding && (
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-lg border border-slate-700 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
