import React from 'react';
import { PortfolioAnalysis, CalculatedHolding } from '../types';
import { OverviewCards } from './OverviewCards';
import { AiSummaryCard } from './AiSummaryCard';
import { HoldingsList } from './HoldingsList';
import { SectorBreakdownCard } from './SectorBreakdownCard';
import { ConcentrationCard } from './ConcentrationCard';
import { EmptyState } from './EmptyState';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface DashboardProps {
  analysis: PortfolioAnalysis | null;
  effectiveHoldings: CalculatedHolding[];
  rawHoldingsCount: number;
  analysisError: string | null;
  isLoading: boolean;
  onEditHolding: (holding: CalculatedHolding) => void;
  onDeleteRequest: (symbol: string) => void;
  onAddFirstHolding: () => void;
  onRetryAnalysis?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  analysis,
  effectiveHoldings,
  rawHoldingsCount,
  analysisError,
  isLoading,
  onEditHolding,
  onDeleteRequest,
  onAddFirstHolding,
  onRetryAnalysis,
}) => {
  const isEmpty = !isLoading && rawHoldingsCount === 0;

  return (
    <div className="space-y-6">
      {/* Analysis Error Alert Notice */}
      {analysisError && (
        <div className="bg-amber-950/80 border border-amber-800/80 p-4 rounded-xl text-amber-200 text-xs flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <h4 className="font-bold text-amber-100 truncate">Portfolio Analysis Unavailable</h4>
              <p className="text-amber-300/90 text-xs truncate">{analysisError}</p>
            </div>
          </div>
          {onRetryAnalysis && (
            <button
              onClick={onRetryAnalysis}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-900 hover:bg-amber-800 text-amber-100 font-semibold text-xs rounded-lg transition-colors shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Analysis
            </button>
          )}
        </div>
      )}

      {/* Overview Metric Cards */}
      <OverviewCards analysis={analysis} effectiveHoldings={effectiveHoldings} isLoading={isLoading} />

      {isEmpty ? (
        <EmptyState onAddFirstHolding={onAddFirstHolding} />
      ) : (
        <>
          {/* AI Explanation Summary */}
          <AiSummaryCard
            aiSummary={analysis?.aiSummary}
            isLoading={isLoading}
            onRetryAnalysis={onRetryAnalysis}
            analysisError={analysisError}
          />

          {/* Main Holdings Table */}
          <HoldingsList
            holdings={effectiveHoldings}
            onEdit={onEditHolding}
            onDeleteRequest={onDeleteRequest}
            isLoading={isLoading}
          />

          {/* Sector & Concentration Analysis Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SectorBreakdownCard
              sectorBreakdown={analysis?.sectorBreakdown}
              effectiveHoldings={effectiveHoldings}
              isLoading={isLoading}
            />
            <ConcentrationCard
              concentration={analysis?.concentration}
              effectiveHoldings={effectiveHoldings}
              isLoading={isLoading}
            />
          </div>
        </>
      )}
    </div>
  );
};

