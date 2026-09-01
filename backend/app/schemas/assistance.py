from typing import Optional, List
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.models.assistance import AssistanceType, AssistanceStatus, InstallmentStatus

class FundingAllocationInput(BaseModel):
    group_id: UUID = Field(..., description="Funding Group ID")
    allocated_amount: Decimal = Field(..., gt=0, description="Amount allocated from this group")

class FundingAllocationOut(BaseModel):
    id: UUID
    group_id: UUID
    group_name: Optional[str] = None
    allocated_amount: Decimal
    proportion_ratio: Decimal
    repaid_amount: Decimal
    remaining_receivable: Optional[Decimal] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class InstallmentScheduleOut(BaseModel):
    id: UUID
    installment_number: int
    due_date: date
    amount: Decimal
    paid_amount: Decimal
    status: InstallmentStatus
    paid_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class AssistanceCreate(BaseModel):
    assistance_type: AssistanceType = Field(..., description="QARD_HASAN or SADAQAH")
    beneficiary_id: UUID = Field(..., description="Beneficiary ID")
    total_amount: Decimal = Field(..., gt=0, description="Total assistance amount")
    disbursement_date: date = Field(default_factory=date.today)
    purpose: Optional[str] = None
    notes: Optional[str] = None
    
    # Multiple group funding
    funding_allocations: List[FundingAllocationInput] = Field(..., min_length=1, description="One or more group allocations")
    
    # Qard Hasan specific installment options
    installments_count: Optional[int] = Field(default=1, ge=1, description="Number of installments for Qard Hasan")
    installment_interval_months: Optional[int] = Field(default=1, ge=1, description="Interval in months between installments")
    first_installment_date: Optional[date] = None

    @model_validator(mode="after")
    def validate_allocation_sum(self):
        allocations_total = sum(alloc.allocated_amount for alloc in self.funding_allocations)
        if allocations_total != self.total_amount:
            raise ValueError(f"Sum of funding allocations ({allocations_total}) must exactly equal total assistance amount ({self.total_amount})")
        return self

class AssistanceUpdate(BaseModel):
    purpose: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[AssistanceStatus] = None

class AssistanceOut(BaseModel):
    id: UUID
    assistance_code: str
    assistance_type: AssistanceType
    beneficiary_id: UUID
    beneficiary_name: Optional[str] = None
    beneficiary_group_name: Optional[str] = None
    total_amount: Decimal
    disbursement_date: date
    status: AssistanceStatus
    purpose: Optional[str] = None
    notes: Optional[str] = None
    created_by: Optional[UUID] = None
    created_by_name: Optional[str] = None
    approved_by: Optional[UUID] = None
    approved_by_name: Optional[str] = None
    
    funding_allocations: List[FundingAllocationOut] = []
    installments: List[InstallmentScheduleOut] = []
    
    total_repaid: Decimal = Decimal("0.00")
    outstanding_amount: Decimal = Decimal("0.00")
    
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Qard Hasan Ledger Schemas
class QHLedgerGroupBreakdown(BaseModel):
    group_id: UUID
    group_name: str
    allocated_amount: Decimal
    repaid_amount: Decimal
    remaining_receivable: Decimal

class QardHasanLedgerItemOut(BaseModel):
    id: UUID
    date: date
    entry_type: str  # DISBURSEMENT or REPAYMENT
    code: str  # QH-2026-0001 or REP-2026-0001
    assistance_code: Optional[str] = None
    beneficiary_id: UUID
    beneficiary_name: str
    amount: Decimal
    running_outstanding: Optional[Decimal] = None
    funding_groups: List[QHLedgerGroupBreakdown] = []
    payment_method: Optional[str] = None
    reference_number: Optional[str] = None
    transaction_code: Optional[str] = None
    purpose: Optional[str] = None
    status: str
    created_at: datetime

class QardHasanLedgerOut(BaseModel):
    total_disbursed: Decimal
    total_repaid: Decimal
    net_outstanding: Decimal
    total_loans_count: int
    entries: List[QardHasanLedgerItemOut]

# Sadaqah Ledger Schemas
class SadaqahLedgerGroupBreakdown(BaseModel):
    group_id: UUID
    group_name: str
    allocated_amount: Decimal

class SadaqahLedgerItemOut(BaseModel):
    id: UUID
    date: date
    assistance_code: str
    beneficiary_id: UUID
    beneficiary_name: str
    total_amount: Decimal
    funding_groups: List[SadaqahLedgerGroupBreakdown] = []
    purpose: Optional[str] = None
    notes: Optional[str] = None
    transaction_code: Optional[str] = None
    status: str
    created_by_name: Optional[str] = None
    created_at: datetime

class SadaqahLedgerOut(BaseModel):
    total_sadaqah_distributed: Decimal
    total_beneficiaries_assisted: int
    total_grants_count: int
    entries: List[SadaqahLedgerItemOut]
