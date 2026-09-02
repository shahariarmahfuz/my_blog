export type AssistanceType = 'QARD_HASAN' | 'SADAQAH';
export type AssistanceStatus = 'PENDING' | 'APPROVED' | 'DISBURSED' | 'ACTIVE' | 'COMPLETED' | 'DEFAULTED' | 'CANCELLED';
export type InstallmentStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'MOBILE_BANKING' | 'OTHER';
export type EntryType = 'CREDIT' | 'DEBIT';
export type TransactionType = 'CONTRIBUTION' | 'DONATION' | 'DONATION_VOID' | 'QARD_HASAN_DISBURSEMENT' | 'QARD_HASAN_REPAYMENT' | 'SADAQAH_DISBURSEMENT' | 'GROUP_TRANSFER' | 'ADJUSTMENT' | 'OPENING_BALANCE' | 'OPENING_BALANCE_ADJUSTMENT';
export type GroupType = 'MEMBER_FUND' | 'EXTERNAL_FUND';

export interface Donation {
  id: string;
  receipt_number: string;
  donor_name: string;
  donor_phone?: string;
  donor_email?: string;
  donor_address?: string;
  amount: string | number;
  group_id: string;
  group_name?: string;
  group_code?: string;
  donation_date: string;
  purpose?: string;
  payment_method: PaymentMethod;
  reference_number?: string;
  notes?: string;
  is_voided: boolean;
  void_reason?: string;
  voided_at?: string;
  voided_by?: string;
  creator_name?: string;
  voider_name?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DonationSummaryMetrics {
  total_donations_amount: string | number;
  total_donations_count: number;
  this_month_amount: string | number;
  active_funds_count: number;
}

export interface DonationLedgerEntryOut {
  id: string;
  receipt_number: string;
  donation_date: string;
  donor_name: string;
  donor_phone?: string;
  group_id: string;
  group_name: string;
  purpose?: string;
  amount: string | number;
  payment_method: string;
  reference_number?: string;
  is_voided: boolean;
  created_at: string;
}

export interface DonationLedgerOut {
  total_count: number;
  total_amount: string | number;
  entries: DonationLedgerEntryOut[];
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
  description?: string;
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  is_system: boolean;
  permissions?: Permission[];
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  full_name: string;
  phone?: string;
  profile_picture?: string;
  role_id?: string;
  role?: Role;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  name: string;
  code?: string;
  group_type?: GroupType;
  description?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  is_active: boolean;
  opening_balance?: string | number;
  opening_balance_date?: string;
  current_balance: string | number;
  available_balance?: string | number;
  members_count?: number;
  beneficiaries_count?: number;
  total_contributions?: string | number;
  total_donations?: string | number;
  total_qard_hasan_funded?: string | number;
  total_qard_hasan_repaid?: string | number;
  total_sadaqah_funded?: string | number;
  created_at: string;
  updated_at: string;
}

export interface GroupLedgerEntryOut {
  id: string;
  date: string;
  transaction_code: string;
  transaction_type: string;
  entry_type: 'CREDIT' | 'DEBIT' | string;
  amount: string | number;
  reference?: string;
  description?: string;
  running_balance: string | number;
}

export interface GroupLedgerOut {
  group_id: string;
  group_name: string;
  group_code?: string;
  current_balance: string | number;
  total_credits: string | number;
  total_debits: string | number;
  entries: GroupLedgerEntryOut[];
}

export interface GroupFundAllocationEntry {
  assistance_id: string;
  assistance_code: string;
  assistance_type: 'QARD_HASAN' | 'SADAQAH' | string;
  disbursement_date: string;
  beneficiary_id: string;
  beneficiary_name: string;
  total_assistance_amount: string | number;
  amount_funded_by_group: string | number;
  amount_recovered: string | number;
  remaining_receivable: string | number;
  purpose?: string;
  reference_number?: string;
}

export interface GroupFundOut {
  group_id: string;
  group_name: string;
  group_code?: string;
  current_balance: string | number;
  available_balance: string | number;
  total_contributions: string | number;
  total_qard_hasan_funded: string | number;
  total_qard_hasan_repaid: string | number;
  total_sadaqah_funded: string | number;
  net_qard_hasan_outstanding: string | number;
  allocations: GroupFundAllocationEntry[];
}

export interface Member {
  id: string;
  name: string;
  group_id: string;
  group_name?: string;
  member_code?: string;
  join_date?: string;
  monthly_contribution_amount?: string | number;
  effective_monthly_contribution?: string | number;
  is_active: boolean;

  // 1. Personal Information
  father_name?: string;
  mother_name?: string;
  date_of_birth?: string;
  gender?: string;
  national_id?: string;
  occupation?: string;
  education?: string;
  blood_group?: string;
  marital_status?: string;
  phone?: string;
  alternative_phone?: string;
  email?: string;
  address?: string;
  present_address?: string;
  permanent_address?: string;

  // 2. Emergency Contact
  emergency_contact?: string;
  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  emergency_contact_phone?: string;

  // 3. Reference
  reference_name?: string;
  reference_relation?: string;
  reference_phone?: string;

  // 4. Commitment
  commitment_accepted?: boolean;

  // 5. Documents
  photo_url?: string;
  signature_url?: string;
  document_type?: string;
  document_url?: string;

  // 6. Additional Information
  reason_for_joining?: string;
  notes?: string;

  total_contributions?: string | number;
  contributions_count?: number;
  last_contribution_date?: string;
  application_id?: string;
  application_code?: string;
  created_at: string;
  updated_at: string;
}

export interface MemberLedgerEntry {
  id: string;
  date: string;
  transaction_type: string;
  group_name: string;
  amount: string | number;
  payment_method?: string;
  receipt_number?: string;
  reference_number?: string;
  contribution_month?: string;
  months_count?: number;
  months_summary?: string;
  notes?: string;
  running_total: string | number;
}

export interface MemberLedgerOut {
  member_id: string;
  member_name: string;
  member_code?: string;
  group_id: string;
  group_name: string;
  is_active: boolean;
  monthly_contribution_amount?: string | number;
  effective_monthly_contribution?: string | number;
  total_contributions: string | number;
  contributions_count: number;
  first_contribution_date?: string;
  last_contribution_date?: string;
  entries: MemberLedgerEntry[];
  monthly_dues?: MonthlyContributionDueOut[];
}

export interface MemberApplicationStatusHistory {
  id: string;
  previous_status?: string;
  new_status: string;
  action: string;
  actor_type: string;
  changed_by_name?: string;
  note?: string;
  created_at: string;
}

export interface MemberApplication {
  id: string;
  application_code: string;
  applicant_name: string;
  proposed_group_id?: string;
  proposed_group_name?: string;

  // 1. Personal Information
  father_name?: string;
  mother_name?: string;
  date_of_birth?: string;
  gender?: string;
  national_id?: string;
  occupation?: string;
  education?: string;
  blood_group?: string;
  marital_status?: string;
  phone?: string;
  alternative_phone?: string;
  email?: string;
  address?: string;
  present_address?: string;
  permanent_address?: string;
  monthly_pledge?: string | number;

  // 2. Emergency Contact
  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  emergency_contact_phone?: string;

  // 3. Reference
  reference_name?: string;
  reference_relation?: string;
  reference_phone?: string;

  // 4. Commitment
  commitment_accepted?: boolean;

  // 5. Documents
  photo_url?: string;
  signature_url?: string;
  document_type?: string;
  document_url?: string;
  document_back_url?: string;

  // 6. Additional Information
  reason_for_joining?: string;
  notes?: string;

  application_date: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'CHANGES_REQUIRED' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | string;
  change_request_message?: string;
  rejection_reason?: string;
  admin_notes?: string;
  reviewed_by?: string;
  reviewer_name?: string;
  reviewed_at?: string;
  accepted_by?: string;
  acceptor_name?: string;
  accepted_at?: string;
  created_member_id?: string;
  created_at: string;
  updated_at: string;
}

export interface MemberApplicationDetail extends MemberApplication {
  status_history: MemberApplicationStatusHistory[];
}

export interface MemberApplicationSummaryCounts {
  total_count: number;
  pending_count: number;
  under_review_count: number;
  changes_required_count: number;
  accepted_count: number;
  rejected_count: number;
  cancelled_count: number;
}

export interface PublicEligibleGroup {
  id: string;
  name: string;
  code?: string;
  description?: string;
}

export interface PublicApplicationSubmissionOut {
  application_code: string;
  applicant_name: string;
  proposed_group_name: string;
  status: string;
  submitted_at: string;
  message: string;
}

export interface PublicApplicationStatusOut {
  application_code: string;
  status: string;
  submitted_at: string;
  last_updated_at: string;
  applicant_name: string;
  proposed_group_name: string;
  status_message: string;
  change_request_message?: string;
  rejection_reason?: string;
  can_resubmit: boolean;
  details?: Record<string, any>;
}

export interface PublicFoundationInfo {
  name: string;
  tagline: string;
  mission: string;
  vision: string;
  email: string;
  phone: string;
  address: string;
  operating_since: number;
  core_values: string[];
}

export interface PublicImpactMetrics {
  total_beneficiaries_served: number;
  total_assistance_disbursed: string | number;
  total_qard_hasan_disbursed: string | number;
  total_qard_hasan_recovered: string | number;
  total_sadaqah_disbursed: string | number;
  active_groups_count: number;
  active_members_count: number;
  repayment_recovery_rate: number;
  total_stories_published: number;
}

export interface PublicStoryListItem {
  id: string;
  title: string;
  slug: string;
  summary: string;
  category: string;
  assistance_type: string;
  location: string;
  impact_highlight?: string;
  cover_image?: string;
  read_time_minutes: number;
  published_date: string;
}

export interface PublicStoryDetail extends PublicStoryListItem {
  content: string;
  created_at: string;
  updated_at: string;
}

export interface PublicAssistanceInquiryCreate {
  full_name: string;
  phone: string;
  email?: string;
  district_or_city: string;
  assistance_type_needed: string;
  description: string;
}

export interface PublicAssistanceInquiryOut {
  inquiry_code: string;
  full_name: string;
  status: string;
  message: string;
}

export interface PublicContactCreate {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export interface PublicContactOut {
  message: string;
  received_at: string;
}

export interface Beneficiary {
  id: string;
  name: string;
  group_id: string;
  group_name?: string;
  beneficiary_code?: string;
  registration_date?: string;
  is_active: boolean;

  // 1. Personal Information
  father_or_husband_name?: string;
  date_of_birth?: string;
  gender?: string;
  national_id?: string;
  occupation?: string;
  education?: string;
  marital_status?: string;
  phone?: string;
  alternative_phone?: string;
  email?: string;
  address?: string;
  present_address?: string;
  permanent_address?: string;
  reason_for_assistance?: string;

  // 2. Emergency Contact
  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  emergency_contact_phone?: string;

  // 3. Documents
  photo_url?: string;
  signature_url?: string;
  document_type?: string;
  document_front_url?: string;
  document_back_url?: string;

  // 4. Additional Information
  family_members_count?: number;
  family_info?: string;
  financial_condition?: string;
  notes?: string;

  total_qard_hasan_received?: string | number;
  total_qard_hasan_repaid?: string | number;
  outstanding_qard_hasan?: string | number;
  total_sadaqah_received?: string | number;
  total_assistance_received?: string | number;
  created_at: string;
  updated_at: string;
}

export interface BeneficiaryLedgerEntry {
  id: string;
  date: string;
  transaction_type: string;
  code: string;
  description?: string;
  funding_groups: string[];
  disbursed_amount: string | number;
  repaid_amount: string | number;
  running_outstanding_loan: string | number;
}

export interface BeneficiaryLedgerOut {
  beneficiary_id: string;
  beneficiary_name: string;
  beneficiary_code?: string;
  group_id: string;
  group_name: string;
  is_active: boolean;
  total_qard_hasan_received: string | number;
  total_qard_hasan_repaid: string | number;
  outstanding_qard_hasan: string | number;
  total_sadaqah_received: string | number;
  total_assistance_received: string | number;
  entries: BeneficiaryLedgerEntry[];
}

export interface Contribution {
  id: string;
  receipt_number: string;
  member_id: string;
  member_name?: string;
  member_code?: string;
  group_id: string;
  group_name?: string;
  amount: string | number;
  contribution_date: string;
  contribution_month?: string;
  months_count?: number;
  months_summary?: string;
  months_covered?: string[];
  due_id?: string;
  payment_method: PaymentMethod;
  reference_number?: string;
  notes?: string;
  is_voided?: boolean;
  void_reason?: string;
  voided_at?: string;
  created_by_name?: string;
  created_at: string;
}

export interface MonthlyContributionDueOut {
  id: string;
  member_id: string;
  member_name: string;
  member_code?: string;
  group_id: string;
  group_name: string;
  phone?: string;
  email?: string;
  contribution_month: string;
  due_date: string;
  expected_amount: string | number;
  paid_amount: string | number;
  remaining_due: string | number;
  status: 'PAID' | 'PARTIAL' | 'DUE' | 'OVERDUE' | string;
  days_overdue: number;
  last_payment_date?: string;
  last_receipt_number?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type DueContributionOut = MonthlyContributionDueOut;

export interface MonthlyContributionSummaryOut {
  month: string;
  total_expected_due: string | number;
  total_collected: string | number;
  total_outstanding: string | number;
  collection_rate_percent: number;
  total_members_count: number;
  paid_count: number;
  partial_count: number;
  due_count: number;
  overdue_count: number;
}

export interface GenerateDuesResponse {
  month: string;
  generated_count: number;
  message: string;
  dues: MonthlyContributionDueOut[];
}

export interface ContributionLedgerEntryOut {
  id: string;
  date: string;
  receipt_number: string;
  member_id: string;
  member_name: string;
  member_code?: string;
  group_id: string;
  group_name: string;
  amount: string | number;
  payment_method: string;
  reference_number?: string;
  status: 'ACTIVE' | 'VOIDED' | string;
  transaction_code?: string;
  notes?: string;
  created_by_name?: string;
  created_at: string;
}

export interface ContributionLedgerOut {
  total_active_amount: string | number;
  total_voided_amount: string | number;
  total_contributions_count: number;
  entries: ContributionLedgerEntryOut[];
}

export interface MonthStatusOut {
  month_index: number;
  month_name: string;
  month_date: string;
  status: 'PAID' | 'CURRENT_PENDING' | 'DUE' | 'FUTURE_MONTH' | string;
  expected_amount: string | number;
  paid_amount: string | number;
  receipt_numbers: string[];
}

export interface MemberMonthlySummaryRow {
  member_id: string;
  member_code?: string;
  name: string;
  phone?: string;
  group_id: string;
  group_name: string;
  monthly_expected_amount: string | number;
  total_year_paid: string | number;
  total_year_expected: string | number;
  months: MonthStatusOut[];
}

export interface YearlyMonthlySummaryResponse {
  year: number;
  available_years: number[];
  total_members: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: MemberMonthlySummaryRow[];
}

export interface AssistanceFundingAllocation {
  id?: string;
  group_id: string;
  group_name?: string;
  allocated_amount: string | number;
  repaid_amount?: string | number;
  proportion_ratio?: string | number;
  remaining_receivable?: string | number;
}

export interface InstallmentSchedule {
  id: string;
  assistance_id: string;
  installment_number: number;
  due_date: string;
  amount: string | number;
  paid_amount: string | number;
  status: InstallmentStatus;
  paid_date?: string;
}

export interface Assistance {
  id: string;
  assistance_code: string;
  assistance_type: AssistanceType;
  beneficiary_id: string;
  beneficiary_name?: string;
  beneficiary_group_name?: string;
  total_amount: string | number;
  disbursement_date: string;
  status: AssistanceStatus;
  purpose?: string;
  notes?: string;
  installments_count?: number;
  installment_interval_months?: number;
  total_repaid: string | number;
  outstanding_amount: string | number;
  funding_allocations: AssistanceFundingAllocation[];
  installments: InstallmentSchedule[];
  created_by_name?: string;
  approved_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface RepaymentAllocation {
  id?: string;
  group_id: string;
  group_name?: string;
  allocated_amount: string | number;
  proportion_ratio?: string | number;
}

export interface Repayment {
  id: string;
  repayment_code: string;
  assistance_id: string;
  assistance_code?: string;
  beneficiary_name?: string;
  amount: string | number;
  payment_date: string;
  payment_method: PaymentMethod;
  reference_number?: string;
  notes?: string;
  allocations: RepaymentAllocation[];
  created_at: string;
}

export interface RepaymentPreviewAllocation {
  group_id: string;
  group_name: string;
  allocated_amount: string | number;
  proportion_ratio: string | number;
  original_funding_amount: string | number;
}

export interface RepaymentPreview {
  assistance_id: string;
  assistance_code: string;
  beneficiary_name: string;
  repayment_amount: string | number;
  current_outstanding: string | number;
  new_outstanding: string | number;
  allocations: RepaymentPreviewAllocation[];
}

export interface QHLedgerGroupBreakdown {
  group_id: string;
  group_name: string;
  allocated_amount: string | number;
  repaid_amount: string | number;
  remaining_receivable: string | number;
}

export interface QardHasanLedgerItemOut {
  id: string;
  date: string;
  entry_type: 'DISBURSEMENT' | 'REPAYMENT' | string;
  code: string;
  assistance_code?: string;
  beneficiary_id: string;
  beneficiary_name: string;
  amount: string | number;
  running_outstanding?: string | number;
  funding_groups: QHLedgerGroupBreakdown[];
  payment_method?: string;
  reference_number?: string;
  transaction_code?: string;
  purpose?: string;
  status: string;
  created_at: string;
}

export interface QardHasanLedgerOut {
  total_disbursed: string | number;
  total_repaid: string | number;
  net_outstanding: string | number;
  total_loans_count: number;
  entries: QardHasanLedgerItemOut[];
}

export interface SadaqahLedgerGroupBreakdown {
  group_id: string;
  group_name: string;
  allocated_amount: string | number;
}

export interface SadaqahLedgerItemOut {
  id: string;
  date: string;
  assistance_code: string;
  beneficiary_id: string;
  beneficiary_name: string;
  total_amount: string | number;
  funding_groups: SadaqahLedgerGroupBreakdown[];
  purpose?: string;
  notes?: string;
  transaction_code?: string;
  status: string;
  created_by_name?: string;
  created_at: string;
}

export interface SadaqahLedgerOut {
  total_sadaqah_distributed: string | number;
  total_beneficiaries_assisted: number;
  total_grants_count: number;
  entries: SadaqahLedgerItemOut[];
}

export interface LedgerEntry {
  id: string;
  group_id: string;
  group_name?: string;
  entry_type: EntryType;
  amount: string | number;
  description?: string;
  notes?: string;
  balance_after?: string | number;
  created_at: string;
}

export interface FinancialTransaction {
  id: string;
  transaction_code: string;
  transaction_type: TransactionType;
  transaction_date: string;
  total_amount: string | number;
  amount?: string | number;
  reference_id?: string;
  description?: string;
  created_by_name?: string;
  entries: LedgerEntry[];
  created_at: string;
}

export interface GroupBalanceSummary {
  group_id: string;
  group_name: string;
  group_code?: string;
  id?: string;
  name?: string;
  code?: string;
  balance: string | number;
  total_contributions: string | number;
  total_disbursed: string | number;
  total_repayments: string | number;
}

export interface OverdueInstallment {
  id: string;
  assistance_id: string;
  assistance_code: string;
  beneficiary_name: string;
  installment_number: number;
  due_date: string;
  amount: string | number;
  paid_amount: string | number;
  outstanding: string | number;
  days_overdue: number;
}

export interface DashboardMetrics {
  total_groups: number;
  total_members: number;
  total_beneficiaries: number;
  total_contributions: string | number;
  total_qard_hasan_disbursed: string | number;
  total_qard_hasan_repaid: string | number;
  outstanding_qard_hasan: string | number;
  total_sadaqah_disbursed: string | number;
  total_available_funds: string | number;
  pending_member_applications?: number;
  group_balances: GroupBalanceSummary[];
  recent_transactions: FinancialTransaction[];
  recent_assistance: Assistance[];
  overdue_installments: OverdueInstallment[];
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  action: string;
  entity_name: string;
  entity_id?: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface GeneralSettings {
  foundation_name: string;
  logo_url?: string;
  currency: string;
  timezone: string;
  date_format: string;
  language: string;
  theme_preference: string;
}

export interface FoundationProfile {
  foundation_name: string;
  tagline?: string;
  logo_url?: string;
  description?: string;
  registration_number?: string;
  established_year?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  tax_id?: string;
}

export interface FinancialSettings {
  currency_code: string;
  currency_symbol: string;
  decimal_precision: number;
  rounding_mode: string;
  fiscal_year_start: string;
  fiscal_year_end: string;
  receipt_prefix_contribution: string;
  receipt_prefix_qard_hasan: string;
  receipt_prefix_sadaqah: string;
  receipt_prefix_repayment: string;
  strict_double_entry_enforcement: boolean;
}

export interface ContributionSettings {
  default_monthly_contribution?: number;
  default_frequency: string;
  monthly_due_day: number;
  grace_period_days: number;
  overdue_threshold_days: number;
  allow_partial_contributions: boolean;
  require_receipt_reference: boolean;
  auto_receipt_generation: boolean;
}

export interface AssistanceSettings {
  qard_hasan_interest_rate: number;
  qard_hasan_max_tenure_months: number;
  default_installments_count: number;
  default_installment_interval: number;
  allow_multi_group_funding: boolean;
  require_guarantor: boolean;
  sadaqah_categories: string[];
  sadaqah_is_recoverable: boolean;
}

export interface NotificationSettings {
  notify_due_contributions: boolean;
  notify_overdue_repayments: boolean;
  notify_disbursements: boolean;
  email_notifications_enabled: boolean;
  sms_notifications_enabled: boolean;
  sender_email?: string;
  admin_alert_email?: string;
}

export interface SystemInfoSettings {
  system_name: string;
  version: string;
  maintenance_mode: boolean;
  audit_logging_enabled: boolean;
  session_timeout_minutes: number;
  backup_frequency: string;
  last_backup_timestamp?: string;
  database_engine?: string;
  backend_framework?: string;
}

export interface AllSettings {
  general: GeneralSettings;
  profile: FoundationProfile;
  financial: FinancialSettings;
  contributions: ContributionSettings;
  assistance: AssistanceSettings;
  notifications: NotificationSettings;
  system: SystemInfoSettings;
}

export interface SettingSectionResponse<T = any> {
  section: string;
  config_data: T;
  updated_at?: string;
  updated_by?: string;
}

// Multi-month contribution schedule types
export interface MonthScheduleItem {
  month: string;
  month_str: string;
  month_label: string;
  short_label: string;
  year: number;
  month_num: number;
  expected_amount: string | number;
  paid_amount: string | number;
  remaining_due: string | number;
  status: string;
  is_paid: boolean;
  is_overdue: boolean;
  is_current: boolean;
  is_future: boolean;
  is_advance_paid: boolean;
  due_date: string;
}

export interface MemberMonthsScheduleResponse {
  member_id: string;
  member_name: string;
  monthly_pledge: string | number;
  current_month: string;
  unpaid_months_count: number;
  unpaid_total_due: string | number;
  months: MonthScheduleItem[];
}

// Foundation Branding Types
export interface BrandingAssetInfo {
  url?: string;
  public_id?: string;
  filename?: string;
  filesize?: number;
}

export interface BrandingSettingsOut {
  foundation_name: string;
  tagline: string;
  logo: BrandingAssetInfo;
  favicon: BrandingAssetInfo;
  apple_touch_icon: BrandingAssetInfo;
  login_logo: BrandingAssetInfo;
  public_logo: BrandingAssetInfo;
  logo_url?: string;
  favicon_url?: string;
  apple_touch_icon_url?: string;
  login_logo_url?: string;
  public_logo_url?: string;
  updated_at?: string;
}

export interface PublicBrandingOut {
  foundation_name: string;
  tagline: string;
  logo_url?: string;
  favicon_url?: string;
  apple_touch_icon_url?: string;
  login_logo_url?: string;
  public_logo_url?: string;
  updated_at?: string;
}


