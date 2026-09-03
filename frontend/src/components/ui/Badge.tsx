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
    success: 'bg-emerald-100 text-emerald-700 border-transparent',
    danger: 'bg-rose-100 text-rose-700 border-transparent',
    warning: 'bg-amber-100 text-amber-700 border-transparent',
    info: 'bg-blue-100 text-blue-700 border-transparent',
    purple: 'bg-violet-100 text-violet-700 border-transparent',
    amber: 'bg-orange-100 text-orange-700 border-transparent',
    neutral: 'bg-slate-100 text-slate-700 border-transparent',
  };

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border tracking-wide uppercase ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
