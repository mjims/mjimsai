"""Resolve payment provider configuration from DB (with env fallback).

Secrets live encrypted in the ``payment_settings`` table. If a secret column is
NULL, we fall back to the corresponding environment variable so existing
deployments keep working until the admin migrates keys into the backoffice.
"""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.config import get_settings
from app.models.payment_setting import PaymentSetting
from app.services.encryption import decrypt_api_key


@dataclass
class PaymentConfig:
    provider: str
    is_enabled: bool
    secret_key: str | None
    public_key: str | None
    webhook_secret: str | None
    base_url: str | None
    environment: str | None


def _dec(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return decrypt_api_key(value)
    except Exception:
        return None


async def get_config(db: AsyncSession, provider: str) -> PaymentConfig:
    settings = get_settings()
    row = (await db.execute(
        select(PaymentSetting).where(PaymentSetting.provider == provider)
    )).scalar_one_or_none()

    is_enabled = bool(row.is_enabled) if row else False
    base_url = (row.base_url if row else None)
    environment = (row.environment if row else None)

    secret = _dec(row.secret_key_enc) if row else None
    public = _dec(row.public_key_enc) if row else None
    webhook = _dec(row.webhook_secret_enc) if row else None

    # Env fallback per provider
    if provider == "stripe":
        secret = secret or settings.STRIPE_SECRET_KEY
        webhook = webhook or settings.STRIPE_WEBHOOK_SECRET
    elif provider == "sebpay":
        secret = secret or settings.SEBPAY_SECRET_KEY
        public = public or settings.SEBPAY_PUBLIC_KEY
        base_url = base_url or settings.sebpay_base_url
        environment = environment or settings.SEBPAY_ENV

    return PaymentConfig(
        provider=provider,
        is_enabled=is_enabled,
        secret_key=secret,
        public_key=public,
        webhook_secret=webhook,
        base_url=base_url,
        environment=environment,
    )


async def is_enabled(db: AsyncSession, provider: str) -> bool:
    cfg = await get_config(db, provider)
    return cfg.is_enabled
