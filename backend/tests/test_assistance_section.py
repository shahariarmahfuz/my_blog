import sys, os
sys.path.insert(0, os.path.abspath("backend"))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models import User, Group, Member, Beneficiary, Contribution, Assistance
from app.core.security import create_access_token
from decimal import Decimal

client = TestClient(app)

@pytest.fixture
def auth_headers():
    db = SessionLocal()
    admin = db.query(User).filter(User.email == "admin@foundation.org").first()
    db.close()
    assert admin is not None, "Super admin user not found in database."
    token = create_access_token(subject=str(admin.id))
    return {"Authorization": f"Bearer {token}"}

def test_qard_hasan_multi_group_funding_and_proportional_repayment(auth_headers):
    # 1. Create 3 funding groups (A: 40k, B: 35k, C: 25k capacity)
    ga_res = client.post("/api/v1/groups", headers=auth_headers, json={"name": "QH Funding Group A"})
    ga_id = ga_res.json()["id"]
    gb_res = client.post("/api/v1/groups", headers=auth_headers, json={"name": "QH Funding Group B"})
    gb_id = gb_res.json()["id"]
    gc_res = client.post("/api/v1/groups", headers=auth_headers, json={"name": "QH Funding Group C"})
    gc_id = gc_res.json()["id"]

    # Fund each group with contributions
    # Member in A contributes 60,000
    ma_res = client.post("/api/v1/members", headers=auth_headers, json={"name": "Member GA", "group_id": ga_id})
    client.post("/api/v1/contributions", headers=auth_headers, json={"member_id": ma_res.json()["id"], "amount": 60000.00})
    
    # Member in B contributes 50,000
    mb_res = client.post("/api/v1/members", headers=auth_headers, json={"name": "Member GB", "group_id": gb_id})
    client.post("/api/v1/contributions", headers=auth_headers, json={"member_id": mb_res.json()["id"], "amount": 50000.00})

    # Member in C contributes 30,000
    mc_res = client.post("/api/v1/members", headers=auth_headers, json={"name": "Member GC", "group_id": gc_id})
    client.post("/api/v1/contributions", headers=auth_headers, json={"member_id": mc_res.json()["id"], "amount": 30000.00})

    # 2. Create Beneficiary
    ben_res = client.post("/api/v1/beneficiaries", headers=auth_headers, json={"name": "Khadija Begum", "group_id": ga_id})
    ben_id = ben_res.json()["id"]

    # 3. Validation: Allocation total mismatch should fail (40k + 35k + 20k != 100k)
    bad_alloc_res = client.post("/api/v1/assistance", headers=auth_headers, json={
        "assistance_type": "QARD_HASAN",
        "beneficiary_id": ben_id,
        "total_amount": 100000.00,
        "funding_allocations": [
            {"group_id": ga_id, "allocated_amount": 40000.00},
            {"group_id": gb_id, "allocated_amount": 35000.00},
            {"group_id": gc_id, "allocated_amount": 20000.00}
        ]
    })
    assert bad_alloc_res.status_code == 422 or bad_alloc_res.status_code == 400

    # 4. Validation: Insufficient Group Balance should fail (Group C only has 30k, asking 40k)
    insufficient_res = client.post("/api/v1/assistance", headers=auth_headers, json={
        "assistance_type": "QARD_HASAN",
        "beneficiary_id": ben_id,
        "total_amount": 100000.00,
        "funding_allocations": [
            {"group_id": ga_id, "allocated_amount": 30000.00},
            {"group_id": gb_id, "allocated_amount": 30000.00},
            {"group_id": gc_id, "allocated_amount": 40000.00}
        ]
    })
    assert insufficient_res.status_code == 400
    assert "Insufficient funds" in insufficient_res.json()["detail"]

    # 5. Successful Multi-Group Qard Hasan (40k from A, 35k from B, 25k from C)
    qh_res = client.post("/api/v1/assistance", headers=auth_headers, json={
        "assistance_type": "QARD_HASAN",
        "beneficiary_id": ben_id,
        "total_amount": 100000.00,
        "disbursement_date": "2026-08-01",
        "purpose": "Grocery Shop Expansion",
        "funding_allocations": [
            {"group_id": ga_id, "allocated_amount": 40000.00},
            {"group_id": gb_id, "allocated_amount": 35000.00},
            {"group_id": gc_id, "allocated_amount": 25000.00}
        ]
    })
    assert qh_res.status_code == 201
    qh = qh_res.json()
    qh_id = qh["id"]
    assert float(qh["total_amount"]) == 100000.00
    assert float(qh["outstanding_amount"]) == 100000.00
    assert len(qh["funding_allocations"]) == 3

    # Check Group balances debited
    # A was 60k - 40k = 20k
    # B was 50k - 35k = 15k
    # C was 30k - 25k = 5k
    ga_ledger = client.get(f"/api/v1/groups/{ga_id}/ledger", headers=auth_headers).json()
    assert float(ga_ledger["current_balance"]) == 20000.00
    gb_ledger = client.get(f"/api/v1/groups/{gb_id}/ledger", headers=auth_headers).json()
    assert float(gb_ledger["current_balance"]) == 15000.00
    gc_ledger = client.get(f"/api/v1/groups/{gc_id}/ledger", headers=auth_headers).json()
    assert float(gc_ledger["current_balance"]) == 5000.00

    # 6. Repayment Validation: Repayment > Outstanding must fail (e.g. 150,000)
    overpay_res = client.post("/api/v1/repayments", headers=auth_headers, json={
        "assistance_id": qh_id,
        "amount": 150000.00
    })
    assert overpay_res.status_code == 400
    assert "exceeds" in overpay_res.json()["detail"].lower()

    # 7. Partial Repayment of 10,000
    # Expected exact allocation:
    # A (40%): 4,000
    # B (35%): 3,500
    # C (25%): 2,500
    rep_res = client.post("/api/v1/repayments", headers=auth_headers, json={
        "assistance_id": qh_id,
        "amount": 10000.00,
        "payment_date": "2026-08-15",
        "payment_method": "CASH"
    })
    assert rep_res.status_code == 201
    rep = rep_res.json()
    assert len(rep["allocations"]) == 3

    alloc_map = {a["group_id"]: float(a["allocated_amount"]) for a in rep["allocations"]}
    assert alloc_map[ga_id] == 4000.00
    assert alloc_map[gb_id] == 3500.00
    assert alloc_map[gc_id] == 2500.00

    # Check that Group balances are credited automatically
    # A: 20k + 4k = 24k
    # B: 15k + 3.5k = 18.5k
    # C: 5k + 2.5k = 7.5k
    ga_after_rep = client.get(f"/api/v1/groups/{ga_id}/ledger", headers=auth_headers).json()
    assert float(ga_after_rep["current_balance"]) == 24000.00
    gb_after_rep = client.get(f"/api/v1/groups/{gb_id}/ledger", headers=auth_headers).json()
    assert float(gb_after_rep["current_balance"]) == 18500.00
    gc_after_rep = client.get(f"/api/v1/groups/{gc_id}/ledger", headers=auth_headers).json()
    assert float(gc_after_rep["current_balance"]) == 7500.00

    # 8. Check Qard Hasan Ledger endpoint
    qh_ledger_res = client.get("/api/v1/assistance/qard-hasan/ledger", headers=auth_headers)
    assert qh_ledger_res.status_code == 200
    qh_ledger = qh_ledger_res.json()
    assert float(qh_ledger["total_disbursed"]) >= 100000.00
    assert float(qh_ledger["total_repaid"]) >= 10000.00
    assert float(qh_ledger["net_outstanding"]) >= 90000.00

def test_sadaqah_multi_group_funding_and_ledger(auth_headers):
    # 1. Create 3 funding groups for Sadaqah (A: 15k, B: 20k, C: 15k -> Total 50k)
    sga_res = client.post("/api/v1/groups", headers=auth_headers, json={"name": "Sadaqah Group A"})
    sga_id = sga_res.json()["id"]
    sgb_res = client.post("/api/v1/groups", headers=auth_headers, json={"name": "Sadaqah Group B"})
    sgb_id = sgb_res.json()["id"]
    sgc_res = client.post("/api/v1/groups", headers=auth_headers, json={"name": "Sadaqah Group C"})
    sgc_id = sgc_res.json()["id"]

    # Fund each group with contributions
    ma_res = client.post("/api/v1/members", headers=auth_headers, json={"name": "Sadaqah Member A", "group_id": sga_id})
    client.post("/api/v1/contributions", headers=auth_headers, json={"member_id": ma_res.json()["id"], "amount": 25000.00})
    
    mb_res = client.post("/api/v1/members", headers=auth_headers, json={"name": "Sadaqah Member B", "group_id": sgb_id})
    client.post("/api/v1/contributions", headers=auth_headers, json={"member_id": mb_res.json()["id"], "amount": 30000.00})

    mc_res = client.post("/api/v1/members", headers=auth_headers, json={"name": "Sadaqah Member C", "group_id": sgc_id})
    client.post("/api/v1/contributions", headers=auth_headers, json={"member_id": mc_res.json()["id"], "amount": 20000.00})

    # 2. Create Beneficiary
    ben_res = client.post("/api/v1/beneficiaries", headers=auth_headers, json={"name": "Shah Alam", "group_id": sga_id})
    ben_id = ben_res.json()["id"]

    # 3. Disburse Multi-Group Sadaqah (15k from A, 20k from B, 15k from C = 50k)
    sd_res = client.post("/api/v1/assistance", headers=auth_headers, json={
        "assistance_type": "SADAQAH",
        "beneficiary_id": ben_id,
        "total_amount": 50000.00,
        "disbursement_date": "2026-08-10",
        "purpose": "Emergency Medical Assistance (Open Heart Surgery)",
        "funding_allocations": [
            {"group_id": sga_id, "allocated_amount": 15000.00},
            {"group_id": sgb_id, "allocated_amount": 20000.00},
            {"group_id": sgc_id, "allocated_amount": 15000.00}
        ]
    })
    assert sd_res.status_code == 201
    sd = sd_res.json()
    assert float(sd["total_amount"]) == 50000.00
    assert float(sd["outstanding_amount"]) == 0.00  # Non-recoverable!
    assert len(sd["funding_allocations"]) == 3

    # Check Group balances debited
    # A was 25k - 15k = 10k
    # B was 30k - 20k = 10k
    # C was 20k - 15k = 5k
    sga_ledger = client.get(f"/api/v1/groups/{sga_id}/ledger", headers=auth_headers).json()
    assert float(sga_ledger["current_balance"]) == 10000.00
    sgb_ledger = client.get(f"/api/v1/groups/{sgb_id}/ledger", headers=auth_headers).json()
    assert float(sgb_ledger["current_balance"]) == 10000.00
    sgc_ledger = client.get(f"/api/v1/groups/{sgc_id}/ledger", headers=auth_headers).json()
    assert float(sgc_ledger["current_balance"]) == 5000.00

    # 4. Check Sadaqah Ledger endpoint
    sd_ledger_res = client.get("/api/v1/assistance/sadaqah/ledger", headers=auth_headers)
    assert sd_ledger_res.status_code == 200
    sd_ledger = sd_ledger_res.json()
    assert float(sd_ledger["total_sadaqah_distributed"]) >= 50000.00
    assert sd_ledger["total_grants_count"] >= 1
    assert any(e["beneficiary_name"] == "Shah Alam" for e in sd_ledger["entries"])
