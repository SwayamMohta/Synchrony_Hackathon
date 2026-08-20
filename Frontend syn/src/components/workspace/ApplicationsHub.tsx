import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  Plus,
  Download,
  Star,
  MapPin,
  ChevronRight,
  ArrowUpRight,
  Send,
  DollarSign,
  TrendingUp,
  Check,
  SlidersHorizontal,
  RotateCcw,
  X,
  FileSpreadsheet,
  FileCode,
  ChevronDown,
  Sparkles,
  ListChecks,
  MessageSquare
} from 'lucide-react';
import type { ApplicationCase, ApplicantSegment } from '../../types/underwriting';
import { useCases } from '../../context/CaseContext';

type StatusFilter = 'ALL' | 'REFER' | 'APPROVE' | 'DECLINE';
type SortOption = 'recent' | 'risk_desc' | 'risk_asc' | 'amount_desc';

interface ApplicationsHubProps {
  cases: ApplicationCase[];
  onSelectCase: (caseId: string) => void;
  onNavigateToNewApp: () => void;
}

// Curated avatar mapping
const AVATAR_MAP: Record<string, string> = {
  'PR-10482': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'PR-10481': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'PR-10480': 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'PR-10479': 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
  'PR-10478': 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
};

const RELATIVE_TIME_MAP: Record<string, string> = {
  'PR-10482': '2h ago',
  'PR-10481': '5h ago',
  'PR-10480': '1d ago',
  'PR-10479': '2d ago',
  'PR-10478': '3d ago',
};

export const ApplicationsHub: React.FC<ApplicationsHubProps> = ({
  cases,
  onSelectCase,
  onNavigateToNewApp
}) => {
  const navigate = useNavigate();
  const { setAssistantCaseContext } = useCases();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [segmentFilter, setSegmentFilter] = useState<'ALL' | ApplicantSegment>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [selectedCaseId, setSelectedCaseId] = useState<string>(cases[0]?.id || 'PR-10482');
  const [starredCases, setStarredCases] = useState<Set<string>>(new Set(['PR-10482']));
  const [quickNote, setQuickNote] = useState('');
  const [notesList, setNotesList] = useState<Record<string, string[]>>({
    'PR-10482': ['Initial KYC and bank statements verified. Income stream stable.'],
    'PR-10481': ['Flagged for application velocity: 3 applications logged in past 24h.']
  });
  const [imgErrorMap, setImgErrorMap] = useState<Record<string, boolean>>({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Close filter and export popovers on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setIsExportOpen(false);
      }
    };
    if (isFilterOpen || isExportOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isFilterOpen, isExportOpen]);

  const activeFiltersCount =
    (segmentFilter !== 'ALL' ? 1 : 0) +
    (sortBy !== 'recent' ? 1 : 0) +
    (statusFilter !== 'ALL' ? 1 : 0) +
    (search.trim() !== '' ? 1 : 0);

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setSegmentFilter('ALL');
    setSortBy('recent');
  };

  // Toggle starred
  const toggleStar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setStarredCases(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filtered and sorted dataset
  const filteredCases = useMemo(() => {
    return cases
      .filter(c => {
        const query = search.toLowerCase();
        const matchesSearch =
          !query ||
          c.id.toLowerCase().includes(query) ||
          c.applicant.name.toLowerCase().includes(query) ||
          c.applicant.id.toLowerCase().includes(query) ||
          (c.applicant.occupation && c.applicant.occupation.toLowerCase().includes(query)) ||
          (c.applicant.city && c.applicant.city.toLowerCase().includes(query));

        const matchesStatus =
          statusFilter === 'ALL' ||
          (statusFilter === 'REFER' && (c.decision === 'REFER' || c.status === 'Review')) ||
          (statusFilter === 'APPROVE' && c.decision === 'APPROVE') ||
          (statusFilter === 'DECLINE' && c.decision === 'DECLINE');

        const matchesSegment = segmentFilter === 'ALL' || c.applicant.segment === segmentFilter;

        return matchesSearch && matchesStatus && matchesSegment;
      })
      .sort((a, b) => {
        if (sortBy === 'risk_desc') return b.creditRisk.score - a.creditRisk.score;
        if (sortBy === 'risk_asc') return a.creditRisk.score - b.creditRisk.score;
        if (sortBy === 'amount_desc') return b.applicant.requestedAmount - a.applicant.requestedAmount;
        return b.id.localeCompare(a.id);
      });
  }, [cases, search, statusFilter, segmentFilter, sortBy]);

  // Active case for preview pane
  const activeCase = useMemo(() => {
    return cases.find(c => c.id === selectedCaseId) || filteredCases[0] || cases[0];
  }, [cases, selectedCaseId, filteredCases]);

  // Counts
  const totalCount = cases.length;
  const reviewCount = cases.filter(c => c.decision === 'REFER' || c.status === 'Review').length;
  const approvedCount = cases.filter(c => c.decision === 'APPROVE').length;
  const declinedCount = cases.filter(c => c.decision === 'DECLINE').length;

  // Handle Add Note
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNote.trim() || !activeCase) return;
    setNotesList(prev => ({
      ...prev,
      [activeCase.id]: [quickNote.trim(), ...(prev[activeCase.id] || [])]
    }));
    setQuickNote('');
  };

  // ── CSV & JSON EXPORT ENGINE ──
  const escapeCsvCell = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 200);
  };

  const handleExportCsv = () => {
    const headers = [
      'Application ID',
      'Applicant Name',
      'Segment',
      'Decision Status',
      'Workflow Status',
      'Requested Loan (INR)',
      'Annual Income (INR)',
      'Monthly Income (INR)',
      'Monthly Debt Payments (INR)',
      'DTI Ratio (%)',
      'Default Probability PD (%)',
      'Risk Band Tier',
      'Credit Model Version',
      'Fraud Risk Level',
      'Fraud Score',
      'City',
      'Occupation',
      'Submission Date',
      'Primary Decision Reason / Rule',
    ];

    const rows = filteredCases.map(c => [
      escapeCsvCell(c.id),
      escapeCsvCell(c.applicant.name),
      escapeCsvCell(c.applicant.segment),
      escapeCsvCell(c.decision),
      escapeCsvCell(c.status),
      escapeCsvCell(c.applicant.requestedAmount),
      escapeCsvCell(c.applicant.annualIncome),
      escapeCsvCell(c.applicant.monthlyIncome || Math.round(c.applicant.annualIncome / 12)),
      escapeCsvCell(c.applicant.monthlyDebtPayments),
      escapeCsvCell(
        c.applicant.monthlyIncome
          ? ((c.applicant.monthlyDebtPayments / c.applicant.monthlyIncome) * 100).toFixed(1)
          : '0.0'
      ),
      escapeCsvCell(c.creditRisk.scorePercent),
      escapeCsvCell(c.creditRisk.riskBand),
      escapeCsvCell(c.creditRisk.modelVersion),
      escapeCsvCell(c.fraudSignals.riskLevel),
      escapeCsvCell(c.fraudSignals.overallRiskScore),
      escapeCsvCell(c.applicant.city || 'India'),
      escapeCsvCell(c.applicant.occupation || 'N/A'),
      escapeCsvCell(c.submittedAt),
      escapeCsvCell(
        c.reasonCodes?.[0]?.title ||
        c.policyRules?.find(r => r.result === 'TRIGGERED' || r.result === 'FAILED')?.name ||
        'Automated Policy Execution'
      ),
    ]);

    // Prepend UTF-8 BOM for Microsoft Excel compatibility
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const dateStr = new Date().toISOString().slice(0, 10);
    triggerDownload(csvContent, `credit_applications_${dateStr}.csv`, 'text/csv');
    setIsExportOpen(false);
    showToast(`Successfully exported ${filteredCases.length} applications to CSV (Excel format)`);
  };

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(filteredCases, null, 2);
    const dateStr = new Date().toISOString().slice(0, 10);
    triggerDownload(jsonStr, `credit_applications_${dateStr}.json`, 'application/json');
    setIsExportOpen(false);
    showToast(`Successfully exported ${filteredCases.length} applications to JSON`);
  };

  return (
    <div className="space-y-3 select-none pb-4 w-full font-sans relative">

      {/* ── TOP WORKSTATION HEADER ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] tracking-tight">
            Applications Workstation
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Dropdown Menu */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shadow-xs cursor-pointer select-none ${isExportOpen
                  ? 'bg-slate-100 text-slate-900 border-slate-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isExportOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Export Options Dropdown */}
            {isExportOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-lg border border-slate-200 shadow-xl z-50 p-1 space-y-0.5">
                <button
                  onClick={handleExportCsv}
                  className="w-full flex items-start gap-2.5 p-2 rounded-md hover:bg-slate-50 text-left transition-colors cursor-pointer group"
                >
                  <div className="p-1.5 rounded bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 shrink-0 mt-0.5">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Export as CSV (Excel)</div>
                    <div className="text-[10px] text-slate-500">Formatted spreadsheet ({filteredCases.length} records)</div>
                  </div>
                </button>

                <button
                  onClick={handleExportJson}
                  className="w-full flex items-start gap-2.5 p-2 rounded-md hover:bg-slate-50 text-left transition-colors cursor-pointer group"
                >
                  <div className="p-1.5 rounded bg-slate-100 text-slate-800 group-hover:bg-slate-200 shrink-0 mt-0.5 border border-slate-200">
                    <FileCode className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Export as JSON</div>
                    <div className="text-[10px] text-slate-500">Full underwriting & ML data payload</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              if (onNavigateToNewApp) {
                onNavigateToNewApp();
              } else {
                navigate('/decision-engine');
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#0f172a] hover:bg-[#1e293b] active:bg-[#334155] border border-slate-800 transition-all shadow-xs hover:shadow cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Application</span>
          </button>
        </div>
      </div>

      {/* ── SPLIT PANE WORKSPACE (Master Left Rail + Detail Right Rail) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">

        {/* ══════════════════════════════════════════════════════════ */}
        {/* LEFT PANE: HIGH-DENSITY APPLICANT LIST                    */}
        {/* ══════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200/90 shadow-xs flex flex-col h-[calc(100vh-140px)] min-h-[600px] overflow-hidden">

          {/* Top Filter & Search Section */}
          <div className="p-2.5 border-b border-slate-200/90 bg-slate-50/50 space-y-2 shrink-0">

            {/* Search Bar + Filter Popover Button */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search applicant, ID, city..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-7.5 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 bg-white border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 shadow-2xs transition-colors"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              </div>

              {/* Filter Button & Popover */}
              <div className="relative" ref={filterDropdownRef}>
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer select-none ${isFilterOpen || activeFiltersCount > 0
                      ? 'bg-slate-100 text-slate-900 border-slate-300 shadow-xs'
                      : 'bg-white text-[#344054] border-[#d0d5dd] hover:bg-[#f9fafb]'
                    }`}
                  title="Filter & Sort Applicants"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filter</span>
                  {activeFiltersCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-bold">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                {/* Floating Filter Popover */}
                {isFilterOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-lg border border-slate-200 shadow-xl z-50 p-3 space-y-3">

                    {/* Popover Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-800" />
                        <span className="text-xs font-bold text-slate-900">Filter & Sort</span>
                      </div>
                      <button
                        onClick={handleResetFilters}
                        disabled={activeFiltersCount === 0}
                        className={`flex items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                          activeFiltersCount > 0
                            ? 'text-slate-700 hover:text-slate-900'
                            : 'text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    </div>

                    {/* Segment Filter */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Applicant Segment
                      </label>
                      <div className="grid grid-cols-3 gap-1 text-[11px]">
                        {(['ALL', 'THIN-FILE', 'ESTABLISHED'] as const).map((seg) => {
                          const isSelected = segmentFilter === seg;
                          return (
                            <button
                              key={seg}
                              onClick={() => setSegmentFilter(seg)}
                              className={`py-1 px-1.5 rounded-md font-semibold text-center transition-all cursor-pointer ${isSelected
                                  ? 'bg-slate-900 text-white shadow-xs'
                                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                                }`}
                            >
                              {seg === 'ALL' ? 'All' : seg === 'THIN-FILE' ? 'Thin-File' : 'Established'}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sort By Options */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Sort Queue By
                      </label>
                      <div className="space-y-0.5 text-xs">
                        {[
                          { id: 'recent', label: 'Recently Submitted' },
                          { id: 'risk_desc', label: 'Highest Default Risk (PD ↓)' },
                          { id: 'risk_asc', label: 'Lowest Default Risk (PD ↑)' },
                          { id: 'amount_desc', label: 'Highest Loan Amount (₹ ↓)' },
                        ].map((opt) => {
                          const isSelected = sortBy === opt.id;
                          return (
                            <button
                              key={opt.id}
                              onClick={() => setSortBy(opt.id as SortOption)}
                              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left transition-all cursor-pointer text-xs ${isSelected
                                  ? 'bg-slate-100 text-slate-900 font-bold'
                                  : 'hover:bg-slate-50 text-slate-700 font-medium'
                                }`}
                            >
                              <span>{opt.label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-slate-900" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Popover Footer Done Button */}
                    <div className="pt-2 border-t border-slate-100">
                      <button
                        onClick={() => setIsFilterOpen(false)}
                        className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Apply Filters
                      </button>
                    </div>

                  </div>
                )}
              </div>
            </div>

            {/* Quick Status Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[11px] no-scrollbar">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer shrink-0 ${statusFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                All ({totalCount})
              </button>

              <button
                onClick={() => setStatusFilter('REFER')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer shrink-0 ${statusFilter === 'REFER'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                Review ({reviewCount})
              </button>

              <button
                onClick={() => setStatusFilter('APPROVE')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer shrink-0 ${statusFilter === 'APPROVE'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                Approved ({approvedCount})
              </button>

              <button
                onClick={() => setStatusFilter('DECLINE')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer shrink-0 ${statusFilter === 'DECLINE'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                Declined ({declinedCount})
              </button>
            </div>

            {/* Active Filters Pill Strip (if any active filters) */}
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-[11px] border-t border-slate-100">
                <span className="text-slate-500 text-[10px] font-medium">Active:</span>
                {segmentFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-semibold text-[10px]">
                    <span>{segmentFilter}</span>
                    <button onClick={() => setSegmentFilter('ALL')} className="hover:text-slate-900 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {sortBy !== 'recent' && (
                  <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-semibold text-[10px]">
                    <span>
                      {sortBy === 'risk_desc' ? 'High Risk' : sortBy === 'risk_asc' ? 'Low Risk' : 'Amount'}
                    </span>
                    <button onClick={() => setSortBy('recent')} className="hover:text-slate-900 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}

          </div>

          {/* Scrollable Compact Applicants List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-1">
            {filteredCases.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <p className="text-xs font-semibold text-slate-900">No applicants match filter</p>
                <p className="text-[11px] text-slate-400 mt-1">Adjust search or filter parameters.</p>
              </div>
            ) : (
              filteredCases.map(c => {
                const isSelected = c.id === activeCase?.id;
                const isStarred = starredCases.has(c.id);
                const isRefer = c.decision === 'REFER' || c.status === 'Review';
                const isApprove = c.decision === 'APPROVE';
                const avatarUrl = AVATAR_MAP[c.id];
                const hasImgError = imgErrorMap[c.id];
                const relativeTime = RELATIVE_TIME_MAP[c.id] || 'Recently';

                const initials = c.applicant.name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCaseId(c.id)}
                    className={`px-2.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2.5 relative group ${isSelected
                        ? 'bg-slate-100/90 shadow-2xs ring-1 ring-slate-300/80'
                        : 'hover:bg-slate-50'
                      }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {avatarUrl && !hasImgError ? (
                        <img
                          src={avatarUrl}
                          alt={c.applicant.name}
                          onError={() => setImgErrorMap(prev => ({ ...prev, [c.id]: true }))}
                          className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs ring-1 ring-slate-200">
                          {initials}
                        </div>
                      )}
                    </div>

                    {/* Applicant Main Summary */}
                    <div className="flex-1 min-w-0">

                      {/* Top Row: Name + Star + Status Pill */}
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {c.applicant.name}
                          </h4>
                          <button
                            onClick={e => toggleStar(e, c.id)}
                            className="text-slate-300 hover:text-amber-400 transition-colors p-0.5 cursor-pointer shrink-0"
                          >
                            <Star className={`w-3 h-3 ${isStarred ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                          </button>
                        </div>

                        {/* Status Badge (Neutral background, tinted font color) */}
                        <span
                          className={`text-[9.5px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 shrink-0 ${
                            isApprove
                              ? 'text-emerald-700'
                              : isRefer
                                ? 'text-amber-700'
                                : 'text-rose-700'
                          }`}
                        >
                          {isRefer ? 'Review' : isApprove ? 'Approved' : 'Declined'}
                        </span>
                      </div>

                      {/* Middle Line: Requested Amount & City */}
                      <div className="flex items-center justify-between text-[11px] text-slate-600 mt-0.5">
                        <span className="font-semibold text-slate-900 font-mono">
                          ₹{(c.applicant.requestedAmount / 100000).toFixed(1)}L loan
                        </span>
                        <span className="text-slate-500 truncate max-w-[90px] text-[10.5px]">
                          {c.applicant.city || 'India'}
                        </span>
                      </div>

                      {/* Bottom Line: Segment pill + Risk PD + Time */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 pt-0.5 border-t border-slate-100">
                        <span className="font-medium text-slate-600 bg-slate-100/80 px-1 py-0.2 rounded border border-slate-200/60 text-[9.5px]">
                          {c.applicant.segment}
                        </span>

                        <span className="flex items-center gap-1 font-mono text-[10px]">
                          <span>PD:</span>
                          <strong className="text-slate-800 font-semibold">
                            {c.creditRisk.scorePercent}
                          </strong>
                          <span className="text-slate-400 font-sans">• {relativeTime}</span>
                        </span>
                      </div>

                    </div>

                    <ChevronRight className={`w-3.5 h-3.5 text-slate-400 shrink-0 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                  </div>
                );
              })
            )}
          </div>

          {/* List Footer Count */}
          <div className="p-2 px-3 bg-slate-50/50 border-t border-slate-200/90 text-[11px] text-slate-500 flex items-center justify-between shrink-0">
            <span>Showing <strong>{filteredCases.length}</strong> of {totalCount} cases</span>
            <span className="text-[10px] text-slate-400 font-mono">sync active</span>
          </div>

        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* RIGHT PANE: INSTANT INSPECTION & DECISION PREVIEW         */}
        {/* ══════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200/90 shadow-xs flex flex-col h-[calc(100vh-140px)] min-h-[600px] overflow-hidden">

          {activeCase ? (
            <>
              {/* Header: Identity, ID, Status, Quick Actions */}
              <div className="p-3.5 sm:p-4 border-b border-slate-200/90 bg-white/50 flex flex-wrap items-center justify-between gap-3 shrink-0">

                <div className="flex items-center gap-3">
                  {/* Large Avatar */}
                  <div className="relative shrink-0">
                    {AVATAR_MAP[activeCase.id] && !imgErrorMap[activeCase.id] ? (
                      <img
                        src={AVATAR_MAP[activeCase.id]}
                        alt={activeCase.applicant.name}
                        className="w-11 h-11 rounded-full object-cover ring-1 ring-slate-200 shadow-2xs"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm ring-1 ring-slate-200">
                        {activeCase.applicant.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-slate-900 tracking-tight">
                        {activeCase.applicant.name}
                      </h2>

                      {/* Segment Pill */}
                      <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {activeCase.applicant.segment}
                      </span>

                      {/* Status Badge (Neutral background, tinted font color) */}
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 ${
                          activeCase.decision === 'APPROVE'
                            ? 'text-emerald-700'
                            : activeCase.decision === 'REFER' || activeCase.status === 'Review'
                              ? 'text-amber-700'
                              : 'text-rose-700'
                        }`}
                      >
                        {activeCase.decision === 'REFER' || activeCase.status === 'Review'
                          ? 'Needs Review'
                          : activeCase.decision === 'APPROVE'
                            ? 'Approved'
                            : 'Declined'}
                      </span>

                      {/* Case ID */}
                      <span className="text-[11px] font-mono font-medium text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                        {activeCase.id}
                      </span>
                    </div>

                    {/* Rich Demographic & Professional Sub-row */}
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                      <span className="font-medium text-slate-800">{activeCase.applicant.occupation || 'Salaried Professional'}</span>
                      <span>•</span>
                      <span>{activeCase.applicant.age} yrs</span>
                      <span>•</span>
                      <span>{activeCase.applicant.employmentLengthYears} yrs tenure</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{activeCase.applicant.city || 'India'}</span>
                      </span>
                      <span>•</span>
                      <span className="text-slate-400">Applied {RELATIVE_TIME_MAP[activeCase.id] || 'Recently'}</span>
                    </div>
                  </div>
                </div>

                {/* Primary CTA Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setAssistantCaseContext(activeCase);
                      navigate(`/policy-assistant?caseId=${activeCase.id}`);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all shadow-2xs cursor-pointer"
                    title="Open this case profile in PolicyLens AI Chatbot"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-slate-700 animate-pulse" />
                    <span>Ask PolicyLens</span>
                  </button>

                  <button
                    onClick={() => onSelectCase(activeCase.id)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#0f172a] hover:bg-[#1e293b] active:bg-[#334155] border border-slate-800 transition-all shadow-xs hover:shadow cursor-pointer"
                  >
                    <span>Full Underwriting Inspection</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>

              {/* Scrollable Inspection Content */}
              <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3">

                {/* ── 1. Financial Profile & Affordability Breakdown (Condensed Text Hierarchy) ── */}
                <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-slate-700" />
                      <span>Loan Demand & Affordability</span>
                    </h3>
                    <span className="text-[11px] font-mono text-slate-500">
                      36M Tenor @ ~13.5%
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500 font-medium">Requested Facility</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-bold text-slate-900 text-sm font-mono">₹{(activeCase.applicant.requestedAmount / 100000).toFixed(2)}L</span>
                        <span className="text-[10.5px] text-slate-400 font-mono">(EMI: ₹{(Math.round((activeCase.applicant.requestedAmount * (13.5 / 1200) * Math.pow(1 + 13.5 / 1200, 36)) / (Math.pow(1 + 13.5 / 1200, 36) - 1))).toLocaleString('en-IN')}/mo)</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500 font-medium">Verified Gross Income</span>
                      <span className="font-bold text-slate-900 text-sm font-mono">₹{activeCase.applicant.monthlyIncome.toLocaleString('en-IN')}<span className="text-[10.5px] text-slate-400 font-normal">/mo</span></span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500 font-medium">Living & Debt Outflows</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-semibold text-slate-800 font-mono">-₹{(activeCase.applicant.monthlyExpenses + activeCase.applicant.monthlyDebtPayments).toLocaleString('en-IN')}</span>
                        <span className="text-[10.5px] text-slate-400 font-mono">(DTI {((activeCase.applicant.monthlyDebtPayments / (activeCase.applicant.monthlyIncome || 1)) * 100).toFixed(1)}%)</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500 font-medium">Net Disposable Buffer</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-bold text-emerald-700 text-sm font-mono">+₹{((activeCase.applicant.monthlyIncome || 0) - (activeCase.applicant.monthlyExpenses || 0) - (activeCase.applicant.monthlyDebtPayments || 0)).toLocaleString('en-IN')}<span className="text-[10.5px] text-slate-400 font-normal">/mo</span></span>
                        {(() => {
                          const surplus = (activeCase.applicant.monthlyIncome || 0) - (activeCase.applicant.monthlyExpenses || 0) - (activeCase.applicant.monthlyDebtPayments || 0);
                          const emi = (activeCase.applicant.requestedAmount * (13.5 / 1200) * Math.pow(1 + 13.5 / 1200, 36)) / (Math.pow(1 + 13.5 / 1200, 36) - 1);
                          const coverage = emi > 0 ? (surplus / emi).toFixed(1) : '1.0';
                          return (
                            <span className="text-[10.5px] text-emerald-600 font-semibold font-mono">({coverage}x EMI)</span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── 2. Underwriting Intelligence & Key Decision Drivers (Condensed) ── */}
                <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-slate-700" />
                        <span>Decision Intelligence & Drivers</span>
                      </h3>
                      <span className="text-[11px] font-semibold text-slate-600 font-mono">
                        PD {activeCase.creditRisk.scorePercent} ({activeCase.creditRisk.riskBand} Tier)
                      </span>
                    </div>
                    <span
                      className={`text-[10.5px] font-semibold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 ${
                        activeCase.decision === 'APPROVE'
                          ? 'text-emerald-700'
                          : activeCase.decision === 'REFER'
                            ? 'text-amber-700'
                            : 'text-rose-700'
                      }`}
                    >
                      {activeCase.decision === 'APPROVE' ? 'Auto-Approval Verdict' : activeCase.decision === 'REFER' ? 'Analyst Review Queue' : 'Decline Verdict'}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    {(activeCase.reasonCodes || []).slice(0, 3).map((r, i) => (
                      <div key={i} className="flex items-start gap-2 py-0.5">
                        <span className="font-mono text-slate-400 text-[11px] shrink-0 mt-0.5">{i + 1}.</span>
                        <div>
                          <span className="font-semibold text-slate-900">{r.title}: </span>
                          <span className="text-slate-600">{r.detail}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── 3. Underwriting & Verification Checklist (Reference Style) ── */}
                <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 sm:p-4 space-y-3.5 shadow-2xs">
                  {/* Card Header with waveform indicator and status pill */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-slate-100 text-slate-800">
                        <ListChecks className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                          Underwriter Decision Checklist
                        </h3>
                        <p className="text-[10.5px] text-slate-500">
                          Automated identity, capacity, and risk validations
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400 text-xs tracking-widest select-none font-bold">
                        ·|·||·|·
                      </span>
                      <span className="text-[10.5px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {(() => {
                          let passed = 2;
                          if (activeCase.applicant.segment !== 'THIN-FILE') passed++;
                          if (activeCase.fraudSignals.overallRiskScore < 0.25) passed++;
                          if (activeCase.policyRules.every(r => r.result === 'PASSED')) passed++;
                          return `${passed}/5 Validated`;
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Checklist Rows */}
                  <div className="space-y-2.5 pt-0.5">
                    {/* Item 1: Identity & KYC */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-4.5 h-4.5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900">
                          Identity & core KYC captured
                        </div>
                        <div className="text-[10.5px] text-slate-500 leading-relaxed mt-0.5">
                          PAN and Aadhaar verified with 0 name discrepancy against central registry.
                        </div>
                      </div>
                    </div>

                    {/* Item 2: Cashflow & Affordability */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-4.5 h-4.5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900">
                          Income stream & debt buffer confirmed
                        </div>
                        <div className="text-[10.5px] text-slate-500 leading-relaxed mt-0.5">
                          ₹{activeCase.applicant.monthlyIncome.toLocaleString('en-IN')}/mo verified salary credits with net surplus of +₹{((activeCase.applicant.monthlyIncome || 0) - (activeCase.applicant.monthlyExpenses || 0) - (activeCase.applicant.monthlyDebtPayments || 0)).toLocaleString('en-IN')}/mo.
                        </div>
                      </div>
                    </div>

                    {/* Item 3: Bureau Depth */}
                    <div className="flex items-start gap-2.5">
                      {activeCase.applicant.segment !== 'THIN-FILE' ? (
                        <div className="w-4.5 h-4.5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-4.5 h-4.5 rounded-full border border-dashed border-amber-500 bg-amber-50/50 flex items-center justify-center shrink-0 mt-0.5 text-amber-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900">
                          Credit bureau record & tradelines
                        </div>
                        <div className="text-[10.5px] text-slate-500 leading-relaxed mt-0.5">
                          {activeCase.applicant.creditHistoryMonths} months credit history • {activeCase.applicant.tradelinesCount} active tradelines ({activeCase.applicant.segment} profile).
                        </div>
                      </div>
                    </div>

                    {/* Item 4: Fraud & Device Footprint */}
                    <div className="flex items-start gap-2.5">
                      {activeCase.fraudSignals.overallRiskScore < 0.25 ? (
                        <div className="w-4.5 h-4.5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-4.5 h-4.5 rounded-full border border-dashed border-amber-500 bg-amber-50/50 flex items-center justify-center shrink-0 mt-0.5 text-amber-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900">
                          Device integrity & fraud scan
                        </div>
                        <div className="text-[10.5px] text-slate-500 leading-relaxed mt-0.5">
                          {activeCase.fraudSignals.signals[0]?.value || 'Clean IP velocity'} • {activeCase.fraudSignals.signals[1]?.value || 'Single authenticated device'}.
                        </div>
                      </div>
                    </div>

                    {/* Item 5: Policy Rules */}
                    <div className="flex items-start gap-2.5">
                      {activeCase.policyRules.every(r => r.result === 'PASSED') ? (
                        <div className="w-4.5 h-4.5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-4.5 h-4.5 rounded-full border border-slate-300 bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 text-slate-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900">
                          Underwriting policy guideline compliance
                        </div>
                        <div className="text-[10.5px] text-slate-500 leading-relaxed mt-0.5">
                          {activeCase.policyRules.filter(r => r.result === 'PASSED').length} of {activeCase.policyRules.length} policy rules passed with zero critical violations.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Integrated Underwriter Notes directly inside the card ── */}
                  <div className="pt-3 mt-1.5 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
                        <span>Analyst Notes & Activity Log</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {(notesList[activeCase.id] || []).length} recorded
                      </span>
                    </div>

                    {/* Existing Notes list */}
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {(notesList[activeCase.id] || []).length === 0 ? (
                        <p className="text-[10.5px] text-slate-400 italic">No notes recorded yet for this case.</p>
                      ) : (
                        notesList[activeCase.id].map((note, idx) => (
                          <div key={idx} className="p-1.5 px-2 bg-slate-50 rounded border border-slate-200/70 text-xs text-slate-800 flex items-start justify-between gap-2">
                            <span>{note}</span>
                            <span className="text-[9.5px] text-slate-400 shrink-0 font-mono">Just now</span>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Note Input */}
                    <form onSubmit={handleAddNote} className="flex items-center gap-1.5 pt-0.5">
                      <input
                        type="text"
                        placeholder="Add an underwriter note or override reason..."
                        value={quickNote}
                        onChange={e => setQuickNote(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                      />
                      <button
                        type="submit"
                        disabled={!quickNote.trim()}
                        className="p-1.5 px-2.5 rounded-lg bg-[#0f172a] text-white hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                        title="Add Note"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                </div>

              </div>
            </>
          ) : (
            <div className="p-16 text-center text-slate-500 my-auto">
              <p className="text-sm font-semibold text-slate-900">Select an applicant</p>
              <p className="text-xs text-slate-400 mt-1">Choose from the left queue to inspect details.</p>
            </div>
          )}

        </div>

      </div>

      {/* ── Floating Toast Feedback Banner ── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-[#101828] text-white text-xs font-semibold rounded-xl shadow-2xl border border-gray-700 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#12b76a] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
};
