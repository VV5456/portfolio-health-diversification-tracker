import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteConfirmModalProps {
  stockSymbol: string | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isDeleting: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  stockSymbol,
  onConfirm,
  onCancel,
  isDeleting,
}) => {
  if (!stockSymbol) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl max-w-md w-full p-6 shadow-2xl shadow-slate-950 space-y-4">
        <div className="flex items-center space-x-3 text-rose-400">
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800/60 shrink-0">
            <AlertTriangle className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Delete Position</h3>
            <p className="text-xs text-slate-400">This action will remove the holding from DynamoDB.</p>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/50">
          Are you sure you want to remove <span className="font-mono font-bold text-emerald-400">{stockSymbol}</span> from your portfolio?
        </p>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700/80 transition-colors disabled:opacity-50 min-h-[42px]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-rose-950/60 disabled:opacity-50 min-h-[42px]"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>Confirm Delete</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
