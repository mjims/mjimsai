"""SebpayOperator — Mobile Money operators (admin-managed, optionally per country)."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SebpayOperator(Base):
    __tablename__ = "sebpay_operators"
    __table_args__ = (
        UniqueConstraint("country_code", "slug", name="uq_sebpay_operator_country_slug"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    slug: Mapped[str] = mapped_column(String(20), nullable=False)  # mtn | moov | orange | wav
    label: Mapped[str] = mapped_column(String(50), nullable=False)
    # NULL = available for all countries
    country_code: Mapped[str | None] = mapped_column(String(5), nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    def __repr__(self) -> str:
        return f"<SebpayOperator {self.slug} ({self.country_code or 'global'})>"
