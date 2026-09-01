import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { contributionsApi, membersApi } from '../api/client';
import { Member, PaymentMethod, MonthScheduleItem } from '../types';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import MonthMultiSelect from '../components/MonthMultiSelect';
import { useToast } from '../context/ToastContext';
import {
  PiggyBank,
  CheckCircle2,
  ArrowRight,
  Building2,
  FileSpreadsheet,
  Calendar
} from 'lucide-react';

export const AddContributionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [memberId, setMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [contributionDate, setContributionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [monthSchedule, setMonthSchedule] = useState<MonthScheduleItem[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [monthlyPledge, setMonthlyPledge] = useState(500);
  const [saving, setSaving] = useState(false);
  const [createdReceipt, setCreatedReceipt] = useState<string | null>(null);
  const [createdAmount, setCreatedAmount] = useState<string | number>('0');
  const [createdMemberName, setCreatedMemberName] = useState<string>('');
  const [createdGroupName, setCreatedGroupName] = useState<string>('');
  const [createdMemberId, setCreatedMemberId] = useState<string>('');
  const [createdMonthsSummary, setCreatedMonthsSummary] = useState<string>('');

  const { success, error } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const loadMembers = async () => {
      try {
        setLoadingMembers(true);
        const res = await membersApi.list({ is_active: true, limit: 300 });
        setMembers(res.data);

        const preSelected = searchParams.get('member_id');
        const preAmount = searchParams.get('amount');

        if (preSelected && res.data.some((m) => m.id === preSelected)) {
          setMemberId(preSelected);
          const found = res.data.find((m) => m.id === preSelected);
          if (preAmount) {
            setAmount(preAmount);
          } else if (found?.monthly_contribution_amount) {
            setAmount(String(found.monthly_contribution_amount));
          } else if (found?.effective_monthly_contribution) {
            setAmount(String(found.effective_monthly_contribution));
          } else {
            setAmount('500');
          }
        } else if (res.data.length > 0) {
          setMemberId(res.data[0].id);
          const first = res.data[0];
          if (preAmount) {
            setAmount(preAmount);
          } else if (first.monthly_contribution_amount) {
            setAmount(String(first.monthly_contribution_amount));
          } else if (first.effective_monthly_contribution) {
            setAmount(String(first.effective_monthly_contribution));
          } else {
            setAmount('500');
          }
        }
      } catch (err) {
        error('Failed to load members list');
      } finally {
        setLoadingMembers(false);
      }
    };
    loadMembers();
  }, []);

  // Load month schedule when member changes
  useEffect(() => {
    if (!memberId) {
      setMonthSchedule([]);
      return;
    }
    const loadSchedule = async () => {
      try {
        setLoadingSchedule(true);
        const currentYear = new Date().getFullYear();
        const res = await contributionsApi.getMemberSchedule(memberId, {
          start_year: currentYear - 1,
          end_year: currentYear + 1,
        });
        setMonthSchedule(res.data.months);
        setMonthlyPledge(Number(res.data.monthly_pledge));
      } catch (err) {
        // Silently handle — user can still use single-month
        setMonthSchedule([]);
      } finally {
        setLoadingSchedule(false);
      }
    };
    loadSchedule();
    setSelectedMonths([]);
  }, [memberId]);

  // Auto-calculate amount from selected months
  useEffect(() => {
    if (selectedMonths.length > 0 && monthlyPledge > 0) {
      // Calculate total from remaining dues of selected months
      let total = 0;
      for (const ms of selectedMonths) {
        const found = monthSchedule.find((m) => m.month === ms);
        if (found) {
          total += Number(found.remaining_due) > 0 ? Number(found.remaining_due) : Number(found.expected_amount);
        } else {
          total += monthlyPledge;
        }
      }
      setAmount(String(total));
    }
  }, [selectedMonths, monthlyPledge, monthSchedule]);

  const selectedMember = members.find((m) => m.id === memberId);

  const handleMemberChange = (newMemberId: string) => {
    setMemberId(newMemberId);
    const m = members.find((x) => x.id === newMemberId);
    if (m) {
      if (m.monthly_contribution_amount) {
        setAmount(String(m.monthly_contribution_amount));
      } else if (m.effective_monthly_contribution) {
        setAmount(String(m.effective_monthly_contribution));
      } else {
        setAmount('500');
      }
    }
  };

  const handleReset = () => {
    if (members.length > 0) {
      handleMemberChange(members[0].id);
    } else {
      setAmount('');
    }
    setSelectedMonths([]);
    setContributionDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('CASH');
    setReferenceNumber('');
    setNotes('');
    setCreatedReceipt(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) {
      error('Please select a Contributing Member.');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      error('Contribution Amount must be greater than 0.');
      return;
    }

    if (selectedMonths.length === 0) {
      error('Please select at least one Contribution Month.');
      return;
    }

    setSaving(true);
    try {
      const res = await contributionsApi.create({
        member_id: memberId,
        amount: numAmount,
        selected_months: selectedMonths,
        contribution_date: contributionDate || undefined,
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      success(`Contribution recorded! Receipt: ${res.data.receipt_number}`);
      setCreatedReceipt(res.data.receipt_number);
      setCreatedAmount(res.data.amount);
      setCreatedMemberName(res.data.member_name || selectedMember?.name || 'Member');
      setCreatedGroupName(res.data.group_name || selectedMember?.group_name || 'Fund Group');
      setCreatedMemberId(memberId);
      setCreatedMonthsSummary(res.data.months_summary || '');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to record contribution.';
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <PiggyBank className="w-7 h-7 text-emerald-500" />
            <span>Add Member Contribution</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Record a monthly contribution payment. Select one or multiple months in a single payment.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => navigate('/app/contributions/manage')}
          leftIcon={<FileSpreadsheet className="w-4 h-4" />}
        >
          View All Contributions
        </Button>
      </div>

      {/* Success Notification Banner */}
      {createdReceipt && (
        <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-emerald-500/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-emerald-950 dark:text-emerald-200 text-sm">
                Receipt {createdReceipt} Generated Successfully!
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                {formatCurrency(createdAmount)} credited to <b>{createdGroupName}</b> from <b>{createdMemberName}</b>.
                {createdMonthsSummary && (
                  <span className="ml-1">Covering: {createdMonthsSummary}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
            >
              Record Another
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => navigate(`/app/members/ledger?member_id=${createdMemberId}`)}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              View Member Ledger
            </Button>
          </div>
        </div>
      )}

      {/* Contribution Form Card */}
      <Card
        title="Contribution Intake Form"
        subtitle="Select the contributing member, choose the month(s) to pay, and submit. The double-entry ledger credits the group ONCE for the total amount."
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Select
                  label="Contributing Member *"
                  value={memberId}
                  onChange={(e) => handleMemberChange(e.target.value)}
                  required
                  disabled={loadingMembers}
                >
                  {loadingMembers ? (
                    <option value="">Loading members...</option>
                  ) : members.length === 0 ? (
                    <option value="">No active members found</option>
                  ) : (
                    members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.group_name}) {m.member_code ? `— ${m.member_code}` : ''}
                      </option>
                    ))
                  )}
                </Select>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                  * Required: Member determines fund group allocation
                </p>
              </div>

              <div>
                <Input
                  label="Total Contribution Amount (BDT) *"
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="e.g. 500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                  {selectedMonths.length > 1
                    ? `Auto-calculated: ${selectedMonths.length} months × ৳${monthlyPledge.toLocaleString()}`
                    : '* Required: Amount credited to group fund'
                  }
                </p>
              </div>
            </div>

            {/* Automatically Resolved Group & Monthly Pledge Info Box */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-850/60 rounded-xl border border-slate-200 dark:border-slate-750 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Destination Fund Group & Member Monthly Pledge
                  </p>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {selectedMember ? selectedMember.group_name : 'No member selected'}
                    {selectedMember && (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 ml-2">
                        • Configured Monthly Due: {formatCurrency(selectedMember.monthly_contribution_amount || selectedMember.effective_monthly_contribution || 500)}/mo
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Badge variant="success" size="sm">
                Auto-Determined
              </Badge>
            </div>

            {/* Multi-Month Selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                <Calendar className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                Contribution Month(s) *
              </label>
              <MonthMultiSelect
                months={monthSchedule}
                selectedMonths={selectedMonths}
                onSelectionChange={setSelectedMonths}
                monthlyAmount={monthlyPledge}
                disabled={!memberId || loadingMembers}
                loading={loadingSchedule}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Select one or multiple months. Already paid months are greyed out. Future months are valid for advance payment.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Payment Deposit Date"
                  type="date"
                  value={contributionDate}
                  onChange={(e) => setContributionDate(e.target.value)}
                />
                <p className="text-[10px] text-slate-400 mt-1">Date funds were received</p>
              </div>

              <div>
                <Select
                  label="Payment Method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                >
                  <option value="CASH">Cash (In-Hand)</option>
                  <option value="BANK_TRANSFER">Bank Transfer / EFT</option>
                  <option value="MOBILE_BANKING">Mobile Banking (bKash / Nagad / Rocket)</option>
                  <option value="CHEQUE">Bank Cheque</option>
                  <option value="OTHER">Other Method</option>
                </Select>
              </div>
            </div>

            <Input
              label="Bank / Transaction Reference Number (Optional)"
              placeholder="e.g. bKash TrxID: 9J382KLA, Bank Slip #88219"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
            />

            <Textarea
              label="Contribution Notes / Remarks (Optional)"
              placeholder="Monthly pledge installment, advance contribution, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

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
              leftIcon={<PiggyBank className="w-4 h-4" />}
            >
              {selectedMonths.length > 1
                ? `Record ${selectedMonths.length}-Month Payment`
                : 'Record Contribution'
              }
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
