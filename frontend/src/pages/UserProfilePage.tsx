import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/client';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../context/ToastContext';
import {
  User as UserIcon,
  Camera,
  Trash2,
  Upload,
  CheckCircle2,
  ShieldCheck,
  Lock,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';

export const UserProfilePage: React.FC = () => {
  const { user, updateUser, uploadAvatar, removeAvatar } = useAuth();
  const { success, error } = useToast();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);

  // Avatar upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Basic client validation
      if (!file.type.startsWith('image/')) {
        error('Please select a valid image file (JPEG, PNG, WebP).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        error('Image file size must be less than 5MB.');
        return;
      }

      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  const handleUploadAvatar = async () => {
    if (!selectedFile) return;
    setUploadingAvatar(true);
    try {
      await uploadAvatar(selectedFile);
      success('Profile picture updated and optimized successfully!');
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to upload profile picture.';
      error(msg);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCancelPreview = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      await removeAvatar();
      success('Profile picture removed successfully.');
      handleCancelPreview();
    } catch (err: any) {
      error('Failed to remove profile picture.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      error('Full Name is required.');
      return;
    }

    setSaving(true);
    try {
      const res = await authApi.updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });

      updateUser(res.data);
      success('Profile updated successfully!');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update profile.';
      error(msg);
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const currentDisplayAvatar = previewUrl || user?.profile_picture;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
          <UserIcon className="w-7 h-7 text-emerald-500" />
          <span>My User Profile</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your personal staff credentials, avatar picture, and view your assigned role privileges.
        </p>
      </div>

      {/* Avatar Management Card */}
      <Card
        title="Profile Picture"
        subtitle="Upload a personal photo. Images are automatically cropped and compressed to WebP format."
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar Display */}
          <div className="relative group flex-shrink-0">
            {currentDisplayAvatar ? (
              <img
                src={currentDisplayAvatar}
                alt={user?.full_name}
                className="w-28 h-28 rounded-3xl object-cover border-4 border-emerald-500/30 shadow-lg shadow-emerald-500/10"
              />
            ) : (
              <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-black text-3xl shadow-xl shadow-emerald-500/20">
                {getInitials(user?.full_name)}
              </div>
            )}

            {previewUrl && (
              <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-slate-950 shadow-md">
                Preview
              </span>
            )}
          </div>

          {/* Avatar Controls */}
          <div className="space-y-4 text-center sm:text-left flex-1">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Avatar Image Specifications
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Accepted formats: JPEG, PNG, WebP, GIF. Max file size: 5MB. Target dimension: 512×512 square.
              </p>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
            />

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              {previewUrl ? (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleUploadAvatar}
                    isLoading={uploadingAvatar}
                    leftIcon={<Upload className="w-4 h-4" />}
                  >
                    Save Upload
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelPreview}
                    disabled={uploadingAvatar}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  leftIcon={<Camera className="w-4 h-4 text-emerald-500" />}
                >
                  {user?.profile_picture ? 'Replace Picture' : 'Upload Picture'}
                </Button>
              )}

              {user?.profile_picture && !previewUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveAvatar}
                  disabled={uploadingAvatar}
                  className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  leftIcon={<Trash2 className="w-4 h-4" />}
                >
                  Remove Picture
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Personal Information Form */}
      <Card
        title="Personal Information"
        subtitle="Update your full name, phone number, and contact email."
      >
        <form onSubmit={handleSaveProfile} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Login Username
              </label>
              <div className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold text-sm flex items-center justify-between">
                <span>@{user?.username || 'admin'}</span>
                <span className="text-[10px] font-sans font-semibold uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                  Login ID
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Unique credential used to sign into the system.</p>
            </div>

            <Input
              label="Full Name *"
              placeholder="e.g. Brother Hasan Mahmud"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <Input
              label="Email Address (Optional Contact)"
              type="email"
              placeholder="staff@foundation.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label="Phone Number (Optional)"
              type="tel"
              placeholder="e.g. +880 1712-345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] text-slate-400">
              Last profile update: {user?.updated_at ? new Date(user.updated_at).toLocaleString() : 'N/A'}
            </p>

            <Button
              type="submit"
              variant="primary"
              isLoading={saving}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Read-Only Role & RBAC Permissions Summary */}
      <Card
        title="Role & Access Privileges"
        subtitle="System authorization summary (Read-Only)."
      >
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  {user?.role?.name || 'Staff User'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {user?.role?.description || 'Standard foundation operations role'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-start sm:self-auto">
              <Badge variant={user?.is_active ? 'success' : 'danger'}>
                {user?.is_active ? 'Active Account' : 'Inactive'}
              </Badge>
            </div>
          </div>

          {/* Permissions Matrix Pills */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Assigned Permissions ({user?.role?.permissions?.length || 0})
            </h4>

            {user?.role?.permissions && user.role.permissions.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {user.role.permissions.map((p) => (
                  <span
                    key={p.id}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    title={p.description || p.name}
                  >
                    {p.code}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                {user?.role?.name === 'Super Admin' ? 'Super Admin holds full unrestricted access to all modules.' : 'No granular permissions assigned.'}
              </p>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start space-x-3 text-xs text-amber-900 dark:text-amber-200">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p>
              <b>Security Policy:</b> Role and permission modifications must be performed by an authorized Administrator in the <b>Users & Roles</b> console.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
