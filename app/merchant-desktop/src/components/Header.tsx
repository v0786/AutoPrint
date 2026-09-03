import React from 'react';
import {
  Printer,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  User,
  Power,
  ShieldCheck,
  HardDrive,
  ListOrdered,
  History,
  Terminal,
  Settings,
  Store,
} from 'lucide-react';
import { PrinterDevice, SpoolerMetrics } from '../types/printer';

interface HeaderProps {
  currentView: string;
  isOnline: boolean;
  userRole?: 'admin' | 'staff';
  username?: string;
  ownerName?: string;
  shopName?: string;
  printers: PrinterDevice[];
  metrics: SpoolerMetrics;
  onToggleOnline: () => void;
  onLogout: () => void;
  onSelectView: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  isOnline,
  userRole = 'staff',
  username = 'operator',
  ownerName,
  shopName,
  printers,
  metrics,
  onToggleOnline,
  onLogout,
  onSelectView,
}) => {
  const getPageInfo = () => {
    switch (currentView) {
      case 'dashboard':
        return {
          title: 'Print Shop Operations Console',
          subtitle: 'Live counter status, spooler queue, pending pick-ups, and hardware alerts',
        };
      case 'verification':
        return {
          title: 'Verification Desk & Cash Collection',
          subtitle: 'Verify 8-digit customer pickup codes, inspect print specs, collect cash, and confirm handover',
        };
      case 'queue':
        return {
          title: 'Active Print Spooler Queue',
          subtitle: `Managing ${metrics.activeJobs} active spooler tasks • Fast-track, reorder, or pause transmission`,
        };
      case 'fleet':
        return {
          title: 'Printer Fleet & Hardware Hub',
          subtitle: 'Windows spooler auto-discovery, live status indicators, default printer routing, and diagnostics',
        };
      case 'history':
        return {
          title: 'Activity & Order History',
          subtitle: 'Search past verified pick-ups, cash collection records, and immutable handover audit events',
        };
      case 'diagnostics':
        return {
          title: 'System Diagnostics & Spooler Telemetry',
          subtitle: 'Hardware latency metrics, driver error rates, system uptime, and live event stream',
        };
      case 'settings':
        return {
          title: 'Station & System Settings',
          subtitle: 'Store profile, dynamic print pricing matrix, payment receiver, and staff access',
        };
      default:
        return {
          title: 'AutoPrint Merchant Station',
          subtitle: 'Point of Sale & Spooler Terminal',
        };
    }
  };

  const { title, subtitle } = getPageInfo();

  // Hardware status calculation
  const errorPrinters = printers.filter((p) => p.status === 'error' || p.status === 'offline');
  const defaultPrinter = printers.find((p) => p.isDefault) || printers[0];

  return (
    <header className="h-20 bg-[#141419] border-b border-white/10 px-6 sm:px-8 flex items-center justify-between shrink-0 font-sans z-20">
      {/* Left: Page Title & Subtitle */}
      <div className="min-w-0 pr-4">
        <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate flex items-center gap-2">
          <span>{title}</span>
        </h1>
        <p className="text-[11px] text-zinc-400 truncate mt-0.5 font-medium">
          {subtitle}
        </p>
      </div>

      {/* Right: Operational Status Badges & User Profile */}
      <div className="flex items-center gap-3 shrink-0">
        {/* 1. Printer Alert / Status Indicator */}
        <button
          onClick={() => onSelectView('fleet')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            errorPrinters.length > 0
              ? 'bg-rose-950/50 border-rose-500/40 text-rose-300 hover:bg-rose-950/80'
              : 'bg-black/40 border-white/10 text-zinc-300 hover:bg-white/5'
          }`}
          title="Inspect printer fleet hardware status"
        >
          <HardDrive className={`w-3.5 h-3.5 ${errorPrinters.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
          <span className="hidden md:inline">
            {errorPrinters.length > 0
              ? `${errorPrinters.length} Printer Alert`
              : defaultPrinter?.displayName || defaultPrinter?.name || 'Printers OK'}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              errorPrinters.length > 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'
            }`}
          />
        </button>

        {/* 2. Shop Online / Offline Status Button */}
        <button
          onClick={onToggleOnline}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            isOnline
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/70'
              : 'bg-zinc-800 border-white/10 text-zinc-400 hover:bg-zinc-700'
          }`}
          title="Toggle customer kiosk ordering availability"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
            }`}
          />
          <span>{isOnline ? 'Shop Online' : 'Shop Paused'}</span>
        </button>

        {/* 3. User Avatar & Role */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-white/10">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-md shadow-purple-600/20">
            {ownerName ? ownerName.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="hidden lg:block text-left">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-xs font-bold text-white truncate max-w-[100px]">
                {ownerName || 'Operator'}
              </span>
              {userRole === 'admin' ? (
                <span className="text-[9px] font-black uppercase px-1 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Admin
                </span>
              ) : (
                <span className="text-[9px] font-bold uppercase px-1 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Staff
                </span>
              )}
            </div>
            <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
              @{username}
            </div>
          </div>

          <button
            onClick={onLogout}
            className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 transition-colors cursor-pointer"
            title="Sign out of station"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
