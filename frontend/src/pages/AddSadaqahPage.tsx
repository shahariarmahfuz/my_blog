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
  HeartHandshake,
  Plus,
  Trash2,
  Building2,
  Users2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Info,
  Layers,
  FileSpreadsheet,
  ShieldAlert
} from 'lucide-react';

interface GroupAllocationRow {
  group_id: string;
  allocated_amount: string;
}

export const AddSadaqahPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form states
  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [disbursementDate, setDisbursementDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');

  // Group allocations
  const [allocations, setAllocations] = useState<GroupAllocationRow[]>([
    { group_id: '', allocated_amount: '' },
  ]);

  const [saving, setSaving] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [createdAmount, setCreatedAmount] = useState<string | number>('0');
  const [createdBeneficiaryName, setCreatedBeneficiaryName] = useState<string>('');

  const { success, error } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingInitial(true);
        const [benRes, groupsRes] = await Promise.all([
          beneficiariesApi.list({ is_active: true, limit: 200 }),
          groupsApi.list(),
        ]);
        setBeneficiaries(benRes.data);
        setGroups(groupsRes.data);

        // Pre-select beneficiary if in query
        const preSelectedBen = searchParams.get('beneficiary_id');
        if (preSelectedBen && benRes.data.some((b) => b.id === preSelectedBen)) {
          setBeneficiaryId(preSelectedBen);
        } else if (benRes.data.length > 0) {
          setBeneficiaryId(benRes.data[0].id);
        }

        if (groupsRes.data.length > 0) {
          setAllocations([{ group_id: groupsRes.data[0].id, allocated_amount: '' }]);
        }
      } catch (err) {
        error('Failed to load initial data');
      } finally {
        setLoadingInitial(false);
      }
    };
    loadData();
  }, []);

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

  const handleAddAllocationRow = () => {
    const unusedGroup = groups.find((g) => !allocations.some((a) => a.group_id === g.id));
    setAllocations((prev) => [
      ...prev,
      { group_id: unusedGroup ? unusedGroup.id : groups[0]?.id || '', allocated_amount: '' },
    ]);
  };

  const handleRemoveAllocationRow = (index: number) => {
    if (allocations.length === 1) {
      error('At least one funding group allocation is required.');
      return;
    }
    setAllocations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAllocationChange = (index: number, field: keyof GroupAllocationRow, val: string) => {
    setAllocations((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const targetTotal = parseFloat(totalAmount) || 0;
  const currentAllocationSum = allocations.reduce((sum, row) => sum + (parseFloat(row.allocated_amount) || 0), 0);
  const remainingToAllocate = targetTotal - currentAllocationSum;
  const isAllocationBalanced = targetTotal > 0 && Math.abs(remainingToAllocate) < 0.01;

  const handleAutoFillSingleGroup = (index: number) => {
    if (targetTotal <= 0) return;
    const otherSum = allocations.reduce((sum, row, i) => (i !== index ? sum + (parseFloat(row.allocated_amount) || 0) : sum), 0);
    const needed = Math.max(0, targetTotal - otherSum);
    handleAllocationChange(index, 'allocated_amount', needed.toString());
  };

  const handleReset = () => {
    if (beneficiaries.length > 0) setBeneficiaryId(beneficiaries[0].id);
    setTotalAmount('');
    setDisbursementDate(new Date().toISOString().split('T')[0]);
    setPurpose('');
    setNotes('');
    if (groups.length > 0) {
      setAllocations([{ group_id: groups[0].id, allocated_amount: '' }]);
    }
    setCreatedCode(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!beneficiaryId) {
      error('Please select a recipient Beneficiary.');
      return;
    }
    if (targetTotal <= 0) {
      error('Sadaqah grant amount must be greater than 0.');
      return;
    }
    if (!isAllocationBalanced) {
      error(`Total allocated (৳${currentAllocationSum.toLocaleString()}) must match total amount (৳${targetTotal.toLocaleString()}).`);
      return;
    }

    const selectedGroupIds = allocations.map((a) => a.group_id);
    if (new Set(selectedGroupIds).size !== selectedGroupIds.length) {
      error('Each funding group can only be selected once.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        assistance_type: 'SADAQAH',
        beneficiary_id: beneficiaryId,
        total_amount: targetTotal,
        disbursement_date: disbursementDate,
        purpose: purpose.trim() || undefined,
        notes: notes.trim() || undefined,
        funding_allocations: allocations.map((a) => ({
          group_id: a.group_id,
          allocated_amount: parseFloat(a.allocated_amount),
        })),
      };

      const res = await assistanceApi.create(payload);
      success(`Sadaqah grant ${res.data.assistance_code} disbursed successfully!`);
      setCreatedCode(res.data.assistance_code);
      setCreatedAmount(res.data.total_amount);
      setCreatedBeneficiaryName(res.data.beneficiary_name || 'Beneficiary');
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to disburse Sadaqah.');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (val: string | number | undefined) => {
    const num = Number(val || 0);
    return '৳' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <HeartHandshake className="w-7 h-7 text-rose-500" />
            <span>Disburse Sadaqah (Non-Recoverable Grant)</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Provide emergency relief, medical aid, or poverty assistance. <b>Non-recoverable grant funded by one or multiple groups.</b>
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => navigate('/app/assistance/sadaqah/manage')}
          leftIcon={<FileSpreadsheet className="w-4 h-4" />}
        >
          Manage Sadaqah
        </Button>
      </div>

      {/* Non-Recoverable Notice Box */}
      <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-start space-x-3 text-xs text-rose-900 dark:text-rose-200">
        <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Notice on Non-Recoverable Sadaqah</p>
          <p className="mt-0.5 text-rose-700 dark:text-rose-300">
            Sadaqah is a direct humanitarian grant and is strictly non-recoverable. No repayment schedule will be created and no receivable will be recorded against the beneficiary.
          </p>
        </div>
      </div>

      {/* Success Notification Banner */}
      {createdCode && (
        <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-emerald-500/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-emerald-950 dark:text-emerald-200 text-sm">
                Sadaqah {createdCode} Disbursed Successfully!
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                {formatCurrency(createdAmount)} granted to <b>{createdBeneficiaryName}</b>. Funds debited from assigned groups.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
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
              onClick={() => navigate('/app/assistance/sadaqah/manage')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              View Sadaqah Grants
            </Button>
          </div>
        </div>
      )}

      {/* Form Card */}
      <Card
        title="Sadaqah Grant Intake Form"
        subtitle="Mandatory: Beneficiary, Total Amount, and at least one funding group. Multi-group co-funding is verified by backend."
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main Details */}
          <div className="p-5 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 space-y-4">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
              <Info className="w-4 h-4 text-rose-600" />
              <span>Mandatory Grant Details</span>
            </div>

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
                <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-1 font-medium">
                  * Beneficiary must be registered & active
                </p>
              </div>

              <div>
                <Input
                  label="Total Sadaqah Grant Amount (BDT) *"
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="e.g. 20000"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  required
                  autoFocus
                />
                <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-1 font-medium">
                  * Non-recoverable distribution
                </p>
              </div>
            </div>
          </div>

          {/* Multi-Group Funding Allocation Builder */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  <Layers className="w-4 h-4 text-rose-600" />
                  <span>Funding Groups Allocation (Required)</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select which Fund Group(s) fund this non-recoverable grant. If a group lacks sufficient funds, combine multiple groups.
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
                            className="text-[10px] text-rose-600 dark:text-rose-400 font-bold hover:underline"
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
                            : 'border-slate-200 dark:border-slate-700 focus:ring-rose-500'
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

          {/* Optional Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Disbursement Date (Optional)"
              type="date"
              value={disbursementDate}
              onChange={(e) => setDisbursementDate(e.target.value)}
            />

            <Input
              label="Purpose / Aid Category (Optional)"
              placeholder="e.g. Emergency medical surgery, flood relief food pack, orphan stipend"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>

          <Textarea
            label="Administrative Notes (Optional)"
            placeholder="Field officer assessment, hospital bills verified, distribution photos..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {/* Form Actions */}
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
              leftIcon={<HeartHandshake className="w-4 h-4" />}
            >
              Disburse Sadaqah Grant
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
