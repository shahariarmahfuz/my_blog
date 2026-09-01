import React, { useState, useEffect } from 'react';
import { settingsApi } from '../../api/client';
import { AssistanceSettings } from '../../types';
import { SettingsNav } from '../../components/settings/SettingsNav';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  HandCoins,
  Save,
  ShieldCheck,
  HeartHandshake,
  Plus,
  Trash2,
  Lock
} from 'lucide-react';

export const AssistanceSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AssistanceSettings>({
    qard_hasan_interest_rate: 0.00,
    qard_hasan_max_tenure_months: 24,
    default_installments_count: 6,
    default_installment_interval: 1,
    allow_multi_group_funding: true,
    require_guarantor: false,
    sadaqah_categories: ['Emergency Medical', 'Disaster Relief', 'Education Stipend', 'Widow Support', 'Orphan Care', 'General Aid'],
    sadaqah_is_recoverable: false,
  });
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { success, error } = useToast();
  const { hasPermission } = useAuth();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await settingsApi.getSection<AssistanceSettings>('assistance');
        if (res.data.config_data) {
          setSettings((prev) => ({ ...prev, ...res.data.config_data }));
        }
      } catch (err) {
        error('Failed to load assistance settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    if (settings.sadaqah_categories.includes(newCategory.trim())) {
      error('Category already exists.');
      return;
    }
    setSettings((prev) => ({
      ...prev,
      sadaqah_categories: [...prev.sadaqah_categories, newCategory.trim()],
    }));
    setNewCategory('');
  };

  const handleRemoveCategory = (cat: string) => {
    setSettings((prev) => ({
      ...prev,
      sadaqah_categories: prev.sadaqah_categories.filter((c) => c !== cat),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Invariant: enforce interest rate is strictly 0.00
      const payload = {
        ...settings,
        qard_hasan_interest_rate: 0.00,
        sadaqah_is_recoverable: false,
      };
      await settingsApi.updateSection('assistance', payload);
      success('Assistance & financing parameters updated successfully!');
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to update assistance settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
          <HandCoins className="w-7 h-7 text-emerald-500" />
          <span>Assistance & Financing Settings</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure revolving Qard Hasan loan tenures, installment defaults, and Sadaqah grant categories.
        </p>
      </div>

      <SettingsNav />

      <Card
        title="Assistance & Loan Policy Configuration"
        subtitle="Islamic interest-free micro-credit parameters and humanitarian grant classifications."
      >
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Interest-free guarantee banner */}
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
                  0%
                </div>
                <div>
                  <h4 className="font-bold text-emerald-900 dark:text-emerald-100 text-xs">
                    Strict Zero-Interest (Riba-Free) Invariant
                  </h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    Qard Hasan loans strictly calculate and add 0.00% profit or interest.
                  </p>
                </div>
              </div>
              <Badge variant="success" size="sm">
                ENFORCED BY BACKEND
              </Badge>
            </div>

            {/* Qard Hasan Section */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <HandCoins className="w-4 h-4 text-emerald-500" />
                <span>Qard Hasan (QH) Financing Defaults</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Max Loan Tenure (Months)"
                  type="number"
                  min="1"
                  max="60"
                  value={settings.qard_hasan_max_tenure_months.toString()}
                  onChange={(e) => setSettings({ ...settings, qard_hasan_max_tenure_months: parseInt(e.target.value) || 24 })}
                  required
                />

                <Input
                  label="Default Installments Count"
                  type="number"
                  min="1"
                  max="36"
                  value={settings.default_installments_count.toString()}
                  onChange={(e) => setSettings({ ...settings, default_installments_count: parseInt(e.target.value) || 6 })}
                  required
                />

                <Input
                  label="Installment Interval (Months)"
                  type="number"
                  min="1"
                  max="12"
                  value={settings.default_installment_interval.toString()}
                  onChange={(e) => setSettings({ ...settings, default_installment_interval: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>

              <div className="flex items-center space-x-2.5 text-xs pt-2">
                <input
                  type="checkbox"
                  id="allow_multigroup"
                  checked={settings.allow_multi_group_funding}
                  onChange={(e) => setSettings({ ...settings, allow_multi_group_funding: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="allow_multigroup" className="font-semibold text-slate-800 dark:text-slate-200">
                  Allow Multi-Group Co-Funding (Combining balances from multiple groups)
                </label>
              </div>
            </div>

            {/* Sadaqah Categories Section */}
            <div className="p-4 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-rose-800 dark:text-rose-300 flex items-center space-x-1.5">
                <HeartHandshake className="w-4 h-4 text-rose-500" />
                <span>Sadaqah (SD) Relief Categories (Non-Recoverable)</span>
              </h4>

              <div className="flex flex-wrap gap-2">
                {settings.sadaqah_categories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-900 dark:text-rose-200"
                  >
                    <span>{cat}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(cat)}
                      className="text-rose-400 hover:text-rose-600 ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Add new relief category (e.g. Winter Clothing, Orphan Sponsorship)..."
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-xl text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCategory}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add Category
                </Button>
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
                  Save Assistance Settings
                </Button>
              )}
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};
