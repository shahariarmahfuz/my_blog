import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { assistanceApi, beneficiariesApi, groupsApi } from '../api/client';
import { QardHasanLedgerOut, Beneficiary, Group } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../context/ToastContext';
import {
  FileSpreadsheet,
  Building2,
  Calendar,
  HandCoins,
  Receipt,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  ArrowLeft,
  Layers
} from 'lucide-react';

export const QardHasanLedgerPage: React.FC = () => {
  const [ledger, setLedger] = useState<QardHasanLedgerOut | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');

  const { error } = useToast();
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const [ledgerRes, benRes, groupsRes] = await Promise.all([
        assistanceApi.getQHLedger({
          beneficiary_id: selectedBeneficiaryId || undefined,
          group_id: selectedGroupId || undefined,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
        }),
        beneficiariesApi.list({ limit: 200 }),
        groupsApi.list(),
      ]);
      setLedger(ledgerRes.data);
      setBeneficiaries(benRes.data);
      setGroups(groupsRes.data);
    } catch (err) {
      error('Failed to load Qard Hasan financial ledger.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBeneficiaryId, selectedGroupId, fromDate, toDate]);

  const filteredEntries = ledger?.entries.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.code.toLowerCase().includes(q) ||
      e.beneficiary_name.toLowerCase().includes(q) ||
      (e.assistance_code && e.assistance_code.toLowerCase().includes(q)) ||
      (e.transaction_code && e.transaction_code.toLowerCase().includes(q)) ||
      (e.reference_number && e.reference_number.toLowerCase().includes(q)) ||
      (e.purpose && e.purpose.toLowerCase().includes(q))
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
            <span>Qard Hasan Financial Ledger</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Complete revolving loan and proportional repayment ledger backed by FastAPI immutable transactions.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => navigate('/app/assistance/qard-hasan/manage')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Manage Qard Hasan
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Disbursed Principal</p>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {formatCurrency(ledger?.total_disbursed)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">{ledger?.total_loans_count || 0} loan accounts</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Repayments Collected</p>
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-2">
            {formatCurrency(ledger?.total_repaid)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">Allocated back to groups</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Active Outstanding</p>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {formatCurrency(ledger?.net_outstanding)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">Revolving receivable balance</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search code, beneficiary, ref..."
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
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Ledger Entries Found</h3>
            <p className="text-xs text-slate-500 mt-1">There are no financial transactions matching the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Event & Code</th>
                  <th className="px-6 py-4">Beneficiary</th>
                  <th className="px-6 py-4">Funding Groups & Splits</th>
                  <th className="px-6 py-4 text-right">Disbursed (DEBIT)</th>
                  <th className="px-6 py-4 text-right">Repaid (CREDIT)</th>
                  <th className="px-6 py-4 text-right">Running Outstanding</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredEntries.map((entry) => {
                  const isDisbursement = entry.entry_type === 'DISBURSEMENT';
                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap text-xs">
                        {entry.date}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        <div className="flex items-center space-x-1.5">
                          <Badge variant={isDisbursement ? 'warning' : 'success'} size="sm">
                            {entry.entry_type}
                          </Badge>
                          <span className="font-bold text-slate-900 dark:text-white">{entry.code}</span>
                        </div>
                        {entry.transaction_code && (
                          <p className="text-slate-400 text-[10px] mt-0.5">{entry.transaction_code}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                        {entry.beneficiary_name}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <div className="space-y-1">
                          {entry.funding_groups.map((fg, i) => (
                            <div key={i} className="flex items-center space-x-1 text-slate-600 dark:text-slate-300">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              <span>{fg.group_name}: <b>{formatCurrency(fg.allocated_amount)}</b></span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-extrabold text-slate-900 dark:text-white text-sm">
                        {isDisbursement ? formatCurrency(entry.amount) : '—'}
                      </td>
                      <td className="px-6 py-4 text-right font-extrabold text-sky-600 dark:text-sky-400 text-sm">
                        {!isDisbursement ? formatCurrency(entry.amount) : '—'}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-amber-600 dark:text-amber-400 text-sm">
                        {formatCurrency(entry.running_outstanding)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={isDisbursement ? 'warning' : 'success'} size="sm">
                          {entry.status}
                        </Badge>
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
