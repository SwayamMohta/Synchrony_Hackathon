import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PolicyAssistant } from '../components/assistant/PolicyAssistant';
import { useCases } from '../context/CaseContext';

export const PolicyAssistantPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const caseIdParam = searchParams.get('caseId');
  const { cases, assistantCaseContext, getCaseById } = useCases();

  const activeCase = useMemo(() => {
    if (caseIdParam) {
      return getCaseById(caseIdParam) || null;
    }
    return assistantCaseContext || cases[0] || null;
  }, [caseIdParam, assistantCaseContext, cases, getCaseById]);

  return <PolicyAssistant initialCase={activeCase} />;
};

export default PolicyAssistantPage;
