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
from app.models.repayment import QardHasanRepayment, QardHasanRepaymentAllocation
from app.models.assistance import Assistance, AssistanceType
from app.models.group import Group
from app.schemas.repayment import RepaymentCreate, RepaymentOut, RepaymentPreviewOut, RepaymentAllocationItemOut
from app.services.repayment_service import RepaymentService
from app.services.audit_service import AuditService

router = APIRouter()

@router.get("", response_model=List[RepaymentOut])
def list_repayments(
    skip: int = 0,
    limit: int = 50,
    assistance_id: Optional[UUID] = None,
    group_id: Optional[UUID] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("repayments.view"))
):
    query = db.query(QardHasanRepayment).join(Assistance, Assistance.id == QardHasanRepayment.assistance_id)

    if assistance_id:
        query = query.filter(QardHasanRepayment.assistance_id == assistance_id)
    if group_id:
        query = query.join(QardHasanRepaymentAllocation, QardHasanRepaymentAllocation.repayment_id == QardHasanRepayment.id)\
            .filter(QardHasanRepaymentAllocation.group_id == group_id)
    if from_date:
        query = query.filter(QardHasanRepayment.payment_date >= from_date)
    if to_date:
        query = query.filter(QardHasanRepayment.payment_date <= to_date)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (QardHasanRepayment.repayment_code.ilike(search_pattern)) |
            (QardHasanRepayment.reference_number.ilike(search_pattern)) |
            (Assistance.assistance_code.ilike(search_pattern))
        )

    records = query.order_by(QardHasanRepayment.payment_date.desc(), QardHasanRepayment.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for r in records:
        out = RepaymentOut.model_validate(r)
        out.assistance_code = r.assistance.assistance_code if r.assistance else ""
        out.beneficiary_name = r.assistance.beneficiary.name if r.assistance and r.assistance.beneficiary else ""
        out.received_by_name = r.receiver.full_name if r.receiver else None
        
        alloc_list = []
        for alloc in r.allocations:
            alloc_list.append(RepaymentAllocationItemOut(
                id=alloc.id,
                group_id=alloc.group_id,
                group_name=alloc.group.name if alloc.group else "",
                allocated_amount=alloc.allocated_amount
            ))
        out.allocations = alloc_list
        result.append(out)

    return result

@router.get("/preview")
def preview_repayment_distribution(
    assistance_id: UUID,
    amount: Decimal,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("repayments.view"))
):
    assistance = db.query(Assistance).filter(Assistance.id == assistance_id).first()
    if not assistance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assistance record not found.")

    if assistance.assistance_type != AssistanceType.QARD_HASAN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Repayments only apply to Qard Hasan loans.")

    allocs = RepaymentService.calculate_proportional_allocations(assistance, amount)
    
    total_funded = sum(fa.allocated_amount for fa in assistance.funding_allocations)
    total_repaid = sum(fa.repaid_amount for fa in assistance.funding_allocations)
    current_outstanding = total_funded - total_repaid
    new_outstanding = current_outstanding - amount

    return RepaymentPreviewOut(
        assistance_id=assistance_id,
        repayment_amount=amount,
        current_outstanding=current_outstanding,
        new_outstanding=new_outstanding,
        allocations=[
            RepaymentAllocationItemOut(
                group_id=a["group_id"],
                group_name=a["group_name"],
                allocated_amount=a["allocated_amount"],
                proportion_ratio=a["proportion_ratio"]
            )
            for a in allocs
        ]
    )

@router.post("", response_model=RepaymentOut, status_code=status.HTTP_201_CREATED)
def create_repayment(
    request: Request,
    rep_in: RepaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("repayments.create"))
):
    repayment = RepaymentService.process_repayment(
        db=db,
        assistance_id=rep_in.assistance_id,
        amount=rep_in.amount,
        payment_date=rep_in.payment_date,
        payment_method=rep_in.payment_method,
        reference_number=rep_in.reference_number,
        notes=rep_in.notes,
        user_id=current_user.id
    )

    AuditService.log(
        db=db,
        action="REPAY",
        entity_name="qard_hasan_repayments",
        entity_id=str(repayment.id),
        new_values={
            "repayment_code": repayment.repayment_code,
            "assistance_code": repayment.assistance.assistance_code if repayment.assistance else "",
            "amount": float(repayment.amount),
            "payment_method": repayment.payment_method.value
        },
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )

    db.commit()
    db.refresh(repayment)

    out = RepaymentOut.model_validate(repayment)
    out.assistance_code = repayment.assistance.assistance_code if repayment.assistance else ""
    out.beneficiary_name = repayment.assistance.beneficiary.name if repayment.assistance and repayment.assistance.beneficiary else ""
    out.received_by_name = current_user.full_name
    
    alloc_list = []
    for alloc in repayment.allocations:
        alloc_list.append(RepaymentAllocationItemOut(
            id=alloc.id,
            group_id=alloc.group_id,
            group_name=alloc.group.name if alloc.group else "",
            allocated_amount=alloc.allocated_amount
        ))
    out.allocations = alloc_list
    return out
