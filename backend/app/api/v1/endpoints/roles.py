from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_permission, get_client_ip
from app.models.user import User
from app.models.rbac import Role, Permission
from app.schemas.rbac import RoleOut, RoleWithPermissionsOut, RoleCreate, RoleUpdate, RolePermissionsUpdate, PermissionOut
from app.services.audit_service import AuditService

router = APIRouter()

@router.get("/permissions", response_model=List[PermissionOut])
@router.get("/permissions/all", response_model=List[PermissionOut])
def list_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("roles.view"))
):
    return db.query(Permission).order_by(Permission.module, Permission.code).all()

@router.get("", response_model=List[RoleWithPermissionsOut])
def list_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("roles.view"))
):
    return db.query(Role).order_by(Role.name).all()

@router.get("/{role_id}", response_model=RoleWithPermissionsOut)
def get_role(
    role_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("roles.view"))
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found.")
    return role

@router.post("", response_model=RoleWithPermissionsOut, status_code=status.HTTP_201_CREATED)
def create_role(
    request: Request,
    role_in: RoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("roles.create"))
):
    existing = db.query(Role).filter(Role.name == role_in.name.strip()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role name already exists.")

    role = Role(
        name=role_in.name.strip(),
        description=role_in.description,
        is_system=False
    )
    
    if role_in.permission_ids:
        permissions = db.query(Permission).filter(Permission.id.in_(role_in.permission_ids)).all()
        role.permissions = permissions

    db.add(role)
    db.commit()
    db.refresh(role)

    AuditService.log(
        db=db,
        action="CREATE",
        entity_name="roles",
        entity_id=str(role.id),
        new_values={"name": role.name, "description": role.description, "permissions_count": len(role.permissions)},
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )
    db.commit()
    return role

@router.patch("/{role_id}", response_model=RoleWithPermissionsOut)
def update_role(
    request: Request,
    role_id: UUID,
    role_in: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("roles.edit"))
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found.")

    if role_in.name is not None and role_in.name.strip() != role.name:
        existing = db.query(Role).filter(Role.name == role_in.name.strip()).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role with this name already exists.")
        role.name = role_in.name.strip()

    if role_in.description is not None:
        role.description = role_in.description

    if role_in.permission_ids is not None:
        permissions = db.query(Permission).filter(Permission.id.in_(role_in.permission_ids)).all()
        role.permissions = permissions

    db.commit()
    db.refresh(role)

    AuditService.log(
        db=db,
        action="UPDATE",
        entity_name="roles",
        entity_id=str(role.id),
        new_values={"name": role.name, "description": role.description, "permissions_count": len(role.permissions)},
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )
    db.commit()
    return role

@router.put("/{role_id}/permissions", response_model=RoleWithPermissionsOut)
def update_role_permissions(
    request: Request,
    role_id: UUID,
    perm_in: RolePermissionsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("roles.edit"))
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found.")

    permissions = db.query(Permission).filter(Permission.id.in_(perm_in.permission_ids)).all()
    role.permissions = permissions
    db.commit()
    db.refresh(role)

    AuditService.log(
        db=db,
        action="UPDATE_PERMISSIONS",
        entity_name="roles",
        entity_id=str(role.id),
        new_values={"permissions_count": len(role.permissions)},
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )
    db.commit()
    return role

@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(
    request: Request,
    role_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("roles.delete"))
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found.")
    if role.is_system:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete a system role.")
    if len(role.users) > 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete a role currently assigned to users.")

    db.delete(role)
    db.commit()

    AuditService.log(
        db=db,
        action="DELETE",
        entity_name="roles",
        entity_id=str(role_id),
        old_values={"name": role.name},
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )
    db.commit()
    return None
