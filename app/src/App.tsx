import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Funds from './pages/Funds';
import Investors from './pages/Investors';
import Properties from './pages/Properties';
import Settings from './pages/Settings';



function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OrganizationProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="funds" element={<Funds />} />
              <Route path="investors" element={<Investors />} />
              <Route path="properties" element={<Properties />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </OrganizationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
