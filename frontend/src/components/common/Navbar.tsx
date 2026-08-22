import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User as UserIcon, Layers } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, login } = useAuth();

  const handleQuickSwitch = async (role: 'ADMIN' | 'OPERATIONS' | 'SALES') => {
    const creds = {
      ADMIN: { email: 'admin@fundsroom.com', pass: 'admin123' },
      OPERATIONS: { email: 'ops@fundsroom.com', pass: 'ops123' },
      SALES: { email: 'sales@fundsroom.com', pass: 'sales123' },
    };
    try {
      await login(creds[role].email, creds[role].pass);
    } catch (e) {
      console.error('Quick switch error', e);
    }
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'OPERATIONS':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'SALES':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-slate-900 text-white p-2 rounded-lg flex items-center justify-center">
            <Layers className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Mini Operations ERP</h1>
            <p className="text-xs text-slate-500 font-medium">Production Operations Management</p>
          </div>
        </div>

        {/* Quick Role Switcher for Evaluator Demo */}
        <div className="hidden md:flex items-center space-x-2 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <span className="text-slate-500 font-semibold px-2">Quick Role:</span>
          <button
            onClick={() => handleQuickSwitch('ADMIN')}
            className={`px-2.5 py-1 rounded font-medium transition ${
              user?.role === 'ADMIN' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => handleQuickSwitch('OPERATIONS')}
            className={`px-2.5 py-1 rounded font-medium transition ${
              user?.role === 'OPERATIONS' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Operations
          </button>
          <button
            onClick={() => handleQuickSwitch('SALES')}
            className={`px-2.5 py-1 rounded font-medium transition ${
              user?.role === 'SALES' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Sales
          </button>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3 text-right">
            <div>
              <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
              <div className="flex items-center justify-end space-x-1.5 mt-0.5">
                <span
                  className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full border uppercase ${getRoleBadgeColor(
                    user?.role
                  )}`}
                >
                  {user?.role}
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 font-bold">
              {user?.name ? user.name[0] : <UserIcon className="w-4 h-4" />}
            </div>
          </div>

          <button
            onClick={logout}
            title="Logout"
            className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition border border-transparent hover:border-red-100"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
