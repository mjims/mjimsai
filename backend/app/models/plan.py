"""Plan model — subscription plans managed by admin."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(100), nullable=False)

    conversations_limit: Mapped[int] = mapped_column(Integer, default=100)  # -1 = unlimited

    # Prices per period (EUR)
    price_monthly_eur: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    price_semiannual_eur: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    price_annual_eur: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)

    # Prices per period (XOF — West Africa)
    price_monthly_xof: Mapped[int | None] = mapped_column(Integer, nullable=True)
    price_semiannual_xof: Mapped[int | None] = mapped_column(Integer, nullable=True)
    price_annual_xof: Mapped[int | None] = mapped_column(Integer, nullable=True)

    features: Mapped[list] = mapped_column(JSON, default=list)
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

    # Relationships
    agents = relationship("Agent", back_populates="plan", foreign_keys="Agent.plan_id")

    def __repr__(self) -> str:
        return f"<Plan {self.name} ({self.conversations_limit} conv/mo)>"
