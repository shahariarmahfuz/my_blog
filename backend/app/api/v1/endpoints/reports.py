import io
import csv
from typing import List, Optional
from uuid import UUID
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_permission
from app.models.user import User
from app.models.group import Group
from app.models.member import Member
from app.models.beneficiary import Beneficiary
from app.models.contribution import Contribution, MonthlyContributionDue
from app.models.assistance import Assistance, AssistanceFundingAllocation, AssistanceType, AssistanceStatus
from app.models.repayment import QardHasanRepayment, QardHasanRepaymentAllocation
from app.schemas.reports import (
    FinancialReportOverview, FinancialReportRow, GroupReportRow,
    MemberReportRow, BeneficiaryReportRow, MonthlyDuesReportOverview, MonthlyDuesReportRow
)
from app.services.ledger_service import LedgerService
from app.services.monthly_contribution_service import MonthlyContributionService

router = APIRouter()

@router.get("/dues", response_model=MonthlyDuesReportOverview)
def get_monthly_dues_report(
    group_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("reports.view"))
):
    query = db.query(MonthlyContributionDue)
    if group_id:
        query = query.filter(MonthlyContributionDue.group_id == group_id)

    dues = query.order_by(MonthlyContributionDue.contribution_month.desc()).all()

    # Group dues by contribution_month
    month_map = {}
    for d in dues:
        m = d.contribution_month
        if m not in month_map:
            month_map[m] = {
                "month": m,
                "expected": Decimal("0.00"),
                "collected": Decimal("0.00"),
                "outstanding": Decimal("0.00"),
                "total_members": 0,
                "paid": 0,
                "partial": 0,
                "due": 0,
                "overdue": 0
            }
        data = month_map[m]
        data["expected"] += d.expected_amount
        data["collected"] += d.paid_amount
        data["outstanding"] += d.remaining_due
        data["total_members"] += 1
        if d.status == "PAID":
            data["paid"] += 1
        elif d.status == "PARTIAL":
            data["partial"] += 1
        elif d.status == "OVERDUE":
            data["overdue"] += 1
        else:
            data["due"] += 1

    monthly_rows = []
    tot_exp = Decimal("0.00")
    tot_col = Decimal("0.00")
    tot_out = Decimal("0.00")

    for m in sorted(month_map.keys(), reverse=True):
        d = month_map[m]
        rate = (float(d["collected"]) / float(d["expected"]) * 100.0) if d["expected"] > 0 else 100.0
        tot_exp += d["expected"]
        tot_col += d["collected"]
        tot_out += d["outstanding"]
        monthly_rows.append(MonthlyDuesReportRow(
            month=d["month"],
            expected_amount=d["expected"],
            collected_amount=d["collected"],
            outstanding_amount=d["outstanding"],
            collection_rate=round(rate, 2),
            total_members=d["total_members"],
            paid_members=d["paid"],
            partial_members=d["partial"],
            due_members=d["due"],
            overdue_members=d["overdue"]
        ))

    overall_rate = (float(tot_col) / float(tot_exp) * 100.0) if tot_exp > 0 else 100.0

    return MonthlyDuesReportOverview(
        total_expected=tot_exp,
        total_collected=tot_col,
        total_outstanding=tot_out,
        overall_collection_rate=round(overall_rate, 2),
        monthly_rows=monthly_rows
    )


@router.get("/financial", response_model=FinancialReportOverview)
def get_financial_report(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("reports.view"))
):
    contrib_q = db.query(func.coalesce(func.sum(Contribution.amount), Decimal("0.00")))
    qh_q = db.query(func.coalesce(func.sum(Assistance.total_amount), Decimal("0.00"))).filter(Assistance.assistance_type == AssistanceType.QARD_HASAN)
    rep_q = db.query(func.coalesce(func.sum(QardHasanRepayment.amount), Decimal("0.00")))
    sd_q = db.query(func.coalesce(func.sum(Assistance.total_amount), Decimal("0.00"))).filter(Assistance.assistance_type == AssistanceType.SADAQAH)

    if from_date:
        contrib_q = contrib_q.filter(Contribution.contribution_date >= from_date)
        qh_q = qh_q.filter(Assistance.disbursement_date >= from_date)
        rep_q = rep_q.filter(QardHasanRepayment.payment_date >= from_date)
        sd_q = sd_q.filter(Assistance.disbursement_date >= from_date)
    if to_date:
        contrib_q = contrib_q.filter(Contribution.contribution_date <= to_date)
        qh_q = qh_q.filter(Assistance.disbursement_date <= to_date)
        rep_q = rep_q.filter(QardHasanRepayment.payment_date <= to_date)
        sd_q = sd_q.filter(Assistance.disbursement_date <= to_date)

    total_contrib = Decimal(str(contrib_q.scalar()))
    total_qh = Decimal(str(qh_q.scalar()))
    total_rep = Decimal(str(rep_q.scalar()))
    total_sd = Decimal(str(sd_q.scalar()))
    net_flow = total_contrib + total_rep - total_qh - total_sd

    breakdown = [
        FinancialReportRow(category="Inflow", item_name="Member Contributions", count=contrib_q.count() if hasattr(contrib_q, 'count') else 0, amount=total_contrib),
        FinancialReportRow(category="Inflow", item_name="Qard Hasan Repayments Received", count=0, amount=total_rep),
        FinancialReportRow(category="Outflow", item_name="Qard Hasan Loans Disbursed", count=0, amount=total_qh),
        FinancialReportRow(category="Outflow", item_name="Sadaqah Grants Disbursed", count=0, amount=total_sd),
    ]

    return FinancialReportOverview(
        from_date=from_date,
        to_date=to_date,
        total_contributions=total_contrib,
        total_qard_hasan_disbursed=total_qh,
        total_qard_hasan_repaid=total_rep,
        total_sadaqah_disbursed=total_sd,
        net_funds_flow=net_flow,
        breakdown=breakdown
    )

@router.get("/groups", response_model=List[GroupReportRow])
def get_group_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("reports.view"))
):
    groups = db.query(Group).order_by(Group.name).all()
    balances = LedgerService.get_all_group_balances(db)

    member_counts = dict(db.query(Member.group_id, func.count(Member.id)).filter(Member.is_active == True).group_by(Member.group_id).all())
    ben_counts = dict(db.query(Beneficiary.group_id, func.count(Beneficiary.id)).filter(Beneficiary.is_active == True).group_by(Beneficiary.group_id).all())
    contribs = dict(db.query(Contribution.group_id, func.coalesce(func.sum(Contribution.amount), Decimal("0.00"))).group_by(Contribution.group_id).all())
    
    qh_funded = dict(
        db.query(AssistanceFundingAllocation.group_id, func.coalesce(func.sum(AssistanceFundingAllocation.allocated_amount), Decimal("0.00")))\
        .join(Assistance, Assistance.id == AssistanceFundingAllocation.assistance_id)\
        .filter(Assistance.assistance_type == AssistanceType.QARD_HASAN)\
        .group_by(AssistanceFundingAllocation.group_id).all()
    )
    qh_repaid = dict(
        db.query(QardHasanRepaymentAllocation.group_id, func.coalesce(func.sum(QardHasanRepaymentAllocation.allocated_amount), Decimal("0.00")))\
        .group_by(QardHasanRepaymentAllocation.group_id).all()
    )
    sd_funded = dict(
        db.query(AssistanceFundingAllocation.group_id, func.coalesce(func.sum(AssistanceFundingAllocation.allocated_amount), Decimal("0.00")))\
        .join(Assistance, Assistance.id == AssistanceFundingAllocation.assistance_id)\
        .filter(Assistance.assistance_type == AssistanceType.SADAQAH)\
        .group_by(AssistanceFundingAllocation.group_id).all()
    )

    result = []
    for g in groups:
        result.append(GroupReportRow(
            group_id=g.id,
            group_name=g.name,
            group_code=g.code,
            members_count=member_counts.get(g.id, 0),
            beneficiaries_count=ben_counts.get(g.id, 0),
            contributions=Decimal(str(contribs.get(g.id, Decimal("0.00")))),
            qard_hasan_funded=Decimal(str(qh_funded.get(g.id, Decimal("0.00")))),
            qard_hasan_repaid=Decimal(str(qh_repaid.get(g.id, Decimal("0.00")))),
            sadaqah_funded=Decimal(str(sd_funded.get(g.id, Decimal("0.00")))),
            current_balance=balances.get(g.id, Decimal("0.00"))
        ))
    return result

@router.get("/members", response_model=List[MemberReportRow])
def get_member_report(
    group_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("reports.view"))
):
    query = db.query(Member).join(Group, Group.id == Member.group_id)
    if group_id:
        query = query.filter(Member.group_id == group_id)
    members = query.order_by(Member.name).all()

    stats_rows = db.query(
        Contribution.member_id,
        func.coalesce(func.sum(Contribution.amount), Decimal("0.00")),
        func.count(Contribution.id),
        func.max(Contribution.contribution_date)
    ).group_by(Contribution.member_id).all()
    stats = {row[0]: (row[1], row[2], row[3]) for row in stats_rows}

    result = []
    for m in members:
        stat = stats.get(m.id)
        result.append(MemberReportRow(
            member_id=m.id,
            name=m.name,
            member_code=m.member_code,
            group_name=m.group.name if m.group else "",
            phone=m.phone,
            join_date=m.join_date,
            contributions_count=stat[1] if stat else 0,
            total_contributed=Decimal(str(stat[0])) if stat else Decimal("0.00"),
            last_contribution_date=stat[2] if stat else None
        ))
    return result

@router.get("/beneficiaries", response_model=List[BeneficiaryReportRow])
def get_beneficiary_report(
    group_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("reports.view"))
):
    query = db.query(Beneficiary).join(Group, Group.id == Beneficiary.group_id)
    if group_id:
        query = query.filter(Beneficiary.group_id == group_id)
    bens = query.order_by(Beneficiary.name).all()

    qh_rows = db.query(
        Assistance.beneficiary_id,
        func.coalesce(func.sum(Assistance.total_amount), Decimal("0.00")),
        func.coalesce(func.sum(AssistanceFundingAllocation.repaid_amount), Decimal("0.00"))
    ).join(AssistanceFundingAllocation, AssistanceFundingAllocation.assistance_id == Assistance.id)\
    .filter(Assistance.assistance_type == AssistanceType.QARD_HASAN)\
    .group_by(Assistance.beneficiary_id).all()
    qh_stats = {row[0]: (row[1], row[2]) for row in qh_rows}

    sd_rows = db.query(
        Assistance.beneficiary_id,
        func.coalesce(func.sum(Assistance.total_amount), Decimal("0.00"))
    ).filter(Assistance.assistance_type == AssistanceType.SADAQAH)\
    .group_by(Assistance.beneficiary_id).all()
    sd_stats = {row[0]: row[1] for row in sd_rows}

    result = []
    for b in bens:
        qh = qh_stats.get(b.id, (Decimal("0.00"), Decimal("0.00")))
        sd = sd_stats.get(b.id, Decimal("0.00"))
        qh_rec = Decimal(str(qh[0]))
        qh_rep = Decimal(str(qh[1]))
        out_qh = max(Decimal("0.00"), qh_rec - qh_rep)
        sd_rec = Decimal(str(sd))

        result.append(BeneficiaryReportRow(
            beneficiary_id=b.id,
            name=b.name,
            beneficiary_code=b.beneficiary_code,
            group_name=b.group.name if b.group else "",
            phone=b.phone,
            total_qard_hasan=qh_rec,
            total_repaid=qh_rep,
            outstanding_qard_hasan=out_qh,
            total_sadaqah=sd_rec,
            total_assistance=qh_rec + sd_rec
        ))
    return result

@router.get("/export")
def export_report_csv(
    report_type: str = Query(..., regex="^(groups|members|beneficiaries|financial)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("reports.export"))
):
    output = io.StringIO()
    writer = csv.writer(output)

    if report_type == "groups":
        writer.writerow(["Group Name", "Code", "Active Members", "Beneficiaries", "Total Contributions", "QH Funded", "QH Repaid", "Sadaqah Funded", "Current Balance"])
        rows = get_group_report(db, current_user)
        for r in rows:
            writer.writerow([r.group_name, r.group_code or "", r.members_count, r.beneficiaries_count, r.contributions, r.qard_hasan_funded, r.qard_hasan_repaid, r.sadaqah_funded, r.current_balance])
    elif report_type == "members":
        writer.writerow(["Member Name", "Code", "Group", "Phone", "Join Date", "Total Contributed", "Contributions Count", "Last Contribution Date"])
        rows = get_member_report(None, db, current_user)
        for r in rows:
            writer.writerow([r.name, r.member_code or "", r.group_name, r.phone or "", r.join_date or "", r.total_contributed, r.contributions_count, r.last_contribution_date or ""])
    elif report_type == "beneficiaries":
        writer.writerow(["Beneficiary Name", "Code", "Group", "Phone", "Total Qard Hasan", "Total Repaid", "Outstanding Qard Hasan", "Total Sadaqah", "Total Assistance"])
        rows = get_beneficiary_report(None, db, current_user)
        for r in rows:
            writer.writerow([r.name, r.beneficiary_code or "", r.group_name, r.phone or "", r.total_qard_hasan, r.total_repaid, r.outstanding_qard_hasan, r.total_sadaqah, r.total_assistance])
    elif report_type == "financial":
        writer.writerow(["Category", "Item", "Amount"])
        fin = get_financial_report(None, None, db, current_user)
        writer.writerow(["Summary", "Total Contributions", fin.total_contributions])
        writer.writerow(["Summary", "Total Qard Hasan Disbursed", fin.total_qard_hasan_disbursed])
        writer.writerow(["Summary", "Total Qard Hasan Repaid", fin.total_qard_hasan_repaid])
        writer.writerow(["Summary", "Total Sadaqah Disbursed", fin.total_sadaqah_disbursed])
        writer.writerow(["Summary", "Net Funds Flow", fin.net_funds_flow])

    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=foundation_{report_type}_report.csv"}
    )
