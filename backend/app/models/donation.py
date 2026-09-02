import uuid
from decimal import Decimal
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, Text, Numeric, Date as SQLDate, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.repayment import PaymentMethod

class Donation(Base):
    """
    Records external donations from individuals or entities who are NOT members of the foundation.
    Deposited exclusively into EXTERNAL_FUND groups.
    """
    __tablename__ = "donations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    receipt_number = Column(String(50), unique=True, index=True, nullable=False)
    
    # External Donor Information (NOT linked to members table)
    donor_name = Column(String(255), nullable=False, index=True)
    donor_phone = Column(String(50), nullable=True, index=True)
    donor_email = Column(String(255), nullable=True)
    donor_address = Column(Text, nullable=True)

    # Financial details
    amount = Column(Numeric(14, 2), nullable=False)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="RESTRICT"), nullable=False, index=True)
    donation_date = Column(SQLDate, nullable=False, index=True)
    
    purpose = Column(String(255), nullable=True, default="General Donation")
    payment_method = Column(Enum(PaymentMethod), default=PaymentMethod.CASH, nullable=False)
    reference_number = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)

    # Financial integrity & voiding
    is_voided = Column(Boolean, default=False, nullable=False)
    void_reason = Column(Text, nullable=True)
    voided_at = Column(DateTime(timezone=True), nullable=True)
    voided_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    group = relationship("Group", backref="donations")
    creator = relationship("User", foreign_keys=[created_by])
    voider = relationship("User", foreign_keys=[voided_by])
