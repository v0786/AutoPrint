/**
 * Step 0: Branded Splash Screen with Logo Display
 */
import React from 'react';
import { Printer, Shield, Zap, HardDrive, ArrowRight, CheckCircle2, Cpu } from 'lucide-react';

interface StepSplashProps {
  onStart: () => void;
}

export const StepSplash: React.FC<StepSplashProps> = ({ onStart }) => {
  return (
    <div className="flex flex-col items-center text-center max-w-2xl mx-auto py-4">
      {/* Brand Logo & Aura */}
      <div className="relative mb-6">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-blue-600 border-2 border-blue-200 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 relative z-10 transition-transform hover:scale-105 duration-300">
          <Printer className="w-12 h-12 sm:w-14 sm:h-14 text-white" />
        </div>
        {/* Soft decorative glow */}
        <div className="absolute -inset-2 bg-blue-400/20 rounded-full blur-xl -z-0"></div>
      </div>

      {/* Brand Title & Tagline */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-3 border border-blue-200">
        <Cpu className="w-3.5 h-3.5" />
        Local-First Architecture • v2.4
      </div>

      <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
        AutoPrint System Setup
      </h1>

      <p className="text-sm sm:text-base text-slate-600 max-w-lg leading-relaxed mb-8">
        Welcome to your offline-first merchant printing station. Configure your local hardware spooler, store identity, and role-based access controls in just a few steps.
      </p>

      {/* Core Local Architecture Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full text-left mb-8">
        <div className="p-4 bg-white border border-blue-100 rounded-2xl shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5 border border-emerald-100">
            <HardDrive className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 mb-1">100% Offline & Local</h4>
          <p className="text-[11px] text-slate-500 leading-normal">
            No cloud dependencies. All files, receipts, and user profiles remain on this workstation.
          </p>
        </div>

        <div className="p-4 bg-white border border-blue-100 rounded-2xl shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5 border border-blue-100">
            <Zap className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 mb-1">Sub-Millisecond IPC</h4>
          <p className="text-[11px] text-slate-500 leading-normal">
            Direct WinSpool and CUPS driver bridges for instantaneous thermal and laser printing.
          </p>
        </div>

        <div className="p-4 bg-white border border-blue-100 rounded-2xl shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-2.5">
            <Shield className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 mb-1">Role-Based Admin</h4>
          <p className="text-[11px] text-slate-500 leading-normal">
            Isolated operator, cashier, and manager credentials for secure daily counter operations.
          </p>
        </div>
      </div>

      {/* Start Button - Green */}
      <button
        id="btn-onboarding-start"
        onClick={onStart}
        className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 shadow-md shadow-emerald-700/20 transition-all duration-150 group"
      >
        <span>Begin Workstation Setup</span>
        <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
      </button>

      <div className="flex items-center gap-2 mt-4 text-xs text-slate-400 font-medium">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        <span>Estimated completion time: under 2 minutes</span>
      </div>
    </div>
  );
};
