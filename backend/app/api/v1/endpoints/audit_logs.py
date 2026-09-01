from typing import List, Optional
from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_permission
from app.models.user import User
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogOut

router = APIRouter()

@router.get("", response_model=List[AuditLogOut])
def list_audit_logs(
    skip: int = 0,
    limit: int = 50,
    user_id: Optional[UUID] = None,
    action: Optional[str] = None,
    entity_name: Optional[str] = None,
    entity_id: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("audit_logs.view"))
):
    query = db.query(AuditLog).outerjoin(User, User.id == AuditLog.user_id)

    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if action:
        query = query.filter(AuditLog.action == action)
    if entity_name:
        query = query.filter(AuditLog.entity_name == entity_name)
    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)
    if from_date:
        query = query.filter(AuditLog.created_at >= from_date)
    if to_date:
        query = query.filter(AuditLog.created_at <= to_date)

    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for log in logs:
        out = AuditLogOut.model_validate(log)
        out.user_name = log.user.full_name if log.user else "System"
        result.append(out)
    return result
