import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { memberApplicationsApi, groupsApi } from '../api/client';
import {
  MemberApplication,
  MemberApplicationDetail,
  MemberApplicationSummaryCounts,
  Group
} from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input, Textarea } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  ClipboardList,
  Search,
  Eye,
  Building2,
  Calendar,
  Phone,
  Mail,
  UserCheck,
  Info,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Send,
  UserPlus,
  History,
  RotateCcw,
  Check,
  X,
  User,
  Paperclip,
  PenTool,
  Camera
} from 'lucide-react';

export const MemberApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<MemberApplication[]>([]);
  const [summary, setSummary] = useState<MemberApplicationSummaryCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Review Drawer / Modal State
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [appDetail, setAppDetail] = useState<MemberApplicationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Action Dialog States
  const [actionType, setActionType] = useState<'NONE' | 'REVIEW' | 'CHANGES' | 'REJECT' | 'ACCEPT'>('NONE');
  const [changeMessage, setChangeMessage] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [assignedGroupId, setAssignedGroupId] = useState('');
  const [acceptMemberCode, setAcceptMemberCode] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [groups, setGroups] = useState<Group[]>([]);

  const { success, error } = useToast();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const [listRes, summaryRes, groupsRes] = await Promise.all([
        memberApplicationsApi.list({
          search: search.trim() || undefined,
          status_filter: statusFilter !== 'ALL' ? statusFilter : undefined,
        }),
        memberApplicationsApi.getSummary(),
        groupsApi.list({ is_active: true }),
      ]);
      setApplications(listRes.data);
      setSummary(summaryRes.data);
      setGroups(groupsRes.data);
    } catch (err) {
      error('Failed to load member applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter]);

  const handleOpenDetail = async (id: string) => {
    setSelectedAppId(id);
    setLoadingDetail(true);
    try {
      const res = await memberApplicationsApi.get(id);
      setAppDetail(res.data);
      setAssignedGroupId(res.data.proposed_group_id || '');
    } catch (err) {
      error('Failed to load application details.');
      setSelectedAppId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleStartReview = async () => {
    if (!selectedAppId) return;
    setActionLoading(true);
    try {
      const res = await memberApplicationsApi.startReview(selectedAppId, { admin_notes: adminNotes || undefined });
      setAppDetail(res.data);
      success('Application marked as Under Review.');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to start review.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppId) return;
    if (!changeMessage.trim()) {
      error('Please enter the instructions or changes required from the applicant.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await memberApplicationsApi.requestChanges(selectedAppId, {
        change_request_message: changeMessage.trim(),
        admin_notes: adminNotes.trim() || undefined,
      });
      setAppDetail(res.data);
      setActionType('NONE');
      setChangeMessage('');
      setAdminNotes('');
      success('Change request sent. Application status updated to Changes Required.');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to request changes.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppId) return;
    if (!rejectionReason.trim()) {
      error('Please provide a reason for application rejection.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await memberApplicationsApi.reject(selectedAppId, {
        rejection_reason: rejectionReason.trim(),
        admin_notes: adminNotes.trim() || undefined,
      });
      setAppDetail(res.data);
      setActionType('NONE');
      setRejectionReason('');
      setAdminNotes('');
      success('Application has been rejected.');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to reject application.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppId) return;

    setActionLoading(true);
    try {
      const res = await memberApplicationsApi.accept(selectedAppId, {
        assigned_group_id: assignedGroupId || undefined,
        member_code: acceptMemberCode.trim() || undefined,
        admin_notes: adminNotes.trim() || undefined,
      });
      setAppDetail(res.data);
      setActionType('NONE');
      setAcceptMemberCode('');
      setAdminNotes('');
      success('Application accepted! Member record created and enrolled into the selected group.');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to accept application.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3 h-3 mr-1" />
            PENDING
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            <Search className="w-3 h-3 mr-1" />
            UNDER REVIEW
          </span>
        );
      case 'CHANGES_REQUIRED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            CHANGES REQ.
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            ACCEPTED
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            <XCircle className="w-3 h-3 mr-1" />
            REJECTED
          </span>
        );
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
          <ClipboardList className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-500 dark:text-indigo-400" />
          <span>Member Applications</span>
        </h1>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Applications</span>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {summary?.total_count || 0}
          </h3>
        </div>

        <div
          onClick={() => setStatusFilter('PENDING')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'PENDING'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Pending Review</span>
          <h3 className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {summary?.pending_count || 0}
          </h3>
        </div>

        <div
          onClick={() => setStatusFilter('UNDER_REVIEW')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'UNDER_REVIEW'
              ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider block">Under Review</span>
          <h3 className="text-xl font-black text-sky-600 dark:text-sky-400 mt-1">
            {summary?.under_review_count || 0}
          </h3>
        </div>

        <div
          onClick={() => setStatusFilter('CHANGES_REQUIRED')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'CHANGES_REQUIRED'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Changes Req.</span>
          <h3 className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {summary?.changes_required_count || 0}
          </h3>
        </div>

        <div
          onClick={() => setStatusFilter('ACCEPTED')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'ACCEPTED'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Accepted</span>
          <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {summary?.accepted_count || 0}
          </h3>
        </div>

        <div
          onClick={() => setStatusFilter('REJECTED')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'REJECTED'
              ? 'bg-slate-100 dark:bg-slate-800 border-slate-400 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Rejected</span>
          <h3 className="text-xl font-black text-slate-700 dark:text-slate-300 mt-1">
            {summary?.rejected_count || 0}
          </h3>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 w-full sm:w-auto overflow-x-auto">
          {['ALL', 'PENDING', 'UNDER_REVIEW', 'CHANGES_REQUIRED', 'ACCEPTED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {st === 'ALL'
                ? 'All'
                : st === 'PENDING'
                ? 'Pending'
                : st === 'UNDER_REVIEW'
                ? 'Under Review'
                : st === 'CHANGES_REQUIRED'
                ? 'Changes Req.'
                : st === 'ACCEPTED'
                ? 'Accepted'
                : 'Rejected'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search code, applicant name, phone, NID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Applications Table */}
      <Card bodyClassName="p-0">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-16 p-8">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Applications Found</h3>
            <p className="text-xs text-slate-500 mt-1">There are no member applications matching the selected criteria.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px] divide-y divide-slate-100 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 text-[11px] uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2 px-3 sm:px-3.5">Application ID</th>
                  <th className="py-2 px-3 sm:px-3.5">Applicant Name</th>
                  <th className="py-2 px-3 sm:px-3.5">Target Fund Circle</th>
                  <th className="py-2 px-3 sm:px-3.5">Contact</th>
                  <th className="py-2 px-3 sm:px-3.5">Submitted Date</th>
                  <th className="py-2 px-3 sm:px-3.5 text-center">Status</th>
                  <th className="py-2 px-3 sm:px-3.5 text-right">Review & Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {applications.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2 px-3 sm:px-3.5 font-mono font-bold text-slate-900 dark:text-white text-xs">
                      {app.application_code}
                    </td>
                    <td className="py-2 px-3 sm:px-3.5">
                      <p className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[150px]">{app.applicant_name}</p>
                      {app.occupation && (
                        <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{app.occupation}</p>
                      )}
                    </td>
                    <td className="py-2 px-3 sm:px-3.5">
                      <div className="flex items-center space-x-1 text-slate-600 dark:text-slate-400 text-xs">
                        <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="truncate max-w-[120px]">{app.proposed_group_name || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 sm:px-3.5 text-xs text-slate-500 dark:text-slate-400">
                      {app.phone && <p className="font-medium text-slate-700 dark:text-slate-300 text-[11px] font-mono">{app.phone}</p>}
                      {app.email && <p className="text-slate-400 text-[10px] truncate max-w-[120px]">{app.email}</p>}
                      {!app.phone && !app.email && <span className="text-slate-400 italic text-[11px]">No contact</span>}
                    </td>
                    <td className="py-2 px-3 sm:px-3.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                      {app.application_date}
                    </td>
                    <td className="py-2 px-3 sm:px-3.5 text-center">
                      {getStatusBadge(app.status)}
                    </td>
                    <td className="py-2 px-3 sm:px-3.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="py-1 px-2.5 text-xs"
                        onClick={() => handleOpenDetail(app.id)}
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Application Review & Decision Modal */}
      <Modal
        isOpen={!!selectedAppId}
        onClose={() => {
          setSelectedAppId(null);
          setAppDetail(null);
          setActionType('NONE');
        }}
        title={`Admissions Review: ${appDetail?.application_code || 'Loading...'}`}
        subtitle={`Applicant: ${appDetail?.applicant_name || ''}`}
        maxWidth="3xl"
      >
        {loadingDetail || !appDetail ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-6 text-xs max-h-[75vh] overflow-y-auto pr-2">
            {/* Status Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 gap-3">
              <div>
                <p className="text-slate-400 font-medium">Current Application Status</p>
                <div className="mt-1">{getStatusBadge(appDetail.status)}</div>
              </div>

              {appDetail.status === 'ACCEPTED' && appDetail.created_member_id && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAppId(null);
                    navigate(`/app/members/${appDetail.created_member_id}`);
                  }}
                  className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center space-x-2 transition-colors cursor-pointer text-left"
                  title="Open Dedicated Member Profile Page"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold underline">View Member Profile →</span>
                </button>
              )}
            </div>

            {/* 1. Personal Information */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center space-x-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                <User className="w-3.5 h-3.5 text-emerald-500" />
                <span>1. Personal Information</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-400">Full Name:</span>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{appDetail.applicant_name}</p>
                </div>
                <div>
                  <span className="text-slate-400">Target Fund Group:</span>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{appDetail.proposed_group_name}</p>
                </div>
                <div>
                  <span className="text-slate-400">Submission Date:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{appDetail.application_date}</p>
                </div>
                <div>
                  <span className="text-slate-400">Father's Name:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{appDetail.father_name || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Mother's Name:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{appDetail.mother_name || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Date of Birth:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{appDetail.date_of_birth ? String(appDetail.date_of_birth).split('T')[0] : '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Gender:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{appDetail.gender || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400">National ID / NID:</span>
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{appDetail.national_id || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Occupation:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{appDetail.occupation || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Education:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{appDetail.education || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Blood Group:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{appDetail.blood_group || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Marital Status:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{appDetail.marital_status || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Mobile Phone:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{appDetail.phone || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Alternative Mobile:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{appDetail.alternative_phone || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Email Address:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{appDetail.email || '—'}</p>
                </div>
              </div>

              {appDetail.present_address && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Present Address:</span>
                  <p className="text-slate-800 dark:text-slate-200">{appDetail.present_address}</p>
                </div>
              )}
              {appDetail.permanent_address && (
                <div className="pt-1">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Permanent Address:</span>
                  <p className="text-slate-800 dark:text-slate-200">{appDetail.permanent_address}</p>
                </div>
              )}
            </div>

            {/* 2. Emergency Contact */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center space-x-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                <Phone className="w-3.5 h-3.5 text-sky-500" />
                <span>2. Emergency Contact</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-400">Name:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{appDetail.emergency_contact_name || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Relation:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{appDetail.emergency_contact_relation || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Phone:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{appDetail.emergency_contact_phone || '—'}</p>
                </div>
              </div>
            </div>

            {/* 3. Reference */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center space-x-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                <UserCheck className="w-3.5 h-3.5 text-purple-500" />
                <span>3. Reference</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-400">Referee Name:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{appDetail.reference_name || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Relation:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{appDetail.reference_relation || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Phone:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{appDetail.reference_phone || '—'}</p>
                </div>
              </div>
            </div>

            {/* 4. Documents & Media */}
            {(appDetail.photo_url || appDetail.signature_url || appDetail.document_url || appDetail.document_back_url) && (
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center space-x-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                  <span>5. Documents & Verification Media</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {appDetail.photo_url && (
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Applicant Photo</span>
                      <img src={appDetail.photo_url} alt="Photo" className="w-16 h-16 rounded-lg object-cover mx-auto" />
                    </div>
                  )}
                  {appDetail.signature_url && (
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Signature</span>
                      <img src={appDetail.signature_url} alt="Signature" className="h-12 max-w-full mx-auto object-contain" />
                    </div>
                  )}
                  {appDetail.document_url && (
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center flex flex-col justify-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">ID Document Front</span>
                      <a href={appDetail.document_url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 font-bold underline text-[11px]">
                        View Document
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. Additional Info */}
            {(appDetail.reason_for_joining || appDetail.notes) && (
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center space-x-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <FileText className="w-3.5 h-3.5 text-teal-500" />
                  <span>6. Additional Information & Statement</span>
                </h4>
                {appDetail.reason_for_joining && (
                  <div>
                    <span className="text-slate-400 font-semibold">Reason for Joining:</span>
                    <p className="text-slate-800 dark:text-slate-200 mt-0.5">{appDetail.reason_for_joining}</p>
                  </div>
                )}
                {appDetail.notes && (
                  <div>
                    <span className="text-slate-400 font-semibold">Applicant Statement / Notes:</span>
                    <p className="text-slate-800 dark:text-slate-200 mt-0.5">{appDetail.notes}</p>
                  </div>
                )}
              </div>
            )}

            {appDetail.change_request_message && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300">
                <span className="font-bold">Pending Change Request Note:</span>
                <p className="mt-0.5 font-medium">"{appDetail.change_request_message}"</p>
              </div>
            )}

            {appDetail.rejection_reason && (
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                <span className="font-bold">Rejection Reason:</span>
                <p className="mt-0.5">"{appDetail.rejection_reason}"</p>
              </div>
            )}

            {/* Status Transition History & Timeline */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center space-x-1.5">
                <History className="w-4 h-4 text-emerald-500" />
                <span>Status Audit Trail & Timeline</span>
              </h4>

              <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 max-h-48 overflow-y-auto">
                {appDetail.status_history.map((h) => (
                  <div key={h.id} className="flex items-start justify-between py-2 border-b border-slate-200/60 dark:border-slate-800 last:border-0 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 dark:text-white">{h.action}</span>
                        <span className="px-1.5 py-0.2 text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-300">
                          {h.actor_type}
                        </span>
                      </div>
                      {h.note && <p className="text-slate-600 dark:text-slate-400 italic">{h.note}</p>}
                    </div>

                    <div className="text-right text-[11px] text-slate-400">
                      {new Date(h.created_at).toLocaleString()}
                      {h.changed_by_name && <p className="text-emerald-600 dark:text-emerald-400">{h.changed_by_name}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contextual Action Toolbar */}
            {appDetail.status !== 'ACCEPTED' && appDetail.status !== 'REJECTED' && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                {/* Action Trigger Buttons */}
                {actionType === 'NONE' && (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {appDetail.status !== 'UNDER_REVIEW' && hasPermission('members.edit') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleStartReview}
                        isLoading={actionLoading}
                        leftIcon={<Search className="w-4 h-4" />}
                      >
                        Start Review
                      </Button>
                    )}

                    {hasPermission('members.edit') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActionType('CHANGES')}
                        leftIcon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
                      >
                        Request Changes
                      </Button>
                    )}

                    {hasPermission('members.edit') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActionType('REJECT')}
                        className="text-rose-600 hover:text-rose-700 dark:text-rose-400"
                        leftIcon={<XCircle className="w-4 h-4 text-rose-500" />}
                      >
                        Reject
                      </Button>
                    )}

                    {hasPermission('members.create') && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setActionType('ACCEPT')}
                        leftIcon={<ShieldCheck className="w-4 h-4" />}
                      >
                        Accept Application & Enrol Member
                      </Button>
                    )}
                  </div>
                )}

                {/* Accept Dialog */}
                {actionType === 'ACCEPT' && (
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-4">
                    <h4 className="font-bold text-sm text-emerald-950 dark:text-emerald-200 flex items-center space-x-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      <span>Confirm Membership Acceptance</span>
                    </h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300">
                      This will create an active <b>Member</b> record for <b>{appDetail.applicant_name}</b> and permanently link it to application <b>{appDetail.application_code}</b>.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Select
                          label="Assigned Fund Group"
                          value={assignedGroupId}
                          onChange={(e) => setAssignedGroupId(e.target.value)}
                          required
                        >
                          {groups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name} {g.code ? `(${g.code})` : ''}
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div>
                        <Input
                          label="Member ID (Optional)"
                          placeholder="Leave empty to auto-generate"
                          value={acceptMemberCode}
                          onChange={(e) => setAcceptMemberCode(e.target.value)}
                        />
                      </div>

                      <div>
                        <Input
                          label="Administrative Notes (Optional)"
                          placeholder="Admissions memo..."
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActionType('NONE')}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleAccept}
                        isLoading={actionLoading}
                        leftIcon={<Check className="w-4 h-4" />}
                      >
                        Confirm Enrolment
                      </Button>
                    </div>
                  </div>
                )}

                {/* Request Changes Dialog */}
                {actionType === 'CHANGES' && (
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-4">
                    <h4 className="font-bold text-sm text-amber-950 dark:text-amber-200 flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      <span>Request Information Changes from Applicant</span>
                    </h4>
                    <Textarea
                      label="Instructions / Required Changes for Applicant *"
                      placeholder="Specify the missing or corrected details needed..."
                      value={changeMessage}
                      onChange={(e) => setChangeMessage(e.target.value)}
                      required
                    />

                    <div className="flex items-center justify-end space-x-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActionType('NONE')}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleRequestChanges}
                        isLoading={actionLoading}
                        leftIcon={<Send className="w-4 h-4" />}
                      >
                        Send Change Request
                      </Button>
                    </div>
                  </div>
                )}

                {/* Reject Dialog */}
                {actionType === 'REJECT' && (
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-4">
                    <h4 className="font-bold text-sm text-rose-950 dark:text-rose-200 flex items-center space-x-2">
                      <XCircle className="w-5 h-5 text-rose-600" />
                      <span>Reject Membership Application</span>
                    </h4>
                    <Textarea
                      label="Reason for Rejection *"
                      placeholder="Explain the reason for decision..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      required
                    />

                    <div className="flex items-center justify-end space-x-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActionType('NONE')}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={handleReject}
                        isLoading={actionLoading}
                        leftIcon={<X className="w-4 h-4" />}
                      >
                        Confirm Rejection
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
