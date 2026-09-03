import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/client';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { useToast } from '../context/ToastContext';
import {
  Key,
  ShieldCheck,
  Lock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

export const ChangePasswordPage: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const { success, error } = useToast();
  const navigate = useNavigate();

  const handleReset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      error('Current password is required.');
      return;
    }
    if (!newPassword) {
      error('New password is required.');
      return;
    }
    if (newPassword.length < 6) {
      error('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      error('New password and confirmation do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      error('New password must be different from your current password.');
      return;
    }

    setSaving(true);
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_new_password: confirmPassword,
      });

      success('Password changed successfully! Please use your new password next time you log in.');
      handleReset();
      navigate('/app/account');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to change password. Please check your current password.';
      error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-12">
      {/* Top Back Link */}
      <Link
        to="/app/account"
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Account Settings</span>
      </Link>

      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
          <Key className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-500 dark:text-indigo-400" />
          <span>Change Account Password</span>
        </h1>
      </div>

      <Card title="Password Security Form">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Current Password */}
          <div>
            <div className="relative">
              <Input
                label="Current Password *"
                type={showCurrent ? 'text' : 'password'}
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <div className="relative">
              <Input
                label="New Password *"
                type={showNew ? 'text' : 'password'}
                placeholder="Enter new password (min. 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {newPassword && (
              <div className="mt-2 text-xs flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${newPassword.length >= 8 ? 'bg-emerald-500' : newPassword.length >= 6 ? 'bg-amber-500' : 'bg-rose-500'}`} />
                <span className="text-[11px] text-slate-500">
                  Strength: {newPassword.length >= 8 ? 'Strong' : newPassword.length >= 6 ? 'Moderate' : 'Too Short'}
                </span>
              </div>
            )}
          </div>

          {/* Confirm New Password */}
          <div>
            <div className="relative">
              <Input
                label="Confirm New Password *"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-[11px] text-rose-500 font-semibold mt-1 flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Passwords do not match</span>
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
            >
              Clear
            </Button>

            <Button
              type="submit"
              variant="primary"
              isLoading={saving}
              leftIcon={<Lock className="w-4 h-4" />}
            >
              Update Password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
