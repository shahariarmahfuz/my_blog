import sys
import os
from sqlalchemy import text

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.core.database import engine

def migrate_users_table():
    print("Running migration for users table: adding username column and indexes...")
    with engine.begin() as conn:
        # 1. Add username column if not exists
        conn.execute(text("""
            ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100);
        """))
        
        # 2. Populate username for existing users from email if empty
        conn.execute(text("""
            UPDATE users
            SET username = LOWER(SPLIT_PART(email, '@', 1))
            WHERE username IS NULL OR username = '';
        """))
        
        # 3. Make sure 'admin@foundation.org' gets username 'admin'
        conn.execute(text("""
            UPDATE users
            SET username = 'admin'
            WHERE email = 'admin@foundation.org';
        """))
        
        # 4. Make username NOT NULL and add unique index
        conn.execute(text("""
            ALTER TABLE users ALTER COLUMN username SET NOT NULL;
        """))
        
        conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users (username);
        """))
        
        # 5. Allow email to be nullable
        conn.execute(text("""
            ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
        """))

        # 6. Monthly Contribution migrations
        conn.execute(text("""
            ALTER TABLE members ADD COLUMN IF NOT EXISTS monthly_contribution_amount NUMERIC(14, 2);
        """))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS monthly_contribution_dues (
                id UUID PRIMARY KEY,
                member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
                group_id UUID NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
                contribution_month DATE NOT NULL,
                due_date DATE NOT NULL,
                expected_amount NUMERIC(14, 2) NOT NULL,
                paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
                remaining_due NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
                status VARCHAR(20) NOT NULL DEFAULT 'DUE',
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                CONSTRAINT uq_member_contribution_month UNIQUE (member_id, contribution_month)
            );
            CREATE INDEX IF NOT EXISTS ix_mcd_member_id ON monthly_contribution_dues (member_id);
            CREATE INDEX IF NOT EXISTS ix_mcd_group_id ON monthly_contribution_dues (group_id);
            CREATE INDEX IF NOT EXISTS ix_mcd_contribution_month ON monthly_contribution_dues (contribution_month);
        """))

        conn.execute(text("""
            ALTER TABLE contributions ADD COLUMN IF NOT EXISTS contribution_month DATE;
            ALTER TABLE contributions ADD COLUMN IF NOT EXISTS due_id UUID REFERENCES monthly_contribution_dues(id) ON DELETE SET NULL;
            ALTER TABLE contributions ADD COLUMN IF NOT EXISTS months_count INT NOT NULL DEFAULT 1;
            ALTER TABLE contributions ADD COLUMN IF NOT EXISTS months_summary VARCHAR(255);
            ALTER TABLE contributions ADD COLUMN IF NOT EXISTS months_covered JSONB;
        """))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS monthly_contribution_allocations (
                id UUID PRIMARY KEY,
                contribution_id UUID NOT NULL REFERENCES contributions(id) ON DELETE CASCADE,
                due_id UUID NOT NULL REFERENCES monthly_contribution_dues(id) ON DELETE CASCADE,
                member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
                contribution_month DATE NOT NULL,
                allocated_amount NUMERIC(14, 2) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS ix_mca_contribution_id ON monthly_contribution_allocations (contribution_id);
            CREATE INDEX IF NOT EXISTS ix_mca_due_id ON monthly_contribution_allocations (due_id);
            CREATE INDEX IF NOT EXISTS ix_mca_member_id ON monthly_contribution_allocations (member_id);
            CREATE INDEX IF NOT EXISTS ix_mca_contribution_month ON monthly_contribution_allocations (contribution_month);
        """))

    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        try:
            conn.execute(text("ALTER TYPE transactiontype ADD VALUE IF NOT EXISTS 'OPENING_BALANCE'"))
            conn.execute(text("ALTER TYPE transactiontype ADD VALUE IF NOT EXISTS 'OPENING_BALANCE_ADJUSTMENT'"))
        except Exception as e:
            print("Enum migration note:", e)
        
    print("Migration completed successfully!")

if __name__ == "__main__":
    migrate_users_table()
