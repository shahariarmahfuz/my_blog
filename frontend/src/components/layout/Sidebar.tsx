import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  FolderPlus,
  Users2,
  UserPlus,
  FileSpreadsheet,
  PieChart,
  ClipboardList,
  HeartHandshake,
  PiggyBank,
  HandCoins,
  Receipt,
  Clock,
  FileBarChart2,
  History,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Shield,
  Sliders,
  CircleDollarSign,
  BellRing,
  Cpu,
  Globe,
  Sparkles,
  Calendar
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from '../common/BrandLogo';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
  onNavigate?: () => void;
}

interface NavSubItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
  permission?: string;
  sectionHeader?: string;
}

interface NavItem {
  key: string;
  label: string;
  path?: string;
  icon: React.ReactNode;
  permission?: string;
  children?: NavSubItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed, onNavigate }) => {
  const { user, logout, hasPermission } = useAuth();
  const location = useLocation();

  // Helper to determine active section from current route
  const getActiveParentKey = (pathname: string): string | null => {
    if (pathname.startsWith('/app/groups')) return 'groups';
    if (pathname.startsWith('/app/members')) return 'members';
    if (pathname.startsWith('/app/beneficiaries')) return 'beneficiaries';
    if (pathname.startsWith('/app/contributions')) return 'contributions';
    if (pathname.startsWith('/app/assistance')) return 'assistance';
    if (pathname.startsWith('/app/settings')) return 'settings';
    return null;
  };

  // State to track single expanded menu key (Accordion behavior)
  // Initially starts with ONLY the active route parent expanded, or all collapsed if on non-parent route
  const [expandedKey, setExpandedKey] = useState<string | null>(() => getActiveParentKey(location.pathname));

  // Sync expanded section whenever route changes
  useEffect(() => {
    const activeKey = getActiveParentKey(location.pathname);
    setExpandedKey(activeKey);
  }, [location.pathname]);

  // Accordion toggle: opening one collapses all others; clicking the open one closes it
  const handleToggleMenu = (key: string) => {
    setExpandedKey((prevKey) => (prevKey === key ? null : key));
  };

  const handleLinkClick = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  const navItems: NavItem[] = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      path: '/app/dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      permission: 'dashboard.view',
    },
    {
      key: 'groups',
      label: 'Group',
      icon: <Building2 className="w-5 h-5" />,
      permission: 'groups.view',
      children: [
        {
          label: 'Add Group',
          path: '/app/groups/add',
          icon: <FolderPlus className="w-4 h-4" />,
          permission: 'groups.create',
        },
        {
          label: 'Manage Group',
          path: '/app/groups/manage',
          icon: <Building2 className="w-4 h-4" />,
          permission: 'groups.view',
        },
        {
          label: 'Group Ledger',
          path: '/app/groups/ledger',
          icon: <FileSpreadsheet className="w-4 h-4" />,
          permission: 'groups.view',
        },
        {
          label: 'Group Fund',
          path: '/app/groups/fund',
          icon: <PieChart className="w-4 h-4" />,
          permission: 'groups.view',
        },
      ],
    },
    {
      key: 'members',
      label: 'Member',
      icon: <Users2 className="w-5 h-5" />,
      permission: 'members.view',
      children: [
        {
          label: 'Add Member',
          path: '/app/members/add',
          icon: <UserPlus className="w-4 h-4" />,
          permission: 'members.create',
        },
        {
          label: 'Manage Member',
          path: '/app/members/manage',
          icon: <Users2 className="w-4 h-4" />,
          permission: 'members.view',
        },
        {
          label: 'Member Ledger',
          path: '/app/members/ledger',
          icon: <FileSpreadsheet className="w-4 h-4" />,
          permission: 'members.view',
        },
        {
          label: 'Member Application',
          path: '/app/members/applications',
          icon: <ClipboardList className="w-4 h-4" />,
          permission: 'members.view',
        },
      ],
    },
    {
      key: 'beneficiaries',
      label: 'Beneficiaries',
      icon: <HeartHandshake className="w-5 h-5" />,
      permission: 'beneficiaries.view',
      children: [
        {
          label: 'Add Beneficiary',
          path: '/app/beneficiaries/add',
          icon: <UserPlus className="w-4 h-4" />,
          permission: 'beneficiaries.create',
        },
        {
          label: 'Manage Beneficiary',
          path: '/app/beneficiaries/manage',
          icon: <HeartHandshake className="w-4 h-4" />,
          permission: 'beneficiaries.view',
        },
        {
          label: 'Beneficiary Ledger',
          path: '/app/beneficiaries/ledger',
          icon: <FileSpreadsheet className="w-4 h-4" />,
          permission: 'beneficiaries.view',
        },
      ],
    },
    {
      key: 'contributions',
      label: 'Contribution',
      icon: <PiggyBank className="w-5 h-5" />,
      permission: 'contributions.view',
      children: [
        {
          label: 'Add Contribution',
          path: '/app/contributions/add',
          icon: <PiggyBank className="w-4 h-4" />,
          permission: 'contributions.create',
        },
        {
          label: 'Manage Contribution',
          path: '/app/contributions/manage',
          icon: <Receipt className="w-4 h-4" />,
          permission: 'contributions.view',
        },
        {
          label: 'Due Contribution',
          path: '/app/contributions/due',
          icon: <Clock className="w-4 h-4" />,
          permission: 'contributions.view',
        },
        {
          label: 'Contribution Ledger',
          path: '/app/contributions/ledger',
          icon: <FileSpreadsheet className="w-4 h-4" />,
          permission: 'contributions.view',
        },
        {
          label: 'Monthly Summary',
          path: '/app/contributions/monthly-summary',
          icon: <Calendar className="w-4 h-4" />,
          permission: 'contributions.view',
        },
      ],
    },
    {
      key: 'assistance',
      label: 'Assistance',
      icon: <HandCoins className="w-5 h-5" />,
      permission: 'assistance.view',
      children: [
        // Qard Hasan (QH) Section
        {
          sectionHeader: 'QARD HASAN (QH)',
          label: 'Add Qard Hasan',
          path: '/app/assistance/qard-hasan/add',
          icon: <HandCoins className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />,
          permission: 'assistance.create',
        },
        {
          label: 'Manage Qard Hasan',
          path: '/app/assistance/qard-hasan/manage',
          icon: <Building2 className="w-4 h-4" />,
          permission: 'assistance.view',
        },
        {
          label: 'Repayments',
          path: '/app/assistance/qard-hasan/repayments',
          icon: <Receipt className="w-4 h-4" />,
          permission: 'repayments.view',
        },
        {
          label: 'Qard Hasan Ledger',
          path: '/app/assistance/qard-hasan/ledger',
          icon: <FileSpreadsheet className="w-4 h-4" />,
          permission: 'assistance.view',
        },
        // Sadaqah (SD) Section
        {
          sectionHeader: 'SADAQAH (SD)',
          label: 'Add Sadaqah',
          path: '/app/assistance/sadaqah/add',
          icon: <HeartHandshake className="w-4 h-4 text-rose-500 dark:text-rose-400" />,
          permission: 'assistance.create',
        },
        {
          label: 'Manage Sadaqah',
          path: '/app/assistance/sadaqah/manage',
          icon: <Building2 className="w-4 h-4" />,
          permission: 'assistance.view',
        },
        {
          label: 'Sadaqah Ledger',
          path: '/app/assistance/sadaqah/ledger',
          icon: <FileSpreadsheet className="w-4 h-4" />,
          permission: 'assistance.view',
        },
      ],
    },
    {
      key: 'reports',
      label: 'Financial Reports',
      path: '/app/reports',
      icon: <FileBarChart2 className="w-5 h-5" />,
      permission: 'reports.view',
    },
    {
      key: 'audit_logs',
      label: 'Audit Trail',
      path: '/app/audit-logs',
      icon: <History className="w-5 h-5" />,
      permission: 'audit_logs.view',
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: <Sliders className="w-5 h-5" />,
      permission: 'settings.view',
      children: [
        {
          label: 'Foundation Branding',
          path: '/app/settings/branding',
          icon: <Sparkles className="w-4 h-4 text-emerald-500" />,
          permission: 'settings.view',
        },
        {
          label: 'General Settings',
          path: '/app/settings/general',
          icon: <Sliders className="w-4 h-4" />,
          permission: 'settings.view',
        },
        {
          label: 'Foundation Profile',
          path: '/app/settings/profile',
          icon: <Building2 className="w-4 h-4" />,
          permission: 'settings.view',
        },
        {
          label: 'User & Roles',
          path: '/app/settings/users-roles',
          icon: <Users2 className="w-4 h-4" />,
          permission: 'users.view',
        },
        {
          label: 'Permissions',
          path: '/app/settings/permissions',
          icon: <ShieldCheck className="w-4 h-4" />,
          permission: 'roles.view',
        },
        {
          label: 'Financial Settings',
          path: '/app/settings/financial',
          icon: <CircleDollarSign className="w-4 h-4" />,
          permission: 'settings.view',
        },
        {
          label: 'Contribution Settings',
          path: '/app/settings/contributions',
          icon: <PiggyBank className="w-4 h-4" />,
          permission: 'settings.view',
        },
        {
          label: 'Assistance Settings',
          path: '/app/settings/assistance',
          icon: <HandCoins className="w-4 h-4" />,
          permission: 'settings.view',
        },
        {
          label: 'Notification Settings',
          path: '/app/settings/notifications',
          icon: <BellRing className="w-4 h-4" />,
          permission: 'settings.view',
        },
        {
          label: 'System Settings',
          path: '/app/settings/system',
          icon: <Cpu className="w-4 h-4" />,
          permission: 'settings.view',
        },
      ],
    },
    {
      key: 'users_roles',
      label: 'Users & Roles',
      path: '/app/users-roles',
      icon: <ShieldCheck className="w-5 h-5" />,
      permission: 'users.view',
    },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 transition-all duration-300 flex flex-col justify-between shadow-sm dark:shadow-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div>
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-800">
          {!isCollapsed && (
            <BrandLogo variant="sidebar" />
          )}

          {isCollapsed && (
            <BrandLogo variant="sidebar-collapsed" />
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
              isCollapsed ? 'hidden' : 'block'
            }`}
            title="Toggle Sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-210px)]">
          {navItems
            .filter((item) => !item.permission || hasPermission(item.permission))
            .map((item) => {
              if (item.children) {
                const isItemActive = location.pathname.startsWith(`/app/${item.key}`);
                const isExpanded = expandedKey === item.key;
                const visibleChildren = item.children.filter(
                  (child) => !child.permission || hasPermission(child.permission)
                );

                if (isCollapsed) {
                  return (
                    <NavLink
                      key={item.key}
                      to={visibleChildren[0]?.path || `/app/${item.key}`}
                      onClick={handleLinkClick}
                      className={`flex items-center justify-center px-0 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                        isItemActive
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
                      }`}
                      title={item.label}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                    </NavLink>
                  );
                }

                return (
                  <div key={item.key} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => handleToggleMenu(item.key)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 group ${
                        isItemActive && !isExpanded
                          ? 'bg-emerald-50 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="flex-shrink-0 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                          {item.icon}
                        </span>
                        <span className="truncate font-semibold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">
                          {item.label}
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''
                        }`}
                      />
                    </button>

                    {/* Submenu links (Accordion: only rendered when this section is the active expandedKey) */}
                    {isExpanded && (
                      <div className="pl-3 pr-1 py-1 space-y-1 border-l-2 border-slate-200 dark:border-slate-800 ml-5">
                        {visibleChildren.map((subItem, sIdx) => (
                          <React.Fragment key={subItem.path || sIdx}>
                            {subItem.sectionHeader && (
                              <div className="pt-2 pb-1 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800/60 mt-1.5 first:mt-0 first:border-0 first:pt-0.5">
                                {subItem.sectionHeader}
                              </div>
                            )}
                            <NavLink
                              to={subItem.path}
                              onClick={handleLinkClick}
                              className={({ isActive }) =>
                                `flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                                  isActive
                                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                }`
                              }
                            >
                              <span className="flex-shrink-0">{subItem.icon}</span>
                              <span className="truncate">{subItem.label}</span>
                            </NavLink>
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              // Simple item without children
              const isDirectActive = location.pathname === item.path;

              if (isCollapsed) {
                return (
                  <NavLink
                    key={item.key}
                    to={item.path!}
                    onClick={handleLinkClick}
                    className={`flex items-center justify-center px-0 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                      isDirectActive
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
                    }`}
                    title={item.label}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                  </NavLink>
                );
              }

              return (
                <NavLink
                  key={item.key}
                  to={item.path!}
                  onClick={handleLinkClick}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 group ${
                    isDirectActive
                      ? 'bg-emerald-600 text-white font-bold shadow-sm shadow-emerald-600/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <span className={`flex-shrink-0 transition-colors ${isDirectActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                    {item.icon}
                  </span>
                  <span className="truncate font-semibold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
        </nav>
      </div>

      {/* User profile & Quick Links */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
        <NavLink
          to="/"
          onClick={handleLinkClick}
          className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          title="Go to Public Website"
        >
          <Globe className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          {!isCollapsed && <span>Public Website</span>}
        </NavLink>

        <div className="flex items-center justify-between">
          {!isCollapsed && user && (
            <NavLink
              to="/app/profile"
              onClick={handleLinkClick}
              className="flex items-center space-x-2.5 overflow-hidden group hover:opacity-80 transition-opacity"
              title="View My Profile"
            >
              {user.profile_picture ? (
                <img
                  src={user.profile_picture}
                  alt={user.full_name}
                  className="w-8 h-8 rounded-full object-cover border border-emerald-500 flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="truncate">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {user.full_name}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  @{user.username || 'admin'} • {user.role?.name || 'Staff'}
                </p>
              </div>
            </NavLink>
          )}

          <button
            onClick={logout}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
