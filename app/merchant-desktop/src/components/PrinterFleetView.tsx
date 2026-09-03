import React, { useState, useEffect } from 'react';
import {
  Printer,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  HardDrive,
  Check,
  Zap,
  Play,
  FileText,
  Scissors,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { spoolerService } from '../services/electronBridge';

export interface SystemPrinter {
  id: string;
  name: string;
  isDefault: boolean;
  isOnline: boolean;
  driverName?: string;
  portName?: string;
}

export const PrinterFleetView: React.FC = () => {
  const [printers, setPrinters] = useState<SystemPrinter[]>([]);
  const [activePrinterName, setActivePrinterName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testingPrinterId, setTestingPrinterId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch real printers from backend Win32 spooler
  const fetchPrinters = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [printerRes, profileRes] = await Promise.all([
        apiFetch('/api/printers'),
        apiFetch('/api/merchant/profile'),
      ]);

      const pData = await printerRes.json();
      const profData = await profileRes.json();

      if (pData.ok && Array.isArray(pData.data)) {
        setPrinters(pData.data);

        // Determine currently active printer
        const configuredPrinter = profData.data?.selectedPrinter;
        if (configuredPrinter) {
          setActivePrinterName(configuredPrinter);
        } else if (pData.data.length > 0) {
          const def = pData.data.find((p: any) => p.isDefault) || pData.data[0];
          setActivePrinterName(def.name);
        }
      } else {
        setPrinters([]);
      }
    } catch {
      setErrorMessage('Failed to connect to backend printer spooler.');
      setPrinters([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrinters();
  }, []);

  const handleSelectActivePrinter = async (printerName: string) => {
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await apiFetch('/api/merchant/printer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printerName }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Failed to update active printer.');
      }

      setActivePrinterName(printerName);
      setSuccessMessage(`Active printer set to: ${printerName}`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to select printer.');
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerTest = async (
    printerId: string,
    testType: 'standard_test' | 'alignment_grid' | 'density_ramp' | 'receipt_cutter'
  ) => {
    setTestingPrinterId(printerId);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await spoolerService.triggerTestPrint(printerId, testType as any);
      setSuccessMessage(`Diagnostic job [${testType}] successfully spooled to printer.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to trigger diagnostic test.');
    } finally {
      setTestingPrinterId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1e1f26] p-6 rounded-3xl border border-white/10 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">Printer Fleet & Hardware Hub</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {printers.length} Printers Found
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Local Windows OS printers detected. The active destination processes customer kiosk jobs.
            </p>
          </div>
        </div>

        <button
          onClick={fetchPrinters}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white font-bold text-xs transition-all cursor-pointer shadow-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          <span>Re-scan Spooler</span>
        </button>
      </div>

      {/* Success / Error Alerts */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2.5 shadow-sm">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* PRINTERS LIST */}
      {loading ? (
        <div className="bg-[#141419] rounded-3xl p-12 border border-white/10 text-center space-y-3 shadow-2xl">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
          <p className="text-sm font-bold text-white">Scanning local Windows printers...</p>
          <p className="text-xs text-zinc-400 font-mono">Querying Windows Print Spooler (Win32_Printer)</p>
        </div>
      ) : printers.length === 0 ? (
        <div className="bg-[#141419] rounded-3xl p-12 border border-white/10 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-white">No Printer Detected</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
              No physical or virtual printers were found in the Windows print spooler. Please ensure your printer is connected via USB/Network and configured in Windows Settings.
            </p>
          </div>
          <button
            onClick={fetchPrinters}
            className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20 inline-flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Re-scan Local Printers</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {printers.map((printer) => {
            const isActive = activePrinterName === printer.name;
            const isTesting = testingPrinterId === printer.id;

            return (
              <div
                key={printer.id}
                className={`bg-[#141419] rounded-3xl p-6 border transition-all relative flex flex-col justify-between shadow-2xl ${
                  isActive
                    ? 'border-blue-500/70 ring-2 ring-blue-500/20 shadow-blue-500/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  {/* Title & Status */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                            : 'bg-black/50 text-zinc-400 border border-white/5'
                        }`}
                      >
                        <Printer className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-white truncate" title={printer.name}>
                          {printer.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          {printer.isDefault && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-white/10">
                              OS Default
                            </span>
                          )}
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              printer.isOnline
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${printer.isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                            <span>{printer.isOnline ? 'Ready' : 'Offline / Idle'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {isActive && (
                      <span className="flex items-center gap-1 text-[10px] font-black uppercase px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                        <Check className="w-3.5 h-3.5" />
                        <span>Active Target</span>
                      </span>
                    )}
                  </div>

                  {/* Hardware Port & Driver Details */}
                  <div className="space-y-1.5 text-xs text-zinc-400 pt-3 border-t border-white/5">
                    {printer.driverName && (
                      <div className="flex justify-between">
                        <span className="text-[11px] text-zinc-500">Driver:</span>
                        <span className="font-mono text-zinc-300 truncate max-w-[200px]">
                          {printer.driverName}
                        </span>
                      </div>
                    )}
                    {printer.portName && (
                      <div className="flex justify-between">
                        <span className="text-[11px] text-zinc-500">Port / Host:</span>
                        <span className="font-mono text-zinc-300 truncate max-w-[200px]">
                          {printer.portName}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Diagnostic Test Triggers */}
                  <div className="mt-4 pt-3 border-t border-white/5">
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                      Hardware Diagnostics:
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleTriggerTest(printer.id, 'standard_test')}
                        disabled={isTesting}
                        className="py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-zinc-300 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <FileText className="w-3 h-3 text-blue-400" />
                        <span>Standard Test</span>
                      </button>

                      <button
                        onClick={() => handleTriggerTest(printer.id, 'alignment_grid')}
                        disabled={isTesting}
                        className="py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-zinc-300 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Layers className="w-3 h-3 text-purple-400" />
                        <span>Alignment Grid</span>
                      </button>

                      <button
                        onClick={() => handleTriggerTest(printer.id, 'density_ramp')}
                        disabled={isTesting}
                        className="py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-zinc-300 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-400" />
                        <span>Density Ramp</span>
                      </button>

                      <button
                        onClick={() => handleTriggerTest(printer.id, 'receipt_cutter')}
                        disabled={isTesting}
                        className="py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-zinc-300 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Scissors className="w-3 h-3 text-emerald-400" />
                        <span>Cutter Test</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Active Selector */}
                <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500">
                    {isActive ? 'Processing customer orders' : 'Available for routing'}
                  </span>

                  {!isActive && (
                    <button
                      onClick={() => handleSelectActivePrinter(printer.name)}
                      disabled={saving}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-600/20 disabled:opacity-50"
                    >
                      Set as Active Printer
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
