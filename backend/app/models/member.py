import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Boolean, DateTime, Date, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class Member(Base):
    __tablename__ = "members"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Required fields (Only Name and Group are mandatory)
    name = Column(String(255), nullable=False, index=True)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    # Basic Information (Optional)
    member_code = Column(String(50), unique=True, index=True, nullable=True)
    join_date = Column(Date, nullable=True)
    monthly_contribution_amount = Column(Numeric(14, 2), nullable=True)  # Member-specific monthly pledge/due (null = use global default)
    is_active = Column(Boolean, default=True, nullable=False)

    # 1. Personal Information (Optional)
    father_name = Column(String(255), nullable=True)
    mother_name = Column(String(255), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(50), nullable=True)
    national_id = Column(String(100), nullable=True)
    occupation = Column(String(150), nullable=True)
    education = Column(String(255), nullable=True)
    blood_group = Column(String(20), nullable=True)
    marital_status = Column(String(50), nullable=True)
    phone = Column(String(50), nullable=True)
    alternative_phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    present_address = Column(Text, nullable=True)
    permanent_address = Column(Text, nullable=True)

    # 2. Emergency Contact (Optional)
    emergency_contact = Column(String(255), nullable=True)
    emergency_contact_name = Column(String(255), nullable=True)
    emergency_contact_relation = Column(String(100), nullable=True)
    emergency_contact_phone = Column(String(50), nullable=True)

    # 3. Reference (Optional)
    reference_name = Column(String(255), nullable=True)
    reference_relation = Column(String(100), nullable=True)
    reference_phone = Column(String(50), nullable=True)

    # 4. Commitment (Optional)
    commitment_accepted = Column(Boolean, default=False, nullable=True)

    # 5. Documents (Optional)
    photo_url = Column(String(1000), nullable=True)
    signature_url = Column(String(1000), nullable=True)
    document_type = Column(String(100), nullable=True)
    document_url = Column(String(1000), nullable=True)

    # 6. Additional Information (Optional)
    reason_for_joining = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    group = relationship("Group", back_populates="members")
    contributions = relationship("Contribution", back_populates="member")
    monthly_dues = relationship("MonthlyContributionDue", back_populates="member", cascade="all, delete-orphan")
