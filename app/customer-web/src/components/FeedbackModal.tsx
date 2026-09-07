import React, { useState } from 'react';
import { usePrintJob } from '../context/PrintJobContext';
import { CustomerApiClient } from '../services/apiClient';
import {
  X,
  Star,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ThumbsUp,
  HelpCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const FeedbackModal: React.FC = () => {
  const { isFeedbackModalOpen, setFeedbackModalOpen, currentOrder } = usePrintJob();

  const [verificationCode, setVerificationCode] = useState(currentOrder?.collectionCode.replace(/\s+/g, '') || '');
  const [ratingOverall, setRatingOverall] = useState(5);
  const [ratingQuality, setRatingQuality] = useState(5);
  const [ratingService, setRatingService] = useState(5);
  const [ratingEase, setRatingEase] = useState(5);
  const [category, setCategory] = useState<string>('POSITIVE');
  const [comment, setComment] = useState('');
  const [improvementSuggestion, setImprovementSuggestion] = useState('');

  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isFeedbackModalOpen) return null;

  const handleClose = () => {
    setFeedbackModalOpen(false);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const sanitizedCode = verificationCode.replace(/[\s\-_]/g, '').trim();
    if (!/^\d{8}$/.test(sanitizedCode)) {
      setErrorMessage('Please enter a valid 8-digit collection code.');
      return;
    }

    setIsSubmitting(true);
    try {
      await CustomerApiClient.submitFeedback({
        verificationCode: sanitizedCode,
        ratingOverall,
        ratingQuality,
        ratingService,
        ratingEase,
        category,
        comment: comment.trim() || undefined,
        improvementSuggestion: improvementSuggestion.trim() || undefined,
      });

      setSuccessMessage('Thank you! Your feedback and product improvement suggestions have been submitted successfully.');
      setTimeout(() => {
        handleClose();
      }, 2500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit feedback. Ensure your prints have been collected from the counter.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
  }) => (
    <div className="flex items-center justify-between py-2 border-b border-white/5">
      <span className="text-xs text-zinc-300 font-medium">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 text-zinc-600 hover:text-amber-400 transition-colors focus:outline-none cursor-pointer"
          >
            <Star
              className={`w-5 h-5 ${
                star <= value
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-zinc-600'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  const categories = [
    { id: 'POSITIVE', label: 'Positive Experience' },
    { id: 'PRINT_QUALITY', label: 'Print Quality' },
    { id: 'WEBSITE_EXPERIENCE', label: 'Website Experience' },
    { id: 'PAYMENT_EXPERIENCE', label: 'Payment Flow' },
    { id: 'MERCHANT_EXPERIENCE', label: 'Store Service' },
    { id: 'BUG_REPORT', label: 'Bug Report' },
    { id: 'FEATURE_REQUEST', label: 'Feature Request' },
    { id: 'OTHER', label: 'Other' },
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
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Customer Feedback & Insights</h2>
              <p className="text-xs text-zinc-400">Help us continuously improve the AutoPrint service</p>
            </div>
          </div>

          {successMessage ? (
            <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">Feedback Received!</h3>
              <p className="text-xs text-emerald-300">{successMessage}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-2.5 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* 8-Digit Code Input */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  8-Digit Collection Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="e.g. 12345678"
                  maxLength={10}
                  required
                  className="w-full px-4 py-2.5 rounded-2xl bg-black/40 border border-white/10 text-sm text-white placeholder-zinc-500 tracking-widest font-mono focus:outline-none focus:border-[#D0BCFF]/60"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Found on your order confirmation ticket. Available after document pickup.
                </p>
              </div>

              {/* Star Ratings */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 space-y-1">
                <StarRating label="Overall Rating" value={ratingOverall} onChange={setRatingOverall} />
                <StarRating label="Print Quality" value={ratingQuality} onChange={setRatingQuality} />
                <StarRating label="Service Experience" value={ratingService} onChange={setRatingService} />
                <StarRating label="Ease of Ordering" value={ratingEase} onChange={setRatingEase} />
              </div>

              {/* Category Chips */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Feedback Category
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                        category === cat.id
                          ? 'bg-[#D0BCFF] text-black font-semibold'
                          : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Multiline Improvement Box */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  What should we improve? <span className="text-zinc-500 font-normal">(Product suggestions)</span>
                </label>
                <textarea
                  value={improvementSuggestion}
                  onChange={(e) => setImprovementSuggestion(e.target.value)}
                  placeholder="Tell us what features or changes would make AutoPrint better for you..."
                  rows={3}
                  maxLength={2000}
                  className="w-full px-4 py-2.5 rounded-2xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#D0BCFF]/60"
                />
              </div>

              {/* Optional Comment */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Additional Comments
                </label>
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Optional note about your order..."
                  maxLength={500}
                  className="w-full px-4 py-2 rounded-2xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#D0BCFF]/60"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-2xl bg-[#D0BCFF] hover:bg-[#E8DEF8] text-[#381E72] font-bold text-sm transition-all shadow-lg shadow-[#D0BCFF]/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting Feedback...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
