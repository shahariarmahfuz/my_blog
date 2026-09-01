from typing import List, Optional
from uuid import UUID
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_permission, get_client_ip
from app.models.user import User
from app.models.assistance import Assistance, AssistanceFundingAllocation, InstallmentSchedule, AssistanceType, AssistanceStatus, InstallmentStatus
from app.models.repayment import QardHasanRepayment, QardHasanRepaymentAllocation
from app.models.beneficiary import Beneficiary
from app.models.group import Group
from app.models.ledger import FinancialTransaction
from app.schemas.assistance import (
    AssistanceCreate, AssistanceUpdate, AssistanceOut, FundingAllocationOut, InstallmentScheduleOut,
    QardHasanLedgerOut, QardHasanLedgerItemOut, QHLedgerGroupBreakdown,
    SadaqahLedgerOut, SadaqahLedgerItemOut, SadaqahLedgerGroupBreakdown
)
from app.services.ledger_service import LedgerService
from app.services.audit_service import AuditService

router = APIRouter()

@router.get("/qard-hasan/ledger", response_model=QardHasanLedgerOut)
def get_qard_hasan_ledger(
    beneficiary_id: Optional[UUID] = None,
    group_id: Optional[UUID] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("assistance.view"))
):
    """
    Returns complete chronological Qard Hasan loan and repayment ledger backed by financial transactions.
    """
    qh_query = db.query(Assistance).join(Beneficiary, Beneficiary.id == Assistance.beneficiary_id)\
        .filter(Assistance.assistance_type == AssistanceType.QARD_HASAN)

    if beneficiary_id:
        qh_query = qh_query.filter(Assistance.beneficiary_id == beneficiary_id)
    if group_id:
        qh_query = qh_query.join(AssistanceFundingAllocation, AssistanceFundingAllocation.assistance_id == Assistance.id)\
            .filter(AssistanceFundingAllocation.group_id == group_id)
    if from_date:
        qh_query = qh_query.filter(Assistance.disbursement_date >= from_date)
    if to_date:
        qh_query = qh_query.filter(Assistance.disbursement_date <= to_date)

    qh_records = qh_query.order_by(Assistance.disbursement_date.asc(), Assistance.created_at.asc()).all()

    # Pre-fetch financial transactions for assistance
    qh_ids = [q.id for q in qh_records]
    txns = db.query(FinancialTransaction).filter(
        FinancialTransaction.source_entity_type == "assistance",
        FinancialTransaction.source_entity_id.in_(qh_ids)
    ).all() if qh_ids else []
    txn_map = {t.source_entity_id: t.transaction_code for t in txns}

    # Query all repayments for these Qard Hasan loans
    rep_query = db.query(QardHasanRepayment).join(Assistance, Assistance.id == QardHasanRepayment.assistance_id)\
        .filter(QardHasanRepayment.assistance_id.in_(qh_ids)) if qh_ids else []
    if from_date:
        rep_query = rep_query.filter(QardHasanRepayment.payment_date >= from_date)
    if to_date:
        rep_query = rep_query.filter(QardHasanRepayment.payment_date <= to_date)
    
    rep_records = rep_query.order_by(QardHasanRepayment.payment_date.asc(), QardHasanRepayment.created_at.asc()).all() if qh_ids else []

    # Map repayment transactions
    rep_ids = [r.id for r in rep_records]
    rep_txns = db.query(FinancialTransaction).filter(
        FinancialTransaction.source_entity_type == "qard_hasan_repayments",
        FinancialTransaction.source_entity_id.in_(rep_ids)
    ).all() if rep_ids else []
    rep_txn_map = {t.source_entity_id: t.transaction_code for t in rep_txns}

    # Build chronological event list
    raw_events = []
    total_disbursed = Decimal("0.00")
    total_repaid = Decimal("0.00")

    for qh in qh_records:
        total_disbursed += Decimal(str(qh.total_amount))
        groups_breakdown = [
            QHLedgerGroupBreakdown(
                group_id=fa.group_id,
                group_name=fa.group.name if fa.group else "Group",
                allocated_amount=Decimal(str(fa.allocated_amount)),
                repaid_amount=Decimal(str(fa.repaid_amount)),
                remaining_receivable=max(Decimal("0.00"), Decimal(str(fa.allocated_amount)) - Decimal(str(fa.repaid_amount)))
            )
            for fa in qh.funding_allocations
        ]

        raw_events.append({
            "date": qh.disbursement_date,
            "created_at": qh.created_at,
            "item": QardHasanLedgerItemOut(
                id=qh.id,
                date=qh.disbursement_date,
                entry_type="DISBURSEMENT",
                code=qh.assistance_code,
                assistance_code=qh.assistance_code,
                beneficiary_id=qh.beneficiary_id,
                beneficiary_name=qh.beneficiary.name if qh.beneficiary else "Unknown",
                amount=Decimal(str(qh.total_amount)),
                funding_groups=groups_breakdown,
                payment_method="BANK_TRANSFER",
                reference_number=None,
                transaction_code=txn_map.get(qh.id, f"TXN-{qh.assistance_code}"),
                purpose=qh.purpose,
                status=qh.status.value,
                created_at=qh.created_at
            )
        })

    for rep in rep_records:
        total_repaid += Decimal(str(rep.amount))
        rep_groups_breakdown = [
            QHLedgerGroupBreakdown(
                group_id=ra.group_id,
                group_name=ra.group.name if ra.group else "Group",
                allocated_amount=Decimal(str(ra.allocated_amount)),
                repaid_amount=Decimal(str(ra.allocated_amount)),
                remaining_receivable=Decimal("0.00")
            )
            for ra in rep.allocations
        ]

        raw_events.append({
            "date": rep.payment_date,
            "created_at": rep.created_at,
            "item": QardHasanLedgerItemOut(
                id=rep.id,
                date=rep.payment_date,
                entry_type="REPAYMENT",
                code=rep.repayment_code,
                assistance_code=rep.assistance.assistance_code if rep.assistance else None,
                beneficiary_id=rep.assistance.beneficiary_id if rep.assistance else rep.id,
                beneficiary_name=rep.assistance.beneficiary.name if rep.assistance and rep.assistance.beneficiary else "Unknown",
                amount=Decimal(str(rep.amount)),
                funding_groups=rep_groups_breakdown,
                payment_method=rep.payment_method.value,
                reference_number=rep.reference_number,
                transaction_code=rep_txn_map.get(rep.id, f"TXN-{rep.repayment_code}"),
                purpose=rep.notes or "Qard Hasan Repayment",
                status="PAID",
                created_at=rep.created_at
            )
        })

    # Sort events chronologically to calculate progressive running outstanding loan balance
    raw_events.sort(key=lambda x: (x["date"], x["created_at"]))
    running_bal = Decimal("0.00")
    for ev in raw_events:
        if ev["item"].entry_type == "DISBURSEMENT":
            running_bal += ev["item"].amount
        else:
            running_bal = max(Decimal("0.00"), running_bal - ev["item"].amount)
        ev["item"].running_outstanding = running_bal

    # Return reverse-chronological (newest first)
    raw_events.reverse()
    entries = [ev["item"] for ev in raw_events]
    net_outstanding = max(Decimal("0.00"), total_disbursed - total_repaid)

    return QardHasanLedgerOut(
        total_disbursed=total_disbursed,
        total_repaid=total_repaid,
        net_outstanding=net_outstanding,
        total_loans_count=len(qh_records),
        entries=entries
    )

@router.get("/sadaqah/ledger", response_model=SadaqahLedgerOut)
def get_sadaqah_ledger(
    beneficiary_id: Optional[UUID] = None,
    group_id: Optional[UUID] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("assistance.view"))
):
    """
    Returns complete non-recoverable Sadaqah distributions financial ledger.
    """
    query = db.query(Assistance).join(Beneficiary, Beneficiary.id == Assistance.beneficiary_id)\
        .filter(Assistance.assistance_type == AssistanceType.SADAQAH)

    if beneficiary_id:
        query = query.filter(Assistance.beneficiary_id == beneficiary_id)
    if group_id:
        query = query.join(AssistanceFundingAllocation, AssistanceFundingAllocation.assistance_id == Assistance.id)\
            .filter(AssistanceFundingAllocation.group_id == group_id)
    if from_date:
        query = query.filter(Assistance.disbursement_date >= from_date)
    if to_date:
        query = query.filter(Assistance.disbursement_date <= to_date)

    records = query.order_by(Assistance.disbursement_date.desc(), Assistance.created_at.desc()).all()

    # Pre-fetch financial transactions
    sd_ids = [s.id for s in records]
    txns = db.query(FinancialTransaction).filter(
        FinancialTransaction.source_entity_type == "assistance",
        FinancialTransaction.source_entity_id.in_(sd_ids)
    ).all() if sd_ids else []
    txn_map = {t.source_entity_id: t.transaction_code for t in txns}

    entries = []
    total_distributed = Decimal("0.00")
    unique_beneficiaries = set()

    for s in records:
        total_distributed += Decimal(str(s.total_amount))
        unique_beneficiaries.add(s.beneficiary_id)
        
        group_breakdown = [
            SadaqahLedgerGroupBreakdown(
                group_id=fa.group_id,
                group_name=fa.group.name if fa.group else "Group",
                allocated_amount=Decimal(str(fa.allocated_amount))
            )
            for fa in s.funding_allocations
        ]

        entries.append(SadaqahLedgerItemOut(
            id=s.id,
            date=s.disbursement_date,
            assistance_code=s.assistance_code,
            beneficiary_id=s.beneficiary_id,
            beneficiary_name=s.beneficiary.name if s.beneficiary else "Unknown",
            total_amount=Decimal(str(s.total_amount)),
            funding_groups=group_breakdown,
            purpose=s.purpose,
            notes=s.notes,
            transaction_code=txn_map.get(s.id, f"TXN-{s.assistance_code}"),
            status="NON_RECOVERABLE_GRANT",
            created_by_name=s.creator.full_name if s.creator else "System",
            created_at=s.created_at
        ))

    return SadaqahLedgerOut(
        total_sadaqah_distributed=total_distributed,
        total_beneficiaries_assisted=len(unique_beneficiaries),
        total_grants_count=len(records),
        entries=entries
    )

@router.get("", response_model=List[AssistanceOut])
def list_assistance(
    skip: int = 0,
    limit: int = 100,
    assistance_type: Optional[AssistanceType] = None,
    status_filter: Optional[AssistanceStatus] = None,
    beneficiary_id: Optional[UUID] = None,
    group_id: Optional[UUID] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("assistance.view"))
):
    query = db.query(Assistance).join(Beneficiary, Beneficiary.id == Assistance.beneficiary_id)

    if assistance_type:
        query = query.filter(Assistance.assistance_type == assistance_type)
    if status_filter:
        query = query.filter(Assistance.status == status_filter)
    if beneficiary_id:
        query = query.filter(Assistance.beneficiary_id == beneficiary_id)
    if group_id:
        query = query.join(AssistanceFundingAllocation, AssistanceFundingAllocation.assistance_id == Assistance.id)\
            .filter(AssistanceFundingAllocation.group_id == group_id)
    if from_date:
        query = query.filter(Assistance.disbursement_date >= from_date)
    if to_date:
        query = query.filter(Assistance.disbursement_date <= to_date)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Assistance.assistance_code.ilike(search_pattern)) |
            (Assistance.purpose.ilike(search_pattern)) |
            (Beneficiary.name.ilike(search_pattern))
        )

    records = query.order_by(Assistance.disbursement_date.desc(), Assistance.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for a in records:
        out = AssistanceOut.model_validate(a)
        out.beneficiary_name = a.beneficiary.name if a.beneficiary else ""
        out.beneficiary_group_name = a.beneficiary.group.name if a.beneficiary and a.beneficiary.group else ""
        out.created_by_name = a.creator.full_name if a.creator else None
        out.approved_by_name = a.approver.full_name if a.approver else None

        for alloc_out, alloc_model in zip(out.funding_allocations, a.funding_allocations):
            alloc_out.group_name = alloc_model.group.name if alloc_model.group else ""
            alloc_out.remaining_receivable = alloc_model.allocated_amount - alloc_model.repaid_amount

        total_repaid = sum(fa.repaid_amount for fa in a.funding_allocations)
        out.total_repaid = Decimal(str(total_repaid))
        out.outstanding_amount = max(Decimal("0.00"), a.total_amount - total_repaid) if a.assistance_type == AssistanceType.QARD_HASAN else Decimal("0.00")
        result.append(out)

    return result

@router.get("/{assistance_id}", response_model=AssistanceOut)
def get_assistance_details(
    assistance_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("assistance.view"))
):
    a = db.query(Assistance).filter(Assistance.id == assistance_id).first()
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assistance record not found.")

    out = AssistanceOut.model_validate(a)
    out.beneficiary_name = a.beneficiary.name if a.beneficiary else ""
    out.beneficiary_group_name = a.beneficiary.group.name if a.beneficiary and a.beneficiary.group else ""
    out.created_by_name = a.creator.full_name if a.creator else None
    out.approved_by_name = a.approver.full_name if a.approver else None

    for alloc_out, alloc_model in zip(out.funding_allocations, a.funding_allocations):
        alloc_out.group_name = alloc_model.group.name if alloc_model.group else ""
        alloc_out.remaining_receivable = alloc_model.allocated_amount - alloc_model.repaid_amount

    total_repaid = sum(fa.repaid_amount for fa in a.funding_allocations)
    out.total_repaid = Decimal(str(total_repaid))
    out.outstanding_amount = max(Decimal("0.00"), a.total_amount - total_repaid) if a.assistance_type == AssistanceType.QARD_HASAN else Decimal("0.00")
    return out

@router.post("", response_model=AssistanceOut, status_code=status.HTTP_201_CREATED)
def create_assistance(
    request: Request,
    ast_in: AssistanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("assistance.create"))
):
    # 1. Verify beneficiary
    ben = db.query(Beneficiary).filter(Beneficiary.id == ast_in.beneficiary_id).first()
    if not ben:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Beneficiary not found.")

    # 2. Validate total allocation equals assistance amount
    alloc_sum = sum(alloc.allocated_amount for alloc in ast_in.funding_allocations)
    if alloc_sum != ast_in.total_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sum of funding allocations ({alloc_sum}) must exactly equal assistance total ({ast_in.total_amount})."
        )

    # 3. Check group balances and lock rows for update
    group_ids = [alloc.group_id for alloc in ast_in.funding_allocations]
    if len(group_ids) != len(set(group_ids)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Duplicate funding groups in allocation list.")

    locked_groups = db.query(Group).filter(Group.id.in_(group_ids)).with_for_update().all()
    if len(locked_groups) != len(group_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more specified funding groups do not exist.")

    group_map = {g.id: g for g in locked_groups}

    for alloc in ast_in.funding_allocations:
        current_bal = LedgerService.get_group_balance(db, alloc.group_id)
        if current_bal < alloc.allocated_amount:
            g_name = group_map[alloc.group_id].name
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient funds in Group '{g_name}'. Available: {current_bal}, Requested: {alloc.allocated_amount}."
            )

    # 4. Generate assistance code
    prefix = "QH" if ast_in.assistance_type == AssistanceType.QARD_HASAN else "SD"
    year = ast_in.disbursement_date.year
    count = db.query(Assistance).filter(Assistance.assistance_type == ast_in.assistance_type).count() + 1
    code = f"{prefix}-{year}-{count:04d}"

    # 5. Create Assistance record
    assistance = Assistance(
        assistance_code=code,
        assistance_type=ast_in.assistance_type,
        beneficiary_id=ast_in.beneficiary_id,
        total_amount=ast_in.total_amount,
        disbursement_date=ast_in.disbursement_date,
        status=AssistanceStatus.ACTIVE,
        purpose=ast_in.purpose,
        notes=ast_in.notes,
        created_by=current_user.id,
        approved_by=current_user.id
    )
    db.add(assistance)
    db.flush()

    # 6. Create Funding Allocations
    for alloc in ast_in.funding_allocations:
        ratio = (alloc.allocated_amount / ast_in.total_amount).quantize(Decimal("0.000001"))
        fa = AssistanceFundingAllocation(
            assistance_id=assistance.id,
            group_id=alloc.group_id,
            allocated_amount=alloc.allocated_amount,
            proportion_ratio=ratio,
            repaid_amount=Decimal("0.00")
        )
        db.add(fa)
    db.flush()

    # 7. If Qard Hasan, create Installment Schedule
    if ast_in.assistance_type == AssistanceType.QARD_HASAN:
        num_inst = ast_in.installments_count or 1
        inst_amount = (ast_in.total_amount / Decimal(num_inst)).quantize(Decimal("0.01"))
        first_date = ast_in.first_installment_date or (ast_in.disbursement_date + relativedelta(months=1))
        interval_months = ast_in.installment_interval_months or 1
        
        inst_sum = Decimal("0.00")
        for i in range(1, num_inst + 1):
            due = first_date + relativedelta(months=(i - 1) * interval_months)
            amt = inst_amount if i < num_inst else (ast_in.total_amount - inst_sum)
            inst_sum += amt
            
            schedule = InstallmentSchedule(
                assistance_id=assistance.id,
                installment_number=i,
                due_date=due,
                amount=amt,
                paid_amount=Decimal("0.00"),
                status=InstallmentStatus.PENDING
            )
            db.add(schedule)
        db.flush()

    # 8. Record in Financial Ledger
    LedgerService.record_assistance_disbursement_ledger(db, assistance, user_id=current_user.id)

    # 9. Audit Log
    AuditService.log(
        db=db,
        action="DISBURSE",
        entity_name="assistance",
        entity_id=str(assistance.id),
        new_values={
            "assistance_code": assistance.assistance_code,
            "type": assistance.assistance_type.value,
            "beneficiary_name": ben.name,
            "amount": float(assistance.total_amount),
            "funding_groups_count": len(ast_in.funding_allocations)
        },
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )

    db.commit()
    db.refresh(assistance)

    # Prepare response
    out = AssistanceOut.model_validate(assistance)
    out.beneficiary_name = ben.name
    out.beneficiary_group_name = ben.group.name if ben.group else ""
    out.created_by_name = current_user.full_name
    out.approved_by_name = current_user.full_name
    
    for alloc_out, alloc_model in zip(out.funding_allocations, assistance.funding_allocations):
        alloc_out.group_name = alloc_model.group.name if alloc_model.group else ""
        alloc_out.remaining_receivable = alloc_model.allocated_amount - alloc_model.repaid_amount
        
    out.total_repaid = Decimal("0.00")
    out.outstanding_amount = assistance.total_amount if assistance.assistance_type == AssistanceType.QARD_HASAN else Decimal("0.00")
    return out
