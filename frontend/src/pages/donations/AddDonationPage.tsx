import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { donationsApi, groupsApi } from '../../api/client';
import { Group, PaymentMethod } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card } from '../../components/ui/Card';
import { useToast } from '../../context/ToastContext';
import {
  HeartHandshake,
  Building2,
  CheckCircle2,
  ArrowRight,
  Wallet,
  Receipt,
  Phone,
  Mail,
  User,
  Calendar,
  CreditCard,
  FileText,
  AlertCircle
} from 'lucide-react';

export const AddDonationPage: React.FC = () => {
  const [donorName, setDonorName] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorAddress, setDonorAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [groupId, setGroupId] = useState('');
  const [donationDate, setDonationDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [purpose, setPurpose] = useState('General Donation');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const [externalGroups, setExternalGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createdDonation, setCreatedDonation] = useState<any | null>(null);

  const { success, error } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchExternalGroups = async () => {
      try {
        setLoadingGroups(true);
        const res = await groupsApi.list({ is_active: true });
        const filtered = res.data.filter((g) => g.group_type === 'EXTERNAL_FUND');
        setExternalGroups(filtered);
        if (filtered.length > 0) {
          setGroupId(filtered[0].id);
        }
      } catch (err) {
        error('Failed to load external fund groups');
      } finally {
        setLoadingGroups(false);
      }
    };
    fetchExternalGroups();
  }, []);

  const handleReset = () => {
    setDonorName('');
    setDonorPhone('');
    setDonorEmail('');
    setDonorAddress('');
    setAmount('');
    setDonationDate(new Date().toISOString().split('T')[0]);
    setPurpose('General Donation');
    setPaymentMethod('CASH');
    setReferenceNumber('');
    setNotes('');
    setCreatedDonation(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donorName.trim()) {
      error('Donor Full Name is required.');
      return;
    }
    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      error('Donation amount must be greater than zero.');
      return;
    }
    if (!groupId) {
      error('Please select an External Fund Group.');
      return;
    }

    setSaving(true);
    try {
      const res = await donationsApi.create({
        donor_name: donorName.trim(),
        donor_phone: donorPhone.trim() || undefined,
        donor_email: donorEmail.trim() || undefined,
        donor_address: donorAddress.trim() || undefined,
        amount: amtNum,
        group_id: groupId,
        donation_date: donationDate,
        purpose: purpose.trim() || 'General Donation',
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      success(`Donation of ৳${amtNum.toLocaleString()} recorded successfully! Receipt: ${res.data.receipt_number}`);
      setCreatedDonation(res.data);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to record external donation.';
      error(msg);
    } finally {
      setSaving(false);
    }
  };

  const selectedGroup = externalGroups.find((g) => g.id === groupId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <HeartHandshake className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            <span>Receive External Donation</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Record fund income from non-member donors directly into an External Fund Group.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => navigate('/app/donations/manage')}
            leftIcon={<Receipt className="w-4 h-4" />}
          >
            Manage Donations
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/app/donations/ledger')}
            leftIcon={<FileText className="w-4 h-4" />}
          >
            Donation Ledger
          </Button>
        </div>
      </div>

      {/* No External Groups Warning */}
      {!loadingGroups && externalGroups.length === 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200">
            <p className="font-bold">No External Fund Groups Found</p>
            <p className="mt-0.5 text-amber-700 dark:text-amber-400">
              External donations can only be deposited into <b>External Fund Groups</b> (which do not have members). Please create an External Fund Group first.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2.5"
              onClick={() => navigate('/app/groups/add')}
            >
              Create External Fund Group
            </Button>
          </div>
        </div>
      )}

      {/* Success Notification Banner */}
      {createdDonation && (
        <div className="p-5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-purple-600/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-purple-950 dark:text-purple-200 text-sm">
                Donation Receipt "{createdDonation.receipt_number}" Recorded!
              </h4>
              <p className="text-xs text-purple-700 dark:text-purple-400 mt-0.5">
                ৳{Number(createdDonation.amount).toLocaleString()} deposited into {createdDonation.group_name || 'External Fund'}. Immutable ledger entry created.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
            >
              Add Another Donation
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => navigate(`/app/donations/${createdDonation.id}`)}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              View Receipt
            </Button>
          </div>
        </div>
      )}

      {/* Donation Entry Form */}
      <Card
        title="Donation Details"
        subtitle="External donor records do NOT create members or affect member contribution tables."
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Donor Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
              <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Donor Information (External Non-Member)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Donor Full Name *"
                  placeholder="e.g. Abdullah Ahmed, Haji Abdul Karim, Al-Barakah Charity Foundation"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <Input
                label="Donor Phone Number (Optional)"
                type="tel"
                placeholder="e.g. +8801711223344"
                value={donorPhone}
                onChange={(e) => setDonorPhone(e.target.value)}
              />

              <Input
                label="Donor Email Address (Optional)"
                type="email"
                placeholder="donor@example.com"
                value={donorEmail}
                onChange={(e) => setDonorEmail(e.target.value)}
              />

              <div className="sm:col-span-2">
                <Input
                  label="Donor Address / City (Optional)"
                  placeholder="e.g. Gulshan-2, Dhaka"
                  value={donorAddress}
                  onChange={(e) => setDonorAddress(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 2. Financial & Fund Destination */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
              <Wallet className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Financial & Fund Group</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Donation Amount (৳) *"
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="e.g. 10000.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <div>
                <Select
                  label="Deposit to External Fund Group *"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  options={externalGroups.map((g) => ({
                    value: g.id,
                    label: `${g.name} ${g.code ? `(${g.code})` : ''} — Avail: ৳${Number(g.current_balance || 0).toLocaleString()}`,
                  }))}
                  required
                />
                {selectedGroup && (
                  <p className="text-[11px] text-purple-700 dark:text-purple-300 mt-1 font-medium">
                    Current Balance: ৳{Number(selectedGroup.current_balance || 0).toLocaleString()} • This donation will immediately increase the fund's available balance.
                  </p>
                )}
              </div>

              <div>
                <Input
                  label="Donation Date *"
                  type="date"
                  value={donationDate}
                  onChange={(e) => setDonationDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <Input
                  label="Purpose / Fund Category"
                  placeholder="e.g. General Donation, Zakat, Sadaqah Jariyah, Medical Relief"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </div>

              <div>
                <Select
                  label="Payment Method *"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  options={[
                    { value: 'CASH', label: 'Cash' },
                    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                    { value: 'MOBILE_BANKING', label: 'Mobile Banking (bKash / Nagad / Rocket)' },
                    { value: 'CHEQUE', label: 'Cheque' },
                    { value: 'OTHER', label: 'Other' },
                  ]}
                />
              </div>

              <div>
                <Input
                  label="Reference / Trx ID / Cheque No (Optional)"
                  placeholder="e.g. BKASH-9X87A6, TXN-098234, CHQ-10492"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                />
              </div>

              <div className="sm:col-span-2">
                <Textarea
                  label="Administrative Notes (Optional)"
                  placeholder="Any special remarks or instructions regarding this donation..."
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
              disabled={externalGroups.length === 0}
              leftIcon={<HeartHandshake className="w-4 h-4" />}
            >
              Receive Donation
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
