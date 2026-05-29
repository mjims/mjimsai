"""
Auth routes — login, register, user management.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core import create_access_token, hash_password, verify_password, generate_api_key
from app.database import get_db
from app.api.deps import get_current_user, get_current_organization
from app.models.organization import Organization
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserCreate,
    UserResponse,
    OrganizationResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """Register a new organization and admin user (SaaS mode)."""
    settings = get_settings()
    if not settings.SAAS_MODE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration is disabled in self-hosted mode",
        )

    # Check email uniqueness
    existing_email = await db.execute(
        select(User).where(User.email == data.email)
    )
    if existing_email.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    # Check org slug uniqueness
    existing_org = await db.execute(
        select(Organization).where(Organization.slug == data.org_slug)
    )
    if existing_org.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Organization slug already taken",
        )

    # Create organization
    org = Organization(
        name=data.org_name,
        slug=data.org_slug,
        api_key=generate_api_key(),
    )
    db.add(org)
    await db.flush()

    # Create admin user
    user = User(
        organization_id=org.id,
        email=data.email,
        username=data.username,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        role="owner",
    )
    db.add(user)
    await db.flush()

    # Generate token
    token = create_access_token(data={"sub": str(user.id), "org": str(org.id)})

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Login with email and password."""
    result = await db.execute(
        select(User).where(User.email == data.email, User.is_active == True)  # noqa: E712
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(
        data={"sub": str(user.id), "org": str(user.organization_id)}
    )

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Get current authenticated user."""
    return UserResponse.model_validate(user)


@router.get("/organization", response_model=OrganizationResponse)
async def get_my_organization(
    org: Organization = Depends(get_current_organization),
):
    """Get current user's organization."""
    return OrganizationResponse.model_validate(org)
