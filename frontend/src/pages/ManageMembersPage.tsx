import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { membersApi, groupsApi } from '../api/client';
import { Member, Group } from '../types';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ActionMenu, ActionMenuItem } from '../components/ui/ActionMenu';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  Users2,
  UserPlus,
  Search,
  Building2,
  Edit2,
  Eye,
  Phone,
  Mail,
  FileSpreadsheet,
  PiggyBank,
} from 'lucide-react';

export const ManageMembersPage: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const { error } = useToast();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const [membersRes, groupsRes] = await Promise.all([
        membersApi.list({
          search,
          group_id: selectedGroupId || undefined,
          is_active: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE',
        }),
        groupsApi.list(),
      ]);
      setMembers(membersRes.data);
      setGroups(groupsRes.data);
    } catch (err) {
      error('Failed to load members data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedGroupId, statusFilter]);

  const formatCurrency = (val: string | number | undefined) => {
    const num = Number(val) || 0;
    return `৳${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getMemberActions = (m: Member): ActionMenuItem[] => [
    {
      label: 'View Profile',
      icon: <Eye className="w-3.5 h-3.5" />,
      onClick: () => navigate(`/app/members/${m.member_code || m.id}`),
    },
    {
      label: 'Member Ledger',
      icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
      onClick: () => navigate(`/app/members/${m.member_code || m.id}/ledger`),
    },
    {
      label: 'Edit Member',
      icon: <Edit2 className="w-3.5 h-3.5" />,
      hidden: !hasPermission('members.edit'),
      onClick: () => navigate(`/app/members/${m.member_code || m.id}/edit`),
    },
    {
      label: 'Record Contribution',
      icon: <PiggyBank className="w-3.5 h-3.5" />,
      hidden: !hasPermission('contributions.create'),
      onClick: () => navigate(`/app/contributions/add?member_id=${m.id}`),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <Users2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
            <span>Manage Foundation Members</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Directory of all contributing members, fund circle allocations, and financial ledger links.
          </p>
        </div>

        {hasPermission('members.create') && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/app/members/add')}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Add New Member
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <Card bodyClassName="p-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, code, phone, NID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <Select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
            >
              <option value="">All Fund Groups</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Members Only</option>
              <option value="INACTIVE">Inactive Members Only</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Compact Members Table Card */}
      <Card bodyClassName="p-0">
        {loading ? (
          <div className="text-center py-10 text-xs text-slate-400">Loading members...</div>
        ) : members.length === 0 ? (
          <div className="text-center py-10 p-4">
            <Users2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No members found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting your search criteria or register a new member.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[680px] divide-y divide-slate-100 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 text-[11px] uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2 px-3 sm:px-3.5">Member Info</th>
                  <th className="py-2 px-3 sm:px-3.5">Fund Circle</th>
                  <th className="py-2 px-3 sm:px-3.5">Contact</th>
                  <th className="py-2 px-3 sm:px-3.5 text-right">Total Contributed</th>
                  <th className="py-2 px-3 sm:px-3.5 text-center">Status</th>
                  <th className="py-2 px-3 sm:px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 sm:px-3.5">
                      <div className="flex items-center space-x-2.5">
                        <div
                          onClick={() => navigate(`/app/members/${m.member_code || m.id}`)}
                          className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center font-bold text-emerald-700 dark:text-emerald-300 overflow-hidden flex-shrink-0 text-[11px] cursor-pointer hover:ring-2 hover:ring-emerald-500 transition"
                          title="Click to view full profile"
                        >
                          {m.photo_url ? (
                            <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover" />
                          ) : (
                            m.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => navigate(`/app/members/${m.member_code || m.id}`)}
                            className="font-bold text-slate-900 dark:text-white leading-tight hover:text-emerald-600 dark:hover:text-emerald-400 text-left transition-colors cursor-pointer text-xs truncate max-w-[160px] sm:max-w-[200px]"
                            title="Click to view full profile"
                          >
                            {m.name}
                          </button>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              {m.member_code || 'M-UNSET'}
                            </span>
                            {m.occupation && (
                              <span className="text-[10px] text-slate-400 truncate max-w-[100px]">• {m.occupation}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-2 px-3 sm:px-3.5">
                      <div className="flex items-center space-x-1 text-xs text-slate-700 dark:text-slate-300">
                        <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="font-medium truncate max-w-[120px]">{m.group_name || 'Unassigned'}</span>
                      </div>
                    </td>

                    <td className="py-2 px-3 sm:px-3.5 text-xs text-slate-500 dark:text-slate-400">
                      {m.phone ? (
                        <p className="flex items-center space-x-1 text-slate-700 dark:text-slate-300">
                          <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="font-mono text-[11px]">{m.phone}</span>
                        </p>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">No phone</span>
                      )}
                    </td>

                    <td className="py-2 px-3 sm:px-3.5 text-right">
                      <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                        {formatCurrency(m.total_contributions)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {m.contributions_count || 0} receipt{(m.contributions_count || 0) === 1 ? '' : 's'}
                      </p>
                    </td>

                    <td className="py-2 px-3 sm:px-3.5 text-center">
                      <Badge variant={m.is_active ? 'success' : 'neutral'} size="sm">
                        {m.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>

                    <td className="py-2 px-3 sm:px-3.5 text-right">
                      <div className="flex items-center justify-end space-x-0.5">
                        {/* Quick Action buttons for large desktop */}
                        <div className="hidden lg:flex items-center space-x-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-7 w-7"
                            onClick={() => navigate(`/app/members/${m.member_code || m.id}`)}
                            title="View Member Profile"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-7 w-7"
                            onClick={() => navigate(`/app/members/${m.member_code || m.id}/ledger`)}
                            title="Open Financial Ledger"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                          </Button>
                          {hasPermission('members.edit') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-7 w-7"
                              onClick={() => navigate(`/app/members/${m.member_code || m.id}/edit`)}
                              title="Edit Member Information"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                            </Button>
                          )}
                        </div>

                        {/* Three-Dot ActionMenu */}
                        <ActionMenu
                          items={getMemberActions(m)}
                          label={`Actions for ${m.name}`}
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
    </div>
  );
};
