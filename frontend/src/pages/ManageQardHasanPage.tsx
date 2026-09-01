import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { assistanceApi, beneficiariesApi, groupsApi } from '../api/client';
import { Assistance, Beneficiary, Group } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  HandCoins,
  Plus,
  Search,
  Building2,
  Calendar,
  Eye,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Layers,
  ArrowRight
} from 'lucide-react';

export const ManageQardHasanPage: React.FC = () => {
  const [loans, setLoans] = useState<Assistance[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Details Modal
  const [selectedLoan, setSelectedLoan] = useState<Assistance | null>(null);

  const { error } = useToast();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const [astRes, benRes, groupsRes] = await Promise.all([
        assistanceApi.list({
          assistance_type: 'QARD_HASAN',
          status_filter: statusFilter !== 'ALL' ? (statusFilter as any) : undefined,
          beneficiary_id: selectedBeneficiaryId || undefined,
          group_id: selectedGroupId || undefined,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          search: search.trim() || undefined,
          limit: 100,
        }),
        beneficiariesApi.list({ limit: 200 }),
        groupsApi.list(),
      ]);
      setLoans(astRes.data);
      setBeneficiaries(benRes.data);
      setGroups(groupsRes.data);
    } catch (err) {
      error('Failed to load Qard Hasan records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedBeneficiaryId, selectedGroupId, statusFilter, fromDate, toDate]);

  const formatCurrency = (val: string | number | undefined) => {
    const num = Number(val || 0);
    return '৳' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // KPIs
  const totalPrincipal = loans.reduce((s, l) => s + Number(l.total_amount || 0), 0);
  const totalRepaid = loans.reduce((s, l) => s + Number(l.total_repaid || 0), 0);
  const totalOutstanding = loans.reduce((s, l) => s + Number(l.outstanding_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <HandCoins className="w-7 h-7 text-emerald-500" />
            <span>Manage Qard Hasan (Interest-Free Loans)</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track revolving loan portfolios, multi-group co-funding splits, repayments, and outstanding balances.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {hasPermission('assistance.create') && (
            <Button
              variant="primary"
              onClick={() => navigate('/app/assistance/qard-hasan/add')}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Qard Hasan
            </Button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Disbursed Principal</p>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <HandCoins className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {formatCurrency(totalPrincipal)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">{loans.length} active/recorded loans</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Recovered</p>
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-2">
            {formatCurrency(totalRepaid)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">Repayments allocated to groups</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Outstanding Loan</p>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {formatCurrency(totalOutstanding)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">Active receivable balance</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search code, beneficiary, purpose..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <Select
            value={selectedBeneficiaryId}
            onChange={(e) => setSelectedBeneficiaryId(e.target.value)}
          >
            <option value="">All Beneficiaries</option>
            {beneficiaries.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.group_name})
              </option>
            ))}
          </Select>

          <Select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
          >
            <option value="">All Funding Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>

          <div className="flex items-center space-x-1 bg-slate-50 dark:bg-slate-850 p-1 rounded-xl border border-slate-200 dark:border-slate-750">
            {(['ALL', 'ACTIVE', 'COMPLETED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${
                  statusFilter === st
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {st === 'ALL' ? 'All' : st === 'ACTIVE' ? 'Active' : 'Completed'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <Card bodyClassName="p-0">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : loans.length === 0 ? (
          <div className="text-center py-16 p-8">
            <HandCoins className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Qard Hasan Records Found</h3>
            <p className="text-xs text-slate-500 mt-1">There are no loans matching the selected filters.</p>
            {hasPermission('assistance.create') && (
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => navigate('/app/assistance/qard-hasan/add')}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Disburse Qard Hasan
              </Button>
            )}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[780px] divide-y divide-slate-100 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 text-[11px] uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2 px-3 sm:px-3.5">Loan Code</th>
                  <th className="py-2 px-3 sm:px-3.5">Disbursed Date</th>
                  <th className="py-2 px-3 sm:px-3.5">Beneficiary</th>
                  <th className="py-2 px-3 sm:px-3.5">Funding Groups</th>
                  <th className="py-2 px-3 sm:px-3.5 text-right">Disbursed Principal</th>
                  <th className="py-2 px-3 sm:px-3.5 text-right">Repaid</th>
                  <th className="py-2 px-3 sm:px-3.5 text-right">Outstanding</th>
                  <th className="py-2 px-3 sm:px-3.5 text-center">Status</th>
                  <th className="py-2 px-3 sm:px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {loans.map((loan) => {
                  const isCompleted = Number(loan.outstanding_amount || 0) <= 0;
                  return (
                    <tr
                      key={loan.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2 px-3 sm:px-3.5 font-mono font-bold text-slate-900 dark:text-white text-xs">
                        {loan.assistance_code}
                      </td>
                      <td className="py-2 px-3 sm:px-3.5 text-slate-700 dark:text-slate-300 font-medium">
                        {loan.disbursement_date}
                      </td>
                      <td className="py-2 px-3 sm:px-3.5 font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                        {loan.beneficiary_name}
                      </td>
                      <td className="py-2 px-3 sm:px-3.5 text-xs">
                        <div className="space-y-0.5">
                          {loan.funding_allocations.map((fa, i) => (
                            <div key={i} className="flex items-center space-x-1 text-slate-600 dark:text-slate-300 text-[11px]">
                              <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              <span>{fa.group_name}: <b>{formatCurrency(fa.allocated_amount)}</b></span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 px-3 sm:px-3.5 text-right font-bold text-slate-900 dark:text-white text-xs">
                        {formatCurrency(loan.total_amount)}
                      </td>
                      <td className="py-2 px-3 sm:px-3.5 text-right font-bold text-sky-600 dark:text-sky-400 text-xs">
                        {formatCurrency(loan.total_repaid)}
                      </td>
                      <td className="py-2 px-3 sm:px-3.5 text-right font-bold text-amber-600 dark:text-amber-400 text-xs">
                        {formatCurrency(loan.outstanding_amount)}
                      </td>
                      <td className="py-2 px-3 sm:px-3.5 text-center">
                        <Badge variant={isCompleted ? 'success' : 'warning'} size="sm">
                          {isCompleted ? 'COMPLETED' : 'ACTIVE'}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 sm:px-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-7 w-7"
                            onClick={() => setSelectedLoan(loan)}
                            title="View Loan Details & Allocations"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                          </Button>
                          {!isCompleted && hasPermission('repayments.create') && (
                            <Button
                              variant="primary"
                              size="sm"
                              className="py-1 px-2.5 text-xs"
                              onClick={() => navigate(`/app/assistance/qard-hasan/repayments?assistance_id=${loan.id}`)}
                              leftIcon={<Receipt className="w-3.5 h-3.5" />}
                            >
                              Repay
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Details Modal */}
      <Modal
        isOpen={!!selectedLoan}
        onClose={() => setSelectedLoan(null)}
        title={`Loan Details: ${selectedLoan?.assistance_code}`}
        subtitle={`Qard Hasan for ${selectedLoan?.beneficiary_name} • Principal: ${formatCurrency(selectedLoan?.total_amount)}`}
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs">
          {/* Summary Box */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-slate-400 font-semibold">Total Disbursed:</p>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {formatCurrency(selectedLoan?.total_amount)}
              </p>
            </div>
            <div>
              <p className="text-slate-400 font-semibold">Total Repaid:</p>
              <p className="text-sm font-black text-sky-600 dark:text-sky-400">
                {formatCurrency(selectedLoan?.total_repaid)}
              </p>
            </div>
            <div>
              <p className="text-slate-400 font-semibold">Remaining Outstanding:</p>
              <p className="text-sm font-black text-amber-600 dark:text-amber-400">
                {formatCurrency(selectedLoan?.outstanding_amount)}
              </p>
            </div>
          </div>

          {/* Group Allocations Table */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Funding Group Allocations & Recovery Status</span>
            </h4>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-2.5">Funding Group</th>
                    <th className="p-2.5 text-right">Allocated</th>
                    <th className="p-2.5 text-right">Share %</th>
                    <th className="p-2.5 text-right">Recovered</th>
                    <th className="p-2.5 text-right">Receivable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedLoan?.funding_allocations.map((fa, i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-bold text-slate-900 dark:text-white">{fa.group_name}</td>
                      <td className="p-2.5 text-right font-semibold">{formatCurrency(fa.allocated_amount)}</td>
                      <td className="p-2.5 text-right font-mono text-slate-500">
                        {(Number(fa.proportion_ratio || 0) * 100).toFixed(2)}%
                      </td>
                      <td className="p-2.5 text-right font-bold text-sky-600">{formatCurrency(fa.repaid_amount)}</td>
                      <td className="p-2.5 text-right font-bold text-amber-600">
                        {formatCurrency(fa.remaining_receivable)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Purpose & Notes */}
          {selectedLoan?.purpose && (
            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
              <p className="text-slate-400 font-semibold mb-0.5">Purpose:</p>
              <p className="text-slate-800 dark:text-slate-200">{selectedLoan.purpose}</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const benId = selectedLoan?.beneficiary_id;
                setSelectedLoan(null);
                navigate(`/app/beneficiaries/ledger?beneficiary_id=${benId}`);
              }}
              leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
            >
              View Beneficiary Ledger
            </Button>

            <div className="flex items-center space-x-2">
              {Number(selectedLoan?.outstanding_amount || 0) > 0 && hasPermission('repayments.create') && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const loanId = selectedLoan?.id;
                    setSelectedLoan(null);
                    navigate(`/app/assistance/qard-hasan/repayments?assistance_id=${loanId}`);
                  }}
                  leftIcon={<Receipt className="w-3.5 h-3.5" />}
                >
                  Record Repayment
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedLoan(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
