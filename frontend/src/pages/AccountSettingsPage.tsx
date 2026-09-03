import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  Settings,
  Key,
  User,
  Shield,
  Clock,
  Calendar,
  Mail,
  Phone,
  CheckCircle2,
  LogOut,
  ArrowRight,
  ShieldCheck,
  Smartphone
} from 'lucide-react';

export const AccountSettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
          <Settings className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-500 dark:text-indigo-400" />
          <span>Account Settings</span>
        </h1>
      </div>

      {/* Account Overview Card */}
      <Card
        title="Account Overview"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/profile')}
            leftIcon={<User className="w-4 h-4" />}
          >
            Edit Profile
          </Button>
        }
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {user?.profile_picture ? (
            <img
              src={user.profile_picture}
              alt={user.full_name}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-black text-2xl shadow-lg">
              {getInitials(user?.full_name)}
            </div>
          )}

          <div className="space-y-3 text-center sm:text-left flex-1">
            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {user?.full_name}
                </h3>
                <Badge variant={user?.is_active ? 'success' : 'danger'}>
                  {user?.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/50 flex items-center space-x-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">System Role</p>
                  <p className="font-bold text-slate-900 dark:text-white">{user?.role?.name || 'Staff'}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/50 flex items-center space-x-2.5">
                <Clock className="w-4 h-4 text-sky-500 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Last Login</p>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {user?.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Recent Session'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Security & Authentication Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Password Security Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Password & Credentials
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Ensure your account is secured with a strong, distinct password. We recommend updating it periodically.
            </p>
          </div>

          <Link
            to="/app/account/change-password"
            className="inline-flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors"
          >
            <span>Change Account Password</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </Link>
        </div>

        {/* Profile Details Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Profile & Avatar Photo
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Update your public display name, personal avatar photo, and contact phone number.
            </p>
          </div>

          <Link
            to="/app/profile"
            className="inline-flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors"
          >
            <span>Manage My Profile</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* Session Termination Card */}
      <Card
        title="Session & Logout"
        subtitle="End your active session on this device"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Sign out of Management System
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Revokes active session tokens and securely logs out your account.
            </p>
          </div>

          <Button
            variant="ghost"
            onClick={logout}
            className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold text-xs"
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            Sign Out Now
          </Button>
        </div>
      </Card>
    </div>
  );
};
