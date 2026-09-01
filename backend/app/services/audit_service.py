import json
from decimal import Decimal
from datetime import datetime, date
from uuid import UUID
from typing import Optional, Any
from sqlalchemy.orm import Session
from app.models.audit import AuditLog

def json_serializer(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, UUID):
        return str(obj)
    raise TypeError(f"Type {type(obj)} not serializable")

class AuditService:
    @staticmethod
    def log(
        db: Session,
        action: str,
        entity_name: str,
        entity_id: Optional[str] = None,
        old_values: Optional[Any] = None,
        new_values: Optional[Any] = None,
        user_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        # Convert values to JSON-compatible dicts if needed
        serialized_old = None
        serialized_new = None
        
        if old_values is not None:
            if isinstance(old_values, dict):
                serialized_old = json.loads(json.dumps(old_values, default=json_serializer))
            else:
                serialized_old = str(old_values)
                
        if new_values is not None:
            if isinstance(new_values, dict):
                serialized_new = json.loads(json.dumps(new_values, default=json_serializer))
            else:
                serialized_new = str(new_values)
                
        log_entry = AuditLog(
            user_id=user_id,
            action=action,
            entity_name=entity_name,
            entity_id=str(entity_id) if entity_id else None,
            old_values=serialized_old,
            new_values=serialized_new,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(log_entry)
        return log_entry
