import React from 'react';
import {
  Printer,
  ListOrdered,
  ShieldCheck,
  DollarSign,
  AlertTriangle,
  Play,
  Pause,
  ArrowRight,
  Clock,
  CheckCircle2,
  HardDrive,
  Users,
  Settings,
  Activity,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { PrintJob, PrinterDevice, SpoolerMetrics } from '../types/printer';
import { CollectionVerificationRecord } from '../types/verification';

interface DashboardViewProps {
  metrics: SpoolerMetrics;
  jobs: PrintJob[];
  printers: PrinterDevice[];
  verificationRecords: CollectionVerificationRecord[];
  isOnline: boolean;
  onSelectView: (view: string) => void;
  onToggleOnline: () => void;
  onPauseResumeQueue: () => void;
  onVerifyCode?: (code: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  jobs,
  printers,
  verificationRecords,
  isOnline,
  onSelectView,
  onToggleOnline,
  onPauseResumeQueue,
  onVerifyCode,
}) => {
  // Operational Metrics Computations
  const activeJobs = jobs.filter((j) => ['spooling', 'printing'].includes(j.status));
  const queuedJobs = jobs.filter((j) => j.status === 'queued' || j.status === 'paused');
  const failedJobs = jobs.filter((j) => j.status === 'failed');

  const pendingPickups = verificationRecords.filter(
    (r) =>
      r.handoverStatus !== 'HANDED_OVER' &&
      r.handoverStatus !== 'COLLECTED' &&
      r.handoverStatus !== 'CANCELLED'
  );

  const pendingCashOrders = verificationRecords.filter(
    (r) =>
      r.handoverStatus !== 'HANDED_OVER' &&
      r.handoverStatus !== 'COLLECTED' &&
      r.handoverStatus !== 'CANCELLED' &&
      (r.paymentStatus === 'CASH_REQUIRED' || r.paymentStatus === 'CASH_LOCKED')
  );

  const errorPrinters = printers.filter((p) => p.status === 'error' || p.status === 'offline');
  const defaultPrinter = printers.find((p) => p.isDefault) || printers[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-10">
      {/* 1. Urgent Operational Warning Banners */}
      {errorPrinters.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-200 flex items-center justify-between shadow-lg shadow-rose-950/30">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-white">
                Hardware Alert: {errorPrinters.length} Printer{errorPrinters.length > 1 ? 's' : ''} Offline or in Error
              </div>
              <div className="text-[11px] text-rose-300">
                {errorPrinters.map((p) => p.displayName || p.name).join(', ')}
              </div>
            </div>
          </div>
          <button
            onClick={() => onSelectView('fleet')}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Manage Printers
          </button>
        </div>
      )}

      {metrics.isQueuePaused && (
        <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-500/50 text-amber-200 flex items-center justify-between shadow-lg shadow-amber-950/30">
          <div className="flex items-center gap-3">
            <Pause className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-white">Print Spooler Queue is Currently Paused</div>
              <div className="text-[11px] text-amber-300">New customer jobs are holding in queue and not transmitting to printers.</div>
            </div>
          </div>
          <button
            onClick={onPauseResumeQueue}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Resume Queue
          </button>
        </div>
      )}

      {failedJobs.length > 0 && (
        <div className="p-4 rounded-2xl bg-purple-950/60 border border-purple-500/50 text-purple-200 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-white">{failedJobs.length} Failed Print Job(s) Need Attention</div>
              <div className="text-[11px] text-purple-300">Jobs encountered hardware timeouts or printer transmission errors.</div>
            </div>
          </div>
          <button
            onClick={() => onSelectView('queue')}
            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Review Queue
          </button>
        </div>
      )}

      {/* 2. Top Operational Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Shop Status */}
        <div className="bg-[#141419] border border-white/10 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-400">Shop Status</span>
            <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
          </div>
          <div className="my-2">
            <div className="text-base font-black text-white">{isOnline ? 'ONLINE' : 'OFFLINE'}</div>
            <div className="text-[10px] text-zinc-400 truncate">
              {isOnline ? 'Accepting Orders' : 'Kiosk Orders Paused'}
            </div>
          </div>
          <button
            onClick={onToggleOnline}
            className={`w-full py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
              isOnline
                ? 'bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isOnline ? 'Pause Orders' : 'Go Online'}
          </button>
        </div>

        {/* Card 2: Active Spooling */}
        <div
          onClick={() => onSelectView('queue')}
          className="bg-[#141419] border border-white/10 hover:border-blue-500/40 p-4 rounded-2xl flex flex-col justify-between cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-400">Active Spooling</span>
            <Printer className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-white">{activeJobs.length}</div>
            <div className="text-[10px] text-zinc-400">Transmitting to hardware</div>
          </div>
          <div className="text-[10px] font-bold text-blue-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>View Queue</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Card 3: Queue Waiting */}
        <div
          onClick={() => onSelectView('queue')}
          className="bg-[#141419] border border-white/10 hover:border-indigo-500/40 p-4 rounded-2xl flex flex-col justify-between cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-400">Queue Waiting</span>
            <ListOrdered className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-white">{queuedJobs.length}</div>
            <div className="text-[10px] text-zinc-400">In spooler buffer</div>
          </div>
          <div className="text-[10px] font-bold text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Manage Buffer</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Card 4: Pending Pickups */}
        <div
          onClick={() => onSelectView('verification')}
          className="bg-[#141419] border border-white/10 hover:border-purple-500/40 p-4 rounded-2xl flex flex-col justify-between cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-400">Pending Pickups</span>
            <ShieldCheck className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-white">{pendingPickups.length}</div>
            <div className="text-[10px] text-zinc-400">Waiting in tray</div>
          </div>
          <div className="text-[10px] font-bold text-purple-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Verify Code</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Card 5: Pending Cash */}
        <div
          onClick={() => onSelectView('verification')}
          className="bg-[#141419] border border-white/10 hover:border-amber-500/40 p-4 rounded-2xl flex flex-col justify-between cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-400">Cash Collection</span>
            <DollarSign className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-amber-300">{pendingCashOrders.length}</div>
            <div className="text-[10px] text-zinc-400">Uncollected orders</div>
          </div>
          <div className="text-[10px] font-bold text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Collect Cash</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Card 6: Default Printer */}
        <div
          onClick={() => onSelectView('fleet')}
          className="bg-[#141419] border border-white/10 hover:border-emerald-500/40 p-4 rounded-2xl flex flex-col justify-between cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-400">Active Printer</span>
            <HardDrive className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="my-2">
            <div className="text-xs font-black text-white truncate">
              {defaultPrinter?.displayName || defaultPrinter?.name || 'Virtual Spooler'}
            </div>
            <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Ready</span>
            </div>
          </div>
          <div className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Fleet Hub</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* 3. Operational Quick Action Bar */}
      <div className="bg-[#141419] p-4 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider text-[11px]">
            Quick Actions:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onSelectView('verification')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all cursor-pointer active:scale-95"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verify Customer Pickup</span>
          </button>

          <button
            onClick={() => onSelectView('queue')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white font-bold text-xs transition-all cursor-pointer"
          >
            <ListOrdered className="w-4 h-4" />
            <span>Open Print Queue ({jobs.length})</span>
          </button>

          <button
            onClick={onPauseResumeQueue}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              metrics.isQueuePaused
                ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300 hover:text-white'
            }`}
          >
            {metrics.isQueuePaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            <span>{metrics.isQueuePaused ? 'Resume Spooler' : 'Pause Spooler'}</span>
          </button>

          <button
            onClick={() => onSelectView('fleet')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white font-bold text-xs transition-all cursor-pointer"
          >
            <HardDrive className="w-4 h-4" />
            <span>Printer Diagnostics</span>
          </button>
        </div>
      </div>

      {/* 4. High-Density Dual Operations Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel: Active & Pending Spooling Jobs */}
        <div className="bg-[#141419] border border-white/10 rounded-3xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <ListOrdered className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Live Print Buffer</h3>
                <p className="text-[10px] text-zinc-400">Jobs currently transmitting or queued</p>
              </div>
            </div>
            <button
              onClick={() => onSelectView('queue')}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Full Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-72">
            {jobs.length === 0 ? (
              <div className="py-10 text-center text-zinc-500 text-xs">
                <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-zinc-600" />
                <span>No active print jobs in buffer</span>
              </div>
            ) : (
              jobs.slice(0, 5).map((job) => (
                <div
                  key={job.id}
                  className="p-3 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-purple-300">{job.jobNo}</span>
                      <span className="font-semibold text-white truncate max-w-[160px]">{job.title}</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      {job.customerName || 'Walk-In'} • {job.totalPages} pg(s) • {job.printerName}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        job.status === 'printing'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-pulse'
                          : job.status === 'queued'
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          : job.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel: Pending Counter Pickups */}
        <div className="bg-[#141419] border border-white/10 rounded-3xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center border border-purple-500/30">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Pending Counter Handovers</h3>
                <p className="text-[10px] text-zinc-400">Documents ready for pickup verification</p>
              </div>
            </div>
            <button
              onClick={() => onSelectView('verification')}
              className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Verification Desk</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-72">
            {pendingPickups.length === 0 ? (
              <div className="py-10 text-center text-zinc-500 text-xs">
                <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-zinc-600" />
                <span>All printed orders handed over to customers</span>
              </div>
            ) : (
              pendingPickups.slice(0, 5).map((record) => (
                <div
                  key={record.verificationCode}
                  onClick={() => onSelectView('verification')}
                  className="p-3 rounded-2xl bg-black/40 border border-white/5 hover:border-purple-500/30 flex items-center justify-between gap-3 text-xs cursor-pointer transition-all"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-purple-300 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-500/30">
                        {record.formattedCode}
                      </span>
                      <span className="font-semibold text-white truncate max-w-[140px]">
                        {record.customerName}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-1">
                      ₹{(record.amountTotal || 0).toFixed(2)} • {record.jobTitle || 'Print Job'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {record.paymentStatus === 'UPI_SUCCESS' || record.paymentStatus === 'CASH_COLLECTED' ? (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Paid
                      </span>
                    ) : (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Cash Pending
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
