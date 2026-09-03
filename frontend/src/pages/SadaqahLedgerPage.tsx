import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { assistanceApi, beneficiariesApi, groupsApi } from '../api/client';
import { SadaqahLedgerOut, Beneficiary, Group } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../context/ToastContext';
import {
  FileSpreadsheet,
  Building2,
  Calendar,
  HeartHandshake,
  ArrowLeft,
  Search,
  Users2,
  Layers,
  ArrowUpRight
} from 'lucide-react';

export const SadaqahLedgerPage: React.FC = () => {
  const [ledger, setLedger] = useState<SadaqahLedgerOut | null>(null);
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
        assistanceApi.getSadaqahLedger({
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
      error('Failed to load Sadaqah financial ledger.');
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
      e.assistance_code.toLowerCase().includes(q) ||
      e.beneficiary_name.toLowerCase().includes(q) ||
      (e.transaction_code && e.transaction_code.toLowerCase().includes(q)) ||
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
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
          <FileSpreadsheet className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-500 dark:text-indigo-400" />
          <span>Sadaqah Financial Ledger</span>
        </h1>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sadaqah Granted</p>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <HeartHandshake className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {formatCurrency(ledger?.total_sadaqah_distributed)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">Non-recoverable humanitarian grants</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Beneficiaries Assisted</p>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Users2 className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {ledger?.total_beneficiaries_assisted || 0} People
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">Distinct humanitarian grant recipients</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Grant Distributions</p>
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-2">
            {ledger?.total_grants_count || 0} Records
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">Fully debited from group accounts</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search code, beneficiary, purpose..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
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
            <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-16 p-8">
            <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Sadaqah Entries Found</h3>
            <p className="text-xs text-slate-500 mt-1">There are no grant transactions matching the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Grant & Txn Code</th>
                  <th className="px-6 py-4">Beneficiary</th>
                  <th className="px-6 py-4">Funding Groups & Splits</th>
                  <th className="px-6 py-4">Purpose / Category</th>
                  <th className="px-6 py-4 text-right">Debited Amount</th>
                  <th className="px-6 py-4 text-center">Type</th>
                  <th className="px-6 py-4">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap text-xs">
                      {entry.date}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      <p className="font-bold text-slate-900 dark:text-white">{entry.assistance_code}</p>
                      {entry.transaction_code && (
                        <p className="text-slate-400 text-[10px]">{entry.transaction_code}</p>
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
                    <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300">
                      {entry.purpose || 'General Humanitarian Relief'}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-rose-600 dark:text-rose-400 text-sm">
                      {formatCurrency(entry.total_amount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="danger" size="sm">
                        NON-RECOVERABLE
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {entry.created_by_name || 'System Admin'}
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
