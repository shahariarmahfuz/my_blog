import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBgColor = 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white',
  trend,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`card-hover bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-indigo-500/40' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {title}
          </p>
          <h4 className="mt-2 text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
            {value}
          </h4>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              {subtitle}
            </p>
          )}
          {trend && (
            <p className="mt-1.5 flex items-center text-xs font-semibold">
              <span
                className={
                  trend.isPositive
                    ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950/80 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[11px]'
                    : 'text-rose-700 bg-rose-100 dark:bg-rose-950/80 dark:text-rose-300 px-2 py-0.5 rounded-full text-[11px]'
                }
              >
                {trend.value}
              </span>
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl flex-shrink-0 shadow-md ${iconBgColor}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};
