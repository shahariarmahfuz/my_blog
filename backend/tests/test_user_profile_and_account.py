import pytest
import sys
import os
import io
import uuid
from PIL import Image
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app

client = TestClient(app)

@pytest.fixture
def test_user_credentials():
    uid = uuid.uuid4().hex[:6]
    username = f"staff_{uid}"
    email = f"staff_{uid}@foundation.org"
    password = "InitialPassword123"
    
    # 1. Login as admin using username to create test user
    admin_res = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "admin123456"
    })
    assert admin_res.status_code == 200
    admin_token = admin_res.json()["access_token"]
    
    # 2. Create staff user with username
    user_res = client.post("/api/v1/users", headers={"Authorization": f"Bearer {admin_token}"}, json={
        "username": username,
        "email": email,
        "full_name": "Brother Zayd",
        "password": password,
        "phone": "+8801711223344",
        "is_active": True
    })
    assert user_res.status_code == 201
    
    return {"username": username, "email": email, "password": password, "full_name": "Brother Zayd"}

def test_login_and_remember_me(test_user_credentials):
    # 1. Normal Login with username (remember_me = False)
    res1 = client.post("/api/v1/auth/login", json={
        "username": test_user_credentials["username"],
        "password": test_user_credentials["password"],
        "remember_me": False
    })
    assert res1.status_code == 200
    data1 = res1.json()
    assert "access_token" in data1
    assert data1["expires_in_days"] == 1

    # 2. Remember Me Login with username (remember_me = True)
    res2 = client.post("/api/v1/auth/login", json={
        "username": test_user_credentials["username"],
        "password": test_user_credentials["password"],
        "remember_me": True
    })
    assert res2.status_code == 200
    data2 = res2.json()
    assert "access_token" in data2
    assert data2["expires_in_days"] == 30

def test_get_and_update_my_profile(test_user_credentials):
    # Login with username
    login_res = client.post("/api/v1/auth/login", json={
        "username": test_user_credentials["username"],
        "password": test_user_credentials["password"]
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Get My Profile
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["username"] == test_user_credentials["username"]
    assert me_data["email"] == test_user_credentials["email"]
    assert me_data["full_name"] == "Brother Zayd"

    # 2. Update Profile
    update_res = client.patch("/api/v1/auth/profile", headers=headers, json={
        "full_name": "Brother Zayd Al-Ansari",
        "phone": "+8801999887766"
    })
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["full_name"] == "Brother Zayd Al-Ansari"
    assert updated_data["phone"] == "+8801999887766"

    # Verify persistence
    check_res = client.get("/api/v1/auth/me", headers=headers)
    assert check_res.json()["full_name"] == "Brother Zayd Al-Ansari"

def test_profile_picture_upload_optimization_and_removal(test_user_credentials):
    # Login with username
    login_res = client.post("/api/v1/auth/login", json={
        "username": test_user_credentials["username"],
        "password": test_user_credentials["password"]
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a raw test image using Pillow (1000x800 RGB JPEG)
    img_byte_arr = io.BytesIO()
    img = Image.new('RGB', (1000, 800), color=(73, 109, 137))
    img.save(img_byte_arr, format='JPEG')
    img_bytes = img_byte_arr.getvalue()

    # 2. Upload valid image
    upload_res = client.post(
        "/api/v1/auth/profile-picture",
        headers=headers,
        files={"file": ("profile.jpg", img_bytes, "image/jpeg")}
    )
    assert upload_res.status_code == 200
    upload_data = upload_res.json()
    assert upload_data["profile_picture"] is not None
    assert "res.cloudinary.com" in upload_data["profile_picture"]
    avatar_url = upload_data["profile_picture"]

    # 3. Verify user profile reflects new avatar URL
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.json()["profile_picture"] == avatar_url

    # 4. Verify invalid non-image upload is rejected
    fake_file_res = client.post(
        "/api/v1/auth/profile-picture",
        headers=headers,
        files={"file": ("malicious.sh", b"#!/bin/bash\necho hack", "text/plain")}
    )
    assert fake_file_res.status_code == 400

    # 5. Remove profile picture
    delete_res = client.delete("/api/v1/auth/profile-picture", headers=headers)
    assert delete_res.status_code == 200
    assert delete_res.json()["profile_picture"] is None

    # Verify profile is now null
    me_res2 = client.get("/api/v1/auth/me", headers=headers)
    assert me_res2.json()["profile_picture"] is None

def test_change_password_workflow(test_user_credentials):
    # Login with username
    login_res = client.post("/api/v1/auth/login", json={
        "username": test_user_credentials["username"],
        "password": test_user_credentials["password"]
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Invalid current password fails
    bad_cur_res = client.post("/api/v1/auth/change-password", headers=headers, json={
        "current_password": "WrongPassword999",
        "new_password": "BrandNewPassword2026",
        "confirm_new_password": "BrandNewPassword2026"
    })
    assert bad_cur_res.status_code == 400

    # 2. Mismatched confirmation password fails
    mismatch_res = client.post("/api/v1/auth/change-password", headers=headers, json={
        "current_password": test_user_credentials["password"],
        "new_password": "BrandNewPassword2026",
        "confirm_new_password": "DifferentPassword123"
    })
    assert mismatch_res.status_code == 400

    # 3. Valid password change succeeds
    change_res = client.post("/api/v1/auth/change-password", headers=headers, json={
        "current_password": test_user_credentials["password"],
        "new_password": "BrandNewPassword2026",
        "confirm_new_password": "BrandNewPassword2026"
    })
    assert change_res.status_code == 200

    # 4. Old password no longer works
    old_login_res = client.post("/api/v1/auth/login", json={
        "username": test_user_credentials["username"],
        "password": test_user_credentials["password"]
    })
    assert old_login_res.status_code == 401

    # 5. New password works
    new_login_res = client.post("/api/v1/auth/login", json={
        "username": test_user_credentials["username"],
        "password": "BrandNewPassword2026"
    })
    assert new_login_res.status_code == 200
    assert "access_token" in new_login_res.json()
