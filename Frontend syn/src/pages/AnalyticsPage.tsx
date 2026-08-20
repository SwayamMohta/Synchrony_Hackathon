import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnalyticsWorkspace, type AnalyticsSubTab } from '../components/analytics/AnalyticsWorkspace';
import { useCases } from '../context/CaseContext';

export const AnalyticsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const caseIdParam = searchParams.get('caseId');
  const tabParam = searchParams.get('tab') as AnalyticsSubTab | null;
  const { cases, selectedCaseId, setSelectedCaseId } = useCases();

  useEffect(() => {
    if (caseIdParam) {
      setSelectedCaseId(caseIdParam);
    }
  }, [caseIdParam, setSelectedCaseId]);

  const activeSubTab: AnalyticsSubTab =
    tabParam === 'fraud' || tabParam === 'audit' || tabParam === 'models' || tabParam === 'distribution'
      ? tabParam
      : 'distribution';

  const handleTabChange = (newTab: AnalyticsSubTab) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', newTab);
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <AnalyticsWorkspace
      cases={cases}
      selectedCaseId={caseIdParam || selectedCaseId}
      onSelectCase={setSelectedCaseId}
      defaultSubTab={activeSubTab}
      onTabChange={handleTabChange}
    />
  );
};

export default AnalyticsPage;
