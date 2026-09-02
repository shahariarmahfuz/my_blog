import pytest
from datetime import date
from decimal import Decimal
from uuid import uuid4
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture
def auth_headers():
    res = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "admin123456"
    })
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_clean_member_hard_delete(auth_headers):
    # 1. Create a group
    res_g = client.post(
        "/api/v1/groups",
        json={"name": f"Test Group {uuid4().hex[:6]}", "group_type": "MEMBER_FUND", "opening_balance": 0.0},
        headers=auth_headers
    )
    assert res_g.status_code == 201
    group_id = res_g.json()["id"]

    # 2. Create a clean member
    res_m = client.post(
        "/api/v1/members",
        json={
            "name": f"Test Clean Member {uuid4().hex[:6]}",
            "group_id": group_id,
            "monthly_contribution_amount": 500.0,
            "join_date": str(date.today())
        },
        headers=auth_headers
    )
    assert res_m.status_code == 201
    member = res_m.json()
    member_id = member["id"]

    # 3. Permanently delete clean member
    res_del = client.delete(f"/api/v1/members/{member_id}", headers=auth_headers)
    assert res_del.status_code == 200
    assert "permanently deleted" in res_del.json()["message"]

    # 4. Verify member is really gone
    res_check = client.get(f"/api/v1/members/{member_id}", headers=auth_headers)
    assert res_check.status_code == 404

    # 5. Clean up group
    res_gdel = client.delete(f"/api/v1/groups/{group_id}", headers=auth_headers)
    assert res_gdel.status_code == 200

def test_member_with_contributions_blocks_hard_delete(auth_headers):
    # 1. Create a group
    res_g = client.post(
        "/api/v1/groups",
        json={"name": f"Test Group {uuid4().hex[:6]}", "group_type": "MEMBER_FUND", "opening_balance": 0.0},
        headers=auth_headers
    )
    assert res_g.status_code == 201
    group_id = res_g.json()["id"]

    # 2. Create a member
    res_m = client.post(
        "/api/v1/members",
        json={
            "name": f"Member with Contrib {uuid4().hex[:6]}",
            "group_id": group_id,
            "monthly_contribution_amount": 500.0,
            "join_date": str(date.today())
        },
        headers=auth_headers
    )
    assert res_m.status_code == 201
    member = res_m.json()
    member_id = member["id"]

    # 3. Record a contribution
    res_c = client.post(
        "/api/v1/contributions",
        json={
            "member_id": member_id,
            "amount": 500.0,
            "contribution_date": str(date.today()),
            "contribution_month": f"{date.today().year}-{str(date.today().month).zfill(2)}-01",
            "payment_method": "CASH"
        },
        headers=auth_headers
    )
    assert res_c.status_code == 201

    # 4. Attempt permanent delete -> Must be blocked with 400
    res_del = client.delete(f"/api/v1/members/{member_id}", headers=auth_headers)
    assert res_del.status_code == 400
    assert "recorded financial contribution" in res_del.json()["detail"]

def test_clean_beneficiary_hard_delete(auth_headers):
    # 1. Create a group
    res_g = client.post(
        "/api/v1/groups",
        json={"name": f"Ben Group {uuid4().hex[:6]}", "group_type": "MEMBER_FUND", "opening_balance": 0.0},
        headers=auth_headers
    )
    assert res_g.status_code == 201
    group_id = res_g.json()["id"]

    # 2. Create a clean beneficiary
    res_b = client.post(
        "/api/v1/beneficiaries",
        json={
            "name": f"Clean Beneficiary {uuid4().hex[:6]}",
            "group_id": group_id
        },
        headers=auth_headers
    )
    assert res_b.status_code == 201
    ben_id = res_b.json()["id"]

    # 3. Permanently delete clean beneficiary
    res_del = client.delete(f"/api/v1/beneficiaries/{ben_id}", headers=auth_headers)
    assert res_del.status_code == 200
    assert "permanently deleted" in res_del.json()["message"]

    # 4. Verify beneficiary is gone
    res_check = client.get(f"/api/v1/beneficiaries/{ben_id}", headers=auth_headers)
    assert res_check.status_code == 404

    # 5. Clean up group
    res_gdel = client.delete(f"/api/v1/groups/{group_id}", headers=auth_headers)
    assert res_gdel.status_code == 200

def test_clean_group_hard_delete(auth_headers):
    # 1. Create a group with 0 balance
    res_g = client.post(
        "/api/v1/groups",
        json={"name": f"Empty Group {uuid4().hex[:6]}", "group_type": "MEMBER_FUND", "opening_balance": 0.0},
        headers=auth_headers
    )
    assert res_g.status_code == 201
    group_id = res_g.json()["id"]

    # 2. Delete group permanently
    res_del = client.delete(f"/api/v1/groups/{group_id}", headers=auth_headers)
    assert res_del.status_code == 200
    assert "permanently deleted" in res_del.json()["message"]

    # 3. Verify group is gone
    res_check = client.get(f"/api/v1/groups/{group_id}", headers=auth_headers)
    assert res_check.status_code == 404

def test_group_with_assigned_members_blocks_delete(auth_headers):
    # 1. Create a group
    res_g = client.post(
        "/api/v1/groups",
        json={"name": f"Group With Members {uuid4().hex[:6]}", "group_type": "MEMBER_FUND", "opening_balance": 0.0},
        headers=auth_headers
    )
    assert res_g.status_code == 201
    group_id = res_g.json()["id"]

    # 2. Assign a member
    res_m = client.post(
        "/api/v1/members",
        json={
            "name": f"Assigned Member {uuid4().hex[:6]}",
            "group_id": group_id,
            "monthly_contribution_amount": 500.0,
            "join_date": str(date.today())
        },
        headers=auth_headers
    )
    assert res_m.status_code == 201
    member_id = res_m.json()["id"]

    # 3. Attempt delete group -> Must be blocked
    res_del = client.delete(f"/api/v1/groups/{group_id}", headers=auth_headers)
    assert res_del.status_code == 400
    assert "assigned member(s)" in res_del.json()["detail"]

    # 4. Clean up member first, then delete group
    res_mdel = client.delete(f"/api/v1/members/{member_id}", headers=auth_headers)
    assert res_mdel.status_code == 200

    res_gdel = client.delete(f"/api/v1/groups/{group_id}", headers=auth_headers)
    assert res_gdel.status_code == 200
