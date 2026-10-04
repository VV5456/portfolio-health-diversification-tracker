import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './api/client';
import { PortfolioAnalysis, TargetAllocation, CalculatedHolding } from './types';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { HoldingsForm } from './components/HoldingsForm';
import { TargetAllocationForm } from './components/TargetAllocationForm';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [targets, setTargets] = useState<TargetAllocation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmittingHolding, setIsSubmittingHolding] = useState<boolean>(false);
  const [isSubmittingTargets, setIsSubmittingTargets] = useState<boolean>(false);
  const [isDeletingHolding, setIsDeletingHolding] = useState<boolean>(false);
  
  const [editingHolding, setEditingHolding] = useState<CalculatedHolding | null>(null);
  const [deletingSymbol, setDeletingSymbol] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | undefined>(undefined);

  const formSectionRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef<boolean>(false);

  /**
   * Load analysis and target allocation from live backend API
   */
  const loadData = useCallback(async (showLoadingSpinner: boolean = true) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (showLoadingSpinner) setIsLoading(true);
    setErrorMsg(null);

    try {
      const [analysisData, targetsData] = await Promise.all([
        api.getAnalysis(),
        api.getTargets().catch(() => []), // Gracefully handle if targets empty
      ]);

      setAnalysis(analysisData);
      setTargets(targetsData);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      console.error('API Load Error:', err);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Unable to connect to Portfolio Tracker API. Please check network connection.'
      );
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  /**
   * Save (Add or Update) holding callback
   */
  const handleSaveHolding = async (payload: { stockSymbol: string; quantity: number; avgBuyPrice: number }) => {
    setIsSubmittingHolding(true);
    setErrorMsg(null);
    try {
      await api.saveHolding(payload);
      setEditingHolding(null);
      await loadData(false);
    } catch (err) {
      throw err;
    } finally {
      setIsSubmittingHolding(false);
    }
  };

  /**
   * Delete holding callback
   */
  const handleConfirmDelete = async () => {
    if (!deletingSymbol) return;
    setIsDeletingHolding(true);
    setErrorMsg(null);
    try {
      await api.deleteHolding(deletingSymbol);
      setDeletingSymbol(null);
      await loadData(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete holding');
      setDeletingSymbol(null);
    } finally {
      setIsDeletingHolding(false);
    }
  };

  /**
   * Save target allocation callback
   */
  const handleSaveTargets = async (newTargets: Array<{ category: string; targetPercent: number }>) => {
    setIsSubmittingTargets(true);
    setErrorMsg(null);
    try {
      const saved = await api.saveTargets(newTargets);
      setTargets(saved);
      await loadData(false);
    } catch (err) {
      throw err;
    } finally {
      setIsSubmittingTargets(false);
    }
  };

  /**
   * CTA to focus holdings form
   */
  const handleAddFirstHoldingCTA = () => {
    if (formSectionRef.current) {
      formSectionRef.current.scrollIntoView({ behavior: 'smooth' });
      const symbolInput = formSectionRef.current.querySelector('input');
      if (symbolInput) symbolInput.focus();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Sticky App Header */}
      <Header
        onRefresh={() => loadData(true)}
        isLoading={isLoading}
        lastUpdated={lastUpdated}
        holdingCount={analysis?.holdings?.length ?? 0}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Global Error Banner */}
        {errorMsg && (
          <div className="bg-rose-950/90 border border-rose-800 text-rose-200 p-4 rounded-xl shadow-lg flex items-start justify-between gap-3 animate-fadeIn">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold">API Gateway Error</h4>
                <p className="text-xs text-rose-300/90 mt-0.5">{errorMsg}</p>
              </div>
            </div>
            <button
              onClick={() => loadData(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-900 hover:bg-rose-800 text-rose-100 text-xs font-semibold rounded-lg transition-colors shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}

        {/* Dashboard & Form Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Management Forms */}
          <div ref={formSectionRef} className="lg:col-span-4 space-y-6">
            <HoldingsForm
              editingHolding={editingHolding}
              onSave={handleSaveHolding}
              onCancelEdit={() => setEditingHolding(null)}
              isSubmitting={isSubmittingHolding}
            />

            <TargetAllocationForm
              targets={targets}
              targetDrift={analysis?.targetDrift ?? []}
              onSaveTargets={handleSaveTargets}
              isSubmitting={isSubmittingTargets}
            />
          </div>

          {/* Right Column: Dashboard Visualization */}
          <div className="lg:col-span-8">
            <Dashboard
              analysis={analysis}
              isLoading={isLoading}
              onEditHolding={(holding) => {
                setEditingHolding(holding);
                handleAddFirstHoldingCTA();
              }}
              onDeleteRequest={(symbol) => setDeletingSymbol(symbol)}
              onAddFirstHolding={handleAddFirstHoldingCTA}
            />
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal Dialog */}
      <DeleteConfirmModal
        stockSymbol={deletingSymbol}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingSymbol(null)}
        isDeleting={isDeletingHolding}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>BharatBuilds Portfolio Tracker — Deployed AWS MVP</span>
          <span className="font-mono text-[11px] text-slate-400">Endpoint: https://5gv00gm0g4.execute-api.ap-south-1.amazonaws.com/Prod</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
