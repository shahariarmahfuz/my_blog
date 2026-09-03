import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { donationsApi, groupsApi } from '../../api/client';
import { Donation, DonationSummaryMetrics, Group } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ActionMenu, ActionMenuItem } from '../../components/ui/ActionMenu';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  HeartHandshake,
  Plus,
  Search,
  Receipt,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Eye,
  Wallet,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export const ManageDonationsPage: React.FC = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [metrics, setMetrics] = useState<DonationSummaryMetrics | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'VOIDED'>('ACTIVE');

  // Void Modal
  const [voidingDonation, setVoidingDonation] = useState<Donation | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [savingVoid, setSavingVoid] = useState(false);

  const { success, error } = useToast();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const isVoidedParam =
        statusFilter === 'ALL' ? undefined : statusFilter === 'VOIDED' ? true : false;

      const [donRes, metRes, grpRes] = await Promise.all([
        donationsApi.list({
          search: search.trim() || undefined,
          group_id: selectedGroupId || undefined,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          is_voided: isVoidedParam,
        }),
        donationsApi.getMetrics().catch(() => ({ data: null })),
        groupsApi.list({ is_active: true }).catch(() => ({ data: [] })),
      ]);

      setDonations(donRes.data);
      if (metRes?.data) setMetrics(metRes.data);
      setGroups(grpRes.data.filter((g) => g.group_type === 'EXTERNAL_FUND'));
    } catch (err) {
      error('Failed to load donations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedGroupId, fromDate, toDate, statusFilter]);

  const handleConfirmVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidingDonation) return;
    if (!voidReason.trim()) {
      error('Please provide a valid reason for voiding this donation.');
      return;
    }

    setSavingVoid(true);
    try {
      await donationsApi.void(voidingDonation.id, { reason: voidReason.trim() });
      success(`Donation receipt "${voidingDonation.receipt_number}" has been voided/reversed.`);
      setVoidingDonation(null);
      setVoidReason('');
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to void donation.';
      error(msg);
    } finally {
      setSavingVoid(false);
    }
  };

  const getDonationActions = (d: Donation): ActionMenuItem[] => [
    {
      label: 'View Receipt',
      icon: <Eye className="w-4 h-4" />,
      onClick: () => navigate(`/app/donations/${d.id}`),
    },
    {
      label: 'Edit Details',
      icon: <Edit2 className="w-4 h-4" />,
      hidden: !hasPermission('donations.edit') || d.is_voided,
      onClick: () => navigate(`/app/donations/${d.id}/edit`),
    },
    {
      label: 'Void / Reverse',
      icon: <RotateCcw className="w-4 h-4 text-rose-500" />,
      hidden: !hasPermission('donations.void') || d.is_voided,
      onClick: () => {
        setVoidingDonation(d);
        setVoidReason('');
      },
    },
  ];

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
            <Receipt className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-500 dark:text-indigo-400" />
            <span>Manage External Donations</span>
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          {hasPermission('donations.create') && (
            <Button
              variant="primary"
              onClick={() => navigate('/app/donations/add')}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Donation
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => navigate('/app/donations/ledger')}
            leftIcon={<FileSpreadsheet className="w-4 h-4" />}
          >
            Donation Ledger
          </Button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 flex-shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Donated</p>
            <p className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white font-mono mt-0.5">
              {formatCurrency(metrics?.total_donations_amount)}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">This Month</p>
            <p className="text-base sm:text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
              {formatCurrency(metrics?.this_month_amount)}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Receipts</p>
            <p className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white font-mono mt-0.5">
              {metrics?.total_donations_count || 0}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">External Funds</p>
            <p className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white font-mono mt-0.5">
              {metrics?.active_funds_count || groups.length || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <Card bodyClassName="p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search donor name, receipt #, reference #, or purpose..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="w-full md:w-56">
            <Select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              options={[
                { value: '', label: 'All External Funds' },
                ...groups.map((g) => ({ value: g.id, label: g.name })),
              ]}
            />
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700 w-full md:w-auto">
            {(['ACTIVE', 'VOIDED', 'ALL'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`flex-1 md:flex-none px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  statusFilter === st
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {st === 'ACTIVE' ? 'Active' : st === 'VOIDED' ? 'Voided' : 'All'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs">
          <span className="text-slate-400 font-medium">Date Range:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
          />
          {(fromDate || toDate || selectedGroupId || search) && (
            <button
              onClick={() => {
                setFromDate('');
                setToDate('');
                setSelectedGroupId('');
                setSearch('');
              }}
              className="text-purple-600 dark:text-purple-400 font-bold hover:underline ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </Card>

      {/* Table Card */}
      <Card bodyClassName="p-0">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : donations.length === 0 ? (
          <div className="text-center py-16 p-8">
            <Receipt className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Donations Found</h3>
            <p className="text-xs text-slate-500 mt-1">Receive external donations from generous supporters.</p>
            {hasPermission('donations.create') && (
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => navigate('/app/donations/add')}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Donation
              </Button>
            )}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[800px] divide-y divide-slate-100 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 text-[11px] uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 sm:px-3.5">Receipt & Date</th>
                  <th className="py-2.5 px-3 sm:px-3.5">Donor Name</th>
                  <th className="py-2.5 px-3 sm:px-3.5">Fund Group</th>
                  <th className="py-2.5 px-3 sm:px-3.5">Purpose / Category</th>
                  <th className="py-2.5 px-3 sm:px-3.5 text-right">Amount</th>
                  <th className="py-2.5 px-3 sm:px-3.5">Payment Method</th>
                  <th className="py-2.5 px-3 sm:px-3.5 text-center">Status</th>
                  <th className="py-2.5 px-3 sm:px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {donations.map((d) => (
                  <tr
                    key={d.id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      d.is_voided ? 'opacity-60 bg-rose-50/20 dark:bg-rose-950/10' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 sm:px-3.5">
                      <div>
                        <p className="font-mono font-bold text-slate-900 dark:text-white leading-tight">
                          {d.receipt_number}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(d.donation_date).toLocaleDateString('en-US', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 sm:px-3.5">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[170px]">
                          {d.donor_name}
                        </p>
                        {d.donor_phone && (
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{d.donor_phone}</p>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 sm:px-3.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0"></span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                          {d.group_name || 'External Fund'}
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 sm:px-3.5">
                      <span className="text-slate-600 dark:text-slate-400 truncate max-w-[140px] block">
                        {d.purpose || 'General Donation'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 sm:px-3.5 text-right font-extrabold text-slate-900 dark:text-white font-mono text-xs">
                      <span className={d.is_voided ? 'line-through text-rose-500' : 'text-purple-600 dark:text-purple-400'}>
                        {formatCurrency(d.amount)}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 sm:px-3.5">
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                        <span>{d.payment_method.replace('_', ' ')}</span>
                        {d.reference_number && (
                          <span className="block text-[10px] text-slate-400 font-mono truncate max-w-[110px]">
                            Ref: {d.reference_number}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 sm:px-3.5 text-center">
                      {d.is_voided ? (
                        <Badge variant="danger" size="sm">
                          Voided
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm">
                          Received
                        </Badge>
                      )}
                    </td>

                    <td className="py-2.5 px-3 sm:px-3.5 text-right">
                      <ActionMenu items={getDonationActions(d)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Void Confirmation Modal */}
      <Modal
        isOpen={!!voidingDonation}
        onClose={() => setVoidingDonation(null)}
        title={`Void Donation: ${voidingDonation?.receipt_number}`}
        subtitle="Perform an immutable, audit-backed reversing financial transaction."
        maxWidth="md"
      >
        <form onSubmit={handleConfirmVoid} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs space-y-1.5">
            <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-300 font-bold">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Accounting Reversal Warning</span>
            </div>
            <p className="text-rose-600 dark:text-rose-400">
              Voiding this donation of <b>{formatCurrency(voidingDonation?.amount)}</b> will create a reversing <b>DEBIT</b> entry in the ledger and decrease the available balance of <b>{voidingDonation?.group_name}</b>.
            </p>
          </div>

          <Textarea
            label="Reason for Voiding * (Audit Logged)"
            placeholder="Explain why this donation receipt is being cancelled/reversed (e.g. Duplicate receipt, incorrect payment method, bounced cheque)..."
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            required
            autoFocus
          />

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setVoidingDonation(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              isLoading={savingVoid}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              Confirm Void & Reversal
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
