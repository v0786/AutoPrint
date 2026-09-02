'use client';
import React, { useState } from 'react';
import { CustomerInfo, PaymentMethod, PricingBreakdown, UploadedFileItem } from '../../types';
import { usePrintJob } from '../../context/PrintJobContext';
import { CreditCard, QrCode, Smartphone, Banknote, X, ShieldCheck, Loader2, CheckCircle2, Phone, Mail, User, Bell } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  pricing: PricingBreakdown;
  files: UploadedFileItem[];
  onPaymentSuccess: (customer: CustomerInfo, paymentMethod: PaymentMethod, transactionId: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  pricing,
  files,
  onPaymentSuccess,
}) => {
  const { pricingSettings } = usePrintJob();
  const sym = pricingSettings.currency || '$';

  const [customer, setCustomer] = useState<CustomerInfo>({
    name: '',
    phone: '',
    email: '',
    notifyVia: 'whatsapp',
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'form' | 'transferring' | 'done'>('form');
  const [transferProgress, setTransferProgress] = useState(0);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  if (!isOpen) return null;

  const validate = () => {
    const errs: { name?: string; phone?: string } = {};
    if (!customer.name.trim()) errs.name = 'Full name is required for order pickup';
    if (!customer.phone.trim()) errs.phone = 'Phone number is required for collection notification';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePay = () => {
    if (!validate()) return;

    setIsProcessing(true);
    setStep('transferring');

    let progress = 10;
    const transferInterval = setInterval(() => {
      progress += Math.floor(Math.random() * 20) + 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(transferInterval);
        setTransferProgress(100);

        setTimeout(() => {
          const txnId = paymentMethod === 'cash_counter'
            ? `CASH-${Math.floor(1000 + Math.random() * 9000)}`
            : `TXN-${Math.floor(100000 + Math.random() * 900000)}-LOC`;

          setIsProcessing(false);
          setStep('done');
          onPaymentSuccess(customer, paymentMethod, txnId);
        }, 600);
      } else {
        setTransferProgress(progress);
      }
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 relative overflow-hidden">

        {step === 'form' && (
          <>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Checkout & Direct Transfer
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Amount: <span className="font-bold text-slate-800 dark:text-slate-200">{sym}{pricing.total.toFixed(2)}</span> ({files.length} document(s))
                </p>
              </div>
              <button
                type="button"
                id="close-payment-modal"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 my-4 max-h-[65vh] overflow-y-auto pr-1">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Pickup & Notification Details
                </p>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Your Name</span>
                  </label>
                  <input
                    type="text"
                    id="cust-name-input"
                    value={customer.name}
                    onChange={(e) => {
                      setCustomer({ ...customer, name: e.target.value });
                      if (errors.name) setErrors({ ...errors, name: undefined });
                    }}
                    placeholder="e.g. Alex Morgan"
                    className={`w-full h-10 px-3 text-xs rounded-lg border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 ${
                      errors.name ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300 dark:border-slate-600 focus:border-indigo-500'
                    }`}
                  />
                  {errors.name && <p className="text-[11px] text-red-500 mt-0.5">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Mobile Phone Number</span>
                  </label>
                  <input
                    type="tel"
                    id="cust-phone-input"
                    value={customer.phone}
                    onChange={(e) => {
                      setCustomer({ ...customer, phone: e.target.value });
                      if (errors.phone) setErrors({ ...errors, phone: undefined });
                    }}
                    placeholder="e.g. +1 (555) 019-2831"
                    className={`w-full h-10 px-3 text-xs rounded-lg border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 ${
                      errors.phone ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300 dark:border-slate-600 focus:border-indigo-500'
                    }`}
                  />
                  {errors.phone && <p className="text-[11px] text-red-500 mt-0.5">{errors.phone}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Bell className="w-3.5 h-3.5 text-slate-400" />
                    <span>Notify When Ready</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['whatsapp', 'sms', 'none'] as const).map((channel) => (
                      <button
                        key={channel}
                        type="button"
                        id={`notify-${channel}`}
                        onClick={() => setCustomer({ ...customer, notifyVia: channel })}
                        className={`py-2 px-2 text-xs font-medium rounded-lg border capitalize text-center ${
                          customer.notifyVia === channel
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {channel === 'whatsapp' ? 'WhatsApp' : channel === 'sms' ? 'SMS Text' : 'No Alert'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Select Payment Method
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    id="pay-method-card"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      paymentMethod === 'card'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Credit / Debit</p>
                      <p className="text-[10px] text-slate-500">Stripe / Online</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    id="pay-method-upi"
                    onClick={() => setPaymentMethod('upi_qr')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      paymentMethod === 'upi_qr'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">UPI / QR Pay</p>
                      <p className="text-[10px] text-slate-500">Scan & Pay Instant</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    id="pay-method-applepay"
                    onClick={() => setPaymentMethod('apple_google_pay')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      paymentMethod === 'apple_google_pay'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Apple / G-Pay</p>
                      <p className="text-[10px] text-slate-500">1-Touch Express</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    id="pay-method-cash"
                    onClick={() => setPaymentMethod('cash_counter')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      paymentMethod === 'cash_counter'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <Banknote className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Pay at Counter</p>
                      <p className="text-[10px] text-slate-500">Cash on Collection</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-500">Total Charged</p>
                <p className="text-xl font-black text-slate-900 dark:text-white">
                  {sym}{pricing.total.toFixed(2)}
                </p>
              </div>

              <button
                type="button"
                id="submit-payment-btn"
                onClick={handlePay}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition-all"
              >
                <span>Confirm & Send to Store PC</span>
                <span>→</span>
              </button>
            </div>
          </>
        )}

        {step === 'transferring' && (
          <div className="py-8 px-2 text-center space-y-5">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-950/80 animate-pulse"></div>
              <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Transmitting Directly to Local Machine...
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                Opening TLS stream to store print host at <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-[11px]">192.168.1.10:3000</code>. No cloud intermediaries.
              </p>
            </div>

            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${transferProgress}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>AES-256 Memory Spooling Active • {transferProgress}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
