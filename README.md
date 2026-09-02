# Foundation Management & Financial Management System

A production-ready Foundation Management & Financial Accounting Platform designed for non-profit foundations, Islamic microfinance organizations, and community welfare funds. It combines an accessible **Public Portal** for outreach with an **Administrative Dashboard** for member contributions, external donations, Qard Hasan loans, Sadaqah grants, and double-entry financial accounting ledgers.

---

## 🏗️ Architecture & Monorepo Structure

The project is architected with strict separation of concerns across three primary tiers:

```
├── frontend/               # React 18 + Vite + TypeScript + Tailwind CSS Single Page App
│   └── README.md           # Detailed Frontend Documentation
├── backend/                # FastAPI + SQLAlchemy 2.0 + Pydantic v2 Async REST API
│   └── README.md           # Detailed Backend Documentation
└── README.md               # Overall Project Architecture & Quick Start Guide
```

```mermaid
graph TD
    Client[Web & Mobile Browsers] -->|HTTP / REST API| Frontend[React 18 SPA (Vite + Tailwind CSS)]
    Frontend -->|JWT Authenticated API Requests| Backend[FastAPI Async REST API]
    Backend -->|Double-Entry Transactions & Queries| DB[(Neon Serverless PostgreSQL)]
    Backend -->|Document Vault & Image Storage| Cloudinary[Cloudinary Media Storage]
```

For in-depth subsystem documentation, refer to:
- 📖 [**Frontend Documentation**](frontend/README.md)
- 📖 [**Backend Documentation**](backend/README.md)

---

## 🏛️ Key System Features

### 1. Dual-Tier Fund Groups
- **Member Fund Groups**: Support member enrollment, member-specific pledges, and monthly contribution tracking.
- **External Fund Groups**: Strictly non-member donation pools for institutional donors, public sadaqah, and CSR grants.
- **Dynamic Ledger Balances**: Available balances are dynamically derived from immutable transaction credits and debits ($\sum \text{Credits} - \sum \text{Debits}$).

### 2. Member Contributions & Monthly Status Matrix
- **Member Pledge Customization**: Individual monthly contribution pledges or global foundation defaults.
- **Multi-Month Prepaid Contributions**: Record multi-month payments in advance with automated monthly dues allocation.
- **4-Status Yearly Matrix**: Clear tracking across `PAID`, `CURRENT PENDING`, `DUE`, and `FUTURE MONTH`.

### 3. Islamic Microfinance (Qard Hasan) & Sadaqah Aid
- **Multi-Group Co-Funding**: Disburse loans funded across multiple fund groups with real-time balance checks and proportional funding weights.
- **Proportional Repayment Engine**: Repayments automatically route funds back to original funding groups according to their funding proportion with rounding discrepancy resolution.
- **Sadaqah Grants**: Non-repayable emergency and humanitarian aid disbursements.

### 4. Dependency-Aware Cascading Hard Delete
- Authorized administrators can permanently delete Members, Beneficiaries, or Fund Groups.
- Atomically cascades and removes associated contributions, assistance records, repayments, and ledger entries within a single PostgreSQL transaction.
- Balances, summaries, and dashboard totals recalculate dynamically with zero stale records.

### 5. Granular Role-Based Access Control (RBAC)
- Interactive Role-Permission Matrix editor.
- Granular permissions (`*.view`, `*.create`, `*.edit`, `*.delete`, `*.approve`, `*.export`) enforced on every API route and UI component.

### 6. Comprehensive Audit Trail & Reporting
- Immutable system logs recording user, action, entity, previous/new JSON snapshots, IP, and timestamps.
- Filterable financial summaries with one-click CSV export.

---

## 🚀 Quick Start Guide

### 1. Start the Backend API (FastAPI)

```bash
cd backend

# Create virtual environment and activate
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn sqlalchemy psycopg2-binary pydantic pydantic-settings bcrypt pyjwt python-dateutil requests cloudinary pytest httpx pytest-asyncio

# Configure Database URL
export DATABASE_URL="postgresql://neondb_owner:npg_R4LKgc7VjpQd@ep-long-math-az4xknrg-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Seed default RBAC roles and super admin
python3 app/db/seed.py

# Launch FastAPI backend on port 8000
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API documentation:
- **Swagger UI**: `http://localhost:8000/api/v1/docs`
- **ReDoc**: `http://localhost:8000/api/v1/redoc`

---

### 2. Start the Frontend Application (Vite + React)

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be accessible at `http://localhost:5173`.

---

## 🔑 Default Super Admin Credentials

- **Username / Email**: `admin`
- **Password**: `admin123456`

---

## 🧪 Automated Testing

### Backend Automated Test Suite (70+ Tests)
```bash
python3 -m pytest backend/tests/ -v
```

### Frontend Typecheck & Build
```bash
cd frontend
npm run build
```

---

## 📦 Production Deployment Summary

- **Backend**: Deploy using **Uvicorn / Gunicorn** behind an **Nginx** reverse proxy or containerized with **Docker**.
- **Frontend**: Compile static assets with `npm run build` and deploy to **Cloudflare Pages**, **Vercel**, **Netlify**, or **Nginx**.
- **Database**: Connect directly to **PostgreSQL / Neon** with connection pooling and SSL enabled.
