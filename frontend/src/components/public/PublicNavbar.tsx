import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import {
  Sun,
  Moon,
  Menu,
  X,
  HeartHandshake,
  UserPlus,
  Search,
  LogIn,
  LayoutDashboard,
  Building2,
  FileText,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

export const PublicNavbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const navLinks = [
    { label: 'About', path: '/about' },
    { label: 'Our Work', path: '/our-work' },
    { label: 'Stories', path: '/stories' },
    { label: 'Impact', path: '/impact' },
    { label: 'Groups', path: '/groups' },
    { label: 'Contact', path: '/contact' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo & Brand (Clean on mobile: Logo + Name only, no tagline) */}
          <Link to="/" className="flex items-center min-w-0 pr-2 group">
            <BrandLogo variant="public" showText={true} />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                    isActive
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/40'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Desktop Right Action Area */}
          <div className="hidden lg:flex items-center space-x-3">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <Link
              to="/member/apply"
              className="px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 transition-all flex items-center space-x-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Become a Member</span>
            </Link>

            {isAuthenticated ? (
              <Link
                to="/app/dashboard"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 border border-slate-700 transition-all flex items-center space-x-1.5"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-emerald-400" />
                <span>Go to Management App</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors flex items-center space-x-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-500" />
                <span>Staff Sign In</span>
              </Link>
            )}
          </div>

          {/* Mobile Single Menu Toggle Button (No duplicate items or secondary header) */}
          <div className="flex lg:hidden items-center flex-shrink-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 -mr-1 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu & Overlay */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 top-16 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden animate-fadeIn"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Navigation Drawer */}
          <div className="fixed inset-x-0 top-16 z-50 lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-2xl px-4 py-5 space-y-4 max-h-[calc(100vh-4rem)] overflow-y-auto animate-slideDown">
            <nav className="space-y-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                      isActive
                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`
                  }
                >
                  <span>{link.label}</span>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </NavLink>
              ))}
            </nav>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
              <Link
                to="/member/apply"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white text-center flex items-center justify-center space-x-2 shadow-md shadow-emerald-600/25 transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>Become a Member</span>
              </Link>

              <Link
                to="/assistance/apply"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-center flex items-center justify-center space-x-2 hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors"
              >
                <HeartHandshake className="w-4 h-4 text-emerald-500" />
                <span>Request Assistance</span>
              </Link>

              {isAuthenticated ? (
                <Link
                  to="/app/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-800 text-white text-center flex items-center justify-center space-x-2 border border-slate-700 shadow-sm"
                >
                  <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                  <span>Go to Management App</span>
                </Link>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-center flex items-center justify-center space-x-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <LogIn className="w-4 h-4 text-slate-500" />
                  <span>Staff Sign In</span>
                </Link>
              )}

              {/* Theme Toggle within Drawer */}
              <button
                onClick={toggleTheme}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center space-x-2 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              >
                {isDark ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span>Switch to Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-slate-600" />
                    <span>Switch to Dark Mode</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
};
