import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../api/client';
import { DashboardMetrics } from '../types';
import { DashboardKpiCard } from '../components/dashboard/DashboardKpiCard';
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
  Gift,
  Coins,
  Receipt,
  TrendingUp,
} from 'lucide-react';

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
    return '৳ ' + Math.round(num).toLocaleString('en-US');
  };

  if (loading || !metrics) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-medium">Loading Foundation Overview...</p>
      </div>
    );
  }

  const totalAssistanceDisbursed =
    Number(metrics.total_qard_hasan_disbursed || 0) + Number(metrics.total_sadaqah_disbursed || 0);

  return (
    <div className="space-y-6 pb-12">
      {/* ══════════════ TOP STATS CARDS (ROW 1 - FINANCIAL OVERVIEW) ══════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* 1. Total Contributions */}
        <DashboardKpiCard
          title="Total Contributions"
          value={formatCurrency(metrics.total_contributions)}
          subtitle="All Member Contributions"
          icon={<Coins className="w-6 h-6" />}
          iconGradient="from-emerald-400 to-emerald-600"
          accentCircleColor="bg-emerald-100"
          badgeText="Member"
          badgeStyle="bg-emerald-100 text-emerald-700"
          badgeIcon={<TrendingUp className="w-3 h-3" />}
          onClick={() => navigate('/app/contributions')}
        />

        {/* 2. Total Donations */}
        <DashboardKpiCard
          title="Total Donations"
          value={formatCurrency(metrics.total_donations ?? 0)}
          subtitle="All Received Donations"
          icon={<Gift className="w-6 h-6" />}
          iconGradient="from-blue-400 to-blue-600"
          accentCircleColor="bg-blue-100"
          badgeText="Direct"
          badgeStyle="bg-blue-100 text-blue-700"
          badgeIcon={<TrendingUp className="w-3 h-3" />}
          onClick={() => navigate('/app/donations')}
        />

        {/* 3. Assistance Provided */}
        <DashboardKpiCard
          title="Assistance Provided"
          value={formatCurrency(totalAssistanceDisbursed)}
          subtitle="Total Assistance Disbursed"
          icon={<HeartHandshake className="w-6 h-6" />}
          iconGradient="from-amber-400 to-amber-600"
          accentCircleColor="bg-amber-100"
          badgeText="Aid"
          badgeStyle="bg-amber-100 text-amber-700"
          badgeIcon={<TrendingUp className="w-3 h-3" />}
          onClick={() => navigate('/app/assistance')}
        />

        {/* 4. Qard Hasan Due */}
        <DashboardKpiCard
          title="Qard Hasan Due"
          value={formatCurrency(metrics.outstanding_qard_hasan)}
          subtitle="Outstanding Qard Hasan"
          icon={<HandCoins className="w-6 h-6" />}
          iconGradient="from-rose-400 to-rose-600"
          accentCircleColor="bg-rose-100"
          badgeText="Principal"
          badgeStyle="bg-rose-100 text-rose-700"
          onClick={() => navigate('/app/assistance/qard-hasan/repayments')}
        />
      </div>

      {/* ══════════════ SECOND ROW CARDS (ROW 2 - VIBRANT GRADIENTS) ══════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* 1. Due Contributions */}
        <div
          onClick={() => navigate('/app/contributions/due')}
          className="card-hover bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-5 shadow-lg text-white relative overflow-hidden cursor-pointer flex flex-col justify-between"
        >
          <Clock className="w-24 h-24 absolute -right-2 -bottom-2 text-white/10 pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
          <div>
            <p className="text-sm text-white/80 mb-1 truncate">Due Contributions</p>
            <h3 className="text-2xl font-bold text-white tracking-tight truncate">
              {formatCurrency(metrics.total_due_contributions ?? 0)}
            </h3>
            <p className="text-xs text-white/70 mt-1 truncate">Pending Member Dues</p>
          </div>
        </div>

        {/* 2. Fund Balance */}
        <div
          onClick={() => navigate('/app/groups')}
          className="card-hover bg-gradient-to-br from-teal-500 to-green-600 rounded-2xl p-5 shadow-lg text-white relative overflow-hidden cursor-pointer flex flex-col justify-between"
        >
          <Wallet className="w-24 h-24 absolute -right-2 -bottom-2 text-white/10 pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
          </div>
          <div>
            <p className="text-sm text-white/80 mb-1 truncate">Fund Balance</p>
            <h3 className="text-2xl font-bold text-white tracking-tight truncate">
              {formatCurrency(metrics.total_available_funds)}
            </h3>
            <p className="text-xs text-white/70 mt-1 truncate">Current Foundation Fund</p>
          </div>
        </div>

        {/* 3. Group Fund */}
        <div
          onClick={() => navigate('/app/groups')}
          className="card-hover bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-5 shadow-lg text-white relative overflow-hidden cursor-pointer flex flex-col justify-between"
        >
          <Building2 className="w-24 h-24 absolute -right-2 -bottom-2 text-white/10 pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
          </div>
          <div>
            <p className="text-sm text-white/80 mb-1 truncate">Group Fund</p>
            <h3 className="text-2xl font-bold text-white tracking-tight truncate">
              {formatCurrency(metrics.total_group_funds ?? metrics.total_available_funds)}
            </h3>
            <p className="text-xs text-white/70 mt-1 truncate">
              {metrics.total_groups} Active Fund Cohorts
            </p>
          </div>
        </div>

        {/* 4. Expenses / Operations */}
        <div
          onClick={() => navigate('/app/assistance/sadaqah/manage')}
          className="card-hover bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-5 shadow-lg text-white relative overflow-hidden cursor-pointer flex flex-col justify-between"
        >
          <Receipt className="w-24 h-24 absolute -right-2 -bottom-2 text-white/10 pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Receipt className="w-6 h-6 text-white" />
            </div>
          </div>
          <div>
            <p className="text-sm text-white/80 mb-1 truncate">Expenses &amp; Sadaqah</p>
            <h3 className="text-2xl font-bold text-white tracking-tight truncate">
              {formatCurrency(metrics.total_sadaqah_disbursed)}
            </h3>
            <p className="text-xs text-white/70 mt-1 truncate">Non-Recoverable Aid Grants</p>
          </div>
        </div>
      </div>

      {/* ══════════════ ORGANIZATIONAL METRICS (ROW 3 - MASTER CARD SYSTEM) ══════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* 1. Total Members */}
        <DashboardKpiCard
          title="Total Members"
          value={metrics.total_members}
          subtitle="Contributing Foundation Members"
          icon={<Users2 className="w-6 h-6" />}
          iconGradient="from-indigo-500 to-purple-600"
          accentCircleColor="bg-indigo-100"
          badgeText="Active"
          badgeStyle="bg-indigo-100 text-indigo-700"
          badgeIcon={<Users2 className="w-3 h-3" />}
          onClick={() => navigate('/app/members/manage')}
        />

        {/* 2. Total Beneficiaries */}
        <DashboardKpiCard
          title="Total Beneficiaries"
          value={metrics.total_beneficiaries}
          subtitle="Assistance Recipients on Record"
          icon={<UserCheck className="w-6 h-6" />}
          iconGradient="from-teal-400 to-teal-600"
          accentCircleColor="bg-teal-100"
          badgeText="Recipients"
          badgeStyle="bg-teal-100 text-teal-700"
          badgeIcon={<UserCheck className="w-3 h-3" />}
          onClick={() => navigate('/app/beneficiaries/manage')}
        />

        {/* 3. Pending Applications */}
        <DashboardKpiCard
          title="Pending Applications"
          value={metrics.pending_member_applications ?? 0}
          subtitle="Public Member Submissions"
          icon={<ClipboardList className="w-6 h-6" />}
          iconGradient="from-amber-400 to-amber-600"
          accentCircleColor="bg-amber-100"
          badgeText="Review"
          badgeStyle="bg-amber-100 text-amber-700"
          badgeIcon={<ClipboardList className="w-3 h-3" />}
          onClick={() => navigate('/app/members/applications')}
        />
      </div>
    </div>
  );
};
