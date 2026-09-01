import React, { useState, useEffect } from 'react';
import { reportsApi, groupsApi } from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  FileBarChart2,
  Download,
  Building2,
  Users2,
  HeartHandshake,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Filter
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'financial' | 'groups' | 'members' | 'beneficiaries'>('financial');
  const [financialData, setFinancialData] = useState<any>(null);
  const [groupData, setGroupData] = useState<any[]>([]);
  const [memberData, setMemberData] = useState<any[]>([]);
  const [beneficiaryData, setBeneficiaryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const { error } = useToast();
  const { hasPermission } = useAuth();

  const loadReport = async () => {
    try {
      setLoading(true);
      if (activeTab === 'financial') {
        const res = await reportsApi.getFinancial({ from_date: fromDate || undefined, to_date: toDate || undefined });
        setFinancialData(res.data);
      } else if (activeTab === 'groups') {
        const res = await reportsApi.getGroups();
        setGroupData(res.data);
      } else if (activeTab === 'members') {
        const res = await reportsApi.getMembers();
        setMemberData(res.data);
      } else if (activeTab === 'beneficiaries') {
        const res = await reportsApi.getBeneficiaries();
        setBeneficiaryData(res.data);
      }
    } catch (err) {
      error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [activeTab, fromDate, toDate]);

  const handleExport = () => {
    const url = reportsApi.exportCsvUrl(activeTab);
    const token = localStorage.getItem('foundation_token');
    
    // Create an authenticated download link
    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.blob())
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `foundation_${activeTab}_report.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(() => error('Failed to export CSV.'));
  };

  const formatCurrency = (val: string | number | undefined) => {
    const num = Number(val || 0);
    return '৳' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Financial & Operational Reports
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Exportable audits of fund positions, member donations, and assistance recoveries.
          </p>
        </div>

        {hasPermission('reports.export') && (
          <Button
            variant="outline"
            onClick={handleExport}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export to CSV
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { id: 'financial', label: 'Financial Overview', icon: <DollarSign className="w-4 h-4" /> },
          { id: 'groups', label: 'Group-wise Balances', icon: <Building2 className="w-4 h-4" /> },
          { id: 'members', label: 'Member Contributions', icon: <Users2 className="w-4 h-4" /> },
          { id: 'beneficiaries', label: 'Beneficiary Recoveries', icon: <HeartHandshake className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Date Filters (Financial Tab) */}
      {activeTab === 'financial' && (
        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Period:</span>
          <div className="w-40">
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              placeholder="From Date"
            />
          </div>
          <div className="w-40">
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              placeholder="To Date"
            />
          </div>
          {(fromDate || toDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFromDate(''); setToDate(''); }}
            >
              Reset
            </Button>
          )}
        </div>
      )}

      {/* Content Rendering */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : activeTab === 'financial' && financialData ? (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-400 uppercase">Contributions Received</p>
              <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                +{formatCurrency(financialData.total_contributions)}
              </h3>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-400 uppercase">Qard Hasan Repaid</p>
              <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                +{formatCurrency(financialData.total_qard_hasan_repaid)}
              </h3>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-400 uppercase">Loans Disbursed</p>
              <h3 className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                -{formatCurrency(financialData.total_qard_hasan_disbursed)}
              </h3>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-400 uppercase">Sadaqah Given</p>
              <h3 className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                -{formatCurrency(financialData.total_sadaqah_disbursed)}
              </h3>
            </div>
          </div>

          {/* Breakdown Table */}
          <Card title="Financial Flow Breakdown" bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Flow Category</th>
                    <th className="px-6 py-4">Ledger Item</th>
                    <th className="px-6 py-4 text-right">Total Net Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {financialData.breakdown.map((row: any, idx: number) => (
                    <tr key={idx}>
                      <td className="px-6 py-4">
                        <Badge variant={row.category === 'Inflow' ? 'success' : 'danger'} size="sm">
                          {row.category}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                        {row.item_name}
                      </td>
                      <td className="px-6 py-4 text-right font-extrabold text-slate-900 dark:text-white text-base">
                        {formatCurrency(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : activeTab === 'groups' ? (
        <Card title="Fund Group Balances & Operations" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Group Name</th>
                  <th className="px-6 py-4 text-center">Members / Bens</th>
                  <th className="px-6 py-4 text-right">Contributions</th>
                  <th className="px-6 py-4 text-right">QH Disbursed</th>
                  <th className="px-6 py-4 text-right">QH Recovered</th>
                  <th className="px-6 py-4 text-right">Sadaqah Given</th>
                  <th className="px-6 py-4 text-right">Current Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {groupData.map((g: any) => (
                  <tr key={g.group_id}>
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                      {g.group_name}
                      {g.group_code && <p className="text-xs text-slate-400 font-normal">{g.group_code}</p>}
                    </td>
                    <td className="px-6 py-4 text-center text-xs">
                      <span className="font-bold">{g.members_count}</span> members / <span className="font-bold">{g.beneficiaries_count}</span> bens
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(g.contributions)}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">
                      {formatCurrency(g.qard_hasan_funded)}
                    </td>
                    <td className="px-6 py-4 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                      {formatCurrency(g.qard_hasan_repaid)}
                    </td>
                    <td className="px-6 py-4 text-right text-amber-600 dark:text-amber-400">
                      {formatCurrency(g.sadaqah_funded)}
                    </td>
                    <td className="px-6 py-4 text-right font-extrabold text-emerald-600 dark:text-emerald-400 text-base">
                      {formatCurrency(g.current_balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : activeTab === 'members' ? (
        <Card title="Member Contribution Summary" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Member Name</th>
                  <th className="px-6 py-4">Assigned Group</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4 text-center">Receipts Count</th>
                  <th className="px-6 py-4 text-right">Total Donated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {memberData.map((m: any) => (
                  <tr key={m.member_id}>
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                      {m.name}
                      {m.member_code && <p className="text-xs text-slate-400 font-normal">{m.member_code}</p>}
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                      {m.group_name}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {m.phone || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-800 dark:text-slate-200">
                      {m.contributions_count}
                    </td>
                    <td className="px-6 py-4 text-right font-extrabold text-emerald-600 dark:text-emerald-400 text-base">
                      {formatCurrency(m.total_contributed)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card title="Beneficiary Assistance & Recovery Report" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Beneficiary</th>
                  <th className="px-6 py-4">Group</th>
                  <th className="px-6 py-4 text-right">Qard Hasan Loan</th>
                  <th className="px-6 py-4 text-right">Repaid Principal</th>
                  <th className="px-6 py-4 text-right">Outstanding Balance</th>
                  <th className="px-6 py-4 text-right">Sadaqah Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {beneficiaryData.map((b: any) => (
                  <tr key={b.beneficiary_id}>
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                      {b.name}
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                      {b.group_name}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold">
                      {formatCurrency(b.total_qard_hasan)}
                    </td>
                    <td className="px-6 py-4 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                      {formatCurrency(b.total_repaid)}
                    </td>
                    <td className="px-6 py-4 text-right font-extrabold text-rose-600 dark:text-rose-400">
                      {formatCurrency(b.outstanding_qard_hasan)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-amber-600 dark:text-amber-400">
                      {formatCurrency(b.total_sadaqah)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
