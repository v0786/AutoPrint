import React, { useState } from 'react';
import {
  X,
  Printer,
  Receipt,
  Tag,
  FileSpreadsheet,
  FileText,
  Sparkles,
  Zap,
} from 'lucide-react';
import { PrinterDevice, JobPriority, DocumentType, PrintJob } from '../types/printer';

interface QuickNewJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  printers: PrinterDevice[];
  onSubmitJob: (jobData: any) => Promise<PrintJob>;
}

export const QuickNewJobModal: React.FC<QuickNewJobModalProps> = ({
  isOpen,
  onClose,
  printers,
  onSubmitJob,
}) => {
  if (!isOpen) return null;

  const [docType, setDocType] = useState<DocumentType>('receipt');
  const [targetPrinterId, setTargetPrinterId] = useState<string>(
    printers[0]?.id || 'printer-pos-80'
  );
  const [priority, setPriority] = useState<JobPriority>('high');
  const [copies, setCopies] = useState<number>(1);
  const [customerName, setCustomerName] = useState<string>('Walk-in Customer');
  const [totalAmount, setTotalAmount] = useState<number>(24.5);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const targetPrinter = printers.find((p) => p.id === targetPrinterId) || printers[0];

    try {
      let content: any = {};
      let title = '';

      if (docType === 'receipt') {
        title = `Quick AutoPrint Receipt - ${customerName}`;
        content = {
          receiptData: {
            merchantName: 'BLUE HARBOR ARTISAN ROASTERY',
            storeAddress: '742 Evergreen Terrace, Seattle, WA',
            phone: '(206) 555-0194',
            cashier: 'Express Station',
            orderNumber: `ORD-${Math.floor(Math.random() * 9000 + 1000)}`,
            orderType: 'Takeout',
            date: new Date().toLocaleString(),
            items: [
              { id: '1', name: 'Artisan Espresso / Specialty Pour', qty: 2, unitPrice: +(totalAmount / 2).toFixed(2) },
            ],
            subtotal: +(totalAmount * 0.9).toFixed(2),
            tax: +(totalAmount * 0.1).toFixed(2),
            total: totalAmount,
            paymentMethod: 'Contactless Tap',
            barcodeValue: 'BH-QUICK',
            footerMessage: 'Thank you for your business!',
            autoCut: true,
            openDrawer: true,
          },
        };
      } else if (docType === 'label') {
        title = `Quick 4x6 Label - ${customerName}`;
        content = {
          labelData: {
            itemTitle: 'Merchant Express Order Package',
            sku: 'SKU-EXPRESS-01',
            trackingNumber: `9400 1000 ${Math.floor(Math.random() * 9000 + 1000)} 0000 01`,
            sender: {
              name: 'Dispatch Central',
              street: '1200 Industrial Way',
              cityStateZip: 'Seattle, WA 98134',
            },
            recipient: {
              name: customerName,
              street: '450 University Ave',
              cityStateZip: 'Seattle, WA 98105',
            },
            weightLbs: 2.4,
            fragile: false,
          },
        };
      } else {
        title = `Direct Print Request - ${customerName}`;
        content = {
          reportData: {
            title: 'MERCHANT QUICK TICKET',
            period: 'Instant Spool',
            merchantName: 'Blue Harbor Roastery',
            summaryMetrics: [{ label: 'Order Total', value: `$${totalAmount}` }],
            breakdown: [{ category: customerName, count: 1, volume: `$${totalAmount}` }],
            generatedAt: new Date().toLocaleString(),
            generatedBy: 'AutoPrint Terminal',
          },
        };
      }

      await onSubmitJob({
        title,
        documentType: docType,
        printerId: targetPrinter.id,
        printerName: targetPrinter.displayName,
        priority,
        copies,
        totalPages: 1,
        bytesTotal: 4200,
        content,
        silentPrint: true,
      });

      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Fast Print Dispatch</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Submit an instant job to the local spooler queue
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Document Type Selector */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">
              Document Preset
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'receipt', label: 'Receipt (80mm)', icon: Receipt },
                { id: 'label', label: 'Label (4x6)', icon: Tag },
                { id: 'invoice', label: 'Report / Invoice', icon: FileSpreadsheet },
              ].map((t) => {
                const Icon = t.icon;
                const active = docType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDocType(t.id as any)}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      active
                        ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Customer / Order reference */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Customer / Reference
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Amount ($)
              </label>
              <input
                type="number"
                step="0.5"
                value={totalAmount}
                onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Printer Target & Priority */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Target Printer
              </label>
              <select
                value={targetPrinterId}
                onChange={(e) => setTargetPrinterId(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                {printers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName} ({p.paperFormat})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Queue Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="rush">⚡ Rush Priority</option>
                <option value="high">High Priority</option>
                <option value="normal">Normal</option>
              </select>
            </div>
          </div>

          {/* Submit buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs shadow-emerald-700/20 transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98]"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>{isSubmitting ? 'Spooling...' : 'Dispatch to Spooler'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
