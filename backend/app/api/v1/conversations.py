"""
Conversation management routes — dashboard-facing endpoints.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_current_organization
from app.database import get_db
from app.models.agent import Agent
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.organization import Organization
from app.models.user import User
from app.schemas.chat import (
    ConversationListItem,
    ConversationListResponse,
    ConversationResponse,
    MessageResponse,
)

router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.get("", response_model=ConversationListResponse)
async def list_conversations(
    agent_id: uuid.UUID | None = None,
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    """List conversations for the organization with optional filters."""
    # Build base query scoped to org's agents
    org_agents_subquery = select(Agent.id).where(Agent.organization_id == org.id)

    query = select(Conversation).where(
        Conversation.agent_id.in_(org_agents_subquery)
    )
    count_query = select(func.count()).select_from(Conversation).where(
        Conversation.agent_id.in_(org_agents_subquery)
    )

    # Apply filters
    if agent_id:
        query = query.where(Conversation.agent_id == agent_id)
        count_query = count_query.where(Conversation.agent_id == agent_id)
    if status_filter:
        query = query.where(Conversation.status == status_filter)
        count_query = count_query.where(Conversation.status == status_filter)

    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Fetch conversations with pagination
    offset = (page - 1) * page_size
    result = await db.execute(
        query
        .options(selectinload(Conversation.messages))
        .order_by(desc(Conversation.updated_at))
        .offset(offset)
        .limit(page_size)
    )
    conversations = result.scalars().unique().all()

    items = []
    for conv in conversations:
        msg_count = len(conv.messages)
        last_msg = conv.messages[-1] if conv.messages else None
        items.append(ConversationListItem(
            id=conv.id,
            agent_id=conv.agent_id,
            visitor_id=conv.visitor_id,
            status=conv.status,
            summary=conv.summary,
            message_count=msg_count,
            last_message_at=last_msg.created_at if last_msg else None,
            created_at=conv.created_at,
        ))

    return ConversationListResponse(
        conversations=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: uuid.UUID,
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    """Get a conversation with all its messages."""
    org_agents_subquery = select(Agent.id).where(Agent.organization_id == org.id)

    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(
            Conversation.id == conversation_id,
            Conversation.agent_id.in_(org_agents_subquery),
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    return ConversationResponse(
        id=conv.id,
        agent_id=conv.agent_id,
        visitor_id=conv.visitor_id,
        status=conv.status,
        summary=conv.summary,
        metadata_=conv.metadata_,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=[MessageResponse.model_validate(m) for m in conv.messages],
    )


@router.patch("/{conversation_id}/close", status_code=status.HTTP_204_NO_CONTENT)
async def close_conversation(
    conversation_id: uuid.UUID,
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    """Close/archive a conversation."""
    org_agents_subquery = select(Agent.id).where(Agent.organization_id == org.id)
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.agent_id.in_(org_agents_subquery),
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    conv.status = "closed"
    await db.flush()
