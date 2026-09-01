import React, { useState, useEffect, useRef } from 'react';
import { brandingApi } from '../../api/client';
import { BrandingSettingsOut } from '../../types';
import { useBranding } from '../../context/BrandingContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../context/ToastContext';
import {
  Sparkles,
  Upload,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  Globe,
  Smartphone,
  Layers,
  FileCheck,
  AlertCircle,
  HelpCircle,
  Eye,
  ShieldCheck,
  Building2
} from 'lucide-react';

interface AssetCardConfig {
  key: 'logo' | 'favicon' | 'apple_touch_icon' | 'login_logo' | 'public_logo';
  title: string;
  subtitle: string;
  description: string;
  recommended: string;
  icon: React.ReactNode;
  aspectHint?: string;
  previewHeightClass?: string;
}

const ASSET_CARDS: AssetCardConfig[] = [
  {
    key: 'logo',
    title: 'Foundation Logo (Primary Logo)',
    subtitle: 'Primary brand identifier',
    description: 'Displayed in the administrative sidebar, mobile navigation, dashboard, and headers across the system.',
    recommended: 'PNG, WebP or SVG with transparent background. Max 800px width.',
    icon: <Sparkles className="w-5 h-5 text-emerald-500" />,
    previewHeightClass: 'h-24',
  },
  {
    key: 'favicon',
    title: 'Browser Favicon',
    subtitle: 'Browser tab and bookmark icon',
    description: 'Shown in browser tabs, bookmark bars, and search engine shortcuts.',
    recommended: 'Square 128×128 or 64×64 PNG/WebP/ICO format.',
    icon: <Globe className="w-5 h-5 text-sky-500" />,
    aspectHint: '1:1 Square',
    previewHeightClass: 'h-20',
  },
  {
    key: 'apple_touch_icon',
    title: 'Apple Touch Icon',
    subtitle: 'iOS and mobile home screen icon',
    description: 'Rendered when users add the portal or public website to their iPhone, iPad, or Android home screen.',
    recommended: 'Exact 180×180 PNG square image (non-transparent or solid background).',
    icon: <Smartphone className="w-5 h-5 text-violet-500" />,
    aspectHint: '180×180 Square',
    previewHeightClass: 'h-24',
  },
  {
    key: 'login_logo',
    title: 'Login Screen Logo (Optional)',
    subtitle: 'Staff portal sign-in page brand',
    description: 'Optional custom logo shown on the login and authentication screens. Falls back to Foundation Logo if unset.',
    recommended: 'PNG or WebP. Max 600px width.',
    icon: <ShieldCheck className="w-5 h-5 text-amber-500" />,
    previewHeightClass: 'h-24',
  },
  {
    key: 'public_logo',
    title: 'Public Website Logo (Optional)',
    subtitle: 'Donor and member portal header',
    description: 'Optional custom logo shown on public homepage, stories, and application pages. Falls back to Foundation Logo if unset.',
    recommended: 'PNG, WebP or SVG. Max 800px width.',
    icon: <Layers className="w-5 h-5 text-teal-500" />,
    previewHeightClass: 'h-24',
  },
];

export const FoundationBrandingPage: React.FC = () => {
  const { refreshBranding, updateBrandingState } = useBranding();
  const { success, error } = useToast();

  const [settings, setSettings] = useState<BrandingSettingsOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingText, setSavingText] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  // Text inputs state
  const [foundationName, setFoundationName] = useState('');
  const [tagline, setTagline] = useState('');

  // File input refs for each card
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const loadBrandingSettings = async () => {
    try {
      setLoading(true);
      const res = await brandingApi.getSettings();
      setSettings(res.data);
      setFoundationName(res.data.foundation_name || '');
      setTagline(res.data.tagline || '');
    } catch (err: any) {
      error('Failed to load branding configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrandingSettings();
  }, []);

  const handleSaveText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundationName.trim()) {
      error('Foundation Name cannot be empty.');
      return;
    }

    try {
      setSavingText(true);
      const res = await brandingApi.updateText({
        foundation_name: foundationName.trim(),
        tagline: tagline.trim(),
      });
      setSettings(res.data);
      updateBrandingState({
        foundation_name: res.data.foundation_name,
        tagline: res.data.tagline,
      });
      refreshBranding();
      success('Foundation name and tagline updated successfully!');
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to update brand text.');
    } finally {
      setSavingText(false);
    }
  };

  const handleFileSelect = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so re-selecting same file triggers onChange
    e.target.value = '';

    if (file.size > 5 * 1024 * 1024) {
      error('File exceeds 5MB size limit.');
      return;
    }

    try {
      setUploadingKey(key);
      const res = await brandingApi.uploadAsset(key, file);
      setSettings(res.data);

      // Instantly synchronize global context
      const updatedUrl = res.data[key as keyof BrandingSettingsOut] as any;
      const urlString = typeof updatedUrl === 'string' ? updatedUrl : updatedUrl?.url || '';

      updateBrandingState({
        [`${key}_url`]: urlString,
      });

      if (key === 'logo') {
        updateBrandingState({ logo_url: urlString });
      }

      refreshBranding();
      success(`${key.replace('_', ' ').toUpperCase()} uploaded and optimized successfully!`);
    } catch (err: any) {
      error(err.response?.data?.detail || 'Image upload failed.');
    } finally {
      setUploadingKey(null);
    }
  };

  const handleDeleteAsset = async (key: string) => {
    if (!window.confirm(`Are you sure you want to remove this ${key.replace('_', ' ')} asset? System default fallback will be restored.`)) {
      return;
    }

    try {
      setDeletingKey(key);
      const res = await brandingApi.deleteAsset(key);
      setSettings(res.data);

      updateBrandingState({
        [`${key}_url`]: '',
      });

      if (key === 'logo') {
        updateBrandingState({ logo_url: '' });
      }

      refreshBranding();
      success(`${key.replace('_', ' ').toUpperCase()} removed. Default fallback restored.`);
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to remove asset.');
    } finally {
      setDeletingKey(null);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (loading && !settings) {
    return (
      <div className="flex justify-center items-center py-24">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <Sparkles className="w-7 h-7 text-emerald-500" />
            <span>Foundation Branding & Identity</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage organization branding assets, official logos, browser favicon, and Apple Touch icon with automated Cloudinary optimization.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadBrandingSettings}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Refresh
        </Button>
      </div>

      {/* Brand Overview Info Banner */}
      <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/50 dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-slate-900 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-black text-xl shadow-md shadow-emerald-500/25 flex-shrink-0">
            {settings?.foundation_name?.[0]?.toUpperCase() || 'F'}
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              {settings?.foundation_name || 'Al-Khair Foundation'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {settings?.tagline || 'Empowering Communities through Islamic Microfinance'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400">
            Logo: {settings?.logo?.url ? '✓ Active' : 'Default Fallback'}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 text-sky-700 dark:text-sky-400">
            Favicon: {settings?.favicon?.url ? '✓ Active' : 'Default'}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 text-violet-700 dark:text-violet-400">
            Touch Icon: {settings?.apple_touch_icon?.url ? '✓ Active' : 'Default'}
          </span>
        </div>
      </div>

      {/* Organization Name & Tagline Form */}
      <Card
        title="Foundation Brand Identity"
        subtitle="Global organization title and tagline used across headers, public website, receipts, and dynamic page metadata."
      >
        <form onSubmit={handleSaveText} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Foundation / Organization Name *"
              placeholder="e.g. Al-Khair Foundation"
              value={foundationName}
              onChange={(e) => setFoundationName(e.target.value)}
              required
            />
            <Input
              label="Tagline / Motto"
              placeholder="e.g. Interest-Free Benevolence & Microfinance"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              isLoading={savingText}
              leftIcon={<Building2 className="w-4 h-4" />}
            >
              Save Brand Details
            </Button>
          </div>
        </form>
      </Card>

      {/* Branding Assets Grid */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Branding Asset Library
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Upload custom image assets. Backend will automatically validate, crop, optimize, and upload directly to Cloudinary.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ASSET_CARDS.map((card) => {
            const assetInfo = settings ? settings[card.key] : null;
            const hasCustomAsset = Boolean(assetInfo?.url);
            const isUploading = uploadingKey === card.key;
            const isDeleting = deletingKey === card.key;

            return (
              <div
                key={card.key}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Hidden file input */}
                <input
                  type="file"
                  ref={(el) => (fileInputRefs.current[card.key] = el)}
                  onChange={(e) => handleFileSelect(card.key, e)}
                  accept="image/png, image/jpeg, image/webp, image/svg+xml, image/x-icon"
                  className="hidden"
                />

                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                        {card.icon}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {card.title}
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          {card.subtitle}
                        </p>
                      </div>
                    </div>

                    <Badge variant={hasCustomAsset ? 'success' : 'neutral'} size="sm">
                      {hasCustomAsset ? 'Custom Active' : 'Fallback'}
                    </Badge>
                  </div>

                  {/* Image Preview Box with subtle transparency canvas */}
                  <div
                    className={`w-full rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center justify-center p-3 relative overflow-hidden bg-slate-50/50 dark:bg-slate-950/40 ${card.previewHeightClass || 'h-24'}`}
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center justify-center space-y-1 text-emerald-600">
                        <RefreshCw className="w-6 h-6 animate-spin" />
                        <span className="text-[11px] font-bold">Optimizing & Uploading...</span>
                      </div>
                    ) : hasCustomAsset && assetInfo?.url ? (
                      <img
                        src={assetInfo.url}
                        alt={card.title}
                        className="max-h-full max-w-full object-contain bg-transparent border-0 outline-none shadow-none transition-transform hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 space-y-1">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-black text-base shadow-sm">
                          {settings?.foundation_name?.[0]?.toUpperCase() || 'F'}
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500">System Fallback</span>
                      </div>
                    )}
                  </div>

                  {/* Metadata & Guidelines */}
                  <div className="space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <p className="leading-relaxed">
                      {card.description}
                    </p>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-750 space-y-1 font-mono text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">File:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                          {assetInfo?.filename || 'system_default'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Size:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {formatFileSize(assetInfo?.filesize)}
                        </span>
                      </div>
                      {card.aspectHint && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Target:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {card.aspectHint}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 mt-4">
                  {hasCustomAsset ? (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteAsset(card.key)}
                      isLoading={isDeleting}
                      leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                    >
                      Remove
                    </Button>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">
                      No custom file
                    </span>
                  )}

                  <Button
                    type="button"
                    variant={hasCustomAsset ? 'outline' : 'primary'}
                    size="sm"
                    onClick={() => fileInputRefs.current[card.key]?.click()}
                    isLoading={isUploading}
                    leftIcon={<Upload className="w-3.5 h-3.5" />}
                  >
                    {hasCustomAsset ? 'Replace' : 'Upload Image'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
