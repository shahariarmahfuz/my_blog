import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { membersApi, groupsApi } from '../api/client';
import { Member, Contribution, Group } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  Users2,
  Building2,
  Edit2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  FileSpreadsheet,
  Shield,
  HeartHandshake,
  Paperclip,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  ArrowLeft,
  PiggyBank,
  Receipt,
  Download,
  ExternalLink,
  Clock,
  Briefcase,
  GraduationCap,
  Heart,
  Droplet,
  FileCheck2,
  AlertCircle
} from 'lucide-react';

export const MemberProfilePage: React.FC = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const { hasPermission } = useAuth();

  const [member, setMember] = useState<Member | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const loadMemberData = async () => {
    if (!memberId) return;
    try {
      setLoading(true);
      const [memberRes, contribsRes] = await Promise.all([
        membersApi.get(memberId),
        membersApi.getContributions(memberId, { limit: 10 }).catch(() => ({ data: [] as Contribution[] })),
      ]);
      setMember(memberRes.data);
      setContributions(contribsRes.data);
    } catch (err: any) {
      console.error('Failed to load member details:', err);
      const msg = err.response?.data?.detail || 'Member not found or failed to load profile.';
      error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemberData();
  }, [memberId]);

  const handleToggleStatus = async () => {
    if (!member) return;
    const nextStatus = !member.is_active;
    const confirmMsg = nextStatus
      ? `Are you sure you want to activate member "${member.name}"?`
      : `Are you sure you want to deactivate member "${member.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    setTogglingStatus(true);
    try {
      const res = await membersApi.update(member.id, { is_active: nextStatus });
      setMember(res.data);
      success(`Member status updated to ${nextStatus ? 'Active' : 'Inactive'}.`);
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to update member status.');
    } finally {
      setTogglingStatus(false);
    }
  };

  const formatCurrency = (val: string | number | undefined) => {
    const num = Number(val) || 0;
    return `৳${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'M';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2 text-slate-400 text-sm">
          <Link to="/app/members/manage" className="hover:text-slate-600 dark:hover:text-slate-200">Members</Link>
          <span>/</span>
          <span>Loading Profile...</span>
        </div>
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-500">Loading dedicated Member Profile...</p>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2 text-slate-400 text-sm">
          <Link to="/app/members/manage" className="hover:text-slate-600 dark:hover:text-slate-200">Members</Link>
          <span>/</span>
          <span>Not Found</span>
        </div>
        <Card>
          <div className="text-center py-16 space-y-4">
            <Users2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Member Not Found</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              We could not find any active or registered member with the identifier "{memberId}".
            </p>
            <Button variant="primary" onClick={() => navigate('/app/members/manage')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Member Directory
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Top Back Navigation & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => navigate('/app/members/manage')}
          className="inline-flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>← Back to Members Directory</span>
        </button>

        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <span>Foundation</span>
          <span>/</span>
          <Link to="/app/members/manage" className="hover:underline">Members</Link>
          <span>/</span>
          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{member.member_code || 'Profile'}</span>
        </div>
      </div>

      {/* Main Profile Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white shadow-xl relative overflow-hidden border border-slate-800">
        {/* Glow orb background */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Avatar & Key Identification */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <div className="relative flex-shrink-0">
              {member.photo_url ? (
                <img
                  src={member.photo_url}
                  alt={member.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-emerald-500/40 shadow-xl shadow-emerald-500/20"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-black text-3xl shadow-xl shadow-emerald-500/20">
                  {getInitials(member.name)}
                </div>
              )}
              <span
                className={`absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase shadow-md ${
                  member.is_active
                    ? 'bg-emerald-500 text-slate-950 ring-2 ring-slate-900'
                    : 'bg-rose-500 text-white ring-2 ring-slate-900'
                }`}
              >
                {member.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  {member.name}
                </h1>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-xl font-mono font-bold bg-white/10 text-emerald-300 border border-white/10">
                  ID: {member.member_code || 'M-UNSET'}
                </span>
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-white/10 text-slate-200 border border-white/10">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold">{member.group_name || 'No Fund Group'}</span>
                </span>
                {member.application_code && (
                  <span className="px-2.5 py-1 rounded-xl font-mono text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold" title="Originated from public application">
                    App Ref: {member.application_code}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-300 pt-1">
                {member.phone && (
                  <p className="flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{member.phone}</span>
                  </p>
                )}
                {member.email && (
                  <p className="flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{member.email}</span>
                  </p>
                )}
                <p className="flex items-center space-x-1.5 text-slate-400">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Joined: {formatDate(member.join_date)}</span>
                </p>
                <p className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                  <PiggyBank className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Due: {formatCurrency(member.monthly_contribution_amount || member.effective_monthly_contribution || 500)}/mo</span>
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start md:justify-end gap-2.5 pt-4 md:pt-0 border-t md:border-t-0 border-slate-800">
            {hasPermission('members.edit') && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/app/members/${member.member_code || member.id}/edit`)}
                leftIcon={<Edit2 className="w-4 h-4" />}
              >
                Edit Member
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/app/members/${member.member_code || member.id}/ledger`)}
              className="border-emerald-500/40 text-white hover:bg-emerald-500/20"
              leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
            >
              Member Ledger
            </Button>

            {hasPermission('contributions.create') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/app/contributions/add?member_id=${member.id}`)}
                className="border-slate-700 text-slate-200 hover:bg-slate-800"
                leftIcon={<PiggyBank className="w-4 h-4 text-emerald-400" />}
              >
                Record Contribution
              </Button>
            )}

            {hasPermission('members.edit') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleStatus}
                isLoading={togglingStatus}
                className={member.is_active ? 'text-rose-400 hover:bg-rose-950/40' : 'text-emerald-400 hover:bg-emerald-950/40'}
              >
                {member.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Contributions</span>
            <PiggyBank className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {formatCurrency(member.total_contributions)}
          </p>
          <p className="text-[11px] text-slate-400">Lifetime foundation contributions</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Receipts Count</span>
            <Receipt className="w-5 h-5 text-sky-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {member.contributions_count || 0}
          </p>
          <p className="text-[11px] text-slate-400">Total individual payments verified</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Last Contribution</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white truncate">
            {formatDate(member.last_contribution_date)}
          </p>
          <p className="text-[11px] text-slate-400">Most recent payment transaction</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Accounting Group</span>
            <Building2 className="w-5 h-5 text-teal-500" />
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-white truncate" title={member.group_name}>
            {member.group_name || 'Unassigned'}
          </p>
          <Link
            to={`/app/groups/fund?group_id=${member.group_id}`}
            className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center space-x-1"
          >
            <span>View Circle Funds</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Profile Details Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Personal & Verification Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Personal Information */}
          <Card
            title="1. Personal Information"
            subtitle="Official member identification and demographic records."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-xs">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Full Legal Name</p>
                <p className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">{member.name}</p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Member ID / Code</p>
                <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
                  {member.member_code || 'M-UNSET'}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Father's Name</p>
                <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{member.father_name || '—'}</p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Mother's Name</p>
                <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{member.mother_name || '—'}</p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Date of Birth</p>
                <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{formatDate(member.date_of_birth)}</p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Gender</p>
                <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{member.gender || '—'}</p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">National ID / Birth Certificate</p>
                <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {member.national_id || '—'}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Occupation / Workplace</p>
                <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{member.occupation || '—'}</p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Education / Degree</p>
                <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{member.education || '—'}</p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Blood Group</p>
                <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                  {member.blood_group ? (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800">
                      <Droplet className="w-3 h-3 text-rose-500" />
                      <span>{member.blood_group}</span>
                    </span>
                  ) : (
                    '—'
                  )}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Marital Status</p>
                <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{member.marital_status || '—'}</p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Primary Mobile Number</p>
                <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{member.phone || '—'}</p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Alternative Contact Number</p>
                <p className="font-mono text-slate-700 dark:text-slate-300 mt-0.5">{member.alternative_phone || '—'}</p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Email Address</p>
                <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{member.email || '—'}</p>
              </div>

              <div className="sm:col-span-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Present / Residential Address</p>
                <p className="text-slate-800 dark:text-slate-200 mt-0.5 leading-relaxed">
                  {member.present_address || member.address || '—'}
                </p>
              </div>

              <div className="sm:col-span-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Permanent / Village Address</p>
                <p className="text-slate-800 dark:text-slate-200 mt-0.5 leading-relaxed">
                  {member.permanent_address || '—'}
                </p>
              </div>
            </div>
          </Card>

          {/* 2. Emergency Contact & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card title="2. Emergency Contact" subtitle="Next of kin / trusted emergency reach.">
              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase">Contact Name</p>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {member.emergency_contact_name || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase">Relationship</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                    {member.emergency_contact_relation || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase">Contact Phone</p>
                  <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {member.emergency_contact_phone || member.emergency_contact || '—'}
                  </p>
                </div>
              </div>
            </Card>

            <Card title="3. Reference Person" subtitle="Existing foundation / group referee.">
              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase">Reference Name</p>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {member.reference_name || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase">Relationship</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                    {member.reference_relation || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase">Reference Phone</p>
                  <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {member.reference_phone || '—'}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* 4. Recent Contribution Receipts */}
          <Card
            title="Recent Contribution Receipts"
            subtitle="Verified payment transactions recorded under this member."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/app/members/${member.member_code || member.id}/ledger`)}
                leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />}
              >
                Full Ledger
              </Button>
            }
          >
            {contributions.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <PiggyBank className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p>No contribution payments recorded yet for this member.</p>
                {hasPermission('contributions.create') && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-3"
                    onClick={() => navigate(`/app/contributions/add?member_id=${member.id}`)}
                  >
                    Record First Contribution
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Receipt #</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {contributions.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                          {formatDate(c.contribution_date)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          {c.receipt_number}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                          {c.payment_method}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(c.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge variant={c.is_voided ? 'danger' : 'success'} size="sm">
                            {c.is_voided ? 'Voided' : 'Active'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right 1 Column: Documents, Commitment, System Info */}
        <div className="space-y-6">
          {/* 5. Documents & Attachments (Cloudinary backed) */}
          <Card
            title="Attached Documents"
            subtitle="Verified certificates & signatures."
          >
            <div className="space-y-4 text-xs">
              {/* Photo */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    {member.photo_url ? (
                      <img src={member.photo_url} alt="Photo" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Profile Photo</p>
                    <p className="text-[11px] text-slate-400">{member.photo_url ? 'Uploaded to Cloudinary' : 'Not Provided'}</p>
                  </div>
                </div>
                {member.photo_url && (
                  <a
                    href={member.photo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60"
                    title="View Full Size Photo"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>

              {/* Digital Signature */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                    {member.signature_url ? (
                      <img src={member.signature_url} alt="Signature" className="w-full h-full object-contain p-1 rounded-xl bg-white" />
                    ) : (
                      <FileCheck2 className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Member Signature</p>
                    <p className="text-[11px] text-slate-400">{member.signature_url ? 'Digital Signature on File' : 'Not Provided'}</p>
                  </div>
                </div>
                {member.signature_url && (
                  <a
                    href={member.signature_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/60"
                    title="View Signature"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>

              {/* National ID / Document */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                    <Paperclip className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
                      {member.document_type || 'NID Document'}
                    </p>
                    <p className="text-[11px] text-slate-400">{member.document_url ? 'Stored on Cloudinary' : 'No File Uploaded'}</p>
                  </div>
                </div>
                {member.document_url && (
                  <a
                    href={member.document_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/60"
                    title="Download/View Document"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </Card>

          {/* 6. Commitment & Declaration */}
          <Card
            title="Commitment & Terms"
            subtitle="Foundation compliance acknowledgment."
          >
            <div className="space-y-3 text-xs">
              <div className="flex items-center space-x-2">
                {member.commitment_accepted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                )}
                <span className="font-bold text-slate-900 dark:text-white">
                  {member.commitment_accepted
                    ? 'Accepted Constitution & Financial Bylaws'
                    : 'Formal Bylaw Acceptance Pending'}
                </span>
              </div>

              {member.reason_for_joining && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-bold text-slate-400 uppercase">Reason for Joining</p>
                  <p className="text-slate-700 dark:text-slate-300 mt-1 italic leading-relaxed">
                    "{member.reason_for_joining}"
                  </p>
                </div>
              )}

              {member.notes && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-bold text-slate-400 uppercase">Administrative Notes</p>
                  <p className="text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                    {member.notes}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* 7. System Audit Metadata */}
          <Card
            title="Audit & System Details"
            subtitle="Internal tracking record (Read-Only)."
          >
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Database UUID</span>
                <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-[130px]" title={member.id}>
                  {member.id}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Record Created</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {member.created_at ? new Date(member.created_at).toLocaleString() : 'N/A'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Last Updated</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {member.updated_at ? new Date(member.updated_at).toLocaleString() : 'N/A'}
                </span>
              </div>

              {member.application_code && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Member Application</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {member.application_code}
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
