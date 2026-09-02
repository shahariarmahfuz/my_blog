import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Foundation Management & Financial Management System"
    API_V1_STR: str = "/api/v1"
    PORT: int = int(os.getenv("PORT", 8000))
    SECRET_KEY: str = os.getenv("SECRET_KEY", "foundation_super_secret_jwt_key_2026_change_in_production")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Neon PostgreSQL DB URL
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://neondb_owner:npg_R4LKgc7VjpQd@ep-long-math-az4xknrg-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    )
    
    # Cloudinary Credentials (Backend Only - NEVER expose to Frontend)
    CLOUDINARY_CLOUD_NAME: str = os.getenv("CLOUDINARY_CLOUD_NAME", "diwp8ug1r")
    CLOUDINARY_API_KEY: str = os.getenv("CLOUDINARY_API_KEY", "791592617583329")
    CLOUDINARY_API_SECRET: str = os.getenv("CLOUDINARY_API_SECRET", "EMP5w1lxdVxp9obXARq2uP_yWm8")
    CLOUDINARY_URL: Optional[str] = os.getenv("CLOUDINARY_URL", None)
    
    # CORS Origins (Configurable via environment variable for Firebase Hosting domain)
    CORS_ORIGINS: Optional[str] = os.getenv("CORS_ORIGINS", None)

    @property
    def BACKEND_CORS_ORIGINS(self) -> List[str]:
        if self.CORS_ORIGINS:
            origins = [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
            if origins:
                return origins
        return [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:4173",
        ]

    model_config = SettingsConfigDict(
        env_file=os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True
    )

settings = Settings()
