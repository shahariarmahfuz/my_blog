import re
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_permission, get_client_ip
from app.models.user import User
from app.models.contribution import Contribution, MonthlyContributionDue, DueStatus
from app.models.member import Member
from app.models.group import Group
from app.models.ledger import FinancialTransaction, LedgerEntry
from app.schemas.contribution import (
    ContributionCreate, ContributionUpdate, ContributionOut,
    VoidContributionRequest, DueContributionOut, MonthlyContributionDueOut,
    MonthlyContributionSummaryOut, GenerateDuesRequest, GenerateDuesResponse,
    ContributionLedgerOut, ContributionLedgerEntryOut, MemberMonthsScheduleResponse,
    MonthScheduleItemOut, YearlyMonthlySummaryResponse, MemberMonthlySummaryRow
)
from app.services.ledger_service import LedgerService
from app.services.audit_service import AuditService
from app.services.monthly_contribution_service import MonthlyContributionService

router = APIRouter()

def parse_month_string(month_str: Optional[str]) -> date:
    """Parses a YYYY-MM or YYYY-MM-DD string into the 1st of that month date."""
    if not month_str:
        today = date.today()
        return date(today.year, today.month, 1)
    
    clean = month_str.strip()
    match = re.match(r"^(\d{4})-(\d{1,2})", clean)
    if match:
        year = int(match.group(1))
        month = int(match.group(2))
        if 1 <= month <= 12:
            return date(year, month, 1)
            
    today = date.today()
    return date(today.year, today.month, 1)

@router.get("", response_model=List[ContributionOut])
def list_contributions(
    skip: int = 0,
    limit: int = 100,
    member_id: Optional[UUID] = None,
    group_id: Optional[UUID] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    min_amount: Optional[Decimal] = None,
    max_amount: Optional[Decimal] = None,
    is_voided: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("contributions.view"))
):
    query = db.query(Contribution).join(Member, Member.id == Contribution.member_id).join(Group, Group.id == Contribution.group_id)
    
    if member_id:
        query = query.filter(Contribution.member_id == member_id)
    if group_id:
        query = query.filter(Contribution.group_id == group_id)
    if from_date:
        query = query.filter(Contribution.contribution_date >= from_date)
    if to_date:
        query = query.filter(Contribution.contribution_date <= to_date)
    if min_amount is not None:
        query = query.filter(Contribution.amount >= min_amount)
    if max_amount is not None:
        query = query.filter(Contribution.amount <= max_amount)
    if is_voided is not None:
        query = query.filter(Contribution.is_voided == is_voided)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Contribution.receipt_number.ilike(search_pattern)) |
            (Contribution.reference_number.ilike(search_pattern)) |
            (Member.name.ilike(search_pattern)) |
            (Member.member_code.ilike(search_pattern)) |
            (Group.name.ilike(search_pattern))
        )

    contributions = query.order_by(Contribution.contribution_date.desc(), Contribution.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for c in contributions:
        out = ContributionOut.model_validate(c)
        out.member_name = c.member.name if c.member else ""
        out.member_code = c.member.member_code if c.member else None
        out.group_name = c.group.name if c.group else ""
        out.created_by_name = c.creator.full_name if c.creator else None
        result.append(out)
    return result

@router.get("/monthly-summary", response_model=YearlyMonthlySummaryResponse)
def get_monthly_summary(
    year: Optional[int] = Query(None, description="Year to view monthly summary (e.g. 2026)"),
    group_id: Optional[UUID] = Query(None, description="Filter by fund group"),
    search: Optional[str] = Query(None, description="Search member name, code, phone, or group"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=5, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("contributions.view"))
):
    """
    Returns a comprehensive member-wise matrix of contribution fulfillment for all 12 months of a selected year.
    Supports multi-month allocations, custom member pledges, dynamic available years, and pagination.
    """
    target_year = year or date.today().year
    return MonthlyContributionService.get_yearly_monthly_summary(
        db=db,
        year=target_year,
        group_id=group_id,
        search=search,
        page=page,
        page_size=page_size
    )

@router.get("/due", response_model=List[DueContributionOut])
def get_due_contributions(
    month: Optional[str] = Query(None, description="Month in YYYY-MM format (defaults to current month)"),
    group_id: Optional[UUID] = None,
    member_id: Optional[UUID] = None,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("contributions.view"))
):
    """
    Returns monthly dues schedule and collection fulfillment status for members.
    Automatically ensures dues are generated for active members for the requested month.
    """
    target_month = parse_month_string(month)
    today = date.today()

    # Ensure monthly dues exist for all active members in the target month
    MonthlyContributionService.generate_dues_for_month(db=db, target_month=target_month, group_id=group_id)
    db.commit()

    # Query MonthlyContributionDue with Member and Group
    query = db.query(MonthlyContributionDue)\
        .join(Member, Member.id == MonthlyContributionDue.member_id)\
        .join(Group, Group.id == MonthlyContributionDue.group_id)\
        .filter(MonthlyContributionDue.contribution_month == target_month)

    if group_id:
        query = query.filter(MonthlyContributionDue.group_id == group_id)
    if member_id:
        query = query.filter(MonthlyContributionDue.member_id == member_id)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Member.name.ilike(search_pattern)) |
            (Member.member_code.ilike(search_pattern)) |
            (Member.phone.ilike(search_pattern)) |
            (Group.name.ilike(search_pattern))
        )

    dues = query.order_by(Member.name).all()

    # Pre-fetch last contribution payments for members in this list
    m_ids = [d.member_id for d in dues]
    last_contribs = {}
    if m_ids:
        subq = db.query(
            Contribution.member_id,
            func.max(Contribution.contribution_date).label("max_date")
        ).filter(Contribution.member_id.in_(m_ids), Contribution.is_voided == False)\
        .group_by(Contribution.member_id).subquery()

        recent = db.query(Contribution.member_id, Contribution.contribution_date, Contribution.receipt_number)\
            .join(subq, (Contribution.member_id == subq.c.member_id) & (Contribution.contribution_date == subq.c.max_date)).all()
        last_contribs = {r[0]: (r[1], r[2]) for r in recent}

    rules = MonthlyContributionService.get_contribution_rules(db)
    grace_days = rules["grace_period_days"]

    result = []
    for d in dues:
        current_status = MonthlyContributionService.evaluate_due_status(
            expected_amount=d.expected_amount,
            paid_amount=d.paid_amount,
            due_date=d.due_date,
            grace_period_days=grace_days,
            as_of_date=today
        )
        if d.status != current_status:
            d.status = current_status

        if status_filter and status_filter != "ALL" and d.status != status_filter:
            continue

        days_overdue = 0
        if d.status == "OVERDUE":
            days_overdue = max(0, (today - d.due_date).days)

        last_info = last_contribs.get(d.member_id)
        last_date = last_info[0] if last_info else None
        last_rec = last_info[1] if last_info else None

        result.append(DueContributionOut(
            id=d.id,
            member_id=d.member_id,
            member_name=d.member.name if d.member else "Unknown",
            member_code=d.member.member_code if d.member else None,
            group_id=d.group_id,
            group_name=d.group.name if d.group else "Unknown",
            phone=d.member.phone if d.member else None,
            email=d.member.email if d.member else None,
            contribution_month=d.contribution_month,
            due_date=d.due_date,
            expected_amount=d.expected_amount,
            paid_amount=d.paid_amount,
            paid_this_period=d.paid_amount,
            remaining_due=d.remaining_due,
            status=d.status,
            days_overdue=days_overdue,
            last_payment_date=last_date,
            last_receipt_number=last_rec,
            notes=d.notes,
            created_at=d.created_at,
            updated_at=d.updated_at
        ))

    db.commit()
    return result

@router.get("/summary", response_model=MonthlyContributionSummaryOut)
def get_contributions_summary(
    month: Optional[str] = Query(None, description="Target month in YYYY-MM format"),
    group_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("contributions.view"))
):
    """
    Returns monthly dues KPIs: expected, collected, outstanding, collection rate, and status breakdown.
    """
    target_month = parse_month_string(month)
    MonthlyContributionService.generate_dues_for_month(db=db, target_month=target_month, group_id=group_id)
    db.commit()

    query = db.query(MonthlyContributionDue).filter(MonthlyContributionDue.contribution_month == target_month)
    if group_id:
        query = query.filter(MonthlyContributionDue.group_id == group_id)

    dues = query.all()
    rules = MonthlyContributionService.get_contribution_rules(db)
    grace_days = rules["grace_period_days"]
    today = date.today()

    total_expected = Decimal("0.00")
    total_collected = Decimal("0.00")
    total_outstanding = Decimal("0.00")
    paid_count = 0
    partial_count = 0
    due_count = 0
    overdue_count = 0

    for d in dues:
        st = MonthlyContributionService.evaluate_due_status(
            expected_amount=d.expected_amount,
            paid_amount=d.paid_amount,
            due_date=d.due_date,
            grace_period_days=grace_days,
            as_of_date=today
        )
        total_expected += d.expected_amount
        total_collected += d.paid_amount
        total_outstanding += d.remaining_due

        if st == "PAID":
            paid_count += 1
        elif st == "PARTIAL":
            partial_count += 1
        elif st == "OVERDUE":
            overdue_count += 1
        else:
            due_count += 1

    rate = (float(total_collected) / float(total_expected) * 100.0) if total_expected > 0 else 100.0

    return MonthlyContributionSummaryOut(
        month=target_month,
        total_expected_due=total_expected,
        total_collected=total_collected,
        total_outstanding=total_outstanding,
        collection_rate_percent=round(rate, 2),
        total_members_count=len(dues),
        paid_count=paid_count,
        partial_count=partial_count,
        due_count=due_count,
        overdue_count=overdue_count
    )

@router.post("/generate-dues", response_model=GenerateDuesResponse)
def generate_monthly_dues_endpoint(
    req: GenerateDuesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("contributions.create"))
):
    """
    Manually triggers safe, idempotent generation of monthly dues for active members.
    """
    target_month = parse_month_string(req.month)
    dues = MonthlyContributionService.generate_dues_for_month(db=db, target_month=target_month, group_id=req.group_id)
    db.commit()

    out_dues = []
    for d in dues:
        out_dues.append(MonthlyContributionDueOut(
            id=d.id,
            member_id=d.member_id,
            member_name=d.member.name if d.member else "Unknown",
            member_code=d.member.member_code if d.member else None,
            group_id=d.group_id,
            group_name=d.group.name if d.group else "Unknown",
            phone=d.member.phone if d.member else None,
            email=d.member.email if d.member else None,
            contribution_month=d.contribution_month,
            due_date=d.due_date,
            expected_amount=d.expected_amount,
            paid_amount=d.paid_amount,
            remaining_due=d.remaining_due,
            status=d.status,
            days_overdue=0,
            notes=d.notes,
            created_at=d.created_at,
            updated_at=d.updated_at
        ))

    return GenerateDuesResponse(
        month=target_month,
        generated_count=len(dues),
        message=f"Monthly dues safely verified/generated for {len(dues)} active members for month {target_month.strftime('%B %Y')}.",
        dues=out_dues
    )

@router.get("/ledger", response_model=ContributionLedgerOut)
def get_contribution_ledger(
    member_id: Optional[UUID] = None,
    group_id: Optional[UUID] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("contributions.view"))
):
    """
    Returns the complete financial contribution ledger backed by FastAPI financial transactions.
    """
    query = db.query(Contribution).join(Member, Member.id == Contribution.member_id).join(Group, Group.id == Contribution.group_id)

    if member_id:
        query = query.filter(Contribution.member_id == member_id)
    if group_id:
        query = query.filter(Contribution.group_id == group_id)
    if from_date:
        query = query.filter(Contribution.contribution_date >= from_date)
    if to_date:
        query = query.filter(Contribution.contribution_date <= to_date)

    contribs = query.order_by(Contribution.contribution_date.desc(), Contribution.created_at.desc()).all()

    # Pre-fetch financial transactions corresponding to contributions
    c_ids = [c.id for c in contribs]
    txns = db.query(FinancialTransaction).filter(
        FinancialTransaction.source_entity_type.in_(["contributions", "contributions_reversal"]),
        FinancialTransaction.source_entity_id.in_(c_ids)
    ).all() if c_ids else []
    txn_map = {t.source_entity_id: t.transaction_code for t in txns}

    entries = []
    total_active = Decimal("0.00")
    total_voided = Decimal("0.00")

    for c in contribs:
        amt = Decimal(str(c.amount))
        if c.is_voided:
            total_voided += amt
            stat = "VOIDED"
        else:
            total_active += amt
            stat = "ACTIVE"

        entries.append(ContributionLedgerEntryOut(
            id=c.id,
            date=c.contribution_date,
            receipt_number=c.receipt_number,
            member_id=c.member_id,
            member_name=c.member.name if c.member else "Unknown",
            member_code=c.member.member_code if c.member else None,
            group_id=c.group_id,
            group_name=c.group.name if c.group else "Unknown",
            amount=amt,
            payment_method=c.payment_method.value,
            reference_number=c.reference_number,
            contribution_month=c.contribution_month,
            status=stat,
            transaction_code=txn_map.get(c.id, f"TXN-{c.receipt_number}"),
            notes=c.notes if not c.is_voided else f"[VOIDED: {c.void_reason}] {c.notes or ''}",
            created_by_name=c.creator.full_name if c.creator else None,
            created_at=c.created_at
        ))

    return ContributionLedgerOut(
        total_active_amount=total_active,
        total_voided_amount=total_voided,
        total_contributions_count=len(contribs),
        entries=entries
    )

@router.get("/member-schedule/{member_id}", response_model=MemberMonthsScheduleResponse)
def get_member_contribution_schedule(
    member_id: UUID,
    start_year: Optional[int] = Query(None, description="Starting calendar year"),
    end_year: Optional[int] = Query(None, description="Ending calendar year"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("contributions.view"))
):
    """
    Returns the multi-month contribution fulfillment schedule for a member.
    Provides data to populate the custom month selector with already paid and due badges.
    """
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found.")
    
    schedule = MonthlyContributionService.get_member_months_schedule(
        db=db,
        member=member,
        start_year=start_year,
        end_year=end_year
    )
    db.commit()
    return schedule

@router.get("/{contribution_id}", response_model=ContributionOut)
def get_contribution(
    contribution_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("contributions.view"))
):
    c = db.query(Contribution).filter(Contribution.id == contribution_id).first()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contribution receipt not found.")

    out = ContributionOut.model_validate(c)
    out.member_name = c.member.name if c.member else ""
    out.member_code = c.member.member_code if c.member else None
    out.group_name = c.group.name if c.group else ""
    out.created_by_name = c.creator.full_name if c.creator else None
    return out

@router.post("", response_model=ContributionOut, status_code=status.HTTP_201_CREATED)
def create_contribution(
    request: Request,
    contrib_in: ContributionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("contributions.create"))
):
    """
    Records an actual member contribution payment into the member's assigned fund group.
    Supports MULTI-MONTH payment selection in 1 single transaction.
    Creates an immutable CREDIT ledger transaction that increases the Group balance ONCE.
    Updates all covered MonthlyContributionDue records and records individual month allocations.
    """
    member = db.query(Member).filter(Member.id == contrib_in.member_id).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Member not found.")

    # Group is automatically determined from selected Member's current Group
    group_id = member.group_id
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Member's assigned fund Group does not exist.")

    if contrib_in.amount <= Decimal("0.00"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contribution amount must be greater than 0.")

    # Determine covered months list
    if contrib_in.selected_months and len(contrib_in.selected_months) > 0:
        months_list = contrib_in.selected_months
    elif contrib_in.contribution_month:
        months_list = [contrib_in.contribution_month]
    else:
        months_list = [contrib_in.contribution_date]

    try:
        contribution = MonthlyContributionService.record_multi_month_contribution(
            db=db,
            member=member,
            group=group,
            selected_months=months_list,
            amount=contrib_in.amount,
            contribution_date=contrib_in.contribution_date,
            payment_method=contrib_in.payment_method,
            reference_number=contrib_in.reference_number,
            notes=contrib_in.notes,
            user_id=current_user.id
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    AuditService.log(
        db=db,
        action="CREATE",
        entity_name="contributions",
        entity_id=str(contribution.id),
        new_values={
            "receipt_number": contribution.receipt_number,
            "member_name": member.name,
            "group_name": group.name,
            "amount": float(contribution.amount),
            "months_count": contribution.months_count,
            "months_summary": contribution.months_summary,
            "payment_method": contribution.payment_method.value
        },
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )

    db.commit()
    db.refresh(contribution)

    out = ContributionOut.model_validate(contribution)
    out.member_name = member.name
    out.member_code = member.member_code
    out.group_name = group.name
    out.created_by_name = current_user.full_name
    return out

@router.post("/{contribution_id}/void", response_model=ContributionOut)
def void_contribution(
    request: Request,
    contribution_id: UUID,
    void_in: VoidContributionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("contributions.edit"))
):
    """
    Voids/Reverses a contribution atomically.
    Creates a reversing DEBIT ledger entry to deduct the amount from the group balance without erasing history.
    Updates all linked MonthlyContributionDue records.
    """
    contribution = db.query(Contribution).filter(Contribution.id == contribution_id).first()
    if not contribution:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contribution not found.")

    if contribution.is_voided:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This contribution has already been voided.")

    contribution.is_voided = True
    contribution.void_reason = void_in.reason.strip()
    contribution.voided_at = datetime.now(timezone.utc)
    contribution.voided_by = current_user.id

    # Create Reversal Ledger Entry to reduce group balance
    LedgerService.record_contribution_reversal_ledger(
        db=db,
        contribution=contribution,
        reason=void_in.reason.strip(),
        user_id=current_user.id
    )

    # Recalculate all linked due records
    MonthlyContributionService.recalculate_due_on_void(db, contribution)

    AuditService.log(
        db=db,
        action="VOID",
        entity_name="contributions",
        entity_id=str(contribution.id),
        new_values={"void_reason": contribution.void_reason, "amount": float(contribution.amount)},
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )

    db.commit()
    db.refresh(contribution)

    out = ContributionOut.model_validate(contribution)
    out.member_name = contribution.member.name if contribution.member else ""
    out.member_code = contribution.member.member_code if contribution.member else None
    out.group_name = contribution.group.name if contribution.group else ""
    out.created_by_name = current_user.full_name
    return out
