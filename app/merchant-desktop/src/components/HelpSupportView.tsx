import React, { useState, useEffect } from 'react';
import { BackendApiService } from '../services/backendApiService';
import {
  LifeBuoy,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Eye,
  FileCode2,
  Check,
  ChevronDown,
} from 'lucide-react';

export const HelpSupportView: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'CUSTOMER' | 'MERCHANT'>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Diagnostic Preview Modal
  const [diagnosticPreview, setDiagnosticPreview] = useState<any | null>(null);
  const [showDiagModal, setShowDiagModal] = useState(false);

  // Form State
  const [category, setCategory] = useState('PRINTER_NOT_CONNECTED');
  const [priority, setPriority] = useState('HIGH');
  const [description, setDescription] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [actualBehavior, setActualBehavior] = useState('');
  const [stepsTried, setStepsTried] = useState('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const data = await BackendApiService.getSupportTickets();
      setTickets(data || []);
    } catch (e) {
      console.warn('Failed to load tickets:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handlePreviewDiagnostics = async () => {
    try {
      const diag = await BackendApiService.previewDiagnostics();
      setDiagnosticPreview(diag);
      setShowDiagModal(true);
    } catch (e) {
      alert('Failed to preview diagnostics');
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (description.trim().length < 10) {
      setFormError('Description must be at least 10 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await BackendApiService.createMerchantSupportTicket({
        category,
        priority,
        description: description.trim(),
        expectedBehavior: expectedBehavior.trim() || undefined,
        actualBehavior: actualBehavior.trim() || undefined,
        stepsTried: stepsTried.trim() || undefined,
        includeDiagnostics,
      });

      setIsCreateModalOpen(false);
      setDescription('');
      setExpectedBehavior('');
      setActualBehavior('');
      setStepsTried('');
      loadTickets();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await BackendApiService.updateSupportTicketStatus(id, newStatus, `Updated to ${newStatus}`);
      loadTickets();
      if (selectedTicket?.id === id) {
        const updated = await BackendApiService.getSupportTicketById(id);
        setSelectedTicket(updated);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update ticket');
    }
  };

  const filtered = tickets.filter((t) => {
    const matchesSource = sourceFilter === 'ALL' || t.source === sourceFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      t.ticket_no.toLowerCase().includes(term) ||
      (t.category || '').toLowerCase().includes(term) ||
      (t.description || '').toLowerCase().includes(term) ||
      (t.customer_name || '').toLowerCase().includes(term);
    return matchesSource && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#18181C] border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <LifeBuoy className="w-4 h-4 text-[#D0BCFF]" />
            <span>Support Center & Product Improvement Hub</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Unified support tickets for customers and shop merchants. Diagnostics are strictly allowlisted and secret-redacted before submission.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadTickets}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
            title="Refresh tickets"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#D0BCFF] hover:bg-[#E8DEF8] text-[#381E72] font-bold text-xs transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Support Ticket</span>
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
            placeholder="Search tickets by ID, category, or customer..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#18181C] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#D0BCFF]"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {(['ALL', 'CUSTOMER', 'MERCHANT'] as const).map((src) => (
            <button
              key={src}
              onClick={() => setSourceFilter(src)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                sourceFilter === src
                  ? 'bg-[#D0BCFF]/20 text-[#D0BCFF] border border-[#D0BCFF]/40'
                  : 'bg-white/5 text-zinc-400 hover:text-white border border-white/5'
              }`}
            >
              {src === 'ALL' ? 'All Tickets' : `${src} Tickets`}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket List & Detail Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Tickets */}
        <div className="lg:col-span-6 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="p-8 text-center bg-[#18181C] border border-white/5 rounded-2xl">
              <CheckCircle2 className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
              <p className="text-xs text-zinc-400">No support tickets found.</p>
            </div>
          ) : (
            filtered.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  selectedTicket?.id === ticket.id
                    ? 'bg-[#202028] border-[#D0BCFF]/50 shadow-md'
                    : 'bg-[#18181C] border-white/5 hover:border-white/15'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-[#D0BCFF]">{ticket.ticket_no}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ticket.source === 'CUSTOMER' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {ticket.source}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : ticket.status === 'IN_PROGRESS'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-zinc-500/20 text-zinc-300'
                    }`}
                  >
                    {ticket.status}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-white truncate">{ticket.category?.replace(/_/g, ' ')}</h4>
                <p className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5">{ticket.description}</p>
              </div>
            ))
          )}
        </div>

        {/* Right Column: Active Ticket Inspector */}
        <div className="lg:col-span-6 bg-[#18181C] border border-white/10 rounded-2xl p-5 space-y-4">
          {selectedTicket ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <span className="font-mono font-bold text-sm text-[#D0BCFF]">{selectedTicket.ticket_no}</span>
                  <h3 className="text-sm font-bold text-white mt-0.5">{selectedTicket.category?.replace(/_/g, ' ')}</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  {selectedTicket.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedTicket.id, 'RESOLVED')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold transition-colors cursor-pointer border border-emerald-500/30"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-xs text-zinc-300">
                <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1.5">
                  <span className="text-[11px] font-semibold text-zinc-400 block">Issue Description:</span>
                  <p className="whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>

                {selectedTicket.steps_tried && (
                  <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                    <span className="text-[11px] font-semibold text-zinc-400 block mb-1">Steps Tried:</span>
                    <p className="text-zinc-300">{selectedTicket.steps_tried}</p>
                  </div>
                )}

                {selectedTicket.diagnostics_json && (
                  <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Redacted Diagnostics Included</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-zinc-500">
              Select a support ticket from the list to view timeline, logs, and status controls.
            </div>
          )}
        </div>
      </div>

      {/* Create Ticket Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#18181C] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white">Create Shop Owner Support Ticket</h3>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateTicket} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Issue Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#202024] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="PRINTER_NOT_CONNECTED">Hardware / Printer Not Connected</option>
                  <option value="PAYMENT_COMPLETED_JOB_MISSING">Payment Completed But Job Missing</option>
                  <option value="DOCUMENT_FAILED_PRINT">Document Spooling / Print Failure</option>
                  <option value="DASHBOARD_NOT_UPDATING">Merchant Dashboard Not Syncing</option>
                  <option value="PAGEKITE_TUNNEL_ISSUE">PageKite / Online Tunnel Problem</option>
                  <option value="NODE_BACKEND_CRASH">Backend Service Error / Crash</option>
                  <option value="OTHER">Other System Problem</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 bg-[#202024] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="HIGH">High (Store Operations Impacted)</option>
                  <option value="CRITICAL">Critical (Total Store Offline)</option>
                  <option value="MEDIUM">Medium (Minor Glitch)</option>
                  <option value="LOW">Low (Question / Suggestion)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Detailed Description <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue, error codes, or customer orders affected..."
                  rows={3}
                  required
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Steps Already Tried</label>
                <input
                  type="text"
                  value={stepsTried}
                  onChange={(e) => setStepsTried(e.target.value)}
                  placeholder="e.g. Restarted AutoPrint, replugged printer USB cable"
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>

              {/* Diagnostic Consent Checkbox with Preview */}
              <div className="p-3 bg-white/[0.03] border border-white/5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white">
                    <input
                      type="checkbox"
                      checked={includeDiagnostics}
                      onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                      className="rounded text-[#D0BCFF] focus:ring-0 cursor-pointer"
                    />
                    <span>Attach Safe System Diagnostics</span>
                  </label>
                  <button
                    type="button"
                    onClick={handlePreviewDiagnostics}
                    className="text-[11px] text-[#D0BCFF] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3 h-3" />
                    <span>View Diagnostic Consent Summary</span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400 pl-5">
                  Includes App version, Windows release, printer status, and sanitized error logs. All passwords and secrets are automatically redacted.
                </p>
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
                  {isSubmitting ? 'Logging Ticket...' : 'Send Support Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Diagnostic Consent Preview Modal */}
      {showDiagModal && diagnosticPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#18181C] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Diagnostic Information Summary</span>
              </h3>
              <button
                onClick={() => setShowDiagModal(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 text-xs text-zinc-300">
              <p className="text-[11px] text-zinc-400">
                The following non-sensitive information will be sent with your support ticket:
              </p>
              <div className="p-3 bg-black/40 rounded-xl space-y-1 font-mono text-[11px]">
                <div>✓ App Version: {diagnosticPreview.application?.version}</div>
                <div>✓ Windows Release: {diagnosticPreview.system?.osRelease} ({diagnosticPreview.system?.arch})</div>
                <div>✓ Node.js Version: {diagnosticPreview.application?.nodeVersion}</div>
                <div>✓ Database Status: {diagnosticPreview.database?.healthy ? 'Healthy (WAL)' : 'Degraded'}</div>
                <div>✓ Connected Printers: {diagnosticPreview.printers?.count} ({diagnosticPreview.printers?.names?.join(', ')})</div>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-zinc-400 block mb-1">Sanitized Recent Log Preview:</span>
                <div className="p-3 bg-black/60 rounded-xl max-h-36 overflow-y-auto font-mono text-[10px] text-zinc-400 space-y-0.5">
                  {diagnosticPreview.recentLogsPreview?.length > 0 ? (
                    diagnosticPreview.recentLogsPreview.map((log: string, idx: number) => (
                      <div key={idx} className="truncate">{log}</div>
                    ))
                  ) : (
                    <div className="italic text-zinc-600">No recent errors logged.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right pt-2">
              <button
                onClick={() => setShowDiagModal(false)}
                className="px-4 py-2 rounded-xl bg-[#D0BCFF] text-[#381E72] text-xs font-bold"
              >
                Done Reviewing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
