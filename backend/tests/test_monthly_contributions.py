import sys, os
import uuid
from decimal import Decimal
from datetime import date, timedelta
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath("backend"))

import pytest
from app.main import app
from app.core.database import SessionLocal
from app.models import User, Group, Member, Contribution, MonthlyContributionDue
from app.core.security import create_access_token

client = TestClient(app)

@pytest.fixture
def auth_headers():
    db = SessionLocal()
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        admin = db.query(User).filter(User.email == "admin@foundation.org").first()
    db.close()
    assert admin is not None, "Super admin user not found in database."
    token = create_access_token(subject=str(admin.id))
    return {"Authorization": f"Bearer {token}"}

def test_monthly_contributions_complete_workflow(auth_headers):
    # 1. Update Global Contribution Settings
    res_set = client.put("/api/v1/settings/contributions", headers=auth_headers, json={
        "config_data": {
            "default_monthly_contribution": 500.00,
            "default_frequency": "MONTHLY",
            "monthly_due_day": 10,
            "grace_period_days": 5,
            "overdue_threshold_days": 35,
            "allow_partial_contributions": True,
            "auto_receipt_generation": True
        }
    })
    assert res_set.status_code == 200

    # 2. Create a test Fund Group
    grp_name = f"Monthly Test Group {uuid.uuid4().hex[:6]}"
    res_grp = client.post("/api/v1/groups", headers=auth_headers, json={
        "name": grp_name,
        "opening_balance": 0
    })
    assert res_grp.status_code == 201
    group = res_grp.json()
    group_id = group["id"]
    assert Decimal(str(group["current_balance"])) == Decimal("0.00")

    # 3. Create Member A (uses default ৳500)
    res_ma = client.post("/api/v1/members", headers=auth_headers, json={
        "name": f"Member A {uuid.uuid4().hex[:4]}",
        "group_id": group_id,
        "monthly_contribution_amount": None  # defaults to 500
    })
    assert res_ma.status_code == 201
    member_a = res_ma.json()
    assert Decimal(str(member_a["effective_monthly_contribution"])) == Decimal("500.00")

    # 4. Create Member B (custom ৳1,000)
    res_mb = client.post("/api/v1/members", headers=auth_headers, json={
        "name": f"Member B {uuid.uuid4().hex[:4]}",
        "group_id": group_id,
        "monthly_contribution_amount": 1000.00
    })
    assert res_mb.status_code == 201
    member_b = res_mb.json()
    assert Decimal(str(member_b["effective_monthly_contribution"])) == Decimal("1000.00")

    # 5. Generate Dues for 2026-09
    res_dues = client.get("/api/v1/contributions/due?month=2026-09&group_id=" + group_id, headers=auth_headers)
    assert res_dues.status_code == 200
    dues_list = res_dues.json()
    assert len(dues_list) >= 2

    due_a = next(d for d in dues_list if d["member_id"] == member_a["id"])
    due_b = next(d for d in dues_list if d["member_id"] == member_b["id"])

    assert Decimal(str(due_a["expected_amount"])) == Decimal("500.00")
    assert Decimal(str(due_a["paid_amount"])) == Decimal("0.00")
    assert Decimal(str(due_a["remaining_due"])) == Decimal("500.00")

    assert Decimal(str(due_b["expected_amount"])) == Decimal("1000.00")
    assert Decimal(str(due_b["paid_amount"])) == Decimal("0.00")
    assert Decimal(str(due_b["remaining_due"])) == Decimal("1000.00")

    # 6. CRITICAL FINANCIAL INVARIANT: Dues generation does NOT credit the group balance
    res_grp_chk = client.get(f"/api/v1/groups/{group_id}", headers=auth_headers)
    assert Decimal(str(res_grp_chk.json()["current_balance"])) == Decimal("0.00")

    # 7. Record full payment for Member A (৳500 for 2026-09)
    res_pay_a = client.post("/api/v1/contributions", headers=auth_headers, json={
        "member_id": member_a["id"],
        "amount": 500.00,
        "contribution_date": "2026-09-05",
        "contribution_month": "2026-09-01",
        "payment_method": "CASH",
        "notes": "Full September contribution"
    })
    assert res_pay_a.status_code == 201
    contrib_a = res_pay_a.json()

    # 8. Check Member A due status is now PAID
    res_due_chk = client.get(f"/api/v1/contributions/due?month=2026-09&member_id={member_a['id']}", headers=auth_headers)
    due_a_updated = res_due_chk.json()[0]
    assert Decimal(str(due_a_updated["paid_amount"])) == Decimal("500.00")
    assert Decimal(str(due_a_updated["remaining_due"])) == Decimal("0.00")
    assert due_a_updated["status"] == "PAID"

    # 9. Verify Group balance increased by ৳500 in ledger
    res_grp_after_a = client.get(f"/api/v1/groups/{group_id}", headers=auth_headers)
    assert Decimal(str(res_grp_after_a.json()["current_balance"])) == Decimal("500.00")

    # 10. Record partial payment for Member B (৳300 of ৳1,000)
    res_pay_b = client.post("/api/v1/contributions", headers=auth_headers, json={
        "member_id": member_b["id"],
        "amount": 300.00,
        "contribution_date": "2026-09-08",
        "contribution_month": "2026-09-01",
        "payment_method": "BANK_TRANSFER",
        "notes": "Partial deposit"
    })
    assert res_pay_b.status_code == 201

    # 11. Check Member B due status is now PARTIAL
    res_due_b_chk = client.get(f"/api/v1/contributions/due?month=2026-09&member_id={member_b['id']}", headers=auth_headers)
    due_b_updated = res_due_b_chk.json()[0]
    assert Decimal(str(due_b_updated["paid_amount"])) == Decimal("300.00")
    assert Decimal(str(due_b_updated["remaining_due"])) == Decimal("700.00")
    assert due_b_updated["status"] == "PARTIAL"

    # 12. Verify Group balance is now ৳800.00 (500 + 300)
    res_grp_after_b = client.get(f"/api/v1/groups/{group_id}", headers=auth_headers)
    assert Decimal(str(res_grp_after_b.json()["current_balance"])) == Decimal("800.00")

    # 13. Check Member A Ledger (both financial entries and dues schedule)
    res_led_a = client.get(f"/api/v1/members/{member_a['id']}/ledger", headers=auth_headers)
    assert res_led_a.status_code == 200
    led_a = res_led_a.json()
    assert Decimal(str(led_a["total_contributions"])) == Decimal("500.00")
    assert len(led_a["entries"]) == 1
    assert len(led_a["monthly_dues"]) >= 1
    assert led_a["monthly_dues"][0]["status"] == "PAID"

    # 14. Check Summary KPIs endpoint
    res_sum = client.get(f"/api/v1/contributions/summary?month=2026-09&group_id={group_id}", headers=auth_headers)
    assert res_sum.status_code == 200
    sum_data = res_sum.json()
    assert Decimal(str(sum_data["total_expected_due"])) == Decimal("1500.00")  # 500 + 1000
    assert Decimal(str(sum_data["total_collected"])) == Decimal("800.00")      # 500 + 300
    assert Decimal(str(sum_data["total_outstanding"])) == Decimal("700.00")    # 700 remaining on B
    assert sum_data["paid_count"] == 1
    assert sum_data["partial_count"] == 1

    # 15. Check Dues Report endpoint
    res_rep = client.get(f"/api/v1/reports/dues?group_id={group_id}", headers=auth_headers)
    assert res_rep.status_code == 200
    rep_data = res_rep.json()
    assert Decimal(str(rep_data["total_expected"])) >= Decimal("1500.00")
    assert Decimal(str(rep_data["total_collected"])) >= Decimal("800.00")

    # 16. Update Member B monthly pledge to ৳1,200
    res_up_b = client.patch(f"/api/v1/members/{member_b['id']}", headers=auth_headers, json={
        "monthly_contribution_amount": 1200.00
    })
    assert res_up_b.status_code == 200
    assert Decimal(str(res_up_b.json()["monthly_contribution_amount"])) == Decimal("1200.00")

    # Historical check: Sep 2026 due for Member B is UNCHANGED at ৳1,000 expected
    res_due_b_sep = client.get(f"/api/v1/contributions/due?month=2026-09&member_id={member_b['id']}", headers=auth_headers)
    assert Decimal(str(res_due_b_sep.json()[0]["expected_amount"])) == Decimal("1000.00")

    # New month check: Oct 2026 due for Member B generates at ৳1,200
    res_due_b_oct = client.get(f"/api/v1/contributions/due?month=2026-10&member_id={member_b['id']}", headers=auth_headers)
    due_b_oct = res_due_b_oct.json()[0]
    assert Decimal(str(due_b_oct["expected_amount"])) == Decimal("1200.00")

    # 17. Void Member A's payment and verify reversals
    res_void = client.post(f"/api/v1/contributions/{contrib_a['id']}/void", headers=auth_headers, json={
        "reason": "Test accidental double receipt"
    })
    assert res_void.status_code == 200

    # Group balance should drop back down from ৳800 to ৳300
    res_grp_after_void = client.get(f"/api/v1/groups/{group_id}", headers=auth_headers)
    assert Decimal(str(res_grp_after_void.json()["current_balance"])) == Decimal("300.00")

    # Member A's Sep 2026 due status should revert to DUE
    res_due_a_reverted = client.get(f"/api/v1/contributions/due?month=2026-09&member_id={member_a['id']}", headers=auth_headers)
    assert Decimal(str(res_due_a_reverted.json()[0]["paid_amount"])) == Decimal("0.00")
    assert Decimal(str(res_due_a_reverted.json()[0]["remaining_due"])) == Decimal("500.00")
