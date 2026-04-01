import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './components/pages/Dashboard';
import EmployeeList from './components/pages/Employees/EmployeeList';
import EmployeeProfile from './components/pages/Employees/EmployeeProfile';
import VendorList from './components/pages/Vendors/VendorList';
import Assets from './components/pages/Assets/Assets';
import Settings from './components/pages/Settings/Settings';
import EmployeeOnboardingForm from './components/pages/Forms/EmployeeOnboardingForm';

function App() {
  return (
    <Router>
      <Routes>
        {/* Standalone Route for Onboarding Form (No Layout) */}
        <Route path="/onboarding" element={<EmployeeOnboardingForm />} />

        {/* Main Application Routes (With Layout) */}
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/employees" element={<EmployeeList />} />
              <Route path="/employees/:id" element={<EmployeeProfile />} />
              <Route path="/vendors" element={<VendorList />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </Router>
  );
}

export default App;
