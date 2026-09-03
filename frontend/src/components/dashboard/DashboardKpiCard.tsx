import React from 'react';

export interface DashboardKpiCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  iconGradient: string; // Tailwind gradient classes, e.g. 'from-emerald-400 to-emerald-600'
  accentCircleColor: string; // Tailwind background color, e.g. 'bg-emerald-100'
  badgeText?: string;
  badgeStyle?: string; // Tailwind badge classes, e.g. 'bg-emerald-100 text-emerald-700'
  badgeIcon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const DashboardKpiCard: React.FC<DashboardKpiCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconGradient,
  accentCircleColor,
  badgeText,
  badgeStyle = 'bg-slate-100 text-slate-700',
  badgeIcon,
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`card-hover bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden flex flex-col justify-between transition-all duration-200 ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* Decorative soft circle background accent */}
      <div
        className={`absolute -right-6 -top-6 w-24 h-24 ${accentCircleColor} rounded-full opacity-60 pointer-events-none`}
        aria-hidden="true"
      />

      {/* Top row: Icon container + Category/Status badge */}
      <div className="flex items-center justify-between mb-3 relative">
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${iconGradient} flex items-center justify-center text-white shadow-lg flex-shrink-0`}
        >
          {icon}
        </div>
        {badgeText && (
          <span
            className={`text-xs ${badgeStyle} px-2.5 py-1 rounded-full font-semibold flex items-center gap-1`}
          >
            {badgeIcon}
            <span>{badgeText}</span>
          </span>
        )}
      </div>

      {/* Content area: Title, Main Numeric Value, and Subtitle */}
      <div>
        <p className="text-sm text-slate-500 mb-1 truncate">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800 tracking-tight truncate">
          {value}
        </h3>
        <p className="text-xs text-slate-400 mt-1 truncate">{subtitle}</p>
      </div>
    </div>
  );
};
