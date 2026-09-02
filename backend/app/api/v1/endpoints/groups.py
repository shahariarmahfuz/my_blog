from typing import List, Optional
from uuid import UUID
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_permission, get_client_ip
from app.models.user import User
from app.models.group import Group, GroupType
from app.models.member import Member
from app.models.beneficiary import Beneficiary
from app.models.contribution import Contribution
from app.models.assistance import AssistanceFundingAllocation, Assistance, AssistanceType
from app.models.repayment import QardHasanRepaymentAllocation
from app.models.ledger import LedgerEntry, FinancialTransaction, EntryType
from app.schemas.group import (
    GroupCreate, GroupUpdate, GroupOut, GroupDetailOut, GroupOpeningBalanceAdjustIn,
    GroupLedgerOut, GroupLedgerEntryOut, GroupFundOut, GroupFundAllocationEntry
)
from app.schemas.member import MemberOut
from app.schemas.contribution import ContributionOut
from app.schemas.ledger import LedgerEntryOut
from app.services.ledger_service import LedgerService
from app.services.audit_service import AuditService
from app.services.id_service import IdService

router = APIRouter()

def resolve_group(db: Session, identifier: str) -> Group:
    """Resolve group by either UUID or human-facing group code (e.g. GRP-001 or EDU-FUND)."""
    clean_id = identifier.strip()
    try:
        uuid_obj = UUID(clean_id)
        g = db.query(Group).filter(Group.id == uuid_obj).first()
        if g:
            return g
    except (ValueError, TypeError, AttributeError):
        pass

    g = db.query(Group).filter(Group.code.ilike(clean_id)).first()
    if g:
        return g

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Group '{identifier}' not found.")

@router.get("/next-code", response_model=dict)
def get_next_group_code(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("groups.view"))
):
    """Generate the next auto-suggested Group Code (e.g. GRP-001)."""
    candidate_code = IdService.generate_group_code(db)
    return {"next_group_code": candidate_code}

@router.get("", response_model=List[GroupOut])
def list_groups(
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("groups.view"))
):
    query = db.query(Group)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter((Group.name.ilike(search_pattern)) | (Group.code.ilike(search_pattern)))
    if is_active is not None:
        query = query.filter(Group.is_active == is_active)
        
    groups = query.order_by(Group.name).all()
    balances = LedgerService.get_all_group_balances(db)
    opening_balances = LedgerService.get_all_group_opening_balances(db)
    
    # Member and Beneficiary counts
    member_counts = dict(
        db.query(Member.group_id, func.count(Member.id))
        .filter(Member.is_active == True)
        .group_by(Member.group_id)
        .all()
    )
    beneficiary_counts = dict(
        db.query(Beneficiary.group_id, func.count(Beneficiary.id))
        .filter(Beneficiary.is_active == True)
        .group_by(Beneficiary.group_id)
        .all()
    )
    
    result = []
    for g in groups:
        out = GroupOut.model_validate(g)
        bal = balances.get(g.id, Decimal("0.00"))
        out.current_balance = bal
        out.available_balance = bal
        out.opening_balance = opening_balances.get(g.id, Decimal("0.00"))
        out.members_count = member_counts.get(g.id, 0)
        out.beneficiaries_count = beneficiary_counts.get(g.id, 0)
        result.append(out)
        
    return result

@router.get("/{group_id}", response_model=GroupDetailOut)
def get_group_details(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("groups.view"))
):
    group = resolve_group(db, group_id)
        
    balance = LedgerService.get_group_balance(db, group.id)
    opening_balance = LedgerService.get_group_opening_balance(db, group.id)
    
    total_contrib = db.query(func.coalesce(func.sum(Contribution.amount), Decimal("0.00")))\
        .filter(Contribution.group_id == group.id).scalar()
        
    total_qh_funded = db.query(func.coalesce(func.sum(AssistanceFundingAllocation.allocated_amount), Decimal("0.00")))\
        .join(Assistance, Assistance.id == AssistanceFundingAllocation.assistance_id)\
        .filter(AssistanceFundingAllocation.group_id == group.id, Assistance.assistance_type == AssistanceType.QARD_HASAN).scalar()
        
    total_qh_repaid = db.query(func.coalesce(func.sum(QardHasanRepaymentAllocation.allocated_amount), Decimal("0.00")))\
        .filter(QardHasanRepaymentAllocation.group_id == group.id).scalar()
        
    total_sd_funded = db.query(func.coalesce(func.sum(AssistanceFundingAllocation.allocated_amount), Decimal("0.00")))\
        .join(Assistance, Assistance.id == AssistanceFundingAllocation.assistance_id)\
        .filter(AssistanceFundingAllocation.group_id == group.id, Assistance.assistance_type == AssistanceType.SADAQAH).scalar()

    members_count = db.query(func.count(Member.id)).filter(Member.group_id == group.id, Member.is_active == True).scalar()
    ben_count = db.query(func.count(Beneficiary.id)).filter(Beneficiary.group_id == group.id, Beneficiary.is_active == True).scalar()

    out = GroupDetailOut.model_validate(group)
    out.current_balance = balance
    out.opening_balance = opening_balance
    out.available_balance = balance
    out.total_contributions = Decimal(str(total_contrib or 0))
    out.total_donations = LedgerService.get_group_total_donations(db, group.id)
    out.total_qard_hasan_funded = Decimal(str(total_qh_funded or 0))
    out.total_qard_hasan_repaid = Decimal(str(total_qh_repaid or 0))
    out.total_sadaqah_funded = Decimal(str(total_sd_funded or 0))
    out.members_count = members_count or 0
    out.beneficiaries_count = ben_count or 0
    
    return out

@router.get("/{group_id}/balance")
def get_group_balance(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("groups.view"))
):
    group = resolve_group(db, group_id)
    balance = LedgerService.get_group_balance(db, group.id)
    return {
        "group_id": group.id,
        "group_name": group.name,
        "group_code": group.code,
        "current_balance": balance,
        "available_balance": balance
    }

@router.get("/{group_id}/ledger", response_model=GroupLedgerOut)
def get_group_ledger(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("groups.view"))
):
    group = resolve_group(db, group_id)
        
    entries = db.query(LedgerEntry)\
        .join(FinancialTransaction, FinancialTransaction.id == LedgerEntry.transaction_id)\
        .filter(LedgerEntry.group_id == group.id)\
        .order_by(FinancialTransaction.transaction_date.asc(), LedgerEntry.created_at.asc())\
        .all()

    running_bal = Decimal("0.00")
    total_credits = Decimal("0.00")
    total_debits = Decimal("0.00")
    ledger_entries = []

    for e in entries:
        amt = Decimal(str(e.amount))
        is_credit = e.entry_type == EntryType.CREDIT
        if is_credit:
            running_bal += amt
            total_credits += amt
        else:
            running_bal -= amt
            total_debits += amt

        txn = e.transaction
        entry_out = GroupLedgerEntryOut(
            id=e.id,
            date=txn.transaction_date if txn else e.created_at.date(),
            transaction_code=txn.transaction_code if txn else "N/A",
            transaction_type=txn.transaction_type.value if txn else "GENERAL",
            entry_type=e.entry_type.value,
            amount=amt,
            reference=txn.source_entity_type if txn else None,
            description=e.notes or (txn.description if txn else None),
            running_balance=running_bal
        )
        ledger_entries.append(entry_out)

    ledger_entries.reverse()

    return GroupLedgerOut(
        group_id=group.id,
        group_name=group.name,
        group_code=group.code,
        current_balance=running_bal,
        total_credits=total_credits,
        total_debits=total_debits,
        entries=ledger_entries
    )

@router.get("/{group_id}/fund", response_model=GroupFundOut)
def get_group_fund(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("groups.view"))
):
    group = resolve_group(db, group_id)

    balance = LedgerService.get_group_balance(db, group.id)

    total_contrib = db.query(func.coalesce(func.sum(Contribution.amount), Decimal("0.00")))\
        .filter(Contribution.group_id == group.id).scalar()

    total_qh_funded = db.query(func.coalesce(func.sum(AssistanceFundingAllocation.allocated_amount), Decimal("0.00")))\
        .join(Assistance, Assistance.id == AssistanceFundingAllocation.assistance_id)\
        .filter(AssistanceFundingAllocation.group_id == group.id, Assistance.assistance_type == AssistanceType.QARD_HASAN).scalar()

    total_qh_repaid = db.query(func.coalesce(func.sum(QardHasanRepaymentAllocation.allocated_amount), Decimal("0.00")))\
        .filter(QardHasanRepaymentAllocation.group_id == group.id).scalar()

    total_sd_funded = db.query(func.coalesce(func.sum(AssistanceFundingAllocation.allocated_amount), Decimal("0.00")))\
        .join(Assistance, Assistance.id == AssistanceFundingAllocation.assistance_id)\
        .filter(AssistanceFundingAllocation.group_id == group.id, Assistance.assistance_type == AssistanceType.SADAQAH).scalar()

    allocations = db.query(AssistanceFundingAllocation)\
        .join(Assistance, Assistance.id == AssistanceFundingAllocation.assistance_id)\
        .filter(AssistanceFundingAllocation.group_id == group.id)\
        .order_by(Assistance.disbursement_date.desc()).all()

    allocation_entries = []
    for a in allocations:
        ast = a.assistance
        ben = ast.beneficiary if ast else None
        alloc_amt = Decimal(str(a.allocated_amount))
        rep_amt = Decimal(str(a.repaid_amount))
        is_qh = ast and ast.assistance_type == AssistanceType.QARD_HASAN
        allocation_entries.append(GroupFundAllocationEntry(
            assistance_id=ast.id if ast else a.assistance_id,
            assistance_code=ast.assistance_code if ast else "N/A",
            assistance_type=ast.assistance_type.value if ast and hasattr(ast.assistance_type, "value") else (str(ast.assistance_type) if ast else "GENERAL"),
            disbursement_date=ast.disbursement_date if ast else a.created_at.date(),
            beneficiary_id=ben.id if ben else (ast.beneficiary_id if ast else a.assistance_id),
            beneficiary_name=ben.name if ben else "Unknown",
            total_assistance_amount=Decimal(str(ast.total_amount)) if ast else alloc_amt,
            amount_funded_by_group=alloc_amt,
            amount_recovered=rep_amt,
            remaining_receivable=max(Decimal("0.00"), alloc_amt - rep_amt) if is_qh else Decimal("0.00"),
            purpose=ast.purpose if ast else None,
            reference_number=None
        ))

    qh_funded_dec = Decimal(str(total_qh_funded or 0))
    qh_repaid_dec = Decimal(str(total_qh_repaid or 0))
    net_qh_outstanding = max(Decimal("0.00"), qh_funded_dec - qh_repaid_dec)

    return GroupFundOut(
        group_id=group.id,
        group_name=group.name,
        group_code=group.code,
        group_type=group.group_type,
        current_balance=balance,
        available_balance=balance,
        total_contributions=Decimal(str(total_contrib or 0)),
        total_donations=LedgerService.get_group_total_donations(db, group.id),
        total_qard_hasan_funded=qh_funded_dec,
        total_qard_hasan_repaid=qh_repaid_dec,
        total_sadaqah_funded=Decimal(str(total_sd_funded or 0)),
        net_qard_hasan_outstanding=net_qh_outstanding,
        allocations=allocation_entries
    )

@router.post("", response_model=GroupOut, status_code=status.HTTP_201_CREATED)
def create_group(
    request: Request,
    group_in: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("groups.create"))
):
    # Only Name is required
    name_clean = group_in.name.strip()
    if not name_clean:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Group Name is required.")

    code_clean = IdService.validate_and_sanitize_code(group_in.code, "Group")
    if code_clean:
        existing_code = db.query(Group).filter(Group.code.ilike(code_clean)).first()
        if existing_code:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Group Code '{code_clean}' already exists.")
    else:
        code_clean = IdService.generate_group_code(db)

    group = Group(
        name=name_clean,
        code=code_clean,
        group_type=group_in.group_type or GroupType.MEMBER_FUND,
        description=group_in.description,
        contact_person=group_in.contact_person,
        phone=group_in.phone,
        email=group_in.email,
        address=group_in.address,
        notes=group_in.notes,
        is_active=group_in.is_active if group_in.is_active is not None else True
    )
    db.add(group)
    db.commit()
    db.refresh(group)

    AuditService.log(
        db=db,
        action="CREATE",
        entity_name="groups",
        entity_id=str(group.id),
        new_values={"name": group.name, "code": group.code},
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )
    db.commit()

    opening_bal = group_in.opening_balance or Decimal("0.00")
    if opening_bal < Decimal("0.00"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Opening balance cannot be negative.")

    if opening_bal > Decimal("0.00"):
        try:
            LedgerService.record_opening_balance_ledger(
                db=db,
                group_id=group.id,
                amount=opening_bal,
                group_name=group.name,
                group_code=group.code,
                opening_date=group_in.opening_balance_date,
                notes=group_in.opening_balance_notes,
                user_id=current_user.id
            )
            AuditService.log(
                db=db,
                action="OPENING_BALANCE_CREATED",
                entity_name="groups",
                entity_id=str(group.id),
                new_values={
                    "opening_balance": str(opening_bal),
                    "opening_date": str(group_in.opening_balance_date or date.today()),
                    "notes": group_in.opening_balance_notes
                },
                user_id=current_user.id,
                ip_address=get_client_ip(request)
            )
            db.commit()
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to record opening balance: {str(e)}")

    out = GroupOut.model_validate(group)
    bal = LedgerService.get_group_balance(db, group.id)
    out.current_balance = bal
    out.available_balance = bal
    out.opening_balance = LedgerService.get_group_opening_balance(db, group.id)
    out.opening_balance_date = group_in.opening_balance_date
    return out

@router.post("/{group_id}/adjust-opening-balance", response_model=GroupDetailOut)
@router.post("/{group_id}/opening-balance/adjust", response_model=GroupDetailOut)
def adjust_group_opening_balance(
    request: Request,
    group_id: str,
    adjust_in: GroupOpeningBalanceAdjustIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("groups.edit"))
):
    group = resolve_group(db, group_id)
    
    if adjust_in.new_opening_balance < Decimal("0.00"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Opening balance cannot be negative.")

    try:
        old_opb = LedgerService.get_group_opening_balance(db, group.id)
        LedgerService.record_opening_balance_adjustment_ledger(
            db=db,
            group_id=group.id,
            new_opening_balance=adjust_in.new_opening_balance,
            reason=adjust_in.reason,
            group_name=group.name,
            group_code=group.code,
            effective_date=adjust_in.effective_date,
            user_id=current_user.id
        )
        AuditService.log(
            db=db,
            action="OPENING_BALANCE_ADJUSTED",
            entity_name="groups",
            entity_id=str(group.id),
            old_values={"opening_balance": str(old_opb)},
            new_values={
                "opening_balance": str(adjust_in.new_opening_balance),
                "reason": adjust_in.reason,
                "effective_date": str(adjust_in.effective_date or date.today())
            },
            user_id=current_user.id,
            ip_address=get_client_ip(request)
        )
        db.commit()
    except ValueError as ve:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to adjust opening balance: {str(e)}")

    return get_group_details(group_id=str(group.id), db=db, current_user=current_user)

@router.patch("/{group_id}", response_model=GroupOut)
def update_group(
    request: Request,
    group_id: str,
    group_in: GroupUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("groups.edit"))
):
    group = resolve_group(db, group_id)

    old_data = {"name": group.name, "code": group.code, "is_active": group.is_active}

    if group_in.name is not None:
        name_clean = group_in.name.strip()
        if not name_clean:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Group Name cannot be empty.")
        group.name = name_clean

    if group_in.code is not None:
        code_clean = IdService.validate_and_sanitize_code(group_in.code, "Group")
        if code_clean and code_clean != group.code:
            existing = db.query(Group).filter(Group.code.ilike(code_clean), Group.id != group.id).first()
            if existing:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Group Code '{code_clean}' already exists.")
            group.code = code_clean

    if group_in.group_type is not None and group_in.group_type != group.group_type:
        if group_in.group_type == GroupType.EXTERNAL_FUND:
            members_cnt = db.query(Member).filter(Member.group_id == group.id).count()
            if members_cnt > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot convert group to External Fund Group: {members_cnt} members are currently assigned to this group. Reassign or remove members first."
                )
        group.group_type = group_in.group_type

    if group_in.description is not None:
        group.description = group_in.description
    if group_in.contact_person is not None:
        group.contact_person = group_in.contact_person
    if group_in.phone is not None:
        group.phone = group_in.phone
    if group_in.email is not None:
        group.email = group_in.email
    if group_in.address is not None:
        group.address = group_in.address
    if group_in.notes is not None:
        group.notes = group_in.notes
    if group_in.is_active is not None:
        group.is_active = group_in.is_active

    db.commit()
    db.refresh(group)

    AuditService.log(
        db=db,
        action="UPDATE",
        entity_name="groups",
        entity_id=str(group.id),
        old_values=old_data,
        new_values={"name": group.name, "code": group.code, "is_active": group.is_active},
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )
    db.commit()

    out = GroupOut.model_validate(group)
    bal = LedgerService.get_group_balance(db, group.id)
    out.current_balance = bal
    out.available_balance = bal
    return out

@router.delete("/{group_id}")
def delete_group(
    request: Request,
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("groups.delete"))
):
    group = resolve_group(db, group_id)

    # Invariants checks
    member_count = db.query(func.count(Member.id)).filter(Member.group_id == group.id).scalar()
    if member_count and member_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete group with {member_count} associated member(s). Please deactivate instead or reassign members."
        )

    ben_count = db.query(func.count(Beneficiary.id)).filter(Beneficiary.group_id == group.id).scalar()
    if ben_count and ben_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete group with {ben_count} associated beneficiary/beneficiaries. Please deactivate instead."
        )

    balance = LedgerService.get_group_balance(db, group.id)
    if balance > Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete group with a non-zero balance (৳{balance}). Please close out fund or transfer funds first."
        )

    AuditService.log(
        db=db,
        action="DELETE",
        entity_name="groups",
        entity_id=str(group.id),
        old_values={"name": group.name, "code": group.code},
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )
    db.delete(group)
    db.commit()
    return {"message": f"Group '{group.name}' deleted successfully."}
