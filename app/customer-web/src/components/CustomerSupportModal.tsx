import React, { useState } from 'react';
import { usePrintJob } from '../context/PrintJobContext';
import { CustomerApiClient } from '../services/apiClient';
import {
  X,
  LifeBuoy,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const CustomerSupportModal: React.FC = () => {
  const { isSupportModalOpen, setSupportModalOpen, customerName, currentOrder } = usePrintJob();

  const [name, setName] = useState(customerName || '');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState(currentOrder?.collectionCode.replace(/\s+/g, '') || '');
  const [category, setCategory] = useState('PAYMENT_ISSUE');
  const [priority, setPriority] = useState('MEDIUM');
  const [description, setDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdTicket, setCreatedTicket] = useState<any | null>(null);

  if (!isSupportModalOpen) return null;

  const handleClose = () => {
    setSupportModalOpen(false);
    setErrorMessage(null);
    setCreatedTicket(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (description.trim().length < 10) {
      setErrorMessage('Please describe the problem in more detail (at least 10 characters).');
      return;
    }

    setIsSubmitting(true);
    try {
      const ticket = await CustomerApiClient.submitCustomerTicket({
        customerName: name.trim() || undefined,
        customerEmail: email.trim() || undefined,
        verificationCode: verificationCode.trim() || undefined,
        category,
        priority,
        description: description.trim(),
      });

      setCreatedTicket(ticket);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit support ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    { id: 'PAYMENT_COMPLETED_PRINT_MISSING', label: 'Paid but Print Job Missing' },
    { id: 'PAYMENT_ISSUE', label: 'Payment / UPI Failure' },
    { id: 'PRINT_QUALITY', label: 'Print Quality Issue' },
    { id: 'WRONG_PRINT_OUTPUT', label: 'Incorrect Document / Pages' },
    { id: 'DOCUMENT_UPLOAD', label: 'Document Upload Problem' },
    { id: 'CODE_VERIFICATION', label: '8-Digit Code Issue' },
    { id: 'COLLECTION_ISSUE', label: 'Store Handover Problem' },
    { id: 'OTHER', label: 'Other Issue' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-lg bg-[#18181C] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto"
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-2xl bg-[#D0BCFF]/15 text-[#D0BCFF] flex items-center justify-center border border-[#D0BCFF]/30 flex-shrink-0">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Customer Support & Help</h2>
              <p className="text-xs text-zinc-400">Report a printing issue, payment error, or request assistance</p>
            </div>
          </div>

          {createdTicket ? (
            <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-4 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <div>
                <h3 className="text-base font-bold text-white">Support Ticket Created!</h3>
                <p className="text-xs text-emerald-300 mt-1">
                  We have received your request and our support team has been notified.
                </p>
              </div>

              <div className="p-4 bg-black/40 border border-white/10 rounded-2xl text-left space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400">Ticket Number:</span>
                  <span className="font-mono font-bold text-[#D0BCFF]">{createdTicket.ticket_no}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400">Category:</span>
                  <span className="text-white font-medium">{createdTicket.category}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400">Status:</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-semibold">
                    {createdTicket.status}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Close Window
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-2.5 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">Your Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Rahul Patil"
                    maxLength={60}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#D0BCFF]/60"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    maxLength={100}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#D0BCFF]/60"
                  />
                </div>
              </div>

              {/* 8-Digit Code (Optional) */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  8-Digit Collection Code <span className="text-zinc-500 font-normal">(If order related)</span>
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="e.g. 12345678"
                  maxLength={10}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white font-mono tracking-wider placeholder-zinc-500 focus:outline-none focus:border-[#D0BCFF]/60"
                />
              </div>

              {/* Issue Category */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Problem Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#202024] border border-white/10 text-xs text-white focus:outline-none focus:border-[#D0BCFF]/60 cursor-pointer"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Detailed Description */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Detailed Description of the Issue <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe exactly what happened, whether money was deducted, or what error appeared..."
                  rows={4}
                  required
                  maxLength={2000}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#D0BCFF]/60"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-2xl bg-[#D0BCFF] hover:bg-[#E8DEF8] text-[#381E72] font-bold text-sm transition-all shadow-lg shadow-[#D0BCFF]/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting Ticket...' : 'Create Support Ticket'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
