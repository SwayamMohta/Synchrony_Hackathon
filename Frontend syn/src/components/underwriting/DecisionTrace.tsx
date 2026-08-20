import React from 'react';
import type { DecisionTraceStage } from '../../types/underwriting';

export interface StepItem {
  id: string;
  stepNumber: number;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  status: 'passed' | 'warning' | 'failed' | 'neutral';
  badgeText?: string;
}

interface DecisionTraceProps {
  stages?: DecisionTraceStage[];
  currentStepIndex: number;
  onSelectStep: (stepIndex: number) => void;
  steps: StepItem[];
}

export const DecisionTrace: React.FC<DecisionTraceProps> = ({
  currentStepIndex,
  onSelectStep,
  steps
}) => {
  return (
    <div className="clay-card p-2.5">
      {/* Stepper Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {steps.map((step, idx) => {
          const isActive = idx === currentStepIndex;
          const Icon = step.icon;

          return (
            <button
              key={step.id}
              onClick={() => onSelectStep(idx)}
              type="button"
              className={`text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <div className="flex items-center space-x-1.5">
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${
                      isActive ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-900'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      isActive ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    STEP {step.stepNumber}
                  </span>
                </div>

                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    isActive
                      ? 'bg-slate-800 text-slate-200 border border-slate-700'
                      : 'bg-slate-100 text-slate-800 border border-slate-200'
                  }`}
                >
                  {step.badgeText || 'STATUS'}
                </span>
              </div>

              <div>
                <div className={`text-xs font-bold font-sans ${isActive ? 'text-white' : 'text-slate-900'}`}>
                  {step.title}
                </div>
                <div
                  className={`text-[10px] truncate mt-0.5 font-sans ${
                    isActive ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {step.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
