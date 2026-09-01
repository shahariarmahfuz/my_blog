from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field
from app.models.repayment import PaymentMethod

class ContributionBase(BaseModel):
    member_id: UUID = Field(..., description="Member ID (Required)")
    amount: Decimal = Field(..., gt=0, description="Contribution Amount (Required, must be > 0)")
    group_id: Optional[UUID] = Field(None, description="Group ID (Automatically derived from Member)")
    contribution_date: date = Field(default_factory=date.today)
    contribution_month: Optional[date] = Field(None, description="Primary month this payment applies to (First of month: YYYY-MM-01)")
    selected_months: Optional[List[date]] = Field(None, description="List of month start dates (YYYY-MM-01) covered by this payment")
    due_id: Optional[UUID] = Field(None, description="Linked Monthly Due ID (Optional)")
    payment_method: PaymentMethod = PaymentMethod.CASH
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class ContributionCreate(ContributionBase):
    pass

class ContributionUpdate(BaseModel):
    notes: Optional[str] = None
    reference_number: Optional[str] = None

class VoidContributionRequest(BaseModel):
    reason: str = Field(..., min_length=3, description="Reason for voiding/reversing this contribution")

class MonthlyAllocationOut(BaseModel):
    id: UUID
    contribution_id: UUID
    due_id: UUID
    contribution_month: date
    allocated_amount: Decimal

    model_config = ConfigDict(from_attributes=True)

class ContributionOut(ContributionBase):
    id: UUID
    receipt_number: str
    group_id: UUID
    member_name: Optional[str] = None
    member_code: Optional[str] = None
    group_name: Optional[str] = None
    months_count: int = 1
    months_summary: Optional[str] = None
    months_covered: Optional[List[Any]] = None
    allocations: Optional[List[MonthlyAllocationOut]] = None
    is_voided: bool = False
    void_reason: Optional[str] = None
    voided_at: Optional[datetime] = None
    created_by: Optional[UUID] = None
    created_by_name: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Monthly Contribution Due Schemas
class MonthlyContributionDueOut(BaseModel):
    id: UUID
    member_id: UUID
    member_name: str
    member_code: Optional[str] = None
    group_id: UUID
    group_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    contribution_month: date
    due_date: date
    expected_amount: Decimal
    paid_amount: Decimal
    paid_this_period: Optional[Decimal] = Decimal("0.00")
    remaining_due: Decimal
    status: str  # PAID, PARTIAL, DUE, OVERDUE
    days_overdue: int = 0
    last_payment_date: Optional[date] = None
    last_receipt_number: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# Backward-compatible alias for Due views
class DueContributionOut(MonthlyContributionDueOut):
    pass

class MonthScheduleItemOut(BaseModel):
    month: date
    month_str: str  # YYYY-MM
    month_label: str  # e.g. "January 2026"
    short_label: str  # e.g. "Jan 2026"
    year: int
    month_num: int
    expected_amount: Decimal
    paid_amount: Decimal
    remaining_due: Decimal
    status: str  # PAID, PARTIAL, DUE, OVERDUE
    is_paid: bool
    is_overdue: bool
    is_current: bool
    is_future: bool
    is_advance_paid: bool
    due_date: date

class MemberMonthsScheduleResponse(BaseModel):
    member_id: UUID
    member_name: str
    monthly_pledge: Decimal
    current_month: str
    unpaid_months_count: int
    unpaid_total_due: Decimal
    months: List[MonthScheduleItemOut]

class GenerateDuesRequest(BaseModel):
    month: Optional[str] = Field(None, description="Target month in YYYY-MM or YYYY-MM-DD format (defaults to current month)")
    group_id: Optional[UUID] = Field(None, description="Optional filter for specific group")

class GenerateDuesResponse(BaseModel):
    month: date
    generated_count: int
    message: str
    dues: List[MonthlyContributionDueOut]

class MonthlyContributionSummaryOut(BaseModel):
    month: date
    total_expected_due: Decimal
    total_collected: Decimal
    total_outstanding: Decimal
    collection_rate_percent: float
    total_members_count: int
    paid_count: int
    partial_count: int
    due_count: int
    overdue_count: int

# Contribution Ledger Schemas
class ContributionLedgerEntryOut(BaseModel):
    id: UUID
    date: date
    receipt_number: str
    member_id: UUID
    member_name: str
    member_code: Optional[str] = None
    group_id: UUID
    group_name: str
    amount: Decimal
    payment_method: str
    reference_number: Optional[str] = None
    contribution_month: Optional[date] = None
    months_count: int = 1
    months_summary: Optional[str] = None
    status: str
    transaction_code: str
    notes: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ContributionLedgerOut(BaseModel):
    total_active_amount: Decimal
    total_voided_amount: Decimal
    total_contributions_count: int
    entries: List[ContributionLedgerEntryOut]

# Yearly Monthly Summary Schemas
class MonthStatusOut(BaseModel):
    month_index: int
    month_name: str
    month_date: date
    status: str  # PAID, DUE, OVERDUE, FUTURE
    expected_amount: Decimal
    paid_amount: Decimal
    receipt_numbers: List[str] = []

class MemberMonthlySummaryRow(BaseModel):
    member_id: UUID
    member_code: Optional[str] = None
    name: str
    phone: Optional[str] = None
    group_id: UUID
    group_name: str
    monthly_expected_amount: Decimal
    total_year_paid: Decimal
    total_year_expected: Decimal
    months: List[MonthStatusOut]

class YearlyMonthlySummaryResponse(BaseModel):
    year: int
    available_years: List[int]
    total_members: int
    page: int
    page_size: int
    total_pages: int
    items: List[MemberMonthlySummaryRow]

