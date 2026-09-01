import pytest
import uuid
from decimal import Decimal
from datetime import date
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.group import Group
from app.models.member import Member
from app.models.contribution import Contribution, MonthlyContributionAllocation

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

def test_monthly_summary_empty(auth_headers):
    res = client.get("/api/v1/contributions/monthly-summary?year=2026", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["year"] == 2026
    assert isinstance(data["available_years"], list)
    assert 2026 in data["available_years"]
    assert "total_members" in data
    assert "page" in data
    assert "page_size" in data
    assert "items" in data

def test_monthly_summary_with_multi_month_payments(auth_headers):
    unique_id = uuid.uuid4().hex[:6]
    
    # 1. Create a test group
    g_res = client.post("/api/v1/groups", headers=auth_headers, json={
        "name": f"Monthly Summary Circle {unique_id}",
        "code": f"MS-{unique_id}".upper(),
        "description": "Group for testing monthly summary matrix"
    })
    assert g_res.status_code == 201
    group_id = g_res.json()["id"]

    # 2. Create Member A (default ৳500/month)
    m1_res = client.post("/api/v1/members", headers=auth_headers, json={
        "name": f"Full Year Member {unique_id}",
        "group_id": group_id,
        "member_code": f"M1-{unique_id}".upper(),
        "phone": f"+88017{unique_id[:8]}"
    })
    assert m1_res.status_code == 201
    member1_id = m1_res.json()["id"]

    # 3. Create Member B (custom pledge ৳1,000/month)
    m2_res = client.post("/api/v1/members", headers=auth_headers, json={
        "name": f"Partial Year Member {unique_id}",
        "group_id": group_id,
        "member_code": f"M2-{unique_id}".upper(),
        "phone": f"+88018{unique_id[:8]}",
        "monthly_contribution_amount": 1000.00
    })
    assert m2_res.status_code == 201
    member2_id = m2_res.json()["id"]

    # 4. Record a 12-month payment for Member 1 (Jan 2026 .. Dec 2026 = 12 x 500 = 6,000)
    all_12_months = [f"2026-{m:02d}-01" for m in range(1, 13)]
    c1_res = client.post("/api/v1/contributions", headers=auth_headers, json={
        "member_id": member1_id,
        "amount": 6000.00,
        "payment_method": "BANK_TRANSFER",
        "selected_months": all_12_months,
        "notes": "Full year advance payment"
    })
    assert c1_res.status_code == 201
    c1_receipt = c1_res.json()["receipt_number"]

    # 5. Record a 3-month payment for Member 2 (Jan..Mar 2026 = 3 x 1000 = 3,000)
    three_months = ["2026-01-01", "2026-02-01", "2026-03-01"]
    c2_res = client.post("/api/v1/contributions", headers=auth_headers, json={
        "member_id": member2_id,
        "amount": 3000.00,
        "payment_method": "CASH",
        "selected_months": three_months,
        "notes": "Q1 3-month payment"
    })
    assert c2_res.status_code == 201
    c2_receipt = c2_res.json()["receipt_number"]

    # 6. Fetch 2026 Monthly Summary
    sum_res = client.get(f"/api/v1/contributions/monthly-summary?year=2026&group_id={group_id}", headers=auth_headers)
    assert sum_res.status_code == 200
    data = sum_res.json()
    assert data["year"] == 2026
    assert data["total_members"] == 2
    assert len(data["items"]) == 2

    # Verify Member 1: all 12 months marked PAID
    row1 = next((r for r in data["items"] if r["member_id"] == member1_id), None)
    assert row1 is not None
    assert Decimal(str(row1["monthly_expected_amount"])) == Decimal("500.00")
    assert Decimal(str(row1["total_year_paid"])) == Decimal("6000.00")
    assert Decimal(str(row1["total_year_expected"])) == Decimal("6000.00")
    assert len(row1["months"]) == 12
    for m in row1["months"]:
        assert m["status"] == "PAID", f"Month {m['month_name']} was expected to be PAID"
        assert Decimal(str(m["paid_amount"])) == Decimal("500.00")
        assert c1_receipt in m["receipt_numbers"]

    # Verify Member 2: Jan, Feb, Mar marked PAID
    row2 = next((r for r in data["items"] if r["member_id"] == member2_id), None)
    assert row2 is not None
    assert Decimal(str(row2["monthly_expected_amount"])) == Decimal("1000.00")
    assert Decimal(str(row2["total_year_paid"])) == Decimal("3000.00")
    assert Decimal(str(row2["total_year_expected"])) == Decimal("12000.00")
    assert len(row2["months"]) == 12

    for m in row2["months"][:3]: # Jan, Feb, Mar
        assert m["status"] == "PAID", f"Month {m['month_name']} was expected to be PAID"
        assert Decimal(str(m["paid_amount"])) == Decimal("1000.00")
        assert c2_receipt in m["receipt_numbers"]


def test_exact_four_statuses_and_complex_schedule(auth_headers):
    """
    Test exact 4 statuses:
    PAID, CURRENT_PENDING, DUE, FUTURE_MONTH
    
    Member with:
    - Jan paid
    - Feb paid
    - Mar unpaid
    - Apr unpaid
    - May unpaid
    - Jun paid
    - Jul unpaid
    - Aug unpaid
    - Sep (current month in 2026-09) unpaid
    - Oct unpaid
    - Nov prepaid
    - Dec unpaid
    """
    unique_id = uuid.uuid4().hex[:6]
    today = date.today()
    curr_year = today.year
    curr_month = today.month

    # 1. Create Group & Member
    g_res = client.post("/api/v1/groups", headers=auth_headers, json={
        "name": f"Status Logic Circle {unique_id}",
        "code": f"SLC-{unique_id}".upper()
    })
    assert g_res.status_code == 201
    group_id = g_res.json()["id"]

    m_res = client.post("/api/v1/members", headers=auth_headers, json={
        "name": f"Complex Schedule Member {unique_id}",
        "group_id": group_id,
        "member_code": f"CSM-{unique_id}".upper(),
        "monthly_contribution_amount": 500.00
    })
    assert m_res.status_code == 201
    member_id = m_res.json()["id"]

    # 2. Pay Jan, Feb, Jun, Nov for current year
    paid_months = [
        f"{curr_year}-01-01",
        f"{curr_year}-02-01",
        f"{curr_year}-06-01",
        f"{curr_year}-11-01",
    ]
    pay_res = client.post("/api/v1/contributions", headers=auth_headers, json={
        "member_id": member_id,
        "amount": 2000.00,
        "payment_method": "MOBILE_BANKING",
        "selected_months": paid_months,
        "notes": "Jan, Feb, Jun, and Nov prepaid"
    })
    assert pay_res.status_code == 201

    # 3. Query current year monthly summary
    sum_res = client.get(f"/api/v1/contributions/monthly-summary?year={curr_year}&group_id={group_id}", headers=auth_headers)
    assert sum_res.status_code == 200
    row = sum_res.json()["items"][0]
    months = row["months"]

    # Check each month
    for m in months:
        m_idx = m["month_index"]
        expected_status = None
        if m_idx in (1, 2, 6, 11): # Jan, Feb, Jun, Nov
            expected_status = "PAID"
        elif m_idx < curr_month:
            expected_status = "DUE"
        elif m_idx == curr_month:
            expected_status = "CURRENT_PENDING"
        else:
            expected_status = "FUTURE_MONTH"

        assert m["status"] == expected_status, f"Month {m['month_name']} (index {m_idx}) has status '{m['status']}', expected '{expected_status}'"

    # 4. Check Previous Year (all unpaid are DUE, paid are PAID)
    prev_year = curr_year - 1
    prev_res = client.get(f"/api/v1/contributions/monthly-summary?year={prev_year}&group_id={group_id}", headers=auth_headers)
    assert prev_res.status_code == 200
    prev_row = prev_res.json()["items"][0]
    for m in prev_row["months"]:
        assert m["status"] == "DUE", f"Previous year month {m['month_name']} expected DUE, got {m['status']}"

    # 5. Check Future Year (all unpaid are FUTURE_MONTH, paid are PAID)
    next_year = curr_year + 1
    next_res = client.get(f"/api/v1/contributions/monthly-summary?year={next_year}&group_id={group_id}", headers=auth_headers)
    assert next_res.status_code == 200
    next_row = next_res.json()["items"][0]
    for m in next_row["months"]:
        assert m["status"] == "FUTURE_MONTH", f"Future year month {m['month_name']} expected FUTURE_MONTH, got {m['status']}"


def test_monthly_summary_pagination_and_search(auth_headers):
    unique_id = uuid.uuid4().hex[:6]
    
    # 1. Create a group with 15 members
    g_res = client.post("/api/v1/groups", headers=auth_headers, json={
        "name": f"Pagination Group {unique_id}",
        "code": f"PG-{unique_id}".upper()
    })
    assert g_res.status_code == 201
    group_id = g_res.json()["id"]

    for i in range(15):
        client.post("/api/v1/members", headers=auth_headers, json={
            "name": f"Paging Member {unique_id} {i+1:02d}",
            "group_id": group_id,
            "member_code": f"PM-{unique_id}-{i+1:02d}".upper()
        })

    # Test page_size = 10
    res_p1 = client.get(f"/api/v1/contributions/monthly-summary?year=2026&group_id={group_id}&page=1&page_size=10", headers=auth_headers)
    assert res_p1.status_code == 200
    d_p1 = res_p1.json()
    assert d_p1["total_members"] == 15
    assert d_p1["page"] == 1
    assert d_p1["page_size"] == 10
    assert d_p1["total_pages"] == 2
    assert len(d_p1["items"]) == 10

    # Test page_size = 25
    res_p25 = client.get(f"/api/v1/contributions/monthly-summary?year=2026&group_id={group_id}&page=1&page_size=25", headers=auth_headers)
    assert res_p25.status_code == 200
    d_p25 = res_p25.json()
    assert len(d_p25["items"]) == 15
    assert d_p25["total_pages"] == 1

    # Test search filter
    search_res = client.get(f"/api/v1/contributions/monthly-summary?year=2026&group_id={group_id}&search=Paging Member {unique_id} 05", headers=auth_headers)
    assert search_res.status_code == 200
    s_data = search_res.json()
    assert s_data["total_members"] == 1
    assert s_data["items"][0]["name"] == f"Paging Member {unique_id} 05"
