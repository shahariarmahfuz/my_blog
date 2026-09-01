import uuid
import pytest
from datetime import date
from decimal import Decimal
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal, engine, Base
from app.models import Group, Member, Beneficiary, Contribution, LedgerEntry, FinancialTransaction, SystemSetting, User
from app.db.migrate_username import migrate_users_table
from app.db.seed import seed_db

client = TestClient(app)

@pytest.fixture(scope="module")
def admin_headers():
    res = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "admin123456"
    })
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_database_persistence_across_simulated_restarts(admin_headers):
    """
    Critical Persistence Test:
    1. Insert Group, Member, Beneficiary, Contribution, Ledger Entry, and Branding config.
    2. Simulate application/backend restarts (dispose connection pool, run lifespan/migrations/seed_db).
    3. Verify all records and balances persist without any data loss.
    """
    unique_suffix = uuid.uuid4().hex[:6]
    test_group_name = f"Persist Group {unique_suffix}"
    test_member_name = f"Persist Member {unique_suffix}"
    test_beneficiary_name = f"Persist Beneficiary {unique_suffix}"

    # 1. Create Group with Opening Balance
    grp_res = client.post(
        "/api/v1/groups",
        headers=admin_headers,
        json={
            "name": test_group_name,
            "description": "Persistence Test Group",
            "opening_balance": 15000.00
        }
    )
    assert grp_res.status_code == 201, grp_res.text
    group_id = grp_res.json()["id"]

    # 2. Create Member in this Group
    mem_res = client.post(
        "/api/v1/members",
        headers=admin_headers,
        json={
            "name": test_member_name,
            "group_id": group_id,
            "phone": f"+88017{unique_suffix[:7].zfill(8)}",
            "monthly_contribution_amount": 1000.00,
            "is_active": True
        }
    )
    assert mem_res.status_code == 201, mem_res.text
    member_id = mem_res.json()["id"]

    # 3. Create Beneficiary
    ben_res = client.post(
        "/api/v1/beneficiaries",
        headers=admin_headers,
        json={
            "name": test_beneficiary_name,
            "group_id": group_id,
            "phone": f"+88018{unique_suffix[:7].zfill(8)}",
            "address": "Dhaka, Bangladesh",
            "is_active": True
        }
    )
    assert ben_res.status_code == 201, ben_res.text
    beneficiary_id = ben_res.json()["id"]

    # 4. Record a Member Contribution (৳2,000)
    current_year = date.today().year
    current_month_str = f"{current_year}-01-01"
    cont_res = client.post(
        "/api/v1/contributions",
        headers=admin_headers,
        json={
            "member_id": member_id,
            "amount": 2000.00,
            "payment_method": "CASH",
            "selected_months": [f"{current_year}-01-01", f"{current_year}-02-01"],
            "notes": "Persistence Test Contribution"
        }
    )
    assert cont_res.status_code == 201, cont_res.text
    contribution_id = cont_res.json()["id"]

    # 5. Update Foundation Branding
    brand_res = client.put(
        "/api/v1/branding",
        headers=admin_headers,
        json={
            "foundation_name": f"Al-Khair Persistent {unique_suffix}",
            "tagline": "Stewardship That Endures Restarts"
        }
    )
    assert brand_res.status_code == 200, brand_res.text

    # Verify initial state before restart
    db = SessionLocal()
    try:
        grp = db.query(Group).filter(Group.id == group_id).first()
        assert grp is not None
        assert grp.name == test_group_name

        mem = db.query(Member).filter(Member.id == member_id).first()
        assert mem is not None
        assert mem.name == test_member_name

        ben = db.query(Beneficiary).filter(Beneficiary.id == beneficiary_id).first()
        assert ben is not None
        assert ben.name == test_beneficiary_name

        cont = db.query(Contribution).filter(Contribution.id == contribution_id).first()
        assert cont is not None
        assert Decimal(str(cont.amount)) == Decimal("2000.00")
    finally:
        db.close()

    # ==========================================================
    # SIMULATE SERVER RESTART CYCLE 1
    # ==========================================================
    engine.dispose()
    # Execute full startup routine
    Base.metadata.create_all(bind=engine)
    migrate_users_table()
    seed_db()

    # Verify all records still exist after restart cycle 1
    db1 = SessionLocal()
    try:
        grp1 = db1.query(Group).filter(Group.id == group_id).first()
        assert grp1 is not None, "CRITICAL ERROR: Group disappeared after backend restart cycle 1!"
        assert grp1.name == test_group_name

        mem1 = db1.query(Member).filter(Member.id == member_id).first()
        assert mem1 is not None, "CRITICAL ERROR: Member disappeared after backend restart cycle 1!"
        assert mem1.name == test_member_name

        ben1 = db1.query(Beneficiary).filter(Beneficiary.id == beneficiary_id).first()
        assert ben1 is not None, "CRITICAL ERROR: Beneficiary disappeared after backend restart cycle 1!"
        assert ben1.name == test_beneficiary_name

        cont1 = db1.query(Contribution).filter(Contribution.id == contribution_id).first()
        assert cont1 is not None, "CRITICAL ERROR: Contribution disappeared after backend restart cycle 1!"
        assert Decimal(str(cont1.amount)) == Decimal("2000.00")

        # Verify ledger entries still exist
        ledger_count = db1.query(LedgerEntry).filter(LedgerEntry.group_id == group_id).count()
        assert ledger_count >= 2, "CRITICAL ERROR: Ledger entries disappeared after restart!"

        # Verify branding settings persisted
        branding_setting = db1.query(SystemSetting).filter(SystemSetting.section == "branding").first()
        assert branding_setting is not None
        assert branding_setting.config_data.get("foundation_name") == f"Al-Khair Persistent {unique_suffix}"
    finally:
        db1.close()

    # ==========================================================
    # SIMULATE SERVER RESTART CYCLE 2
    # ==========================================================
    engine.dispose()
    Base.metadata.create_all(bind=engine)
    migrate_users_table()
    seed_db()

    # Verify via API client as well
    get_grp = client.get(f"/api/v1/groups/{group_id}", headers=admin_headers)
    assert get_grp.status_code == 200, "Group API retrieval failed after restart cycle 2!"
    assert get_grp.json()["name"] == test_group_name
    # 15,000 opening + 2,000 contribution = 17,000
    assert float(get_grp.json()["available_balance"]) == 17000.00

    get_mem = client.get(f"/api/v1/members/{member_id}", headers=admin_headers)
    assert get_mem.status_code == 200, "Member API retrieval failed after restart cycle 2!"
    assert get_mem.json()["name"] == test_member_name

    get_ben = client.get(f"/api/v1/beneficiaries/{beneficiary_id}", headers=admin_headers)
    assert get_ben.status_code == 200, "Beneficiary API retrieval failed after restart cycle 2!"
    assert get_ben.json()["name"] == test_beneficiary_name

    get_brand = client.get("/api/v1/public/branding")
    assert get_brand.status_code == 200
    assert get_brand.json()["foundation_name"] == f"Al-Khair Persistent {unique_suffix}"

    # Clean up test-specific records
    db_cleanup = SessionLocal()
    try:
        db_cleanup.query(LedgerEntry).filter(LedgerEntry.group_id == group_id).delete()
        db_cleanup.query(Contribution).filter(Contribution.id == contribution_id).delete()
        db_cleanup.query(Member).filter(Member.id == member_id).delete()
        db_cleanup.query(Beneficiary).filter(Beneficiary.id == beneficiary_id).delete()
        db_cleanup.query(Group).filter(Group.id == group_id).delete()
        # Reset branding back
        b_set = db_cleanup.query(SystemSetting).filter(SystemSetting.section == "branding").first()
        if b_set and b_set.config_data:
            c = dict(b_set.config_data)
            c["foundation_name"] = "Al-Khair Foundation"
            c["tagline"] = "Empowering Communities through Islamic Microfinance & Sadaqah"
            b_set.config_data = c
        db_cleanup.commit()
    finally:
        db_cleanup.close()
