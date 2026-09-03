import React, { useState, useEffect } from 'react';
import { settingsApi } from '../../api/client';
import { ContributionSettings } from '../../types';
import { SettingsNav } from '../../components/settings/SettingsNav';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { PiggyBank, Save, Info } from 'lucide-react';

export const ContributionSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<ContributionSettings>({
    default_monthly_contribution: 500,
    default_frequency: 'MONTHLY',
    monthly_due_day: 10,
    grace_period_days: 5,
    overdue_threshold_days: 35,
    allow_partial_contributions: true,
    require_receipt_reference: false,
    auto_receipt_generation: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { success, error } = useToast();
  const { hasPermission } = useAuth();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await settingsApi.getSection<ContributionSettings>('contributions');
        if (res.data.config_data) {
          setSettings((prev) => ({
            ...prev,
            ...res.data.config_data,
            default_monthly_contribution: res.data.config_data.default_monthly_contribution ?? 500,
            monthly_due_day: res.data.config_data.monthly_due_day ?? 10,
          }));
        }
      } catch (err) {
        error('Failed to load contribution settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsApi.updateSection('contributions', settings);
      success('Contribution rules & cycle settings updated successfully!');
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to update contribution settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
          <PiggyBank className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-500 dark:text-indigo-400" />
          <span>Contribution Settings</span>
        </h1>
      </div>

      <SettingsNav />

      <Card title="Monthly Contribution Rules & Due Schedule">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Global Default Monthly Due */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="font-bold text-sm text-emerald-950 dark:text-emerald-300 flex items-center space-x-2">
                  <PiggyBank className="w-4 h-4 text-emerald-500" />
                  <span>Default Monthly Contribution Amount</span>
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Pre-filled as the default pledge when registering new Members. Members can have custom amounts configured individually.
                </p>
              </div>
              <div className="w-full sm:w-56">
                <Input
                  label="Default Amount (৳)"
                  type="number"
                  min="0"
                  step="10"
                  value={settings.default_monthly_contribution?.toString() || '500'}
                  onChange={(e) => setSettings({ ...settings, default_monthly_contribution: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Standard Contribution Frequency"
                value={settings.default_frequency}
                onChange={(e) => setSettings({ ...settings, default_frequency: e.target.value })}
              >
                <option value="MONTHLY">Monthly Billing Cycle</option>
                <option value="QUARTERLY">Quarterly Cycle</option>
                <option value="ANNUALLY">Annual Cycle</option>
              </Select>

              <Input
                label="Monthly Due Day of the Month (1-28)"
                type="number"
                min="1"
                max="28"
                value={settings.monthly_due_day.toString()}
                onChange={(e) => setSettings({ ...settings, monthly_due_day: parseInt(e.target.value) || 10 })}
                required
              />

              <Input
                label="Grace Period Days (Before Flagged Overdue)"
                type="number"
                min="0"
                max="30"
                value={settings.grace_period_days.toString()}
                onChange={(e) => setSettings({ ...settings, grace_period_days: parseInt(e.target.value) || 0 })}
                required
              />

              <Input
                label="Overdue Threshold (Days before Warning)"
                type="number"
                min="1"
                max="90"
                value={settings.overdue_threshold_days.toString()}
                onChange={(e) => setSettings({ ...settings, overdue_threshold_days: parseInt(e.target.value) || 35 })}
                required
              />
            </div>

            {/* Checkbox rules */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center space-x-2.5">
                <input
                  type="checkbox"
                  id="allow_partial"
                  checked={settings.allow_partial_contributions}
                  onChange={(e) => setSettings({ ...settings, allow_partial_contributions: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="allow_partial" className="font-semibold text-slate-800 dark:text-slate-200">
                  Allow Partial / Flexible Contribution Amounts (e.g. paying ৳300 against ৳500 due)
                </label>
              </div>

              <div className="flex items-center space-x-2.5">
                <input
                  type="checkbox"
                  id="auto_receipt"
                  checked={settings.auto_receipt_generation}
                  onChange={(e) => setSettings({ ...settings, auto_receipt_generation: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="auto_receipt" className="font-semibold text-slate-800 dark:text-slate-200">
                  Automatically generate unique Voucher Number (CON-YYYY-XXXX) for every contribution
                </label>
              </div>
            </div>

            <div className="flex items-start space-x-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <span>
                <b>Immutability Note:</b> Updating the global default amount will apply to newly generated cycles and new member registrations. Past historical dues will never be retroactively modified.
              </span>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              {hasPermission('settings.edit') && (
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={saving}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Save Contribution Settings
                </Button>
              )}
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};
