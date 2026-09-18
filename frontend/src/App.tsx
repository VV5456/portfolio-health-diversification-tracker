import React from 'react';
import { HoldingsForm } from './components/HoldingsForm';
import { TargetAllocationForm } from './components/TargetAllocationForm';
import { Dashboard } from './components/Dashboard';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 max-w-7xl mx-auto space-y-8">
      <header className="border-b border-slate-800 pb-4">
        <h1 className="text-3xl font-bold text-emerald-400">Portfolio Health & Diversification Tracker</h1>
        <p className="text-slate-400 mt-1">Plain-language risk analysis and diversification monitoring for Indian equities.</p>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <HoldingsForm />
          <TargetAllocationForm />
        </div>
        <div className="lg:col-span-2">
          <Dashboard />
        </div>
      </main>
    </div>
  );
};

export default App;
