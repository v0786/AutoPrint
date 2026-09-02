import React from 'react';
import {
  Printer,
  ListOrdered,
  PlusCircle,
  HardDrive,
  Terminal,
  Cpu,
  PauseCircle,
  PlayCircle,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Sparkles,
  Users,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { PrinterDevice, SpoolerMetrics } from '../types/printer';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  metrics: SpoolerMetrics;
  defaultPrinter?: PrinterDevice;
  onPauseResumeQueue: () => void;
  onPurgeCompleted: () => void;
  onOpenNewJobModal: () => void;
  onOpenOnboarding?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  metrics,
  defaultPrinter,
  onPauseResumeQueue,
  onPurgeCompleted,
  onOpenNewJobModal,
  onOpenOnboarding,
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
      id: 'dispatch',
      label: 'Job Dispatch Studio',
      icon: PlusCircle,
      badge: 'Receipts / Labels',
      badgeColor: 'bg-blue-100 text-blue-800',
    },
    {
      id: 'fleet',
      label: 'Printer Devices',
      icon: HardDrive,
      badge: '5 Online',
      badgeColor: 'bg-slate-100 text-slate-700',
    },
    {
      id: 'telemetry',
      label: 'Spooler Logs',
      icon: Terminal,
      badge: 'Live',
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'architecture',
      label: 'Electron IPC Bridge',
      icon: Cpu,
      badge: 'v2.4',
      badgeColor: 'bg-blue-50 text-blue-700',
    },
  ];

  return (
    <aside className="w-72 bg-white border-r border-blue-100/80 flex flex-col p-6 select-none shrink-0 h-screen overflow-y-auto shadow-xs">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20 text-white">
          <Printer className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-bold text-base tracking-tight text-slate-900">AutoPrint</h1>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
              PRO
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium tracking-wide">
            Local Spooler Engine v2.4
          </p>
        </div>
      </div>

      {/* Quick Action Button - Green */}
      <button
        id="btn-sidebar-new-job"
        onClick={onOpenNewJobModal}
        className="w-full mb-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-emerald-700/20 transition-all duration-150"
      >
        <PlusCircle className="w-4 h-4" />
        <span>New Print Job</span>
      </button>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 px-2">
            Main Interface
          </p>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <li key={item.id}>
                  <button
                    id={`nav-item-${item.id}`}
                    onClick={() => onSelectView(item.id)}
                    className={`w-full p-2.5 rounded-xl flex items-center justify-between text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/70 shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full transition-colors ${
                          isActive ? 'bg-blue-600' : 'bg-transparent opacity-0'
                        }`}
                      />
                      <Icon className="w-4 h-4 opacity-80" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Primary Default Device Status Card */}
        {defaultPrinter && (
          <div>
            <div className="flex items-center justify-between mb-3 px-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Default Printer
              </p>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-3.5 shadow-2xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900 truncate max-w-[150px]">
                    {defaultPrinter.displayName}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                    <span className="capitalize">{defaultPrinter.status}</span> •{' '}
                    <span>{defaultPrinter.paperFormat}</span> • <span>{defaultPrinter.port}</span>
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold bg-white border border-blue-100 px-1.5 py-0.5 rounded text-blue-700">
                  {defaultPrinter.dpi} DPI
                </span>
              </div>

              {/* Paper & Toner gauges with RED progress bars */}
              <div className="space-y-2 pt-1 border-t border-blue-100/60">
                <div>
                  <div className="flex justify-between text-[10px] font-semibold text-slate-600 mb-1">
                    <span>Paper Roll</span>
                    <span className={defaultPrinter.paperLevelPercent < 20 ? 'text-red-600 font-bold' : 'text-slate-600'}>
                      {defaultPrinter.paperLevelPercent}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-red-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-600 rounded-full transition-all duration-300"
                      style={{ width: `${defaultPrinter.paperLevelPercent}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-semibold text-slate-600 mb-1">
                    <span>Head / Ribbon</span>
                    <span>{defaultPrinter.tonerLevelPercent}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-red-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all duration-300"
                      style={{ width: `${defaultPrinter.tonerLevelPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Queue Operations */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-2">
            Spooler Controls
          </p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              id="btn-sidebar-toggle-pause"
              onClick={onPauseResumeQueue}
              className={`p-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 border transition-colors ${
                metrics.isQueuePaused
                  ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              {metrics.isQueuePaused ? (
                <>
                  <PlayCircle className="w-3.5 h-3.5 text-white" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <PauseCircle className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Pause</span>
                </>
              )}
            </button>

            <button
              id="btn-sidebar-purge-history"
              onClick={onPurgeCompleted}
              className="p-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 bg-slate-50 text-slate-600 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
              title="Clear finished jobs from queue"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge Done</span>
            </button>
          </div>

          {/* Rerun Setup / Onboarding Wizard - Green accent button */}
          {onOpenOnboarding && (
            <button
              id="btn-sidebar-run-onboarding"
              onClick={onOpenOnboarding}
              className="w-full p-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 transition-all shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Setup / Onboarding Wizard</span>
            </button>
          )}
        </div>
      </nav>

      {/* IPC Bridge Status Footer */}
      <div className="mt-auto pt-4 border-t border-blue-100">
        <div className="p-3 bg-blue-50/70 border border-blue-100/60 rounded-xl flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-wider text-blue-600">
              IPC LINK / SPOOLER
            </span>
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <Radio className="w-3 h-3 text-emerald-500" />
              Native Spool Active
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono font-bold text-blue-700">
              {metrics.avgLatencyMs}ms
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
