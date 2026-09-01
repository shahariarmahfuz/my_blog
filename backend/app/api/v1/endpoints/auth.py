from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.dependencies import get_current_user, get_client_ip
from app.models.user import User
from app.schemas.user import (
    LoginRequest, Token, UserProfileOut, PasswordChangeRequest,
    UserProfileUpdate, ProfilePictureOut
)
from app.services.audit_service import AuditService
from app.services.image_service import ImageService

router = APIRouter()

@router.post("/login", response_model=Token)
def login(request: Request, login_data: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate staff user by username and return JWT access token."""
    username_clean = login_data.username.lower().strip()
    user = db.query(User).filter(User.username == username_clean).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password."
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact your system administrator."
        )
        
    # Update last login time
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    
    # Audit log
    AuditService.log(
        db=db,
        action="LOGIN",
        entity_name="users",
        entity_id=str(user.id),
        new_values={
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "remember_me": login_data.remember_me
        },
        user_id=user.id,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent")
    )
    db.commit()
    
    # Token duration: 30 days if remember_me else 1 day (24h)
    expires_days = 30 if login_data.remember_me else 1
    expires_delta = timedelta(days=expires_days)
    access_token = create_access_token(subject=user.id, expires_delta=expires_delta)
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user,
        expires_in_days=expires_days
    )

@router.get("/me", response_model=UserProfileOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user profile and permissions."""
    return current_user

@router.patch("/profile", response_model=UserProfileOut)
def update_my_profile(
    profile_in: UserProfileUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update own profile information.
    User is strictly prohibited from modifying their own role, permissions, or activation state.
    """
    old_values = {
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "email": current_user.email
    }
    
    if profile_in.email and profile_in.email.lower() != current_user.email:
        # Check email uniqueness
        existing = db.query(User).filter(User.email == profile_in.email.lower(), User.id != current_user.id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already taken by another account."
            )
        current_user.email = profile_in.email.lower()
        
    if profile_in.full_name is not None:
        current_user.full_name = profile_in.full_name.strip()
        
    if profile_in.phone is not None:
        current_user.phone = profile_in.phone.strip() if profile_in.phone else None
        
    current_user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(current_user)
    
    AuditService.log(
        db=db,
        action="PROFILE_UPDATED",
        entity_name="users",
        entity_id=str(current_user.id),
        old_values=old_values,
        new_values={
            "full_name": current_user.full_name,
            "phone": current_user.phone,
            "email": current_user.email
        },
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )
    db.commit()
    
    return current_user

from app.services.cloudinary_service import CloudinaryService
from app.models.file_document import FileDocument

@router.post("/profile-picture", response_model=ProfilePictureOut)
def upload_my_profile_picture(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload and optimize profile picture to Cloudinary.
    Validates, crops, resizes to 512x512, converts to WebP, and stores in Cloudinary + PostgreSQL.
    """
    old_avatar_url = current_user.profile_picture
    
    # 1. Upload to Cloudinary with automatic avatar transformations
    upload_data = CloudinaryService.upload_avatar(file, str(current_user.id))
    new_avatar_url = upload_data["secure_url"]
    new_public_id = upload_data["cloudinary_public_id"]
    
    # 2. Cleanup old Cloudinary avatar asset if tracked in DB
    old_doc = db.query(FileDocument).filter(
        FileDocument.entity_type == "user_avatar",
        FileDocument.entity_id == str(current_user.id)
    ).first()
    
    if old_doc:
        CloudinaryService.delete_asset(old_doc.cloudinary_public_id)
        # Update existing record
        old_doc.cloudinary_public_id = new_public_id
        old_doc.secure_url = new_avatar_url
        old_doc.original_filename = upload_data["original_filename"]
        old_doc.format = upload_data["format"]
        old_doc.mime_type = upload_data["mime_type"]
        old_doc.file_size = upload_data["file_size"]
        old_doc.width = upload_data["width"]
        old_doc.height = upload_data["height"]
        old_doc.folder = upload_data["folder"]
        old_doc.updated_at = datetime.now(timezone.utc)
    else:
        # Create new FileDocument record
        new_doc = FileDocument(
            entity_type="user_avatar",
            entity_id=str(current_user.id),
            original_filename=upload_data["original_filename"],
            cloudinary_public_id=new_public_id,
            secure_url=new_avatar_url,
            resource_type="image",
            format=upload_data["format"],
            mime_type=upload_data["mime_type"],
            file_size=upload_data["file_size"],
            width=upload_data["width"],
            height=upload_data["height"],
            folder=upload_data["folder"],
            visibility="PUBLIC",
            uploaded_by=current_user.id
        )
        db.add(new_doc)
        
    db_user = db.query(User).filter(User.id == current_user.id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    db_user.profile_picture = new_avatar_url
    db_user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(db_user)
    
    AuditService.log(
        db=db,
        action="PROFILE_PICTURE_UPLOADED",
        entity_name="users",
        entity_id=str(db_user.id),
        new_values={
            "profile_picture": new_avatar_url,
            "cloudinary_public_id": new_public_id
        },
        user_id=db_user.id,
        ip_address=get_client_ip(request)
    )
    db.commit()
    
    return ProfilePictureOut(
        profile_picture=new_avatar_url,
        message="Profile picture uploaded and optimized to Cloudinary successfully."
    )

@router.delete("/profile-picture", response_model=ProfilePictureOut)
def remove_my_profile_picture(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove current profile picture from Cloudinary and database."""
    db_user = db.query(User).filter(User.id == current_user.id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if db_user.profile_picture:
        # 1. Cleanup Cloudinary asset & DB record
        old_doc = db.query(FileDocument).filter(
            FileDocument.entity_type == "user_avatar",
            FileDocument.entity_id == str(db_user.id)
        ).first()
        
        if old_doc:
            CloudinaryService.delete_asset(old_doc.cloudinary_public_id)
            db.delete(old_doc)
            
        db_user.profile_picture = None
        db_user.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(db_user)
        
        AuditService.log(
            db=db,
            action="PROFILE_PICTURE_REMOVED",
            entity_name="users",
            entity_id=str(db_user.id),
            new_values={"profile_picture": None},
            user_id=db_user.id,
            ip_address=get_client_ip(request)
        )
        db.commit()
        
    return ProfilePictureOut(
        profile_picture=None,
        message="Profile picture removed successfully."
    )

@router.post("/change-password")
def change_password(
    pwd_data: PasswordChangeRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change current user's password securely."""
    if not verify_password(pwd_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password does not match our records."
        )
        
    if pwd_data.confirm_new_password and pwd_data.new_password != pwd_data.confirm_new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password and confirmation password do not match."
        )
        
    if len(pwd_data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long."
        )
        
    current_user.hashed_password = get_password_hash(pwd_data.new_password)
    current_user.updated_at = datetime.now(timezone.utc)
    db.commit()
    
    AuditService.log(
        db=db,
        action="PASSWORD_CHANGED",
        entity_name="users",
        entity_id=str(current_user.id),
        new_values={"action": "PASSWORD_UPDATED"},
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )
    db.commit()
    
    return {"message": "Password changed successfully."}

@router.post("/logout")
def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Logout current user session and record audit log."""
    AuditService.log(
        db=db,
        action="LOGOUT",
        entity_name="users",
        entity_id=str(current_user.id),
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )
    db.commit()
    return {"message": "Logged out successfully."}
