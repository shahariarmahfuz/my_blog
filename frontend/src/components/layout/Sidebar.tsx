import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  PieChart,
  Users,
  UserCheck,
  HeartHandshake,
  PiggyBank,
  Gift,
  HandCoins,
  FileText,
  History,
  Settings as SettingsIcon,
  ChevronDown,
  X,
  FileSpreadsheet,
  FolderPlus,
  UserPlus,
  Receipt,
  Clock,
  Calendar,
  Plus,
  Building2,
  Sparkles,
  Sliders,
  ShieldCheck,
  CircleDollarSign,
  BellRing,
  Cpu
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from '../common/BrandLogo';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
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
  section: 'Main' | 'Organization' | 'Transactions' | 'Reporting' | 'Settings';
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  setIsCollapsed,
  mobileOpen,
  onCloseMobile,
  onNavigate,
}) => {
  const { hasPermission } = useAuth();
  const location = useLocation();

  // Helper to determine active section from current route
  const getActiveParentKey = (pathname: string): string | null => {
    if (pathname.startsWith('/app/groups')) return 'groups';
    if (pathname.startsWith('/app/members')) return 'members';
    if (pathname.startsWith('/app/beneficiaries')) return 'beneficiaries';
    if (pathname.startsWith('/app/contributions')) return 'contributions';
    if (pathname.startsWith('/app/donations')) return 'donations';
    if (pathname.startsWith('/app/assistance')) return 'assistance';
    if (pathname.startsWith('/app/settings') || pathname.startsWith('/app/users-roles')) return 'settings';
    return null;
  };

  const [expandedKey, setExpandedKey] = useState<string | null>(() => getActiveParentKey(location.pathname));

  useEffect(() => {
    const activeKey = getActiveParentKey(location.pathname);
    setExpandedKey(activeKey);
  }, [location.pathname]);

  const handleToggleMenu = (key: string) => {
    setExpandedKey((prevKey) => (prevKey === key ? null : key));
  };

  const handleLinkClick = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  const navItems: NavItem[] = [
    // Main
    {
      key: 'dashboard',
      label: 'Dashboard',
      path: '/app/dashboard',
      icon: <PieChart className="w-4 h-4 nav-icon" />,
      permission: 'dashboard.view',
      section: 'Main',
    },
    // Organization
    {
      key: 'groups',
      label: 'Groups',
      icon: <Users className="w-4 h-4 nav-icon" />,
      permission: 'groups.view',
      section: 'Organization',
      children: [
        {
          label: 'Manage Groups',
          path: '/app/groups/manage',
          icon: <Building2 className="w-3.5 h-3.5" />,
          permission: 'groups.view',
        },
        {
          label: 'Add Group',
          path: '/app/groups/add',
          icon: <FolderPlus className="w-3.5 h-3.5" />,
          permission: 'groups.create',
        },
        {
          label: 'Group Fund & Utilization',
          path: '/app/groups/fund',
          icon: <PieChart className="w-3.5 h-3.5" />,
          permission: 'groups.view',
        },
        {
          label: 'Group Financial Ledger',
          path: '/app/groups/ledger',
          icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
          permission: 'groups.view',
        },
      ],
    },
    {
      key: 'members',
      label: 'Members',
      icon: <UserCheck className="w-4 h-4 nav-icon" />,
      permission: 'members.view',
      section: 'Organization',
      children: [
        {
          label: 'Manage Members',
          path: '/app/members/manage',
          icon: <Users className="w-3.5 h-3.5" />,
          permission: 'members.view',
        },
        {
          label: 'Add Member',
          path: '/app/members/add',
          icon: <UserPlus className="w-3.5 h-3.5" />,
          permission: 'members.create',
        },
        {
          label: 'Monthly Contributions',
          path: '/app/members/ledger',
          icon: <Clock className="w-3.5 h-3.5" />,
          permission: 'members.view',
        },
        {
          label: 'Contribution Ledger',
          path: '/app/members/ledger',
          icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
          permission: 'members.view',
        },
        {
          label: 'Member Applications',
          path: '/app/members/applications',
          icon: <FileText className="w-3.5 h-3.5" />,
          permission: 'members.view',
        },
      ],
    },
    {
      key: 'beneficiaries',
      label: 'Beneficiaries',
      icon: <HeartHandshake className="w-4 h-4 nav-icon" />,
      permission: 'beneficiaries.view',
      section: 'Organization',
      children: [
        {
          label: 'Manage Beneficiaries',
          path: '/app/beneficiaries/manage',
          icon: <HeartHandshake className="w-3.5 h-3.5" />,
          permission: 'beneficiaries.view',
        },
        {
          label: 'Add Beneficiary',
          path: '/app/beneficiaries/add',
          icon: <UserPlus className="w-3.5 h-3.5" />,
          permission: 'beneficiaries.create',
        },
        {
          label: 'Assistance',
          path: '/app/beneficiaries/ledger',
          icon: <HandCoins className="w-3.5 h-3.5" />,
          permission: 'beneficiaries.view',
        },
        {
          label: 'Qard Hasan',
          path: '/app/assistance/qard-hasan/manage',
          icon: <HandCoins className="w-3.5 h-3.5" />,
          permission: 'assistance.view',
        },
      ],
    },
    // Transactions
    {
      key: 'contributions',
      label: 'Contributions',
      icon: <PiggyBank className="w-4 h-4 nav-icon" />,
      permission: 'contributions.view',
      section: 'Transactions',
      children: [
        {
          label: 'Add Contribution',
          path: '/app/contributions/add',
          icon: <PiggyBank className="w-3.5 h-3.5" />,
          permission: 'contributions.create',
        },
        {
          label: 'Manage Contributions',
          path: '/app/contributions/manage',
          icon: <Receipt className="w-3.5 h-3.5" />,
          permission: 'contributions.view',
        },
        {
          label: 'Due Contributions',
          path: '/app/contributions/due',
          icon: <Clock className="w-3.5 h-3.5" />,
          permission: 'contributions.view',
        },
        {
          label: 'Monthly Summary',
          path: '/app/contributions/monthly-summary',
          icon: <Calendar className="w-3.5 h-3.5" />,
          permission: 'contributions.view',
        },
        {
          label: 'Contribution Ledger',
          path: '/app/contributions/ledger',
          icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
          permission: 'contributions.view',
        },
      ],
    },
    {
      key: 'donations',
      label: 'Donations',
      icon: <Gift className="w-4 h-4 nav-icon text-indigo-600 dark:text-indigo-400" />,
      permission: 'donations.view',
      section: 'Transactions',
      children: [
        {
          label: 'Add Donation',
          path: '/app/donations/add',
          icon: <Plus className="w-3.5 h-3.5" />,
          permission: 'donations.create',
        },
        {
          label: 'Manage Donations',
          path: '/app/donations/manage',
          icon: <Receipt className="w-3.5 h-3.5" />,
          permission: 'donations.view',
        },
        {
          label: 'Donation Ledger',
          path: '/app/donations/ledger',
          icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
          permission: 'donations.view',
        },
      ],
    },
    {
      key: 'assistance',
      label: 'Assistance',
      icon: <HandCoins className="w-4 h-4 nav-icon" />,
      permission: 'assistance.view',
      section: 'Transactions',
      children: [
        {
          sectionHeader: 'QARD HASAN (QH)',
          label: 'Add Qard Hasan',
          path: '/app/assistance/qard-hasan/add',
          icon: <HandCoins className="w-3.5 h-3.5 text-emerald-600" />,
          permission: 'assistance.create',
        },
        {
          label: 'Manage Qard Hasan',
          path: '/app/assistance/qard-hasan/manage',
          icon: <Building2 className="w-3.5 h-3.5" />,
          permission: 'assistance.view',
        },
        {
          label: 'Repayments',
          path: '/app/assistance/qard-hasan/repayments',
          icon: <Receipt className="w-3.5 h-3.5" />,
          permission: 'repayments.view',
        },
        {
          label: 'Qard Hasan Ledger',
          path: '/app/assistance/qard-hasan/ledger',
          icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
          permission: 'assistance.view',
        },
        {
          sectionHeader: 'SADAQAH (SD)',
          label: 'Add Sadaqah',
          path: '/app/assistance/sadaqah/add',
          icon: <HeartHandshake className="w-3.5 h-3.5 text-rose-500" />,
          permission: 'assistance.create',
        },
        {
          label: 'Manage Sadaqah',
          path: '/app/assistance/sadaqah/manage',
          icon: <Building2 className="w-3.5 h-3.5" />,
          permission: 'assistance.view',
        },
        {
          label: 'Sadaqah Ledger',
          path: '/app/assistance/sadaqah/ledger',
          icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
          permission: 'assistance.view',
        },
      ],
    },
    // Reporting
    {
      key: 'reports',
      label: 'Financial Reports',
      path: '/app/reports',
      icon: <FileText className="w-4 h-4 nav-icon" />,
      permission: 'reports.view',
      section: 'Reporting',
      children: [
        {
          label: 'Financial Summary',
          path: '/app/reports?tab=financial',
          permission: 'reports.view',
        },
        {
          label: 'Group Reports',
          path: '/app/reports?tab=groups',
          permission: 'reports.view',
        },
        {
          label: 'Member Reports',
          path: '/app/reports?tab=members',
          permission: 'reports.view',
        },
        {
          label: 'Beneficiary Reports',
          path: '/app/reports?tab=beneficiaries',
          permission: 'reports.view',
        },
        {
          label: 'Export Reports',
          path: '/app/reports?tab=export',
          permission: 'reports.export',
        },
      ],
    },
    {
      key: 'audit_logs',
      label: 'Audit Trail',
      path: '/app/audit-logs',
      icon: <History className="w-4 h-4 nav-icon" />,
      permission: 'audit_logs.view',
      section: 'Reporting',
    },
    // Settings
    {
      key: 'settings',
      label: 'Settings',
      icon: <SettingsIcon className="w-4 h-4 nav-icon" />,
      permission: 'settings.view',
      section: 'Settings',
      children: [
        {
          label: 'Foundation Branding',
          path: '/app/settings/branding',
          icon: <Sparkles className="w-3.5 h-3.5 text-indigo-500" />,
          permission: 'settings.view',
        },
        {
          label: 'General Settings',
          path: '/app/settings/general',
          icon: <Sliders className="w-3.5 h-3.5" />,
          permission: 'settings.view',
        },
        {
          label: 'Foundation Profile',
          path: '/app/settings/profile',
          icon: <Building2 className="w-3.5 h-3.5" />,
          permission: 'settings.view',
        },
        {
          label: 'Users & Roles',
          path: '/app/users-roles',
          icon: <Users className="w-3.5 h-3.5" />,
          permission: 'users.view',
        },
        {
          label: 'Permissions',
          path: '/app/settings/permissions',
          icon: <ShieldCheck className="w-3.5 h-3.5" />,
          permission: 'roles.view',
        },
        {
          label: 'Financial Settings',
          path: '/app/settings/financial',
          icon: <CircleDollarSign className="w-3.5 h-3.5" />,
          permission: 'settings.view',
        },
        {
          label: 'Contribution Settings',
          path: '/app/settings/contributions',
          icon: <PiggyBank className="w-3.5 h-3.5" />,
          permission: 'settings.view',
        },
        {
          label: 'Assistance Settings',
          path: '/app/settings/assistance',
          icon: <HandCoins className="w-3.5 h-3.5" />,
          permission: 'settings.view',
        },
        {
          label: 'Notification Settings',
          path: '/app/settings/notifications',
          icon: <BellRing className="w-3.5 h-3.5" />,
          permission: 'settings.view',
        },
        {
          label: 'System Settings',
          path: '/app/settings/system',
          icon: <Cpu className="w-3.5 h-3.5" />,
          permission: 'settings.view',
        },
      ],
    },
  ];

  const sections: ('Main' | 'Organization' | 'Transactions' | 'Reporting' | 'Settings')[] = [
    'Main',
    'Organization',
    'Transactions',
    'Reporting',
    'Settings',
  ];

  return (
    <aside
      id="sidebar"
      className={`text-slate-700 flex flex-col ${isCollapsed ? 'collapsed' : ''}`}
      aria-label="Sidebar"
    >
      {/* Brand Header */}
      <div className="logo-area flex items-center justify-between gap-2.5 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 relative z-10">
        <BrandLogo variant={isCollapsed ? 'sidebar-collapsed' : 'sidebar'} />
        <button
          id="drawerCloseBtn"
          className="drawer-close"
          aria-label="Close navigation menu"
          onClick={onCloseMobile}
        >
          <X className="w-4 h-4 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white" />
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto scrollbar py-1 px-2 sm:px-2.5 lg:py-2 lg:px-3 relative z-10" aria-label="Main navigation">
        {sections.map((sectionName) => {
          const sectionItems = navItems.filter(
            (item) =>
              item.section === sectionName &&
              (!item.permission || hasPermission(item.permission))
          );

          if (sectionItems.length === 0) return null;

          return (
            <React.Fragment key={sectionName}>
              {!isCollapsed && (
                <p className="section-label px-1">{sectionName}</p>
              )}

              {sectionItems.map((item) => {
                if (item.children) {
                  const isItemActive =
                    location.pathname.startsWith(`/app/${item.key}`) ||
                    (item.key === 'reports' && location.pathname.startsWith('/app/reports')) ||
                    (item.key === 'settings' &&
                      (location.pathname.startsWith('/app/settings') ||
                        location.pathname.startsWith('/app/users-roles')));

                  const isExpanded = expandedKey === item.key;
                  const visibleChildren = item.children.filter(
                    (child) => !child.permission || hasPermission(child.permission)
                  );

                  return (
                    <div
                      key={item.key}
                      className={`menu-item ${isExpanded ? 'open' : ''} ${
                        isItemActive && !isExpanded ? 'active' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleMenu(item.key)}
                        aria-expanded={isExpanded}
                        aria-controls={`sub-${item.key}`}
                        className="menu-title justify-between px-2.5 sm:px-3"
                      >
                        <span className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                          <span className="w-5 text-center flex-shrink-0 flex items-center justify-center">
                            {item.icon}
                          </span>
                          {!isCollapsed && (
                            <span className="truncate">{item.label}</span>
                          )}
                        </span>
                        {!isCollapsed && (
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-slate-400 chevron-icon opacity-60 ${
                              isExpanded ? 'rotate-180 opacity-100 text-indigo-600 dark:text-indigo-400' : ''
                            }`}
                          />
                        )}
                      </button>

                      {/* Submenu Accordion */}
                      {!isCollapsed && (
                        <div
                          id={`sub-${item.key}`}
                          className={`submenu mt-0.5 ${isExpanded ? 'open' : ''}`}
                        >
                          {visibleChildren.map((subItem, idx) => (
                            <React.Fragment key={subItem.path || idx}>
                              {subItem.sectionHeader && (
                                <div className="pt-1.5 pb-0.5 px-2.5 text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1 first:mt-0 first:pt-0.5">
                                  {subItem.sectionHeader}
                                </div>
                              )}
                              <NavLink
                                to={subItem.path}
                                onClick={handleLinkClick}
                                className={({ isActive }) =>
                                  isActive ? 'active' : ''
                                }
                              >
                                <span className="truncate">{subItem.label}</span>
                              </NavLink>
                            </React.Fragment>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                // Simple items without submenus
                const isItemActive =
                  item.path &&
                  (location.pathname === item.path ||
                    (item.path !== '/app/dashboard' &&
                      location.pathname.startsWith(item.path)));

                return (
                  <div
                    key={item.key}
                    className={`menu-item ${isItemActive ? 'active' : ''}`}
                  >
                    <NavLink
                      to={item.path || '#'}
                      onClick={handleLinkClick}
                      className={({ isActive }) =>
                        `menu-title gap-2.5 sm:gap-3 px-2.5 sm:px-3 ${isActive ? 'active' : ''}`
                      }
                    >
                      <span className="w-5 text-center flex-shrink-0 flex items-center justify-center">
                        {item.icon}
                      </span>
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer px-3.5 py-2 sm:px-4 sm:py-2.5 lg:px-4 lg:py-3 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse"></div>
          <p className="text-[0.625rem] text-slate-400 dark:text-slate-500">© 2026 Foundation • v1.0</p>
        </div>
      </div>
    </aside>
  );
};
