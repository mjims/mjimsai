"""Pydantic schemas for conversations and messages."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Incoming chat message from the widget."""
    message: str = Field(..., min_length=1, max_length=10000)
    conversation_id: Optional[uuid.UUID] = None
    visitor_id: str = Field(..., min_length=1, max_length=255)
    metadata: Optional[dict] = None  # page URL, referrer, etc.


class ChatResponse(BaseModel):
    """Response to a chat message (non-streaming)."""
    conversation_id: uuid.UUID
    message_id: uuid.UUID
    content: str
    tokens_input: Optional[int] = None
    tokens_output: Optional[int] = None


class MessageResponse(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    tokens_input: Optional[int] = None
    tokens_output: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    id: uuid.UUID
    agent_id: uuid.UUID
    visitor_id: str
    status: str
    summary: Optional[str] = None
    metadata_: Optional[dict] = Field(None, alias="metadata_")
    created_at: datetime
    updated_at: datetime
    messages: list[MessageResponse] = []

    model_config = {"from_attributes": True}


class ConversationListItem(BaseModel):
    id: uuid.UUID
    agent_id: uuid.UUID
    visitor_id: str
    status: str
    summary: Optional[str] = None
    message_count: int = 0
    last_message_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationListResponse(BaseModel):
    conversations: list[ConversationListItem]
    total: int
    page: int
    page_size: int
