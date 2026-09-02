from typing import Optional, List
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field
from app.models.repayment import PaymentMethod

class DonationBase(BaseModel):
    donor_name: str = Field(..., min_length=1, max_length=255, description="Donor Full Name (Required)")
    donor_phone: Optional[str] = Field(None, max_length=50, description="Donor Phone Number (Optional)")
    donor_email: Optional[str] = Field(None, max_length=255, description="Donor Email Address (Optional)")
    donor_address: Optional[str] = None
    
    amount: Decimal = Field(..., gt=0, description="Donation Amount (Required, > 0)")
    group_id: UUID = Field(..., description="External Fund Group ID (Must be an EXTERNAL_FUND)")
    donation_date: date = Field(..., description="Date of Donation (Required)")
    
    purpose: Optional[str] = Field("General Donation", max_length=255, description="Fund Category / Purpose")
    payment_method: PaymentMethod = Field(PaymentMethod.CASH, description="Payment Method")
    reference_number: Optional[str] = Field(None, max_length=100, description="Payment TrxID / Reference")
    notes: Optional[str] = None

class DonationCreate(DonationBase):
    pass

class DonationUpdate(BaseModel):
    donor_name: Optional[str] = None
    donor_phone: Optional[str] = None
    donor_email: Optional[str] = None
    donor_address: Optional[str] = None
    purpose: Optional[str] = None
    payment_method: Optional[PaymentMethod] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class DonationVoidIn(BaseModel):
    reason: str = Field(..., min_length=3, description="Audit reason for voiding this donation receipt")

class DonationOut(DonationBase):
    id: UUID
    receipt_number: str
    group_name: Optional[str] = None
    group_code: Optional[str] = None
    
    is_voided: bool = False
    void_reason: Optional[str] = None
    voided_at: Optional[datetime] = None
    voided_by: Optional[UUID] = None
    
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DonationDetailOut(DonationOut):
    creator_name: Optional[str] = None
    voider_name: Optional[str] = None

class DonationSummaryMetrics(BaseModel):
    total_donations_amount: Decimal = Decimal("0.00")
    total_donations_count: int = 0
    this_month_amount: Decimal = Decimal("0.00")
    active_funds_count: int = 0

class DonationLedgerEntryOut(BaseModel):
    id: UUID
    receipt_number: str
    donation_date: date
    donor_name: str
    donor_phone: Optional[str] = None
    group_id: UUID
    group_name: str
    purpose: Optional[str] = None
    amount: Decimal
    payment_method: str
    reference_number: Optional[str] = None
    is_voided: bool
    created_at: datetime

class DonationLedgerOut(BaseModel):
    total_count: int
    total_amount: Decimal
    entries: List[DonationLedgerEntryOut]
