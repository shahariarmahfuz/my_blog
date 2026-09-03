import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { assistanceApi, beneficiariesApi, groupsApi } from '../api/client';
import { Beneficiary, Group } from '../types';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../context/ToastContext';
import {
  HandCoins,
  CheckCircle2,
  ArrowRight,
  Plus,
  Trash2,
  Layers,
  FileSpreadsheet
} from 'lucide-react';

interface AllocationRow {
  group_id: string;
  allocated_amount: string;
}

export const AddQardHasanPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [disbursementDate, setDisbursementDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');

  // Installments configuration
  const [installmentsCount, setInstallmentsCount] = useState('6');
  const [installmentIntervalMonths, setInstallmentIntervalMonths] = useState('1');
  const [firstInstallmentDate, setFirstInstallmentDate] = useState('');

  // Multi-group allocations
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);

  // Data lists
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [saving, setSaving] = useState(false);

  // Success result banner
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [createdAmount, setCreatedAmount] = useState<string | number>('0');
  const [createdBeneficiaryName, setCreatedBeneficiaryName] = useState('');

  const { success, error } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingInitial(true);
        const [bRes, gRes] = await Promise.all([
          beneficiariesApi.list({ is_active: true, limit: 300 }),
          groupsApi.list({ is_active: true }),
        ]);

        setBeneficiaries(bRes.data);
        setGroups(gRes.data);

        // Pre-select beneficiary if passed via URL
        const preBenId = searchParams.get('beneficiary_id');
        let initialBen: Beneficiary | undefined;
        if (preBenId && bRes.data.some((b) => b.id === preBenId)) {
          setBeneficiaryId(preBenId);
          initialBen = bRes.data.find((b) => b.id === preBenId);
        } else if (bRes.data.length > 0) {
          setBeneficiaryId(bRes.data[0].id);
          initialBen = bRes.data[0];
        }

        // Initialize with default group allocation
        if (gRes.data.length > 0) {
          const defaultGroupId = initialBen ? initialBen.group_id : gRes.data[0].id;
          setAllocations([
            {
              group_id: defaultGroupId,
              allocated_amount: '',
            },
          ]);
        }
      } catch (err) {
        error('Failed to load form prerequisites.');
      } finally {
        setLoadingInitial(false);
      }
    };
    loadInitialData();
  }, []);

  // When beneficiary changes, set default group if possible
  const handleBeneficiaryChange = (newBenId: string) => {
    setBeneficiaryId(newBenId);
    const ben = beneficiaries.find((b) => b.id === newBenId);
    if (ben && allocations.length === 1 && (!allocations[0].allocated_amount || allocations[0].allocated_amount === '0')) {
      setAllocations([
        {
          group_id: ben.group_id,
          allocated_amount: totalAmount || '',
        },
      ]);
    }
  };

  // Add allocation row
  const handleAddAllocationRow = () => {
    // Find a group not already used
    const usedGroupIds = new Set(allocations.map((a) => a.group_id));
    const availableGroup = groups.find((g) => !usedGroupIds.has(g.id)) || groups[0];
    if (availableGroup) {
      setAllocations([
        ...allocations,
        {
          group_id: availableGroup.id,
          allocated_amount: '',
        },
      ]);
    }
  };

  // Remove allocation row
  const handleRemoveAllocationRow = (index: number) => {
    if (allocations.length === 1) {
      error('At least one funding group allocation is required.');
      return;
    }
    setAllocations(allocations.filter((_, i) => i !== index));
  };

  // Update allocation field
  const handleAllocationChange = (index: number, field: keyof AllocationRow, value: string) => {
    const next = [...allocations];
    next[index][field] = value;
    setAllocations(next);
  };

  // Auto-fill single remaining amount
  const handleAutoFillSingleGroup = (idx: number) => {
    const target = parseFloat(totalAmount) || 0;
    if (target <= 0) return;
    const currentOtherSum = allocations.reduce((sum, item, i) => {
      if (i === idx) return sum;
      return sum + (parseFloat(item.allocated_amount) || 0);
    }, 0);
    const diff = Math.max(0, target - currentOtherSum);
    const next = [...allocations];
    next[idx].allocated_amount = diff.toString();
    setAllocations(next);
  };

  // Calculations
  const targetTotal = parseFloat(totalAmount) || 0;
  const currentAllocationSum = allocations.reduce(
    (sum, a) => sum + (parseFloat(a.allocated_amount) || 0),
    0
  );
  const remainingToAllocate = targetTotal - currentAllocationSum;
  const isAllocationBalanced = targetTotal > 0 && Math.abs(remainingToAllocate) < 0.001;

  const handleReset = () => {
    if (beneficiaries.length > 0) {
      setBeneficiaryId(beneficiaries[0].id);
    }
    setTotalAmount('');
    setDisbursementDate(new Date().toISOString().split('T')[0]);
    setPurpose('');
    setNotes('');
    setInstallmentsCount('6');
    setInstallmentIntervalMonths('1');
    setFirstInstallmentDate('');
    if (groups.length > 0) {
      setAllocations([
        {
          group_id: beneficiaries[0]?.group_id || groups[0].id,
          allocated_amount: '',
        },
      ]);
    }
    setCreatedCode(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!beneficiaryId) {
      error('Please select a Beneficiary.');
      return;
    }
    if (targetTotal <= 0) {
      error('Qard Hasan amount must be greater than 0.');
      return;
    }
    if (!isAllocationBalanced) {
      error(`Total allocated (৳${currentAllocationSum.toLocaleString()}) must exactly match total amount (৳${targetTotal.toLocaleString()}).`);
      return;
    }

    // Check for duplicate groups
    const selectedGroupIds = allocations.map((a) => a.group_id);
    if (new Set(selectedGroupIds).size !== selectedGroupIds.length) {
      error('Each funding group can only be added once. Please combine allocations for duplicate groups.');
      return;
    }

    setSaving(true);
    try {
      const parsedInstallments = parseInt(installmentsCount, 10);
      const parsedInterval = parseInt(installmentIntervalMonths, 10);

      const payload = {
        assistance_type: 'QARD_HASAN',
        beneficiary_id: beneficiaryId,
        total_amount: targetTotal,
        disbursement_date: disbursementDate || undefined,
        purpose: purpose.trim() || undefined,
        notes: notes.trim() || undefined,
        funding_allocations: allocations.map((a) => ({
          group_id: a.group_id,
          allocated_amount: parseFloat(a.allocated_amount),
        })),
        installments_count: parsedInstallments > 0 ? parsedInstallments : 1,
        installment_interval_months: parsedInterval > 0 ? parsedInterval : 1,
        first_installment_date: firstInstallmentDate || undefined,
      };

      const res = await assistanceApi.create(payload);
      success(`Qard Hasan loan ${res.data.assistance_code} created successfully!`);
      setCreatedCode(res.data.assistance_code);
      setCreatedAmount(res.data.total_amount);
      setCreatedBeneficiaryName(res.data.beneficiary_name || 'Beneficiary');
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to disburse Qard Hasan.');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (val: string | number | undefined) => {
    const num = Number(val || 0);
    return '৳' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12">
      {/* Header Bar */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
          <HandCoins className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-500 dark:text-indigo-400" />
          <span>Disburse Qard Hasan (Interest-Free Loan)</span>
        </h1>
      </div>

      {/* Success Notification Banner */}
      {createdCode && (
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-emerald-950 dark:text-emerald-200 text-sm">
                Qard Hasan {createdCode} Disbursed Successfully!
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                {formatCurrency(createdAmount)} disbursed to <b>{createdBeneficiaryName}</b>. Funds debited from assigned groups.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
            >
              Disburse Another
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => navigate('/app/assistance/qard-hasan/repayments')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Repayments
            </Button>
          </div>
        </div>
      )}

      {/* Qard Hasan Form Card */}
      <Card title="Qard Hasan Loan Application & Disbursement">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Main Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Select
                  label="Recipient Beneficiary *"
                  value={beneficiaryId}
                  onChange={(e) => handleBeneficiaryChange(e.target.value)}
                  required
                  disabled={loadingInitial}
                >
                  {loadingInitial ? (
                    <option value="">Loading beneficiaries...</option>
                  ) : beneficiaries.length === 0 ? (
                    <option value="">No active beneficiaries found</option>
                  ) : (
                    beneficiaries.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.group_name}) {b.beneficiary_code ? `— ${b.beneficiary_code}` : ''}
                      </option>
                    ))
                  )}
                </Select>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                  * Required: Beneficiary must be registered & active
                </p>
              </div>

              <div>
                <Input
                  label="Total Qard Hasan Amount (BDT) *"
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="e.g. 50000"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  required
                  autoFocus
                />
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                  * Required: Must be greater than 0
                </p>
              </div>
            </div>
          </div>

          {/* Multi-Group Funding Allocation Builder */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <span>Funding Groups Allocation *</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Specify how much each Fund Group contributes. Multi-group co-funding is verified by backend.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddAllocationRow}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                disabled={allocations.length >= groups.length}
              >
                Add Group
              </Button>
            </div>

            {/* Allocation rows */}
            <div className="space-y-3">
              {allocations.map((row, idx) => {
                const groupObj = groups.find((g) => g.id === row.group_id);
                const allocNum = parseFloat(row.allocated_amount) || 0;
                const groupBal = parseFloat(String(groupObj?.available_balance ?? groupObj?.current_balance ?? 0));
                const isOverLimit = allocNum > groupBal;

                return (
                  <div
                    key={idx}
                    className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-750 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="w-full sm:w-1/2">
                      <Select
                        label={`Funding Group #${idx + 1}`}
                        value={row.group_id}
                        onChange={(e) => handleAllocationChange(idx, 'group_id', e.target.value)}
                        required
                      >
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name} {g.code ? `(${g.code})` : ''} — Available: {formatCurrency(g.available_balance ?? g.current_balance ?? 0)}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="w-full sm:w-1/3">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Allocated (BDT)
                        </label>
                        {targetTotal > 0 && remainingToAllocate > 0 && (
                          <button
                            type="button"
                            onClick={() => handleAutoFillSingleGroup(idx)}
                            className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                          >
                            Fill Remaining
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        placeholder="0.00"
                        value={row.allocated_amount}
                        onChange={(e) => handleAllocationChange(idx, 'allocated_amount', e.target.value)}
                        className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
                          isOverLimit
                            ? 'border-rose-400 focus:ring-rose-500 text-rose-600'
                            : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-500'
                        }`}
                        required
                      />
                      {isOverLimit && (
                        <p className="text-[10px] text-rose-500 font-bold mt-1">
                          Exceeds available: {formatCurrency(groupBal)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 pt-2 sm:pt-4">
                      {allocations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAllocationRow(idx)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                          title="Remove Funding Group"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Allocation summary status */}
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-between text-xs font-bold">
              <div className="flex items-center space-x-2">
                <span>Allocated: {formatCurrency(currentAllocationSum)} / {formatCurrency(targetTotal)}</span>
              </div>
              {isAllocationBalanced ? (
                <Badge variant="success" size="sm">
                  100% Fully Allocated
                </Badge>
              ) : remainingToAllocate > 0 ? (
                <Badge variant="warning" size="sm">
                  {formatCurrency(remainingToAllocate)} unallocated
                </Badge>
              ) : (
                <Badge variant="danger" size="sm">
                  Over-allocated by {formatCurrency(Math.abs(remainingToAllocate))}
                </Badge>
              )}
            </div>
          </div>

          {/* Repayment Installments Configuration (Visible Directly) */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Installment Schedule Configuration (Optional)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Number of Installments (Optional)"
                type="number"
                min="1"
                max="60"
                value={installmentsCount}
                onChange={(e) => setInstallmentsCount(e.target.value)}
              />

              <Select
                label="Installment Interval (Optional)"
                value={installmentIntervalMonths}
                onChange={(e) => setInstallmentIntervalMonths(e.target.value)}
              >
                <option value="1">Monthly (Every 1 Month)</option>
                <option value="2">Bi-Monthly (Every 2 Months)</option>
                <option value="3">Quarterly (Every 3 Months)</option>
                <option value="6">Semi-Annually (Every 6 Months)</option>
                <option value="12">Annually (Every 12 Months)</option>
              </Select>

              <Input
                label="First Installment Due Date (Optional)"
                type="date"
                value={firstInstallmentDate}
                onChange={(e) => setFirstInstallmentDate(e.target.value)}
              />
            </div>

            {targetTotal > 0 && parseInt(installmentsCount, 10) > 0 && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
                Approx. <b>{formatCurrency(targetTotal / parseInt(installmentsCount, 10))}</b> per installment over {installmentsCount} intervals.
              </div>
            )}
          </div>

          {/* Optional Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Disbursement Date (Optional)"
              type="date"
              value={disbursementDate}
              onChange={(e) => setDisbursementDate(e.target.value)}
            />

            <Input
              label="Purpose of Loan (Optional)"
              placeholder="e.g. Small business setup, agriculture, education..."
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>

          <Textarea
            label="Administrative & Assessment Notes (Optional)"
            placeholder="Field officer recommendation, repayment capability notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
            >
              Clear Form
            </Button>

            <Button
              type="submit"
              variant="primary"
              isLoading={saving}
              disabled={!isAllocationBalanced}
              leftIcon={<HandCoins className="w-4 h-4" />}
            >
              Disburse Qard Hasan
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
