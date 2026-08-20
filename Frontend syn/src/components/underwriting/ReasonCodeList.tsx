import React from 'react';
import type { ReasonCode } from '../../types/underwriting';
import { Tag, AlertTriangle } from 'lucide-react';

interface ReasonCodeListProps {
  reasonCodes: ReasonCode[];
}

export const ReasonCodeList: React.FC<ReasonCodeListProps> = ({ reasonCodes }) => {
  const modelExplanations = reasonCodes.filter(r => r.category === 'MODEL_EXPLANATION');
  const policyReasons = reasonCodes.filter(
    r => r.category === 'DECISION_POLICY_REASON' || r.category === 'FRAUD_REASON'
  );

  return (
    <div className="clay-card p-5 space-y-4">
      <div className="border-b border-slate-200/80 pb-3">
        <h3 className="text-sm font-bold text-slate-900 font-sans">
          Key Decision Reasons & Adverse Action Codes
        </h3>
        <p className="text-xs text-slate-500 font-sans">
          Deterministic regulatory codes explaining the underwriting outcome
        </p>
      </div>

      {/* Policy & Decision Reasons Group */}
      <div>
        <div className="flex items-center space-x-2 mb-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-bold text-slate-800 font-sans uppercase tracking-wide">
            Policy & Regulatory Reasons
          </span>
        </div>
        <div className="space-y-2">
          {policyReasons.length === 0 ? (
            <div className="text-slate-500 text-xs italic p-3 bg-slate-50 rounded-xl border border-slate-200">
              No adverse policy violations triggered.
            </div>
          ) : (
            policyReasons.map(rc => (
              <div
                key={rc.code}
                className={`p-3 rounded-xl border flex items-start space-x-3 ${
                  rc.type === 'negative'
                    ? 'bg-rose-50/70 border-rose-200/90'
                    : 'bg-slate-50/70 border-slate-200/80'
                }`}
              >
                <span
                  className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md shrink-0 mt-0.5 ${
                    rc.type === 'negative'
                      ? 'bg-rose-200/80 text-rose-800'
                      : 'bg-amber-200/80 text-amber-800'
                  }`}
                >
                  Code {rc.code}
                </span>
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-900 font-sans">{rc.title}</div>
                  <div className="text-xs text-slate-600 mt-0.5 font-sans leading-relaxed">{rc.detail}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Model Explanations Group */}
      <div>
        <div className="flex items-center space-x-2 mb-2.5">
          <Tag className="w-4 h-4 text-slate-800" />
          <span className="text-xs font-bold text-slate-800 font-sans uppercase tracking-wide">
            Model Explanation Codes
          </span>
        </div>
        <div className="space-y-2">
          {modelExplanations.length === 0 ? (
            <div className="text-slate-500 text-xs italic p-3 bg-slate-50 rounded-xl border border-slate-200">
              No specific adverse model explanation codes.
            </div>
          ) : (
            modelExplanations.map(rc => (
              <div
                key={rc.code}
                className="bg-slate-50/70 border border-slate-200/80 p-3 rounded-xl flex items-start space-x-3"
              >
                <span className="font-mono text-xs font-bold bg-slate-200/80 text-slate-800 px-2 py-0.5 rounded-md shrink-0 mt-0.5 border border-slate-300">
                  Code {rc.code}
                </span>
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-900 font-sans">{rc.title}</div>
                  <div className="text-xs text-slate-600 mt-0.5 font-sans">{rc.detail}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
