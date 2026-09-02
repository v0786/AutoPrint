'use client';

import React from 'react';

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'indigo';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

const variantClasses: Record<BadgeVariant, string> = {
  default:
    'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  success:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200',
  warning:
    'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200',
  error:
    'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200',
  indigo:
    'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200',
};

const sizeClasses: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </span>
  );
};
