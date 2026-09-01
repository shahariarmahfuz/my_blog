from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class PermissionBase(BaseModel):
    code: str
    name: str
    module: str
    description: Optional[str] = None

class PermissionOut(PermissionBase):
    id: UUID
    created_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None

class RoleCreate(RoleBase):
    permission_ids: Optional[List[UUID]] = []

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permission_ids: Optional[List[UUID]] = None

class RolePermissionsUpdate(BaseModel):
    permission_ids: List[UUID]

class RoleOut(RoleBase):
    id: UUID
    is_system: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class RoleWithPermissionsOut(RoleOut):
    permissions: List[PermissionOut] = []
    
    model_config = ConfigDict(from_attributes=True)
