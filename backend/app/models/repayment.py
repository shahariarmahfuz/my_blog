import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Numeric, Date, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class PaymentMethod(str, enum.Enum):
    CASH = "CASH"
    BANK_TRANSFER = "BANK_TRANSFER"
    CHEQUE = "CHEQUE"
    MOBILE_BANKING = "MOBILE_BANKING"
    OTHER = "OTHER"

class QardHasanRepayment(Base):
    __tablename__ = "qard_hasan_repayments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repayment_code = Column(String(50), unique=True, index=True, nullable=False)
    assistance_id = Column(UUID(as_uuid=True), ForeignKey("assistance.id", ondelete="RESTRICT"), nullable=False, index=True)
    amount = Column(Numeric(14, 2), nullable=False)
    payment_date = Column(Date, nullable=False, index=True)
    payment_method = Column(Enum(PaymentMethod), default=PaymentMethod.CASH, nullable=False)
    reference_number = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    
    received_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    assistance = relationship("Assistance", back_populates="repayments")
    receiver = relationship("User", foreign_keys=[received_by])
    allocations = relationship("QardHasanRepaymentAllocation", back_populates="repayment", cascade="all, delete-orphan")

class QardHasanRepaymentAllocation(Base):
    __tablename__ = "qard_hasan_repayment_allocations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repayment_id = Column(UUID(as_uuid=True), ForeignKey("qard_hasan_repayments.id", ondelete="CASCADE"), nullable=False, index=True)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="RESTRICT"), nullable=False, index=True)
    funding_allocation_id = Column(UUID(as_uuid=True), ForeignKey("assistance_funding_allocations.id", ondelete="RESTRICT"), nullable=False, index=True)
    allocated_amount = Column(Numeric(14, 2), nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    repayment = relationship("QardHasanRepayment", back_populates="allocations")
    group = relationship("Group", back_populates="repayment_allocations")
    funding_allocation = relationship("AssistanceFundingAllocation", back_populates="repayment_allocations")
