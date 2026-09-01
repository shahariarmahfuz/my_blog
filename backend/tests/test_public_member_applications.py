import pytest
import sys
import os
import uuid
from decimal import Decimal
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app

client = TestClient(app)

@pytest.fixture
def superadmin_headers():
    res = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "admin123456"
    })
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_public_foundation_info_and_impact_metrics():
    # 1. Test public foundation info
    f_res = client.get("/api/v1/public/foundation")
    assert f_res.status_code == 200
    f_data = f_res.json()
    assert "Al-Khair" in f_data["name"]
    assert len(f_data["core_values"]) >= 3

    # 2. Test public impact statistics
    i_res = client.get("/api/v1/public/impact")
    assert i_res.status_code == 200
    i_data = i_res.json()
    assert "total_beneficiaries_served" in i_data
    assert "total_assistance_disbursed" in i_data
    assert "active_groups_count" in i_data
    assert "repayment_recovery_rate" in i_data

def test_public_transparency_stories():
    # 1. List stories
    s_res = client.get("/api/v1/public/stories")
    assert s_res.status_code == 200
    stories = s_res.json()
    assert len(stories) >= 1
    sample_slug = stories[0]["slug"]

    # 2. Get story detail by slug
    detail_res = client.get(f"/api/v1/public/stories/{sample_slug}")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["slug"] == sample_slug
    assert len(detail_data["content"]) > 20

    # 3. Non-existent slug returns 404
    bad_res = client.get("/api/v1/public/stories/non-existent-story-12345")
    assert bad_res.status_code == 404

def test_public_assistance_inquiry_and_contact():
    # 1. Submit preliminary assistance inquiry
    inq_res = client.post("/api/v1/public/assistance-requests", json={
        "full_name": "Sister Khadija Begum",
        "phone": "+8801999887766",
        "email": "khadija@example.com",
        "district_or_city": "Faridpur",
        "assistance_type_needed": "QARD_HASAN",
        "description": "Seeking micro-capital for opening a poultry egg collection point."
    })
    assert inq_res.status_code == 201
    inq_data = inq_res.json()
    assert inq_data["inquiry_code"].startswith("INQ-")
    assert inq_data["status"] == "PENDING"

    # 2. Submit general contact message
    contact_res = client.post("/api/v1/public/contact", json={
        "name": "Mahmudur Rahman",
        "email": "mahmud@example.com",
        "phone": "+8801811223344",
        "subject": "Inquiry regarding establishing a donor circle",
        "message": "We would like to establish a volunteer donor group in Chittagong."
    })
    assert contact_res.status_code == 201
    assert "received" in contact_res.json()["message"].lower()

def test_public_application_minimal_name_and_group_only(superadmin_headers):
    # 1. Get or create an existing group
    g_res = client.get("/api/v1/groups", headers=superadmin_headers)
    assert g_res.status_code == 200
    groups = g_res.json()
    if not groups:
        grp = client.post("/api/v1/groups", headers=superadmin_headers, json={"name": "Public App Circle"}).json()
        group_id = grp["id"]
    else:
        group_id = groups[0]["id"]

    # 2. Submit application with ONLY Name and Group
    sub_res = client.post("/api/v1/public/member-applications", json={
        "applicant_name": "Minimal Public Applicant",
        "proposed_group_id": group_id
    })
    assert sub_res.status_code == 201
    sub_data = sub_res.json()
    app_code = sub_data["application_code"]
    assert app_code.startswith("MA-")
    assert sub_data["status"] == "PENDING"
    assert sub_data["applicant_name"] == "Minimal Public Applicant"

    # 3. Check status without contact verification (or with applicant name)
    check_res = client.post("/api/v1/public/member-applications/status", json={
        "application_code": app_code
    })
    assert check_res.status_code == 200
    assert check_res.json()["status"] == "PENDING"

def test_public_application_workflow_end_to_end(superadmin_headers):
    # 1. Create a test group for applicants
    group_name = f"Public Intake Circle {uuid.uuid4().hex[:6]}"
    group_res = client.post("/api/v1/groups", headers=superadmin_headers, json={
        "name": group_name,
        "description": "Public member intake test circle"
    })
    assert group_res.status_code == 201
    group_id = group_res.json()["id"]

    # 2. Public endpoint: list eligible groups
    pub_groups = client.get("/api/v1/public/groups")
    assert pub_groups.status_code == 200
    assert any(g["id"] == group_id for g in pub_groups.json())

    # 3. Public endpoint: submit application with complete 6 sections
    applicant_name = f"Brother Omar {uuid.uuid4().hex[:4]}"
    applicant_phone = "+8801700112233"
    applicant_email = f"omar_{uuid.uuid4().hex[:6]}@example.org"

    sub_res = client.post("/api/v1/public/member-applications", json={
        "applicant_name": applicant_name,
        "proposed_group_id": group_id,
        "father_name": "Md. Abdul Quddus",
        "mother_name": "Amina Khatun",
        "date_of_birth": "1990-05-15",
        "gender": "Male",
        "national_id": "19901234567890",
        "occupation": "Software Architect",
        "education": "Masters in CSE",
        "blood_group": "B+",
        "marital_status": "Married",
        "phone": applicant_phone,
        "alternative_phone": "+8801800112233",
        "email": applicant_email,
        "present_address": "House #14, Road #6, Dhanmondi, Dhaka",
        "permanent_address": "Vill: Gopalpur, Dist: Tangail",
        "emergency_contact_name": "Sister Fatima",
        "emergency_contact_relation": "Wife",
        "emergency_contact_phone": "+8801900112233",
        "reference_name": "Dr. Tariqul Islam",
        "reference_relation": "Colleague",
        "reference_phone": "+8801600112233",
        "commitment_accepted": True,
        "photo_url": "https://res.cloudinary.com/diwp8ug1r/image/upload/v1/photo.webp",
        "signature_url": "https://res.cloudinary.com/diwp8ug1r/image/upload/v1/sig.webp",
        "document_type": "National ID (NID)",
        "document_url": "https://res.cloudinary.com/diwp8ug1r/raw/upload/v1/nid.pdf",
        "reason_for_joining": "Wants to contribute regularly and participate in zero-interest revolving funds.",
        "notes": "Eager to contribute monthly pledge."
    })
    assert sub_res.status_code == 201
    sub_data = sub_res.json()
    app_code = sub_data["application_code"]
    assert app_code.startswith("MA-")
    assert sub_data["status"] == "PENDING"
    assert sub_data["applicant_name"] == applicant_name

    # 4. Verify no Member record was created yet
    members_res = client.get(f"/api/v1/members?search={applicant_name}", headers=superadmin_headers)
    assert members_res.status_code == 200
    assert len(members_res.json()) == 0, "Application must not create a Member automatically"

    # 5. Public status check: invalid verification contact rejected
    invalid_check = client.post("/api/v1/public/member-applications/status", json={
        "application_code": app_code,
        "verification_contact": "wrong_contact@other.com"
    })
    assert invalid_check.status_code == 403

    # 6. Public status check: valid verification succeeds
    valid_check = client.post("/api/v1/public/member-applications/status", json={
        "application_code": app_code,
        "verification_contact": applicant_email
    })
    assert valid_check.status_code == 200
    check_data = valid_check.json()
    assert check_data["status"] == "PENDING"
    assert check_data["can_resubmit"] is False

    # 7. Admin lists applications & summary counts
    summary_res = client.get("/api/v1/member-applications/summary", headers=superadmin_headers)
    assert summary_res.status_code == 200
    assert summary_res.json()["pending_count"] >= 1

    list_res = client.get(f"/api/v1/member-applications?search={app_code}", headers=superadmin_headers)
    assert list_res.status_code == 200
    apps = list_res.json()
    assert len(apps) == 1
    app_id = apps[0]["id"]

    # 8. Admin starts review (UNDER_REVIEW)
    review_res = client.post(f"/api/v1/member-applications/{app_id}/review", headers=superadmin_headers, json={
        "admin_notes": "Admissions officer initiating identity verification"
    })
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "UNDER_REVIEW"

    # 9. Admin requests changes (CHANGES_REQUIRED)
    req_changes_res = client.post(f"/api/v1/member-applications/{app_id}/request-changes", headers=superadmin_headers, json={
        "change_request_message": "Please update your workplace designation for record keeping.",
        "admin_notes": "Designation clarification"
    })
    assert req_changes_res.status_code == 200
    assert req_changes_res.json()["status"] == "CHANGES_REQUIRED"
    assert req_changes_res.json()["change_request_message"] == "Please update your workplace designation for record keeping."

    # 10. Public applicant checks status and sees CHANGES_REQUIRED + change message
    pub_check_after_req = client.post("/api/v1/public/member-applications/status", json={
        "application_code": app_code,
        "verification_contact": applicant_phone
    })
    assert pub_check_after_req.status_code == 200
    pub_data = pub_check_after_req.json()
    assert pub_data["status"] == "CHANGES_REQUIRED"
    assert pub_data["can_resubmit"] is True
    assert "workplace designation" in pub_data["change_request_message"]

    # 11. Applicant resubmits with updated information
    resubmit_res = client.post(f"/api/v1/public/member-applications/{app_code}/resubmit", json={
        "verification_contact": applicant_email,
        "occupation": "Principal Software Architect",
        "notes": "Updated designation as requested."
    })
    assert resubmit_res.status_code == 200
    assert resubmit_res.json()["status"] == "PENDING"

    # 12. Admin accepts application into Membership
    accept_res = client.post(f"/api/v1/member-applications/{app_id}/accept", headers=superadmin_headers, json={
        "admin_notes": "All compliance requirements fulfilled. Welcome to the Foundation!"
    })
    assert accept_res.status_code == 200
    accepted_data = accept_res.json()
    assert accepted_data["status"] == "ACCEPTED"
    assert accepted_data["created_member_id"] is not None

    created_member_id = accepted_data["created_member_id"]

    # 13. Verify Member record was created in database copying all 6 sections
    created_member_res = client.get(f"/api/v1/members/{created_member_id}", headers=superadmin_headers)
    assert created_member_res.status_code == 200
    mem_data = created_member_res.json()
    assert mem_data["name"] == applicant_name
    assert mem_data["group_id"] == group_id
    assert mem_data["national_id"] == "19901234567890"
    assert mem_data["father_name"] == "Md. Abdul Quddus"
    assert mem_data["blood_group"] == "B+"

    # 14. Idempotency test: calling accept a second time is rejected
    duplicate_accept = client.post(f"/api/v1/member-applications/{app_id}/accept", headers=superadmin_headers, json={})
    assert duplicate_accept.status_code == 400
    assert "already been accepted" in duplicate_accept.json()["detail"]

    # 15. Verify status history audit trail
    detail_res = client.get(f"/api/v1/member-applications/{app_id}", headers=superadmin_headers)
    assert detail_res.status_code == 200
    history = detail_res.json()["status_history"]
    actions = [h["action"] for h in history]
    assert "APPLICATION_CREATED" in actions
    assert "APPLICATION_REVIEW_STARTED" in actions
    assert "CHANGES_REQUESTED" in actions
    assert "APPLICATION_RESUBMITTED" in actions
    assert "APPLICATION_ACCEPTED" in actions

def test_application_rejection_workflow(superadmin_headers):
    # 1. Create a group
    group_res = client.post("/api/v1/groups", headers=superadmin_headers, json={
        "name": f"Rejection Test Group {uuid.uuid4().hex[:6]}"
    })
    group_id = group_res.json()["id"]

    # 2. Submit application
    sub_res = client.post("/api/v1/public/member-applications", json={
        "applicant_name": f"Rejected Applicant {uuid.uuid4().hex[:4]}",
        "proposed_group_id": group_id,
        "email": f"applicant_{uuid.uuid4().hex[:6]}@test.org"
    })
    app_code = sub_res.json()["application_code"]

    # 3. Find application ID
    list_res = client.get(f"/api/v1/member-applications?search={app_code}", headers=superadmin_headers)
    app_id = list_res.json()[0]["id"]

    # 4. Reject application
    reject_res = client.post(f"/api/v1/member-applications/{app_id}/reject", headers=superadmin_headers, json={
        "rejection_reason": "Ineligible due to geographical jurisdiction.",
        "admin_notes": "Outside operating area"
    })
    assert reject_res.status_code == 200
    assert reject_res.json()["status"] == "REJECTED"

    # 5. Public status check reflects rejection
    check_res = client.post("/api/v1/public/member-applications/status", json={
        "application_code": app_code,
        "verification_contact": sub_res.json()["applicant_name"]
    })
    assert check_res.status_code == 200
    assert check_res.json()["status"] == "REJECTED"
    assert check_res.json()["rejection_reason"] == "Ineligible due to geographical jurisdiction."
