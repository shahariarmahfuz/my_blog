import sys, os
import uuid
from decimal import Decimal
from datetime import date
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath("backend"))

import pytest
from app.main import app
from app.core.database import SessionLocal
from app.models import User, Group, Member, Beneficiary, Contribution, Assistance, AssistanceFundingAllocation
from app.core.security import create_access_token

client = TestClient(app)

@pytest.fixture
def auth_headers():
    db = SessionLocal()
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        admin = db.query(User).filter(User.email == "admin@foundation.org").first()
    db.close()
    assert admin is not None, "Super admin user not found in database."
    token = create_access_token(subject=str(admin.id))
    return {"Authorization": f"Bearer {token}"}

def test_group_creation_without_opening_balance(auth_headers):
    # 1. Group with 0 opening balance
    grp_name = f"Test Zero OpBal Group {uuid.uuid4().hex[:6]}"
    res = client.post("/api/v1/groups", headers=auth_headers, json={
        "name": grp_name,
        "opening_balance": 0
    })
    assert res.status_code == 201
    grp = res.json()
    assert Decimal(str(grp["current_balance"])) == Decimal("0.00")
    assert Decimal(str(grp["opening_balance"])) == Decimal("0.00")

def test_group_creation_with_opening_balance_and_ledger(auth_headers):
    # 2. Create Group with ৳100,000 opening balance
    grp_name = f"Education Fund {uuid.uuid4().hex[:6]}"
    res = client.post("/api/v1/groups", headers=auth_headers, json={
        "name": grp_name,
        "opening_balance": 100000,
        "opening_balance_date": "2026-09-01",
        "opening_balance_notes": "Carried forward from FY2025 Education Reserve"
    })
    assert res.status_code == 201, f"Failed to create group: {res.text}"
    grp = res.json()
    group_id = grp["id"]
    assert Decimal(str(grp["current_balance"])) == Decimal("100000.00")
    assert Decimal(str(grp["opening_balance"])) == Decimal("100000.00")

    # 3. Check Group Ledger
    res_ledger = client.get(f"/api/v1/groups/{group_id}/ledger", headers=auth_headers)
    assert res_ledger.status_code == 200
    ledger_data = res_ledger.json()
    assert Decimal(str(ledger_data["current_balance"])) == Decimal("100000.00")
    assert len(ledger_data["entries"]) >= 1

    first_entry = ledger_data["entries"][0]
    assert first_entry["transaction_type"] == "OPENING_BALANCE"
    assert first_entry["entry_type"] == "CREDIT"
    assert Decimal(str(first_entry["amount"])) == Decimal("100000.00")
    assert Decimal(str(first_entry["running_balance"])) == Decimal("100000.00")

    # 4. Add Member & Contribution of ৳20,000
    res_mem = client.post("/api/v1/members", headers=auth_headers, json={
        "name": "Donor Member 1",
        "group_id": group_id
    })
    assert res_mem.status_code == 201
    member_id = res_mem.json()["id"]

    res_con = client.post("/api/v1/contributions", headers=auth_headers, json={
        "member_id": member_id,
        "amount": 20000,
        "contribution_date": "2026-09-03"
    })
    assert res_con.status_code == 201

    # Verify updated balance is ৳120,000
    res_grp_after = client.get(f"/api/v1/groups/{group_id}", headers=auth_headers)
    assert res_grp_after.status_code == 200
    assert Decimal(str(res_grp_after.json()["current_balance"])) == Decimal("120000.00")
    assert Decimal(str(res_grp_after.json()["opening_balance"])) == Decimal("100000.00")

    # 5. Multi-group Qard Hasan disbursement funded from Opening Balance
    res_ben = client.post("/api/v1/beneficiaries", headers=auth_headers, json={
        "name": "Microenterprise Recipient",
        "group_id": group_id
    })
    assert res_ben.status_code == 201
    ben_id = res_ben.json()["id"]

    res_qh = client.post("/api/v1/assistance", headers=auth_headers, json={
        "beneficiary_id": ben_id,
        "assistance_type": "QARD_HASAN",
        "total_amount": 50000,
        "disbursement_date": "2026-09-05",
        "purpose": "Shop equipment loan",
        "installments_count": 5,
        "installment_interval": "MONTHLY",
        "funding_allocations": [
            {"group_id": group_id, "allocated_amount": 50000}
        ]
    })
    assert res_qh.status_code == 201
    qh_id = res_qh.json()["id"]

    # Verify balance became ৳70,000 (120k - 50k)
    res_grp_qh = client.get(f"/api/v1/groups/{group_id}", headers=auth_headers)
    assert Decimal(str(res_grp_qh.json()["current_balance"])) == Decimal("70000.00")

    # 6. Repayment of ৳10,000 -> balance becomes ৳80,000
    res_rep = client.post("/api/v1/repayments", headers=auth_headers, json={
        "assistance_id": qh_id,
        "amount": 10000,
        "payment_date": "2026-09-10",
        "payment_method": "CASH",
        "notes": "1st installment repayment"
    })
    assert res_rep.status_code == 201

    res_grp_rep = client.get(f"/api/v1/groups/{group_id}", headers=auth_headers)
    assert Decimal(str(res_grp_rep.json()["current_balance"])) == Decimal("80000.00")

    # 7. Controlled Opening Balance Adjustment
    # Adjust opening balance from ৳100,000 to ৳110,000 (+৳10,000)
    res_adj = client.post(f"/api/v1/groups/{group_id}/adjust-opening-balance", headers=auth_headers, json={
        "new_opening_balance": 110000,
        "reason": "Reconciliation with annual audit report"
    })
    assert res_adj.status_code == 200
    assert Decimal(str(res_adj.json()["opening_balance"])) == Decimal("110000.00")
    # Current balance should increase from 80k to 90k
    assert Decimal(str(res_adj.json()["current_balance"])) == Decimal("90000.00")

    # 8. Check ledger reflects OPENING_BALANCE_ADJUSTMENT
    res_ledger2 = client.get(f"/api/v1/groups/{group_id}/ledger", headers=auth_headers)
    types = [e["transaction_type"] for e in res_ledger2.json()["entries"]]
    assert "OPENING_BALANCE" in types
    assert "OPENING_BALANCE_ADJUSTMENT" in types
    assert "CONTRIBUTION" in types
    assert "QARD_HASAN_DISBURSEMENT" in types
    assert "QARD_HASAN_REPAYMENT" in types
