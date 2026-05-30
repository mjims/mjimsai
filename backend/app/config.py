"""
Application configuration using Pydantic Settings.
Reads from environment variables / .env file.
"""

from __future__ import annotations

from enum import Enum
from functools import lru_cache
from typing import Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Environment(str, Enum):
    development = "development"
    staging = "staging"
    production = "production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Application ---
    APP_NAME: str = "MjimsAI"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: Environment = Environment.production
    LOG_LEVEL: str = "INFO"
    DEBUG: bool = False

    # --- Database ---
    DATABASE_URL: str = "postgresql+asyncpg://mjimsai:password@localhost:5432/mjimsai"

    # --- Auth ---
    JWT_SECRET: str = "CHANGE-ME-IN-PRODUCTION-min-32-chars"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    API_KEYS: str = ""  # Comma-separated widget API keys
    ADMIN_API_KEY: str = ""  # Backoffice → API key

    # --- LLM Providers (platform-level fallback keys) ---
    ANTHROPIC_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None
    XAI_API_KEY: Optional[str] = None  # Grok (xAI)

    # --- Encryption (Fernet) for per-agent API keys ---
    # Generate: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    ENCRYPTION_KEY: str = ""

    # --- Payments ---
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    SEBPAY_PUBLIC_KEY: Optional[str] = None
    SEBPAY_SECRET_KEY: Optional[str] = None
    SEBPAY_ENV: str = "sandbox"  # "sandbox" | "live"

    # --- CORS ---
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001"

    # --- File uploads ---
    MAX_UPLOAD_SIZE_MB: int = 20
    UPLOAD_DIR: str = "./uploads"

    # --- Observability (optional) ---
    LANGFUSE_PUBLIC_KEY: Optional[str] = None
    LANGFUSE_SECRET_KEY: Optional[str] = None
    LANGFUSE_HOST: str = "https://cloud.langfuse.com"

    # --- Multi-tenancy ---
    SAAS_MODE: bool = True  # False = single-tenant / self-hosted

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _parse_cors(cls, v: str) -> str:
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def api_keys_list(self) -> list[str]:
        return [k.strip() for k in self.API_KEYS.split(",") if k.strip()]

    @property
    def sebpay_base_url(self) -> str:
        return "https://newapi.sebpay.bj/api/v1"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
