from typing import List
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_permission
from app.models.user import User
from app.models.group import Group
from app.models.member import Member
from app.models.beneficiary import Beneficiary
from app.models.contribution import Contribution
from app.models.assistance import Assistance, AssistanceFundingAllocation, InstallmentSchedule, AssistanceType, AssistanceStatus, InstallmentStatus
from app.models.repayment import QardHasanRepayment, QardHasanRepaymentAllocation
from app.models.ledger import FinancialTransaction, LedgerEntry
from app.models.member_application import MemberApplication
from app.schemas.dashboard import DashboardMetrics, GroupBalanceSummary, OverdueInstallmentSummary
from app.schemas.ledger import FinancialTransactionOut, LedgerEntryOut
from app.schemas.assistance import AssistanceOut
from app.services.ledger_service import LedgerService

router = APIRouter()

@router.get("", response_model=DashboardMetrics)
def get_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("dashboard.view"))
):
    total_groups = db.query(func.count(Group.id)).filter(Group.is_active == True).scalar() or 0
    total_members = db.query(func.count(Member.id)).filter(Member.is_active == True).scalar() or 0
    total_beneficiaries = db.query(func.count(Beneficiary.id)).filter(Beneficiary.is_active == True).scalar() or 0
    pending_apps = db.query(func.count(MemberApplication.id)).filter(MemberApplication.status.in_(["PENDING", "UNDER_REVIEW"])).scalar() or 0

    total_contributions = db.query(func.coalesce(func.sum(Contribution.amount), Decimal("0.00"))).scalar()
    
    total_qh_disbursed = db.query(func.coalesce(func.sum(Assistance.total_amount), Decimal("0.00")))\
        .filter(Assistance.assistance_type == AssistanceType.QARD_HASAN, Assistance.status != AssistanceStatus.CANCELLED).scalar()

    total_qh_repaid = db.query(func.coalesce(func.sum(QardHasanRepayment.amount), Decimal("0.00"))).scalar()
    
    outstanding_qh = max(Decimal("0.00"), Decimal(str(total_qh_disbursed)) - Decimal(str(total_qh_repaid)))

    total_sd_disbursed = db.query(func.coalesce(func.sum(Assistance.total_amount), Decimal("0.00")))\
        .filter(Assistance.assistance_type == AssistanceType.SADAQAH, Assistance.status != AssistanceStatus.CANCELLED).scalar()

    # All group balances
    balances_map = LedgerService.get_all_group_balances(db)
    all_groups = db.query(Group).filter(Group.is_active == True).order_by(Group.name).all()

    # Group stats
    group_contribs = dict(db.query(Contribution.group_id, func.coalesce(func.sum(Contribution.amount), Decimal("0.00"))).group_by(Contribution.group_id).all())
    group_qh_disb = dict(
        db.query(AssistanceFundingAllocation.group_id, func.coalesce(func.sum(AssistanceFundingAllocation.allocated_amount), Decimal("0.00")))\
        .join(Assistance, Assistance.id == AssistanceFundingAllocation.assistance_id)\
        .filter(Assistance.assistance_type == AssistanceType.QARD_HASAN)\
        .group_by(AssistanceFundingAllocation.group_id).all()
    )
    group_sd_disb = dict(
        db.query(AssistanceFundingAllocation.group_id, func.coalesce(func.sum(AssistanceFundingAllocation.allocated_amount), Decimal("0.00")))\
        .join(Assistance, Assistance.id == AssistanceFundingAllocation.assistance_id)\
        .filter(Assistance.assistance_type == AssistanceType.SADAQAH)\
        .group_by(AssistanceFundingAllocation.group_id).all()
    )
    group_rep_rec = dict(
        db.query(QardHasanRepaymentAllocation.group_id, func.coalesce(func.sum(QardHasanRepaymentAllocation.allocated_amount), Decimal("0.00")))\
        .group_by(QardHasanRepaymentAllocation.group_id).all()
    )

    group_summaries = []
    total_avail = Decimal("0.00")
    for g in all_groups:
        bal = balances_map.get(g.id, Decimal("0.00"))
        total_avail += bal
        qh_d = group_qh_disb.get(g.id, Decimal("0.00"))
        sd_d = group_sd_disb.get(g.id, Decimal("0.00"))
        group_summaries.append(GroupBalanceSummary(
            id=g.id,
            name=g.name,
            code=g.code,
            balance=bal,
            total_contributions=Decimal(str(group_contribs.get(g.id, Decimal("0.00")))),
            total_disbursed=Decimal(str(qh_d + sd_d)),
            total_repayments=Decimal(str(group_rep_rec.get(g.id, Decimal("0.00"))))
        ))

    # Recent transactions
    recent_txns_models = db.query(FinancialTransaction).order_by(FinancialTransaction.created_at.desc()).limit(10).all()
    recent_txns = []
    for txn in recent_txns_models:
        txn_out = FinancialTransactionOut.model_validate(txn)
        txn_out.created_by_name = txn.creator.full_name if txn.creator else None
        txn_out.ledger_entries = [
            LedgerEntryOut(
                id=le.id,
                transaction_id=le.transaction_id,
                group_id=le.group_id,
                group_name=le.group.name if le.group else "",
                entry_type=le.entry_type,
                amount=le.amount,
                balance_after=le.balance_after,
                notes=le.notes,
                created_at=le.created_at
            )
            for le in txn.ledger_entries
        ]
        recent_txns.append(txn_out)

    # Recent assistance
    recent_ast_models = db.query(Assistance).order_by(Assistance.created_at.desc()).limit(10).all()
    recent_ast = []
    for a in recent_ast_models:
        a_out = AssistanceOut.model_validate(a)
        a_out.beneficiary_name = a.beneficiary.name if a.beneficiary else ""
        a_out.beneficiary_group_name = a.beneficiary.group.name if a.beneficiary and a.beneficiary.group else ""
        a_out.created_by_name = a.creator.full_name if a.creator else None
        a_out.approved_by_name = a.approver.full_name if a.approver else None
        
        for alloc_out, alloc_model in zip(a_out.funding_allocations, a.funding_allocations):
            alloc_out.group_name = alloc_model.group.name if alloc_model.group else ""
            alloc_out.remaining_receivable = alloc_model.allocated_amount - alloc_model.repaid_amount
            
        total_repaid = sum(fa.repaid_amount for fa in a.funding_allocations)
        a_out.total_repaid = Decimal(str(total_repaid))
        a_out.outstanding_amount = max(Decimal("0.00"), a.total_amount - total_repaid) if a.assistance_type == AssistanceType.QARD_HASAN else Decimal("0.00")
        recent_ast.append(a_out)

    # Overdue installments
    today = date.today()
    overdue_models = db.query(InstallmentSchedule)\
        .join(Assistance, Assistance.id == InstallmentSchedule.assistance_id)\
        .join(Beneficiary, Beneficiary.id == Assistance.beneficiary_id)\
        .filter(
            InstallmentSchedule.due_date < today,
            InstallmentSchedule.paid_amount < InstallmentSchedule.amount,
            Assistance.status.in_([AssistanceStatus.ACTIVE, AssistanceStatus.APPROVED])
        ).order_by(InstallmentSchedule.due_date.asc()).limit(20).all()

    overdue_list = []
    for inst in overdue_models:
        days = (today - inst.due_date).days
        overdue_list.append(OverdueInstallmentSummary(
            id=inst.id,
            assistance_id=inst.assistance_id,
            assistance_code=inst.assistance.assistance_code if inst.assistance else "",
            beneficiary_name=inst.assistance.beneficiary.name if inst.assistance and inst.assistance.beneficiary else "",
            installment_number=inst.installment_number,
            due_date=inst.due_date,
            amount=inst.amount,
            paid_amount=inst.paid_amount,
            outstanding=inst.amount - inst.paid_amount,
            days_overdue=days
        ))

    return DashboardMetrics(
        total_groups=total_groups,
        total_members=total_members,
        total_beneficiaries=total_beneficiaries,
        total_contributions=Decimal(str(total_contributions)),
        total_qard_hasan_disbursed=Decimal(str(total_qh_disbursed)),
        total_qard_hasan_repaid=Decimal(str(total_qh_repaid)),
        outstanding_qard_hasan=outstanding_qh,
        total_sadaqah_disbursed=Decimal(str(total_sd_disbursed)),
        total_available_funds=total_avail,
        pending_member_applications=pending_apps,
        group_balances=group_summaries,
        recent_transactions=recent_txns,
        recent_assistance=recent_ast,
        overdue_installments=overdue_list
    )
