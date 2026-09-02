import React, { useState } from 'react';
import {
  PrinterDevice,
  PrinterStatus,
  PrintJob,
} from '../types/printer';
import {
  Printer,
  HardDrive,
  Scissors,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Sparkles,
  Wifi,
  Usb,
  Cpu,
  Layers,
  HelpCircle,
  FileCheck,
} from 'lucide-react';

interface PrinterFleetViewProps {
  printers: PrinterDevice[];
  onTriggerTestPrint: (printerId: string, testType: 'diagnostic' | 'alignment' | 'density' | 'receipt') => Promise<PrintJob>;
  onSetPrinterStatus: (printerId: string, status: PrinterStatus, faultDetails?: { paperLevel?: number; tonerLevel?: number }) => Promise<boolean>;
  onRefreshPrinters: () => void;
}

export const PrinterFleetView: React.FC<PrinterFleetViewProps> = ({
  printers,
  onTriggerTestPrint,
  onSetPrinterStatus,
  onRefreshPrinters,
}) => {
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterDevice | null>(printers[0] || null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);

  const handleTestPrint = async (printerId: string, testType: 'diagnostic' | 'alignment' | 'density' | 'receipt') => {
    setTestingId(`${printerId}-${testType}`);
    try {
      await onTriggerTestPrint(printerId, testType);
      setTestSuccess(`Diagnostic job queued for ${printerId}`);
      setTimeout(() => setTestSuccess(null), 3500);
    } catch (e) {
      console.error(e);
    } finally {
      setTestingId(null);
    }
  };

  const getStatusBadge = (status: PrinterStatus) => {
    switch (status) {
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            ONLINE / READY
          </span>
        );
      case 'printing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-600 text-white animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            PRINTING
          </span>
        );
      case 'out_of_paper':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
            <AlertTriangle className="w-3 h-3" />
            OUT OF PAPER
          </span>
        );
      case 'paper_jam':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
            <AlertTriangle className="w-3 h-3" />
            PAPER JAM
          </span>
        );
      case 'offline':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
            OFFLINE / DISCONNECTED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {status.toUpperCase()}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Refresh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-blue-600" />
            <span>Merchant Printer Hardware Fleet ({printers.length} Devices)</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Direct spooler access over USB, Network Raw Port (9100), and OS WinSpool/CUPS interfaces.
          </p>
        </div>

        <button
          id="btn-refresh-printers"
          onClick={onRefreshPrinters}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition-all shadow-2xs cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Rescan Hardware</span>
        </button>
      </div>

      {testSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{testSuccess}</span>
        </div>
      )}

      {/* Grid of Printer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {printers.map((printer) => {
          const isSelected = selectedPrinter?.id === printer.id;
          return (
            <div
              key={printer.id}
              id={`printer-card-${printer.id}`}
              className={`bg-white rounded-3xl border p-5 space-y-4 shadow-xs transition-all duration-150 relative flex flex-col justify-between ${
                printer.isDefault ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'
              }`}
            >
              <div>
                {/* Header: Title + Status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      {printer.isDefault && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white">
                          DEFAULT
                        </span>
                      )}
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        {printer.port}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 leading-snug">
                      {printer.displayName}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                      {printer.connectionType === 'usb' ? (
                        <Usb className="w-3 h-3 text-slate-600" />
                      ) : printer.connectionType === 'network' ? (
                        <Wifi className="w-3 h-3 text-blue-600" />
                      ) : (
                        <Cpu className="w-3 h-3 text-slate-500" />
                      )}
                      <span>{printer.location}</span>
                    </p>
                  </div>
                  <div className="shrink-0">{getStatusBadge(printer.status)}</div>
                </div>

                {/* Paper & Head Consumable Gauges */}
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 space-y-2.5 my-3">
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1">
                      <span>Paper Supply ({printer.paperFormat})</span>
                      <span className={printer.paperLevelPercent < 20 ? 'text-red-600 font-extrabold' : 'text-slate-700'}>
                        {printer.paperLevelPercent}%
                      </span>
                    </div>
                    {/* Progress bar in Red */}
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-600 rounded-full transition-all duration-300"
                        style={{ width: `${printer.paperLevelPercent}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1">
                      <span>Thermal Head / Toner</span>
                      <span className="text-slate-700">{printer.tonerLevelPercent}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500/80 rounded-full transition-all duration-300"
                        style={{ width: `${printer.tonerLevelPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Features Badges */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-slate-600">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700">
                    {printer.dpi} DPI
                  </span>
                  {printer.supportedFeatures.autoCut && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
                      <Scissors className="w-2.5 h-2.5" /> Auto-Cut
                    </span>
                  )}
                  {printer.supportedFeatures.cashDrawerKick && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5" /> Cash Drawer
                    </span>
                  )}
                  {printer.supportedFeatures.duplex && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">Duplex</span>
                  )}
                </div>
              </div>

              {/* Hardware Diagnostic & Fault Simulation Buttons */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id={`btn-diag-${printer.id}`}
                    disabled={testingId === `${printer.id}-receipt`}
                    onClick={() => handleTestPrint(printer.id, 'receipt')}
                    className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs shadow-emerald-700/20 transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                  >
                    <FileCheck className="w-3.5 h-3.5 text-white" />
                    <span>Test Print</span>
                  </button>

                  <button
                    id={`btn-align-${printer.id}`}
                    disabled={testingId === `${printer.id}-diagnostic`}
                    onClick={() => handleTestPrint(printer.id, 'diagnostic')}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Self-Diag</span>
                  </button>
                </div>

                {/* Fault Simulation Controls for Merchant Testing */}
                <div className="flex items-center justify-between gap-1 pt-1 text-[10px]">
                  <span className="font-bold text-slate-400 uppercase">Simulate:</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() =>
                        onSetPrinterStatus(printer.id, 'ready', { paperLevel: 90, tonerLevel: 95 })
                      }
                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg border border-emerald-200 cursor-pointer"
                      title="Set Ready"
                    >
                      Ready
                    </button>
                    <button
                      onClick={() =>
                        onSetPrinterStatus(printer.id, 'out_of_paper', { paperLevel: 0 })
                      }
                      className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg border border-red-200 cursor-pointer"
                      title="Trigger Out of Paper"
                    >
                      No Paper
                    </button>
                    <button
                      onClick={() => onSetPrinterStatus(printer.id, 'paper_jam')}
                      className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg border border-red-200 cursor-pointer"
                      title="Trigger Paper Jam"
                    >
                      Jam
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
