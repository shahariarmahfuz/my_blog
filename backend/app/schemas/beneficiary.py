from typing import Optional, List
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field

class BeneficiaryBase(BaseModel):
    # Only Name and Group are required
    name: str = Field(..., min_length=1, description="Beneficiary Full Name (Required)")
    group_id: UUID = Field(..., description="Assigned Fund Group ID (Required)")
    
    # Basic Information (Optional)
    beneficiary_code: Optional[str] = None
    registration_date: Optional[date] = None
    is_active: Optional[bool] = True

    # 1. Personal Information (Optional)
    father_or_husband_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    national_id: Optional[str] = None
    occupation: Optional[str] = None
    education: Optional[str] = None
    marital_status: Optional[str] = None
    phone: Optional[str] = None
    alternative_phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    present_address: Optional[str] = None
    permanent_address: Optional[str] = None
    reason_for_assistance: Optional[str] = None

    # 2. Emergency Contact (Optional)
    emergency_contact_name: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

    # 3. Documents (Optional)
    photo_url: Optional[str] = None
    signature_url: Optional[str] = None
    document_type: Optional[str] = None
    document_front_url: Optional[str] = None
    document_back_url: Optional[str] = None

    # 4. Additional Information (Optional)
    family_members_count: Optional[int] = None
    family_info: Optional[str] = None
    financial_condition: Optional[str] = None
    notes: Optional[str] = None

class BeneficiaryCreate(BeneficiaryBase):
    pass

class BeneficiaryUpdate(BaseModel):
    name: Optional[str] = None
    group_id: Optional[UUID] = None
    beneficiary_code: Optional[str] = None
    registration_date: Optional[date] = None
    is_active: Optional[bool] = None

    father_or_husband_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    national_id: Optional[str] = None
    occupation: Optional[str] = None
    education: Optional[str] = None
    marital_status: Optional[str] = None
    phone: Optional[str] = None
    alternative_phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    present_address: Optional[str] = None
    permanent_address: Optional[str] = None
    reason_for_assistance: Optional[str] = None

    emergency_contact_name: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

    photo_url: Optional[str] = None
    signature_url: Optional[str] = None
    document_type: Optional[str] = None
    document_front_url: Optional[str] = None
    document_back_url: Optional[str] = None

    family_members_count: Optional[int] = None
    family_info: Optional[str] = None
    financial_condition: Optional[str] = None
    notes: Optional[str] = None

class BeneficiaryOut(BeneficiaryBase):
    id: UUID
    group_name: Optional[str] = None
    total_qard_hasan_received: Optional[Decimal] = Decimal("0.00")
    total_qard_hasan_repaid: Optional[Decimal] = Decimal("0.00")
    outstanding_qard_hasan: Optional[Decimal] = Decimal("0.00")
    total_sadaqah_received: Optional[Decimal] = Decimal("0.00")
    total_assistance_received: Optional[Decimal] = Decimal("0.00")
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class BeneficiaryLedgerEntry(BaseModel):
    id: UUID
    date: date
    transaction_type: str  # QARD_HASAN_DISBURSEMENT, QARD_HASAN_REPAYMENT, SADAQAH_DISBURSEMENT
    code: str  # assistance_code or repayment_code
    description: Optional[str] = None
    funding_groups: List[str] = []
    disbursed_amount: Decimal = Decimal("0.00")
    repaid_amount: Decimal = Decimal("0.00")
    running_outstanding_loan: Decimal = Decimal("0.00")

class BeneficiaryLedgerOut(BaseModel):
    beneficiary_id: UUID
    beneficiary_name: str
    beneficiary_code: Optional[str] = None
    group_id: UUID
    group_name: str
    is_active: bool
    total_qard_hasan_received: Decimal
    total_qard_hasan_repaid: Decimal
    outstanding_qard_hasan: Decimal
    total_sadaqah_received: Decimal
    total_assistance_received: Decimal
    entries: List[BeneficiaryLedgerEntry]
