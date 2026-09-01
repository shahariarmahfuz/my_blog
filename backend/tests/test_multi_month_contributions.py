import uuid
import pytest
from datetime import date
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models import User, Group, Member, Contribution, MonthlyContributionDue, MonthlyContributionAllocation
from app.models.ledger import LedgerEntry

client = TestClient(app)

def get_auth_headers(username="admin", password="admin123456"):
    res = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="module")
def auth_headers():
    return get_auth_headers()

def test_multi_month_schedule_and_advance_payments(auth_headers):
    suffix = uuid.uuid4().hex[:6].upper()
    group_id = None
    try:
        # 1. Create a dedicated fund group
        g_res = client.post("/api/v1/groups", json={
            "name": f"Multi Month Test Group {suffix}",
            "code": f"MMG_{suffix}",
            "description": "Group for testing multi-month advance payments",
            "opening_balance": 1000.00
        }, headers=auth_headers)
        assert g_res.status_code == 201
        group_id = g_res.json()["id"]

        # 2. Register Member with ৳500/mo pledge
        m_res = client.post("/api/v1/members", json={
            "name": f"Mahfuz Multi-Month Tester {suffix}",
            "group_id": group_id,
            "monthly_contribution_amount": 500.00,
            "is_active": True
        }, headers=auth_headers)
        assert m_res.status_code == 201
        member_id = m_res.json()["id"]

        # 3. Fetch Member's multi-month schedule
        sched_res = client.get(f"/api/v1/contributions/member-schedule/{member_id}?start_year=2026&end_year=2026", headers=auth_headers)
        assert sched_res.status_code == 200
        sched_data = sched_res.json()
        assert sched_data["member_id"] == member_id
        assert Decimal(str(sched_data["monthly_pledge"])) == Decimal("500.00")
        assert len(sched_data["months"]) == 12

        # Verify all past/current unpaid initially (Jan-Sep 2026 = 9 months)
        assert sched_data["unpaid_months_count"] == 9
        assert Decimal(str(sched_data["unpaid_total_due"])) == Decimal("4500.00")

        # 4. Multi-month payment: Select 3 months (Jan, Feb, Mar 2026) -> Total ৳1,500
        pay_res = client.post("/api/v1/contributions", json={
            "member_id": member_id,
            "amount": 1500.00,
            "selected_months": ["2026-01-01", "2026-02-01", "2026-03-01"],
            "contribution_date": "2026-01-05",
            "payment_method": "MOBILE_BANKING",
            "reference_number": "TRX-JAN-MAR",
            "notes": "Paid 3 months in advance"
        }, headers=auth_headers)
        assert pay_res.status_code == 201
        cont = pay_res.json()

        assert cont["months_count"] == 3
        assert "January 2026 – March 2026 (3 months)" in cont["months_summary"]
        assert len(cont["allocations"]) == 3
        for alloc in cont["allocations"]:
            assert Decimal(str(alloc["allocated_amount"])) == Decimal("500.00")

        # 5. Verify Group Balance increased by ৳1,500 ONCE
        fund_res = client.get(f"/api/v1/groups/{group_id}/fund", headers=auth_headers)
        assert fund_res.status_code == 200
        fund = fund_res.json()
        assert Decimal(str(fund["current_balance"])) == Decimal("2500.00")
        assert Decimal(str(fund["available_balance"])) == Decimal("2500.00")
        assert Decimal(str(fund["total_contributions"])) == Decimal("1500.00")

        # 6. Verify Ledger has only 1 CREDIT entry for the contribution
        ledger_res = client.get(f"/api/v1/groups/{group_id}/ledger", headers=auth_headers)
        assert ledger_res.status_code == 200
        entries = ledger_res.json()["entries"]
        assert len(entries) == 2  # Opening balance (1000) + 1 Contribution credit (1500)

        # 7. Re-fetch Member's schedule to confirm Jan, Feb, Mar are marked PAID
        sched_res2 = client.get(f"/api/v1/contributions/member-schedule/{member_id}?start_year=2026&end_year=2026", headers=auth_headers)
        sched2 = sched_res2.json()
        assert sched2["unpaid_months_count"] == 6
        assert Decimal(str(sched2["unpaid_total_due"])) == Decimal("3000.00")

        jan = next(m for m in sched2["months"] if m["month_str"] == "2026-01")
        assert jan["is_paid"] is True
        assert Decimal(str(jan["paid_amount"])) == Decimal("500.00")
        assert jan["status"] == "PAID"

        feb = next(m for m in sched2["months"] if m["month_str"] == "2026-02")
        assert feb["is_paid"] is True

        mar = next(m for m in sched2["months"] if m["month_str"] == "2026-03")
        assert mar["is_paid"] is True

        apr = next(m for m in sched2["months"] if m["month_str"] == "2026-04")
        assert apr["is_paid"] is False
        assert apr["status"] == "OVERDUE"

        october = next(m for m in sched2["months"] if m["month_str"] == "2026-10")
        assert october["is_paid"] is False
        assert october["status"] == "DUE"

        # 8. Negative Test: Attempting to pay an already paid month (e.g., Jan 2026) must fail
        dup_pay = client.post("/api/v1/contributions", json={
            "member_id": member_id,
            "amount": 500.00,
            "selected_months": ["2026-01-01"],
            "contribution_date": "2026-02-01",
            "payment_method": "CASH"
        }, headers=auth_headers)
        assert dup_pay.status_code == 400
        assert "already fully paid" in dup_pay.json()["detail"]

    finally:
        if group_id:
            db_clean = SessionLocal()
            try:
                db_clean.query(MonthlyContributionAllocation).delete()
                db_clean.query(MonthlyContributionDue).delete()
                db_clean.query(LedgerEntry).filter(LedgerEntry.group_id == group_id).delete()
                db_clean.query(Contribution).filter(Contribution.group_id == group_id).delete()
                db_clean.query(Member).filter(Member.group_id == group_id).delete()
                db_clean.query(Group).filter(Group.id == group_id).delete()
                db_clean.commit()
            finally:
                db_clean.close()

def test_twelve_month_annual_payment(auth_headers):
    suffix = uuid.uuid4().hex[:6].upper()
    group_id = None
    try:
        # 1. Create a dedicated group
        g_res = client.post("/api/v1/groups", json={
            "name": f"Annual Circle {suffix}",
            "code": f"ANN_{suffix}",
            "opening_balance": 500.00
        }, headers=auth_headers)
        assert g_res.status_code == 201
        group_id = g_res.json()["id"]

        # 2. Create Member
        m_res = client.post("/api/v1/members", json={
            "name": f"Annual Contributor Brother {suffix}",
            "group_id": group_id,
            "monthly_contribution_amount": 500.00,
            "is_active": True
        }, headers=auth_headers)
        assert m_res.status_code == 201
        member_id = m_res.json()["id"]

        # 3. Pay all 12 months of 2026 in 1 payment (12 * ৳500 = ৳6,000)
        all_12_months = [f"2026-{m:02d}-01" for m in range(1, 13)]
        pay_res = client.post("/api/v1/contributions", json={
            "member_id": member_id,
            "amount": 6000.00,
            "selected_months": all_12_months,
            "contribution_date": "2026-01-10",
            "payment_method": "BANK_TRANSFER",
            "reference_number": f"SLIP-ANN-{suffix}",
            "notes": "Full annual contribution 2026"
        }, headers=auth_headers)
        assert pay_res.status_code == 201
        data = pay_res.json()
        assert data["months_count"] == 12
        assert "January 2026 – December 2026 (12 months)" in data["months_summary"]

        # 4. Group balance: 500 + 6000 = 6500.00 (EXACTLY 1 credit)
        fund_res = client.get(f"/api/v1/groups/{group_id}/fund", headers=auth_headers)
        assert Decimal(str(fund_res.json()["current_balance"])) == Decimal("6500.00")

        # 5. Fetch schedule: all 12 months should now be is_paid = True
        sched_res = client.get(f"/api/v1/contributions/member-schedule/{member_id}?start_year=2026&end_year=2026", headers=auth_headers)
        assert sched_res.status_code == 200
        sched = sched_res.json()
        assert sched["unpaid_months_count"] == 0
        assert Decimal(str(sched["unpaid_total_due"])) == Decimal("0.00")
        for m in sched["months"]:
            assert m["is_paid"] is True
            assert Decimal(str(m["remaining_due"])) == Decimal("0.00")
            assert m["status"] == "PAID"

    finally:
        if group_id:
            db_clean = SessionLocal()
            try:
                db_clean.query(MonthlyContributionAllocation).delete()
                db_clean.query(MonthlyContributionDue).delete()
                db_clean.query(LedgerEntry).filter(LedgerEntry.group_id == group_id).delete()
                db_clean.query(Contribution).filter(Contribution.group_id == group_id).delete()
                db_clean.query(Member).filter(Member.group_id == group_id).delete()
                db_clean.query(Group).filter(Group.id == group_id).delete()
                db_clean.commit()
            finally:
                db_clean.close()
