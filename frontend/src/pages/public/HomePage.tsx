import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { publicApi } from '../../api/client';
import { PublicImpactMetrics, PublicStoryListItem } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  HeartHandshake,
  PiggyBank,
  ShieldCheck,
  Users2,
  ArrowRight,
  Sparkles,
  TrendingUp,
  RotateCcw,
  CheckCircle2,
  Calendar,
  MapPin,
  Clock,
  ArrowUpRight,
  BookOpen
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const [metrics, setMetrics] = useState<PublicImpactMetrics | null>(null);
  const [stories, setStories] = useState<PublicStoryListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPublicData = async () => {
      try {
        setLoading(true);
        const [mRes, sRes] = await Promise.all([
          publicApi.getImpactMetrics(),
          publicApi.getStories(),
        ]);
        setMetrics(mRes.data);
        setStories(sRes.data.slice(0, 3));
      } catch (err) {
        console.error('Failed to load public home data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadPublicData();
  }, []);

  const formatBDT = (val: string | number | undefined) => {
    const num = Number(val || 0);
    return '৳' + num.toLocaleString('en-US', { maximumFractionDigits: 0 });
  };

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-20 pb-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-emerald-100/80 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-black text-emerald-800 dark:text-emerald-300 shadow-sm animate-fadeIn">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Pure Islamic Ethical Microfinance · 0.00% Interest Guaranteed</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tight max-w-4xl mx-auto leading-[1.1]">
            Dignity Over Debt.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400">
              Benevolence in Action.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Al-Khair Foundation bridges community solidarity with transparent financial stewardship — providing <b>zero-interest Qard Hasan micro-capital</b> and <b>targeted non-recoverable Sadaqah grants</b> to eradicate debt exploitation.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              to="/member/apply"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 hover:scale-105 transition-all flex items-center justify-center space-x-2"
            >
              <span>Become a Contributing Member</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/stories"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center space-x-2"
            >
              <BookOpen className="w-4 h-4 text-emerald-500" />
              <span>Explore Our Stories</span>
            </Link>

            <Link
              to="/assistance/apply"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold text-sm transition-colors text-center"
            >
              Request Assistance →
            </Link>
          </div>
        </div>

        {/* Subtle Decorative Gradient Blurs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 dark:bg-emerald-500/5 blur-[120px] -z-10 pointer-events-none" />
      </section>

      {/* Live Impact Statistics Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="text-center p-3 border-r border-slate-100 dark:border-slate-800/80 last:border-0">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Individuals Assisted</p>
            <h3 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white mt-1">
              {metrics ? metrics.total_beneficiaries_served : '42+'}
            </h3>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">Empowered Families</p>
          </div>

          <div className="text-center p-3 border-r border-slate-100 dark:border-slate-800/80 last:border-0">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Disbursed</p>
            <h3 className="text-2xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {metrics ? formatBDT(metrics.total_assistance_disbursed) : '৳350,000+'}
            </h3>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">0.00% Usury / Interest</p>
          </div>

          <div className="text-center p-3 border-r border-slate-100 dark:border-slate-800/80 last:border-0">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Qard Hasan Recovery</p>
            <h3 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white mt-1">
              {metrics ? `${metrics.repayment_recovery_rate}%` : '98.4%'}
            </h3>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">Revolving Evergreen Capital</p>
          </div>

          <div className="text-center p-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Solidarity Groups</p>
            <h3 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white mt-1">
              {metrics ? metrics.active_groups_count : '3'}
            </h3>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Community Circles</p>
          </div>
        </div>
      </section>

      {/* Core Dual Pillars: Qard Hasan vs Sadaqah */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <Badge variant="success">Our Assistance Philosophy</Badge>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Two Transparent Pathways of Community Support
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            We strictly separate self-sustaining enterprise capital from immediate humanitarian welfare grants.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Pillar 1: Qard Hasan */}
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                <RotateCcw className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Micro-Capital & Livelihood
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  Qard Hasan (Zero-Interest Loans)
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Benevolent revolving financing granted to micro-entrepreneurs, craftsmen, and smallholder farmers. There is zero interest, zero hidden fees, and zero compounded penalties.
              </p>
              <ul className="space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-300 pt-2">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Borrowers repay exactly what they received — not a single Taka more</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Repayments flow directly back into the fund to assist the next applicant</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Can be co-funded proportionally across multiple donor groups</span>
                </li>
              </ul>
            </div>

            <Link
              to="/our-work"
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline pt-4"
            >
              <span>Learn about Qard Hasan financing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Pillar 2: Sadaqah */}
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-inner">
                <HeartHandshake className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                  Targeted Humanitarian Relief
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  Sadaqah (Direct Benevolent Grants)
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Direct non-recoverable financial relief for acute emergencies: life-saving surgeries, medical treatments, disaster rehabilitation, and food support for destitute families.
              </p>
              <ul className="space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-300 pt-2">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                  <span>100% non-recoverable gift — no repayment is ever expected</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                  <span>Strictly audited and matched directly to verified emergency cases</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                  <span>Transparently accounted on the public ledger</span>
                </li>
              </ul>
            </div>

            <Link
              to="/our-work"
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline pt-4"
            >
              <span>Explore Sadaqah emergency relief</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Stories Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <Badge variant="info">Stories of Hope</Badge>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Real Lives, Transformed
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Read how zero-interest micro-capital and community solidarity are creating generational change.
            </p>
          </div>

          <Link
            to="/stories"
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1"
          >
            <span>View All Stories</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stories.map((story) => (
            <Link
              key={story.id}
              to={`/stories/${story.slug}`}
              className="group rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
            >
              {story.cover_image && (
                <div className="h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                  <img
                    src={story.cover_image}
                    alt={story.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/70 text-white backdrop-blur-md">
                      {story.assistance_type === 'QARD_HASAN' ? 'Qard Hasan' : 'Sadaqah'}
                    </span>
                  </div>
                </div>
              )}

              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{story.location}</span>
                    <span>•</span>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{story.read_time_minutes} min read</span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                    {story.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {story.summary}
                  </p>
                </div>

                {story.impact_highlight && (
                  <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/50 text-[11px] text-emerald-900 dark:text-emerald-300 font-semibold">
                    ✨ {story.impact_highlight}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How It Works Step-by-Step */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-900 text-white space-y-10 relative overflow-hidden">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              The Revolving Impact Cycle
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              How Community Microfinance Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Every Taka contributed is preserved, protected, and recycled to serve multiple families over generations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">
                01
              </div>
              <h4 className="font-bold text-sm text-white">Members Join & Contribute</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Foundation members pool regular monthly contributions into autonomous fund group circles.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">
                02
              </div>
              <h4 className="font-bold text-sm text-white">Transparent Allocation</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Groups collaborate to co-fund larger micro-loans, maintaining atomic multi-group accounting.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">
                03
              </div>
              <h4 className="font-bold text-sm text-white">0.00% Usury Disbursement</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Beneficiaries receive dignified capital without compound interest or predatory debt traps.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">
                04
              </div>
              <h4 className="font-bold text-sm text-white">Evergreen Revolving Fund</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Repayments flow back into donor group accounts and immediately fund the next waiting family.
              </p>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800">
            <p className="text-xs text-slate-400">
              Ready to create lasting community impact? Join as an enrolled Foundation Member today.
            </p>
            <Link
              to="/member/apply"
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs transition-colors whitespace-nowrap"
            >
              Apply for Membership →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
