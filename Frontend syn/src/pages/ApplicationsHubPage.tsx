import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ApplicationsHub } from '../components/workspace/ApplicationsHub';
import { useCases } from '../context/CaseContext';

export const ApplicationsHubPage: React.FC = () => {
  const navigate = useNavigate();
  const { cases, setSelectedCaseId } = useCases();

  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    navigate(`/applications/${caseId}`);
  };

  const handleNavigateToNewApp = () => {
    navigate('/decision-engine');
  };

  return (
    <ApplicationsHub
      cases={cases}
      onSelectCase={handleSelectCase}
      onNavigateToNewApp={handleNavigateToNewApp}
    />
  );
};

export default ApplicationsHubPage;
