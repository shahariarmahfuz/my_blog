import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Sliders,
  Building2,
  Users2,
  ShieldCheck,
  CircleDollarSign,
  PiggyBank,
  HandCoins,
  BellRing,
  Cpu
} from 'lucide-react';

const SETTING_TABS = [
  { label: 'General', path: '/app/settings/general', icon: Sliders },
  { label: 'Foundation Profile', path: '/app/settings/profile', icon: Building2 },
  { label: 'Users & Roles', path: '/app/settings/users-roles', icon: Users2 },
  { label: 'Permissions Matrix', path: '/app/settings/permissions', icon: ShieldCheck },
  { label: 'Financial', path: '/app/settings/financial', icon: CircleDollarSign },
  { label: 'Contributions', path: '/app/settings/contributions', icon: PiggyBank },
  { label: 'Assistance', path: '/app/settings/assistance', icon: HandCoins },
  { label: 'Notifications', path: '/app/settings/notifications', icon: BellRing },
  { label: 'System', path: '/app/settings/system', icon: Cpu },
];

export const SettingsNav: React.FC = () => {
  return (
    <div className="border-b border-slate-200 dark:border-slate-800 pb-1 overflow-x-auto no-scrollbar">
      <nav className="flex space-x-1.5 min-w-max">
        {SETTING_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`
              }
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
