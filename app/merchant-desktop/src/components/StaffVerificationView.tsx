import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  QrCode,
  Clock,
  History,
  Lock,
  Printer,
  Sparkles,
  RefreshCw,
  UserCheck,
  Receipt,
  FileCheck,
  AlertOctagon,
  X,
  Info,
} from 'lucide-react';
import { verificationService } from '../services/verificationService';
import {
  CollectionVerificationRecord,
  VerificationAuditLog,
} from '../types/verification';

interface StaffVerificationViewProps {
  staffName?: string;
  onOpenDocumentPreview?: (jobId: string) => void;
}

export const StaffVerificationView: React.FC<StaffVerificationViewProps> = ({
  staffName = 'Duty Operator',
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
  const [trayFilter, setTrayFilter] = useState<'ALL' | 'READY_IN_TRAY' | 'HANDED_OVER'>('ALL');

  useEffect(() => {
    // Initial fetch
    setAllRecords(verificationService.getAllRecords());
    setAuditLogs(verificationService.getAuditLogs());

    // Subscribe to real-time verification updates
    const unsubscribeRecords = verificationService.subscribe((records) => {
      setAllRecords(records);
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

  // Code input formatter (digits only, max 8)
  const handleCodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, '').slice(0, 8);
    setCodeInput(raw);
    setSearchError(null);
    setHandoverSuccessBanner(null);

    // Auto-search when 8 digits are typed
    if (raw.length === 8) {
      performLookup(raw);
    }
  };

  const performLookup = async (code: string) => {
    try {
      const found = await verificationService.lookupByCode(code, 'STAFF-DESK-01');
      if (found) {
        setActiveRecord(found);
        setSearchError(null);
        if (
          found.paymentStatus === 'CASH_REQUIRED' ||
          found.paymentStatus === 'CASH_LOCKED'
        ) {
          setTenderedAmountStr(found.amountTotal.toString());
        }
      } else {
        setActiveRecord(null);
        setSearchError(`No active print record found for code "${code}".`);
      }
    } catch (err: any) {
      setActiveRecord(null);
      setSearchError(err.message || `Lookup failed for verification code "${code}".`);
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

  // Immediate handover handler for Pre-Paid / UPI orders
  const handleImmediateHandover = async () => {
    if (!activeRecord) return;
    setIsProcessing(true);
    try {
      const updated = await verificationService.confirmDocumentHandover(
        activeRecord.verificationCode,
        'STAFF-DESK-01',
        staffName
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
        `Tendered cash (₹${(tendered || 0).toFixed(2)}) is less than total due (₹${activeRecord.amountTotal.toFixed(2)}).`
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
        staffName
      );

      // Step 2: Confirm Handover
      const finalRecord = await verificationService.confirmDocumentHandover(
        paidRecord.verificationCode,
        'STAFF-DESK-01',
        staffName
      );

      setActiveRecord(finalRecord);
      setIsCashModalOpen(false);
      setHandoverSuccessBanner(
        `✓ Cash of ₹${tendered.toFixed(2)} received (Change: ₹${(finalRecord.cashChangeDue || 0).toFixed(2)}). Prints released to ${finalRecord.customerName}.`
      );
    } catch (err: any) {
      setCashError(err.message || 'Cash collection failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredTrayRecords = allRecords.filter((r) => {
    if (trayFilter === 'READY_IN_TRAY') return r.handoverStatus !== 'HANDED_OVER';
    if (trayFilter === 'HANDED_OVER') return r.handoverStatus === 'HANDED_OVER';
    return true;
  });

  const tenderedNumeric = parseFloat(tenderedAmountStr) || 0;
  const currentTotal = activeRecord?.amountTotal || 0;
  const changeDueCalc = Math.max(0, +(tenderedNumeric - currentTotal).toFixed(2));

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1e1f26] p-6 rounded-3xl border border-white/10 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">Verification Desk & Cash Terminal</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Counter Desk
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Enter 8-digit pickup code, check payment status, collect cash, and confirm document handover.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 bg-black/40 rounded-2xl border border-white/5 text-xs text-zinc-300">
          <UserCheck className="w-4 h-4 text-emerald-400" />
          <span>Duty Cashier: <strong className="text-white">{staffName}</strong></span>
        </div>
      </div>

      {/* Main Grid: Code Input & Action Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Code Lookup & Inspection (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 8-Digit Code Input Box */}
          <div className="bg-[#141419] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
              Customer 8-Digit Verification Code
            </label>
            <div className="relative">
              <input
                type="text"
                maxLength={8}
                value={codeInput}
                onChange={handleCodeInputChange}
                placeholder="e.g. 48291057"
                className="w-full bg-black/50 border-2 border-white/15 focus:border-purple-500 focus:bg-black/80 rounded-2xl py-3.5 pl-4 pr-28 text-2xl font-mono font-black tracking-widest text-white outline-none transition-all placeholder:text-zinc-600 placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {codeInput && (
                  <button
                    onClick={() => {
                      setCodeInput('');
                      setActiveRecord(null);
                      setSearchError(null);
                    }}
                    className="text-zinc-500 hover:text-white text-xs px-2 py-1 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => performLookup(codeInput)}
                  disabled={codeInput.length < 8}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-purple-600/20 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Verify</span>
                </button>
              </div>
            </div>

            {searchError && (
              <div className="p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-2xl flex items-center gap-2.5 text-xs text-rose-300 font-semibold animate-shake">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{searchError}</span>
              </div>
            )}

            {handoverSuccessBanner && (
              <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-300 font-semibold animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{handoverSuccessBanner}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between text-[11px] text-zinc-500">
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-zinc-400" />
                Code is printed on the final page footer or shown on customer's phone.
              </span>
              <span className="font-mono text-zinc-400">8 Digits</span>
            </div>
          </div>

          {/* Active Record Card & Action Scenarios */}
          {activeRecord ? (
            <div className="bg-[#141419] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5">
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Active Verification Key
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-2xl font-black font-mono tracking-widest text-white">
                      {activeRecord.formattedCode}
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-white/10 px-2 py-0.5 rounded text-zinc-300">
                      {activeRecord.securityChecksum}
                    </span>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex items-center gap-2">
                  {activeRecord.paymentStatus === 'UPI_SUCCESS' && (
                    <span className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-xs px-3 py-1.5 rounded-xl">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      UPI Pre-Paid
                    </span>
                  )}
                  {activeRecord.paymentStatus === 'CASH_COLLECTED' && (
                    <span className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-xs px-3 py-1.5 rounded-xl">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      Cash Collected
                    </span>
                  )}
                  {activeRecord.paymentStatus === 'CASH_LOCKED' && (
                    <span className="flex items-center gap-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-xs px-3 py-1.5 rounded-xl animate-pulse">
                      <AlertOctagon className="w-4 h-4 text-rose-400" />
                      Cash Only (UPI Lockout)
                    </span>
                  )}
                  {activeRecord.paymentStatus === 'CASH_REQUIRED' && (
                    <span className="flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-xs px-3 py-1.5 rounded-xl">
                      <Clock className="w-4 h-4 text-amber-400" />
                      Cash Payment Required
                    </span>
                  )}
                </div>
              </div>

              {/* Order Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/40 p-4 rounded-2xl border border-white/5 text-xs">
                <div>
                  <span className="text-zinc-500 text-[10px] font-bold uppercase">Customer</span>
                  <div className="font-bold text-white mt-0.5 truncate">{activeRecord.customerName}</div>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] font-bold uppercase">Job #</span>
                  <div className="font-bold text-white mt-0.5">{activeRecord.jobNo}</div>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] font-bold uppercase">Printer Target</span>
                  <div className="font-bold text-white mt-0.5 truncate">{activeRecord.printerName}</div>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] font-bold uppercase">Bill Total</span>
                  <div className="font-black text-emerald-400 text-base mt-0.5">
                    ₹{activeRecord.amountTotal.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* ACTION SCENARIOS */}
              {/* Scenario 1: UPI Pre-Paid -> Immediate Handover */}
              {activeRecord.paymentStatus === 'UPI_SUCCESS' && (
                <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Payment Verified via UPI</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                        UPI Ref: {activeRecord.upiTransactionId || 'OFFLINE-UPI-OK'}
                      </p>
                    </div>
                    <span className="text-xs font-black bg-emerald-600 text-white px-3 py-1 rounded-xl">
                      PAID ₹{activeRecord.amountTotal.toFixed(2)}
                    </span>
                  </div>

                  {activeRecord.handoverStatus === 'HANDED_OVER' || activeRecord.handoverStatus === 'COLLECTED' ? (
                    <div className="bg-black/40 p-3.5 rounded-xl border border-emerald-500/20 text-xs text-emerald-300 font-semibold">
                      ✓ Prints already handed over to customer.
                    </div>
                  ) : (
                    <button
                      onClick={handleImmediateHandover}
                      disabled={isProcessing}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-3.5 px-6 rounded-2xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Release & Hand Over Prints to Customer</span>
                    </button>
                  )}
                </div>
              )}

              {/* Scenario 2: Cash Required -> Collect Cash */}
              {(activeRecord.paymentStatus === 'CASH_REQUIRED' ||
                activeRecord.paymentStatus === 'CASH_LOCKED' ||
                activeRecord.paymentStatus === 'UPI_FAILED' ||
                activeRecord.paymentStatus === 'PENDING') && (
                <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                        <DollarSign className="w-4 h-4 text-amber-400" />
                        <span>Counter Cash Collection Required</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Collect physical cash from customer before releasing prints from tray.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black bg-amber-500 text-black px-3 py-1 rounded-xl">
                        DUE ₹{activeRecord.amountTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {activeRecord.handoverStatus === 'HANDED_OVER' ? (
                    <div className="bg-black/40 p-3.5 rounded-xl border border-amber-500/20 text-xs text-amber-300 font-semibold">
                      ✓ Order completed and cash reconciled.
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setIsCashModalOpen(true);
                        setCashError(null);
                        setTenderedAmountStr(activeRecord.amountTotal.toString());
                      }}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black text-sm py-3.5 px-6 rounded-2xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <DollarSign className="w-5 h-5" />
                      <span>Open Cash Drawer & Collect ₹{activeRecord.amountTotal.toFixed(2)}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#141419] border border-white/10 rounded-3xl p-12 text-center text-zinc-500 shadow-2xl space-y-2">
              <ShieldCheck className="w-12 h-12 mx-auto mb-2 text-zinc-600 opacity-40" />
              <p className="text-sm font-bold text-zinc-300">Awaiting Verification Code</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Enter the 8-digit pickup code or select a pending order from the tray on the right.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Tray Roster & Quick Pick (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#141419] border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4 flex flex-col h-full">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="text-xs font-bold text-white">Physical Tray Roster</h3>
                <p className="text-[10px] text-zinc-400">Completed prints waiting for customer pickup</p>
              </div>

              <div className="flex items-center gap-1">
                {(['ALL', 'READY_IN_TRAY', 'HANDED_OVER'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTrayFilter(filter)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      trayFilter === filter
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-zinc-500 hover:text-white'
                    }`}
                  >
                    {filter === 'ALL' ? 'All' : filter === 'READY_IN_TRAY' ? 'In Tray' : 'Done'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[500px] flex-1">
              {filteredTrayRecords.length === 0 ? (
                <div className="py-16 text-center text-zinc-500 text-xs">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-1 text-zinc-600" />
                  <span>No orders in this tray filter</span>
                </div>
              ) : (
                filteredTrayRecords.map((record) => {
                  const isSelected = activeRecord?.verificationCode === record.verificationCode;
                  const isPaid = record.paymentStatus === 'UPI_SUCCESS' || record.paymentStatus === 'CASH_COLLECTED';

                  return (
                    <div
                      key={record.verificationCode}
                      onClick={() => handleSelectTrayItem(record)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-xs ${
                        isSelected
                          ? 'bg-purple-950/40 border-purple-500/60 shadow-lg shadow-purple-950/50 ring-1 ring-purple-500/30'
                          : 'bg-black/40 border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-mono font-bold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30 text-xs">
                          {record.formattedCode}
                        </span>
                        <span className="font-black text-white">₹{record.amountTotal.toFixed(2)}</span>
                      </div>

                      <div className="font-semibold text-zinc-200 truncate">{record.customerName}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5 truncate">{record.jobTitle || 'Print Document'}</div>

                      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-white/5 text-[10px]">
                        <span className="text-zinc-500 font-mono">Job {record.jobNo}</span>
                        {isPaid ? (
                          <span className="text-emerald-400 font-bold uppercase">Paid</span>
                        ) : (
                          <span className="text-amber-400 font-bold uppercase">Cash Due</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CASH COLLECTION MODAL */}
      {isCashModalOpen && activeRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-sans">
          <div className="w-full max-w-md bg-[#141419] rounded-3xl p-6 sm:p-7 border border-white/10 shadow-2xl space-y-5 text-white animate-scale-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 font-black">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Cash Collection Terminal</h3>
                  <p className="text-[11px] text-zinc-400">Order #{activeRecord.jobNo} • Code {activeRecord.formattedCode}</p>
                </div>
              </div>
              <button
                onClick={() => setIsCashModalOpen(false)}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Total Due Callout */}
            <div className="p-4 rounded-2xl bg-black/50 border border-white/5 text-center space-y-1">
              <div className="text-[10px] uppercase font-bold text-zinc-400">Exact Bill Amount Due</div>
              <div className="text-3xl font-black text-amber-300">₹{activeRecord.amountTotal.toFixed(2)}</div>
            </div>

            {/* Tendered Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Tendered Cash Received (₹)</label>
              <input
                type="number"
                step="1"
                value={tenderedAmountStr}
                onChange={(e) => {
                  setTenderedAmountStr(e.target.value);
                  setCashError(null);
                }}
                className="w-full px-4 py-3 bg-black/60 border-2 border-white/15 focus:border-amber-500 rounded-2xl text-xl font-bold text-white text-center focus:outline-none"
              />
            </div>

            {/* Quick Currency Shortcuts */}
            <div className="grid grid-cols-4 gap-2">
              {[10, 20, 50, 100, 200, 500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTenderedAmountStr(amt.toString())}
                  className="py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                >
                  ₹{amt}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTenderedAmountStr(activeRecord.amountTotal.toString())}
                className="col-span-2 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-xs font-bold text-amber-300 transition-colors cursor-pointer"
              >
                Exact (₹{activeRecord.amountTotal})
              </button>
            </div>

            {/* Change Due Calculation */}
            <div className="p-3.5 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-400">Customer Change Return:</span>
              <span className={`font-black text-sm ${changeDueCalc > 0 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                ₹{changeDueCalc.toFixed(2)}
              </span>
            </div>

            {cashError && (
              <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded-xl text-xs text-rose-300 font-semibold">
                {cashError}
              </div>
            )}

            <button
              onClick={handleConfirmCashCollection}
              disabled={isProcessing}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isProcessing ? 'Processing...' : 'Confirm Cash & Release Prints'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
