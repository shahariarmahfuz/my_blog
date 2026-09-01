import pytest
import sys
import os
import io
import uuid
from PIL import Image
from fastapi.testclient import TestClient
import cloudinary.api

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.config import settings

client = TestClient(app)

@pytest.fixture
def auth_headers():
    res = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "admin123456"
    })
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_cloudinary_connection_and_credentials():
    """Verify that Cloudinary credentials are valid and ping succeeds."""
    assert settings.CLOUDINARY_CLOUD_NAME == "diwp8ug1r"
    assert settings.CLOUDINARY_API_KEY == "791592617583329"
    assert settings.CLOUDINARY_API_SECRET == "EMP5w1lxdVxp9obXARq2uP_yWm8"
    
    ping_res = cloudinary.api.ping()
    assert ping_res.get("status") == "ok"

def test_user_avatar_upload_optimization_and_removal(auth_headers):
    """Test avatar upload to Cloudinary, WebP conversion, DB metadata persistence, replacement and deletion."""
    # 1. Generate test avatar image (800x800 RGB JPEG)
    img_byte_arr = io.BytesIO()
    img = Image.new('RGB', (800, 800), color=(40, 160, 120))
    img.save(img_byte_arr, format='JPEG')
    img_bytes = img_byte_arr.getvalue()

    # 2. Upload avatar
    upload_res = client.post(
        "/api/v1/auth/profile-picture",
        headers=auth_headers,
        files={"file": ("my_avatar.jpg", img_bytes, "image/jpeg")}
    )
    assert upload_res.status_code == 200
    data = upload_res.json()
    assert "profile_picture" in data
    assert "res.cloudinary.com" in data["profile_picture"]
    avatar_url_1 = data["profile_picture"]

    # 3. Check current user profile reflects the Cloudinary URL
    me_res = client.get("/api/v1/auth/me", headers=auth_headers)
    assert me_res.status_code == 200
    assert me_res.json()["profile_picture"] == avatar_url_1

    # 4. Replace avatar with a second image
    img2_byte_arr = io.BytesIO()
    img2 = Image.new('RGB', (600, 600), color=(200, 80, 50))
    img2.save(img2_byte_arr, format='PNG')
    img2_bytes = img2_byte_arr.getvalue()

    upload_res_2 = client.post(
        "/api/v1/auth/profile-picture",
        headers=auth_headers,
        files={"file": ("my_avatar_2.png", img2_bytes, "image/png")}
    )
    assert upload_res_2.status_code == 200
    avatar_url_2 = upload_res_2.json()["profile_picture"]
    assert "res.cloudinary.com" in avatar_url_2
    assert avatar_url_2 != avatar_url_1

    # 5. Remove avatar
    del_res = client.delete("/api/v1/auth/profile-picture", headers=auth_headers)
    assert del_res.status_code == 200
    assert del_res.json()["profile_picture"] is None

    # Verify user profile has null profile_picture
    me_res_after = client.get("/api/v1/auth/me", headers=auth_headers)
    assert me_res_after.json()["profile_picture"] is None

def test_general_file_and_pdf_document_upload(auth_headers):
    """Test general document storage in structured Cloudinary folders."""
    # Create valid PDF dummy document
    pdf_content = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000102 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%EOF\n"
    
    test_entity_id = f"test_member_{uuid.uuid4().hex[:6]}"

    upload_res = client.post(
        "/api/v1/files/upload",
        headers=auth_headers,
        data={
            "entity_type": "member",
            "entity_id": test_entity_id,
            "visibility": "PRIVATE"
        },
        files={"file": ("national_id_card.pdf", pdf_content, "application/pdf")}
    )
    assert upload_res.status_code == 201
    upload_data = upload_res.json()
    file_info = upload_data["file"]
    assert file_info["entity_type"] == "member"
    assert file_info["entity_id"] == test_entity_id
    assert file_info["format"] == "pdf"
    assert file_info["original_filename"] == "national_id_card.pdf"
    assert "res.cloudinary.com" in file_info["secure_url"]
    file_id = file_info["id"]

    # List entity files
    list_res = client.get(f"/api/v1/files/entity/member/{test_entity_id}", headers=auth_headers)
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    assert any(f["id"] == file_id for f in list_data["items"])

    # Retrieve specific file
    get_res = client.get(f"/api/v1/files/{file_id}", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == file_id
    assert get_res.json()["access_url"] is not None

    # Delete file
    del_res = client.delete(f"/api/v1/files/{file_id}", headers=auth_headers)
    assert del_res.status_code == 200

    # Verify 404 after deletion
    get_after = client.get(f"/api/v1/files/{file_id}", headers=auth_headers)
    assert get_after.status_code == 404

def test_file_validation_and_security(auth_headers):
    """Test rejection of dangerous script files, corrupt data, and unauthenticated requests."""
    # 1. Prohibit dangerous bash script
    sh_res = client.post(
        "/api/v1/files/upload",
        headers=auth_headers,
        data={"entity_type": "general"},
        files={"file": ("exploit.sh", b"#!/bin/bash\nrm -rf /", "text/x-shellscript")}
    )
    assert sh_res.status_code == 400
    assert "Security violation" in sh_res.json()["detail"] or "prohibited" in sh_res.json()["detail"]

    # 2. Prohibit dangerous Python script
    py_res = client.post(
        "/api/v1/files/upload",
        headers=auth_headers,
        data={"entity_type": "general"},
        files={"file": ("backdoor.py", b"import os; os.system('whoami')", "text/x-python")}
    )
    assert py_res.status_code == 400

    # 3. Reject corrupted image
    corrupt_res = client.post(
        "/api/v1/files/upload",
        headers=auth_headers,
        data={"entity_type": "general"},
        files={"file": ("fake.jpg", b"This is not a real JPEG image file content at all", "image/jpeg")}
    )
    assert corrupt_res.status_code == 400

    # 4. Require authentication for private uploads and file retrieval
    no_auth_upload = client.post(
        "/api/v1/files/upload",
        data={"entity_type": "general"},
        files={"file": ("test.pdf", b"%PDF-1.4\nfake", "application/pdf")}
    )
    assert no_auth_upload.status_code in (401, 403)

def test_no_cloudinary_secrets_leaked_in_responses(auth_headers):
    """Verify that Cloudinary API Secret is NEVER returned in API responses."""
    secret = settings.CLOUDINARY_API_SECRET
    
    # 1. Get Me endpoint
    res_me = client.get("/api/v1/auth/me", headers=auth_headers)
    assert secret not in res_me.text

    # 2. Settings endpoint
    res_set = client.get("/api/v1/settings", headers=auth_headers)
    assert secret not in res_set.text
