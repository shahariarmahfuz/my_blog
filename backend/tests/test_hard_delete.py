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

def test_hard_delete_member_with_financial_contributions(auth_headers):
    """
    Test that an authorized admin can hard delete a member who has recorded contributions.
    Verifies that the member, their contributions, receipts, and ledger entries are removed,
    and the group's balance and metrics are recalculated from the remaining records.
    """
    # 1. Create a Fund Group with an opening balance of 1000.00
    res_g = client.post(
        "/api/v1/groups",
        json={"name": f"Group Alpha {uuid4().hex[:6]}", "group_type": "MEMBER_FUND", "opening_balance": 1000.0},
        headers=auth_headers
    )
    assert res_g.status_code == 201
    group = res_g.json()
    group_id = group["id"]
    assert Decimal(str(group["available_balance"])) == Decimal("1000.00")

    # 2. Create Member A in the group
    res_m = client.post(
        "/api/v1/members",
        json={
            "name": f"Member A {uuid4().hex[:6]}",
            "group_id": group_id,
            "monthly_contribution_amount": 500.0,
            "join_date": str(date.today())
        },
        headers=auth_headers
    )
    assert res_m.status_code == 201
    member = res_m.json()
    member_id = member["id"]

    # 3. Record two 500.00 contributions for Member A
    res_c1 = client.post(
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
    assert res_c1.status_code == 201
    c1_id = res_c1.json()["id"]

    res_c2 = client.post(
        "/api/v1/contributions",
        json={
            "member_id": member_id,
            "amount": 500.0,
            "contribution_date": str(date.today()),
            "contribution_month": "2027-02-01",
            "payment_method": "MOBILE_BANKING"
        },
        headers=auth_headers
    )
    assert res_c2.status_code == 201
    c2_id = res_c2.json()["id"]

    # Verify group balance increased to 2000.00
    res_g_check = client.get(f"/api/v1/groups/{group_id}", headers=auth_headers)
    assert res_g_check.status_code == 200
    assert Decimal(str(res_g_check.json()["available_balance"])) == Decimal("2000.00")

    # 4. HARD DELETE Member A
    res_del = client.delete(f"/api/v1/members/{member_id}", headers=auth_headers)
    assert res_del.status_code == 200
    assert res_del.json()["success"] is True
    assert "permanently deleted" in res_del.json()["message"]

    # 5. Verify Member A is completely gone from PostgreSQL
    res_m_get = client.get(f"/api/v1/members/{member_id}", headers=auth_headers)
    assert res_m_get.status_code == 404

    # 6. Verify contributions are removed
    res_c_list = client.get(f"/api/v1/members/{member_id}/contributions", headers=auth_headers)
    assert res_c_list.status_code == 404

    # 7. Verify group balance has been recalculated dynamically from remaining ledger entries (back to 1000.00!)
    res_g_after = client.get(f"/api/v1/groups/{group_id}", headers=auth_headers)
    assert res_g_after.status_code == 200
    assert Decimal(str(res_g_after.json()["available_balance"])) == Decimal("1000.00")

    # Clean up group
    client.delete(f"/api/v1/groups/{group_id}", headers=auth_headers)


def test_hard_delete_beneficiary_with_assistance_and_repayments(auth_headers):
    """
    Test that an authorized admin can hard delete a beneficiary with assistance disbursements & repayments.
    Verifies that the beneficiary, assistance, and repayments are deleted, and group balances recalculate.
    """
    # 1. Create a Fund Group with 5000.00 balance
    res_g = client.post(
        "/api/v1/groups",
        json={"name": f"Aid Group {uuid4().hex[:6]}", "group_type": "MEMBER_FUND", "opening_balance": 5000.0},
        headers=auth_headers
    )
    assert res_g.status_code == 201
    group_id = res_g.json()["id"]

    # 2. Create Beneficiary
    res_b = client.post(
        "/api/v1/beneficiaries",
        json={"name": f"Beneficiary Aid {uuid4().hex[:6]}", "group_id": group_id},
        headers=auth_headers
    )
    assert res_b.status_code == 201
    ben_id = res_b.json()["id"]

    # 3. Disburse Qard Hasan assistance of 2000.00 funded by this group
    res_a = client.post(
        "/api/v1/assistance",
        json={
            "assistance_type": "QARD_HASAN",
            "beneficiary_id": ben_id,
            "total_amount": 2000.0,
            "disbursement_date": str(date.today()),
            "purpose": "Small Enterprise Support",
            "funding_allocations": [{"group_id": group_id, "allocated_amount": 2000.0}],
            "installment_count": 4,
            "first_due_date": str(date.today())
        },
        headers=auth_headers
    )
    assert res_a.status_code == 201
    asst_id = res_a.json()["id"]

    # Check group balance: 5000 - 2000 = 3000
    res_g_check = client.get(f"/api/v1/groups/{group_id}", headers=auth_headers)
    assert Decimal(str(res_g_check.json()["available_balance"])) == Decimal("3000.00")

    # 4. Record a repayment of 500.00
    res_r = client.post(
        "/api/v1/repayments",
        json={
            "assistance_id": asst_id,
            "amount": 500.0,
            "payment_date": str(date.today()),
            "payment_method": "CASH"
        },
        headers=auth_headers
    )
    assert res_r.status_code == 201

    # Check group balance: 3000 + 500 = 3500
    res_g_check2 = client.get(f"/api/v1/groups/{group_id}", headers=auth_headers)
    assert Decimal(str(res_g_check2.json()["available_balance"])) == Decimal("3500.00")

    # 5. HARD DELETE Beneficiary
    res_del = client.delete(f"/api/v1/beneficiaries/{ben_id}", headers=auth_headers)
    assert res_del.status_code == 200
    assert res_del.json()["success"] is True

    # 6. Verify Beneficiary is gone
    res_b_get = client.get(f"/api/v1/beneficiaries/{ben_id}", headers=auth_headers)
    assert res_b_get.status_code == 404

    # 7. Verify Group Balance is recalculated (back to 5000.00 opening balance)
    res_g_after = client.get(f"/api/v1/groups/{group_id}", headers=auth_headers)
    assert Decimal(str(res_g_after.json()["available_balance"])) == Decimal("5000.00")

    # Clean up group
    client.delete(f"/api/v1/groups/{group_id}", headers=auth_headers)


def test_hard_delete_group_with_members_beneficiaries_and_financials(auth_headers):
    """
    Test that an authorized admin can hard delete a fund group with members, beneficiaries, contributions, and donations.
    Verifies that all group-specific records are removed and unrelated groups remain untouched.
    """
    # 1. Create Target Group
    res_g1 = client.post(
        "/api/v1/groups",
        json={"name": f"Target Group {uuid4().hex[:6]}", "group_type": "MEMBER_FUND", "opening_balance": 3000.0},
        headers=auth_headers
    )
    assert res_g1.status_code == 201
    g1_id = res_g1.json()["id"]

    # 2. Create Unrelated Control Group
    res_g2 = client.post(
        "/api/v1/groups",
        json={"name": f"Control Group {uuid4().hex[:6]}", "group_type": "EXTERNAL_FUND", "opening_balance": 7000.0},
        headers=auth_headers
    )
    assert res_g2.status_code == 201
    g2_id = res_g2.json()["id"]

    # 3. Add Member and Contribution to Target Group
    res_m = client.post(
        "/api/v1/members",
        json={"name": f"Group Member {uuid4().hex[:6]}", "group_id": g1_id, "monthly_contribution_amount": 500.0},
        headers=auth_headers
    )
    assert res_m.status_code == 201
    m_id = res_m.json()["id"]

    res_c = client.post(
        "/api/v1/contributions",
        json={"member_id": m_id, "amount": 500.0, "contribution_date": str(date.today()), "payment_method": "CASH"},
        headers=auth_headers
    )
    assert res_c.status_code == 201

    # 4. Add Beneficiary and Assistance to Target Group
    res_b = client.post(
        "/api/v1/beneficiaries",
        json={"name": f"Group Beneficiary {uuid4().hex[:6]}", "group_id": g1_id},
        headers=auth_headers
    )
    assert res_b.status_code == 201
    b_id = res_b.json()["id"]

    res_a = client.post(
        "/api/v1/assistance",
        json={
            "assistance_type": "SADAQAH",
            "beneficiary_id": b_id,
            "total_amount": 1000.0,
            "disbursement_date": str(date.today()),
            "purpose": "Emergency Aid",
            "funding_allocations": [{"group_id": g1_id, "allocated_amount": 1000.0}]
        },
        headers=auth_headers
    )
    assert res_a.status_code == 201

    # 5. Add Donation to Control Group
    res_d = client.post(
        "/api/v1/donations",
        json={"group_id": g2_id, "donor_name": "Dr. Rahim", "amount": 2500.0, "donation_date": str(date.today()), "payment_method": "CASH"},
        headers=auth_headers
    )
    assert res_d.status_code == 201

    # 6. HARD DELETE Target Group
    res_del = client.delete(f"/api/v1/groups/{g1_id}", headers=auth_headers)
    assert res_del.status_code == 200
    assert res_del.json()["success"] is True

    # 7. Verify Target Group is gone
    assert client.get(f"/api/v1/groups/{g1_id}", headers=auth_headers).status_code == 404
    assert client.get(f"/api/v1/members/{m_id}", headers=auth_headers).status_code == 404
    assert client.get(f"/api/v1/beneficiaries/{b_id}", headers=auth_headers).status_code == 404

    # 8. Verify Control Group and its donation/balance remain 100% intact (7000 + 2500 = 9500.00)
    res_g2_check = client.get(f"/api/v1/groups/{g2_id}", headers=auth_headers)
    assert res_g2_check.status_code == 200
    assert Decimal(str(res_g2_check.json()["available_balance"])) == Decimal("9500.00")

    # Clean up control group
    client.delete(f"/api/v1/groups/{g2_id}", headers=auth_headers)
