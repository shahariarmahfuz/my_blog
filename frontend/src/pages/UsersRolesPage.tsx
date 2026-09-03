import React, { useState, useEffect } from 'react';
import { usersApi, rolesApi } from '../api/client';
import { User, Role, Permission } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { ActionMenu, ActionMenuItem } from '../components/ui/ActionMenu';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  UserPlus,
  Shield,
  Edit2,
  Users2,
  Lock,
  CheckSquare,
  Square,
  Key,
  RotateCcw,
  AlertCircle,
  Plus,
  Phone,
  Mail,
  UserCheck
} from 'lucide-react';

export const UsersRolesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // User modal state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userUsername, setUserUsername] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRoleId, setUserRoleId] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userSaving, setUserSaving] = useState(false);

  // Role modal state
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [roleSaving, setRoleSaving] = useState(false);

  const { success, error } = useToast();
  const { hasPermission } = useAuth();

  const loadData = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const [usersRes, rolesRes, permsRes] = await Promise.all([
        usersApi.list(),
        rolesApi.list(),
        rolesApi.listPermissions(),
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
      setPermissions(permsRes.data);
    } catch (err: any) {
      console.error('Failed to load user and role data:', err);
      const detailMsg = err.response?.data?.detail || err.message || 'Network or server error';
      setFetchError(`Unable to load system users and roles (${detailMsg}). Please check your connection and try again.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateUserModal = () => {
    setEditingUser(null);
    setUserUsername('');
    setUserEmail('');
    setUserFullName('');
    setUserPassword('');
    setUserRoleId(roles[0]?.id || '');
    setUserPhone('');
    setIsUserModalOpen(true);
  };

  const openEditUserModal = (u: User) => {
    setEditingUser(u);
    setUserUsername(u.username || '');
    setUserEmail(u.email || '');
    setUserFullName(u.full_name);
    setUserPassword('');
    setUserRoleId(u.role_id || '');
    setUserPhone(u.phone || '');
    setIsUserModalOpen(true);
  };

  const handleToggleUserStatus = async (u: User) => {
    try {
      await usersApi.update(u.id, { is_active: !u.is_active });
      success(`User ${u.full_name} is now ${!u.is_active ? 'Active' : 'Disabled'}.`);
      loadData();
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to update user status.');
    }
  };

  const getUserActions = (u: User): ActionMenuItem[] => [
    {
      label: 'Edit User Account',
      icon: <Edit2 className="w-3.5 h-3.5" />,
      hidden: !hasPermission('users.edit'),
      onClick: () => openEditUserModal(u),
    },
    {
      label: u.is_active ? 'Disable User' : 'Activate User',
      icon: <Lock className="w-3.5 h-3.5" />,
      danger: u.is_active,
      hidden: !hasPermission('users.edit') || u.username === 'admin',
      onClick: () => handleToggleUserStatus(u),
    },
  ];

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = userUsername.trim().toLowerCase();
    const cleanFullName = userFullName.trim();
    const cleanEmail = userEmail.trim().toLowerCase();

    if (!cleanUsername || !cleanFullName) {
      error('Username and Full Name are required.');
      return;
    }
    if (!editingUser && !userPassword) {
      error('Password is required for new users.');
      return;
    }

    setUserSaving(true);
    try {
      if (editingUser) {
        await usersApi.update(editingUser.id, {
          username: cleanUsername,
          email: cleanEmail || null,
          full_name: cleanFullName,
          role_id: userRoleId || undefined,
          phone: userPhone.trim() || undefined,
          password: userPassword || undefined,
        });
        success(`User "${cleanFullName}" updated successfully!`);
      } else {
        await usersApi.create({
          username: cleanUsername,
          email: cleanEmail || undefined,
          full_name: cleanFullName,
          password: userPassword,
          role_id: userRoleId || undefined,
          phone: userPhone.trim() || undefined,
        });
        success(`User "${cleanFullName}" created successfully!`);
      }
      setIsUserModalOpen(false);
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to save user.';
      error(msg);
    } finally {
      setUserSaving(false);
    }
  };

  const openCreateRoleModal = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDescription('');
    setSelectedPermissionIds([]);
    setIsRoleModalOpen(true);
  };

  const openEditRoleModal = (r: Role) => {
    setEditingRole(r);
    setRoleName(r.name);
    setRoleDescription(r.description || '');
    setSelectedPermissionIds(r.permissions ? r.permissions.map((p) => p.id) : []);
    setIsRoleModalOpen(true);
  };

  const togglePermission = (permId: string) => {
    if (selectedPermissionIds.includes(permId)) {
      setSelectedPermissionIds(selectedPermissionIds.filter((id) => id !== permId));
    } else {
      setSelectedPermissionIds([...selectedPermissionIds, permId]);
    }
  };

  const toggleAllModulePermissions = (moduleName: string) => {
    const modulePerms = permissions.filter((p) => p.module === moduleName);
    const allSelected = modulePerms.every((p) => selectedPermissionIds.includes(p.id));
    if (allSelected) {
      setSelectedPermissionIds(selectedPermissionIds.filter((id) => !modulePerms.some((p) => p.id === id)));
    } else {
      const toAdd = modulePerms.map((p) => p.id).filter((id) => !selectedPermissionIds.includes(id));
      setSelectedPermissionIds([...selectedPermissionIds, ...toAdd]);
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      error('Role Name is required.');
      return;
    }

    setRoleSaving(true);
    try {
      if (editingRole) {
        await rolesApi.update(editingRole.id, {
          name: roleName.trim(),
          description: roleDescription.trim() || undefined,
          permission_ids: selectedPermissionIds,
        });
        success(`Role "${roleName}" updated successfully!`);
      } else {
        await rolesApi.create({
          name: roleName.trim(),
          description: roleDescription.trim() || undefined,
          permission_ids: selectedPermissionIds,
        });
        success(`Role "${roleName}" created successfully!`);
      }
      setIsRoleModalOpen(false);
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to save role.';
      error(msg);
    } finally {
      setRoleSaving(false);
    }
  };

  // Group permissions by module
  const permsByModule: { [key: string]: Permission[] } = {};
  permissions.forEach((p) => {
    if (!permsByModule[p.module]) permsByModule[p.module] = [];
    permsByModule[p.module].push(p);
  });

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
            <span>Users & Access Roles</span>
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          {activeTab === 'users' && hasPermission('users.create') && (
            <Button
              variant="primary"
              size="sm"
              onClick={openCreateUserModal}
              leftIcon={<UserPlus className="w-3.5 h-3.5" />}
            >
              Add User
            </Button>
          )}

          {activeTab === 'roles' && hasPermission('roles.create') && (
            <Button
              variant="primary"
              size="sm"
              onClick={openCreateRoleModal}
              leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
            >
              Create Role
            </Button>
          )}
        </div>
      </div>

      {/* Tab Navigation (Two equal-width tabs on mobile, fitting cleanly within viewport) */}
      <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-850 rounded-2xl max-w-full">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all text-center ${
            activeTab === 'users'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <Users2 className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">System Users ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('roles')}
          className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all text-center ${
            activeTab === 'roles'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">Roles & Permissions ({roles.length})</span>
        </button>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400 font-medium">Loading user directory and permissions matrix...</p>
        </div>
      ) : fetchError ? (
        <Card bodyClassName="p-6">
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="max-w-md">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Unable to Load Data</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{fetchError}</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={loadData}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Retry Loading
            </Button>
          </div>
        </Card>
      ) : activeTab === 'users' ? (
        <Card bodyClassName="p-0">
          {users.length === 0 ? (
            <div className="text-center py-12 p-6">
              <Users2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No user accounts found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Click "Add User" above to create an authenticated staff account.</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px] divide-y divide-slate-100 dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 text-[11px] uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2 px-3 sm:px-3.5">User & Login Username</th>
                    <th className="py-2 px-3 sm:px-3.5">Assigned Role</th>
                    <th className="py-2 px-3 sm:px-3.5">Contact</th>
                    <th className="py-2 px-3 sm:px-3.5">Last Login</th>
                    <th className="py-2 px-3 sm:px-3.5 text-center">Status</th>
                    <th className="py-2 px-3 sm:px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3 sm:px-3.5">
                        <div className="flex items-center space-x-2.5">
                          {u.profile_picture ? (
                            <img
                              src={u.profile_picture}
                              alt={u.full_name}
                              className="w-7 h-7 rounded-full object-cover border border-emerald-500 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                              {u.full_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[150px]">{u.full_name}</p>
                            <div className="flex items-center space-x-1.5 mt-0.5">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                @{u.username}
                              </span>
                              {u.email && <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{u.email}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-3 sm:px-3.5">
                        <div className="flex items-center space-x-1 text-slate-700 dark:text-slate-300 font-medium">
                          <Shield className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          <span>{u.role?.name || 'No Role'}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 sm:px-3.5 text-xs text-slate-500 dark:text-slate-400">
                        {u.phone ? <span className="font-mono text-[11px]">{u.phone}</span> : <span className="italic text-[10px]">No phone</span>}
                      </td>
                      <td className="py-2 px-3 sm:px-3.5 text-[11px] text-slate-400">
                        {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}
                      </td>
                      <td className="py-2 px-3 sm:px-3.5 text-center">
                        <Badge variant={u.is_active ? 'success' : 'danger'} size="sm">
                          {u.is_active ? 'Active' : 'Disabled'}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 sm:px-3.5 text-right">
                        <div className="flex items-center justify-end space-x-0.5">
                          {hasPermission('users.edit') && (
                            <div className="hidden lg:flex items-center space-x-0.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-1 h-7 w-7"
                                onClick={() => openEditUserModal(u)}
                                title="Edit User"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                              </Button>
                            </div>
                          )}

                          <ActionMenu
                            items={getUserActions(u)}
                            label={`Actions for ${u.full_name}`}
                            size="sm"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((r) => (
            <div
              key={r.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {r.name}
                    </h3>
                  </div>
                  {r.is_system && (
                    <Badge variant="purple" size="sm">System</Badge>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  {r.description || 'Standard access scope.'}
                </p>

                <div className="mt-3 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                  <p className="text-slate-400 text-[11px]">Active Permissions:</p>
                  <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {r.name === 'Super Admin' ? 'All Permissions (Unrestricted)' : `${r.permissions?.length || 0} module permissions`}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                {hasPermission('roles.edit') && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="py-1 px-2.5 text-xs"
                    onClick={() => openEditRoleModal(r)}
                    leftIcon={<Edit2 className="w-3 h-3" />}
                  >
                    Edit Permissions
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* User Create / Edit Modal */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title={editingUser ? 'Edit User Account' : 'Create User Account'}
        subtitle="Manage authentication and role assignment."
        maxWidth="md"
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          <Input
            label="Username * (Unique Login Identifier)"
            placeholder="e.g. tariq_hasan"
            value={userUsername}
            onChange={(e) => setUserUsername(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Full Name *"
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

          <Input
            label={editingUser ? 'New Password (Leave blank to keep current)' : 'Password *'}
            type="password"
            placeholder="••••••••"
            value={userPassword}
            onChange={(e) => setUserPassword(e.target.value)}
            required={!editingUser}
          />

          <Select
            label="Assigned System Role"
            value={userRoleId}
            onChange={(e) => setUserRoleId(e.target.value)}
            required
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>

          <Input
            label="Phone Number (Optional)"
            placeholder="+88017..."
            value={userPhone}
            onChange={(e) => setUserPhone(e.target.value)}
          />

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsUserModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={userSaving}
            >
              {editingUser ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Role Create / Edit Modal with Granular Permissions */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title={editingRole ? `Configure Permissions: ${editingRole.name}` : 'Create Custom Role'}
        subtitle="Select granular module permissions. Backend strictly enforces each checked permission."
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveRole} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Role Name"
              placeholder="e.g. Field Officer"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              required
              disabled={editingRole?.is_system}
            />

            <Input
              label="Description (Optional)"
              placeholder="Responsibilities and access scope..."
              value={roleDescription}
              onChange={(e) => setRoleDescription(e.target.value)}
            />
          </div>

          {/* Granular Permission Matrix */}
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Module Permissions Matrix:
            </h4>

            {Object.keys(permsByModule).map((mod) => (
              <div
                key={mod}
                className="p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <h5 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                    {mod} Module
                  </h5>
                  <button
                    type="button"
                    onClick={() => toggleAllModulePermissions(mod)}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Toggle Module
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {permsByModule[mod].map((perm) => {
                    const isChecked = selectedPermissionIds.includes(perm.id);
                    return (
                      <div
                        key={perm.id}
                        onClick={() => togglePermission(perm.id)}
                        className={`flex items-start space-x-2 p-2 rounded-xl border cursor-pointer select-none transition-all ${
                          isChecked
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="mt-0.5 text-emerald-600 dark:text-emerald-400">
                          {isChecked ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {perm.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {perm.code}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRoleModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={roleSaving}
            >
              Save Permissions Matrix
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
