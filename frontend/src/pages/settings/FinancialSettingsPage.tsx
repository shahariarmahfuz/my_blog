import React, { useState, useEffect } from 'react';
import { settingsApi } from '../../api/client';
import { FinancialSettings } from '../../types';
import { SettingsNav } from '../../components/settings/SettingsNav';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { CircleDollarSign, Save, ShieldCheck } from 'lucide-react';

export const FinancialSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<FinancialSettings>({
    currency_code: 'BDT',
    currency_symbol: '৳',
    decimal_precision: 2,
    rounding_mode: 'HALF_UP',
    fiscal_year_start: '07-01',
    fiscal_year_end: '06-30',
    receipt_prefix_contribution: 'CON',
    receipt_prefix_qard_hasan: 'QH',
    receipt_prefix_sadaqah: 'SD',
    receipt_prefix_repayment: 'REP',
    strict_double_entry_enforcement: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { success, error } = useToast();
  const { hasPermission } = useAuth();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await settingsApi.getSection<FinancialSettings>('financial');
        if (res.data.config_data) {
          setSettings((prev) => ({ ...prev, ...res.data.config_data }));
        }
      } catch (err) {
        error('Failed to load financial settings');
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
      await settingsApi.updateSection('financial', settings);
      success('Financial accounting settings updated successfully!');
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to update financial settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
          <CircleDollarSign className="w-7 h-7 text-emerald-500" />
          <span>Financial & Accounting Settings</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure fiscal calendar, currency decimals, auto-generated transaction numbering prefixes, and double-entry rules.
        </p>
      </div>

      <SettingsNav />

      <Card
        title="Accounting & Fiscal Parameters"
        subtitle="Global rules governing journal entries, running balances, and voucher prefixes."
      >
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Currency ISO Code"
                value={settings.currency_code}
                onChange={(e) => setSettings({ ...settings, currency_code: e.target.value })}
                required
              />

              <Input
                label="Currency Symbol"
                value={settings.currency_symbol}
                onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })}
                required
              />

              <Select
                label="Decimal Arithmetic Precision"
                value={settings.decimal_precision.toString()}
                onChange={(e) => setSettings({ ...settings, decimal_precision: parseInt(e.target.value) })}
              >
                <option value="2">2 Decimals (৳0.01 standard)</option>
                <option value="4">4 Decimals (৳0.0001 precision)</option>
              </Select>

              <Select
                label="Numeric Rounding Method"
                value={settings.rounding_mode}
                onChange={(e) => setSettings({ ...settings, rounding_mode: e.target.value })}
              >
                <option value="HALF_UP">Round Half Up (Commercial / Accounting Standard)</option>
                <option value="HALF_EVEN">Round Half Even (Banker's Rounding)</option>
                <option value="FLOOR">Floor / Truncate</option>
              </Select>

              <Input
                label="Fiscal Year Start (MM-DD)"
                value={settings.fiscal_year_start}
                onChange={(e) => setSettings({ ...settings, fiscal_year_start: e.target.value })}
                required
              />

              <Input
                label="Fiscal Year End (MM-DD)"
                value={settings.fiscal_year_end}
                onChange={(e) => setSettings({ ...settings, fiscal_year_end: e.target.value })}
                required
              />
            </div>

            {/* Prefix Numbering */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Transaction Voucher & Receipt Numbering Prefixes
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Input
                  label="Member Contribution"
                  value={settings.receipt_prefix_contribution}
                  onChange={(e) => setSettings({ ...settings, receipt_prefix_contribution: e.target.value })}
                />
                <Input
                  label="Qard Hasan Loan"
                  value={settings.receipt_prefix_qard_hasan}
                  onChange={(e) => setSettings({ ...settings, receipt_prefix_qard_hasan: e.target.value })}
                />
                <Input
                  label="Sadaqah Grant"
                  value={settings.receipt_prefix_sadaqah}
                  onChange={(e) => setSettings({ ...settings, receipt_prefix_sadaqah: e.target.value })}
                />
                <Input
                  label="Repayment Voucher"
                  value={settings.receipt_prefix_repayment}
                  onChange={(e) => setSettings({ ...settings, receipt_prefix_repayment: e.target.value })}
                />
              </div>
            </div>

            {/* Strict Double Entry */}
            <div className="flex items-center space-x-3 p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
              <input
                type="checkbox"
                id="strict_double_entry"
                checked={settings.strict_double_entry_enforcement}
                onChange={(e) => setSettings({ ...settings, strict_double_entry_enforcement: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <label htmlFor="strict_double_entry" className="text-xs text-slate-800 dark:text-slate-200">
                <span className="font-bold">Strict Double-Entry Enforcement:</span> Every transaction must create matching debit and credit entries.
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              {hasPermission('settings.edit') && (
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={saving}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Save Financial Settings
                </Button>
              )}
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};
