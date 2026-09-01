import sys, os
sys.path.insert(0, os.path.abspath("backend"))

import pytest
from uuid import uuid4
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db, SessionLocal
from app.models.user import User
from app.models.group import Group
from app.models.member import Member
from app.models.contribution import Contribution
from app.models.member_application import MemberApplication

client = TestClient(app)

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def auth_headers(db_session):
    admin = db_session.query(User).filter(User.username == "admin").first()
    if not admin:
        from app.core.security import get_password_hash
        admin = User(
            name="Super Admin",
            username="admin",
            email="admin@foundation.org",
            role="SUPER_ADMIN",
            is_active=True,
            password_hash=get_password_hash("admin123456"),
            permissions=["*"]
        )
        db_session.add(admin)
        db_session.commit()
        db_session.refresh(admin)

    res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123456"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_member_profile_resolution_by_uuid_and_code(auth_headers, db_session):
    # 1. Create a test group
    group = Group(name=f"Profile Test Circle {uuid4().hex[:6]}", code=f"GRP-{uuid4().hex[:4].upper()}")
    db_session.add(group)
    db_session.commit()
    db_session.refresh(group)

    # 2. Create a test member with code
    member_code = f"M-{uuid4().hex[:4].upper()}"
    member = Member(
        name="Brother Tariq Rahman",
        group_id=group.id,
        member_code=member_code,
        phone="+8801700112233",
        email="tariq.rahman@example.org",
        occupation="Software Engineer",
        is_active=True
    )
    db_session.add(member)
    db_session.commit()
    db_session.refresh(member)

    # 3. Add a contribution
    contrib = Contribution(
        receipt_number=f"RCP-{uuid4().hex[:6].upper()}",
        member_id=member.id,
        group_id=group.id,
        amount=Decimal("5000.00"),
        payment_method="BANK_TRANSFER",
        contribution_date=member.created_at.date()
    )
    db_session.add(contrib)
    db_session.commit()

    # Test 1: Fetch by UUID
    res_uuid = client.get(f"/api/v1/members/{member.id}", headers=auth_headers)
    assert res_uuid.status_code == 200
    data_uuid = res_uuid.json()
    assert data_uuid["name"] == "Brother Tariq Rahman"
    assert data_uuid["member_code"] == member_code
    assert float(data_uuid["total_contributions"]) == 5000.00
    assert data_uuid["contributions_count"] == 1

    # Test 2: Fetch by Member Code (e.g. M-XXXX)
    res_code = client.get(f"/api/v1/members/{member_code}", headers=auth_headers)
    assert res_code.status_code == 200
    data_code = res_code.json()
    assert data_code["id"] == str(member.id)
    assert data_code["name"] == "Brother Tariq Rahman"

    # Test 3: Fetch Ledger by Member Code
    res_ledger = client.get(f"/api/v1/members/{member_code}/ledger", headers=auth_headers)
    assert res_ledger.status_code == 200
    ledger_data = res_ledger.json()
    assert float(ledger_data["total_contributions"]) == 5000.00
    assert len(ledger_data["entries"]) == 1

    # Test 4: Fetch Contributions by Member Code
    res_contribs = client.get(f"/api/v1/members/{member_code}/contributions", headers=auth_headers)
    assert res_contribs.status_code == 200
    assert len(res_contribs.json()) == 1

def test_member_profile_with_originating_application(auth_headers, db_session):
    # 1. Create a test group
    group = Group(name=f"App Link Circle {uuid4().hex[:6]}", code=f"GRP-{uuid4().hex[:4].upper()}")
    db_session.add(group)
    db_session.commit()
    db_session.refresh(group)

    # 2. Create member
    member = Member(
        name="Sister Fatima Begum",
        group_id=group.id,
        member_code=f"M-{uuid4().hex[:4].upper()}",
        is_active=True
    )
    db_session.add(member)
    db_session.commit()
    db_session.refresh(member)

    # 3. Create originating application linked to this member
    app_code = f"APP-{uuid4().hex[:6].upper()}"
    app_record = MemberApplication(
        application_code=app_code,
        applicant_name="Sister Fatima Begum",
        proposed_group_id=group.id,
        status="ACCEPTED",
        created_member_id=member.id
    )
    db_session.add(app_record)
    db_session.commit()

    # 4. Fetch member profile
    res = client.get(f"/api/v1/members/{member.id}", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["application_code"] == app_code
    assert data["application_id"] == str(app_record.id)
