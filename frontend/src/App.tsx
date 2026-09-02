import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from './components/public/PublicLayout';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';

// Public Pages
import { HomePage } from './pages/public/HomePage';
import { AboutPage } from './pages/public/AboutPage';
import { OurWorkPage } from './pages/public/OurWorkPage';
import { StoriesPage } from './pages/public/StoriesPage';
import { StoryDetailPage } from './pages/public/StoryDetailPage';
import { ImpactPage } from './pages/public/ImpactPage';
import { PublicGroupsPage } from './pages/public/PublicGroupsPage';
import { PublicMemberApplicationPage } from './pages/public/PublicMemberApplicationPage';
import { PublicApplicationStatusPage } from './pages/public/PublicApplicationStatusPage';
import { AssistanceApplyPage } from './pages/public/AssistanceApplyPage';
import { ContactPage } from './pages/public/ContactPage';

// Private App Pages
import { DashboardPage } from './pages/DashboardPage';
import { AddGroupPage } from './pages/AddGroupPage';
import { ManageGroupsPage } from './pages/ManageGroupsPage';
import { GroupLedgerPage } from './pages/GroupLedgerPage';
import { GroupFundPage } from './pages/GroupFundPage';
import { AddMemberPage } from './pages/AddMemberPage';
import { ManageMembersPage } from './pages/ManageMembersPage';
import { MemberProfilePage } from './pages/MemberProfilePage';
import { EditMemberPage } from './pages/EditMemberPage';
import { MemberLedgerPage } from './pages/MemberLedgerPage';
import { MemberApplicationsPage } from './pages/MemberApplicationsPage';
import { AddBeneficiaryPage } from './pages/AddBeneficiaryPage';
import { ManageBeneficiariesPage } from './pages/ManageBeneficiariesPage';
import { BeneficiaryLedgerPage } from './pages/BeneficiaryLedgerPage';
import { AddContributionPage } from './pages/AddContributionPage';
import { ManageContributionsPage } from './pages/ManageContributionsPage';
import { DueContributionsPage } from './pages/DueContributionsPage';
import { ContributionLedgerPage } from './pages/ContributionLedgerPage';
import { MonthlySummaryPage } from './pages/MonthlySummaryPage';

// External Donation Pages
import { AddDonationPage } from './pages/donations/AddDonationPage';
import { ManageDonationsPage } from './pages/donations/ManageDonationsPage';
import { DonationDetailPage } from './pages/donations/DonationDetailPage';
import { EditDonationPage } from './pages/donations/EditDonationPage';
import { DonationLedgerPage } from './pages/donations/DonationLedgerPage';
import { AddQardHasanPage } from './pages/AddQardHasanPage';
import { ManageQardHasanPage } from './pages/ManageQardHasanPage';
import { QardHasanLedgerPage } from './pages/QardHasanLedgerPage';
import { AddSadaqahPage } from './pages/AddSadaqahPage';
import { ManageSadaqahPage } from './pages/ManageSadaqahPage';
import { SadaqahLedgerPage } from './pages/SadaqahLedgerPage';
import { RepaymentsPage } from './pages/RepaymentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { UsersRolesPage } from './pages/UsersRolesPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { AccountSettingsPage } from './pages/AccountSettingsPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';

// Settings Sub-Pages
import { FoundationBrandingPage } from './pages/settings/FoundationBrandingPage';
import { GeneralSettingsPage } from './pages/settings/GeneralSettingsPage';
import { FoundationProfilePage } from './pages/settings/FoundationProfilePage';
import { UsersRolesSettingsPage } from './pages/settings/UsersRolesSettingsPage';
import { PermissionsMatrixPage } from './pages/settings/PermissionsMatrixPage';
import { FinancialSettingsPage } from './pages/settings/FinancialSettingsPage';
import { ContributionSettingsPage } from './pages/settings/ContributionSettingsPage';
import { AssistanceSettingsPage } from './pages/settings/AssistanceSettingsPage';
import { NotificationSettingsPage } from './pages/settings/NotificationSettingsPage';
import { SystemSettingsPage } from './pages/settings/SystemSettingsPage';

import { ThemeProvider } from './context/ThemeContext';
import { BrandingProvider } from './context/BrandingContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <BrandingProvider>
          <ToastProvider>
            <AuthProvider>
              <Routes>
              {/* ==================================================== */}
              {/* 1. PUBLIC WEBSITE ROUTES                             */}
              {/* ==================================================== */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/our-work" element={<OurWorkPage />} />
                <Route path="/assistance" element={<OurWorkPage />} />
                <Route path="/stories" element={<StoriesPage />} />
                <Route path="/stories/:slug" element={<StoryDetailPage />} />
                <Route path="/impact" element={<ImpactPage />} />
                <Route path="/groups" element={<PublicGroupsPage />} />
                <Route path="/member/apply" element={<PublicMemberApplicationPage />} />
                <Route path="/apply/member" element={<PublicMemberApplicationPage />} />
                <Route path="/apply" element={<Navigate to="/member/apply" replace />} />
                <Route path="/member/application-status" element={<PublicApplicationStatusPage />} />
                <Route path="/member-application/status" element={<PublicApplicationStatusPage />} />
                <Route path="/apply/status" element={<Navigate to="/member/application-status" replace />} />
                <Route path="/assistance/apply" element={<AssistanceApplyPage />} />
                <Route path="/contact" element={<ContactPage />} />
              </Route>

              {/* ==================================================== */}
              {/* 2. AUTHENTICATION ROUTES                             */}
              {/* ==================================================== */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<LoginPage />} />
              <Route path="/reset-password" element={<LoginPage />} />

              {/* ==================================================== */}
              {/* 3. PRIVATE MANAGEMENT SYSTEM (/app/*)               */}
              {/* ==================================================== */}
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<Navigate to="/app/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />

                {/* Groups */}
                <Route path="groups" element={<ManageGroupsPage />} />
                <Route path="groups/add" element={<AddGroupPage />} />
                <Route path="groups/manage" element={<ManageGroupsPage />} />
                <Route path="groups/ledger" element={<GroupLedgerPage />} />
                <Route path="groups/fund" element={<GroupFundPage />} />

                {/* Members */}
                <Route path="members" element={<ManageMembersPage />} />
                <Route path="members/add" element={<AddMemberPage />} />
                <Route path="members/manage" element={<ManageMembersPage />} />
                <Route path="members/ledger" element={<MemberLedgerPage />} />
                <Route path="members/applications" element={<MemberApplicationsPage />} />
                <Route path="members/:memberId" element={<MemberProfilePage />} />
                <Route path="members/:memberId/edit" element={<EditMemberPage />} />
                <Route path="members/:memberId/ledger" element={<MemberLedgerPage />} />

                {/* Beneficiaries */}
                <Route path="beneficiaries" element={<ManageBeneficiariesPage />} />
                <Route path="beneficiaries/add" element={<AddBeneficiaryPage />} />
                <Route path="beneficiaries/manage" element={<ManageBeneficiariesPage />} />
                <Route path="beneficiaries/ledger" element={<BeneficiaryLedgerPage />} />

                {/* Contributions */}
                <Route path="contributions" element={<ManageContributionsPage />} />
                <Route path="contributions/add" element={<AddContributionPage />} />
                <Route path="contributions/manage" element={<ManageContributionsPage />} />
                <Route path="contributions/due" element={<DueContributionsPage />} />
                <Route path="contributions/ledger" element={<ContributionLedgerPage />} />
                <Route path="contributions/monthly-summary" element={<MonthlySummaryPage />} />

                {/* External Donations */}
                <Route path="donations" element={<ManageDonationsPage />} />
                <Route path="donations/add" element={<AddDonationPage />} />
                <Route path="donations/manage" element={<ManageDonationsPage />} />
                <Route path="donations/ledger" element={<DonationLedgerPage />} />
                <Route path="donations/:id" element={<DonationDetailPage />} />
                <Route path="donations/:id/edit" element={<EditDonationPage />} />

                {/* Assistance */}
                <Route path="assistance" element={<ManageQardHasanPage />} />
                <Route path="assistance/qard-hasan/add" element={<AddQardHasanPage />} />
                <Route path="assistance/qard-hasan/manage" element={<ManageQardHasanPage />} />
                <Route path="assistance/qard-hasan/repayments" element={<RepaymentsPage />} />
                <Route path="assistance/qard-hasan/ledger" element={<QardHasanLedgerPage />} />
                <Route path="assistance/sadaqah/add" element={<AddSadaqahPage />} />
                <Route path="assistance/sadaqah/manage" element={<ManageSadaqahPage />} />
                <Route path="assistance/sadaqah/ledger" element={<SadaqahLedgerPage />} />

                {/* Reports & Audit */}
                <Route path="repayments" element={<RepaymentsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="audit-logs" element={<AuditLogsPage />} />
                <Route path="audit" element={<AuditLogsPage />} />
                <Route path="users-roles" element={<UsersRolesPage />} />

                {/* User Profile & Account Management */}
                <Route path="profile" element={<UserProfilePage />} />
                <Route path="account" element={<AccountSettingsPage />} />
                <Route path="account/change-password" element={<ChangePasswordPage />} />

                {/* Settings */}
                <Route path="settings" element={<Navigate to="/app/settings/branding" replace />} />
                <Route path="settings/branding" element={<FoundationBrandingPage />} />
                <Route path="settings/general" element={<GeneralSettingsPage />} />
                <Route path="settings/profile" element={<FoundationProfilePage />} />
                <Route path="settings/users-roles" element={<UsersRolesSettingsPage />} />
                <Route path="settings/permissions" element={<PermissionsMatrixPage />} />
                <Route path="settings/financial" element={<FinancialSettingsPage />} />
                <Route path="settings/contributions" element={<ContributionSettingsPage />} />
                <Route path="settings/assistance" element={<AssistanceSettingsPage />} />
                <Route path="settings/notifications" element={<NotificationSettingsPage />} />
                <Route path="settings/system" element={<SystemSettingsPage />} />
              </Route>

              {/* Convenience redirect for direct access to /dashboard */}
              <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
        </BrandingProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
