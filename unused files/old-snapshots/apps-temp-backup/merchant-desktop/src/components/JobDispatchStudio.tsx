import React, { useState } from 'react';
import {
  PrinterDevice,
  PrintJob,
  ReceiptData,
  LabelData,
  InvoiceData,
  JobPriority,
  DocumentType,
} from '../types/printer';
import {
  Receipt,
  Tag,
  FileSpreadsheet,
  FileText,
  FileCode,
  Plus,
  Trash2,
  Printer,
  Sparkles,
  Zap,
  Scissors,
  CheckCircle2,
  ArrowRight,
  Upload,
} from 'lucide-react';
import {
  renderReceiptHtml,
  renderLabelHtml,
  renderInvoiceHtml,
  renderReportHtml,
} from '../utils/documentTemplates';

interface JobDispatchStudioProps {
  printers: PrinterDevice[];
  onSubmitJob: (jobData: any) => Promise<PrintJob>;
  onPreviewHtml: (title: string, html: string, docType: DocumentType) => void;
  defaultPrinterId?: string;
}

export const JobDispatchStudio: React.FC<JobDispatchStudioProps> = ({
  printers,
  onSubmitJob,
  onPreviewHtml,
  defaultPrinterId,
}) => {
  const [activeTab, setActiveTab] = useState<'receipt' | 'label' | 'invoice' | 'report' | 'raw'>('receipt');
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>(
    defaultPrinterId || printers[0]?.id || 'printer-pos-80'
  );
  const [priority, setPriority] = useState<JobPriority>('high');
  const [copies, setCopies] = useState<number>(1);
  const [silentPrint, setSilentPrint] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // 1. POS Receipt State
  const [receiptData, setReceiptData] = useState<ReceiptData>({
    merchantName: 'BLUE HARBOR ARTISAN ROASTERY',
    storeAddress: '742 Evergreen Terrace, Seattle, WA',
    phone: '(206) 555-0194',
    taxId: 'WA-992019-A',
    cashier: 'Alex M.',
    registerId: 'REG-01',
    orderNumber: `ORD-${Math.floor(Math.random() * 9000 + 1000)}`,
    orderType: 'Dine-In',
    date: new Date().toLocaleString(),
    items: [
      { id: '1', name: 'Caramel Macchiato (Large)', qty: 2, unitPrice: 5.5, options: 'Extra foam, Oat milk' },
      { id: '2', name: 'Avocado Toast & Truffle', qty: 1, unitPrice: 13.5 },
      { id: '3', name: 'Almond Biscotti', qty: 2, unitPrice: 3.75 },
    ],
    subtotal: 32.0,
    tax: 3.2,
    discount: 0,
    total: 35.2,
    paymentMethod: 'Credit Card',
    cardLast4: '9421',
    barcodeValue: 'BH-ORD-2026',
    footerMessage: 'Thank you for dining with us! Wifi: BlueHarborGuest',
    autoCut: true,
    openDrawer: true,
  });

  // 2. Shipping Label State
  const [labelData, setLabelData] = useState<LabelData>({
    itemTitle: 'Whole Bean Single Origin Ethiopia (2lb Bag x 2)',
    sku: 'SKU-ETH-YIRG-02',
    trackingNumber: '9400 1118 9956 0928 3712 04',
    barcodeType: 'CODE128',
    sender: {
      name: 'Blue Harbor Dispatch Fulfillment',
      company: 'Blue Harbor Coffee LLC',
      street: '1200 Industrial Way, Bay 4',
      cityStateZip: 'Seattle, WA 98134',
    },
    recipient: {
      name: 'Jennifer Miller',
      company: 'Apex Design Labs',
      street: '880 Montgomery St, Suite 400',
      cityStateZip: 'San Francisco, CA 94133',
      phone: '(415) 555-0129',
    },
    weightLbs: 4.5,
    packageType: 'Priority Box #3',
    fragile: false,
    batchNumber: 'BATCH-2026-AUG',
  });

  // 3. Invoice State
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    invoiceNumber: `INV-2026-${Math.floor(Math.random() * 900 + 100)}`,
    clientName: 'Sarah Jenkins',
    clientCompany: 'Cascade Tech Solutions Inc.',
    clientEmail: 'billing@cascadetech.io',
    billingAddress: '400 Pine Crest Way, Bellevue, WA 98004',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().split('T')[0],
    items: [
      { id: '1', description: 'Enterprise Point-of-Sale Hardware Bundle', quantity: 2, unitPrice: 650.0, amount: 1300.0 },
      { id: '2', description: 'Thermal Printer Roll 80mm (Box of 50)', quantity: 4, unitPrice: 42.0, amount: 168.0 },
      { id: '3', description: 'On-site Spooler Network Setup & Calibration', quantity: 1, unitPrice: 250.0, amount: 250.0 },
    ],
    subtotal: 1718.0,
    taxRatePercent: 8.5,
    taxAmount: 146.03,
    discountAmount: 50.0,
    grandTotal: 1814.03,
    paymentTerms: 'Net 14 Days (Direct Bank Wire / ACH)',
    notes: 'Thank you for your business. Please remit payments promptly.',
  });

  // 4. Custom Raw / ESC-POS text
  const [rawText, setRawText] = useState<string>(
    `\x1B\x40\x1B\x61\x01\x1B\x21\x30MERCHANT DIRECT ESC/POS\n\x1B\x21\x00\x1B\x61\x00================================\nItem 1: Cold Brew Coffee    $4.50\nItem 2: Blueberry Scone     $3.25\n--------------------------------\nTOTAL:                      $7.75\n================================\n\x1D\x56\x41\x03`
  );

  // Recalculate Receipt totals
  const updateReceiptItems = (newItems: any[]) => {
    const subtotal = newItems.reduce((acc, it) => acc + (it.qty * it.unitPrice || 0), 0);
    const tax = +(subtotal * 0.1).toFixed(2);
    const total = +(subtotal + tax - receiptData.discount).toFixed(2);
    setReceiptData({
      ...receiptData,
      items: newItems,
      subtotal,
      tax,
      total,
    });
  };

  const handleAddReceiptItem = () => {
    const newItem = {
      id: `item-${Date.now()}`,
      name: 'New Menu Item',
      qty: 1,
      unitPrice: 4.5,
      options: '',
    };
    updateReceiptItems([...receiptData.items, newItem]);
  };

  const handleRemoveReceiptItem = (id: string) => {
    updateReceiptItems(receiptData.items.filter((i) => i.id !== id));
  };

  const handleItemChange = (id: string, field: string, val: any) => {
    const updated = receiptData.items.map((it) => (it.id === id ? { ...it, [field]: val } : it));
    updateReceiptItems(updated);
  };

  // Submit Job to Spooler
  const handleDispatch = async () => {
    setIsSubmitting(true);
    setFeedbackMsg(null);

    const targetPrinter = printers.find((p) => p.id === selectedPrinterId) || printers[0];

    try {
      let content: any = {};
      let title = '';
      let docType: DocumentType = activeTab === 'raw' ? 'custom_raw' : activeTab;
      let totalPages = 1;
      let bytesTotal = 3400;

      if (activeTab === 'receipt') {
        title = `AutoPrint Receipt - ${receiptData.orderNumber} (${receiptData.orderType})`;
        content = { receiptData };
        bytesTotal = 4800;
      } else if (activeTab === 'label') {
        title = `Shipping Label - ${labelData.trackingNumber}`;
        content = { labelData };
        bytesTotal = 11200;
      } else if (activeTab === 'invoice') {
        title = `Tax Invoice ${invoiceData.invoiceNumber} - ${invoiceData.clientCompany}`;
        content = { invoiceData };
        totalPages = 2;
        bytesTotal = 18400;
      } else if (activeTab === 'report') {
        title = `Daily Merchant Audit Report - ${new Date().toLocaleDateString()}`;
        content = {
          reportData: {
            title: 'DAILY REGISTER & SPOOL AUDIT REPORT',
            period: 'Daily Closing Settlement',
            merchantName: 'Blue Harbor Enterprises',
            summaryMetrics: [
              { label: 'Total Revenue', value: '$2,842.50', change: '+12.4%' },
              { label: 'Print Jobs Spooled', value: '148' },
              { label: 'Avg Spool Latency', value: '14 ms' },
              { label: 'Paper Used', value: '42.6 m' },
            ],
            breakdown: [
              { category: 'Point of Sale Receipts', count: 112, volume: '$1,920.00' },
              { category: 'Shipping 4x6 Labels', count: 24, volume: '24 Packages' },
              { category: 'B2B Wholesale Invoices', count: 12, volume: '$922.50' },
            ],
            generatedAt: new Date().toLocaleString(),
            generatedBy: 'Alex M. (Register #1)',
          },
        };
        bytesTotal = 9200;
      } else {
        title = 'Custom ESC/POS Raw Data Stream';
        content = { rawEscPos: rawText };
        bytesTotal = rawText.length * 2;
      }

      const submittedJob = await onSubmitJob({
        title,
        documentType: docType,
        printerId: targetPrinter.id,
        printerName: targetPrinter.displayName,
        priority,
        copies,
        totalPages,
        bytesTotal,
        content,
        maxRetries: 3,
        silentPrint,
        spoolSpeedKbps: 320,
      });

      setFeedbackMsg(`Job ${submittedJob.jobNo} spooled to ${targetPrinter.displayName}`);
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (e) {
      console.error(e);
      setFeedbackMsg('Failed to submit print job to local spooler.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preview generated HTML
  const handleOpenPreview = () => {
    if (activeTab === 'receipt') {
      const html = renderReceiptHtml(receiptData);
      onPreviewHtml(`AutoPrint Receipt - ${receiptData.orderNumber}`, html, 'receipt');
    } else if (activeTab === 'label') {
      const html = renderLabelHtml(labelData);
      onPreviewHtml(`Shipping Label - ${labelData.trackingNumber}`, html, 'label');
    } else if (activeTab === 'invoice') {
      const html = renderInvoiceHtml(invoiceData);
      onPreviewHtml(`Invoice - ${invoiceData.invoiceNumber}`, html, 'invoice');
    } else if (activeTab === 'report') {
      const html = renderReportHtml({
        title: 'DAILY REGISTER AUDIT REPORT',
        period: 'Today',
        merchantName: 'Blue Harbor Enterprises',
        summaryMetrics: [
          { label: 'Total Sales', value: '$2,842.50' },
          { label: 'Transactions', value: '148' },
        ],
        breakdown: [{ category: 'Counter Sales', count: 112, volume: '$1,920.00' }],
        generatedAt: new Date().toLocaleString(),
        generatedBy: 'Operator',
      });
      onPreviewHtml('Merchant Audit Report', html, 'report');
    } else {
      const html = `<pre style="font-family: monospace; white-space: pre-wrap; padding: 20px;">${rawText}</pre>`;
      onPreviewHtml('Raw Data Stream', html, 'custom_raw');
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Tabs */}
      <div className="flex items-center justify-between gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 overflow-x-auto shadow-2xs">
        <div className="flex items-center gap-1">
          {[
            { id: 'receipt', label: 'AutoPrint Thermal Receipt', icon: Receipt, badge: '80mm / 58mm' },
            { id: 'label', label: 'Shipping Label', icon: Tag, badge: '4x6 Barcode' },
            { id: 'invoice', label: 'Tax Invoice', icon: FileSpreadsheet, badge: 'A4 / Letter' },
            { id: 'report', label: 'EOD Audit Report', icon: FileText, badge: 'Summary' },
            { id: 'raw', label: 'Raw Byte Stream', icon: FileCode, badge: 'Hex/Text' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`studio-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className={`hidden sm:inline text-[9px] px-1.5 py-0.5 rounded ${isActive ? 'bg-blue-700/50 text-blue-100' : 'bg-slate-100 text-slate-500'}`}>
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Studio Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* TAB 1: POS RECEIPT BUILDER */}
          {activeTab === 'receipt' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-600" />
                  <h4 className="font-bold text-sm text-slate-900">AutoPrint Thermal Receipt Configuration</h4>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  AutoPrint Ready
                </span>
              </div>

              {/* Store & Cashier Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Store / Brand Name
                  </label>
                  <input
                    type="text"
                    value={receiptData.merchantName}
                    onChange={(e) => setReceiptData({ ...receiptData, merchantName: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Order Number / Ref
                  </label>
                  <input
                    type="text"
                    value={receiptData.orderNumber}
                    onChange={(e) => setReceiptData({ ...receiptData, orderNumber: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Order Type
                  </label>
                  <select
                    value={receiptData.orderType}
                    onChange={(e) => setReceiptData({ ...receiptData, orderType: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    <option value="Dine-In">Dine-In</option>
                    <option value="Takeout">Takeout / Pickup</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Retail Checkout">Retail Checkout</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Cashier / Register
                  </label>
                  <input
                    type="text"
                    value={`${receiptData.cashier} • ${receiptData.registerId}`}
                    onChange={(e) => setReceiptData({ ...receiptData, cashier: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Ordered Items ({receiptData.items.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddReceiptItem}
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {receiptData.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                    >
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => handleItemChange(item.id, 'qty', parseInt(e.target.value) || 1)}
                        className="w-12 p-1.5 bg-white border border-slate-200 rounded-lg text-center font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                        placeholder="Item name"
                        className="flex-1 p-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <div className="relative w-20">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.25"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                          }
                          className="w-full pl-5 pr-1.5 py-1.5 bg-white border border-slate-200 rounded-lg text-right font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveReceiptItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hardware Features & ESC/POS Flags */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-200 hover:bg-white transition-all">
                  <input
                    type="checkbox"
                    checked={receiptData.autoCut}
                    onChange={(e) => setReceiptData({ ...receiptData, autoCut: e.target.checked })}
                    className="rounded accent-blue-600"
                  />
                  <div className="flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-slate-700" />
                    <span className="font-bold text-slate-900">Trigger Auto-Cutter</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-200 hover:bg-white transition-all">
                  <input
                    type="checkbox"
                    checked={receiptData.openDrawer}
                    onChange={(e) => setReceiptData({ ...receiptData, openDrawer: e.target.checked })}
                    className="rounded accent-blue-600"
                  />
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    <span className="font-bold text-slate-900">Pulse Cash Drawer</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: 4x6 SHIPPING LABEL BUILDER */}
          {activeTab === 'label' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-blue-600" />
                  <h4 className="font-bold text-sm text-slate-900">4x6 Shipping Barcode Label</h4>
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                  ZPL / EPL Spool
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Item Title & SKU
                  </label>
                  <input
                    type="text"
                    value={labelData.itemTitle}
                    onChange={(e) => setLabelData({ ...labelData, itemTitle: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Tracking Number
                  </label>
                  <input
                    type="text"
                    value={labelData.trackingNumber}
                    onChange={(e) => setLabelData({ ...labelData, trackingNumber: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              {/* Recipient Box */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <p className="text-[10px] font-bold uppercase text-slate-500">Ship To (Recipient)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Recipient Name"
                    value={labelData.recipient.name}
                    onChange={(e) =>
                      setLabelData({
                        ...labelData,
                        recipient: { ...labelData.recipient, name: e.target.value },
                      })
                    }
                    className="p-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Company (Optional)"
                    value={labelData.recipient.company || ''}
                    onChange={(e) =>
                      setLabelData({
                        ...labelData,
                        recipient: { ...labelData.recipient, company: e.target.value },
                      })
                    }
                    className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Street Address"
                  value={labelData.recipient.street}
                  onChange={(e) =>
                    setLabelData({
                      ...labelData,
                      recipient: { ...labelData.recipient, street: e.target.value },
                    })
                  }
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="City, State, Zip"
                  value={labelData.recipient.cityStateZip}
                  onChange={(e) =>
                    setLabelData({
                      ...labelData,
                      recipient: { ...labelData.recipient, cityStateZip: e.target.value },
                    })
                  }
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Package Weight (Lbs)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={labelData.weightLbs}
                    onChange={(e) =>
                      setLabelData({ ...labelData, weightLbs: parseFloat(e.target.value) || 1 })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-200 self-end hover:bg-white transition-all">
                  <input
                    type="checkbox"
                    checked={labelData.fragile}
                    onChange={(e) => setLabelData({ ...labelData, fragile: e.target.checked })}
                    className="rounded accent-red-600"
                  />
                  <span className="font-bold text-slate-900">Mark as FRAGILE</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: INVOICE BUILDER */}
          {activeTab === 'invoice' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  <h4 className="font-bold text-sm text-slate-900">A4 Tax Invoice & Packing Slip</h4>
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                  Multi-page A4
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    value={invoiceData.invoiceNumber}
                    onChange={(e) => setInvoiceData({ ...invoiceData, invoiceNumber: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Client Company
                  </label>
                  <input
                    type="text"
                    value={invoiceData.clientCompany}
                    onChange={(e) => setInvoiceData({ ...invoiceData, clientCompany: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Payment Terms
                </label>
                <input
                  type="text"
                  value={invoiceData.paymentTerms}
                  onChange={(e) => setInvoiceData({ ...invoiceData, paymentTerms: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT REPORT */}
          {activeTab === 'report' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h4 className="font-bold text-sm text-slate-900">End-of-Day Register Settlement</h4>
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                  Z-Report
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Generates a structured daily closing summary with revenue breakdowns, cash drawer
                reconciliation, and spooler device diagnostics.
              </p>
            </div>
          )}

          {/* TAB 5: RAW ESC-POS STREAM */}
          {activeTab === 'raw' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-blue-600" />
                  <h4 className="font-bold text-sm text-slate-900">Raw Stream or Text Buffer</h4>
                </div>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                  Direct Port Byte Stream
                </span>
              </div>
              <textarea
                rows={6}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          )}

          {/* Dispatch Target Settings Box */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
            <h5 className="font-bold text-xs uppercase tracking-wider text-slate-600">
              Transmission & Spooler Options
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Target Printer */}
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Destination Printer
                </label>
                <select
                  value={selectedPrinterId}
                  onChange={(e) => setSelectedPrinterId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {printers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName} ({p.paperFormat} • {p.port})
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Spool Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="rush">⚡ RUSH (Front of Queue)</option>
                  <option value="high">High Priority</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low Background</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-2">
                  <span>Copies:</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={copies}
                    onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
                    className="w-14 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={silentPrint}
                    onChange={(e) => setSilentPrint(e.target.checked)}
                    className="rounded accent-blue-600"
                  />
                  <span>Silent Print (No Prompt)</span>
                </label>
              </div>

              {/* Actions: Preview & Green Submit */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-studio-preview"
                  onClick={handleOpenPreview}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
                >
                  Preview Layout
                </button>
                <button
                  type="button"
                  id="btn-studio-dispatch"
                  disabled={isSubmitting}
                  onClick={handleDispatch}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs shadow-emerald-700/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isSubmitting ? 'Spooling...' : 'Dispatch Print Job'}</span>
                </button>
              </div>
            </div>

            {feedbackMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{feedbackMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Paper Simulation Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-2">
            <h5 className="font-bold text-xs uppercase tracking-wider text-slate-600">
              Live Document Render
            </h5>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              WYSIWYG Spooler Engine
            </span>
          </div>

          <div className="bg-slate-100/70 p-4 rounded-3xl border border-slate-200 flex justify-center items-start min-h-[500px] overflow-y-auto">
            {activeTab === 'receipt' && (
              <div
                className="shadow-md rounded-t-sm paper-tear-bottom max-w-full overflow-hidden"
                dangerouslySetInnerHTML={{ __html: renderReceiptHtml(receiptData) }}
              />
            )}
            {activeTab === 'label' && (
              <div
                className="shadow-md rounded-md max-w-full overflow-hidden scale-90 sm:scale-100 origin-top"
                dangerouslySetInnerHTML={{ __html: renderLabelHtml(labelData) }}
              />
            )}
            {activeTab === 'invoice' && (
              <div
                className="shadow-md rounded-md max-w-full overflow-hidden scale-75 sm:scale-90 origin-top"
                dangerouslySetInnerHTML={{ __html: renderInvoiceHtml(invoiceData) }}
              />
            )}
            {activeTab === 'report' && (
              <div
                className="shadow-md rounded-md max-w-full overflow-hidden scale-75 sm:scale-90 origin-top"
                dangerouslySetInnerHTML={{
                  __html: renderReportHtml({
                    title: 'DAILY REGISTER AUDIT REPORT',
                    period: 'Daily Closing Settlement',
                    merchantName: 'Blue Harbor Enterprises',
                    summaryMetrics: [
                      { label: 'Total Sales', value: '$2,842.50' },
                      { label: 'Print Jobs', value: '148' },
                    ],
                    breakdown: [{ category: 'Point of Sale', count: 112, volume: '$1,920.00' }],
                    generatedAt: new Date().toLocaleString(),
                    generatedBy: 'Alex M.',
                  }),
                }}
              />
            )}
            {activeTab === 'raw' && (
              <div className="bg-white p-4 font-mono text-xs text-black border border-black shadow-md w-full whitespace-pre-wrap">
                {rawText}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
