import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { publicApi } from '../../api/client';
import { PublicFoundationInfo } from '../../types';
import { Badge } from '../../components/ui/Badge';
import {
  Building2,
  ShieldCheck,
  HeartHandshake,
  Users2,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Lock,
  Scale
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  const [info, setInfo] = useState<PublicFoundationInfo | null>(null);

  useEffect(() => {
    const loadInfo = async () => {
      try {
        const res = await publicApi.getFoundationInfo();
        setInfo(res.data);
      } catch (err) {
        console.error('Failed to load foundation info:', err);
      }
    };
    loadInfo();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Header Banner */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <Badge variant="success">About Al-Khair Foundation</Badge>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
          Eliminating Usury Through Transparent Benevolent Microfinance
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          Founded in 2021, Al-Khair Foundation operates on the foundational Islamic principle that money should be a tool for mutual empowerment and dignity, rather than exploitation through compound interest.
        </p>
      </div>

      {/* Mission & Vision Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Our Mission</h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {info?.mission || "To provide dignified, zero-interest financial assistance and targeted humanitarian grants through transparent, community-funded group circles."}
          </p>
        </div>

        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Our Vision</h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {info?.vision || "A society free from exploitative debt, where every individual has access to benevolent capital and mutual solidarity."}
          </p>
        </div>
      </div>

      {/* Ethical Pillars */}
      <div className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Our Non-Negotiable Core Values
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Guided by strict ethical Islamic finance frameworks and transparent ledger accounting.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start space-x-3.5">
            <Scale className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Absolute Zero-Interest (0.00%)</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                We strictly reject all forms of interest (riba), compounding fees, late payment fines, or exploitative collateral.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start space-x-3.5">
            <RotateCcw className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Revolving Community Micro-Capital</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                When a borrower repays their Qard Hasan, 100% of that principal is returned to the pool to assist the next applicant in line.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start space-x-3.5">
            <Users2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Autonomous Multi-Group Circles</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Members form self-governing groups with distinct ledgers, pooling resources collaboratively for larger humanitarian impact.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start space-x-3.5">
            <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">100% Ledger Transparency</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Every disbursement, repayment, and member contribution is recorded in an immutable financial audit trail.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Box */}
      <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white text-center space-y-6 shadow-xl">
        <h3 className="text-2xl sm:text-3xl font-black">Join Our Community of Benevolent Donors</h3>
        <p className="text-xs sm:text-sm text-emerald-100 max-w-xl mx-auto leading-relaxed">
          Become a contributing Member today. Your monthly contributions create evergreen revolving funds that lift families out of poverty with complete dignity.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            to="/member/apply"
            className="px-7 py-3 rounded-2xl bg-white text-slate-900 font-extrabold text-xs shadow-lg hover:bg-emerald-50 transition-colors"
          >
            Apply to Become a Member
          </Link>
          <Link
            to="/contact"
            className="px-6 py-3 rounded-2xl bg-emerald-700/80 hover:bg-emerald-700 text-white font-bold text-xs border border-emerald-500/50 transition-colors"
          >
            Contact Admissions
          </Link>
        </div>
      </div>
    </div>
  );
};
