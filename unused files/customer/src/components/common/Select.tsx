'use client';

import React from 'react';

type SelectSize = 'sm' | 'md' | 'lg';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  selectSize?: SelectSize;
  options: SelectOption[];
  placeholder?: string;
}

const sizeClasses: Record<SelectSize, string> = {
  sm: 'h-8 text-xs px-2.5',
  md: 'h-10 text-sm px-3',
  lg: 'h-12 text-base px-4',
};

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  selectSize = 'md',
  options,
  placeholder,
  id,
  className = '',
  disabled,
  required,
  'aria-describedby': ariaDescribedBy,
  children: _children,
  ...props
}) => {
  const selectId = id || React.useId();
  const errorId = error ? `${selectId}-error` : undefined;
  const helperId = helperText && !error ? `${selectId}-helper` : undefined;
  const describedBy = [ariaDescribedBy, errorId, helperId]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={selectId}
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

      <select
        id={selectId}
        aria-invalid={!!error}
        aria-describedby={describedBy || undefined}
        aria-required={required}
        disabled={disabled}
        className={[
          'w-full rounded-lg border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100',
          'transition-colors duration-200 focus:outline-none focus:ring-1 appearance-none',
          'bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.25rem_1.25rem]',
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
            : 'border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:ring-indigo-500',
          disabled
            ? 'bg-slate-50 dark:bg-slate-900 text-slate-400 cursor-not-allowed'
            : '',
          sizeClasses[selectSize],
          'pr-10',
          className,
        ].join(' ')}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.24 4.38a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z' clip-rule='evenodd'/%3E%3C/svg%3E\")",
        }}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>

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
