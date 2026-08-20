import React, { useState } from 'react';
import { Brain } from 'lucide-react';
import type { ShapContribution } from '../../types/underwriting';

interface ShapChartProps {
  contributions: ShapContribution[];
  onSelectContribution?: (item: ShapContribution) => void;
}

export const ShapChart: React.FC<ShapChartProps> = ({ contributions, onSelectContribution }) => {
  const [selectedFeature, setSelectedFeature] = useState<ShapContribution | null>(null);

  const maxAbs = Math.max(...contributions.map(c => Math.abs(c.contribution)), 0.1);

  const handleItemClick = (item: ShapContribution) => {
    setSelectedFeature(item);
    if (onSelectContribution) {
      onSelectContribution(item);
    }
  };

  return (
    <div className="clay-card p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-slate-900 text-white">
            <Brain className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 font-sans">
            AI Risk Explainability (SHAP Analysis)
          </h3>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-mono">
          XGBoost SHAP
        </span>
      </div>

      {/* Visual Bar List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-sans text-slate-600 px-1 font-medium">
          <span>← Reduces Risk (Favorable)</span>
          <span>Increases Risk (Unfavorable) →</span>
        </div>

        <div className="space-y-2">
          {contributions.map(item => {
            const isRiskIncrease = item.contribution > 0;
            const absVal = Math.abs(item.contribution);
            const barWidthPercent = Math.min((absVal / maxAbs) * 100, 100);
            const isSelected = selectedFeature?.featureKey === item.featureKey;

            return (
              <div
                key={item.featureKey}
                onClick={() => handleItemClick(item)}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-900 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {/* Feature Info */}
                <div className="w-44 shrink-0">
                  <div className="text-xs font-bold font-sans truncate">
                    {item.displayName}
                  </div>
                  <div className="text-[10px] font-mono opacity-80 mt-0.5">
                    Value: {String(item.rawValue)}
                  </div>
                </div>

                {/* Centered Dual-Direction Bar */}
                <div className="flex-1 relative h-5 bg-white border border-slate-200 rounded flex items-center px-0.5">
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-300 z-10" />

                  {/* Favorable Bar (Left side) */}
                  <div className="w-1/2 h-full flex justify-end items-center pr-0.5">
                    {!isRiskIncrease && (
                      <div
                        style={{ width: `${barWidthPercent}%` }}
                        className="h-3.5 rounded-l bg-slate-700 text-white flex items-center justify-end pr-1 text-[9px] font-mono font-bold"
                      >
                        {item.contribution.toFixed(2)}
                      </div>
                    )}
                  </div>

                  {/* Unfavorable Bar (Right side) */}
                  <div className="w-1/2 h-full flex justify-start items-center pl-0.5">
                    {isRiskIncrease && (
                      <div
                        style={{ width: `${barWidthPercent}%` }}
                        className="h-3.5 rounded-r bg-slate-900 text-white flex items-center justify-start pl-1 text-[9px] font-mono font-bold"
                      >
                        +{item.contribution.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action / Detail Cue */}
                <div className="shrink-0 text-right">
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700 border border-slate-200'
                  }`}>
                    {item.reasonCode || 'FEAT'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
