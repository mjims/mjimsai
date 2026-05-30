"""
Chat service — orchestrates conversation flow between widget and LLM.
"""

from __future__ import annotations

import logging
import uuid
from typing import AsyncIterator, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent
from app.models.conversation import Conversation
from app.models.knowledge import KnowledgeDocument
from app.models.message import Message
from app.services.encryption import decrypt_api_key
from app.services.llm.base import LLMConfig, LLMMessage, LLMResponse
from app.services.llm.factory import get_llm_provider
from app.services import usage_service

logger = logging.getLogger(__name__)


async def get_or_create_conversation(
    db: AsyncSession,
    agent: Agent,
    visitor_id: str,
    conversation_id: Optional[uuid.UUID] = None,
    metadata: Optional[dict] = None,
) -> Conversation:
    """Get an existing conversation or create a new one. Enforces per-agent quota."""
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

    await usage_service.check_quota(db, agent, raise_if_exceeded=True)

    conv = Conversation(agent_id=agent.id, visitor_id=visitor_id, metadata_=metadata or {})
    db.add(conv)
    await db.flush()

    agent.total_conversations += 1
    await usage_service.increment_conversation(db, agent.id)

    logger.info(f"New conversation {conv.id} for agent {agent.slug}")
    return conv


async def get_conversation_history(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    limit: int = 50,
) -> list[Message]:
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def _build_context(db: AsyncSession, agent: Agent, user_message: str) -> str:
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

    context_parts = []
    total_chars = 0
    max_chars = 8000

    for doc in docs:
        if doc.content_text and total_chars < max_chars:
            remaining = max_chars - total_chars
            text = doc.content_text[:remaining]
            context_parts.append(f"[Document: {doc.filename}]\n{text}")
            total_chars += len(text)

    if context_parts:
        return "\n\n--- Knowledge Base ---\n" + "\n\n".join(context_parts) + "\n--- End Knowledge Base ---\n"
    return ""


def _get_provider(agent: Agent):
    agent_api_key: Optional[str] = None
    if agent.llm_api_key_encrypted:
        try:
            agent_api_key = decrypt_api_key(agent.llm_api_key_encrypted)
        except Exception:
            logger.warning(f"Failed to decrypt API key for agent {agent.slug}, using platform key")
    return get_llm_provider(agent.llm_provider, api_key=agent_api_key)


async def process_chat_message(
    db: AsyncSession,
    agent: Agent,
    conversation: Conversation,
    user_message_text: str,
    images: Optional[list[str]] = None,
) -> LLMResponse:
    user_msg = Message(conversation_id=conversation.id, role="user", content=user_message_text)
    db.add(user_msg)
    await db.flush()

    history = await get_conversation_history(db, conversation.id)
    llm_messages = [LLMMessage(role=m.role, content=m.content) for m in history]
    # Attach inbound images to the latest user turn (vision-capable providers).
    if images and llm_messages and llm_messages[-1].role == "user":
        llm_messages[-1].images = images

    knowledge_context = await _build_context(db, agent, user_message_text)
    system_prompt = agent.system_prompt + (knowledge_context if knowledge_context else "")

    provider = _get_provider(agent)
    config = LLMConfig(
        model=agent.llm_model, temperature=agent.temperature,
        max_tokens=agent.max_tokens, system_prompt=system_prompt,
    )
    response = await provider.chat(llm_messages, config)

    assistant_msg = Message(
        conversation_id=conversation.id, role="assistant", content=response.content,
        tokens_input=response.tokens_input, tokens_output=response.tokens_output,
    )
    db.add(assistant_msg)
    agent.total_messages += 2
    await db.flush()
    return response


async def stream_chat_message(
    db: AsyncSession,
    agent: Agent,
    conversation: Conversation,
    user_message_text: str,
) -> AsyncIterator[str]:
    user_msg = Message(conversation_id=conversation.id, role="user", content=user_message_text)
    db.add(user_msg)
    await db.flush()

    history = await get_conversation_history(db, conversation.id)
    llm_messages = [LLMMessage(role=m.role, content=m.content) for m in history]

    knowledge_context = await _build_context(db, agent, user_message_text)
    system_prompt = agent.system_prompt + (knowledge_context if knowledge_context else "")

    provider = _get_provider(agent)
    config = LLMConfig(
        model=agent.llm_model, temperature=agent.temperature,
        max_tokens=agent.max_tokens, system_prompt=system_prompt,
    )

    full_response = []
    async for chunk in provider.stream_chat(llm_messages, config):
        full_response.append(chunk)
        yield chunk

    complete_text = "".join(full_response)
    assistant_msg = Message(conversation_id=conversation.id, role="assistant", content=complete_text)
    db.add(assistant_msg)
    agent.total_messages += 2
    await db.commit()
