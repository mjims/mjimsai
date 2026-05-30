"""Usage tracking service — monthly conversation quota per agent."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent
from app.models.plan import Plan
from app.models.usage import UsageRecord


def _current_year_month() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


async def get_current_usage(
    db: AsyncSession,
    agent_id: uuid.UUID,
) -> UsageRecord | None:
    result = await db.execute(
        select(UsageRecord).where(
            UsageRecord.agent_id == agent_id,
            UsageRecord.year_month == _current_year_month(),
        )
    )
    return result.scalar_one_or_none()


async def increment_conversation(
    db: AsyncSession,
    agent_id: uuid.UUID,
) -> None:
    year_month = _current_year_month()
    now = datetime.now(timezone.utc)

    stmt = (
        insert(UsageRecord)
        .values(
            id=uuid.uuid4(),
            agent_id=agent_id,
            year_month=year_month,
            conversations_count=1,
            messages_count=0,
            tokens_input_total=0,
            tokens_output_total=0,
            updated_at=now,
        )
        .on_conflict_do_update(
            constraint="uq_usage_agent_month",
            set_={
                "conversations_count": UsageRecord.conversations_count + 1,
                "updated_at": now,
            },
        )
    )
    await db.execute(stmt)


async def check_quota(
    db: AsyncSession,
    agent: Agent,
    raise_if_exceeded: bool = True,
) -> bool:
    """Check if the agent is within its plan's monthly conversation limit."""
    # Load the agent's plan
    limit = 100  # default free tier
    if agent.plan_id:
        plan_result = await db.execute(select(Plan).where(Plan.id == agent.plan_id))
        plan = plan_result.scalar_one_or_none()
        if plan:
            limit = plan.conversations_limit

    if limit == -1:
        return True  # unlimited

    usage = await get_current_usage(db, agent.id)
    current_count = usage.conversations_count if usage else 0

    if current_count >= limit:
        if raise_if_exceeded:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Monthly conversation quota exceeded ({current_count}/{limit}). "
                    "Please upgrade your agent's plan."
                ),
            )
        return False

    return True
