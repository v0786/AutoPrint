import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Printer, 
  Download, 
  ShieldCheck, 
  Send, 
  CreditCard, 
  FileText, 
  AlertTriangle,
  XCircle,
  PackageCheck
} from 'lucide-react';

export interface JobStatusTimelineProps {
  status: string;
  jobId: string;
  fileName?: string;
  storagePath?: string;
  verificationCode?: string;
  errorMessage?: string | null;
  onRetryTransmission?: () => void;
}

interface TimelineStep {
  key: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TIMELINE_STEPS: TimelineStep[] = [
  {
    key: 'UPLOADED',
    label: 'Document Uploaded',
    description: 'Document securely stored in private cloud storage',
    icon: FileText,
  },
  {
    key: 'PAYMENT_CONFIRMED',
    label: 'Payment Confirmed',
    description: 'Payment verified and authorized',
    icon: CreditCard,
  },
  {
    key: 'TRANSMITTING',
    label: 'Sent to Merchant',
    description: 'Job ticket transmitted to merchant station',
    icon: Send,
  },
  {
    key: 'RECEIVED',
    label: 'Merchant Received',
    description: 'Merchant desk acknowledged and persisted to local queue',
    icon: Clock,
  },
  {
    key: 'DOWNLOADING',
    label: 'Downloading & Hash Check',
    description: 'Fetching file and verifying SHA-256 integrity',
    icon: Download,
  },
  {
    key: 'FILE_VERIFIED',
    label: 'Integrity Verified',
    description: 'SHA-256 matched, watermarked with verification stamp',
    icon: ShieldCheck,
  },
  {
    key: 'PRINTING',
    label: 'Printing Document',
    description: 'Physical sheets actively printing at duty station',
    icon: Printer,
  },
  {
    key: 'READY_FOR_COLLECTION',
    label: 'Ready for Pickup',
    description: 'Prints completed and waiting at the counter',
    icon: PackageCheck,
  },
];

function mapStatusToStepIndex(status: string): number {
  const norm = (status || '').toUpperCase();
  switch (norm) {
    case 'UPLOADED':
    case 'PAYMENT_PENDING':
      return 0;
    case 'PAID':
    case 'READY_TO_TRANSMIT':
      return 1;
    case 'TRANSMITTING':
      return 2;
    case 'RECEIVED':
      return 3;
    case 'DOWNLOADING':
      return 4;
    case 'FILE_READY':
    case 'QUEUED':
    case 'READY_TO_PRINT':
      return 5;
    case 'PRINTING':
      return 6;
    case 'PRINTED':
    case 'READY_FOR_COLLECTION':
    case 'READY_FOR_PICKUP':
    case 'COLLECTED':
      return 7;
    default:
      return 0;
  }
}

export const JobStatusTimeline: React.FC<JobStatusTimelineProps> = ({
  status,
  jobId,
  fileName,
  verificationCode,
  errorMessage,
  onRetryTransmission,
}) => {
  const currentStepIndex = mapStatusToStepIndex(status);
  const isErrorState = [
    'TRANSMISSION_FAILED',
    'DOWNLOAD_FAILED',
    'FILE_VERIFICATION_FAILED',
    'PRINT_FAILED',
    'PAYMENT_FAILED',
  ].includes(status.toUpperCase());

  const isMerchantOffline = status.toUpperCase() === 'TRANSMISSION_FAILED';

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-6 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800/40">
              Live Spooler Sync
            </span>
            <span className="text-xs text-slate-400 font-mono">Job: {jobId}</span>
          </div>
          <h3 className="text-lg font-bold text-white mt-1.5 truncate max-w-md">
            {fileName || 'Print Document'}
          </h3>
        </div>

        {verificationCode && (
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-2 text-right">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
              Pickup Code
            </span>
            <span className="text-xl font-black tracking-widest text-amber-400 font-mono">
              {verificationCode}
            </span>
          </div>
        )}
      </div>

      {/* Offline / Error Banner */}
      {isMerchantOffline && (
        <div className="mb-6 p-4 rounded-xl bg-amber-950/40 border border-amber-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-200">
                Merchant Station Offline or Reconnecting
              </p>
              <p className="text-xs text-amber-300/80 mt-0.5">
                Your document is safely stored in cloud storage. The merchant station will automatically download and print it as soon as the terminal reconnects.
              </p>
            </div>
          </div>
          {onRetryTransmission && (
            <button
              onClick={onRetryTransmission}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg transition shadow-md shrink-0"
            >
              Retry Sync
            </button>
          )}
        </div>
      )}

      {isErrorState && !isMerchantOffline && (
        <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-200 uppercase tracking-wide">
              {status.replace(/_/g, ' ')}
            </p>
            <p className="text-xs text-rose-300/80 mt-0.5">
              {errorMessage || 'An error occurred during print processing. Please inform the duty desk staff.'}
            </p>
          </div>
        </div>
      )}

      {/* Step by Step Timeline */}
      <div className="space-y-4">
        {TIMELINE_STEPS.map((step, idx) => {
          const isDone = idx < currentStepIndex || (idx === currentStepIndex && status.toUpperCase() === 'COLLECTED');
          const isCurrent = idx === currentStepIndex && !isErrorState;
          const StepIcon = step.icon;

          return (
            <div key={step.key} className="flex items-start gap-3.5 group">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isDone
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-500/20 animate-pulse'
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  ) : (
                    <StepIcon className="w-4 h-4" />
                  )}
                </div>
                {idx < TIMELINE_STEPS.length - 1 && (
                  <div
                    className={`w-0.5 h-6 mt-1 transition-colors duration-300 ${
                      idx < currentStepIndex ? 'bg-emerald-500/60' : 'bg-slate-800'
                    }`}
                  />
                )}
              </div>

              <div className="pt-0.5">
                <p
                  className={`text-sm font-semibold ${
                    isDone
                      ? 'text-slate-200'
                      : isCurrent
                      ? 'text-blue-400 font-bold'
                      : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
