import React, { useState, useEffect } from 'react';
import { settingsApi } from '../../api/client';
import { SystemInfoSettings } from '../../types';
import { SettingsNav } from '../../components/settings/SettingsNav';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  Cpu,
  Save,
  ShieldCheck,
  Server,
  Database,
  Activity,
  AlertTriangle,
  HardDrive,
  RefreshCw
} from 'lucide-react';

export const SystemSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemInfoSettings>({
    system_name: 'Foundation Financial Management System',
    version: 'v2.0.0',
    maintenance_mode: false,
    audit_logging_enabled: true,
    session_timeout_minutes: 1440,
    backup_frequency: 'DAILY',
    last_backup_timestamp: '2026-08-30T23:59:59Z',
    database_engine: 'PostgreSQL (Neon Serverless)',
    backend_framework: 'FastAPI + SQLAlchemy 2.0',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { success, error } = useToast();
  const { user } = useAuth();

  const isSuperAdmin = user?.role?.name === 'Super Admin';

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await settingsApi.getSection<SystemInfoSettings>('system');
        if (res.data.config_data) {
          setSettings((prev) => ({ ...prev, ...res.data.config_data }));
        }
      } catch (err) {
        error('Failed to load system settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      error('Only Super Administrators are permitted to modify system-level parameters.');
      return;
    }
    setSaving(true);
    try {
      await settingsApi.updateSection('system', settings);
      success('System parameters & environment settings updated successfully!');
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to update system settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
          <Cpu className="w-7 h-7 text-emerald-500" />
          <span>System Environment & Infrastructure</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Server runtime information, maintenance state, immutable audit logging toggles, and database status.
        </p>
      </div>

      <SettingsNav />

      {/* System Status Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Operational Status</p>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center space-x-2 mt-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {settings.maintenance_mode ? 'MAINTENANCE MODE' : 'HEALTHY & ONLINE'}
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">FastAPI Backend + Vite Frontend</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Database Engine</p>
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white mt-2">
            PostgreSQL 16
          </h3>
          <p className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">Neon Serverless Cloud Connected</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">System Version</p>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white mt-2">
            {settings.version}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Production Release</p>
        </div>
      </div>

      <Card
        title="System Controls & Security Parameters"
        subtitle="Restricted configuration section strictly accessible by Super Administrators."
      >
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isSuperAdmin && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center space-x-2 text-xs text-amber-800 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>You are in view-only mode. Only Super Administrators can modify system-level parameters.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Application Name"
                value={settings.system_name}
                onChange={(e) => setSettings({ ...settings, system_name: e.target.value })}
                disabled={!isSuperAdmin}
                required
              />

              <Input
                label="Release Version"
                value={settings.version}
                onChange={(e) => setSettings({ ...settings, version: e.target.value })}
                disabled={!isSuperAdmin}
                required
              />

              <Input
                label="Session Timeout (Minutes)"
                type="number"
                min="15"
                max="10080"
                value={settings.session_timeout_minutes.toString()}
                onChange={(e) => setSettings({ ...settings, session_timeout_minutes: parseInt(e.target.value) || 1440 })}
                disabled={!isSuperAdmin}
                required
              />

              <Input
                label="Automated Database Backup Frequency"
                value={settings.backup_frequency}
                onChange={(e) => setSettings({ ...settings, backup_frequency: e.target.value })}
                disabled={!isSuperAdmin}
                required
              />
            </div>

            {/* Toggles */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center space-x-2.5">
                <input
                  type="checkbox"
                  id="audit_toggle"
                  checked={settings.audit_logging_enabled}
                  onChange={(e) => setSettings({ ...settings, audit_logging_enabled: e.target.checked })}
                  disabled={!isSuperAdmin}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="audit_toggle" className="font-semibold text-slate-800 dark:text-slate-200">
                  Comprehensive Audit Logging: Record user mutations, ledger creations, and configuration changes
                </label>
              </div>

              <div className="flex items-center space-x-2.5">
                <input
                  type="checkbox"
                  id="maint_toggle"
                  checked={settings.maintenance_mode}
                  onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                  disabled={!isSuperAdmin}
                  className="w-4 h-4 text-rose-600 rounded"
                />
                <label htmlFor="maint_toggle" className="font-semibold text-slate-800 dark:text-slate-200">
                  Maintenance Mode: Temporarily pause public financial disbursements for scheduled system maintenance
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              {isSuperAdmin && (
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={saving}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Save System Settings
                </Button>
              )}
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};
