import os
import io
import uuid
import time
from typing import Optional, Tuple
from fastapi import UploadFile, HTTPException, status
from PIL import Image, ImageOps

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "avatars"))
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"}
TARGET_AVATAR_SIZE = (512, 512)

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

class ImageService:
    @staticmethod
    def validate_and_optimize_avatar(file: UploadFile, user_id: str) -> str:
        """
        Validates an uploaded avatar image, optimizes it via Pillow,
        strips metadata, converts to high-efficiency WebP, and saves to storage.
        Returns the relative static URL for database storage.
        """
        # 1. Check Content-Type
        if file.content_type and file.content_type.lower() not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid image format '{file.content_type}'. Allowed formats: JPEG, PNG, WebP, GIF."
            )

        # 2. Read bytes and check size
        contents = file.file.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image file size exceeds maximum limit of 5MB (Received {len(contents) / (1024*1024):.2f}MB)."
            )

        if len(contents) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty image file received."
            )

        # 3. Open image with Pillow and verify integrity
        try:
            image = Image.open(io.BytesIO(contents))
            image.verify()  # Verifies file headers
            # Reopen for processing because verify() corrupts internal stream state
            image = Image.open(io.BytesIO(contents))
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Corrupted or invalid image file."
            )

        # 4. Auto-orient based on EXIF tag if present
        try:
            image = ImageOps.exif_transpose(image)
        except Exception:
            pass

        # 5. Convert mode for WebP compatibility
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA" if "A" in image.mode or image.info.get("transparency") is not None else "RGB")

        # 6. Center crop to square and resize to target dimension (512x512)
        width, height = image.size
        min_dim = min(width, height)
        left = (width - min_dim) / 2
        top = (height - min_dim) / 2
        right = (width + min_dim) / 2
        bottom = (height + min_dim) / 2

        # Crop to square
        image = image.crop((left, top, right, bottom))
        
        # Resize smoothly using Lanczos antialiasing
        image = image.resize(TARGET_AVATAR_SIZE, Image.Resampling.LANCZOS)

        # 7. Generate clean unique filename
        filename = f"avatar_{user_id}_{int(time.time())}_{uuid.uuid4().hex[:8]}.webp"
        filepath = os.path.join(UPLOAD_DIR, filename)

        # 8. Save optimized WebP image (EXIF stripped by default)
        try:
            image.save(filepath, "WEBP", quality=85, method=6, optimize=True)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to process and save avatar: {str(e)}"
            )

        # Return relative URL
        return f"/uploads/avatars/{filename}"

    @staticmethod
    def remove_avatar_file(avatar_url: Optional[str]) -> None:
        """Removes an avatar file from the local storage directory if it exists."""
        if not avatar_url or not avatar_url.startswith("/uploads/avatars/"):
            return
        
        filename = os.path.basename(avatar_url)
        filepath = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except OSError:
                pass
