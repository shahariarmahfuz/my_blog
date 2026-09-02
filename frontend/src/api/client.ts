import axios from 'axios';
import {
  Group, GroupLedgerOut, GroupFundOut, Member, MemberLedgerOut, MemberApplication,
  MemberApplicationDetail, MemberApplicationSummaryCounts, PublicEligibleGroup,
  PublicApplicationSubmissionOut, PublicApplicationStatusOut,
  PublicFoundationInfo, PublicImpactMetrics, PublicStoryListItem, PublicStoryDetail,
  PublicAssistanceInquiryCreate, PublicAssistanceInquiryOut, PublicContactCreate, PublicContactOut,
  Beneficiary, BeneficiaryLedgerOut, Contribution, DueContributionOut, MonthlyContributionDueOut,
  MonthlyContributionSummaryOut, GenerateDuesResponse, ContributionLedgerOut, Assistance,
  QardHasanLedgerOut, SadaqahLedgerOut, Repayment, DashboardMetrics, AuditLog, User, Role,
  Permission, RepaymentPreview, AllSettings, SettingSectionResponse, MemberMonthsScheduleResponse,
  BrandingSettingsOut, PublicBrandingOut, YearlyMonthlySummaryResponse,
  Donation, DonationSummaryMetrics, DonationLedgerOut
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('foundation_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor: handle 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('foundation_token');
      localStorage.removeItem('foundation_user');
      // Only redirect to login if attempting to access private management routes
      if (window.location.pathname.startsWith('/app')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (data: { username: string; password: string; remember_me?: boolean }) =>
    apiClient.post<{ access_token: string; token_type: string; user: User; expires_in_days: number }>('/auth/login', data),
  getMe: () => apiClient.get<User>('/auth/me'),
  updateProfile: (data: { full_name?: string; phone?: string; email?: string }) =>
    apiClient.patch<User>('/auth/profile', data),
  uploadProfilePicture: (formData: FormData) =>
    apiClient.post<{ profile_picture: string; message: string }>('/auth/profile-picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  removeProfilePicture: () =>
    apiClient.delete<{ profile_picture: null; message: string }>('/auth/profile-picture'),
  changePassword: (data: { current_password: string; new_password: string; confirm_new_password?: string }) =>
    apiClient.post<{ message: string }>('/auth/change-password', data),
  logout: () => apiClient.post<{ message: string }>('/auth/logout'),
};

// Groups API
export const groupsApi = {
  list: (params?: { search?: string; is_active?: boolean }) => apiClient.get<Group[]>('/groups', { params }),
  get: (id: string) => apiClient.get<Group>(`/groups/${id}`),
  getNextCode: () => apiClient.get<{ next_group_code: string }>('/groups/next-code'),
  getBalance: (id: string) => apiClient.get<{ group_id: string; group_name: string; current_balance: number }>(`/groups/${id}/balance`),
  getLedger: (id: string) => apiClient.get<GroupLedgerOut>(`/groups/${id}/ledger`),
  getFund: (id: string) => apiClient.get<GroupFundOut>(`/groups/${id}/fund`),
  create: (data: any) => apiClient.post<Group>('/groups', data),
  update: (id: string, data: any) => apiClient.patch<Group>(`/groups/${id}`, data),
  adjustOpeningBalance: (id: string, data: { new_opening_balance: number; reason: string; effective_date?: string }) =>
    apiClient.post<Group>(`/groups/${id}/adjust-opening-balance`, data),
};

// Members API
export const membersApi = {
  list: (params?: { skip?: number; limit?: number; search?: string; group_id?: string; is_active?: boolean }) =>
    apiClient.get<Member[]>('/members', { params }),
  get: (id: string) => apiClient.get<Member>(`/members/${id}`),
  getNextCode: () => apiClient.get<{ next_member_code: string }>('/members/next-code'),
  getContributions: (id: string, params?: { skip?: number; limit?: number }) =>
    apiClient.get<Contribution[]>(`/members/${id}/contributions`, { params }),
  getLedger: (id: string) =>
    apiClient.get<MemberLedgerOut>(`/members/${id}/ledger`),
  create: (data: Partial<Member>) => apiClient.post<Member>('/members', data),
  update: (id: string, data: Partial<Member>) => apiClient.patch<Member>(`/members/${id}`, data),
};

// Public Website & Community Portal API
export const publicApi = {
  getFoundationInfo: () =>
    apiClient.get<PublicFoundationInfo>('/public/foundation'),
  getImpactMetrics: () =>
    apiClient.get<PublicImpactMetrics>('/public/impact'),
  getStories: (params?: { category?: string; assistance_type?: string }) =>
    apiClient.get<PublicStoryListItem[]>('/public/stories', { params }),
  getStory: (slug: string) =>
    apiClient.get<PublicStoryDetail>(`/public/stories/${slug}`),
  getEligibleGroups: () =>
    apiClient.get<PublicEligibleGroup[]>('/public/groups'),
  submitMemberApplication: (data: Partial<MemberApplication> & { applicant_name: string; proposed_group_id: string }) =>
    apiClient.post<PublicApplicationSubmissionOut>('/public/member-applications', data),
  checkApplicationStatus: (data: { application_code: string; verification_contact?: string }) =>
    apiClient.post<PublicApplicationStatusOut>('/public/member-applications/status', data),
  resubmitApplication: (application_code: string, data: Partial<MemberApplication> & { verification_contact?: string }) =>
    apiClient.post<PublicApplicationStatusOut>(`/public/member-applications/${application_code}/resubmit`, data),
  submitAssistanceInquiry: (data: PublicAssistanceInquiryCreate) =>
    apiClient.post<PublicAssistanceInquiryOut>('/public/assistance-requests', data),
  submitContact: (data: PublicContactCreate) =>
    apiClient.post<PublicContactOut>('/public/contact', data),
};

// Admin Member Applications Management API
export const memberApplicationsApi = {
  getSummary: () =>
    apiClient.get<MemberApplicationSummaryCounts>('/member-applications/summary'),
  list: (params?: { skip?: number; limit?: number; search?: string; status_filter?: string; group_id?: string }) =>
    apiClient.get<MemberApplication[]>('/member-applications', { params }),
  get: (id: string) =>
    apiClient.get<MemberApplicationDetail>(`/member-applications/${id}`),
  startReview: (id: string, data?: { admin_notes?: string }) =>
    apiClient.post<MemberApplicationDetail>(`/member-applications/${id}/review`, data || {}),
  requestChanges: (id: string, data: { change_request_message: string; admin_notes?: string }) =>
    apiClient.post<MemberApplicationDetail>(`/member-applications/${id}/request-changes`, data),
  reject: (id: string, data: { rejection_reason: string; admin_notes?: string }) =>
    apiClient.post<MemberApplicationDetail>(`/member-applications/${id}/reject`, data),
  accept: (id: string, data?: { assigned_group_id?: string; member_code?: string; admin_notes?: string }) =>
    apiClient.post<MemberApplicationDetail>(`/member-applications/${id}/accept`, data || {}),
};

// Beneficiaries API
export const beneficiariesApi = {
  list: (params?: { skip?: number; limit?: number; search?: string; group_id?: string; is_active?: boolean }) =>
    apiClient.get<Beneficiary[]>('/beneficiaries', { params }),
  get: (id: string) => apiClient.get<Beneficiary>(`/beneficiaries/${id}`),
  getNextCode: () => apiClient.get<{ next_beneficiary_code: string }>('/beneficiaries/next-code'),
  getAssistance: (id: string) => apiClient.get<Assistance[]>(`/beneficiaries/${id}/assistance`),
  getLedger: (id: string) =>
    apiClient.get<BeneficiaryLedgerOut>(`/beneficiaries/${id}/ledger`),
  create: (data: Partial<Beneficiary>) => apiClient.post<Beneficiary>('/beneficiaries', data),
  update: (id: string, data: Partial<Beneficiary>) => apiClient.patch<Beneficiary>(`/beneficiaries/${id}`, data),
  delete: (id: string) => apiClient.delete<{ message: string }>(`/beneficiaries/${id}`),
};

// Contributions API
export const contributionsApi = {
  list: (params?: { skip?: number; limit?: number; member_id?: string; group_id?: string; from_date?: string; to_date?: string; min_amount?: number; max_amount?: number; is_voided?: boolean; search?: string }) =>
    apiClient.get<Contribution[]>('/contributions', { params }),
  get: (id: string) => apiClient.get<Contribution>(`/contributions/${id}`),
  getDue: (params?: { month?: string; group_id?: string; member_id?: string; status_filter?: string; search?: string }) =>
    apiClient.get<MonthlyContributionDueOut[]>('/contributions/due', { params }),
  getSummary: (params?: { month?: string; group_id?: string }) =>
    apiClient.get<MonthlyContributionSummaryOut>('/contributions/summary', { params }),
  getMonthlySummary: (params?: { year?: number; group_id?: string; search?: string; page?: number; page_size?: number }) =>
    apiClient.get<YearlyMonthlySummaryResponse>('/contributions/monthly-summary', { params }),
  generateDues: (data: { month?: string; group_id?: string }) =>
    apiClient.post<GenerateDuesResponse>('/contributions/generate-dues', data),
  getLedger: (params?: { member_id?: string; group_id?: string; from_date?: string; to_date?: string }) =>
    apiClient.get<ContributionLedgerOut>('/contributions/ledger', { params }),
  getMemberSchedule: (memberId: string, params?: { start_year?: number; end_year?: number }) =>
    apiClient.get<MemberMonthsScheduleResponse>(`/contributions/member-schedule/${memberId}`, { params }),
  create: (data: any) => apiClient.post<Contribution>('/contributions', data),
  void: (id: string, data: { reason: string }) =>
    apiClient.post<Contribution>(`/contributions/${id}/void`, data),
  update: (id: string, data: Partial<Contribution>) =>
    apiClient.patch<Contribution>(`/contributions/${id}`, data),
};

// External Donations API
export const donationsApi = {
  list: (params?: { skip?: number; limit?: number; group_id?: string; from_date?: string; to_date?: string; min_amount?: number; max_amount?: number; is_voided?: boolean; search?: string }) =>
    apiClient.get<Donation[]>('/donations', { params }),
  get: (id: string) => apiClient.get<Donation>(`/donations/${id}`),
  create: (data: any) => apiClient.post<Donation>('/donations', data),
  update: (id: string, data: Partial<Donation>) => apiClient.patch<Donation>(`/donations/${id}`, data),
  void: (id: string, data: { reason: string }) => apiClient.post<Donation>(`/donations/${id}/void`, data),
  getMetrics: () => apiClient.get<DonationSummaryMetrics>('/donations/metrics'),
  getLedger: (params?: { group_id?: string; from_date?: string; to_date?: string }) =>
    apiClient.get<DonationLedgerOut>('/donations/ledger', { params }),
};

// Assistance API (Qard Hasan & Sadaqah)
export const assistanceApi = {
  list: (params?: { skip?: number; limit?: number; assistance_type?: string; status_filter?: string; beneficiary_id?: string; group_id?: string; from_date?: string; to_date?: string; search?: string }) =>
    apiClient.get<Assistance[]>('/assistance', { params }),
  get: (id: string) => apiClient.get<Assistance>(`/assistance/${id}`),
  getQHLedger: (params?: { beneficiary_id?: string; group_id?: string; from_date?: string; to_date?: string }) =>
    apiClient.get<QardHasanLedgerOut>('/assistance/qard-hasan/ledger', { params }),
  getSadaqahLedger: (params?: { beneficiary_id?: string; group_id?: string; from_date?: string; to_date?: string }) =>
    apiClient.get<SadaqahLedgerOut>('/assistance/sadaqah/ledger', { params }),
  create: (data: any) => apiClient.post<Assistance>('/assistance', data),
};

// Repayments API
export const repaymentsApi = {
  list: (params?: { skip?: number; limit?: number; assistance_id?: string; group_id?: string; from_date?: string; to_date?: string; search?: string }) =>
    apiClient.get<Repayment[]>('/repayments', { params }),
  getPreview: (assistance_id: string, amount: number) =>
    apiClient.get<RepaymentPreview>('/repayments/preview', { params: { assistance_id, amount } }),
  create: (data: any) => apiClient.post<Repayment>('/repayments', data),
};

// Dashboard API
export const dashboardApi = {
  getMetrics: () => apiClient.get<DashboardMetrics>('/dashboard'),
};

// Reports API
export const reportsApi = {
  getFinancial: (params?: { from_date?: string; to_date?: string }) =>
    apiClient.get('/reports/financial', { params }),
  getGroups: () => apiClient.get('/reports/groups'),
  getMembers: (params?: { group_id?: string }) => apiClient.get('/reports/members', { params }),
  getBeneficiaries: (params?: { group_id?: string }) => apiClient.get('/reports/beneficiaries', { params }),
  exportCsvUrl: (reportType: string, params?: Record<string, string>) => {
    const searchParams = new URLSearchParams(params);
    searchParams.set('report_type', reportType);
    return `${API_BASE_URL}/reports/export/csv?${searchParams.toString()}`;
  },
};

// Users API
export const usersApi = {
  list: () => apiClient.get<User[]>('/users'),
  get: (id: string) => apiClient.get<User>(`/users/${id}`),
  create: (data: any) => apiClient.post<User>('/users', data),
  update: (id: string, data: any) => apiClient.patch<User>(`/users/${id}`, data),
};

// Roles API
export const rolesApi = {
  list: () => apiClient.get<Role[]>('/roles'),
  get: (id: string) => apiClient.get<Role>(`/roles/${id}`),
  listPermissions: () => apiClient.get<Permission[]>('/roles/permissions'),
  create: (data: any) => apiClient.post<Role>('/roles', data),
  update: (id: string, data: any) => apiClient.patch<Role>(`/roles/${id}`, data),
  updatePermissions: (roleId: string, permissionIds: string[]) =>
    apiClient.put<Role>(`/roles/${roleId}/permissions`, { permission_ids: permissionIds }),
};

// Audit Logs API
export const auditLogsApi = {
  list: (params?: { skip?: number; limit?: number; action?: string; entity_name?: string }) =>
    apiClient.get<AuditLog[]>('/audit-logs', { params }),
};

// Settings API
export const settingsApi = {
  getAll: () => apiClient.get<AllSettings>('/settings'),
  getSection: <T = any>(section: string) => apiClient.get<SettingSectionResponse<T>>(`/settings/${section}`),
  updateSection: <T = any>(section: string, configData: T) =>
    apiClient.put<SettingSectionResponse<T>>(`/settings/${section}`, { config_data: configData }),
};

// Files & Documents Storage API (Cloudinary backed)
export const filesApi = {
  upload: (formData: FormData) =>
    apiClient.post<{ message: string; file: any }>('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  get: (fileId: string) => apiClient.get<any>(`/files/${fileId}`),
  listByEntity: (entityType: string, entityId: string) =>
    apiClient.get<{ total: number; items: any[] }>(`/files/entity/${entityType}/${entityId}`),
  delete: (fileId: string) => apiClient.delete<{ message: string }>(`/files/${fileId}`),
};

// Foundation Branding API
export const brandingApi = {
  getPublic: () => apiClient.get<PublicBrandingOut>('/public/branding'),
  getSettings: () => apiClient.get<BrandingSettingsOut>('/branding'),
  updateText: (data: { foundation_name?: string; tagline?: string }) =>
    apiClient.put<BrandingSettingsOut>('/branding', data),
  uploadAsset: (assetType: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('asset_type', assetType);
    return apiClient.post<BrandingSettingsOut>('/branding/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteAsset: (assetType: string) =>
    apiClient.delete<BrandingSettingsOut>(`/branding/asset/${assetType}`),
};

