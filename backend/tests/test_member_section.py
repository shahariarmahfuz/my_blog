import sys, os
sys.path.insert(0, os.path.abspath("backend"))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models import User, Group, Member, Contribution, MemberApplication
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

def test_next_member_code_endpoint(auth_headers):
    res = client.get("/api/v1/members/next-code", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "next_member_code" in data
    assert data["next_member_code"].startswith("M-")

def test_add_member_minimal_required_fields(auth_headers):
    # 1. Get an existing group
    g_res = client.get("/api/v1/groups", headers=auth_headers)
    assert g_res.status_code == 200
    groups = g_res.json()
    assert len(groups) > 0
    group_id = groups[0]["id"]

    # 2. Add Member with ONLY Name and Group (EVERY other field omitted/empty)
    res = client.post("/api/v1/members", headers=auth_headers, json={
        "name": "Rahim Ahmed Minimal",
        "group_id": group_id
    })
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Rahim Ahmed Minimal"
    assert data["group_id"] == group_id
    assert data["member_code"] is not None
    assert data["member_code"].startswith("M-")
    assert data["phone"] is None
    assert data["email"] is None
    assert data["father_name"] is None
    assert data["mother_name"] is None
    assert data["gender"] is None
    assert data["national_id"] is None
    assert data["emergency_contact_name"] is None
    assert data["reference_name"] is None
    assert data["photo_url"] is None
    assert data["is_active"] is True
    member_id = data["id"]

    # 3. Manage Member - Update member info and change group
    if len(groups) > 1:
        new_group_id = groups[1]["id"]
        up_res = client.patch(f"/api/v1/members/{member_id}", headers=auth_headers, json={
            "group_id": new_group_id,
            "phone": "+8801700998877",
            "is_active": True
        })
        assert up_res.status_code == 200
        up_data = up_res.json()
        assert up_data["group_id"] == new_group_id
        assert up_data["phone"] == "+8801700998877"

import uuid

def test_add_member_complete_6_sections_information(auth_headers):
    g_res = client.get("/api/v1/groups", headers=auth_headers)
    groups = g_res.json()
    if not groups:
        grp = client.post("/api/v1/groups", headers=auth_headers, json={"name": "Member Test Circle"}).json()
        group_id = grp["id"]
    else:
        group_id = groups[0]["id"]
    test_code = f"M-{uuid.uuid4().hex[:6].upper()}"

    # Create member with complete fields across all 6 sections
    res = client.post("/api/v1/members", headers=auth_headers, json={
        "name": "Mohammad Tariqul Islam",
        "group_id": group_id,
        "member_code": test_code,
        "join_date": "2026-09-01",
        "father_name": "Late Abdul Latif",
        "mother_name": "Rasheda Begum",
        "date_of_birth": "1990-05-15",
        "gender": "Male",
        "national_id": "19901234567890",
        "occupation": "Senior Accountant",
        "education": "M.Com in Accounting",
        "blood_group": "B+",
        "marital_status": "Married",
        "phone": "+8801711223344",
        "alternative_phone": "+8801811223344",
        "email": "tariqul@example.com",
        "present_address": "House #42, Road #7, Dhanmondi, Dhaka",
        "permanent_address": "Vill: Sonapur, Dist: Noakhali",
        "emergency_contact_name": "Nasrin Akter",
        "emergency_contact_relation": "Spouse",
        "emergency_contact_phone": "+8801911223344",
        "reference_name": "Dr. Mahmudur Rahman",
        "reference_relation": "Colleague",
        "reference_phone": "+8801611223344",
        "commitment_accepted": True,
        "photo_url": "https://res.cloudinary.com/diwp8ug1r/image/upload/v1/foundation/members/photo.webp",
        "signature_url": "https://res.cloudinary.com/diwp8ug1r/image/upload/v1/foundation/members/sig.webp",
        "document_type": "National ID (NID)",
        "document_url": "https://res.cloudinary.com/diwp8ug1r/raw/upload/v1/foundation/members/nid.pdf",
        "reason_for_joining": "Eager to contribute to zero-interest social welfare and support community entrepreneurs.",
        "notes": "Prefers monthly direct bank transfer contributions."
    })
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Mohammad Tariqul Islam"
    assert data["member_code"] == test_code
    assert data["father_name"] == "Late Abdul Latif"
    assert data["mother_name"] == "Rasheda Begum"
    assert data["gender"] == "Male"
    assert data["blood_group"] == "B+"
    assert data["marital_status"] == "Married"
    assert data["emergency_contact_name"] == "Nasrin Akter"
    assert data["reference_name"] == "Dr. Mahmudur Rahman"
    assert data["commitment_accepted"] is True
    assert data["photo_url"] is not None
    assert data["document_type"] == "National ID (NID)"
    assert data["reason_for_joining"] is not None

    # Fetch individual member
    member_id = data["id"]
    get_res = client.get(f"/api/v1/members/{member_id}", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Mohammad Tariqul Islam"

def test_member_financial_ledger_running_balance(auth_headers):
    g_res = client.get("/api/v1/groups", headers=auth_headers)
    groups = g_res.json()
    if not groups:
        grp = client.post("/api/v1/groups", headers=auth_headers, json={"name": "Member Ledger Circle"}).json()
        group_id = grp["id"]
    else:
        group_id = groups[0]["id"]

    # Create a member for ledger testing
    m_res = client.post("/api/v1/members", headers=auth_headers, json={
        "name": "Ledger Calculation Member",
        "group_id": group_id
    })
    assert m_res.status_code == 201
    member_id = m_res.json()["id"]

    # Record 3 contributions on different dates (each targets a distinct month
    # so the multi-month duplicate protection doesn't reject them)
    c1 = client.post("/api/v1/contributions", headers=auth_headers, json={
        "member_id": member_id,
        "group_id": group_id,
        "amount": 10000.00,
        "contribution_date": "2026-08-01",
        "selected_months": ["2026-06-01"],
        "payment_method": "CASH"
    })
    assert c1.status_code == 201

    c2 = client.post("/api/v1/contributions", headers=auth_headers, json={
        "member_id": member_id,
        "group_id": group_id,
        "amount": 25000.00,
        "contribution_date": "2026-08-10",
        "selected_months": ["2026-07-01"],
        "payment_method": "BANK_TRANSFER"
    })
    assert c2.status_code == 201

    c3 = client.post("/api/v1/contributions", headers=auth_headers, json={
        "member_id": member_id,
        "group_id": group_id,
        "amount": 15000.00,
        "contribution_date": "2026-08-20",
        "selected_months": ["2026-08-01"],
        "payment_method": "MOBILE_BANKING"
    })
    assert c3.status_code == 201

    # Fetch Member Ledger from backend
    ledger_res = client.get(f"/api/v1/members/{member_id}/ledger", headers=auth_headers)
    assert ledger_res.status_code == 200
    ledger = ledger_res.json()

    assert ledger["member_name"] == "Ledger Calculation Member"
    assert float(ledger["total_contributions"]) == 50000.00
    assert ledger["contributions_count"] == 3
    assert len(ledger["entries"]) == 3

    entries = ledger["entries"]
    assert float(entries[0]["running_total"]) == 50000.00
    assert float(entries[1]["running_total"]) == 35000.00
    assert float(entries[2]["running_total"]) == 10000.00

def test_member_applications_view_only(auth_headers):
    # Fetch member applications
    apps_res = client.get("/api/v1/member-applications", headers=auth_headers)
    assert apps_res.status_code == 200
    apps = apps_res.json()
    assert isinstance(apps, list)
    assert len(apps) > 0

    first_app = apps[0]
    app_id = first_app["id"]
    assert "application_code" in first_app
    assert "applicant_name" in first_app
    assert "status" in first_app

    # Fetch single application details
    detail_res = client.get(f"/api/v1/member-applications/{app_id}", headers=auth_headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == app_id
    assert detail["applicant_name"] == first_app["applicant_name"]
