/**
 * DecisionEngineView.tsx
 * Unified New Application Intake & Automated Credit Decisioning Engine.
 * Features 2x2 Grid Layout for ergonomic full-width screen utilization,
 * 1-click preset scenarios, complete applicant credit intake,
 * real-time XGBoost ML decisioning, SHAP explainability, deterministic policy checks,
 * and automatic registration into the Applications Hub queue.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cpu,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  RotateCcw,
  User,
  DollarSign,
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus
} from 'lucide-react';
import {
  postDecision,
  getApplication,
  AuthError,
} from '../../api/underwritingApi';
import type { DecisionResponse, DecisionRequest } from '../../api/underwritingApi';
import { useAuth } from '../../context/AuthContext';
import { useCases } from '../../context/CaseContext';
import { mapSnapshotToApplicationCase } from '../../services/api';
import type { ApplicationCase } from '../../types/underwriting';
import { DecisionResultCard } from './DecisionResultCard';
import { useRotatingStatus } from '../../hooks/useRotatingStatus';

interface DecisionEngineViewProps {
  onSessionExpired: () => void;
  pendingCase?: ApplicationCase | null;
  onPendingCaseConsumed?: () => void;
}

// ─── Demo Scenarios ───────────────────────────────────────────────────────────

type ScenarioKey = 'low_risk' | 'high_debt' | 'suspicious';

interface FormState {
  name: string;
  applicant_id: string;
  city: string;
  occupation: string;
  age: number | '';
  dependents: number | '';
  annual_income: number | '';
  requested_amount: number | '';
  credit_utilization: number | '';
  num_open_credit_lines: number | '';
  delinquencies_30_59: number | '';
  delinquencies_60_89: number | '';
  delinquencies_90_plus: number | '';
  num_real_estate_loans: number | '';
  monthly_debt_payments: number | '';
  avg_monthly_income: number | '';
  avg_monthly_expenses: number | '';
  overdraft_count_90d: number | '';
  device_id: string;
  ip_address: string;
  ip_velocity?: number;
}

const SCENARIOS: Record<ScenarioKey, { label: string; tag: string; expected: string; hint: string; data: Partial<FormState> }> = {
  low_risk: {
    label: 'Low-Risk Thin-File',
    tag: 'Prime Tier',
    expected: 'APPROVE',
    hint: 'Low credit utilization (8%), stable income surplus, clean bureau history',
    data: {
      name: 'Aarav Mehta',
      applicant_id: 'APP-8491',
      city: 'Pune',
      occupation: 'Software Engineer',
      age: 28,
      dependents: 0,
      annual_income: 900000,
      requested_amount: 300000,
      credit_utilization: 0.08,
      num_open_credit_lines: 2,
      delinquencies_30_59: 0,
      delinquencies_60_89: 0,
      delinquencies_90_plus: 0,
      num_real_estate_loans: 0,
      monthly_debt_payments: 3500,
      avg_monthly_income: 75000,
      avg_monthly_expenses: 26000,
      overdraft_count_90d: 0,
      device_id: 'device_clean_ios17',
      ip_address: '103.21.14.82',
      ip_velocity: 1,
    },
  },
  high_debt: {
    label: 'High-Debt Overburdened',
    tag: 'Excessive DTI',
    expected: 'DECLINE',
    hint: 'DTI > 53%, high credit utilization (88%), recent 30-day delinquency',
    data: {
      name: 'Vikram Malhotra',
      applicant_id: 'APP-7239',
      city: 'Delhi',
      occupation: 'Retail Business Owner',
      age: 42,
      dependents: 2,
      annual_income: 720000,
      requested_amount: 650000,
      credit_utilization: 0.88,
      num_open_credit_lines: 8,
      delinquencies_30_59: 2,
      delinquencies_60_89: 0,
      delinquencies_90_plus: 0,
      num_real_estate_loans: 1,
      monthly_debt_payments: 32000,
      avg_monthly_income: 60000,
      avg_monthly_expenses: 36000,
      overdraft_count_90d: 3,
      device_id: 'device_multi_user_4',
      ip_address: '49.36.12.19',
      ip_velocity: 3,
    },
  },
  suspicious: {
    label: 'Suspicious Velocity Signal',
    tag: 'Fraud Anomaly',
    expected: 'REFER',
    hint: 'Multiple rapid applications across IP subnets, elevated submission velocity',
    data: {
      name: 'Rohan Kapoor',
      applicant_id: 'APP-6102',
      city: 'Mumbai',
      occupation: 'Freelance Designer',
      age: 31,
      dependents: 0,
      annual_income: 600000,
      requested_amount: 250000,
      credit_utilization: 0.25,
      num_open_credit_lines: 3,
      delinquencies_30_59: 0,
      delinquencies_60_89: 0,
      delinquencies_90_plus: 0,
      num_real_estate_loans: 0,
      monthly_debt_payments: 4500,
      avg_monthly_income: 50000,
      avg_monthly_expenses: 21000,
      overdraft_count_90d: 0,
      device_id: 'suspicious_proxy_dev',
      ip_address: '10.0.0.99',
      ip_velocity: 7,
    },
  },
};

const DEFAULT_FORM: FormState = {
  name: 'Priya Sundaram',
  applicant_id: 'APP-9925',
  city: 'Chennai',
  occupation: 'UX Designer',
  age: 26,
  dependents: 0,
  annual_income: 750000,
  requested_amount: 250000,
  credit_utilization: 0.12,
  num_open_credit_lines: 2,
  delinquencies_30_59: 0,
  delinquencies_60_89: 0,
  delinquencies_90_plus: 0,
  num_real_estate_loans: 0,
  monthly_debt_payments: 4000,
  avg_monthly_income: 62500,
  avg_monthly_expenses: 24000,
  overdraft_count_90d: 0,
  device_id: 'iphone_15_pro_auth',
  ip_address: '122.164.21.90',
  ip_velocity: 1,
};

// Currency format helper
function formatIndianCurrencyCompact(val: number): string {
  if (isNaN(val) || val <= 0) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k`;
  return `₹${Math.round(val).toLocaleString('en-IN')}`;
}

interface NumberStepperProps {
  value: number | '';
  onChange: (val: any) => void;
  onAdjust: (delta: number) => void;
  min?: number;
  max?: number;
  className?: string;
  isDanger?: boolean;
}

const NumberStepper: React.FC<NumberStepperProps> = ({
  value,
  onChange,
  onAdjust,
  min = 0,
  max = 999,
  className = '',
  isDanger = false,
}) => {
  return (
    <div
      className={`flex items-stretch h-[32px] w-full bg-[#f8fafc] border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-slate-900/10 focus-within:border-slate-900 focus-within:bg-white transition-all ${
        isDanger ? 'border-[#fca5a5] bg-[#fef2f2]' : 'border-[#cbd5e1]'
      } ${className}`}
    >
      <button
        type="button"
        onClick={() => onAdjust(-1)}
        className="w-8 flex items-center justify-center bg-[#f1f5f9] hover:bg-[#e2e8f0] active:bg-[#cbd5e1] text-[#475467] border-0 border-r border-[#cbd5e1] transition-colors cursor-pointer shrink-0 select-none"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        className={`w-full text-center text-xs font-semibold bg-transparent border-0 outline-none focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none px-1 ${
          isDanger ? 'text-[#b91c1c] font-bold' : 'text-[#0f172a]'
        }`}
      />
      <button
        type="button"
        onClick={() => onAdjust(1)}
        className="w-8 flex items-center justify-center bg-[#f1f5f9] hover:bg-[#e2e8f0] active:bg-[#cbd5e1] text-[#475467] border-0 border-l border-[#cbd5e1] transition-colors cursor-pointer shrink-0 select-none"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export const DecisionEngineView: React.FC<DecisionEngineViewProps> = ({
  onSessionExpired,
  pendingCase,
  onPendingCaseConsumed
}) => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { addCase, setSelectedCaseId } = useCases();

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DecisionResponse | null>(null);
  const [evaluatedCase, setEvaluatedCase] = useState<ApplicationCase | null>(null);
  const [activeScenario, setActiveScenario] = useState<ScenarioKey | null>(null);

  const decisionStatus = useRotatingStatus(
    ['Pondering…', 'Musing…', 'Crunching the numbers…', 'Consulting the policy manual…', 'Weighing the risk…'],
    850
  );

  // Auto-run when redirected with pendingCase
  useEffect(() => {
    if (!pendingCase) return;
    const ap = pendingCase.applicant;
    setForm({
      name: ap.name,
      applicant_id: ap.id,
      city: ap.city || 'India',
      occupation: ap.occupation || 'Professional',
      age: ap.age,
      dependents: ap.dependents,
      annual_income: ap.annualIncome,
      requested_amount: ap.requestedAmount,
      credit_utilization: 0.1,
      num_open_credit_lines: ap.tradelinesCount,
      delinquencies_30_59: 0,
      delinquencies_60_89: 0,
      delinquencies_90_plus: 0,
      num_real_estate_loans: 0,
      monthly_debt_payments: ap.monthlyDebtPayments,
      avg_monthly_income: ap.monthlyIncome,
      avg_monthly_expenses: ap.monthlyExpenses,
      overdraft_count_90d: 0,
      device_id: '',
      ip_address: '',
      ip_velocity: 1,
    });
    setEvaluatedCase(pendingCase);
    onPendingCaseConsumed?.();
  }, [pendingCase, onPendingCaseConsumed]);

  const handleFieldChange = useCallback((name: keyof FormState, value: any) => {
    setForm(prev => {
      const next = { ...prev, [name]: value };
      // Auto compute monthly income if annual income changes
      if (name === 'annual_income' && value !== '') {
        const annual = Number(value);
        next.avg_monthly_income = Math.round(annual / 12);
      }
      return next;
    });
    setResult(null);
    setEvaluatedCase(null);
  }, []);

  const adjustNumericField = useCallback((name: keyof FormState, delta: number, min = 0, max = 999) => {
    setForm(prev => {
      const current = Number(prev[name]) || 0;
      const nextVal = Math.min(Math.max(current + delta, min), max);
      return { ...prev, [name]: nextVal };
    });
    setResult(null);
    setEvaluatedCase(null);
  }, []);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const applyScenario = (key: ScenarioKey) => {
    setActiveScenario(key);
    setForm(prev => ({ ...prev, ...SCENARIOS[key].data }));
    setResult(null);
    setEvaluatedCase(null);
    setError(null);
    showFeedback(`Loaded "${SCENARIOS[key].label}" preset`);
  };

  const handleReset = () => {
    setActiveScenario(null);
    setForm(DEFAULT_FORM);
    setResult(null);
    setEvaluatedCase(null);
    setError(null);
    showFeedback('Form inputs & decision evaluation reset');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!form.name.trim() || !form.applicant_id.trim()) {
      setError('Please provide Applicant Name and Bureau/Case ID before running decision.');
      return;
    }

    setLoading(true);

    const n = (v: number | '' | undefined) => (v === '' || v === undefined ? 0 : Number(v));

    try {
      if (!token) {
        setError('Please sign in to run a decision.');
        return;
      }

      const payload: DecisionRequest = {
        applicant_id: form.applicant_id.trim(),
        name: form.name.trim(),
        city: form.city.trim() || undefined,
        occupation: form.occupation.trim() || undefined,
        age: n(form.age),
        dependents: n(form.dependents),
        annual_income: n(form.annual_income),
        requested_amount: n(form.requested_amount),
        credit_utilization: n(form.credit_utilization),
        num_open_credit_lines: n(form.num_open_credit_lines),
        delinquencies_30_59: n(form.delinquencies_30_59),
        delinquencies_60_89: n(form.delinquencies_60_89),
        delinquencies_90_plus: n(form.delinquencies_90_plus),
        num_real_estate_loans: n(form.num_real_estate_loans),
        monthly_debt_payments: n(form.monthly_debt_payments),
        avg_monthly_income: n(form.avg_monthly_income),
        avg_monthly_expenses: n(form.avg_monthly_expenses),
        overdraft_count_90d: n(form.overdraft_count_90d),
        device_id: form.device_id.trim() || null,
        ip_address: form.ip_address.trim() || null,
        credit_history_months: n(form.num_open_credit_lines) > 2 ? 24 : 6,
        employment_length_years: 2.5,
      };

      const res = await postDecision(payload, token);
      setResult(res);

      const snap = await getApplication(res.application_id, token);
      const newCase = mapSnapshotToApplicationCase(snap);
      addCase(newCase);
      setSelectedCaseId(newCase.id);
      setEvaluatedCase(newCase);

      showFeedback('Decision evaluation complete');
    } catch (err: any) {
      if (err instanceof AuthError) {
        onSessionExpired();
      } else {
        setError(err?.message || 'An unexpected error occurred during underwriting execution.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerSubmit = () => {
    const formEl = document.getElementById('new-application-form') as HTMLFormElement;
    if (formEl) {
      if (formEl.checkValidity()) {
        formEl.requestSubmit();
      } else {
        formEl.reportValidity();
      }
    }
  };

  return (
    <div className="w-full space-y-3.5 select-none pb-8 font-sans relative">
      {/* ── Toast Feedback Notification Banner ── */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0f172a] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── Page Top Header ── */}
      <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] tracking-tight">
            Risk Evaluator
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated credit decisioning, ML risk scoring, and policy evaluation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#475467] bg-white border border-[#d0d5dd] hover:bg-[#f9fafb] active:bg-slate-100 transition-all cursor-pointer shadow-2xs"
            title="Reset form and results"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={handleTriggerSubmit}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-[#0f172a] hover:bg-[#1e293b] active:bg-[#334155] disabled:opacity-50 transition-all shadow-xs cursor-pointer uppercase tracking-wider"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                <span>{decisionStatus}</span>
              </>
            ) : (
              <>
                <Cpu className="w-3.5 h-3.5" />
                <span>Run Decision</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Compact Demo Presets Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold text-[#64748b] flex items-center gap-1 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-slate-800" />
          Presets:
        </span>
        {(Object.keys(SCENARIOS) as ScenarioKey[]).map(key => {
          const s = SCENARIOS[key];
          const isSelected = activeScenario === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => applyScenario(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-2 ${isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-bold'
                  : 'bg-white text-[#334155] border-[#cbd5e1] hover:bg-[#f8fafc]'
                }`}
            >
              <span>{s.label}</span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${s.expected === 'APPROVE'
                    ? isSelected ? 'bg-white/20 text-white' : 'bg-[#ecfdf5] text-[#065f46]'
                    : s.expected === 'REFER'
                      ? isSelected ? 'bg-white/20 text-white' : 'bg-[#fffbeb] text-[#92400e]'
                      : isSelected ? 'bg-white/20 text-white' : 'bg-[#fef2f2] text-[#991b1b]'
                  }`}
              >
                {s.expected}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 2x2 GRID INTAKE FORM ── */}
      <form id="new-application-form" onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-stretch">

          {/* ═══ CARD 1: Applicant Identity (Top Left) ═══ */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-[#f1f5f9]">
                <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-800 flex items-center justify-center">
                  <User className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
                  1. Applicant Identity & Demographics
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Full Name */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                    Applicant Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => handleFieldChange('name', e.target.value)}
                    placeholder="e.g. Priya Sundaram"
                    className="w-full px-3 py-1.5 text-xs text-[#0f172a] bg-[#f8fafc] border border-[#cbd5e1] rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-colors"
                  />
                </div>

                {/* Bureau / App ID */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                    Bureau / Case ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.applicant_id}
                    onChange={e => handleFieldChange('applicant_id', e.target.value)}
                    placeholder="APP-9925"
                    className="w-full px-3 py-1.5 text-xs font-mono text-[#0f172a] bg-[#f8fafc] border border-[#cbd5e1] rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-colors"
                  />
                </div>

                {/* Age with stepper */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                    Age (Years) <span className="text-red-500">*</span>
                  </label>
                  <NumberStepper
                    value={form.age}
                    min={18}
                    max={90}
                    onChange={val => handleFieldChange('age', val)}
                    onAdjust={delta => adjustNumericField('age', delta, 18, 90)}
                  />
                </div>

                {/* Dependents Pill selector */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                    Dependents Count
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {[0, 1, 2, 3].map(cnt => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => handleFieldChange('dependents', cnt)}
                        className={`py-1.5 text-xs font-semibold rounded-md border transition-all cursor-pointer ${Number(form.dependents) === cnt
                            ? 'bg-[#0f172a] text-white border-[#0f172a]'
                            : 'bg-[#f8fafc] text-[#334155] border-[#cbd5e1] hover:bg-[#f1f5f9]'
                          }`}
                      >
                        {cnt === 3 ? '3+' : cnt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* City */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                    City Location
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={e => handleFieldChange('city', e.target.value)}
                    placeholder="e.g. Chennai"
                    className="w-full px-3 py-1.5 text-xs text-[#0f172a] bg-[#f8fafc] border border-[#cbd5e1] rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-colors"
                  />
                </div>

                {/* Occupation */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                    Occupation
                  </label>
                  <input
                    type="text"
                    value={form.occupation}
                    onChange={e => handleFieldChange('occupation', e.target.value)}
                    placeholder="e.g. UX Designer"
                    className="w-full px-3 py-1.5 text-xs text-[#0f172a] bg-[#f8fafc] border border-[#cbd5e1] rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ═══ CARD 2: Loan Demand & Financial Capacity (Top Right) ═══ */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-[#f1f5f9]">
                <div className="w-6 h-6 rounded-md bg-[#ecfdf5] text-[#059669] flex items-center justify-center">
                  <DollarSign className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
                  2. Loan Request & Financial Capacity
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Requested Loan Amount */}
                <div className="p-2 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-[#0f172a]">
                      Requested Amount (₹) <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10.5px] font-bold text-slate-900">
                      {formatIndianCurrencyCompact(Number(form.requested_amount))}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#64748b]">₹</span>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      required
                      value={form.requested_amount}
                      onChange={e => handleFieldChange('requested_amount', e.target.value)}
                      className="w-full pl-7 pr-3 py-1 text-xs font-bold text-[#0f172a] bg-white border border-[#cbd5e1] rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[9.5px] text-[#64748b] pt-0.5">
                    <span>Presets:</span>
                    <div className="flex gap-1">
                      {[150000, 300000, 500000, 800000].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => handleFieldChange('requested_amount', amt)}
                          className="px-1.5 py-0.2 bg-white border border-[#cbd5e1] hover:bg-[#f1f5f9] rounded text-[9px] text-[#334155] cursor-pointer"
                        >
                          {amt / 100000}L
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Annual Stated Income */}
                <div className="p-2 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-[#0f172a]">
                      Annual Income (₹) <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10.5px] font-bold text-[#059669]">
                      {formatIndianCurrencyCompact(Number(form.annual_income))} / yr
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#64748b]">₹</span>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      required
                      value={form.annual_income}
                      onChange={e => handleFieldChange('annual_income', e.target.value)}
                      className="w-full pl-7 pr-3 py-1 text-xs font-bold text-[#0f172a] bg-white border border-[#cbd5e1] rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                    />
                  </div>
                </div>

                {/* Monthly Gross Income */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                    Monthly Income (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#64748b]">₹</span>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      required
                      value={form.avg_monthly_income}
                      onChange={e => handleFieldChange('avg_monthly_income', e.target.value)}
                      className="w-full pl-6 pr-3 py-1.5 text-xs text-[#0f172a] bg-[#f8fafc] border border-[#cbd5e1] rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                    />
                  </div>
                </div>

                {/* Monthly Living Expenses */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                    Living Expenses (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#64748b]">₹</span>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={form.avg_monthly_expenses}
                      onChange={e => handleFieldChange('avg_monthly_expenses', e.target.value)}
                      className="w-full pl-6 pr-3 py-1.5 text-xs text-[#0f172a] bg-[#f8fafc] border border-[#cbd5e1] rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                    />
                  </div>
                </div>

                {/* Monthly Existing Debt Payments */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                    Debt Obligations (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#64748b]">₹</span>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={form.monthly_debt_payments}
                      onChange={e => handleFieldChange('monthly_debt_payments', e.target.value)}
                      className="w-full pl-6 pr-3 py-1.5 text-xs text-[#0f172a] bg-[#f8fafc] border border-[#cbd5e1] rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                    />
                  </div>
                </div>

                {/* Bank Overdraft Count with stepper */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                    Overdraft Count (90d)
                  </label>
                  <NumberStepper
                    value={form.overdraft_count_90d}
                    min={0}
                    max={20}
                    onChange={val => handleFieldChange('overdraft_count_90d', val)}
                    onAdjust={delta => adjustNumericField('overdraft_count_90d', delta, 0, 20)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ═══ CARD 3: Credit History & Bureau Tradelines (Bottom Left) ═══ */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-[#f1f5f9]">
                <div className="w-6 h-6 rounded-md bg-[#eff6ff] text-[#2563eb] flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
                  3. Credit History & Bureau Tradelines
                </h2>
              </div>

              {/* Revolving Credit Utilization Slider & Number */}
              <div className="p-2 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-[#0f172a]">
                    Credit Utilization Ratio
                  </label>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.2 rounded-full ${Number(form.credit_utilization) <= 0.3
                        ? 'bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]'
                        : Number(form.credit_utilization) <= 0.6
                          ? 'bg-[#fffbeb] text-[#92400e] border border-[#fde68a]'
                          : 'bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]'
                      }`}
                  >
                    {Math.round((Number(form.credit_utilization) || 0) * 100)}%
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={form.credit_utilization === '' ? 0 : form.credit_utilization}
                    onChange={e => handleFieldChange('credit_utilization', parseFloat(e.target.value))}
                    className="flex-1 accent-[#0f172a] cursor-pointer"
                  />
                  <div className="w-18">
                    <input
                      type="number"
                      step="any"
                      min={0}
                      max={1}
                      value={form.credit_utilization}
                      onChange={e => handleFieldChange('credit_utilization', e.target.value)}
                      className="w-full px-2 py-0.5 text-xs text-center font-mono font-bold text-[#0f172a] bg-white border border-[#cbd5e1] rounded-md focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Open Tradelines */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                    Open Tradelines
                  </label>
                  <NumberStepper
                    value={form.num_open_credit_lines}
                    min={0}
                    max={50}
                    onChange={val => handleFieldChange('num_open_credit_lines', val)}
                    onAdjust={delta => adjustNumericField('num_open_credit_lines', delta, 0, 50)}
                  />
                </div>

                {/* Real Estate Loans */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                    Real Estate Loans
                  </label>
                  <NumberStepper
                    value={form.num_real_estate_loans}
                    min={0}
                    max={10}
                    onChange={val => handleFieldChange('num_real_estate_loans', val)}
                    onAdjust={delta => adjustNumericField('num_real_estate_loans', delta, 0, 10)}
                  />
                </div>

                {/* 30-59 DPD Delinquencies */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                    30-59 DPD
                  </label>
                  <NumberStepper
                    value={form.delinquencies_30_59}
                    min={0}
                    max={10}
                    isDanger={Number(form.delinquencies_30_59) > 0}
                    onChange={val => handleFieldChange('delinquencies_30_59', val)}
                    onAdjust={delta => adjustNumericField('delinquencies_30_59', delta, 0, 10)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ═══ CARD 4: Fraud & Geolocation Telemetry (Bottom Right) ═══ */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-[#f1f5f9]">
                <div className="w-6 h-6 rounded-md bg-[#fef2f2] text-[#dc2626] flex items-center justify-center">
                  <ShieldAlert className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
                  4. Fraud & Geolocation Telemetry
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                    Device Fingerprint ID
                  </label>
                  <input
                    type="text"
                    value={form.device_id}
                    onChange={e => handleFieldChange('device_id', e.target.value)}
                    placeholder="iphone_15_pro_auth"
                    className="w-full px-3 py-1.5 text-xs font-mono text-[#0f172a] bg-[#f8fafc] border border-[#cbd5e1] rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                    Originating IP Address
                  </label>
                  <input
                    type="text"
                    value={form.ip_address}
                    onChange={e => handleFieldChange('ip_address', e.target.value)}
                    placeholder="122.164.21.90"
                    className="w-full px-3 py-1.5 text-xs font-mono text-[#0f172a] bg-[#f8fafc] border border-[#cbd5e1] rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                    IP Velocity (/ 24h)
                  </label>
                  <NumberStepper
                    value={form.ip_velocity || 1}
                    min={1}
                    max={20}
                    onChange={val => handleFieldChange('ip_velocity', Number(val) || 1)}
                    onAdjust={delta => adjustNumericField('ip_velocity', delta, 1, 20)}
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-[#fef2f2] border border-[#fecdca] rounded-xl text-xs text-[#b42318] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

      </form>

      {/* ── DECISION RESULTS (Rendered after evaluation) ── */}
      {result && (
        <div className="pt-4 border-t border-[#e2e8f0] space-y-3.5 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0f172a]">
                Decision Evaluation Result
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${result.decision === 'approve'
                    ? 'bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]'
                    : result.decision === 'refer'
                      ? 'bg-[#fffbeb] text-[#92400e] border border-[#fde68a]'
                      : 'bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]'
                  }`}
              >
                {result.decision.toUpperCase()}
              </span>
            </div>
            <span className="text-[11px] text-[#64748b]">
              Latency: {result.latency_ms.toFixed(1)}ms | Model: {result.model_version}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
            <div className="lg:col-span-8">
              <DecisionResultCard result={result} />
            </div>

            {evaluatedCase && (
              <div className="lg:col-span-4 bg-white rounded-xl border border-[#e2e8f0] p-4 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0f172a]">
                  <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                  <span>Case Registered in Queue</span>
                </div>
                <p className="text-xs text-[#64748b]">
                  Case <strong>{evaluatedCase.id}</strong> ({evaluatedCase.applicant.name}) has been evaluated and registered into the active underwriting queue.
                </p>

                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => {
                      setSelectedCaseId(evaluatedCase.id);
                      navigate(`/applications/${evaluatedCase.id}`);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#0f172a] hover:bg-[#1e293b] active:bg-[#334155] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <span>Open 360° Case Workspace</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => navigate('/applications')}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-[#cbd5e1] hover:bg-[#f8fafc] text-[#334155] rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  >
                    <span>View Applications Queue</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default DecisionEngineView;
