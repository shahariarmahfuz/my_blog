import sys, os
sys.path.insert(0, os.path.abspath("backend"))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models import User, Role, Permission, SystemSetting
from app.core.security import create_access_token, get_password_hash

client = TestClient(app)

@pytest.fixture
def superadmin_headers():
    db = SessionLocal()
    admin = db.query(User).filter(User.email == "admin@foundation.org").first()
    db.close()
    assert admin is not None, "Super Admin user not found."
    token = create_access_token(subject=str(admin.id))
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def regular_user_headers():
    db = SessionLocal()
    # Find or create a viewer role with only dashboard.view
    viewer_role = db.query(Role).filter(Role.name == "Viewer").first()
    if not viewer_role:
        viewer_role = Role(name="Viewer", description="View only role", is_system=False)
        db.add(viewer_role)
        db.commit()
        db.refresh(viewer_role)

    user = db.query(User).filter((User.email == "viewer@foundation.org") | (User.username == "viewer")).first()
    if not user:
        user = User(
            username="viewer",
            email="viewer@foundation.org",
            full_name="Viewer User",
            hashed_password=get_password_hash("viewer123456"),
            role_id=viewer_role.id,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    user_id = str(user.id)
    db.close()
    token = create_access_token(subject=user_id)
    return {"Authorization": f"Bearer {token}"}

def test_get_all_settings_and_sections(superadmin_headers):
    # 1. Fetch all settings
    res = client.get("/api/v1/settings", headers=superadmin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "general" in data
    assert "profile" in data
    assert "financial" in data
    assert "contributions" in data
    assert "assistance" in data
    assert "notifications" in data
    assert "system" in data

    # 2. Fetch specific section
    gen_res = client.get("/api/v1/settings/general", headers=superadmin_headers)
    assert gen_res.status_code == 200
    gen_data = gen_res.json()
    assert gen_data["section"] == "general"
    assert "organization_name" in gen_data["config_data"] or "foundation_name" in gen_data["config_data"]

def test_update_settings_persistence_and_invariants(superadmin_headers):
    # 1. Update General Settings
    update_res = client.put("/api/v1/settings/general", headers=superadmin_headers, json={
        "config_data": {
            "foundation_name": "Al-Khair Islamic Foundation International",
            "currency": "BDT (৳)",
            "timezone": "Asia/Dhaka (GMT+6)"
        }
    })
    assert update_res.status_code == 200
    assert update_res.json()["config_data"]["foundation_name"] == "Al-Khair Islamic Foundation International"

    # Verify persistence from DB
    get_res = client.get("/api/v1/settings/general", headers=superadmin_headers)
    assert get_res.json()["config_data"]["foundation_name"] == "Al-Khair Islamic Foundation International"

    # 2. Test Invariant: Qard Hasan must NEVER have interest even if attempted
    ast_res = client.put("/api/v1/settings/assistance", headers=superadmin_headers, json={
        "config_data": {
            "qard_hasan_interest_rate": 5.00, # Malicious/invalid attempt
            "default_installments_count": 12,
            "sadaqah_is_recoverable": True # Invalid attempt
        }
    })
    assert ast_res.status_code == 200
    # Must be clamped/forced to 0.00 and False by backend
    assert ast_res.json()["config_data"]["qard_hasan_interest_rate"] == 0.00
    assert ast_res.json()["config_data"]["sadaqah_is_recoverable"] is False
    assert ast_res.json()["config_data"]["default_installments_count"] == 12

def test_settings_security_and_permission_checks(regular_user_headers, superadmin_headers):
    # 1. Regular user without settings.edit cannot modify general settings
    unauth_res = client.put("/api/v1/settings/general", headers=regular_user_headers, json={
        "config_data": {"foundation_name": "Hacked Foundation"}
    })
    assert unauth_res.status_code == 403

    # 2. Super Admin can modify system settings
    sys_res = client.put("/api/v1/settings/system", headers=superadmin_headers, json={
        "config_data": {
            "session_timeout_minutes": 720,
            "audit_logging_enabled": True
        }
    })
    assert sys_res.status_code == 200
    assert sys_res.json()["config_data"]["session_timeout_minutes"] == 720

def test_permissions_matrix_update_and_enforcement(superadmin_headers):
    # 1. Get all roles and all permissions
    roles_res = client.get("/api/v1/roles", headers=superadmin_headers)
    assert roles_res.status_code == 200
    roles = roles_res.json()

    perms_res = client.get("/api/v1/roles/permissions", headers=superadmin_headers)
    assert perms_res.status_code == 200
    permissions = perms_res.json()
    assert len(permissions) > 0

    import uuid
    role_name = f"Audit Officer Test {uuid.uuid4().hex[:6]}"
    # Pick a non-system role or create a test role
    test_role_res = client.post("/api/v1/roles", headers=superadmin_headers, json={
        "name": role_name,
        "description": "Officer for auditing"
    })
    assert test_role_res.status_code == 201
    test_role = test_role_res.json()
    test_role_id = test_role["id"]

    # Assign subset of permissions (e.g. audit_logs.view and reports.view)
    target_perms = [p["id"] for p in permissions if p["code"] in ["audit_logs.view", "reports.view"]]
    
    matrix_update_res = client.patch(f"/api/v1/roles/{test_role_id}", headers=superadmin_headers, json={
        "permission_ids": target_perms
    })
    assert matrix_update_res.status_code == 200
    updated_role = matrix_update_res.json()
    assert len(updated_role["permissions"]) == len(target_perms)
    assigned_codes = {p["code"] for p in updated_role["permissions"]}
    assert "audit_logs.view" in assigned_codes
    assert "reports.view" in assigned_codes
