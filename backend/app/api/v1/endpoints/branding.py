from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_permission, get_client_ip
from app.models.user import User
from app.schemas.branding import BrandingSettingsOut, PublicBrandingOut, BrandingTextUpdateIn
from app.services.branding_service import BrandingService

router = APIRouter()

@router.get("/public", response_model=PublicBrandingOut)
def get_public_branding(db: Session = Depends(get_db)):
    """
    Public-safe endpoint returning foundation name, tagline, logo, favicon, and apple touch icon URLs.
    Does NOT require authentication. Never exposes internal credentials.
    """
    return BrandingService.get_public_branding(db)

@router.get("", response_model=BrandingSettingsOut)
def get_branding_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("settings.view"))
):
    """
    Returns full Foundation Branding assets and configuration for authorized staff.
    """
    return BrandingService.get_full_branding(db)

@router.put("", response_model=BrandingSettingsOut)
def update_branding_text(
    request: Request,
    text_in: BrandingTextUpdateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("settings.edit"))
):
    """
    Updates foundation name and tagline in branding configuration.
    """
    return BrandingService.update_branding_text(
        db=db,
        foundation_name=text_in.foundation_name,
        tagline=text_in.tagline,
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )

@router.post("/upload", response_model=BrandingSettingsOut)
def upload_branding_asset(
    request: Request,
    file: UploadFile = File(...),
    asset_type: str = Form(..., description="Asset type: logo, favicon, apple_touch_icon, login_logo, public_logo"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("settings.edit"))
):
    """
    Uploads, optimizes, and stores a branding asset (Logo, Favicon, Apple Touch Icon) in Cloudinary and PostgreSQL.
    Replaces previous asset if present and cleans up old Cloudinary storage.
    """
    return BrandingService.upload_branding_asset(
        db=db,
        file=file,
        asset_type=asset_type,
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )

@router.delete("/asset/{asset_type}", response_model=BrandingSettingsOut)
def delete_branding_asset(
    request: Request,
    asset_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("settings.edit"))
):
    """
    Deletes a branding asset from Cloudinary and database, restoring default fallback.
    """
    return BrandingService.delete_branding_asset(
        db=db,
        asset_type=asset_type,
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )
