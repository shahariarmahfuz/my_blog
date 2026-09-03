import React, { useState, useEffect } from 'react';
import { rolesApi } from '../../api/client';
import { Role, Permission } from '../../types';
import { SettingsNav } from '../../components/settings/SettingsNav';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  Save,
  CheckCircle2,
  Lock,
  RotateCcw,
  CheckSquare,
  Square,
  Shield,
  Layers
} from 'lucide-react';

export const PermissionsMatrixPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);

  // Map of roleId -> Set of permission IDs
  const [matrixState, setMatrixState] = useState<{ [roleId: string]: Set<string> }>({});

  const { success, error } = useToast();
  const { hasPermission } = useAuth();

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesRes, permsRes] = await Promise.all([
        rolesApi.list(),
        rolesApi.listPermissions(),
      ]);
      setRoles(rolesRes.data);
      setPermissions(permsRes.data);

      const initialMap: { [roleId: string]: Set<string> } = {};
      rolesRes.data.forEach((r) => {
        initialMap[r.id] = new Set((r.permissions || []).map((p) => p.id));
      });
      setMatrixState(initialMap);
    } catch (err) {
      error('Failed to load roles and permissions matrix');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Group permissions by module
  const modules = Array.from(new Set(permissions.map((p) => p.module))).sort();

  const handleTogglePermission = (roleId: string, permId: string, isSystem: boolean, roleName: string) => {
    if (roleName === 'Super Admin') return; // Super Admin has all

    setMatrixState((prev) => {
      const currentSet = new Set(prev[roleId] || []);
      if (currentSet.has(permId)) {
        currentSet.delete(permId);
      } else {
        currentSet.add(permId);
      }
      return {
        ...prev,
        [roleId]: currentSet,
      };
    });
  };

  const handleToggleModuleForRole = (roleId: string, moduleName: string, roleName: string) => {
    if (roleName === 'Super Admin') return;
    const modulePermIds = permissions.filter((p) => p.module === moduleName).map((p) => p.id);
    setMatrixState((prev) => {
      const currentSet = new Set(prev[roleId] || []);
      const allSelected = modulePermIds.every((id) => currentSet.has(id));
      if (allSelected) {
        modulePermIds.forEach((id) => currentSet.delete(id));
      } else {
        modulePermIds.forEach((id) => currentSet.add(id));
      }
      return {
        ...prev,
        [roleId]: currentSet,
      };
    });
  };

  const handleSaveRole = async (role: Role) => {
    if (role.name === 'Super Admin') return;
    setSavingRoleId(role.id);
    try {
      const permIds = Array.from(matrixState[role.id] || []);
      await rolesApi.update(role.id, {
        permission_ids: permIds,
      });
      success(`Permissions for role "${role.name}" saved successfully!`);
    } catch (err: any) {
      error(err.response?.data?.detail || `Failed to save permissions for ${role.name}`);
    } finally {
      setSavingRoleId(null);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
          <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-500 dark:text-indigo-400" />
          <span>Role-Permission Matrix</span>
        </h1>
      </div>

      <SettingsNav />

      <Card bodyClassName="p-0">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              {/* Header */}
              <thead className="bg-slate-900 text-white font-bold sticky top-0 z-10">
                <tr>
                  <th className="p-4 border-r border-slate-800 min-w-[280px]">
                    <div className="flex items-center space-x-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs uppercase tracking-wider font-bold">Permission / Resource</span>
                    </div>
                  </th>
                  {roles.map((role) => (
                    <th
                      key={role.id}
                      className="p-4 border-r border-slate-800 text-center min-w-[160px]"
                    >
                      <div className="flex flex-col items-center space-y-1">
                        <span className="font-bold text-slate-100">{role.name}</span>
                        {role.name === 'Super Admin' ? (
                          <Badge variant="warning" size="sm">
                            ALL BYPASS
                          </Badge>
                        ) : (
                          hasPermission('roles.edit') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-1 py-0.5 px-2 text-[10px]"
                              isLoading={savingRoleId === role.id}
                              onClick={() => handleSaveRole(role)}
                              leftIcon={<Save className="w-3 h-3 text-emerald-400" />}
                            >
                              Save Role
                            </Button>
                          )
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Body */}
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {modules.map((mod) => {
                  const modPerms = permissions.filter((p) => p.module === mod);
                  return (
                    <React.Fragment key={mod}>
                      {/* Module Section Row */}
                      <tr className="bg-slate-100 dark:bg-slate-800/80 font-bold">
                        <td className="p-3 font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                          {mod.toUpperCase()} MODULE
                        </td>
                        {roles.map((role) => {
                          const isSuper = role.name === 'Super Admin';
                          const allSelected = modPerms.every((p) => matrixState[role.id]?.has(p.id));
                          return (
                            <td
                              key={role.id}
                              className="p-3 text-center border-r border-slate-200 dark:border-slate-800"
                            >
                              {!isSuper && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleModuleForRole(role.id, mod, role.name)}
                                  className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                                >
                                  {allSelected ? 'Uncheck All' : 'Check All'}
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Permission Rows */}
                      {modPerms.map((perm) => (
                        <tr
                          key={perm.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors"
                        >
                          <td className="p-3 pl-6 border-r border-slate-200 dark:border-slate-800">
                            <p className="font-bold text-slate-900 dark:text-white text-xs">{perm.name}</p>
                            <p className="font-mono text-[10px] text-slate-400 mt-0.5">{perm.code}</p>
                            {perm.description && (
                              <p className="text-[10px] text-slate-500 mt-0.5">{perm.description}</p>
                            )}
                          </td>
                          {roles.map((role) => {
                            const isSuper = role.name === 'Super Admin';
                            const isChecked = isSuper || (matrixState[role.id]?.has(perm.id) ?? false);
                            return (
                              <td
                                key={role.id}
                                className="p-3 text-center border-r border-slate-200 dark:border-slate-800"
                              >
                                <button
                                  type="button"
                                  disabled={isSuper}
                                  onClick={() => handleTogglePermission(role.id, perm.id, role.is_system, role.name)}
                                  className={`w-6 h-6 rounded-lg flex items-center justify-center mx-auto transition-all ${
                                    isChecked
                                      ? 'bg-emerald-500 text-white shadow-sm'
                                      : 'bg-slate-100 dark:bg-slate-800 text-transparent border border-slate-300 dark:border-slate-700'
                                  } ${isSuper ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer hover:scale-110'}`}
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
