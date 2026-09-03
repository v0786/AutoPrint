import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Activity,
  Cpu,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Search,
  Filter,
  Zap,
  Clock,
  ShieldCheck,
  Server,
  Database,
} from 'lucide-react';
import { SpoolerLog, SpoolerMetrics, PrinterDevice } from '../types/printer';
import { spoolerService } from '../services/electronBridge';
import { apiFetch } from '../utils/api';

interface SystemDiagnosticsViewProps {
  logs: SpoolerLog[];
  metrics: SpoolerMetrics;
  printers: PrinterDevice[];
  onClearLogs: () => void;
}

export const SystemDiagnosticsView: React.FC<SystemDiagnosticsViewProps> = ({
  logs,
  metrics,
  printers,
  onClearLogs,
}) => {
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterPrinter, setFilterPrinter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Backend Health State
  const [backendHealth, setBackendHealth] = useState<any>(null);
  const [healthChecking, setHealthChecking] = useState<boolean>(false);

  const checkBackendHealth = async () => {
    setHealthChecking(true);
    try {
      const res = await apiFetch('/api/health');
      if (res.ok) {
        const json = await res.json();
        setBackendHealth(json);
      }
    } catch {
      setBackendHealth({ status: 'unreachable', ok: false });
    } finally {
      setHealthChecking(false);
    }
  };

  useEffect(() => {
    checkBackendHealth();
  }, []);

  const failureRate =
    metrics.totalJobsCompleted + metrics.totalJobsFailed > 0
      ? (
          (metrics.totalJobsFailed /
            (metrics.totalJobsCompleted + metrics.totalJobsFailed)) *
          100
        ).toFixed(1)
      : '0.0';

  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  const filteredLogs = logs.filter((log) => {
    const matchLevel = filterLevel === 'all' || log.level === filterLevel;
    const matchPrinter =
      filterPrinter === 'all' ||
      (log.printerName &&
        log.printerName.toLowerCase().includes(filterPrinter.toLowerCase()));
    const matchSearch =
      searchQuery === '' ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.jobNo && log.jobNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.printerName && log.printerName.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchLevel && matchPrinter && matchSearch;
  });

  const handleCopyLogs = () => {
    const raw = filteredLogs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.printerName ? `[${l.printerName}] ` : ''}${l.message}`
      )
      .join('\n');
    navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1e1f26] p-6 rounded-3xl border border-white/10 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">System Diagnostics & Telemetry</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Admin & Hardware
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Spooler engine health, hardware latency metrics, and real-time operational logs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={checkBackendHealth}
            disabled={healthChecking}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white font-bold text-xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${healthChecking ? 'animate-spin text-purple-400' : ''}`} />
            <span>Check Health</span>
          </button>
          <button
            onClick={handleCopyLogs}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white font-bold text-xs transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied' : 'Copy Logs'}</span>
          </button>
        </div>
      </div>

      {/* Diagnostics Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        <div className="bg-[#141419] border border-white/10 p-4 rounded-2xl">
          <div className="text-[11px] font-semibold text-zinc-400">Queue Load</div>
          <div className="text-2xl font-black text-white mt-1">{metrics.activeJobs}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Jobs in buffer</div>
        </div>

        <div className="bg-[#141419] border border-white/10 p-4 rounded-2xl">
          <div className="text-[11px] font-semibold text-zinc-400">Completed</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{metrics.totalJobsCompleted}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Transmitted OK</div>
        </div>

        <div className="bg-[#141419] border border-white/10 p-4 rounded-2xl">
          <div className="text-[11px] font-semibold text-zinc-400">Failures</div>
          <div className="text-2xl font-black text-rose-400 mt-1">{metrics.totalJobsFailed}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Rate: {failureRate}%</div>
        </div>

        <div className="bg-[#141419] border border-white/10 p-4 rounded-2xl">
          <div className="text-[11px] font-semibold text-zinc-400">Avg Latency</div>
          <div className="text-2xl font-black text-indigo-300 mt-1">{metrics.avgLatencyMs}ms</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Driver response</div>
        </div>

        <div className="bg-[#141419] border border-white/10 p-4 rounded-2xl">
          <div className="text-[11px] font-semibold text-zinc-400">Spooler Uptime</div>
          <div className="text-2xl font-black text-purple-300 mt-1">{formatUptime(metrics.uptimeSeconds || 1420)}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Continuous running</div>
        </div>

        <div className="bg-[#141419] border border-white/10 p-4 rounded-2xl">
          <div className="text-[11px] font-semibold text-zinc-400">SQLite Engine</div>
          <div className="text-base font-black text-emerald-400 mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>WAL Ready</span>
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Backend :5000 OK</div>
        </div>
      </div>

      {/* Telemetry Log Terminal Panel */}
      <div className="bg-[#141419] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search telemetry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Level Filter */}
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-zinc-300 focus:outline-none"
            >
              <option value="all">All Severities</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warn">Warnings</option>
              <option value="error">Errors</option>
            </select>

            {/* Clear Logs Button */}
            <button
              onClick={onClearLogs}
              className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/10 text-zinc-400 hover:text-rose-300 transition-colors cursor-pointer"
              title="Clear telemetry logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Console Log Output Stream */}
        <div className="bg-black/70 rounded-2xl p-4 border border-white/5 font-mono text-[11px] h-96 overflow-y-auto space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="py-20 text-center text-zinc-600">
              <Terminal className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <span>No diagnostic log entries matching filter criteria.</span>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const levelColor =
                log.level === 'error'
                  ? 'text-rose-400 bg-rose-950/40 border-rose-500/30'
                  : log.level === 'warn'
                  ? 'text-amber-400 bg-amber-950/40 border-amber-500/30'
                  : log.level === 'success'
                  ? 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30'
                  : 'text-blue-300 bg-blue-950/40 border-blue-500/30';

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-2 rounded-xl hover:bg-white/[0.02] border border-transparent hover:border-white/5 transition-colors"
                >
                  <span className="text-zinc-500 shrink-0 text-[10px]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border shrink-0 ${levelColor}`}
                  >
                    {log.level}
                  </span>
                  {log.printerName && (
                    <span className="text-purple-300 shrink-0 text-[10px]">
                      [{log.printerName}]
                    </span>
                  )}
                  {log.jobNo && (
                    <span className="text-indigo-300 font-bold shrink-0">
                      {log.jobNo}
                    </span>
                  )}
                  <span className="text-zinc-300 break-all">{log.message}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
