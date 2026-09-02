import React from 'react';
import {
  Printer,
  ListOrdered,
  HardDrive,
  Terminal,
  ShieldCheck,
  CreditCard,
  LogOut,
  Power,
  Store,
} from 'lucide-react';
import { SpoolerMetrics } from '../types/printer';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  metrics: SpoolerMetrics;
  isOnline: boolean;
  merchantName?: string;
  shopName?: string;
  onToggleOnline: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  metrics,
  isOnline,
  merchantName,
  shopName,
  onToggleOnline,
  onLogout,
}) => {
  const navItems = [
    {
      id: 'verification',
      label: 'Staff Verification',
      icon: ShieldCheck,
      badge: 'Fail-Safe',
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'queue',
      label: 'Active Queue',
      icon: ListOrdered,
      badge: metrics.activeJobs > 0 ? metrics.activeJobs : undefined,
      badgeColor: 'bg-red-500 text-white',
    },
    {
      id: 'fleet',
      label: 'Printer Fleet',
      icon: HardDrive,
      badge: 'Live',
      badgeColor: 'bg-slate-100 text-slate-700',
    },
    {
      id: 'payment',
      label: 'Payment Receiver',
      icon: CreditCard,
      badge: 'UPI / QR',
      badgeColor: 'bg-purple-100 text-purple-800',
    },
    {
      id: 'telemetry',
      label: 'Spooler Logs',
      icon: Terminal,
      badge: 'System',
      badgeColor: 'bg-slate-100 text-slate-700',
    },
  ];

  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col p-6 select-none shrink-0 h-screen overflow-y-auto shadow-xs font-sans justify-between">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20 text-white">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-base tracking-tight text-slate-900">AutoPrint</h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                DESK
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium truncate max-w-[140px]">
              {shopName || 'Merchant Station'}
            </p>
          </div>
        </div>

        {/* Shop Online / Offline Toggle Card */}
        <div className="mb-6 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <div className="text-xs font-bold text-slate-800">
              {isOnline ? 'Orders Active' : 'Orders Paused'}
            </div>
          </div>
          <button
            onClick={onToggleOnline}
            className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              isOnline
                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            {isOnline ? 'Online' : 'Offline'}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      active ? 'bg-white/20 text-white' : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Account / Logout */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-800 truncate">
              {merchantName || 'Duty Cashier'}
            </div>
            <div className="text-[10px] text-slate-400">Authenticated Staff</div>
          </div>
          <button
            onClick={onLogout}
            className="p-2 rounded-xl border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-500 transition-colors cursor-pointer"
            title="Sign out of Merchant Desk"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
