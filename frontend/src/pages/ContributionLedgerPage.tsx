import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { contributionsApi, membersApi, groupsApi } from '../api/client';
import { ContributionLedgerOut, Member, Group } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../context/ToastContext';
import {
  FileSpreadsheet,
  Building2,
  Calendar,
  PiggyBank,
  TrendingUp,
  ArrowDownLeft,
  Ban,
  Receipt,
  FileCheck,
  ArrowLeft,
  Search,
  Filter
} from 'lucide-react';

export const ContributionLedgerPage: React.FC = () => {
  const [ledger, setLedger] = useState<ContributionLedgerOut | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');

  const { error } = useToast();
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const [ledgerRes, membersRes, groupsRes] = await Promise.all([
        contributionsApi.getLedger({
          member_id: selectedMemberId || undefined,
          group_id: selectedGroupId || undefined,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
        }),
        membersApi.list({ limit: 200 }),
        groupsApi.list(),
      ]);
      setLedger(ledgerRes.data);
      setMembers(membersRes.data);
      setGroups(groupsRes.data);
    } catch (err) {
      error('Failed to load contribution financial ledger from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMemberId, selectedGroupId, fromDate, toDate]);

  const filteredEntries = ledger?.entries.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.receipt_number.toLowerCase().includes(q) ||
      e.member_name.toLowerCase().includes(q) ||
      (e.member_code && e.member_code.toLowerCase().includes(q)) ||
      e.group_name.toLowerCase().includes(q) ||
      (e.transaction_code && e.transaction_code.toLowerCase().includes(q)) ||
      (e.reference_number && e.reference_number.toLowerCase().includes(q))
    );
  }) || [];

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
            <FileSpreadsheet className="w-7 h-7 text-emerald-500" />
            <span>Contribution Financial Ledger</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Complete financial deposit history backed by the FastAPI immutable double-entry financial ledger.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => navigate('/app/contributions/manage')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Manage Contributions
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Inflow</p>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {formatCurrency(ledger?.total_active_amount)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            Active verified member contributions
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Voided / Reversed</p>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Ban className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
            {formatCurrency(ledger?.total_voided_amount)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            Reversed entries with audit debit adjustments
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Receipts Processed</p>
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {ledger?.total_contributions_count || 0} Receipts
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            Total historical contribution entries
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search receipt, member, txn..."
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

          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-1/2 px-2.5 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl text-xs"
              placeholder="From Date"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-1/2 px-2.5 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl text-xs"
              placeholder="To Date"
            />
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <Card bodyClassName="p-0">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-16 p-8">
            <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Ledger Records Found</h3>
            <p className="text-xs text-slate-500 mt-1">There are no financial entries matching the selected criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Receipt & Txn Code</th>
                  <th className="px-6 py-4">Member Name</th>
                  <th className="px-6 py-4">Credited Group</th>
                  <th className="px-6 py-4">Payment Method & Ref</th>
                  <th className="px-6 py-4 text-right">Credit Amount</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredEntries.map((entry) => {
                  const isVoided = entry.status === 'VOIDED';
                  return (
                    <tr
                      key={entry.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isVoided ? 'opacity-60 bg-rose-50/20 dark:bg-rose-950/10' : ''
                      }`}
                    >
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap text-xs">
                        {entry.date}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        <p className="font-bold text-slate-900 dark:text-white">{entry.receipt_number}</p>
                        {entry.transaction_code && (
                          <p className="text-slate-400 text-[10px]">{entry.transaction_code}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 dark:text-white">{entry.member_name}</p>
                        {entry.member_code && (
                          <p className="text-[11px] text-slate-400 font-mono">{entry.member_code}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400 text-xs">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{entry.group_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{entry.payment_method}</p>
                        {entry.reference_number && (
                          <p className="text-slate-400 font-mono text-[11px]">{entry.reference_number}</p>
                        )}
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-extrabold text-base ${
                          isVoided
                            ? 'text-slate-400 line-through'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {formatCurrency(entry.amount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={isVoided ? 'danger' : 'success'} size="sm">
                          {entry.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {entry.created_by_name || 'System'}
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
  );
};
