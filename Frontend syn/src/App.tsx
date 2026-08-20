import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CaseProvider } from './context/CaseContext';
import { LoginView } from './components/auth/LoginView';
import { AppShell } from './components/layout/AppShell';

import { DecisionEnginePage } from './pages/DecisionEnginePage';
import { ApplicationsHubPage } from './pages/ApplicationsHubPage';
import { ApplicationCasePage } from './pages/ApplicationCasePage';
import { PolicyAssistantPage } from './pages/PolicyAssistantPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { NewApplicationPage } from './pages/NewApplicationPage';
import LandingPage from './pages/LandingPage';
import AboutPage from './pages/AboutPage';
import FAQPage from './pages/FAQPage';

// Protected Route Guard
const ProtectedLayout: React.FC = () => {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <AppShell />;
};

// Login Route Guard (redirects to /applications if already logged in)
const LoginRoute: React.FC = () => {
  const { token } = useAuth();
  if (token) {
    return <Navigate to="/applications" replace />;
  }
  return <LoginView />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/" element={<LandingPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/faq" element={<FAQPage />} />

      {/* Authenticated Application Shell & Sub-Pages */}
      <Route element={<ProtectedLayout />}>
        <Route path="/overview" element={<Navigate to="/applications" replace />} />
        <Route path="/decision-engine" element={<DecisionEnginePage />} />
        <Route path="/applications" element={<ApplicationsHubPage />} />
        <Route path="/applications/:caseId" element={<ApplicationCasePage />} />
        <Route path="/fraud-signals" element={<Navigate to="/analytics?tab=fraud" replace />} />
        <Route path="/policy-assistant" element={<PolicyAssistantPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/new-application" element={<NewApplicationPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <CaseProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </CaseProvider>
    </AuthProvider>
  );
};

export default App;
