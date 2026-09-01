import React from 'react';
import { Link } from 'react-router-dom';
import {
  HeartHandshake,
  ShieldCheck,
  Building2,
  Mail,
  Phone,
  MapPin,
  ArrowUpRight,
  Lock,
  Sparkles
} from 'lucide-react';

import { BrandLogo } from '../common/BrandLogo';
import { useBranding } from '../../context/BrandingContext';

export const PublicFooter: React.FC = () => {
  const { branding } = useBranding();

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <BrandLogo variant="footer" showText={true} />
            </div>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 max-w-sm">
              An autonomous non-profit benevolent foundation dedicated to eradicating debt exploitation through 100% interest-free revolving microfinance (Qard Hasan) and direct humanitarian relief (Sadaqah).
            </p>
            <div className="flex items-center space-x-3 text-xs pt-1 font-semibold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>100% Transparent Financial Accounting</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Foundation
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/about" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  About Our Mission
                </Link>
              </li>
              <li>
                <Link to="/our-work" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Our Work & Programs
                </Link>
              </li>
              <li>
                <Link to="/stories" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Impact Stories & Blog
                </Link>
              </li>
              <li>
                <Link to="/impact" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Transparency & Metrics
                </Link>
              </li>
              <li>
                <Link to="/groups" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Fund Group Circles
                </Link>
              </li>
            </ul>
          </div>

          {/* Member & Assistance */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Get Involved
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/member/apply" className="hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                  <span>Become a Member</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </li>
              <li>
                <Link to="/member/application-status" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Check Member Application
                </Link>
              </li>
              <li>
                <Link to="/assistance/apply" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Request Assistance
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Contact & Inquiries
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Headquarters
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Level 4, Al-Khair Tower, Dhanmondi 27, Dhaka, Bangladesh</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>+880 1700-112233</span>
              </li>
              <li className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>contact@alkhairfoundation.org</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs gap-4 text-slate-400">
          <p>© 2026 Al-Khair Foundation. All rights reserved. Built on pure Islamic financial principles.</p>
          <div className="flex items-center space-x-4">
            <Link to="/contact" className="hover:text-slate-600 dark:hover:text-slate-200">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link to="/login" className="hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center space-x-1 font-semibold">
              <Lock className="w-3 h-3" />
              <span>Staff Login</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
