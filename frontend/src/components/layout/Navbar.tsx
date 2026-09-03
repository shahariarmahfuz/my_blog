import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu,
  Sun,
  Moon,
  User as UserIcon,
  Settings,
  Key,
  LogOut,
  ChevronDown,
  Globe,
  Search,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface NavbarProps {
  onToggleMobileSidebar: () => void;
  onToggleCollapse?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleMobileSidebar,
  onToggleCollapse,
}) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    setDropdownOpen(false);
    if (window.confirm('Are you sure you want to log out of the Foundation Management System?')) {
      logout();
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'A';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Derive dynamic page title & subtitle based on current route
  const getPageHeader = () => {
    const path = location.pathname;
    if (path === '/app/dashboard' || path === '/app') {
      return {
        title: 'Dashboard',
        subtitle: "Welcome! Today's overall foundation status",
      };
    }
    if (path.startsWith('/app/groups')) {
      return {
        title: 'Groups',
        subtitle: 'Manage fund groups, allocations and utilization',
      };
    }
    if (path.startsWith('/app/members')) {
      return {
        title: 'Members',
        subtitle: 'Manage foundation members, schedules and records',
      };
    }
    if (path.startsWith('/app/beneficiaries')) {
      return {
        title: 'Beneficiaries',
        subtitle: 'Manage aid recipients and assistance profiles',
      };
    }
    if (path.startsWith('/app/contributions')) {
      return {
        title: 'Contributions',
        subtitle: 'Manage member periodic dues and collections',
      };
    }
    if (path.startsWith('/app/donations')) {
      return {
        title: 'Donations',
        subtitle: 'External non-member donations and general fund gifts',
      };
    }
    if (path.startsWith('/app/assistance')) {
      return {
        title: 'Assistance',
        subtitle: 'Qard Hasan micro-credits and Sadaqah relief programs',
      };
    }
    if (path.startsWith('/app/reports')) {
      return {
        title: 'Financial Reports',
        subtitle: 'Financial statements, dues summary, and data exports',
      };
    }
    if (path.startsWith('/app/audit-logs')) {
      return {
        title: 'Audit Trail',
        subtitle: 'System security logs and operational history',
      };
    }
    if (path.startsWith('/app/settings') || path.startsWith('/app/users-roles')) {
      return {
        title: 'Settings',
        subtitle: 'Foundation profile, branding and administrative setup',
      };
    }
    if (path.startsWith('/app/profile') || path.startsWith('/app/account')) {
      return {
        title: 'Account Settings',
        subtitle: 'Manage your administrator credentials and profile',
      };
    }
    return {
      title: 'Foundation',
      subtitle: 'Management System',
    };
  };

  const { title, subtitle } = getPageHeader();

  const handleHamburgerClick = () => {
    if (window.innerWidth >= 1024) {
      if (onToggleCollapse) onToggleCollapse();
    } else {
      onToggleMobileSidebar();
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 px-3.5 sm:px-6 py-2 sm:py-3 flex items-center justify-between shadow-sm gap-2 sm:gap-3 sticky top-0 z-30">
      {/* Left: Hamburger & Dynamic Page Header */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          id="hamburgerBtn"
          onClick={handleHamburgerClick}
          aria-label="Toggle navigation menu"
          className="text-slate-600 hover:text-indigo-600 p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 transition flex-shrink-0 flex items-center justify-center"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h2 className="text-base sm:text-xl font-bold text-slate-800 truncate leading-tight">{title}</h2>
          <p className="text-xs text-slate-500 truncate hidden sm:block mt-0.5">{subtitle}</p>
        </div>
      </div>

      {/* Right: Search & Actions */}
      <div className="flex items-center gap-1.5 sm:gap-4 flex-shrink-0">
        {/* Search Bar */}
        <div className="relative hidden md:block">
          <input
            type="text"
            placeholder="Search..."
            className="bg-slate-100 pl-10 pr-4 py-2 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-52 lg:w-64 border-0"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        {/* Public Website quick link */}
        <Link
          to="/"
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
          title="Visit Public Website"
        >
          <Globe className="w-3.5 h-3.5 text-indigo-500" />
          <span>Public Website</span>
        </Link>

        {/* Dark / Light Mode toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 sm:p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors flex items-center justify-center"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-500" />}
        </button>

        {/* User Profile Dropdown Button */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 sm:gap-3 hover:bg-slate-100 p-1 sm:p-1.5 pr-1.5 sm:pr-3 rounded-lg transition"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            {user?.profile_picture ? (
              <img
                src={user.profile_picture}
                alt={user.full_name}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shadow-sm flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-sm flex-shrink-0">
                {getInitials(user?.full_name)}
              </div>
            )}

            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold leading-tight text-slate-800 truncate max-w-[130px]">
                {user?.full_name || 'Admin'}
              </p>
              <p className="text-xs text-slate-500 leading-tight truncate max-w-[130px]">
                {user?.role?.name || 'Manager'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div
              id="userDropdown"
              className="user-dropdown show absolute right-0 top-full mt-1.5 sm:mt-2 w-60 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-fadeIn"
            >
              {/* Dropdown Header */}
              <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-100">
                <p className="text-sm font-bold text-slate-800 truncate">
                  {user?.full_name || 'Admin'}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {user?.email || user?.username || 'admin@foundation.org'}
                </p>
              </div>

              {/* Menu Links */}
              <div className="py-2">
                <Link
                  to="/app/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:pl-5 transition-all"
                >
                  <UserIcon className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                  <span>Member Profile</span>
                </Link>

                <Link
                  to="/app/settings/general"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:pl-5 transition-all"
                >
                  <Settings className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span>Settings</span>
                </Link>

                <Link
                  to="/app/account/change-password"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:pl-5 transition-all"
                >
                  <Key className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span>Change Password</span>
                </Link>
              </div>

              {/* Logout */}
              <div className="border-t border-slate-100 py-2">
                <button
                  onClick={handleLogout}
                  className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 font-semibold transition-all"
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
