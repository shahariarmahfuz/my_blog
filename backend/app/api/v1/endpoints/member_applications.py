import uuid
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone, date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_permission, get_client_ip
from app.models.user import User
from app.models.group import Group
from app.models.member import Member
from app.models.member_application import MemberApplication, MemberApplicationStatusHistory
from app.schemas.member_application import (
    MemberApplicationOut,
    MemberApplicationDetailOut,
    MemberApplicationSummaryCountsOut,
    MemberApplicationStatusHistoryOut,
    AdminReviewActionRequest,
    AdminRequestChangesRequest,
    AdminRejectRequest,
    AdminAcceptRequest,
)
from app.services.audit_service import AuditService
from app.services.id_service import IdService

router = APIRouter()

def build_application_out(a: MemberApplication) -> MemberApplicationOut:
    out = MemberApplicationOut(
        id=a.id,
        application_code=a.application_code,
        applicant_name=a.applicant_name,
        proposed_group_id=a.proposed_group_id,
        proposed_group_name=a.proposed_group.name if a.proposed_group else "Not Assigned",
        phone=a.phone,
        email=a.email,
        address=a.address,
        date_of_birth=a.date_of_birth,
        occupation=a.occupation,
        national_id=a.national_id,
        monthly_pledge=a.monthly_pledge or Decimal("0.00"),
        application_date=a.application_date,
        status=a.status,
        notes=a.notes,
        change_request_message=a.change_request_message,
        rejection_reason=a.rejection_reason,
        admin_notes=a.admin_notes,
        reviewed_by=a.reviewed_by,
        reviewer_name=a.reviewer.full_name if a.reviewer else None,
        reviewed_at=a.reviewed_at,
        accepted_by=a.accepted_by,
        acceptor_name=a.acceptor.full_name if a.acceptor else None,
        accepted_at=a.accepted_at,
        created_member_id=a.created_member_id,
        created_at=a.created_at,
        updated_at=a.updated_at,
    )
    return out

@router.get("/summary", response_model=MemberApplicationSummaryCountsOut)
def get_member_application_counts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("members.view"))
):
    """Get metrics count of member applications by status."""
    total = db.query(MemberApplication).count()
    pending = db.query(MemberApplication).filter(MemberApplication.status == "PENDING").count()
    under_review = db.query(MemberApplication).filter(MemberApplication.status == "UNDER_REVIEW").count()
    changes_req = db.query(MemberApplication).filter(MemberApplication.status == "CHANGES_REQUIRED").count()
    accepted = db.query(MemberApplication).filter(MemberApplication.status == "ACCEPTED").count()
    rejected = db.query(MemberApplication).filter(MemberApplication.status == "REJECTED").count()
    cancelled = db.query(MemberApplication).filter(MemberApplication.status == "CANCELLED").count()

    return MemberApplicationSummaryCountsOut(
        total_count=total,
        pending_count=pending,
        under_review_count=under_review,
        changes_required_count=changes_req,
        accepted_count=accepted,
        rejected_count=rejected,
        cancelled_count=cancelled
    )

@router.get("", response_model=List[MemberApplicationOut])
def list_member_applications(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    group_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("members.view"))
):
    """
    List member applications with search, status filters, and assigned group.
    """
    query = db.query(MemberApplication)

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            (MemberApplication.applicant_name.ilike(pattern)) |
            (MemberApplication.application_code.ilike(pattern)) |
            (MemberApplication.phone.ilike(pattern)) |
            (MemberApplication.email.ilike(pattern)) |
            (MemberApplication.national_id.ilike(pattern))
        )
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(MemberApplication.status == status_filter.upper())
    if group_id:
        query = query.filter(MemberApplication.proposed_group_id == group_id)

    apps = query.order_by(MemberApplication.created_at.desc()).offset(skip).limit(limit).all()
    return [build_application_out(a) for a in apps]

@router.get("/{application_id}", response_model=MemberApplicationDetailOut)
def get_member_application(
    application_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("members.view"))
):
    """
    Get full application details including status history timeline.
    """
    app_obj = db.query(MemberApplication).filter(MemberApplication.id == application_id).first()
    if not app_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member application not found.")

    base_out = build_application_out(app_obj)

    # Status history
    histories = (
        db.query(MemberApplicationStatusHistory)
        .filter(MemberApplicationStatusHistory.application_id == application_id)
        .order_by(MemberApplicationStatusHistory.created_at.desc())
        .all()
    )

    history_list = []
    for h in histories:
        h_out = MemberApplicationStatusHistoryOut(
            id=h.id,
            previous_status=h.previous_status,
            new_status=h.new_status,
            action=h.action,
            actor_type=h.actor_type,
            changed_by_name=h.changed_by_user.full_name if h.changed_by_user else None,
            note=h.note,
            created_at=h.created_at
        )
        history_list.append(h_out)

    detail_out = MemberApplicationDetailOut(
        **base_out.model_dump(),
        status_history=history_list
    )
    return detail_out

@router.post("/{application_id}/review", response_model=MemberApplicationDetailOut)
def start_application_review(
    application_id: UUID,
    action_req: AdminReviewActionRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("members.edit"))
):
    """
    Transition application status from PENDING or CHANGES_REQUIRED to UNDER_REVIEW.
    """
    app_obj = db.query(MemberApplication).filter(MemberApplication.id == application_id).first()
    if not app_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member application not found.")

    if app_obj.status in ["ACCEPTED", "REJECTED", "CANCELLED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot start review on a finalised application in '{app_obj.status}' status."
        )

    prev_status = app_obj.status
    app_obj.status = "UNDER_REVIEW"
    app_obj.reviewed_by = current_user.id
    app_obj.reviewed_at = datetime.now(timezone.utc)
    if action_req.admin_notes:
        app_obj.admin_notes = action_req.admin_notes

    history = MemberApplicationStatusHistory(
        application_id=app_obj.id,
        previous_status=prev_status,
        new_status="UNDER_REVIEW",
        action="APPLICATION_REVIEW_STARTED",
        changed_by_user_id=current_user.id,
        actor_type="ADMIN",
        note=action_req.admin_notes or f"Review started by {current_user.full_name}.",
    )
    db.add(history)
    db.commit()
    db.refresh(app_obj)

    AuditService.log(
        db=db,
        action="APPLICATION_REVIEW_STARTED",
        entity_name="member_applications",
        entity_id=str(app_obj.id),
        new_values={
            "application_code": app_obj.application_code,
            "status": "UNDER_REVIEW",
            "reviewer": current_user.full_name
        },
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )
    db.commit()

    return get_member_application(application_id, db, current_user)

@router.post("/{application_id}/request-changes", response_model=MemberApplicationDetailOut)
def request_application_changes(
    application_id: UUID,
    change_req: AdminRequestChangesRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("members.edit"))
):
    """
    Request changes from the applicant. Status transitions to CHANGES_REQUIRED.
    The change_request_message is visible to the public applicant on status lookup.
    """
    app_obj = db.query(MemberApplication).filter(MemberApplication.id == application_id).first()
    if not app_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member application not found.")

    if app_obj.status in ["ACCEPTED", "REJECTED", "CANCELLED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot request changes on a finalised application in '{app_obj.status}' status."
        )

    prev_status = app_obj.status
    app_obj.status = "CHANGES_REQUIRED"
    app_obj.change_request_message = change_req.change_request_message.strip()
    app_obj.reviewed_by = current_user.id
    app_obj.reviewed_at = datetime.now(timezone.utc)
    if change_req.admin_notes:
        app_obj.admin_notes = change_req.admin_notes

    history = MemberApplicationStatusHistory(
        application_id=app_obj.id,
        previous_status=prev_status,
        new_status="CHANGES_REQUIRED",
        action="CHANGES_REQUESTED",
        changed_by_user_id=current_user.id,
        actor_type="ADMIN",
        note=f"Changes requested: {change_req.change_request_message.strip()}",
    )
    db.add(history)
    db.commit()
    db.refresh(app_obj)

    AuditService.log(
        db=db,
        action="CHANGES_REQUESTED",
        entity_name="member_applications",
        entity_id=str(app_obj.id),
        new_values={
            "application_code": app_obj.application_code,
            "status": "CHANGES_REQUIRED",
            "message": change_req.change_request_message.strip()
        },
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )
    db.commit()

    return get_member_application(application_id, db, current_user)

@router.post("/{application_id}/reject", response_model=MemberApplicationDetailOut)
def reject_member_application(
    application_id: UUID,
    reject_req: AdminRejectRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("members.edit"))
):
    """
    Reject an application. Requires a rejection reason. Status transitions to REJECTED.
    """
    app_obj = db.query(MemberApplication).filter(MemberApplication.id == application_id).first()
    if not app_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member application not found.")

    if app_obj.status == "ACCEPTED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot reject an application that has already been accepted into membership."
        )

    prev_status = app_obj.status
    app_obj.status = "REJECTED"
    app_obj.rejection_reason = reject_req.rejection_reason.strip()
    app_obj.reviewed_by = current_user.id
    app_obj.reviewed_at = datetime.now(timezone.utc)
    if reject_req.admin_notes:
        app_obj.admin_notes = reject_req.admin_notes

    history = MemberApplicationStatusHistory(
        application_id=app_obj.id,
        previous_status=prev_status,
        new_status="REJECTED",
        action="APPLICATION_REJECTED",
        changed_by_user_id=current_user.id,
        actor_type="ADMIN",
        note=f"Rejected: {reject_req.rejection_reason.strip()}",
    )
    db.add(history)
    db.commit()
    db.refresh(app_obj)

    AuditService.log(
        db=db,
        action="APPLICATION_REJECTED",
        entity_name="member_applications",
        entity_id=str(app_obj.id),
        new_values={
            "application_code": app_obj.application_code,
            "status": "REJECTED",
            "rejection_reason": reject_req.rejection_reason.strip()
        },
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )
    db.commit()

    return get_member_application(application_id, db, current_user)

@router.post("/{application_id}/accept", response_model=MemberApplicationDetailOut)
def accept_member_application(
    application_id: UUID,
    accept_req: AdminAcceptRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("members.create"))
):
    """
    Accept an application:
    - Atomically creates exactly one Member in the members table.
    - Idempotent: Prevents duplicate Member creation if called multiple times.
    - Assigns to proposed or specified Group.
    - Links created_member_id to application.
    - Marks status as ACCEPTED.
    - Logs audit trail.
    """
    app_obj = db.query(MemberApplication).filter(MemberApplication.id == application_id).first()
    if not app_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member application not found.")

    if app_obj.status == "ACCEPTED" or app_obj.created_member_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Application has already been accepted and enrolled into Membership."
        )

    # Determine assigned group
    target_group_id = accept_req.assigned_group_id or app_obj.proposed_group_id
    if not target_group_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A target fund group must be specified for member enrolment."
        )

    group = db.query(Group).filter(Group.id == target_group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target fund group does not exist."
        )

    # Determine Member Code (admin override or auto-generated)
    if accept_req.member_code:
        member_code = IdService.validate_and_sanitize_code(accept_req.member_code, "Member")
        if member_code:
            existing_m = db.query(Member).filter(Member.member_code.ilike(member_code)).first()
            if existing_m:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Member ID '{member_code}' already exists.")
    else:
        member_code = IdService.generate_member_code(db)

    present_addr = app_obj.present_address or app_obj.address
    perm_addr = app_obj.permanent_address or app_obj.address

    # Create Member record copying all 6 sections
    new_member = Member(
        name=app_obj.applicant_name.strip(),
        group_id=target_group_id,
        member_code=member_code,
        join_date=date.today(),
        is_active=True,

        # 1. Personal Info
        father_name=app_obj.father_name,
        mother_name=app_obj.mother_name,
        date_of_birth=app_obj.date_of_birth,
        gender=app_obj.gender,
        national_id=app_obj.national_id,
        occupation=app_obj.occupation,
        education=app_obj.education,
        blood_group=app_obj.blood_group,
        marital_status=app_obj.marital_status,
        phone=app_obj.phone,
        alternative_phone=app_obj.alternative_phone,
        email=app_obj.email,
        address=present_addr,
        present_address=present_addr,
        permanent_address=perm_addr,

        # 2. Emergency Contact
        emergency_contact_name=app_obj.emergency_contact_name,
        emergency_contact_relation=app_obj.emergency_contact_relation,
        emergency_contact_phone=app_obj.emergency_contact_phone,

        # 3. Reference
        reference_name=app_obj.reference_name,
        reference_relation=app_obj.reference_relation,
        reference_phone=app_obj.reference_phone,

        # 4. Commitment
        commitment_accepted=app_obj.commitment_accepted if app_obj.commitment_accepted is not None else True,

        # 5. Documents
        photo_url=app_obj.photo_url,
        signature_url=app_obj.signature_url,
        document_type=app_obj.document_type,
        document_url=app_obj.document_url,

        # 6. Additional Info
        reason_for_joining=app_obj.reason_for_joining,
        notes=f"Enrolled via Member Application {app_obj.application_code}. {app_obj.notes or ''}".strip(),
    )
    db.add(new_member)
    db.flush()  # Obtain new_member.id

    # Update application record
    prev_status = app_obj.status
    app_obj.status = "ACCEPTED"
    app_obj.accepted_by = current_user.id
    app_obj.accepted_at = datetime.now(timezone.utc)
    app_obj.created_member_id = new_member.id
    if accept_req.admin_notes:
        app_obj.admin_notes = accept_req.admin_notes

    # Add history record
    history = MemberApplicationStatusHistory(
        application_id=app_obj.id,
        previous_status=prev_status,
        new_status="ACCEPTED",
        action="APPLICATION_ACCEPTED",
        changed_by_user_id=current_user.id,
        actor_type="ADMIN",
        note=f"Accepted and enrolled as Member '{new_member.name}' ({member_code}) in group '{group.name}'.",
    )
    db.add(history)
    db.commit()
    db.refresh(app_obj)

    # Log audit
    AuditService.log(
        db=db,
        action="APPLICATION_ACCEPTED",
        entity_name="member_applications",
        entity_id=str(app_obj.id),
        new_values={
            "application_code": app_obj.application_code,
            "status": "ACCEPTED",
            "member_id": str(new_member.id),
            "member_code": member_code,
            "group_name": group.name,
            "enrolled_by": current_user.full_name
        },
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )
    db.commit()

    return get_member_application(application_id, db, current_user)
