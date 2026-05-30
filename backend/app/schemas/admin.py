"""Pydantic schemas for admin backoffice routes."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class UserAdminResponse(BaseModel):
    id: uuid.UUID
    email: str
    username: str
    full_name: Optional[str]
    api_key: str
    is_active: bool
    is_suspended: bool
    created_at: datetime
    agent_count: int = 0

    model_config = {"from_attributes": True}


class UserListAdminResponse(BaseModel):
    users: list[UserAdminResponse]
    total: int


class PlatformStatsResponse(BaseModel):
    total_users: int
    active_users: int
    suspended_users: int
    total_agents: int
    total_conversations_this_month: int
    plans: dict[str, int]  # plan_name → agent count


class SuspendRequest(BaseModel):
    suspended: bool
    reason: Optional[str] = None
