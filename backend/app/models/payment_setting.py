"""PaymentSetting — per-provider payment configuration, admin-managed.

Secrets are stored Fernet-encrypted. One row per provider ("stripe" | "sebpay").
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PaymentSetting(Base):
    __tablename__ = "payment_settings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    provider: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Encrypted secrets (nullable → fall back to env var if not set)
    secret_key_enc: Mapped[str | None] = mapped_column(String(500), nullable=True)
    public_key_enc: Mapped[str | None] = mapped_column(String(500), nullable=True)
    webhook_secret_enc: Mapped[str | None] = mapped_column(String(500), nullable=True)

    base_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    environment: Mapped[str | None] = mapped_column(String(20), nullable=True)  # sandbox | live

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return f"<PaymentSetting {self.provider} enabled={self.is_enabled}>"
