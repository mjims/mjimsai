"""LLMModel — provider models managed by admin (dynamic, not hardcoded).

The *provider* (anthropic, openai, gemini, grok, deepseek) is a code-level
integration. The *models* it exposes change over time (deprecations, new
releases), so they live in the database and are CRUD-managed from the backoffice.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class LLMModel(Base):
    __tablename__ = "llm_models"
    __table_args__ = (
        UniqueConstraint("provider", "model_id", name="uq_llm_model_provider_model"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # Code-backed provider slug: anthropic | openai | gemini | grok | deepseek
    provider: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    # The exact model string sent to the provider API (e.g. "claude-opus-4-8")
    model_id: Mapped[str] = mapped_column(String(150), nullable=False)
    # Human-friendly label shown in the UI (e.g. "Claude Opus 4.8")
    label: Mapped[str] = mapped_column(String(150), nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return f"<LLMModel {self.provider}/{self.model_id}>"
