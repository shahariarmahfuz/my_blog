import sys, os
sys.path.insert(0, os.path.abspath("backend"))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models import User, Group, Member, Contribution
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

def test_add_contribution_minimal_fields_and_auto_group(auth_headers):
    # 1. Create a dedicated group and member
    g_res = client.post("/api/v1/groups", headers=auth_headers, json={
        "name": "Barisal Welfare Circle"
    })
    assert g_res.status_code == 201
    group_id = g_res.json()["id"]

    m_res = client.post("/api/v1/members", headers=auth_headers, json={
        "name": "Rafiqul Islam",
        "group_id": group_id
    })
    assert m_res.status_code == 201
    member_id = m_res.json()["id"]

    # 2. Add Contribution with ONLY member_id and amount (no group_id provided in payload)
    c_res = client.post("/api/v1/contributions", headers=auth_headers, json={
        "member_id": member_id,
        "amount": 25000.00
    })
    assert c_res.status_code == 201
    c_data = c_res.json()
    assert c_data["member_id"] == member_id
    assert c_data["group_id"] == group_id  # Automatically derived from member!
    assert c_data["group_name"] == "Barisal Welfare Circle"
    assert float(c_data["amount"]) == 25000.00
    assert c_data["receipt_number"].startswith("CON-")

    # 3. Verify group balance was credited with 25000
    g_ledger = client.get(f"/api/v1/groups/{group_id}/ledger", headers=auth_headers).json()
    assert float(g_ledger["current_balance"]) == 25000.00

def test_manage_contributions_filter_and_void_reversal(auth_headers):
    # 1. Create group, member, and contribution
    g_res = client.post("/api/v1/groups", headers=auth_headers, json={
        "name": "Sylhet Community Circle"
    })
    group_id = g_res.json()["id"]

    m_res = client.post("/api/v1/members", headers=auth_headers, json={
        "name": "Nazmul Huda",
        "group_id": group_id
    })
    member_id = m_res.json()["id"]

    c_res = client.post("/api/v1/contributions", headers=auth_headers, json={
        "member_id": member_id,
        "amount": 50000.00,
        "contribution_date": "2026-08-15",
        "payment_method": "BANK_TRANSFER",
        "reference_number": "TXN-BANK-9921",
        "notes": "Annual contribution"
    })
    assert c_res.status_code == 201
    contrib_id = c_res.json()["id"]

    # 2. Test Filtering in Manage Contributions
    list_res = client.get(f"/api/v1/contributions?member_id={member_id}", headers=auth_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1
    assert list_res.json()[0]["id"] == contrib_id

    # 3. Verify group balance before void
    g_ledger = client.get(f"/api/v1/groups/{group_id}/ledger", headers=auth_headers).json()
    assert float(g_ledger["current_balance"]) == 50000.00

    # 4. Void / Reverse the contribution
    void_res = client.post(f"/api/v1/contributions/{contrib_id}/void", headers=auth_headers, json={
        "reason": "Test void reversal for erroneous duplicate deposit"
    })
    assert void_res.status_code == 200
    void_data = void_res.json()
    assert void_data["is_voided"] is True
    assert void_data["void_reason"] == "Test void reversal for erroneous duplicate deposit"

    # 5. Verify group balance after void is back to 0.00 via reversing DEBIT entry
    g_ledger_after = client.get(f"/api/v1/groups/{group_id}/ledger", headers=auth_headers).json()
    assert float(g_ledger_after["current_balance"]) == 0.00

def test_due_contributions_and_contribution_ledger(auth_headers):
    # 1. Create a group and member
    g_res = client.post("/api/v1/groups", headers=auth_headers, json={
        "name": "Rangpur Development Circle"
    })
    group_id = g_res.json()["id"]

    m_res = client.post("/api/v1/members", headers=auth_headers, json={
        "name": "Tariqul Islam",
        "group_id": group_id
    })
    member_id = m_res.json()["id"]

    # 2. Check Due Contributions view (member should show DUE or pending)
    due_res = client.get(f"/api/v1/contributions/due?group_id={group_id}", headers=auth_headers)
    assert due_res.status_code == 200
    due_list = due_res.json()
    assert len(due_list) >= 1
    tariq = next(d for d in due_list if d["member_id"] == member_id)
    assert tariq["member_name"] == "Tariqul Islam"
    assert tariq["group_name"] == "Rangpur Development Circle"
    assert tariq["status"] == "DUE"
    assert float(tariq["paid_this_period"]) == 0.00

    # 3. Pay contribution
    c_res = client.post("/api/v1/contributions", headers=auth_headers, json={
        "member_id": member_id,
        "amount": 12000.00
    })
    assert c_res.status_code == 201

    # 4. Check Due Contributions view again (member should now show PAID this month)
    due_res2 = client.get(f"/api/v1/contributions/due?group_id={group_id}", headers=auth_headers)
    assert due_res2.status_code == 200
    tariq2 = next(d for d in due_res2.json() if d["member_id"] == member_id)
    assert tariq2["status"] == "PAID"
    assert float(tariq2["paid_this_period"]) == 12000.00

    # 5. Check Contribution Ledger View
    ledger_res = client.get(f"/api/v1/contributions/ledger?group_id={group_id}", headers=auth_headers)
    assert ledger_res.status_code == 200
    ledger = ledger_res.json()
    assert float(ledger["total_active_amount"]) >= 12000.00
    assert len(ledger["entries"]) >= 1
    entry = next(e for e in ledger["entries"] if e["member_id"] == member_id)
    assert entry["member_name"] == "Tariqul Islam"
    assert entry["group_name"] == "Rangpur Development Circle"
    assert entry["status"] == "ACTIVE"
    assert float(entry["amount"]) == 12000.00
