import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
  bodyClassName = '',
}) => {
  return (
    <div
      className={`card-hover bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden ${className}`}
    >
      {(title || action) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 gap-3">
          <div>
            {title && (
              <h3 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-400">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="flex items-center space-x-2">{action}</div>}
        </div>
      )}
      <div className={bodyClassName || 'p-6'}>{children}</div>
    </div>
  );
};
