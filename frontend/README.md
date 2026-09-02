# Frontend — Foundation & Financial Management System

A high-performance Single Page Application (SPA) built with **React 18**, **TypeScript 5**, **Vite 5**, and **Tailwind CSS**. It provides a portal for public visitors and a dashboard for foundation administrators to manage members, beneficiaries, fund groups, monthly contributions, external donations, Islamic microfinance (Qard Hasan) loans, Sadaqah grants, and financial accounting ledgers.

---

## 🚀 Tech Stack

- **Core Framework**: [React 18.3](https://react.dev/) + [TypeScript 5.5](https://www.typescriptlang.org/)
- **Build Tool & Bundler**: [Vite 5.4](https://vitejs.dev/)
- **Styling & Design System**: [Tailwind CSS 3.4](https://tailwindcss.com/) with Dark/Light Mode support
- **Icons**: [Lucide React](https://lucide.dev/) (Comprehensive modern icon pack)
- **Routing**: [React Router DOM 6.26](https://reactrouter.com/) (Public & Protected App layouts)
- **HTTP Client**: [Axios 1.7](https://axios-http.com/) (With automatic JWT Bearer token injection and global error interceptors)
- **Class Utilities**: `clsx` & `tailwind-merge`

---

## 📁 Project Structure

```
frontend/
├── index.html                   # HTML Entry Point
├── package.json                 # Node dependencies and scripts
├── postcss.config.js            # PostCSS configuration
├── tailwind.config.js           # Tailwind configuration (colors, dark mode, typography)
├── tsconfig.json                # TypeScript compiler configuration
├── tsconfig.node.json           # TypeScript Node configuration
├── vite.config.ts               # Vite configuration and dev server proxy
├── src/
│   ├── main.tsx                 # React application root DOM mount
│   ├── App.tsx                  # Application routes (Public vs Admin App)
│   ├── index.css                # Global CSS, Tailwind directives, custom scrollbars
│   ├── api/
│   │   └── client.ts            # Axios instance, API endpoints, request/response interceptors
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx    # Admin Dashboard shell (Header, Sidebar, Navigation)
│   │   │   ├── Header.tsx       # Admin App Topbar with user profile, theme toggle, branding
│   │   │   └── Sidebar.tsx      # Collapsible navigation menu with permission checks
│   │   ├── public/
│   │   │   ├── PublicLayout.tsx # Public Website shell
│   │   │   ├── PublicHeader.tsx # Public responsive navigation header with branding
│   │   │   └── PublicFooter.tsx # Public footer with foundation information
│   │   └── ui/
│   │       ├── Badge.tsx        # Status badges (Paid, Due, Active, Pending, etc.)
│   │       ├── Button.tsx       # Customizable buttons with loading & variant states
│   │       ├── Card.tsx         # Content container cards
│   │       ├── DeleteConfirmModal.tsx # Permanent database hard-delete confirmation modal
│   │       ├── Input.tsx        # Text, number, date, and textarea input controls
│   │       ├── Modal.tsx        # Accessible dialog wrapper
│   │       ├── Select.tsx       # Custom dropdown selector
│   │       └── Toast.tsx        # Non-blocking notification toasts
│   ├── context/
│   │   ├── AuthContext.tsx      # User authentication, token storage, RBAC permissions
│   │   ├── BrandingContext.tsx  # Dynamic Foundation branding (name, logo, slogan)
│   │   ├── ThemeContext.tsx     # Light / Dark mode theme persistence
│   │   └── ToastContext.tsx     # Global toast notification dispatchers
│   ├── pages/
│   │   ├── LoginPage.tsx        # Secure administrative login
│   │   ├── DashboardPage.tsx    # Executive overview, live KPI cards, group balances
│   │   ├── AddGroupPage.tsx     # Add Fund Group (Member Fund vs External Fund)
│   │   ├── ManageGroupsPage.tsx # List, filter, edit, adjust balance, and hard delete groups
│   │   ├── GroupLedgerPage.tsx  # Group-specific double-entry transaction ledger
│   │   ├── GroupFundPage.tsx    # Fund analytics and allocation breakdowns
│   │   ├── AddMemberPage.tsx    # Enrol member with minimal required fields
│   │   ├── ManageMembersPage.tsx# Member directory, search, filter, status toggles
│   │   ├── MemberProfilePage.tsx# Member profile, document vault, ledger history
│   │   ├── EditMemberPage.tsx   # Edit member information and monthly pledge amount
│   │   ├── MemberLedgerPage.tsx # Member contribution history and payment statements
│   │   ├── MemberApplicationsPage.tsx # Review and approve/reject public member applications
│   │   ├── AddBeneficiaryPage.tsx # Register beneficiary (Name & Group mandatory)
│   │   ├── ManageBeneficiariesPage.tsx # Beneficiary directory and status management
│   │   ├── BeneficiaryLedgerPage.tsx # Beneficiary assistance disbursement & repayment ledger
│   │   ├── AddContributionPage.tsx # Record single or multi-month advance contributions
│   │   ├── ManageContributionsPage.tsx # Contribution receipts, reversal, and search
│   │   ├── DueContributionsPage.tsx # Track overdue monthly member pledges
│   │   ├── ContributionLedgerPage.tsx # Global contribution ledger history
│   │   ├── MonthlySummaryPage.tsx # Member-wise 4-status yearly matrix (Paid, Current Pending, Due, Future)
│   │   ├── AddQardHasanPage.tsx # Disburse Qard Hasan loan with multi-group co-funding
│   │   ├── ManageQardHasanPage.tsx # Manage active loans, schedules, and repayments
│   │   ├── QardHasanLedgerPage.tsx # Qard Hasan loan disbursements and repayment ledger
│   │   ├── AddSadaqahPage.tsx   # Disburse non-repayable Sadaqah aid grants
│   │   ├── ManageSadaqahPage.tsx# Manage Sadaqah grants and recipients
│   │   ├── SadaqahLedgerPage.tsx# Sadaqah disbursement ledger
│   │   ├── RepaymentsPage.tsx   # Record loan repayments with proportional group credit
│   │   ├── ReportsPage.tsx      # Filterable reports with one-click CSV export
│   │   ├── AuditLogsPage.tsx    # Immutable system audit trail logs
│   │   ├── UsersRolesPage.tsx   # User management and RBAC role assignment
│   │   ├── UserProfilePage.tsx  # Current user profile editor
│   │   ├── AccountSettingsPage.tsx # User personal account settings
│   │   ├── ChangePasswordPage.tsx # Secure password change
│   │   ├── donations/           # External Non-Member Donations module
│   │   │   ├── AddDonationPage.tsx
│   │   │   ├── ManageDonationsPage.tsx
│   │   │   ├── DonationDetailPage.tsx
│   │   │   ├── EditDonationPage.tsx
│   │   │   └── DonationLedgerPage.tsx
│   │   ├── settings/            # Foundation & System Settings
│   │   │   ├── FoundationBrandingPage.tsx # Logo, favicon, name, taglines
│   │   │   ├── GeneralSettingsPage.tsx
│   │   │   ├── FoundationProfilePage.tsx
│   │   │   ├── UsersRolesSettingsPage.tsx
│   │   │   ├── PermissionsMatrixPage.tsx  # Interactive granular RBAC matrix
│   │   │   ├── FinancialSettingsPage.tsx
│   │   │   ├── ContributionSettingsPage.tsx
│   │   │   ├── AssistanceSettingsPage.tsx
│   │   │   ├── NotificationSettingsPage.tsx
│   │   │   └── SystemSettingsPage.tsx
│   │   └── public/              # Public Facing Website
│   │       ├── HomePage.tsx     # Landing page with mission, metrics, stories
│   │       ├── AboutPage.tsx    # About foundation history, leadership, vision
│   │       ├── OurWorkPage.tsx  # Programs (Qard Hasan, Sadaqah, Relief)
│   │       ├── StoriesPage.tsx  # Impact stories and beneficiary highlights
│   │       ├── StoryDetailPage.tsx # Detailed impact story view
│   │       ├── ImpactPage.tsx   # Live impact stats and figures
│   │       ├── PublicGroupsPage.tsx # Active groups directory
│   │       ├── PublicMemberApplicationPage.tsx # Public member membership application form
│   │       ├── PublicApplicationStatusPage.tsx # Public application tracking by tracking code
│   │       ├── AssistanceApplyPage.tsx # Public assistance inquiry submission
│   │       └── ContactPage.tsx  # Contact form and office location
│   ├── types/
│   │   └── index.ts             # TypeScript interfaces (User, Group, Member, Contribution, etc.)
│   └── utils/
│       ├── formatters.ts        # Currency (৳), Date, and Number formatting helpers
│       └── validation.ts        # Input validation utilities
```

---

## ⚙️ Environment Variables

Create a `.env` file inside the `frontend/` folder (or configure in your hosting platform):

```env
# URL pointing to the FastAPI backend API
VITE_API_URL=http://localhost:8000/api/v1
```

> **Note**: In development, `vite.config.ts` includes an automatic proxy rule forwarding `/api` requests directly to `http://127.0.0.1:8000`, so requests can use relative paths automatically.

---

## 💻 Local Development Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher (or `pnpm` / `yarn`)

### 2. Install Dependencies
```bash
cd frontend
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:5173`.

### 4. Build for Production
```bash
npm run build
```
Executes TypeScript type checking (`tsc`) and compiles minified production assets to the `dist/` directory.

### 5. Preview Production Build
```bash
npm run preview -- --host 0.0.0.0 --port 5173
```

---

## 🔐 Authentication & Authorization (RBAC)

1. **Authentication Flow**:
   - The user authenticates via `LoginPage.tsx` with username/email and password.
   - The backend issues a signed JWT Bearer token containing the user's UUID and permissions.
   - The token is securely stored in `localStorage` under `token` and `user`.
   - `client.ts` automatically injects `Authorization: Bearer <token>` into all outgoing Axios requests.
   - Upon encountering HTTP 401 (Unauthorized), the interceptor automatically clears expired credentials and redirects to `/login`.

2. **Role-Based Access Control (RBAC)**:
   - `AuthContext.tsx` exposes `hasPermission('permission_name')`.
   - Sidebar links and action buttons (Create, Edit, Delete, Approve, Export) dynamically render only if the authenticated user has the required permission.
   - Super Administrators (`is_superuser=true`) automatically bypass all permission checks.

---

## 🌟 Key Functional Modules

### 1. Fund Groups (Member Fund vs External Fund)
- **Member Fund Group**: Can enroll members and collect recurring monthly member contributions.
- **External Fund Group**: Dedicated strictly to non-member external donations (e.g. CSR, institutional donors, general sadaqah). Disables member assignments.
- **Live Available Balance**: Displays real-time dynamically computed funds ($\sum \text{Credits} - \sum \text{Debits}$).

### 2. Monthly Summary & Matrix
- Dedicated matrix grid showing every enrolled member's contribution status across all 12 months for any selected year.
- **4 Authoritative Statuses**:
  - `PAID` (Green ✓): Fully paid or prepaid in advance.
  - `CURRENT PENDING` (Amber ◷): Ongoing current calendar month not yet recorded.
  - `DUE` (Rose ✕): Past unpaid calendar month requiring collection.
  - `FUTURE MONTH` (Slate -): Upcoming calendar month.

### 3. Multi-Month Advance Contributions
- Admins can record multi-month payments in a single transaction (e.g., paying 6 or 12 months at once).
- Automatically allocates amounts to monthly dues and creates accounting ledger entries.

### 4. Islamic Microfinance (Qard Hasan) & Sadaqah Grants
- **Multi-Group Co-Funding**: Disburse loans funded by multiple fund groups with real-time balance checks and automatic proportional weight distribution.
- **Proportional Repayment Engine**: Repayments automatically route funds back into original funding groups according to their funding proportion with rounding correction.

### 5. Dependency-Aware Cascading Hard Delete
- Authorized admins can permanently delete Members, Beneficiaries, or Fund Groups.
- A strong two-step confirmation modal ensures safety:
  `[ ] I understand this action cannot be undone.`
- Deletes the entity along with its dependent ledger entries and transactions atomically in PostgreSQL. Group balances and dashboard totals dynamically recalculate with zero stale data.

---

## 🚀 Production Deployment

### Static Hosting (Vercel, Netlify, Cloudflare Pages, Nginx)

1. Build the frontend:
   ```bash
   npm run build
   ```
2. The output directory is `dist/`.
3. Configure your web server for Single Page Applications (SPA) fallback routing so all non-file routes serve `index.html`.

#### Sample Nginx Configuration:
```nginx
server {
    listen 80;
    server_name app.yourfoundation.org;

    root /var/www/foundation-frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 🛠️ Troubleshooting

- **CORS Error**: Ensure `BACKEND_CORS_ORIGINS` in the backend environment includes your frontend domain.
- **Blank Screen on Refresh**: Verify that your web server has SPA fallback routing enabled (`try_files $uri /index.html`).
- **Token Expiry**: If sessions expire unexpectedly, check `ACCESS_TOKEN_EXPIRE_MINUTES` in the backend configuration.
