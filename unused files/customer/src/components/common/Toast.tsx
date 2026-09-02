'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
  ShieldCheck,
} from 'lucide-react';
import type { ToastNotification, ToastType } from '@/types';

interface ToastContextValue {
  toasts: ToastNotification[];
  addToast: (toast: Omit<ToastNotification, 'id' | 'timestamp'>) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

const DEFAULT_DURATION = 5000;

const getIcon = (type: ToastType) => {
  const iconProps = { className: 'w-5 h-5 shrink-0' } as const;
  switch (type) {
    case 'shred_success':
      return <ShieldCheck {...iconProps} className="w-5 h-5 shrink-0 text-emerald-500" />;
    case 'job_completed':
      return <CheckCircle2 {...iconProps} className="w-5 h-5 shrink-0 text-emerald-500" />;
    case 'success':
      return <CheckCircle2 {...iconProps} className="w-5 h-5 shrink-0 text-emerald-500" />;
    case 'error':
      return <AlertCircle {...iconProps} className="w-5 h-5 shrink-0 text-red-500" />;
    case 'warning':
      return <AlertTriangle {...iconProps} className="w-5 h-5 shrink-0 text-amber-500" />;
    case 'info':
    default:
      return <Info {...iconProps} className="w-5 h-5 shrink-0 text-blue-500" />;
  }
};

const getContainerStyles = (type: ToastType): string => {
  switch (type) {
    case 'shred_success':
    case 'job_completed':
      return 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-900/50';
    case 'error':
      return 'border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900/50';
    case 'warning':
      return 'border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900/50';
    case 'info':
    default:
      return 'border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-900/50';
  }
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<ToastNotification, 'id' | 'timestamp'>): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const newToast: ToastNotification = {
        ...toast,
        id,
        timestamp: new Date().toISOString(),
        duration: toast.duration ?? DEFAULT_DURATION,
      };
      setToasts((prev) => [...prev, newToast]);

      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => removeToast(id), newToast.duration);
      }

      return id;
    },
    [removeToast]
  );

  const clearAll = useCallback(() => setToasts([]), []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAll }}>
      {children}
      <ToastViewport toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  toasts,
  onRemove,
}: {
  toasts: ToastNotification[];
  onRemove: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: ToastNotification;
  onRemove: (id: string) => void;
}) {
  const [isEntering, setIsEntering] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setIsEntering(false), 10);
    return () => clearTimeout(t1);
  }, []);

  return (
    <div
      role="status"
      className={[
        'pointer-events-auto rounded-xl border shadow-lg p-3 flex items-start gap-3',
        getContainerStyles(toast.type),
        'transition-all duration-300 transform',
        isEntering ? 'translate-x-full opacity-0' : '',
        isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100',
      ].join(' ')}
    >
      <div className="pt-0.5">{getIcon(toast.type)}</div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
          {toast.title}
        </p>
        {toast.message && (
          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
            {toast.message}
          </p>
        )}
        {toast.details && (
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
            {toast.details}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => onRemove(toast.id), 300);
        }}
        aria-label="Dismiss notification"
        className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors shrink-0"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}
