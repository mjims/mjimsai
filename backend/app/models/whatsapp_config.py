"""WhatsAppConfig — per-agent WhatsApp Cloud API credentials (BYO, encrypted)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class WhatsAppConfig(Base):
    __tablename__ = "whatsapp_configs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"),
        unique=True, nullable=False, index=True,
    )

    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    phone_number_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    display_phone_number: Mapped[str | None] = mapped_column(String(30), nullable=True)

    # Encrypted (Fernet)
    access_token_enc: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    app_secret_enc: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Shared secret for Meta webhook GET handshake (low sensitivity, shown to user)
    verify_token: Mapped[str] = mapped_column(String(64), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return f"<WhatsAppConfig agent={self.agent_id} enabled={self.is_enabled}>"
