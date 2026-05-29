"""
Chat service — orchestrates conversation flow between widget and LLM.
"""

from __future__ import annotations

import logging
import uuid
from typing import AsyncIterator, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.agent import Agent
from app.models.conversation import Conversation
from app.models.knowledge import KnowledgeChunk, KnowledgeDocument
from app.models.message import Message
from app.services.llm.base import LLMConfig, LLMMessage, LLMResponse
from app.services.llm.factory import get_llm_provider

logger = logging.getLogger(__name__)


async def get_or_create_conversation(
    db: AsyncSession,
    agent: Agent,
    visitor_id: str,
    conversation_id: Optional[uuid.UUID] = None,
    metadata: Optional[dict] = None,
) -> Conversation:
    """Get an existing conversation or create a new one."""
    if conversation_id:
        result = await db.execute(
            select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.agent_id == agent.id,
            )
        )
        conv = result.scalar_one_or_none()
        if conv:
            return conv

    # Create new conversation
    conv = Conversation(
        agent_id=agent.id,
        visitor_id=visitor_id,
        metadata_=metadata or {},
    )
    db.add(conv)
    await db.flush()

    # Update agent stats
    agent.total_conversations += 1

    logger.info(f"New conversation {conv.id} for agent {agent.slug}")
    return conv


async def get_conversation_history(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    limit: int = 50,
) -> list[Message]:
    """Fetch the message history for a conversation."""
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def _build_context(
    db: AsyncSession,
    agent: Agent,
    user_message: str,
) -> str:
    """Build context from knowledge base documents (simple text injection for MVP)."""
    result = await db.execute(
        select(KnowledgeDocument).where(
            KnowledgeDocument.agent_id == agent.id,
            KnowledgeDocument.status == "ready",
        )
    )
    docs = result.scalars().all()
    if not docs:
        return ""

    # For MVP: simple context injection (full document text, up to token limit).
    # TODO: Replace with proper vector search (pgvector) for Phase 3.
    context_parts = []
    total_chars = 0
    max_chars = 8000  # ~2000 tokens

    for doc in docs:
        if doc.content_text and total_chars < max_chars:
            remaining = max_chars - total_chars
            text = doc.content_text[:remaining]
            context_parts.append(f"[Document: {doc.filename}]\n{text}")
            total_chars += len(text)

    if context_parts:
        return (
            "\n\n--- Knowledge Base ---\n"
            + "\n\n".join(context_parts)
            + "\n--- End Knowledge Base ---\n"
        )
    return ""


async def process_chat_message(
    db: AsyncSession,
    agent: Agent,
    conversation: Conversation,
    user_message_text: str,
) -> LLMResponse:
    """
    Process an incoming chat message:
    1. Save the user message
    2. Build conversation history + knowledge context
    3. Call the LLM
    4. Save and return the assistant message
    """
    # 1. Save user message
    user_msg = Message(
        conversation_id=conversation.id,
        role="user",
        content=user_message_text,
    )
    db.add(user_msg)
    await db.flush()

    # 2. Build message history
    history = await get_conversation_history(db, conversation.id)
    llm_messages = [LLMMessage(role=m.role, content=m.content) for m in history]

    # 3. Build knowledge context
    knowledge_context = await _build_context(db, agent, user_message_text)
    system_prompt = agent.system_prompt
    if knowledge_context:
        system_prompt += knowledge_context

    # 4. Call LLM
    provider = get_llm_provider(agent.llm_provider)
    config = LLMConfig(
        model=agent.llm_model,
        temperature=agent.temperature,
        max_tokens=agent.max_tokens,
        system_prompt=system_prompt,
    )

    response = await provider.chat(llm_messages, config)

    # 5. Save assistant message
    assistant_msg = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=response.content,
        tokens_input=response.tokens_input,
        tokens_output=response.tokens_output,
    )
    db.add(assistant_msg)

    # Update agent stats
    agent.total_messages += 2  # user + assistant

    await db.flush()

    return response


async def stream_chat_message(
    db: AsyncSession,
    agent: Agent,
    conversation: Conversation,
    user_message_text: str,
) -> AsyncIterator[str]:
    """
    Stream a chat response via SSE:
    1. Save the user message
    2. Stream LLM response chunks
    3. Save the complete assistant message at the end
    """
    # 1. Save user message
    user_msg = Message(
        conversation_id=conversation.id,
        role="user",
        content=user_message_text,
    )
    db.add(user_msg)
    await db.flush()

    # 2. Build message history
    history = await get_conversation_history(db, conversation.id)
    llm_messages = [LLMMessage(role=m.role, content=m.content) for m in history]

    # 3. Build knowledge context
    knowledge_context = await _build_context(db, agent, user_message_text)
    system_prompt = agent.system_prompt
    if knowledge_context:
        system_prompt += knowledge_context

    # 4. Stream LLM response
    provider = get_llm_provider(agent.llm_provider)
    config = LLMConfig(
        model=agent.llm_model,
        temperature=agent.temperature,
        max_tokens=agent.max_tokens,
        system_prompt=system_prompt,
    )

    full_response = []
    async for chunk in provider.stream_chat(llm_messages, config):
        full_response.append(chunk)
        yield chunk

    # 5. Save complete assistant message
    complete_text = "".join(full_response)
    assistant_msg = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=complete_text,
    )
    db.add(assistant_msg)
    agent.total_messages += 2
    await db.commit()
