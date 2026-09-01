from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash
from app.core.dependencies import get_current_user, require_permission, get_client_ip
from app.models.user import User
from app.models.rbac import Role
from app.schemas.user import UserCreate, UserUpdate, UserOut
from app.services.audit_service import AuditService

router = APIRouter()

@router.get("", response_model=List[UserOut])
def list_users(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    role_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users.view"))
):
    query = db.query(User)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (User.username.ilike(search_pattern)) |
            (User.full_name.ilike(search_pattern)) |
            (User.email.ilike(search_pattern))
        )
    if role_id:
        query = query.filter(User.role_id == role_id)
    return query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()

@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users.view"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return user

@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    request: Request,
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users.create"))
):
    clean_username = user_in.username.lower().strip()
    existing_username = db.query(User).filter(User.username == clean_username).first()
    if existing_username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username is already registered.")
        
    clean_email = user_in.email.lower().strip() if user_in.email else None
    if clean_email:
        existing_email = db.query(User).filter(User.email == clean_email).first()
        if existing_email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already registered.")
        
    if user_in.role_id:
        role = db.query(Role).filter(Role.id == user_in.role_id).first()
        if not role:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Specified role does not exist.")

    user = User(
        username=clean_username,
        email=clean_email,
        full_name=user_in.full_name.strip(),
        hashed_password=get_password_hash(user_in.password),
        role_id=user_in.role_id,
        is_active=user_in.is_active,
        phone=user_in.phone
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    AuditService.log(
        db=db,
        action="CREATE",
        entity_name="users",
        entity_id=str(user.id),
        new_values={
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role_id": str(user.role_id)
        },
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )
    db.commit()
    return user

@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    request: Request,
    user_id: UUID,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users.edit"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    old_data = {
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "role_id": str(user.role_id),
        "is_active": user.is_active
    }

    if user_in.username is not None:
        clean_username = user_in.username.lower().strip()
        if clean_username != user.username:
            existing = db.query(User).filter(User.username == clean_username, User.id != user.id).first()
            if existing:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username is already in use.")
            user.username = clean_username

    if user_in.email is not None:
        clean_email = user_in.email.lower().strip() if user_in.email else None
        if clean_email != user.email:
            if clean_email:
                existing = db.query(User).filter(User.email == clean_email, User.id != user.id).first()
                if existing:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already in use.")
            user.email = clean_email

    if user_in.full_name is not None:
        user.full_name = user_in.full_name.strip()
    if user_in.phone is not None:
        user.phone = user_in.phone
    if user_in.is_active is not None:
        user.is_active = user_in.is_active
    if user_in.role_id is not None:
        role = db.query(Role).filter(Role.id == user_in.role_id).first()
        if not role:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role does not exist.")
        user.role_id = user_in.role_id
    if user_in.password:
        user.hashed_password = get_password_hash(user_in.password)

    db.commit()
    db.refresh(user)

    AuditService.log(
        db=db,
        action="UPDATE",
        entity_name="users",
        entity_id=str(user.id),
        old_values=old_data,
        new_values={
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role_id": str(user.role_id),
            "is_active": user.is_active
        },
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )
    db.commit()
    return user
