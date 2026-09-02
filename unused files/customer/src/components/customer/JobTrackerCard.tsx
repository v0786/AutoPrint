'use client';
import React from 'react';
import { PrintJob } from '../../types';
import {
  CheckCircle2,
  Clock,
  Printer,
  ShieldCheck,
  QrCode,
  ArrowLeft,
  FileText,
  Sparkles,
  AlertCircle,
  Copy
} from 'lucide-react';

interface JobTrackerCardProps {
  job: PrintJob;
  onReset: () => void;
}

export const JobTrackerCard: React.FC<JobTrackerCardProps> = ({ job, onReset }) => {
  const getStatusDisplay = () => {
    switch (job.status) {
      case 'pending_payment':
        return {
          title: 'Awaiting Payment Confirmation',
          desc: 'Payment is being processed. Job will enter queue once verified.',
          badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
          icon: <Clock className="w-5 h-5 text-amber-600" />,
        };
      case 'received_local':
        return {
          title: 'Document Received on Host PC',
          desc: 'Held temporarily in RAM/Local cache. Waiting in print spool queue.',
          badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
          icon: <Clock className="w-5 h-5 text-blue-600 animate-spin" />,
        };
      case 'spooling':
        return {
          title: 'Spooling to Printer Hardware',
          desc: 'Formatting raster stream to local printer drivers.',
          badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
          icon: <Printer className="w-5 h-5 text-amber-600 animate-pulse" />,
        };
      case 'paused':
        return {
          title: 'Job Temporarily Paused',
          desc: 'Printing paused by store operator. Will resume shortly.',
          badge: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
          icon: <Clock className="w-5 h-5 text-slate-600" />,
        };
      case 'printing':
        return {
          title: `Printing in Progress (${job.pagesPrinted}/${job.totalPagesToPrint} pages)`,
          desc: `Estimated completion in ~${job.estimatedWaitMinutes || 1} min`,
          badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200',
          icon: <Printer className="w-5 h-5 text-indigo-600 animate-bounce" />,
        };
      case 'ready_for_pickup':
        return {
          title: 'Prints Ready for Collection!',
          desc: 'Please approach the front counter with your Collection PIN or QR code.',
          badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
        };
      case 'completed':
        return {
          title: 'Job Completed & Collected',
          desc: 'All prints handed over. Temporary files securely shredded from local storage.',
          badge: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
          icon: <CheckCircle2 className="w-5 h-5 text-slate-600" />,
        };
      case 'cancelled':
        return {
          title: 'Job Cancelled / Refunded',
          desc: job.merchantNotes || 'Order was cancelled by store operator.',
          badge: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
          icon: <AlertCircle className="w-5 h-5 text-red-600" />,
        };
      case 'failed':
        return {
          title: 'Print Failed',
          desc: job.merchantNotes || 'Printer error occurred. See store operator for assistance.',
          badge: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
          icon: <AlertCircle className="w-5 h-5 text-red-600" />,
        };
      default:
        return {
          title: 'Processing Order',
          desc: 'Connecting with local print daemon.',
          badge: 'bg-slate-100 text-slate-800',
          icon: <Clock className="w-5 h-5 text-slate-600" />,
        };
    }
  };

  const statusInfo = getStatusDisplay();

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-md text-center space-y-4">

        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 ring-8 ring-indigo-50/50 dark:ring-indigo-950/30">
          {statusInfo.icon}
        </div>

        <div>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusInfo.badge}`}>
            {job.status.replace(/_/g, ' ')}
          </span>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-2">
            {statusInfo.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {statusInfo.desc}
          </p>
        </div>

        {job.status === 'printing' && (
          <div className="space-y-1.5 pt-2">
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-linear-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${job.progressPercent}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>{job.pagesPrinted} of {job.totalPagesToPrint} pages</span>
              <span>{job.progressPercent}% Completed</span>
            </div>
          </div>
        )}

        <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-5 border border-slate-200 dark:border-slate-700 space-y-3">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Your Collection Pass
          </p>

          <div className="flex items-center justify-center gap-6">
            <div>
              <p className="text-[10px] text-slate-400">Order ID</p>
              <p className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200">
                {job.id}
              </p>
            </div>

            <div className="h-10 w-px bg-slate-200 dark:bg-slate-700"></div>

            <div>
              <p className="text-[10px] text-slate-400">Pickup PIN</p>
              <p className="text-2xl font-mono font-black text-indigo-600 dark:text-indigo-400 tracking-widest">
                {job.collectionPin}
              </p>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
            <span>Location:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{job.stationId}</span>
          </div>
        </div>

        <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/50 rounded-xl text-left flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 dark:text-emerald-200 space-y-0.5">
            <p className="font-bold">Zero Cloud Storage & Shredding Policy</p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
              {job.shredStatus.isShredded
                ? `Files securely destroyed with ${job.shredStatus.passes}-pass DoD overwrite algorithm.`
                : `Temporary files on host PC will be automatically shredded immediately once printed.`}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Job Specifications
        </h3>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40">
            <span className="text-slate-400 block text-[10px]">Color Mode</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
              {job.preferences.colorMode === 'bw' ? 'Black & White' : 'Full Color'}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40">
            <span className="text-slate-400 block text-[10px]">Paper & Layout</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {job.preferences.paperSize} • {job.preferences.sidedness.startsWith('double') ? 'Duplex' : 'Single'}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40">
            <span className="text-slate-400 block text-[10px]">Copies & Pages</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {job.preferences.copies} {job.preferences.copies > 1 ? 'copies' : 'copy'} ({job.totalPagesToPrint} pages)
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40">
            <span className="text-slate-400 block text-[10px]">Finishing</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
              {job.preferences.binding.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        <div className="pt-2">
          <span className="text-[11px] font-medium text-slate-500 block mb-1">Attached Files:</span>
          {job.files.map(f => (
            <div key={f.id} className="flex items-center justify-between text-xs py-1 text-slate-700 dark:text-slate-300">
              <span className="truncate max-w-[240px] font-mono">{f.name}</span>
              <span className="text-slate-400">{f.pageCount} pgs</span>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        id="start-another-job-btn"
        onClick={onReset}
        className="w-full py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors flex items-center justify-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Submit Another Print Document</span>
      </button>
    </div>
  );
};
