import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  QrCode,
  ArrowRight,
  Clock,
  History,
  Lock,
  Printer,
  Sparkles,
  RefreshCw,
  UserCheck,
  Receipt,
  FileCheck,
  CreditCard,
  AlertOctagon,
  ChevronRight,
  Info,
} from 'lucide-react';
import { verificationService } from '../services/verificationService';
import {
  CollectionVerificationRecord,
  VerificationAuditLog,
} from '../types/verification';

interface StaffVerificationViewProps {
  onOpenDocumentPreview?: (jobId: string) => void;
}

export const StaffVerificationView: React.FC<StaffVerificationViewProps> = ({
  onOpenDocumentPreview,
}) => {
  const [codeInput, setCodeInput] = useState('');
  const [activeRecord, setActiveRecord] = useState<CollectionVerificationRecord | null>(null);
  const [allRecords, setAllRecords] = useState<CollectionVerificationRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<VerificationAuditLog[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Cash collection modal state
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [tenderedAmountStr, setTenderedAmountStr] = useState<string>('');
  const [cashError, setCashError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Handover success toast / notification state
  const [handoverSuccessBanner, setHandoverSuccessBanner] = useState<string | null>(null);

  // Tab filter for tray list
  const [trayFilter, setTrayFilter] = useState<'ALL' | 'READY_IN_TRAY' | 'COLLECTED'>('ALL');

  useEffect(() => {
    // Initial fetch
    setAllRecords(verificationService.getAllRecords());
    setAuditLogs(verificationService.getAuditLogs());

    // Subscribe to real-time verification updates
    const unsubscribeRecords = verificationService.subscribe((records) => {
      setAllRecords(records);
      // Keep active record fresh
      if (activeRecord) {
        const fresh = records.find((r) => r.verificationCode === activeRecord.verificationCode);
        if (fresh) setActiveRecord(fresh);
      }
    });

    const unsubscribeAudit = verificationService.subscribeToAudit(() => {
      setAuditLogs(verificationService.getAuditLogs(activeRecord?.verificationCode));
    });

    return () => {
      unsubscribeRecords();
      unsubscribeAudit();
    };
  }, [activeRecord?.verificationCode]);

  // Code input formatter (adds space between 4th and 5th digit automatically)
  const handleCodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, '').slice(0, 8);
    setCodeInput(raw);
    setSearchError(null);
    setHandoverSuccessBanner(null);

    // Auto-search when 8 digits are reached
    if (raw.length === 8) {
      performLookup(raw);
    }
  };

  const performLookup = async (code: string) => {
    try {
      const found = await verificationService.lookupByCode(code);
      if (found) {
        setActiveRecord(found);
        setSearchError(null);
        // Auto open cash modal if cash is pending and not collected
        if (
          found.paymentStatus === 'CASH_REQUIRED' ||
          found.paymentStatus === 'CASH_LOCKED'
        ) {
          setTenderedAmountStr(found.amountTotal.toString());
        }
      } else {
        setActiveRecord(null);
        setSearchError(`No active print record found for verification code "${code}".`);
      }
    } catch (err: any) {
      setActiveRecord(null);
      setSearchError(err.message || `No active print record found for verification code "${code}".`);
    }
  };

  const handleSelectTrayItem = (record: CollectionVerificationRecord) => {
    setCodeInput(record.verificationCode);
    setActiveRecord(record);
    setSearchError(null);
    setHandoverSuccessBanner(null);
    if (record.paymentStatus === 'CASH_REQUIRED' || record.paymentStatus === 'CASH_LOCKED') {
      setTenderedAmountStr(record.amountTotal.toString());
    }
  };

  // Immediate handover handler for UPI-Paid documents
  const handleImmediateUpiHandover = async () => {
    if (!activeRecord) return;
    setIsProcessing(true);
    try {
      const updated = await verificationService.confirmDocumentHandover(
        activeRecord.verificationCode,
        'STAFF-DESK-01',
        'Sarah K. (Station Staff)'
      );
      setActiveRecord(updated);
      setHandoverSuccessBanner(
        `✓ Prints handed over successfully to ${updated.customerName} (Code: ${updated.formattedCode}).`
      );
    } catch (err: any) {
      setSearchError(err.message || 'Handover confirmation failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Submit cash collection and confirm handover
  const handleConfirmCashCollection = async () => {
    if (!activeRecord) return;
    const tendered = parseFloat(tenderedAmountStr);
    if (isNaN(tendered) || tendered < activeRecord.amountTotal) {
      setCashError(
        `Tendered cash ($${(tendered || 0).toFixed(2)}) is less than total due ($${activeRecord.amountTotal.toFixed(2)}).`
      );
      return;
    }

    setIsProcessing(true);
    setCashError(null);
    try {
      // Step 1: Record Cash Collection
      const paidRecord = await verificationService.recordCashCollection(
        activeRecord.verificationCode,
        tendered,
        'STAFF-DESK-01',
        'Sarah K. (Station Staff)'
      );

      // Step 2: Confirm Physical Handover
      const finalRecord = await verificationService.confirmDocumentHandover(
        paidRecord.verificationCode,
        'STAFF-DESK-01',
        'Sarah K. (Station Staff)'
      );

      setActiveRecord(finalRecord);
      setIsCashModalOpen(false);
      setHandoverSuccessBanner(
        `✓ Cash of $${tendered.toFixed(2)} received (Change: $${(finalRecord.cashChangeDue || 0).toFixed(2)}). Prints handed over to ${finalRecord.customerName}.`
      );
    } catch (err: any) {
      setCashError(err.message || 'Cash collection failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredTrayRecords = allRecords.filter((r) => {
    if (trayFilter === 'READY_IN_TRAY') return r.handoverStatus === 'READY_IN_TRAY';
    if (trayFilter === 'COLLECTED') return r.handoverStatus === 'COLLECTED';
    return true;
  });

  const tenderedNumeric = parseFloat(tenderedAmountStr) || 0;
  const currentTotal = activeRecord?.amountTotal || 0;
  const changeDueCalc = Math.max(0, +(tenderedNumeric - currentTotal).toFixed(2));

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Staff Print Verification & Collection Counter
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                  Fail-Safe Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify customer 8-digit codes from printed documents, validate UPI payments, and reconcile cash collection.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>Active Cashier: <strong>Sarah K. (Station 01)</strong></span>
          </div>
        </div>
      </div>

      {/* Main Grid: Code Input & Verification Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 8-Digit Verification Input & Action Panels (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 8-Digit Code Entry Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Customer 8-Digit Verification Code
            </label>
            <div className="relative">
              <input
                id="input-staff-verification-code"
                type="text"
                maxLength={8}
                value={codeInput}
                onChange={handleCodeInputChange}
                placeholder="e.g. 48291057"
                className="w-full bg-slate-50 border-2 border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl py-3.5 pl-4 pr-28 text-2xl font-mono font-extrabold tracking-widest text-slate-900 outline-none transition-all placeholder:text-slate-300 placeholder:tracking-normal placeholder:font-sans placeholder:text-base"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {codeInput && (
                  <button
                    onClick={() => {
                      setCodeInput('');
                      setActiveRecord(null);
                      setSearchError(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1"
                  >
                    Clear
                  </button>
                )}
                <button
                  id="btn-staff-lookup-code"
                  onClick={() => performLookup(codeInput)}
                  disabled={codeInput.length < 8}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Verify</span>
                </button>
              </div>
            </div>

            {searchError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{searchError}</span>
              </div>
            )}

            {handoverSuccessBanner && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-semibold animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{handoverSuccessBanner}</span>
              </div>
            )}

            {/* Quick Helper / Instructions */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                Code is printed on the final page footer of the customer's printout.
              </span>
              <span className="font-mono text-slate-400">Format: 8 Digits (0-9)</span>
            </div>
          </div>

          {/* Active Record Card & Verification Actions */}
          {activeRecord ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
              {/* Status Header Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Active Verification Key
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-2xl font-black font-mono tracking-widest text-slate-900">
                      {activeRecord.formattedCode}
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                      {activeRecord.securityChecksum}
                    </span>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex items-center gap-2">
                  {activeRecord.paymentStatus === 'UPI_SUCCESS' && (
                    <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs px-3 py-1.5 rounded-lg shadow-2xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      UPI Paid & Confirmed
                    </span>
                  )}
                  {activeRecord.paymentStatus === 'CASH_COLLECTED' && (
                    <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs px-3 py-1.5 rounded-lg shadow-2xs">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      Cash Collected & Reconciled
                    </span>
                  )}
                  {activeRecord.paymentStatus === 'CASH_LOCKED' && (
                    <span className="flex items-center gap-1.5 bg-red-100 text-red-800 border border-red-300 font-extrabold text-xs px-3 py-1.5 rounded-lg shadow-2xs animate-pulse">
                      <AlertOctagon className="w-4 h-4 text-red-600" />
                      LOCKED: 3 Failed UPI (Cash Only)
                    </span>
                  )}
                  {activeRecord.paymentStatus === 'CASH_REQUIRED' && (
                    <span className="flex items-center gap-1.5 bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs px-3 py-1.5 rounded-lg shadow-2xs">
                      <Clock className="w-4 h-4 text-amber-600" />
                      Cash Payment Required
                    </span>
                  )}
                  {activeRecord.paymentStatus === 'UPI_INITIATED' && (
                    <span className="flex items-center gap-1.5 bg-blue-100 text-blue-800 border border-blue-300 font-bold text-xs px-3 py-1.5 rounded-lg shadow-2xs">
                      <QrCode className="w-4 h-4 text-blue-600" />
                      UPI Scan Initiated
                    </span>
                  )}
                </div>
              </div>

              {/* 3-Strike Lockout Alert Callout if applicable */}
              {activeRecord.isCashLocked && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 text-xs text-red-900 space-y-2">
                  <div className="flex items-center gap-2 font-black text-red-800 text-sm">
                    <Lock className="w-4 h-4 text-red-600" />
                    <span>FAIL-SAFE ENGAGED: Digital Payment Lockdown Triggered</span>
                  </div>
                  <p className="font-medium text-red-700">
                    Customer exceeded the maximum allowed digital UPI payment attempts (3/3 failures).
                    The document was automatically spooled, and payment is strictly restricted to Counter Cash Collection.
                  </p>
                  <div className="bg-white/80 p-2.5 rounded-lg border border-red-200 font-mono text-[11px] text-red-800 space-y-1">
                    <div className="font-bold text-red-900">Failed UPI Attempts Audit:</div>
                    {activeRecord.paymentAttempts.map((att, idx) => (
                      <div key={att.attemptId} className="flex justify-between items-center text-[10px]">
                        <span>Attempt #{idx + 1}: {att.errorCode || 'FAILED'} ({new Date(att.timestamp).toLocaleTimeString()})</span>
                        <span className="text-red-600">{att.errorMessage}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Job & Customer Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Customer</span>
                  <div className="font-bold text-slate-800 mt-0.5 truncate">{activeRecord.customerName}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Job / Spool #</span>
                  <div className="font-bold text-slate-800 mt-0.5">{activeRecord.jobNo}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Printer Device</span>
                  <div className="font-bold text-slate-800 mt-0.5 truncate">{activeRecord.printerName}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Total Amount</span>
                  <div className="font-extrabold text-blue-700 text-base mt-0.5">
                    ${activeRecord.amountTotal.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* ACTION SCENARIOS */}
              {/* Scenario 1: UPI CONFIRMED -> Immediate Handover */}
              {activeRecord.paymentStatus === 'UPI_SUCCESS' && (
                <div className="bg-emerald-50/80 border-2 border-emerald-300 rounded-xl p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-base">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span>Payment Verified via UPI (Pre-Paid)</span>
                      </div>
                      <p className="text-xs text-emerald-700 mt-1">
                        Ref ID: <strong className="font-mono">{activeRecord.upiTransactionId}</strong> | Payer: {activeRecord.upiPayerVpa}
                      </p>
                    </div>
                    <span className="text-xs font-black bg-emerald-600 text-white px-2.5 py-1 rounded-md">
                      PAID ${activeRecord.amountTotal.toFixed(2)}
                    </span>
                  </div>

                  {activeRecord.handoverStatus === 'COLLECTED' ? (
                    <div className="bg-white p-3.5 rounded-lg border border-emerald-200 flex items-center justify-between text-xs text-emerald-800 font-semibold">
                      <span>✓ Document already handed over at {activeRecord.handoverCompletedAt ? new Date(activeRecord.handoverCompletedAt).toLocaleTimeString() : 'earlier'}.</span>
                      <span className="text-[11px] text-slate-500">Verified by: {activeRecord.verifiedByStaffName}</span>
                    </div>
                  ) : (
                    <button
                      id="btn-staff-immediate-handover"
                      onClick={handleImmediateUpiHandover}
                      disabled={isProcessing}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-sm py-3.5 px-6 rounded-xl transition-all shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Hand Over Prints Immediately to Customer</span>
                    </button>
                  )}
                </div>
              )}

              {/* Scenario 2: CASH REQUIRED / CASH LOCKED -> Cash Collection Drawer Popup */}
              {(activeRecord.paymentStatus === 'CASH_REQUIRED' ||
                activeRecord.paymentStatus === 'CASH_LOCKED' ||
                activeRecord.paymentStatus === 'UPI_FAILED' ||
                activeRecord.paymentStatus === 'PENDING') && (
                <div className="bg-amber-50/80 border-2 border-amber-300 rounded-xl p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-amber-900 font-extrabold text-base">
                        <DollarSign className="w-5 h-5 text-amber-600" />
                        <span>Counter Cash Collection Required</span>
                      </div>
                      <p className="text-xs text-amber-800 mt-1">
                        Collect payment from customer before releasing prints from tray.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-amber-700 font-bold">Total Due:</span>
                      <div className="text-xl font-black text-amber-900">${activeRecord.amountTotal.toFixed(2)}</div>
                    </div>
                  </div>

                  <button
                    id="btn-staff-open-cash-modal"
                    onClick={() => {
                      setTenderedAmountStr(activeRecord.amountTotal.toString());
                      setCashError(null);
                      setIsCashModalOpen(true);
                    }}
                    className="w-full bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-extrabold text-sm py-3.5 px-6 rounded-xl transition-all shadow-md shadow-amber-700/20 flex items-center justify-center gap-2"
                  >
                    <DollarSign className="w-5 h-5" />
                    <span>Open Cash Collection Popup & Calculate Change</span>
                  </button>
                </div>
              )}

              {/* Scenario 3: ALREADY CASH COLLECTED */}
              {activeRecord.paymentStatus === 'CASH_COLLECTED' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 space-y-2">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                      Cash Collected: ${activeRecord.cashTenderedAmount?.toFixed(2)} (Change Given: ${activeRecord.cashChangeDue?.toFixed(2)})
                    </span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      Handover: {activeRecord.handoverStatus}
                    </span>
                  </div>
                </div>
              )}

              {/* Preview Document Button */}
              {onOpenDocumentPreview && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => onOpenDocumentPreview(activeRecord.jobId)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Inspect Spooled Print Document</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Document Selected for Verification</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Type the 8-digit verification code provided by the customer, or click on any completed job in the tray list on the right.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Print Tray Queue & Verification History (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">Collection Tray Documents</h3>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {allRecords.length} Total
              </span>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
              <button
                onClick={() => setTrayFilter('ALL')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  trayFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTrayFilter('READY_IN_TRAY')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  trayFilter === 'READY_IN_TRAY'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                In Tray ({allRecords.filter((r) => r.handoverStatus === 'READY_IN_TRAY').length})
              </button>
              <button
                onClick={() => setTrayFilter('COLLECTED')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  trayFilter === 'COLLECTED' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Collected
              </button>
            </div>

            {/* Tray List */}
            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {filteredTrayRecords.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No print records matching filter.
                </div>
              ) : (
                filteredTrayRecords.map((rec) => {
                  const isSelected = activeRecord?.verificationCode === rec.verificationCode;
                  const isPaid =
                    rec.paymentStatus === 'UPI_SUCCESS' || rec.paymentStatus === 'CASH_COLLECTED';
                  const isLocked = rec.paymentStatus === 'CASH_LOCKED';

                  return (
                    <div
                      key={rec.verificationCode}
                      onClick={() => handleSelectTrayItem(rec)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer text-xs space-y-2 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                          : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-sm text-slate-900">
                            {rec.formattedCode}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">({rec.jobNo})</span>
                        </div>
                        <span className="font-extrabold text-slate-900">
                          ${rec.amountTotal.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-600 truncate max-w-[140px]">
                          {rec.customerName}
                        </span>

                        {isPaid && (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {rec.paymentStatus === 'UPI_SUCCESS' ? 'UPI Paid' : 'Cash Paid'}
                          </span>
                        )}
                        {isLocked && (
                          <span className="text-red-700 font-bold flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5" />
                            Cash Locked
                          </span>
                        )}
                        {!isPaid && !isLocked && (
                          <span className="text-amber-700 font-bold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Unpaid
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                        <span>Tray Status: <strong className="text-slate-600">{rec.handoverStatus}</strong></span>
                        <span>{new Date(rec.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Audit Logs Accordion for Compliance */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-600" />
                <h4 className="font-bold text-xs text-slate-800">Verification Audit Trail</h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {auditLogs.length} events logged
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto text-[11px]">
              {auditLogs.slice(0, 8).map((log) => (
                <div
                  key={log.id}
                  className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-start justify-between gap-2"
                >
                  <div>
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-blue-600">[{log.verificationCode}]</span>
                      <span>{log.action.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Actor: {log.actor} | {log.ipAddressOrStation}
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CASH COLLECTION POPUP MODAL */}
      {isCashModalOpen && activeRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Counter Cash Collection</h3>
                  <p className="text-xs text-slate-500">Code: <strong>{activeRecord.formattedCode}</strong></p>
                </div>
              </div>
              <button
                onClick={() => setIsCashModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Total Due Banner */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Due Amount</span>
              <div className="text-3xl font-black text-slate-900">
                ${activeRecord.amountTotal.toFixed(2)}
              </div>
              <p className="text-[11px] text-slate-500">Customer: {activeRecord.customerName} ({activeRecord.jobNo})</p>
            </div>

            {/* Quick Denomination Buttons */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Quick Tendered Amount:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  activeRecord.amountTotal,
                  Math.ceil(activeRecord.amountTotal / 10) * 10 || 10,
                  Math.ceil(activeRecord.amountTotal / 20) * 20 || 20,
                  50,
                ].map((val, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setTenderedAmountStr(val.toFixed(2))}
                    className="py-2 px-1 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 text-slate-800 transition-all text-center"
                  >
                    ${val.toFixed(2)}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Tendered Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Cash Tendered ($):
              </label>
              <input
                id="input-cash-tendered"
                type="number"
                step="0.01"
                min={activeRecord.amountTotal}
                value={tenderedAmountStr}
                onChange={(e) => {
                  setTenderedAmountStr(e.target.value);
                  setCashError(null);
                }}
                className="w-full bg-slate-50 border-2 border-slate-300 focus:border-amber-500 focus:bg-white rounded-xl py-3 px-4 text-xl font-bold font-mono text-slate-900 outline-none"
              />
            </div>

            {/* Real-time Change Due Display */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
              <span className="font-bold text-amber-900">Change Due to Customer:</span>
              <span className="text-xl font-extrabold font-mono text-amber-950">
                ${changeDueCalc.toFixed(2)}
              </span>
            </div>

            {cashError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-semibold">
                {cashError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCashModalOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-cash-handover"
                type="button"
                onClick={handleConfirmCashCollection}
                disabled={isProcessing || tenderedNumeric < activeRecord.amountTotal}
                className="flex-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white py-3 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Collect Cash & Hand Over Prints</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
