import uuid
import enum
from decimal import Decimal
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, Text, Numeric, Date as SQLDate, DateTime, Boolean, ForeignKey, Enum, UniqueConstraint, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.repayment import PaymentMethod

class DueStatus(str, enum.Enum):
    DUE = "DUE"
    PARTIAL = "PARTIAL"
    PAID = "PAID"
    OVERDUE = "OVERDUE"

class MonthlyContributionDue(Base):
    __tablename__ = "monthly_contribution_dues"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    member_id = Column(UUID(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="RESTRICT"), nullable=False, index=True)
    contribution_month = Column(SQLDate, nullable=False, index=True)  # First day of the month: YYYY-MM-01
    due_date = Column(SQLDate, nullable=False)                         # e.g. 10th of the month
    expected_amount = Column(Numeric(14, 2), nullable=False)           # Expected monthly due
    paid_amount = Column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    remaining_due = Column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    status = Column(String(20), default="DUE", nullable=False)         # DUE, PARTIAL, PAID, OVERDUE
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint('member_id', 'contribution_month', name='uq_member_contribution_month'),
    )

    # Relationships
    member = relationship("Member", back_populates="monthly_dues")
    group = relationship("Group", back_populates="monthly_dues")
    contributions = relationship("Contribution", back_populates="due_record")
    allocations = relationship("MonthlyContributionAllocation", back_populates="due", cascade="all, delete-orphan")


class Contribution(Base):
    __tablename__ = "contributions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    receipt_number = Column(String(50), unique=True, index=True, nullable=False)
    member_id = Column(UUID(as_uuid=True), ForeignKey("members.id", ondelete="RESTRICT"), nullable=False, index=True)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="RESTRICT"), nullable=False, index=True)
    due_id = Column(UUID(as_uuid=True), ForeignKey("monthly_contribution_dues.id", ondelete="SET NULL"), nullable=True, index=True)
    amount = Column(Numeric(14, 2), nullable=False)
    contribution_date = Column(SQLDate, nullable=False, index=True)
    contribution_month = Column(SQLDate, nullable=True, index=True)  # Primary / first month this payment applies to: YYYY-MM-01
    
    # Multi-month tracking metadata
    months_count = Column(Integer, default=1, nullable=False)
    months_summary = Column(String(255), nullable=True)             # e.g. "January 2026 – December 2026 (12 months)"
    months_covered = Column(JSON, nullable=True)                     # List of ISO dates e.g. ["2026-01-01", ...]
    
    payment_method = Column(Enum(PaymentMethod), default=PaymentMethod.CASH, nullable=False)
    reference_number = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    
    # Financial integrity and reversal tracking
    is_voided = Column(Boolean, default=False, nullable=False)
    void_reason = Column(Text, nullable=True)
    voided_at = Column(DateTime(timezone=True), nullable=True)
    voided_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    member = relationship("Member", back_populates="contributions")
    group = relationship("Group", back_populates="contributions")
    due_record = relationship("MonthlyContributionDue", back_populates="contributions")
    allocations = relationship("MonthlyContributionAllocation", back_populates="contribution", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[created_by])
    voider = relationship("User", foreign_keys=[voided_by])


class MonthlyContributionAllocation(Base):
    """
    Allocates portions of a single Contribution receipt to specific MonthlyContributionDue records.
    Enables 1 actual financial payment receipt to fulfill multiple monthly dues.
    """
    __tablename__ = "monthly_contribution_allocations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contribution_id = Column(UUID(as_uuid=True), ForeignKey("contributions.id", ondelete="CASCADE"), nullable=False, index=True)
    due_id = Column(UUID(as_uuid=True), ForeignKey("monthly_contribution_dues.id", ondelete="CASCADE"), nullable=False, index=True)
    member_id = Column(UUID(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True)
    contribution_month = Column(SQLDate, nullable=False, index=True)  # First day of the month: YYYY-MM-01
    allocated_amount = Column(Numeric(14, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    contribution = relationship("Contribution", back_populates="allocations")
    due = relationship("MonthlyContributionDue", back_populates="allocations")
