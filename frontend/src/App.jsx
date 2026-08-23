import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { InventoryPage } from './pages/InventoryPage';
import { WorkOrdersPage } from './pages/WorkOrdersPage';
import { TransfersPage } from './pages/TransfersPage';
import { CustomerOrdersPage } from './pages/CustomerOrdersPage';

export const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Authenticated Dashboard Shell */}
      <Route element={<DashboardLayout />}>
        {/* Inventory accessible to ADMIN, OPERATIONS_USER, and SALES_USER */}
        <Route
          element={
            <ProtectedRoute
              allowedRoles={['ADMIN', 'OPERATIONS_USER', 'SALES_USER']}
            />
          }
        >
          <Route path="/inventory" element={<InventoryPage />} />
        </Route>

        {/* Work Orders accessible to ADMIN (manage) and OPERATIONS_USER (view & shortage) */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'OPERATIONS_USER']} />
          }
        >
          <Route path="/work-orders" element={<WorkOrdersPage />} />
        </Route>

        {/* Internal Transfers accessible to OPERATIONS_USER (manage) and ADMIN (view) */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'OPERATIONS_USER']} />
          }
        >
          <Route path="/transfers" element={<TransfersPage />} />
        </Route>

        {/* Customer Orders accessible to SALES_USER (manage) and ADMIN (view) */}
        <Route
          element={<ProtectedRoute allowedRoles={['ADMIN', 'SALES_USER']} />}
        >
          <Route path="/customer-orders" element={<CustomerOrdersPage />} />
        </Route>
      </Route>

      {/* Default fallback */}
      <Route path="*" element={<Navigate to="/inventory" replace />} />
    </Routes>
  );
};

export default App;
