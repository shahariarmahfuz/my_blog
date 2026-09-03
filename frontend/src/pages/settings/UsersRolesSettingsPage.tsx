import React, { useState, useEffect } from 'react';
import { usersApi, rolesApi } from '../../api/client';
import { User, Role, Permission } from '../../types';
import { SettingsNav } from '../../components/settings/SettingsNav';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  Users2,
  UserPlus,
  Shield,
  Edit2,
  Lock,
  Key,
  Search,
  CheckCircle2,
  XCircle
} from 'lucide-react';

export const UsersRolesSettingsPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userUsername, setUserUsername] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRoleId, setUserRoleId] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userIsActive, setUserIsActive] = useState(true);
  const [userSaving, setUserSaving] = useState(false);

  // Password Reset Modal
  const [resetModalUser, setResetModalUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  const { success, error } = useToast();
  const { user: authUser, hasPermission } = useAuth();

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes] = await Promise.all([
        usersApi.list(),
        rolesApi.list(),
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch (err) {
      error('Failed to load user and role data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setUserUsername('');
    setUserEmail('');
    setUserFullName('');
    setUserPassword('');
    setUserRoleId(roles[0]?.id || '');
    setUserPhone('');
    setUserIsActive(true);
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u: User) => {
    setEditingUser(u);
    setUserUsername(u.username || '');
    setUserEmail(u.email || '');
    setUserFullName(u.full_name);
    setUserPassword('');
    setUserRoleId(u.role_id || '');
    setUserPhone(u.phone || '');
    setUserIsActive(u.is_active);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = userUsername.trim().toLowerCase();
    const cleanFullName = userFullName.trim();
    const cleanEmail = userEmail.trim().toLowerCase();

    if (!cleanUsername || !cleanFullName) {
      error('Username and Full Name are required.');
      return;
    }

    setUserSaving(true);
    try {
      if (editingUser) {
        await usersApi.update(editingUser.id, {
          username: cleanUsername,
          email: cleanEmail || null,
          full_name: cleanFullName,
          role_id: userRoleId || null,
          phone: userPhone.trim() || null,
          is_active: userIsActive,
        });
        success('User account updated successfully');
      } else {
        if (!userPassword) {
          error('Password is required when creating a new user.');
          setUserSaving(false);
          return;
        }
        await usersApi.create({
          username: cleanUsername,
          email: cleanEmail || undefined,
          full_name: cleanFullName,
          password: userPassword,
          role_id: userRoleId || null,
          phone: userPhone.trim() || null,
        });
        success('User account created successfully');
      }
      setIsUserModalOpen(false);
      loadData();
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to save user account');
    } finally {
      setUserSaving(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser || !newPassword) return;
    setResettingPassword(true);
    try {
      await usersApi.update(resetModalUser.id, {
        password: newPassword,
      });
      success(`Password reset for ${resetModalUser.email} successfully!`);
      setResetModalUser(null);
      setNewPassword('');
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setResettingPassword(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      u.full_name.toLowerCase().includes(q) ||
      (u.role?.name && u.role.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <Users2 className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-500 dark:text-indigo-400" />
            <span>Users & Access Management</span>
          </h1>
        </div>

        {hasPermission('users.create') && (
          <Button
            variant="primary"
            onClick={handleOpenCreateUser}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Create Staff User
          </Button>
        )}
      </div>

      <SettingsNav />

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search users by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing <b>{filteredUsers.length}</b> users
        </div>
      </div>

      {/* Users Table */}
      <Card bodyClassName="p-0">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">User & Login Username</th>
                  <th className="px-6 py-4">Assigned Role</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        {u.profile_picture ? (
                          <img
                            src={u.profile_picture}
                            alt={u.full_name}
                            className="w-8 h-8 rounded-full object-cover border border-emerald-500 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-xs flex-shrink-0">
                            {u.full_name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-xs">{u.full_name}</p>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              @{u.username}
                            </span>
                            {u.email && <span className="text-[11px] text-slate-400">{u.email}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {u.role ? (
                        <div className="flex items-center space-x-1.5">
                          <Shield className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{u.role.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No Role Assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400">
                      {u.phone || '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={u.is_active ? 'success' : 'danger'} size="sm">
                        {u.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {hasPermission('users.edit') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditUser(u)}
                            title="Edit User Profile & Role"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                          </Button>
                        )}
                        {hasPermission('users.edit') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setResetModalUser(u)}
                            title="Reset Password"
                          >
                            <Key className="w-3.5 h-3.5 text-amber-500" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* User Create/Edit Modal */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title={editingUser ? `Edit User: ${editingUser.username}` : 'Create New User Account'}
        subtitle="Manage user credentials, contact details, and role permissions."
      >
        <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
          <Input
            label="Username * (Unique Login Identifier)"
            placeholder="e.g. tariq_hasan"
            value={userUsername}
            onChange={(e) => setUserUsername(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Full Name * (Required)"
            placeholder="e.g. Tariq Hasan"
            value={userFullName}
            onChange={(e) => setUserFullName(e.target.value)}
            required
          />

          <Input
            label="Email Address (Optional Contact Info)"
            type="email"
            placeholder="user@foundation.org"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
          />

          {!editingUser && (
            <Input
              label="Initial Password * (Required)"
              type="password"
              placeholder="••••••••"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              required
              minLength={6}
            />
          )}

          <Select
            label="Assigned System Role"
            value={userRoleId}
            onChange={(e) => setUserRoleId(e.target.value)}
          >
            <option value="">-- No Role Assigned --</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} {r.is_system ? '(System)' : ''}
              </option>
            ))}
          </Select>

          <Input
            label="Phone Number (Optional)"
            value={userPhone}
            onChange={(e) => setUserPhone(e.target.value)}
          />

          {editingUser && (
            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="user_active_toggle"
                checked={userIsActive}
                onChange={(e) => setUserIsActive(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <label htmlFor="user_active_toggle" className="font-bold text-slate-800 dark:text-slate-200">
                User Account is Active
              </label>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsUserModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={userSaving}
            >
              {editingUser ? 'Update User' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Password Reset Modal */}
      <Modal
        isOpen={!!resetModalUser}
        onClose={() => setResetModalUser(null)}
        title={`Reset Password: ${resetModalUser?.email}`}
        subtitle="Set a new password for this staff member account."
      >
        <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
          <Input
            label="New Password (Minimum 6 characters)"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            placeholder="Enter secure new password"
            autoFocus
          />

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setResetModalUser(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={resettingPassword}
              leftIcon={<Key className="w-3.5 h-3.5" />}
            >
              Update Password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
