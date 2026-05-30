"""SebpayCountry — supported Sebpay countries (admin-managed)."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SebpayCountry(Base):
    __tablename__ = "sebpay_countries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    code: Mapped[str] = mapped_column(String(5), unique=True, nullable=False, index=True)  # ISO, e.g. BJ
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    prefix: Mapped[str] = mapped_column(String(8), nullable=False)  # +229
    currency: Mapped[str] = mapped_column(String(5), nullable=False)  # XOF / XAF / ...
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    def __repr__(self) -> str:
        return f"<SebpayCountry {self.code}>"
