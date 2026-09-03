import React, { useState, useEffect } from 'react';
import { repaymentsApi, assistanceApi, groupsApi } from '../api/client';
import { Repayment, Assistance, Group, PaymentMethod, RepaymentPreview } from '../types';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  Receipt,
  Plus,
  Search,
  Building2,
  Calendar,
  Layers,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  CreditCard,
  HandCoins
} from 'lucide-react';

export const RepaymentsPage: React.FC = () => {
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [activeLoans, setActiveLoans] = useState<Assistance[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Record Repayment Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assistanceId, setAssistanceId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Live Proportional Distribution Preview state
  const [preview, setPreview] = useState<RepaymentPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Repayment Details modal
  const [selectedRepayment, setSelectedRepayment] = useState<Repayment | null>(null);

  const { success, error } = useToast();
  const { hasPermission } = useAuth();

  const loadData = async () => {
    try {
      setLoading(true);
      const [repRes, astRes, grpRes] = await Promise.all([
        repaymentsApi.list({ search }),
        assistanceApi.list({ assistance_type: 'QARD_HASAN', status_filter: 'ACTIVE' }),
        groupsApi.list({ is_active: true }),
      ]);
      setRepayments(repRes.data);
      setActiveLoans(astRes.data);
      setGroups(grpRes.data);
    } catch (err) {
      error('Failed to load repayments data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const selectedLoanObj = activeLoans.find((l) => l.id === assistanceId);

  // Fetch live preview when loan or amount changes
  useEffect(() => {
    const fetchPreview = async () => {
      const parsedAmount = parseFloat(amount);
      if (!assistanceId || !parsedAmount || parsedAmount <= 0) {
        setPreview(null);
        return;
      }
      try {
        setLoadingPreview(true);
        const res = await repaymentsApi.getPreview(assistanceId, parsedAmount);
        setPreview(res.data);
      } catch (err) {
        setPreview(null);
      } finally {
        setLoadingPreview(false);
      }
    };

    const timeout = setTimeout(fetchPreview, 300);
    return () => clearTimeout(timeout);
  }, [assistanceId, amount]);

  const openCreateModal = () => {
    const defaultLoan = activeLoans[0];
    setAssistanceId(defaultLoan ? defaultLoan.id : '');
    setAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('CASH');
    setReferenceNumber('');
    setNotes('');
    setPreview(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistanceId) {
      error('Please select an active Qard Hasan Loan.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      error('Please enter a valid repayment amount.');
      return;
    }

    setSaving(true);
    try {
      await repaymentsApi.create({
        assistance_id: assistanceId,
        amount: parsedAmount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      success('Repayment recorded & automatically distributed back to funding groups!');
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to process repayment.';
      error(msg);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (val: string | number | undefined) => {
    const num = Number(val || 0);
    return '৳' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <HandCoins className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-500 dark:text-indigo-400" />
            <span>Qard Hasan Repayments</span>
          </h1>
        </div>

        {hasPermission('repayments.create') && (
          <Button
            variant="primary"
            onClick={openCreateModal}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Record Repayment
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search repayment code, loan, beneficiary..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Repayments Table */}
      <Card bodyClassName="p-0">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : repayments.length === 0 ? (
          <div className="text-center py-16 p-8">
            <Receipt className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Repayments Recorded</h3>
            <p className="text-xs text-slate-500 mt-1">Record an installment repayment against an active Qard Hasan loan.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px] divide-y divide-slate-100 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 text-[11px] uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2 px-3 sm:px-3.5">Repayment Code</th>
                  <th className="py-2 px-3 sm:px-3.5">Loan Code & Beneficiary</th>
                  <th className="py-2 px-3 sm:px-3.5">Date & Method</th>
                  <th className="py-2 px-3 sm:px-3.5 text-right">Repaid Amount</th>
                  <th className="py-2 px-3 sm:px-3.5">Proportional Distribution</th>
                  <th className="py-2 px-3 sm:px-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {repayments.map((rep) => (
                  <tr
                    key={rep.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2 px-3 sm:px-3.5 font-bold font-mono text-slate-900 dark:text-white text-xs">
                      {rep.repayment_code}
                    </td>
                    <td className="py-2 px-3 sm:px-3.5">
                      <p className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[150px]">{rep.beneficiary_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{rep.assistance_code}</p>
                    </td>
                    <td className="py-2 px-3 sm:px-3.5">
                      <div className="text-xs">
                        <p className="font-medium text-slate-900 dark:text-white">{rep.payment_date}</p>
                        <Badge variant="neutral" size="sm" className="mt-0.5 text-[10px]">{rep.payment_method}</Badge>
                      </div>
                    </td>
                    <td className="py-2 px-3 sm:px-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                      {formatCurrency(rep.amount)}
                    </td>
                    <td className="py-2 px-3 sm:px-3.5">
                      <div className="space-y-0.5">
                        {rep.allocations.map((a, idx) => (
                          <div key={idx} className="text-[11px] flex items-center space-x-1 text-slate-600 dark:text-slate-400">
                            <ArrowDownLeft className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                            <span>{a.group_name}: <b>{formatCurrency(a.allocated_amount)}</b></span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 px-3 sm:px-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1 h-7 w-7"
                        onClick={() => setSelectedRepayment(rep)}
                        title="View Full Repayment Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Record Repayment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Qard Hasan Repayment"
        subtitle="Repayments are automatically distributed back to the original funding groups based on their funding weights."
        maxWidth="2xl"
      >
        <form onSubmit={handleSave} className="space-y-5">
          <Select
            label="Active Qard Hasan Loan"
            value={assistanceId}
            onChange={(e) => setAssistanceId(e.target.value)}
            required
          >
            {activeLoans.map((l) => (
              <option key={l.id} value={l.id}>
                {l.assistance_code} — {l.beneficiary_name} (Outstanding: {formatCurrency(l.outstanding_amount)})
              </option>
            ))}
          </Select>

          {selectedLoanObj && (
            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <p className="font-semibold text-slate-600 dark:text-slate-300">
                Loan Principal: <b>{formatCurrency(selectedLoanObj.total_amount)}</b> | Outstanding:{' '}
                <b className="text-rose-600 dark:text-rose-400">{formatCurrency(selectedLoanObj.outstanding_amount)}</b>
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Repayment Amount (BDT) *"
              type="number"
              step="0.01"
              min="1"
              placeholder="e.g. 10000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />

            <Input
              label="Payment Date (Optional)"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Payment Method (Optional)"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            >
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="MOBILE_BANKING">Mobile Banking (bKash/Nagad)</option>
              <option value="CHEQUE">Cheque</option>
              <option value="OTHER">Other</option>
            </Select>

            <Input
              label="Reference / Transaction # (Optional)"
              placeholder="e.g. TXN-892301"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
            />
          </div>

          {/* Live Proportional Distribution Preview Box */}
          {loadingPreview ? (
            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-center space-x-2 text-xs text-emerald-700 dark:text-emerald-300">
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span>Calculating proportional distribution across funding groups...</span>
            </div>
          ) : preview ? (
            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Automatic Proportional Distribution Preview</span>
                </div>
                <Badge variant="success" size="sm">
                  100% Balanced
                </Badge>
              </div>

              <div className="space-y-1.5">
                {preview.allocations.map((a, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-950 text-xs"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {a.group_name} ({(Number(a.proportion_ratio || 0) * 100).toFixed(1)}%)
                    </span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(a.allocated_amount)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-emerald-200 dark:border-emerald-900/50 text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span>New Outstanding Loan Balance:</span>
                <span className="text-slate-900 dark:text-white font-bold">{formatCurrency(preview.new_outstanding)}</span>
              </div>
            </div>
          ) : null}

          <Textarea
            label="Notes / Receipt Remarks (Optional)"
            placeholder="Installment number, remarks..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={saving}
              disabled={!preview}
            >
              Confirm Repayment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Repayment Details Modal */}
      <Modal
        isOpen={!!selectedRepayment}
        onClose={() => setSelectedRepayment(null)}
        title={`${selectedRepayment?.repayment_code} — Repayment Receipt`}
        subtitle={`Paid on ${selectedRepayment?.payment_date} via ${selectedRepayment?.payment_method}`}
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-slate-400">Beneficiary</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {selectedRepayment?.beneficiary_name}
              </p>
              <p className="text-[11px] text-slate-500">{selectedRepayment?.assistance_code}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400">Total Repaid</p>
              <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatCurrency(selectedRepayment?.amount)}
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-2">
              Distributed To Original Funding Groups:
            </h4>
            <div className="space-y-1.5">
              {selectedRepayment?.allocations.map((a, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{a.group_name}</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(a.allocated_amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
