import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class FileDocument(Base):
    __tablename__ = "files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type = Column(String(50), nullable=False, index=True)  # user_avatar, member, beneficiary, member_application, assistance, story, receipt, general
    entity_id = Column(String(100), nullable=True, index=True)
    original_filename = Column(String(255), nullable=False)
    cloudinary_public_id = Column(String(255), nullable=False, unique=True, index=True)
    secure_url = Column(String(1000), nullable=False)
    resource_type = Column(String(50), default="image", nullable=False)  # image, raw, video
    format = Column(String(50), nullable=True)
    mime_type = Column(String(100), nullable=True)
    file_size = Column(Integer, default=0, nullable=False)  # in bytes
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    folder = Column(String(255), nullable=True)
    visibility = Column(String(20), default="PRIVATE", nullable=False)  # PUBLIC or PRIVATE
    
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    uploader = relationship("User", foreign_keys=[uploaded_by])
