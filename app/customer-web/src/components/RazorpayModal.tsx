import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Lock, ShieldCheck, X } from 'lucide-react';
import { usePrintJob } from '../context/PrintJobContext';
import { CustomerApiClient } from '../services/apiClient';

interface RazorpayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (payment: { paymentId: string; orderId: string; signature: string }) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: 'payment.failed', handler: (response: { error?: { description?: string } }) => void) => void;
    };
  }
}

const checkoutScript = 'https://checkout.razorpay.com/v1/checkout.js';

function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${checkoutScript}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Razorpay Checkout could not be loaded.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = checkoutScript;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Razorpay Checkout could not be loaded.'));
    document.body.appendChild(script);
  });
}

export const RazorpayModal: React.FC<RazorpayModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { currentShop, pricing, customerName } = usePrintJob();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setLoading(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const startCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const order = await CustomerApiClient.createRazorpayOrder({
        amount: Math.round(pricing.totalAmount * 100),
        currency: 'INR',
        receipt: `autoprint_${Date.now()}`,
      });
      await loadCheckoutScript();
      if (!window.Razorpay) throw new Error('Razorpay Checkout is unavailable in this browser.');

      const checkout = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: currentShop?.name || 'AutoPrint',
        description: 'AutoPrint document printing',
        order_id: order.order_id,
        prefill: { name: customerName || '', email: '', contact: '' },
        theme: { color: '#2563eb' },
        handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          onSuccess({
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            signature: response.razorpay_signature,
          });
          setLoading(false);
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });
      checkout.on('payment.failed', (response) => {
        setLoading(false);
        setError(response.error?.description || 'Razorpay payment failed. No print job was marked as paid.');
      });
      checkout.open();
    } catch (checkoutError) {
      setLoading(false);
      setError(checkoutError instanceof Error ? checkoutError.message : 'Unable to start Razorpay Checkout.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md rounded-3xl border border-blue-400/30 bg-[#10141c] p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-300"><ShieldCheck className="h-5 w-5" /><span className="font-bold">Secure Razorpay Checkout</span></div>
            <p className="mt-2 text-sm text-zinc-400">You will complete payment in Razorpay's secure payment window.</p>
          </div>
          <button type="button" onClick={onClose} disabled={loading} aria-label="Close payment dialog" className="rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-50"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
          <span className="text-sm text-zinc-400">Amount due</span>
          <span className="font-mono text-2xl font-black">₹{pricing.totalAmount.toFixed(2)}</span>
        </div>
        {error && <div className="mt-4 flex gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}
        <button type="button" onClick={startCheckout} disabled={loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60">
          {loading ? <><Loader2 className="h-5 w-5 animate-spin" />Opening checkout...</> : <><Lock className="h-4 w-4" />Pay securely</>}
        </button>
        <p className="mt-4 text-center text-[11px] text-zinc-500">Payment is verified by AutoPrint before the print job is dispatched.</p>
      </div>
    </div>
  );
};
