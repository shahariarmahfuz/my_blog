import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, Text, DateTime, Date, Numeric, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class MemberApplication(Base):
    __tablename__ = "member_applications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_code = Column(String(50), unique=True, index=True, nullable=False)
    applicant_name = Column(String(255), nullable=False, index=True)
    proposed_group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="SET NULL"), nullable=False, index=True)
    
    # 1. Personal Information (Optional)
    father_name = Column(String(255), nullable=True)
    mother_name = Column(String(255), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(50), nullable=True)
    national_id = Column(String(100), nullable=True)
    occupation = Column(String(150), nullable=True)
    education = Column(String(255), nullable=True)
    blood_group = Column(String(50), nullable=True)
    marital_status = Column(String(50), nullable=True)
    phone = Column(String(50), nullable=True, index=True)
    alternative_phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True, index=True)
    address = Column(Text, nullable=True)
    present_address = Column(Text, nullable=True)
    permanent_address = Column(Text, nullable=True)
    monthly_pledge = Column(Numeric(15, 2), default=0.00, nullable=True)

    # 2. Emergency Contact (Optional)
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
    document_back_url = Column(String(1000), nullable=True)

    # 6. Additional Information (Optional)
    reason_for_joining = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    
    application_date = Column(Date, default=date.today, nullable=False)
    status = Column(String(50), default="PENDING", nullable=False, index=True)  # PENDING, UNDER_REVIEW, ACCEPTED, REJECTED, CHANGES_REQUIRED, CANCELLED
    
    # Reviewer & Feedback Information
    change_request_message = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    admin_notes = Column(Text, nullable=True)
    
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    accepted_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    created_member_id = Column(UUID(as_uuid=True), ForeignKey("members.id", ondelete="SET NULL"), nullable=True, unique=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    proposed_group = relationship("Group", foreign_keys=[proposed_group_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    acceptor = relationship("User", foreign_keys=[accepted_by])
    created_member = relationship("Member", foreign_keys=[created_member_id])
    status_history = relationship(
        "MemberApplicationStatusHistory",
        back_populates="application",
        cascade="all, delete-orphan",
        order_by="MemberApplicationStatusHistory.created_at.desc()"
    )

class MemberApplicationStatusHistory(Base):
    __tablename__ = "member_application_status_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id = Column(UUID(as_uuid=True), ForeignKey("member_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False)  # APPLICATION_CREATED, APPLICATION_REVIEW_STARTED, CHANGES_REQUESTED, APPLICATION_RESUBMITTED, APPLICATION_ACCEPTED, APPLICATION_REJECTED
    changed_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    actor_type = Column(String(50), default="ADMIN")  # ADMIN, APPLICANT, SYSTEM
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    application = relationship("MemberApplication", back_populates="status_history")
    changed_by_user = relationship("User", foreign_keys=[changed_by_user_id])
