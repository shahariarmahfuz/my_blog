import io
import os
import pytest
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.core.database import SessionLocal
from app.models import User, SystemSetting

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

def create_test_image(width=400, height=400, color=(30, 150, 100), fmt="PNG"):
    img_buf = io.BytesIO()
    img = Image.new("RGBA" if fmt == "PNG" else "RGB", (width, height), color=color)
    img.save(img_buf, format=fmt)
    return img_buf.getvalue()

def test_public_branding_endpoint_unauthenticated():
    """Verify that public branding endpoint is accessible without authentication."""
    res = client.get("/api/v1/public/branding")
    assert res.status_code == 200
    data = res.json()
    assert "foundation_name" in data
    assert "logo_url" in data
    assert "favicon_url" in data
    assert "apple_touch_icon_url" in data
    # Ensure no secret or DB internals leaked
    assert "secret" not in res.text.lower()
    assert "cloudinary_api_secret" not in res.text.lower()

def test_unauthenticated_branding_management_rejected():
    """Verify that unauthenticated requests to modify branding are rejected."""
    img_bytes = create_test_image(300, 300)
    res_upload = client.post(
        "/api/v1/branding/upload",
        data={"asset_type": "logo"},
        files={"file": ("logo.png", img_bytes, "image/png")}
    )
    assert res_upload.status_code in (401, 403)

    res_put = client.put(
        "/api/v1/branding",
        json={"foundation_name": "Hacked Name"}
    )
    assert res_put.status_code in (401, 403)

    res_del = client.delete("/api/v1/branding/asset/logo")
    assert res_del.status_code in (401, 403)

def test_logo_upload_replace_and_delete_lifecycle(admin_headers):
    """Test full lifecycle: Upload Logo -> Verify DB & Public -> Replace Logo -> Delete Logo."""
    # 1. Upload initial Logo
    img1_bytes = create_test_image(600, 200, color=(16, 185, 129), fmt="PNG")
    res1 = client.post(
        "/api/v1/branding/upload",
        headers=admin_headers,
        data={"asset_type": "logo"},
        files={"file": ("foundation_logo.png", img1_bytes, "image/png")}
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["logo"]["url"] != ""
    assert "res.cloudinary.com" in data1["logo"]["url"]
    assert data1["logo"]["filename"] == "foundation_logo.png"
    logo_url_1 = data1["logo"]["url"]
    public_id_1 = data1["logo"]["public_id"]

    # 2. Check public endpoint reflects the new logo
    pub_res = client.get("/api/v1/public/branding")
    assert pub_res.status_code == 200
    assert pub_res.json()["logo_url"] == logo_url_1

    # 3. Replace Logo with a second image
    img2_bytes = create_test_image(500, 500, color=(14, 165, 233), fmt="PNG")
    res2 = client.post(
        "/api/v1/branding/upload",
        headers=admin_headers,
        data={"asset_type": "logo"},
        files={"file": ("foundation_logo_v2.png", img2_bytes, "image/png")}
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["logo"]["url"] != ""
    assert data2["logo"]["url"] != logo_url_1
    assert data2["logo"]["public_id"] != public_id_1
    logo_url_2 = data2["logo"]["url"]

    # 4. Delete Logo
    del_res = client.delete("/api/v1/branding/asset/logo", headers=admin_headers)
    assert del_res.status_code == 200
    data_del = del_res.json()
    assert data_del["logo"]["url"] == ""
    assert data_del["logo"]["public_id"] == ""

    # Verify public endpoint now has empty logo_url (triggering fallback)
    pub_res_after = client.get("/api/v1/public/branding")
    assert pub_res_after.json()["logo_url"] == ""

def test_favicon_and_apple_touch_icon_upload(admin_headers):
    """Test uploading Favicon (square crop) and Apple Touch Icon (180x180 square)."""
    # 1. Upload Favicon (64x64)
    fav_bytes = create_test_image(200, 200, color=(50, 100, 200), fmt="PNG")
    fav_res = client.post(
        "/api/v1/branding/upload",
        headers=admin_headers,
        data={"asset_type": "favicon"},
        files={"file": ("favicon.png", fav_bytes, "image/png")}
    )
    assert fav_res.status_code == 200
    fav_data = fav_res.json()
    assert fav_data["favicon"]["url"] != ""
    assert "res.cloudinary.com" in fav_data["favicon"]["url"]

    # 2. Upload Apple Touch Icon
    apple_bytes = create_test_image(300, 300, color=(200, 50, 50), fmt="PNG")
    apple_res = client.post(
        "/api/v1/branding/upload",
        headers=admin_headers,
        data={"asset_type": "apple_touch_icon"},
        files={"file": ("apple-touch-icon.png", apple_bytes, "image/png")}
    )
    assert apple_res.status_code == 200
    apple_data = apple_res.json()
    assert apple_data["apple_touch_icon"]["url"] != ""
    assert "res.cloudinary.com" in apple_data["apple_touch_icon"]["url"]

    # 3. Check public branding endpoint has both
    pub = client.get("/api/v1/public/branding").json()
    assert pub["favicon_url"] == fav_data["favicon"]["url"]
    assert pub["apple_touch_icon_url"] == apple_data["apple_touch_icon"]["url"]

    # Clean up
    client.delete("/api/v1/branding/asset/favicon", headers=admin_headers)
    client.delete("/api/v1/branding/asset/apple_touch_icon", headers=admin_headers)

def test_update_branding_text_and_sync(admin_headers):
    """Test updating Foundation Name and Tagline and verify sync."""
    res = client.put(
        "/api/v1/branding",
        headers=admin_headers,
        json={
            "foundation_name": "Hope & Dignity Foundation",
            "tagline": "Transparent Islamic Microfinance"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["foundation_name"] == "Hope & Dignity Foundation"
    assert data["tagline"] == "Transparent Islamic Microfinance"

    # Verify public endpoint
    pub = client.get("/api/v1/public/branding").json()
    assert pub["foundation_name"] == "Hope & Dignity Foundation"
    assert pub["tagline"] == "Transparent Islamic Microfinance"

    # Reset name back to Al-Khair Foundation
    client.put(
        "/api/v1/branding",
        headers=admin_headers,
        json={
            "foundation_name": "Al-Khair Foundation",
            "tagline": "Empowering Communities through Islamic Microfinance & Sadaqah"
        }
    )

def test_security_rejection_of_prohibited_files(admin_headers):
    """Test that executable scripts and corrupted files are rejected."""
    # Prohibited script
    sh_res = client.post(
        "/api/v1/branding/upload",
        headers=admin_headers,
        data={"asset_type": "logo"},
        files={"file": ("exploit.sh", b"#!/bin/bash\necho hack", "text/x-shellscript")}
    )
    assert sh_res.status_code == 400
    assert "prohibited" in sh_res.json()["detail"].lower() or "security" in sh_res.json()["detail"].lower()

    # Corrupted data
    corrupt_res = client.post(
        "/api/v1/branding/upload",
        headers=admin_headers,
        data={"asset_type": "logo"},
        files={"file": ("corrupt.png", b"not a png image bytes", "image/png")}
    )
    assert corrupt_res.status_code == 400
