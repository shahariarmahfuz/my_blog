import React from 'react';

export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'purple' | 'amber';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  };

  const variantStyles = {
    success: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-transparent dark:border-emerald-800/50',
    danger: 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-transparent dark:border-rose-800/50',
    warning: 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-transparent dark:border-amber-800/50',
    info: 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-transparent dark:border-blue-800/50',
    purple: 'bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 border-transparent dark:border-violet-800/50',
    amber: 'bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 border-transparent dark:border-orange-800/50',
    neutral: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent dark:border-slate-700',
  };

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border tracking-wide uppercase ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
