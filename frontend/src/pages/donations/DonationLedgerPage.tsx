import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { donationsApi, groupsApi } from '../../api/client';
import { DonationLedgerEntryOut, Group } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../context/ToastContext';
import {
  FileSpreadsheet,
  Download,
  Plus,
  Receipt,
  HeartHandshake,
  Calendar,
  Building2,
  DollarSign,
  ArrowRight,
  Eye,
  RotateCcw
} from 'lucide-react';

export const DonationLedgerPage: React.FC = () => {
  const [entries, setEntries] = useState<DonationLedgerEntryOut[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const { error } = useToast();
  const navigate = useNavigate();

  const loadLedger = async () => {
    try {
      setLoading(true);
      const [ledRes, grpRes] = await Promise.all([
        donationsApi.getLedger({
          group_id: selectedGroupId || undefined,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
        }),
        groupsApi.list({ is_active: true }).catch(() => ({ data: [] })),
      ]);

      setEntries(ledRes.data.entries || []);
      setTotalAmount(Number(ledRes.data.total_amount || 0));
      setTotalCount(ledRes.data.total_count || 0);
      setGroups(grpRes.data.filter((g) => g.group_type === 'EXTERNAL_FUND'));
    } catch (err) {
      error('Failed to load donation ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, [selectedGroupId, fromDate, toDate]);

  const handleExportCSV = () => {
    if (entries.length === 0) return;
    const headers = ['Date', 'Receipt Number', 'Source', 'Donor Name', 'Donor Phone', 'Fund Group', 'Purpose', 'Amount', 'Payment Method', 'Reference', 'Status'];
    const rows = entries.map((e) => [
      e.donation_date,
      e.receipt_number,
      'External Donation',
      `"${e.donor_name.replace(/"/g, '""')}"`,
      e.donor_phone || '',
      `"${e.group_name.replace(/"/g, '""')}"`,
      `"${(e.purpose || '').replace(/"/g, '""')}"`,
      e.amount,
      e.payment_method,
      e.reference_number || '',
      e.is_voided ? 'VOIDED' : 'RECEIVED',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `External_Donations_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <FileSpreadsheet className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            <span>Fund Income & Donation Ledger</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Complete transaction log of external donations received into External Fund Groups.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={entries.length === 0}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export CSV
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/app/donations/add')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Donation
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 flex-shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Net Active Donations</p>
            <p className="text-lg font-extrabold text-purple-600 dark:text-purple-400 font-mono mt-0.5">
              {formatCurrency(totalAmount)}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Ledger Entries</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white font-mono mt-0.5">
              {totalCount}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">External Funds</p>
            <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
              {groups.length}
            </p>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <Card bodyClassName="p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:w-64">
            <Select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              options={[
                { value: '', label: 'All External Funds' },
                ...groups.map((g) => ({ value: g.id, label: g.name })),
              ]}
            />
          </div>

          <div className="flex items-center space-x-2 text-xs w-full sm:w-auto">
            <span className="text-slate-400">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
            <span className="text-slate-400">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          {(selectedGroupId || fromDate || toDate) && (
            <button
              onClick={() => {
                setSelectedGroupId('');
                setFromDate('');
                setToDate('');
              }}
              className="text-purple-600 dark:text-purple-400 text-xs font-bold hover:underline sm:ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </Card>

      {/* Ledger Table */}
      <Card bodyClassName="p-0">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 p-8">
            <Receipt className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Ledger Entries Found</h3>
            <p className="text-xs text-slate-500 mt-1">External donations recorded will appear in this unified income ledger.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[800px] divide-y divide-slate-100 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 text-[11px] uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 sm:px-3.5">Date & Receipt</th>
                  <th className="py-2.5 px-3 sm:px-3.5">Source & Contributor</th>
                  <th className="py-2.5 px-3 sm:px-3.5">Type</th>
                  <th className="py-2.5 px-3 sm:px-3.5">Fund Destination</th>
                  <th className="py-2.5 px-3 sm:px-3.5">Purpose</th>
                  <th className="py-2.5 px-3 sm:px-3.5 text-right">Amount</th>
                  <th className="py-2.5 px-3 sm:px-3.5 text-center">Status</th>
                  <th className="py-2.5 px-3 sm:px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {entries.map((e) => (
                  <tr
                    key={e.id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      e.is_voided ? 'opacity-60 bg-rose-50/20 dark:bg-rose-950/10' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 sm:px-3.5">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {new Date(e.donation_date).toLocaleDateString('en-US', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                        <p className="font-mono text-[10px] text-purple-600 dark:text-purple-400 mt-0.5 font-bold">
                          {e.receipt_number}
                        </p>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 sm:px-3.5">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate max-w-[170px]">
                          {e.donor_name}
                        </p>
                        {e.donor_phone && (
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{e.donor_phone}</p>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 sm:px-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        External Donation
                      </span>
                    </td>

                    <td className="py-2.5 px-3 sm:px-3.5">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px] block">
                        {e.group_name}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 sm:px-3.5">
                      <span className="text-slate-600 dark:text-slate-400 truncate max-w-[130px] block">
                        {e.purpose || 'General Donation'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 sm:px-3.5 text-right font-extrabold text-slate-900 dark:text-white font-mono text-xs">
                      <span className={e.is_voided ? 'line-through text-rose-500' : 'text-purple-600 dark:text-purple-400'}>
                        {formatCurrency(e.amount)}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 sm:px-3.5 text-center">
                      {e.is_voided ? (
                        <Badge variant="danger" size="sm">
                          Voided
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm">
                          Received
                        </Badge>
                      )}
                    </td>

                    <td className="py-2.5 px-3 sm:px-3.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="p-1 h-7 text-xs"
                        onClick={() => navigate(`/app/donations/${e.id}`)}
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                      >
                        Receipt
                      </Button>
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
