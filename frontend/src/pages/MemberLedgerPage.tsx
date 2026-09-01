import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams, useNavigate, Link } from 'react-router-dom';
import { membersApi } from '../api/client';
import { Member, MemberLedgerOut } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../context/ToastContext';
import {
  FileSpreadsheet,
  Users2,
  Building2,
  Calendar,
  CreditCard,
  FileCheck,
  TrendingUp,
  Receipt,
  PiggyBank,
  ArrowLeft,
  User as UserIcon,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const MemberLedgerPage: React.FC = () => {
  const { memberId: routeMemberId } = useParams<{ memberId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [ledger, setLedger] = useState<MemberLedgerOut | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const { error } = useToast();

  // 1. Load members list for the selector
  useEffect(() => {
    const loadMembersList = async () => {
      try {
        setLoadingMembers(true);
        const res = await membersApi.list({ limit: 300 });
        setMembers(res.data);

        // Check if memberId is in route params or query params
        const targetId = routeMemberId || searchParams.get('member_id');
        if (targetId) {
          const match = res.data.find((m) => m.id === targetId || m.member_code?.toLowerCase() === targetId.toLowerCase());
          if (match) {
            setSelectedMemberId(match.id);
          } else {
            setSelectedMemberId(targetId);
          }
        } else if (res.data.length > 0) {
          setSelectedMemberId(res.data[0].id);
        }
      } catch (err) {
        error('Failed to load member list for ledger selection.');
      } finally {
        setLoadingMembers(false);
      }
    };
    loadMembersList();
  }, [routeMemberId]);

  // 2. Load member ledger whenever selectedMemberId changes
  useEffect(() => {
    if (!selectedMemberId) {
      setLedger(null);
      return;
    }

    const loadLedgerData = async () => {
      try {
        setLoadingLedger(true);
        const res = await membersApi.getLedger(selectedMemberId);
        setLedger(res.data);
      } catch (err) {
        error('Failed to load member financial ledger from backend.');
        setLedger(null);
      } finally {
        setLoadingLedger(false);
      }
    };

    loadLedgerData();
  }, [selectedMemberId]);

  const formatCurrency = (val: string | number | undefined) => {
    const num = Number(val || 0);
    return '৳' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

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

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <FileSpreadsheet className="w-7 h-7 text-emerald-500" />
            <span>Member Financial Ledger</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Complete transaction history and monthly dues schedule with progressive running balances.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {selectedMemberId && (
            <Button
              variant="outline"
              onClick={() => navigate(`/app/members/${selectedMemberId}`)}
              leftIcon={<UserIcon className="w-4 h-4 text-emerald-500" />}
            >
              View Member Profile
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => navigate('/app/members/manage')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Member List
          </Button>
        </div>
      </div>

      {/* Member Selector Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <Users2 className="w-5 h-5" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Select Member Account:
            </label>
            <span className="text-xs text-slate-400">View individual financial contributions & dues ledger</span>
          </div>
        </div>

        <div className="w-full sm:w-80">
          <Select
            value={selectedMemberId}
            onChange={(e) => {
              setSelectedMemberId(e.target.value);
              setSearchParams({ member_id: e.target.value });
            }}
            disabled={loadingMembers}
          >
            {loadingMembers ? (
              <option value="">Loading members list...</option>
            ) : members.length === 0 ? (
              <option value="">No members registered yet</option>
            ) : (
              members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.group_name}) {m.member_code ? `— ${m.member_code}` : ''}
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
          <PiggyBank className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Select a Member to View Ledger</h3>
          <p className="text-xs text-slate-500 mt-1">Please select an active member from the selector above.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Member Ledger Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monthly Pledge</p>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <PiggyBank className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                {formatCurrency(ledger.monthly_contribution_amount || ledger.effective_monthly_contribution || 500)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">
                Recurring monthly due schedule
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lifetime Contributed</p>
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                {formatCurrency(ledger.total_contributions)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">
                {ledger.contributions_count} receipts recorded
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Group</p>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-2 truncate">
                {ledger.group_name}
              </h3>
              <div className="mt-1">
                <Badge variant={ledger.is_active ? 'success' : 'neutral'} size="sm">
                  {ledger.is_active ? 'Active Contributor' : 'Inactive'}
                </Badge>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Activity Period</p>
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold mt-2">
                First: <span className="font-bold text-slate-900 dark:text-white">{ledger.first_contribution_date || 'None'}</span>
              </p>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold mt-1">
                Latest: <span className="font-bold text-slate-900 dark:text-white">{ledger.last_contribution_date || 'None'}</span>
              </p>
            </div>
          </div>

          {/* 1. Monthly Contribution Dues Schedule */}
          {ledger.monthly_dues && ledger.monthly_dues.length > 0 && (
            <Card
              title={`Monthly Dues Schedule — ${ledger.member_name}`}
              subtitle="Month-by-month expected dues and payment fulfillment record."
              bodyClassName="p-0"
            >
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[700px] divide-y divide-slate-100 dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 text-[11px] uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 sm:px-3.5">Month</th>
                      <th className="py-2.5 px-3 sm:px-3.5">Due Date</th>
                      <th className="py-2.5 px-3 sm:px-3.5 text-right">Expected Due</th>
                      <th className="py-2.5 px-3 sm:px-3.5 text-right">Paid Amount</th>
                      <th className="py-2.5 px-3 sm:px-3.5 text-right">Remaining Due</th>
                      <th className="py-2.5 px-3 sm:px-3.5 text-center">Status</th>
                      <th className="py-2.5 px-3 sm:px-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {ledger.monthly_dues.map((due) => (
                      <tr
                        key={due.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2.5 px-3 sm:px-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {due.contribution_month}
                        </td>
                        <td className="py-2.5 px-3 sm:px-3.5 text-slate-600 dark:text-slate-300">
                          {due.due_date}
                        </td>
                        <td className="py-2.5 px-3 sm:px-3.5 text-right font-medium text-slate-700 dark:text-slate-300">
                          {formatCurrency(due.expected_amount)}
                        </td>
                        <td className="py-2.5 px-3 sm:px-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(due.paid_amount)}
                        </td>
                        <td className="py-2.5 px-3 sm:px-3.5 text-right font-bold">
                          {Number(due.remaining_due) > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400">{formatCurrency(due.remaining_due)}</span>
                          ) : (
                            <span className="text-slate-400">৳0.00</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 sm:px-3.5 text-center">
                          {getStatusBadge(due.status)}
                          {due.status === 'OVERDUE' && due.days_overdue > 0 && (
                            <span className="block text-[9px] text-rose-500 font-bold mt-0.5">
                              {due.days_overdue}d late
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 sm:px-3.5 text-right">
                          {due.status !== 'PAID' ? (
                            <Button
                              variant="primary"
                              size="sm"
                              className="py-1 px-2.5 text-xs"
                              onClick={() =>
                                navigate(
                                  `/app/contributions/add?member_id=${ledger.member_id}&month=${due.contribution_month.substring(
                                    0,
                                    7
                                  )}&amount=${due.remaining_due}`
                                )
                              }
                              leftIcon={<PiggyBank className="w-3.5 h-3.5" />}
                            >
                              Pay
                            </Button>
                          ) : (
                            <span className="text-xs text-emerald-600 font-semibold">Cleared</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* 2. Chronological Financial Transactions Ledger Table */}
          <Card
            title={`Financial Transactions Ledger — ${ledger.member_name}`}
            subtitle={`${ledger.entries.length} recorded entries • Chronological running contribution balance computed by backend`}
            bodyClassName="p-0"
          >
            {ledger.entries.length === 0 ? (
              <div className="text-center py-16 p-8">
                <Receipt className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">No Contributions Recorded</h3>
                <p className="text-xs text-slate-500 mt-1">
                  This member has not yet contributed funds to their assigned group.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-4"
                  onClick={() => navigate(`/app/contributions/add?member_id=${ledger.member_id}`)}
                  leftIcon={<PiggyBank className="w-3.5 h-3.5" />}
                >
                  Record Contribution
                </Button>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[700px] divide-y divide-slate-100 dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 text-[11px] uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 sm:px-3.5">Date</th>
                      <th className="py-2.5 px-3 sm:px-3.5">Receipt #</th>
                      <th className="py-2.5 px-3 sm:px-3.5">Month Fulfilled</th>
                      <th className="py-2.5 px-3 sm:px-3.5">Fund Group</th>
                      <th className="py-2.5 px-3 sm:px-3.5">Payment Method & Ref</th>
                      <th className="py-2.5 px-3 sm:px-3.5 text-right">Credit Amount</th>
                      <th className="py-2.5 px-3 sm:px-3.5 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {ledger.entries.map((entry) => (
                      <tr
                        key={entry.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2.5 px-3 sm:px-3.5 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                          {entry.date}
                        </td>
                        <td className="py-2.5 px-3 sm:px-3.5 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center space-x-1 font-mono text-xs">
                            <FileCheck className="w-3 h-3 text-emerald-500" />
                            <span>{entry.receipt_number || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 sm:px-3.5 text-slate-700 dark:text-slate-300 font-semibold">
                          {entry.months_count && entry.months_count > 1 ? (
                            <div>
                              <span className="text-xs">{entry.months_summary || `${entry.months_count} months`}</span>
                              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                {entry.months_count}mo
                              </span>
                            </div>
                          ) : (
                            entry.contribution_month ? String(entry.contribution_month).substring(0, 7) : '—'
                          )}
                        </td>
                        <td className="py-2.5 px-3 sm:px-3.5">
                          <div className="flex items-center space-x-1 text-slate-600 dark:text-slate-300 text-xs">
                            <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span>{entry.group_name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 sm:px-3.5 text-xs">
                          <p className="font-medium text-slate-800 dark:text-slate-200">{entry.payment_method || 'CASH'}</p>
                          {entry.reference_number && (
                            <p className="text-slate-400 font-mono text-[10px]">{entry.reference_number}</p>
                          )}
                        </td>
                        <td className="py-2.5 px-3 sm:px-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                          +{formatCurrency(entry.amount)}
                        </td>
                        <td className="py-2.5 px-3 sm:px-3.5 text-right font-bold text-slate-900 dark:text-white text-xs bg-slate-50/50 dark:bg-slate-850/30">
                          {formatCurrency(entry.running_total)}
                        </td>
                      </tr>
                    ))}
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
