import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Boxes,
  ClipboardList,
  ArrowLeftRight,
  ShoppingCart,
  FileText,
  ShieldAlert,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const navItems = [
    {
      to: '/inventory',
      label: 'Inventory & Stock',
      icon: Boxes,
      roles: ['ADMIN', 'OPERATIONS', 'SALES'],
      badge: 'Real-time',
    },
    {
      to: '/work-orders',
      label: 'Work Orders',
      icon: ClipboardList,
      roles: ['ADMIN', 'OPERATIONS'],
      badge: user?.role === 'ADMIN' ? 'Manage' : 'View',
    },
    {
      to: '/transfers',
      label: 'Internal Transfers',
      icon: ArrowLeftRight,
      roles: ['ADMIN', 'OPERATIONS'],
      badge: 'Transfers',
    },
    {
      to: '/customer-orders',
      label: 'Customer Orders',
      icon: ShoppingCart,
      roles: ['ADMIN', 'SALES'],
      badge: 'Reservations',
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-61px)]">
      <div className="p-4 flex-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-3 mb-3">
          Operations Modules
        </div>
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isAccessible = item.roles.includes(user?.role || '');

            if (!isAccessible) {
              return (
                <div
                  key={item.to}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-600 bg-slate-800/40 cursor-not-allowed opacity-60 text-sm"
                  title={`Restricted to: ${item.roles.join(', ')}`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-4 h-4 text-slate-600" />
                    <span>{item.label}</span>
                  </div>
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                </div>
              );
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 group-hover:text-slate-200">
                  {item.badge}
                </span>
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-8 pt-4 border-t border-slate-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-3 mb-2">
            API Documentation
          </div>
          <a
            href="http://localhost:5000/api/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-3 px-3 py-2 text-sm text-slate-400 hover:text-emerald-400 hover:bg-slate-800/60 rounded-lg transition"
          >
            <FileText className="w-4 h-4" />
            <span>OpenAPI / Swagger</span>
          </a>
        </div>
      </div>

      {/* Role Info Footer */}
      <div className="p-4 bg-slate-950/60 border-t border-slate-800/80 text-xs">
        <div className="text-slate-400 font-medium">Logged in role:</div>
        <div className="text-emerald-400 font-semibold mt-0.5">{user?.role}</div>
      </div>
    </aside>
  );
};
