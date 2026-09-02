'use client';

import React from 'react';

type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  inputSize?: InputSize;
  leftAdornment?: React.ReactNode;
  rightAdornment?: React.ReactNode;
}

const sizeClasses: Record<InputSize, string> = {
  sm: 'h-8 text-xs px-2.5',
  md: 'h-10 text-sm px-3',
  lg: 'h-12 text-base px-4',
};

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  inputSize = 'md',
  leftAdornment,
  rightAdornment,
  id,
  className = '',
  disabled,
  required,
  'aria-describedby': ariaDescribedBy,
  ...props
}) => {
  const inputId = id || React.useId();
  const errorId = error ? `${inputId}-error` : undefined;
  const helperId = helperText && !error ? `${inputId}-helper` : undefined;
  const describedBy = [ariaDescribedBy, errorId, helperId]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          {label}
          {required && (
            <span className="text-red-500 ml-0.5" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div className="relative">
        {leftAdornment && (
          <div
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            aria-hidden="true"
          >
            {leftAdornment}
          </div>
        )}

        <input
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={describedBy || undefined}
          aria-required={required}
          disabled={disabled}
          className={[
            'w-full rounded-lg border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100',
            'transition-colors duration-200 focus:outline-none focus:ring-1',
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:ring-indigo-500',
            leftAdornment ? 'pl-9' : '',
            rightAdornment ? 'pr-9' : '',
            disabled
              ? 'bg-slate-50 dark:bg-slate-900 text-slate-400 cursor-not-allowed'
              : '',
            sizeClasses[inputSize],
            className,
          ].join(' ')}
          {...props}
        />

        {rightAdornment && (
          <div
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            aria-hidden="true"
          >
            {rightAdornment}
          </div>
        )}
      </div>

      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-[11px] text-red-500 font-medium"
        >
          {error}
        </p>
      )}

      {helperText && !error && (
        <p
          id={helperId}
          className="text-[11px] text-slate-500 dark:text-slate-400"
        >
          {helperText}
        </p>
      )}
    </div>
  );
};
