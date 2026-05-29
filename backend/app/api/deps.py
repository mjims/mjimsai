"""
FastAPI dependencies — auth, database session, organization context.
"""

from __future__ import annotations

import uuid
from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core import decode_access_token
from app.database import get_db
from app.models.agent import Agent
from app.models.organization import Organization
from app.models.user import User


async def get_current_user(
    authorization: str = Header(..., alias="Authorization"),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and validate JWT token from Authorization header."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
        )
    token = authorization[7:]
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    result = await db.execute(
        select(User).where(User.id == uuid.UUID(user_id), User.is_active == True)  # noqa: E712
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user


async def get_current_organization(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Organization:
    """Get the organization of the authenticated user."""
    result = await db.execute(
        select(Organization).where(
            Organization.id == user.organization_id,
            Organization.is_active == True,  # noqa: E712
        )
    )
    org = result.scalar_one_or_none()
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization not found or inactive",
        )
    return org


async def validate_widget_key(
    x_api_key: str = Header(..., alias="X-API-Key"),
    db: AsyncSession = Depends(get_db),
) -> Organization:
    """Validate widget API key and return the organization."""
    result = await db.execute(
        select(Organization).where(
            Organization.api_key == x_api_key,
            Organization.is_active == True,  # noqa: E712
        )
    )
    org = result.scalar_one_or_none()
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )
    return org


async def validate_admin_key(
    x_admin_api_key: str = Header(..., alias="X-Admin-API-Key"),
) -> bool:
    """Validate the admin API key (for dashboard→API calls)."""
    settings = get_settings()
    if not settings.ADMIN_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ADMIN_API_KEY not configured",
        )
    if x_admin_api_key != settings.ADMIN_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin API key",
        )
    return True


async def get_agent_for_widget(
    agent_slug: str,
    org: Organization = Depends(validate_widget_key),
    db: AsyncSession = Depends(get_db),
) -> Agent:
    """Get an active agent by slug, scoped to the organization from the API key."""
    result = await db.execute(
        select(Agent).where(
            Agent.organization_id == org.id,
            Agent.slug == agent_slug,
            Agent.is_active == True,  # noqa: E712
        )
    )
    agent = result.scalar_one_or_none()
    if agent is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found or inactive",
        )
    return agent
