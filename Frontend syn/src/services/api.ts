import type {
  ApplicationCase,
  RagResponse,
  ModelEvalMetric,
  PolicyRuleCheck
} from '../types/underwriting';
import {
  askAnalyst,
  getApplications,
  getModelMetrics,
} from '../api/underwritingApi';
import type { DecisionSnapshot } from '../api/underwritingApi';

const FEATURE_LABELS: Record<string, string> = {
  'RevolvingUtilizationOfUnsecuredLines': 'Revolving Credit Utilization',
  'age': 'Age',
  'NumberOfTime30-59DaysPastDueNotWorse': '30-59 Day Delinquencies',
  'DebtRatio': 'Debt-to-Income Ratio',
  'MonthlyIncome': 'Monthly Income',
  'NumberOfOpenCreditLinesAndLoans': 'Open Credit Lines',
  'NumberOfTimes90DaysLate': '90+ Day Delinquencies',
  'NumberRealEstateLoansOrLines': 'Real Estate Loans',
  'NumberOfTime60-89DaysPastDueNotWorse': '60-89 Day Delinquencies',
  'NumberOfDependents': 'Dependents',
};

const FALLBACK_NAMES = [
  'Aarav Mehta',
  'Ishaan Verma',
  'Rohan Kapoor',
  'Vikram Malhotra',
  'Aditya Nair',
  'Rahul Sharma',
  'Arjun Singh',
  'Kabir Iyer',
  'Dev Patel',
  'Karan Rao',
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function formatTimestamp(ts: string | null | undefined): string {
  return ts || new Date().toISOString().replace('T', ' ').slice(0, 19);
}

export function mapSnapshotToApplicationCase(s: DecisionSnapshot): ApplicationCase {
  const inputs = s.inputs || {};

  const rawName = (inputs.name as string) || '';
  const name = rawName.trim() ? rawName.trim() : FALLBACK_NAMES[hashString(s.application_id || s.request_id || s.applicant_id || 'applicant') % FALLBACK_NAMES.length];
  const age = Number(inputs.age) || 0;
  const annualIncome = Number(inputs.annual_income) || 0;
  const requestedAmount = Number(inputs.requested_amount) || 0;
  const monthlyIncome = Number(inputs.avg_monthly_income) || Math.round(annualIncome / 12) || 0;
  const monthlyExpenses = Number(inputs.avg_monthly_expenses) || 0;
  const monthlyDebtPayments = Number(inputs.monthly_debt_payments) || 0;
  const dependents = Number(inputs.dependents) || 0;
  const tradelinesCount = Number(inputs.num_open_credit_lines) || 0;
  const creditHistoryMonths = Number(inputs.credit_history_months) || 0;
  const employmentLengthYears = Number(inputs.employment_length_years) || 0;
  const city = (inputs.city as string) || undefined;
  const occupation = (inputs.occupation as string) || undefined;

  const segment = s.profile?.segment || ((creditHistoryMonths < 12 || tradelinesCount < 3) ? 'THIN-FILE' : 'ESTABLISHED');
  const decision = s.decision.toUpperCase() as 'APPROVE' | 'REFER' | 'DECLINE';
  const credit = Number(s.credit_risk_score) || 0;
  const fraud = Number(s.fraud_risk_score) || 0;
  const dti = s.profile ? Number(s.profile.dti) || 0 : monthlyIncome > 0 ? (monthlyExpenses + monthlyDebtPayments) / monthlyIncome : 0;
  const fs = s.fraud_signals || {};
  const appsPerDevice = Number(fs.apps_per_device_24h) || 0;
  const appsPerIp = Number(fs.apps_per_ip_24h) || 0;
  const identity = (fs.device_identity_consistency == null) ? 1 : Number(fs.device_identity_consistency);
  const riskBand = s.profile?.risk_band || (credit < 0.25 ? 'Low' : credit < 0.5 ? 'Moderate' : credit < 0.7 ? 'High' : 'Severe');
  const fraudLevel = s.profile?.fraud_level || (fraud < 0.25 ? 'Low' : fraud < 0.5 ? 'Elevated' : 'High');

  const policyRules: PolicyRuleCheck[] = [
    {
      id: 'POL_AGE',
      name: 'Minimum Age',
      observedValue: `${age} yrs`,
      threshold: '>= 18 yrs',
      result: age >= 18 ? 'PASSED' : 'FAILED',
      category: 'Eligibility',
      description: 'Applicant must be at least 18 years old.',
    },
    {
      id: 'POL_AFFORD',
      name: 'Affordability (DTI Ratio)',
      observedValue: `${dti.toFixed(2)} (${Math.round(dti * 100)}%)`,
      threshold: '<= 0.65 (65%)',
      result: dti <= 0.65 ? 'PASSED' : 'FAILED',
      category: 'Affordability',
      description: 'Debt + expenses must not exceed 65% of monthly income.',
    },
    {
      id: 'POL_DELINQ',
      name: 'Delinquency Threshold',
      observedValue: `${Number(inputs.delinquencies_90_plus) || 0} severe (90+ DPD)`,
      threshold: '< 4',
      result: (Number(inputs.delinquencies_90_plus) || 0) < 4 ? 'PASSED' : 'FAILED',
      category: 'Credit History',
      description: 'Fewer than 4 payments 90+ days past due.',
    },
    {
      id: 'POL_VELOCITY',
      name: 'Fraud Velocity Check',
      observedValue: `${appsPerDevice} / 24h`,
      threshold: '<= 5 / 24h',
      result: appsPerDevice <= 5 ? 'PASSED' : 'FAILED',
      category: 'Velocity',
      description: 'Submission velocity across device fingerprint.',
    },
  ];

  const policyChecksPassed = policyRules.filter(r => r.result === 'PASSED').length;

  const creditLabel = `${(credit * 100).toFixed(1)}% risk score`;
  const fraudLabel = `${(fraud * 100).toFixed(1)}% (${fraudLevel} risk)`;

  return {
    id: s.application_id,
    requestId: s.request_id,
    submittedAt: formatTimestamp(s.timestamp),
    updatedAt: formatTimestamp(s.timestamp),
    decision,
    status: decision === 'REFER' ? 'Review' : 'Completed',
    policyVersion: s.policy_version,
    featureSchemaVersion: s.feature_schema_version,
    applicant: {
      id: s.applicant_id || s.application_id,
      name,
      age,
      annualIncome,
      requestedAmount,
      employmentLengthYears,
      segment,
      creditHistoryMonths,
      tradelinesCount,
      monthlyIncome,
      monthlyExpenses,
      monthlyDebtPayments,
      dependents,
      city,
      occupation,
    },
    creditRisk: {
      score: credit,
      scorePercent: `${(credit * 100).toFixed(1)}%`,
      modelVersion: s.model_version,
      modelType: 'XGBoost',
      riskBand,
    },
    fraudSignals: {
      overallRiskScore: fraud,
      overallRiskPercent: `${(fraud * 100).toFixed(1)}%`,
      riskLevel: fraudLevel,
      signals: [
        {
          id: 'sig_ip',
          label: 'IP VELOCITY',
          value: `${appsPerIp} applications / 24h`,
          threshold: '< 5 / 24h',
          status: appsPerIp >= 5 ? 'HIGH' : 'NORMAL',
          description: 'Applications from this IP address in the last 24 hours.',
        },
        {
          id: 'sig_device',
          label: 'DEVICE REUSE',
          value: `${appsPerDevice} applications / 24h`,
          threshold: '< 4 / 24h',
          status: appsPerDevice >= 5 ? 'HIGH' : appsPerDevice >= 4 ? 'ELEVATED' : 'NORMAL',
          description: 'Applications from this device fingerprint in the last 24 hours.',
        },
        {
          id: 'sig_identity',
          label: 'IDENTITY CONSISTENCY',
          value: `Match ${Math.round(identity * 100)}%`,
          threshold: '> 90%',
          status: identity < 0.5 ? 'ELEVATED' : 'NORMAL',
          description: 'Device-to-identity consistency across the session.',
        },
      ],
    },
    policyRules,
    shapContributions: Object.entries(s.shap_top_features || {}).map(([featureKey, contribution]) => ({
      featureKey,
      displayName: FEATURE_LABELS[featureKey] || featureKey,
      rawValue: '',
      contribution,
      source: 'Canonical Credit Feature' as const,
      reasonCode: '',
      description: '',
    })),
    reasonCodes: (s.reason_codes || []).map((title, i) => ({
      code: String(i + 1).padStart(2, '0'),
      title,
      detail: title,
      category: 'DECISION_POLICY_REASON' as const,
      type: 'negative' as const,
    })),
    supplementarySignals: {
      incomeStabilityScore: s.profile?.income_stability || (employmentLengthYears >= 2 ? 'Strong' : employmentLengthYears > 0 ? 'Moderate' : 'Weak'),
      expenseProfile: s.profile?.expense_profile || (dti <= 0.5 ? 'Conservative' : dti <= 0.65 ? 'Moderate' : 'Elevated'),
      behavioralSignals: s.profile?.behavioral_signals || (appsPerDevice <= 3 ? 'Normal' : 'High Velocity'),
      bankCashflowSurplus: s.profile ? Number(s.profile.bank_cashflow_surplus) || 0 : Math.max(monthlyIncome - monthlyExpenses - monthlyDebtPayments, 0),
    },
    traceStages: [
      { step: 1, name: 'APPLICATION', label: `${Object.keys(inputs).length} input fields`, detail: 'Application received & sanitized', timestamp: formatTimestamp(s.timestamp), status: 'COMPLETED' },
      { step: 2, name: 'CANONICAL FEATURES', label: `${Object.keys(s.shap_top_features || {}).length} credit features`, detail: 'Feature engineering & normalization', timestamp: formatTimestamp(s.timestamp), status: 'COMPLETED' },
      { step: 3, name: 'CREDIT RISK', label: creditLabel, detail: `XGBoost model execution ${s.model_version}`, timestamp: formatTimestamp(s.timestamp), status: 'COMPLETED' },
      { step: 4, name: 'FRAUD SIGNALS', label: fraudLabel, detail: 'Rule-based velocity & device check', timestamp: formatTimestamp(s.timestamp), status: 'COMPLETED' },
      { step: 5, name: 'POLICY ENGINE', label: `${policyChecksPassed} / 4 passed`, detail: `Deterministic ${s.policy_version} evaluation`, timestamp: formatTimestamp(s.timestamp), status: 'COMPLETED' },
      { step: 6, name: 'FINAL DECISION', label: decision, detail: 'Deterministic decision generated', timestamp: formatTimestamp(s.timestamp), status: decision === 'APPROVE' ? 'PASSED' : decision === 'REFER' ? 'WARNING' : 'FAILED' },
    ],
    auditRecord: {
      requestId: s.request_id,
      timestamp: s.timestamp || new Date().toISOString(),
      applicantId: s.applicant_id || '',
      applicantName: name,
      decision,
      modelVersion: s.model_version,
      featureSchemaVersion: s.feature_schema_version,
      policyVersion: s.policy_version,
      creditRiskScore: credit,
      fraudRiskScore: fraud,
      policyChecksPassed,
      policyChecksTotal: 4,
      traceStages: [],
      reconstructedPayload: inputs,
    },
  };
}

export async function loadCases(token: string): Promise<ApplicationCase[]> {
  const snaps = await getApplications(token);
  return snaps.map(mapSnapshotToApplicationCase);
}

export async function fetchModelEvalMetrics(token: string): Promise<ModelEvalMetric[]> {
  const { credit } = await getModelMetrics(token);
  return [
    {
      segment: 'Overall',
      baselineAuc: Number(credit.lr_baseline_auc) || 0,
      proposedAuc: Number(credit.xgb_auc) || 0,
      baselinePrecision: 0,
      proposedPrecision: Number(credit.precision) || 0,
      baselineRecall: 0,
      proposedRecall: Number(credit.recall) || 0,
      baselineF1: 0,
      proposedF1: Number(credit.f1) || 0,
      sampleCount: Number(credit.n_test) || 0,
    },
  ];
}

export async function queryPolicyAssistant(query: string, caseId?: string, token?: string): Promise<RagResponse> {
  const res = await askAnalyst(query, caseId || '', token || '');
  return {
    query,
    applicationId: caseId,
    answer: res.explanation,
    sources: (res.policy_basis || []).map(b => ({
      docTitle: b.claim || b.chunk_id,
      section: '',
      snippet: b.claim || '',
    })),
    generatedAt: new Date().toISOString(),
    isAiGeneratedExplanation: res.status !== 'refused',
  };
}
