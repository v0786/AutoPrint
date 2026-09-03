import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  DollarSign,
  ShieldCheck,
  Printer,
  Receipt,
  Download,
  RefreshCw,
  Eye,
  FileText,
  User,
  Phone,
  Calendar,
  X,
  AlertCircle,
} from 'lucide-react';
import { verificationService } from '../services/verificationService';
import { CollectionVerificationRecord, VerificationAuditLog } from '../types/verification';

export const ActivityHistoryView: React.FC = () => {
  const [records, setRecords] = useState<CollectionVerificationRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'HANDED_OVER' | 'PAID' | 'CASH_PENDING' | 'CANCELLED'>('ALL');
  const [selectedRecord, setSelectedRecord] = useState<CollectionVerificationRecord | null>(null);
  const [auditLogs, setAuditLogs] = useState<VerificationAuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshHistory = () => {
    setLoading(true);
    verificationService.syncFromBackend().finally(() => {
      setRecords(verificationService.getAllRecords() || []);
      setAuditLogs(verificationService.getAuditLogs() || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    refreshHistory();

    const unsub = verificationService.subscribe((updated) => {
      setRecords(updated || []);
    });

    return () => unsub();
  }, []);

  const filteredRecords = (records || []).filter((r) => {
    if (!r) return false;
    const q = searchQuery.toLowerCase().trim();
    const code = r.verificationCode || '';
    const formatted = r.formattedCode || '';
    const customer = r.customerName || '';
    const jNo = r.jobNo || '';
    const jTitle = r.jobTitle || '';

    const matchesQuery =
      !q ||
      code.toLowerCase().includes(q) ||
      formatted.toLowerCase().includes(q) ||
      customer.toLowerCase().includes(q) ||
      jNo.toLowerCase().includes(q) ||
      jTitle.toLowerCase().includes(q);

    if (!matchesQuery) return false;

    if (statusFilter === 'HANDED_OVER') return r.handoverStatus === 'HANDED_OVER' || r.handoverStatus === 'COLLECTED';
    if (statusFilter === 'PAID') return r.paymentStatus === 'UPI_SUCCESS' || r.paymentStatus === 'CASH_COLLECTED';
    if (statusFilter === 'CASH_PENDING') return r.paymentStatus === 'CASH_REQUIRED' || r.paymentStatus === 'CASH_LOCKED';
    if (statusFilter === 'CANCELLED') return r.handoverStatus === 'CANCELLED';

    return true;
  });

  const recordAuditLogs = selectedRecord
    ? (auditLogs || []).filter((l) => l && l.verificationCode === selectedRecord.verificationCode)
    : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1e1f26] p-6 rounded-3xl border border-white/10 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">Activity & Order History</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Audit Trail
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Search verified pickups, cash collections, and document handover logs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refreshHistory}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white font-bold text-xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            <span>Refresh Roster</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#141419] p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Code (e.g. 1234 5678), Order #, Customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(
            [
              { id: 'ALL', label: 'All Orders' },
              { id: 'HANDED_OVER', label: 'Handed Over' },
              { id: 'PAID', label: 'Paid Orders' },
              { id: 'CASH_PENDING', label: 'Cash Pending' },
              { id: 'CANCELLED', label: 'Cancelled' },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === filter.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* High-Density Compact Table */}
      <div className="bg-[#141419] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-[#1e1f26]/80 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="py-3.5 px-5">Pickup Code</th>
                <th className="py-3.5 px-5">Job / Order #</th>
                <th className="py-3.5 px-5">Customer</th>
                <th className="py-3.5 px-5">Document Specs</th>
                <th className="py-3.5 px-5">Amount</th>
                <th className="py-3.5 px-5">Payment Status</th>
                <th className="py-3.5 px-5">Handover Status</th>
                <th className="py-3.5 px-5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-30 text-zinc-400" />
                    <p className="font-semibold text-zinc-400">No matching order history records found</p>
                    <p className="text-[11px] text-zinc-600 mt-0.5">Try searching with a different keyword or filter.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const isHandedOver = record.handoverStatus === 'HANDED_OVER';
                  const isPaid = record.paymentStatus === 'UPI_SUCCESS' || record.paymentStatus === 'CASH_COLLECTED';
                  const amount = typeof record.amountTotal === 'number' ? record.amountTotal : 0;

                  return (
                    <tr key={record.verificationCode} className="hover:bg-white/[0.02] transition-colors">
                      {/* Code */}
                      <td className="py-3.5 px-5">
                        <span className="font-mono font-bold text-purple-300 bg-purple-950/40 px-2 py-1 rounded-lg border border-purple-500/30 text-xs">
                          {record.formattedCode}
                        </span>
                      </td>

                      {/* Job # */}
                      <td className="py-3.5 px-5 font-mono font-bold text-white">
                        {record.jobNo}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-white truncate max-w-[140px]">
                          {record.customerName}
                        </div>
                      </td>

                      {/* Specs */}
                      <td className="py-3.5 px-5">
                        <div className="truncate max-w-[160px] text-zinc-200 font-medium">
                          {record.jobTitle || 'Print Document'}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {record.printerName || 'Spooler'}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-5 font-bold text-white">
                        ₹{amount.toFixed(2)}
                      </td>

                      {/* Payment */}
                      <td className="py-3.5 px-5">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            {record.paymentStatus === 'CASH_COLLECTED' ? 'Cash Paid' : 'UPI Paid'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <DollarSign className="w-3 h-3 text-amber-400" />
                            Cash Pending
                          </span>
                        )}
                      </td>

                      {/* Handover */}
                      <td className="py-3.5 px-5">
                        {isHandedOver ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            <ShieldCheck className="w-3 h-3 text-purple-400" />
                            Handed Over
                          </span>
                        ) : record.handoverStatus === 'CANCELLED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-zinc-800 text-zinc-400">
                            Cancelled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/15 text-blue-300 border border-blue-500/30">
                            <Clock className="w-3 h-3 text-blue-400" />
                            Ready in Tray
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => setSelectedRecord(record)}
                          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                          title="View order audit details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ORDER AUDIT DETAIL MODAL */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
          <div className="w-full max-w-xl bg-[#141419] rounded-3xl p-6 sm:p-7 border border-white/10 shadow-2xl space-y-5 text-white animate-scale-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/30 font-mono font-black text-sm">
                  {selectedRecord.jobNo}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Order & Handover Audit</h3>
                  <p className="text-[11px] text-zinc-400">Code: {selectedRecord.formattedCode}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                <div className="text-[10px] text-zinc-400">Customer</div>
                <div className="font-bold text-white mt-0.5 truncate">{selectedRecord.customerName}</div>
              </div>
              <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                <div className="text-[10px] text-zinc-400">Total Price</div>
                <div className="font-bold text-emerald-400 mt-0.5">₹{(selectedRecord.amountTotal || 0).toFixed(2)}</div>
              </div>
              <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                <div className="text-[10px] text-zinc-400">Payment</div>
                <div className="font-bold text-white mt-0.5">{selectedRecord.paymentStatus}</div>
              </div>
              <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                <div className="text-[10px] text-zinc-400">Handover</div>
                <div className="font-bold text-white mt-0.5">{selectedRecord.handoverStatus}</div>
              </div>
            </div>

            {/* Audit Logs Trail */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider text-[10px]">
                Event Timeline & Chain of Custody:
              </h4>
              <div className="p-3 bg-black/40 rounded-2xl border border-white/5 max-h-48 overflow-y-auto space-y-2 text-xs">
                {recordAuditLogs.length === 0 ? (
                  <div className="text-center py-4 text-zinc-500 text-xs">
                    No specific audit events logged for this order.
                  </div>
                ) : (
                  recordAuditLogs.map((log) => (
                    <div key={log.id} className="flex items-start justify-between text-[11px] border-b border-white/5 pb-1.5 last:border-0 last:pb-0">
                      <div>
                        <div className="font-semibold text-zinc-200">{(log.action || '').replace(/_/g, ' ')}</div>
                        <div className="text-[10px] text-zinc-500">
                          Actor: {log.actor} {log.staffName ? `(${log.staffName})` : ''}
                        </div>
                      </div>
                      <div className="text-zinc-400 font-mono text-[10px]">
                        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '—'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedRecord(null)}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                Close Order Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
