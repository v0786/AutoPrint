import React from 'react';
import {
  X,
  Printer,
  Download,
  CheckCircle2,
  FileText,
  Receipt,
  Tag,
  FileSpreadsheet,
} from 'lucide-react';
import { DocumentType } from '../types/printer';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  htmlContent: string;
  docType: DocumentType;
  onExecutePhysicalPrint?: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  htmlContent,
  docType,
  onExecutePhysicalPrint,
}) => {
  if (!isOpen) return null;

  const handleDownloadHtml = () => {
    const element = document.createElement('a');
    const file = new Blob([htmlContent], { type: 'text/html' });
    element.href = URL.createObjectURL(file);
    element.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.html`;
    document.body.appendChild(element);
    element.click();
    element.remove();
  };

  const handleNativePrint = () => {
    if (onExecutePhysicalPrint) {
      onExecutePhysicalPrint();
    } else {
      const printWin = window.open('', '_blank', 'width=600,height=800');
      if (printWin) {
        printWin.document.open();
        printWin.document.write(htmlContent);
        printWin.document.close();
        setTimeout(() => {
          printWin.focus();
          printWin.print();
        }, 250);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-100 w-full max-w-3xl rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              {docType === 'receipt' ? (
                <Receipt className="w-4 h-4 text-emerald-600" />
              ) : docType === 'label' ? (
                <Tag className="w-4 h-4 text-blue-600" />
              ) : docType === 'invoice' ? (
                <FileSpreadsheet className="w-4 h-4 text-slate-700" />
              ) : (
                <FileText className="w-4 h-4 text-slate-500" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">{title}</h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Document Preview & Physical OS Print Spooler
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadHtml}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              title="Download HTML"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="p-6 flex-1 overflow-y-auto flex justify-center items-start bg-slate-200/70">
          <div
            className={`shadow-md bg-white rounded overflow-hidden max-w-full ${
              docType === 'receipt' ? 'paper-tear-bottom' : ''
            }`}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>

        {/* Footer Actions */}
        <div className="bg-white px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Format: <strong className="text-slate-800 uppercase">{docType}</strong> • Single-PC Merchant Engine
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleNativePrint}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs shadow-emerald-700/20 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>Print to Physical Printer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
