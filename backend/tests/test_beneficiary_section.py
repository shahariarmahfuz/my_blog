import sys, os
import uuid
sys.path.insert(0, os.path.abspath("backend"))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models import User, Group, Beneficiary, Assistance, AssistanceFundingAllocation
from app.core.security import create_access_token
from decimal import Decimal
from datetime import date

client = TestClient(app)

@pytest.fixture
def auth_headers():
    db = SessionLocal()
    admin = db.query(User).filter(User.email == "admin@foundation.org").first()
    db.close()
    assert admin is not None, "Super admin user not found in database."
    token = create_access_token(subject=str(admin.id))
    return {"Authorization": f"Bearer {token}"}

def test_next_beneficiary_code_endpoint(auth_headers):
    res = client.get("/api/v1/beneficiaries/next-code", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "next_beneficiary_code" in data
    assert data["next_beneficiary_code"].startswith("BEN-")

def test_invalid_group_id_rejected(auth_headers):
    fake_group_id = str(uuid.uuid4())
    res = client.post("/api/v1/beneficiaries", headers=auth_headers, json={
        "name": "Invalid Group Beneficiary",
        "group_id": fake_group_id
    })
    assert res.status_code == 400
    assert "Assigned Group does not exist" in res.json()["detail"]

def test_add_beneficiary_minimal_required_fields(auth_headers):
    # 1. Ensure a group exists
    g_res = client.get("/api/v1/groups", headers=auth_headers)
    assert g_res.status_code == 200
    groups = g_res.json()
    if not groups:
        grp = client.post("/api/v1/groups", headers=auth_headers, json={"name": "Test Beneficiary Group"}).json()
        group_id = grp["id"]
        groups = [grp]
    else:
        group_id = groups[0]["id"]

    # 2. Add Beneficiary with ONLY Name and Group (Every other field empty/omitted)
    res = client.post("/api/v1/beneficiaries", headers=auth_headers, json={
        "name": "Rahim Ahmed Minimal Beneficiary",
        "group_id": group_id
    })
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Rahim Ahmed Minimal Beneficiary"
    assert data["group_id"] == group_id
    assert data["beneficiary_code"] is not None
    assert data["beneficiary_code"].startswith("BEN-")
    assert data["phone"] is None
    assert data["email"] is None
    assert data["father_or_husband_name"] is None
    assert data["emergency_contact_name"] is None
    assert data["photo_url"] is None
    assert data["is_active"] is True
    ben_id = data["id"]

    # 3. Manage Beneficiary - Update beneficiary info and change group
    if len(groups) > 1:
        new_group_id = groups[1]["id"]
        up_res = client.patch(f"/api/v1/beneficiaries/{ben_id}", headers=auth_headers, json={
            "group_id": new_group_id,
            "phone": "+8801800998877",
            "occupation": "Small Craftsman",
            "is_active": True
        })
        assert up_res.status_code == 200
        up_data = up_res.json()
        assert up_data["group_id"] == new_group_id
        assert up_data["phone"] == "+8801800998877"

def test_list_beneficiaries_with_filtering(auth_headers):
    res = client.get("/api/v1/beneficiaries", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1

def test_add_beneficiary_full_profiles(auth_headers):
    g_res = client.get("/api/v1/groups", headers=auth_headers)
    groups = g_res.json()
    if not groups:
        grp = client.post("/api/v1/groups", headers=auth_headers, json={"name": "Test Full Ben Group"}).json()
        group_id = grp["id"]
    else:
        group_id = groups[0]["id"]
    test_code = f"BEN-CUSTOM-{uuid.uuid4().hex[:6].upper()}"

    res = client.post("/api/v1/beneficiaries", headers=auth_headers, json={
        "beneficiary_code": test_code,
        "name": "Rokeya Begum",
        "group_id": group_id,
        "father_or_husband_name": "Md. Abdul Gafur",
        "mother_name": "Mst. Sufia Khatun",
        "date_of_birth": "1985-05-12",
        "gender": "Female",
        "national_id": "19851234567890",
        "occupation": "Small Tailoring Trader",
        "education": "Primary",
        "marital_status": "Married",
        "phone": "+8801722334455",
        "alternative_phone": "+8801822334455",
        "email": "rokeya@example.com",
        "present_address": "House #14, Ward #3, Kaliakair, Gazipur",
        "permanent_address": "Vill: Char Fasson, Dist: Bhola",
        "reason_for_assistance": "Requires zero-interest capital for sewing machine purchase.",
        "emergency_contact_name": "Md. Shahidul Islam",
        "emergency_contact_relation": "Husband",
        "emergency_contact_phone": "+8801922334455",
        "photo_url": "https://res.cloudinary.com/diwp8ug1r/image/upload/v1/foundation/beneficiaries/photo.webp",
        "signature_url": "https://res.cloudinary.com/diwp8ug1r/image/upload/v1/foundation/beneficiaries/sig.webp",
        "document_type": "National ID (NID)",
        "document_front_url": "https://res.cloudinary.com/diwp8ug1r/raw/upload/v1/foundation/beneficiaries/nid_f.jpg",
        "document_back_url": "https://res.cloudinary.com/diwp8ug1r/raw/upload/v1/foundation/beneficiaries/nid_b.jpg",
        "family_members_count": 5,
        "family_info": "3 school-going children, elderly mother-in-law",
        "financial_condition": "Monthly household income approx ৳8,000",
        "notes": "Verified by field coordinator Brother Tariq."
    })
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Rokeya Begum"
    assert data["beneficiary_code"] == test_code
    assert data["father_or_husband_name"] == "Md. Abdul Gafur"
    assert data["gender"] == "Female"
    assert data["emergency_contact_name"] == "Md. Shahidul Islam"
    assert data["family_members_count"] == 5
    assert data["document_front_url"] is not None

    ben_id = data["id"]
    get_res = client.get(f"/api/v1/beneficiaries/{ben_id}", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Rokeya Begum"

def test_beneficiary_financial_ledger_running_calculations(auth_headers):
    # Ensure a group exists
    g_res = client.post("/api/v1/groups", headers=auth_headers, json={"name": f"Ben Ledger Group {uuid.uuid4().hex[:4]}"})
    group_id = g_res.json()["id"]

    # Ensure group has funds by contributing
    m_res = client.post("/api/v1/members", headers=auth_headers, json={
        "name": "Ledger Donor Member",
        "group_id": group_id
    })
    member_id = m_res.json()["id"]

    client.post("/api/v1/contributions", headers=auth_headers, json={
        "member_id": member_id,
        "group_id": group_id,
        "amount": 200000.00,
        "payment_method": "BANK_TRANSFER"
    })

    # Create Beneficiary for ledger testing
    b_res = client.post("/api/v1/beneficiaries", headers=auth_headers, json={
        "name": "Ledger Calculation Beneficiary",
        "group_id": group_id
    })
    assert b_res.status_code == 201
    ben_id = b_res.json()["id"]

    # 1. Disburse Qard Hasan Loan: 60,000
    ast_qh = client.post("/api/v1/assistance", headers=auth_headers, json={
        "assistance_type": "QARD_HASAN",
        "beneficiary_id": ben_id,
        "total_amount": 60000.00,
        "disbursement_date": "2026-08-01",
        "purpose": "Small Enterprise Expansion",
        "funding_allocations": [{"group_id": group_id, "allocated_amount": 60000.00}],
        "installments_count": 6,
        "installment_interval_months": 1
    })
    assert ast_qh.status_code == 201
    qh_id = ast_qh.json()["id"]

    # 2. Disburse Sadaqah Grant: 15,000
    ast_sd = client.post("/api/v1/assistance", headers=auth_headers, json={
        "assistance_type": "SADAQAH",
        "beneficiary_id": ben_id,
        "total_amount": 15000.00,
        "disbursement_date": "2026-08-05",
        "purpose": "Emergency Family Support",
        "funding_allocations": [{"group_id": group_id, "allocated_amount": 15000.00}]
    })
    assert ast_sd.status_code == 201

    # 3. Repay 20,000 on Qard Hasan Loan
    rep_res = client.post("/api/v1/repayments", headers=auth_headers, json={
        "assistance_id": qh_id,
        "amount": 20000.00,
        "payment_date": "2026-08-15",
        "payment_method": "CASH",
        "notes": "1st and 2nd installment"
    })
    assert rep_res.status_code == 201

    # 4. Fetch Beneficiary Financial Ledger from backend
    ledger_res = client.get(f"/api/v1/beneficiaries/{ben_id}/ledger", headers=auth_headers)
    assert ledger_res.status_code == 200
    ledger = ledger_res.json()

    assert ledger["beneficiary_name"] == "Ledger Calculation Beneficiary"
    assert float(ledger["total_qard_hasan_received"]) == 60000.00
    assert float(ledger["total_qard_hasan_repaid"]) == 20000.00
    assert float(ledger["outstanding_qard_hasan"]) == 40000.00
    assert float(ledger["total_sadaqah_received"]) == 15000.00
    assert float(ledger["total_assistance_received"]) == 75000.00
    assert len(ledger["entries"]) == 3

    # Check running loan balances across events
    entries = ledger["entries"]
    assert float(entries[0]["running_outstanding_loan"]) == 40000.00
    assert float(entries[1]["running_outstanding_loan"]) == 60000.00
    assert float(entries[2]["running_outstanding_loan"]) == 60000.00
