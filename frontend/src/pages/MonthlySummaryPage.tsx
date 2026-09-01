import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { contributionsApi, groupsApi } from '../api/client';
import { YearlyMonthlySummaryResponse, Group, MemberMonthlySummaryRow, MonthStatusOut } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { useToast } from '../context/ToastContext';
import {
  Calendar,
  Building2,
  Users2,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  CircleDot,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  PiggyBank,
  UserPlus,
  Info
} from 'lucide-react';

export const MonthlySummaryPage: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedYear, setSelectedYear] = useState<number>(
    Number(searchParams.get('year')) || currentYear
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    searchParams.get('group_id') || ''
  );
  const [searchQuery, setSearchQuery] = useState<string>(
    searchParams.get('search') || ''
  );
  const [pageSize, setPageSize] = useState<number>(
    Number(searchParams.get('page_size')) || 10
  );
  const [currentPage, setCurrentPage] = useState<number>(
    Number(searchParams.get('page')) || 1
  );

  const [data, setData] = useState<YearlyMonthlySummaryResponse | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { error } = useToast();

  // Load Groups for filter
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await groupsApi.list();
        setGroups(res.data);
      } catch (err) {
        console.error('Failed to load groups list', err);
      }
    };
    fetchGroups();
  }, []);

  // Load Monthly Summary Data
  const loadSummary = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await contributionsApi.getMonthlySummary({
        year: selectedYear,
        group_id: selectedGroupId || undefined,
        search: searchQuery || undefined,
        page: currentPage,
        page_size: pageSize,
      });

      setData(res.data);
    } catch (err: any) {
      console.error('Error fetching monthly summary:', err);
      error(err.response?.data?.detail || 'Failed to load monthly contribution summary.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [selectedYear, selectedGroupId, pageSize, currentPage]);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadSummary();
  };

  const handleYearChange = (yearVal: string) => {
    const newYear = Number(yearVal);
    if (newYear && newYear !== selectedYear) {
      setSelectedYear(newYear);
      setCurrentPage(1);
    }
  };

  const handlePageSizeChange = (sizeVal: string) => {
    const newSize = Number(sizeVal);
    if (newSize && newSize !== pageSize) {
      setPageSize(newSize);
      setCurrentPage(1);
    }
  };

  const handleGroupChange = (groupVal: string) => {
    setSelectedGroupId(groupVal);
    setCurrentPage(1);
  };

  // Build options for Year Select
  const yearOptions = useMemo(() => {
    const yearsList = data?.available_years && data.available_years.length > 0
      ? [...data.available_years]
      : [currentYear + 1, currentYear, currentYear - 1, currentYear - 2];
    
    // Ensure selectedYear is in list
    if (!yearsList.includes(selectedYear)) {
      yearsList.push(selectedYear);
      yearsList.sort((a, b) => b - a);
    }

    return yearsList.map((y) => ({
      value: String(y),
      label: String(y),
    }));
  }, [data?.available_years, currentYear, selectedYear]);

  // Build options for Page Size
  const pageSizeOptions = [
    { value: '10', label: '10' },
    { value: '25', label: '25' },
    { value: '50', label: '50' },
    { value: '100', label: '100' },
  ];

  // Build options for Group
  const groupOptions = useMemo(() => {
    return [
      { value: '', label: 'All Fund Groups' },
      ...groups.map((g) => ({
        value: g.id,
        label: g.name,
      })),
    ];
  }, [groups]);

  // Render Month Status Cell with EXACT 4 Statuses
  const renderMonthStatusBadge = (month: MonthStatusOut) => {
    const status = month.status;
    const isPaid = status === 'PAID';
    const isCurrentPending = status === 'CURRENT_PENDING';
    const isDue = status === 'DUE' || status === 'OVERDUE';
    const isFuture = status === 'FUTURE_MONTH' || status === 'FUTURE';

    const receiptsText = month.receipt_numbers?.length > 0 ? ` (${month.receipt_numbers.join(', ')})` : '';
    const remainingAmount = Number(month.expected_amount) - Number(month.paid_amount);

    if (isPaid) {
      const tooltip = `${month.month_name}: ৳${Number(month.paid_amount).toLocaleString()} Paid${receiptsText}`;
      return (
        <div
          title={tooltip}
          aria-label={`${month.month_name} — Paid`}
          className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-200 dark:border-emerald-800/80 shadow-xs cursor-help transition-transform hover:scale-110"
        >
          <CheckCircle2 className="w-4 h-4 fill-emerald-100 dark:fill-emerald-950 stroke-[2.5]" />
        </div>
      );
    }

    if (isCurrentPending) {
      const tooltip = `${month.month_name}: Current Pending (Due ৳${remainingAmount.toLocaleString()})`;
      return (
        <div
          title={tooltip}
          aria-label={`${month.month_name} — Current Pending`}
          className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-xs border border-blue-200 dark:border-blue-800/80 shadow-xs cursor-help transition-transform hover:scale-110"
        >
          <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
      );
    }

    if (isDue) {
      const tooltip = `${month.month_name}: Due ৳${remainingAmount.toLocaleString()}`;
      return (
        <div
          title={tooltip}
          aria-label={`${month.month_name} — Due`}
          className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 font-bold text-xs border border-amber-200 dark:border-amber-800/80 shadow-xs cursor-help transition-transform hover:scale-110"
        >
          <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
      );
    }

    // Future Month
    const tooltip = `${month.month_name}: Future Month (Due ৳${Number(month.expected_amount).toLocaleString()})`;
    return (
      <div
        title={tooltip}
        aria-label={`${month.month_name} — Future Month`}
        className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-slate-300 dark:text-slate-600 font-medium text-xs border border-slate-200/60 dark:border-slate-800/60 cursor-help"
      >
        <CircleDot className="w-3.5 h-3.5 opacity-60" />
      </div>
    );
  };

  const totalMembers = data?.total_members || 0;
  const totalPages = data?.total_pages || 1;
  const startMemberIndex = totalMembers === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endMemberIndex = Math.min(currentPage * pageSize, totalMembers);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 w-full overflow-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <Calendar className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Monthly Contributions</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Contributions for {selectedYear} • Member-wise fulfillment matrix
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => loadSummary(true)}
            disabled={refreshing || loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
          </button>

          <Link
            to="/app/contributions/add"
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-1.5"
          >
            <PiggyBank className="w-4 h-4" />
            <span>Add Contribution</span>
          </Link>
        </div>
      </div>

      {/* Filter and Configuration Toolbar */}
      <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
          {/* 1. Custom Year Selector */}
          <div className="lg:col-span-3">
            <Select
              label="Year"
              value={String(selectedYear)}
              options={yearOptions}
              onChange={(e) => handleYearChange(e.target.value)}
            />
          </div>

          {/* 2. Group Selector */}
          <div className="lg:col-span-4">
            <Select
              label="Fund Group"
              value={selectedGroupId}
              options={groupOptions}
              onChange={(e) => handleGroupChange(e.target.value)}
            />
          </div>

          {/* 3. Search Member */}
          <div className="lg:col-span-3">
            <form onSubmit={handleSearchSubmit} className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Search Member
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Name, ID or Phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </form>
          </div>

          {/* 4. Members Per Page Selector */}
          <div className="lg:col-span-2">
            <Select
              label="Members per page"
              value={String(pageSize)}
              options={pageSizeOptions}
              onChange={(e) => handlePageSizeChange(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Main Monthly Matrix Table Card */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
              Loading {selectedYear} monthly contributions...
            </p>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="py-16 text-center space-y-4 px-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <Users2 className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No Members Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {searchQuery || selectedGroupId
                  ? 'No members match the selected filters. Try clearing your search or changing the fund group.'
                  : `No active members found in the foundation. Add members to start tracking contributions for ${selectedYear}.`}
              </p>
            </div>
            <div className="pt-2 flex justify-center space-x-3">
              {(searchQuery || selectedGroupId) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedGroupId('');
                    setCurrentPage(1);
                  }}
                >
                  Clear Filters
                </Button>
              )}
              <Link to="/app/members/add">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                  Add Member
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col w-full">
            {/* Table Container with Smooth Horizontal Touch Scroll */}
            <div className="w-full overflow-x-auto overflow-y-hidden">
              <table className="w-full text-left border-collapse min-w-[720px] sm:min-w-[860px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    {/* Sticky Member Column */}
                    <th className="py-3 px-3 sm:px-4 sticky left-0 z-20 bg-slate-50 dark:bg-slate-850 shadow-[1px_0_0_0_rgba(0,0,0,0.08)] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.08)] min-w-[150px] sm:min-w-[180px] w-[150px] sm:w-[180px]">
                      Member
                    </th>
                    {/* Group Column */}
                    <th className="py-3 px-2 sm:px-3 min-w-[110px] sm:min-w-[130px] w-[110px] sm:w-[130px]">
                      Group
                    </th>
                    {/* 12 Month Columns */}
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => (
                      <th
                        key={m}
                        className="py-3 px-1 text-center font-bold min-w-[38px] sm:min-w-[44px] w-[38px] sm:w-[44px]"
                      >
                        {m}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {data.items.map((row: MemberMonthlySummaryRow) => (
                    <tr
                      key={row.member_id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Sticky Member Identity Column */}
                      <td className="py-2.5 px-3 sm:px-4 sticky left-0 z-10 bg-white group-hover:bg-slate-50/90 dark:bg-slate-900 dark:group-hover:bg-slate-850 shadow-[1px_0_0_0_rgba(0,0,0,0.08)] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.08)] transition-colors min-w-[150px] sm:min-w-[180px] w-[150px] sm:w-[180px]">
                        <Link
                          to={`/app/members/${row.member_id}`}
                          className="block hover:underline"
                        >
                          <div className="font-bold text-slate-900 dark:text-white truncate max-w-[135px] sm:max-w-[165px]">
                            {row.name}
                          </div>
                          <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 truncate max-w-[135px] sm:max-w-[165px]">
                            {row.member_code || 'ID: ' + row.member_id.substring(0, 8)}
                          </div>
                        </Link>
                      </td>

                      {/* Group Column */}
                      <td className="py-2.5 px-2 sm:px-3 text-slate-700 dark:text-slate-300 font-medium truncate min-w-[110px] sm:min-w-[130px] max-w-[110px] sm:max-w-[130px]">
                        <span className="inline-flex items-center space-x-1 truncate max-w-full">
                          <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{row.group_name}</span>
                        </span>
                      </td>

                      {/* 12 Month Cells */}
                      {row.months.map((m) => (
                        <td
                          key={m.month_index}
                          className="py-2 px-0.5 text-center align-middle min-w-[38px] sm:min-w-[44px] w-[38px] sm:w-[44px]"
                        >
                          {renderMonthStatusBadge(m)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Footer: Pagination */}
            <div className="p-4 sm:px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Pagination Info */}
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium text-center sm:text-left">
                Showing <span className="font-bold text-slate-700 dark:text-slate-200">{startMemberIndex}–{endMemberIndex}</span> of{' '}
                <span className="font-bold text-slate-700 dark:text-slate-200">{totalMembers}</span> members
              </div>

              {/* Pagination Buttons */}
              <div className="flex items-center space-x-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1.5 text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Previous
                </Button>

                {/* Page Number Pills */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => {
                    const prevP = arr[idx - 1];
                    const showEllipsis = prevP && p - prevP > 1;

                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && (
                          <span className="px-1 text-slate-400 text-xs">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(p)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                            currentPage === p
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1.5 text-xs"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Legend Block — 4 Distinct Statuses */}
      <Card className="p-4 sm:p-5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
            <Info className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>Status Legend</span>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3.5 sm:gap-6">
            {/* 1. PAID */}
            <div className="flex items-center space-x-2">
              <div className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 shadow-xs flex-shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-100 dark:fill-emerald-950 stroke-[2.5]" />
              </div>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                ✓ PAID
              </span>
            </div>

            {/* 2. CURRENT PENDING */}
            <div className="flex items-center space-x-2">
              <div className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/80 shadow-xs flex-shrink-0">
                <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                ◷ CURRENT PENDING
              </span>
            </div>

            {/* 3. DUE */}
            <div className="flex items-center space-x-2">
              <div className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/80 shadow-xs flex-shrink-0">
                <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                ! DUE
              </span>
            </div>

            {/* 4. FUTURE MONTH */}
            <div className="flex items-center space-x-2">
              <div className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-slate-300 dark:text-slate-600 border border-slate-200/60 dark:border-slate-800/60 flex-shrink-0">
                <CircleDot className="w-3 h-3 opacity-60" />
              </div>
              <span className="font-bold text-slate-500 dark:text-slate-400">
                ○ FUTURE MONTH
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
