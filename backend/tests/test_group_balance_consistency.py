import uuid
import pytest
from datetime import date
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models import User, Group, Member, Beneficiary, Contribution, Assistance, QardHasanRepayment, LedgerEntry

client = TestClient(app)

def get_auth_headers(username="admin", password="admin123456"):
    res = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="module")
def auth_headers():
    return get_auth_headers()

def test_group_balance_consistency_all_scenarios(auth_headers):
    suffix = uuid.uuid4().hex[:6].upper()
    created_group_ids = []

    try:
        # =========================================================================
        # TEST 1: Previous Balance = ৳0, Contribution = ৳500 -> Available = ৳500
        # =========================================================================
        g1_res = client.post("/api/v1/groups", json={
            "name": f"Balance Test Group 1 {suffix}",
            "code": f"BTG1_{suffix}",
            "opening_balance": 0.00
        }, headers=auth_headers)
        assert g1_res.status_code == 201
        g1_id = g1_res.json()["id"]
        created_group_ids.append(g1_id)

        m1_res = client.post("/api/v1/members", json={
            "name": f"Member For G1 {suffix}",
            "group_id": g1_id,
            "monthly_contribution_amount": 500.00,
            "is_active": True
        }, headers=auth_headers)
        assert m1_res.status_code == 201
        m1_id = m1_res.json()["id"]

        # Record ৳500 contribution
        c1_res = client.post("/api/v1/contributions", json={
            "member_id": m1_id,
            "amount": 500.00,
            "selected_months": ["2026-09-01"],
            "contribution_date": "2026-09-01"
        }, headers=auth_headers)
        assert c1_res.status_code == 201

        # Verify balance in GET /groups
        list_g = client.get("/api/v1/groups", headers=auth_headers).json()
        g1_item = next(g for g in list_g if g["id"] == g1_id)
        assert Decimal(str(g1_item["current_balance"])) == Decimal("500.00")
        assert Decimal(str(g1_item["available_balance"])) == Decimal("500.00")

        # =========================================================================
        # TEST 2: Previous Balance = ৳1,000, Contribution = ৳500 -> Available = ৳1,500
        # =========================================================================
        g2_res = client.post("/api/v1/groups", json={
            "name": f"Balance Test Group 2 {suffix}",
            "code": f"BTG2_{suffix}",
            "opening_balance": 1000.00
        }, headers=auth_headers)
        assert g2_res.status_code == 201
        g2_id = g2_res.json()["id"]
        created_group_ids.append(g2_id)

        m2_res = client.post("/api/v1/members", json={
            "name": f"Member For G2 {suffix}",
            "group_id": g2_id,
            "monthly_contribution_amount": 500.00,
            "is_active": True
        }, headers=auth_headers)
        assert m2_res.status_code == 201
        m2_id = m2_res.json()["id"]

        c2_res = client.post("/api/v1/contributions", json={
            "member_id": m2_id,
            "amount": 500.00,
            "selected_months": ["2026-09-01"],
            "contribution_date": "2026-09-01"
        }, headers=auth_headers)
        assert c2_res.status_code == 201

        list_g = client.get("/api/v1/groups", headers=auth_headers).json()
        g2_item = next(g for g in list_g if g["id"] == g2_id)
        assert Decimal(str(g2_item["current_balance"])) == Decimal("1500.00")
        assert Decimal(str(g2_item["available_balance"])) == Decimal("1500.00")

        # =========================================================================
        # TEST 3 & 4: Contribution = ৳500, Qard Hasan = ৳200 -> Available = ৳300
        # And Attempt Assistance = ৳600 (exceeds balance) must be rejected by backend.
        # =========================================================================
        g3_res = client.post("/api/v1/groups", json={
            "name": f"Balance Test Group 3 {suffix}",
            "code": f"BTG3_{suffix}",
            "opening_balance": 0.00
        }, headers=auth_headers)
        assert g3_res.status_code == 201
        g3_id = g3_res.json()["id"]
        created_group_ids.append(g3_id)

        m3_res = client.post("/api/v1/members", json={
            "name": f"Member For G3 {suffix}",
            "group_id": g3_id,
            "monthly_contribution_amount": 500.00,
            "is_active": True
        }, headers=auth_headers)
        assert m3_res.status_code == 201
        m3_id = m3_res.json()["id"]

        c3_res = client.post("/api/v1/contributions", json={
            "member_id": m3_id,
            "amount": 500.00,
            "selected_months": ["2026-09-01"],
            "contribution_date": "2026-09-01"
        }, headers=auth_headers)
        assert c3_res.status_code == 201

        # Create Beneficiary for assistance
        b_res = client.post("/api/v1/beneficiaries", json={
            "name": f"Test Beneficiary G3 {suffix}",
            "group_id": g3_id,
            "is_active": True
        }, headers=auth_headers)
        assert b_res.status_code == 201
        b_id = b_res.json()["id"]

        # TEST 4: Attempt Assistance = ৳600 (exceeds ৳500 available) -> Must fail with 400
        ast_fail = client.post("/api/v1/assistance", json={
            "beneficiary_id": b_id,
            "assistance_type": "QARD_HASAN",
            "total_amount": 600.00,
            "disbursement_date": "2026-09-05",
            "funding_allocations": [{"group_id": g3_id, "allocated_amount": 600.00}]
        }, headers=auth_headers)
        assert ast_fail.status_code == 400
        assert "insufficient funds" in ast_fail.json()["detail"].lower()

        # TEST 3: Disburse Qard Hasan = ৳200 -> Available = ৳300
        ast_ok = client.post("/api/v1/assistance", json={
            "beneficiary_id": b_id,
            "assistance_type": "QARD_HASAN",
            "total_amount": 200.00,
            "disbursement_date": "2026-09-05",
            "funding_allocations": [{"group_id": g3_id, "allocated_amount": 200.00}]
        }, headers=auth_headers)
        assert ast_ok.status_code == 201
        ast_id = ast_ok.json()["id"]

        list_g = client.get("/api/v1/groups", headers=auth_headers).json()
        g3_item = next(g for g in list_g if g["id"] == g3_id)
        assert Decimal(str(g3_item["current_balance"])) == Decimal("300.00")
        assert Decimal(str(g3_item["available_balance"])) == Decimal("300.00")

        # =========================================================================
        # TEST 7: Qard Hasan repayment is received (৳100). Available increases to ৳400.
        # =========================================================================
        rep_res = client.post("/api/v1/repayments", json={
            "assistance_id": ast_id,
            "amount": 100.00,
            "payment_date": "2026-09-15",
            "payment_method": "CASH"
        }, headers=auth_headers)
        assert rep_res.status_code == 201

        list_g = client.get("/api/v1/groups", headers=auth_headers).json()
        g3_item = next(g for g in list_g if g["id"] == g3_id)
        assert Decimal(str(g3_item["current_balance"])) == Decimal("400.00")
        assert Decimal(str(g3_item["available_balance"])) == Decimal("400.00")

        # =========================================================================
        # TEST 5 & 6: Member pays 3 months together (including advance) -> 3 * ৳500 = ৳1,500.
        # Group balance increases by exactly ৳1,500 (NOT 3 credits).
        # =========================================================================
        g4_res = client.post("/api/v1/groups", json={
            "name": f"Balance Test Group 4 {suffix}",
            "code": f"BTG4_{suffix}",
            "opening_balance": 0.00
        }, headers=auth_headers)
        assert g4_res.status_code == 201
        g4_id = g4_res.json()["id"]
        created_group_ids.append(g4_id)

        m4_res = client.post("/api/v1/members", json={
            "name": f"Member For G4 {suffix}",
            "group_id": g4_id,
            "monthly_contribution_amount": 500.00,
            "is_active": True
        }, headers=auth_headers)
        assert m4_res.status_code == 201
        m4_id = m4_res.json()["id"]

        c4_res = client.post("/api/v1/contributions", json={
            "member_id": m4_id,
            "amount": 1500.00,
            "selected_months": ["2026-01-01", "2026-02-01", "2026-03-01"],
            "contribution_date": "2026-01-05"
        }, headers=auth_headers)
        assert c4_res.status_code == 201

        # =========================================================================
        # TEST 8: Verify exact same balance (৳1,500) across all endpoints for G4
        # =========================================================================
        # 1. GET /groups
        list_g4 = client.get("/api/v1/groups", headers=auth_headers).json()
        g4_from_list = next(g for g in list_g4 if g["id"] == g4_id)
        assert Decimal(str(g4_from_list["current_balance"])) == Decimal("1500.00")
        assert Decimal(str(g4_from_list["available_balance"])) == Decimal("1500.00")

        # 2. GET /groups/{id}
        g4_details = client.get(f"/api/v1/groups/{g4_id}", headers=auth_headers).json()
        assert Decimal(str(g4_details["current_balance"])) == Decimal("1500.00")
        assert Decimal(str(g4_details["available_balance"])) == Decimal("1500.00")

        # 3. GET /groups/{id}/fund
        g4_fund = client.get(f"/api/v1/groups/{g4_id}/fund", headers=auth_headers).json()
        assert Decimal(str(g4_fund["current_balance"])) == Decimal("1500.00")
        assert Decimal(str(g4_fund["available_balance"])) == Decimal("1500.00")

        # 4. GET /groups/{id}/ledger
        g4_ledger = client.get(f"/api/v1/groups/{g4_id}/ledger", headers=auth_headers).json()
        assert Decimal(str(g4_ledger["current_balance"])) == Decimal("1500.00")

        # 5. GET /groups/{id}/balance
        g4_bal = client.get(f"/api/v1/groups/{g4_id}/balance", headers=auth_headers).json()
        assert Decimal(str(g4_bal["current_balance"])) == Decimal("1500.00")
        assert Decimal(str(g4_bal["available_balance"])) == Decimal("1500.00")

        # 6. GET /reports/groups
        rpt = client.get("/api/v1/reports/groups", headers=auth_headers).json()
        g4_rpt = next(r for r in rpt if r["group_id"] == g4_id)
        assert Decimal(str(g4_rpt["current_balance"])) == Decimal("1500.00")

        # 7. GET /dashboard
        dash = client.get("/api/v1/dashboard", headers=auth_headers).json()
        g4_dash = next(g for g in dash["group_balances"] if g["id"] == g4_id)
        assert Decimal(str(g4_dash["balance"])) == Decimal("1500.00")

    finally:
        # Cleanup created test records in valid FK order
        db_clean = SessionLocal()
        try:
            from app.models import AssistanceFundingAllocation, QardHasanRepaymentAllocation, MonthlyContributionAllocation, MonthlyContributionDue
            for gid in created_group_ids:
                db_clean.query(QardHasanRepaymentAllocation).filter(QardHasanRepaymentAllocation.group_id == gid).delete()
                db_clean.query(AssistanceFundingAllocation).filter(AssistanceFundingAllocation.group_id == gid).delete()
                db_clean.query(QardHasanRepayment).delete()
                db_clean.query(Assistance).delete()
                db_clean.query(MonthlyContributionAllocation).delete()
                db_clean.query(MonthlyContributionDue).delete()
                db_clean.query(LedgerEntry).filter(LedgerEntry.group_id == gid).delete()
                db_clean.query(Contribution).filter(Contribution.group_id == gid).delete()
                db_clean.query(Beneficiary).filter(Beneficiary.group_id == gid).delete()
                db_clean.query(Member).filter(Member.group_id == gid).delete()
                db_clean.query(Group).filter(Group.id == gid).delete()
            db_clean.commit()
        finally:
            db_clean.close()
