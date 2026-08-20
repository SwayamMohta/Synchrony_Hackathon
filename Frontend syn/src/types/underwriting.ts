export type DecisionType = 'APPROVE' | 'REFER' | 'DECLINE';
export type CaseStatus = 'Completed' | 'Review' | 'Pending';
export type ApplicantSegment = 'THIN-FILE' | 'ESTABLISHED';
export type RuleStatus = 'PASSED' | 'TRIGGERED' | 'FAILED';

export interface ApplicantProfile {
  id: string;
  name: string;
  age: number;
  annualIncome: number; // in ₹
  requestedAmount: number; // in ₹
  employmentLengthYears: number;
  segment: ApplicantSegment;
  creditHistoryMonths: number;
  tradelinesCount: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyDebtPayments: number;
  dependents: number;
  city?: string;
  occupation?: string;
}

export interface CreditRisk {
  score: number; // 0.0 to 1.0 (estimated default probability)
  scorePercent: string;
  modelVersion: string;
  modelType: string; // e.g., 'XGBoost v1.2'
  riskBand: 'Low' | 'Moderate' | 'High' | 'Severe';
}

export interface FraudSignalItem {
  id: string;
  label: string;
  value: string;
  threshold: string;
  status: 'NORMAL' | 'ELEVATED' | 'HIGH';
  description: string;
}

export interface FraudSignals {
  overallRiskScore: number; // 0.0 to 1.0
  overallRiskPercent: string;
  signals: FraudSignalItem[];
  riskLevel: 'Low' | 'Elevated' | 'High';
}

export interface PolicyRuleCheck {
  id: string;
  name: string;
  observedValue: string;
  threshold: string;
  result: RuleStatus;
  category: 'Affordability' | 'Eligibility' | 'Credit History' | 'Velocity';
  description: string;
}

export interface ShapContribution {
  featureKey: string;
  displayName: string;
  rawValue: string | number;
  contribution: number; // positive increases risk score, negative decreases risk score
  source: 'Canonical Credit Feature' | 'Supplementary Cash-Flow Signal' | 'Behavioral Signal';
  reasonCode: string;
  description: string;
}

export interface ReasonCode {
  code: string; // e.g., '01', '02'
  title: string;
  detail: string;
  category: 'MODEL_EXPLANATION' | 'DECISION_POLICY_REASON' | 'FRAUD_REASON';
  type: 'positive' | 'neutral' | 'negative';
}

export interface DecisionTraceStage {
  step: number;
  name: string;
  label: string;
  detail: string;
  timestamp: string;
  status: 'PASSED' | 'WARNING' | 'FAILED' | 'COMPLETED';
}

export interface AuditRecord {
  requestId: string;
  timestamp: string;
  applicantId: string;
  applicantName: string;
  decision: DecisionType;
  modelVersion: string;
  featureSchemaVersion: string;
  policyVersion: string;
  creditRiskScore: number;
  fraudRiskScore: number;
  policyChecksPassed: number;
  policyChecksTotal: number;
  traceStages: DecisionTraceStage[];
  reconstructedPayload: Record<string, any>;
}

export interface ThinFileSupplementarySignals {
  incomeStabilityScore: 'Strong' | 'Moderate' | 'Weak';
  expenseProfile: 'Conservative' | 'Moderate' | 'Elevated';
  behavioralSignals: 'Normal' | 'Irregular' | 'High Velocity';
  bankCashflowSurplus: number; // monthly net surplus in ₹
}

export interface ApplicationCase {
  id: string; // e.g. PR-10482
  requestId: string;
  submittedAt: string;
  updatedAt: string;
  applicant: ApplicantProfile;
  creditRisk: CreditRisk;
  fraudSignals: FraudSignals;
  policyRules: PolicyRuleCheck[];
  shapContributions: ShapContribution[];
  reasonCodes: ReasonCode[];
  supplementarySignals: ThinFileSupplementarySignals;
  traceStages: DecisionTraceStage[];
  decision: DecisionType;
  status: CaseStatus;
  policyVersion: string;
  featureSchemaVersion: string;
  auditRecord: AuditRecord;
  underwriterNotes?: string;
}

export interface RagSource {
  docTitle: string;
  section: string;
  snippet: string;
}

export interface RagResponse {
  query: string;
  applicationId?: string;
  answer: string;
  sources: RagSource[];
  generatedAt: string;
  isAiGeneratedExplanation: boolean;
}

export interface ModelEvalMetric {
  segment: 'Overall' | 'Thin-File' | 'Established';
  baselineAuc: number;
  proposedAuc: number;
  baselinePrecision: number;
  proposedPrecision: number;
  baselineRecall: number;
  proposedRecall: number;
  baselineF1: number;
  proposedF1: number;
  sampleCount: number;
}
