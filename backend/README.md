# Backend — Foundation & Financial Management System

A production-ready, asynchronous REST API backend built with **FastAPI**, **SQLAlchemy 2.0**, and **Pydantic v2**, backed by a cloud-hosted **PostgreSQL (Neon)** database. It manages member lifecycle, non-member external donations, Islamic microfinance (Qard Hasan) loan disbursements & repayments, Sadaqah aid grants, and double-entry financial accounting ledgers with atomic transaction safety.

---

## 🚀 Tech Stack

- **Framework**: [FastAPI 0.115+](https://fastapi.tiangolo.com/) (High-performance async Python web framework)
- **ASGI Server**: [Uvicorn 0.30+](https://www.uvicorn.org/)
- **ORM & Database Toolkit**: [SQLAlchemy 2.0+](https://www.sqlalchemy.org/) with PostgreSQL dialect
- **Database**: [PostgreSQL (Neon Serverless)](https://neon.tech/) with pooled connections and SSL channel binding
- **Data Validation & Settings**: [Pydantic v2](https://docs.pydantic.dev/) & [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
- **Authentication**: JWT Bearer tokens with [PyJWT](https://pyjwt.readthedocs.io/) & [Passlib (Bcrypt)](https://passlib.readthedocs.io/)
- **Cloud Media Storage**: [Cloudinary Python SDK](https://cloudinary.com/documentation/django_integration) (Secure server-side media & document vault)
- **Testing**: [Pytest 8.0+](https://docs.pytest.org/) & [FastAPI TestClient (HTTPX)](https://www.python-httpx.org/)

---

## 📁 Project Structure

```
backend/
├── .env                         # Environment variables (Database URL, JWT Secret, Cloudinary)
├── app/
│   ├── main.py                  # FastAPI application entry point, CORS, lifespan hooks
│   ├── api/
│   │   ├── deps.py              # Auth dependencies, DB session injection, RBAC permission guards
│   │   └── v1/
│   │       ├── api.py           # Master API v1 router mounting all sub-endpoints
│   │       └── endpoints/
│   │           ├── assistance.py       # Qard Hasan & Sadaqah disbursement management
│   │           ├── audit_logs.py       # Immutable audit trail queries
│   │           ├── auth.py             # User login, JWT token issuance, password management
│   │           ├── beneficiaries.py    # Beneficiary registry and ledger statements
│   │           ├── branding.py         # Dynamic Foundation branding & asset endpoints
│   │           ├── contributions.py    # Member contribution recording, multi-month allocations
│   │           ├── dashboard.py        # Executive dashboard analytics and live metrics
│   │           ├── donations.py        # External non-member donation accounting
│   │           ├── files.py            # File upload & Cloudinary asset management
│   │           ├── groups.py           # Fund Group CRUD, balance adjustments, ledgers
│   │           ├── member_applications.py # Public application submission and approval flow
│   │           ├── members.py          # Member directory, profiles, ledgers, dues
│   │           ├── public.py           # Public portal content (stories, inquiries, stats)
│   │           ├── repayments.py       # Qard Hasan repayment recording & proportional allocation
│   │           ├── reports.py          # Aggregate accounting reports & CSV export
│   │           ├── roles.py            # RBAC roles and granular permission matrix
│   │           ├── settings.py         # System configuration & financial defaults
│   │           └── users.py            # System administrative user management
│   ├── core/
│   │   ├── config.py            # Pydantic BaseSettings loading from environment
│   │   ├── database.py          # SQLAlchemy engine, SessionLocal factory, Declarative Base
│   │   └── security.py          # Password hashing (bcrypt) and JWT encode/decode
│   ├── db/
│   │   ├── base.py              # Model imports for Alembic/metadata discovery
│   │   ├── migrate_username.py  # Zero-downtime migration scripts
│   │   └── seed.py              # Initial RBAC roles, permissions, and superuser seeder
│   ├── models/
│   │   ├── assistance.py        # Assistance, AssistanceFundingAllocation, InstallmentSchedule
│   │   ├── audit.py             # Immutable AuditLog model
│   │   ├── beneficiary.py       # Beneficiary model
│   │   ├── contribution.py      # Contribution, MonthlyContributionDue, MonthlyContributionAllocation
│   │   ├── donation.py          # External Donation model
│   │   ├── file_document.py     # FileDocument metadata & Cloudinary assets
│   │   ├── group.py             # Fund Group model & GroupType enum
│   │   ├── ledger.py            # FinancialTransaction & LedgerEntry double-entry models
│   │   ├── member.py            # Member model
│   │   ├── member_application.py# MemberApplication & status history
│   │   ├── public_content.py    # PublicStory, AssistanceInquiry, ContactMessage
│   │   ├── rbac.py              # Role, Permission, RolePermission association
│   │   ├── repayment.py         # QardHasanRepayment & QardHasanRepaymentAllocation
│   │   ├── setting.py           # SystemSetting key-value configuration
│   │   └── user.py              # User model
│   ├── schemas/
│   │   ├── assistance.py        # Pydantic models for loan/aid requests and responses
│   │   ├── audit.py             # Pydantic models for audit log responses
│   │   ├── beneficiary.py       # Pydantic models for beneficiary creation and ledgers
│   │   ├── contribution.py      # Pydantic models for contributions and monthly matrices
│   │   ├── donation.py          # Pydantic models for external donations
│   │   ├── group.py             # Pydantic models for fund groups and ledger summaries
│   │   ├── ledger.py            # Pydantic models for double-entry transactions
│   │   ├── member.py            # Pydantic models for members, dues, and statements
│   │   ├── member_application.py# Pydantic models for membership applications
│   │   ├── rbac.py              # Pydantic models for roles, permissions, matrix
│   │   ├── repayment.py         # Pydantic models for loan repayments
│   │   └── user.py              # Pydantic models for authentication and user accounts
│   └── services/
│       ├── audit_service.py     # Immutable audit trail event logger
│       ├── cloudinary_service.py# Cloudinary secure upload/delete integration
│       ├── hard_delete_service.py # Atomic dependency-aware cascading hard delete engine
│       ├── id_service.py        # Auto-generation of human-readable entity IDs (M-0001, GRP-001, etc.)
│       ├── ledger_service.py    # Double-entry ledger recording and dynamic balance derivation
│       └── monthly_contribution_service.py # Multi-month due generation and 4-status matrix engine
└── tests/                       # Comprehensive Pytest test suite (70+ test cases)
    ├── test_assistance_section.py
    ├── test_beneficiary_section.py
    ├── test_branding_system.py
    ├── test_cloudinary_storage.py
    ├── test_contribution_section.py
    ├── test_database_persistence_restart.py
    ├── test_external_donations.py
    ├── test_foundation_system.py
    ├── test_group_balance_consistency.py
    ├── test_group_opening_balance.py
    ├── test_group_section.py
    ├── test_hard_delete.py
    ├── test_manual_and_auto_id_system.py
    ├── test_member_profile_page.py
    ├── test_member_section.py
    ├── test_monthly_contributions.py
    ├── test_monthly_summary.py
    ├── test_multi_month_contributions.py
    ├── test_public_member_applications.py
    ├── test_settings_section.py
    └── test_user_profile_and_account.py
```

---

## ⚙️ Environment Configuration

Configuration is managed via environment variables or a `.env` file in the `backend/` directory:

```env
# Project Branding
PROJECT_NAME="Foundation Management & Financial Management System"

# API Route Prefix
API_V1_STR="/api/v1"

# JWT Secret & Expiration
SECRET_KEY="your-strong-production-secret-key-change-this"
ACCESS_TOKEN_EXPIRE_MINUTES=10080  # 7 days

# Real PostgreSQL / Neon Database Connection String
DATABASE_URL="postgresql://neondb_owner:npg_R4LKgc7VjpQd@ep-long-math-az4xknrg-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Cloudinary Storage Configuration (Backend Server Only)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Allowed CORS Origins (JSON list or comma-separated)
BACKEND_CORS_ORIGINS=["http://localhost:3000","http://localhost:5173","http://127.0.0.1:5173","*"]
```

---

## 🗄️ Database Architecture & Key Models

The database schema is organized around transactional double-entry accounting and Islamic microfinance principles:

```mermaid
erDiagram
    Group ||--o{ Member : contains
    Group ||--o{ Beneficiary : manages
    Group ||--o{ Donation : receives
    Group ||--o{ LedgerEntry : records
    Group ||--o{ AssistanceFundingAllocation : co-funds
    Member ||--o{ Contribution : makes
    Member ||--o{ MonthlyContributionDue : incurs
    Contribution ||--o{ MonthlyContributionAllocation : allocates
    Beneficiary ||--o{ Assistance : receives
    Assistance ||--o{ AssistanceFundingAllocation : funded-by
    Assistance ||--o{ InstallmentSchedule : schedules
    Assistance ||--o{ QardHasanRepayment : repays
    QardHasanRepayment ||--o{ QardHasanRepaymentAllocation : credits-back
    FinancialTransaction ||--|{ LedgerEntry : contains-double-entries
```

### 1. Dynamic Financial Ledger (`LedgerService`)
- **Group Balance Derivation**: Group balances are **never stored as static mutable fields**. Instead, `LedgerService.get_group_balance(db, group_id)` dynamically aggregates:
  $$\text{Available Balance} = \sum \text{Credits} - \sum \text{Debits}$$
- **Double-Entry Transactions**: Every financial event (`Contribution`, `Donation`, `Assistance Disbursement`, `Qard Hasan Repayment`, `Opening Balance Adjustment`) creates an immutable `FinancialTransaction` and corresponding `LedgerEntry` rows.

### 2. Multi-Group Co-Funding & Proportional Repayments
- When disbursing assistance (e.g., ৳100,000 loan), multiple Fund Groups can co-fund the loan with specified proportions.
- When the beneficiary makes a repayment (e.g., ৳10,000), `repayments.py` automatically routes the funds back into each co-funding group according to their initial funding proportion ($P_i = \frac{A_i}{A_{\text{total}}}$) with rounding discrepancy resolution.

### 3. Monthly Dues & 4-Status Yearly Matrix (`MonthlyContributionService`)
- Dynamically resolves the 4 contribution statuses for every member across all 12 calendar months:
  1. `PAID` ($\checkmark$): Fully covered or prepaid in advance.
  2. `CURRENT_PENDING` ($\odot$): Current month due and awaiting payment.
  3. `DUE` ($\times$): Past unpaid calendar month overdue.
  4. `FUTURE_MONTH` ($- $): Future calendar month.

### 4. Atomic Dependency-Aware Hard Delete Engine (`HardDeleteService`)
- Authorized administrators can permanently delete Members, Beneficiaries, or Fund Groups.
- Deletion executes inside a **single atomic transaction** (`BEGIN ... COMMIT / ROLLBACK`), removing the target entity, its contributions/assistance/repayments, and all associated ledger entries.
- Group balances, summaries, and dashboard KPIs recalculate dynamically from remaining ledger rows with **zero stale totals**.

---

## 📡 REST API Structure

| Module | Route Prefix | Key Endpoints | Description |
|---|---|---|---|
| **Public Portal** | `/api/v1/public` | `GET /stats`, `GET /stories`, `POST /member-apply`, `GET /application-status/{code}`, `POST /assistance-inquiry`, `POST /contact` | Unauthenticated public website endpoints |
| **Authentication** | `/api/v1/auth` | `POST /login`, `GET /me`, `PUT /profile`, `PUT /change-password` | JWT authentication and current session profile |
| **Fund Groups** | `/api/v1/groups` | `GET /`, `POST /`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}`, `POST /{id}/adjust-opening-balance`, `GET /{id}/ledger` | Manage Member & External Fund Groups and ledgers |
| **Members** | `/api/v1/members` | `GET /`, `POST /`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}`, `GET /{id}/ledger`, `GET /{id}/monthly-matrix` | Member lifecycle, profile, and payment ledgers |
| **Beneficiaries** | `/api/v1/beneficiaries` | `GET /`, `POST /`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}`, `GET /{id}/ledger` | Beneficiary registry and assistance history |
| **Contributions** | `/api/v1/contributions` | `GET /`, `POST /`, `GET /{id}`, `POST /{id}/reverse`, `GET /summary/monthly`, `GET /dues` | Member contributions, multi-month allocations, and dues |
| **External Donations** | `/api/v1/donations` | `GET /`, `POST /`, `GET /{id}`, `PUT /{id}`, `POST /{id}/reverse`, `GET /ledger/all` | Non-member institutional & public donations |
| **Assistance (Loans & Grants)**| `/api/v1/assistance` | `GET /`, `POST /`, `GET /{id}`, `PUT /{id}/approve`, `PUT /{id}/disburse` | Qard Hasan microfinance loans & Sadaqah grants |
| **Repayments** | `/api/v1/repayments` | `GET /`, `POST /`, `GET /{id}` | Qard Hasan loan repayment tracking |
| **Dashboard** | `/api/v1/dashboard` | `GET /stats`, `GET /trends`, `GET /recent-activity` | Real-time foundation KPIs and fund balances |
| **Reports** | `/api/v1/reports` | `GET /summary`, `GET /export/csv` | Financial reports and CSV data export |
| **RBAC & Roles** | `/api/v1/roles` | `GET /`, `POST /`, `GET /permissions`, `PUT /matrix` | Dynamic roles and granular permission matrix |
| **Audit Logs** | `/api/v1/audit-logs` | `GET /` | Query immutable audit trail entries |
| **Branding & Settings** | `/api/v1/branding`, `/api/v1/settings` | `GET /`, `PUT /`, `POST /upload-logo` | Dynamic foundation branding and parameters |

---

## 💻 Local Development Setup

### 1. Prerequisites
- **Python**: 3.12 or higher
- **PostgreSQL**: Neon PostgreSQL instance connection string

### 2. Environment Setup
```bash
cd backend

# Create and activate Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn sqlalchemy psycopg2-binary pydantic pydantic-settings bcrypt pyjwt python-dateutil requests cloudinary pytest httpx pytest-asyncio
```

### 3. Initialize Database & Seed
```bash
# Set your DATABASE_URL in .env or shell environment
export DATABASE_URL="postgresql://neondb_owner:npg_R4LKgc7VjpQd@ep-long-math-az4xknrg-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Seed RBAC roles, permissions, and superuser
python3 app/db/seed.py
```

### 4. Run Development Server
```bash
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive OpenAPI documentation will be available at:
- **Swagger UI**: `http://localhost:8000/api/v1/docs`
- **ReDoc**: `http://localhost:8000/api/v1/redoc`

---

## 🧪 Automated Testing

Execute the test suite with Pytest:

```bash
# Run all automated integration tests
python3 -m pytest backend/tests/ -v

# Run specific module tests
python3 -m pytest backend/tests/test_hard_delete.py -v
python3 -m pytest backend/tests/test_external_donations.py -v
python3 -m pytest backend/tests/test_group_balance_consistency.py -v
```

---

## 🛡️ Security Architecture

1. **Password Hashing**: Passwords are cryptographically salted and hashed using `bcrypt` (work factor 12).
2. **Granular RBAC**: Endpoint authorization is enforced through the `require_permission("module.action")` dependency.
3. **Parameterized SQL Queries**: All queries utilize SQLAlchemy ORM parameterized statements, eliminating SQL injection vulnerabilities.
4. **Cloudinary Asset Isolation**: Upload credentials are strictly stored in backend environment variables and are never transmitted to client browsers.
5. **Immutable Audit Logging**: Actions (`CREATE`, `UPDATE`, `DELETE`, `DISBURSE`, `REPAY`) record the executing user, entity ID, previous values, new values, IP address, and timestamp in the `audit_logs` table.
