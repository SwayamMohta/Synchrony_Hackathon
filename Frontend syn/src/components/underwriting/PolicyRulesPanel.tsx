import React from 'react';
import { CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import type { PolicyRuleCheck } from '../../types/underwriting';

interface PolicyRulesPanelProps {
  rules: PolicyRuleCheck[];
}

export const PolicyRulesPanel: React.FC<PolicyRulesPanelProps> = ({ rules }) => {
  const passedCount = rules.filter(r => r.result === 'PASSED').length;
  const failedCount = rules.filter(r => r.result === 'FAILED').length;

  return (
    <div className="clay-card p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-slate-900 text-white">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 font-sans">
            Deterministic Policy Engine Rules
          </h3>
        </div>

        {/* Status Badges */}
        <div className="flex items-center space-x-2">
          {failedCount > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
              {failedCount} FAILED
            </span>
          )}
          <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-900 border border-slate-200 font-mono">
            {passedCount}/{rules.length} Passed
          </span>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-2">
        {rules.map(rule => {
          const isPassed = rule.result === 'PASSED';
          const isFailed = rule.result === 'FAILED';

          return (
            <div
              key={rule.id}
              className={`p-3 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-2.5 ${
                isFailed
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-900 border-slate-200'
              }`}
            >
              <div className="flex items-start space-x-2.5">
                <div
                  className={`w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                    isFailed
                      ? 'bg-white text-slate-900'
                      : 'bg-slate-900 text-white'
                  }`}
                >
                  {isPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                </div>

                <div>
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className="text-xs font-bold font-sans">{rule.name}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-semibold ${
                      isFailed ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-white text-slate-700 border-slate-200'
                    }`}>
                      {rule.category}
                    </span>
                  </div>
                </div>
              </div>

              {/* Observed vs Limit Metrics */}
              <div className="flex items-center justify-between md:justify-end space-x-3 shrink-0">
                <div className="text-left md:text-right text-xs">
                  <span className="font-mono font-bold">Observed: {rule.observedValue}</span>
                  <span className="text-[10px] opacity-75 font-sans block">Threshold: {rule.threshold}</span>
                </div>

                <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                  isFailed ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                }`}>
                  {rule.result}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
