import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { publicApi } from '../../api/client';
import { PublicApplicationStatusOut } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../context/ToastContext';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileEdit,
  Building2,
  Calendar,
  ShieldCheck,
  Send,
  UserPlus
} from 'lucide-react';

export const PublicApplicationStatusPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [appCode, setAppCode] = useState(searchParams.get('code') || '');
  const [verificationContact, setVerificationContact] = useState(searchParams.get('contact') || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PublicApplicationStatusOut | null>(null);

  // Resubmission state for CHANGES_REQUIRED
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editOccupation, setEditOccupation] = useState('');
  const [editNid, setEditNid] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [resubmitting, setResubmitting] = useState(false);

  const { success, error } = useToast();

  // Auto-search if code provided in URL
  useEffect(() => {
    const code = searchParams.get('code');
    const contact = searchParams.get('contact') || '';
    if (code) {
      handleCheck(code, contact);
    }
  }, []);

  const handleCheck = async (codeToQuery?: string, contactToQuery?: string) => {
    const code = (codeToQuery || appCode).trim().toUpperCase();
    const contact = (contactToQuery !== undefined ? contactToQuery : verificationContact).trim();

    if (!code) {
      error('Please enter your Application ID.');
      return;
    }

    setLoading(true);
    try {
      const res = await publicApi.checkApplicationStatus({
        application_code: code,
        verification_contact: contact || undefined,
      });
      setResult(res.data);
      if (res.data.details) {
        setEditName(res.data.details.applicant_name || '');
        setEditPhone(res.data.details.phone || '');
        setEditEmail(res.data.details.email || '');
        setEditAddress(res.data.details.address || '');
        setEditDob(res.data.details.date_of_birth || '');
        setEditOccupation(res.data.details.occupation || '');
        setEditNid(res.data.details.national_id || '');
        setEditNotes(res.data.details.notes || '');
      }
    } catch (err: any) {
      setResult(null);
      const msg = err.response?.data?.detail || 'Application not found. Please verify your Application ID.';
      error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!result) return;

    setResubmitting(true);
    try {
      const res = await publicApi.resubmitApplication(result.application_code, {
        verification_contact: verificationContact,
        applicant_name: editName.trim() || undefined,
        phone: editPhone.trim() || undefined,
        email: editEmail.trim() || undefined,
        address: editAddress.trim() || undefined,
        date_of_birth: editDob || undefined,
        occupation: editOccupation.trim() || undefined,
        national_id: editNid.trim() || undefined,
        notes: editNotes.trim() || undefined,
      });

      success('Updated application details submitted successfully!');
      setResult(res.data);
      setIsEditing(false);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to resubmit application updates.';
      error(msg);
    } finally {
      setResubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5 mr-1" />
            PENDING REVIEW
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            <Search className="w-3.5 h-3.5 mr-1" />
            UNDER ACTIVE REVIEW
          </span>
        );
      case 'CHANGES_REQUIRED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <AlertTriangle className="w-3.5 h-3.5 mr-1" />
            CHANGES REQUIRED
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            MEMBERSHIP APPROVED
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            <XCircle className="w-3.5 h-3.5 mr-1" />
            APPLICATION NOT APPROVED
          </span>
        );
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Page Header / Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Badge variant="success">Membership Status Portal</Badge>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Track Your Membership Application
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Enter your Application ID and verification detail to check your current application status.
          </p>
        </div>

        <div>
          <Link
            to="/member/apply"
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>New Application</span>
          </Link>
        </div>
      </div>

      {/* Status Search Card */}
      <Card
        title="Check Application Status"
        subtitle="Provide your unique Application ID (e.g. MA-XXXXXXXX) received upon submission."
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Application ID / Status Code *"
              placeholder="e.g. MA-8F4K2P7X"
              value={appCode}
              onChange={(e) => setAppCode(e.target.value.toUpperCase())}
              autoFocus
            />

            <Input
              label="Verification Contact (Optional: Phone, Email, or Name)"
              placeholder="e.g. +88017... or email@example.com"
              value={verificationContact}
              onChange={(e) => setVerificationContact(e.target.value)}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              onClick={() => handleCheck()}
              isLoading={loading}
              leftIcon={<Search className="w-4 h-4" />}
            >
              Check Application Status
            </Button>
          </div>
        </div>
      </Card>

      {/* Status Result Display */}
      {result && (
        <div className="space-y-6 animate-fadeIn">
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
            {/* Header Status Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800 gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Application ID
                  </span>
                  <span className="text-lg font-mono font-black text-slate-900 dark:text-white">
                    {result.application_code}
                  </span>
                </div>
                <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-1">
                  {result.applicant_name}
                </p>
              </div>

              <div>
                {getStatusBadge(result.status)}
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/70 dark:border-slate-800">
                <div className="flex items-center space-x-2 text-slate-400 mb-1">
                  <Building2 className="w-4 h-4 text-emerald-500" />
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Applied Fund Group</span>
                </div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  {result.proposed_group_name}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/70 dark:border-slate-800">
                <div className="flex items-center space-x-2 text-slate-400 mb-1">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Submission Date</span>
                </div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  {new Date(result.submitted_at).toLocaleDateString()}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/70 dark:border-slate-800">
                <div className="flex items-center space-x-2 text-slate-400 mb-1">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Last Updated</span>
                </div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  {new Date(result.last_updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Status Explanation Message */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850/80 border border-slate-200 dark:border-slate-750 text-xs leading-relaxed">
              <p className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                Status Overview
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                {result.status_message}
              </p>
            </div>

            {/* Changes Required Notice & Resubmission Trigger */}
            {result.status === 'CHANGES_REQUIRED' && (
              <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 space-y-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-rose-950 dark:text-rose-200 text-sm">
                      Action Required: Admissions Committee Change Request
                    </h4>
                    <p className="text-xs text-rose-800 dark:text-rose-300 mt-1 bg-white/70 dark:bg-slate-900/60 p-3 rounded-xl border border-rose-200 dark:border-rose-800 font-medium">
                      "{result.change_request_message}"
                    </p>
                  </div>
                </div>

                {!isEditing && (
                  <div className="flex justify-end">
                    <Button
                      variant="primary"
                      onClick={() => setIsEditing(true)}
                      leftIcon={<FileEdit className="w-4 h-4" />}
                    >
                      Update & Resubmit Application
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Rejection Notice */}
            {result.status === 'REJECTED' && result.rejection_reason && (
              <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Admissions Decision Note:
                </h4>
                <p className="text-slate-600 dark:text-slate-300">
                  "{result.rejection_reason}"
                </p>
              </div>
            )}

            {/* Accepted Celebration Notice */}
            {result.status === 'ACCEPTED' && (
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-950 dark:text-emerald-200 flex items-start space-x-3">
                <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <div>
                  <h4 className="font-extrabold text-sm">
                    Membership Enrolment Complete
                  </h4>
                  <p className="text-emerald-800 dark:text-emerald-300 mt-0.5">
                    Your application has been formally approved and your member record has been activated in the {result.proposed_group_name} fund group.
                  </p>
                </div>
              </div>
            )}

            {/* Resubmission Form */}
            {isEditing && result.status === 'CHANGES_REQUIRED' && (
              <Card
                title="Update & Correct Application"
                subtitle="Make the requested adjustments below and resubmit for administrative review."
              >
                <form onSubmit={handleResubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Full Legal Name *"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />

                    <Input
                      label="Phone Number (Optional)"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                    />

                    <Input
                      label="Email Address (Optional)"
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                    />

                    <Input
                      label="National ID / NID (Optional)"
                      value={editNid}
                      onChange={(e) => setEditNid(e.target.value)}
                    />

                    <Input
                      label="Occupation (Optional)"
                      value={editOccupation}
                      onChange={(e) => setEditOccupation(e.target.value)}
                    />

                    <Input
                      label="Date of Birth (Optional)"
                      type="date"
                      value={editDob}
                      onChange={(e) => setEditDob(e.target.value)}
                    />

                    <div className="sm:col-span-2">
                      <Input
                        label="Address (Optional)"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Textarea
                        label="Response Notes / Additional Information (Optional)"
                        placeholder="Provide details addressing the requested changes..."
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={resubmitting}
                      leftIcon={<Send className="w-4 h-4" />}
                    >
                      Resubmit Application
                    </Button>
                  </div>
                </form>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
