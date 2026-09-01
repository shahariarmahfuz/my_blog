from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict, Field
from app.schemas.rbac import RoleWithPermissionsOut, RoleOut

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=100, description="Unique login username")
    email: Optional[EmailStr] = None
    full_name: str
    phone: Optional[str] = None
    profile_picture: Optional[str] = None
    role_id: Optional[UUID] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, description="Initial account password")

class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=100)
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    profile_picture: Optional[str] = None
    role_id: Optional[UUID] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6)

class UserProfileUpdate(BaseModel):
    """Fields that authenticated users are allowed to edit on their own profile."""
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[EmailStr] = None

class UserOut(UserBase):
    id: UUID
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    role: Optional[RoleOut] = None
    
    model_config = ConfigDict(from_attributes=True)

class UserProfileOut(UserOut):
    role: Optional[RoleWithPermissionsOut] = None

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, description="Login username")
    password: str
    remember_me: bool = False

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserProfileOut
    expires_in_days: int = 1

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None

class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6, description="Minimum 6 characters")
    confirm_new_password: Optional[str] = None

class ProfilePictureOut(BaseModel):
    profile_picture: Optional[str]
    message: str
