"""Pydantic schemas for LLMModel CRUD (admin-managed provider models)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class LLMModelCreate(BaseModel):
    model_config = {"protected_namespaces": ()}

    provider: str = Field(..., min_length=1, max_length=50)
    model_id: str = Field(..., min_length=1, max_length=150)
    label: str = Field(..., min_length=1, max_length=150)
    is_active: bool = True
    sort_order: int = 0


class LLMModelUpdate(BaseModel):
    model_config = {"protected_namespaces": ()}

    model_id: Optional[str] = Field(None, min_length=1, max_length=150)
    label: Optional[str] = Field(None, min_length=1, max_length=150)
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class LLMModelResponse(BaseModel):
    model_config = {"from_attributes": True, "protected_namespaces": ()}

    id: uuid.UUID
    provider: str
    model_id: str
    label: str
    is_active: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime
