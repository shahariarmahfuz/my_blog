from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class FileDocumentBase(BaseModel):
    entity_type: str
    entity_id: Optional[str] = None
    original_filename: str
    visibility: str = "PRIVATE"

class FileDocumentOut(FileDocumentBase):
    id: UUID
    cloudinary_public_id: str
    secure_url: str
    resource_type: str
    format: Optional[str] = None
    mime_type: Optional[str] = None
    file_size: int
    width: Optional[int] = None
    height: Optional[int] = None
    folder: Optional[str] = None
    uploaded_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    
    # Optional dynamic access URL (signed for private files)
    access_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class FileUploadResponse(BaseModel):
    message: str
    file: FileDocumentOut

class FileListOut(BaseModel):
    total: int
    items: List[FileDocumentOut]
