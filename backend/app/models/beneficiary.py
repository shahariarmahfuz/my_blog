import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Boolean, DateTime, Date, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class Beneficiary(Base):
    __tablename__ = "beneficiaries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Required fields (Only Name and Group are mandatory)
    name = Column(String(255), nullable=False, index=True)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    # Basic Information (Optional)
    beneficiary_code = Column(String(50), unique=True, index=True, nullable=True)
    registration_date = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # 1. Personal Information (Optional)
    father_or_husband_name = Column(String(255), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(50), nullable=True)
    national_id = Column(String(100), nullable=True)
    occupation = Column(String(150), nullable=True)
    education = Column(String(255), nullable=True)
    marital_status = Column(String(50), nullable=True)
    phone = Column(String(50), nullable=True)
    alternative_phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    present_address = Column(Text, nullable=True)
    permanent_address = Column(Text, nullable=True)
    reason_for_assistance = Column(Text, nullable=True)

    # 2. Emergency Contact (Optional)
    emergency_contact_name = Column(String(255), nullable=True)
    emergency_contact_relation = Column(String(100), nullable=True)
    emergency_contact_phone = Column(String(50), nullable=True)

    # 3. Documents (Optional)
    photo_url = Column(String(1000), nullable=True)
    signature_url = Column(String(1000), nullable=True)
    document_type = Column(String(100), nullable=True)
    document_front_url = Column(String(1000), nullable=True)
    document_back_url = Column(String(1000), nullable=True)

    # 4. Additional Information (Optional)
    family_members_count = Column(Integer, nullable=True)
    family_info = Column(Text, nullable=True)
    financial_condition = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    group = relationship("Group", back_populates="beneficiaries")
    assistance_records = relationship("Assistance", back_populates="beneficiary")
