import React, { useState } from 'react';
import { PrintJob } from '../types/printer';
import { BackendApiService } from '../services/backendApiService';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  RotateCcw,
  LifeBuoy,
  FileText,
  User,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

interface PaymentReconciliationViewProps {
  jobs: PrintJob[];
  onRefresh: () => void;
  onNavigateToSupport?: () => void;
  onNavigateToRefunds?: () => void;
}

export const PaymentReconciliationView: React.FC<PaymentReconciliationViewProps> = ({
  jobs,
  onRefresh,
  onNavigateToSupport,
  onNavigateToRefunds,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const reconciliationJobs = jobs.filter((j) => {
    const isFlagged = j.status === 'failed' || (j as any).status === 'PAYMENT_REVIEW_REQUIRED' || (j as any).status === 'payment_review_required';
    const isPaymentIssue = j.paymentStatus === 'FAILED' || j.paymentStatus === 'CASH_LOCKED';
    return isFlagged || isPaymentIssue;
  });

  const filtered = reconciliationJobs.filter((j) => {
    const term = searchTerm.toLowerCase();
    return (
      j.id.toLowerCase().includes(term) ||
      j.jobNo.toLowerCase().includes(term) ||
      (j.customerName || '').toLowerCase().includes(term) ||
      (j.formattedVerificationCode || '').toLowerCase().includes(term) ||
      (j.verificationCode || '').includes(term)
    );
  });

  const handleResolveToPaid = async (job: PrintJob) => {
    setIsProcessing(true);
    setActionMessage(null);
    try {
      await BackendApiService.updateJobStatus(job.id, 'QUEUED');
      if (job.verificationCode) {
        await BackendApiService.recordDigitalAttempt({
          verificationCode: job.verificationCode,
          status: 'SUCCESS',
          gatewayRef: `RECONCILED-${Date.now()}`,
        });
      }
      setActionMessage({ text: `Job #${job.jobNo} marked as PAID and moved to active print queue.`, type: 'success' });
      onRefresh();
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Failed to update job status.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold text-white">Payment Reconciliation & Recovery</h2>
          <p className="text-xs text-amber-200/80 mt-0.5">
            Surfaces print jobs with payment synchronization issues, gateway drops, or orphaned digital transactions. No customer payment is silently lost.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer border border-white/10"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {actionMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center gap-2 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
          }`}
        >
          {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer name, 8-digit code, or Job #..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#18181C] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#D0BCFF]"
          />
        </div>
        <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-zinc-400 font-semibold">
          Flagged: <span className="text-amber-400 font-bold">{reconciliationJobs.length}</span>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-[#18181C] border border-white/5 rounded-2xl space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-sm font-bold text-white">All Payments Balanced</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Zero orphaned or quarantined payment records detected. All customer orders are synchronized with the Merchant Desk.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((job) => (
            <div
              key={job.id}
              className="bg-[#18181C] border border-amber-500/20 hover:border-amber-500/40 rounded-2xl p-4 transition-all space-y-3 shadow-lg"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-sm text-[#D0BCFF]">{job.jobNo}</span>
                  <span className="text-xs text-zinc-400">•</span>
                  <span className="text-xs font-semibold text-white truncate max-w-xs">{job.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[11px] font-bold border border-amber-500/30">
                    REVIEW REQUIRED
                  </span>
                  <span className="text-xs font-mono font-bold text-white">₹{job.totalCost?.toFixed(2) || '0.00'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-zinc-400">
                <div>
                  <span className="block text-[11px] text-zinc-500">Customer Name</span>
                  <span className="font-semibold text-white">{job.customerName || 'Walk-In Customer'}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-zinc-500">Collection Code</span>
                  <span className="font-mono font-bold text-[#D0BCFF]">{job.formattedVerificationCode || job.verificationCode || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-zinc-500">Payment Status</span>
                  <span className="font-semibold text-rose-400">{job.paymentStatus || 'PENDING'}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-zinc-500">Submitted Time</span>
                  <span>{new Date(job.submittedAt).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Recovery Actions */}
              <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-end gap-2">
                {onNavigateToRefunds && (
                  <button
                    onClick={onNavigateToRefunds}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold transition-colors cursor-pointer border border-white/10"
                  >
                    Open Refund Review
                  </button>
                )}
                {onNavigateToSupport && (
                  <button
                    onClick={onNavigateToSupport}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold transition-colors cursor-pointer border border-white/10 flex items-center gap-1"
                  >
                    <LifeBuoy className="w-3.5 h-3.5" />
                    <span>Create Ticket</span>
                  </button>
                )}
                <button
                  onClick={() => handleResolveToPaid(job)}
                  disabled={isProcessing}
                  className="px-3.5 py-1.5 rounded-lg bg-[#D0BCFF] hover:bg-[#E8DEF8] text-[#381E72] text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1 shadow-md shadow-[#D0BCFF]/10"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark as Paid & Ready for Print</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
