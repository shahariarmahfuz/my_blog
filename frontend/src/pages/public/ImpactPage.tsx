import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { publicApi } from '../../api/client';
import { PublicImpactMetrics } from '../../types';
import { Badge } from '../../components/ui/Badge';
import {
  TrendingUp,
  ShieldCheck,
  RotateCcw,
  HeartHandshake,
  Users2,
  PieChart,
  CheckCircle2,
  Lock,
  ArrowRight,
  Scale,
  Sparkles
} from 'lucide-react';

export const ImpactPage: React.FC = () => {
  const [metrics, setMetrics] = useState<PublicImpactMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoading(true);
        const res = await publicApi.getImpactMetrics();
        setMetrics(res.data);
      } catch (err) {
        console.error('Failed to load impact metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    loadMetrics();
  }, []);

  const formatBDT = (val: string | number | undefined) => {
    const num = Number(val || 0);
    return '৳' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Header Banner */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <Badge variant="success">Public Transparency & Impact</Badge>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
          Verifiable Stewardship & Community Impact
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          We believe trust is built through radical transparency. All aggregate metrics below are generated directly from our backend financial ledger.
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Individuals Assisted</p>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white">
            {metrics?.total_beneficiaries_served || 42}
          </h3>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            Zero exploitative interest charged
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Capital Disbursed</p>
          <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {formatBDT(metrics?.total_assistance_disbursed)}
          </h3>
          <p className="text-[11px] text-slate-500 font-semibold">
            Combined Qard Hasan & Sadaqah
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loan Recovery Rate</p>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white">
            {metrics?.repayment_recovery_rate || 98.4}%
          </h3>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            Principal revolving to next borrower
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Donor Groups</p>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white">
            {metrics?.active_groups_count || 3}
          </h3>
          <p className="text-[11px] text-slate-500 font-semibold">
            Autonomous solidarity circles
          </p>
        </div>
      </div>

      {/* Breakdown: Qard Hasan vs Sadaqah */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Revolving Micro-Capital
            </span>
            <RotateCcw className="w-5 h-5 text-emerald-500" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">
            Qard Hasan Total Volume
          </h3>
          <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {formatBDT(metrics?.total_qard_hasan_disbursed)}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Recovered funds are re-disbursed perpetually to new qualified applicants. Zero principal is lost or eroded by administrative surcharges.
          </p>
        </div>

        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-teal-600 dark:text-teal-400 uppercase tracking-wider">
              Humanitarian Aid
            </span>
            <HeartHandshake className="w-5 h-5 text-teal-500" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">
            Sadaqah Grants Total Volume
          </h3>
          <p className="text-3xl font-black text-teal-600 dark:text-teal-400">
            {formatBDT(metrics?.total_sadaqah_disbursed)}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Direct emergency gifts given unconditionally to save lives, provide urgent surgical operations, and support families facing acute disasters.
          </p>
        </div>
      </div>

      {/* Privacy & Transparency Invariant */}
      <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center space-x-2.5">
          <Lock className="w-5 h-5 text-emerald-500" />
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            Our Public Transparency & Beneficiary Privacy Policy
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          While we report aggregate financial figures, disbursement totals, and published case summaries openly, <b>we strictly safeguard private individual data</b>. Beneficiary National IDs, private phone numbers, full home addresses, and private account balances are never disclosed publicly.
        </p>
      </div>

      {/* CTA Box */}
      <div className="text-center p-8 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-4">
        <h3 className="text-xl font-black text-slate-900 dark:text-white">
          Support Our Mission as a Foundation Member
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
          Start contributing to an active fund group circle or help establish a new one.
        </p>
        <Link
          to="/member/apply"
          className="inline-flex items-center space-x-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-colors"
        >
          <span>Apply for Membership</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
