import React, { useState } from 'react';
import {
  Cpu,
  Layers,
  ShieldCheck,
  Zap,
  ArrowRight,
  Monitor,
  HardDrive,
  CheckCircle2,
  RefreshCw,
  Terminal,
  FileCode,
  Radio,
} from 'lucide-react';
import { SpoolerMetrics } from '../types/printer';

interface ArchitectureInspectorViewProps {
  metrics: SpoolerMetrics;
  onBenchmarkIpc: () => Promise<number>;
}

export const ArchitectureInspectorView: React.FC<ArchitectureInspectorViewProps> = ({
  metrics,
  onBenchmarkIpc,
}) => {
  const [isBenchmarking, setIsBenchmarking] = useState<boolean>(false);
  const [benchmarkResults, setBenchmarkResults] = useState<{
    samples: number[];
    avg: number;
    min: number;
    max: number;
  } | null>(null);

  const handleRunBenchmark = async () => {
    setIsBenchmarking(true);
    const samples: number[] = [];
    for (let i = 0; i < 5; i++) {
      const lat = await onBenchmarkIpc();
      samples.push(lat);
      await new Promise((r) => setTimeout(r, 60));
    }
    const avg = +(samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(2);
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    setBenchmarkResults({ samples, avg, min, max });
    setIsBenchmarking(false);
  };

  return (
    <div className="space-y-6">
      {/* Architecture Overview Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Electron Multi-Process Architecture & IPC Isolation
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Context-Isolated Preload Bridge • Main Process OS Spooler (WinSpool / CUPS) • Single-PC Merchant Reliability
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4" />
            Context Isolation: ENABLED
          </span>
        </div>

        {/* Process Flow Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3">
          {/* Renderer Process */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                Layer 1: Frontend
              </span>
              <Monitor className="w-4 h-4 text-blue-600" />
            </div>
            <h4 className="font-bold text-sm text-slate-900">React 18 Renderer Process</h4>
            <p className="text-xs text-slate-500">
              Handles UI interaction, queue state visualization, job creation forms, and live status displays. Sandboxed from direct Node.js OS primitives.
            </p>
            <div className="text-[10px] font-mono bg-white p-2 rounded-lg border border-slate-200 text-blue-700">
              window.electronAPI.submitPrintJob()
            </div>
          </div>

          {/* Secure IPC Bridge */}
          <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3 relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-blue-600 tracking-wider">
                Layer 2: IPC Bridge
              </span>
              <ShieldCheck className="w-4 h-4 text-blue-600" />
            </div>
            <h4 className="font-bold text-sm text-slate-900">Preload ContextBridge</h4>
            <p className="text-xs text-slate-600">
              Provides strictly typed, sanitized IPC invocations. Prevents XSS script execution from accessing arbitrary system binaries.
            </p>
            <div className="text-[10px] font-mono bg-white p-2 rounded-lg border border-blue-200 text-blue-800">
              ipcRenderer.invoke('printer:submit-job')
            </div>
          </div>

          {/* Electron Main Process */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                Layer 3: OS Spooler
              </span>
              <HardDrive className="w-4 h-4 text-slate-700" />
            </div>
            <h4 className="font-bold text-sm text-slate-900">Electron Main & Native Spooler</h4>
            <p className="text-xs text-slate-500">
              Executes silent printing via hidden print workers, manages hardware handshakes, detects paper jams, and interfaces with WinSpool / CUPS.
            </p>
            <div className="text-[10px] font-mono bg-white p-2 rounded-lg border border-slate-200 text-slate-800">
              webContents.print({'{'} silent: true {'}'})
            </div>
          </div>
        </div>
      </div>

      {/* IPC Benchmark & Channel Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Benchmark Tool (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600" />
              <h4 className="font-bold text-sm text-slate-900">IPC Latency Benchmark</h4>
            </div>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
              Live Probe
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Measures the round-trip latency of synchronous IPC messages dispatched from the React renderer to the native OS spooler engine.
          </p>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Spooler Bridge Status:</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <Radio className="w-3 h-3 text-emerald-600" />
                Direct Link
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Average Round-Trip:</span>
              <span className="font-bold text-sm font-mono text-slate-900">
                {benchmarkResults ? `${benchmarkResults.avg} ms` : `${metrics.avgLatencyMs} ms`}
              </span>
            </div>
            {benchmarkResults && (
              <div className="pt-2 border-t border-slate-200 text-[10px] font-mono text-slate-500 space-y-1">
                <p>Min latency: {benchmarkResults.min}ms</p>
                <p>Max latency: {benchmarkResults.max}ms</p>
                <p>Samples: [{benchmarkResults.samples.join(', ')}] ms</p>
              </div>
            )}
          </div>

          <button
            id="btn-run-benchmark"
            disabled={isBenchmarking}
            onClick={handleRunBenchmark}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs shadow-emerald-700/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isBenchmarking ? 'animate-spin' : ''}`} />
            <span>{isBenchmarking ? 'Pinging IPC Channels...' : 'Execute 5-Sample IPC Benchmark'}</span>
          </button>
        </div>

        {/* Registered Secure IPC Channels (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-blue-600" />
              <h4 className="font-bold text-sm text-slate-900">
                Declared IPC Channel Specifications
              </h4>
            </div>
            <span className="text-[10px] font-mono text-slate-400">8 Channels Active</span>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {[
              {
                ch: 'printer:get-printers',
                type: 'invoke -> handle',
                desc: 'Queries OS spooler for connected printers, paper levels, and capabilities.',
              },
              {
                ch: 'printer:submit-job',
                type: 'invoke -> handle',
                desc: 'Submits new print job into the main process buffer and triggers silent worker window.',
              },
              {
                ch: 'printer:cancel-job',
                type: 'invoke -> handle',
                desc: 'Cancels a pending or active job from the native OS print queue.',
              },
              {
                ch: 'printer:pause-queue',
                type: 'invoke -> handle',
                desc: 'Pauses queue processing to prevent paper jams or allow merchant maintenance.',
              },
              {
                ch: 'printer:retry-job',
                type: 'invoke -> handle',
                desc: 'Re-submits a failed print job to the spooler with incremented retry counter.',
              },
              {
                ch: 'printer:test-print',
                type: 'invoke -> handle',
                desc: 'Generates an instant AutoPrint hardware alignment and head diagnostic test ticket.',
              },
              {
                ch: 'printer:job-update',
                type: 'send -> on (Event Stream)',
                desc: 'Broadcasts real-time job progress (pages, bytes, status) to the React renderer.',
              },
              {
                ch: 'printer:log-event',
                type: 'send -> on (Telemetry)',
                desc: 'Streams OS spooler low-level diagnostic logs and error traces.',
              },
            ].map((item) => (
              <div
                key={item.ch}
                className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 hover:border-blue-200 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900">{item.ch}</span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                    {item.type}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
