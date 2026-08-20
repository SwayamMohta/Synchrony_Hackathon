import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { ApplicationWorkspace } from '../components/workspace/ApplicationWorkspace';
import { useCases } from '../context/CaseContext';

export const ApplicationCasePage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { getCaseById, setSelectedCaseId, setAssistantCaseContext } = useCases();

  const currentCase = caseId ? getCaseById(caseId) : undefined;

  if (!currentCase) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-2xl border border-gray-200 shadow-sm text-center">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Application Not Found</h2>
        <p className="text-xs text-gray-500 mb-6">
          Could not find an application with ID <code className="font-mono text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">{caseId}</code>.
        </p>
        <button
          onClick={() => navigate('/applications')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0f172a] text-white text-xs font-semibold rounded-lg hover:bg-[#1e293b] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Applications Hub</span>
        </button>
      </div>
    );
  }

  return (
    <ApplicationWorkspace
      currentCase={currentCase}
      onBackToQueue={() => navigate('/applications')}
      onOpenPolicyAssistant={(targetCaseId) => {
        setSelectedCaseId(targetCaseId);
        setAssistantCaseContext(currentCase);
        navigate(`/policy-assistant?caseId=${targetCaseId}`);
      }}
      onOpenAuditRecord={(targetCaseId) => {
        setSelectedCaseId(targetCaseId);
        navigate(`/analytics?caseId=${targetCaseId}`);
      }}
    />
  );
};

export default ApplicationCasePage;
