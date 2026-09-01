from typing import Optional, List
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.contribution import MonthlyContributionDueOut

class MemberBase(BaseModel):
    # Only Name and Group are required
    name: str = Field(..., min_length=1, description="Member Full Name (Required)")
    group_id: UUID = Field(..., description="Group ID (Required)")
    
    # Basic Information (Optional)
    member_code: Optional[str] = None
    join_date: Optional[date] = None
    monthly_contribution_amount: Optional[Decimal] = Field(None, ge=0, description="Monthly Contribution Amount (Optional, defaults to global default)")
    is_active: Optional[bool] = True

    # 1. Personal Information (Optional)
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    national_id: Optional[str] = None
    occupation: Optional[str] = None
    education: Optional[str] = None
    blood_group: Optional[str] = None
    marital_status: Optional[str] = None
    phone: Optional[str] = None
    alternative_phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    present_address: Optional[str] = None
    permanent_address: Optional[str] = None

    # 2. Emergency Contact (Optional)
    emergency_contact: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

    # 3. Reference (Optional)
    reference_name: Optional[str] = None
    reference_relation: Optional[str] = None
    reference_phone: Optional[str] = None

    # 4. Commitment (Optional)
    commitment_accepted: Optional[bool] = False

    # 5. Documents (Optional)
    photo_url: Optional[str] = None
    signature_url: Optional[str] = None
    document_type: Optional[str] = None
    document_url: Optional[str] = None

    # 6. Additional Information (Optional)
    reason_for_joining: Optional[str] = None
    notes: Optional[str] = None

class MemberCreate(MemberBase):
    pass

class MemberUpdate(BaseModel):
    name: Optional[str] = None
    group_id: Optional[UUID] = None
    member_code: Optional[str] = None
    join_date: Optional[date] = None
    monthly_contribution_amount: Optional[Decimal] = None
    is_active: Optional[bool] = None

    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    national_id: Optional[str] = None
    occupation: Optional[str] = None
    education: Optional[str] = None
    blood_group: Optional[str] = None
    marital_status: Optional[str] = None
    phone: Optional[str] = None
    alternative_phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    present_address: Optional[str] = None
    permanent_address: Optional[str] = None

    emergency_contact: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

    reference_name: Optional[str] = None
    reference_relation: Optional[str] = None
    reference_phone: Optional[str] = None

    commitment_accepted: Optional[bool] = None

    photo_url: Optional[str] = None
    signature_url: Optional[str] = None
    document_type: Optional[str] = None
    document_url: Optional[str] = None

    reason_for_joining: Optional[str] = None
    notes: Optional[str] = None

class MemberMonthlyContributionUpdateIn(BaseModel):
    monthly_contribution_amount: Decimal = Field(..., ge=0, description="New target monthly contribution amount (৳)")
    effective_from: Optional[date] = Field(None, description="Optional effective date/month for the new amount")
    reason: Optional[str] = Field(None, description="Reason for updating member contribution")

class MemberOut(MemberBase):
    id: UUID
    group_name: Optional[str] = None
    effective_monthly_contribution: Optional[Decimal] = None
    total_contributions: Optional[Decimal] = Decimal("0.00")
    contributions_count: Optional[int] = 0
    last_contribution_date: Optional[date] = None
    application_id: Optional[UUID] = None
    application_code: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class MemberLedgerEntry(BaseModel):
    id: UUID
    date: date
    transaction_type: str = "CONTRIBUTION"
    group_name: str
    amount: Decimal
    payment_method: Optional[str] = None
    receipt_number: Optional[str] = None
    reference_number: Optional[str] = None
    contribution_month: Optional[date] = None
    months_count: int = 1
    months_summary: Optional[str] = None
    notes: Optional[str] = None
    running_total: Decimal

class MemberLedgerOut(BaseModel):
    member_id: UUID
    member_name: str
    member_code: Optional[str] = None
    group_id: UUID
    group_name: str
    is_active: bool
    monthly_contribution_amount: Optional[Decimal] = None
    effective_monthly_contribution: Decimal = Decimal("500.00")
    total_contributions: Decimal
    contributions_count: int
    first_contribution_date: Optional[date] = None
    last_contribution_date: Optional[date] = None
    entries: List[MemberLedgerEntry]
    monthly_dues: List[MonthlyContributionDueOut] = []
