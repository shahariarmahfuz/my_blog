import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { donationsApi } from '../../api/client';
import { Donation } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Input';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import { BrandLogo } from '../../components/common/BrandLogo';
import {
  HeartHandshake,
  ArrowLeft,
  Printer,
  Edit2,
  RotateCcw,
  Receipt,
  Building2,
  Calendar,
  Wallet,
  CreditCard,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';

export const DonationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [donation, setDonation] = useState<Donation | null>(null);
  const [loading, setLoading] = useState(true);

  // Void Modal
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [savingVoid, setSavingVoid] = useState(false);

  const { success, error } = useToast();
  const { hasPermission } = useAuth();
  const { branding } = useBranding();
  const navigate = useNavigate();

  const loadDonation = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await donationsApi.get(id);
      setDonation(res.data);
    } catch (err: any) {
      error('Failed to load donation details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDonation();
  }, [id]);

  const handleConfirmVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donation) return;
    if (!voidReason.trim()) {
      error('Please provide a valid reason for voiding this donation.');
      return;
    }

    setSavingVoid(true);
    try {
      await donationsApi.void(donation.id, { reason: voidReason.trim() });
      success(`Donation receipt "${donation.receipt_number}" has been voided/reversed.`);
      setShowVoidModal(false);
      setVoidReason('');
      loadDonation();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to void donation.';
      error(msg);
    } finally {
      setSavingVoid(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: string | number | undefined) => {
    const num = Number(val || 0);
    return '৳' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Controls (Hidden on Print) */}
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Button
          variant="outline"
          onClick={() => navigate('/app/donations/manage')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to List
        </Button>

        <div className="flex items-center space-x-2">
          {!donation.is_voided && hasPermission('donations.edit') && (
            <Button
              variant="outline"
              onClick={() => navigate(`/app/donations/${donation.id}/edit`)}
              leftIcon={<Edit2 className="w-4 h-4" />}
            >
              Edit
            </Button>
          )}

          {!donation.is_voided && hasPermission('donations.void') && (
            <Button
              variant="outline"
              onClick={() => setShowVoidModal(true)}
              leftIcon={<RotateCcw className="w-4 h-4 text-rose-500" />}
            >
              Void Receipt
            </Button>
          )}

          <Button
            variant="primary"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Print Receipt
          </Button>
        </div>
      </div>

      {/* Void Alert Banner */}
      {donation.is_voided && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start space-x-3 print:border-rose-500">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900 dark:text-rose-200">
            <p className="font-bold">THIS DONATION RECEIPT IS VOIDED / CANCELLED</p>
            <p className="mt-0.5 text-rose-700 dark:text-rose-300">
              Reason: <i>{donation.void_reason || 'N/A'}</i>
            </p>
            {donation.voided_at && (
              <p className="text-[10px] text-rose-500 dark:text-rose-400 mt-0.5">
                Voided on {new Date(donation.voided_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Printable Receipt Paper Container */}
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-800 p-8 sm:p-10 shadow-lg relative print:border-0 print:shadow-none print:p-0">
        {/* Organization Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b-2 border-purple-600 dark:border-purple-500 gap-4">
          <div className="flex items-center space-x-3.5">
            <BrandLogo variant="preview" className="rounded-xl shadow-sm" />
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                {branding.foundation_name || 'Bhratritya Foundation'}
              </h2>
              <p className="text-xs text-purple-700 dark:text-purple-400 font-semibold tracking-wide">
                OFFICIAL DONATION MONEY RECEIPT
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300 font-mono font-extrabold text-xs">
              {donation.receipt_number}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Date: <b>{new Date(donation.donation_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</b>
            </p>
          </div>
        </div>

        {/* Receipt Content Body */}
        <div className="py-6 space-y-6">
          {/* Donor Information Box */}
          <div className="p-4 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 space-y-2">
            <p className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-400 tracking-wider">
              Received With Thanks From:
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {donation.donor_name}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {donation.donor_phone && <span>Phone: {donation.donor_phone}</span>}
                  {donation.donor_email && <span>Email: {donation.donor_email}</span>}
                  {donation.donor_address && <span>Address: {donation.donor_address}</span>}
                </div>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 text-[10px] font-bold">
                  External Supporter
                </span>
              </div>
            </div>
          </div>

          {/* Amount Box */}
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Donation Amount:
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-purple-600 dark:text-purple-400 font-mono mt-0.5">
                {formatCurrency(donation.amount)}
              </p>
            </div>

            <div className="text-left sm:text-right text-xs space-y-0.5">
              <p className="text-slate-500">Fund Destination:</p>
              <p className="font-bold text-slate-900 dark:text-white">{donation.group_name || 'External Fund'}</p>
              <p className="text-[10px] text-slate-400 font-mono">Code: {donation.group_code || 'N/A'}</p>
            </div>
          </div>

          {/* Detailed Transaction Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <span className="text-slate-400 text-[10px] uppercase font-semibold block">Purpose / Category</span>
              <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{donation.purpose || 'General Donation'}</span>
            </div>

            <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <span className="text-slate-400 text-[10px] uppercase font-semibold block">Payment Method</span>
              <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{donation.payment_method.replace('_', ' ')}</span>
            </div>

            <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <span className="text-slate-400 text-[10px] uppercase font-semibold block">Transaction / Ref #</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 block">{donation.reference_number || 'N/A'}</span>
            </div>
          </div>

          {donation.notes && (
            <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/30 text-xs">
              <span className="text-slate-400 text-[10px] uppercase font-semibold block">Remarks / Notes:</span>
              <p className="text-slate-700 dark:text-slate-300 mt-0.5 italic">{donation.notes}</p>
            </div>
          )}
        </div>

        {/* Official Signatures & Verification Footer */}
        <div className="pt-10 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-8 items-end">
          <div className="text-center">
            <div className="h-10 border-b border-dashed border-slate-400 dark:border-slate-600 mb-2"></div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">Authorized Signature</p>
            <p className="text-[10px] text-slate-400">Foundation Management</p>
          </div>

          <div className="text-center">
            <div className="h-10 border-b border-dashed border-slate-400 dark:border-slate-600 mb-2"></div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">Donor / Depositor</p>
            <p className="text-[10px] text-slate-400">{donation.donor_name}</p>
          </div>
        </div>

        {/* Audit Footer */}
        <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400 gap-2">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Verified Financial Audit Ledger Entry • Receipt: {donation.receipt_number}</span>
          </div>
          <span>Recorded: {new Date(donation.created_at).toLocaleString()}</span>
        </div>
      </div>

      {/* Void Modal */}
      <Modal
        isOpen={showVoidModal}
        onClose={() => setShowVoidModal(false)}
        title={`Void Donation: ${donation.receipt_number}`}
        subtitle="Perform an immutable reversing financial transaction in the ledger."
        maxWidth="md"
      >
        <form onSubmit={handleConfirmVoid} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs space-y-1.5">
            <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-300 font-bold">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Accounting Reversal Warning</span>
            </div>
            <p className="text-rose-600 dark:text-rose-400">
              Voiding this donation of <b>{formatCurrency(donation.amount)}</b> will create a reversing <b>DEBIT</b> entry and reduce the balance of <b>{donation.group_name}</b>.
            </p>
          </div>

          <Textarea
            label="Reason for Voiding * (Audit Logged)"
            placeholder="Explain why this donation receipt is being cancelled/reversed..."
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            required
            autoFocus
          />

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowVoidModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              isLoading={savingVoid}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              Confirm Void & Reversal
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
