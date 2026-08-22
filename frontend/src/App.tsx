import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { InventoryPage } from './pages/InventoryPage';
import { WorkOrdersPage } from './pages/WorkOrdersPage';
import { TransfersPage } from './pages/TransfersPage';
import { CustomerOrdersPage } from './pages/CustomerOrdersPage';

export const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Authenticated Dashboard Shell */}
      <Route element={<DashboardLayout />}>
        {/* Inventory accessible to all roles */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'OPERATIONS', 'SALES']} />}>
          <Route path="/inventory" element={<InventoryPage />} />
        </Route>

        {/* Work Orders accessible to Admin and Operations */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'OPERATIONS']} />}>
          <Route path="/work-orders" element={<WorkOrdersPage />} />
        </Route>

        {/* Internal Transfers accessible to Admin and Operations */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'OPERATIONS']} />}>
          <Route path="/transfers" element={<TransfersPage />} />
        </Route>

        {/* Customer Orders accessible to Admin and Sales */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SALES']} />}>
          <Route path="/customer-orders" element={<CustomerOrdersPage />} />
        </Route>
      </Route>

      {/* Default fallback */}
      <Route path="*" element={<Navigate to="/inventory" replace />} />
    </Routes>
  );
};

export default App;
