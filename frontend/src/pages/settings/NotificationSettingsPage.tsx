import React, { useState, useEffect } from 'react';
import { settingsApi } from '../../api/client';
import { NotificationSettings } from '../../types';
import { SettingsNav } from '../../components/settings/SettingsNav';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { BellRing, Save, Mail, MessageSquare, AlertCircle } from 'lucide-react';

export const NotificationSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSettings>({
    notify_due_contributions: true,
    notify_overdue_repayments: true,
    notify_disbursements: true,
    email_notifications_enabled: false,
    sms_notifications_enabled: false,
    sender_email: 'no-reply@foundation.org',
    admin_alert_email: 'admin@foundation.org',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { success, error } = useToast();
  const { hasPermission } = useAuth();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await settingsApi.getSection<NotificationSettings>('notifications');
        if (res.data.config_data) {
          setSettings((prev) => ({ ...prev, ...res.data.config_data }));
        }
      } catch (err) {
        error('Failed to load notification settings');
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
      await settingsApi.updateSection('notifications', settings);
      success('Notification preferences updated successfully!');
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to update notification settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
          <BellRing className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-500 dark:text-indigo-400" />
          <span>Notification Settings</span>
        </h1>
      </div>

      <SettingsNav />

      <Card title="Event Trigger & Dispatch Rules">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Triggers */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Automated System Triggers
              </h4>

              <div className="flex items-center space-x-2.5">
                <input
                  type="checkbox"
                  id="notify_due"
                  checked={settings.notify_due_contributions}
                  onChange={(e) => setSettings({ ...settings, notify_due_contributions: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="notify_due" className="font-semibold text-slate-800 dark:text-slate-200">
                  Due Contribution Alerts: Flag members when a monthly cycle opens and grace period is active
                </label>
              </div>

              <div className="flex items-center space-x-2.5">
                <input
                  type="checkbox"
                  id="notify_overdue"
                  checked={settings.notify_overdue_repayments}
                  onChange={(e) => setSettings({ ...settings, notify_overdue_repayments: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="notify_overdue" className="font-semibold text-slate-800 dark:text-slate-200">
                  Overdue Loan Installment Alerts: Trigger warnings when Qard Hasan installments exceed due dates
                </label>
              </div>

              <div className="flex items-center space-x-2.5">
                <input
                  type="checkbox"
                  id="notify_disburse"
                  checked={settings.notify_disbursements}
                  onChange={(e) => setSettings({ ...settings, notify_disbursements: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="notify_disburse" className="font-semibold text-slate-800 dark:text-slate-200">
                  Financial Disbursement Notifications: Alert foundation managers on loan/grant disbursements
                </label>
              </div>
            </div>

            {/* Email / SMS Gateway Parameters */}
            <div className="p-4 rounded-2xl bg-sky-50/40 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-sky-800 dark:text-sky-300 flex items-center space-x-1.5">
                <Mail className="w-4 h-4 text-sky-600" />
                <span>External Notification Gateways (Email & SMS)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="System Outgoing Sender Email"
                  type="email"
                  value={settings.sender_email || ''}
                  onChange={(e) => setSettings({ ...settings, sender_email: e.target.value })}
                />

                <Input
                  label="Super Admin Alert Destination Email"
                  type="email"
                  value={settings.admin_alert_email || ''}
                  onChange={(e) => setSettings({ ...settings, admin_alert_email: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-4 text-xs pt-1">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enable_email"
                    checked={settings.email_notifications_enabled}
                    onChange={(e) => setSettings({ ...settings, email_notifications_enabled: e.target.checked })}
                    className="w-4 h-4 text-sky-600 rounded"
                  />
                  <label htmlFor="enable_email" className="font-semibold text-slate-800 dark:text-slate-200">
                    Enable SMTP Email Dispatch
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enable_sms"
                    checked={settings.sms_notifications_enabled}
                    onChange={(e) => setSettings({ ...settings, sms_notifications_enabled: e.target.checked })}
                    className="w-4 h-4 text-sky-600 rounded"
                  />
                  <label htmlFor="enable_sms" className="font-semibold text-slate-800 dark:text-slate-200">
                    Enable SMS Gateway Reminders
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              {hasPermission('settings.edit') && (
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={saving}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Save Notification Settings
                </Button>
              )}
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};
