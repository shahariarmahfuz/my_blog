from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class SettingSectionOut(BaseModel):
    section: str
    config_data: Dict[str, Any]
    updated_at: Optional[datetime] = None
    updated_by: Optional[UUID] = None

    model_config = ConfigDict(from_attributes=True)

class SettingSectionUpdate(BaseModel):
    config_data: Dict[str, Any]

class AllSettingsOut(BaseModel):
    general: Dict[str, Any]
    profile: Dict[str, Any]
    financial: Dict[str, Any]
    contributions: Dict[str, Any]
    assistance: Dict[str, Any]
    notifications: Dict[str, Any]
    system: Dict[str, Any]
    branding: Optional[Dict[str, Any]] = None
