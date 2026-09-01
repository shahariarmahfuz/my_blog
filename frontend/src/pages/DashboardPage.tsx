import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../api/client';
import { DashboardMetrics } from '../types';
import { Card } from '../components/ui/Card';
import {
  Building2,
  Users2,
  HeartHandshake,
  PiggyBank,
  HandCoins,
  Wallet,
  Clock,
  UserCheck,
  ClipboardList,
  ArrowRight,
  TrendingUp,
  Coins
} from 'lucide-react';

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  badgeText?: string;
  badgeColor?: string;
  onClick?: () => void;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  iconColor,
  badgeText,
  badgeColor = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative group bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-emerald-500/40 dark:hover:border-emerald-500/40 transition-all duration-200 flex flex-col justify-between ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div>
        {/* Card Header: Icon & Optional Badge */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${iconBg} ${iconColor} transition-transform group-hover:scale-105 duration-200 shadow-sm`}>
            {icon}
          </div>

          {badgeText && (
            <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${badgeColor}`}>
              {badgeText}
            </span>
          )}
        </div>

        {/* Card Title & Value */}
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {title}
        </p>
        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">
          {value}
        </h3>
      </div>

      {/* Card Footer Subtitle & Action Link */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="truncate pr-2">{subtitle}</span>
        {onClick && (
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
        )}
      </div>
    </div>
  );
};

export const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await dashboardApi.getMetrics();
      setMetrics(res.data);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (val: string | number | undefined) => {
    const num = Number(val || 0);
    return '৳' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (loading || !metrics) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-3">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 font-medium">Loading Foundation Overview...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Dashboard Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Foundation Dashboard
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Live summary derived authoritatively from the double-entry financial ledger.
        </p>
      </div>

      {/* Summary Cards Grid: 1-2 cols on mobile, 3-4 cols on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5 sm:gap-6">
        {/* 1. Available Foundation Fund */}
        <SummaryCard
          title="Available Foundation Fund"
          value={formatCurrency(metrics.total_available_funds)}
          subtitle="Net liquid balance across active groups"
          icon={<Wallet className="w-6 h-6" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800"
          iconColor="text-emerald-600 dark:text-emerald-400"
          badgeText="Liquid Balance"
          badgeColor="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300"
          onClick={() => navigate('/app/groups')}
        />

        {/* 2. Total Contributions */}
        <SummaryCard
          title="Total Contributions"
          value={formatCurrency(metrics.total_contributions)}
          subtitle="Total member deposits received"
          icon={<PiggyBank className="w-6 h-6" />}
          iconBg="bg-sky-50 dark:bg-sky-950/60 border border-sky-200/60 dark:border-sky-800"
          iconColor="text-sky-600 dark:text-sky-400"
          badgeText="Total Receipts"
          badgeColor="bg-sky-50 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300"
          onClick={() => navigate('/app/contributions')}
        />

        {/* 3. Total Qard Hasan */}
        <SummaryCard
          title="Total Qard Hasan"
          value={formatCurrency(metrics.total_qard_hasan_disbursed)}
          subtitle="Benevolent zero-interest loans disbursed"
          icon={<HandCoins className="w-6 h-6" />}
          iconBg="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800"
          iconColor="text-indigo-600 dark:text-indigo-400"
          badgeText="Disbursed Loans"
          badgeColor="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300"
          onClick={() => navigate('/app/assistance/qard-hasan/manage')}
        />

        {/* 4. Outstanding Qard Hasan */}
        <SummaryCard
          title="Outstanding Qard Hasan"
          value={formatCurrency(metrics.outstanding_qard_hasan)}
          subtitle={`Repaid: ${formatCurrency(metrics.total_qard_hasan_repaid)}`}
          icon={<Coins className="w-6 h-6" />}
          iconBg="bg-rose-50 dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-800"
          iconColor="text-rose-600 dark:text-rose-400"
          badgeText="Loan Principal"
          badgeColor="bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300"
          onClick={() => navigate('/app/assistance/qard-hasan/repayments')}
        />

        {/* 5. Total Sadaqah */}
        <SummaryCard
          title="Total Sadaqah"
          value={formatCurrency(metrics.total_sadaqah_disbursed)}
          subtitle="Non-recoverable benevolent grants"
          icon={<HeartHandshake className="w-6 h-6" />}
          iconBg="bg-purple-50 dark:bg-purple-950/60 border border-purple-200/60 dark:border-purple-800"
          iconColor="text-purple-600 dark:text-purple-400"
          badgeText="Direct Aid"
          badgeColor="bg-purple-50 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300"
          onClick={() => navigate('/app/assistance/sadaqah/manage')}
        />

        {/* 6. Total Groups */}
        <SummaryCard
          title="Total Groups"
          value={metrics.total_groups}
          subtitle="Active accounting & fund cohorts"
          icon={<Building2 className="w-6 h-6" />}
          iconBg="bg-teal-50 dark:bg-teal-950/60 border border-teal-200/60 dark:border-teal-800"
          iconColor="text-teal-600 dark:text-teal-400"
          badgeText="Fund Circles"
          badgeColor="bg-teal-50 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300"
          onClick={() => navigate('/app/groups')}
        />

        {/* 7. Total Members */}
        <SummaryCard
          title="Total Members"
          value={metrics.total_members}
          subtitle="Registered contributing members"
          icon={<Users2 className="w-6 h-6" />}
          iconBg="bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800"
          iconColor="text-blue-600 dark:text-blue-400"
          badgeText="Contributors"
          badgeColor="bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300"
          onClick={() => navigate('/app/members/manage')}
        />

        {/* 8. Total Beneficiaries */}
        <SummaryCard
          title="Total Beneficiaries"
          value={metrics.total_beneficiaries}
          subtitle="Assistance recipients on record"
          icon={<UserCheck className="w-6 h-6" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800"
          iconColor="text-emerald-600 dark:text-emerald-400"
          badgeText="Recipients"
          badgeColor="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300"
          onClick={() => navigate('/app/beneficiaries/manage')}
        />

        {/* 9. Pending Member Applications */}
        <SummaryCard
          title="Pending Applications"
          value={metrics.pending_member_applications ?? 0}
          subtitle="Public member applications to review"
          icon={<ClipboardList className="w-6 h-6" />}
          iconBg="bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800"
          iconColor="text-amber-600 dark:text-amber-400"
          badgeText="Awaiting Review"
          badgeColor="bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300"
          onClick={() => navigate('/app/members/applications')}
        />
      </div>
    </div>
  );
};
