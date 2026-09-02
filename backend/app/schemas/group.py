from typing import Optional, List
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field

from app.models.group import GroupType

class GroupBase(BaseModel):
    # Only Name is required
    name: str = Field(..., min_length=1, description="Group Name (Required)")
    group_type: Optional[GroupType] = Field(GroupType.MEMBER_FUND, description="Group Type (MEMBER_FUND or EXTERNAL_FUND)")
    
    # Optional metadata
    code: Optional[str] = None
    description: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = True

class GroupCreate(GroupBase):
    opening_balance: Optional[Decimal] = Decimal("0.00")
    opening_balance_date: Optional[date] = None
    opening_balance_notes: Optional[str] = None

class GroupOpeningBalanceAdjustIn(BaseModel):
    new_opening_balance: Decimal = Field(..., ge=0, description="New target opening balance (>= 0)")
    reason: str = Field(..., min_length=3, description="Audit reason for opening balance correction")
    effective_date: Optional[date] = None

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    group_type: Optional[GroupType] = None
    code: Optional[str] = None
    description: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class GroupOut(GroupBase):
    id: UUID
    group_type: GroupType = GroupType.MEMBER_FUND
    opening_balance: Optional[Decimal] = Decimal("0.00")
    opening_balance_date: Optional[date] = None
    current_balance: Optional[Decimal] = Decimal("0.00")
    available_balance: Optional[Decimal] = Decimal("0.00")
    members_count: Optional[int] = 0
    beneficiaries_count: Optional[int] = 0
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class GroupDetailOut(GroupOut):
    total_contributions: Decimal = Decimal("0.00")
    total_donations: Decimal = Decimal("0.00")
    total_qard_hasan_funded: Decimal = Decimal("0.00")
    total_qard_hasan_repaid: Decimal = Decimal("0.00")
    total_sadaqah_funded: Decimal = Decimal("0.00")
    total_adjustments: Decimal = Decimal("0.00")
    available_balance: Decimal = Decimal("0.00")

# Group Ledger Schemas
class GroupLedgerEntryOut(BaseModel):
    id: UUID
    date: date
    transaction_code: str
    transaction_type: str
    entry_type: str  # CREDIT or DEBIT
    amount: Decimal
    reference: Optional[str] = None
    description: Optional[str] = None
    running_balance: Decimal

class GroupLedgerOut(BaseModel):
    group_id: UUID
    group_name: str
    group_code: Optional[str] = None
    current_balance: Decimal
    total_credits: Decimal
    total_debits: Decimal
    entries: List[GroupLedgerEntryOut]

# Group Fund Utilization Schemas
class GroupFundAllocationEntry(BaseModel):
    assistance_id: UUID
    assistance_code: str
    assistance_type: str  # QARD_HASAN or SADAQAH
    disbursement_date: date
    beneficiary_id: UUID
    beneficiary_name: str
    total_assistance_amount: Decimal
    amount_funded_by_group: Decimal
    amount_recovered: Decimal
    remaining_receivable: Decimal
    purpose: Optional[str] = None
    reference_number: Optional[str] = None

class GroupFundOut(BaseModel):
    group_id: UUID
    group_name: str
    group_code: Optional[str] = None
    group_type: GroupType = GroupType.MEMBER_FUND
    current_balance: Decimal
    available_balance: Decimal
    total_contributions: Decimal
    total_donations: Decimal = Decimal("0.00")
    total_qard_hasan_funded: Decimal
    total_qard_hasan_repaid: Decimal
    total_sadaqah_funded: Decimal
    net_qard_hasan_outstanding: Decimal
    allocations: List[GroupFundAllocationEntry]
