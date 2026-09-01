import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Numeric, Date, Integer, DateTime, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class AssistanceType(str, enum.Enum):
    QARD_HASAN = "QARD_HASAN"
    SADAQAH = "SADAQAH"

class AssistanceStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    DISBURSED = "DISBURSED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    DEFAULTED = "DEFAULTED"
    CANCELLED = "CANCELLED"

class InstallmentStatus(str, enum.Enum):
    PENDING = "PENDING"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    PAID = "PAID"
    OVERDUE = "OVERDUE"

class Assistance(Base):
    __tablename__ = "assistance"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assistance_code = Column(String(50), unique=True, index=True, nullable=False)
    assistance_type = Column(Enum(AssistanceType), nullable=False, index=True)
    beneficiary_id = Column(UUID(as_uuid=True), ForeignKey("beneficiaries.id", ondelete="RESTRICT"), nullable=False, index=True)
    total_amount = Column(Numeric(14, 2), nullable=False)
    disbursement_date = Column(Date, nullable=False)
    status = Column(Enum(AssistanceStatus), default=AssistanceStatus.ACTIVE, nullable=False, index=True)
    purpose = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    beneficiary = relationship("Beneficiary", back_populates="assistance_records")
    creator = relationship("User", foreign_keys=[created_by])
    approver = relationship("User", foreign_keys=[approved_by])
    funding_allocations = relationship("AssistanceFundingAllocation", back_populates="assistance", cascade="all, delete-orphan")
    installments = relationship("InstallmentSchedule", back_populates="assistance", cascade="all, delete-orphan", order_by="InstallmentSchedule.installment_number")
    repayments = relationship("QardHasanRepayment", back_populates="assistance", cascade="all, delete-orphan", order_by="QardHasanRepayment.payment_date")

class AssistanceFundingAllocation(Base):
    __tablename__ = "assistance_funding_allocations"
    __table_args__ = (
        UniqueConstraint("assistance_id", "group_id", name="uq_assistance_group_funding"),
    )
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assistance_id = Column(UUID(as_uuid=True), ForeignKey("assistance.id", ondelete="CASCADE"), nullable=False, index=True)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="RESTRICT"), nullable=False, index=True)
    allocated_amount = Column(Numeric(14, 2), nullable=False)
    proportion_ratio = Column(Numeric(8, 6), nullable=False) # e.g. 0.400000 (40%)
    repaid_amount = Column(Numeric(14, 2), default=0.00, nullable=False) # Repaid amount returned to this specific group
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    assistance = relationship("Assistance", back_populates="funding_allocations")
    group = relationship("Group", back_populates="funding_allocations")
    repayment_allocations = relationship("QardHasanRepaymentAllocation", back_populates="funding_allocation")

class InstallmentSchedule(Base):
    __tablename__ = "installment_schedules"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assistance_id = Column(UUID(as_uuid=True), ForeignKey("assistance.id", ondelete="CASCADE"), nullable=False, index=True)
    installment_number = Column(Integer, nullable=False)
    due_date = Column(Date, nullable=False, index=True)
    amount = Column(Numeric(14, 2), nullable=False)
    paid_amount = Column(Numeric(14, 2), default=0.00, nullable=False)
    status = Column(Enum(InstallmentStatus), default=InstallmentStatus.PENDING, nullable=False, index=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    assistance = relationship("Assistance", back_populates="installments")
