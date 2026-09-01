import io
import os
import time
import uuid
from typing import Optional, Dict, Any, Tuple
from fastapi import UploadFile, HTTPException, status
from PIL import Image
import cloudinary
import cloudinary.uploader
import cloudinary.api
import cloudinary.utils

from app.core.config import settings

# Initialize Cloudinary once with backend credentials
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True
)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"}
ALLOWED_DOCUMENT_TYPES = {"application/pdf"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf"}

DANGEROUS_EXTENSIONS = {
    ".sh", ".bash", ".exe", ".bat", ".cmd", ".ps1", ".py", ".pyc",
    ".js", ".jsx", ".ts", ".tsx", ".php", ".phtml", ".html", ".htm",
    ".jar", ".war", ".bin", ".elf", ".vbs", ".msi", ".dll", ".so"
}

MAX_AVATAR_SIZE = 5 * 1024 * 1024       # 5 MB
MAX_IMAGE_SIZE = 10 * 1024 * 1024       # 10 MB
MAX_DOCUMENT_SIZE = 15 * 1024 * 1024    # 15 MB

class CloudinaryService:
    @staticmethod
    def get_folder_for_entity(entity_type: str, entity_id: Optional[str] = None) -> str:
        """Determines the structured Cloudinary folder for an entity."""
        normalized_type = entity_type.lower().strip().replace("-", "_")
        clean_id = entity_id.strip() if entity_id else "unassigned"

        folder_mapping = {
            "user_avatar": f"foundation/users/{clean_id}/avatars",
            "user": f"foundation/users/{clean_id}",
            "member": f"foundation/members/{clean_id}",
            "beneficiary": f"foundation/beneficiaries/{clean_id}",
            "member_application": f"foundation/member-applications/{clean_id}",
            "assistance": f"foundation/assistance/{clean_id}",
            "story": f"foundation/stories/{clean_id}",
            "receipt": "foundation/receipts",
            "general": "foundation/general"
        }
        return folder_mapping.get(normalized_type, f"foundation/{normalized_type}/{clean_id}")

    @staticmethod
    def validate_file_content(file: UploadFile, is_avatar: bool = False) -> Tuple[bytes, str, str]:
        """
        Validates file extension, MIME type, magic byte signatures, and file size.
        Returns: (contents_bytes, content_type, extension)
        """
        filename = file.filename or "file"
        _, ext = os.path.splitext(filename)
        ext = ext.lower()

        # 1. Reject dangerous extensions
        if ext in DANGEROUS_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Security violation: File type '{ext}' is prohibited."
            )

        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format '{ext}'. Allowed formats: JPG, PNG, WebP, GIF, PDF."
            )

        # 2. Read contents and check size limits
        contents = file.file.read()
        file_size = len(contents)

        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty file received."
            )

        max_limit = MAX_AVATAR_SIZE if is_avatar else (MAX_IMAGE_SIZE if ext != ".pdf" else MAX_DOCUMENT_SIZE)
        if file_size > max_limit:
            limit_mb = max_limit / (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size ({file_size / (1024 * 1024):.2f}MB) exceeds maximum limit of {int(limit_mb)}MB."
            )

        # 3. Validate content inspection (magic bytes)
        content_type = file.content_type or ""
        if ext == ".pdf":
            if not contents.startswith(b"%PDF"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or corrupted PDF document header."
                )
            content_type = "application/pdf"
        else:
            try:
                img = Image.open(io.BytesIO(contents))
                img.verify()
                format_lower = img.format.lower() if img.format else "jpeg"
                content_type = f"image/{format_lower}"
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Corrupted or invalid image data."
                )

        return contents, content_type, ext

    @classmethod
    def upload_avatar(cls, file: UploadFile, user_id: str) -> Dict[str, Any]:
        """
        Uploads and optimizes a user profile picture to Cloudinary.
        Applies automatic 512x512 face crop, WebP conversion, and quality optimization.
        """
        contents, content_type, ext = cls.validate_file_content(file, is_avatar=True)
        folder = cls.get_folder_for_entity("user_avatar", user_id)
        public_id_suffix = f"avatar_{int(time.time())}_{uuid.uuid4().hex[:6]}"

        try:
            upload_result = cloudinary.uploader.upload(
                contents,
                folder=folder,
                public_id=public_id_suffix,
                overwrite=True,
                resource_type="image",
                transformation=[
                    {"width": 512, "height": 512, "crop": "fill", "gravity": "face"},
                    {"quality": "auto:good"},
                    {"fetch_format": "webp"}
                ],
                tags=["user_avatar", f"user_{user_id}"]
            )

            return {
                "cloudinary_public_id": upload_result["public_id"],
                "secure_url": upload_result["secure_url"],
                "format": upload_result.get("format", "webp"),
                "resource_type": "image",
                "file_size": upload_result.get("bytes", len(contents)),
                "width": upload_result.get("width", 512),
                "height": upload_result.get("height", 512),
                "folder": folder,
                "mime_type": "image/webp",
                "original_filename": file.filename or "avatar.webp",
                "visibility": "PUBLIC"
            }
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Cloudinary upload failed: {str(e)}"
            )

    @classmethod
    def upload_file(
        cls,
        file: UploadFile,
        entity_type: str,
        entity_id: Optional[str] = None,
        visibility: str = "PRIVATE"
    ) -> Dict[str, Any]:
        """
        Uploads general media (images, PDF documents) to structured Cloudinary folders.
        """
        contents, content_type, ext = cls.validate_file_content(file, is_avatar=False)
        folder = cls.get_folder_for_entity(entity_type, entity_id)
        is_pdf = (ext == ".pdf")
        resource_type = "raw" if is_pdf else "image"
        clean_name = os.path.splitext(file.filename or "document")[0]
        public_id_suffix = f"{clean_name}_{int(time.time())}_{uuid.uuid4().hex[:6]}"

        upload_options: Dict[str, Any] = {
            "folder": folder,
            "public_id": public_id_suffix,
            "resource_type": resource_type,
            "tags": [entity_type, f"entity_{entity_id or 'none'}"],
        }

        if not is_pdf:
            # Automatically optimize images with quality and auto format
            upload_options["transformation"] = [
                {"quality": "auto:good"},
                {"fetch_format": "auto"}
            ]

        try:
            upload_result = cloudinary.uploader.upload(contents, **upload_options)

            return {
                "cloudinary_public_id": upload_result["public_id"],
                "secure_url": upload_result["secure_url"],
                "format": upload_result.get("format", ext.replace(".", "")),
                "resource_type": resource_type,
                "file_size": upload_result.get("bytes", len(contents)),
                "width": upload_result.get("width"),
                "height": upload_result.get("height"),
                "folder": folder,
                "mime_type": content_type,
                "original_filename": file.filename or "file",
                "visibility": visibility.upper()
            }
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Cloudinary file storage error: {str(e)}"
            )

    @staticmethod
    def delete_asset(public_id: Optional[str], resource_type: str = "image") -> bool:
        """Deletes an asset from Cloudinary."""
        if not public_id:
            return False
        try:
            res = cloudinary.uploader.destroy(public_id, resource_type=resource_type)
            return res.get("result") in ("ok", "not found")
        except Exception:
            return False

    @staticmethod
    def generate_signed_url(
        public_id: str,
        resource_type: str = "image",
        format: Optional[str] = None,
        expires_in_seconds: int = 3600
    ) -> str:
        """Generates a secure temporary signed URL for authorized access to private files."""
        try:
            url, _ = cloudinary.utils.cloudinary_url(
                public_id,
                resource_type=resource_type,
                format=format,
                sign_url=True,
                expires_at=int(time.time()) + expires_in_seconds,
                secure=True
            )
            return url
        except Exception:
            # Fallback to direct secure url
            return f"https://res.cloudinary.com/{settings.CLOUDINARY_CLOUD_NAME}/{resource_type}/upload/{public_id}"
