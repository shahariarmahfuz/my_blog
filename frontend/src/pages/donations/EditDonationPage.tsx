import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { donationsApi } from '../../api/client';
import { Donation, PaymentMethod } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card } from '../../components/ui/Card';
import { useToast } from '../../context/ToastContext';
import {
  Edit2,
  ArrowLeft,
  Receipt,
  HeartHandshake,
  User,
  Wallet,
  Save,
  AlertCircle
} from 'lucide-react';

export const EditDonationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [donation, setDonation] = useState<Donation | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [donorName, setDonorName] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorAddress, setDonorAddress] = useState('');
  const [purpose, setPurpose] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const { success, error } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    const fetchDonation = async () => {
      try {
        setLoading(true);
        const res = await donationsApi.get(id);
        const d = res.data;
        setDonation(d);
        setDonorName(d.donor_name || '');
        setDonorPhone(d.donor_phone || '');
        setDonorEmail(d.donor_email || '');
        setDonorAddress(d.donor_address || '');
        setPurpose(d.purpose || '');
        setPaymentMethod(d.payment_method || 'CASH');
        setReferenceNumber(d.reference_number || '');
        setNotes(d.notes || '');
      } catch (err: any) {
        error('Failed to load donation for editing.');
      } finally {
        setLoading(false);
      }
    };
    fetchDonation();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!donorName.trim()) {
      error('Donor Full Name is required.');
      return;
    }

    setSaving(true);
    try {
      await donationsApi.update(id, {
        donor_name: donorName.trim(),
        donor_phone: donorPhone.trim() || undefined,
        donor_email: donorEmail.trim() || undefined,
        donor_address: donorAddress.trim() || undefined,
        purpose: purpose.trim() || 'General Donation',
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      success(`Donation receipt "${donation?.receipt_number}" updated successfully.`);
      navigate(`/app/donations/${id}`);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update donation.';
      error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!donation) {
    return (
      <div className="text-center py-16 p-8">
        <Receipt className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Donation Receipt Not Found</h3>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => navigate('/app/donations/manage')}
          leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        >
          Back to Manage Donations
        </Button>
      </div>
    );
  }

  if (donation.is_voided) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cannot Edit Voided Receipt</h3>
        <p className="text-xs text-slate-500">This donation receipt was voided and is preserved for accounting audit history.</p>
        <Button
          variant="outline"
          onClick={() => navigate(`/app/donations/${donation.id}`)}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          View Receipt Details
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <Edit2 className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            <span>Edit Donation: {donation.receipt_number}</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Update donor contact information, purpose, reference number, or administrative remarks.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => navigate(`/app/donations/${donation.id}`)}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Cancel
        </Button>
      </div>

      {/* Static Financial Info Pill */}
      <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div>
          <span className="text-slate-500">Fund Destination:</span>{' '}
          <span className="font-bold text-slate-900 dark:text-white">{donation.group_name}</span>
        </div>
        <div>
          <span className="text-slate-500">Donation Amount:</span>{' '}
          <span className="font-bold text-purple-700 dark:text-purple-300 font-mono text-sm">
            ৳{Number(donation.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div>
          <span className="text-slate-500">Date:</span>{' '}
          <span className="font-bold text-slate-900 dark:text-white">{donation.donation_date}</span>
        </div>
      </div>

      {/* Edit Form */}
      <Card
        title="Donor & Transaction Metadata"
        subtitle="Financial amount and fund destination are fixed to maintain ledger integrity."
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
              <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Donor Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Donor Full Name *"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  required
                />
              </div>

              <Input
                label="Donor Phone Number (Optional)"
                type="tel"
                value={donorPhone}
                onChange={(e) => setDonorPhone(e.target.value)}
              />

              <Input
                label="Donor Email Address (Optional)"
                type="email"
                value={donorEmail}
                onChange={(e) => setDonorEmail(e.target.value)}
              />

              <div className="sm:col-span-2">
                <Input
                  label="Donor Address (Optional)"
                  value={donorAddress}
                  onChange={(e) => setDonorAddress(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
              <Wallet className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Transaction Metadata</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Purpose / Fund Category"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </div>

              <div>
                <Select
                  label="Payment Method"
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

              <div className="sm:col-span-2">
                <Input
                  label="Reference / Trx ID / Cheque No (Optional)"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                />
              </div>

              <div className="sm:col-span-2">
                <Textarea
                  label="Administrative Notes (Optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/app/donations/${donation.id}`)}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              isLoading={saving}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
