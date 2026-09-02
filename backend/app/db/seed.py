import sys
import os
from datetime import datetime, timezone
from uuid import uuid4

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models import Role, Permission, RolePermission, User, SystemSetting

PERMISSIONS_DATA = [
    # Users
    ("users.view", "View Users", "users", "View user accounts and profiles"),
    ("users.create", "Create User", "users", "Create new user accounts"),
    ("users.edit", "Edit User", "users", "Update user details and status"),
    ("users.delete", "Delete User", "users", "Deactivate or delete users"),
    
    # Roles & RBAC
    ("roles.view", "View Roles", "roles", "View roles and permission matrices"),
    ("roles.create", "Create Role", "roles", "Create new custom roles"),
    ("roles.edit", "Edit Role", "roles", "Update role permissions and details"),
    ("roles.delete", "Delete Role", "roles", "Delete custom roles"),
    
    # Groups
    ("groups.view", "View Groups", "groups", "View fund and accounting groups"),
    ("groups.create", "Create Group", "groups", "Create new fund group"),
    ("groups.edit", "Edit Group", "groups", "Update group details and status"),
    ("groups.delete", "Delete Group", "groups", "Deactivate group"),
    
    # Members
    ("members.view", "View Members", "members", "View member profiles and lists"),
    ("members.create", "Create Member", "members", "Register new members"),
    ("members.edit", "Edit Member", "members", "Update member information"),
    ("members.delete", "Delete Member", "members", "Deactivate member"),
    
    # Beneficiaries
    ("beneficiaries.view", "View Beneficiaries", "beneficiaries", "View beneficiary profiles"),
    ("beneficiaries.create", "Create Beneficiary", "beneficiaries", "Register assistance recipients"),
    ("beneficiaries.edit", "Edit Beneficiary", "beneficiaries", "Update beneficiary information"),
    ("beneficiaries.delete", "Delete Beneficiary", "beneficiaries", "Deactivate beneficiary"),
    
    # Contributions
    ("contributions.view", "View Contributions", "contributions", "View member contribution receipts"),
    ("contributions.create", "Create Contribution", "contributions", "Record new member contribution"),
    ("contributions.edit", "Edit Contribution", "contributions", "Update contribution details"),
    
    # Donations (External)
    ("donations.view", "View Donations", "donations", "View external non-member donations"),
    ("donations.create", "Create Donation", "donations", "Record external donation into external fund"),
    ("donations.edit", "Edit Donation", "donations", "Update external donation details"),
    ("donations.void", "Void Donation", "donations", "Void or reverse external donation receipts"),
    
    # Assistance (Qard Hasan & Sadaqah)
    ("assistance.view", "View Assistance", "assistance", "View assistance applications and disbursements"),
    ("assistance.create", "Create Assistance", "assistance", "Create Qard Hasan or Sadaqah request"),
    ("assistance.edit", "Edit Assistance", "assistance", "Update assistance details"),
    ("assistance.approve", "Approve Assistance", "assistance", "Approve and disburse assistance funds"),
    
    # Repayments
    ("repayments.view", "View Repayments", "repayments", "View Qard Hasan repayments and distributions"),
    ("repayments.create", "Record Repayment", "repayments", "Record Qard Hasan installment repayments"),
    
    # Reports & Audits
    ("reports.view", "View Reports", "reports", "View financial and operational reports"),
    ("reports.export", "Export Reports", "reports", "Export reports to CSV/PDF/Excel"),
    ("audit_logs.view", "View Audit Logs", "audit_logs", "View system-wide activity and audit trails"),
    ("dashboard.view", "View Dashboard", "dashboard", "Access executive summary metrics and KPI cards"),

    # Settings & Branding
    ("settings.view", "View Settings", "settings", "View system settings and foundation branding"),
    ("settings.edit", "Edit Settings", "settings", "Update system settings and foundation branding"),
]

DEFAULT_SETTINGS = {
    "general": {
        "organization_name": "Foundation Management System",
        "tagline": "Empowering Communities Through Transparent Stewardship",
        "contact_email": "admin@foundation.org",
        "contact_phone": "+8801700000001",
        "address": "Dhaka, Bangladesh",
        "currency_symbol": "৳",
        "currency_code": "BDT",
        "fiscal_year_start_month": 1,
        "date_format": "YYYY-MM-DD",
    },
    "member_rules": {
        "min_monthly_contribution": 500,
        "due_day_of_month": 10,
        "grace_period_days": 15,
        "auto_deactivate_after_unpaid_months": 6,
        "allow_advance_contributions": True,
        "require_nid_verification": False,
        "send_payment_reminders": True,
    },
    "assistance_rules": {
        "qard_hasan_max_amount": 500000,
        "qard_hasan_max_repayment_months": 24,
        "sadaqah_grant_max_amount": 100000,
        "require_committee_approval_above": 50000,
        "allow_multiple_active_loans_per_family": False,
        "auto_escalate_overdue_days": 30,
    },
    "financial_rules": {
        "require_receipt_number": True,
        "receipt_number_prefix": "REC-",
        "allow_cash_transactions": True,
        "auto_balance_group_transfers": True,
        "enforce_strict_double_entry": True,
        "lock_reconciled_periods": False,
    },
    "notifications": {
        "email_alerts_enabled": True,
        "sms_alerts_enabled": False,
        "alert_on_new_application": True,
        "alert_on_assistance_request": True,
        "alert_on_repayment_received": True,
        "alert_on_overdue_installment": True,
        "admin_digest_frequency": "WEEKLY",
    },
    "branding": {
        "primary_color": "#10b981",
        "accent_color": "#065f46",
        "logo_url": None,
        "favicon_url": None,
        "custom_footer_text": "Foundation Management System • Amanah & Integrity",
    },
    "security": {
        "session_timeout_minutes": 1440,
        "require_strong_passwords": True,
        "max_failed_logins": 5,
        "two_factor_auth_enabled": False,
        "audit_retention_days": 365,
    },
}

def seed_db():
    print("Connecting to database and ensuring schema tables exist...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        print("Seeding system permissions...")
        perm_map = {}
        for code, name, module, desc in PERMISSIONS_DATA:
            perm = db.query(Permission).filter(Permission.code == code).first()
            if not perm:
                perm = Permission(code=code, name=name, module=module, description=desc)
                db.add(perm)
                db.flush()
            perm_map[code] = perm
            
        print("Seeding standard system roles...")
        # 1. Super Admin
        super_admin_role = db.query(Role).filter(Role.name == "Super Admin").first()
        if not super_admin_role:
            super_admin_role = Role(
                name="Super Admin",
                description="Unrestricted full system administrative access",
                is_system=True
            )
            super_admin_role.permissions = list(perm_map.values())
            db.add(super_admin_role)
            db.flush()
        else:
            super_admin_role.is_system = True
            super_admin_role.permissions = list(perm_map.values())
            db.flush()
            
        # 2. Admin
        admin_role = db.query(Role).filter(Role.name == "Admin").first()
        if not admin_role:
            admin_role = Role(
                name="Admin",
                description="Foundation operations, group management, members, beneficiaries, and reports",
                is_system=True
            )
            admin_role.permissions = [p for code, p in perm_map.items() if not code.startswith("roles.delete")]
            db.add(admin_role)
            db.flush()
        else:
            admin_role.is_system = True
            admin_role.permissions = [p for code, p in perm_map.items() if not code.startswith("roles.delete")]
            db.flush()

        # 3. Accountant
        accountant_role = db.query(Role).filter(Role.name == "Accountant").first()
        if not accountant_role:
            accountant_role = Role(
                name="Accountant",
                description="Financial ledger, contributions, assistance disbursement, repayments, and financial reports",
                is_system=True
            )
            accountant_codes = {
                "contributions.view", "contributions.create", "contributions.edit",
                "assistance.view", "assistance.create", "assistance.approve",
                "repayments.view", "repayments.create",
                "groups.view", "members.view", "beneficiaries.view",
                "reports.view", "reports.export", "dashboard.view", "audit_logs.view"
            }
            accountant_role.permissions = [perm_map[c] for c in accountant_codes if c in perm_map]
            db.add(accountant_role)
            db.flush()
        else:
            accountant_role.is_system = True

        # 4. Member Manager
        mm_role = db.query(Role).filter(Role.name == "Member Manager").first()
        if not mm_role:
            mm_role = Role(
                name="Member Manager",
                description="Management of members, groups, and recording member contributions",
                is_system=True
            )
            mm_codes = {
                "groups.view", "groups.create", "groups.edit",
                "members.view", "members.create", "members.edit",
                "contributions.view", "contributions.create",
                "dashboard.view"
            }
            mm_role.permissions = [perm_map[c] for c in mm_codes if c in perm_map]
            db.add(mm_role)
            db.flush()
        else:
            mm_role.is_system = True

        # 5. Beneficiary Manager
        bm_role = db.query(Role).filter(Role.name == "Beneficiary Manager").first()
        if not bm_role:
            bm_role = Role(
                name="Beneficiary Manager",
                description="Management of assistance recipients and initiation of assistance requests",
                is_system=True
            )
            bm_codes = {
                "groups.view", "beneficiaries.view", "beneficiaries.create", "beneficiaries.edit",
                "assistance.view", "assistance.create", "repayments.view", "dashboard.view"
            }
            bm_role.permissions = [perm_map[c] for c in bm_codes if c in perm_map]
            db.add(bm_role)
            db.flush()
        else:
            bm_role.is_system = True

        # 6. Viewer
        viewer_role = db.query(Role).filter(Role.name == "Viewer").first()
        if not viewer_role:
            viewer_role = Role(
                name="Viewer",
                description="Read-only access across foundation records and reports",
                is_system=True
            )
            viewer_codes = {
                "groups.view", "members.view", "beneficiaries.view", "contributions.view",
                "assistance.view", "repayments.view", "reports.view", "dashboard.view"
            }
            viewer_role.permissions = [perm_map[c] for c in viewer_codes if c in perm_map]
            db.add(viewer_role)
            db.flush()
        else:
            viewer_role.is_system = True

        print("Seeding primary Super Admin account...")
        admin_user = db.query(User).filter((User.username == "admin") | (User.email == "admin@foundation.org")).first()
        if not admin_user:
            admin_user = User(
                username="admin",
                email="admin@foundation.org",
                full_name="Super Administrator",
                hashed_password=get_password_hash("admin123456"),
                role_id=super_admin_role.id,
                is_active=True,
                phone="+8801700000001"
            )
            db.add(admin_user)
            db.flush()
            print("Created Super Admin: username='admin' / password='admin123456'")
        else:
            admin_user.username = "admin"
            admin_user.role_id = super_admin_role.id
            admin_user.is_active = True
            db.flush()

        print("Seeding default system settings...")
        for section_name, config in DEFAULT_SETTINGS.items():
            setting = db.query(SystemSetting).filter(SystemSetting.section == section_name).first()
            if not setting:
                setting = SystemSetting(
                    section=section_name,
                    config_data=config,
                    updated_by=admin_user.id
                )
                db.add(setting)
                db.flush()

        db.commit()
        print("Database system structures, roles, permissions, and Super Admin verified successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
