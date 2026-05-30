"""Agent model — customizable AI agent, owned directly by a user."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # --- Identity ---
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # --- AI Configuration ---
    system_prompt: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="You are a helpful AI assistant. Answer questions clearly and concisely.",
    )
    llm_provider: Mapped[str] = mapped_column(String(50), nullable=False, default="anthropic")
    llm_model: Mapped[str] = mapped_column(String(100), nullable=False, default="claude-sonnet-4-20250514")
    temperature: Mapped[float] = mapped_column(Float, default=0.7)
    max_tokens: Mapped[int] = mapped_column(Integer, default=2048)

    # --- Per-agent LLM API key (user-provided, Fernet-encrypted) ---
    llm_api_key_encrypted: Mapped[str | None] = mapped_column(String(500), nullable=True)
    llm_api_key_hint: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # --- Widget appearance ---
    welcome_message: Mapped[str] = mapped_column(
        Text, default="Bonjour ! Comment puis-je vous aider ?"
    )
    widget_config: Mapped[dict] = mapped_column(
        JSON,
        default=lambda: {
            "primary_color": "#6366f1",
            "text_color": "#ffffff",
            "position": "bottom-right",
            "bubble_icon": "chat",
            "border_radius": 16,
            "font_family": "Inter, sans-serif",
        },
    )

    # --- Subscription (per-agent plan) ---
    plan_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plans.id", ondelete="SET NULL"), nullable=True
    )
    billing_period: Mapped[str] = mapped_column(String(20), default="monthly")  # monthly | semiannual | annual
    subscription_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sebpay_subscription_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # --- Behaviour ---
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    max_conversation_turns: Mapped[int] = mapped_column(Integer, default=50)

    # --- Stats (denormalized for speed) ---
    total_conversations: Mapped[int] = mapped_column(Integer, default=0)
    total_messages: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user = relationship("User", back_populates="agents")
    plan = relationship("Plan", back_populates="agents", foreign_keys=[plan_id])
    conversations = relationship("Conversation", back_populates="agent", cascade="all, delete-orphan")
    knowledge_documents = relationship("KnowledgeDocument", back_populates="agent", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Agent {self.slug} ({self.llm_provider}/{self.llm_model})>"
