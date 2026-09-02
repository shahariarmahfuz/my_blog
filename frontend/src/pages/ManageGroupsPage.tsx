import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupsApi, membersApi, beneficiariesApi } from '../api/client';
import { Group, Member, Beneficiary, GroupType } from '../types';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { DeleteConfirmModal } from '../components/ui/DeleteConfirmModal';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { ActionMenu, ActionMenuItem } from '../components/ui/ActionMenu';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  FolderPlus,
  Search,
  Edit2,
  Eye,
  FileSpreadsheet,
  PieChart,
  Users2,
  HeartHandshake,
  Wallet,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  HandCoins,
  Receipt,
  Scale,
  Trash2
} from 'lucide-react';

export const ManageGroupsPage: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Details Modal
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<Member[]>([]);
  const [groupBeneficiaries, setGroupBeneficiaries] = useState<Beneficiary[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'MEMBERS' | 'BENEFICIARIES'>('OVERVIEW');

  // Edit Modal
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editName, setEditName] = useState('');
  const [editGroupType, setEditGroupType] = useState<GroupType>('MEMBER_FUND');
  const [editCode, setEditCode] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editContactPerson, setEditContactPerson] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  // Adjust Opening Balance Modal
  const [adjustingGroup, setAdjustingGroup] = useState<Group | null>(null);
  const [adjNewBalance, setAdjNewBalance] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjEffectiveDate, setAdjEffectiveDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [savingAdj, setSavingAdj] = useState(false);

  // Delete Permanently Modal
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [savingDelete, setSavingDelete] = useState(false);

  const { success, error } = useToast();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  const loadGroups = async () => {
    try {
      setLoading(true);
      const res = await groupsApi.list({
        search: search.trim() || undefined,
        is_active: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE',
      });
      setGroups(res.data);
    } catch (err) {
      error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, [search, statusFilter]);

  const handleOpenDetails = async (group: Group) => {
    setSelectedGroup(group);
    setActiveTab('OVERVIEW');
    setLoadingDetails(true);
    try {
      const [membersRes, bensRes] = await Promise.all([
        membersApi.list({ group_id: group.id, limit: 100 }),
        beneficiariesApi.list({ group_id: group.id, limit: 100 }),
      ]);
      setGroupMembers(membersRes.data);
      setGroupBeneficiaries(bensRes.data);
    } catch (err) {
      error('Failed to load group members and beneficiaries');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOpenAdjust = (group: Group) => {
    setAdjustingGroup(group);
    setAdjNewBalance(String(group.opening_balance !== undefined ? group.opening_balance : '0.00'));
    setAdjReason('');
    setAdjEffectiveDate(new Date().toISOString().split('T')[0]);
  };

  const handleSaveAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingGroup) return;

    const newBalNum = parseFloat(adjNewBalance);
    if (isNaN(newBalNum) || newBalNum < 0) {
      error('Opening Balance must be a valid positive amount.');
      return;
    }
    if (!adjReason.trim() || adjReason.trim().length < 3) {
      error('A clear audit reason is required for opening balance adjustments.');
      return;
    }

    setSavingAdj(true);
    try {
      await groupsApi.adjustOpeningBalance(adjustingGroup.id, {
        new_opening_balance: newBalNum,
        reason: adjReason.trim(),
        effective_date: adjEffectiveDate || undefined,
      });

      success(`Opening balance for "${adjustingGroup.name}" adjusted to ৳${newBalNum.toLocaleString()}`);
      setAdjustingGroup(null);
      loadGroups();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to adjust opening balance.';
      error(msg);
    } finally {
      setSavingAdj(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingGroup) return;
    setSavingDelete(true);
    setDeleteError(null);
    try {
      await groupsApi.delete(deletingGroup.id);
      success(`Fund Group "${deletingGroup.name}" deleted permanently.`);
      setDeletingGroup(null);
      loadGroups();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to permanently delete fund group.';
      setDeleteError(msg);
      error(msg);
    } finally {
      setSavingDelete(false);
    }
  };

  const getGroupActions = (g: Group): ActionMenuItem[] => [
    {
      label: 'Group Details',
      icon: <Eye className="w-4 h-4" />,
      onClick: () => handleOpenDetails(g),
    },
    {
      label: 'Financial Ledger',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      onClick: () => navigate(`/app/groups/ledger?group_id=${g.id}`),
    },
    {
      label: 'Fund Allocation',
      icon: <PieChart className="w-4 h-4" />,
      onClick: () => navigate(`/app/groups/fund?group_id=${g.id}`),
    },
    {
      label: 'Adjust Opening Balance',
      icon: <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      hidden: !hasPermission('groups.edit'),
      onClick: () => handleOpenAdjust(g),
    },
    {
      label: 'Edit Group Info',
      icon: <Edit2 className="w-4 h-4" />,
      hidden: !hasPermission('groups.edit'),
      onClick: () => handleOpenEdit(g),
    },
    {
      label: 'Delete Permanently',
      icon: <Trash2 className="w-4 h-4 text-rose-500" />,
      hidden: !hasPermission('groups.delete'),
      onClick: () => {
        setDeletingGroup(g);
        setDeleteError(null);
      },
    },
  ];

  const handleOpenEdit = (group: Group) => {
    setEditingGroup(group);
    setEditName(group.name);
    setEditGroupType(group.group_type || 'MEMBER_FUND');
    setEditCode(group.code || '');
    setEditDescription(group.description || '');
    setEditContactPerson(group.contact_person || '');
    setEditPhone(group.phone || '');
    setEditEmail(group.email || '');
    setEditAddress(group.address || '');
    setEditNotes(group.notes || '');
    setEditIsActive(group.is_active);
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;
    if (!editName.trim()) {
      error('Group Name is required.');
      return;
    }

    setSavingEdit(true);
    try {
      await groupsApi.update(editingGroup.id, {
        name: editName.trim(),
        group_type: editGroupType,
        code: editCode.trim() || undefined,
        description: editDescription.trim() || undefined,
        contact_person: editContactPerson.trim() || undefined,
        phone: editPhone.trim() || undefined,
        email: editEmail.trim() || undefined,
        address: editAddress.trim() || undefined,
        notes: editNotes.trim() || undefined,
        is_active: editIsActive,
      });

      success(`Group "${editName}" updated successfully!`);
      setEditingGroup(null);
      loadGroups();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update group.';
      error(msg);
    } finally {
      setSavingEdit(false);
    }
  };

  const formatCurrency = (val: string | number | undefined) => {
    const num = Number(val || 0);
    return '৳' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <Building2 className="w-7 h-7 text-emerald-500" />
            <span>Manage Fund Groups</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Accounting circles, opening balances, available group balances, member cohorts, and financial ledgers.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {hasPermission('groups.create') && (
            <Button
              variant="primary"
              onClick={() => navigate('/app/groups/add')}
              leftIcon={<FolderPlus className="w-4 h-4" />}
            >
              Add Group
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 w-full sm:w-auto">
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {st === 'ALL' ? 'All Groups' : st === 'ACTIVE' ? 'Active' : 'Inactive'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search group name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Groups List Table */}
      <Card bodyClassName="p-0">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-16 p-8">
            <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Groups Found</h3>
            <p className="text-xs text-slate-500 mt-1">Create a fund group to organize donors and beneficiaries.</p>
            {hasPermission('groups.create') && (
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => navigate('/app/groups/add')}
                leftIcon={<FolderPlus className="w-3.5 h-3.5" />}
              >
                Add Group
              </Button>
            )}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[750px] divide-y divide-slate-100 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 text-[11px] uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2 px-3 sm:px-3.5">Group Name & Code</th>
                  <th className="py-2 px-3 sm:px-3.5">Type</th>
                  <th className="py-2 px-3 sm:px-3.5">Members</th>
                  <th className="py-2 px-3 sm:px-3.5">Beneficiaries</th>
                  <th className="py-2 px-3 sm:px-3.5 text-right">Opening Balance</th>
                  <th className="py-2 px-3 sm:px-3.5 text-right">Available Balance</th>
                  <th className="py-2 px-3 sm:px-3.5 text-center">Status</th>
                  <th className="py-2 px-3 sm:px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {groups.map((g) => (
                  <tr
                    key={g.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2 px-3 sm:px-3.5">
                      <div className="flex items-center space-x-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${
                          g.group_type === 'EXTERNAL_FUND' 
                            ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400'
                            : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {g.code || g.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white leading-tight text-xs truncate max-w-[160px]">{g.name}</p>
                          {g.contact_person && (
                            <p className="text-[10px] text-slate-400 truncate max-w-[120px]">Contact: {g.contact_person}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-3 sm:px-3.5">
                      {g.group_type === 'EXTERNAL_FUND' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          External Fund
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Member Fund
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 sm:px-3.5">
                      {g.group_type === 'EXTERNAL_FUND' ? (
                        <span className="text-[11px] text-slate-400 italic">No Members (External)</span>
                      ) : (
                        <div className="flex items-center space-x-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
                          <Users2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>{g.members_count || 0} members</span>
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 sm:px-3.5">
                      <div className="flex items-center space-x-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
                        <HeartHandshake className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>{g.beneficiaries_count || 0} recipients</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 sm:px-3.5 text-right font-medium text-slate-700 dark:text-slate-300 text-xs font-mono">
                      {formatCurrency(g.opening_balance)}
                    </td>
                    <td className="py-2 px-3 sm:px-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400 text-xs font-mono">
                      {formatCurrency(g.current_balance)}
                    </td>
                    <td className="py-2 px-3 sm:px-3.5 text-center">
                      <Badge variant={g.is_active ? 'success' : 'neutral'} size="sm">
                        {g.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 sm:px-3.5 text-right">
                      <div className="flex items-center justify-end space-x-0.5">
                        <div className="hidden lg:flex items-center space-x-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-7 w-7"
                            onClick={() => navigate(`/app/groups/ledger?group_id=${g.id}`)}
                            title="Open Group Financial Ledger"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-7 w-7"
                            onClick={() => navigate(`/app/groups/fund?group_id=${g.id}`)}
                            title="Open Group Fund Utilization"
                          >
                            <PieChart className="w-3.5 h-3.5 text-indigo-600" />
                          </Button>
                          {hasPermission('groups.edit') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-7 w-7"
                              onClick={() => handleOpenAdjust(g)}
                              title="Adjust Opening Balance"
                            >
                              <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-7 w-7"
                            onClick={() => handleOpenDetails(g)}
                            title="View Group Details & Cohort"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                          </Button>
                          {hasPermission('groups.edit') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-7 w-7"
                              onClick={() => handleOpenEdit(g)}
                              title="Edit Group Info"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                            </Button>
                          )}
                        </div>

                        <ActionMenu
                          items={getGroupActions(g)}
                          label={`Actions for ${g.name}`}
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

      {/* Group Details Modal with Members & Beneficiaries tabs */}
      <Modal
        isOpen={!!selectedGroup}
        onClose={() => setSelectedGroup(null)}
        title={selectedGroup?.name || 'Group Details'}
        subtitle={`Group Code: ${selectedGroup?.code || 'N/A'} • Available Balance: ${formatCurrency(selectedGroup?.current_balance)}`}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          {/* Navigation Tabs */}
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'OVERVIEW'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Group Overview
            </button>
            <button
              onClick={() => setActiveTab('MEMBERS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'MEMBERS'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Belonging Members ({groupMembers.length})
            </button>
            <button
              onClick={() => setActiveTab('BENEFICIARIES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'BENEFICIARIES'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Associated Beneficiaries ({groupBeneficiaries.length})
            </button>
          </div>

          {/* Tab 1: Overview */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div>
                  <p className="text-slate-400 font-medium">Available Balance</p>
                  <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                    {formatCurrency(selectedGroup?.current_balance)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Opening Balance</p>
                  <p className="text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                    {formatCurrency(selectedGroup?.opening_balance)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Total Members</p>
                  <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {groupMembers.length}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Beneficiaries</p>
                  <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {groupBeneficiaries.length}
                  </p>
                </div>
              </div>

              <div className="space-y-2 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Group Name:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedGroup?.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Group Code:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedGroup?.code || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Opening Balance:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(selectedGroup?.opening_balance)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Contact Person:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{selectedGroup?.contact_person || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Phone:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{selectedGroup?.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Email:</span>
                  <span className="text-slate-900 dark:text-white">{selectedGroup?.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Address:</span>
                  <span className="text-slate-900 dark:text-white">{selectedGroup?.address || 'N/A'}</span>
                </div>
                <div className="py-1">
                  <span className="text-slate-400 block mb-0.5">Description:</span>
                  <p className="text-slate-700 dark:text-slate-300 italic">{selectedGroup?.description || 'No description provided.'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Members */}
          {activeTab === 'MEMBERS' && (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {loadingDetails ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : groupMembers.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-xs">No members enrolled in this group yet.</p>
              ) : (
                groupMembers.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-xs">{m.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">ID: {m.member_code || 'N/A'}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs"
                      onClick={() => navigate(`/app/members/${m.member_code || m.id}`)}
                    >
                      View Profile
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 3: Beneficiaries */}
          {activeTab === 'BENEFICIARIES' && (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {loadingDetails ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : groupBeneficiaries.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-xs">No beneficiaries associated with this group yet.</p>
              ) : (
                groupBeneficiaries.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-xs">{b.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">ID: {b.beneficiary_code || 'N/A'}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs"
                      onClick={() => navigate(`/app/beneficiaries/ledger?beneficiary_id=${b.id}`)}
                    >
                      Beneficiary Ledger
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Adjust Opening Balance Modal */}
      <Modal
        isOpen={!!adjustingGroup}
        onClose={() => setAdjustingGroup(null)}
        title={`Adjust Opening Balance: ${adjustingGroup?.name}`}
        subtitle="Make a controlled, double-entry ledger adjustment to the carried-forward opening balance."
        maxWidth="md"
      >
        <form onSubmit={handleSaveAdjust} className="space-y-4">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
            <p className="text-slate-500 dark:text-slate-400">Current Recorded Opening Balance:</p>
            <p className="text-base font-extrabold text-emerald-700 dark:text-emerald-300 font-mono mt-0.5">
              {formatCurrency(adjustingGroup?.opening_balance)}
            </p>
          </div>

          <Input
            label="New Target Opening Balance (৳) *"
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g. 100000.00"
            value={adjNewBalance}
            onChange={(e) => setAdjNewBalance(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Effective Date (Optional)"
            type="date"
            value={adjEffectiveDate}
            onChange={(e) => setAdjEffectiveDate(e.target.value)}
          />

          <Textarea
            label="Reason for Adjustment / Correction * (Audit Logged)"
            placeholder="Explain why the opening balance is being corrected (e.g. Prior accounting statement reconciliation, bank error adjustment)..."
            value={adjReason}
            onChange={(e) => setAdjReason(e.target.value)}
            required
          />

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAdjustingGroup(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={savingAdj}
              leftIcon={<Scale className="w-4 h-4" />}
            >
              Save Adjustment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Group Modal */}
      <Modal
        isOpen={!!editingGroup}
        onClose={() => setEditingGroup(null)}
        title={`Edit Group: ${editingGroup?.name}`}
        subtitle="Update fund group metadata or toggle active status."
        maxWidth="lg"
      >
        <form onSubmit={handleUpdateGroup} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Group Name *"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
              autoFocus
            />

            <Select
              label="Group Type *"
              value={editGroupType}
              onChange={(e) => setEditGroupType(e.target.value as GroupType)}
              options={[
                { value: 'MEMBER_FUND', label: 'Member Fund Group' },
                { value: 'EXTERNAL_FUND', label: 'External Fund Group (Donations Only)' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Group Code / ID (Editable)"
              placeholder="e.g. GRP-001 or EDU-FUND"
              value={editCode}
              onChange={(e) => setEditCode(e.target.value)}
            />
            <Input
              label="Contact Person (Optional)"
              value={editContactPerson}
              onChange={(e) => setEditContactPerson(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Phone Number (Optional)"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
            />
            <Input
              label="Email Address (Optional)"
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
            />
          </div>

          <Input
            label="Physical Address (Optional)"
            value={editAddress}
            onChange={(e) => setEditAddress(e.target.value)}
          />

          <Textarea
            label="Description (Optional)"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
          />

          <Textarea
            label="Notes (Optional)"
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
          />

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Active Status</p>
              <p className="text-[11px] text-slate-500">Allow contributions and assistance allocations</p>
            </div>
            <input
              type="checkbox"
              checked={editIsActive}
              onChange={(e) => setEditIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingGroup(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={savingEdit}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Permanently Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingGroup}
        onClose={() => {
          setDeletingGroup(null);
          setDeleteError(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Fund Group Permanently?"
        entityName={deletingGroup?.name || ''}
        entityType="Fund Group"
        itemIdentifier={deletingGroup?.code}
        loading={savingDelete}
        errorMessage={deleteError}
      />
    </div>
  );
};
