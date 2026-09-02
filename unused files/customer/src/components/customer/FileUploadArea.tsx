'use client';

import React, { useRef, useState } from 'react';
import { Upload, FileText, CheckCircle, Trash2, AlertCircle, FileSpreadsheet, Image as ImageIcon } from 'lucide-react';
import { UploadedFileItem } from '../../types';

interface FileUploadAreaProps {
  files: UploadedFileItem[];
  onFilesChange: (files: UploadedFileItem[]) => void;
  maxFiles?: number;
  ariaDescribedBy?: string;
}

export const FileUploadArea: React.FC<FileUploadAreaProps> = ({
  files,
  onFilesChange,
  maxFiles = 5,
  ariaDescribedBy,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const processFile = (file: File, callback: (item: UploadedFileItem) => void) => {
    let estimatedPages = 1;
    if (file.type === 'application/pdf') {
      estimatedPages = Math.max(1, Math.min(150, Math.round(file.size / (120 * 1024)) || 3));
    } else if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
      estimatedPages = Math.max(1, Math.round(file.size / (45 * 1024)) || 2);
    } else if (file.type.startsWith('image/')) {
      estimatedPages = 1;
    }

    const mockHash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const newFileItem: UploadedFileItem = {
        id: 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        name: file.name,
        sizeBytes: file.size,
        mimeType: file.type || 'application/octet-stream',
        pageCount: estimatedPages,
        dataUrl: dataUrl,
        sha256Hash: mockHash,
        isShredded: false,
      };
      callback(newFileItem);
    };

    reader.onerror = () => {
      const newFileItem: UploadedFileItem = {
        id: 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        name: file.name,
        sizeBytes: file.size,
        mimeType: file.type || 'application/octet-stream',
        pageCount: estimatedPages,
        sha256Hash: mockHash,
        isShredded: false,
      };
      callback(newFileItem);
    };

    reader.readAsDataURL(file);
  };

  const handleFilesAdded = (rawFiles: FileList | null) => {
    if (!rawFiles || rawFiles.length === 0) return;
    setErrorMsg(null);

    if (files.length + rawFiles.length > maxFiles) {
      setErrorMsg(`Maximum ${maxFiles} documents allowed per order.`);
      return;
    }

    for (let i = 0; i < rawFiles.length; i++) {
      const file = rawFiles[i];
      const allowedExts = ['.pdf', '.docx', '.doc', '.png', '.jpg', '.jpeg', '.pptx'];
      const hasValidExt = allowedExts.some(ext => file.name.toLowerCase().endsWith(ext));
      if (!hasValidExt && !file.type.includes('pdf') && !file.type.includes('image')) {
        setErrorMsg(`Unsupported file type: ${file.name}. Please upload PDF, Word (.docx), PPTX, or Images.`);
        continue;
      }
      if (file.size > 100 * 1024 * 1024) {
        setErrorMsg(`File ${file.name} exceeds the 100MB direct transfer limit.`);
        continue;
      }
      processFile(file, (newItem) => {
        onFilesChange([...files, newItem]);
      });
    }
  };

  const removeFile = (id: string) => {
    onFilesChange(files.filter(f => f.id !== id));
  };

  const updatePageCount = (id: string, count: number) => {
    onFilesChange(files.map(f => f.id === id ? { ...f, pageCount: Math.max(1, count) } : f));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (name: string, mime: string) => {
    if (name.endsWith('.pdf') || mime.includes('pdf')) return <FileText className="w-6 h-6 text-red-500" />;
    if (mime.includes('image') || name.match(/\.(jpg|jpeg|png)$/i)) return <ImageIcon className="w-6 h-6 text-blue-500" />;
    return <FileSpreadsheet className="w-6 h-6 text-emerald-500" />;
  };

  return (
    <div className="space-y-4">
      <div
        id="file-dropzone"
        role="button"
        tabIndex={0}
        aria-label="File upload dropzone"
        aria-describedby={ariaDescribedBy}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFilesAdded(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30'
            : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/60 dark:bg-slate-900/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.pptx"
          className="hidden"
          onChange={(e) => handleFilesAdded(e.target.files)}
        />
        <div className="w-12 h-12 mx-auto rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3">
          <Upload className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Tap or drag files here to upload
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Supports PDF, Word (.docx), Images (.jpg, .png), PPTX (up to 100MB)
        </p>
        <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
          <CheckCircle className="w-3.5 h-3.5" />
          Transfers directly to store PC • 100% Zero-Cloud Storage
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400 px-1">
            <span>Uploaded Documents ({files.length})</span>
            <span>Total Pages: {files.reduce((sum, f) => sum + f.pageCount, 0)}</span>
          </div>

          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                id={`file-item-${file.id}`}
                className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0">{getFileIcon(file.name, file.mimeType)}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatSize(file.sizeBytes)} • SHA: {file.sha256Hash.substring(0, 8)}...
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 rounded-md px-2 py-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Pages:</span>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={file.pageCount}
                      onChange={(e) => updatePageCount(file.id, parseInt(e.target.value, 10) || 1)}
                      className="w-12 text-center text-xs font-bold text-slate-800 dark:text-slate-200 bg-transparent border-0 focus:ring-0 p-0"
                    />
                  </div>

                  <button
                    id={`remove-file-${file.id}`}
                    type="button"
                    onClick={() => removeFile(file.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
