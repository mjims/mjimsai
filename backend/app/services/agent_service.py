"""Agent CRUD service — scoped to user (no organization)."""

from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent
from app.schemas import AgentCreate, AgentUpdate
from app.services.encryption import encrypt_api_key, mask_api_key


async def create_agent(
    db: AsyncSession,
    user_id: uuid.UUID,
    data: AgentCreate,
    raw_llm_api_key: Optional[str] = None,
) -> Agent:
    existing = await db.execute(
        select(Agent).where(Agent.user_id == user_id, Agent.slug == data.slug)
    )
    if existing.scalar_one_or_none():
        raise ValueError(f"Agent slug '{data.slug}' already exists")

    agent = Agent(
        user_id=user_id,
        name=data.name,
        slug=data.slug,
        description=data.description,
        avatar_url=data.avatar_url,
        system_prompt=data.system_prompt,
        llm_provider=data.llm_provider,
        llm_model=data.llm_model,
        temperature=data.temperature,
        max_tokens=data.max_tokens,
        welcome_message=data.welcome_message,
        widget_config=data.widget_config.model_dump(),
        max_conversation_turns=data.max_conversation_turns,
    )

    if raw_llm_api_key:
        agent.llm_api_key_encrypted = encrypt_api_key(raw_llm_api_key)
        agent.llm_api_key_hint = mask_api_key(raw_llm_api_key)

    db.add(agent)
    await db.flush()
    return agent


async def update_agent(
    db: AsyncSession,
    agent: Agent,
    data: AgentUpdate,
    raw_llm_api_key: Optional[str] = None,
) -> Agent:
    update_data = data.model_dump(exclude_unset=True, exclude={"llm_api_key", "remove_api_key"})
    if "widget_config" in update_data and update_data["widget_config"] is not None:
        update_data["widget_config"] = data.widget_config.model_dump()

    for key, value in update_data.items():
        setattr(agent, key, value)

    if data.remove_api_key:
        agent.llm_api_key_encrypted = None
        agent.llm_api_key_hint = None
    elif raw_llm_api_key:
        agent.llm_api_key_encrypted = encrypt_api_key(raw_llm_api_key)
        agent.llm_api_key_hint = mask_api_key(raw_llm_api_key)

    await db.flush()
    return agent


async def get_agent_by_id(
    db: AsyncSession,
    user_id: uuid.UUID,
    agent_id: uuid.UUID,
) -> Optional[Agent]:
    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def get_agent_by_slug(
    db: AsyncSession,
    user_id: uuid.UUID,
    slug: str,
) -> Optional[Agent]:
    result = await db.execute(
        select(Agent).where(Agent.slug == slug, Agent.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def list_agents(
    db: AsyncSession,
    user_id: uuid.UUID,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[Agent], int]:
    count_result = await db.execute(
        select(func.count()).select_from(Agent).where(Agent.user_id == user_id)
    )
    total = count_result.scalar() or 0

    result = await db.execute(
        select(Agent)
        .where(Agent.user_id == user_id)
        .order_by(Agent.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all()), total


async def delete_agent(db: AsyncSession, agent: Agent) -> None:
    await db.delete(agent)
    await db.flush()
