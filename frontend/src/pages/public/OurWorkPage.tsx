import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import {
  RotateCcw,
  HeartHandshake,
  CheckCircle2,
  Building2,
  Briefcase,
  Stethoscope,
  GraduationCap,
  Sprout,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export const OurWorkPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Header Banner */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <Badge variant="info">Programs & Assistance</Badge>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
          How We Deliver Transparent, Dignified Assistance
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          We provide two distinct assistance modalities: <b>Qard Hasan</b> to build sustainable economic self-reliance, and <b>Sadaqah</b> to provide non-recoverable humanitarian emergency relief.
        </p>
      </div>

      {/* Program 1: Qard Hasan Deep Dive */}
      <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
              <RotateCcw className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                0.00% Usury-Free Revolving Micro-Capital
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                Qard Hasan Program
              </h2>
            </div>
          </div>

          <Link
            to="/assistance/apply"
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all self-start sm:self-auto"
          >
            Inquire for Loan →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          <div className="space-y-4">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Target Beneficiaries & Purpose
            </h4>
            <p>
              Qard Hasan is tailored for micro-entrepreneurs, craftsmen, smallholder farmers, and shop owners who need modest working capital to expand their livelihoods without falling into debt traps with compound microcredit interest rates (which typically exceed 25-40% elsewhere).
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <Briefcase className="w-4 h-4 text-emerald-500 mb-1" />
                <p className="font-bold text-slate-900 dark:text-white">Small Commerce</p>
                <p className="text-[10px] text-slate-400">Stock procurement, grocery, tailoring</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <Sprout className="w-4 h-4 text-emerald-500 mb-1" />
                <p className="font-bold text-slate-900 dark:text-white">Agri & Livestock</p>
                <p className="text-[10px] text-slate-400">Seeds, irrigation, poultry, dairy</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Repayment & Fund Recycling Terms
            </h4>
            <ul className="space-y-2.5">
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span><b>Exact Principal Repayment:</b> Borrower repays only what they received over agreed flexible monthly or seasonal installments.</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span><b>Revolving Flow:</b> Every recovered Taka is credited back to the contributing Groups and immediately disbursed to the next waiting beneficiary.</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span><b>Multi-Group Solidarity:</b> Larger loan amounts (e.g. ৳150,000) can be co-funded proportionally across 2 to 5 donor groups.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Program 2: Sadaqah Deep Dive */}
      <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0">
              <HeartHandshake className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">
                100% Non-Recoverable Benevolent Relief
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                Sadaqah Relief Program
              </h2>
            </div>
          </div>

          <Link
            to="/assistance/apply"
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition-all self-start sm:self-auto"
          >
            Emergency Inquiry →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          <div className="space-y-4">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Target Beneficiaries & Scope
            </h4>
            <p>
              Sadaqah is reserved for situations of acute vulnerability where repayment is neither possible nor humane. This includes life-threatening medical interventions, widows with infant children, orphans, and extreme distress.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <Stethoscope className="w-4 h-4 text-teal-500 mb-1" />
                <p className="font-bold text-slate-900 dark:text-white">Critical Medical</p>
                <p className="text-[10px] text-slate-400">Surgeries, chronic medications, diagnostics</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <GraduationCap className="w-4 h-4 text-teal-500 mb-1" />
                <p className="font-bold text-slate-900 dark:text-white">Education & Stipends</p>
                <p className="text-[10px] text-slate-400">Orphan schooling, technical vocational fees</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Governance & Verification
            </h4>
            <ul className="space-y-2.5">
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                <span><b>Field Verification:</b> Community volunteers conduct physical case verifications and clinical invoice validations.</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                <span><b>Zero Repayment Obligation:</b> The grant is given as an outright gift. Beneficiaries are never asked to return funds.</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                <span><b>Ledger Accountability:</b> Every grant is debited against donor group balances and audited in public reports.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
