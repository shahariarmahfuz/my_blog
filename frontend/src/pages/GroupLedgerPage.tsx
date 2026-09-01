import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { groupsApi } from '../api/client';
import { Group, GroupLedgerOut } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../context/ToastContext';
import {
  FileSpreadsheet,
  Building2,
  Calendar,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  PieChart
} from 'lucide-react';

export const GroupLedgerPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [ledger, setLedger] = useState<GroupLedgerOut | null>(null);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const { error } = useToast();

  // 1. Load groups for selector
  useEffect(() => {
    const loadGroupsList = async () => {
      try {
        setLoadingGroups(true);
        const res = await groupsApi.list();
        setGroups(res.data);

        // Check if group_id is in query params
        const paramId = searchParams.get('group_id');
        if (paramId && res.data.some((g) => g.id === paramId)) {
          setSelectedGroupId(paramId);
        } else if (res.data.length > 0) {
          setSelectedGroupId(res.data[0].id);
        }
      } catch (err) {
        error('Failed to load fund groups list for ledger.');
      } finally {
        setLoadingGroups(false);
      }
    };
    loadGroupsList();
  }, []);

  // 2. Load group ledger whenever selectedGroupId changes
  useEffect(() => {
    if (!selectedGroupId) {
      setLedger(null);
      return;
    }

    const loadLedgerData = async () => {
      try {
        setLoadingLedger(true);
        setSearchParams({ group_id: selectedGroupId });
        const res = await groupsApi.getLedger(selectedGroupId);
        setLedger(res.data);
      } catch (err) {
        error('Failed to load group financial ledger from backend.');
        setLedger(null);
      } finally {
        setLoadingLedger(false);
      }
    };

    loadLedgerData();
  }, [selectedGroupId]);

  const formatCurrency = (val: string | number | undefined) => {
    const num = Number(val || 0);
    return '৳' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getTransactionTypeBadge = (type: string) => {
    switch (type) {
      case 'CONTRIBUTION':
        return <Badge variant="success" size="sm">Member Contribution</Badge>;
      case 'OPENING_BALANCE':
        return <Badge variant="success" size="sm">Opening Balance</Badge>;
      case 'OPENING_BALANCE_ADJUSTMENT':
        return <Badge variant="info" size="sm">Opening Balance Adjustment</Badge>;
      case 'QARD_HASAN_DISBURSEMENT':
        return <Badge variant="info" size="sm">Qard Hasan Loan</Badge>;
      case 'QARD_HASAN_REPAYMENT':
        return <Badge variant="success" size="sm">Loan Repayment</Badge>;
      case 'SADAQAH_DISBURSEMENT':
        return <Badge variant="amber" size="sm">Sadaqah Grant</Badge>;
      case 'GROUP_TRANSFER':
        return <Badge variant="purple" size="sm">Group Transfer</Badge>;
      case 'ADJUSTMENT':
        return <Badge variant="neutral" size="sm">Balance Adjustment</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <FileSpreadsheet className="w-7 h-7 text-emerald-500" />
            <span>Group Financial Ledger</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Complete chronological double-entry financial ledger with progressive running balances derived strictly by the backend.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/app/groups/fund?group_id=${selectedGroupId}`)}
            leftIcon={<PieChart className="w-4 h-4 text-indigo-500" />}
          >
            Group Fund View
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/app/groups/manage')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Groups
          </Button>
        </div>
      </div>

      {/* Group Selector Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Select Fund Group:
            </label>
            <span className="text-xs text-slate-400">View complete financial debits, credits, and progressive balance</span>
          </div>
        </div>

        <div className="w-full sm:w-80">
          <Select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            disabled={loadingGroups}
            placeholder={loadingGroups ? "Loading groups..." : "Select a group..."}
          >
            {loadingGroups ? (
              <option value="">Loading groups...</option>
            ) : groups.length === 0 ? (
              <option value="">No groups created yet</option>
            ) : (
              groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} {g.code ? `(${g.code})` : ''} — Bal: {formatCurrency(g.current_balance)}
                </option>
              ))
            )}
          </Select>
        </div>
      </div>

      {/* Content Rendering */}
      {loadingLedger ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : !ledger ? (
        <div className="text-center py-16 p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Select a Group to View Ledger</h3>
          <p className="text-xs text-slate-500 mt-1">Please select an accounting fund group from the selector above.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Group Balance</p>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                {formatCurrency(ledger.current_balance)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">
                Authoritative balance calculated by backend
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Credits Inflow</p>
                <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                +{formatCurrency(ledger.total_credits)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">
                Contributions & repayments credited
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Debits Outflow</p>
                <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
                -{formatCurrency(ledger.total_debits)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">
                Qard Hasan loans & Sadaqah disbursed
              </p>
            </div>
          </div>

          {/* Chronological Ledger Table */}
          <Card
            title={`Financial Transactions Ledger — ${ledger.group_name}`}
            subtitle={`${ledger.entries.length} recorded double-entry ledger transactions • Chronological running balances computed by backend`}
            bodyClassName="p-0"
          >
            {ledger.entries.length === 0 ? (
              <div className="text-center py-16 p-8">
                <Receipt className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">No Ledger Entries Recorded</h3>
                <p className="text-xs text-slate-500 mt-1">
                  This group has no financial transactions recorded yet.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-4"
                  onClick={() => navigate('/app/contributions')}
                  leftIcon={<TrendingUp className="w-3.5 h-3.5" />}
                >
                  Record Contribution
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Transaction Code</th>
                      <th className="px-6 py-4">Transaction Type</th>
                      <th className="px-6 py-4 text-center">Entry Type</th>
                      <th className="px-6 py-4">Description / Reference</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                      <th className="px-6 py-4 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {ledger.entries.map((entry) => {
                      const isCredit = entry.entry_type === 'CREDIT';
                      return (
                        <tr
                          key={entry.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                            {entry.date}
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white text-xs">
                            {entry.transaction_code}
                          </td>
                          <td className="px-6 py-4">
                            {getTransactionTypeBadge(entry.transaction_type)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Badge variant={isCredit ? 'success' : 'danger'} size="sm">
                              {isCredit ? '+ CREDIT' : '− DEBIT'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate">
                            {entry.description || entry.reference || '—'}
                          </td>
                          <td
                            className={`px-6 py-4 text-right font-extrabold text-sm ${
                              isCredit
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isCredit ? '+' : '−'}
                            {formatCurrency(entry.amount)}
                          </td>
                          <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white text-base bg-slate-50/50 dark:bg-slate-850/30">
                            {formatCurrency(entry.running_balance)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
