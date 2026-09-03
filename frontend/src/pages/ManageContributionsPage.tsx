import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { contributionsApi, membersApi, groupsApi } from '../api/client';
import { Contribution, Member, Group, PaymentMethod } from '../types';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { ActionMenu, ActionMenuItem } from '../components/ui/ActionMenu';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  PiggyBank,
  Plus,
  Search,
  Building2,
  Calendar,
  Eye,
  Edit2,
  Ban,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  FileCheck,
  CreditCard,
  AlertTriangle
} from 'lucide-react';

export const ManageContributionsPage: React.FC = () => {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'VOIDED'>('ALL');

  // Details Modal
  const [selectedContrib, setSelectedContrib] = useState<Contribution | null>(null);

  // Edit Modal
  const [editingContrib, setEditingContrib] = useState<Contribution | null>(null);
  const [editRef, setEditRef] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Void / Reversal Modal
  const [voidingContrib, setVoidingContrib] = useState<Contribution | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  const { success, error } = useToast();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const [contribRes, membersRes, groupsRes] = await Promise.all([
        contributionsApi.list({
          search: search.trim() || undefined,
          member_id: selectedMemberId || undefined,
          group_id: selectedGroupId || undefined,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          is_voided: statusFilter === 'ALL' ? undefined : statusFilter === 'VOIDED',
          limit: 150,
        }),
        membersApi.list({ limit: 200 }),
        groupsApi.list(),
      ]);
      setContributions(contribRes.data);
      setMembers(membersRes.data);
      setGroups(groupsRes.data);
    } catch (err) {
      error('Failed to load contributions data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedMemberId, selectedGroupId, fromDate, toDate, statusFilter]);

  const getContribActions = (c: Contribution): ActionMenuItem[] => [
    {
      label: 'Receipt Details',
      icon: <Eye className="w-3.5 h-3.5" />,
      onClick: () => setSelectedContrib(c),
    },
    {
      label: 'Member Ledger',
      icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
      onClick: () => navigate(`/app/members/${c.member_id}/ledger`),
    },
    {
      label: 'Edit Reference/Notes',
      icon: <Edit2 className="w-3.5 h-3.5" />,
      hidden: c.is_voided || !hasPermission('contributions.edit'),
      onClick: () => handleOpenEdit(c),
    },
    {
      label: 'Void Transaction',
      icon: <Ban className="w-3.5 h-3.5" />,
      danger: true,
      hidden: c.is_voided || !hasPermission('contributions.edit'),
      onClick: () => {
        setVoidingContrib(c);
        setVoidReason('');
      },
    },
  ];

  const handleOpenEdit = (c: Contribution) => {
    setEditingContrib(c);
    setEditRef(c.reference_number || '');
    setEditNotes(c.notes || '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContrib) return;

    setSavingEdit(true);
    try {
      await contributionsApi.update(editingContrib.id, {
        reference_number: editRef.trim() || undefined,
        notes: editNotes.trim() || undefined,
      });
      success(`Contribution ${editingContrib.receipt_number} updated!`);
      setEditingContrib(null);
      loadData();
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to update contribution.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidingContrib) return;
    if (!voidReason.trim()) {
      error('A reason for voiding/reversing this transaction is required.');
      return;
    }

    setVoiding(true);
    try {
      await contributionsApi.void(voidingContrib.id, { reason: voidReason.trim() });
      success(`Contribution ${voidingContrib.receipt_number} successfully voided and reversed in group ledger.`);
      setVoidingContrib(null);
      setVoidReason('');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to void contribution.');
    } finally {
      setVoiding(false);
    }
  };

  const formatCurrency = (val: string | number | undefined) => {
    const num = Number(val || 0);
    return '৳' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <PiggyBank className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-500 dark:text-indigo-400" />
            <span>Manage Contributions</span>
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          {hasPermission('contributions.create') && (
            <Button
              variant="primary"
              onClick={() => navigate('/app/contributions/add')}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Contribution
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search receipt #, member, ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <Select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
          >
            <option value="">All Members</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.group_name})
              </option>
            ))}
          </Select>

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

          <div className="flex items-center space-x-1 bg-slate-50 dark:bg-slate-850 p-1 rounded-xl border border-slate-200 dark:border-slate-750">
            {(['ALL', 'ACTIVE', 'VOIDED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${
                  statusFilter === st
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {st === 'ALL' ? 'All' : st === 'ACTIVE' ? 'Active' : 'Voided'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-400 font-semibold">Date Range:</span>
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-lg text-xs"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-lg text-xs"
            />
          </div>

          {(fromDate || toDate || selectedMemberId || selectedGroupId || search || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedMemberId('');
                setSelectedGroupId('');
                setFromDate('');
                setToDate('');
                setStatusFilter('ALL');
              }}
              className="text-xs text-rose-500 hover:underline font-semibold ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Contributions Table */}
      <Card bodyClassName="p-0">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : contributions.length === 0 ? (
          <div className="text-center py-16 p-8">
            <FileCheck className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Contributions Found</h3>
            <p className="text-xs text-slate-500 mt-1">There are no contribution receipts matching the filters.</p>
            {hasPermission('contributions.create') && (
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => navigate('/app/contributions/add')}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Record Contribution
              </Button>
            )}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px] divide-y divide-slate-100 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 text-[11px] uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2 px-3 sm:px-3.5">Receipt #</th>
                  <th className="py-2 px-3 sm:px-3.5">Date</th>
                  <th className="py-2 px-3 sm:px-3.5">Member Name</th>
                  <th className="py-2 px-3 sm:px-3.5">Credited Group</th>
                  <th className="py-2 px-3 sm:px-3.5">Payment Method</th>
                  <th className="py-2 px-3 sm:px-3.5 text-right">Amount</th>
                  <th className="py-2 px-3 sm:px-3.5 text-center">Status</th>
                  <th className="py-2 px-3 sm:px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {contributions.map((c) => (
                  <tr
                    key={c.id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      c.is_voided ? 'opacity-60 bg-rose-50/20 dark:bg-rose-950/10' : ''
                    }`}
                  >
                    <td className="py-2 px-3 sm:px-3.5 font-mono font-bold text-slate-900 dark:text-white text-xs">
                      {c.receipt_number}
                    </td>
                    <td className="py-2 px-3 sm:px-3.5 text-slate-700 dark:text-slate-300 font-medium">
                      {c.contribution_date}
                    </td>
                    <td className="py-2 px-3 sm:px-3.5 font-bold text-slate-900 dark:text-white">
                      <Link
                        to={`/app/members/${c.member_id}`}
                        className="hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors text-xs truncate max-w-[160px] block"
                        title="View Member Profile"
                      >
                        {c.member_name}
                      </Link>
                      {c.member_code && (
                        <span className="block text-[10px] font-normal text-slate-400 font-mono">
                          {c.member_code}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 sm:px-3.5">
                      <div className="flex items-center space-x-1 text-slate-600 dark:text-slate-400">
                        <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="truncate max-w-[120px]">{c.group_name}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 sm:px-3.5 text-slate-700 dark:text-slate-300">
                      <span>{c.payment_method}</span>
                      {c.reference_number && (
                        <span className="block text-[10px] text-slate-400 font-mono">
                          Ref: {c.reference_number}
                        </span>
                      )}
                    </td>
                    <td
                      className={`py-2 px-3 sm:px-3.5 text-right font-mono font-bold text-xs ${
                        c.is_voided
                          ? 'text-slate-400 line-through'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {formatCurrency(c.amount)}
                    </td>
                    <td className="py-2 px-3 sm:px-3.5 text-center">
                      <Badge variant={c.is_voided ? 'danger' : 'success'} size="sm">
                        {c.is_voided ? 'VOIDED' : 'ACTIVE'}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 sm:px-3.5 text-right">
                      <div className="flex items-center justify-end space-x-0.5">
                        <div className="hidden lg:flex items-center space-x-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-7 w-7"
                            onClick={() => setSelectedContrib(c)}
                            title="View Contribution Receipt Details"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                          </Button>
                          {!c.is_voided && hasPermission('contributions.edit') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-7 w-7"
                              onClick={() => handleOpenEdit(c)}
                              title="Edit Notes & Reference"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                            </Button>
                          )}
                          {!c.is_voided && hasPermission('contributions.edit') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-7 w-7"
                              onClick={() => {
                                setVoidingContrib(c);
                                setVoidReason('');
                              }}
                              title="Void / Reverse Transaction"
                            >
                              <Ban className="w-3.5 h-3.5 text-rose-500" />
                            </Button>
                          )}
                        </div>

                        <ActionMenu
                          items={getContribActions(c)}
                          label={`Actions for receipt ${c.receipt_number}`}
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

      {/* View Details Modal */}
      <Modal
        isOpen={!!selectedContrib}
        onClose={() => setSelectedContrib(null)}
        title={`Receipt: ${selectedContrib?.receipt_number}`}
        subtitle={`Deposit of ${formatCurrency(selectedContrib?.amount)} by ${selectedContrib?.member_name}`}
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          {selectedContrib?.is_voided && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Transaction Voided & Reversed</p>
                <p className="text-[11px] mt-0.5">Reason: {selectedContrib.void_reason}</p>
                <p className="text-[10px] text-rose-500 mt-0.5">
                  Voided at: {selectedContrib.voided_at ? new Date(selectedContrib.voided_at).toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-400">Contributing Member:</span>
              <span className="font-bold text-slate-900 dark:text-white">{selectedContrib?.member_name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-400">Destination Fund Group:</span>
              <span className="font-bold text-slate-900 dark:text-white">{selectedContrib?.group_name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-400">Contribution Date:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{selectedContrib?.contribution_date}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-400">Payment Method:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{selectedContrib?.payment_method}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-400">Reference / TrxID:</span>
              <span className="font-mono text-slate-900 dark:text-white">{selectedContrib?.reference_number || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-400">Recorded By:</span>
              <span className="text-slate-600 dark:text-slate-400">{selectedContrib?.created_by_name || 'System'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Created Timestamp:</span>
              <span className="text-slate-600 dark:text-slate-400">
                {selectedContrib ? new Date(selectedContrib.created_at).toLocaleString() : 'N/A'}
              </span>
            </div>
          </div>

          {selectedContrib?.notes && (
            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
              <p className="text-slate-400 font-semibold mb-1">Notes:</p>
              <p className="text-slate-800 dark:text-slate-200">{selectedContrib.notes}</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const memId = selectedContrib?.member_id;
                setSelectedContrib(null);
                navigate(`/app/members/ledger?member_id=${memId}`);
              }}
              leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
            >
              View Member Ledger
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedContrib(null)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingContrib}
        onClose={() => setEditingContrib(null)}
        title={`Edit Contribution: ${editingContrib?.receipt_number}`}
        subtitle="Correct reference number or add administrative notes."
        maxWidth="md"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <Input
            label="Transaction Reference Number"
            value={editRef}
            onChange={(e) => setEditRef(e.target.value)}
            placeholder="e.g. Bank slip #, TrxID"
          />

          <Textarea
            label="Notes"
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            placeholder="Reason for edit or additional context..."
          />

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingContrib(null)}
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

      {/* Void / Reversal Modal */}
      <Modal
        isOpen={!!voidingContrib}
        onClose={() => setVoidingContrib(null)}
        title="Void & Reverse Contribution"
        subtitle={`Receipt: ${voidingContrib?.receipt_number} • Amount: ${formatCurrency(voidingContrib?.amount)}`}
        maxWidth="md"
      >
        <form onSubmit={handleVoid} className="space-y-4">
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-200 space-y-1">
            <p className="font-bold flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Immutable Ledger Reversal</span>
            </p>
            <p>
              Voiding this contribution will atomically create a reversing <b>DEBIT</b> ledger entry of{' '}
              <b>{formatCurrency(voidingContrib?.amount)}</b> against <b>{voidingContrib?.group_name}</b> to maintain financial ledger integrity.
            </p>
          </div>

          <Textarea
            label="Reason for Voiding / Reversal (Required)"
            placeholder="Explain why this receipt is being reversed (e.g. entered wrong member by mistake, duplicate deposit)..."
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            required
            autoFocus
          />

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setVoidingContrib(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              isLoading={voiding}
              leftIcon={<Ban className="w-4 h-4" />}
            >
              Confirm Reversal
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
