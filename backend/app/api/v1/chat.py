"""
Chat routes — widget-facing endpoints for conversations.
Auth via X-API-Key header (user's api_key). Supports SSE streaming.
"""

from __future__ import annotations

import json
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import validate_widget_key
from app.database import get_db
from app.models.user import User
from app.schemas import AgentPublicConfig
from app.schemas.chat import ChatRequest, ChatResponse
from app.services import chat_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.get("/agent/{agent_slug}/config", response_model=AgentPublicConfig)
async def get_agent_config(
    agent_slug: str,
    user: User = Depends(validate_widget_key),
    db: AsyncSession = Depends(get_db),
):
    """Get public agent configuration for the widget."""
    from app.models.agent import Agent
    result = await db.execute(
        select(Agent).where(
            Agent.user_id == user.id,
            Agent.slug == agent_slug,
            Agent.is_active == True,  # noqa: E712
        )
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    return AgentPublicConfig.model_validate(agent)


@router.post("/agent/{agent_slug}", response_model=ChatResponse)
async def send_message(
    agent_slug: str,
    data: ChatRequest,
    user: User = Depends(validate_widget_key),
    db: AsyncSession = Depends(get_db),
):
    """Send a message and get a response (non-streaming)."""
    from app.models.agent import Agent
    result = await db.execute(
        select(Agent).where(
            Agent.user_id == user.id,
            Agent.slug == agent_slug,
            Agent.is_active == True,  # noqa: E712
        )
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")

    conversation = await chat_service.get_or_create_conversation(
        db, agent, data.visitor_id, data.conversation_id, data.metadata,
    )
    response = await chat_service.process_chat_message(db, agent, conversation, data.message)

    return ChatResponse(
        conversation_id=conversation.id,
        message_id=uuid.uuid4(),
        content=response.content,
        tokens_input=response.tokens_input,
        tokens_output=response.tokens_output,
    )


@router.post("/agent/{agent_slug}/stream")
async def stream_message(
    agent_slug: str,
    data: ChatRequest,
    user: User = Depends(validate_widget_key),
    db: AsyncSession = Depends(get_db),
):
    """Send a message and stream the response via SSE."""
    from app.models.agent import Agent
    result = await db.execute(
        select(Agent).where(
            Agent.user_id == user.id,
            Agent.slug == agent_slug,
            Agent.is_active == True,  # noqa: E712
        )
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")

    conversation = await chat_service.get_or_create_conversation(
        db, agent, data.visitor_id, data.conversation_id, data.metadata,
    )

    async def event_generator():
        yield f"data: {json.dumps({'type': 'meta', 'conversation_id': str(conversation.id)})}\n\n"
        try:
            async for chunk in chat_service.stream_chat_message(db, agent, conversation, data.message):
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )
