import React, { useState } from 'react';
import { CustomerAccessBanner } from './CustomerAccessBanner';
import {
  PrintJob,
  JobStatus,
  JobPriority,
  PrinterDevice,
} from '../types/printer';
import {
  Printer,
  FileText,
  Tag,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Trash2,
  Eye,
  ArrowUp,
  ArrowDown,
  Zap,
  HardDrive,
  FileCode,
  Sparkles,
  Search,
  Filter,
  PlusCircle,
} from 'lucide-react';

interface ActiveQueueViewProps {
  jobs: PrintJob[];
  printers: PrinterDevice[];
  onCancelJob: (jobId: string) => void;
  onRetryJob: (jobId: string) => void;
  onReorderJobs: (jobIds: string[]) => void;
  onPreviewDocument: (job: PrintJob) => void;
  onExecutePhysicalPrint: (job: PrintJob) => void;
  onOpenNewJobModal: () => void;
}

export const ActiveQueueView: React.FC<ActiveQueueViewProps> = ({
  jobs,
  printers,
  onCancelJob,
  onRetryJob,
  onReorderJobs,
  onPreviewDocument,
  onExecutePhysicalPrint,
  onOpenNewJobModal,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active or Currently printing job
  const currentActiveJob = jobs.find((j) => ['printing', 'spooling'].includes(j.status));

  // Filtered jobs
  const filteredJobs = jobs.filter((job) => {
    if (filterStatus === 'active') {
      if (!['queued', 'spooling', 'printing', 'paused'].includes(job.status)) return false;
    } else if (filterStatus === 'completed') {
      if (job.status !== 'completed') return false;
    } else if (filterStatus === 'failed') {
      if (job.status !== 'failed') return false;
    } else if (filterStatus === 'rush') {
      if (job.priority !== 'rush') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        job.title.toLowerCase().includes(q) ||
        job.jobNo.toLowerCase().includes(q) ||
        job.printerName.toLowerCase().includes(q) ||
        job.documentType.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getDocIcon = (type: string) => {
    switch (type) {
      case 'receipt':
        return <Receipt className="w-4 h-4 text-blue-600" />;
      case 'label':
        return <Tag className="w-4 h-4 text-emerald-600" />;
      case 'invoice':
        return <FileSpreadsheet className="w-4 h-4 text-blue-700" />;
      case 'report':
        return <FileText className="w-4 h-4 text-slate-700" />;
      default:
        return <FileCode className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusBadge = (status: JobStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            COMPLETED
          </span>
        );
      case 'printing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500 text-white animate-pulse shadow-xs">
            <Printer className="w-3 h-3" />
            PRINTING
          </span>
        );
      case 'spooling':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <RefreshCw className="w-3 h-3 animate-spin" />
            SPOOLING
          </span>
        );
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3 h-3" />
            QUEUED
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
            <AlertCircle className="w-3 h-3" />
            FAILED
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <PauseCircle className="w-3 h-3" />
            PAUSED
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
            CANCELLED
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: JobPriority) => {
    switch (priority) {
      case 'rush':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-600 text-white tracking-wide shadow-2xs">
            RUSH
          </span>
        );
      case 'high':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
            HIGH
          </span>
        );
      case 'normal':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
            NORMAL
          </span>
        );
      case 'low':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-slate-500 border border-slate-200">
            LOW
          </span>
        );
    }
  };

  // Reordering helpers
  const handleMoveJob = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= jobs.length) return;

    const newJobs = [...jobs];
    const temp = newJobs[index];
    newJobs[index] = newJobs[targetIdx];
    newJobs[targetIdx] = temp;
    onReorderJobs(newJobs.map((j) => j.id));
  };

  return (
    <div className="space-y-6">
      {/* Live Customer Portal & Dynamic QR Standee Banner */}
      <CustomerAccessBanner />

      {/* Spotlight Card: Live Spooling / Active Job */}
      {currentActiveJob ? (
        <section className="bg-white rounded-3xl shadow-sm border border-blue-100 p-6 sm:p-7 relative overflow-hidden transition-all duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 shrink-0 mt-0.5">
                {getDocIcon(currentActiveJob.documentType)}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    {currentActiveJob.status === 'printing' ? 'Active Print Spool' : 'Rasterizing Buffer'}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    {currentActiveJob.jobNo}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  {currentActiveJob.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                  <span>Target: <strong className="text-slate-800">{currentActiveJob.printerName}</strong></span>
                  <span>•</span>
                  <span>{currentActiveJob.copies} Copy</span>
                  <span>•</span>
                  <span>{currentActiveJob.bytesTotal} Bytes</span>
                </p>
              </div>
            </div>

            {/* Progress Percentage & Stats */}
            <div className="text-left sm:text-right flex sm:flex-col items-baseline sm:items-end justify-between w-full sm:w-auto gap-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-red-600 tracking-tight">
                  {Math.round((currentActiveJob.pagesPrinted / currentActiveJob.totalPages) * 100) ||
                    (currentActiveJob.status === 'printing' ? 85 : 45)}
                  %
                </span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Page {currentActiveJob.pagesPrinted} of {currentActiveJob.totalPages} Printed
              </p>
            </div>
          </div>

          {/* Animated RED Progress Bar */}
          <div className="w-full h-3 bg-red-100 rounded-full overflow-hidden mb-5 border border-red-200">
            <div
              className="h-full bg-red-600 rounded-full transition-all duration-300 relative overflow-hidden"
              style={{
                width: `${
                  Math.round((currentActiveJob.pagesPrinted / currentActiveJob.totalPages) * 100) ||
                  (currentActiveJob.status === 'printing' ? 85 : 45)
                }%`,
              }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>

          {/* Bottom Metas & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center font-bold text-[10px] text-blue-700">
                  OS
                </span>
                <span className="font-semibold text-xs text-slate-800">Native Spooler Direct</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-md bg-emerald-50 flex items-center justify-center font-bold text-[10px] text-emerald-700">
                  ⚡
                </span>
                <span className="font-semibold text-xs text-slate-800">
                  {currentActiveJob.latencyMs}ms Latency
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center font-bold text-[10px] text-blue-700">
                  KB
                </span>
                <span className="font-semibold text-xs text-slate-800">
                  {currentActiveJob.spoolSpeedKbps} KB/s Stream
                </span>
              </div>
            </div>

            {/* Actions with Green buttons */}
            <div className="flex items-center gap-2">
              <button
                id="btn-active-job-preview"
                onClick={() => onPreviewDocument(currentActiveJob)}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                <span>View Preview</span>
              </button>
              <button
                id="btn-active-job-cancel"
                onClick={() => onCancelJob(currentActiveJob.id)}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Cancel Print</span>
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-white border border-blue-100 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">Spooler Queue Idle & Ready</h4>
              <p className="text-xs text-slate-500 font-medium">
                No active print buffer stream pending. All merchant ports ready for sub-millisecond dispatch.
              </p>
            </div>
          </div>
          <button
            id="btn-empty-new-job"
            onClick={onOpenNewJobModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-700/20 transition-all shrink-0 active:scale-[0.98]"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Print Job</span>
          </button>
        </section>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-blue-100 shadow-xs">
        {/* Status Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Jobs', count: jobs.length },
            {
              id: 'active',
              label: 'Active / Queued',
              count: jobs.filter((j) => ['queued', 'spooling', 'printing', 'paused'].includes(j.status)).length,
            },
            {
              id: 'completed',
              label: 'Completed',
              count: jobs.filter((j) => j.status === 'completed').length,
            },
            {
              id: 'failed',
              label: 'Errors',
              count: jobs.filter((j) => j.status === 'failed').length,
            },
            {
              id: 'rush',
              label: 'Rush Priority',
              count: jobs.filter((j) => j.priority === 'rush').length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              id={`filter-tab-${tab.id}`}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                filterStatus === tab.id
                  ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  filterStatus === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px] sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search jobs, #no, printer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white shadow-2xs font-medium"
          />
        </div>
      </div>

      {/* Main Queue List */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-2">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Spooler Job Register ({filteredJobs.length})
          </h4>
          <span className="text-xs text-slate-400 italic">
            Single-PC Merchant Queue Engine
          </span>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center text-slate-400">
            <Printer className="w-8 h-8 mx-auto mb-2 opacity-40 text-blue-600" />
            <p className="font-bold text-sm text-slate-700">No Print Jobs Found</p>
            <p className="text-xs mt-1">No jobs match your filter criteria or search query.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredJobs.map((job, index) => {
              const isQueued = ['queued', 'paused'].includes(job.status);
              const isFailed = job.status === 'failed';

              return (
                <div
                  key={job.id}
                  id={`job-card-${job.id}`}
                  className={`border rounded-2xl p-4 transition-all duration-150 ${
                    job.status === 'printing'
                      ? 'bg-white border-blue-500 shadow-sm ring-1 ring-blue-500/20'
                      : isFailed
                      ? 'bg-red-50/50 border-red-200'
                      : 'bg-white hover:border-blue-200 border-slate-200 shadow-2xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    {/* Left: Doc type icon + Title + Meta */}
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 shrink-0 mt-0.5">
                        {getDocIcon(job.documentType)}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-mono text-[11px] font-bold text-slate-400">
                            {job.jobNo}
                          </span>
                          {getStatusBadge(job.status)}
                          {getPriorityBadge(job.priority)}
                          <span className="text-[10px] font-semibold text-slate-400 uppercase">
                            {job.documentType}
                          </span>
                        </div>
                        <h5 className="font-bold text-sm text-slate-900 leading-snug">
                          {job.title}
                        </h5>
                        <p className="text-xs text-slate-500 font-medium flex flex-wrap items-center gap-2 mt-0.5">
                          <span>Target: <strong className="text-slate-800">{job.printerName}</strong></span>
                          <span>•</span>
                          <span>{job.totalPages} Page{job.totalPages > 1 ? 's' : ''}</span>
                          <span>•</span>
                          <span>{(job.bytesTotal / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span>Submitted {new Date(job.submittedAt).toLocaleTimeString()}</span>
                        </p>

                        {/* Error Reason Display if failed */}
                        {isFailed && job.errorReason && (
                          <div className="mt-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{job.errorReason}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions with Green buttons */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      {/* Priority Up/Down Reorder for Queued jobs */}
                      {isQueued && (
                        <div className="flex items-center mr-1 bg-slate-100 rounded-lg p-0.5">
                          <button
                            id={`btn-job-up-${job.id}`}
                            onClick={() => handleMoveJob(index, 'up')}
                            disabled={index === 0}
                            className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 rounded hover:bg-slate-200"
                            title="Move Up in Spool Queue"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`btn-job-down-${job.id}`}
                            onClick={() => handleMoveJob(index, 'down')}
                            disabled={index === jobs.length - 1}
                            className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 rounded hover:bg-slate-200"
                            title="Move Down in Spool Queue"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Preview Button - Green outline */}
                      <button
                        id={`btn-preview-${job.id}`}
                        onClick={() => onPreviewDocument(job)}
                        className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                        title="View Document Layout"
                      >
                        <Eye className="w-4 h-4 text-emerald-600" />
                        <span className="hidden md:inline">Preview</span>
                      </button>

                      {/* Print to Physical Printer (Native OS Dialog) - Green Primary */}
                      <button
                        id={`btn-physical-print-${job.id}`}
                        onClick={() => onExecutePhysicalPrint(job)}
                        className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs shadow-emerald-700/20"
                        title="Send directly to OS Print Dialog"
                      >
                        <Printer className="w-4 h-4 text-white" />
                        <span className="hidden md:inline">Print OS</span>
                      </button>

                      {/* Retry Button if Failed - Green */}
                      {isFailed && (
                        <button
                          id={`btn-retry-${job.id}`}
                          onClick={() => onRetryJob(job.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-all"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Retry</span>
                        </button>
                      )}

                      {/* Cancel / Delete Button */}
                      <button
                        id={`btn-cancel-${job.id}`}
                        onClick={() => onCancelJob(job.id)}
                        className="p-2 hover:bg-red-50 hover:text-red-600 text-slate-400 rounded-xl transition-colors"
                        title="Cancel or Remove Job"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
