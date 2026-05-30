"""Schemas for the Sebpay catalog (countries & operators)."""

from __future__ import annotations

import uuid
from typing import Optional

from pydantic import BaseModel, Field


# ─── Countries ────────────────────────────────────────────────────────────────

class SebpayCountryCreate(BaseModel):
    code: str = Field(..., min_length=2, max_length=5)
    name: str = Field(..., min_length=1, max_length=100)
    prefix: str = Field(..., min_length=1, max_length=8)
    currency: str = Field(..., min_length=2, max_length=5)
    is_active: bool = True
    sort_order: int = 0


class SebpayCountryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    prefix: Optional[str] = Field(None, min_length=1, max_length=8)
    currency: Optional[str] = Field(None, min_length=2, max_length=5)
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class SebpayCountryResponse(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    prefix: str
    currency: str
    is_active: bool
    sort_order: int

    model_config = {"from_attributes": True}


# ─── Operators ────────────────────────────────────────────────────────────────

class SebpayOperatorCreate(BaseModel):
    slug: str = Field(..., min_length=1, max_length=20)
    label: str = Field(..., min_length=1, max_length=50)
    country_code: Optional[str] = Field(None, max_length=5)  # None = global
    is_active: bool = True
    sort_order: int = 0


class SebpayOperatorUpdate(BaseModel):
    label: Optional[str] = Field(None, min_length=1, max_length=50)
    country_code: Optional[str] = Field(None, max_length=5)
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class SebpayOperatorResponse(BaseModel):
    id: uuid.UUID
    slug: str
    label: str
    country_code: Optional[str]
    is_active: bool
    sort_order: int

    model_config = {"from_attributes": True}
