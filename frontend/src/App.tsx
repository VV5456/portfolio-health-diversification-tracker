import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { api } from './api/client';
import { PortfolioAnalysis, TargetAllocation, CalculatedHolding, Holding } from './types';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { HoldingsForm } from './components/HoldingsForm';
import { TargetAllocationForm } from './components/TargetAllocationForm';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [rawHoldings, setRawHoldings] = useState<Holding[]>([]);
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [targets, setTargets] = useState<TargetAllocation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmittingHolding, setIsSubmittingHolding] = useState<boolean>(false);
  const [isSubmittingTargets, setIsSubmittingTargets] = useState<boolean>(false);
  const [isDeletingHolding, setIsDeletingHolding] = useState<boolean>(false);
  
  const [editingHolding, setEditingHolding] = useState<CalculatedHolding | null>(null);
  const [deletingSymbol, setDeletingSymbol] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | undefined>(undefined);

  const formSectionRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef<boolean>(false);

  /**
   * Load raw holdings, target allocation, and analysis from live backend API
   */
  const loadData = useCallback(async (showLoadingSpinner: boolean = true): Promise<boolean> => {
    if (isFetchingRef.current) return false;
    isFetchingRef.current = true;

    if (showLoadingSpinner) setIsLoading(true);
    setErrorMsg(null);
    setAnalysisError(null);

    let analysisOk = false;

    try {
      // 1. Fetch raw holdings & targets independently
      const [holdingsRes, targetsRes] = await Promise.all([
        api.getHoldings().catch((err) => {
          console.error('getHoldings Error:', err);
          return null;
        }),
        api.getTargets().catch(() => []),
      ]);

      if (holdingsRes !== null) {
        setRawHoldings(holdingsRes);
      }
      if (targetsRes) {
        setTargets(targetsRes);
      }

      // 2. Fetch analysis independently
      try {
        const analysisData = await api.getAnalysis();
        setAnalysis(analysisData);
        setLastUpdated(new Date().toISOString());
        analysisOk = true;
      } catch (analysisErr) {
        console.error('getAnalysis Error:', analysisErr);
        const msg = analysisErr instanceof Error
          ? analysisErr.message
          : 'Portfolio analysis could not be refreshed. Position data is preserved.';
        setAnalysisError(msg);
      }

      return analysisOk;
    } catch (err) {
      console.error('API Load Failure:', err);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Unable to connect to Portfolio Tracker API. Please check network connection.'
      );
      return false;
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  /**
   * Derive calculated holdings list by merging rawHoldings with analysis.holdings,
   * providing fallback calculations if analysis is unavailable.
   */
  const effectiveHoldings: CalculatedHolding[] = useMemo(() => {
    const totalInvested = rawHoldings.reduce((sum, h) => sum + h.quantity * h.avgBuyPrice, 0);

    return rawHoldings.map((h) => {
      const calcMatch = analysis?.holdings?.find(
        (ah) => ah.stockSymbol.toUpperCase() === h.stockSymbol.toUpperCase()
      );
      if (calcMatch) {
        return calcMatch;
      }

      const currentPrice = h.lastKnownPrice ?? h.avgBuyPrice;
      const investedValue = h.quantity * h.avgBuyPrice;
      const currentValue = h.quantity * currentPrice;
      const gainLoss = currentValue - investedValue;
      const gainLossPercent = investedValue > 0 ? (gainLoss / investedValue) * 100 : 0;
      const weightPercent = totalInvested > 0 ? (investedValue / totalInvested) * 100 : 0;

      return {
        ...h,
        currentPrice,
        investedValue,
        currentValue,
        gainLoss,
        gainLossPercent,
        weightPercent,
        isPriceCached: true,
      };
    });
  }, [rawHoldings, analysis]);

  /**
   * Save (Add or Update) holding callback
   */
  const handleSaveHolding = async (payload: { stockSymbol: string; quantity: number; avgBuyPrice: number }): Promise<{ saved: boolean; refreshed: boolean }> => {
    setIsSubmittingHolding(true);
    setErrorMsg(null);
    setAnalysisError(null);
    try {
      const savedHolding = await api.saveHolding(payload);

      // Instantly update rawHoldings state so holding is retained regardless of analysis outcome
      setRawHoldings((prev) => {
        const idx = prev.findIndex((h) => h.stockSymbol.toUpperCase() === savedHolding.stockSymbol.toUpperCase());
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = savedHolding;
          return updated;
        }
        return [...prev, savedHolding];
      });

      setEditingHolding(null);
      const refreshed = await loadData(false);
      return { saved: true, refreshed };
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
    setAnalysisError(null);
    try {
      await api.deleteHolding(deletingSymbol);
      setRawHoldings((prev) => prev.filter((h) => h.stockSymbol.toUpperCase() !== deletingSymbol.toUpperCase()));
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
  const handleSaveTargets = async (newTargets: Array<{ category: string; targetPercent: number }>): Promise<{ saved: boolean; refreshed: boolean }> => {
    setIsSubmittingTargets(true);
    setErrorMsg(null);
    setAnalysisError(null);
    try {
      const saved = await api.saveTargets(newTargets);
      setTargets(saved);
      const refreshed = await loadData(false);
      return { saved: true, refreshed };
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
        holdingCount={rawHoldings.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Global Network/API Error Banner */}
        {errorMsg && (
          <div className="bg-rose-950/90 border border-rose-800 text-rose-200 p-4 rounded-xl shadow-lg flex items-start justify-between gap-3 animate-fadeIn">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold">API Connection Error</h4>
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
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 items-start">
          
          {/* Dashboard Visualization (Mobile: Order 1, Desktop: Right Column order-2 lg:col-span-8) */}
          <div className="order-1 lg:order-2 lg:col-span-8 w-full space-y-6">
            <Dashboard
              analysis={analysis}
              effectiveHoldings={effectiveHoldings}
              rawHoldingsCount={rawHoldings.length}
              analysisError={analysisError}
              isLoading={isLoading}
              onEditHolding={(holding) => {
                setEditingHolding(holding);
                handleAddFirstHoldingCTA();
              }}
              onDeleteRequest={(symbol) => setDeletingSymbol(symbol)}
              onAddFirstHolding={handleAddFirstHoldingCTA}
              onRetryAnalysis={() => loadData(true)}
            />
          </div>

          {/* Left Column: Management Forms (Mobile: Order 2, Desktop: Left Column order-1 lg:col-span-4) */}
          <div ref={formSectionRef} className="order-2 lg:order-1 lg:col-span-4 w-full space-y-6">
            <HoldingsForm
              editingHolding={editingHolding}
              onSave={handleSaveHolding}
              onCancelEdit={() => setEditingHolding(null)}
              isSubmitting={isSubmittingHolding}
              onRefreshAnalysis={() => loadData(true)}
            />

            <TargetAllocationForm
              targets={targets}
              targetDrift={analysis?.targetDrift ?? []}
              onSaveTargets={handleSaveTargets}
              isSubmitting={isSubmittingTargets}
              onRefreshAnalysis={() => loadData(true)}
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

