import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { loadCases } from '../services/api';
import { useAuth } from './AuthContext';
import type { ApplicationCase } from '../types/underwriting';

interface CaseContextValue {
  cases: ApplicationCase[];
  loading: boolean;
  error: string | null;
  selectedCaseId: string;
  setSelectedCaseId: (id: string) => void;
  pendingDecisionCase: ApplicationCase | null;
  setPendingDecisionCase: (c: ApplicationCase | null) => void;
  assistantCaseContext: ApplicationCase | null;
  setAssistantCaseContext: (c: ApplicationCase | null) => void;
  addCase: (newCase: ApplicationCase) => void;
  updateCase: (updatedCase: ApplicationCase) => void;
  getCaseById: (id: string) => ApplicationCase | undefined;
  refreshCases: () => void;
}

const CaseContext = createContext<CaseContextValue | undefined>(undefined);

export const CaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [cases, setCases] = useState<ApplicationCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [pendingDecisionCase, setPendingDecisionCase] = useState<ApplicationCase | null>(null);
  const [assistantCaseContext, setAssistantCaseContext] = useState<ApplicationCase | null>(null);

  const addCase = useCallback((newCase: ApplicationCase) => {
    setCases(prev => [
      newCase,
      ...prev.filter(c => c.applicant.name !== newCase.applicant.name),
    ]);
    setSelectedCaseId(newCase.id);
  }, []);

  const updateCase = useCallback((updatedCase: ApplicationCase) => {
    setCases(prev => prev.map(c => (c.id === updatedCase.id ? updatedCase : c)));
  }, []);

  const getCaseById = useCallback(
    (id: string) => cases.find(c => c.id.toLowerCase() === id.toLowerCase()),
    [cases]
  );

  const refreshCases = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const list = await loadCases(token);
      setCases(list);
      setSelectedCaseId(prev => prev || list[0]?.id || '');
    } catch (e: any) {
      setError(e?.message || 'Failed to load cases.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      refreshCases();
    }
  }, [token, refreshCases]);

  return (
    <CaseContext.Provider
      value={{
        cases,
        loading,
        error,
        selectedCaseId,
        setSelectedCaseId,
        pendingDecisionCase,
        setPendingDecisionCase,
        assistantCaseContext,
        setAssistantCaseContext,
        addCase,
        updateCase,
        getCaseById,
        refreshCases,
      }}
    >
      {children}
    </CaseContext.Provider>
  );
};

export const useCases = (): CaseContextValue => {
  const context = useContext(CaseContext);
  if (!context) {
    throw new Error('useCases must be used within a CaseProvider');
  }
  return context;
};
