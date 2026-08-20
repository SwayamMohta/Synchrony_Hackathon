import React from 'react';
import { Navigate } from 'react-router-dom';

export const NewApplicationPage: React.FC = () => {
  // Seamlessly unified into the single Decision Engine & Intake Workstation
  return <Navigate to="/decision-engine" replace />;
};

export default NewApplicationPage;
