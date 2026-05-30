"""
Admin backoffice routes — plans, models, users, and admin management.
Auth: backoffice admin JWT (Authorization: Bearer ...).
"""

from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.config import get_settings
from app.core import hash_password
from app.database import get_db
from app.models.admin_user import AdminUser
from app.models.agent import Agent
from app.models.llm_model import LLMModel
from app.models.plan import Plan
from app.models.usage import UsageRecord
from app.models.user import User
from app.schemas.admin import (
    PlatformStatsResponse,
    SuspendRequest,
    UserAdminResponse,
    UserListAdminResponse,
)
from app.schemas.admin_auth import AdminCreateRequest, AdminResponse, AdminSetActiveRequest
from app.schemas.llm_model import LLMModelCreate, LLMModelResponse, LLMModelUpdate
from app.schemas.plan import PlanCreate, PlanResponse, PlanUpdate
from app.services.email_service import send_admin_invite_email
from app.services.llm.factory import get_supported_providers
from app.services.usage_service import _current_year_month

router = APIRouter(prefix="/admin", tags=["Admin"])


# ─── Plans CRUD ──────────────────────────────────────────────────────────────

@router.get("/plans", response_model=list[PlanResponse])
async def list_plans(
    _: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all plans (active and inactive)."""
    result = await db.execute(select(Plan).order_by(Plan.sort_order.asc()))
    return result.scalars().all()


@router.post("/plans", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
async def create_plan(
    data: PlanCreate,
    _: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(Plan).where(Plan.name == data.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Plan '{data.name}' already exists")

    plan = Plan(**data.model_dump())
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan


@router.get("/plans/{plan_id}", response_model=PlanResponse)
async def get_plan(
    plan_id: uuid.UUID,
    _: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    return plan


@router.put("/plans/{plan_id}", response_model=PlanResponse)
async def update_plan(
    plan_id: uuid.UUID,
    data: PlanUpdate,
    _: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(plan, field, value)

    await db.commit()
    await db.refresh(plan)
    return plan


@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(
    plan_id: uuid.UUID,
    _: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    # Check if any agent is subscribed to this plan
    agent_count = (await db.execute(
        select(func.count()).select_from(Agent).where(Agent.plan_id == plan_id)
    )).scalar() or 0

    if agent_count > 0:
        # Soft delete: deactivate instead of hard delete
        plan.is_active = False
        await db.commit()
    else:
        await db.delete(plan)
        await db.commit()


# ─── LLM Models CRUD ──────────────────────────────────────────────────────────

@router.get("/providers", response_model=list[str])
async def list_supported_providers(
    _: AdminUser = Depends(get_current_admin),
):
    """Code-backed provider slugs that models can be attached to."""
    return get_supported_providers()


@router.get("/models", response_model=list[LLMModelResponse])
async def list_models(
    _: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all models (active and inactive), grouped-friendly order."""
    result = await db.execute(
        select(LLMModel).order_by(LLMModel.provider, LLMModel.sort_order, LLMModel.model_id)
    )
    return result.scalars().all()


@router.post("/models", response_model=LLMModelResponse, status_code=status.HTTP_201_CREATED)
async def create_model(
    data: LLMModelCreate,
    _: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    if data.provider not in get_supported_providers():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported provider '{data.provider}'. Supported: {get_supported_providers()}",
        )
    existing = await db.execute(
        select(LLMModel).where(
            LLMModel.provider == data.provider, LLMModel.model_id == data.model_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Model '{data.model_id}' already exists for provider '{data.provider}'",
        )

    model = LLMModel(**data.model_dump())
    db.add(model)
    await db.commit()
    await db.refresh(model)
    return model


@router.put("/models/{model_id}", response_model=LLMModelResponse)
async def update_model(
    model_id: uuid.UUID,
    data: LLMModelUpdate,
    _: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(LLMModel).where(LLMModel.id == model_id))
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(model, field, value)

    await db.commit()
    await db.refresh(model)
    return model


@router.delete("/models/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_model(
    model_id: uuid.UUID,
    _: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(LLMModel).where(LLMModel.id == model_id))
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
    await db.delete(model)
    await db.commit()


# ─── Platform Stats ───────────────────────────────────────────────────────────

@router.get("/stats", response_model=PlatformStatsResponse)
async def get_stats(
    _: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar() or 0
    active_users = (await db.execute(
        select(func.count()).select_from(User).where(User.is_active == True, User.is_suspended == False)  # noqa: E712
    )).scalar() or 0
    suspended_users = (await db.execute(
        select(func.count()).select_from(User).where(User.is_suspended == True)  # noqa: E712
    )).scalar() or 0
    total_agents = (await db.execute(select(func.count()).select_from(Agent))).scalar() or 0

    usage_rows = await db.execute(
        select(UsageRecord).where(UsageRecord.year_month == _current_year_month())
    )
    total_convs = sum(r.conversations_count for r in usage_rows.scalars().all())

    # Agents by plan name
    plan_rows = await db.execute(
        select(Plan.name, func.count(Agent.id))
        .outerjoin(Agent, Agent.plan_id == Plan.id)
        .group_by(Plan.name)
    )
    plans = {name: count for name, count in plan_rows.all()}

    return PlatformStatsResponse(
        total_users=total_users,
        active_users=active_users,
        suspended_users=suspended_users,
        total_agents=total_agents,
        total_conversations_this_month=total_convs,
        plans=plans,
    )


# ─── Users ────────────────────────────────────────────────────────────────────

@router.get("/users", response_model=UserListAdminResponse)
async def list_users(
    skip: int = 0,
    limit: int = 50,
    _: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    total = (await db.execute(select(func.count()).select_from(User))).scalar() or 0
    result = await db.execute(
        select(User).order_by(User.created_at.desc()).offset(skip).limit(limit)
    )
    users = result.scalars().all()

    user_responses = []
    for user in users:
        agent_count = (await db.execute(
            select(func.count()).select_from(Agent).where(Agent.user_id == user.id)
        )).scalar() or 0
        user_responses.append(UserAdminResponse(
            id=user.id, email=user.email,
            first_name=user.first_name, last_name=user.last_name,
            api_key=user.api_key, email_verified=user.email_verified,
            is_active=user.is_active, is_suspended=user.is_suspended,
            created_at=user.created_at, agent_count=agent_count,
        ))

    return UserListAdminResponse(users=user_responses, total=total)


@router.patch("/users/{user_id}/suspend", response_model=UserAdminResponse)
async def suspend_user(
    user_id: uuid.UUID,
    data: SuspendRequest,
    _: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_suspended = data.suspended
    await db.commit()
    await db.refresh(user)

    agent_count = (await db.execute(
        select(func.count()).select_from(Agent).where(Agent.user_id == user.id)
    )).scalar() or 0

    return UserAdminResponse(
        id=user.id, email=user.email,
        first_name=user.first_name, last_name=user.last_name,
        api_key=user.api_key, email_verified=user.email_verified,
        is_active=user.is_active, is_suspended=user.is_suspended,
        created_at=user.created_at, agent_count=agent_count,
    )


# ─── Admin management (admins can invite other admins) ────────────────────────

@router.get("/admins", response_model=list[AdminResponse])
async def list_admins(
    _: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AdminUser).order_by(AdminUser.created_at.asc()))
    return result.scalars().all()


@router.post("/admins", response_model=AdminResponse, status_code=status.HTTP_201_CREATED)
async def create_admin(
    data: AdminCreateRequest,
    current: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create an admin (no password) and email them a set-password invite."""
    settings = get_settings()
    exists = (await db.execute(select(AdminUser).where(AdminUser.email == data.email))).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Admin email already exists")

    secret = secrets.token_urlsafe(32)
    admin = AdminUser(
        email=data.email,
        first_name=data.first_name,
        last_name=data.last_name,
        password_hash=None,
        is_active=True,
        invite_token_hash=hash_password(secret),
        invite_expires_at=datetime.now(timezone.utc) + timedelta(hours=settings.INVITE_TTL_HOURS),
    )
    db.add(admin)
    await db.commit()
    await db.refresh(admin)

    link = f"{settings.BACKOFFICE_URL}/accept-invite?token={admin.id}.{secret}"
    inviter = f"{current.first_name} {current.last_name}".strip() or current.email
    await send_admin_invite_email(admin.email, link, inviter)

    return admin


@router.patch("/admins/{admin_id}", response_model=AdminResponse)
async def set_admin_active(
    admin_id: uuid.UUID,
    data: AdminSetActiveRequest,
    current: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    if admin_id == current.id and not data.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate yourself")
    result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
    admin = result.scalar_one_or_none()
    if not admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")
    admin.is_active = data.is_active
    await db.commit()
    await db.refresh(admin)
    return admin


@router.delete("/admins/{admin_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_admin(
    admin_id: uuid.UUID,
    current: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    if admin_id == current.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete yourself")
    result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
    admin = result.scalar_one_or_none()
    if not admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")

    active_count = (await db.execute(
        select(func.count()).select_from(AdminUser).where(AdminUser.is_active.is_(True))
    )).scalar() or 0
    if admin.is_active and active_count <= 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete the last active admin")

    await db.delete(admin)
    await db.commit()


@router.get("/health")
async def admin_health(
    _: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        await db.execute(select(func.now()))
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {e}"
    return {"database": db_status, "status": "ok" if db_status == "ok" else "degraded"}
