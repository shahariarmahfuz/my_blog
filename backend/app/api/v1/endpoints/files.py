import uuid
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_client_ip
from app.models.user import User
from app.models.file_document import FileDocument
from app.schemas.file_document import FileDocumentOut, FileUploadResponse, FileListOut
from app.services.cloudinary_service import CloudinaryService
from app.services.audit_service import AuditService

router = APIRouter()

@router.post("/upload", response_model=FileUploadResponse, status_code=status.HTTP_201_CREATED)
def upload_file(
    request: Request,
    file: UploadFile = File(...),
    entity_type: str = Form(...),
    entity_id: Optional[str] = Form(None),
    visibility: Optional[str] = Form("PRIVATE"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Centralized file/document upload to Cloudinary with PostgreSQL metadata persistence.
    Validates mime types, applies compression, and records security audit trail.
    """
    # 1. Upload to Cloudinary
    upload_data = CloudinaryService.upload_file(
        file=file,
        entity_type=entity_type,
        entity_id=entity_id,
        visibility=visibility or "PRIVATE"
    )

    # 2. Persist metadata in PostgreSQL
    file_doc = FileDocument(
        entity_type=entity_type.lower().strip(),
        entity_id=str(entity_id).strip() if entity_id else None,
        original_filename=upload_data["original_filename"],
        cloudinary_public_id=upload_data["cloudinary_public_id"],
        secure_url=upload_data["secure_url"],
        resource_type=upload_data["resource_type"],
        format=upload_data["format"],
        mime_type=upload_data["mime_type"],
        file_size=upload_data["file_size"],
        width=upload_data["width"],
        height=upload_data["height"],
        folder=upload_data["folder"],
        visibility=upload_data["visibility"],
        uploaded_by=current_user.id
    )

    try:
        db.add(file_doc)
        db.commit()
        db.refresh(file_doc)
    except Exception as e:
        db.rollback()
        # Clean up orphaned Cloudinary asset if DB fails
        CloudinaryService.delete_asset(upload_data["cloudinary_public_id"], resource_type=upload_data["resource_type"])
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database transaction error while storing file metadata: {str(e)}"
        )

    # 3. Security Audit Log
    AuditService.log(
        db=db,
        action="FILE_UPLOADED",
        entity_name="files",
        entity_id=str(file_doc.id),
        new_values={
            "entity_type": file_doc.entity_type,
            "entity_id": file_doc.entity_id,
            "filename": file_doc.original_filename,
            "cloudinary_public_id": file_doc.cloudinary_public_id,
            "file_size": file_doc.file_size,
            "visibility": file_doc.visibility
        },
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )
    db.commit()

    # Generate access URL
    out = FileDocumentOut.model_validate(file_doc)
    if file_doc.visibility == "PRIVATE":
        out.access_url = CloudinaryService.generate_signed_url(
            file_doc.cloudinary_public_id,
            resource_type=file_doc.resource_type,
            format=file_doc.format
        )
    else:
        out.access_url = file_doc.secure_url

    return FileUploadResponse(
        message="File uploaded and stored in Cloudinary successfully.",
        file=out
    )

@router.get("/{file_id}", response_model=FileDocumentOut)
def get_file(
    file_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve file metadata and authorized access URL.
    Private files require authentication and authorization.
    """
    file_doc = db.query(FileDocument).filter(
        FileDocument.id == file_id,
        FileDocument.deleted_at.is_(None)
    ).first()

    if not file_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File record not found."
        )

    out = FileDocumentOut.model_validate(file_doc)
    if file_doc.visibility == "PRIVATE":
        out.access_url = CloudinaryService.generate_signed_url(
            file_doc.cloudinary_public_id,
            resource_type=file_doc.resource_type,
            format=file_doc.format
        )
    else:
        out.access_url = file_doc.secure_url

    return out

@router.get("/entity/{entity_type}/{entity_id}", response_model=FileListOut)
def list_entity_files(
    entity_type: str,
    entity_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all attachments associated with a specific entity."""
    files = db.query(FileDocument).filter(
        FileDocument.entity_type == entity_type.lower().strip(),
        FileDocument.entity_id == str(entity_id).strip(),
        FileDocument.deleted_at.is_(None)
    ).order_by(FileDocument.created_at.desc()).all()

    items = []
    for f in files:
        item = FileDocumentOut.model_validate(f)
        if f.visibility == "PRIVATE":
            item.access_url = CloudinaryService.generate_signed_url(
                f.cloudinary_public_id,
                resource_type=f.resource_type,
                format=f.format
            )
        else:
            item.access_url = f.secure_url
        items.append(item)

    return FileListOut(total=len(items), items=items)

@router.delete("/{file_id}")
def delete_file(
    file_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete file from Cloudinary and database."""
    file_doc = db.query(FileDocument).filter(
        FileDocument.id == file_id,
        FileDocument.deleted_at.is_(None)
    ).first()

    if not file_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File record not found."
        )

    # Permission check: Owner or Super Admin or staff
    if file_doc.uploaded_by != current_user.id and current_user.role and current_user.role.name != "Super Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this file."
        )

    # 1. Destroy asset on Cloudinary
    CloudinaryService.delete_asset(
        file_doc.cloudinary_public_id,
        resource_type=file_doc.resource_type
    )

    # 2. Delete database record
    db.delete(file_doc)
    db.commit()

    # 3. Audit Log
    AuditService.log(
        db=db,
        action="FILE_DELETED",
        entity_name="files",
        entity_id=str(file_id),
        old_values={
            "cloudinary_public_id": file_doc.cloudinary_public_id,
            "filename": file_doc.original_filename
        },
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )
    db.commit()

    return {"message": "File deleted successfully from Cloudinary and database."}
