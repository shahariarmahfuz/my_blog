import React, { useState, useEffect } from 'react';
import { settingsApi } from '../../api/client';
import { GeneralSettings } from '../../types';
import { SettingsNav } from '../../components/settings/SettingsNav';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Sliders, Save, CheckCircle2 } from 'lucide-react';

export const GeneralSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<GeneralSettings>({
    foundation_name: 'Al-Khair Foundation',
    logo_url: '',
    currency: 'BDT (৳)',
    timezone: 'Asia/Dhaka (GMT+6)',
    date_format: 'YYYY-MM-DD',
    language: 'English (en-US)',
    theme_preference: 'dark',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { success, error } = useToast();
  const { hasPermission } = useAuth();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await settingsApi.getSection<GeneralSettings>('general');
        if (res.data.config_data) {
          setSettings((prev) => ({ ...prev, ...res.data.config_data }));
        }
      } catch (err) {
        error('Failed to load general settings');
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
      await settingsApi.updateSection('general', settings);
      success('General system settings updated successfully!');
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to update general settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
          <Sliders className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-500 dark:text-indigo-400" />
          <span>General Settings</span>
        </h1>
      </div>

      <SettingsNav />

      <Card title="General System Defaults">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Foundation / Organization Name"
                value={settings.foundation_name}
                onChange={(e) => setSettings({ ...settings, foundation_name: e.target.value })}
                required
              />

              <Input
                label="Branding Logo Image URL"
                placeholder="https://example.org/logo.png"
                value={settings.logo_url || ''}
                onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
              />

              <Select
                label="Default System Currency"
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              >
                <option value="BDT (৳)">BDT — Bangladeshi Taka (৳)</option>
                <option value="USD ($)">USD — US Dollar ($)</option>
                <option value="EUR (€)">EUR — Euro (€)</option>
                <option value="GBP (£)">GBP — British Pound (£)</option>
                <option value="SAR (﷼)">SAR — Saudi Riyal (﷼)</option>
                <option value="MYR (RM)">MYR — Malaysian Ringgit (RM)</option>
              </Select>

              <Select
                label="System Timezone"
                value={settings.timezone}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              >
                <option value="Asia/Dhaka (GMT+6)">Asia/Dhaka (GMT+6)</option>
                <option value="UTC (GMT+0)">UTC (GMT+0)</option>
                <option value="Asia/Dubai (GMT+4)">Asia/Dubai (GMT+4)</option>
                <option value="Asia/Riyadh (GMT+3)">Asia/Riyadh (GMT+3)</option>
                <option value="Europe/London (GMT+1)">Europe/London (GMT+1)</option>
                <option value="America/New_York (GMT-4)">America/New_York (GMT-4)</option>
              </Select>

              <Select
                label="Date Display Format"
                value={settings.date_format}
                onChange={(e) => setSettings({ ...settings, date_format: e.target.value })}
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-08-31)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 31/08/2026)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 08/31/2026)</option>
                <option value="DD MMM YYYY">DD MMM YYYY (e.g. 31 Aug 2026)</option>
              </Select>

              <Select
                label="System Language"
                value={settings.language}
                onChange={(e) => setSettings({ ...settings, language: e.target.value })}
              >
                <option value="English (en-US)">English (en-US)</option>
                <option value="Bengali (bn-BD)">Bengali (বাংলা)</option>
                <option value="Arabic (ar-SA)">Arabic (العربية)</option>
              </Select>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              {hasPermission('settings.edit') && (
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={saving}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Save General Settings
                </Button>
              )}
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};
