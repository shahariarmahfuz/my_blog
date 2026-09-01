from typing import Optional, List
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field
from app.models.repayment import PaymentMethod

class RepaymentCreate(BaseModel):
    assistance_id: UUID = Field(..., description="Qard Hasan Assistance ID")
    amount: Decimal = Field(..., gt=0, description="Repayment amount")
    payment_date: date = Field(default_factory=date.today)
    payment_method: PaymentMethod = PaymentMethod.CASH
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class RepaymentAllocationItemOut(BaseModel):
    id: Optional[UUID] = None
    group_id: UUID
    group_name: Optional[str] = None
    allocated_amount: Decimal
    proportion_ratio: Optional[Decimal] = None
    
    model_config = ConfigDict(from_attributes=True)

class RepaymentPreviewOut(BaseModel):
    assistance_id: UUID
    repayment_amount: Decimal
    current_outstanding: Decimal
    new_outstanding: Decimal
    allocations: List[RepaymentAllocationItemOut]

class RepaymentOut(BaseModel):
    id: UUID
    repayment_code: str
    assistance_id: UUID
    assistance_code: Optional[str] = None
    beneficiary_name: Optional[str] = None
    amount: Decimal
    payment_date: date
    payment_method: PaymentMethod
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    received_by: Optional[UUID] = None
    received_by_name: Optional[str] = None
    allocations: List[RepaymentAllocationItemOut] = []
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
