from typing import Dict, Any
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_permission, get_client_ip
from app.models.user import User
from app.models.setting import SystemSetting
from app.schemas.setting import SettingSectionOut, SettingSectionUpdate, AllSettingsOut
from app.services.audit_service import AuditService

router = APIRouter()

DEFAULT_SETTINGS: Dict[str, Dict[str, Any]] = {
    "general": {
        "foundation_name": "Al-Khair Foundation",
        "logo_url": "",
        "currency": "BDT (৳)",
        "timezone": "Asia/Dhaka (GMT+6)",
        "date_format": "YYYY-MM-DD",
        "language": "English (en-US)",
        "theme_preference": "dark"
    },
    "profile": {
        "foundation_name": "Al-Khair Foundation",
        "tagline": "Empowering Communities through Islamic Microfinance & Sadaqah",
        "logo_url": "",
        "description": "Non-profit foundation providing interest-free Qard Hasan revolving micro-credit and humanitarian emergency assistance.",
        "registration_number": "FD-REG-2024-8839",
        "established_year": "2020",
        "address": "House #42, Road #11, Banani, Dhaka-1213, Bangladesh",
        "phone": "+880 1711-000000",
        "email": "contact@foundation.org",
        "website": "https://foundation.org",
        "tax_id": "TIN-994827104"
    },
    "financial": {
        "currency_code": "BDT",
        "currency_symbol": "৳",
        "decimal_precision": 2,
        "rounding_mode": "HALF_UP",
        "fiscal_year_start": "07-01",
        "fiscal_year_end": "06-30",
        "receipt_prefix_contribution": "CON",
        "receipt_prefix_qard_hasan": "QH",
        "receipt_prefix_sadaqah": "SD",
        "receipt_prefix_repayment": "REP",
        "strict_double_entry_enforcement": True
    },
    "contributions": {
        "default_monthly_contribution": 500.0,
        "default_frequency": "MONTHLY",
        "monthly_due_day": 10,
        "grace_period_days": 5,
        "overdue_threshold_days": 35,
        "allow_partial_contributions": True,
        "require_receipt_reference": False,
        "auto_receipt_generation": True
    },
    "assistance": {
        "qard_hasan_interest_rate": 0.00,
        "qard_hasan_max_tenure_months": 24,
        "default_installments_count": 6,
        "default_installment_interval": 1,
        "allow_multi_group_funding": True,
        "require_guarantor": False,
        "sadaqah_categories": ["Emergency Medical", "Disaster Relief", "Education Stipend", "Widow Support", "Orphan Care", "General Aid"],
        "sadaqah_is_recoverable": False
    },
    "notifications": {
        "notify_due_contributions": True,
        "notify_overdue_repayments": True,
        "notify_disbursements": True,
        "email_notifications_enabled": False,
        "sms_notifications_enabled": False,
        "sender_email": "no-reply@foundation.org",
        "admin_alert_email": "admin@foundation.org"
    },
    "system": {
        "system_name": "Foundation Financial Management System",
        "version": "v2.0.0",
        "maintenance_mode": False,
        "audit_logging_enabled": True,
        "session_timeout_minutes": 1440,
        "backup_frequency": "DAILY",
        "last_backup_timestamp": "2026-08-30T23:59:59Z",
        "database_engine": "PostgreSQL (Neon Serverless)",
        "backend_framework": "FastAPI + SQLAlchemy 2.0"
    },
    "branding": {
        "foundation_name": "Al-Khair Foundation",
        "tagline": "Empowering Communities through Islamic Microfinance & Sadaqah",
        "logo_url": "",
        "logo_public_id": "",
        "logo_filename": "",
        "logo_filesize": 0,
        "favicon_url": "",
        "favicon_public_id": "",
        "favicon_filename": "",
        "favicon_filesize": 0,
        "apple_touch_icon_url": "",
        "apple_touch_icon_public_id": "",
        "apple_touch_icon_filename": "",
        "apple_touch_icon_filesize": 0,
        "login_logo_url": "",
        "login_logo_public_id": "",
        "login_logo_filename": "",
        "login_logo_filesize": 0,
        "public_logo_url": "",
        "public_logo_public_id": "",
        "public_logo_filename": "",
        "public_logo_filesize": 0
    }
}

def get_or_seed_setting(db: Session, section: str) -> Dict[str, Any]:
    record = db.query(SystemSetting).filter(SystemSetting.section == section).first()
    if not record:
        default_data = DEFAULT_SETTINGS.get(section, {})
        record = SystemSetting(section=section, config_data=default_data)
        db.add(record)
        db.commit()
        db.refresh(record)
    return record.config_data

@router.get("", response_model=AllSettingsOut)
def get_all_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("settings.view"))
):
    """
    Returns all configuration sections for the foundation management system.
    """
    sections = ["general", "profile", "financial", "contributions", "assistance", "notifications", "system", "branding"]
    result = {}
    for sec in sections:
        result[sec] = get_or_seed_setting(db, sec)
    return AllSettingsOut(**result)

@router.get("/{section}", response_model=SettingSectionOut)
def get_section_setting(
    section: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("settings.view"))
):
    if section not in DEFAULT_SETTINGS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Settings section '{section}' does not exist.")

    record = db.query(SystemSetting).filter(SystemSetting.section == section).first()
    if not record:
        default_data = DEFAULT_SETTINGS.get(section, {})
        record = SystemSetting(section=section, config_data=default_data)
        db.add(record)
        db.commit()
        db.refresh(record)

    return SettingSectionOut(
        section=record.section,
        config_data=record.config_data,
        updated_at=record.updated_at,
        updated_by=record.updated_by
    )

@router.put("/{section}", response_model=SettingSectionOut)
def update_section_setting(
    request: Request,
    section: str,
    setting_in: SettingSectionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("settings.edit"))
):
    if section not in DEFAULT_SETTINGS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Settings section '{section}' does not exist.")

    # Restrict system settings to Super Admin only
    if section == "system" and current_user.role.name != "Super Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Super Administrators can modify System Settings.")

    # Guard: Qard Hasan must NEVER have interest
    if section == "assistance":
        setting_in.config_data["qard_hasan_interest_rate"] = 0.00
        setting_in.config_data["sadaqah_is_recoverable"] = False

    record = db.query(SystemSetting).filter(SystemSetting.section == section).first()
    if not record:
        record = SystemSetting(section=section, config_data=setting_in.config_data, updated_by=current_user.id)
        db.add(record)
    else:
        # Merge with existing
        merged = dict(record.config_data)
        merged.update(setting_in.config_data)
        record.config_data = merged
        record.updated_by = current_user.id
        record.updated_at = datetime.now(timezone.utc)

    AuditService.log(
        db=db,
        action="UPDATE",
        entity_name="system_settings",
        entity_id=section,
        new_values=setting_in.config_data,
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )

    db.commit()
    db.refresh(record)

    return SettingSectionOut(
        section=record.section,
        config_data=record.config_data,
        updated_at=record.updated_at,
        updated_by=record.updated_by
    )
