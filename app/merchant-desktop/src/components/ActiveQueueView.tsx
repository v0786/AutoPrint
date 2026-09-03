import React, { useState } from 'react';
import {
  PrintJob,
  JobStatus,
  JobPriority,
  PrinterDevice,
  SpoolerMetrics,
} from '../types/printer';
import {
  Printer,
  ListOrdered,
  CheckCircle2,
  Clock,
  AlertCircle,
  Pause,
  Play,
  RefreshCw,
  Trash2,
  Eye,
  ArrowUp,
  ArrowDown,
  Search,
  Zap,
  HardDrive,
  X,
} from 'lucide-react';

interface ActiveQueueViewProps {
  jobs: PrintJob[];
  printers: PrinterDevice[];
  metrics: SpoolerMetrics;
  onCancelJob: (jobId: string) => void;
  onRetryJob: (jobId: string) => void;
  onReorderJobs: (jobIds: string[]) => void;
  onPauseResumeQueue: () => void;
  onPurgeCompleted: () => void;
  onPreviewJobDoc: (job: PrintJob) => void;
  onOpenNewJobModal: () => void;
}

export const ActiveQueueView: React.FC<ActiveQueueViewProps> = ({
  jobs,
  printers,
  metrics,
  onCancelJob,
  onRetryJob,
  onReorderJobs,
  onPauseResumeQueue,
  onPurgeCompleted,
  onPreviewJobDoc,
  onOpenNewJobModal,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredJobs = jobs.filter((job) => {
    if (filterStatus === 'active') {
      if (!['queued', 'spooling', 'printing', 'paused'].includes(job.status)) return false;
    } else if (filterStatus === 'completed') {
      if (job.status !== 'completed') return false;
    } else if (filterStatus === 'failed') {
      if (job.status !== 'failed') return false;
    } else if (filterStatus === 'paused') {
      if (job.status !== 'paused') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        job.title.toLowerCase().includes(q) ||
        job.jobNo.toLowerCase().includes(q) ||
        (job.customerName && job.customerName.toLowerCase().includes(q)) ||
        job.printerName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= jobs.length) return;

    const newJobs = [...jobs];
    const temp = newJobs[index];
    newJobs[index] = newJobs[targetIdx];
    newJobs[targetIdx] = temp;
    onReorderJobs(newJobs.map((j) => j.id));
  };

  const getStatusBadge = (status: JobStatus) => {
    switch (status) {
      case 'printing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-pulse">
            <Printer className="w-3 h-3" />
            Printing
          </span>
        );
      case 'spooling':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Spooling
          </span>
        );
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-zinc-800 text-zinc-300 border border-white/5">
            <Clock className="w-3 h-3" />
            Queued
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Pause className="w-3 h-3" />
            Paused
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <AlertCircle className="w-3 h-3" />
            Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-zinc-800 text-zinc-500">
            Cancelled
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: JobPriority) => {
    switch (priority) {
      case 'rush':
        return (
          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-rose-600 text-white tracking-wider">
            RUSH
          </span>
        );
      case 'high':
        return (
          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
            HIGH
          </span>
        );
      case 'normal':
        return (
          <span className="text-[9px] font-medium uppercase px-2 py-0.5 rounded bg-white/5 text-zinc-400">
            NORMAL
          </span>
        );
      case 'low':
        return (
          <span className="text-[9px] font-medium uppercase px-2 py-0.5 rounded bg-black/40 text-zinc-500">
            LOW
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Header & Global Queue Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1e1f26] p-6 rounded-3xl border border-white/10 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
            <ListOrdered className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">Active Print Queue</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {jobs.length} Total Jobs
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Monitor transmission buffer, prioritize urgent requests, and handle driver exceptions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onPauseResumeQueue}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all cursor-pointer ${
              metrics.isQueuePaused
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20'
                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white'
            }`}
          >
            {metrics.isQueuePaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            <span>{metrics.isQueuePaused ? 'Resume Spooler' : 'Pause Spooler'}</span>
          </button>

          <button
            onClick={onPurgeCompleted}
            className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            title="Purge completed/cancelled jobs from buffer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#141419] p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search queue by title, Job #, customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'all', label: 'All Jobs' },
            { id: 'active', label: 'Active & Queued' },
            { id: 'completed', label: 'Completed' },
            { id: 'failed', label: 'Failed' },
            { id: 'paused', label: 'Paused' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterStatus === f.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* High-Density Table View */}
      <div className="bg-[#141419] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-[#1e1f26]/80 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">Order</th>
                <th className="py-3.5 px-4">Job #</th>
                <th className="py-3.5 px-5">Document Title & Customer</th>
                <th className="py-3.5 px-4">Target Printer</th>
                <th className="py-3.5 px-4">Pages / Type</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    <ListOrdered className="w-8 h-8 mx-auto mb-2 opacity-30 text-zinc-400" />
                    <p className="font-semibold text-zinc-400">No print jobs in current queue filter</p>
                    <p className="text-[11px] text-zinc-600 mt-0.5">New print orders submitted from kiosk will appear here automatically.</p>
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job, idx) => (
                  <tr key={job.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Priority Move buttons */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <button
                          onClick={() => handleMove(idx, 'up')}
                          disabled={idx === 0 || job.status === 'completed'}
                          className="text-zinc-500 hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                          title="Fast-track upward"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMove(idx, 'down')}
                          disabled={idx === jobs.length - 1 || job.status === 'completed'}
                          className="text-zinc-500 hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                          title="Move downward"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Job # */}
                    <td className="py-3 px-4 font-mono font-bold text-purple-300">
                      {job.jobNo}
                    </td>

                    {/* Title & Customer */}
                    <td className="py-3 px-5">
                      <div className="font-bold text-white truncate max-w-[200px]">{job.title}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        {job.customerName || 'Walk-In'} • Code: {job.formattedVerificationCode || '—'}
                      </div>
                    </td>

                    {/* Printer */}
                    <td className="py-3 px-4 text-zinc-300 font-medium truncate max-w-[140px]">
                      {job.printerName}
                    </td>

                    {/* Pages & Specs */}
                    <td className="py-3 px-4 text-zinc-300">
                      <div>{job.totalPages} page(s) × {job.copies || 1}</div>
                      <div className="text-[10px] text-zinc-500 uppercase">{job.documentType}</div>
                    </td>

                    {/* Priority */}
                    <td className="py-3 px-4">
                      {getPriorityBadge(job.priority)}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {getStatusBadge(job.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onPreviewJobDoc(job)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                          title="Preview document"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {job.status === 'failed' && (
                          <button
                            onClick={() => onRetryJob(job.id)}
                            className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors cursor-pointer"
                            title="Retry print job"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {job.status !== 'completed' && job.status !== 'cancelled' && (
                          <button
                            onClick={() => onCancelJob(job.id)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 transition-colors cursor-pointer"
                            title="Cancel job"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
