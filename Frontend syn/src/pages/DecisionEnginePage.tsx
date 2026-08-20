import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DecisionEngineView } from '../components/decision/DecisionEngineView';
import { useCases } from '../context/CaseContext';
import { useAuth } from '../context/AuthContext';

export const DecisionEnginePage: React.FC = () => {
  const navigate = useNavigate();
  const { clearAuth } = useAuth();
  const { pendingDecisionCase, setPendingDecisionCase } = useCases();

  const handleSessionExpired = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <DecisionEngineView
      onSessionExpired={handleSessionExpired}
      pendingCase={pendingDecisionCase}
      onPendingCaseConsumed={() => setPendingDecisionCase(null)}
    />
  );
};

export default DecisionEnginePage;
