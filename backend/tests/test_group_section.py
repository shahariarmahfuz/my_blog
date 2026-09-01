import sys, os
sys.path.insert(0, os.path.abspath("backend"))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models import User, Group, Member, Beneficiary, Contribution, Assistance
from app.core.security import create_access_token
from decimal import Decimal

client = TestClient(app)

@pytest.fixture
def auth_headers():
    db = SessionLocal()
    admin = db.query(User).filter(User.email == "admin@foundation.org").first()
    db.close()
    assert admin is not None, "Super admin user not found in database."
    token = create_access_token(subject=str(admin.id))
    return {"Authorization": f"Bearer {token}"}

def test_add_group_minimal_required_fields(auth_headers):
    # 1. Create a group with ONLY name
    res = client.post("/api/v1/groups", headers=auth_headers, json={
        "name": "Minimal Group Circle"
    })
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Minimal Group Circle"
    assert data["code"] is not None
    assert data["code"].startswith("GRP-")
    assert data["description"] is None
    assert data["phone"] is None
    assert data["is_active"] is True
    group_id = data["id"]

    # 2. Manage Group: Update group info and toggle status
    up_res = client.patch(f"/api/v1/groups/{group_id}", headers=auth_headers, json={
        "contact_person": "Sister Fatima",
        "phone": "+8801912345678",
        "is_active": True
    })
    assert up_res.status_code == 200
    up_data = up_res.json()
    assert up_data["contact_person"] == "Sister Fatima"
    assert up_data["phone"] == "+8801912345678"

def test_group_ledger_and_group_fund_views(auth_headers):
    # 1. Create dedicated group for ledger & fund verification
    g_res = client.post("/api/v1/groups", headers=auth_headers, json={
        "name": "Finance & Audit Group"
    })
    assert g_res.status_code == 201
    group_id = g_res.json()["id"]

    # 2. Create a member and contribute 100,000 to group
    m_res = client.post("/api/v1/members", headers=auth_headers, json={
        "name": "Audit Test Contributor",
        "group_id": group_id
    })
    member_id = m_res.json()["id"]

    c_res = client.post("/api/v1/contributions", headers=auth_headers, json={
        "member_id": member_id,
        "group_id": group_id,
        "amount": 100000.00,
        "contribution_date": "2026-07-25",
        "payment_method": "BANK_TRANSFER"
    })
    assert c_res.status_code == 201

    # 3. Create a beneficiary and disburse Qard Hasan (40,000) and Sadaqah (10,000)
    b_res = client.post("/api/v1/beneficiaries", headers=auth_headers, json={
        "name": "Audit Test Recipient",
        "group_id": group_id
    })
    ben_id = b_res.json()["id"]

    qh_res = client.post("/api/v1/assistance", headers=auth_headers, json={
        "assistance_type": "QARD_HASAN",
        "beneficiary_id": ben_id,
        "total_amount": 40000.00,
        "disbursement_date": "2026-08-01",
        "purpose": "Small Shop Setup",
        "funding_allocations": [{"group_id": group_id, "allocated_amount": 40000.00}]
    })
    assert qh_res.status_code == 201
    qh_id = qh_res.json()["id"]

    sd_res = client.post("/api/v1/assistance", headers=auth_headers, json={
        "assistance_type": "SADAQAH",
        "beneficiary_id": ben_id,
        "total_amount": 10000.00,
        "disbursement_date": "2026-08-05",
        "purpose": "Emergency Medical Aid",
        "funding_allocations": [{"group_id": group_id, "allocated_amount": 10000.00}]
    })
    assert sd_res.status_code == 201

    # 4. Beneficiary repays 15,000 of Qard Hasan
    rep_res = client.post("/api/v1/repayments", headers=auth_headers, json={
        "assistance_id": qh_id,
        "amount": 15000.00,
        "payment_date": "2026-08-10",
        "payment_method": "CASH"
    })
    assert rep_res.status_code == 201

    # 5. TEST GROUP LEDGER VIEW:
    # Starting bal: 0
    # + 100,000 (Contribution) -> bal 100,000
    # - 40,000 (Qard Hasan)    -> bal 60,000
    # - 10,000 (Sadaqah)       -> bal 50,000
    # + 15,000 (QH Repayment)  -> bal 65,000
    ledger_res = client.get(f"/api/v1/groups/{group_id}/ledger", headers=auth_headers)
    assert ledger_res.status_code == 200
    ledger = ledger_res.json()

    assert ledger["group_name"] == "Finance & Audit Group"
    assert float(ledger["current_balance"]) == 65000.00
    assert float(ledger["total_credits"]) == 115000.00  # 100k + 15k
    assert float(ledger["total_debits"]) == 50000.00    # 40k + 10k
    assert len(ledger["entries"]) == 4

    # Reversed order (newest first):
    # entry 0: Repayment +15000 -> running_bal = 65000
    # entry 1: Sadaqah   -10000 -> running_bal = 50000
    # entry 2: QH Loan   -40000 -> running_bal = 60000
    # entry 3: Contrib  +100000 -> running_bal = 100000
    entries = ledger["entries"]
    assert float(entries[0]["running_balance"]) == 65000.00
    assert float(entries[1]["running_balance"]) == 50000.00
    assert float(entries[2]["running_balance"]) == 60000.00
    assert float(entries[3]["running_balance"]) == 100000.00

    # 6. TEST GROUP FUND VIEW:
    fund_res = client.get(f"/api/v1/groups/{group_id}/fund", headers=auth_headers)
    assert fund_res.status_code == 200
    fund = fund_res.json()

    assert float(fund["available_balance"]) == 65000.00
    assert float(fund["total_contributions"]) == 100000.00
    assert float(fund["total_qard_hasan_funded"]) == 40000.00
    assert float(fund["total_qard_hasan_repaid"]) == 15000.00
    assert float(fund["net_qard_hasan_outstanding"]) == 25000.00
    assert float(fund["total_sadaqah_funded"]) == 10000.00
    assert len(fund["allocations"]) == 2

    # Verify allocation item details
    qh_alloc = next(a for a in fund["allocations"] if a["assistance_type"] == "QARD_HASAN")
    assert float(qh_alloc["amount_funded_by_group"]) == 40000.00
    assert float(qh_alloc["amount_recovered"]) == 15000.00
    assert float(qh_alloc["remaining_receivable"]) == 25000.00
    assert qh_alloc["beneficiary_name"] == "Audit Test Recipient"
