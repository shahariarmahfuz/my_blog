import sys
import logging
from urllib.parse import urlparse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

logger = logging.getLogger("app.database")

# Validate DATABASE_URL configuration
if not settings.DATABASE_URL or not (settings.DATABASE_URL.startswith("postgresql://") or settings.DATABASE_URL.startswith("postgres://")):
    raise RuntimeError(
        "CRITICAL CONFIGURATION ERROR: DATABASE_URL is required and must be a valid Neon PostgreSQL connection URI. "
        "Silent fallback to SQLite or temporary in-memory databases is strictly disabled."
    )

try:
    parsed_db_url = urlparse(settings.DATABASE_URL)
    safe_db_target = f"{parsed_db_url.scheme}://{parsed_db_url.username or 'user'}:***@{parsed_db_url.hostname}{(':' + str(parsed_db_url.port)) if parsed_db_url.port else ''}{parsed_db_url.path}"
    print(f"[Database] Initializing persistent Neon PostgreSQL connection pool -> {safe_db_target}")
except Exception:
    pass

# Neon PostgreSQL connection
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

