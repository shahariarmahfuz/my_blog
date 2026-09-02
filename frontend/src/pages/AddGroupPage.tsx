import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupsApi } from '../api/client';
import { GroupType } from '../types';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { useToast } from '../context/ToastContext';
import {
  FolderPlus,
  Building2,
  CheckCircle2,
  ArrowRight,
  FileSpreadsheet,
  Wallet
} from 'lucide-react';

export const AddGroupPage: React.FC = () => {
  const [name, setName] = useState('');
  const [groupType, setGroupType] = useState<GroupType>('MEMBER_FUND');
  const [code, setCode] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [openingBalanceDate, setOpeningBalanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [openingBalanceNotes, setOpeningBalanceNotes] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [createdGroupId, setCreatedGroupId] = useState<string | null>(null);
  const [createdGroupName, setCreatedGroupName] = useState<string>('');
  const [createdGroupType, setCreatedGroupType] = useState<GroupType>('MEMBER_FUND');
  const [createdOpeningBalance, setCreatedOpeningBalance] = useState<number>(0);

  const { success, error } = useToast();
  const navigate = useNavigate();

  const handleReset = () => {
    setName('');
    setGroupType('MEMBER_FUND');
    setCode('');
    setOpeningBalance('');
    setOpeningBalanceDate(new Date().toISOString().split('T')[0]);
    setOpeningBalanceNotes('');
    setDescription('');
    setAddress('');
    setNotes('');
    setCreatedGroupId(null);
    setCreatedGroupName('');
    setCreatedGroupType('MEMBER_FUND');
    setCreatedOpeningBalance(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error('Group Name is required.');
      return;
    }

    const opBalNum = openingBalance ? parseFloat(openingBalance) : 0;
    if (isNaN(opBalNum) || opBalNum < 0) {
      error('Opening Balance must be a valid positive number.');
      return;
    }

    setSaving(true);
    try {
      const res = await groupsApi.create({
        name: name.trim(),
        group_type: groupType,
        code: code.trim() || undefined,
        opening_balance: opBalNum > 0 ? opBalNum : undefined,
        opening_balance_date: opBalNum > 0 ? (openingBalanceDate || undefined) : undefined,
        opening_balance_notes: openingBalanceNotes.trim() || undefined,
        description: description.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        is_active: true,
      });

      success(`Fund Group "${name}" created successfully!`);
      setCreatedGroupId(res.data.id);
      setCreatedGroupName(res.data.name);
      setCreatedGroupType(groupType);
      setCreatedOpeningBalance(opBalNum);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to create fund group.';
      error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <FolderPlus className="w-7 h-7 text-emerald-500" />
            <span>Add New Fund Group</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Establish a distinct accounting and fund management group. <b>Only Group Name is required.</b>
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => navigate('/app/groups/manage')}
          leftIcon={<Building2 className="w-4 h-4" />}
        >
          View All Groups
        </Button>
      </div>

      {/* Success Notification Banner */}
      {createdGroupId && (
        <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-emerald-500/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-emerald-950 dark:text-emerald-200 text-sm">
                Fund Group "{createdGroupName}" ({createdGroupType === 'EXTERNAL_FUND' ? 'External Fund' : 'Member Fund'}) Created Successfully!
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                {createdOpeningBalance > 0
                  ? `Initial Opening Balance of ৳${createdOpeningBalance.toLocaleString()} recorded in the double-entry ledger.`
                  : (createdGroupType === 'EXTERNAL_FUND' 
                      ? 'Ready to receive external non-member donations and disburse assistance.'
                      : 'Ready to receive member contributions and disburse assistance.')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
            >
              Add Another Group
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/app/groups/ledger?group_id=${createdGroupId}`)}
              leftIcon={<FileSpreadsheet className="w-3.5 h-3.5" />}
            >
              Group Ledger
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => navigate(`/app/groups/fund?group_id=${createdGroupId}`)}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Group Fund
            </Button>
          </div>
        </div>
      )}

      {/* Group Creation Form Card */}
      <Card
        title="Group Creation Form"
        subtitle="Minimal required fields philosophy: Enter the Group Name to create instantly."
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Primary Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Group Name *"
                  placeholder="e.g. General Welfare Fund, General Donation Fund"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                  * Required: Unique identifier for this accounting/fund group
                </p>
              </div>

              <div>
                <Select
                  label="Group Type *"
                  value={groupType}
                  onChange={(e) => setGroupType(e.target.value as GroupType)}
                  options={[
                    { value: 'MEMBER_FUND', label: 'Member Fund Group (Members & Monthly Dues)' },
                    { value: 'EXTERNAL_FUND', label: 'External Fund Group (External Donations Only)' },
                  ]}
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {groupType === 'MEMBER_FUND'
                    ? 'Allows member assignments and recurring monthly contributions.'
                    : 'Disables member assignment; receives external non-member donations.'}
                </p>
              </div>

              <Input
                label="Group Code / ID (Optional)"
                placeholder="Leave empty to auto-generate (e.g. GRP-001)"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />

              <div className="sm:col-span-2 p-4 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 space-y-3">
                <div className="flex items-center space-x-2">
                  <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Opening / Previous Balance (Optional)
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Input
                      label="Opening Balance (৳)"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(e.target.value)}
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Existing balance carried forward before using this system.
                    </p>
                  </div>

                  <div>
                    <Input
                      label="Opening Balance Effective Date"
                      type="date"
                      value={openingBalanceDate}
                      onChange={(e) => setOpeningBalanceDate(e.target.value)}
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Date when the opening balance was effective (defaults to today).
                    </p>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2">
                <Input
                  label="Physical Address / Area of Operation (Optional)"
                  placeholder="e.g. Section 10, Mirpur, Dhaka"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="sm:col-span-2">
                <Textarea
                  label="Group Description & Mandate (Optional)"
                  placeholder="Describe the mandate, target beneficiaries, or contribution rules of this group..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="sm:col-span-2">
                <Textarea
                  label="Internal Administrative Notes (Optional)"
                  placeholder="Any special notes or guidelines..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
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
              leftIcon={<FolderPlus className="w-4 h-4" />}
            >
              Create Group
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
