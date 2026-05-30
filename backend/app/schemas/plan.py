"""Pydantic schemas for Plan CRUD."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class PlanCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50, pattern=r"^[a-z0-9-]+$")
    label: str = Field(..., min_length=1, max_length=100)
    conversations_limit: int = Field(..., description="-1 for unlimited")

    price_monthly_eur: Optional[float] = None
    price_semiannual_eur: Optional[float] = None
    price_annual_eur: Optional[float] = None

    price_monthly_xof: Optional[int] = None
    price_semiannual_xof: Optional[int] = None
    price_annual_xof: Optional[int] = None

    features: list[str] = []
    is_active: bool = True
    sort_order: int = 0
    whatsapp_enabled: bool = False
    voice_enabled: bool = False


class PlanUpdate(BaseModel):
    label: Optional[str] = None
    conversations_limit: Optional[int] = None

    price_monthly_eur: Optional[float] = None
    price_semiannual_eur: Optional[float] = None
    price_annual_eur: Optional[float] = None

    price_monthly_xof: Optional[int] = None
    price_semiannual_xof: Optional[int] = None
    price_annual_xof: Optional[int] = None

    features: Optional[list[str]] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None
    whatsapp_enabled: Optional[bool] = None
    voice_enabled: Optional[bool] = None


class PlanResponse(BaseModel):
    id: uuid.UUID
    name: str
    label: str
    conversations_limit: int

    price_monthly_eur: Optional[float]
    price_semiannual_eur: Optional[float]
    price_annual_eur: Optional[float]

    price_monthly_xof: Optional[int]
    price_semiannual_xof: Optional[int]
    price_annual_xof: Optional[int]

    features: list[str]
    is_active: bool
    sort_order: int
    whatsapp_enabled: bool
    voice_enabled: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
