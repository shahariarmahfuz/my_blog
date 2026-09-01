from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone, date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_permission, get_client_ip
from app.models.user import User
from app.models.member import Member
from app.models.group import Group
from app.models.contribution import Contribution, MonthlyContributionDue
from app.models.member_application import MemberApplication
from app.schemas.member import MemberCreate, MemberUpdate, MemberOut, MemberLedgerOut, MemberLedgerEntry
from app.schemas.contribution import ContributionOut, MonthlyContributionDueOut
from app.services.audit_service import AuditService
from app.services.id_service import IdService
from app.services.monthly_contribution_service import MonthlyContributionService

router = APIRouter()

def resolve_member(db: Session, identifier: str) -> Member:
    """Resolve member by either UUID or human-readable member_code (e.g. M-0008)."""
    clean_id = identifier.strip()
    try:
        uuid_obj = UUID(clean_id)
        member = db.query(Member).filter(Member.id == uuid_obj).first()
        if member:
            return member
    except (ValueError, TypeError, AttributeError):
        pass
    
    # Lookup by member_code (case-insensitive)
    member = db.query(Member).filter(Member.member_code.ilike(clean_id)).first()
    if member:
        return member
        
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Member '{identifier}' not found.")

@router.get("/next-code", response_model=dict)
def get_next_member_code(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("members.view"))
):
    """Generate the next auto-suggested Member ID (e.g. M-0008)."""
    candidate_code = IdService.generate_member_code(db)
    return {"next_member_code": candidate_code}

@router.get("", response_model=List[MemberOut])
def list_members(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    group_id: Optional[UUID] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("members.view"))
):
    query = db.query(Member).join(Group, Group.id == Member.group_id)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Member.name.ilike(search_pattern)) |
            (Member.member_code.ilike(search_pattern)) |
            (Member.phone.ilike(search_pattern)) |
            (Member.email.ilike(search_pattern)) |
            (Member.national_id.ilike(search_pattern))
        )
    if group_id:
        query = query.filter(Member.group_id == group_id)
    if is_active is not None:
        query = query.filter(Member.is_active == is_active)

    members = query.order_by(Member.created_at.desc()).offset(skip).limit(limit).all()
    
    # Batch calculate contribution stats
    member_ids = [m.id for m in members]
    stats_rows = (
        db.query(
            Contribution.member_id,
            func.coalesce(func.sum(Contribution.amount), Decimal("0.00")),
            func.count(Contribution.id),
            func.max(Contribution.contribution_date)
        ).filter(Contribution.member_id.in_(member_ids), Contribution.is_voided == False)\
        .group_by(Contribution.member_id).all()
    ) if member_ids else []
    stats = {row[0]: (row[1], row[2], row[3]) for row in stats_rows}

    # Batch check application links
    app_rows = (
        db.query(MemberApplication.created_member_id, MemberApplication.id, MemberApplication.application_code)
        .filter(MemberApplication.created_member_id.in_(member_ids)).all()
    ) if member_ids else []
    app_map = {row[0]: (row[1], row[2]) for row in app_rows}

    global_default = MonthlyContributionService.get_default_monthly_contribution(db)

    result = []
    for m in members:
        out = MemberOut.model_validate(m)
        out.group_name = m.group.name if m.group else ""
        out.effective_monthly_contribution = m.monthly_contribution_amount if (m.monthly_contribution_amount is not None) else global_default
        
        stat = stats.get(m.id)
        if stat:
            out.total_contributions = Decimal(str(stat[0]))
            out.contributions_count = stat[1]
            out.last_contribution_date = stat[2]
        else:
            out.total_contributions = Decimal("0.00")
            out.contributions_count = 0
            out.last_contribution_date = None

        if m.id in app_map:
            out.application_id = app_map[m.id][0]
            out.application_code = app_map[m.id][1]

        result.append(out)

    return result

@router.get("/{member_id}", response_model=MemberOut)
def get_member(
    member_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("members.view"))
):
    member = resolve_member(db, member_id)
    out = MemberOut.model_validate(member)
    out.group_name = member.group.name if member.group else ""
    out.effective_monthly_contribution = MonthlyContributionService.get_member_expected_amount(db, member)

    stat = db.query(
        func.coalesce(func.sum(Contribution.amount), Decimal("0.00")),
        func.count(Contribution.id),
        func.max(Contribution.contribution_date)
    ).filter(Contribution.member_id == member.id, Contribution.is_voided == False).first()

    if stat:
        out.total_contributions = Decimal(str(stat[0]))
        out.contributions_count = stat[1]
        out.last_contribution_date = stat[2]

    app_record = db.query(MemberApplication).filter(MemberApplication.created_member_id == member.id).first()
    if app_record:
        out.application_id = app_record.id
        out.application_code = app_record.application_code

    return out

@router.get("/{member_id}/contributions", response_model=List[ContributionOut])
def get_member_contributions(
    member_id: str,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("members.view"))
):
    member = resolve_member(db, member_id)

    contribs = db.query(Contribution)\
        .filter(Contribution.member_id == member.id)\
        .order_by(Contribution.contribution_date.desc(), Contribution.created_at.desc())\
        .offset(skip).limit(limit).all()

    result = []
    for c in contribs:
        out = ContributionOut.model_validate(c)
        out.member_name = member.name
        out.group_name = c.group.name if c.group else ""
        result.append(out)
    return result

@router.get("/{member_id}/ledger", response_model=MemberLedgerOut)
def get_member_ledger(
    member_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("members.view"))
):
    """
    Returns Member Financial Ledger:
    1. Double-entry financial transactions (credits/payments with progressive running totals).
    2. Monthly Contribution Dues Schedule (month, expected, paid, remaining, status).
    """
    member = resolve_member(db, member_id)

    contribs = db.query(Contribution)\
        .filter(Contribution.member_id == member.id)\
        .order_by(Contribution.contribution_date.asc(), Contribution.created_at.asc()).all()

    running = Decimal("0.00")
    entries = []
    first_date = None
    last_date = None

    for c in contribs:
        amt = Decimal(str(c.amount))
        if not c.is_voided:
            running += amt
            if first_date is None:
                first_date = c.contribution_date
            last_date = c.contribution_date

        entries.append(MemberLedgerEntry(
            id=c.id,
            date=c.contribution_date,
            transaction_type="CONTRIBUTION" if not c.is_voided else "CONTRIBUTION_VOIDED",
            group_name=c.group.name if c.group else "",
            amount=amt if not c.is_voided else Decimal("0.00"),
            payment_method=c.payment_method.value if hasattr(c.payment_method, "value") else str(c.payment_method),
            receipt_number=c.receipt_number,
            reference_number=c.reference_number,
            contribution_month=c.contribution_month,
            months_count=c.months_count or 1,
            months_summary=c.months_summary or (c.contribution_month.strftime("%B %Y") if c.contribution_month else None),
            notes=c.notes if not c.is_voided else f"[VOIDED: {c.void_reason}] {c.notes or ''}",
            running_total=running
        ))

    entries.reverse()

    # Load Monthly Dues schedule
    dues_query = db.query(MonthlyContributionDue)\
        .filter(MonthlyContributionDue.member_id == member.id)\
        .order_by(MonthlyContributionDue.contribution_month.desc()).all()

    monthly_dues_out = []
    rules = MonthlyContributionService.get_contribution_rules(db)
    grace_days = rules["grace_period_days"]
    today = date.today()

    for d in dues_query:
        st = MonthlyContributionService.evaluate_due_status(
            expected_amount=d.expected_amount,
            paid_amount=d.paid_amount,
            due_date=d.due_date,
            grace_period_days=grace_days,
            as_of_date=today
        )
        days_over = max(0, (today - d.due_date).days) if st == "OVERDUE" else 0
        monthly_dues_out.append(MonthlyContributionDueOut(
            id=d.id,
            member_id=d.member_id,
            member_name=member.name,
            member_code=member.member_code,
            group_id=d.group_id,
            group_name=member.group.name if member.group else "",
            phone=member.phone,
            email=member.email,
            contribution_month=d.contribution_month,
            due_date=d.due_date,
            expected_amount=d.expected_amount,
            paid_amount=d.paid_amount,
            remaining_due=d.remaining_due,
            status=st,
            days_overdue=days_over,
            notes=d.notes,
            created_at=d.created_at,
            updated_at=d.updated_at
        ))

    effective_amount = MonthlyContributionService.get_member_expected_amount(db, member)

    return MemberLedgerOut(
        member_id=member.id,
        member_name=member.name,
        member_code=member.member_code,
        group_id=member.group_id,
        group_name=member.group.name if member.group else "",
        is_active=member.is_active,
        monthly_contribution_amount=member.monthly_contribution_amount,
        effective_monthly_contribution=effective_amount,
        total_contributions=running,
        contributions_count=len([c for c in contribs if not c.is_voided]),
        first_contribution_date=first_date,
        last_contribution_date=last_date,
        entries=entries,
        monthly_dues=monthly_dues_out
    )

@router.post("", response_model=MemberOut, status_code=status.HTTP_201_CREATED)
def create_member(
    request: Request,
    member_in: MemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("members.create"))
):
    group = db.query(Group).filter(Group.id == member_in.group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assigned Group does not exist.")

    name_clean = member_in.name.strip()
    if not name_clean:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Member Full Name is required.")

    code_to_use = IdService.validate_and_sanitize_code(member_in.member_code, "Member")
    if code_to_use:
        existing_code = db.query(Member).filter(Member.member_code.ilike(code_to_use)).first()
        if existing_code:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Member ID '{code_to_use}' already exists.")
    else:
        code_to_use = IdService.generate_member_code(db)

    member = Member(
        name=name_clean,
        group_id=member_in.group_id,
        member_code=code_to_use,
        join_date=member_in.join_date or datetime.now(timezone.utc).date(),
        monthly_contribution_amount=member_in.monthly_contribution_amount,
        is_active=member_in.is_active if member_in.is_active is not None else True,

        # 1. Personal Information
        father_name=member_in.father_name,
        mother_name=member_in.mother_name,
        date_of_birth=member_in.date_of_birth,
        gender=member_in.gender,
        national_id=member_in.national_id,
        occupation=member_in.occupation,
        education=member_in.education,
        blood_group=member_in.blood_group,
        marital_status=member_in.marital_status,
        phone=member_in.phone,
        alternative_phone=member_in.alternative_phone,
        email=member_in.email,
        address=member_in.address or member_in.present_address,
        present_address=member_in.present_address,
        permanent_address=member_in.permanent_address,

        # 2. Emergency Contact
        emergency_contact=member_in.emergency_contact_phone or member_in.emergency_contact,
        emergency_contact_name=member_in.emergency_contact_name,
        emergency_contact_relation=member_in.emergency_contact_relation,
        emergency_contact_phone=member_in.emergency_contact_phone,

        # 3. Reference
        reference_name=member_in.reference_name,
        reference_relation=member_in.reference_relation,
        reference_phone=member_in.reference_phone,

        # 4. Commitment
        commitment_accepted=member_in.commitment_accepted or False,

        # 5. Documents
        photo_url=member_in.photo_url,
        signature_url=member_in.signature_url,
        document_type=member_in.document_type,
        document_url=member_in.document_url,

        # 6. Additional Information
        reason_for_joining=member_in.reason_for_joining,
        notes=member_in.notes
    )
    db.add(member)
    db.commit()
    db.refresh(member)

    AuditService.log(
        db=db,
        action="CREATE",
        entity_name="members",
        entity_id=str(member.id),
        new_values={
            "name": member.name,
            "member_code": member.member_code,
            "group_id": str(member.group_id),
            "group_name": group.name,
            "monthly_contribution_amount": float(member.monthly_contribution_amount) if member.monthly_contribution_amount else None
        },
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )
    db.commit()

    out = MemberOut.model_validate(member)
    out.group_name = group.name
    out.effective_monthly_contribution = MonthlyContributionService.get_member_expected_amount(db, member)
    out.total_contributions = Decimal("0.00")
    out.contributions_count = 0
    return out

@router.patch("/{member_id}", response_model=MemberOut)
def update_member(
    request: Request,
    member_id: str,
    member_in: MemberUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("members.edit"))
):
    member = resolve_member(db, member_id)

    old_data = {
        "name": member.name,
        "member_code": member.member_code,
        "group_id": str(member.group_id),
        "monthly_contribution_amount": float(member.monthly_contribution_amount) if member.monthly_contribution_amount else None,
        "is_active": member.is_active
    }

    if member_in.name is not None:
        name_clean = member_in.name.strip()
        if not name_clean:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Member Name cannot be empty.")
        member.name = name_clean

    if member_in.group_id is not None and member_in.group_id != member.group_id:
        group = db.query(Group).filter(Group.id == member_in.group_id).first()
        if not group:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target group does not exist.")
        member.group_id = member_in.group_id

    if member_in.member_code is not None:
        code_clean = IdService.validate_and_sanitize_code(member_in.member_code, "Member")
        if code_clean and code_clean != member.member_code:
            existing = db.query(Member).filter(Member.member_code.ilike(code_clean), Member.id != member.id).first()
            if existing:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Member ID '{code_clean}' already exists.")
            member.member_code = code_clean

    # Update optional fields if provided in update payload
    for field in [
        "join_date", "monthly_contribution_amount", "is_active", "father_name", "mother_name", "date_of_birth", "gender",
        "national_id", "occupation", "education", "blood_group", "marital_status",
        "phone", "alternative_phone", "email", "address", "present_address", "permanent_address",
        "emergency_contact", "emergency_contact_name", "emergency_contact_relation", "emergency_contact_phone",
        "reference_name", "reference_relation", "reference_phone", "commitment_accepted",
        "photo_url", "signature_url", "document_type", "document_url",
        "reason_for_joining", "notes"
    ]:
        val = getattr(member_in, field, None)
        if val is not None:
            setattr(member, field, val)

    member.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(member)

    AuditService.log(
        db=db,
        action="UPDATE",
        entity_name="members",
        entity_id=str(member.id),
        old_values=old_data,
        new_values={
            "name": member.name,
            "member_code": member.member_code,
            "group_id": str(member.group_id),
            "monthly_contribution_amount": float(member.monthly_contribution_amount) if member.monthly_contribution_amount else None,
            "is_active": member.is_active
        },
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )
    db.commit()

    out = MemberOut.model_validate(member)
    out.group_name = member.group.name if member.group else ""
    out.effective_monthly_contribution = MonthlyContributionService.get_member_expected_amount(db, member)
    return out

@router.delete("/{member_id}")
def delete_member(
    request: Request,
    member_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("members.delete"))
):
    member = resolve_member(db, member_id)

    has_contribs = db.query(Contribution).filter(Contribution.member_id == member.id).first()
    if has_contribs:
        member.is_active = False
        db.commit()
        return {"message": "Member has contributions. Member status has been deactivated instead of deletion."}

    deleted_id = str(member.id)
    deleted_name = member.name
    db.delete(member)
    db.commit()

    AuditService.log(
        db=db,
        action="DELETE",
        entity_name="members",
        entity_id=deleted_id,
        old_values={"name": deleted_name},
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )
    db.commit()

    return {"message": "Member deleted successfully."}
