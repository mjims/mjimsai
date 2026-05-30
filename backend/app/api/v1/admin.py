"""
Admin backoffice routes — plan CRUD and user management.
Auth: X-Admin-API-Key header.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import validate_admin_key
from app.database import get_db
from app.models.agent import Agent
from app.models.plan import Plan
from app.models.usage import UsageRecord
from app.models.user import User
from app.schemas.admin import (
    PlatformStatsResponse,
    SuspendRequest,
    UserAdminResponse,
    UserListAdminResponse,
)
from app.schemas.plan import PlanCreate, PlanResponse, PlanUpdate
from app.services.usage_service import _current_year_month

router = APIRouter(prefix="/admin", tags=["Admin"])


# ─── Plans CRUD ──────────────────────────────────────────────────────────────

@router.get("/plans", response_model=list[PlanResponse])
async def list_plans(
    _: bool = Depends(validate_admin_key),
    db: AsyncSession = Depends(get_db),
):
    """List all plans (active and inactive)."""
    result = await db.execute(select(Plan).order_by(Plan.sort_order.asc()))
    return result.scalars().all()


@router.post("/plans", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
async def create_plan(
    data: PlanCreate,
    _: bool = Depends(validate_admin_key),
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
    _: bool = Depends(validate_admin_key),
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
    _: bool = Depends(validate_admin_key),
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
    _: bool = Depends(validate_admin_key),
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


# ─── Platform Stats ───────────────────────────────────────────────────────────

@router.get("/stats", response_model=PlatformStatsResponse)
async def get_stats(
    _: bool = Depends(validate_admin_key),
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
    _: bool = Depends(validate_admin_key),
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
            id=user.id, email=user.email, username=user.username,
            full_name=user.full_name, api_key=user.api_key,
            is_active=user.is_active, is_suspended=user.is_suspended,
            created_at=user.created_at, agent_count=agent_count,
        ))

    return UserListAdminResponse(users=user_responses, total=total)


@router.patch("/users/{user_id}/suspend", response_model=UserAdminResponse)
async def suspend_user(
    user_id: uuid.UUID,
    data: SuspendRequest,
    _: bool = Depends(validate_admin_key),
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
        id=user.id, email=user.email, username=user.username,
        full_name=user.full_name, api_key=user.api_key,
        is_active=user.is_active, is_suspended=user.is_suspended,
        created_at=user.created_at, agent_count=agent_count,
    )


@router.get("/health")
async def admin_health(
    _: bool = Depends(validate_admin_key),
    db: AsyncSession = Depends(get_db),
):
    try:
        await db.execute(select(func.now()))
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {e}"
    return {"database": db_status, "status": "ok" if db_status == "ok" else "degraded"}
