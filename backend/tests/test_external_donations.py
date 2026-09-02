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

def test_external_fund_groups_and_donations_flow(auth_headers):
    # 1. Create a Member Fund Group
    res_mg = client.post(
        "/api/v1/groups",
        json={
            "name": f"Member Group {uuid4().hex[:4]}",
            "group_type": "MEMBER_FUND",
            "opening_balance": 5000.00
        },
        headers=auth_headers
    )
    assert res_mg.status_code == 201
    member_group = res_mg.json()
    mg_id = member_group["id"]
    assert member_group["group_type"] == "MEMBER_FUND"
    assert Decimal(str(member_group["available_balance"])) == Decimal("5000.00")

    # 2. Create an External Fund Group (e.g. General Donation Fund)
    res_eg = client.post(
        "/api/v1/groups",
        json={
            "name": f"General Donation Fund {uuid4().hex[:4]}",
            "group_type": "EXTERNAL_FUND",
            "opening_balance": 20000.00
        },
        headers=auth_headers
    )
    assert res_eg.status_code == 201
    external_group = res_eg.json()
    eg_id = external_group["id"]
    assert external_group["group_type"] == "EXTERNAL_FUND"
    assert Decimal(str(external_group["available_balance"])) == Decimal("20000.00")

    # 3. VERIFY: Member CANNOT be assigned to External Fund Group
    res_mem_fail = client.post(
        "/api/v1/members",
        json={
            "name": "Invalid Member Candidate",
            "group_id": eg_id
        },
        headers=auth_headers
    )
    assert res_mem_fail.status_code == 400
    assert "External Fund Group" in res_mem_fail.json()["detail"]

    # 4. Create a valid member in Member Fund Group
    res_mem = client.post(
        "/api/v1/members",
        json={
            "name": "Brother Rahim",
            "group_id": mg_id,
            "monthly_contribution_amount": 500.00
        },
        headers=auth_headers
    )
    assert res_mem.status_code == 201
    valid_member = res_mem.json()
    member_id = valid_member["id"]

    # 5. VERIFY: Member cannot be updated to move to External Fund Group
    res_mem_patch_fail = client.patch(
        f"/api/v1/members/{member_id}",
        json={"group_id": eg_id},
        headers=auth_headers
    )
    assert res_mem_patch_fail.status_code == 400
    assert "External Fund Group" in res_mem_patch_fail.json()["detail"]

    # 6. VERIFY: External Donation CANNOT be deposited into Member Fund Group
    res_don_fail = client.post(
        "/api/v1/donations",
        json={
            "donor_name": "Abdullah Ahmed",
            "donor_phone": "01711000000",
            "amount": 10000.00,
            "group_id": mg_id,
            "donation_date": str(date.today()),
            "purpose": "General Donation",
            "payment_method": "CASH"
        },
        headers=auth_headers
    )
    assert res_don_fail.status_code == 400
    assert "External Fund Groups" in res_don_fail.json()["detail"]

    # 7. Record an External Donation into External Fund Group
    res_don = client.post(
        "/api/v1/donations",
        json={
            "donor_name": "Abdullah Ahmed",
            "donor_phone": "01711000000",
            "donor_email": "abdullah@example.com",
            "amount": 30000.00,
            "group_id": eg_id,
            "donation_date": str(date.today()),
            "purpose": "General Donation",
            "payment_method": "CASH",
            "reference_number": "CASH-REC-101",
            "notes": "Generous donation for education assistance"
        },
        headers=auth_headers
    )
    assert res_don.status_code == 201
    donation = res_don.json()
    don_id = donation["id"]
    assert donation["receipt_number"].startswith("DON-")
    assert donation["donor_name"] == "Abdullah Ahmed"
    assert Decimal(str(donation["amount"])) == Decimal("30000.00")
    assert donation["is_voided"] is False

    # 8. VERIFY: External Fund Group balance is Opening (20,000) + Donation (30,000) = 50,000
    res_eg_detail = client.get(f"/api/v1/groups/{eg_id}", headers=auth_headers)
    assert res_eg_detail.status_code == 200
    eg_data = res_eg_detail.json()
    assert Decimal(str(eg_data["available_balance"])) == Decimal("50000.00")
    assert Decimal(str(eg_data["current_balance"])) == Decimal("50000.00")
    assert Decimal(str(eg_data["total_donations"])) == Decimal("30000.00")

    # 9. VERIFY: Donor does NOT appear in Members list
    res_members_list = client.get("/api/v1/members?search=Abdullah", headers=auth_headers)
    assert res_members_list.status_code == 200
    assert len(res_members_list.json()) == 0

    # 10. VERIFY: Donation does NOT appear in Member Contributions list
    res_contribs_list = client.get(f"/api/v1/contributions?search={donation['receipt_number']}", headers=auth_headers)
    assert res_contribs_list.status_code == 200
    assert len(res_contribs_list.json()) == 0

    # 11. VERIFY: Donation appears in Donation Ledger
    res_don_ledger = client.get(f"/api/v1/donations/ledger?group_id={eg_id}", headers=auth_headers)
    assert res_don_ledger.status_code == 200
    don_ledger = res_don_ledger.json()
    assert don_ledger["total_count"] >= 1
    assert Decimal(str(don_ledger["total_amount"])) >= Decimal("30000.00")

    # 12. VERIFY: External Fund Group ledger has OPENING_BALANCE credit and DONATION credit
    res_eg_ledger = client.get(f"/api/v1/groups/{eg_id}/ledger", headers=auth_headers)
    assert res_eg_ledger.status_code == 200
    eg_ledger = res_eg_ledger.json()
    assert Decimal(str(eg_ledger["current_balance"])) == Decimal("50000.00")
    assert len(eg_ledger["entries"]) == 2

    # 13. Create a Beneficiary and disburse Sadaqah assistance from External Fund Group
    res_ben = client.post(
        "/api/v1/beneficiaries",
        json={
            "name": "Beneficiary Sister Fatima",
            "group_id": mg_id,
            "phone": "01811223344"
        },
        headers=auth_headers
    )
    assert res_ben.status_code == 201
    ben_id = res_ben.json()["id"]

    res_sd = client.post(
        "/api/v1/assistance",
        json={
            "beneficiary_id": ben_id,
            "assistance_type": "SADAQAH",
            "total_amount": 10000.00,
            "disbursement_date": str(date.today()),
            "purpose": "Medical Emergency Support",
            "funding_allocations": [
                {
                    "group_id": eg_id,
                    "allocated_amount": 10000.00
                }
            ]
        },
        headers=auth_headers
    )
    assert res_sd.status_code == 201

    # 14. VERIFY: External Fund Group balance decreased from 50,000 to 40,000
    res_eg_after_sd = client.get(f"/api/v1/groups/{eg_id}", headers=auth_headers)
    assert res_eg_after_sd.status_code == 200
    assert Decimal(str(res_eg_after_sd.json()["available_balance"])) == Decimal("40000.00")
    assert Decimal(str(res_eg_after_sd.json()["total_sadaqah_funded"])) == Decimal("10000.00")

    # 15. VERIFY: Group Fund & Utilization shows the assistance allocation
    res_eg_fund = client.get(f"/api/v1/groups/{eg_id}/fund", headers=auth_headers)
    assert res_eg_fund.status_code == 200
    eg_fund_data = res_eg_fund.json()
    assert Decimal(str(eg_fund_data["available_balance"])) == Decimal("40000.00")
    assert len(eg_fund_data["allocations"]) == 1
    assert eg_fund_data["allocations"][0]["beneficiary_name"] == "Beneficiary Sister Fatima"

    # 16. Test voiding donation:
    # Record another donation of 5,000 and void it
    res_don2 = client.post(
        "/api/v1/donations",
        json={
            "donor_name": "Test Donor For Void",
            "amount": 5000.00,
            "group_id": eg_id,
            "donation_date": str(date.today()),
            "purpose": "Accidental Entry"
        },
        headers=auth_headers
    )
    assert res_don2.status_code == 201
    don2_id = res_don2.json()["id"]

    # Balance now 45,000
    res_eg_check = client.get(f"/api/v1/groups/{eg_id}", headers=auth_headers)
    assert Decimal(str(res_eg_check.json()["available_balance"])) == Decimal("45000.00")

    # Void the donation
    res_void = client.post(
        f"/api/v1/donations/{don2_id}/void",
        json={"reason": "Incorrect amount entered by cashier"},
        headers=auth_headers
    )
    assert res_void.status_code == 200
    assert res_void.json()["is_voided"] is True

    # Balance returned to 40,000
    res_eg_after_void = client.get(f"/api/v1/groups/{eg_id}", headers=auth_headers)
    assert Decimal(str(res_eg_after_void.json()["available_balance"])) == Decimal("40000.00")
