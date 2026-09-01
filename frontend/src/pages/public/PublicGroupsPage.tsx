import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { publicApi } from '../../api/client';
import { PublicEligibleGroup } from '../../types';
import { Badge } from '../../components/ui/Badge';
import {
  Building2,
  Users2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export const PublicGroupsPage: React.FC = () => {
  const [groups, setGroups] = useState<PublicEligibleGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGroups = async () => {
      try {
        setLoading(true);
        const res = await publicApi.getEligibleGroups();
        setGroups(res.data);
      } catch (err) {
        console.error('Failed to load public groups:', err);
      } finally {
        setLoading(false);
      }
    };
    loadGroups();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <Badge variant="info">Community Fund Circles</Badge>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          Autonomous Group Solidarity
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          The Al-Khair Foundation is structured around autonomous community Fund Groups. Each Group maintains dedicated ledger balances while collaborating to co-fund transformative micro-loans.
        </p>
      </div>

      {/* Explanatory Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">What is a Fund Group?</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            A self-governing circle of 10-50+ contributing members who pool monthly donations to support vetted community beneficiaries.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <Users2 className="w-5 h-5" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Co-Funding Capacity</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Groups can co-fund larger Qard Hasan projects together (e.g. 3 groups allocating ৳40k each for a ৳120k solar irrigation pump).
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Atomic Accounting</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Repayments are proportionally distributed back to each participating group's ledger with automated transactional precision.
          </p>
        </div>
      </div>

      {/* Active Groups List */}
      <div className="space-y-6">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
          Active Fund Group Circles
        </h2>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : groups.length === 0 ? (
          <p className="text-xs text-slate-400">No active groups found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groups.map((g) => (
              <div
                key={g.id}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {g.code || 'GROUP'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                      Accepting Members
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {g.name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {g.description || 'Dedicated community microfinance and benevolent relief circle.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">Monthly Contributions</span>
                  <Link
                    to="/member/apply"
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1"
                  >
                    <span>Join Group</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
