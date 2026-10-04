import React from 'react';
import { PortfolioAnalysis, CalculatedHolding } from '../types';
import { OverviewCards } from './OverviewCards';
import { AiSummaryCard } from './AiSummaryCard';
import { HoldingsList } from './HoldingsList';
import { SectorBreakdownCard } from './SectorBreakdownCard';
import { ConcentrationCard } from './ConcentrationCard';
import { EmptyState } from './EmptyState';

interface DashboardProps {
  analysis: PortfolioAnalysis | null;
  isLoading: boolean;
  onEditHolding: (holding: CalculatedHolding) => void;
  onDeleteRequest: (symbol: string) => void;
  onAddFirstHolding: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  analysis,
  isLoading,
  onEditHolding,
  onDeleteRequest,
  onAddFirstHolding,
}) => {
  const holdings = analysis?.holdings ?? [];
  const isEmpty = !isLoading && holdings.length === 0;

  return (
    <div className="space-y-6">
      {/* Overview Metric Cards */}
      <OverviewCards analysis={analysis} isLoading={isLoading} />

      {isEmpty ? (
        <EmptyState onAddFirstHolding={onAddFirstHolding} />
      ) : (
        <>
          {/* AI Explanation Summary */}
          <AiSummaryCard aiSummary={analysis?.aiSummary} isLoading={isLoading} />

          {/* Main Holdings Table */}
          <HoldingsList
            holdings={holdings}
            onEdit={onEditHolding}
            onDeleteRequest={onDeleteRequest}
            isLoading={isLoading}
          />

          {/* Sector & Concentration Analysis Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SectorBreakdownCard
              sectorBreakdown={analysis?.sectorBreakdown ?? {}}
              isLoading={isLoading}
            />
            <ConcentrationCard
              concentration={analysis?.concentration}
              isLoading={isLoading}
            />
          </div>
        </>
      )}
    </div>
  );
};
