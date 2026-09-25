from typing import Optional, List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import json
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    PROJECT_NAME: str = "IT Blog API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres123@localhost:5432/it_blog_db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security
    SECRET_KEY: str = "supersecretjwtkey_itblog_2026_production_change_me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        return []

    # First Superuser
    FIRST_SUPERUSER_EMAIL: str = "admin@itblog.dev"
    FIRST_SUPERUSER_USERNAME: str = "admin"
    FIRST_SUPERUSER_PASSWORD: str = "AdminPassword123!"

    # Google Gemini AI Settings (Multi-key pool)
    GEMINI_API_KEYS: Union[List[str], str] = []
    GEMINI_MODEL: str = "gemini-1.5-flash"
    # OAuth 2.0 Credentials (Google, GitHub, Facebook)
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[str] = None
    FACEBOOK_APP_ID: Optional[str] = None
    FACEBOOK_APP_SECRET: Optional[str] = None
    FRONTEND_URL: str = "http://localhost:5173"

    @field_validator("GOOGLE_CLIENT_ID", mode="before")
    @classmethod
    def assemble_google_client_id(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return v
        try:
            cred_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "credentials", "google_client_secret.json")
            if os.path.exists(cred_path):
                with open(cred_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data.get("web", {}).get("client_id")
        except Exception:
            pass
        return v

    @field_validator("GOOGLE_CLIENT_SECRET", mode="before")
    @classmethod
    def assemble_google_client_secret(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return v
        try:
            cred_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "credentials", "google_client_secret.json")
            if os.path.exists(cred_path):
                with open(cred_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data.get("web", {}).get("client_secret")
        except Exception:
            pass
        return v


    @field_validator("GEMINI_API_KEYS", mode="before")
    @classmethod
    def assemble_gemini_keys(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if not v.strip():
                return []
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            # Split by comma, semicolon or newline
            return [k.strip() for k in v.replace("\n", ",").replace(";", ",").split(",") if k.strip()]
        elif isinstance(v, list):
            return [str(k).strip() for k in v if str(k).strip()]
        return []


settings = Settings()
