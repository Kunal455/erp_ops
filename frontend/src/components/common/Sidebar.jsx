import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Layers,
  ClipboardList,
  ArrowLeftRight,
  ShoppingCart,
  ChevronRight,
  Package,
  Users,
} from 'lucide-react';

export const Sidebar = () => {
  const { isAdmin, isOps, isSales } = useAuth();

  const navItems = [
    {
      to: '/inventory',
      label: 'Inventory',
      icon: Layers,
      allowed: true,
    },
    {
      to: '/customer-orders',
      label: 'Customers & Orders',
      icon: Users,
      allowed: isAdmin || isSales,
    },
    {
      to: '/work-orders',
      label: 'Work Orders',
      icon: ClipboardList,
      allowed: isAdmin || isOps,
    },
    {
      to: '/transfers',
      label: 'Stock Transfers',
      icon: ArrowLeftRight,
      allowed: isAdmin || isOps,
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 min-h-[calc(100vh-65px)] flex flex-col justify-between p-4 shrink-0">
      <div className="space-y-6">
        {/* Section Header */}
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Admin Menu
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;

              if (!item.allowed) {
                return (
                  <div
                    key={item.to}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-slate-300 text-sm font-medium cursor-not-allowed opacity-50 select-none"
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">
                      Locked
                    </span>
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition duration-150 ${
                      isActive
                        ? 'bg-[#eef2ff] text-[#4f46e5] font-semibold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center space-x-3">
                        <Icon
                          className={`w-4 h-4 ${isActive ? 'text-[#4f46e5]' : 'text-slate-400'}`}
                        />
                        <span>{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="w-4 h-4 text-[#4f46e5]" />}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Warehouse Status Pill at bottom */}
      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Multi-Warehouse Live</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1">
          MySQL 8.0 Concurrency-Safe
        </div>
      </div>
    </aside>
  );
};
