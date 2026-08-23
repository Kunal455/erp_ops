import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Search, LogOut, Shield, ChevronDown, Sparkles, Zap, Command } from 'lucide-react';

export const Navbar = () => {
  const { user, role, logout, setRoleOverride, isRoleOverridden } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const availableRoles = ['ADMIN', 'OPERATIONS', 'SALES'];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between shadow-xs">
      {/* Brand Logo */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
          <Zap className="w-5 h-5 fill-white text-white" />
        </div>
        <div>
          <div className="text-lg font-bold text-slate-900 leading-none tracking-tight flex items-center space-x-1.5 font-sans">
            <span>FundsERP</span>
          </div>
          <div className="text-[11px] font-semibold text-indigo-600 tracking-wide uppercase mt-0.5">
            Operations CRM
          </div>
        </div>
      </div>

      {/* Global Search Bar with ⌘K */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search items, orders, transfers..."
            className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
          <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <kbd className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 rounded">
              ⌘K
            </kbd>
          </span>
        </div>
      </div>

      {/* Right Controls: Role Switcher & User Profile */}
      <div className="flex items-center space-x-4">
        {/* Quick Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              role === 'ADMIN'
                ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                : role === 'OPERATIONS'
                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Role: {role}</span>
            {isRoleOverridden && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            )}
            <ChevronDown className="w-3 h-3" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase text-slate-400 border-b border-slate-100">
                Switch Active Role
              </div>
              {availableRoles.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRoleOverride(r);
                    setShowRoleMenu(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between hover:bg-slate-50 transition ${
                    role === r ? 'text-indigo-600 font-bold bg-indigo-50/50' : 'text-slate-700'
                  }`}
                >
                  <span>{r}</span>
                  {role === r && <span className="text-xs">✓</span>}
                </button>
              ))}
              {isRoleOverridden && (
                <div className="pt-1 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setRoleOverride(null);
                      setShowRoleMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 text-[11px] text-amber-600 hover:bg-amber-50 font-medium"
                  >
                    Reset to Auth Role ({user?.role})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Info Avatar */}
        <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-900">{user?.name || 'User'}</div>
            <div className="text-[10px] text-slate-400">{user?.email}</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-[#4f46e5] text-white flex items-center justify-center font-bold text-sm shadow-sm">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
