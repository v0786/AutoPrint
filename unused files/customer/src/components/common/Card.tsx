'use client';

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variantClasses: Record<NonNullable<CardProps['variant']>, string> = {
  default:
    'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs',
  elevated:
    'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg',
  outlined:
    'bg-transparent border border-slate-200 dark:border-slate-700',
};

const paddingClasses: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
};

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={[
        'rounded-2xl',
        variantClasses[variant],
        paddingClasses[padding],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
};

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardHeader: React.FC<CardHeaderProps> = ({
  className = '',
  children,
  ...props
}) => (
  <div
    className={[
      'flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/80',
      className,
    ].join(' ')}
    {...props}
  >
    {children}
  </div>
);

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export const CardTitle: React.FC<CardTitleProps> = ({
  className = '',
  children,
  ...props
}) => (
  <h3
    className={[
      'text-sm font-semibold text-slate-800 dark:text-slate-100',
      className,
    ].join(' ')}
    {...props}
  >
    {children}
  </h3>
);

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardContent: React.FC<CardContentProps> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={className} {...props}>
    {children}
  </div>
);

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardFooter: React.FC<CardFooterProps> = ({
  className = '',
  children,
  ...props
}) => (
  <div
    className={[
      'pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between',
      className,
    ].join(' ')}
    {...props}
  >
    {children}
  </div>
);
