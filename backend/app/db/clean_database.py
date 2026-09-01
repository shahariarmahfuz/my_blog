import sys
import os
from sqlalchemy import text

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.core.database import SessionLocal, engine
from app.models import Role, Permission, User, SystemSetting
from app.db.seed import seed_db

def clean_database():
    if os.getenv("ALLOW_DATABASE_RESET") != "true" and "--force-clean-all" not in sys.argv:
        raise RuntimeError(
            "CRITICAL SAFETY ABORT: Database reset/cleanup is strictly disabled by default to protect production data. "
            "To manually reset the database for development, explicitly set ALLOW_DATABASE_RESET=true or pass --force-clean-all."
        )

    print("==================================================")
    print("STARTING COMPLETE DATABASE CLEANUP (EXPLICITLY REQUESTED)")
    print("==================================================")
    db = SessionLocal()
    
    try:
        # Step 1: Ensure system settings and super admin refer properly
        print("1. Cleaning temporary business tables in cascading foreign key order...")
        
        # 1. Audit logs
        db.execute(text("DELETE FROM audit_logs;"))
        print("   - Truncated audit_logs table.")
        
        # 2. Files and documents
        db.execute(text("DELETE FROM files;"))
        print("   - Deleted temporary file attachments.")
        
        # 3. Member application history & applications
        db.execute(text("DELETE FROM member_application_status_history;"))
        db.execute(text("DELETE FROM member_applications;"))
        print("   - Deleted member applications and history.")
        
        # 4. Assistance repayments and schedules
        db.execute(text("DELETE FROM qard_hasan_repayment_allocations;"))
        db.execute(text("DELETE FROM qard_hasan_repayments;"))
        db.execute(text("DELETE FROM installment_schedules;"))
        db.execute(text("DELETE FROM assistance_funding_allocations;"))
        db.execute(text("DELETE FROM assistance;"))
        print("   - Deleted assistance, Qard Hasan, Sadaqah, repayments, schedules, and allocations.")
        
        # 5. Ledger entries, contributions, allocations, and monthly contribution dues
        db.execute(text("DELETE FROM monthly_contribution_allocations;"))
        db.execute(text("DELETE FROM ledger_entries;"))
        db.execute(text("DELETE FROM financial_transactions;"))
        db.execute(text("DELETE FROM contributions;"))
        db.execute(text("DELETE FROM monthly_contribution_dues;"))
        print("   - Deleted financial transactions, contributions, allocations, monthly dues, and ledger entries.")
        
        # 6. Members, Beneficiaries, Groups
        db.execute(text("DELETE FROM members;"))
        db.execute(text("DELETE FROM beneficiaries;"))
        db.execute(text("DELETE FROM groups;"))
        print("   - Deleted all members, beneficiaries, and fund groups.")
        
        # 7. Inquiries and Contact messages
        db.execute(text("DELETE FROM assistance_inquiries;"))
        db.execute(text("DELETE FROM contact_messages;"))
        print("   - Deleted assistance inquiries and contact messages.")
        
        # 8. Temporary users (keep ONLY Super Admin 'admin')
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            admin_user = db.query(User).filter(User.email == "admin@foundation.org").first()
            if admin_user:
                admin_user.username = "admin"
                db.flush()
                
        if admin_user:
            # Nullify updated_by foreign keys pointing to users that will be deleted
            db.execute(text(f"UPDATE system_settings SET updated_by = '{admin_user.id}';"))
            db.execute(text(f"DELETE FROM users WHERE id != '{admin_user.id}';"))
            print(f"   - Removed temporary staff/test users. Preserved Super Admin: '{admin_user.username}'.")
        else:
            print("   - Super Admin user not found! Will seed fresh Super Admin.")
            
        # 9. Clean custom test roles (keep ONLY the 6 system roles)
        db.execute(text("DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE is_system = false);"))
        db.execute(text("DELETE FROM roles WHERE is_system = false;"))
        print("   - Removed custom/test roles. Preserved default system roles.")

        # 10. Reset system settings to pristine defaults
        db.execute(text("DELETE FROM system_settings;"))
        print("   - Reset system settings to clean defaults.")
        
        db.commit()
        print("Database cleanup committed successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"ERROR during database cleanup: {e}")
        raise
    finally:
        db.close()
        
    print("\n2. Re-verifying system foundation (Permissions, System Roles, Super Admin)...")
    seed_db()
    
    print("\n3. Final Verification against Neon PostgreSQL:")
    db_verify = SessionLocal()
    tables = [
        "groups", "members", "beneficiaries", "contributions",
        "assistance", "financial_transactions", "ledger_entries",
        "installment_schedules", "qard_hasan_repayments", "qard_hasan_repayment_allocations",
        "member_applications", "member_application_status_history",
        "assistance_inquiries", "contact_messages", "files", "audit_logs",
        "users", "roles", "permissions", "system_settings"
    ]
    for tbl in tables:
        cnt = db_verify.execute(text(f'SELECT count(*) FROM "{tbl}"')).scalar()
        print(f"   - {tbl:35s}: {cnt} rows")
        
    admin = db_verify.query(User).filter(User.username == "admin").first()
    print(f"\nSuper Admin verified: username='{admin.username}', role='{admin.role.name if admin.role else None}', is_active={admin.is_active}")
    db_verify.close()
    print("==================================================")
    print("DATABASE IS COMPLETELY CLEAN & READY FOR MANUAL TESTING")
    print("==================================================")

if __name__ == "__main__":
    clean_database()
