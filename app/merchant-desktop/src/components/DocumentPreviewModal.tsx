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
import { DocumentType, PrintJob } from '../types/printer';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  htmlContent?: string;
  html?: string;
  docType?: DocumentType;
  activeJob?: PrintJob;
  onExecutePhysicalPrint?: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  htmlContent,
  html,
  docType = 'receipt',
  activeJob,
  onExecutePhysicalPrint,
}) => {
  if (!isOpen) return null;

  const content = htmlContent || html || '<p class="p-4 text-center text-zinc-500">No preview available</p>';

  const handleDownloadHtml = () => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/html' });
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
        printWin.document.write(content);
        printWin.document.close();
        setTimeout(() => {
          printWin.focus();
          printWin.print();
        }, 250);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="bg-[#141419] w-full max-w-3xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh] text-white animate-scale-in">
        {/* Header */}
        <div className="bg-[#1e1f26] px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              {docType === 'receipt' ? (
                <Receipt className="w-4 h-4 text-emerald-400" />
              ) : docType === 'label' ? (
                <Tag className="w-4 h-4 text-blue-400" />
              ) : docType === 'invoice' ? (
                <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
              ) : (
                <FileText className="w-4 h-4 text-purple-400" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">{title}</h3>
              <p className="text-[11px] text-zinc-400 font-medium">
                Document Preview & Print Spooler Buffer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadHtml}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              title="Download HTML"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="p-6 flex-1 overflow-y-auto flex justify-center items-start bg-black/40">
          <div
            className="shadow-2xl bg-white text-black p-6 rounded-2xl max-w-full overflow-x-auto min-w-[300px]"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>

        {/* Footer Actions */}
        <div className="bg-[#1e1f26] px-6 py-3.5 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-zinc-400 font-medium">
            Format: <strong className="text-white uppercase">{docType}</strong> • Single-PC Spooler
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleNativePrint}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95 cursor-pointer"
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
