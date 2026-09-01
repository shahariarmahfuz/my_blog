import React, { useState, useEffect } from 'react';
import { settingsApi } from '../../api/client';
import { FoundationProfile } from '../../types';
import { SettingsNav } from '../../components/settings/SettingsNav';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Building2, Save } from 'lucide-react';

export const FoundationProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<FoundationProfile>({
    foundation_name: 'Al-Khair Foundation',
    tagline: 'Empowering Communities through Islamic Microfinance & Sadaqah',
    logo_url: '',
    description: 'Non-profit foundation providing interest-free Qard Hasan revolving micro-credit and humanitarian emergency assistance.',
    registration_number: 'FD-REG-2024-8839',
    established_year: '2020',
    address: 'House #42, Road #11, Banani, Dhaka-1213, Bangladesh',
    phone: '+880 1711-000000',
    email: 'contact@foundation.org',
    website: 'https://foundation.org',
    tax_id: 'TIN-994827104',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { success, error } = useToast();
  const { hasPermission } = useAuth();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await settingsApi.getSection<FoundationProfile>('profile');
        if (res.data.config_data) {
          setProfile((prev) => ({ ...prev, ...res.data.config_data }));
        }
      } catch (err) {
        error('Failed to load foundation profile');
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
      await settingsApi.updateSection('profile', profile);
      success('Foundation organization profile updated successfully!');
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
          <Building2 className="w-7 h-7 text-emerald-500" />
          <span>Foundation Profile</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage official organization credentials, legal registration, contacts, and public disclosures.
        </p>
      </div>

      <SettingsNav />

      <Card
        title="Organization Legal & Contact Information"
        subtitle="Official details printed on receipts, financial ledgers, and formal reports."
      >
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Foundation Full Legal Name"
                value={profile.foundation_name}
                onChange={(e) => setProfile({ ...profile, foundation_name: e.target.value })}
                required
              />

              <Input
                label="Motto / Mission Tagline"
                value={profile.tagline || ''}
                onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
              />

              <Input
                label="Govt / NGO Registration Number"
                value={profile.registration_number || ''}
                onChange={(e) => setProfile({ ...profile, registration_number: e.target.value })}
              />

              <Input
                label="Tax Identification / TIN Number"
                value={profile.tax_id || ''}
                onChange={(e) => setProfile({ ...profile, tax_id: e.target.value })}
              />

              <Input
                label="Official Email Address"
                type="email"
                value={profile.email || ''}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />

              <Input
                label="Official Phone / Hotline"
                value={profile.phone || ''}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />

              <Input
                label="Official Website URL"
                placeholder="https://foundation.org"
                value={profile.website || ''}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
              />

              <Input
                label="Established Year"
                value={profile.established_year || ''}
                onChange={(e) => setProfile({ ...profile, established_year: e.target.value })}
              />
            </div>

            <Textarea
              label="Headquarters Physical Address"
              value={profile.address || ''}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
            />

            <Textarea
              label="Organization Summary / Mission Statement"
              value={profile.description || ''}
              onChange={(e) => setProfile({ ...profile, description: e.target.value })}
            />

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              {hasPermission('settings.edit') && (
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={saving}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Save Foundation Profile
                </Button>
              )}
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};
