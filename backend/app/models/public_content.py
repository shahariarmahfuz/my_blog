import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, Text, DateTime, Date, Boolean, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class PublicStory(Base):
    __tablename__ = "public_stories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    summary = Column(Text, nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(100), default="Small Business", nullable=False)  # Small Business, Medical, Education, Family Support
    assistance_type = Column(String(50), default="QARD_HASAN", nullable=False)  # QARD_HASAN, SADAQAH, EMERGENCY_RELIEF
    location = Column(String(150), default="Dhaka, Bangladesh", nullable=False)
    impact_highlight = Column(String(255), nullable=True)
    cover_image = Column(String(500), nullable=True)
    read_time_minutes = Column(Integer, default=3, nullable=False)
    is_published = Column(Boolean, default=True, nullable=False, index=True)
    published_date = Column(Date, default=date.today, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class AssistanceInquiry(Base):
    __tablename__ = "assistance_inquiries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inquiry_code = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    email = Column(String(255), nullable=True)
    district_or_city = Column(String(150), nullable=False)
    assistance_type_needed = Column(String(50), default="QARD_HASAN", nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(50), default="PENDING", nullable=False)  # PENDING, CONTACTED, CONVERTED_TO_APPLICATION, ARCHIVED
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class ContactMessage(Base):
    __tablename__ = "contact_messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    subject = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
