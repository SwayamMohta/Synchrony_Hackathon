import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Zap,
  BarChart3,
  Database,
  PieChart as PieChartIcon,
  Copy,
  Check,
  ArrowUpRight,
  TrendingUp,
  Fingerprint,
  Clock,
  Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import type { ApplicationCase, ModelEvalMetric } from '../../types/underwriting';
import { fetchModelEvalMetrics } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export type AnalyticsSubTab = 'fraud' | 'models' | 'distribution' | 'audit';

interface AnalyticsWorkspaceProps {
  cases: ApplicationCase[];
  selectedCaseId: string;
  onSelectCase: (caseId: string) => void;
  defaultSubTab?: AnalyticsSubTab;
  onTabChange?: (tab: AnalyticsSubTab) => void;
}

export const AnalyticsWorkspace: React.FC<AnalyticsWorkspaceProps> = ({
  cases,
  selectedCaseId,
  onSelectCase,
  defaultSubTab = 'distribution',
  onTabChange
}) => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<AnalyticsSubTab>(defaultSubTab);
  const [copied, setCopied] = useState(false);
  const [auditViewMode, setAuditViewMode] = useState<'timeline' | 'json'>('timeline');
  const [modelMetrics, setModelMetrics] = useState<ModelEvalMetric[]>([]);

  useEffect(() => {
    if (!token) return;
    fetchModelEvalMetrics(token)
      .then(setModelMetrics)
      .catch(() => setModelMetrics([]));
  }, [token]);

  // Active case
  const activeCase = useMemo(() => {
    return cases.find(c => c.id === selectedCaseId) || cases[0];
  }, [cases, selectedCaseId]);

  // Filter applicant list
  const filteredCases = useMemo(() => {
    if (!searchTerm.trim()) return cases;
    const q = searchTerm.toLowerCase();
    return cases.filter(
      c =>
        c.applicant.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.applicant.segment.toLowerCase().includes(q)
    );
  }, [cases, searchTerm]);

  // Active fraud signals data
  const fraudData = useMemo(() => {
    if (!activeCase) return null;
    const isRisky = activeCase.decision === 'DECLINE' || activeCase.decision === 'REFER';
    return {
      applicationId: activeCase.id,
      applicantName: activeCase.applicant.name,
      decision: activeCase.decision,
      fraudRiskScore: activeCase.fraudSignals.overallRiskScore,
      fraudRiskPercent: activeCase.fraudSignals.overallRiskPercent,
      signals: activeCase.fraudSignals,
      behaviorTimeline: [
        {
          time: '14:28:10',
          event: 'Application Session Initiated',
          severity: 'NORMAL' as const,
          detail: 'Browser session started via secure HTTPS portal'
        },
        {
          time: '14:30:42',
          event: 'Identity & Financial Data Input',
          severity: isRisky ? ('ELEVATED' as const) : ('NORMAL' as const),
          detail: isRisky ? 'Rapid form autofill from suspicious proxy network' : 'Normal manual keystroke cadence'
        },
        {
          time: '14:32:08',
          event: 'Risk Evaluation Pipeline',
          severity: isRisky ? ('HIGH' as const) : ('NORMAL' as const),
          detail: `Evaluated with decision ${activeCase.decision}`
        }
      ]
    };
  }, [activeCase]);

  // ── Applicant Risk Profile Chart Data (credit vs fraud) ──
  const riskProfileData = useMemo(() => {
    if (!activeCase) return [];
    const credit = Math.round(activeCase.creditRisk.score * 100);
    const fraud = Math.round(activeCase.fraudSignals.overallRiskScore * 100);
    return [
      { name: 'Credit Risk', value: credit, fill: credit >= 60 ? '#dc2626' : credit >= 35 ? '#d97706' : '#16a34a' },
      { name: 'Fraud Risk', value: fraud, fill: fraud > 70 ? '#dc2626' : fraud > 40 ? '#d97706' : '#16a34a' },
    ];
  }, [activeCase]);

  // ── Applicant Cash-Flow Profile (monthly income/expenses/debt) ──
  const cashFlowData = useMemo(() => {
    if (!activeCase) return [];
    const a = activeCase.applicant;
    return [
      { name: 'Monthly Income', value: a.monthlyIncome, fill: '#0f172a' },
      { name: 'Monthly Expenses', value: a.monthlyExpenses, fill: '#64748b' },
      { name: 'Debt Payments', value: a.monthlyDebtPayments, fill: '#cbd5e1' },
    ];
  }, [activeCase]);

  // ── Applicant Loan Demand vs Income (affordability, ₹ Lakhs) ──
  const affordabilityData = useMemo(() => {
    if (!activeCase) return [];
    const a = activeCase.applicant;
    return [
      { name: 'Requested', value: a.requestedAmount, fill: '#0f172a' },
      { name: 'Annual Income', value: a.annualIncome, fill: '#64748b' },
    ];
  }, [activeCase]);

  // ── Model Comparison Bar Chart Data ──
  const modelComparisonChartData = useMemo(() => {
    return modelMetrics.map(m => ({
      segment: m.segment,
      baselineAuc: parseFloat(m.baselineAuc.toFixed(3)),
      proposedAuc: parseFloat(m.proposedAuc.toFixed(3)),
      f1Score: parseFloat(m.proposedF1.toFixed(3)),
    }));
  }, [modelMetrics]);

  // Risk gauge data for active case
  const fraudGaugeData = useMemo(() => {
    if (!fraudData) return [];
    const score = fraudData.fraudRiskScore;
    return [
      { name: 'Risk', value: score * 100, fill: score > 0.4 ? '#0f172a' : score > 0.2 ? '#64748b' : '#cbd5e1' },
      { name: 'Remaining', value: 100 - score * 100, fill: '#f1f5f9' },
    ];
  }, [fraudData]);

  // Tab switcher
  const handleTabSwitch = (tab: AnalyticsSubTab) => {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  const handleCopyPayload = () => {
    if (!activeCase) return;
    navigator.clipboard.writeText(JSON.stringify(activeCase, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full space-y-4 select-none pb-12">
      {/* ── Top Header Navigation Strip ── */}
      <div className="bg-white rounded-2xl border border-[#eaecf0] p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-100 text-slate-800">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#101828]">
              Portfolio Analytics & Telemetry Center
            </h1>
            <p className="text-xs text-[#667085]">
              Per-applicant risk, cash-flow and affordability metrics, model discrimination benchmarks, and telemetry forensics
            </p>
          </div>
        </div>

        {/* Sub-tab Pill Toggles */}
        <div className="flex items-center bg-[#f2f4f7] p-1 rounded-xl border border-[#eaecf0]">
          <button
            onClick={() => handleTabSwitch('distribution')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'distribution'
                ? 'bg-white text-[#101828] shadow-xs'
                : 'text-[#667085] hover:text-[#101828]'
            }`}
          >
            <PieChartIcon className="w-3.5 h-3.5 text-slate-700" />
            <span>Applicant Stats</span>
          </button>

          <button
            onClick={() => handleTabSwitch('models')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'models'
                ? 'bg-white text-[#101828] shadow-xs'
                : 'text-[#667085] hover:text-[#101828]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-slate-800" />
            <span>Model Benchmarks</span>
          </button>

          <button
            onClick={() => handleTabSwitch('fraud')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'fraud'
                ? 'bg-white text-[#101828] shadow-xs'
                : 'text-[#667085] hover:text-[#101828]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-slate-800" />
            <span>Fraud Telemetry</span>
          </button>

          <button
            onClick={() => handleTabSwitch('audit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-white text-[#101828] shadow-xs'
                : 'text-[#667085] hover:text-[#101828]'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-slate-800" />
            <span>Audit Trail</span>
          </button>
        </div>
      </div>

      {/* ── Master-Detail Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

        {/* ═══ LEFT COLUMN: APPLICANT QUEUE LIST ═══ */}
        <div className="lg:col-span-4 xl:col-span-3 bg-white rounded-2xl border border-[#eaecf0] shadow-xs overflow-hidden">
          <div className="p-3 border-b border-[#eaecf0] space-y-2.5 bg-[#fafbfc]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#101828] uppercase tracking-wider">
                Applicants Queue
              </span>
              <span className="text-[11px] font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                {filteredCases.length} records
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#98a2b3] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, ID or segment..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs text-[#101828] bg-white border border-[#d0d5dd] rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              />
            </div>
          </div>

          <div className="divide-y divide-[#eaecf0] max-h-[calc(100vh-250px)] overflow-y-auto">
            {filteredCases.map(c => {
              const isSelected = activeCase?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => onSelectCase(c.id)}
                  className={`p-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-100 border-l-4 border-l-slate-900 font-bold'
                      : 'hover:bg-[#f9fafb]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-[#101828] truncate">
                      {c.applicant.name}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                      {c.decision}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#667085] mt-1">
                    <span className="font-mono">{c.id}</span>
                    <span>₹{(c.applicant.requestedAmount / 100000).toFixed(1)}L</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ RIGHT COLUMN: CHARTS & WORKSPACE ═══ */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          {activeCase && (
            <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                  {activeCase.applicant.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900">
                    {activeCase.applicant.name}
                  </h2>
                  <div className="text-[10px] font-mono text-slate-500">
                    {activeCase.id.length > 12 ? '#' + activeCase.id.slice(0, 8) : activeCase.id} • {activeCase.applicant.segment}
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate(`/applications/${activeCase.id}`)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-xs cursor-pointer font-mono"
              >
                <span>360° Dossier</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {activeTab === 'distribution' && activeCase && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
              {/* Bar Chart 1: Credit vs Fraud Risk Profile */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                    <PieChartIcon className="w-3.5 h-3.5 text-slate-900" />
                    <span>Risk Profile</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{activeCase.applicant.name}</span>
                </div>

                <div className="h-44 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={riskProfileData} margin={{ top: 8, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} unit="%" />
                      <Tooltip
                        formatter={(val: any) => [`${val}%`]}
                        contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 6, color: '#fff', fontSize: 10 }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend verticalAlign="top" height={24} formatter={(val) => <span className="text-[10px] font-medium text-slate-700">{val}</span>} />
                      <Bar dataKey="value" name="Score" radius={[3, 3, 0, 0]}>
                        {riskProfileData.map((entry, index) => (
                          <Cell key={`cell-rp-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar Chart 2: Monthly Cash-Flow Profile */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                    <PieChartIcon className="w-3.5 h-3.5 text-slate-900" />
                    <span>Monthly Cash-Flow</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">₹ / month</span>
                </div>

                <div className="h-44 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cashFlowData} margin={{ top: 8, right: 5, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                      <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} unit="k" />
                      <Tooltip
                        formatter={(val: any) => [`₹${(Number(val) / 1000).toFixed(1)}k`]}
                        contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 6, color: '#fff', fontSize: 10 }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend verticalAlign="top" height={24} formatter={(val) => <span className="text-[10px] font-medium text-slate-700">{val}</span>} />
                      <Bar dataKey="value" name="Amount" radius={[3, 3, 0, 0]}>
                        {cashFlowData.map((entry, index) => (
                          <Cell key={`cell-cf-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar Chart 3: Loan Demand vs Income (affordability) */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                    <BarChart3 className="w-3.5 h-3.5 text-slate-900" />
                    <span>Loan vs Income</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">₹ Lakhs</span>
                </div>

                <div className="h-44 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={affordabilityData} margin={{ top: 8, right: 5, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                      <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} unit="L" />
                      <Tooltip
                        formatter={(val: any) => [`₹${(Number(val) / 100000).toFixed(1)} Lakhs`]}
                        contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 6, color: '#fff', fontSize: 10 }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend verticalAlign="top" height={24} formatter={(val) => <span className="text-[10px] font-medium text-slate-700">{val}</span>} />
                      <Bar dataKey="value" name="Amount" radius={[3, 3, 0, 0]}>
                        {affordabilityData.map((entry, index) => (
                          <Cell key={`cell-aff-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* ── VIEW 2: MODEL BENCHMARK CHARTS ── */}
          {activeTab === 'models' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-start">
              {/* Comparison Bar Chart: Baseline AUC vs. Proposed XGBoost AUC */}
              <div className="xl:col-span-6 bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                    <TrendingUp className="w-3.5 h-3.5 text-slate-900" />
                    <span>ROC-AUC Lift by Segment</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    +14.2% Lift
                  </span>
                </div>

                <div className="h-44 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={modelComparisonChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="segment" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                      <YAxis domain={[0.6, 1.0]} tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        formatter={(val: any) => [`${val} AUC`]}
                        contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 6, color: '#fff', fontSize: 10 }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend verticalAlign="top" height={24} formatter={(val) => <span className="text-[10px] font-medium text-slate-700">{val}</span>} />
                      <Bar dataKey="baselineAuc" name="Logistic Baseline" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="proposedAuc" name="XGBoost v1.2" fill="#0f172a" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="f1Score" name="F1-Score" fill="#64748b" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Segment Performance Breakdown Table */}
              <div className="xl:col-span-6 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="p-2.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-slate-900" />
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Model Performance Table
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">15.4K samples</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px]">
                      <tr>
                        <th className="py-2 px-3">Segment</th>
                        <th className="py-2 px-3 text-right">Baseline</th>
                        <th className="py-2 px-3 text-right">XGBoost</th>
                        <th className="py-2 px-3 text-right">Precision</th>
                        <th className="py-2 px-3 text-right">Recall</th>
                        <th className="py-2 px-3 text-right">F1</th>
                        <th className="py-2 px-3 text-right">Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {modelMetrics.map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {m.segment}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-500">
                            {m.baselineAuc.toFixed(3)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {m.proposedAuc.toFixed(3)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700">
                            {(m.proposedPrecision * 100).toFixed(1)}%
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700">
                            {(m.proposedRecall * 100).toFixed(1)}%
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {m.proposedF1.toFixed(3)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-500">
                            {m.sampleCount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── VIEW 3: FRAUD TELEMETRY & FORENSICS ── */}
          {activeTab === 'fraud' && fraudData && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-stretch">
              {/* Left: Donut Risk Probability Gauge */}
              <div className="xl:col-span-3 bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col justify-between">
                <div className="w-full flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Fraud Risk Gauge
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono">
                    {fraudData.signals.riskLevel}
                  </span>
                </div>

                <div className="h-36 w-full relative flex items-center justify-center my-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={fraudGaugeData}
                        innerRadius={40}
                        outerRadius={56}
                        startAngle={180}
                        endAngle={0}
                        dataKey="value"
                      >
                        {fraudGaugeData.map((entry, index) => (
                          <Cell key={`cell-gauge-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1 text-center">
                    <div className="text-xl font-black font-mono text-slate-900">
                      {fraudData.fraudRiskPercent}
                    </div>
                    <span className="text-[9px] text-slate-500 block">Anomaly Index</span>
                  </div>
                </div>
              </div>

              {/* Middle: Telemetry Signals Matrix */}
              <div className="xl:col-span-5 bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2 flex flex-col justify-between">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                    <Fingerprint className="w-3.5 h-3.5 text-slate-900" />
                    <span>Telemetry Signal Matrix</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Signals</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {fraudData.signals.signals.map(sig => {
                    const isHigh = sig.status === 'HIGH';

                    return (
                      <div
                        key={sig.id}
                        className={`p-2 rounded-lg border ${
                          isHigh ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-900 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold">
                            {sig.label}
                          </span>
                          <span
                            className={`text-[8px] font-mono font-bold px-1 py-0.2 rounded ${
                              isHigh ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                            }`}
                          >
                            {sig.status}
                          </span>
                        </div>
                        <div className="text-xs font-bold mt-0.5 font-mono">
                          {sig.value}
                        </div>
                        <div className="text-[9px] opacity-75">
                          Limit: {sig.threshold}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: Behavior Timeline */}
              <div className="xl:col-span-4 bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2 flex flex-col justify-between">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5 text-slate-900" />
                    <span>Forensic Timeline</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Telemetry</span>
                </div>

                <div className="space-y-2.5 pl-2.5 border-l border-slate-300 ml-1">
                  {fraudData.behaviorTimeline.map((ev, idx) => (
                    <div key={idx} className="relative pl-2.5">
                      <div className="absolute -left-[14px] top-1 w-2 h-2 rounded-full bg-slate-900 border border-white" />
                      <div className="text-[10px] font-bold text-slate-900 flex items-center justify-between">
                        <span>{ev.event}</span>
                        <span className="font-mono text-[9px] text-slate-500">{ev.time}</span>
                      </div>
                      <p className="text-[10px] text-slate-600 truncate">
                        {ev.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── VIEW 4: AUDIT TRAIL & GOVERNANCE ── */}
          {activeTab === 'audit' && activeCase && (
            <div className="bg-white rounded-2xl border border-[#eaecf0] p-4 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#eaecf0]">
                <div>
                  <h3 className="text-xs font-bold text-[#101828] uppercase tracking-wider">
                    Immutable Decision Audit Dossier
                  </h3>
                  <p className="text-[11px] text-[#667085]">
                    Regulatory reconstruction snapshot for Case {activeCase.id}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-[#f2f4f7] p-0.5 rounded-lg border border-[#eaecf0] text-xs">
                    <button
                      onClick={() => setAuditViewMode('timeline')}
                      className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                        auditViewMode === 'timeline'
                          ? 'bg-white text-[#101828] shadow-xs'
                          : 'text-[#667085]'
                      }`}
                    >
                      Timeline
                    </button>
                    <button
                      onClick={() => setAuditViewMode('json')}
                      className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                        auditViewMode === 'json'
                          ? 'bg-white text-[#101828] shadow-xs'
                          : 'text-[#667085]'
                      }`}
                    >
                      JSON
                    </button>
                  </div>

                  <button
                    onClick={handleCopyPayload}
                    className="flex items-center gap-1.5 px-3 py-1 bg-white border border-[#d0d5dd] hover:bg-[#f9fafb] text-[#344054] rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#12b76a]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Payload'}</span>
                  </button>
                </div>
              </div>

              {auditViewMode === 'timeline' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#eaecf0] space-y-1.5 text-xs">
                    <div className="text-[11px] font-bold text-[#667085] uppercase">Metadata</div>
                    <div><strong>Request ID:</strong> <span className="font-mono text-[#475467]">{activeCase.requestId}</span></div>
                    <div><strong>Submitted At:</strong> <span className="font-mono text-[#475467]">{activeCase.submittedAt}</span></div>
                    <div><strong>Policy Version:</strong> <span className="font-mono text-slate-900 font-bold">{activeCase.policyVersion}</span></div>
                    <div><strong>Feature Schema:</strong> <span className="font-mono text-[#475467]">{activeCase.featureSchemaVersion}</span></div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#eaecf0] space-y-1.5 text-xs">
                    <div className="text-[11px] font-bold text-[#667085] uppercase">Inference Results</div>
                    <div><strong>Credit Model:</strong> <span className="font-mono text-[#475467]">{activeCase.creditRisk.modelVersion}</span></div>
                    <div><strong>Predicted PD:</strong> <span className="font-mono font-bold text-[#101828]">{(activeCase.creditRisk.score * 100).toFixed(1)}%</span></div>
                    <div><strong>Fraud Score:</strong> <span className="font-mono font-bold text-[#101828]">{activeCase.fraudSignals.overallRiskPercent}</span></div>
                    <div><strong>Final Decision:</strong> <span className="font-bold text-slate-900">{activeCase.decision}</span></div>
                  </div>
                </div>
              ) : (
                <pre className="p-3 bg-[#0f172a] text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-[350px]">
                  {JSON.stringify(activeCase, null, 2)}
                </pre>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

export default AnalyticsWorkspace;
