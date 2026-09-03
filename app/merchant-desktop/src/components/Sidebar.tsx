import React from 'react';
import {
  LayoutDashboard,
  ShieldCheck,
  ListOrdered,
  HardDrive,
  History,
  Terminal,
  Settings,
  Printer,
  LogOut,
  Power,
  Users,
} from 'lucide-react';
import { SpoolerMetrics } from '../types/printer';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  metrics: SpoolerMetrics;
  isOnline: boolean;
  merchantName?: string;
  username?: string;
  userRole?: 'admin' | 'staff';
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
  username,
  userRole = 'staff',
  shopName,
  onToggleOnline,
  onLogout,
}) => {
  const primaryNavItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: undefined,
    },
    {
      id: 'verification',
      label: 'Verification Desk',
      icon: ShieldCheck,
      badge: 'Counter',
      badgeColor: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    },
    {
      id: 'queue',
      label: 'Print Queue',
      icon: ListOrdered,
      badge: metrics.activeJobs > 0 ? String(metrics.activeJobs) : undefined,
      badgeColor: 'bg-blue-500 text-white',
    },
    {
      id: 'fleet',
      label: 'Printers',
      icon: HardDrive,
      badge: 'Win32',
      badgeColor: 'bg-white/10 text-zinc-300',
    },
    {
      id: 'history',
      label: 'Activity & History',
      icon: History,
      badge: undefined,
    },
    {
      id: 'diagnostics',
      label: 'System Diagnostics',
      icon: Terminal,
      badge: 'Spooler',
      badgeColor: 'bg-white/10 text-zinc-300',
    },
  ];

  return (
    <aside className="w-64 bg-[#141419] border-r border-white/10 flex flex-col p-5 select-none shrink-0 h-screen justify-between font-sans text-white z-30">
      <div className="space-y-6">
        {/* Brand & Store Header */}
        <div className="flex items-center gap-3 px-1">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20 text-white shrink-0">
            <Printer className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm tracking-tight text-white">AutoPrint</span>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                DESK
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-medium truncate max-w-[130px] mt-0.5">
              {shopName || 'AutoPrint Express Store'}
            </p>
          </div>
        </div>

        {/* Primary Navigation Menu */}
        <nav className="space-y-1">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-zinc-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
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

      {/* Footer Navigation: Settings & Profile */}
      <div className="space-y-3 pt-4 border-t border-white/10">
        <button
          onClick={() => onSelectView('settings')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            currentView === 'settings'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-3">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </div>
          {userRole === 'admin' && (
            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Admin
            </span>
          )}
        </button>

        {/* Compact Operator Card */}
        <div className="p-3 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-xs font-bold text-white truncate max-w-[90px]">
                {merchantName || 'Operator'}
              </span>
              {userRole === 'admin' ? (
                <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                  Admin
                </span>
              ) : (
                <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                  Staff
                </span>
              )}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-1">
              @{username || 'staff'}
            </div>
          </div>

          <button
            onClick={onLogout}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 transition-colors cursor-pointer shrink-0"
            title="Sign out of station"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
