import React, { useState } from 'react';
import {
  ArrowLeft,
  Database,
  User,
  Scale,
  BrainCircuit,
  ShieldAlert,
  FileSignature,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import type { ApplicationCase, ShapContribution } from '../../types/underwriting';
import { useCases } from '../../context/CaseContext';
import { DecisionTrace, type StepItem } from '../underwriting/DecisionTrace';
import { ApplicantProfileCard } from '../underwriting/ApplicantProfileCard';
import { PolicyRulesPanel } from '../underwriting/PolicyRulesPanel';
import { ShapChart } from '../underwriting/ShapChart';
import { ReasonCodeList } from '../underwriting/ReasonCodeList';
import { FraudSignalPanel } from '../underwriting/FraudSignalPanel';
import { ThinFilePanel } from '../underwriting/ThinFilePanel';
import { UnderwriterDecisionCard } from '../underwriting/UnderwriterDecisionCard';
import { ContextDrawer } from '../common/ContextDrawer';

interface ApplicationWorkspaceProps {
  currentCase: ApplicationCase;
  onBackToQueue: () => void;
  onOpenPolicyAssistant: (caseId: string) => void;
  onOpenAuditRecord: (caseId: string) => void;
}

export const ApplicationWorkspace: React.FC<ApplicationWorkspaceProps> = ({
  currentCase,
  onBackToQueue,
  onOpenPolicyAssistant,
  onOpenAuditRecord
}) => {
  const { updateCase } = useCases();

  const {
    applicant,
    creditRisk,
    fraudSignals,
    policyRules,
    shapContributions,
    reasonCodes,
    supplementarySignals,
    decision
  } = currentCase;

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const viewMode = 'guided';
  const [inspectShapFeature, setInspectShapFeature] = useState<ShapContribution | null>(null);

  const isRefer = decision === 'REFER';

  const failedRules = policyRules.filter(r => r.result === 'FAILED');
  const isThinFile = applicant.segment === 'THIN-FILE';

  // Construct structured workflow steps with live status badges
  const workflowSteps: StepItem[] = [
    {
      id: 'profile',
      stepNumber: 1,
      title: 'Application & Financials',
      subtitle: `₹${(applicant.requestedAmount / 100000).toFixed(1)}L loan requested`,
      icon: User,
      status: 'passed',
      badgeText: 'Verified'
    },
    {
      id: 'policy',
      stepNumber: 2,
      title: 'Policy & Hard Rules',
      subtitle: `${policyRules.length - failedRules.length}/${policyRules.length} rules passed`,
      icon: Scale,
      status: failedRules.length > 0 ? 'failed' : 'passed',
      badgeText: failedRules.length > 0 ? `${failedRules.length} Failed` : 'All Passed'
    },
    {
      id: 'credit',
      stepNumber: 3,
      title: 'Credit Risk & AI',
      subtitle: `${creditRisk.scorePercent} default risk (${creditRisk.riskBand})`,
      icon: BrainCircuit,
      status: creditRisk.score > 0.4 ? 'warning' : 'passed',
      badgeText: creditRisk.riskBand
    },
    {
      id: 'fraud',
      stepNumber: 4,
      title: 'Fraud & Identity Signals',
      subtitle: `${fraudSignals.overallRiskPercent} fraud score`,
      icon: ShieldAlert,
      status: fraudSignals.overallRiskScore > 0.4 ? 'failed' : fraudSignals.overallRiskScore > 0.2 ? 'warning' : 'passed',
      badgeText: fraudSignals.riskLevel
    },
    {
      id: 'decision',
      stepNumber: 5,
      title: 'Sign-off & Final Decision',
      subtitle: `Automated: ${decision}`,
      icon: FileSignature,
      status: 'neutral',
      badgeText: 'Action'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-3.5 pb-8 select-none">
      {/* ── 1. MINIMAL HEADER ── */}
      <div className="clay-card p-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Left: Identity */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={onBackToQueue}
              className="p-1.5 rounded-lg clay-button-secondary hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              title="Return to Queue"
            >
              <ArrowLeft className="w-4 h-4 text-slate-900" />
            </button>

            <div className="flex items-center space-x-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-slate-500">
                {currentCase.id.length > 12 ? '#' + currentCase.id.slice(0, 8) : currentCase.id}
              </span>
              <h1 className="text-sm font-bold text-slate-900 font-sans">
                {applicant.name}
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-white font-mono">
                {isThinFile ? 'THIN-FILE' : 'ESTABLISHED'}
              </span>
            </div>
          </div>

          {/* Right: Controls & Verdict */}
          <div className="flex items-center space-x-2 flex-wrap">
            {/* PolicyLens Button */}
            <button
              onClick={() => onOpenPolicyAssistant(currentCase.id)}
              className="clay-button-primary text-xs px-2.5 py-1 flex items-center space-x-1 cursor-pointer font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>PolicyLens</span>
            </button>

            {/* Audit Trace Button */}
            <button
              onClick={() => onOpenAuditRecord(currentCase.id)}
              className="clay-button-secondary text-xs px-2.5 py-1 flex items-center space-x-1 font-bold cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-slate-700" />
              <span>Audit</span>
            </button>

            {/* Verdict Badge */}
            <button
              type="button"
              onClick={() => setCurrentStepIndex(4)}
              title="Click to open Sign-off & Final Decision"
              className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-900 text-white border border-slate-900 flex items-center space-x-1 font-mono hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <span>{isRefer ? 'MANUAL REVIEW' : decision}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. GUIDED WORKFLOW STEPPER BAR ── */}
      <DecisionTrace
        currentStepIndex={currentStepIndex}
        onSelectStep={stepIdx => setCurrentStepIndex(stepIdx)}
        steps={workflowSteps}
      />

      {/* ── 3. MAIN WORKSPACE CONTAINER (CLEAN & CENTERED) ── */}
      <div className="w-full space-y-4">
        {viewMode === 'guided' ? (
          <div className="space-y-4">
            {/* STEP 1: Application & Financials */}
            {currentStepIndex === 0 && (
              <div className="space-y-4 animate-fadeIn">
                <ApplicantProfileCard applicant={applicant} supplementary={supplementarySignals} />
                {isThinFile && (
                  <ThinFilePanel applicant={applicant} supplementary={supplementarySignals} />
                )}
              </div>
            )}

            {/* STEP 2: Policy & Hard Rules */}
            {currentStepIndex === 1 && (
              <div className="space-y-4 animate-fadeIn">
                <PolicyRulesPanel rules={policyRules} />
              </div>
            )}

            {/* STEP 3: Credit Risk & AI Explainability */}
            {currentStepIndex === 2 && (
              <div className="space-y-4 animate-fadeIn">
                <ShapChart
                  contributions={shapContributions}
                  onSelectContribution={item => setInspectShapFeature(item)}
                />
                <ReasonCodeList reasonCodes={reasonCodes} />
              </div>
            )}

            {/* STEP 4: Fraud & Identity Signals */}
            {currentStepIndex === 3 && (
              <div className="space-y-4 animate-fadeIn">
                <FraudSignalPanel fraudSignals={fraudSignals} />
              </div>
            )}

            {/* STEP 5: Sign-off & Final Decision */}
            {currentStepIndex === 4 && (
              <div className="space-y-4 animate-fadeIn">
                <UnderwriterDecisionCard
                  currentCase={currentCase}
                  onDecisionSubmit={(dec, notes) => {
                    updateCase({
                      ...currentCase,
                      decision: dec,
                      underwriterNotes: notes
                    });
                  }}
                  onOpenPolicyAssistant={onOpenPolicyAssistant}
                />
              </div>
            )}

            {/* Guided Step Navigation Bar (Previous / Next Buttons) */}
            <div className="clay-card p-3.5 flex items-center justify-between">
              <button
                type="button"
                disabled={currentStepIndex === 0}
                onClick={() => setCurrentStepIndex(prev => Math.max(prev - 1, 0))}
                className={`px-4 py-2 rounded-xl text-xs font-bold font-sans flex items-center space-x-2 transition-all ${
                  currentStepIndex === 0
                    ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                    : 'clay-button-secondary text-slate-700 hover:bg-slate-200 cursor-pointer'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>
                  Previous: {currentStepIndex > 0 ? workflowSteps[currentStepIndex - 1].title : 'Start'}
                </span>
              </button>

              <div className="text-xs font-bold text-slate-600 font-sans hidden sm:block">
                Stage {currentStepIndex + 1} of {workflowSteps.length}: <span className="text-slate-900">{workflowSteps[currentStepIndex].title}</span>
              </div>

              <button
                type="button"
                disabled={currentStepIndex === workflowSteps.length - 1}
                onClick={() => setCurrentStepIndex(prev => Math.min(prev + 1, workflowSteps.length - 1))}
                className={`px-4 py-2 rounded-xl text-xs font-bold font-sans flex items-center space-x-2 transition-all ${
                  currentStepIndex === workflowSteps.length - 1
                    ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                    : 'clay-button-primary text-white cursor-pointer'
                }`}
              >
                <span>
                  Next: {currentStepIndex < workflowSteps.length - 1 ? workflowSteps[currentStepIndex + 1].title : 'Done'}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* ALL-IN-ONE OVERVIEW MODE */
          <div className="space-y-4 animate-fadeIn">
            {/* Section 1: Financial */}
            <ApplicantProfileCard applicant={applicant} supplementary={supplementarySignals} />
            {isThinFile && (
              <ThinFilePanel applicant={applicant} supplementary={supplementarySignals} />
            )}

            {/* Section 2: Credit Risk & Model Explanation */}
            <ShapChart
              contributions={shapContributions}
              onSelectContribution={item => setInspectShapFeature(item)}
            />

            {/* Section 3: Why this decision? */}
            <ReasonCodeList reasonCodes={reasonCodes} />

            {/* Section 4: Fraud & Identity Signals */}
            <FraudSignalPanel fraudSignals={fraudSignals} />

            {/* Section 5: Policy & Hard Rules */}
            <PolicyRulesPanel rules={policyRules} />

            {/* Section 6: Final Decision Sign-off */}
            <UnderwriterDecisionCard
              currentCase={currentCase}
              onOpenPolicyAssistant={onOpenPolicyAssistant}
            />
          </div>
        )}
      </div>

      {/* SHAP Inspection Drawer */}
      <ContextDrawer
        isOpen={!!inspectShapFeature}
        onClose={() => setInspectShapFeature(null)}
        title={inspectShapFeature?.displayName || 'Feature Attribution'}
        subtitle="SHAP Feature Contribution Inspector"
      >
        {inspectShapFeature && (
          <div className="space-y-4 text-xs font-sans">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 block font-bold uppercase">Observed Value</span>
              <span className="text-slate-900 font-bold text-sm font-mono mt-0.5 block">
                {String(inspectShapFeature.rawValue)}
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 block font-bold uppercase">Model Impact (SHAP)</span>
              <span
                className={`font-bold text-sm font-mono mt-0.5 block ${
                  inspectShapFeature.contribution > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {inspectShapFeature.contribution > 0 ? '+' : ''}
                {inspectShapFeature.contribution.toFixed(3)}
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500 block font-bold uppercase">Associated Reason Code</span>
              <span className="text-amber-700 font-bold font-mono">{inspectShapFeature.reasonCode}</span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500 block font-bold uppercase">Analyst Rationale</span>
              <p className="text-slate-800 text-xs leading-relaxed">{inspectShapFeature.description}</p>
            </div>
          </div>
        )}
      </ContextDrawer>
    </div>
  );
};
