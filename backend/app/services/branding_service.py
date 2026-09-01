import io
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple, Literal
from fastapi import UploadFile, HTTPException, status
from PIL import Image, ImageOps
import cloudinary
import cloudinary.uploader
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.setting import SystemSetting
from app.services.cloudinary_service import CloudinaryService, DANGEROUS_EXTENSIONS
from app.services.audit_service import AuditService

ALLOWED_BRANDING_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".ico", ".svg"}
MAX_BRANDING_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

DEFAULT_BRANDING_CONFIG: Dict[str, Any] = {
    "foundation_name": "Al-Khair Foundation",
    "tagline": "Empowering Communities through Islamic Microfinance & Sadaqah",
    "logo_url": "",
    "logo_public_id": "",
    "logo_filename": "",
    "logo_filesize": 0,
    "favicon_url": "",
    "favicon_public_id": "",
    "favicon_filename": "",
    "favicon_filesize": 0,
    "apple_touch_icon_url": "",
    "apple_touch_icon_public_id": "",
    "apple_touch_icon_filename": "",
    "apple_touch_icon_filesize": 0,
    "login_logo_url": "",
    "login_logo_public_id": "",
    "login_logo_filename": "",
    "login_logo_filesize": 0,
    "public_logo_url": "",
    "public_logo_public_id": "",
    "public_logo_filename": "",
    "public_logo_filesize": 0,
    "updated_at": None
}

class BrandingService:
    @staticmethod
    def get_or_seed_branding_setting(db: Session) -> SystemSetting:
        """Retrieves or initializes the branding SystemSetting record."""
        record = db.query(SystemSetting).filter(SystemSetting.section == "branding").first()
        if not record:
            record = SystemSetting(
                section="branding",
                config_data=dict(DEFAULT_BRANDING_CONFIG)
            )
            db.add(record)
            db.flush()
        return record

    @staticmethod
    def get_public_branding(db: Session) -> Dict[str, Any]:
        """Returns public-safe branding assets and metadata."""
        record = BrandingService.get_or_seed_branding_setting(db)
        data = record.config_data or {}
        
        # Fallback to general/profile settings if branding logo is not yet configured
        gen_setting = db.query(SystemSetting).filter(SystemSetting.section == "general").first()
        gen_data = gen_setting.config_data if gen_setting and gen_setting.config_data else {}
        
        prof_setting = db.query(SystemSetting).filter(SystemSetting.section == "profile").first()
        prof_data = prof_setting.config_data if prof_setting and prof_setting.config_data else {}
        
        foundation_name = data.get("foundation_name") or gen_data.get("foundation_name") or prof_data.get("foundation_name") or "Al-Khair Foundation"
        tagline = data.get("tagline") or prof_data.get("tagline") or "Empowering Communities through Islamic Microfinance & Sadaqah"
        
        logo_url = data.get("logo_url") or gen_data.get("logo_url") or prof_data.get("logo_url") or ""
        
        return {
            "foundation_name": foundation_name,
            "tagline": tagline,
            "logo_url": logo_url,
            "favicon_url": data.get("favicon_url") or "",
            "apple_touch_icon_url": data.get("apple_touch_icon_url") or "",
            "login_logo_url": data.get("login_logo_url") or logo_url,
            "public_logo_url": data.get("public_logo_url") or logo_url,
            "updated_at": record.updated_at.isoformat() if record.updated_at else None
        }

    @staticmethod
    def get_full_branding(db: Session) -> Dict[str, Any]:
        """Returns the full branding configuration including public IDs, file sizes, and asset metadata."""
        record = BrandingService.get_or_seed_branding_setting(db)
        data = dict(DEFAULT_BRANDING_CONFIG)
        if record.config_data:
            data.update(record.config_data)
        
        # Build structured output
        return {
            "foundation_name": data.get("foundation_name", "Al-Khair Foundation"),
            "tagline": data.get("tagline", "Empowering Communities through Islamic Microfinance & Sadaqah"),
            "logo": {
                "url": data.get("logo_url") or "",
                "public_id": data.get("logo_public_id") or "",
                "filename": data.get("logo_filename") or "",
                "filesize": data.get("logo_filesize") or 0,
            },
            "favicon": {
                "url": data.get("favicon_url") or "",
                "public_id": data.get("favicon_public_id") or "",
                "filename": data.get("favicon_filename") or "",
                "filesize": data.get("favicon_filesize") or 0,
            },
            "apple_touch_icon": {
                "url": data.get("apple_touch_icon_url") or "",
                "public_id": data.get("apple_touch_icon_public_id") or "",
                "filename": data.get("apple_touch_icon_filename") or "",
                "filesize": data.get("apple_touch_icon_filesize") or 0,
            },
            "login_logo": {
                "url": data.get("login_logo_url") or "",
                "public_id": data.get("login_logo_public_id") or "",
                "filename": data.get("login_logo_filename") or "",
                "filesize": data.get("login_logo_filesize") or 0,
            },
            "public_logo": {
                "url": data.get("public_logo_url") or "",
                "public_id": data.get("public_logo_public_id") or "",
                "filename": data.get("public_logo_filename") or "",
                "filesize": data.get("public_logo_filesize") or 0,
            },
            "logo_url": data.get("logo_url") or "",
            "favicon_url": data.get("favicon_url") or "",
            "apple_touch_icon_url": data.get("apple_touch_icon_url") or "",
            "login_logo_url": data.get("login_logo_url") or "",
            "public_logo_url": data.get("public_logo_url") or "",
            "updated_at": record.updated_at.isoformat() if record.updated_at else None
        }

    @staticmethod
    def validate_and_process_image(
        file: UploadFile,
        asset_type: str
    ) -> Tuple[bytes, str, str, int, int]:
        """
        Validates file security, dimensions, and performs backend image optimization with Pillow.
        Returns: (processed_bytes, mime_type, extension, width, height)
        """
        filename = file.filename or "asset"
        _, ext = os.path.splitext(filename)
        ext = ext.lower()

        if ext in DANGEROUS_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Security violation: File type '{ext}' is prohibited."
            )

        if ext not in ALLOWED_BRANDING_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported format '{ext}'. Allowed branding formats: PNG, JPG, JPEG, WebP, SVG, ICO."
            )

        raw_bytes = file.file.read()
        file_size = len(raw_bytes)

        if file_size == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file received.")

        if file_size > MAX_BRANDING_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size ({file_size / (1024*1024):.2f}MB) exceeds maximum limit of 5MB."
            )

        # If SVG, validate basic XML/SVG tags and pass through directly
        if ext == ".svg":
            if b"<svg" not in raw_bytes.lower():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid SVG vector file content.")
            return raw_bytes, "image/svg+xml", ".svg", 512, 512

        # If ICO format, pass through or convert
        if ext == ".ico":
            return raw_bytes, "image/x-icon", ".ico", 64, 64

        # Process raster image using Pillow
        try:
            img = Image.open(io.BytesIO(raw_bytes))
            # Auto-rotate based on EXIF orientation if present
            img = ImageOps.exif_transpose(img)
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Corrupted or invalid image file.")

        orig_w, orig_h = img.size

        # Apply asset-specific optimizations
        if asset_type == "favicon":
            # Crop to square and resize to 128x128 for crisp browser rendering
            min_dim = min(orig_w, orig_h)
            left = (orig_w - min_dim) // 2
            top = (orig_h - min_dim) // 2
            img_cropped = img.crop((left, top, left + min_dim, top + min_dim))
            img_resized = img_cropped.resize((128, 128), Image.Resampling.LANCZOS)
            
            out_buf = io.BytesIO()
            if img_resized.mode in ("RGBA", "LA") or (img_resized.mode == "P" and "transparency" in img_resized.info):
                img_resized.save(out_buf, format="PNG", optimize=True)
                return out_buf.getvalue(), "image/png", ".png", 128, 128
            else:
                img_resized.save(out_buf, format="PNG", optimize=True)
                return out_buf.getvalue(), "image/png", ".png", 128, 128

        elif asset_type == "apple_touch_icon":
            # Exact 180x180 square required by iOS
            min_dim = min(orig_w, orig_h)
            left = (orig_w - min_dim) // 2
            top = (orig_h - min_dim) // 2
            img_cropped = img.crop((left, top, left + min_dim, top + min_dim))
            img_resized = img_cropped.resize((180, 180), Image.Resampling.LANCZOS)
            
            # Apple touch icon should preferably be non-transparent (RGB) with solid background if transparent
            if img_resized.mode in ("RGBA", "LA"):
                background = Image.new("RGB", (180, 180), (255, 255, 255))
                background.paste(img_resized, mask=img_resized.split()[3])
                img_resized = background
            else:
                img_resized = img_resized.convert("RGB")
                
            out_buf = io.BytesIO()
            img_resized.save(out_buf, format="PNG", optimize=True)
            return out_buf.getvalue(), "image/png", ".png", 180, 180

        elif asset_type in ("logo", "login_logo", "public_logo"):
            # Preserve aspect ratio, constrain max width/height to 800px
            max_limit = 600 if asset_type == "login_logo" else 800
            if orig_w > max_limit or orig_h > max_limit:
                img.thumbnail((max_limit, max_limit), Image.Resampling.LANCZOS)
            
            out_buf = io.BytesIO()
            if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                img.save(out_buf, format="PNG", optimize=True)
                return out_buf.getvalue(), "image/png", ".png", img.width, img.height
            else:
                img.save(out_buf, format="WEBP", quality=90, method=6)
                return out_buf.getvalue(), "image/webp", ".webp", img.width, img.height

        # General fallback
        out_buf = io.BytesIO()
        img.save(out_buf, format="PNG", optimize=True)
        return out_buf.getvalue(), "image/png", ".png", img.width, img.height

    @staticmethod
    def upload_branding_asset(
        db: Session,
        file: UploadFile,
        asset_type: str,
        user_id: Optional[uuid.UUID] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Processes image, uploads to structured Cloudinary folder, deletes previous asset, and updates PostgreSQL.
        """
        valid_types = {"logo", "favicon", "apple_touch_icon", "login_logo", "public_logo"}
        if asset_type not in valid_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid asset type '{asset_type}'. Must be one of: {', '.join(valid_types)}"
            )

        # 1. Process & optimize image
        proc_bytes, mime_type, ext, width, height = BrandingService.validate_and_process_image(file, asset_type)

        # 2. Prepare Cloudinary folder & public_id
        folder = f"foundation/branding/{asset_type}"
        timestamp = int(time.time())
        public_id = f"branding_{asset_type}_{timestamp}_{uuid.uuid4().hex[:6]}"

        upload_options: Dict[str, Any] = {
            "folder": folder,
            "public_id": public_id,
            "resource_type": "image",
            "overwrite": True,
            "tags": ["branding", f"branding_{asset_type}"]
        }

        try:
            upload_result = cloudinary.uploader.upload(proc_bytes, **upload_options)
            secure_url = upload_result["secure_url"]
            # Add cache buster query parameter to guarantee instant live refresh
            cache_busted_url = f"{secure_url}?v={timestamp}"
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Cloudinary upload failed: {str(e)}"
            )

        # 3. Update SystemSetting record
        record = BrandingService.get_or_seed_branding_setting(db)
        current_data = dict(record.config_data or DEFAULT_BRANDING_CONFIG)

        old_public_id = current_data.get(f"{asset_type}_public_id")

        current_data[f"{asset_type}_url"] = cache_busted_url
        current_data[f"{asset_type}_public_id"] = upload_result["public_id"]
        current_data[f"{asset_type}_filename"] = file.filename or f"{asset_type}{ext}"
        current_data[f"{asset_type}_filesize"] = len(proc_bytes)
        current_data["updated_at"] = datetime.now(timezone.utc).isoformat()

        record.config_data = current_data
        record.updated_by = user_id
        record.updated_at = datetime.now(timezone.utc)

        # Also keep general and profile settings in sync if main logo changed
        if asset_type == "logo":
            gen_setting = db.query(SystemSetting).filter(SystemSetting.section == "general").first()
            if gen_setting and gen_setting.config_data:
                gen_data = dict(gen_setting.config_data)
                gen_data["logo_url"] = cache_busted_url
                gen_setting.config_data = gen_data

            prof_setting = db.query(SystemSetting).filter(SystemSetting.section == "profile").first()
            if prof_setting and prof_setting.config_data:
                prof_data = dict(prof_setting.config_data)
                prof_data["logo_url"] = cache_busted_url
                prof_setting.config_data = prof_data

        # 4. Clean up old asset from Cloudinary
        if old_public_id and old_public_id != upload_result["public_id"]:
            CloudinaryService.delete_asset(old_public_id)

        AuditService.log(
            db=db,
            action=f"BRANDING_{asset_type.upper()}_UPDATED",
            entity_name="branding",
            entity_id=asset_type,
            new_values={
                "asset_type": asset_type,
                "url": cache_busted_url,
                "public_id": upload_result["public_id"],
                "filename": file.filename
            },
            user_id=user_id,
            ip_address=ip_address
        )

        db.commit()
        db.refresh(record)

        return BrandingService.get_full_branding(db)

    @staticmethod
    def delete_branding_asset(
        db: Session,
        asset_type: str,
        user_id: Optional[uuid.UUID] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Deletes a branding asset from Cloudinary and clears its database record.
        """
        valid_types = {"logo", "favicon", "apple_touch_icon", "login_logo", "public_logo"}
        if asset_type not in valid_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid asset type '{asset_type}'."
            )

        record = BrandingService.get_or_seed_branding_setting(db)
        current_data = dict(record.config_data or DEFAULT_BRANDING_CONFIG)

        old_public_id = current_data.get(f"{asset_type}_public_id")
        if old_public_id:
            CloudinaryService.delete_asset(old_public_id)

        current_data[f"{asset_type}_url"] = ""
        current_data[f"{asset_type}_public_id"] = ""
        current_data[f"{asset_type}_filename"] = ""
        current_data[f"{asset_type}_filesize"] = 0
        current_data["updated_at"] = datetime.now(timezone.utc).isoformat()

        record.config_data = current_data
        record.updated_by = user_id
        record.updated_at = datetime.now(timezone.utc)

        # Clear synced logo in general/profile if logo is deleted
        if asset_type == "logo":
            gen_setting = db.query(SystemSetting).filter(SystemSetting.section == "general").first()
            if gen_setting and gen_setting.config_data:
                gen_data = dict(gen_setting.config_data)
                gen_data["logo_url"] = ""
                gen_setting.config_data = gen_data

            prof_setting = db.query(SystemSetting).filter(SystemSetting.section == "profile").first()
            if prof_setting and prof_setting.config_data:
                prof_data = dict(prof_setting.config_data)
                prof_data["logo_url"] = ""
                prof_setting.config_data = prof_data

        AuditService.log(
            db=db,
            action=f"BRANDING_{asset_type.upper()}_DELETED",
            entity_name="branding",
            entity_id=asset_type,
            new_values={"asset_type": asset_type, "removed": True},
            user_id=user_id,
            ip_address=ip_address
        )

        db.commit()
        db.refresh(record)

        return BrandingService.get_full_branding(db)

    @staticmethod
    def update_branding_text(
        db: Session,
        foundation_name: Optional[str] = None,
        tagline: Optional[str] = None,
        user_id: Optional[uuid.UUID] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Updates text properties of branding (Foundation Name, Tagline) and syncs with general settings.
        """
        record = BrandingService.get_or_seed_branding_setting(db)
        current_data = dict(record.config_data or DEFAULT_BRANDING_CONFIG)

        if foundation_name is not None:
            clean_name = foundation_name.strip()
            if not clean_name:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Foundation Name cannot be empty.")
            current_data["foundation_name"] = clean_name

            # Sync with general and profile settings
            gen_setting = db.query(SystemSetting).filter(SystemSetting.section == "general").first()
            if gen_setting and gen_setting.config_data:
                gen_data = dict(gen_setting.config_data)
                gen_data["foundation_name"] = clean_name
                gen_setting.config_data = gen_data

            prof_setting = db.query(SystemSetting).filter(SystemSetting.section == "profile").first()
            if prof_setting and prof_setting.config_data:
                prof_data = dict(prof_setting.config_data)
                prof_data["foundation_name"] = clean_name
                prof_setting.config_data = prof_data

        if tagline is not None:
            current_data["tagline"] = tagline.strip()
            prof_setting = db.query(SystemSetting).filter(SystemSetting.section == "profile").first()
            if prof_setting and prof_setting.config_data:
                prof_data = dict(prof_setting.config_data)
                prof_data["tagline"] = tagline.strip()
                prof_setting.config_data = prof_data

        current_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        record.config_data = current_data
        record.updated_by = user_id
        record.updated_at = datetime.now(timezone.utc)

        AuditService.log(
            db=db,
            action="BRANDING_TEXT_UPDATED",
            entity_name="branding",
            entity_id="text",
            new_values={"foundation_name": current_data.get("foundation_name"), "tagline": current_data.get("tagline")},
            user_id=user_id,
            ip_address=ip_address
        )

        db.commit()
        db.refresh(record)

        return BrandingService.get_full_branding(db)
