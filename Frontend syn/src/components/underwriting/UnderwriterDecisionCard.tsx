import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, FileSignature, Send, Sparkles } from 'lucide-react';
import type { ApplicationCase, DecisionType } from '../../types/underwriting';

interface UnderwriterDecisionCardProps {
  currentCase: ApplicationCase;
  onDecisionSubmit?: (decision: DecisionType, notes: string) => void;
  onOpenPolicyAssistant: (caseId: string) => void;
}

export const UnderwriterDecisionCard: React.FC<UnderwriterDecisionCardProps> = ({
  currentCase,
  onDecisionSubmit,
  onOpenPolicyAssistant
}) => {
  const [selectedDecision, setSelectedDecision] = useState<DecisionType>(currentCase.decision);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isOverriding = selectedDecision !== currentCase.decision;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (onDecisionSubmit) {
      onDecisionSubmit(selectedDecision, notes);
    }
  };

  return (
    <div className="clay-card p-4 space-y-3.5">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-slate-900 text-white">
            <FileSignature className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 font-sans">
            Underwriter Final Determination
          </h3>
        </div>

        <button
          type="button"
          onClick={() => onOpenPolicyAssistant(currentCase.id)}
          className="clay-button-secondary text-xs px-3 py-1 flex items-center space-x-1 text-slate-900 font-sans cursor-pointer font-bold"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>PolicyLens</span>
        </button>
      </div>

      {submitted ? (
        <div className="p-4 rounded-lg bg-slate-900 text-white text-center space-y-1">
          <CheckCircle2 className="w-6 h-6 text-white mx-auto" />
          <h4 className="text-xs font-bold">Decision Successfully Logged</h4>
          <p className="text-[11px] text-slate-300">
            Case <strong>{currentCase.id}</strong> saved with verdict <strong>{selectedDecision}</strong>.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Decision Selector */}
          <div>
            <label className="text-xs font-bold text-slate-900 font-sans block mb-1.5">
              Select Final Verdict
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedDecision('APPROVE')}
                className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                  selectedDecision === 'APPROVE'
                    ? 'bg-slate-900 text-white border-slate-900 font-bold'
                    : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs font-bold font-sans block">APPROVE</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDecision('REFER')}
                className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                  selectedDecision === 'REFER'
                    ? 'bg-slate-900 text-white border-slate-900 font-bold'
                    : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs font-bold font-sans block">REFER / REVIEW</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDecision('DECLINE')}
                className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                  selectedDecision === 'DECLINE'
                    ? 'bg-slate-900 text-white border-slate-900 font-bold'
                    : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs font-bold font-sans block">DECLINE</span>
              </button>
            </div>
          </div>

          {/* Override Warning */}
          {isOverriding && (
            <div className="p-2 rounded bg-slate-100 border border-slate-300 text-xs text-slate-900 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-slate-900 shrink-0" />
              <span>
                Engine verdict was <strong>{currentCase.decision}</strong>. Overriding to <strong>{selectedDecision}</strong>.
              </span>
            </div>
          )}

          {/* Underwriter Notes */}
          <div>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Underwriting rationale & supervisory notes..."
              className="w-full text-xs font-sans p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 resize-none"
            />
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end pt-1">
            <button
              type="submit"
              className="clay-button-primary text-xs px-4 py-2 flex items-center space-x-1.5 font-bold cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit & Lock Decision</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
