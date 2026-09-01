import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { contributionsApi, groupsApi } from '../api/client';
import { MonthlyContributionDueOut, MonthlyContributionSummaryOut, Group } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../context/ToastContext';
import {
  Clock,
  Building2,
  Calendar,
  PiggyBank,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Search,
  ChevronLeft,
  ChevronRight,
  Phone,
  FileSpreadsheet,
  TrendingUp,
  RefreshCw,
  Sparkles
} from 'lucide-react';

export const DueContributionsPage: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().substring(0, 7) // YYYY-MM
  );
  const [dueList, setDueList] = useState<MonthlyContributionDueOut[]>([]);
  const [summary, setSummary] = useState<MonthlyContributionSummaryOut | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DUE' | 'PARTIAL' | 'OVERDUE' | 'PAID'>('ALL');
  const [search, setSearch] = useState('');

  const { success, error } = useToast();
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const [dueRes, sumRes, groupsRes] = await Promise.all([
        contributionsApi.getDue({
          month: selectedMonth,
          group_id: selectedGroupId || undefined,
          status_filter: statusFilter !== 'ALL' ? statusFilter : undefined,
        }),
        contributionsApi.getSummary({
          month: selectedMonth,
          group_id: selectedGroupId || undefined,
        }),
        groupsApi.list(),
      ]);
      setDueList(dueRes.data);
      setSummary(sumRes.data);
      setGroups(groupsRes.data);
    } catch (err) {
      error('Failed to load monthly dues and contribution schedule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedGroupId, statusFilter]);

  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setSelectedMonth(d.toISOString().substring(0, 7));
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    setSelectedMonth(d.toISOString().substring(0, 7));
  };

  const handleCurrentMonth = () => {
    setSelectedMonth(new Date().toISOString().substring(0, 7));
  };

  const handleGenerateDues = async () => {
    try {
      setGenerating(true);
      const res = await contributionsApi.generateDues({
        month: selectedMonth,
        group_id: selectedGroupId || undefined
      });
      success(res.data.message || 'Monthly dues checked/generated successfully!');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to generate monthly dues');
    } finally {
      setGenerating(false);
    }
  };

  const filteredList = dueList.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.member_name.toLowerCase().includes(q) ||
      (item.member_code && item.member_code.toLowerCase().includes(q)) ||
      (item.phone && item.phone.includes(q)) ||
      item.group_name.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="success" size="sm">Paid (৳0 Due)</Badge>;
      case 'PARTIAL':
        return <Badge variant="info" size="sm">Partial Paid</Badge>;
      case 'OVERDUE':
        return <Badge variant="danger" size="sm">Overdue</Badge>;
      case 'DUE':
      default:
        return <Badge variant="warning" size="sm">Due / Pending</Badge>;
    }
  };

  const formatCurrency = (val: string | number | undefined) => {
    const num = Number(val || 0);
    return '৳' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formattedMonthTitle = new Date(`${selectedMonth}-01`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <Clock className="w-7 h-7 text-emerald-500" />
            <span>Monthly Dues & Contributions</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Recurring member subscription schedule for <b>{formattedMonthTitle}</b>. Dues are receivables; cash is credited only upon payment.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Button
            variant="outline"
            onClick={handleGenerateDues}
            isLoading={generating}
            leftIcon={<RefreshCw className="w-4 h-4 text-emerald-500" />}
          >
            Verify / Generate Dues
          </Button>

          <Button
            variant="primary"
            onClick={() => navigate(`/app/contributions/add?month=${selectedMonth}`)}
            leftIcon={<PiggyBank className="w-4 h-4" />}
          >
            Add Contribution
          </Button>
        </div>
      </div>

      {/* Month Navigator Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleCurrentMonth}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-xl text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition"
          >
            Current Month
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Billing Period: <span className="font-bold text-slate-900 dark:text-white">{formattedMonthTitle}</span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Expected */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Expected Dues</p>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {formatCurrency(summary?.total_expected_due || 0)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            {summary?.total_members_count || 0} Active Members in cycle
          </p>
        </div>

        {/* Total Collected */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Collected</p>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {formatCurrency(summary?.total_collected || 0)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            {summary?.paid_count || 0} Fully Paid • {summary?.partial_count || 0} Partial
          </p>
        </div>

        {/* Total Outstanding */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Outstanding Dues</p>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {formatCurrency(summary?.total_outstanding || 0)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            {summary?.due_count || 0} Pending • {summary?.overdue_count || 0} Overdue
          </p>
        </div>

        {/* Collection Rate */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Collection Rate</p>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-2">
            {summary?.collection_rate_percent || 0}%
          </h3>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-purple-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, summary?.collection_rate_percent || 0))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 w-full sm:w-auto overflow-x-auto no-scrollbar">
          {(['ALL', 'DUE', 'PARTIAL', 'OVERDUE', 'PAID'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {st === 'ALL' ? 'All' : st === 'DUE' ? 'Due' : st === 'PARTIAL' ? 'Partial' : st === 'OVERDUE' ? 'Overdue' : 'Paid'}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="w-48">
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

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search member, phone, code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Due Contributions Table */}
      <Card bodyClassName="p-0">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-16 p-8">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Due Records Found</h3>
            <p className="text-xs text-slate-500 mt-1">
              No members matching "{statusFilter}" for {formattedMonthTitle}.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[760px] divide-y divide-slate-100 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 text-[11px] uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 sm:px-3.5">Member</th>
                  <th className="py-2.5 px-3 sm:px-3.5">Fund Group</th>
                  <th className="py-2.5 px-3 sm:px-3.5 text-right">Expected Due</th>
                  <th className="py-2.5 px-3 sm:px-3.5 text-right">Paid Amount</th>
                  <th className="py-2.5 px-3 sm:px-3.5 text-right">Remaining Due</th>
                  <th className="py-2.5 px-3 sm:px-3.5">Due Date</th>
                  <th className="py-2.5 px-3 sm:px-3.5 text-center">Status</th>
                  <th className="py-2.5 px-3 sm:px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredList.map((item) => (
                  <tr
                    key={item.id || item.member_id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-3 sm:px-3.5">
                      <Link
                        to={`/app/members/${item.member_id}`}
                        className="font-bold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors block text-xs truncate max-w-[160px]"
                        title="View Member Profile"
                      >
                        {item.member_name}
                      </Link>
                      <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
                        {item.member_code && <span className="font-mono">{item.member_code}</span>}
                        {item.phone && <span>• {item.phone}</span>}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 sm:px-3.5">
                      <div className="flex items-center space-x-1 text-slate-600 dark:text-slate-400 text-xs">
                        <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="truncate max-w-[130px]">{item.group_name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 sm:px-3.5 text-right font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      {formatCurrency(item.expected_amount)}
                    </td>
                    <td className="py-2.5 px-3 sm:px-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                      {formatCurrency(item.paid_amount)}
                    </td>
                    <td className="py-2.5 px-3 sm:px-3.5 text-right font-black text-xs">
                      {Number(item.remaining_due) > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400">{formatCurrency(item.remaining_due)}</span>
                      ) : (
                        <span className="text-slate-400">৳0.00</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 sm:px-3.5 text-xs text-slate-600 dark:text-slate-300">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white text-xs">{item.due_date}</p>
                        {item.last_payment_date && (
                          <p className="text-[10px] text-slate-400">Last paid: {item.last_payment_date}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 sm:px-3.5 text-center">
                      {getStatusBadge(item.status)}
                      {item.status === 'OVERDUE' && item.days_overdue > 0 && (
                        <span className="block text-[9px] text-rose-500 font-bold mt-0.5">
                          {item.days_overdue}d late
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 sm:px-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-7 w-7"
                          onClick={() => navigate(`/app/members/${item.member_id}/ledger`)}
                          title="View Member Financial Ledger"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        </Button>
                        {item.status !== 'PAID' ? (
                          <Button
                            variant="primary"
                            size="sm"
                            className="py-1 px-2.5 text-xs"
                            onClick={() =>
                              navigate(
                                `/app/contributions/add?member_id=${item.member_id}&month=${selectedMonth}&amount=${item.remaining_due}`
                              )
                            }
                            leftIcon={<PiggyBank className="w-3.5 h-3.5" />}
                          >
                            Pay
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="py-1 px-2.5 text-xs text-emerald-600 dark:text-emerald-400"
                            onClick={() =>
                              navigate(`/app/contributions/add?member_id=${item.member_id}&month=${selectedMonth}`)
                            }
                          >
                            Extra
                          </Button>
                        )}
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
