import React, { useState, useEffect } from 'react';
import { PrintJob } from '../types/printer';
import { BackendApiService } from '../services/backendApiService';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Plus,
  RefreshCw,
  FileText,
  User,
  Clock,
  ShieldAlert,
} from 'lucide-react';

interface RefundManagementViewProps {
  jobs: PrintJob[];
  onRefreshJobs: () => void;
}

export const RefundManagementView: React.FC<RefundManagementViewProps> = ({ jobs, onRefreshJobs }) => {
  const [refunds, setRefunds] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Form State
  const [selectedJobId, setSelectedJobId] = useState(jobs[0]?.id || '');
  const [reasonCategory, setReasonCategory] = useState('PRINTER_JAM_DEFECT');
  const [detailedExplanation, setDetailedExplanation] = useState('');
  const [staffName, setStaffName] = useState('Front Desk Staff');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRefunds = async () => {
    setIsLoading(true);
    try {
      const data = await BackendApiService.getRefunds();
      setRefunds(data || []);
    } catch (e) {
      console.warn('Failed to load refunds:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRefunds();
  }, []);

  const handleCreateRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (detailedExplanation.trim().length < 15) {
      setFormError('Detailed explanation is mandatory and must be at least 15 characters. Explain what was checked and why a refund is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await BackendApiService.createRefund({
        jobId: selectedJobId,
        reason: reasonCategory,
        detailedExplanation: detailedExplanation.trim(),
        staffName: staffName.trim(),
      });
      setIsCreateModalOpen(false);
      setDetailedExplanation('');
      loadRefunds();
      onRefreshJobs();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit refund request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await BackendApiService.updateRefundStatus({
        id,
        status: newStatus,
        staffName,
        reviewNotes: `Status updated to ${newStatus} by ${staffName}`,
      });
      loadRefunds();
      onRefreshJobs();
    } catch (err: any) {
      alert(err.message || 'Failed to update refund status');
    }
  };

  const filteredRefunds = refunds.filter((r) => {
    const matchesFilter = statusFilter === 'ALL' || r.status === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      r.id.toLowerCase().includes(term) ||
      (r.customer_name || '').toLowerCase().includes(term) ||
      (r.verification_code || '').includes(term) ||
      (r.reason || '').toLowerCase().includes(term);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Policy & Control Header */}
      <div className="bg-[#18181C] border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-[#D0BCFF]" />
            <span>Refund Review & Audit Management</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            AutoPrint Policy: Completed print jobs are normally non-refundable. Refunds are restricted to hardware printer jams, blank/corrupted pages, or duplicate payments with mandatory audit explanations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadRefunds}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
            title="Refresh refunds"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#D0BCFF] hover:bg-[#E8DEF8] text-[#381E72] font-bold text-xs transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Request Refund Review</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search refunds by code, customer, or reason..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#18181C] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#D0BCFF]"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['ALL', 'REFUND_REQUESTED', 'REFUND_UNDER_REVIEW', 'REFUNDED', 'REFUND_REJECTED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === status
                  ? 'bg-[#D0BCFF]/20 text-[#D0BCFF] border border-[#D0BCFF]/40'
                  : 'bg-white/5 text-zinc-400 hover:text-white border border-white/5'
              }`}
            >
              {status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Refunds List */}
      {filteredRefunds.length === 0 ? (
        <div className="p-12 text-center bg-[#18181C] border border-white/5 rounded-2xl space-y-2">
          <CheckCircle2 className="w-8 h-8 text-zinc-500 mx-auto" />
          <p className="text-xs text-zinc-400 font-medium">No refund review records found matching your filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredRefunds.map((refund) => (
            <div
              key={refund.id}
              className="bg-[#18181C] border border-white/10 rounded-2xl p-4 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-[#D0BCFF]">{refund.id}</span>
                  <span className="text-xs text-zinc-400">•</span>
                  <span className="text-xs font-semibold text-white">{refund.reason?.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      refund.status === 'REFUNDED'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : refund.status === 'REFUND_REJECTED'
                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {refund.status?.replace(/_/g, ' ')}
                  </span>
                  <span className="font-mono text-xs font-bold text-white">₹{(refund.amount_minor_units / 100).toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-zinc-400">
                <div>
                  <span className="text-[11px] text-zinc-500 block">Customer</span>
                  <span className="font-semibold text-white">{refund.customer_name}</span>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-500 block">Collection Code</span>
                  <span className="font-mono font-bold text-[#D0BCFF]">{refund.verification_code}</span>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-500 block">Requested By</span>
                  <span>{refund.requested_by}</span>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-500 block">Timestamp</span>
                  <span>{new Date(refund.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="p-3 bg-black/40 rounded-xl border border-white/5 text-xs text-zinc-300">
                <span className="text-[11px] font-semibold text-zinc-400 block mb-1">Mandatory Explanation:</span>
                <p className="italic">{refund.detailed_explanation}</p>
              </div>

              {/* Status Actions */}
              {refund.status !== 'REFUNDED' && refund.status !== 'REFUND_REJECTED' && (
                <div className="pt-2 border-t border-white/5 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleUpdateStatus(refund.id, 'REFUND_REJECTED')}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold transition-colors cursor-pointer border border-rose-500/30"
                  >
                    Reject Refund
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(refund.id, 'REFUNDED')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold transition-colors cursor-pointer border border-emerald-500/30"
                  >
                    Approve & Complete Refund
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Refund Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#18181C] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Create Refund Review Application</h3>
            <p className="text-xs text-zinc-400">
              Please document the technical or physical reason for requesting a refund.
            </p>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateRefund} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Select Affected Print Job</label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#202024] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                >
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      #{j.jobNo} — {j.customerName || 'Walk-In'} — ₹{j.totalCost?.toFixed(2)} ({j.title})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Refund Reason Category</label>
                <select
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#202024] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="PRINTER_JAM_DEFECT">Physical Printer Jam / Toner Defect</option>
                  <option value="BLANK_CORRUPTED_PAGES">Blank or Corrupted Output</option>
                  <option value="DUPLICATE_PAYMENT">Duplicate Digital Payment Captured</option>
                  <option value="PAYMENT_COMPLETED_JOB_FAILED">Payment Succeeded but Spooler Unrecoverable</option>
                  <option value="OTHER_MAJOR_ISSUE">Other Significant Service Issue</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  What happened? <span className="text-rose-400">* (Mandatory multiline explanation)</span>
                </label>
                <textarea
                  value={detailedExplanation}
                  onChange={(e) => setDetailedExplanation(e.target.value)}
                  placeholder="Explain what was checked, the printer state, and why a refund is required..."
                  rows={4}
                  required
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#D0BCFF]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#D0BCFF] hover:bg-[#E8DEF8] text-[#381E72] font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Refund Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
