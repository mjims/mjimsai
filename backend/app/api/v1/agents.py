"""
Agent management routes — scoped to the authenticated user.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.plan import Plan
from app.models.user import User
from app.schemas import AgentCreate, AgentUpdate, AgentResponse, AgentListResponse
from app.services import agent_service
from app.services.llm.factory import get_available_models
from app.services import usage_service

router = APIRouter(prefix="/agents", tags=["Agents"])


@router.get("", response_model=AgentListResponse)
async def list_agents(
    skip: int = 0,
    limit: int = 50,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    agents, total = await agent_service.list_agents(db, user.id, skip, limit)
    return AgentListResponse(
        agents=[AgentResponse.from_orm_agent(a) for a in agents],
        total=total,
    )


@router.post("", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
async def create_agent(
    request: Request,
    data: AgentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    raw_body = await request.json()
    raw_api_key = raw_body.get("llm_api_key") or None

    try:
        agent = await agent_service.create_agent(db, user.id, data, raw_llm_api_key=raw_api_key)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    await db.commit()
    return AgentResponse.from_orm_agent(agent)


@router.get("/providers", response_model=dict)
async def list_providers(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List available LLM providers and their active models (admin-managed)."""
    return await get_available_models(db)


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    agent = await agent_service.get_agent_by_id(db, user.id, agent_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    return AgentResponse.from_orm_agent(agent)


@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: uuid.UUID,
    request: Request,
    data: AgentUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    agent = await agent_service.get_agent_by_id(db, user.id, agent_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")

    raw_body = await request.json()
    raw_api_key = raw_body.get("llm_api_key") or None

    updated = await agent_service.update_agent(db, agent, data, raw_llm_api_key=raw_api_key)
    await db.commit()
    return AgentResponse.from_orm_agent(updated)


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(
    agent_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    agent = await agent_service.get_agent_by_id(db, user.id, agent_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    await agent_service.delete_agent(db, agent)
    await db.commit()


@router.get("/{agent_id}/subscription")
async def get_agent_subscription(
    agent_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current plan and usage for an agent."""
    agent = await agent_service.get_agent_by_id(db, user.id, agent_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")

    plan = None
    limit = 100
    if agent.plan_id:
        result = await db.execute(select(Plan).where(Plan.id == agent.plan_id))
        plan = result.scalar_one_or_none()
        if plan:
            limit = plan.conversations_limit

    usage = await usage_service.get_current_usage(db, agent.id)
    count = usage.conversations_count if usage else 0

    return {
        "agent_id": str(agent.id),
        "plan": {
            "id": str(plan.id), "name": plan.name, "label": plan.label,
            "conversations_limit": plan.conversations_limit,
        } if plan else None,
        "billing_period": agent.billing_period,
        "subscription_expires_at": agent.subscription_expires_at,
        "conversations_this_month": count,
        "conversations_limit": limit,
        "usage_percent": round(count / limit * 100, 1) if limit > 0 else None,
    }
