/**
 * Step 3: Terms and Conditions Acceptance Screen with Explicit User Acknowledgment
 */
import React from 'react';
import { ShieldCheck, FileText, CheckSquare, Square, AlertCircle, Lock, HardDrive } from 'lucide-react';
import { TermsAcknowledgment } from '../../types/onboarding';

interface StepTermsProps {
  terms: TermsAcknowledgment;
  onChange: (terms: Partial<TermsAcknowledgment>) => void;
  errors: Record<string, string>;
  shopOwnerName: string;
}

export const StepTerms: React.FC<StepTermsProps> = ({
  terms,
  onChange,
  errors,
  shopOwnerName,
}) => {
  const toggleAccepted = () => {
    const nextAccepted = !terms.accepted;
    onChange({
      accepted: nextAccepted,
      acceptedAt: nextAccepted ? new Date().toISOString() : '',
      acceptedBy: nextAccepted ? shopOwnerName || 'Admin Operator' : '',
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Terms & Local Data Agreement
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review our end-user agreement and offline privacy terms before activating your station.
        </p>
      </div>

      {/* Scrollable Terms & Conditions Box */}
      <div className="bg-white border border-blue-100 rounded-2xl p-4 sm:p-5 shadow-xs mb-5 max-h-64 overflow-y-auto space-y-3.5 text-xs text-slate-600 leading-relaxed">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="font-bold text-slate-900 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            AutoPrint Workstation End-User License Agreement
          </span>
          <span className="font-mono text-[10px] bg-blue-50 px-2 py-0.5 rounded text-blue-700 font-bold border border-blue-100">
            {terms.version}
          </span>
        </div>

        <div>
          <h4 className="font-bold text-slate-900 mb-1">1. Local-Only Data Storage Guarantee</h4>
          <p>
            AutoPrint operates entirely on your local machine. Customer files, print queue payloads, receipt details, and user passwords are never transmitted to external cloud servers. All cryptographic credentials and queue logs remain strictly inside your local workstation storage.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-slate-900 mb-1">2. Hardware Spooler Control</h4>
          <p>
            By initializing this workstation, you grant AutoPrint direct permission to communicate with operating system print drivers (WinSpool on Windows, CUPS on macOS/Linux), pulse cash drawer kick solenoids, and trigger paper cutter commands.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-slate-900 mb-1">3. Customer Portal & Network Segregation</h4>
          <p>
            The counter QR code generates a customer-facing portal accessible via your local area network (LAN). Customer uploads are spooled directly into the memory buffer of this workstation without third-party intermediary servers.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-slate-900 mb-1">4. Merchant Responsibility</h4>
          <p>
            The merchant is responsible for maintaining physical security of the terminal, keeping system user credentials confidential, and performing routine hardware maintenance on connected thermal heads and cutters.
          </p>
        </div>
      </div>

      {/* Explicit Acknowledgment Checkboxes */}
      <div className="space-y-3 bg-white border border-slate-200 rounded-2xl p-4 mb-4 shadow-2xs">
        {/* Checkbox 1: Terms */}
        <div
          onClick={toggleAccepted}
          className="flex items-start gap-3 cursor-pointer select-none"
        >
          <div className="pt-0.5 text-emerald-600">
            {terms.accepted ? (
              <CheckSquare className="w-4 h-4 text-emerald-600" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">
              I agree to the End-User License Agreement and Offline Operation Terms <span className="text-red-500">*</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Confirming that this station will be used in accordance with local retail laws.
            </p>
          </div>
        </div>
        {errors.accepted && (
          <p className="text-[11px] text-red-600 font-semibold pl-7">{errors.accepted}</p>
        )}

        <div className="border-t border-slate-100 pt-3"></div>

        {/* Checkbox 2: Local Data Notice */}
        <div
          onClick={() => onChange({ agreedToLocalDataNotice: !terms.agreedToLocalDataNotice })}
          className="flex items-start gap-3 cursor-pointer select-none"
        >
          <div className="pt-0.5 text-emerald-600">
            {terms.agreedToLocalDataNotice ? (
              <CheckSquare className="w-4 h-4 text-emerald-600" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">
              I acknowledge that data is saved locally on this machine <span className="text-red-500">*</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Clearing browser cache or formatting the hard drive will reset local logs and operator lists.
            </p>
          </div>
        </div>
        {errors.agreedToLocalDataNotice && (
          <p className="text-[11px] text-red-600 font-semibold pl-7">{errors.agreedToLocalDataNotice}</p>
        )}
      </div>

      {terms.accepted && (
        <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Acknowledged by <strong>{shopOwnerName || 'Admin'}</strong> on {new Date().toLocaleDateString()}
          </span>
        </div>
      )}
    </div>
  );
};
