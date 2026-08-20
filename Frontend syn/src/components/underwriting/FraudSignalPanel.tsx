import React from 'react';
import type { FraudSignals } from '../../types/underwriting';
import { ShieldAlert } from 'lucide-react';

interface FraudSignalPanelProps {
  fraudSignals: FraudSignals;
}

export const FraudSignalPanel: React.FC<FraudSignalPanelProps> = ({ fraudSignals }) => {

  return (
    <div className="clay-card p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-slate-900 text-white">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 font-sans">
            Fraud & Identity Signals
          </h3>
        </div>

        <div className="text-right">
          <div className="text-sm font-bold font-mono text-slate-900">
            {fraudSignals.overallRiskPercent} ({fraudSignals.riskLevel})
          </div>
        </div>
      </div>

      {/* Grid of rule-based signals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {fraudSignals.signals.map(sig => {
          const isHigh = sig.status === 'HIGH';

          return (
            <div
              key={sig.id}
              className={`p-3 rounded-lg border flex flex-col justify-between ${
                isHigh ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-900 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold font-sans">
                  {sig.label}
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                    isHigh ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                  }`}
                >
                  {sig.status}
                </span>
              </div>

              <div className="text-xs font-bold font-mono mt-1">{sig.value}</div>
              <div className="text-[10px] opacity-75 font-sans mt-0.5">
                Threshold: {sig.threshold}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
