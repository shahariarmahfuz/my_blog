import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../api/client';
import { DashboardMetrics } from '../types';
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
      {/* ══════════════ TOP STATS CARDS (ROW 1) ══════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* 1. Total Contributions */}
        <div
          onClick={() => navigate('/app/contributions')}
          className="card-hover bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden cursor-pointer"
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-100 rounded-full opacity-60 pointer-events-none"></div>
          <div className="flex items-center justify-between mb-3 relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg">
              <Coins className="w-6 h-6" />
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Member
            </span>
          </div>
          <p className="text-sm text-slate-500 mb-1">Total Contributions</p>
          <h3 className="text-2xl font-bold text-slate-800">
            {formatCurrency(metrics.total_contributions)}
          </h3>
          <p className="text-xs text-slate-400 mt-1">All Member Contributions</p>
        </div>

        {/* 2. Total Donations */}
        <div
          onClick={() => navigate('/app/donations')}
          className="card-hover bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden cursor-pointer"
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-100 rounded-full opacity-60 pointer-events-none"></div>
          <div className="flex items-center justify-between mb-3 relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white shadow-lg">
              <Gift className="w-6 h-6" />
            </div>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Direct
            </span>
          </div>
          <p className="text-sm text-slate-500 mb-1">Total Donations</p>
          <h3 className="text-2xl font-bold text-slate-800">
            {formatCurrency(metrics.total_donations ?? 0)}
          </h3>
          <p className="text-xs text-slate-400 mt-1">All Received Donations</p>
        </div>

        {/* 3. Assistance Provided */}
        <div
          onClick={() => navigate('/app/assistance')}
          className="card-hover bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden cursor-pointer"
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-100 rounded-full opacity-60 pointer-events-none"></div>
          <div className="flex items-center justify-between mb-3 relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-lg">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Aid
            </span>
          </div>
          <p className="text-sm text-slate-500 mb-1">Assistance Provided</p>
          <h3 className="text-2xl font-bold text-slate-800">
            {formatCurrency(totalAssistanceDisbursed)}
          </h3>
          <p className="text-xs text-slate-400 mt-1">Total Assistance Disbursed</p>
        </div>

        {/* 4. Qard Hasan Due */}
        <div
          onClick={() => navigate('/app/assistance/qard-hasan/repayments')}
          className="card-hover bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden cursor-pointer"
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-100 rounded-full opacity-60 pointer-events-none"></div>
          <div className="flex items-center justify-between mb-3 relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white shadow-lg">
              <HandCoins className="w-6 h-6" />
            </div>
            <span className="text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded-full font-semibold">
              Principal
            </span>
          </div>
          <p className="text-sm text-slate-500 mb-1">Qard Hasan Due</p>
          <h3 className="text-2xl font-bold text-slate-800">
            {formatCurrency(metrics.outstanding_qard_hasan)}
          </h3>
          <p className="text-xs text-slate-400 mt-1">Outstanding Qard Hasan</p>
        </div>
      </div>

      {/* ══════════════ SECOND ROW CARDS (ROW 2 - VIBRANT GRADIENTS) ══════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* 1. Due Contributions */}
        <div
          onClick={() => navigate('/app/contributions/due')}
          className="card-hover bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-5 shadow-lg text-white relative overflow-hidden cursor-pointer"
        >
          <Clock className="w-24 h-24 absolute -right-2 -bottom-2 text-white/10 pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-sm text-white/80 mb-1">Due Contributions</p>
          <h3 className="text-2xl font-bold text-white">
            {formatCurrency(metrics.total_due_contributions ?? 0)}
          </h3>
          <p className="text-xs text-white/70 mt-1">Pending Member Dues</p>
        </div>

        {/* 2. Fund Balance */}
        <div
          onClick={() => navigate('/app/groups')}
          className="card-hover bg-gradient-to-br from-teal-500 to-green-600 rounded-2xl p-5 shadow-lg text-white relative overflow-hidden cursor-pointer"
        >
          <Wallet className="w-24 h-24 absolute -right-2 -bottom-2 text-white/10 pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-sm text-white/80 mb-1">Fund Balance</p>
          <h3 className="text-2xl font-bold text-white">
            {formatCurrency(metrics.total_available_funds)}
          </h3>
          <p className="text-xs text-white/70 mt-1">Current Foundation Fund</p>
        </div>

        {/* 3. Group Fund */}
        <div
          onClick={() => navigate('/app/groups')}
          className="card-hover bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-5 shadow-lg text-white relative overflow-hidden cursor-pointer"
        >
          <Building2 className="w-24 h-24 absolute -right-2 -bottom-2 text-white/10 pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-sm text-white/80 mb-1">Group Fund</p>
          <h3 className="text-2xl font-bold text-white">
            {formatCurrency(metrics.total_group_funds ?? metrics.total_available_funds)}
          </h3>
          <p className="text-xs text-white/70 mt-1">
            {metrics.total_groups} Active Fund Cohorts
          </p>
        </div>

        {/* 4. Expenses / Sadaqah Outflows */}
        <div
          onClick={() => navigate('/app/assistance/sadaqah/manage')}
          className="card-hover bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-5 shadow-lg text-white relative overflow-hidden cursor-pointer"
        >
          <Receipt className="w-24 h-24 absolute -right-2 -bottom-2 text-white/10 pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Receipt className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-sm text-white/80 mb-1">Expenses &amp; Sadaqah</p>
          <h3 className="text-2xl font-bold text-white">
            {formatCurrency(metrics.total_sadaqah_disbursed)}
          </h3>
          <p className="text-xs text-white/70 mt-1">Non-Recoverable Aid Grants</p>
        </div>
      </div>

      {/* ══════════════ ORGANIZATIONAL METRICS (ROW 3) ══════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {/* Total Members */}
        <div
          onClick={() => navigate('/app/members/manage')}
          className="card-hover bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer"
        >
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Members
            </p>
            <h4 className="text-2xl font-black text-slate-800 mt-1">
              {metrics.total_members}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">Contributing Foundation Members</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <Users2 className="w-6 h-6" />
          </div>
        </div>

        {/* Total Beneficiaries */}
        <div
          onClick={() => navigate('/app/beneficiaries/manage')}
          className="card-hover bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer"
        >
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Beneficiaries
            </p>
            <h4 className="text-2xl font-black text-slate-800 mt-1">
              {metrics.total_beneficiaries}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">Assistance Recipients on Record</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Applications */}
        <div
          onClick={() => navigate('/app/members/applications')}
          className="card-hover bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer"
        >
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Pending Applications
            </p>
            <h4 className="text-2xl font-black text-slate-800 mt-1">
              {metrics.pending_member_applications ?? 0}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">Public Member Submissions</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
};
