'use client';

import React from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ToastProvider } from '@/components/common/Toast';
import { PrintJobProvider } from '@/context/PrintJobContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <PrintJobProvider>{children}</PrintJobProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
