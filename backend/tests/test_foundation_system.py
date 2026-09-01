import pytest
import sys
import os
from decimal import Decimal
from datetime import date
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import SessionLocal, engine, Base
from app.models import Group, Member, Beneficiary, Contribution, Assistance, AssistanceFundingAllocation
from app.services.ledger_service import LedgerService
from app.services.repayment_service import RepaymentService

client = TestClient(app)

@pytest.fixture(scope="session")
def super_admin_token():
    # Login as Super Admin seeded user
    res = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "admin123456"
    })
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()["access_token"]
    return token

def test_health_check():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_group_minimal_creation(super_admin_token):
    headers = {"Authorization": f"Bearer {super_admin_token}"}
    
    # 1. Create with ONLY name
    group_name = f"Test Group Minimal {os.urandom(4).hex()}"
    res = client.post("/api/v1/groups", json={"name": group_name}, headers=headers)
    assert res.status_code == 201, f"Failed to create group with only name: {res.text}"
    data = res.json()
    assert data["name"] == group_name
    assert Decimal(str(data["current_balance"])) == Decimal("0.00")
    group_id = data["id"]

    # 2. Verify creation without name fails
    res_fail = client.post("/api/v1/groups", json={}, headers=headers)
    assert res_fail.status_code == 422 # Pydantic validation error

    # 3. Verify get balance
    res_bal = client.get(f"/api/v1/groups/{group_id}/balance", headers=headers)
    assert res_bal.status_code == 200
    assert Decimal(str(res_bal.json()["current_balance"])) == Decimal("0.00")

def test_member_minimal_creation(super_admin_token):
    headers = {"Authorization": f"Bearer {super_admin_token}"}
    
    # First get or create a group
    group_name = f"Member Test Group {os.urandom(4).hex()}"
    g_res = client.post("/api/v1/groups", json={"name": group_name}, headers=headers)
    group_id = g_res.json()["id"]

    # 1. Create with ONLY name and group_id
    member_name = "Tariqul Islam"
    res = client.post("/api/v1/members", json={
        "name": member_name,
        "group_id": group_id
    }, headers=headers)
    assert res.status_code == 201, f"Failed to create member with minimal fields: {res.text}"
    data = res.json()
    assert data["name"] == member_name
    assert data["group_id"] == group_id
    assert data["phone"] is None
    assert data["email"] is None

    # 2. Verify creation without name or group fails
    res_fail = client.post("/api/v1/members", json={"name": "No Group"}, headers=headers)
    assert res_fail.status_code == 422

def test_beneficiary_minimal_creation(super_admin_token):
    headers = {"Authorization": f"Bearer {super_admin_token}"}
    
    group_name = f"Beneficiary Test Group {os.urandom(4).hex()}"
    g_res = client.post("/api/v1/groups", json={"name": group_name}, headers=headers)
    group_id = g_res.json()["id"]

    # 1. Create with ONLY name and group_id
    ben_name = "Amena Begum"
    res = client.post("/api/v1/beneficiaries", json={
        "name": ben_name,
        "group_id": group_id
    }, headers=headers)
    assert res.status_code == 201, f"Failed to create beneficiary with minimal fields: {res.text}"
    data = res.json()
    assert data["name"] == ben_name
    assert data["group_id"] == group_id

def test_contribution_ledger_and_balance(super_admin_token):
    headers = {"Authorization": f"Bearer {super_admin_token}"}
    
    # 1. Create Group
    g_res = client.post("/api/v1/groups", json={"name": f"Ledger Test Group {os.urandom(4).hex()}"}, headers=headers)
    group_id = g_res.json()["id"]

    # 2. Create Member
    m_res = client.post("/api/v1/members", json={"name": "Donor Member", "group_id": group_id}, headers=headers)
    member_id = m_res.json()["id"]

    # 3. Balance before contribution is 0
    b_res = client.get(f"/api/v1/groups/{group_id}/balance", headers=headers)
    assert Decimal(str(b_res.json()["current_balance"])) == Decimal("0.00")

    # 4. Make Contribution of 50,000 BDT
    c_res = client.post("/api/v1/contributions", json={
        "member_id": member_id,
        "group_id": group_id,
        "amount": 50000.00,
        "payment_method": "BANK_TRANSFER",
        "reference_number": "TRX-TEST-99"
    }, headers=headers)
    assert c_res.status_code == 201
    assert c_res.json()["receipt_number"].startswith("CON-")

    # 5. Balance after contribution is 50,000 BDT
    b_res2 = client.get(f"/api/v1/groups/{group_id}/balance", headers=headers)
    assert Decimal(str(b_res2.json()["current_balance"])) == Decimal("50000.00")

def test_multi_group_funding_validation_and_repayment(super_admin_token):
    headers = {"Authorization": f"Bearer {super_admin_token}"}
    
    # 1. Create 3 Groups (A, B, C)
    ga = client.post("/api/v1/groups", json={"name": f"Group A {os.urandom(3).hex()}"}, headers=headers).json()
    gb = client.post("/api/v1/groups", json={"name": f"Group B {os.urandom(3).hex()}"}, headers=headers).json()
    gc = client.post("/api/v1/groups", json={"name": f"Group C {os.urandom(3).hex()}"}, headers=headers).json()

    # 2. Create members and fund the groups: A=40,000, B=35,000, C=25,000
    ma = client.post("/api/v1/members", json={"name": "Member A", "group_id": ga["id"]}, headers=headers).json()
    mb = client.post("/api/v1/members", json={"name": "Member B", "group_id": gb["id"]}, headers=headers).json()
    mc = client.post("/api/v1/members", json={"name": "Member C", "group_id": gc["id"]}, headers=headers).json()

    client.post("/api/v1/contributions", json={"member_id": ma["id"], "group_id": ga["id"], "amount": 40000.00}, headers=headers)
    client.post("/api/v1/contributions", json={"member_id": mb["id"], "group_id": gb["id"], "amount": 35000.00}, headers=headers)
    client.post("/api/v1/contributions", json={"member_id": mc["id"], "group_id": gc["id"], "amount": 25000.00}, headers=headers)

    # 3. Create Beneficiary
    ben = client.post("/api/v1/beneficiaries", json={"name": "Borrower Ben", "group_id": ga["id"]}, headers=headers).json()

    # 4. Test Insufficient Balance Failure: Request 50,000 from Group A (which only has 40,000)
    fail_res = client.post("/api/v1/assistance", json={
        "assistance_type": "QARD_HASAN",
        "beneficiary_id": ben["id"],
        "total_amount": 100000.00,
        "funding_allocations": [
            {"group_id": ga["id"], "allocated_amount": 50000.00}, # Exceeds 40,000!
            {"group_id": gb["id"], "allocated_amount": 25000.00},
            {"group_id": gc["id"], "allocated_amount": 25000.00}
        ],
        "installments_count": 10
    }, headers=headers)
    assert fail_res.status_code == 400
    assert "Insufficient funds in Group" in fail_res.json()["detail"]

    # 5. Create Valid Multi-Group Qard Hasan: Total 100,000 (A=40k [40%], B=35k [35%], C=25k [25%])
    qh_res = client.post("/api/v1/assistance", json={
        "assistance_type": "QARD_HASAN",
        "beneficiary_id": ben["id"],
        "total_amount": 100000.00,
        "funding_allocations": [
            {"group_id": ga["id"], "allocated_amount": 40000.00},
            {"group_id": gb["id"], "allocated_amount": 35000.00},
            {"group_id": gc["id"], "allocated_amount": 25000.00}
        ],
        "installments_count": 10
    }, headers=headers)
    assert qh_res.status_code == 201, f"Failed to create Qard Hasan: {qh_res.text}"
    qh_data = qh_res.json()
    assistance_id = qh_data["id"]

    # 6. Verify groups' balances after disbursement (A=0, B=0, C=0)
    assert Decimal(str(client.get(f"/api/v1/groups/{ga['id']}/balance", headers=headers).json()["current_balance"])) == Decimal("0.00")
    assert Decimal(str(client.get(f"/api/v1/groups/{gb['id']}/balance", headers=headers).json()["current_balance"])) == Decimal("0.00")
    assert Decimal(str(client.get(f"/api/v1/groups/{gc['id']}/balance", headers=headers).json()["current_balance"])) == Decimal("0.00")

    # 7. Preview Repayment of 10,000 BDT
    preview_res = client.get(f"/api/v1/repayments/preview?assistance_id={assistance_id}&amount=10000", headers=headers)
    assert preview_res.status_code == 200
    preview = preview_res.json()
    alloc_map = {a["group_id"]: Decimal(str(a["allocated_amount"])) for a in preview["allocations"]}
    assert alloc_map[ga["id"]] == Decimal("4000.00") # 40% of 10,000
    assert alloc_map[gb["id"]] == Decimal("3500.00") # 35% of 10,000
    assert alloc_map[gc["id"]] == Decimal("2500.00") # 25% of 10,000

    # 8. Process Repayment of 10,000 BDT
    rep_res = client.post("/api/v1/repayments", json={
        "assistance_id": assistance_id,
        "amount": 10000.00,
        "payment_method": "MOBILE_BANKING",
        "reference_number": "TXN-REP-01"
    }, headers=headers)
    assert rep_res.status_code == 201
    rep_data = rep_res.json()

    # 9. Verify that balances of groups increased proportionally: A=4,000, B=3,500, C=2,500
    assert Decimal(str(client.get(f"/api/v1/groups/{ga['id']}/balance", headers=headers).json()["current_balance"])) == Decimal("4000.00")
    assert Decimal(str(client.get(f"/api/v1/groups/{gb['id']}/balance", headers=headers).json()["current_balance"])) == Decimal("3500.00")
    assert Decimal(str(client.get(f"/api/v1/groups/{gc['id']}/balance", headers=headers).json()["current_balance"])) == Decimal("2500.00")

    # 10. Verify remaining outstanding amount of loan
    ast_detail = client.get(f"/api/v1/assistance/{assistance_id}", headers=headers).json()
    assert Decimal(str(ast_detail["total_repaid"])) == Decimal("10000.00")
    assert Decimal(str(ast_detail["outstanding_amount"])) == Decimal("90000.00")
    assert ast_detail["status"] == "ACTIVE"

def test_dashboard_and_reports(super_admin_token):
    headers = {"Authorization": f"Bearer {super_admin_token}"}
    
    # Test Dashboard
    dash_res = client.get("/api/v1/dashboard", headers=headers)
    assert dash_res.status_code == 200
    dash = dash_res.json()
    assert dash["total_groups"] > 0
    assert dash["total_members"] > 0
    assert Decimal(str(dash["total_contributions"])) > 0

    # Test Reports
    fin_res = client.get("/api/v1/reports/financial", headers=headers)
    assert fin_res.status_code == 200

    csv_res = client.get("/api/v1/reports/export?report_type=groups", headers=headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
