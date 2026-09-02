import React, { useState, useEffect } from 'react';
import {
  Printer,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Star,
  Zap,
  Info,
  Sliders,
  Check,
} from 'lucide-react';

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch real printers from backend Win32 spooler
  const fetchPrinters = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [printerRes, profileRes] = await Promise.all([
        fetch('/api/printers'),
        fetch('/api/merchant/profile'),
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
      const res = await fetch('/api/merchant/printer', {
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

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Hardware & Printer Fleet</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real Windows OS printers detected on this computer. Selected printer will process customer jobs.
          </p>
        </div>

        <button
          onClick={fetchPrinters}
          disabled={loading}
          className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh / Re-scan</span>
        </button>
      </div>

      {/* Success / Error Alerts */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5 shadow-sm">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* PRINTERS LIST */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3 shadow-xs">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-800">Scanning local Windows printers...</p>
          <p className="text-xs text-slate-400">Querying Windows Print Spooler (Win32_Printer)</p>
        </div>
      ) : printers.length === 0 ? (
        /* NO PRINTER DETECTED STATE */
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900">No printer detected</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              No physical or virtual printers were found in the Windows print spooler. Please ensure your printer is powered on, connected via USB/Network, and installed in Windows Settings.
            </p>
          </div>
          <button
            onClick={fetchPrinters}
            className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/20 inline-flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-scan Local Printers</span>
          </button>
        </div>
      ) : (
        /* PRINTER CARDS GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {printers.map((printer) => {
            const isActive = activePrinterName === printer.name;

            return (
              <div
                key={printer.id}
                className={`bg-white rounded-3xl p-6 border transition-all relative flex flex-col justify-between shadow-xs ${
                  isActive
                    ? 'border-blue-600 ring-2 ring-blue-600/20 shadow-md'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold flex-shrink-0 ${
                          isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Printer className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate" title={printer.name}>
                          {printer.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          {printer.isDefault && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              OS Default
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              printer.isOnline
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {printer.isOnline ? 'Online' : 'Offline / Idle'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isActive && (
                      <span className="flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex-shrink-0">
                        <Check className="w-3.5 h-3.5" />
                        <span>Active Target</span>
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100">
                    {printer.driverName && (
                      <div className="flex justify-between">
                        <span>Driver:</span>
                        <span className="font-mono text-slate-800 truncate max-w-[200px]">
                          {printer.driverName}
                        </span>
                      </div>
                    )}
                    {printer.portName && (
                      <div className="flex justify-between">
                        <span>Port:</span>
                        <span className="font-mono text-slate-800 truncate max-w-[200px]">
                          {printer.portName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {isActive ? 'Target for incoming print jobs' : 'Available for selection'}
                  </span>

                  {!isActive && (
                    <button
                      onClick={() => handleSelectActivePrinter(printer.name)}
                      disabled={saving}
                      className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      Use as Active Printer
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
