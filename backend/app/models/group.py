import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Boolean, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class GroupType(str, enum.Enum):
    MEMBER_FUND = "MEMBER_FUND"
    EXTERNAL_FUND = "EXTERNAL_FUND"

class Group(Base):
    __tablename__ = "groups"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Required field
    name = Column(String(255), nullable=False, index=True)
    group_type = Column(Enum(GroupType), default=GroupType.MEMBER_FUND, nullable=False, index=True)
    
    # Optional fields
    code = Column(String(50), unique=True, index=True, nullable=True)
    description = Column(Text, nullable=True)
    contact_person = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    members = relationship("Member", back_populates="group", cascade="all, delete-orphan")
    beneficiaries = relationship("Beneficiary", back_populates="group")
    contributions = relationship("Contribution", back_populates="group")
    funding_allocations = relationship("AssistanceFundingAllocation", back_populates="group")
    repayment_allocations = relationship("QardHasanRepaymentAllocation", back_populates="group")
    ledger_entries = relationship("LedgerEntry", back_populates="group")
    monthly_dues = relationship("MonthlyContributionDue", back_populates="group")
