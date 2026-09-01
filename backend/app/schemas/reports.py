from typing import List, Optional
from uuid import UUID
from datetime import date
from decimal import Decimal
from pydantic import BaseModel

class FinancialReportRow(BaseModel):
    category: str
    item_name: str
    count: int
    amount: Decimal

class FinancialReportOverview(BaseModel):
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    total_contributions: Decimal
    total_qard_hasan_disbursed: Decimal
    total_qard_hasan_repaid: Decimal
    total_sadaqah_disbursed: Decimal
    net_funds_flow: Decimal
    breakdown: List[FinancialReportRow] = []

class GroupReportRow(BaseModel):
    group_id: UUID
    group_name: str
    group_code: Optional[str] = None
    members_count: int
    beneficiaries_count: int
    contributions: Decimal
    qard_hasan_funded: Decimal
    qard_hasan_repaid: Decimal
    sadaqah_funded: Decimal
    current_balance: Decimal

class MemberReportRow(BaseModel):
    member_id: UUID
    name: str
    member_code: Optional[str] = None
    group_name: str
    phone: Optional[str] = None
    join_date: Optional[date] = None
    contributions_count: int
    total_contributed: Decimal
    last_contribution_date: Optional[date] = None

class BeneficiaryReportRow(BaseModel):
    beneficiary_id: UUID
    name: str
    beneficiary_code: Optional[str] = None
    group_name: str
    phone: Optional[str] = None
    total_qard_hasan: Decimal
    total_repaid: Decimal
    outstanding_qard_hasan: Decimal
    total_sadaqah: Decimal
    total_assistance: Decimal

class MonthlyDuesReportRow(BaseModel):
    month: date
    expected_amount: Decimal
    collected_amount: Decimal
    outstanding_amount: Decimal
    collection_rate: float
    total_members: int
    paid_members: int
    partial_members: int
    due_members: int
    overdue_members: int

class MonthlyDuesReportOverview(BaseModel):
    total_expected: Decimal
    total_collected: Decimal
    total_outstanding: Decimal
    overall_collection_rate: float
    monthly_rows: List[MonthlyDuesReportRow] = []
