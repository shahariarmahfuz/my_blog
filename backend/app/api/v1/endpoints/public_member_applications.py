import secrets
import string
from datetime import datetime, timezone, date
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_client_ip
from app.models.group import Group
from app.models.member_application import MemberApplication, MemberApplicationStatusHistory
from app.schemas.member_application import (
    PublicMemberApplicationCreate,
    PublicApplicationSubmissionOut,
    PublicStatusCheckRequest,
    PublicApplicationStatusOut,
    PublicApplicationResubmitRequest,
)
from app.services.audit_service import AuditService

router = APIRouter()

def generate_secure_application_code(db: Session) -> str:
    """Generate a non-sequential, cryptographically secure 8-character application code e.g. MA-8F4K2P7X"""
    alphabet = string.ascii_uppercase + string.digits
    alphabet = alphabet.replace('O', '').replace('0', '').replace('I', '').replace('1', '')  # Remove ambiguous characters
    
    for _ in range(20):
        random_part = ''.join(secrets.choice(alphabet) for _ in range(8))
        code = f"MA-{random_part}"
        exists = db.query(MemberApplication.id).filter(MemberApplication.application_code == code).first()
        if not exists:
            return code
    # Fallback to uuid hex
    return f"MA-{secrets.token_hex(4).upper()}"

@router.get("/groups", response_model=List[dict])
def list_public_eligible_groups(db: Session = Depends(get_db)):
    """List active fund groups available for applicant selection (public, non-sensitive)."""
    groups = db.query(Group).filter(Group.is_active == True).order_by(Group.name.asc()).all()
    return [
        {
            "id": str(g.id),
            "name": g.name,
            "code": g.code,
            "description": g.description
        }
        for g in groups
    ]

@router.post("/member-applications", response_model=PublicApplicationSubmissionOut, status_code=status.HTTP_201_CREATED)
def submit_public_member_application(
    request: Request,
    app_in: PublicMemberApplicationCreate,
    db: Session = Depends(get_db)
):
    """
    Public endpoint: Submit a request to become a Foundation Member.
    Required: Name and Group.
    All other fields are optional.
    Does NOT create a Member record.
    """
    # Verify group exists and is active
    group = db.query(Group).filter(Group.id == app_in.proposed_group_id, Group.is_active == True).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The selected fund group does not exist or is not accepting new members."
        )

    # Generate secure, unique, non-sequential Application ID
    app_code = generate_secure_application_code(db)

    app_obj = MemberApplication(
        application_code=app_code,
        applicant_name=app_in.applicant_name.strip(),
        proposed_group_id=app_in.proposed_group_id,
        phone=app_in.phone.strip() if app_in.phone else None,
        email=app_in.email.strip().lower() if app_in.email else None,
        address=app_in.address.strip() if app_in.address else None,
        date_of_birth=app_in.date_of_birth,
        occupation=app_in.occupation.strip() if app_in.occupation else None,
        national_id=app_in.national_id.strip() if app_in.national_id else None,
        notes=app_in.notes.strip() if app_in.notes else None,
        application_date=date.today(),
        status="PENDING",
    )
    db.add(app_obj)
    db.flush()

    # Create immutable status history record
    history = MemberApplicationStatusHistory(
        application_id=app_obj.id,
        previous_status=None,
        new_status="PENDING",
        action="APPLICATION_CREATED",
        actor_type="APPLICANT",
        note="Application submitted via public portal.",
    )
    db.add(history)
    db.commit()
    db.refresh(app_obj)

    # Log public creation audit
    AuditService.log(
        db=db,
        action="PUBLIC_APPLICATION_SUBMITTED",
        entity_name="member_applications",
        entity_id=str(app_obj.id),
        new_values={
            "application_code": app_obj.application_code,
            "applicant_name": app_obj.applicant_name,
            "proposed_group": group.name,
            "status": "PENDING"
        },
        user_id=None,
        ip_address=get_client_ip(request)
    )
    db.commit()

    return PublicApplicationSubmissionOut(
        application_code=app_obj.application_code,
        applicant_name=app_obj.applicant_name,
        proposed_group_name=group.name,
        status="PENDING",
        submitted_at=app_obj.created_at,
        message="Application submitted successfully. Please save your Application ID to track your status."
    )

@router.post("/member-applications/status", response_model=PublicApplicationStatusOut)
def check_public_application_status(
    check_req: PublicStatusCheckRequest,
    db: Session = Depends(get_db)
):
    """
    Public endpoint: Check application status by Application Code + Contact Verification.
    Requires phone or email verification to protect applicant privacy.
    """
    app_code = check_req.application_code.strip().upper()
    verification = check_req.verification_contact.strip().lower()

    app_obj = db.query(MemberApplication).filter(MemberApplication.application_code == app_code).first()
    if not app_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found. Please check your Application ID."
        )

    # Verify contact matching (phone, email, or applicant name)
    phone_match = bool(app_obj.phone and (verification in app_obj.phone.lower() or app_obj.phone.lower() in verification))
    email_match = bool(app_obj.email and (verification == app_obj.email.lower() or verification in app_obj.email.lower()))
    name_match = bool(verification == app_obj.applicant_name.lower() or app_obj.applicant_name.lower() in verification or verification in app_obj.applicant_name.lower())

    if not (phone_match or email_match or name_match):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Verification contact (Phone, Email, or Applicant Name) does not match our records for this Application ID."
        )

    # Prepare user-safe status message
    status_messages = {
        "PENDING": "Your application has been received and is queued for administrative review.",
        "UNDER_REVIEW": "An authorized admissions committee officer is actively reviewing your application.",
        "CHANGES_REQUIRED": "The reviewer has requested additional or corrected information before processing.",
        "ACCEPTED": "Congratulations! Your application has been approved and you are now an active Foundation Member.",
        "REJECTED": "Thank you for your interest. Unfortunately, your application could not be approved at this time.",
        "CANCELLED": "This application was cancelled."
    }

    group_name = app_obj.proposed_group.name if app_obj.proposed_group else "General Foundation"

    details = None
    if app_obj.status == "CHANGES_REQUIRED":
        details = {
            "applicant_name": app_obj.applicant_name,
            "phone": app_obj.phone,
            "email": app_obj.email,
            "address": app_obj.address,
            "date_of_birth": app_obj.date_of_birth.isoformat() if app_obj.date_of_birth else None,
            "occupation": app_obj.occupation,
            "national_id": app_obj.national_id,
            "notes": app_obj.notes,
        }

    return PublicApplicationStatusOut(
        application_code=app_obj.application_code,
        status=app_obj.status,
        submitted_at=app_obj.created_at,
        last_updated_at=app_obj.updated_at,
        applicant_name=app_obj.applicant_name,
        proposed_group_name=group_name,
        status_message=status_messages.get(app_obj.status, f"Status: {app_obj.status}"),
        change_request_message=app_obj.change_request_message if app_obj.status == "CHANGES_REQUIRED" else None,
        rejection_reason=app_obj.rejection_reason if app_obj.status == "REJECTED" else None,
        can_resubmit=(app_obj.status == "CHANGES_REQUIRED"),
        details=details
    )

@router.post("/member-applications/{application_code}/resubmit", response_model=PublicApplicationStatusOut)
def resubmit_public_member_application(
    application_code: str,
    resubmit_req: PublicApplicationResubmitRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Public endpoint: Resubmit corrected information for an application with CHANGES_REQUIRED status.
    Keeps the same Application ID and logs transition history.
    """
    app_code = application_code.strip().upper()
    verification = resubmit_req.verification_contact.strip().lower()

    app_obj = db.query(MemberApplication).filter(MemberApplication.application_code == app_code).first()
    if not app_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found."
        )

    if app_obj.status != "CHANGES_REQUIRED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Application cannot be resubmitted while in '{app_obj.status}' status."
        )

    # Verify contact matching
    phone_match = app_obj.phone and (verification in app_obj.phone.lower() or app_obj.phone.lower() in verification)
    email_match = app_obj.email and (verification == app_obj.email.lower())
    name_match = (not app_obj.phone and not app_obj.email) and (verification in app_obj.applicant_name.lower())

    if not (phone_match or email_match or name_match):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Verification contact does not match our records."
        )

    prev_status = app_obj.status
    app_obj.status = "PENDING"
    if resubmit_req.applicant_name and resubmit_req.applicant_name.strip():
        app_obj.applicant_name = resubmit_req.applicant_name.strip()
    if resubmit_req.phone is not None:
        app_obj.phone = resubmit_req.phone.strip() if resubmit_req.phone else None
    if resubmit_req.email is not None:
        app_obj.email = resubmit_req.email.strip().lower() if resubmit_req.email else None
    if resubmit_req.address is not None:
        app_obj.address = resubmit_req.address.strip() if resubmit_req.address else None
    if resubmit_req.date_of_birth is not None:
        app_obj.date_of_birth = resubmit_req.date_of_birth
    if resubmit_req.occupation is not None:
        app_obj.occupation = resubmit_req.occupation.strip() if resubmit_req.occupation else None
    if resubmit_req.national_id is not None:
        app_obj.national_id = resubmit_req.national_id.strip() if resubmit_req.national_id else None
    if resubmit_req.notes is not None:
        app_obj.notes = resubmit_req.notes.strip() if resubmit_req.notes else None

    # Append status history
    history = MemberApplicationStatusHistory(
        application_id=app_obj.id,
        previous_status=prev_status,
        new_status="PENDING",
        action="APPLICATION_RESUBMITTED",
        actor_type="APPLICANT",
        note="Applicant resubmitted updated information in response to change request.",
    )
    db.add(history)
    db.commit()
    db.refresh(app_obj)

    # Log audit
    AuditService.log(
        db=db,
        action="APPLICATION_RESUBMITTED",
        entity_name="member_applications",
        entity_id=str(app_obj.id),
        new_values={
            "application_code": app_obj.application_code,
            "status": "PENDING"
        },
        user_id=None,
        ip_address=get_client_ip(request)
    )
    db.commit()

    group_name = app_obj.proposed_group.name if app_obj.proposed_group else "General Foundation"

    return PublicApplicationStatusOut(
        application_code=app_obj.application_code,
        status="PENDING",
        submitted_at=app_obj.created_at,
        last_updated_at=app_obj.updated_at,
        applicant_name=app_obj.applicant_name,
        proposed_group_name=group_name,
        status_message="Updated application received successfully and queued for review.",
        can_resubmit=False
    )
