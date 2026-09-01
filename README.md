# Foundation Management & Financial Management System

A production-ready Foundation Management & Financial Management System designed with clean separation between Frontend (React + Vite + TypeScript + Tailwind CSS), Backend (FastAPI + SQLAlchemy 2.0 + Pydantic v2), and Neon PostgreSQL database.

---

## 🏛️ Key Features

- **Granular RBAC**: Dynamic Roles, Granular Permissions (`*.view`, `*.create`, `*.edit`, `*.delete`, `*.approve`, `*.export`), Role-Permission Matrix editor.
- **Minimal Required Fields Philosophy**:
  - Groups require **only** `Group Name` (all other metadata optional).
  - Members require **only** `Name` and `Group`.
  - Beneficiaries require **only** `Name` and `Group`.
- **Derived Financial Ledger**: Group balances are dynamically calculated from immutable double-entry ledger entries ($+\text{Credits} - \text{Debits}$), protected by PostgreSQL row-level locks.
- **Multi-Group Funding Engine**: Co-fund Qard Hasan loans or Sadaqah grants across multiple fund groups with real-time balance checks and proportional weight allocation.
- **Exact Proportional Repayment Distribution**: Repayments on Qard Hasan are automatically distributed back into original funding groups according to their funding weights with rounding protection.
- **Audit Trail**: Detailed change history logging user, action, entity, previous values, new values, IP, and client.
- **Executive Dashboard & Exportable Reports**: KPIs, live group balances, overdue installment alerts, recent transactions, and one-click CSV export.
- **Firebase Hosting Ready**: Configured with `firebase.json` and client-side routing rewrites.

---

## 🚀 Quick Start

### 1. Backend Setup (FastAPI & Neon PostgreSQL)

```bash
cd backend

# (Optional) Activate Python environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn sqlalchemy psycopg2-binary pydantic pydantic-settings bcrypt pyjwt python-dateutil requests

# Set Database URL in environment (Neon PostgreSQL)
export DATABASE_URL="postgresql://neondb_owner:npg_R4LKgc7VjpQd@ep-long-math-az4xknrg-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Seed default roles, permissions, super admin, and demo data
python3 app/db/seed.py

# Run FastAPI backend server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup (React + Vite)

```bash
cd frontend

# Install node dependencies
npm install

# Start Vite dev server
npm run dev

# Build for production
npm run build
```

---

## 🔑 Default Credentials

- **Super Admin**: `admin@foundation.org`
- **Password**: `admin123456`

---

## 🧪 Automated Tests

Run backend automated integration test suite:

```bash
pytest backend/tests/test_foundation_system.py -v
```
