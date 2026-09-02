import React, { useState } from 'react';
import {
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Lock,
  DollarSign,
  Copy,
  Check,
  RefreshCw,
  Printer,
  ShieldCheck,
  Smartphone,
  ArrowRight,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';
import { CollectionVerificationRecord } from '../types/verification';
import { paymentGatewayService } from '../services/paymentGatewayService';
import { verificationService } from '../services/verificationService';

interface CustomerPaymentScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: CollectionVerificationRecord | null;
  onPaymentUpdated?: (updated: CollectionVerificationRecord) => void;
}

export const CustomerPaymentScreenModal: React.FC<CustomerPaymentScreenModalProps> = ({
  isOpen,
  onClose,
  record,
  onPaymentUpdated,
}) => {
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !record) return null;

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(record.verificationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateUpiSuccess = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const result = await paymentGatewayService.simulateSuccessfulUpiPayment(
        record.verificationCode,
        'customer@okhdfcbank'
      );
      if (onPaymentUpdated) onPaymentUpdated(result.updatedRecord);
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment simulation failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulateUpiFailure = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const result = await paymentGatewayService.simulateFailedUpiPayment(record.verificationCode);
      if (onPaymentUpdated) onPaymentUpdated(result.updatedRecord);
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment failure recording failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSwitchToCash = () => {
    try {
      const updated = verificationService.markCashRequired(record.verificationCode);
      if (onPaymentUpdated) onPaymentUpdated(updated);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const isPaid = record.paymentStatus === 'UPI_SUCCESS' || record.paymentStatus === 'CASH_COLLECTED';
  const isLocked = record.isCashLocked || record.paymentStatus === 'CASH_LOCKED';
  const attemptsCount = record.failedDigitalAttemptsCount || 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 animate-scaleUp my-8">
        {/* Header with AutoPrint Logo */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20 font-black">
              AP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-slate-900">AutoPrint Customer Screen</h3>
                <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                  Live Terminal
                </span>
              </div>
              <p className="text-xs text-slate-500">Order: {record.jobNo} • Document: {record.jobTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 font-bold p-2 rounded-xl hover:bg-slate-100 transition-all text-sm"
          >
            ✕
          </button>
        </div>

        {/* PROMINENT 8-DIGIT VERIFICATION CODE CARD */}
        <div className="bg-linear-to-br from-slate-900 via-slate-800 to-blue-950 rounded-2xl p-6 text-white text-center shadow-lg relative overflow-hidden space-y-3">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-center justify-center gap-2 text-blue-300 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Your 8-Digit Collection Code</span>
          </div>

          <div className="flex items-center justify-center gap-3">
            <div className="text-4xl sm:text-5xl font-black font-mono tracking-widest text-white drop-shadow-sm">
              {record.formattedCode}
            </div>
            <button
              onClick={handleCopyCode}
              title="Copy code"
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-blue-200 transition-all active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-[11px] text-blue-200/90 pt-1">
            <Printer className="w-3.5 h-3.5 text-blue-300" />
            <span>Printed simultaneously on the last page of your document in the tray.</span>
          </div>
        </div>

        {/* DYNAMIC WORKFLOW BODY BASED ON STATUS */}
        {isPaid ? (
          /* SUCCESS STATE */
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6 text-center space-y-4 animate-fadeIn">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xl font-black text-emerald-950">Payment Confirmed (${record.amountTotal.toFixed(2)})</h4>
              <p className="text-xs text-emerald-800 font-medium max-w-sm mx-auto">
                Your print job has been spooled. Please tell your 8-digit code (<strong>{record.formattedCode}</strong>) to the staff counter to collect your prints immediately!
              </p>
            </div>
            <div className="bg-white/90 p-3 rounded-xl border border-emerald-200 text-left text-xs space-y-1 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">UPI Ref ID:</span>
                <span className="font-mono font-bold text-slate-900">{record.upiTransactionId || 'UPI-CONFIRMED-99'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payer Account:</span>
                <span className="font-semibold text-slate-800">{record.upiPayerVpa || 'customer@upi'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tray Handover Status:</span>
                <span className="font-bold text-emerald-700">{record.handoverStatus}</span>
              </div>
            </div>
          </div>
        ) : isLocked ? (
          /* 3-STRIKE LOCKOUT STATE */
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-6 space-y-4 animate-shake">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-red-950">
                  Digital Payment Locked (3 Failed Attempts)
                </h4>
                <p className="text-xs text-red-700 font-medium">
                  Your prints have been sent to the printer queue, but digital checkout is disabled.
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-red-200 space-y-2 text-xs">
              <div className="font-bold text-red-900">Next Action Required:</div>
              <p className="text-slate-700">
                Please proceed directly to the staff counter. Quote your 8-digit code <strong>{record.formattedCode}</strong> and pay <strong>${record.amountTotal.toFixed(2)}</strong> in cash to collect your prints.
              </p>
            </div>
          </div>
        ) : (
          /* ACTIVE UPI PAYMENT SCREEN WITH QR SIMULATION & FAIL-SAFE CONTROLS */
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-200">
              {/* Simulated Dynamic UPI QR Code */}
              <div className="bg-white p-3 rounded-2xl border-2 border-slate-900 shadow-md flex flex-col items-center shrink-0">
                <div className="w-36 h-36 bg-slate-900 rounded-xl flex items-center justify-center p-2 relative overflow-hidden">
                  {/* Visual QR Code Pattern */}
                  <div className="grid grid-cols-6 gap-1 w-full h-full bg-white p-2 rounded-lg">
                    {Array.from({ length: 36 }).map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-xs ${
                          (i % 2 === 0 && i % 3 !== 1) || [0, 1, 4, 5, 6, 11, 24, 29, 30, 31, 34, 35].includes(i)
                            ? 'bg-slate-900'
                            : 'bg-transparent'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-[10px] font-bold text-slate-700 mt-2 flex items-center gap-1">
                  <Smartphone className="w-3 h-3 text-blue-600" />
                  <span>Scan via Any UPI App</span>
                </div>
              </div>

              {/* Payment Details & Strike Tracker */}
              <div className="space-y-3 flex-1 text-left">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Payable</span>
                  <div className="text-3xl font-black text-slate-900">
                    ${record.amountTotal.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    UPI ID: autoprint.merchant@icici
                  </div>
                </div>

                {/* Strike Tracker Badge */}
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span>UPI Fail-Safe Tracker:</span>
                    <span className="font-mono text-amber-950 font-extrabold">{attemptsCount} / 3 Strikes</span>
                  </div>
                  <div className="w-full bg-amber-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        attemptsCount === 1
                          ? 'w-1/3 bg-amber-500'
                          : attemptsCount === 2
                          ? 'w-2/3 bg-orange-500'
                          : attemptsCount >= 3
                          ? 'w-full bg-red-600'
                          : 'w-0'
                      }`}
                    />
                  </div>
                  <p className="text-[10px] text-amber-700">
                    3 consecutive digital payment failures will lock checkout exclusively to Counter Cash.
                  </p>
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Interactive Simulation Controls */}
            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                Interactive Simulator Controls (Test Payment Scenarios)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  id="btn-simulate-upi-success"
                  onClick={handleSimulateUpiSuccess}
                  disabled={isProcessing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simulate UPI Payment Success</span>
                </button>

                <button
                  id="btn-simulate-upi-failure"
                  onClick={handleSimulateUpiFailure}
                  disabled={isProcessing}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99]"
                >
                  <AlertOctagon className="w-4 h-4" />
                  <span>Simulate UPI Failure (Strike +1)</span>
                </button>
              </div>

              <button
                id="btn-switch-to-cash"
                onClick={handleSwitchToCash}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition-all"
              >
                <DollarSign className="w-4 h-4 text-amber-600" />
                <span>Customer Prefers Cash at Counter</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>AutoPrint Transaction Security Engine</span>
          <button onClick={onClose} className="text-blue-600 font-bold hover:underline">
            Done / Close Screen
          </button>
        </div>
      </div>
    </div>
  );
};
