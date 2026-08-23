import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

export const ProtectedRoute = ({ allowedRoles }) => {
  const { user, role, hasRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return (
      <div className="p-8 max-w-2xl mx-auto mt-12">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold font-serif text-red-900">403 - Access Forbidden</h2>
          <p className="text-sm text-red-700">
            Your current active role (<strong className="uppercase font-mono">{role}</strong>) does not have authorization to access this module.
          </p>
          <div className="text-xs text-slate-500 font-mono">
            Allowed role(s): {allowedRoles.join(', ')}
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
};
