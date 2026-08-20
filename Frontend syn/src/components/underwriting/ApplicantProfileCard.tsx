import React from 'react';
import { User } from 'lucide-react';
import type { ApplicantProfile, ThinFileSupplementarySignals } from '../../types/underwriting';

interface ApplicantProfileCardProps {
  applicant: ApplicantProfile;
  supplementary?: ThinFileSupplementarySignals;
}

export const ApplicantProfileCard: React.FC<ApplicantProfileCardProps> = ({
  applicant
}) => {
  // Monthly calculations
  const monthlyIncome = applicant.monthlyIncome || Math.round(applicant.annualIncome / 12);
  const totalOutflows = applicant.monthlyExpenses + applicant.monthlyDebtPayments;
  const netSurplus = monthlyIncome - totalOutflows;
  const totalObligationPercent = Math.round((totalOutflows / (monthlyIncome || 1)) * 100);

  return (
    <div className="clay-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-slate-900 text-white">
            <User className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 font-sans">
            Applicant Profile & Financial Capacity
          </h3>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
            ID: {applicant.id}
          </span>
          <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
            {applicant.segment === 'THIN-FILE' ? 'THIN-FILE' : 'ESTABLISHED'}
          </span>
        </div>
      </div>

      {/* Main 2-Column Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        {/* Left Column: Financial Capacity (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2.5 flex flex-col justify-between">
          <div className="grid grid-cols-2 gap-2">
            {/* Requested Loan */}
            <div className="bg-white p-2 rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 font-sans block">Requested Loan</span>
              <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                ₹{applicant.requestedAmount.toLocaleString('en-IN')}
              </div>
            </div>

            {/* Monthly Net Income */}
            <div className="bg-white p-2 rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 font-sans block">Monthly Net Income</span>
              <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                ₹{monthlyIncome.toLocaleString('en-IN')}
              </div>
            </div>

            {/* Debt & Outflows */}
            <div className="bg-white p-2 rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 font-sans block">Monthly Outflows</span>
              <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                ₹{totalOutflows.toLocaleString('en-IN')}
              </div>
            </div>

            {/* Surplus */}
            <div className="bg-white p-2 rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 font-sans block">Net Surplus</span>
              <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                ₹{netSurplus.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Integrated Compact DTI Capacity Meter */}
          <div className="bg-white p-2 rounded border border-slate-200 space-y-1">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="font-bold text-slate-800">
                DTI: <span className="font-mono">{totalObligationPercent}%</span>
              </span>
              <span className="text-[10px] font-bold text-slate-700">
                {totalObligationPercent > 80 ? 'Critical' : totalObligationPercent > 50 ? 'Moderate' : 'Low'}
              </span>
            </div>

            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                style={{ width: `${Math.min(totalObligationPercent, 100)}%` }}
                className="h-full bg-slate-900 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Identity Matrix (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
          <div className="grid grid-cols-2 gap-2 text-xs font-sans">
            <div className="p-2 rounded bg-white border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Age</span>
              <span className="font-bold text-slate-900">{applicant.age} Yrs</span>
            </div>
            <div className="p-2 rounded bg-white border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Occupation</span>
              <span className="font-bold text-slate-900 truncate block">{applicant.occupation || 'Salaried'}</span>
            </div>
            <div className="p-2 rounded bg-white border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Location</span>
              <span className="font-bold text-slate-900 truncate block">{applicant.city || 'India'}</span>
            </div>
            <div className="p-2 rounded bg-white border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Dependents</span>
              <span className="font-bold text-slate-900">{applicant.dependents ?? 0}</span>
            </div>
          </div>

          <div className="p-1.5 rounded bg-white border border-slate-200 text-xs font-sans text-slate-900 flex items-center justify-between mt-2">
            <span>Employment:</span>
            <strong className="font-mono">{applicant.employmentLengthYears} Yrs</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
