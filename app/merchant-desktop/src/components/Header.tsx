import React, { useState, useRef, useEffect } from 'react';
import {
  Printer,
  Pause,
  Play,
  RotateCw,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Store,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
  ShieldCheck,
  PrinterIcon,
  X,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { SpoolerMetrics, PrinterDevice } from '../types/printer';

interface HeaderProps {
  currentView: string;
  metrics: SpoolerMetrics;
  onPauseResume: () => void;
  onOpenNewJobModal: () => void;
  onTriggerFastReceipt: () => void;
  defaultPrinter?: PrinterDevice;
  shopName?: string;
  stationId?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  metrics,
  onPauseResume,
  onOpenNewJobModal,
  onTriggerFastReceipt,
  defaultPrinter,
  shopName = 'AutoPrint Express • Counter 1',
  stationId = 'STATION-01',
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [currentShopName, setCurrentShopName] = useState(shopName);
  const [isEditingShopName, setIsEditingShopName] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const avatarButtonRef = useRef<HTMLButtonElement>(null);

  // Derive current customer portal URL based on window location
  const customerAccessUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/customer?station=${encodeURIComponent(stationId)}`
    : `http://localhost:3000/customer?station=${stationId}`;

  // Close popover on outside click or Escape key
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        avatarButtonRef.current &&
        !avatarButtonRef.current.contains(e.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsProfileOpen(false);
      }
    };

    if (isProfileOpen) {
      document.addEventListener('mousedown', handleDocumentClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileOpen]);

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(customerAccessUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy customer link', err);
    }
  };

  const handleOpenCustomerPortal = () => {
    window.open(customerAccessUrl, '_blank', 'noopener,noreferrer');
  };

  const getTitles = () => {
    switch (currentView) {
      case 'queue':
        return {
          title: 'Active Spooler Queue',
          subtitle: `Managing ${metrics.activeJobs} active spooler tasks • OS native print buffer ready`,
        };
      case 'dispatch':
        return {
          title: 'Job Dispatch Studio',
          subtitle: 'Create AutoPrint thermal receipts, 4x6 shipping barcodes, invoices, and diagnostic tickets',
        };
      case 'fleet':
        return {
          title: 'Printer Devices & Hardware',
          subtitle: 'Real-time hardware status, paper/ribbon gauges, and port configurations',
        };
      case 'telemetry':
        return {
          title: 'Spooler Telemetry & Event Logs',
          subtitle: 'Real-time system logging, latency metrics, and OS spooler handshake stream',
        };
      case 'architecture':
        return {
          title: 'Electron IPC Architecture',
          subtitle: 'Process separation, secure IPC channels, and WinSpool / CUPS bridge inspection',
        };
      default:
        return {
          title: 'Print Spooler Manager',
          subtitle: 'Single-PC Merchant Desktop Print System',
        };
    }
  };

  const { title, subtitle } = getTitles();

  return (
    <header className="relative flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8 pb-4 border-b border-blue-100">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {title}
          </h2>
          {metrics.isQueuePaused && (
            <span className="bg-red-50 text-red-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-red-200 flex items-center gap-1">
              <Pause className="w-3 h-3" />
              QUEUE PAUSED
            </span>
          )}
        </div>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          {subtitle}
        </p>
      </div>

      {/* Action Toolbar with Profile Avatar */}
      <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap relative">
        {/* Fast Receipt Quick Button - Green Outline */}
        <button
          id="btn-header-quick-pos"
          onClick={onTriggerFastReceipt}
          className="bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all active:scale-[0.98]"
          title="Instantly dispatch a test sample receipt"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Quick AutoPrint Receipt</span>
        </button>

        {/* Pause/Resume Queue Toggle */}
        <button
          id="btn-header-pause-toggle"
          onClick={onPauseResume}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
            metrics.isQueuePaused
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent shadow-xs'
              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
          }`}
        >
          {metrics.isQueuePaused ? (
            <>
              <Play className="w-3.5 h-3.5" />
              <span>Resume Spooler</span>
            </>
          ) : (
            <>
              <Pause className="w-3.5 h-3.5 text-emerald-700" />
              <span>Pause Spooler</span>
            </>
          )}
        </button>

        {/* New Print Job Main Button - Green */}
        <button
          id="btn-header-new-job"
          onClick={onOpenNewJobModal}
          className="bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shadow-emerald-700/20 transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>New Print Job</span>
        </button>

        {/* Circular Profile Avatar with Status Indicator */}
        <div className="relative ml-1">
          <button
            ref={avatarButtonRef}
            id="btn-merchant-profile-avatar"
            onClick={() => setIsProfileOpen((prev) => !prev)}
            className={`group relative flex items-center justify-center w-10 h-10 rounded-full border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              isProfileOpen
                ? 'border-blue-600 ring-2 ring-blue-500/30 bg-blue-50 shadow-sm'
                : 'border-blue-200 bg-white hover:border-blue-400 hover:bg-blue-50/50 shadow-2xs'
            }`}
            title="Shop Profile & Customer QR Code"
            aria-label="Merchant shop profile and customer QR code"
            aria-haspopup="true"
            aria-expanded={isProfileOpen}
          >
            {/* Store Icon Avatar */}
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-inner">
              <Store className="w-4 h-4 text-white group-hover:scale-105 transition-transform" />
            </div>

            {/* Online Pulse Status Dot */}
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white"></span>
            </span>
          </button>

          {/* Profile & Customer QR Popover / Dropdown */}
          {isProfileOpen && (
            <div
              ref={popoverRef}
              id="popover-merchant-profile"
              className="absolute right-0 top-12 z-50 w-84 sm:w-92 bg-white border border-blue-100 rounded-2xl shadow-2xl p-4 text-slate-800 animate-in fade-in zoom-in-95 duration-150"
            >
              {/* Popover Header */}
              <div className="flex items-start justify-between pb-3 border-b border-blue-100 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
                        {currentShopName}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Local Spooler Station • Ready
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsProfileOpen(false)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                  aria-label="Close popover"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* QR Code Presentation Box */}
              <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-3.5 flex flex-col items-center justify-center text-center shadow-2xs mb-3">
                <div className="flex items-center justify-between w-full mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <QrCode className="w-3.5 h-3.5 text-blue-600" />
                    <span>Customer Upload QR Code</span>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                    Counter Standee
                  </span>
                </div>

                {/* The QR Code Graphic */}
                <div className="p-3 bg-white border border-blue-100 rounded-xl shadow-inner my-1">
                  <QRCodeSVG
                    value={customerAccessUrl}
                    size={164}
                    level="H"
                    includeMargin={false}
                    fgColor="#0F172A"
                    bgColor="#FFFFFF"
                  />
                </div>

                <p className="text-[11px] text-slate-500 mt-2 font-medium leading-tight">
                  Customers scan this code on their mobile device to upload files, pay, and receive a pickup code.
                </p>
              </div>

              {/* Station Info & Direct URL Box */}
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 mb-3 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Station Identifier</span>
                  <span className="font-mono font-bold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {stationId}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Spooler Port</span>
                  <span className="font-mono text-slate-800 font-semibold">
                    localhost:3000
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Active Printer</span>
                  <span className="text-slate-800 font-semibold truncate max-w-[160px]">
                    {defaultPrinter?.displayName || 'Epson TM-T88VI'}
                  </span>
                </div>
              </div>

              {/* Interactive Actions - Green Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCopyLink}
                  className="w-full bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-[0.98]"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied Link</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleOpenCustomerPortal}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs shadow-emerald-700/20 active:scale-[0.98]"
                >
                  <Smartphone className="w-3.5 h-3.5 text-white" />
                  <span>Open Portal</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

