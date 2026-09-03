import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { groupsApi } from '../api/client';
import { Group, GroupFundOut } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../context/ToastContext';
import {
  PieChart,
  Building2,
  Calendar,
  Wallet,
  TrendingUp,
  HandCoins,
  Receipt,
  HeartHandshake,
  ArrowLeft,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Coins
} from 'lucide-react';

export const GroupFundPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [fund, setFund] = useState<GroupFundOut | null>(null);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingFund, setLoadingFund] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'QARD_HASAN' | 'SADAQAH'>('ALL');

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
        error('Failed to load fund groups list.');
      } finally {
        setLoadingGroups(false);
      }
    };
    loadGroupsList();
  }, []);

  // 2. Load group fund data whenever selectedGroupId changes
  useEffect(() => {
    if (!selectedGroupId) {
      setFund(null);
      return;
    }

    const loadFundData = async () => {
      try {
        setLoadingFund(true);
        setSearchParams({ group_id: selectedGroupId });
        const res = await groupsApi.getFund(selectedGroupId);
        setFund(res.data);
      } catch (err) {
        error('Failed to load group fund allocation data from backend.');
        setFund(null);
      } finally {
        setLoadingFund(false);
      }
    };

    loadFundData();
  }, [selectedGroupId]);

  const formatCurrency = (val: string | number | undefined) => {
    const num = Number(val || 0);
    return '৳' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const filteredAllocations = fund?.allocations.filter((a) => {
    if (typeFilter === 'ALL') return true;
    return a.assistance_type === typeFilter;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <PieChart className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-500 dark:text-indigo-400" />
            <span>Group Fund & Utilization</span>
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/app/groups/ledger?group_id=${selectedGroupId}`)}
            leftIcon={<FileSpreadsheet className="w-4 h-4 text-indigo-500" />}
          >
            Group Ledger
          </Button>
        </div>
      </div>

      {/* Group Selector Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Select Fund Group:
            </label>
            <span className="text-xs text-slate-400">View current fund liquidity, allocations, and loan recovery stats</span>
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
      {loadingFund ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : !fund ? (
        <div className="text-center py-16 p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <PieChart className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Select a Group to View Fund Utilization</h3>
          <p className="text-xs text-slate-500 mt-1">Please select an active group from the dropdown above.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Fund Liquidity & Position KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 shadow-sm bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Available Balance</p>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Wallet className="w-3.5 h-3.5" />
                </div>
              </div>
              <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                {formatCurrency(fund.available_balance)}
              </h3>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 font-semibold">Liquid & ready to disburse</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Contributed</p>
                <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">
                {formatCurrency(fund.total_contributions)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">Lifetime member donations</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">QH Loan Funded</p>
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <HandCoins className="w-3.5 h-3.5" />
                </div>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">
                {formatCurrency(fund.total_qard_hasan_funded)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">Allocated to borrowers</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">QH Repaid Back</p>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Receipt className="w-3.5 h-3.5" />
                </div>
              </div>
              <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                {formatCurrency(fund.total_qard_hasan_repaid)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">Recovered to group</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">QH Outstanding</p>
                <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5" />
                </div>
              </div>
              <h3 className="text-xl font-black text-rose-600 dark:text-rose-400 mt-2">
                {formatCurrency(fund.net_qard_hasan_outstanding)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">Unrecovered principal</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sadaqah Granted</p>
                <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <HeartHandshake className="w-3.5 h-3.5" />
                </div>
              </div>
              <h3 className="text-xl font-black text-amber-600 dark:text-amber-400 mt-2">
                {formatCurrency(fund.total_sadaqah_funded)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">Non-recoverable grants</p>
            </div>
          </div>

          {/* Allocation & Utilization History */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Assistance Transactions Funded by {fund.group_name}
                </h2>
                <p className="text-xs text-slate-500">
                  Breakdown of every assistance funded by this group, including recovery and remaining receivables.
                </p>
              </div>

              <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                {(['ALL', 'QARD_HASAN', 'SADAQAH'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      typeFilter === t
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {t === 'ALL' ? 'All Types' : t === 'QARD_HASAN' ? 'Qard Hasan' : 'Sadaqah'}
                  </button>
                ))}
              </div>
            </div>

            <Card bodyClassName="p-0">
              {filteredAllocations.length === 0 ? (
                <div className="text-center py-16 p-8">
                  <HeartHandshake className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">No Funding Allocations Recorded</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    This fund group has not yet financed any Qard Hasan loans or Sadaqah grants.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate('/app/assistance')}
                    leftIcon={<HandCoins className="w-3.5 h-3.5" />}
                  >
                    Disburse Assistance
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Assistance Code</th>
                        <th className="px-6 py-4">Beneficiary</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4 text-right">Total Assistance</th>
                        <th className="px-6 py-4 text-right">Group Share</th>
                        <th className="px-6 py-4 text-right">Recovered</th>
                        <th className="px-6 py-4 text-right">Group Receivable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {filteredAllocations.map((alloc) => {
                        const isQH = alloc.assistance_type === 'QARD_HASAN';
                        return (
                          <tr
                            key={alloc.assistance_id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                              {alloc.disbursement_date}
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white text-xs">
                              {alloc.assistance_code}
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-900 dark:text-white">{alloc.beneficiary_name}</p>
                              {alloc.purpose && (
                                <p className="text-xs text-slate-400 truncate max-w-xs">{alloc.purpose}</p>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant={isQH ? 'info' : 'amber'} size="sm">
                                {isQH ? 'Qard Hasan' : 'Sadaqah'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-slate-500 text-xs">
                              {formatCurrency(alloc.total_assistance_amount)}
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white text-sm">
                              {formatCurrency(alloc.amount_funded_by_group)}
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                              {isQH ? formatCurrency(alloc.amount_recovered) : '—'}
                            </td>
                            <td className="px-6 py-4 text-right font-black text-rose-600 dark:text-rose-400 text-base bg-slate-50/50 dark:bg-slate-850/30">
                              {isQH ? formatCurrency(alloc.remaining_receivable) : '—'}
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
        </div>
      )}
    </div>
  );
};
