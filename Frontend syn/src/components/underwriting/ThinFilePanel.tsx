import React from 'react';
import type { ApplicantProfile, ThinFileSupplementarySignals } from '../../types/underwriting';
import { Landmark } from 'lucide-react';

interface ThinFilePanelProps {
  applicant: ApplicantProfile;
  supplementary: ThinFileSupplementarySignals;
}

export const ThinFilePanel: React.FC<ThinFilePanelProps> = ({ applicant, supplementary }) => {

  return (
    <div className="clay-card p-3.5 space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded bg-slate-900 text-white">
            <Landmark className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 font-sans">
            Alternative Data & Thin-File Telemetry
          </h3>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-900 border border-slate-200">
          {applicant.segment === 'THIN-FILE' ? 'THIN-FILE' : 'ESTABLISHED'}
        </span>
      </div>

      {/* Condensed 3-Metric Grid Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-sans">
        <div className="bg-slate-50 p-2 rounded border border-slate-200">
          <span className="text-[10px] text-slate-500 block">Bureau History</span>
          <span className="text-slate-900 font-bold font-mono text-xs mt-0.5 block">
            {applicant.creditHistoryMonths} Mos
          </span>
        </div>

        <div className="bg-slate-50 p-2 rounded border border-slate-200">
          <span className="text-[10px] text-slate-500 block">Income Stability</span>
          <span className="font-bold text-slate-900 font-sans text-xs mt-0.5 block">
            {supplementary.incomeStabilityScore}
          </span>
        </div>

        <div className="bg-slate-50 p-2 rounded border border-slate-200">
          <span className="text-[10px] text-slate-500 block">Cash Surplus</span>
          <span className="text-slate-900 font-bold font-mono text-xs mt-0.5 block">
            ₹{supplementary.bankCashflowSurplus.toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </div>
  );
};
