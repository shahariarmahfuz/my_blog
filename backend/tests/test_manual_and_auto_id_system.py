import sys, os
import uuid
sys.path.insert(0, os.path.abspath("backend"))

import pytest
from datetime import date
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.core.database import SessionLocal
from app.models import User, Group, Member, Beneficiary, Contribution, Assistance, AssistanceFundingAllocation
from app.models.audit import AuditLog
from app.core.security import create_access_token

client = TestClient(app)

@pytest.fixture
def auth_headers():
    db = SessionLocal()
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        admin = db.query(User).first()
    db.close()
    assert admin is not None, "Admin user not found in database."
    token = create_access_token(subject=str(admin.id))
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_member_manual_and_auto_id_lifecycle(auth_headers: dict, db_session: Session):
    g = db_session.query(Group).filter(Group.is_active == True).first()
    assert g is not None

    tag = uuid.uuid4().hex[:6].upper()
    custom_code = f"MEM-{tag}-01"

    # 1. Create Member with manual custom ID
    res1 = client.post(
        "/api/v1/members",
        headers=auth_headers,
        json={
            "name": f"Brother Manual ID {tag}",
            "group_id": str(g.id),
            "member_code": custom_code,
            "phone": "+8801700111222"
        }
    )
    assert res1.status_code == 201, res1.text
    m1_data = res1.json()
    assert m1_data["member_code"] == custom_code
    m1_id = m1_data["id"]

    # 2. Create Member without ID -> verify backend auto-generates ID
    res2 = client.post(
        "/api/v1/members",
        headers=auth_headers,
        json={
            "name": f"Brother Auto ID {tag}",
            "group_id": str(g.id),
            "phone": "+8801700111333"
        }
    )
    assert res2.status_code == 201, res2.text
    m2_data = res2.json()
    assert m2_data["member_code"] is not None
    assert m2_data["member_code"].startswith("M-")
    assert m2_data["member_code"] != custom_code

    # 3. Attempt duplicate Member ID -> verify duplicate is rejected
    res3 = client.post(
        "/api/v1/members",
        headers=auth_headers,
        json={
            "name": "Brother Duplicate Attempt",
            "group_id": str(g.id),
            "member_code": custom_code
        }
    )
    assert res3.status_code == 400
    assert "already exists" in res3.json()["detail"]

    # 4. Add financial contribution using internal UUID
    res_contrib = client.post(
        "/api/v1/contributions",
        headers=auth_headers,
        json={
            "member_id": m1_id,
            "amount": "5000.00",
            "contribution_date": str(date.today()),
            "payment_method": "BANK_TRANSFER"
        }
    )
    assert res_contrib.status_code == 201, res_contrib.text

    # 5. Edit Member ID
    updated_code = f"MEM-{tag}-UPD"
    res_edit = client.patch(
        f"/api/v1/members/{m1_id}",
        headers=auth_headers,
        json={
            "member_code": updated_code
        }
    )
    assert res_edit.status_code == 200, res_edit.text
    assert res_edit.json()["member_code"] == updated_code

    # 6. Verify Member Ledger still works via UUID and new code
    res_ledger_uuid = client.get(f"/api/v1/members/{m1_id}/ledger", headers=auth_headers)
    assert res_ledger_uuid.status_code == 200
    assert Decimal(str(res_ledger_uuid.json()["total_contributions"])) == Decimal("5000.00")

    res_ledger_code = client.get(f"/api/v1/members/{updated_code}/ledger", headers=auth_headers)
    assert res_ledger_code.status_code == 200
    assert Decimal(str(res_ledger_code.json()["total_contributions"])) == Decimal("5000.00")

    # 7. Verify Audit Trail records the Member ID change
    logs = db_session.query(AuditLog).filter(
        AuditLog.entity_name == "members",
        AuditLog.entity_id == m1_id,
        AuditLog.action == "UPDATE"
    ).all()
    assert len(logs) >= 1
    found_code_change = any(
        l.old_values and l.old_values.get("member_code") == custom_code and
        l.new_values and l.new_values.get("member_code") == updated_code
        for l in logs
    )
    assert found_code_change

def test_beneficiary_manual_and_auto_id_lifecycle(auth_headers: dict, db_session: Session):
    g = db_session.query(Group).filter(Group.is_active == True).first()
    assert g is not None

    tag = uuid.uuid4().hex[:6].upper()
    custom_code = f"BEN-{tag}-01"

    # 1. Create Beneficiary with manual custom ID
    res1 = client.post(
        "/api/v1/beneficiaries",
        headers=auth_headers,
        json={
            "name": f"Beneficiary Manual {tag}",
            "group_id": str(g.id),
            "beneficiary_code": custom_code
        }
    )
    assert res1.status_code == 201, res1.text
    b1_data = res1.json()
    assert b1_data["beneficiary_code"] == custom_code
    b1_id = b1_data["id"]

    # 2. Create Beneficiary without ID -> auto-generated
    res2 = client.post(
        "/api/v1/beneficiaries",
        headers=auth_headers,
        json={
            "name": f"Beneficiary Auto {tag}",
            "group_id": str(g.id)
        }
    )
    assert res2.status_code == 201, res2.text
    b2_data = res2.json()
    assert b2_data["beneficiary_code"] is not None
    assert b2_data["beneficiary_code"] != custom_code

    # 3. Duplicate rejected
    res3 = client.post(
        "/api/v1/beneficiaries",
        headers=auth_headers,
        json={
            "name": "Beneficiary Duplicate Attempt",
            "group_id": str(g.id),
            "beneficiary_code": custom_code
        }
    )
    assert res3.status_code == 400
    assert "already exists" in res3.json()["detail"]

    # 4. Edit Beneficiary ID
    new_ben_code = f"BEN-{tag}-UPD"
    res_edit = client.patch(
        f"/api/v1/beneficiaries/{b1_id}",
        headers=auth_headers,
        json={
            "beneficiary_code": new_ben_code
        }
    )
    assert res_edit.status_code == 200, res_edit.text
    assert res_edit.json()["beneficiary_code"] == new_ben_code

    # 5. Verify resolve by new code
    res_get = client.get(f"/api/v1/beneficiaries/{new_ben_code}", headers=auth_headers)
    assert res_get.status_code == 200
    assert res_get.json()["id"] == b1_id

def test_group_manual_and_auto_code_lifecycle(auth_headers: dict, db_session: Session):
    tag = uuid.uuid4().hex[:6].upper()
    custom_code = f"GRP-{tag}-01"

    # 1. Create Group with manual code
    res1 = client.post(
        "/api/v1/groups",
        headers=auth_headers,
        json={
            "name": f"Group Manual {tag}",
            "code": custom_code
        }
    )
    assert res1.status_code == 201, res1.text
    g1_data = res1.json()
    assert g1_data["code"] == custom_code
    g1_id = g1_data["id"]

    # 2. Create Group without code -> auto-generated
    res2 = client.post(
        "/api/v1/groups",
        headers=auth_headers,
        json={
            "name": f"Auto Code Group {tag}"
        }
    )
    assert res2.status_code == 201, res2.text
    g2_data = res2.json()
    assert g2_data["code"] is not None
    assert g2_data["code"].startswith("GRP-")

    # 3. Duplicate rejected
    res3 = client.post(
        "/api/v1/groups",
        headers=auth_headers,
        json={
            "name": "Duplicate Code Group",
            "code": custom_code
        }
    )
    assert res3.status_code == 400
    assert "already exists" in res3.json()["detail"]

    # 4. Edit Group Code
    new_group_code = f"GRP-{tag}-UPD"
    res_edit = client.patch(
        f"/api/v1/groups/{g1_id}",
        headers=auth_headers,
        json={
            "code": new_group_code
        }
    )
    assert res_edit.status_code == 200, res_edit.text
    assert res_edit.json()["code"] == new_group_code

    # 5. Verify resolve by new code
    res_get = client.get(f"/api/v1/groups/{new_group_code}", headers=auth_headers)
    assert res_get.status_code == 200
    assert res_get.json()["id"] == g1_id
