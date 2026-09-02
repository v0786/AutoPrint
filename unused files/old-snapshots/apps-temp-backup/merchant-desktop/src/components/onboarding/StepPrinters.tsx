/**
 * Step 2: Printer Management & Real-time Hardware Status Interface
 * Allows detecting, scanning, selecting default printer, and viewing real-time status/paper levels.
 */
import React from 'react';
import {
  Printer,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Usb,
  Wifi,
  Layers,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { PrinterDevice, PrinterStatus } from '../../types/printer';

interface StepPrintersProps {
  printers: PrinterDevice[];
  selectedPrinterId: string | null;
  onSelectPrimary: (id: string) => void;
  isScanning: boolean;
  onScan: () => void;
  detectionError: string | null;
}

export const StepPrinters: React.FC<StepPrintersProps> = ({
  printers,
  selectedPrinterId,
  onSelectPrimary,
  isScanning,
  onScan,
  detectionError,
}) => {
  const getStatusBadge = (status: PrinterStatus) => {
    switch (status) {
      case 'ready':
        return { label: 'Ready', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'printing':
        return { label: 'Printing', bg: 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse' };
      case 'paused':
        return { label: 'Paused', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'offline':
        return { label: 'Offline', bg: 'bg-slate-100 text-slate-500 border-slate-200' };
      default:
        return { label: status.replace(/_/g, ' '), bg: 'bg-red-50 text-red-700 border-red-200' };
    }
  };

  const getConnectionIcon = (type: string) => {
    switch (type) {
      case 'usb':
        return <Usb className="w-3.5 h-3.5 text-slate-400" />;
      case 'network':
        return <Wifi className="w-3.5 h-3.5 text-blue-600" />;
      default:
        return <HardDrive className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Hardware & Printer Configuration
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Detect connected AutoPrint thermal receipts, shipping labels, and office laser printers.
          </p>
        </div>

        {/* Scan Button - Green Action */}
        <button
          id="btn-scan-printers"
          onClick={onScan}
          disabled={isScanning}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs shadow-emerald-700/20 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-white ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Scanning Ports...' : 'Scan Devices'}</span>
        </button>
      </div>

      {detectionError && (
        <div className="p-3.5 mb-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{detectionError} Gracefully falling back to native OS print dialogs.</span>
        </div>
      )}

      {/* Printer List */}
      <div className="space-y-3 mb-6">
        {printers.length === 0 ? (
          <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl">
            <Printer className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-xs font-bold text-slate-800">No Printers Detected</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Click &quot;Scan Devices&quot; to probe USB, network raw 9100, and virtual PDF spoolers.
            </p>
          </div>
        ) : (
          printers.map((printer) => {
            const isSelected = selectedPrinterId === printer.id;
            const badge = getStatusBadge(printer.status);

            return (
              <div
                key={printer.id}
                onClick={() => onSelectPrimary(printer.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-blue-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Printer className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                          {printer.displayName}
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}
                        >
                          {badge.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 font-medium flex-wrap">
                        <span className="flex items-center gap-1">
                          {getConnectionIcon(printer.connectionType)}
                          <span className="font-mono">{printer.port}</span>
                        </span>
                        <span>•</span>
                        <span>{printer.paperFormat}</span>
                        <span>•</span>
                        <span>{printer.dpi} DPI</span>
                        <span>•</span>
                        <span>{printer.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Radio / Selection Indicator */}
                  <div className="shrink-0 pt-0.5">
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </div>

                {/* Hardware Resource Indicators - RED PROGRESS BARS */}
                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100">
                  <div>
                    <div className="flex justify-between text-[10px] font-semibold text-slate-600 mb-1">
                      <span>Paper Supply</span>
                      <span>{printer.paperLevelPercent}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-red-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full transition-all duration-300"
                        style={{ width: `${printer.paperLevelPercent}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-semibold text-slate-600 mb-1">
                      <span>Head / Consumables</span>
                      <span>{printer.tonerLevelPercent}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-red-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-600 rounded-full transition-all duration-300"
                        style={{ width: `${printer.tonerLevelPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-slate-600 flex items-center gap-2">
        <Sliders className="w-4 h-4 text-blue-600 shrink-0" />
        <span>
          The highlighted device will be designated as your <strong>Default Station Printer</strong> for 1-click AutoPrint receipts and automated spooling.
        </span>
      </div>
    </div>
  );
};
