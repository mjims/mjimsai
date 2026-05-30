"""Pydantic schemas for Agent CRUD operations."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class WidgetConfig(BaseModel):
    primary_color: str = "#6366f1"
    text_color: str = "#ffffff"
    position: str = "bottom-right"  # bottom-right, bottom-left
    bubble_icon: str = "chat"
    border_radius: int = 16
    font_family: str = "Inter, sans-serif"


class AgentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=100, pattern=r"^[a-z0-9-]+$")
    description: Optional[str] = None
    avatar_url: Optional[str] = None

    system_prompt: str = "You are a helpful AI assistant. Answer questions clearly and concisely."
    llm_provider: str = Field(default="anthropic", pattern=r"^(anthropic|openai|gemini|grok)$")
    llm_model: str = "claude-sonnet-4-20250514"
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=2048, ge=100, le=32000)

    # User-provided LLM API key (write-only, never returned in responses)
    llm_api_key: Optional[str] = Field(None, exclude=True)

    welcome_message: str = "Bonjour ! Comment puis-je vous aider ?"
    widget_config: WidgetConfig = Field(default_factory=WidgetConfig)
    max_conversation_turns: int = Field(default=50, ge=1, le=500)


class AgentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    avatar_url: Optional[str] = None

    system_prompt: Optional[str] = None
    llm_provider: Optional[str] = Field(None, pattern=r"^(anthropic|openai|gemini|grok)$")
    llm_model: Optional[str] = None
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, ge=100, le=32000)

    # User-provided LLM API key (write-only, set None to remove)
    llm_api_key: Optional[str] = Field(None, exclude=True)
    remove_api_key: bool = False  # Set to True to remove the stored key

    welcome_message: Optional[str] = None
    widget_config: Optional[WidgetConfig] = None
    is_active: Optional[bool] = None
    max_conversation_turns: Optional[int] = Field(None, ge=1, le=500)


class AgentResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    slug: str
    description: Optional[str]
    avatar_url: Optional[str]

    system_prompt: str
    llm_provider: str
    llm_model: str
    temperature: float
    max_tokens: int

    llm_api_key_hint: Optional[str] = None
    has_custom_api_key: bool = False

    # Subscription
    plan_id: Optional[uuid.UUID] = None
    billing_period: str = "monthly"
    subscription_expires_at: Optional[datetime] = None

    welcome_message: str
    widget_config: dict
    is_active: bool
    max_conversation_turns: int

    total_conversations: int
    total_messages: int

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_agent(cls, agent: object) -> "AgentResponse":
        return cls(
            id=agent.id,
            user_id=agent.user_id,
            name=agent.name,
            slug=agent.slug,
            description=agent.description,
            avatar_url=agent.avatar_url,
            system_prompt=agent.system_prompt,
            llm_provider=agent.llm_provider,
            llm_model=agent.llm_model,
            temperature=agent.temperature,
            max_tokens=agent.max_tokens,
            llm_api_key_hint=agent.llm_api_key_hint,
            has_custom_api_key=bool(agent.llm_api_key_encrypted),
            plan_id=agent.plan_id,
            billing_period=agent.billing_period,
            subscription_expires_at=agent.subscription_expires_at,
            welcome_message=agent.welcome_message,
            widget_config=agent.widget_config,
            is_active=agent.is_active,
            max_conversation_turns=agent.max_conversation_turns,
            total_conversations=agent.total_conversations,
            total_messages=agent.total_messages,
            created_at=agent.created_at,
            updated_at=agent.updated_at,
        )


class AgentListResponse(BaseModel):
    agents: list[AgentResponse]
    total: int


class AgentPublicConfig(BaseModel):
    """Minimal agent info exposed to the widget (no sensitive data)."""
    name: str
    slug: str
    avatar_url: Optional[str]
    welcome_message: str
    widget_config: dict

    model_config = {"from_attributes": True}
