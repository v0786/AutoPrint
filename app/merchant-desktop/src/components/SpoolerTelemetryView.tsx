import React, { useState } from 'react';
import { SpoolerLog, SpoolerMetrics } from '../types/printer';
import {
  Terminal,
  Download,
  Trash2,
  Filter,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Clock,
  Zap,
  HardDrive,
  Cpu,
  Search,
} from 'lucide-react';

interface SpoolerTelemetryViewProps {
  logs: SpoolerLog[];
  metrics: SpoolerMetrics;
  onClearLogs: () => void;
}

export const SpoolerTelemetryView: React.FC<SpoolerTelemetryViewProps> = ({
  logs,
  metrics,
  onClearLogs,
}) => {
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredLogs = logs.filter((l) => {
    if (levelFilter !== 'all' && l.level !== levelFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        l.message.toLowerCase().includes(q) ||
        (l.printerName && l.printerName.toLowerCase().includes(q)) ||
        (l.jobNo && l.jobNo.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleExportLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `autoprint-spooler-logs-${new Date().toISOString()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'success':
        return (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            SUCCESS
          </span>
        );
      case 'error':
        return (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
            ERROR
          </span>
        );
      case 'warn':
        return (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            WARN
          </span>
        );
      default:
        return (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-300 border border-slate-600">
            INFO
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Performance Summary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Jobs Completed
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">
            {metrics.totalJobsCompleted}
          </p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            {metrics.totalJobsFailed} error retries
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Avg IPC Latency
            </span>
            <Zap className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-600 tracking-tight font-mono">
            {metrics.avgLatencyMs} ms
          </p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            Preload bridge round-trip
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Bytes Spooled
            </span>
            <HardDrive className="w-4 h-4 text-slate-700" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
            {(metrics.totalBytesPrinted / 1024).toFixed(1)} KB
          </p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            Direct buffer throughput
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Spooler Engine
            </span>
            <Cpu className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">
            Active
          </p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            WinSpool.drv / CUPS
          </p>
        </div>
      </div>

      {/* Log Controls & Terminal Header */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">
                Real-Time Spooler Handshake Stream ({logs.length} events)
              </h4>
              <p className="text-xs text-slate-500 font-medium">
                Live stream of electron IPC messages, OS buffer writes, and status updates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button
              onClick={handleExportLogs}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-200 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={onClearLogs}
              className="px-3 py-1.5 bg-white hover:bg-red-50 hover:text-red-600 text-slate-500 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-200 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Filters and search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
            {['all', 'info', 'success', 'warn', 'error'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  levelFilter === lvl
                    ? 'bg-white text-blue-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Terminal Log Output List */}
        <div className="bg-slate-900 rounded-2xl p-4 font-mono text-xs text-slate-100 max-h-96 overflow-y-auto space-y-2 border border-slate-800">
          {filteredLogs.length === 0 ? (
            <div className="text-slate-500 text-center py-8">
              No telemetry events recorded for the current filter.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 py-1 border-b border-slate-800 last:border-0 hover:bg-slate-800/50 px-2 rounded transition-colors"
              >
                <span className="text-[10px] text-slate-400 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <div className="shrink-0">{getLevelBadge(log.level)}</div>
                <div className="flex-1 min-w-0">
                  <span className="text-slate-100 break-words">{log.message}</span>
                  {log.details && (
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-sans">
                      {JSON.stringify(log.details)}
                    </span>
                  )}
                </div>
                {log.jobNo && (
                  <span className="text-[10px] text-emerald-400 font-bold shrink-0">
                    {log.jobNo}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
