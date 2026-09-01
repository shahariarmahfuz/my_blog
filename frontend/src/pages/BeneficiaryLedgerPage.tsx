import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { beneficiariesApi } from '../api/client';
import { Beneficiary, BeneficiaryLedgerOut } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../context/ToastContext';
import {
  FileSpreadsheet,
  HeartHandshake,
  Building2,
  Calendar,
  HandCoins,
  Receipt,
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  Clock
} from 'lucide-react';

export const BeneficiaryLedgerPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [selectedBenId, setSelectedBenId] = useState<string>('');
  const [ledger, setLedger] = useState<BeneficiaryLedgerOut | null>(null);
  const [loadingBens, setLoadingBens] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const { error } = useToast();

  // 1. Load beneficiaries list for selector
  useEffect(() => {
    const loadBeneficiariesList = async () => {
      try {
        setLoadingBens(true);
        const res = await beneficiariesApi.list({ limit: 200 });
        setBeneficiaries(res.data);

        // Check if beneficiary_id is in query params
        const paramId = searchParams.get('beneficiary_id');
        if (paramId && res.data.some((b) => b.id === paramId)) {
          setSelectedBenId(paramId);
        } else if (res.data.length > 0) {
          setSelectedBenId(res.data[0].id);
        }
      } catch (err) {
        error('Failed to load beneficiary list for ledger selection.');
      } finally {
        setLoadingBens(false);
      }
    };
    loadBeneficiariesList();
  }, []);

  // 2. Load beneficiary ledger whenever selectedBenId changes
  useEffect(() => {
    if (!selectedBenId) {
      setLedger(null);
      return;
    }

    const loadLedgerData = async () => {
      try {
        setLoadingLedger(true);
        setSearchParams({ beneficiary_id: selectedBenId });
        const res = await beneficiariesApi.getLedger(selectedBenId);
        setLedger(res.data);
      } catch (err) {
        error('Failed to load beneficiary financial ledger from backend.');
        setLedger(null);
      } finally {
        setLoadingLedger(false);
      }
    };

    loadLedgerData();
  }, [selectedBenId]);

  const formatCurrency = (val: string | number | undefined) => {
    const num = Number(val || 0);
    return '৳' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'QARD_HASAN_DISBURSEMENT':
        return <Badge variant="info" size="sm">Qard Hasan (Loan)</Badge>;
      case 'QARD_HASAN_REPAYMENT':
        return <Badge variant="success" size="sm">Loan Repayment</Badge>;
      case 'SADAQAH_DISBURSEMENT':
        return <Badge variant="amber" size="sm">Sadaqah (Grant)</Badge>;
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
            <span>Beneficiary Financial Ledger</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Complete assistance disbursements, loan repayments, and running outstanding loan balances.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => navigate('/app/beneficiaries/manage')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Beneficiary List
        </Button>
      </div>

      {/* Beneficiary Selector Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Select Beneficiary Account:
            </label>
            <span className="text-xs text-slate-400">View individual aid, loan disbursements, and repayments</span>
          </div>
        </div>

        <div className="w-full sm:w-80">
          <Select
            value={selectedBenId}
            onChange={(e) => setSelectedBenId(e.target.value)}
            disabled={loadingBens}
            placeholder={loadingBens ? "Loading beneficiaries..." : "Select a beneficiary..."}
          >
            {loadingBens ? (
              <option value="">Loading beneficiaries...</option>
            ) : beneficiaries.length === 0 ? (
              <option value="">No beneficiaries registered yet</option>
            ) : (
              beneficiaries.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.group_name}) {b.beneficiary_code ? `— ${b.beneficiary_code}` : ''}
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
          <HandCoins className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Select a Beneficiary to View Ledger</h3>
          <p className="text-xs text-slate-500 mt-1">Please select an active beneficiary from the dropdown above.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Beneficiary Ledger Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Qard Hasan Loan</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">
                {formatCurrency(ledger.total_qard_hasan_received)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Total principal disbursed</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Repaid</p>
              <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                {formatCurrency(ledger.total_qard_hasan_repaid)}
              </h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">Returned to funding groups</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Outstanding Loan</p>
              <h3 className="text-xl font-black text-rose-600 dark:text-rose-400 mt-2">
                {formatCurrency(ledger.outstanding_qard_hasan)}
              </h3>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">Remaining receivable</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sadaqah Grant</p>
              <h3 className="text-xl font-black text-amber-600 dark:text-amber-400 mt-2">
                {formatCurrency(ledger.total_sadaqah_received)}
              </h3>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">Non-recoverable aid</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Assistance</p>
              <h3 className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-2">
                {formatCurrency(ledger.total_assistance_received)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Combined aid volume</p>
            </div>
          </div>

          {/* Chronological Ledger Table */}
          <Card
            title={`Financial Assistance & Repayments Ledger — ${ledger.beneficiary_name}`}
            subtitle={`${ledger.entries.length} recorded events • Running loan balance progressive calculations derived strictly by backend`}
            bodyClassName="p-0"
          >
            {ledger.entries.length === 0 ? (
              <div className="text-center py-16 p-8">
                <Receipt className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">No Financial History Recorded</h3>
                <p className="text-xs text-slate-500 mt-1">
                  This beneficiary has not yet received assistance or made repayments.
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
                      <th className="px-6 py-4">Code</th>
                      <th className="px-6 py-4">Transaction Type</th>
                      <th className="px-6 py-4">Funding / Receiving Groups</th>
                      <th className="px-6 py-4">Purpose / Remarks</th>
                      <th className="px-6 py-4 text-right">Disbursed</th>
                      <th className="px-6 py-4 text-right">Repaid</th>
                      <th className="px-6 py-4 text-right">Outstanding Loan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {ledger.entries.map((entry) => (
                      <tr
                        key={entry.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {entry.date}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white text-xs">
                          {entry.code}
                        </td>
                        <td className="px-6 py-4">
                          {getTransactionBadge(entry.transaction_type)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {entry.funding_groups && entry.funding_groups.length > 0 ? (
                              entry.funding_groups.map((grpName, idx) => (
                                <div key={idx} className="flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-300">
                                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{grpName}</span>
                                </div>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400 italic">No group</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate">
                          {entry.description || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white text-sm">
                          {Number(entry.disbursed_amount) > 0 ? (
                            <span className="text-rose-600 dark:text-rose-400">
                              -{formatCurrency(entry.disbursed_amount)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          {Number(entry.repaid_amount) > 0 ? (
                            <span>+{formatCurrency(entry.repaid_amount)}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white text-base bg-slate-50/50 dark:bg-slate-850/30">
                          {formatCurrency(entry.running_outstanding_loan)}
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
